-- Backfill PCAF data quality scores for historical records.
-- This migration updates:
-- 1) finance_emission_calculations.data_quality_score
-- 2) emission_calculations.results (allResults[].dataQualityScore + aggregate dataQualityScore)

-- 1a) Direct mapping by formula_id.
update public.finance_emission_calculations f
set data_quality_score = case f.formula_id
  -- Corporate bond / business loan
  when '1a-listed-equity' then 1
  when '1b-listed-equity' then 2
  when '2a-listed-equity' then 3
  when '2b-listed-equity' then 3
  when '1a-unlisted-equity' then 1
  when '1b-unlisted-equity' then 2
  when '2a-unlisted-equity' then 3
  when '2b-unlisted-equity' then 3
  -- Mortgage
  when '1a-mortgage' then 1
  when '1b-mortgage' then 2
  when '2a-mortgage' then 3
  when '2b-mortgage' then 4
  -- Project finance
  when '1a-project-finance' then 1
  when '1b-project-finance' then 2
  when '2a-project-finance' then 3
  when '2b-project-finance' then 3
  -- Sovereign debt
  when '1a-sovereign-debt' then 1
  when '1b-sovereign-debt' then 2
  when '2a-sovereign-debt' then 3
  -- Motor vehicle
  when '1a-motor-vehicle' then 1
  when '1b-motor-vehicle' then 1
  when '2a-motor-vehicle' then 2
  when '2b-motor-vehicle' then 3
  -- Commercial real estate
  when '1a-commercial-real-estate' then 1
  when '1b-commercial-real-estate' then 2
  when '2a-commercial-real-estate' then 3
  when '2b-commercial-real-estate' then 4
  -- Facilitated formulas (explicit ids)
  when '1a-facilitated-verified-listed' then 1
  when '1a-facilitated-verified-unlisted' then 1
  when '1b-facilitated-unverified-listed' then 2
  when '1b-facilitated-unverified-unlisted' then 2
  when '2a-facilitated-energy-listed' then 3
  when '2a-facilitated-energy-unlisted' then 3
  when '2b-facilitated-production-listed' then 3
  when '2b-facilitated-production-unlisted' then 3
  else null
end
where f.data_quality_score is null;

-- 1b) Legacy facilitated rows saved with formula_id='facilitated'.
with latest_facilitated_aggregate as (
  select distinct on (ec.user_id, ec.counterparty_id)
    ec.user_id,
    ec.counterparty_id,
    ec.inputs
  from public.emission_calculations ec
  where ec.calculation_type = 'facilitated'
    and ec.formula_id = 'aggregate'
  order by ec.user_id, ec.counterparty_id, ec.updated_at desc
)
update public.finance_emission_calculations f
set data_quality_score = case
  when coalesce(l.inputs ->> 'hasEmissions', '') = 'yes'
       and coalesce(l.inputs ->> 'verificationStatus', '') = 'verified' then 1
  when coalesce(l.inputs ->> 'hasEmissions', '') = 'yes'
       and coalesce(l.inputs ->> 'verificationStatus', '') = 'unverified' then 2
  when coalesce(l.inputs ->> 'hasEmissions', '') = 'no' then 3
  else null
end
from latest_facilitated_aggregate l
where f.data_quality_score is null
  and f.formula_id = 'facilitated'
  and l.user_id = f.user_id
  and l.counterparty_id = f.counterparty_id;

-- 2) Backfill emission_calculations.results.allResults[].dataQualityScore and results.dataQualityScore.
with target as (
  select
    ec.id,
    coalesce(ec.inputs::jsonb, '{}'::jsonb) as inputs_json,
    coalesce(ec.results::jsonb, '{}'::jsonb) as results_json
  from public.emission_calculations ec
  where ec.formula_id = 'aggregate'
    and ec.calculation_type in ('finance', 'facilitated')
),
expanded as (
  select
    t.id,
    a.ord,
    a.elem,
    coalesce(
      case a.elem ->> 'type'
        -- Corporate bond / business loan
        when '1a-listed-equity' then 1
        when '1b-listed-equity' then 2
        when '2a-listed-equity' then 3
        when '2b-listed-equity' then 3
        when '1a-unlisted-equity' then 1
        when '1b-unlisted-equity' then 2
        when '2a-unlisted-equity' then 3
        when '2b-unlisted-equity' then 3
        -- Mortgage
        when '1a-mortgage' then 1
        when '1b-mortgage' then 2
        when '2a-mortgage' then 3
        when '2b-mortgage' then 4
        -- Project finance
        when '1a-project-finance' then 1
        when '1b-project-finance' then 2
        when '2a-project-finance' then 3
        when '2b-project-finance' then 3
        -- Sovereign debt
        when '1a-sovereign-debt' then 1
        when '1b-sovereign-debt' then 2
        when '2a-sovereign-debt' then 3
        -- Motor vehicle
        when '1a-motor-vehicle' then 1
        when '1b-motor-vehicle' then 1
        when '2a-motor-vehicle' then 2
        when '2b-motor-vehicle' then 3
        -- Commercial real estate
        when '1a-commercial-real-estate' then 1
        when '1b-commercial-real-estate' then 2
        when '2a-commercial-real-estate' then 3
        when '2b-commercial-real-estate' then 4
        -- Facilitated legacy allResults type
        when 'facilitated' then
          case
            when coalesce(t.inputs_json ->> 'hasEmissions', '') = 'yes'
                 and coalesce(t.inputs_json ->> 'verificationStatus', '') = 'verified' then 1
            when coalesce(t.inputs_json ->> 'hasEmissions', '') = 'yes'
                 and coalesce(t.inputs_json ->> 'verificationStatus', '') = 'unverified' then 2
            when coalesce(t.inputs_json ->> 'hasEmissions', '') = 'no' then 3
            else null
          end
        else null
      end,
      nullif(a.elem ->> 'dataQualityScore', '')::numeric
    ) as dq_score
  from target t
  left join lateral jsonb_array_elements(coalesce(t.results_json -> 'allResults', '[]'::jsonb)) with ordinality as a(elem, ord)
    on true
),
recomposed as (
  select
    e.id,
    jsonb_agg(
      case
        when e.dq_score is null then e.elem
        else jsonb_set(e.elem, '{dataQualityScore}', to_jsonb(e.dq_score), true)
      end
      order by e.ord
    ) filter (where e.ord is not null) as all_results_with_scores,
    avg(e.dq_score) filter (where e.dq_score is not null) as avg_dq_score
  from expanded e
  group by e.id
)
update public.emission_calculations ec
set results = jsonb_set(
  jsonb_set(
    coalesce(ec.results::jsonb, '{}'::jsonb),
    '{allResults}',
    coalesce(r.all_results_with_scores, coalesce(ec.results::jsonb -> 'allResults', '[]'::jsonb)),
    true
  ),
  '{dataQualityScore}',
  to_jsonb(r.avg_dq_score),
  true
)
from recomposed r
where ec.id = r.id
  and r.avg_dq_score is not null;


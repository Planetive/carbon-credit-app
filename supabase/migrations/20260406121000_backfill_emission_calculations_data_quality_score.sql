-- Fill emission_calculations.data_quality_score when the column was added empty because:
-- - Legacy rows often have no dataQualityScore in results JSON, and allResults[].type uses
--   loan keys (e.g. mortgage) not PCAF formula ids, so JSON-only backfills return null.
-- - Migration order: if 20260406120000 ran before results JSON was patched, re-read JSON here.

-- 1) From results JSON (same preference as 20260406120000)
with per_row as (
  select
    ec.id,
    nullif(ec.results::jsonb ->> 'dataQualityScore', '')::numeric as score_from_root,
    (
      select avg(nullif(elem ->> 'dataQualityScore', '')::numeric)
      from jsonb_array_elements(coalesce(ec.results::jsonb -> 'allResults', '[]'::jsonb)) as elem
      where nullif(elem ->> 'dataQualityScore', '') is not null
    ) as score_from_all_results
  from public.emission_calculations ec
  where ec.formula_id = 'aggregate'
    and ec.calculation_type in ('finance', 'facilitated')
    and ec.data_quality_score is null
)
update public.emission_calculations ec
set data_quality_score = coalesce(p.score_from_root, p.score_from_all_results)
from per_row p
where ec.id = p.id
  and ec.data_quality_score is null
  and coalesce(p.score_from_root, p.score_from_all_results) is not null;

-- 2) From questionnaire fields in inputs (PCAF 1a / 1b / 2a tier — matches facilitated mapping)
update public.emission_calculations ec
set data_quality_score = v.score
from (
  select
    ec2.id,
    case
      when q.he = 'yes' and q.vs = 'verified' then 1
      when q.he = 'yes' and q.vs = 'unverified' then 2
      when q.he = 'no' then 3
      else null
    end as score
  from public.emission_calculations ec2
  cross join lateral (
    select
      coalesce(
        nullif(trim(ec2.inputs::jsonb ->> 'hasEmissions'), ''),
        case coalesce(ec2.inputs::jsonb ->> 'has_emissions', '')
          when 'true' then 'yes'
          when 'false' then 'no'
          else null
        end
      ) as he,
      coalesce(
        nullif(trim(ec2.inputs::jsonb ->> 'verificationStatus'), ''),
        nullif(trim(ec2.inputs::jsonb ->> 'verification_status'), '')
      ) as vs
  ) q
  where ec2.formula_id = 'aggregate'
    and ec2.calculation_type in ('finance', 'facilitated')
    and ec2.data_quality_score is null
    and (
      (q.he = 'yes' and q.vs in ('verified', 'unverified'))
      or q.he = 'no'
    )
) v
where ec.id = v.id
  and v.score is not null;

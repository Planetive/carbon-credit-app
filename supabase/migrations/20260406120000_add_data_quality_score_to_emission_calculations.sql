-- Add first-class PCAF score column to aggregate table
alter table if exists public.emission_calculations
add column if not exists data_quality_score numeric;

-- Backfill from existing JSON payloads for old users
-- Preference order:
-- 1) results.dataQualityScore
-- 2) average(allResults[].dataQualityScore)
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
  where ec.calculation_type in ('finance', 'facilitated')
)
update public.emission_calculations ec
set data_quality_score = coalesce(p.score_from_root, p.score_from_all_results)
from per_row p
where ec.id = p.id
  and ec.data_quality_score is null
  and coalesce(p.score_from_root, p.score_from_all_results) is not null;


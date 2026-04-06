alter table if exists public.finance_emission_calculations
add column if not exists data_quality_score numeric;


-- Still-null data_quality_score on aggregate rows usually means:
-- - inputs JSON never stored hasEmissions (older saves), but counterparty_questionnaires has the truth.
-- - Or per-loan rows in finance_emission_calculations have scores but the aggregate row does not.

-- 1) From counterparty_questionnaires
--    Works whether has_emissions is boolean or legacy text yes/no (compare via ::text).
update public.emission_calculations ec
set data_quality_score = v.score
from (
  select
    ec2.id,
    case
      when cq.has_emissions::text in ('true', 't', 'yes', '1')
           and cq.verification_status = 'verified' then 1
      when cq.has_emissions::text in ('true', 't', 'yes', '1')
           and cq.verification_status = 'unverified' then 2
      when cq.has_emissions::text in ('false', 'f', 'no', '0') then 3
      else null
    end as score
  from public.emission_calculations ec2
  inner join public.counterparty_questionnaires cq on cq.id = ec2.questionnaire_id
  where ec2.formula_id = 'aggregate'
    and ec2.calculation_type in ('finance', 'facilitated')
    and ec2.data_quality_score is null
    and (
      (cq.has_emissions::text in ('true', 't', 'yes', '1')
        and cq.verification_status in ('verified', 'unverified'))
      or cq.has_emissions::text in ('false', 'f', 'no', '0')
    )
) v
where ec.id = v.id
  and v.score is not null;

-- 2) Average of finance_emission_calculations.data_quality_score for same user/counterparty/mode
with fec_avg as (
  select
    ec.id as ec_id,
    avg(fec.data_quality_score)::numeric as avg_score
  from public.emission_calculations ec
  inner join public.finance_emission_calculations fec
    on fec.user_id = ec.user_id
    and fec.counterparty_id = ec.counterparty_id
    and fec.data_quality_score is not null
    and (
      (ec.calculation_type = 'finance' and fec.calculation_type = 'finance_emission')
      or (ec.calculation_type = 'facilitated' and fec.calculation_type = 'facilitated_emission')
    )
  where ec.formula_id = 'aggregate'
    and ec.calculation_type in ('finance', 'facilitated')
    and ec.data_quality_score is null
  group by ec.id
  having avg(fec.data_quality_score) is not null
)
update public.emission_calculations ec
set data_quality_score = f.avg_score
from fec_avg f
where ec.id = f.ec_id;

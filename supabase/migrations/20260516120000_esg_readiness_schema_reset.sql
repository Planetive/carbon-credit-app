-- Reset ESG tables for ISSB readiness-only schema.
-- WARNING: Deletes all existing esg_assessments and esg_scores rows.

BEGIN;

DELETE FROM public.esg_scores;
DELETE FROM public.esg_assessments;

-- Ensure readiness columns exist before dropping legacy fields.
ALTER TABLE public.esg_assessments
  ADD COLUMN IF NOT EXISTS assessment_type TEXT,
  ADD COLUMN IF NOT EXISTS readiness_version INTEGER,
  ADD COLUMN IF NOT EXISTS readiness_answers JSONB;

ALTER TABLE public.esg_scores
  ADD COLUMN IF NOT EXISTS readiness_overall_score NUMERIC,
  ADD COLUMN IF NOT EXISTS readiness_maturity_band TEXT,
  ADD COLUMN IF NOT EXISTS readiness_completion_pct NUMERIC,
  ADD COLUMN IF NOT EXISTS readiness_results JSONB;

-- Drop legacy questionnaire columns from esg_assessments.
ALTER TABLE public.esg_assessments
  DROP COLUMN IF EXISTS ghg_baseline,
  DROP COLUMN IF EXISTS ghg_emissions,
  DROP COLUMN IF EXISTS air_pollutants,
  DROP COLUMN IF EXISTS ghg_reduction_initiatives,
  DROP COLUMN IF EXISTS energy_visibility,
  DROP COLUMN IF EXISTS total_energy_used,
  DROP COLUMN IF EXISTS energy_grid,
  DROP COLUMN IF EXISTS energy_renewable,
  DROP COLUMN IF EXISTS energy_diesel,
  DROP COLUMN IF EXISTS energy_gas,
  DROP COLUMN IF EXISTS water_withdrawal,
  DROP COLUMN IF EXISTS water_reclaimed,
  DROP COLUMN IF EXISTS waste_type,
  DROP COLUMN IF EXISTS waste_quantity,
  DROP COLUMN IF EXISTS waste_treated,
  DROP COLUMN IF EXISTS environmental_policy,
  DROP COLUMN IF EXISTS waste_management_policy,
  DROP COLUMN IF EXISTS energy_management_policy,
  DROP COLUMN IF EXISTS water_management_policy,
  DROP COLUMN IF EXISTS recycling_policy,
  DROP COLUMN IF EXISTS board_climate_oversight,
  DROP COLUMN IF EXISTS management_climate_oversight,
  DROP COLUMN IF EXISTS sustainable_sourcing,
  DROP COLUMN IF EXISTS median_male_compensation,
  DROP COLUMN IF EXISTS median_female_compensation,
  DROP COLUMN IF EXISTS ceo_pay_ratio,
  DROP COLUMN IF EXISTS ceo_pay_ratio_reporting,
  DROP COLUMN IF EXISTS full_time_turnover,
  DROP COLUMN IF EXISTS part_time_turnover,
  DROP COLUMN IF EXISTS consultants_turnover,
  DROP COLUMN IF EXISTS diversity_inclusion_policy,
  DROP COLUMN IF EXISTS total_headcount,
  DROP COLUMN IF EXISTS men_headcount,
  DROP COLUMN IF EXISTS women_headcount,
  DROP COLUMN IF EXISTS men_entry_mid_level,
  DROP COLUMN IF EXISTS women_entry_mid_level,
  DROP COLUMN IF EXISTS men_senior_executive,
  DROP COLUMN IF EXISTS women_senior_executive,
  DROP COLUMN IF EXISTS differently_abled_workforce,
  DROP COLUMN IF EXISTS temporary_workers,
  DROP COLUMN IF EXISTS consultants,
  DROP COLUMN IF EXISTS anti_harassment_policy,
  DROP COLUMN IF EXISTS harassment_cases_reported,
  DROP COLUMN IF EXISTS harassment_cases_resolved,
  DROP COLUMN IF EXISTS grievance_mechanism,
  DROP COLUMN IF EXISTS grievance_cases_reported,
  DROP COLUMN IF EXISTS grievance_cases_resolved,
  DROP COLUMN IF EXISTS health_safety_policy,
  DROP COLUMN IF EXISTS hse_management_system,
  DROP COLUMN IF EXISTS fatalities,
  DROP COLUMN IF EXISTS ltis,
  DROP COLUMN IF EXISTS safety_accidents,
  DROP COLUMN IF EXISTS production_loss,
  DROP COLUMN IF EXISTS trir,
  DROP COLUMN IF EXISTS child_forced_labor_policy,
  DROP COLUMN IF EXISTS human_rights_policy,
  DROP COLUMN IF EXISTS personnel_trained,
  DROP COLUMN IF EXISTS women_promoted,
  DROP COLUMN IF EXISTS men_promoted,
  DROP COLUMN IF EXISTS csr_percentage,
  DROP COLUMN IF EXISTS responsible_marketing_policy,
  DROP COLUMN IF EXISTS total_board_members,
  DROP COLUMN IF EXISTS independent_board_members,
  DROP COLUMN IF EXISTS men_board_members,
  DROP COLUMN IF EXISTS women_board_members,
  DROP COLUMN IF EXISTS board_governance_committees,
  DROP COLUMN IF EXISTS men_committee_chairs,
  DROP COLUMN IF EXISTS women_committee_chairs,
  DROP COLUMN IF EXISTS ceo_board_prohibition,
  DROP COLUMN IF EXISTS esg_certified_board_members,
  DROP COLUMN IF EXISTS esg_incentivization,
  DROP COLUMN IF EXISTS workers_union,
  DROP COLUMN IF EXISTS supplier_code_of_conduct,
  DROP COLUMN IF EXISTS supplier_compliance_percentage,
  DROP COLUMN IF EXISTS un_sdgs_focus,
  DROP COLUMN IF EXISTS sustainability_report,
  DROP COLUMN IF EXISTS sustainability_reporting_framework,
  DROP COLUMN IF EXISTS sustainability_regulatory_filing,
  DROP COLUMN IF EXISTS sustainability_third_party_assurance,
  DROP COLUMN IF EXISTS ethics_anti_corruption_policy,
  DROP COLUMN IF EXISTS policy_regular_review,
  DROP COLUMN IF EXISTS data_privacy_policy,
  DROP COLUMN IF EXISTS environmental_completion,
  DROP COLUMN IF EXISTS social_completion,
  DROP COLUMN IF EXISTS governance_completion;

-- Drop legacy admin scoring columns from esg_scores.
ALTER TABLE public.esg_scores
  DROP COLUMN IF EXISTS e_q1_score,
  DROP COLUMN IF EXISTS e_q2_score,
  DROP COLUMN IF EXISTS e_q3_score,
  DROP COLUMN IF EXISTS e_q4_score,
  DROP COLUMN IF EXISTS e_q5_score,
  DROP COLUMN IF EXISTS e_q6_score,
  DROP COLUMN IF EXISTS e_q7_score,
  DROP COLUMN IF EXISTS e_q8_score,
  DROP COLUMN IF EXISTS s_q1_score,
  DROP COLUMN IF EXISTS s_q2_score,
  DROP COLUMN IF EXISTS s_q3_score,
  DROP COLUMN IF EXISTS s_q4_score,
  DROP COLUMN IF EXISTS s_q5_score,
  DROP COLUMN IF EXISTS s_q6_score,
  DROP COLUMN IF EXISTS s_q7_score,
  DROP COLUMN IF EXISTS s_q8_score,
  DROP COLUMN IF EXISTS s_q9_score,
  DROP COLUMN IF EXISTS s_q10_score,
  DROP COLUMN IF EXISTS s_q11_score,
  DROP COLUMN IF EXISTS s_q12_score,
  DROP COLUMN IF EXISTS g_q1_score,
  DROP COLUMN IF EXISTS g_q2_score,
  DROP COLUMN IF EXISTS g_q3_score,
  DROP COLUMN IF EXISTS g_q4_score,
  DROP COLUMN IF EXISTS g_q5_score,
  DROP COLUMN IF EXISTS g_q6_score,
  DROP COLUMN IF EXISTS g_q7_score,
  DROP COLUMN IF EXISTS environmental_total_score,
  DROP COLUMN IF EXISTS social_total_score,
  DROP COLUMN IF EXISTS governance_total_score,
  DROP COLUMN IF EXISTS overall_score,
  DROP COLUMN IF EXISTS environmental_strengths,
  DROP COLUMN IF EXISTS environmental_improvements,
  DROP COLUMN IF EXISTS social_strengths,
  DROP COLUMN IF EXISTS social_improvements,
  DROP COLUMN IF EXISTS governance_strengths,
  DROP COLUMN IF EXISTS governance_improvements,
  DROP COLUMN IF EXISTS overall_recommendations;

-- Normalize readiness columns and defaults.
ALTER TABLE public.esg_assessments
  ALTER COLUMN assessment_type SET DEFAULT 'issb_readiness_v1',
  ALTER COLUMN assessment_type SET NOT NULL,
  ALTER COLUMN readiness_version SET DEFAULT 1,
  ALTER COLUMN readiness_answers SET DEFAULT '{}'::jsonb;

UPDATE public.esg_assessments
SET
  assessment_type = COALESCE(assessment_type, 'issb_readiness_v1'),
  readiness_version = COALESCE(readiness_version, 1),
  readiness_answers = COALESCE(readiness_answers, '{}'::jsonb)
WHERE assessment_type IS NULL OR readiness_answers IS NULL OR readiness_version IS NULL;

ALTER TABLE public.esg_assessments
  ALTER COLUMN readiness_answers SET NOT NULL;

-- Replace user-only unique constraint with (user_id, assessment_type).
DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'esg_assessments'
      AND c.contype = 'u'
      AND pg_get_constraintdef(c.oid) LIKE 'UNIQUE (user_id)%'
      AND pg_get_constraintdef(c.oid) NOT LIKE '%assessment_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.esg_assessments DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'esg_assessments'
      AND c.contype = 'u'
      AND pg_get_constraintdef(c.oid) = 'UNIQUE (user_id, assessment_type)'
  ) THEN
    ALTER TABLE public.esg_assessments
      ADD CONSTRAINT esg_assessments_user_id_assessment_type_key UNIQUE (user_id, assessment_type);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_esg_assessments_type_user_status
  ON public.esg_assessments (assessment_type, user_id, status);

CREATE INDEX IF NOT EXISTS idx_esg_scores_readiness_assessment
  ON public.esg_scores (assessment_id)
  WHERE readiness_results IS NOT NULL;

COMMENT ON TABLE public.esg_assessments IS 'ISSB/IFRS S1-S2 style readiness assessments (readiness_answers JSON).';
COMMENT ON TABLE public.esg_scores IS 'Automated readiness scoring snapshot per submitted assessment.';

COMMIT;

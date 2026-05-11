-- Readiness assessment support (ISSB / IFRS S1-S2 style)
-- Keeps legacy ESG questionnaire fields intact while adding versioned readiness payloads.

ALTER TABLE public.esg_assessments
ADD COLUMN IF NOT EXISTS assessment_type TEXT NOT NULL DEFAULT 'legacy_esg',
ADD COLUMN IF NOT EXISTS readiness_version INTEGER,
ADD COLUMN IF NOT EXISTS readiness_answers JSONB;

ALTER TABLE public.esg_scores
ADD COLUMN IF NOT EXISTS readiness_overall_score NUMERIC,
ADD COLUMN IF NOT EXISTS readiness_maturity_band TEXT,
ADD COLUMN IF NOT EXISTS readiness_completion_pct NUMERIC,
ADD COLUMN IF NOT EXISTS readiness_results JSONB;

CREATE INDEX IF NOT EXISTS idx_esg_assessments_type_user_status
ON public.esg_assessments (assessment_type, user_id, status);

CREATE INDEX IF NOT EXISTS idx_esg_scores_readiness_assessment
ON public.esg_scores (assessment_id)
WHERE readiness_results IS NOT NULL;

-- Phase 1C — Enforce organization_id NOT NULL on backfilled tenant tables
-- Prerequisite: 0003d verify showed null_org = 0 for these tables.
-- Safe: no data rewrite; fails if any NULL remains.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.counterparties WHERE organization_id IS NULL
    UNION ALL SELECT 1 FROM public.exposures WHERE organization_id IS NULL
    UNION ALL SELECT 1 FROM public.emission_calculations WHERE organization_id IS NULL
    UNION ALL SELECT 1 FROM public.emission_calculator WHERE organization_id IS NULL
    UNION ALL SELECT 1 FROM public.esg_assessments WHERE organization_id IS NULL
    UNION ALL SELECT 1 FROM public.project_inputs WHERE organization_id IS NULL
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'Refusing NOT NULL: some organization_id values are still NULL. Re-run 0003d / diagnostic first.';
  END IF;
END
$$;

ALTER TABLE public.counterparties
  ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.exposures
  ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.emission_calculations
  ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.emission_calculator
  ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.esg_assessments
  ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.project_inputs
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_counterparties_organization_id
  ON public.counterparties (organization_id);
CREATE INDEX IF NOT EXISTS idx_exposures_organization_id
  ON public.exposures (organization_id);
CREATE INDEX IF NOT EXISTS idx_emission_calculations_organization_id
  ON public.emission_calculations (organization_id);
CREATE INDEX IF NOT EXISTS idx_emission_calculator_organization_id
  ON public.emission_calculator (organization_id);
CREATE INDEX IF NOT EXISTS idx_esg_assessments_organization_id
  ON public.esg_assessments (organization_id);
CREATE INDEX IF NOT EXISTS idx_project_inputs_organization_id
  ON public.project_inputs (organization_id);

INSERT INTO public.schema_migrations (version, description)
VALUES (
  '0004_phase1c_organization_id_not_null',
  'NOT NULL + indexes on organization_id for backfilled tenant tables'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;

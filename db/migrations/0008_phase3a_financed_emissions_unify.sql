-- Phase 3A — Create unified app.financed_emissions and backfill from both old tables
-- Keeps emission_calculations + finance_emission_calculations untouched (dual-read).
-- public.financed_emissions is a compatibility view.

BEGIN;

CREATE TABLE IF NOT EXISTS app.financed_emissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  user_id uuid NOT NULL,
  counterparty_id uuid NULL REFERENCES public.counterparties(id) ON DELETE SET NULL,
  exposure_id uuid NULL REFERENCES public.exposures(id) ON DELETE SET NULL,
  questionnaire_id uuid NULL,
  calc_kind text NOT NULL DEFAULT 'finance'
    CHECK (calc_kind IN ('finance', 'facilitated')),
  company_type text NULL, 
  formula_id text NULL,
  formula_name text NULL,
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  results jsonb NOT NULL DEFAULT '{}'::jsonb,
  financed_emissions numeric(20, 6) NULL,
  attribution_factor numeric(20, 8) NULL,
  data_quality_score numeric(10, 4) NULL,
  status text NOT NULL DEFAULT 'completed',
  legacy_source text NULL
    CHECK (legacy_source IS NULL OR legacy_source IN ('emission_calculations', 'finance_emission_calculations')),
  legacy_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (legacy_source, legacy_id)
);

CREATE INDEX IF NOT EXISTS idx_financed_emissions_org
  ON app.financed_emissions (organization_id);
CREATE INDEX IF NOT EXISTS idx_financed_emissions_user
  ON app.financed_emissions (user_id);
CREATE INDEX IF NOT EXISTS idx_financed_emissions_counterparty
  ON app.financed_emissions (counterparty_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON app.financed_emissions TO app_user;
GRANT ALL ON app.financed_emissions TO migrator;

-- Compatibility view in public
CREATE OR REPLACE VIEW public.financed_emissions AS
SELECT * FROM app.financed_emissions;

GRANT SELECT ON public.financed_emissions TO app_user;

-- Preferred org map (same rule as Phase 1B)
CREATE TEMP TABLE tmp_user_org ON COMMIT DROP AS
SELECT
  p.user_id AS user_id,
  COALESCE(
    CASE
      WHEN p.current_organization_id IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM public.user_organizations uo
         WHERE uo.user_id = p.user_id
           AND uo.organization_id = p.current_organization_id
       )
      THEN p.current_organization_id
    END,
    (
      SELECT uo.organization_id
      FROM public.user_organizations uo
      WHERE uo.user_id = p.user_id
      ORDER BY
        CASE WHEN lower(COALESCE(uo.role, '')) IN ('admin', 'owner') THEN 0 ELSE 1 END,
        uo.created_at ASC NULLS LAST
      LIMIT 1
    )
  ) AS organization_id
FROM public.profiles p
WHERE p.user_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Backfill from emission_calculations
-- ---------------------------------------------------------------------------
INSERT INTO app.financed_emissions (
  organization_id, user_id, counterparty_id, exposure_id, questionnaire_id,
  calc_kind, company_type, formula_id, inputs, results,
  financed_emissions, attribution_factor, data_quality_score, status,
  legacy_source, legacy_id, created_at, updated_at
)
SELECT
  COALESCE(ec.organization_id, t.organization_id),
  ec.user_id,
  ec.counterparty_id,
  ec.exposure_id,
  ec.questionnaire_id,
  CASE
    WHEN lower(COALESCE(ec.calculation_type, '')) LIKE '%facilitat%' THEN 'facilitated'
    ELSE 'finance'
  END,
  ec.company_type,
  ec.formula_id,
  COALESCE(ec.inputs, '{}'::jsonb),
  COALESCE(ec.results, '{}'::jsonb),
  ec.financed_emissions,
  ec.attribution_factor,
  ec.data_quality_score,
  COALESCE(ec.status, 'completed'),
  'emission_calculations',
  ec.id,
  COALESCE(ec.created_at, now()),
  COALESCE(ec.updated_at, now())
FROM public.emission_calculations ec
LEFT JOIN tmp_user_org t ON t.user_id = ec.user_id
WHERE COALESCE(ec.organization_id, t.organization_id) IS NOT NULL
ON CONFLICT (legacy_source, legacy_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Backfill from finance_emission_calculations
-- ---------------------------------------------------------------------------
INSERT INTO app.financed_emissions (
  organization_id, user_id, counterparty_id,
  calc_kind, company_type, formula_id, formula_name, inputs, results,
  financed_emissions, attribution_factor, data_quality_score, status,
  legacy_source, legacy_id, created_at, updated_at
)
SELECT
  COALESCE(cp.organization_id, t.organization_id),
  fec.user_id,
  fec.counterparty_id,
  CASE
    WHEN lower(COALESCE(fec.calculation_type, '')) LIKE '%facilitat%' THEN 'facilitated'
    ELSE 'finance'
  END,
  fec.company_type,
  fec.formula_id,
  fec.formula_name,
  jsonb_strip_nulls(jsonb_build_object(
    'outstanding_amount', fec.outstanding_amount,
    'total_assets', fec.total_assets,
    'evic', fec.evic,
    'total_equity_plus_debt', fec.total_equity_plus_debt,
    'share_price', fec.share_price,
    'outstanding_shares', fec.outstanding_shares,
    'total_debt', fec.total_debt,
    'minority_interest', fec.minority_interest,
    'preferred_stock', fec.preferred_stock,
    'total_equity', fec.total_equity,
    'facilitated_amount', fec.facilitated_amount,
    'underwriting_amount', fec.underwriting_amount,
    'underwriting_share_pct', fec.underwriting_share_pct,
    'weighting_factor', fec.weighting_factor,
    'verified_emissions', fec.verified_emissions,
    'unverified_emissions', fec.unverified_emissions,
    'energy_consumption', fec.energy_consumption,
    'emission_factor', fec.emission_factor,
    'production', fec.production,
    'production_emission_factor', fec.production_emission_factor,
    'process_emissions', fec.process_emissions,
    'methodology', fec.methodology
  )),
  COALESCE(fec.calculation_steps, '{}'::jsonb),
  fec.financed_emissions,
  fec.attribution_factor,
  fec.data_quality_score::numeric,
  COALESCE(fec.status, 'completed'),
  'finance_emission_calculations',
  fec.id,
  COALESCE(fec.created_at, now()),
  COALESCE(fec.updated_at, now())
FROM public.finance_emission_calculations fec
LEFT JOIN public.counterparties cp ON cp.id = fec.counterparty_id
LEFT JOIN tmp_user_org t ON t.user_id = fec.user_id
WHERE COALESCE(cp.organization_id, t.organization_id) IS NOT NULL
ON CONFLICT (legacy_source, legacy_id) DO NOTHING;

-- Verify
SELECT legacy_source,
       COUNT(*) AS rows,
       COUNT(organization_id) AS with_org
FROM app.financed_emissions
GROUP BY 1
ORDER BY 1;

SELECT 'emission_calculations' AS source, COUNT(*)::bigint AS n FROM public.emission_calculations
UNION ALL
SELECT 'finance_emission_calculations', COUNT(*) FROM public.finance_emission_calculations
UNION ALL
SELECT 'app.financed_emissions', COUNT(*) FROM app.financed_emissions
ORDER BY 1;

INSERT INTO public.schema_migrations (version, description)
VALUES (
  '0008_phase3a_financed_emissions_unify',
  'Create app.financed_emissions and backfill from emission_calculations + finance_emission_calculations'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;

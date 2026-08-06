-- Phase 4A — Unified GHG model: emission_assessments + emission_activities
-- Backfills from all public scope*/ipcc_scope* entry tables into activities (raw jsonb preserved).
-- Old scope tables stay untouched (dual-read).

BEGIN;

CREATE TABLE IF NOT EXISTS app.emission_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  user_id uuid NOT NULL,
  framework text NOT NULL DEFAULT 'mixed'
    CHECK (framework IN ('uk', 'epa', 'ipcc', 'mixed')),
  reporting_period text NULL,
  status text NOT NULL DEFAULT 'imported',
  totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  legacy_note text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.emission_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES app.emission_assessments(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  user_id uuid NOT NULL,
  scope smallint NOT NULL CHECK (scope IN (1, 2, 3)),
  category text NOT NULL,
  method text NOT NULL DEFAULT 'activity_data',
  counterparty_id uuid NULL,
  quantity numeric(20, 8) NULL,
  unit text NULL,
  factor_dataset_id uuid NULL,
  factor_row_id uuid NULL,
  emissions_tco2e numeric(20, 8) NULL,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  legacy_source text NOT NULL,
  legacy_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (legacy_source, legacy_id)
);

CREATE INDEX IF NOT EXISTS idx_emission_assessments_org
  ON app.emission_assessments (organization_id);
CREATE INDEX IF NOT EXISTS idx_emission_activities_org
  ON app.emission_activities (organization_id);
CREATE INDEX IF NOT EXISTS idx_emission_activities_assessment
  ON app.emission_activities (assessment_id);
CREATE INDEX IF NOT EXISTS idx_emission_activities_scope_category
  ON app.emission_activities (scope, category);

GRANT SELECT, INSERT, UPDATE, DELETE ON app.emission_assessments, app.emission_activities TO app_user;
GRANT ALL ON app.emission_assessments, app.emission_activities TO migrator;

CREATE OR REPLACE VIEW public.emission_assessments AS SELECT * FROM app.emission_assessments;
CREATE OR REPLACE VIEW public.emission_activities AS SELECT * FROM app.emission_activities;

-- Org map
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

-- One legacy assessment per (user, org)
CREATE TEMP TABLE tmp_assessments ON COMMIT DROP AS
SELECT
  gen_random_uuid() AS assessment_id,
  t.user_id,
  t.organization_id
FROM tmp_user_org t
WHERE t.organization_id IS NOT NULL;

INSERT INTO app.emission_assessments (
  id, organization_id, user_id, framework, reporting_period, status, legacy_note
)
SELECT
  a.assessment_id,
  a.organization_id,
  a.user_id,
  'mixed',
  'legacy_import',
  'imported',
  'Created by Phase 4A backfill from scope entry tables'
FROM tmp_assessments a
WHERE NOT EXISTS (
  SELECT 1 FROM app.emission_assessments e
  WHERE e.user_id = a.user_id
    AND e.organization_id = a.organization_id
    AND e.reporting_period = 'legacy_import'
);

-- Refresh assessment ids from real table (in case re-run)
CREATE TEMP TABLE tmp_assessment_lookup ON COMMIT DROP AS
SELECT id AS assessment_id, user_id, organization_id
FROM app.emission_assessments
WHERE reporting_period = 'legacy_import';

-- ETL helper loop over scope tables
DO $$
DECLARE
  r record;
  scope_num int;
  category text;
  framework text;
  inserted bigint;
BEGIN
  FOR r IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND (
        c.relname LIKE 'scope1_%'
        OR c.relname LIKE 'scope2_%'
        OR c.relname LIKE 'scope3_%'
        OR c.relname LIKE 'ipcc_scope1_%'
      )
    ORDER BY c.relname
  LOOP
    scope_num := CASE
      WHEN r.table_name LIKE 'scope1_%' OR r.table_name LIKE 'ipcc_scope1_%' THEN 1
      WHEN r.table_name LIKE 'scope2_%' THEN 2
      ELSE 3
    END;

    category := CASE
      WHEN r.table_name LIKE '%fuel%' AND r.table_name NOT LIKE '%fuel_energy%' THEN 'fuel'
      WHEN r.table_name LIKE '%refrigerant%' THEN 'refrigerant'
      WHEN r.table_name LIKE '%passenger%' THEN 'passenger_vehicle'
      WHEN r.table_name LIKE '%delivery%' THEN 'delivery_vehicle'
      WHEN r.table_name LIKE '%heatsteam%' OR r.table_name LIKE '%heat_steam%' THEN 'heat_steam'
      WHEN r.table_name LIKE '%electricity%' THEN 'electricity'
      WHEN r.table_name LIKE '%business_travel%' THEN 'business_travel'
      WHEN r.table_name LIKE '%employee_commuting%' THEN 'employee_commuting'
      WHEN r.table_name LIKE '%capital_goods%' THEN 'capital_goods'
      WHEN r.table_name LIKE '%purchased_goods%' THEN 'purchased_goods_services'
      WHEN r.table_name LIKE '%upstream_transport%' THEN 'upstream_transportation'
      WHEN r.table_name LIKE '%downstream_transport%' THEN 'downstream_transportation'
      WHEN r.table_name LIKE '%waste%' THEN 'waste'
      WHEN r.table_name LIKE '%investments%' THEN 'investments'
      WHEN r.table_name LIKE '%facilitated%' THEN 'facilitated'
      WHEN r.table_name LIKE '%lca%' THEN 'lca'
      WHEN r.table_name LIKE '%flaring%' THEN 'flaring'
      WHEN r.table_name LIKE '%venting%' THEN 'venting'
      WHEN r.table_name LIKE '%kitchen%' THEN 'kitchen'
      WHEN r.table_name LIKE '%power%' THEN 'power'
      WHEN r.table_name LIKE '%heating%' THEN 'heating'
      WHEN r.table_name LIKE '%vehicular%' OR r.table_name LIKE '%vehicle%' OR r.table_name LIKE '%on_road%' OR r.table_name LIKE '%non_road%' OR r.table_name LIKE '%mobile%' THEN 'mobile'
      WHEN r.table_name LIKE '%end_of_life%' THEN 'end_of_life'
      WHEN r.table_name LIKE '%processing_sold%' THEN 'processing_sold_products'
      WHEN r.table_name LIKE '%use_of_sold%' THEN 'use_of_sold_products'
      WHEN r.table_name LIKE '%fuel_energy%' THEN 'fuel_energy_activities'
      ELSE regexp_replace(r.table_name, '^(scope[123]_|ipcc_scope1_)', '')
    END;

    framework := CASE
      WHEN r.table_name LIKE '%_epa%' OR r.table_name LIKE '%epa_%' THEN 'epa'
      WHEN r.table_name LIKE 'ipcc_%' THEN 'ipcc'
      ELSE 'uk'
    END;

    -- Only tables with id + user_id
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = r.table_name AND column_name = 'user_id'
    ) OR NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = r.table_name AND column_name = 'id'
    ) THEN
      RAISE NOTICE 'Skip % (missing id/user_id)', r.table_name;
      CONTINUE;
    END IF;

    EXECUTE format(
      $sql$
        INSERT INTO app.emission_activities (
          assessment_id, organization_id, user_id,
          scope, category, method, counterparty_id,
          quantity, unit, emissions_tco2e, raw,
          legacy_source, legacy_id, created_at
        )
        SELECT
          a.assessment_id,
          a.organization_id,
          s.user_id,
          $1,
          $2,
          'activity_data',
          CASE WHEN j ? 'counterparty_id' AND NULLIF(j->>'counterparty_id','') IS NOT NULL
               THEN (j->>'counterparty_id')::uuid END,
          CASE WHEN COALESCE(j->>'quantity', j->>'amount') ~ '^-?[0-9]+(\\.[0-9]+)?([eE][-+]?[0-9]+)?$'
               THEN COALESCE(j->>'quantity', j->>'amount')::numeric END,
          COALESCE(NULLIF(j->>'unit',''), NULLIF(j->>'Unit','')),
          CASE WHEN COALESCE(j->>'emissions', j->>'emissions_tco2e', j->>'emissions_output')
                    ~ '^-?[0-9]+(\\.[0-9]+)?([eE][-+]?[0-9]+)?$'
               THEN COALESCE(j->>'emissions', j->>'emissions_tco2e', j->>'emissions_output')::numeric END,
          j || jsonb_build_object('_inferred_framework', $3::text),
          $4,
          s.id,
          COALESCE(
            CASE WHEN j ? 'created_at' THEN (j->>'created_at')::timestamptz END,
            now()
          )
        FROM public.%I s
        JOIN tmp_assessment_lookup a ON a.user_id = s.user_id
        CROSS JOIN LATERAL (SELECT to_jsonb(s) AS j) x
        ON CONFLICT (legacy_source, legacy_id) DO NOTHING
      $sql$,
      r.table_name
    )
    USING scope_num, category, framework, r.table_name;

    GET DIAGNOSTICS inserted = ROW_COUNT;
    RAISE NOTICE 'ETL % -> % activities (scope %, category %)', r.table_name, inserted, scope_num, category;
  END LOOP;
END
$$;

-- Verify
SELECT scope, category, COUNT(*) AS n
FROM app.emission_activities
GROUP BY 1, 2
ORDER BY 1, 2;

SELECT 'assessments' AS kind, COUNT(*)::bigint AS n FROM app.emission_assessments
UNION ALL
SELECT 'activities', COUNT(*) FROM app.emission_activities
ORDER BY 1;

INSERT INTO public.schema_migrations (version, description)
VALUES (
  '0009_phase4a_emission_assessments_activities',
  'Create app.emission_assessments/activities and backfill from scope entry tables'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;

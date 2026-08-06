-- Phase 2C — Create versioned factor model and ETL from existing ref.* sheets
-- Keeps the old ref.* tables and public views untouched (dual-read ready).
-- Safe / re-runnable: deletes prior ETL rows for each dataset code before re-insert.

BEGIN;

CREATE TABLE IF NOT EXISTS ref.factor_datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  publisher text NOT NULL DEFAULT 'legacy',
  title text NOT NULL,
  version_label text NOT NULL DEFAULT 'imported',
  effective_from date NULL,
  effective_to date NULL,
  is_active boolean NOT NULL DEFAULT true,
  source_notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ref.factor_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid NOT NULL REFERENCES ref.factor_datasets(id) ON DELETE CASCADE,
  category text NOT NULL,
  label text NULL,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  unit text NULL,
  kg_co2e numeric(20, 8) NULL,
  kg_co2 numeric(20, 8) NULL,
  kg_ch4 numeric(20, 8) NULL,
  kg_n2o numeric(20, 8) NULL,
  meta jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_factor_rows_dataset_category
  ON ref.factor_rows (dataset_id, category);
CREATE INDEX IF NOT EXISTS idx_factor_rows_attributes_gin
  ON ref.factor_rows USING gin (attributes);

GRANT SELECT ON ref.factor_datasets, ref.factor_rows TO catalog_reader, app_user;
GRANT ALL ON ref.factor_datasets, ref.factor_rows TO migrator;

-- ---------------------------------------------------------------------------
-- ETL every physical factor sheet still in ref (skip the new model tables)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
  ds_id uuid;
  ds_code text;
  cat text;
  inserted bigint;
BEGIN
  FOR r IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'ref'
      AND c.relkind = 'r'
      AND c.relname NOT IN ('factor_datasets', 'factor_rows')
    ORDER BY c.relname
  LOOP
    ds_code := lower(regexp_replace(r.table_name, '[^a-zA-Z0-9]+', '_', 'g'));
    ds_code := trim(both '_' from ds_code);

    cat := CASE
      WHEN r.table_name ILIKE '%fuel%' THEN 'fuel'
      WHEN r.table_name ILIKE '%passenger%' THEN 'passenger'
      WHEN r.table_name ILIKE '%delivery%' THEN 'delivery'
      WHEN r.table_name ILIKE '%refrigerant%' OR r.table_name ILIKE '%gwp%' THEN 'refrigerant'
      WHEN r.table_name ILIKE '%mobile%' THEN 'mobile'
      WHEN r.table_name ILIKE '%stationary%' THEN 'stationary'
      WHEN r.table_name ILIKE '%road%' OR r.table_name ILIKE '%vehicle%' THEN 'road'
      WHEN r.table_name ILIKE '%heat%' OR r.table_name ILIKE '%steam%' THEN 'heat_steam'
      WHEN r.table_name ILIKE '%waste%' THEN 'waste'
      WHEN r.table_name ILIKE '%travel%' THEN 'business_travel'
      WHEN r.table_name ILIKE '%transport%' THEN 'transport'
      WHEN r.table_name ILIKE 'ipcc%' THEN 'ipcc'
      ELSE 'legacy_sheet'
    END;

    INSERT INTO ref.factor_datasets (code, publisher, title, version_label, is_active, source_notes)
    VALUES (
      ds_code,
      CASE
        WHEN r.table_name ILIKE 'uk%' THEN 'UK'
        WHEN r.table_name ILIKE '%epa%' OR r.table_name ILIKE 'fuel epa%' THEN 'EPA'
        WHEN r.table_name ILIKE 'ipcc%' THEN 'IPCC'
        ELSE 'legacy'
      END,
      r.table_name,
      'imported_from_sheet',
      true,
      'ETL from ref.' || r.table_name
    )
    ON CONFLICT (code) DO UPDATE
      SET title = EXCLUDED.title,
          source_notes = EXCLUDED.source_notes,
          is_active = true
    RETURNING id INTO ds_id;

    SELECT id INTO ds_id FROM ref.factor_datasets WHERE code = ds_code;

    DELETE FROM ref.factor_rows WHERE dataset_id = ds_id;

    EXECUTE format(
      $sql$
        INSERT INTO ref.factor_rows (
          dataset_id, category, label, attributes, unit, kg_co2e, kg_co2, kg_ch4, kg_n2o, meta
        )
        SELECT
          $1,
          $2,
          COALESCE(
            NULLIF(j->>'Fuel', ''),
            NULLIF(j->>'Fuel Type', ''),
            NULLIF(j->>'Activity', ''),
            NULLIF(j->>'activity', ''),
            NULLIF(j->>'type', ''),
            NULLIF(j->>'Vehicle Type', ''),
            NULLIF(j->>'Category', '')
          ),
          j,
          COALESCE(NULLIF(j->>'Unit', ''), NULLIF(j->>'unit', ''), NULLIF(j->>'HIV Unit', '')),
          CASE WHEN COALESCE(j->>'kg CO2e', j->>'kg_co2e') ~ '^-?[0-9]+(\\.[0-9]+)?([eE][-+]?[0-9]+)?$'
               THEN COALESCE(j->>'kg CO2e', j->>'kg_co2e')::numeric END,
          CASE WHEN COALESCE(j->>'kg CO2e of CO2 per unit', j->>'kg_co2e_of_co2_per_unit', j->>'CO2 Factor')
                    ~ '^-?[0-9]+(\\.[0-9]+)?([eE][-+]?[0-9]+)?$'
               THEN COALESCE(j->>'kg CO2e of CO2 per unit', j->>'kg_co2e_of_co2_per_unit', j->>'CO2 Factor')::numeric END,
          CASE WHEN COALESCE(j->>'kg CO2e of CH4 per unit', j->>'kg_co2e_of_ch4_per_unit', j->>'CH4 Factor')
                    ~ '^-?[0-9]+(\\.[0-9]+)?([eE][-+]?[0-9]+)?$'
               THEN COALESCE(j->>'kg CO2e of CH4 per unit', j->>'kg_co2e_of_ch4_per_unit', j->>'CH4 Factor')::numeric END,
          CASE WHEN COALESCE(j->>'kg CO2e of N2O per unit', j->>'kg_co2e_of_n2o_per_unit', j->>'N2O Factor')
                    ~ '^-?[0-9]+(\\.[0-9]+)?([eE][-+]?[0-9]+)?$'
               THEN COALESCE(j->>'kg CO2e of N2O per unit', j->>'kg_co2e_of_n2o_per_unit', j->>'N2O Factor')::numeric END,
          j
        FROM (
          SELECT to_jsonb(t) AS j
          FROM ref.%I t
        ) s
      $sql$,
      r.table_name
    )
    USING ds_id, cat;

    GET DIAGNOSTICS inserted = ROW_COUNT;
    RAISE NOTICE 'ETL % -> dataset % (% rows)', r.table_name, ds_code, inserted;
  END LOOP;
END
$$;

-- Verify
SELECT d.code, d.publisher, d.title, COUNT(r.id) AS row_count
FROM ref.factor_datasets d
LEFT JOIN ref.factor_rows r ON r.dataset_id = d.id
GROUP BY d.code, d.publisher, d.title
ORDER BY d.code;

INSERT INTO public.schema_migrations (version, description)
VALUES (
  '0007_phase2c_factor_datasets_rows_etl',
  'Create ref.factor_datasets/factor_rows and ETL from existing ref factor sheets'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- UK_refrigerant_factors: column comments + RLS (reference data, read-only for authenticated).
-- scope1_refrigerant_entries: optional columns for UK calculator (Activity, Unit, which kg CO2e column).

ALTER TABLE scope1_refrigerant_entries
  ADD COLUMN IF NOT EXISTS activity TEXT,
  ADD COLUMN IF NOT EXISTS quantity_unit TEXT,
  ADD COLUMN IF NOT EXISTS uk_refrigerant_basis TEXT;

COMMENT ON COLUMN scope1_refrigerant_entries.activity IS
  'UK calculator: Activity column from UK_refrigerant_factors.';

COMMENT ON COLUMN scope1_refrigerant_entries.quantity_unit IS
  'UK calculator: Unit column from UK_refrigerant_factors (e.g. kg).';

COMMENT ON COLUMN scope1_refrigerant_entries.uk_refrigerant_basis IS
  'UK calculator: kyoto | non_kyoto | total — which reference column was used.';

-- Comments on reference table (handles quoted "UK_refrigerant_factors" or uk_refrigerant_factors).
DO $$
DECLARE
  tbl regclass;
  rel_oid oid;
BEGIN
  tbl := to_regclass('public."UK_refrigerant_factors"');
  IF tbl IS NULL THEN
    tbl := to_regclass('public.uk_refrigerant_factors');
  END IF;

  IF tbl IS NULL THEN
    RAISE NOTICE 'UK_refrigerant_factors not found; skip reference comments and RLS.';
    RETURN;
  END IF;

  rel_oid := tbl::oid;

  EXECUTE format(
    'COMMENT ON TABLE %s IS %L',
    tbl,
    'UK refrigerant emission factors: kg CO2e per activity unit (Kyoto-only, non-Kyoto-only, and total columns).'
  );

  -- Kyoto column (import may name it "kg CO2e" or kg_co2e)
  IF EXISTS (
    SELECT 1
    FROM pg_attribute a
    WHERE a.attrelid = rel_oid
      AND a.attname = 'kg CO2e'
      AND a.attnum > 0
      AND NOT a.attisdropped
  ) THEN
    EXECUTE format(
      'COMMENT ON COLUMN %s.%I IS %L',
      tbl,
      'kg CO2e',
      'Emissions including only Kyoto products (kg CO2e per unit).'
    );
  ELSIF EXISTS (
    SELECT 1 FROM pg_attribute a
    WHERE a.attrelid = rel_oid AND a.attname = 'kg_co2e' AND a.attnum > 0 AND NOT a.attisdropped
  ) THEN
    EXECUTE format(
      'COMMENT ON COLUMN %s.kg_co2e IS %L',
      tbl,
      'Emissions including only Kyoto products (kg CO2e per unit).'
    );
  END IF;

  -- Non-Kyoto column
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    WHERE a.attrelid = rel_oid AND a.attname = 'kg CO2e_1' AND a.attnum > 0 AND NOT a.attisdropped
  ) THEN
    EXECUTE format(
      'COMMENT ON COLUMN %s.%I IS %L',
      tbl,
      'kg CO2e_1',
      'Emissions including only non-Kyoto products (kg CO2e per unit).'
    );
  ELSIF EXISTS (
    SELECT 1 FROM pg_attribute a
    WHERE a.attrelid = rel_oid AND a.attname = 'kg_co2e_1' AND a.attnum > 0 AND NOT a.attisdropped
  ) THEN
    EXECUTE format(
      'COMMENT ON COLUMN %s.kg_co2e_1 IS %L',
      tbl,
      'Emissions including only non-Kyoto products (kg CO2e per unit).'
    );
  END IF;

  -- Total column
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    WHERE a.attrelid = rel_oid AND a.attname = 'kg CO2e_2' AND a.attnum > 0 AND NOT a.attisdropped
  ) THEN
    EXECUTE format(
      'COMMENT ON COLUMN %s.%I IS %L',
      tbl,
      'kg CO2e_2',
      'Total emissions including non-Kyoto products (kg CO2e per unit).'
    );
  ELSIF EXISTS (
    SELECT 1 FROM pg_attribute a
    WHERE a.attrelid = rel_oid AND a.attname = 'kg_co2e_2' AND a.attnum > 0 AND NOT a.attisdropped
  ) THEN
    EXECUTE format(
      'COMMENT ON COLUMN %s.kg_co2e_2 IS %L',
      tbl,
      'Total emissions including non-Kyoto products (kg CO2e per unit).'
    );
  END IF;

  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl);
  EXECUTE format('DROP POLICY IF EXISTS uk_refrigerant_factors_select_authenticated ON %s', tbl);
  EXECUTE format(
    'CREATE POLICY uk_refrigerant_factors_select_authenticated ON %s FOR SELECT TO authenticated USING (auth.role() = ''authenticated'')',
    tbl
  );
END $$;

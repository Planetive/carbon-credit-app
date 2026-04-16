-- RLS for UK delivery reference data (primary: `UK_delivery-factors`; also legacy snake_case names).
-- Extend Scope 1 delivery entries to match reference dimensions (fuel, laden level, factor column).

ALTER TABLE scope1_delivery_vehicle_entries
  ADD COLUMN IF NOT EXISTS fuel_type TEXT,
  ADD COLUMN IF NOT EXISTS laden_level TEXT,
  ADD COLUMN IF NOT EXISTS uk_factor_basis TEXT DEFAULT 'total';

COMMENT ON COLUMN scope1_delivery_vehicle_entries.fuel_type IS
  'Fuel from UK delivery factors (e.g. Diesel) with activity, vehicle type, and unit.';
COMMENT ON COLUMN scope1_delivery_vehicle_entries.laden_level IS
  'Laden level from UK delivery factors (e.g. % laden), matching reference laden_lev.';
COMMENT ON COLUMN scope1_delivery_vehicle_entries.uk_factor_basis IS
  'Which reference numeric column was used: total, co2, ch4, or n2o.';

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.oid::regclass AS tbl
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname IN (
        'UK_delivery_factors',
        'uk_delivery_factors',
        'UK_delivery-factors',
        'uk_delivery-factors'
      )
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', r.tbl);
    EXECUTE format('DROP POLICY IF EXISTS uk_delivery_factors_select_authenticated ON %s', r.tbl);
    EXECUTE format(
      'CREATE POLICY uk_delivery_factors_select_authenticated ON %s FOR SELECT TO authenticated USING (auth.role() = ''authenticated'')',
      r.tbl
    );
  END LOOP;
END $$;

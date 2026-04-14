-- UK fuel reference table RLS + persist which UK factor column was used on saved Scope 1 fuel rows.
-- Your reference table may be named "UK_Fuel_Factors" (quoted) or uk_fuel_factors; this migration
-- enables SELECT for authenticated users on whichever exists.

ALTER TABLE scope1_fuel_entries
  ADD COLUMN IF NOT EXISTS uk_factor_basis TEXT;

COMMENT ON COLUMN scope1_fuel_entries.uk_factor_basis IS
  'UK calculator: which UK_Fuel_Factors column was used: total | co2 | ch4 | n2o.';

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
      AND c.relname IN ('UK_Fuel_Factors', 'uk_fuel_factors')
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', r.tbl);
    EXECUTE format('DROP POLICY IF EXISTS uk_fuel_factors_select_authenticated ON %s', r.tbl);
    EXECUTE format(
      'CREATE POLICY uk_fuel_factors_select_authenticated ON %s FOR SELECT TO authenticated USING (auth.role() = ''authenticated'')',
      r.tbl
    );
  END LOOP;
END $$;

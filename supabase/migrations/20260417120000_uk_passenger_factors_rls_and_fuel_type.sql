-- RLS for UK passenger vehicle reference data (UK_Passenger_factors / uk_passenger_factors).
-- Table may already exist in the project; this only enables SELECT for authenticated users.
-- Also persist fuel type on saved Scope 1 passenger rows (Petrol / Diesel / …).

ALTER TABLE scope1_passenger_vehicle_entries
  ADD COLUMN IF NOT EXISTS fuel_type TEXT;

COMMENT ON COLUMN scope1_passenger_vehicle_entries.fuel_type IS
  'Fuel from UK_Passenger_factors (e.g. Petrol, Diesel) used with activity, vehicle type, and unit.';

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
      AND c.relname IN ('UK_Passenger_factors', 'uk_passenger_factors')
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', r.tbl);
    EXECUTE format('DROP POLICY IF EXISTS uk_passenger_factors_select_authenticated ON %s', r.tbl);
    EXECUTE format(
      'CREATE POLICY uk_passenger_factors_select_authenticated ON %s FOR SELECT TO authenticated USING (auth.role() = ''authenticated'')',
      r.tbl
    );
  END LOOP;
END $$;

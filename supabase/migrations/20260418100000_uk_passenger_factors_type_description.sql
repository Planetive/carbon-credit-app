-- Optional: long text for the passenger "Type" hover panel (same copy can repeat on each row for a given activity + type).
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
    EXECUTE format('ALTER TABLE %s ADD COLUMN IF NOT EXISTS type_description TEXT', r.tbl);
    EXECUTE format(
      'COMMENT ON COLUMN %s.type_description IS %L',
      r.tbl,
      'Optional tooltip for vehicle type in the emission calculator (hover on Type).'
    );
  END LOOP;
END $$;

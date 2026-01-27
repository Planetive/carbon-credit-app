-- RLS policies for "Fuel EPA" reference table
-- This table stores Scope 1 fuel CO2 factors (e.g. kg CO2 per mmBtu)
-- and is intended to be used as a future replacement for the hard-coded
-- Scope 1 fuel factors in the frontend.

-- Ensure the table exists and enable Row Level Security
DO $$
BEGIN
  EXECUTE 'ALTER TABLE IF EXISTS "Fuel EPA" ENABLE ROW LEVEL SECURITY';
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Table "Fuel EPA" does not exist yet';
END $$;

-- Drop any existing policy with the same name to avoid conflicts
DROP POLICY IF EXISTS "Fuel EPA factors readable by all authenticated users" ON "Fuel EPA";

-- Allow all authenticated users to read the reference data
CREATE POLICY "Fuel EPA factors readable by all authenticated users"
ON "Fuel EPA"
FOR SELECT
USING (auth.role() = 'authenticated');

-- (Optional) you can also allow public read access by uncommenting below:
-- DROP POLICY IF EXISTS "Fuel EPA factors publicly readable" ON "Fuel EPA";
-- CREATE POLICY "Fuel EPA factors publicly readable"
-- ON "Fuel EPA"
-- FOR SELECT
-- USING (true);

COMMENT ON TABLE "Fuel EPA" IS
  'Reference table for Scope 1 fuel CO2 factors (e.g. kg CO2 per mmBtu, with Fuel and Category columns).';


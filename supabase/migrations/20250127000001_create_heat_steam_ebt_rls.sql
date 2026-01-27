-- RLS policies for "heat and steam" (UK standard) and "heat and steam EBT" tables
-- These tables contain reference data for heat and steam emission factors
-- All authenticated users should be able to read this data

-- ============================================
-- "heat and steam" table (UK standard)
-- ============================================
-- Enable Row Level Security (RLS) if not already enabled
DO $$
BEGIN
    EXECUTE 'ALTER TABLE IF EXISTS "heat and steam" ENABLE ROW LEVEL SECURITY';
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Table "heat and steam" does not exist yet';
END $$;

-- Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "heat_steam_uk_readable_by_authenticated_users" ON "heat and steam";

-- Policy: All authenticated users can read heat and steam UK data (global reference data)
CREATE POLICY "heat_steam_uk_readable_by_authenticated_users" 
ON "heat and steam"
FOR SELECT
USING (auth.role() = 'authenticated');

-- Add comment
COMMENT ON TABLE "heat and steam" IS 'Reference data for UK standard heat and steam emission factors. Contains Activity, Unit, and kg CO2 / mmBtu columns.';

-- ============================================
-- "heat and steam EBT" table (EBT standard)
-- ============================================
-- Enable Row Level Security (RLS) if not already enabled
DO $$
BEGIN
    EXECUTE 'ALTER TABLE IF EXISTS "heat and steam EBT" ENABLE ROW LEVEL SECURITY';
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Table "heat and steam EBT" does not exist yet';
END $$;

-- Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "heat_steam_ebt_readable_by_authenticated_users" ON "heat and steam EBT";

-- Policy: All authenticated users can read heat and steam EBT data (global reference data)
CREATE POLICY "heat_steam_ebt_readable_by_authenticated_users" 
ON "heat and steam EBT"
FOR SELECT
USING (auth.role() = 'authenticated');

-- Add comment
COMMENT ON TABLE "heat and steam EBT" IS 'Reference data for EBT standard heat and steam emission factors. Contains Activity, Unit, and kg CO2 / mmBtu columns.';

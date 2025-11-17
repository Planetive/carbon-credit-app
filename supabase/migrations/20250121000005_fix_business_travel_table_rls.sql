-- Fix RLS policies for "business travel" table
-- This ensures authenticated users can read business travel vehicle types (reference data)

-- First, check if the table exists and enable RLS if needed
DO $$
BEGIN
    -- Enable RLS on the table (if it exists)
    EXECUTE 'ALTER TABLE IF EXISTS "business travel" ENABLE ROW LEVEL SECURITY';
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Table "business travel" does not exist yet';
END $$;

-- Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Business travel types are readable by all authenticated users" ON "business travel";

-- Create policy: All authenticated users can read business travel types (global reference data)
CREATE POLICY "Business travel types are readable by all authenticated users" 
ON "business travel"
FOR SELECT
USING (auth.role() = 'authenticated');


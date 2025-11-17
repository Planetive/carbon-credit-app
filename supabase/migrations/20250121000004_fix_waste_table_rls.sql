-- Fix RLS policies for "waste" table
-- This ensures authenticated users can read waste materials (reference data)

-- First, check if the table exists and enable RLS if needed
DO $$
BEGIN
    -- Enable RLS on the table (if it exists)
    EXECUTE 'ALTER TABLE IF EXISTS waste ENABLE ROW LEVEL SECURITY';
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Table "waste" does not exist yet';
END $$;

-- Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Waste materials are readable by all authenticated users" ON waste;

-- Create policy: All authenticated users can read waste materials (global reference data)
CREATE POLICY "Waste materials are readable by all authenticated users" 
ON waste
FOR SELECT
USING (auth.role() = 'authenticated');


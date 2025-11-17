-- Fix RLS policies for "UpstreamTransportation and Distribution" table
-- This ensures authenticated users can read the vehicle types

-- First, check if the table exists and enable RLS if needed
DO $$
BEGIN
    -- Enable RLS on the table (if it exists)
    EXECUTE 'ALTER TABLE IF EXISTS "UpstreamTransportation and Distribution" ENABLE ROW LEVEL SECURITY';
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Table "UpstreamTransportation and Distribution" does not exist yet';
END $$;

-- Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Vehicle types are readable by all authenticated users" ON "UpstreamTransportation and Distribution";

-- Create policy: All authenticated users can read vehicle types (global data)
CREATE POLICY "Vehicle types are readable by all authenticated users" 
ON "UpstreamTransportation and Distribution"
FOR SELECT
USING (auth.role() = 'authenticated');

-- Also allow public read access if needed (for unauthenticated users during development)
-- Uncomment the following if you want public read access:
-- DROP POLICY IF EXISTS "Vehicle types are publicly readable" ON "UpstreamTransportation and Distribution";
-- CREATE POLICY "Vehicle types are publicly readable" 
-- ON "UpstreamTransportation and Distribution"
-- FOR SELECT
-- USING (true);


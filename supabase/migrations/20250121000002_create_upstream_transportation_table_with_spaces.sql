-- Create " UpstreamTransportation and Distribution" table with exact name as in Supabase
-- Note: There is a leading space before "UpstreamTransportation"
-- This matches the table name the user has in their database

CREATE TABLE IF NOT EXISTS " UpstreamTransportation and Distribution" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "Vehicle Type" TEXT NOT NULL,
    " CO2 Factor (kg CO2 / unit) " NUMERIC(20,10) NOT NULL,
    "Units" TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_upstream_transport_vehicle_type 
ON " UpstreamTransportation and Distribution"("Vehicle Type");

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_upstream_transport_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_upstream_transport_updated_at
    BEFORE UPDATE ON " UpstreamTransportation and Distribution"
    FOR EACH ROW
    EXECUTE FUNCTION update_upstream_transport_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE " UpstreamTransportation and Distribution" ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read vehicle types (global data)
DROP POLICY IF EXISTS "Vehicle types are readable by all authenticated users" ON " UpstreamTransportation and Distribution";

CREATE POLICY "Vehicle types are readable by all authenticated users" 
ON " UpstreamTransportation and Distribution"
FOR SELECT
USING (auth.role() = 'authenticated');

-- Add comments
COMMENT ON TABLE " UpstreamTransportation and Distribution" IS 'Vehicle types database for Scope 3 Upstream Transportation calculations';
COMMENT ON COLUMN " UpstreamTransportation and Distribution"."Vehicle Type" IS 'Type of vehicle (e.g., Aircraft, Truck, Ship, Rail)';
COMMENT ON COLUMN " UpstreamTransportation and Distribution"." CO2 Factor (kg CO2 / unit) " IS 'CO2 emission factor in kg CO2/unit';
COMMENT ON COLUMN " UpstreamTransportation and Distribution"."Units" IS 'Unit of measurement for CO2 factor';


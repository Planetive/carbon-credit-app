-- Create "Upstream Transportation and Distribution" table
-- This matches the exact table name shown in Supabase dashboard

-- First, check if table exists and drop it if needed (optional - remove if you want to keep existing data)
-- DROP TABLE IF EXISTS "Upstream Transportation and Distribution" CASCADE;

CREATE TABLE IF NOT EXISTS "Upstream Transportation and Distribution" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "Vehicle Type" TEXT NOT NULL,
    "CO2 Factor (kg CO2 / unit)" NUMERIC(20,10) NOT NULL,
    "Units" TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_upstream_transport_vehicle_type 
ON "Upstream Transportation and Distribution"("Vehicle Type");

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_upstream_transport_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_upstream_transport_updated_at
    BEFORE UPDATE ON "Upstream Transportation and Distribution"
    FOR EACH ROW
    EXECUTE FUNCTION update_upstream_transport_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE "Upstream Transportation and Distribution" ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read vehicle types (global data)
DROP POLICY IF EXISTS "Vehicle types are readable by all authenticated users" ON "Upstream Transportation and Distribution";

CREATE POLICY "Vehicle types are readable by all authenticated users" 
ON "Upstream Transportation and Distribution"
FOR SELECT
USING (auth.role() = 'authenticated');

-- Insert sample data (based on the image you showed)
INSERT INTO "Upstream Transportation and Distribution" ("Vehicle Type", "CO2 Factor (kg CO2 / unit)", "Units")
VALUES
    ('Aircraft', 1.086, 'short ton-mile'),
    ('Light-Duty Truck B', 0.394, 'vehicle-mile'),
    ('Medium- and Heavy-Duty Truck', 1.298, 'vehicle-mile'),
    ('Medium- and Heavy-Duty TruckC', 0.186, 'short ton-mile'),
    ('Passenger Car A', 0.297, 'vehicle-mile'),
    ('Rail', 0.021, 'short ton-mile'),
    ('Waterborne Craft', 0.077, 'short ton-mile')
ON CONFLICT DO NOTHING;

-- Add comments
COMMENT ON TABLE "Upstream Transportation and Distribution" IS 'Vehicle types database for Scope 3 Upstream Transportation calculations';
COMMENT ON COLUMN "Upstream Transportation and Distribution"."Vehicle Type" IS 'Type of vehicle (e.g., Aircraft, Truck, Ship, Rail)';
COMMENT ON COLUMN "Upstream Transportation and Distribution"."CO2 Factor (kg CO2 / unit)" IS 'CO2 emission factor in kg CO2/unit';
COMMENT ON COLUMN "Upstream Transportation and Distribution"."Units" IS 'Unit of measurement for CO2 factor';


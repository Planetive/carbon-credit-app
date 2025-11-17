-- Create upstream_transportation_vehicles table for Scope 3 Upstream Transportation
-- This table stores vehicle types with CO2 emission factors
CREATE TABLE IF NOT EXISTS upstream_transportation_vehicles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_type TEXT NOT NULL UNIQUE, -- Vehicle type (e.g., "Truck", "Ship", "Airplane", "Train")
    co2_factor NUMERIC(20,10) NOT NULL, -- CO2 Factor in Kg CO2/Unit
    unit TEXT NOT NULL, -- Unit of measurement (e.g., "kg CO2/km", "kg CO2/tonne-km", "kg CO2/litre")
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure vehicle types are unique
    CONSTRAINT unique_vehicle_type UNIQUE (vehicle_type)
);

-- Create indexes for fast searching
CREATE INDEX IF NOT EXISTS idx_upstream_transport_vehicle_type ON upstream_transportation_vehicles(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_upstream_transport_vehicle_search ON upstream_transportation_vehicles USING gin(to_tsvector('english', vehicle_type));

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_upstream_transport_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_upstream_transport_updated_at
    BEFORE UPDATE ON upstream_transportation_vehicles
    FOR EACH ROW
    EXECUTE FUNCTION update_upstream_transport_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE upstream_transportation_vehicles ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read vehicle types (global data)
CREATE POLICY "Vehicle types are readable by all authenticated users" ON upstream_transportation_vehicles
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Policy: Only service role can insert/update/delete (admin operations)
-- Note: This will be handled by service role key, not RLS policy
-- Regular users cannot modify vehicle type data

-- Add comments to table
COMMENT ON TABLE upstream_transportation_vehicles IS 'Vehicle types database for Scope 3 Upstream Transportation calculations';
COMMENT ON COLUMN upstream_transportation_vehicles.vehicle_type IS 'Type of vehicle (e.g., Truck, Ship, Airplane, Train)';
COMMENT ON COLUMN upstream_transportation_vehicles.co2_factor IS 'CO2 emission factor in Kg CO2/Unit';
COMMENT ON COLUMN upstream_transportation_vehicles.unit IS 'Unit of measurement for CO2 factor (e.g., kg CO2/km, kg CO2/tonne-km)';


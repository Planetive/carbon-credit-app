-- Create emission_calculator table with all fields from Scope 1, 2, and 3
CREATE TABLE IF NOT EXISTS emission_calculator (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Scope 1: Direct emissions from owned or controlled sources
    
    -- Stationary Combustion
    sc1_fuel_type TEXT,
    sc1_quantity DECIMAL,
    sc1_equipment_type TEXT,
    sc1_capacity DECIMAL,
    sc1_units TEXT,
    sc1_operating_hours TEXT,
    sc1_efficiency DECIMAL,
    
    -- Mobile Combustion
    mc_vehicle_type TEXT,
    mc_fuel_consumption DECIMAL,
    mc_distance DECIMAL,
    mc_efficiency TEXT,
    mc_fuel_type TEXT,
    
    -- Fugitive Emissions
    fe_refrigerant_types TEXT,
    fe_quantity TEXT,
    fe_leakage_rates DECIMAL,
    fe_equipment_type TEXT,
    fe_maintenance_records TEXT,
    
    -- Scope 2: Indirect emissions from purchased energy
    
    -- Purchased Electricity
    s2_electricity_consumption DECIMAL,
    s2_provider TEXT,
    s2_grid_ef TEXT,
    s2_renewable_pct DECIMAL,
    s2_efficiency_measures TEXT,
    
    -- Steam/Heating/Cooling
    s2_energy_source TEXT,
    s2_total_energy TEXT,
    s2_distribution TEXT,
    s2_ratings TEXT,
    
    -- Scope 3: Other indirect emissions in the value chain
    
    -- Purchased Goods and Services
    s3_pgs_supplier_details TEXT,
    s3_pgs_material_qty DECIMAL,
    s3_pgs_transport_methods TEXT,
    s3_pgs_supplier_ratings TEXT,
    
    -- Capital Goods
    s3_cg_specs TEXT,
    s3_cg_location TEXT,
    s3_cg_material TEXT,
    s3_cg_lca TEXT,
    
    -- Fuel and Energy Related Activities
    s3_fe_upstream TEXT,
    s3_fe_extraction TEXT,
    s3_fe_distance TEXT,
    s3_fe_refining TEXT,
    
    -- Upstream Transportation
    s3_ut_modes TEXT,
    s3_ut_distance DECIMAL,
    s3_ut_vehicle_types TEXT,
    s3_ut_fuel_consumption DECIMAL,
    
    -- Waste Generated
    s3_wg_types TEXT,
    s3_wg_volume DECIMAL,
    s3_wg_methods TEXT,
    s3_wg_recycling DECIMAL,
    
    -- Business Travel
    s3_bt_modes TEXT,
    s3_bt_distance DECIMAL,
    s3_bt_accommodation DECIMAL,
    s3_bt_commute_data TEXT,
    
    -- Employee Commuting
    s3_ec_modes TEXT,
    s3_ec_distance DECIMAL,
    s3_ec_wfh_pct DECIMAL,
    s3_ec_employees TEXT,
    s3_ec_carpooling DECIMAL,
    
    -- Upstream Leased Assets
    s3_ula_asset_types TEXT,
    s3_ula_lease_duration TEXT,
    s3_ula_energy TEXT,
    s3_ula_maintenance TEXT,
    
    -- Investments
    s3_inv_types TEXT,
    s3_inv_composition TEXT,
    s3_inv_emissions TEXT,
    
    -- Downstream Transportation
    s3_dt_methods TEXT,
    s3_dt_distance DECIMAL,
    s3_dt_vehicle_types TEXT,
    s3_dt_packaging TEXT,
    
    -- Processing of Sold Products
    s3_psp_lifecycle TEXT,
    s3_psp_transformations TEXT,
    s3_psp_energy TEXT,
    
    -- Use of Sold Products
    s3_usp_specs TEXT,
    s3_usp_usage TEXT,
    s3_usp_energy TEXT,
    
    -- End-of-Life Treatment
    s3_eol_methods TEXT,
    s3_eol_recycling_potential DECIMAL,
    s3_eol_material TEXT,
    
    -- Downstream Leased Assets
    s3_dla_asset_types TEXT,
    s3_dla_energy TEXT,
    s3_dla_tenant TEXT,
    
    -- Franchises
    s3_fr_details TEXT,
    s3_fr_practices TEXT,
    s3_fr_energy TEXT,
    
    -- Metadata
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
    scope1_completion INTEGER DEFAULT 0,
    scope2_completion INTEGER DEFAULT 0,
    scope3_completion INTEGER DEFAULT 0,
    total_completion INTEGER DEFAULT 0,
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_emission_calculator_user_id ON emission_calculator(user_id);
CREATE INDEX IF NOT EXISTS idx_emission_calculator_status ON emission_calculator(status);
CREATE INDEX IF NOT EXISTS idx_emission_calculator_created_at ON emission_calculator(created_at);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_emission_calculator_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at timestamp
CREATE TRIGGER trigger_update_emission_calculator_updated_at
    BEFORE UPDATE ON emission_calculator
    FOR EACH ROW
    EXECUTE FUNCTION update_emission_calculator_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE emission_calculator ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own emission calculator data" ON emission_calculator
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own emission calculator data" ON emission_calculator
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own emission calculator data" ON emission_calculator
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own emission calculator data" ON emission_calculator
    FOR DELETE USING (auth.uid() = user_id);

-- Add comments to document the table structure
COMMENT ON TABLE emission_calculator IS 'Stores emission calculator data for Scope 1, 2, and 3 emissions across different categories';
COMMENT ON COLUMN emission_calculator.scope1_completion IS 'Percentage completion of Scope 1 fields (0-100)';
COMMENT ON COLUMN emission_calculator.scope2_completion IS 'Percentage completion of Scope 2 fields (0-100)';
COMMENT ON COLUMN emission_calculator.scope3_completion IS 'Percentage completion of Scope 3 fields (0-100)';
COMMENT ON COLUMN emission_calculator.total_completion IS 'Overall completion percentage across all scopes (0-100)';
COMMENT ON COLUMN emission_calculator.status IS 'Current status: draft or submitted';

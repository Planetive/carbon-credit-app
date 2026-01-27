-- Processing of Sold Products and Use of Sold Products Tables
-- These tables store complex nested data structures, so we use JSONB for flexibility

-- 1. Processing of Sold Products (Intermediate Products)
CREATE TABLE IF NOT EXISTS scope3_processing_sold_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  counterparty_id UUID REFERENCES counterparties(id) ON DELETE CASCADE,
  processing_activity TEXT NOT NULL,
  factor_type TEXT, -- 'fuel' | 'electricity'
  combustion_type TEXT, -- 'stationary' | 'mobile'
  -- Stationary Combustion fields
  stationary_main_fuel_type TEXT,
  stationary_sub_fuel_type TEXT,
  stationary_co2_factor NUMERIC,
  stationary_unit TEXT,
  -- Mobile Combustion fields
  mobile_fuel_type TEXT,
  mobile_kg_co2_per_unit NUMERIC,
  mobile_unit TEXT,
  -- Heat and Steam fields
  heat_steam_standard TEXT, -- 'UK' | 'EBT' - Standard selection for emission factors
  heat_steam_type TEXT, -- 'Onsite heat and steam' | 'District heat and steam'
  heat_steam_kg_co2e NUMERIC,
  heat_steam_unit TEXT,
  -- Fuel-related fields
  fuel_type TEXT,
  fuel TEXT,
  fuel_unit TEXT,
  fuel_quantity NUMERIC,
  fuel_factor NUMERIC,
  -- Electricity-related fields
  total_kwh NUMERIC,
  grid_pct NUMERIC,
  renewable_pct NUMERIC,
  other_pct NUMERIC,
  grid_country TEXT, -- 'UAE' | 'Pakistan'
  -- Store other sources as JSONB for flexibility
  other_sources JSONB,
  -- Calculated emissions
  quantity NUMERIC,
  emissions NUMERIC NOT NULL CHECK (emissions >= 0),
  -- Store full row data as JSONB for complete record keeping
  row_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_s3_psp_user_id ON scope3_processing_sold_products(user_id);
CREATE INDEX IF NOT EXISTS idx_s3_psp_counterparty_id ON scope3_processing_sold_products(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_s3_psp_processing_activity ON scope3_processing_sold_products(processing_activity);
CREATE INDEX IF NOT EXISTS idx_s3_psp_created_at ON scope3_processing_sold_products(created_at);

-- 2. Use of Sold Products (Final Products)
CREATE TABLE IF NOT EXISTS scope3_use_of_sold_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  counterparty_id UUID REFERENCES counterparties(id) ON DELETE CASCADE,
  processing_activity TEXT NOT NULL,
  energy_consumption TEXT,
  -- Combustion type for "Internal combustion engine vehicles"
  combustion_type TEXT, -- 'stationary' | 'mobile'
  -- Stationary Combustion fields
  stationary_main_fuel_type TEXT,
  stationary_sub_fuel_type TEXT,
  stationary_co2_factor NUMERIC,
  stationary_unit TEXT,
  stationary_quantity NUMERIC,
  -- Mobile Combustion fields
  mobile_fuel_type TEXT,
  mobile_kg_co2_per_unit NUMERIC,
  mobile_unit TEXT,
  mobile_quantity NUMERIC,
  -- Hybrid vehicle fields - Fuel
  hybrid_fuel_type TEXT,
  hybrid_fuel TEXT,
  hybrid_fuel_unit TEXT,
  hybrid_fuel_quantity NUMERIC,
  hybrid_fuel_factor NUMERIC,
  hybrid_fuel_emissions NUMERIC,
  -- Hybrid vehicle fields - Electricity
  hybrid_total_kwh NUMERIC,
  hybrid_grid_pct NUMERIC,
  hybrid_renewable_pct NUMERIC,
  hybrid_other_pct NUMERIC,
  hybrid_grid_country TEXT, -- 'UAE' | 'Pakistan'
  hybrid_other_sources JSONB,
  -- Electricity fields for Electronics, Electric machinery, etc.
  electricity_total_kwh NUMERIC,
  electricity_grid_pct NUMERIC,
  electricity_renewable_pct NUMERIC,
  electricity_other_pct NUMERIC,
  electricity_grid_country TEXT, -- 'UAE' | 'Pakistan'
  electricity_other_sources JSONB,
  -- Refrigerant fields
  refrigerant_type TEXT,
  refrigerant_factor NUMERIC,
  cooling_refrigerant_quantity NUMERIC,
  -- Gas-fired industrial machinery fields
  gas_machinery_fuel_type TEXT,
  gas_machinery_fuel TEXT,
  gas_machinery_unit TEXT,
  gas_machinery_quantity NUMERIC,
  gas_machinery_factor NUMERIC,
  -- Calculated emissions
  quantity NUMERIC,
  emissions NUMERIC NOT NULL CHECK (emissions >= 0),
  -- Store full row data as JSONB for complete record keeping
  row_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_s3_usop_user_id ON scope3_use_of_sold_products(user_id);
CREATE INDEX IF NOT EXISTS idx_s3_usop_counterparty_id ON scope3_use_of_sold_products(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_s3_usop_processing_activity ON scope3_use_of_sold_products(processing_activity);
CREATE INDEX IF NOT EXISTS idx_s3_usop_created_at ON scope3_use_of_sold_products(created_at);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_timestamp_scope3_processing_sold_products()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_timestamp_scope3_use_of_sold_products()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trg_update_scope3_processing_sold_products
BEFORE UPDATE ON scope3_processing_sold_products
FOR EACH ROW EXECUTE FUNCTION update_timestamp_scope3_processing_sold_products();

CREATE TRIGGER trg_update_scope3_use_of_sold_products
BEFORE UPDATE ON scope3_use_of_sold_products
FOR EACH ROW EXECUTE FUNCTION update_timestamp_scope3_use_of_sold_products();

-- RLS (Row Level Security) - Enable for both tables
ALTER TABLE scope3_processing_sold_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope3_use_of_sold_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Processing of Sold Products
CREATE POLICY s3_psp_select ON scope3_processing_sold_products FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY s3_psp_insert ON scope3_processing_sold_products FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY s3_psp_update ON scope3_processing_sold_products FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY s3_psp_delete ON scope3_processing_sold_products FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for Use of Sold Products
CREATE POLICY s3_usop_select ON scope3_use_of_sold_products FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY s3_usop_insert ON scope3_use_of_sold_products FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY s3_usop_update ON scope3_use_of_sold_products FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY s3_usop_delete ON scope3_use_of_sold_products FOR DELETE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE scope3_processing_sold_products IS 'Scope 3 - Processing of Sold Products (Intermediate) emissions';
COMMENT ON TABLE scope3_use_of_sold_products IS 'Scope 3 - Use of Sold Products (Final) emissions';


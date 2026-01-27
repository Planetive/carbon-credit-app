-- Scope 1 - Fuel Factors (reference table)
-- This table is intended to store CO₂ emission factors for Scope 1 fuels,
-- including categories like Coal and Coke, Petroleum Products, Biomass, etc.
-- It is designed to back a future replacement of the hard-coded FACTORS object
-- in the frontend with data coming from Supabase.

CREATE TABLE IF NOT EXISTS scope1_fuel_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- High level grouping from your sheet, e.g.:
  -- 'Coal and Coke', 'Other Fuels - Solid', 'Biomass Fuels - Solid',
  -- 'Natural Gas', 'Other Fuels - Gaseous', 'Biomass Fuels - Gaseous',
  -- 'Petroleum Products', 'Biomass Fuels - Liquid', etc.
  category TEXT NOT NULL,

  -- The specific fuel name from the sheet, e.g.:
  -- 'Asphalt and Road Oil', 'Anthracite', 'Natural Gas', 'Biodiesel (100%)'
  fuel_type TEXT NOT NULL,

  -- Unit that the factor is expressed in. In your sheet this is typically
  -- 'mmBtu' (kg CO₂ per mmBtu), but the column is generic so you can add
  -- other units in the future if needed.
  unit TEXT NOT NULL DEFAULT 'mmBtu',

  -- CO₂ factor value from the sheet, e.g. 75.36 (kg CO₂ per mmBtu)
  kg_co2_per_unit NUMERIC(10,5) NOT NULL,

  -- Optional: where this factor came from (e.g. 'US EPA 2024 Fuel Factors')
  source TEXT,

  sort_order INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure we don't accidentally duplicate the same fuel entry
CREATE UNIQUE INDEX IF NOT EXISTS idx_scope1_fuel_factors_unique
  ON scope1_fuel_factors (category, fuel_type, unit);

-- Keep updated_at in sync
CREATE OR REPLACE FUNCTION update_timestamp_scope1_fuel_factors()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_scope1_fuel_factors
BEFORE UPDATE ON scope1_fuel_factors
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_scope1_fuel_factors();

-- Row Level Security: this is reference data.
-- All authenticated users may read it; only service role (bypassing RLS)
-- should normally insert/update/delete.
ALTER TABLE scope1_fuel_factors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Scope1 fuel factors readable by authenticated users"
  ON scope1_fuel_factors;

CREATE POLICY "Scope1 fuel factors readable by authenticated users"
ON scope1_fuel_factors
FOR SELECT
USING (auth.role() = 'authenticated');

COMMENT ON TABLE scope1_fuel_factors IS
  'Reference table for Scope 1 fuel CO₂ factors (kg CO₂ per unit, usually mmBtu).';


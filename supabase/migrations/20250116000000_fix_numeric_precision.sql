-- Fix numeric field precision to prevent overflow errors
-- This migration updates the quantity, factor, and emissions fields to have proper precision and scale

-- Update scope1_fuel_entries table
ALTER TABLE scope1_fuel_entries 
ALTER COLUMN quantity TYPE NUMERIC(20,6),
ALTER COLUMN factor TYPE NUMERIC(20,6),
ALTER COLUMN emissions TYPE NUMERIC(20,6);

-- Update scope1_refrigerant_entries table
ALTER TABLE scope1_refrigerant_entries 
ALTER COLUMN quantity TYPE NUMERIC(20,6),
ALTER COLUMN emission_factor TYPE NUMERIC(20,6),
ALTER COLUMN emissions TYPE NUMERIC(20,6);

-- Update scope1_passenger_vehicle_entries table
ALTER TABLE scope1_passenger_vehicle_entries 
ALTER COLUMN distance TYPE NUMERIC(20,6),
ALTER COLUMN emission_factor TYPE NUMERIC(20,6),
ALTER COLUMN emissions TYPE NUMERIC(20,6);

-- Update scope1_delivery_vehicle_entries table
ALTER TABLE scope1_delivery_vehicle_entries 
ALTER COLUMN distance TYPE NUMERIC(20,6),
ALTER COLUMN emission_factor TYPE NUMERIC(20,6),
ALTER COLUMN emissions TYPE NUMERIC(20,6);

-- Update scope2_electricity_main table
ALTER TABLE scope2_electricity_main 
ALTER COLUMN total_kwh TYPE NUMERIC(20,6),
ALTER COLUMN grid_pct TYPE NUMERIC(20,6),
ALTER COLUMN renewable_pct TYPE NUMERIC(20,6),
ALTER COLUMN other_pct TYPE NUMERIC(20,6),
ALTER COLUMN calculated_emissions_tco2e TYPE NUMERIC(20,6);

-- Update scope2_electricity_subanswers table
ALTER TABLE scope2_electricity_subanswers 
ALTER COLUMN grid_emission_factor TYPE NUMERIC(20,6),
ALTER COLUMN other_sources_quantity TYPE NUMERIC(20,6),
ALTER COLUMN other_sources_factor TYPE NUMERIC(20,6),
ALTER COLUMN other_sources_emissions TYPE NUMERIC(20,6);

-- Update scope2_heatsteam_entries table
ALTER TABLE scope2_heatsteam_entries 
ALTER COLUMN emission_factor TYPE NUMERIC(20,6),
ALTER COLUMN quantity TYPE NUMERIC(20,6),
ALTER COLUMN emissions TYPE NUMERIC(20,6);

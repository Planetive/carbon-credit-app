-- Add optional display-unit emission columns for calculators that support
-- multiple output units (kg, tonnes, g, short_ton). We keep the existing
-- `emissions` column as the canonical value in kg, and store the user-
-- selected display value + unit in these new columns.

ALTER TABLE scope1_fuel_entries
  ADD COLUMN IF NOT EXISTS emissions_output NUMERIC,
  ADD COLUMN IF NOT EXISTS emissions_output_unit TEXT;

ALTER TABLE scope1_epa_on_road_gasoline_entries
  ADD COLUMN IF NOT EXISTS emissions_output NUMERIC,
  ADD COLUMN IF NOT EXISTS emissions_output_unit TEXT;

ALTER TABLE scope1_epa_on_road_diesel_alt_fuel_entries
  ADD COLUMN IF NOT EXISTS emissions_output NUMERIC,
  ADD COLUMN IF NOT EXISTS emissions_output_unit TEXT;

ALTER TABLE scope1_epa_non_road_vehicle_entries
  ADD COLUMN IF NOT EXISTS emissions_output NUMERIC,
  ADD COLUMN IF NOT EXISTS emissions_output_unit TEXT;

ALTER TABLE scope1_epa_mobile_fuel_entries
  ADD COLUMN IF NOT EXISTS emissions_output NUMERIC,
  ADD COLUMN IF NOT EXISTS emissions_output_unit TEXT;

ALTER TABLE scope2_heatsteam_entries
  ADD COLUMN IF NOT EXISTS emissions_output NUMERIC,
  ADD COLUMN IF NOT EXISTS emissions_output_unit TEXT;


-- Per-entry emission selection for On-Road Diesel & Alt Fuel
-- Allows choosing whether the entry represents CH4 or N2O emissions.

ALTER TABLE scope1_epa_on_road_diesel_alt_fuel_entries
ADD COLUMN IF NOT EXISTS emission_selection TEXT DEFAULT 'ch4';

COMMENT ON COLUMN scope1_epa_on_road_diesel_alt_fuel_entries.emission_selection IS
  'Selected gas for this entry: ch4 or n2o.';


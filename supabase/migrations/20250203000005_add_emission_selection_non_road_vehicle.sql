-- Add emission_selection for Non-Road Vehicle entries
-- Lets user choose whether the entry represents CH4 or N2O emissions.

ALTER TABLE scope1_epa_non_road_vehicle_entries
ADD COLUMN IF NOT EXISTS emission_selection TEXT DEFAULT 'ch4';

COMMENT ON COLUMN scope1_epa_non_road_vehicle_entries.emission_selection IS
  'Selected gas for this entry: ch4 or n2o.';


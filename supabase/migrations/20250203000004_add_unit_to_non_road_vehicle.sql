-- Add unit column for Non-Road Vehicle entries
-- Allows user to enter fuel in gallons or liters; factors remain per gallon.

ALTER TABLE scope1_epa_non_road_vehicle_entries
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'gallon';

COMMENT ON COLUMN scope1_epa_non_road_vehicle_entries.unit IS
  'User-entered unit for gallons column: gallon or liter. Factors are per gallon; liters are converted internally.';


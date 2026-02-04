-- Add per-entry emission selection for on-road gasoline (CO2 only, CH4 only, N2O only, or combinations)
ALTER TABLE scope1_epa_on_road_gasoline_entries
ADD COLUMN IF NOT EXISTS emission_selection TEXT DEFAULT 'ch4_only';

COMMENT ON COLUMN scope1_epa_on_road_gasoline_entries.emission_selection IS
  'Which emission to include: ch4_only or n2o_only (matches On-Road Gasoline table columns)';

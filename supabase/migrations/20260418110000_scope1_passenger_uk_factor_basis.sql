-- Which UK_Passenger_factors column was used for the saved emission_factor (total | co2 | ch4 | n2o).

ALTER TABLE scope1_passenger_vehicle_entries
  ADD COLUMN IF NOT EXISTS uk_factor_basis TEXT;

COMMENT ON COLUMN scope1_passenger_vehicle_entries.uk_factor_basis IS
  'UK passenger: which reference column was used — total, co2, ch4, or n2o (same semantics as scope1_fuel_entries.uk_factor_basis).';

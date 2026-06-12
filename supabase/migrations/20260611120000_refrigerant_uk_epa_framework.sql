-- Isolate UK refrigerant rows entered via the EPA calculator from UK calculator rows.
-- uk      = UK emission calculator
-- uk_epa  = UK factors via EPA calculator (temporary bridge)
-- epa     = native EPA refrigerant factors (future)

ALTER TABLE scope1_refrigerant_entries
  DROP CONSTRAINT IF EXISTS scope1_refrigerant_entries_emission_framework_check;

ALTER TABLE scope1_refrigerant_entries
  ADD CONSTRAINT scope1_refrigerant_entries_emission_framework_check
  CHECK (emission_framework IN ('uk', 'epa', 'uk_epa'));

COMMENT ON COLUMN scope1_refrigerant_entries.emission_framework IS
  'uk = UK calculator; uk_epa = UK factors via EPA calculator (temporary); epa = native EPA refrigerant (future)';

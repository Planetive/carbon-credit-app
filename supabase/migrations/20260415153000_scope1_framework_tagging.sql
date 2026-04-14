-- Separate Scope 1 rows by methodology/framework (UK vs EPA) to prevent mixed loads.

ALTER TABLE scope1_fuel_entries
  ADD COLUMN IF NOT EXISTS emission_framework TEXT;

COMMENT ON COLUMN scope1_fuel_entries.emission_framework IS
  'Methodology used for this row: uk | epa.';

UPDATE scope1_fuel_entries
SET emission_framework = CASE
  WHEN uk_factor_basis IS NOT NULL THEN 'uk'
  ELSE 'epa'
END
WHERE emission_framework IS NULL;

ALTER TABLE scope1_fuel_entries
  ALTER COLUMN emission_framework SET DEFAULT 'epa';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'scope1_fuel_entries_emission_framework_check'
  ) THEN
    ALTER TABLE scope1_fuel_entries
      ADD CONSTRAINT scope1_fuel_entries_emission_framework_check
      CHECK (emission_framework IN ('uk', 'epa'));
  END IF;
END $$;

ALTER TABLE scope1_fuel_entries
  ALTER COLUMN emission_framework SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scope1_fuel_entries_user_framework
  ON scope1_fuel_entries (user_id, emission_framework);

ALTER TABLE scope1_refrigerant_entries
  ADD COLUMN IF NOT EXISTS emission_framework TEXT;

COMMENT ON COLUMN scope1_refrigerant_entries.emission_framework IS
  'Methodology used for this row: uk | epa.';

UPDATE scope1_refrigerant_entries
SET emission_framework = CASE
  WHEN uk_refrigerant_basis IS NOT NULL OR activity IS NOT NULL OR quantity_unit IS NOT NULL THEN 'uk'
  ELSE 'epa'
END
WHERE emission_framework IS NULL;

ALTER TABLE scope1_refrigerant_entries
  ALTER COLUMN emission_framework SET DEFAULT 'epa';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'scope1_refrigerant_entries_emission_framework_check'
  ) THEN
    ALTER TABLE scope1_refrigerant_entries
      ADD CONSTRAINT scope1_refrigerant_entries_emission_framework_check
      CHECK (emission_framework IN ('uk', 'epa'));
  END IF;
END $$;

ALTER TABLE scope1_refrigerant_entries
  ALTER COLUMN emission_framework SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scope1_refrigerant_entries_user_framework
  ON scope1_refrigerant_entries (user_id, emission_framework);

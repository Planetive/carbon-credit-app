-- EPA native refrigerant rows: GWP-based leakage calculations (separate from UK methodology).

ALTER TABLE scope1_refrigerant_entries
  ADD COLUMN IF NOT EXISTS calculation_method TEXT,
  ADD COLUMN IF NOT EXISTS charge_kg NUMERIC,
  ADD COLUMN IF NOT EXISTS leakage_rate_percent NUMERIC,
  ADD COLUMN IF NOT EXISTS leakage_kg NUMERIC,
  ADD COLUMN IF NOT EXISTS gwp NUMERIC,
  ADD COLUMN IF NOT EXISTS equipment_type TEXT;

COMMENT ON COLUMN scope1_refrigerant_entries.calculation_method IS
  'EPA calculator: leakage_record | estimated_leakage';

COMMENT ON COLUMN scope1_refrigerant_entries.charge_kg IS
  'EPA estimated mode: total refrigerant charge (kg).';

COMMENT ON COLUMN scope1_refrigerant_entries.leakage_rate_percent IS
  'EPA estimated mode: annual leakage rate (%).';

COMMENT ON COLUMN scope1_refrigerant_entries.leakage_kg IS
  'EPA: refrigerant leaked (kg) used in emissions = leakage_kg × GWP.';

COMMENT ON COLUMN scope1_refrigerant_entries.gwp IS
  'EPA: global warming potential applied for this row.';

COMMENT ON COLUMN scope1_refrigerant_entries.equipment_type IS
  'EPA: optional equipment category for leakage-rate guidance.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scope1_refrigerant_entries_calculation_method_check'
  ) THEN
    ALTER TABLE scope1_refrigerant_entries
      ADD CONSTRAINT scope1_refrigerant_entries_calculation_method_check
      CHECK (
        calculation_method IS NULL
        OR calculation_method IN ('leakage_record', 'estimated_leakage')
      );
  END IF;
END $$;

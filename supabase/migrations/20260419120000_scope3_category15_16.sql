-- Scope 3 Category 15 (investments / financed) linkage to portfolio calculations
-- Scope 3 Category 16 (facilitated emissions) inventory lines

-- 1) Investments: line type + optional links to portfolio calculation rows
ALTER TABLE scope3_investments
  ADD COLUMN IF NOT EXISTS line_type TEXT NOT NULL DEFAULT 'equity'
    CHECK (line_type IN ('equity', 'financed'));

ALTER TABLE scope3_investments
  ADD COLUMN IF NOT EXISTS linked_emission_calculation_id UUID
    REFERENCES emission_calculations(id) ON DELETE SET NULL;

ALTER TABLE scope3_investments
  ADD COLUMN IF NOT EXISTS linked_finance_emission_calculation_id UUID
    REFERENCES finance_emission_calculations(id) ON DELETE SET NULL;

COMMENT ON COLUMN scope3_investments.line_type IS 'equity: ownership-based; financed: attributed from portfolio finance tool';
COMMENT ON COLUMN scope3_investments.linked_emission_calculation_id IS 'When set, row was imported from emission_calculations (finance)';
COMMENT ON COLUMN scope3_investments.linked_finance_emission_calculation_id IS 'When set, row was imported from finance_emission_calculations (finance)';

CREATE UNIQUE INDEX IF NOT EXISTS idx_s3_inv_unique_linked_ec
  ON scope3_investments (user_id, linked_emission_calculation_id)
  WHERE linked_emission_calculation_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_s3_inv_unique_linked_fec
  ON scope3_investments (user_id, linked_finance_emission_calculation_id)
  WHERE linked_finance_emission_calculation_id IS NOT NULL;

-- 2) Category 16: facilitated emissions (manual or linked to portfolio)
CREATE TABLE IF NOT EXISTS scope3_facilitated_emissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  counterparty_id UUID REFERENCES counterparties(id) ON DELETE SET NULL,
  activity_label TEXT NOT NULL,
  emissions NUMERIC NOT NULL CHECK (emissions >= 0),
  linked_emission_calculation_id UUID REFERENCES emission_calculations(id) ON DELETE SET NULL,
  linked_finance_emission_calculation_id UUID REFERENCES finance_emission_calculations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT scope3_facilitated_single_link CHECK (
    (linked_emission_calculation_id IS NULL AND linked_finance_emission_calculation_id IS NULL)
    OR (linked_emission_calculation_id IS NOT NULL AND linked_finance_emission_calculation_id IS NULL)
    OR (linked_emission_calculation_id IS NULL AND linked_finance_emission_calculation_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_s3_fac_user_id ON scope3_facilitated_emissions(user_id);
CREATE INDEX IF NOT EXISTS idx_s3_fac_counterparty_id ON scope3_facilitated_emissions(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_s3_fac_created_at ON scope3_facilitated_emissions(created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_s3_fac_unique_linked_ec
  ON scope3_facilitated_emissions (user_id, linked_emission_calculation_id)
  WHERE linked_emission_calculation_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_s3_fac_unique_linked_fec
  ON scope3_facilitated_emissions (user_id, linked_finance_emission_calculation_id)
  WHERE linked_finance_emission_calculation_id IS NOT NULL;

CREATE OR REPLACE FUNCTION update_timestamp_scope3_facilitated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_scope3_facilitated ON scope3_facilitated_emissions;
CREATE TRIGGER trg_update_scope3_facilitated
  BEFORE UPDATE ON scope3_facilitated_emissions
  FOR EACH ROW EXECUTE FUNCTION update_timestamp_scope3_facilitated();

ALTER TABLE scope3_facilitated_emissions ENABLE ROW LEVEL SECURITY;

-- Idempotent: safe if migration is re-run after a partial apply
DROP POLICY IF EXISTS s3_fac_select ON scope3_facilitated_emissions;
DROP POLICY IF EXISTS s3_fac_insert ON scope3_facilitated_emissions;
DROP POLICY IF EXISTS s3_fac_update ON scope3_facilitated_emissions;
DROP POLICY IF EXISTS s3_fac_delete ON scope3_facilitated_emissions;

CREATE POLICY s3_fac_select ON scope3_facilitated_emissions FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY s3_fac_insert ON scope3_facilitated_emissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY s3_fac_update ON scope3_facilitated_emissions FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY s3_fac_delete ON scope3_facilitated_emissions FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE scope3_facilitated_emissions IS 'Scope 3 Category 16 - facilitated emissions (manual or portfolio import)';

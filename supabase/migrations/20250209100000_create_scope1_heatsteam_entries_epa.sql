-- Scope 1 Heat and Steam (EPA calculator): same form as Fuel but separate table for EPA Scope 1.
-- Structure mirrors scope1_fuel_entries so FuelEmissions can load/save with variant scope1HeatSteam.

CREATE TABLE IF NOT EXISTS scope1_heatsteam_entries_epa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  counterparty_id UUID REFERENCES counterparties(id) ON DELETE CASCADE,
  fuel_type_group TEXT NOT NULL,
  fuel TEXT NOT NULL,
  unit TEXT NOT NULL,
  quantity NUMERIC(20,6) NOT NULL,
  factor NUMERIC(20,6) NOT NULL,
  emissions NUMERIC(20,6) NOT NULL,
  emissions_output NUMERIC(20,6),
  emissions_output_unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scope1_heatsteam_epa_user_id ON scope1_heatsteam_entries_epa(user_id);
CREATE INDEX IF NOT EXISTS idx_scope1_heatsteam_epa_created_at ON scope1_heatsteam_entries_epa(created_at);
CREATE INDEX IF NOT EXISTS idx_scope1_heatsteam_epa_counterparty ON scope1_heatsteam_entries_epa(counterparty_id);

CREATE OR REPLACE FUNCTION update_timestamp_scope1_heatsteam_entries_epa()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_scope1_heatsteam_entries_epa
BEFORE UPDATE ON scope1_heatsteam_entries_epa
FOR EACH ROW EXECUTE FUNCTION update_timestamp_scope1_heatsteam_entries_epa();

ALTER TABLE scope1_heatsteam_entries_epa ENABLE ROW LEVEL SECURITY;

CREATE POLICY s1_heatsteam_epa_select ON scope1_heatsteam_entries_epa FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY s1_heatsteam_epa_insert ON scope1_heatsteam_entries_epa FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY s1_heatsteam_epa_update ON scope1_heatsteam_entries_epa FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY s1_heatsteam_epa_delete ON scope1_heatsteam_entries_epa FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE scope1_heatsteam_entries_epa IS 'Scope 1 Heat and Steam entries from EPA calculator (same form as Fuel, separate storage).';

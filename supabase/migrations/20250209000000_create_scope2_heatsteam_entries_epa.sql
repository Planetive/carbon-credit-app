-- Scope 2 Heat & Steam (EPA calculator): separate table so UK and EPA data are stored separately.
-- Same structure as scope2_heatsteam_entries (UK).

CREATE TABLE IF NOT EXISTS scope2_heatsteam_entries_epa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('Onsite heat and steam','District heat and steam')),
  unit TEXT NOT NULL DEFAULT 'kWh',
  emission_factor NUMERIC(20,6) NOT NULL,
  quantity NUMERIC(20,6) NOT NULL CHECK (quantity >= 0),
  emissions NUMERIC(20,6) NOT NULL,
  standard TEXT CHECK (standard IN ('UK', 'EBT')),
  emissions_output NUMERIC(20,6),
  emissions_output_unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_s2_heatsteam_epa_user_id ON scope2_heatsteam_entries_epa(user_id);
CREATE INDEX IF NOT EXISTS idx_s2_heatsteam_epa_type ON scope2_heatsteam_entries_epa(entry_type);

CREATE OR REPLACE FUNCTION update_timestamp_scope2_heatsteam_entries_epa()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_scope2_heatsteam_entries_epa
BEFORE UPDATE ON scope2_heatsteam_entries_epa
FOR EACH ROW EXECUTE FUNCTION update_timestamp_scope2_heatsteam_entries_epa();

ALTER TABLE scope2_heatsteam_entries_epa ENABLE ROW LEVEL SECURITY;

CREATE POLICY s2_heatsteam_epa_select ON scope2_heatsteam_entries_epa FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY s2_heatsteam_epa_insert ON scope2_heatsteam_entries_epa FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY s2_heatsteam_epa_update ON scope2_heatsteam_entries_epa FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY s2_heatsteam_epa_delete ON scope2_heatsteam_entries_epa FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE scope2_heatsteam_entries_epa IS 'Scope 2 Heat & Steam entries from EPA emission calculator (EBT standard). Separate from UK scope2_heatsteam_entries.';

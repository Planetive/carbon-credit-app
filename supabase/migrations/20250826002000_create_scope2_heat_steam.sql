-- Scope 2 - Heat & Steam: single table capturing user inputs and factors

CREATE TABLE IF NOT EXISTS scope2_heatsteam_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('Onsite heat and steam','District heat and steam')),
  unit TEXT NOT NULL DEFAULT 'kWh',
  emission_factor NUMERIC NOT NULL, -- factor used at time of entry (kg CO2e per unit)
  quantity NUMERIC NOT NULL CHECK (quantity >= 0),
  emissions NUMERIC NOT NULL,       -- quantity * emission_factor
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_s2_heatsteam_entries_user_id ON scope2_heatsteam_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_s2_heatsteam_entries_type ON scope2_heatsteam_entries(entry_type);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_timestamp_scope2_heatsteam_entries()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_scope2_heatsteam_entries
BEFORE UPDATE ON scope2_heatsteam_entries
FOR EACH ROW EXECUTE FUNCTION update_timestamp_scope2_heatsteam_entries();

-- RLS
ALTER TABLE scope2_heatsteam_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY s2_heatsteam_entries_select ON scope2_heatsteam_entries FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY s2_heatsteam_entries_insert ON scope2_heatsteam_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY s2_heatsteam_entries_update ON scope2_heatsteam_entries FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY s2_heatsteam_entries_delete ON scope2_heatsteam_entries FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE scope2_heatsteam_entries IS 'User inputs for Scope 2 Heat & Steam with stored factor and computed emissions.';



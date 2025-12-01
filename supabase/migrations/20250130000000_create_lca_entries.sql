-- LCA (Lifecycle Assessment) entries table
-- Stores direct LCA emissions data for all scopes

CREATE TABLE IF NOT EXISTS scope3_lca_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  counterparty_id UUID REFERENCES counterparties(id) ON DELETE CASCADE NULL,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('scope1', 'scope2', 'scope3_upstream', 'scope3_downstream')),
  emissions NUMERIC NOT NULL CHECK (emissions >= 0),
  unit TEXT NOT NULL DEFAULT 'kg CO2e',
  calculation_mode TEXT NOT NULL DEFAULT 'direct_lca' CHECK (calculation_mode IN ('direct_lca', 'manual_lca')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lca_entries_user_id ON scope3_lca_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_lca_entries_counterparty_id ON scope3_lca_entries(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_lca_entries_scope_type ON scope3_lca_entries(scope_type);
CREATE INDEX IF NOT EXISTS idx_lca_entries_created_at ON scope3_lca_entries(created_at);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_timestamp_lca_entries()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_lca_entries
BEFORE UPDATE ON scope3_lca_entries
FOR EACH ROW EXECUTE FUNCTION update_timestamp_lca_entries();

-- RLS (Row Level Security)
ALTER TABLE scope3_lca_entries ENABLE ROW LEVEL SECURITY;

-- Policies: users can CRUD their own rows
CREATE POLICY lca_entries_select ON scope3_lca_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY lca_entries_insert ON scope3_lca_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY lca_entries_update ON scope3_lca_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY lca_entries_delete ON scope3_lca_entries FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE scope3_lca_entries IS 'LCA (Lifecycle Assessment) emissions data for all scopes. Supports both direct LCA and manual LCA calculation modes.';


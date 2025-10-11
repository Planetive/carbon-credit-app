-- Emission History Assessment table
-- Stores questionnaire data from the emission history page

CREATE TABLE IF NOT EXISTS emission_history_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Company Basic Information
  company_name TEXT NOT NULL,
  sector TEXT NOT NULL,
  location TEXT NOT NULL,
  governance_structure TEXT NOT NULL,
  
  -- Emissions Data Assessment
  is_measuring_emissions BOOLEAN NOT NULL,
  are_emissions_verified BOOLEAN,
  scope1_emissions NUMERIC(20,6),
  scope2_emissions NUMERIC(20,6),
  scope3_emissions NUMERIC(20,6),
  wants_to_use_calculator BOOLEAN,
  
  -- Metadata
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_emission_history_user_id ON emission_history_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_emission_history_created_at ON emission_history_assessments(created_at);
CREATE INDEX IF NOT EXISTS idx_emission_history_sector ON emission_history_assessments(sector);
CREATE INDEX IF NOT EXISTS idx_emission_history_location ON emission_history_assessments(location);
CREATE INDEX IF NOT EXISTS idx_emission_history_status ON emission_history_assessments(status);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_timestamp_emission_history_assessments()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_emission_history_assessments
BEFORE UPDATE ON emission_history_assessments
FOR EACH ROW EXECUTE FUNCTION update_timestamp_emission_history_assessments();

-- Row Level Security
ALTER TABLE emission_history_assessments ENABLE ROW LEVEL SECURITY;

-- Policies: users can CRUD their own assessments
CREATE POLICY emission_history_select ON emission_history_assessments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY emission_history_insert ON emission_history_assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY emission_history_update ON emission_history_assessments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY emission_history_delete ON emission_history_assessments FOR DELETE
  USING (auth.uid() = user_id);

-- Comments for documentation
COMMENT ON TABLE emission_history_assessments IS 'Stores emission history assessment questionnaire data';
COMMENT ON COLUMN emission_history_assessments.company_name IS 'Name of the company';
COMMENT ON COLUMN emission_history_assessments.sector IS 'Industry sector of the company';
COMMENT ON COLUMN emission_history_assessments.location IS 'Country where the company is located';
COMMENT ON COLUMN emission_history_assessments.governance_structure IS 'Legal structure of the company';
COMMENT ON COLUMN emission_history_assessments.is_measuring_emissions IS 'Whether company is currently measuring emissions';
COMMENT ON COLUMN emission_history_assessments.are_emissions_verified IS 'Whether emissions data is third-party verified';
COMMENT ON COLUMN emission_history_assessments.scope1_emissions IS 'Scope 1 emissions in tonnes CO2e';
COMMENT ON COLUMN emission_history_assessments.scope2_emissions IS 'Scope 2 emissions in tonnes CO2e';
COMMENT ON COLUMN emission_history_assessments.scope3_emissions IS 'Scope 3 emissions in tonnes CO2e';
COMMENT ON COLUMN emission_history_assessments.wants_to_use_calculator IS 'Whether company wants to use emission calculator';

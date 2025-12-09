-- Emission Calculator Preferences table
-- Stores user preferences for the emission calculator (LCA vs Manual mode, etc.)
-- Separate from profiles to keep concerns separated and allow for future extension

CREATE TABLE IF NOT EXISTS emission_calculator_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  has_lca_data BOOLEAN DEFAULT NULL,
  calculation_mode TEXT DEFAULT 'manual' CHECK (calculation_mode IN ('lca', 'manual')),
  initial_questionnaire_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_emission_calc_prefs_user_id ON emission_calculator_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_emission_calc_prefs_created_at ON emission_calculator_preferences(created_at);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_emission_calc_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_emission_calc_prefs_updated_at
BEFORE UPDATE ON emission_calculator_preferences
FOR EACH ROW EXECUTE FUNCTION update_emission_calc_prefs_updated_at();

-- Enable Row Level Security
ALTER TABLE emission_calculator_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY emission_calc_prefs_select ON emission_calculator_preferences FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY emission_calc_prefs_insert ON emission_calculator_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY emission_calc_prefs_update ON emission_calculator_preferences FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY emission_calc_prefs_delete ON emission_calculator_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE emission_calculator_preferences IS 'User preferences for the emission calculator (LCA vs Manual mode, questionnaire completion status)';
COMMENT ON COLUMN emission_calculator_preferences.has_lca_data IS 'Whether the user has lifecycle assessment (LCA) data. NULL means not answered yet.';
COMMENT ON COLUMN emission_calculator_preferences.calculation_mode IS 'Current calculation mode: lca (LCA input mode) or manual (manual calculation mode).';
COMMENT ON COLUMN emission_calculator_preferences.initial_questionnaire_completed IS 'Whether the user has completed the initial LCA questionnaire.';


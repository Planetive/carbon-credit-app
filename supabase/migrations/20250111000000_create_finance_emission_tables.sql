-- Finance Emission Calculation Tables
-- These tables store finance emission calculations and results

-- Main table for finance emission calculations
CREATE TABLE IF NOT EXISTS finance_emission_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Calculation metadata
    calculation_type TEXT NOT NULL CHECK (calculation_type IN ('finance_emission', 'facilitated_emission')),
    formula_id TEXT NOT NULL,
    formula_name TEXT NOT NULL,
    company_type TEXT NOT NULL CHECK (company_type IN ('listed', 'unlisted')),
    
    -- Financial inputs
    outstanding_amount DECIMAL(20,6),
    total_assets DECIMAL(20,6),
    evic DECIMAL(20,6),
    total_equity_plus_debt DECIMAL(20,6),
    
    -- Company financial data (for listed companies)
    share_price DECIMAL(20,6),
    outstanding_shares DECIMAL(20,6),
    total_debt DECIMAL(20,6),
    minority_interest DECIMAL(20,6),
    preferred_stock DECIMAL(20,6),
    
    -- Company financial data (for unlisted companies)
    total_equity DECIMAL(20,6),
    
    -- Facilitated emission specific fields
    facilitated_amount DECIMAL(20,6),
    underwriting_amount DECIMAL(20,6),
    underwriting_share_pct DECIMAL(5,2),
    weighting_factor DECIMAL(5,4),
    
    -- Emission/activity inputs
    verified_emissions DECIMAL(20,6),
    unverified_emissions DECIMAL(20,6),
    energy_consumption DECIMAL(20,6),
    emission_factor DECIMAL(20,6),
    production DECIMAL(20,6),
    production_emission_factor DECIMAL(20,6),
    process_emissions DECIMAL(20,6),
    
    -- Calculation results
    attribution_factor DECIMAL(20,10),
    financed_emissions DECIMAL(20,6),
    data_quality_score INTEGER CHECK (data_quality_score BETWEEN 1 AND 5),
    methodology TEXT,
    
    -- Calculation steps (stored as JSON)
    calculation_steps JSONB,
    
    -- Metadata
    status TEXT DEFAULT 'completed' CHECK (status IN ('draft', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_finance_emission_calculations_user_id ON finance_emission_calculations(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_emission_calculations_type ON finance_emission_calculations(calculation_type);
CREATE INDEX IF NOT EXISTS idx_finance_emission_calculations_formula_id ON finance_emission_calculations(formula_id);
CREATE INDEX IF NOT EXISTS idx_finance_emission_calculations_company_type ON finance_emission_calculations(company_type);
CREATE INDEX IF NOT EXISTS idx_finance_emission_calculations_created_at ON finance_emission_calculations(created_at);

-- Table for storing formula configurations (for reference and validation)
CREATE TABLE IF NOT EXISTS finance_emission_formulas (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    option_code TEXT NOT NULL,
    data_quality_score INTEGER CHECK (data_quality_score BETWEEN 1 AND 5),
    applicable_scopes TEXT[],
    inputs JSONB NOT NULL,
    calculation_logic JSONB,
    notes TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for formula lookups
CREATE INDEX IF NOT EXISTS idx_finance_emission_formulas_category ON finance_emission_formulas(category);
CREATE INDEX IF NOT EXISTS idx_finance_emission_formulas_option_code ON finance_emission_formulas(option_code);

-- Table for storing calculation history and audit trail
CREATE TABLE IF NOT EXISTS finance_emission_calculation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calculation_id UUID REFERENCES finance_emission_calculations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- What changed
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    
    -- When and why
    change_reason TEXT,
    changed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for history lookups
CREATE INDEX IF NOT EXISTS idx_finance_emission_history_calculation_id ON finance_emission_calculation_history(calculation_id);
CREATE INDEX IF NOT EXISTS idx_finance_emission_history_user_id ON finance_emission_calculation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_emission_history_created_at ON finance_emission_calculation_history(created_at);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_finance_emission_calculations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_finance_emission_calculations_updated_at
    BEFORE UPDATE ON finance_emission_calculations
    FOR EACH ROW
    EXECUTE FUNCTION update_finance_emission_calculations_updated_at();

CREATE OR REPLACE FUNCTION update_finance_emission_formulas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_finance_emission_formulas_updated_at
    BEFORE UPDATE ON finance_emission_formulas
    FOR EACH ROW
    EXECUTE FUNCTION update_finance_emission_formulas_updated_at();

-- Row Level Security
ALTER TABLE finance_emission_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_emission_formulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_emission_calculation_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for finance_emission_calculations
CREATE POLICY "Users can view their own finance emission calculations" ON finance_emission_calculations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own finance emission calculations" ON finance_emission_calculations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own finance emission calculations" ON finance_emission_calculations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own finance emission calculations" ON finance_emission_calculations
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for finance_emission_formulas (read-only for users)
CREATE POLICY "Users can view finance emission formulas" ON finance_emission_formulas
    FOR SELECT USING (true);

-- RLS Policies for finance_emission_calculation_history
CREATE POLICY "Users can view their own calculation history" ON finance_emission_calculation_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calculation history" ON finance_emission_calculation_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

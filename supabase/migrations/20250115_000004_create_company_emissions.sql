-- Create company_emissions table for storing company-specific emission calculations
-- This table stores emissions calculated through the emission calculator for specific companies
-- and allows for editing/updating those emissions

CREATE TABLE IF NOT EXISTS company_emissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    counterparty_id UUID REFERENCES counterparties(id) ON DELETE CASCADE, -- NULL for bank itself
    is_bank_emissions BOOLEAN DEFAULT FALSE, -- TRUE when this is bank's own emissions
    
    -- Calculated emissions from emission calculator
    scope1_emissions NUMERIC(20,6) DEFAULT 0, -- tCO2e
    scope2_emissions NUMERIC(20,6) DEFAULT 0, -- tCO2e  
    scope3_emissions NUMERIC(20,6) DEFAULT 0, -- tCO2e
    total_emissions NUMERIC(20,6) DEFAULT 0, -- calculated total (scope1 + scope2 + scope3)
    
    -- Source information
    calculation_source TEXT DEFAULT 'emission_calculator' CHECK (calculation_source IN ('emission_calculator', 'questionnaire', 'manual')),
    calculation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    notes TEXT, -- optional notes about the calculation
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_company_or_bank CHECK (
        (counterparty_id IS NOT NULL AND is_bank_emissions = FALSE) OR 
        (counterparty_id IS NULL AND is_bank_emissions = TRUE)
    ),
    
    -- Ensure one emission record per company/user (we'll handle active status in application logic)
    CONSTRAINT unique_company_emissions UNIQUE (user_id, counterparty_id, is_bank_emissions)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_company_emissions_user_id ON company_emissions(user_id);
CREATE INDEX IF NOT EXISTS idx_company_emissions_counterparty_id ON company_emissions(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_company_emissions_bank ON company_emissions(user_id, is_bank_emissions) WHERE is_bank_emissions = TRUE;
CREATE INDEX IF NOT EXISTS idx_company_emissions_status ON company_emissions(status);
CREATE INDEX IF NOT EXISTS idx_company_emissions_created_at ON company_emissions(created_at);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_company_emissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at timestamp
CREATE TRIGGER trigger_update_company_emissions_updated_at
    BEFORE UPDATE ON company_emissions
    FOR EACH ROW
    EXECUTE FUNCTION update_company_emissions_updated_at();

-- Create a function to automatically calculate total_emissions
CREATE OR REPLACE FUNCTION calculate_total_emissions()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_emissions = COALESCE(NEW.scope1_emissions, 0) + 
                         COALESCE(NEW.scope2_emissions, 0) + 
                         COALESCE(NEW.scope3_emissions, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically calculate total_emissions
CREATE TRIGGER trigger_calculate_total_emissions
    BEFORE INSERT OR UPDATE ON company_emissions
    FOR EACH ROW
    EXECUTE FUNCTION calculate_total_emissions();

-- Enable Row Level Security (RLS)
ALTER TABLE company_emissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own company emissions" ON company_emissions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own company emissions" ON company_emissions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own company emissions" ON company_emissions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own company emissions" ON company_emissions
    FOR DELETE USING (auth.uid() = user_id);

-- Add comments to document the table structure
COMMENT ON TABLE company_emissions IS 'Stores company-specific emission calculations from the emission calculator';
COMMENT ON COLUMN company_emissions.counterparty_id IS 'References the company (counterparty) - NULL for bank itself';
COMMENT ON COLUMN company_emissions.is_bank_emissions IS 'TRUE when this represents the bank''s own emissions (not a portfolio company)';
COMMENT ON COLUMN company_emissions.calculation_source IS 'How these emissions were calculated: emission_calculator, questionnaire, or manual';
COMMENT ON COLUMN company_emissions.total_emissions IS 'Automatically calculated as scope1 + scope2 + scope3';

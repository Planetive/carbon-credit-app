-- Create ESG Assessments table
CREATE TABLE IF NOT EXISTS esg_assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Environmental Section
    -- GHG Emissions
    ghg_baseline TEXT,
    ghg_emissions TEXT,
    air_pollutants TEXT,
    ghg_reduction_initiatives TEXT,
    
    -- Energy Efficiency
    energy_visibility TEXT,
    total_energy_used TEXT,
    energy_grid TEXT,
    energy_renewable TEXT,
    energy_diesel TEXT,
    energy_gas TEXT,
    
    -- Water Management
    water_withdrawal TEXT,
    water_reclaimed TEXT,
    
    -- Waste Management
    waste_type TEXT,
    waste_quantity TEXT,
    waste_treated TEXT,
    
    -- Environmental Operations
    environmental_policy TEXT,
    waste_management_policy TEXT,
    energy_management_policy TEXT,
    water_management_policy TEXT,
    recycling_policy TEXT,
    
    -- Environmental Oversight
    board_climate_oversight TEXT,
    management_climate_oversight TEXT,
    
    -- Sustainable Sourcing
    sustainable_sourcing TEXT,
    
    -- Social Section
    -- Pay Ratios
    median_male_compensation TEXT,
    median_female_compensation TEXT,
    
    -- CEO Pay Ratio
    ceo_pay_ratio TEXT,
    ceo_pay_ratio_reporting TEXT,
    
    -- Turnover
    full_time_turnover TEXT,
    part_time_turnover TEXT,
    consultants_turnover TEXT,
    
    -- Gender Diversity and Inclusion
    diversity_inclusion_policy TEXT,
    total_headcount TEXT,
    men_headcount TEXT,
    women_headcount TEXT,
    men_entry_mid_level TEXT,
    women_entry_mid_level TEXT,
    men_senior_executive TEXT,
    women_senior_executive TEXT,
    differently_abled_workforce TEXT,
    
    -- Temporary Workers Ratio
    temporary_workers TEXT,
    consultants TEXT,
    
    -- Harassment, Discrimination and Grievance
    anti_harassment_policy TEXT,
    harassment_cases_reported TEXT,
    harassment_cases_resolved TEXT,
    grievance_mechanism TEXT,
    grievance_cases_reported TEXT,
    grievance_cases_resolved TEXT,
    
    -- Health and Safety
    health_safety_policy TEXT,
    hse_management_system TEXT,
    fatalities TEXT,
    ltis TEXT,
    safety_accidents TEXT,
    production_loss TEXT,
    trir TEXT,
    
    -- Child and Forced Labor
    child_forced_labor_policy TEXT,
    
    -- Human Rights
    human_rights_policy TEXT,
    
    -- Employee Training and Succession Planning
    personnel_trained TEXT,
    women_promoted TEXT,
    men_promoted TEXT,
    
    -- CSR
    csr_percentage TEXT,
    
    -- Marketing
    responsible_marketing_policy TEXT,
    
    -- Governance Section
    -- Board Diversification, Independence and Competence
    total_board_members TEXT,
    independent_board_members TEXT,
    men_board_members TEXT,
    women_board_members TEXT,
    board_governance_committees TEXT,
    men_committee_chairs TEXT,
    women_committee_chairs TEXT,
    ceo_board_prohibition TEXT,
    esg_certified_board_members TEXT,
    
    -- ESG Performance Incentivization
    esg_incentivization TEXT,
    
    -- Voice of Employees
    workers_union TEXT,
    
    -- Supplier Code of Conduct
    supplier_code_of_conduct TEXT,
    supplier_compliance_percentage TEXT,
    
    -- Sustainability Disclosures
    un_sdgs_focus TEXT,
    sustainability_report TEXT,
    sustainability_reporting_framework TEXT,
    sustainability_regulatory_filing TEXT,
    sustainability_third_party_assurance TEXT,
    
    -- Ethics and Anti-Corruption Governance
    ethics_anti_corruption_policy TEXT,
    policy_regular_review TEXT,
    
    -- Data Privacy
    data_privacy_policy TEXT,
    
    -- Form Status and Metadata
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
    environmental_completion INTEGER DEFAULT 0,
    social_completion INTEGER DEFAULT 0,
    governance_completion INTEGER DEFAULT 0,
    total_completion INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submitted_at TIMESTAMP WITH TIME ZONE,
    
    -- Ensure one assessment per user
    UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_esg_assessments_user_id ON esg_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_esg_assessments_status ON esg_assessments(status);
CREATE INDEX IF NOT EXISTS idx_esg_assessments_created_at ON esg_assessments(created_at);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_esg_assessments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_esg_assessments_updated_at
    BEFORE UPDATE ON esg_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_esg_assessments_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE esg_assessments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own ESG assessments" ON esg_assessments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ESG assessments" ON esg_assessments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ESG assessments" ON esg_assessments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ESG assessments" ON esg_assessments
    FOR DELETE USING (auth.uid() = user_id); 
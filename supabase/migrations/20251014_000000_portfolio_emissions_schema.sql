-- Portfolio emissions and risk schema (users -> counterparties -> exposures -> calc results)
-- Based on BankPortfolio.tsx data structure

-- Extension (if not already enabled by earlier migrations)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users have many counterparties (companies/clients) - matches BankPortfolio interface
CREATE TABLE IF NOT EXISTS counterparties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    counterparty_code TEXT NOT NULL, -- e.g., 0001, 0002 (zero-padded)
    name TEXT NOT NULL, -- company name like "National Steel Limited"
    sector TEXT NOT NULL, -- Manufacturing, Energy, Retail, etc.
    geography TEXT NOT NULL, -- Pakistan, India, etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, counterparty_code)
);

-- Each counterparty has one main exposure/loan (matches current BankPortfolio structure)
-- In future, this can be extended to multiple exposures per counterparty
CREATE TABLE IF NOT EXISTS exposures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    counterparty_id UUID NOT NULL REFERENCES counterparties(id) ON DELETE CASCADE,
    exposure_id TEXT NOT NULL, -- e.g., 0001, 0002 (matches BankPortfolio.id)
    amount_pkr NUMERIC(20,2) NOT NULL DEFAULT 0, -- loan amount in PKR
    probability_of_default NUMERIC(5,2) NOT NULL, -- PD percentage (e.g., 2.5)
    loss_given_default NUMERIC(5,2) NOT NULL, -- LGD percentage (e.g., 45)
    tenor_months INTEGER NOT NULL, -- maturity in months (e.g., 36)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, exposure_id)
);

-- Questionnaire responses for each counterparty (shared between finance and facilitated)
CREATE TABLE IF NOT EXISTS counterparty_questionnaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    counterparty_id UUID NOT NULL REFERENCES counterparties(id) ON DELETE CASCADE,
    
    -- Corporate structure
    corporate_structure TEXT NOT NULL CHECK (corporate_structure IN ('listed', 'unlisted')),
    
    -- Emission status and scope data
    has_emissions TEXT NOT NULL CHECK (has_emissions IN ('yes', 'no')),
    scope1_emissions NUMERIC(20,6) DEFAULT 0, -- tCO2e (if has_emissions = 'yes')
    scope2_emissions NUMERIC(20,6) DEFAULT 0, -- tCO2e (if has_emissions = 'yes')
    scope3_emissions NUMERIC(20,6) DEFAULT 0, -- tCO2e (if has_emissions = 'yes')
    
    -- Verification details
    verification_status TEXT CHECK (verification_status IN ('verified', 'unverified')),
    verifier_name TEXT, -- organization name if verified
    
    -- Financial data (for EVIC/Total Equity + Debt calculations)
    evic NUMERIC(20,6), -- calculated EVIC for listed companies
    total_equity_plus_debt NUMERIC(20,6), -- calculated for unlisted companies
    share_price NUMERIC(20,6),
    outstanding_shares NUMERIC(20,6),
    total_debt NUMERIC(20,6),
    minority_interest NUMERIC(20,6),
    preferred_stock NUMERIC(20,6),
    total_equity NUMERIC(20,6),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (counterparty_id) -- one questionnaire per counterparty
);

-- Calculation runs (both finance and facilitated emissions). Links to a specific exposure or counterparty snapshot.
CREATE TABLE IF NOT EXISTS emission_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    counterparty_id UUID REFERENCES counterparties(id) ON DELETE CASCADE,
    exposure_id UUID REFERENCES exposures(id) ON DELETE CASCADE,
    questionnaire_id UUID REFERENCES counterparty_questionnaires(id) ON DELETE CASCADE,
    calculation_type TEXT NOT NULL CHECK (calculation_type IN ('finance', 'facilitated')),
    company_type TEXT CHECK (company_type IN ('listed', 'unlisted')),
    formula_id TEXT,
    inputs JSONB, -- original inputs payload
    results JSONB, -- raw result payload
    financed_emissions NUMERIC(20,6) DEFAULT 0, -- tCO2e
    attribution_factor NUMERIC(20,10),
    evic NUMERIC(20,6),
    total_equity_plus_debt NUMERIC(20,6),
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('draft','completed','failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Scenario runs at portfolio level, aggregating exposures and counterparties under a user
CREATE TABLE IF NOT EXISTS scenario_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g., Baseline/Transition/Physical/Dual
    scenario_id TEXT NOT NULL, -- machine id: baseline, transition_shock, physical_shock, dual_stress
    parameters JSONB, -- multipliers, carbon prices, etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('queued','running','completed','failed'))
);

-- Scenario results at multiple grains (per sector, per exposure, totals)
CREATE TABLE IF NOT EXISTS scenario_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    scenario_run_id UUID NOT NULL REFERENCES scenario_runs(id) ON DELETE CASCADE,
    level TEXT NOT NULL CHECK (level IN ('total','sector','exposure','counterparty')),
    sector TEXT, -- when level = sector
    exposure_id UUID REFERENCES exposures(id) ON DELETE CASCADE,
    counterparty_id UUID REFERENCES counterparties(id) ON DELETE CASCADE,
    metrics JSONB NOT NULL, -- {expected_loss_pkr, loss_pct, revenue_delta, cost_delta, asset_value_change, financed_emissions}
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Aggregated user totals (materialized via views or nightly jobs; view first for convenience)
DROP VIEW IF EXISTS v_user_portfolio_totals;
CREATE VIEW v_user_portfolio_totals AS
SELECT
  u.id AS user_id,
  COALESCE(SUM(ec.financed_emissions) FILTER (WHERE ec.calculation_type = 'finance'), 0) AS total_finance_emissions,
  COALESCE(SUM(ec.financed_emissions) FILTER (WHERE ec.calculation_type = 'facilitated'), 0) AS total_facilitated_emissions,
  COALESCE(SUM(e.amount_pkr), 0) AS total_exposure_pkr,
  COUNT(DISTINCT c.id) AS total_counterparties,
  COUNT(DISTINCT e.id) AS total_exposures
FROM auth.users u
LEFT JOIN counterparties c ON c.user_id = u.id
LEFT JOIN exposures e ON e.user_id = u.id
LEFT JOIN emission_calculations ec ON ec.user_id = u.id
GROUP BY u.id;

-- updated_at triggers
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS t_counterparties_set_updated_at ON counterparties;
CREATE TRIGGER t_counterparties_set_updated_at
BEFORE UPDATE ON counterparties
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS t_exposures_set_updated_at ON exposures;
CREATE TRIGGER t_exposures_set_updated_at
BEFORE UPDATE ON exposures
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS t_counterparty_questionnaires_set_updated_at ON counterparty_questionnaires;
CREATE TRIGGER t_counterparty_questionnaires_set_updated_at
BEFORE UPDATE ON counterparty_questionnaires
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS t_emission_calculations_set_updated_at ON emission_calculations;
CREATE TRIGGER t_emission_calculations_set_updated_at
BEFORE UPDATE ON emission_calculations
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_counterparties_user ON counterparties(user_id);
CREATE INDEX IF NOT EXISTS idx_counterparties_code ON counterparties(user_id, counterparty_code);
CREATE INDEX IF NOT EXISTS idx_exposures_user ON exposures(user_id);
CREATE INDEX IF NOT EXISTS idx_exposures_counterparty ON exposures(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_questionnaires_user ON counterparty_questionnaires(user_id);
CREATE INDEX IF NOT EXISTS idx_questionnaires_counterparty ON counterparty_questionnaires(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_emissions_user ON emission_calculations(user_id);
CREATE INDEX IF NOT EXISTS idx_emissions_counterparty ON emission_calculations(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_emissions_exposure ON emission_calculations(exposure_id);
CREATE INDEX IF NOT EXISTS idx_emissions_questionnaire ON emission_calculations(questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_scenario_runs_user ON scenario_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_scenario_results_run ON scenario_results(scenario_run_id);
CREATE INDEX IF NOT EXISTS idx_scenario_results_user ON scenario_results(user_id);

-- RLS
ALTER TABLE counterparties ENABLE ROW LEVEL SECURITY;
ALTER TABLE exposures ENABLE ROW LEVEL SECURITY;
ALTER TABLE counterparty_questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE emission_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_results ENABLE ROW LEVEL SECURITY;

-- Policies: users can CRUD their own rows
CREATE POLICY cp_select ON counterparties FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY cp_insert ON counterparties FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY cp_update ON counterparties FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY cp_delete ON counterparties FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY ex_select ON exposures FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY ex_insert ON exposures FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY ex_update ON exposures FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY ex_delete ON exposures FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY cq_select ON counterparty_questionnaires FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY cq_insert ON counterparty_questionnaires FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY cq_update ON counterparty_questionnaires FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY cq_delete ON counterparty_questionnaires FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY ec_select ON emission_calculations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY ec_insert ON emission_calculations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY ec_update ON emission_calculations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY ec_delete ON emission_calculations FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY sr_select ON scenario_runs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY sr_insert ON scenario_runs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY sr_update ON scenario_runs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY sr_delete ON scenario_runs FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY srs_select ON scenario_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY srs_insert ON scenario_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY srs_update ON scenario_results FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY srs_delete ON scenario_results FOR DELETE USING (auth.uid() = user_id);



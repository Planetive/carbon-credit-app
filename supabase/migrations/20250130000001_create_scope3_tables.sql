-- Scope 3 Emissions Tables
-- Following the same pattern as Scope 1 and Scope 2: separate table per category
-- Excluding: processing_sold_products, use_of_sold_products, franchises

-- 1. Purchased Goods & Services
CREATE TABLE IF NOT EXISTS scope3_purchased_goods_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  counterparty_id UUID REFERENCES counterparties(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT, -- Store supplier name for reference even if supplier is deleted
  supplier_code TEXT,
  amount_spent NUMERIC NOT NULL CHECK (amount_spent >= 0),
  emission_factor NUMERIC NOT NULL,
  emissions NUMERIC NOT NULL CHECK (emissions >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_s3_pgs_user_id ON scope3_purchased_goods_services(user_id);
CREATE INDEX IF NOT EXISTS idx_s3_pgs_counterparty_id ON scope3_purchased_goods_services(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_s3_pgs_supplier_id ON scope3_purchased_goods_services(supplier_id);
CREATE INDEX IF NOT EXISTS idx_s3_pgs_created_at ON scope3_purchased_goods_services(created_at);

-- 2. Capital Goods
CREATE TABLE IF NOT EXISTS scope3_capital_goods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  counterparty_id UUID REFERENCES counterparties(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT,
  supplier_code TEXT,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  emission_factor NUMERIC NOT NULL,
  emissions NUMERIC NOT NULL CHECK (emissions >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_s3_cg_user_id ON scope3_capital_goods(user_id);
CREATE INDEX IF NOT EXISTS idx_s3_cg_counterparty_id ON scope3_capital_goods(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_s3_cg_supplier_id ON scope3_capital_goods(supplier_id);
CREATE INDEX IF NOT EXISTS idx_s3_cg_created_at ON scope3_capital_goods(created_at);

-- 3. Fuel & Energy Related Activities
CREATE TABLE IF NOT EXISTS scope3_fuel_energy_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  counterparty_id UUID REFERENCES counterparties(id) ON DELETE CASCADE,
  extraction TEXT,
  distance NUMERIC CHECK (distance >= 0),
  refining TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_s3_fea_user_id ON scope3_fuel_energy_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_s3_fea_counterparty_id ON scope3_fuel_energy_activities(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_s3_fea_created_at ON scope3_fuel_energy_activities(created_at);

-- 4. Upstream Transportation
CREATE TABLE IF NOT EXISTS scope3_upstream_transportation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  counterparty_id UUID REFERENCES counterparties(id) ON DELETE CASCADE,
  vehicle_type_id TEXT, -- Reference to vehicle type (stored as text since table name has spaces)
  vehicle_type_name TEXT, -- Store vehicle type name for reference
  distance NUMERIC NOT NULL CHECK (distance >= 0),
  weight NUMERIC NOT NULL CHECK (weight >= 0),
  emission_factor NUMERIC NOT NULL,
  emissions NUMERIC NOT NULL CHECK (emissions >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_s3_ut_user_id ON scope3_upstream_transportation(user_id);
CREATE INDEX IF NOT EXISTS idx_s3_ut_counterparty_id ON scope3_upstream_transportation(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_s3_ut_vehicle_type_id ON scope3_upstream_transportation(vehicle_type_id) WHERE vehicle_type_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_s3_ut_created_at ON scope3_upstream_transportation(created_at);

-- 5. Waste Generated
CREATE TABLE IF NOT EXISTS scope3_waste_generated (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  counterparty_id UUID REFERENCES counterparties(id) ON DELETE CASCADE,
  material_id TEXT NOT NULL, -- Reference to waste material
  material_name TEXT, -- Store material name for reference
  volume NUMERIC NOT NULL CHECK (volume >= 0),
  disposal_method TEXT NOT NULL,
  emission_factor NUMERIC NOT NULL,
  emissions NUMERIC NOT NULL CHECK (emissions >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_s3_wg_user_id ON scope3_waste_generated(user_id);
CREATE INDEX IF NOT EXISTS idx_s3_wg_counterparty_id ON scope3_waste_generated(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_s3_wg_material_id ON scope3_waste_generated(material_id);
CREATE INDEX IF NOT EXISTS idx_s3_wg_created_at ON scope3_waste_generated(created_at);

-- 6. Business Travel
CREATE TABLE IF NOT EXISTS scope3_business_travel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  counterparty_id UUID REFERENCES counterparties(id) ON DELETE CASCADE,
  travel_type_id TEXT, -- Reference to travel type (stored as text since table name has spaces)
  travel_type_name TEXT, -- Store travel type name for reference
  distance NUMERIC NOT NULL CHECK (distance >= 0),
  emission_factor NUMERIC NOT NULL,
  emissions NUMERIC NOT NULL CHECK (emissions >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_s3_bt_user_id ON scope3_business_travel(user_id);
CREATE INDEX IF NOT EXISTS idx_s3_bt_counterparty_id ON scope3_business_travel(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_s3_bt_travel_type_id ON scope3_business_travel(travel_type_id) WHERE travel_type_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_s3_bt_created_at ON scope3_business_travel(created_at);

-- 7. Employee Commuting
CREATE TABLE IF NOT EXISTS scope3_employee_commuting (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  counterparty_id UUID REFERENCES counterparties(id) ON DELETE CASCADE,
  travel_type_id TEXT, -- Reference to travel type (stored as text since table name has spaces)
  travel_type_name TEXT,
  distance NUMERIC NOT NULL CHECK (distance >= 0),
  employees INTEGER NOT NULL CHECK (employees >= 0),
  emission_factor NUMERIC NOT NULL,
  emissions NUMERIC NOT NULL CHECK (emissions >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_s3_ec_user_id ON scope3_employee_commuting(user_id);
CREATE INDEX IF NOT EXISTS idx_s3_ec_counterparty_id ON scope3_employee_commuting(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_s3_ec_travel_type_id ON scope3_employee_commuting(travel_type_id) WHERE travel_type_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_s3_ec_created_at ON scope3_employee_commuting(created_at);

-- 8. Investments
CREATE TABLE IF NOT EXISTS scope3_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  counterparty_id UUID REFERENCES counterparties(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  emissions NUMERIC NOT NULL CHECK (emissions >= 0), -- tCO2e
  ownership_percentage NUMERIC NOT NULL CHECK (ownership_percentage >= 0 AND ownership_percentage <= 100),
  calculated_emissions NUMERIC NOT NULL CHECK (calculated_emissions >= 0), -- tCO2e
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_s3_inv_user_id ON scope3_investments(user_id);
CREATE INDEX IF NOT EXISTS idx_s3_inv_counterparty_id ON scope3_investments(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_s3_inv_created_at ON scope3_investments(created_at);

-- 9. Downstream Transportation
CREATE TABLE IF NOT EXISTS scope3_downstream_transportation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  counterparty_id UUID REFERENCES counterparties(id) ON DELETE CASCADE,
  vehicle_type_id TEXT, -- Reference to vehicle type (stored as text since table name has spaces)
  vehicle_type_name TEXT,
  distance NUMERIC NOT NULL CHECK (distance >= 0),
  weight NUMERIC NOT NULL CHECK (weight >= 0),
  emission_factor NUMERIC NOT NULL,
  emissions NUMERIC NOT NULL CHECK (emissions >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_s3_dt_user_id ON scope3_downstream_transportation(user_id);
CREATE INDEX IF NOT EXISTS idx_s3_dt_counterparty_id ON scope3_downstream_transportation(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_s3_dt_vehicle_type_id ON scope3_downstream_transportation(vehicle_type_id) WHERE vehicle_type_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_s3_dt_created_at ON scope3_downstream_transportation(created_at);

-- 10. End-of-Life Treatment
CREATE TABLE IF NOT EXISTS scope3_end_of_life_treatment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  counterparty_id UUID REFERENCES counterparties(id) ON DELETE CASCADE,
  material_id TEXT NOT NULL,
  material_name TEXT,
  volume NUMERIC NOT NULL CHECK (volume >= 0),
  disposal_method TEXT NOT NULL,
  recycle_percentage NUMERIC CHECK (recycle_percentage >= 0 AND recycle_percentage <= 100),
  composition TEXT,
  emission_factor NUMERIC NOT NULL,
  emissions NUMERIC NOT NULL CHECK (emissions >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_s3_eol_user_id ON scope3_end_of_life_treatment(user_id);
CREATE INDEX IF NOT EXISTS idx_s3_eol_counterparty_id ON scope3_end_of_life_treatment(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_s3_eol_material_id ON scope3_end_of_life_treatment(material_id);
CREATE INDEX IF NOT EXISTS idx_s3_eol_created_at ON scope3_end_of_life_treatment(created_at);

-- Updated_at triggers for all tables
CREATE OR REPLACE FUNCTION update_timestamp_scope3_purchased_goods()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_timestamp_scope3_capital_goods()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_timestamp_scope3_fuel_energy()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_timestamp_scope3_upstream_transport()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_timestamp_scope3_waste_generated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_timestamp_scope3_business_travel()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_timestamp_scope3_employee_commuting()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_timestamp_scope3_investments()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_timestamp_scope3_downstream_transport()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_timestamp_scope3_end_of_life()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trg_update_scope3_purchased_goods
BEFORE UPDATE ON scope3_purchased_goods_services
FOR EACH ROW EXECUTE FUNCTION update_timestamp_scope3_purchased_goods();

CREATE TRIGGER trg_update_scope3_capital_goods
BEFORE UPDATE ON scope3_capital_goods
FOR EACH ROW EXECUTE FUNCTION update_timestamp_scope3_capital_goods();

CREATE TRIGGER trg_update_scope3_fuel_energy
BEFORE UPDATE ON scope3_fuel_energy_activities
FOR EACH ROW EXECUTE FUNCTION update_timestamp_scope3_fuel_energy();

CREATE TRIGGER trg_update_scope3_upstream_transport
BEFORE UPDATE ON scope3_upstream_transportation
FOR EACH ROW EXECUTE FUNCTION update_timestamp_scope3_upstream_transport();

CREATE TRIGGER trg_update_scope3_waste_generated
BEFORE UPDATE ON scope3_waste_generated
FOR EACH ROW EXECUTE FUNCTION update_timestamp_scope3_waste_generated();

CREATE TRIGGER trg_update_scope3_business_travel
BEFORE UPDATE ON scope3_business_travel
FOR EACH ROW EXECUTE FUNCTION update_timestamp_scope3_business_travel();

CREATE TRIGGER trg_update_scope3_employee_commuting
BEFORE UPDATE ON scope3_employee_commuting
FOR EACH ROW EXECUTE FUNCTION update_timestamp_scope3_employee_commuting();

CREATE TRIGGER trg_update_scope3_investments
BEFORE UPDATE ON scope3_investments
FOR EACH ROW EXECUTE FUNCTION update_timestamp_scope3_investments();

CREATE TRIGGER trg_update_scope3_downstream_transport
BEFORE UPDATE ON scope3_downstream_transportation
FOR EACH ROW EXECUTE FUNCTION update_timestamp_scope3_downstream_transport();

CREATE TRIGGER trg_update_scope3_end_of_life
BEFORE UPDATE ON scope3_end_of_life_treatment
FOR EACH ROW EXECUTE FUNCTION update_timestamp_scope3_end_of_life();

-- RLS (Row Level Security) - Enable for all tables
ALTER TABLE scope3_purchased_goods_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope3_capital_goods ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope3_fuel_energy_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope3_upstream_transportation ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope3_waste_generated ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope3_business_travel ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope3_employee_commuting ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope3_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope3_downstream_transportation ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope3_end_of_life_treatment ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Purchased Goods & Services
CREATE POLICY s3_pgs_select ON scope3_purchased_goods_services FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY s3_pgs_insert ON scope3_purchased_goods_services FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY s3_pgs_update ON scope3_purchased_goods_services FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY s3_pgs_delete ON scope3_purchased_goods_services FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for Capital Goods
CREATE POLICY s3_cg_select ON scope3_capital_goods FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY s3_cg_insert ON scope3_capital_goods FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY s3_cg_update ON scope3_capital_goods FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY s3_cg_delete ON scope3_capital_goods FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for Fuel & Energy Activities
CREATE POLICY s3_fea_select ON scope3_fuel_energy_activities FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY s3_fea_insert ON scope3_fuel_energy_activities FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY s3_fea_update ON scope3_fuel_energy_activities FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY s3_fea_delete ON scope3_fuel_energy_activities FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for Upstream Transportation
CREATE POLICY s3_ut_select ON scope3_upstream_transportation FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY s3_ut_insert ON scope3_upstream_transportation FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY s3_ut_update ON scope3_upstream_transportation FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY s3_ut_delete ON scope3_upstream_transportation FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for Waste Generated
CREATE POLICY s3_wg_select ON scope3_waste_generated FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY s3_wg_insert ON scope3_waste_generated FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY s3_wg_update ON scope3_waste_generated FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY s3_wg_delete ON scope3_waste_generated FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for Business Travel
CREATE POLICY s3_bt_select ON scope3_business_travel FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY s3_bt_insert ON scope3_business_travel FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY s3_bt_update ON scope3_business_travel FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY s3_bt_delete ON scope3_business_travel FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for Employee Commuting
CREATE POLICY s3_ec_select ON scope3_employee_commuting FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY s3_ec_insert ON scope3_employee_commuting FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY s3_ec_update ON scope3_employee_commuting FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY s3_ec_delete ON scope3_employee_commuting FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for Investments
CREATE POLICY s3_inv_select ON scope3_investments FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY s3_inv_insert ON scope3_investments FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY s3_inv_update ON scope3_investments FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY s3_inv_delete ON scope3_investments FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for Downstream Transportation
CREATE POLICY s3_dt_select ON scope3_downstream_transportation FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY s3_dt_insert ON scope3_downstream_transportation FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY s3_dt_update ON scope3_downstream_transportation FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY s3_dt_delete ON scope3_downstream_transportation FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for End-of-Life Treatment
CREATE POLICY s3_eol_select ON scope3_end_of_life_treatment FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY s3_eol_insert ON scope3_end_of_life_treatment FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY s3_eol_update ON scope3_end_of_life_treatment FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY s3_eol_delete ON scope3_end_of_life_treatment FOR DELETE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE scope3_purchased_goods_services IS 'Scope 3 - Purchased Goods & Services emissions';
COMMENT ON TABLE scope3_capital_goods IS 'Scope 3 - Capital Goods emissions';
COMMENT ON TABLE scope3_fuel_energy_activities IS 'Scope 3 - Fuel & Energy Related Activities';
COMMENT ON TABLE scope3_upstream_transportation IS 'Scope 3 - Upstream Transportation emissions';
COMMENT ON TABLE scope3_waste_generated IS 'Scope 3 - Waste Generated emissions';
COMMENT ON TABLE scope3_business_travel IS 'Scope 3 - Business Travel emissions';
COMMENT ON TABLE scope3_employee_commuting IS 'Scope 3 - Employee Commuting emissions';
COMMENT ON TABLE scope3_investments IS 'Scope 3 - Investments emissions';
COMMENT ON TABLE scope3_downstream_transportation IS 'Scope 3 - Downstream Transportation emissions';
COMMENT ON TABLE scope3_end_of_life_treatment IS 'Scope 3 - End-of-Life Treatment emissions';


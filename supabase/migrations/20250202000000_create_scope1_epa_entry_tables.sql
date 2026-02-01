-- EPA Scope 1 entry tables: persist Mobile Fuel, On-Road Gasoline, On-Road Diesel & Alt Fuel, Non-Road Vehicle

-- 1. Mobile Fuel (EPA)
CREATE TABLE IF NOT EXISTS scope1_epa_mobile_fuel_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  counterparty_id UUID REFERENCES counterparties(id) ON DELETE CASCADE,
  fuel_type TEXT NOT NULL,
  unit TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  factor NUMERIC NOT NULL,
  emissions NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE scope1_epa_mobile_fuel_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scope1_epa_mobile_fuel_select" ON scope1_epa_mobile_fuel_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "scope1_epa_mobile_fuel_insert" ON scope1_epa_mobile_fuel_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "scope1_epa_mobile_fuel_update" ON scope1_epa_mobile_fuel_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "scope1_epa_mobile_fuel_delete" ON scope1_epa_mobile_fuel_entries FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_scope1_epa_mobile_fuel_user_id ON scope1_epa_mobile_fuel_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_scope1_epa_mobile_fuel_counterparty ON scope1_epa_mobile_fuel_entries(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_scope1_epa_mobile_fuel_created_at ON scope1_epa_mobile_fuel_entries(created_at);

-- 2. On-Road Gasoline (EPA)
CREATE TABLE IF NOT EXISTS scope1_epa_on_road_gasoline_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  counterparty_id UUID REFERENCES counterparties(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL,
  model_year TEXT NOT NULL,
  miles NUMERIC NOT NULL,
  emissions NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE scope1_epa_on_road_gasoline_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scope1_epa_on_road_gas_select" ON scope1_epa_on_road_gasoline_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "scope1_epa_on_road_gas_insert" ON scope1_epa_on_road_gasoline_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "scope1_epa_on_road_gas_update" ON scope1_epa_on_road_gasoline_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "scope1_epa_on_road_gas_delete" ON scope1_epa_on_road_gasoline_entries FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_scope1_epa_on_road_gas_user_id ON scope1_epa_on_road_gasoline_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_scope1_epa_on_road_gas_counterparty ON scope1_epa_on_road_gasoline_entries(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_scope1_epa_on_road_gas_created_at ON scope1_epa_on_road_gasoline_entries(created_at);

-- 3. On-Road Diesel & Alt Fuel (EPA)
CREATE TABLE IF NOT EXISTS scope1_epa_on_road_diesel_alt_fuel_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  counterparty_id UUID REFERENCES counterparties(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL,
  fuel_type TEXT NOT NULL,
  model_year TEXT,
  miles NUMERIC NOT NULL,
  emissions NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE scope1_epa_on_road_diesel_alt_fuel_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scope1_epa_diesel_alt_select" ON scope1_epa_on_road_diesel_alt_fuel_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "scope1_epa_diesel_alt_insert" ON scope1_epa_on_road_diesel_alt_fuel_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "scope1_epa_diesel_alt_update" ON scope1_epa_on_road_diesel_alt_fuel_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "scope1_epa_diesel_alt_delete" ON scope1_epa_on_road_diesel_alt_fuel_entries FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_scope1_epa_diesel_alt_user_id ON scope1_epa_on_road_diesel_alt_fuel_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_scope1_epa_diesel_alt_counterparty ON scope1_epa_on_road_diesel_alt_fuel_entries(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_scope1_epa_diesel_alt_created_at ON scope1_epa_on_road_diesel_alt_fuel_entries(created_at);

-- 4. Non-Road Vehicle (EPA)
CREATE TABLE IF NOT EXISTS scope1_epa_non_road_vehicle_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  counterparty_id UUID REFERENCES counterparties(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL,
  fuel_type TEXT NOT NULL,
  gallons NUMERIC NOT NULL,
  emissions NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE scope1_epa_non_road_vehicle_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scope1_epa_non_road_select" ON scope1_epa_non_road_vehicle_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "scope1_epa_non_road_insert" ON scope1_epa_non_road_vehicle_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "scope1_epa_non_road_update" ON scope1_epa_non_road_vehicle_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "scope1_epa_non_road_delete" ON scope1_epa_non_road_vehicle_entries FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_scope1_epa_non_road_user_id ON scope1_epa_non_road_vehicle_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_scope1_epa_non_road_counterparty ON scope1_epa_non_road_vehicle_entries(counterparty_id);
CREATE INDEX IF NOT EXISTS idx_scope1_epa_non_road_created_at ON scope1_epa_non_road_vehicle_entries(created_at);

COMMENT ON TABLE scope1_epa_mobile_fuel_entries IS 'EPA Scope 1: Mobile combustion fuel entries (persisted for emission calculator EPA)';
COMMENT ON TABLE scope1_epa_on_road_gasoline_entries IS 'EPA Scope 1: On-road gasoline vehicle entries (persisted for emission calculator EPA)';
COMMENT ON TABLE scope1_epa_on_road_diesel_alt_fuel_entries IS 'EPA Scope 1: On-road diesel & alt fuel vehicle entries (persisted for emission calculator EPA)';
COMMENT ON TABLE scope1_epa_non_road_vehicle_entries IS 'EPA Scope 1: Non-road vehicle entries (persisted for emission calculator EPA)';

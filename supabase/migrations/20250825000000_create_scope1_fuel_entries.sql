-- Scope 1 Fuel entries table
CREATE TABLE IF NOT EXISTS scope1_fuel_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fuel_type_group TEXT NOT NULL, -- e.g., Gaseous fuels, Liquid fuels, Solid fuels
  fuel TEXT NOT NULL,            -- e.g., Butane, CNG, Diesel
  unit TEXT NOT NULL,            -- e.g., tonnes, litres, kWh (Net CV)
  quantity NUMERIC NOT NULL,
  factor NUMERIC NOT NULL,
  emissions NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE scope1_fuel_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fuel_entries_select_own" ON scope1_fuel_entries
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "fuel_entries_insert_own" ON scope1_fuel_entries
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "fuel_entries_update_own" ON scope1_fuel_entries
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "fuel_entries_delete_own" ON scope1_fuel_entries
FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_scope1_fuel_entries_user_id ON scope1_fuel_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_scope1_fuel_entries_created_at ON scope1_fuel_entries(created_at);

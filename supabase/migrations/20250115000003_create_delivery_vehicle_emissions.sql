-- Create delivery vehicle emissions table
CREATE TABLE IF NOT EXISTS scope1_delivery_vehicle_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  unit TEXT NOT NULL,
  distance DECIMAL(10,5) NOT NULL,
  emission_factor DECIMAL(10,5) NOT NULL,
  emissions DECIMAL(10,5) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_delivery_vehicle_entries_user_id ON scope1_delivery_vehicle_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_vehicle_entries_created_at ON scope1_delivery_vehicle_entries(created_at);

-- RLS
ALTER TABLE scope1_delivery_vehicle_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own delivery vehicle entries" ON scope1_delivery_vehicle_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own delivery vehicle entries" ON scope1_delivery_vehicle_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own delivery vehicle entries" ON scope1_delivery_vehicle_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own delivery vehicle entries" ON scope1_delivery_vehicle_entries
  FOR DELETE USING (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_delivery_vehicle_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_delivery_vehicle_entries_updated_at
  BEFORE UPDATE ON scope1_delivery_vehicle_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_vehicle_entries_updated_at();

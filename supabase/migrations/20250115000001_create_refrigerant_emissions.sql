-- Create refrigerant emissions table
CREATE TABLE IF NOT EXISTS scope1_refrigerant_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  refrigerant_type TEXT NOT NULL,
  emission_factor DECIMAL(10,5) NOT NULL,
  quantity DECIMAL(10,5) NOT NULL,
  emissions DECIMAL(10,5) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster user queries
CREATE INDEX IF NOT EXISTS idx_refrigerant_entries_user_id ON scope1_refrigerant_entries(user_id);

-- Create index for faster creation date queries
CREATE INDEX IF NOT EXISTS idx_refrigerant_entries_created_at ON scope1_refrigerant_entries(created_at);

-- Enable Row Level Security
ALTER TABLE scope1_refrigerant_entries ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own entries
CREATE POLICY "Users can view own refrigerant entries" ON scope1_refrigerant_entries
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own entries
CREATE POLICY "Users can insert own refrigerant entries" ON scope1_refrigerant_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own entries
CREATE POLICY "Users can update own refrigerant entries" ON scope1_refrigerant_entries
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own entries
CREATE POLICY "Users can delete own refrigerant entries" ON scope1_refrigerant_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_refrigerant_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_refrigerant_entries_updated_at
  BEFORE UPDATE ON scope1_refrigerant_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_refrigerant_entries_updated_at();

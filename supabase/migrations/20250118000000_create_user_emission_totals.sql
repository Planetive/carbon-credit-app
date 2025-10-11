-- Create table to store user emission totals
CREATE TABLE IF NOT EXISTS user_emission_totals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    scope1_total NUMERIC(20,6) DEFAULT 0,
    scope2_total NUMERIC(20,6) DEFAULT 0,
    scope3_total NUMERIC(20,6) DEFAULT 0,
    total_emissions NUMERIC(20,6) DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one record per user
    UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_emission_totals_user_id ON user_emission_totals(user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_emission_totals_updated_at 
    BEFORE UPDATE ON user_emission_totals 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE user_emission_totals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own emission totals" ON user_emission_totals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own emission totals" ON user_emission_totals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own emission totals" ON user_emission_totals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own emission totals" ON user_emission_totals
    FOR DELETE USING (auth.uid() = user_id);

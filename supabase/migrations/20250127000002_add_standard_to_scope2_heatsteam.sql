-- Add standard column to scope2_heatsteam_entries table
-- This allows storing which standard (UK or EBT) was used for the emission factors

ALTER TABLE scope2_heatsteam_entries 
ADD COLUMN IF NOT EXISTS standard TEXT CHECK (standard IN ('UK', 'EBT'));

-- Add comment
COMMENT ON COLUMN scope2_heatsteam_entries.standard IS 'Emission factor standard used: UK or EBT';

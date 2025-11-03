-- Change counterparty_id to counterparty_type with predefined options
-- This migration updates the counterparties table to use counterparty_type instead of counterparty_code

-- First, add the new counterparty_type column
ALTER TABLE counterparties 
ADD COLUMN counterparty_type TEXT;

-- Update the new column with default values based on existing counterparty_code
-- For now, we'll set a default type for existing records
UPDATE counterparties 
SET counterparty_type = 'SME' 
WHERE counterparty_type IS NULL;

-- Add constraint for allowed counterparty types
ALTER TABLE counterparties 
ADD CONSTRAINT counterparty_type_check 
CHECK (counterparty_type IN ('SME', 'Retail', 'Corporate', 'Sovereign', 'Bank', 'Insurance', 'Asset_Management', 'Other'));

-- Make the column NOT NULL after setting default values
ALTER TABLE counterparties 
ALTER COLUMN counterparty_type SET NOT NULL;

-- Add default value for future inserts
ALTER TABLE counterparties 
ALTER COLUMN counterparty_type SET DEFAULT 'SME';

-- Note: We keep counterparty_code for backward compatibility and internal tracking
-- The counterparty_code will still be used for internal ID generation
-- The counterparty_type is the new user-facing field for categorization

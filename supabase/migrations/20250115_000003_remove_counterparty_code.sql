-- Remove counterparty_code field since we're using UUIDs for all operations
-- The counterparty_code was only used for internal tracking, but we can use UUIDs instead

-- First, drop the unique constraint on counterparty_code
ALTER TABLE counterparties 
DROP CONSTRAINT IF EXISTS counterparties_user_id_counterparty_code_key;

-- Drop the counterparty_code column
ALTER TABLE counterparties 
DROP COLUMN IF EXISTS counterparty_code;

-- Note: We keep the UUID (id) as the primary key for all operations
-- This simplifies the schema and removes redundant data

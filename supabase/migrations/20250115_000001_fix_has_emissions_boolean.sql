-- Fix has_emissions field to use boolean instead of text
-- This migration updates the counterparty_questionnaires table to use boolean for has_emissions

-- First, add a new boolean column
ALTER TABLE counterparty_questionnaires 
ADD COLUMN has_emissions_boolean BOOLEAN;

-- Update the new column based on existing text values
UPDATE counterparty_questionnaires 
SET has_emissions_boolean = CASE 
  WHEN has_emissions = 'yes' THEN true 
  WHEN has_emissions = 'no' THEN false 
  ELSE false 
END;

-- Drop the old text column
ALTER TABLE counterparty_questionnaires 
DROP COLUMN has_emissions;

-- Rename the new column to the original name
ALTER TABLE counterparty_questionnaires 
RENAME COLUMN has_emissions_boolean TO has_emissions;

-- Add NOT NULL constraint
ALTER TABLE counterparty_questionnaires 
ALTER COLUMN has_emissions SET NOT NULL;

-- Add default value
ALTER TABLE counterparty_questionnaires 
ALTER COLUMN has_emissions SET DEFAULT false;

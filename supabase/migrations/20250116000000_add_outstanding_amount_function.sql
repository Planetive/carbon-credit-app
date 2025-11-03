-- Add function to get outstanding amounts from finance emission calculations
-- This function will be used by the portfolio page to retrieve loan amounts

CREATE OR REPLACE FUNCTION get_outstanding_amount_for_counterparty(
    p_counterparty_id UUID,
    p_user_id UUID
) RETURNS NUMERIC(20,6) AS $$
DECLARE
    total_outstanding NUMERIC(20,6) := 0;
BEGIN
    -- Sum all outstanding amounts from finance emission calculations for this counterparty
    SELECT COALESCE(SUM(outstanding_amount), 0)
    INTO total_outstanding
    FROM finance_emission_calculations
    WHERE user_id = p_user_id
      AND outstanding_amount IS NOT NULL
      AND outstanding_amount > 0
      AND status = 'completed'
      AND id IN (
          -- Get calculation IDs that are linked to this counterparty
          SELECT ec.id
          FROM emission_calculations ec
          WHERE ec.counterparty_id = p_counterparty_id
            AND ec.user_id = p_user_id
            AND ec.status = 'completed'
      );
    
    RETURN total_outstanding;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to get outstanding amounts from finance emission calculations (alternative approach)
-- This function looks directly at finance_emission_calculations table
CREATE OR REPLACE FUNCTION get_outstanding_amount_direct(
    p_counterparty_id UUID,
    p_user_id UUID
) RETURNS NUMERIC(20,6) AS $$
DECLARE
    total_outstanding NUMERIC(20,6) := 0;
BEGIN
    -- Sum all outstanding amounts from finance emission calculations for this counterparty
    -- This approach assumes we'll add a counterparty_id field to finance_emission_calculations
    SELECT COALESCE(SUM(outstanding_amount), 0)
    INTO total_outstanding
    FROM finance_emission_calculations
    WHERE user_id = p_user_id
      AND outstanding_amount IS NOT NULL
      AND outstanding_amount > 0
      AND status = 'completed';
    
    RETURN total_outstanding;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add counterparty_id to finance_emission_calculations table for direct linking
ALTER TABLE finance_emission_calculations 
ADD COLUMN IF NOT EXISTS counterparty_id UUID REFERENCES counterparties(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_finance_emission_calculations_counterparty 
ON finance_emission_calculations(counterparty_id, user_id, status);

-- Update the direct function to use the new counterparty_id field
CREATE OR REPLACE FUNCTION get_outstanding_amount_for_counterparty_v2(
    p_counterparty_id UUID,
    p_user_id UUID
) RETURNS NUMERIC(20,6) AS $$
DECLARE
    total_outstanding NUMERIC(20,6) := 0;
BEGIN
    -- Sum all outstanding amounts from finance emission calculations for this counterparty
    SELECT COALESCE(SUM(outstanding_amount), 0)
    INTO total_outstanding
    FROM finance_emission_calculations
    WHERE user_id = p_user_id
      AND counterparty_id = p_counterparty_id
      AND outstanding_amount IS NOT NULL
      AND outstanding_amount > 0
      AND status = 'completed';
    
    RETURN total_outstanding;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

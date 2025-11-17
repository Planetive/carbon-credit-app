-- Create suppliers table for Scope 3 Purchased Goods & Services
-- This table stores global supplier data with emission factors
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE, -- Supplier code/identifier
    supplier_name TEXT NOT NULL, -- Supplier name
    unit TEXT NOT NULL, -- Unit of measurement (e.g., tCO2e/tonne, tCO2e/MWh)
    emission_factor NUMERIC(20,10) NOT NULL, -- Emission factor value
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure supplier names are unique
    CONSTRAINT unique_supplier_name UNIQUE (supplier_name)
);

-- Create indexes for fast searching
CREATE INDEX IF NOT EXISTS idx_suppliers_supplier_name ON suppliers(supplier_name);
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(code);
CREATE INDEX IF NOT EXISTS idx_suppliers_name_search ON suppliers USING gin(to_tsvector('english', supplier_name));

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_suppliers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_suppliers_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read suppliers (global data)
CREATE POLICY "Suppliers are readable by all authenticated users" ON suppliers
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Policy: Only service role can insert/update/delete (admin operations)
-- Note: This will be handled by service role key, not RLS policy
-- Regular users cannot modify supplier data

-- Add comment to table
COMMENT ON TABLE suppliers IS 'Global supplier database for Scope 3 Purchased Goods & Services calculations';
COMMENT ON COLUMN suppliers.code IS 'Unique supplier code/identifier';
COMMENT ON COLUMN suppliers.supplier_name IS 'Supplier company name';
COMMENT ON COLUMN suppliers.unit IS 'Unit of measurement for emission factor (e.g., tCO2e/tonne)';
COMMENT ON COLUMN suppliers.emission_factor IS 'Emission factor value for this supplier';


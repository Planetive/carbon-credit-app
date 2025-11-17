-- Fix suppliers table if it was created incorrectly
-- This script checks and fixes the table structure

-- First, check if table exists and what columns it has
-- Run this in Supabase SQL Editor to see current structure:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'suppliers';

-- If the table has wrong columns, drop and recreate it:
-- (WARNING: This will delete all data!)

DROP TABLE IF EXISTS suppliers CASCADE;

-- Create suppliers table with correct structure
CREATE TABLE suppliers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    supplier_name TEXT NOT NULL,
    unit TEXT NOT NULL,
    emission_factor NUMERIC(20,10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_supplier_name UNIQUE (supplier_name)
);

-- Create indexes
CREATE INDEX idx_suppliers_supplier_name ON suppliers(supplier_name);
CREATE INDEX idx_suppliers_code ON suppliers(code);
CREATE INDEX idx_suppliers_name_search ON suppliers USING gin(to_tsvector('english', supplier_name));

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

-- Enable RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read suppliers
CREATE POLICY "Suppliers are readable by all authenticated users" ON suppliers
    FOR SELECT
    USING (auth.role() = 'authenticated');


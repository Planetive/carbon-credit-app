# Supplier Data Import Guide

## ⚠️ IMPORTANT: Check Your Table First!

If you get an error saying columns don't exist, **run the migration first**:

1. Go to Supabase → SQL Editor
2. Run the migration: `supabase/migrations/20250120000000_create_suppliers_table.sql`
3. Or if table exists with wrong structure, run: `supabase/migrations/20250120000002_fix_suppliers_table.sql`

Then try importing again.

## Database Schema

The `suppliers` table has the following structure:
- `id` (UUID, auto-generated)
- `code` (TEXT, unique) - Supplier code/identifier
- `supplier_name` (TEXT, unique) - Supplier company name
- `unit` (TEXT) - Unit of measurement (e.g., tCO2e/tonne, tCO2e/MWh)
- `emission_factor` (NUMERIC) - Emission factor value
- `created_at` (TIMESTAMP, auto-generated)
- `updated_at` (TIMESTAMP, auto-generated)

## Excel File Format

Your Excel file should have the following columns (exact names, no trailing spaces):
1. **Code** - Supplier code/identifier
2. **Supplier** - Supplier company name
3. **Unit** - Unit of measurement
4. **Emission Factor** - Emission factor value (numeric)

⚠️ **IMPORTANT**: Make sure "Emission Factor" has NO trailing space. Common mistake: "Emission Factors " (with space) will cause import errors.

### Column Mapping

When importing via Supabase Dashboard, map columns as follows:
- CSV: `Code` → Database: `code`
- CSV: `Supplier` → Database: `supplier_name`
- CSV: `Unit` → Database: `unit`
- CSV: `Emission Factor` → Database: `emission_factor`

## Import Methods

### Method 1: Using Supabase Dashboard (EASIEST - Fix CSV Headers)

**The Problem**: Your CSV has `Code, Supplier, Unit, Emission Factor` but the database expects `code, supplier_name, unit, emission_factor`.

**The Solution**: Rename your CSV column headers to match the database exactly.

1. Open your CSV file in Excel
2. Change the first row (headers) to exactly:
   ```
   code,supplier_name,unit,emission_factor
   ```
3. Save the CSV file
4. In Supabase Dashboard → Table Editor → suppliers → Insert → Import data from CSV
5. Upload your fixed CSV - it should now work automatically!

**Alternative**: If you can't change the CSV headers, expand "Configure import data" in Supabase and manually map:
- `Code` → `code`
- `Supplier` → `supplier_name`  
- `Unit` → `unit`
- `Emission Factor` → `emission_factor`

### Method 2: Using SQL Script

1. Export your Excel file as CSV
2. Use the following SQL template in Supabase SQL Editor:

```sql
-- Create a temporary table for import
CREATE TEMP TABLE temp_suppliers (
    code TEXT,
    supplier_name TEXT,
    unit TEXT,
    emission_factor NUMERIC
);

-- Copy data from CSV (adjust path as needed)
-- Note: You'll need to use Supabase Storage or upload via dashboard

-- Insert into suppliers table
INSERT INTO suppliers (code, supplier_name, unit, emission_factor)
SELECT 
    code,
    supplier_name,
    unit,
    emission_factor
FROM temp_suppliers
ON CONFLICT (code) DO UPDATE SET
    supplier_name = EXCLUDED.supplier_name,
    unit = EXCLUDED.unit,
    emission_factor = EXCLUDED.emission_factor,
    updated_at = NOW();
```

### Method 3: Using Python Script (For Bulk Import)

Create a Python script using pandas and supabase-py:

```python
import pandas as pd
from supabase import create_client, Client

# Initialize Supabase client
url = "YOUR_SUPABASE_URL"
key = "YOUR_SUPABASE_SERVICE_ROLE_KEY"
supabase: Client = create_client(url, key)

# Read Excel file
df = pd.read_excel('suppliers.xlsx')

# Rename columns to match database
df = df.rename(columns={
    'Code': 'code',
    'Supplier': 'supplier_name',
    'Unit': 'unit',
    'Emission Factor': 'emission_factor'
})

# Convert to list of dictionaries
suppliers = df.to_dict('records')

# Insert in batches (Supabase has a limit per request)
batch_size = 100
for i in range(0, len(suppliers), batch_size):
    batch = suppliers[i:i + batch_size]
    supabase.table('suppliers').upsert(batch).execute()
    print(f"Inserted batch {i//batch_size + 1}")
```

## Data Validation

Before importing, ensure:
- All `code` values are unique
- All `supplier_name` values are unique
- `emission_factor` values are numeric
- No NULL values in required fields

## After Import

1. Verify the data count:
```sql
SELECT COUNT(*) FROM suppliers;
```

2. Check for duplicates:
```sql
SELECT code, COUNT(*) 
FROM suppliers 
GROUP BY code 
HAVING COUNT(*) > 1;
```

3. Test the search functionality in the application

## Notes

- The table uses Row Level Security (RLS) - all authenticated users can read suppliers
- Only service role can insert/update/delete suppliers
- The search uses case-insensitive partial matching on `supplier_name`
- An index is created on `supplier_name` for fast searching


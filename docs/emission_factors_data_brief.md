# Finance_production_Unit_.csv data brief

This file documents the `Finance_production_Unit_.csv` dataset so Cursor (or any AI assistant) has full context on the source data and business rules, without opening the spreadsheet itself.

## Source

Derived from the **ICE (Inventory of Carbon & Energy) Educational Database V5.0 (Jun 2026)**, published by Circular Ecology.
This file represents a **hand-consolidated** flat file across multiple material categories (concrete, steel, aluminium, timber, glass, etc).
the problem with this is that it
## License note (important)

ICE Educational is licensed for **educational use only** — not for commercial/professional use.
If this tool is going to be sold or used commercially, confirm licensing under **IC+ (paid commercial tier)** before shipping.

This is a legal consideration for the product; it is not a technical constraint.

## File

`Finance_production_Unit_.csv`

- `391` data rows + `1` header row
- Encoding: **Latin-1 / extended ASCII** (not UTF-8)
  - Read with `encoding='latin-1'` in Python
  - Or `client_encoding=LATIN1` / explicit encoding on COPY/load to avoid decode errors.

## Columns 

| Column | Type | Notes |
|---|---|---|
| Category | text | Top-level material family, e.g. Concrete, Steel, Aluminium, Glass, Timber, Cement and Motar (typo preserved from source) |
| Sub Category | text, nullable | Finer grouping within a category. Often blank. |
| Materials | text | The specific material/product name (lookup key users search for). |
| Embodied Carbon - kgCO2e/kg | numeric | The core emission factor. Despite the header name, **this is NOT always per kg** (see Declared Units). No blank values in this column. |
| Declared Units | text, nullable | The unit the emission factor applies to. In this file, `342/391` rows are blank; treat blank as `kg` (implicit default). |
| (unnamed 6th column) | empty/trailing | Empty/trailing column from the CSV export. Safe to ignore or drop. |

## Declared units: default and variations

`Declared Units` is blank for many rows.

Business rule:
- If `Declared Units` is blank, interpret as `kg` (do not keep it null).

Where populated, units seen include:
- `m`
- `kg`
- `m2`
- (and other concrete-related non-per-kg bases)

## Data-quality issues to handle

1. **Declared unit defaulting**
   - Blank `Declared Units` must become `kg`.
   - If left null, downstream calculations may silently assume the wrong basis.

2. **Mixed unit basis within a category**
   - Concrete mixes per-kg, per-m, per-m2, and per-each factors in the same category.
   - Your calculation engine must multiply against the matching basis, never assume kg.

3. **Category name typo**
   - `Cement and Motar` should likely be normalized to `Cement and Mortar` if you want consistent analytics.
   - Recommendation: normalize on import, but preserve original in a `source_label` column if traceability matters.

4. **Composite/reinforced materials**
   - Some Concrete rows already bake in steel reinforcement
     (e.g. "precast concrete beams and columns - steel reinforced with world average steel").
   - Do NOT separately apply a Steel factor to the same physical quantity (avoid double counting).

5. **No source/version metadata per row**
   - All rows currently trace back to ICE Educational V5.0 (Jun 2026).
   - If you later add other sources (DEFRA, EPDs, IC+), add a `source_id` FK now to avoid a painful future migration.

## Recommended target schema (Postgres)

```sql
CREATE TABLE emission_factor_sources (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,          -- e.g. 'ICE Educational V5.0'
    publisher       TEXT,                   -- e.g. 'Circular Ecology'
    license_type    TEXT,                   -- e.g. 'Educational only'
    version         TEXT,
    valid_from      DATE,
    valid_to        DATE,
    url             TEXT
);

CREATE TABLE material_categories (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL UNIQUE    -- e.g. 'Concrete', 'Steel'
);

CREATE TABLE emission_factors (
    id                      SERIAL PRIMARY KEY,
    category_id             INTEGER NOT NULL REFERENCES material_categories(id),
    source_id               INTEGER NOT NULL REFERENCES emission_factor_sources(id),
    sub_category            TEXT,
    material_name           TEXT NOT NULL,
    ec_value                NUMERIC NOT NULL,        -- raw number from the CSV
    declared_unit           TEXT NOT NULL DEFAULT 'kg',
    mass_per_unit_kg        NUMERIC,                  -- populate where known, else null
    includes_composite_materials BOOLEAN DEFAULT FALSE, -- reinforced/composite rows
    created_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_emission_factors_material ON emission_factors (material_name);
CREATE INDEX idx_emission_factors_category ON emission_factors (category_id);
```

## Import steps (pgAdmin / psql)

1. Create the tables above first.
   - The `source` and `category` tables need seed rows before the FK-referencing import can work.

2. Seed `emission_factor_sources` with one row for ICE Educational V5.0.
3. Seed `material_categories` with the distinct category names listed in the file.
   - Optionally normalize `Cement and Motar` -> `Cement and Mortar`.

4. Load the CSV into a staging table using Latin-1:

```sql
CREATE TEMP TABLE staging_emission_factors (
    category TEXT,
    sub_category TEXT,
    material_name TEXT,
    ec_value NUMERIC,
    declared_unit TEXT,
    unused TEXT
);

\\copy staging_emission_factors FROM 'Finance_production_Unit_.csv'
WITH (FORMAT csv, HEADER true, ENCODING 'LATIN1');
```

5. Insert from staging into `emission_factors`:
   - Default blank `declared_unit` to `kg`
   - Set `source_id` to the ICE V5.0 row

```sql
INSERT INTO emission_factors (category_id, source_id, sub_category, material_name, ec_value, declared_unit)
SELECT mc.id, 1, s.sub_category, s.material_name, s.ec_value,
       COALESCE(NULLIF(TRIM(s.declared_unit), ''), 'kg')
FROM staging_emission_factors s
JOIN material_categories mc ON mc.name = s.category;
```

## What Cursor needs to know for ingestion code

- Target DB: Postgres on EC2, managed via pgAdmin.
- Source file: `Finance_production_Unit_.csv` (Latin-1 encoded), `391` rows.
- The `declared_unit` blank-to-`kg` rule is a **business rule** (bake it into ETL).
- Scope & usage:
  - This is **Scope 3 Category 1 (purchased goods/services)** embodied-carbon reference data.
  - It is used in the finance emissions calculation module to multiply against material quantities/spend.
  - It is **not** financed/facilitated emissions data (PCAF).
  - Do not reuse PCAF tables directly; only reference `emission_factor_sources` for provenance.


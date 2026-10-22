# EPA Scope 1 Stationary Combustion — factor sources

Research only. No application code was changed. This report covers `Fuel EPA 1`, `Fuel EPA 2`, and `Fuel EPA 3` only.

The live database is the Postgres database opened in pgAdmin. The queries in section 4 were run there on 20 October 2026. Those results match the local dump `03_aws_import_data_v2_clean.sql`: same columns, same 63 rows, no duplicate fuels, and no publication year stored on a factor row or on a saved fuel entry.

## What was read

| Source | What it establishes |
| --- | --- |
| `03_aws_import_data_v2_clean.sql` | Local `pg_dump` (database 17.4, dumped by pg_dump 18.4). Contains `CREATE TABLE` and `COPY` data for all three tables. This is a copy of rows that already existed in Postgres. It is not an EPA file. |
| pgAdmin query results, 20 October 2026 | Live confirmation. `public."Fuel EPA 1|2|3"` are views. The tables are in `ref`. Row exports match the dump. |
| `src/features/emission-calculator/scope1/components/FuelEmissions.tsx` | How the calculator loads and merges the three tables. |
| `src/api/factorDualRead.ts`, `src/api/factors.ts` | JWT path loads datasets `fuel_epa_1` / `fuel_epa_2` / `fuel_epa_3` and keeps only the sheet rows. |
| `db/migrations/0006_phase2b_move_ref_factor_tables.sql` | Moves `public."Fuel EPA 1|2|3"` into `ref` only if those tables already exist. |
| `db/migrations/0007_phase2c_factor_datasets_rows_etl.sql` | Copies existing sheets into `ref.factor_datasets` / `ref.factor_rows`. Publisher is inferred from the table name. |
| `supabase/migrations/` and `schema_recreate.sql` | No `CREATE TABLE` for these three tables. A different table, singular `"Fuel EPA"`, is mentioned only for RLS and is recorded as never created. |
| `supabase/migrations/20250127000003_create_scope1_fuel_factors.sql` | A separate planned table, `scope1_fuel_factors`. The stationary loader does not read it. |
| Repository file search | No `.csv`, `.xlsx`, or `.xls` file. No script that inserts these three tables. |

`docs/EPA_FUEL_TABLES_REFERENCE.md` describes column matching by regular expression and console logs of the column names. Current `FuelEmissions.tsx` uses the exact column names below and does not log them. That document is not the live column contract.

## 1. Factor origins

**Verified in this repository**

- The calculator reads three Postgres tables named `"Fuel EPA 1"`, `"Fuel EPA 2"`, and `"Fuel EPA 3"`.
- This repository does not create them. Supabase migrations and `schema_recreate.sql` have no `CREATE TABLE` for these names.
- There is no CSV, Excel workbook, or import script for them in the repository, and no external factor API other than this app’s own `GET /api/v1/factors/sheets/{code}` when JWT auth is on.
- The only local copy of the rows is the `COPY` blocks in `03_aws_import_data_v2_clean.sql` (lines 4122–4201). The dump header is a generic Postgres dump. It does not name an EPA publication, year, workbook, or URL.
- `0007_phase2c_factor_datasets_rows_etl.sql` later labels a copied dataset with `publisher = 'EPA'` because the table name contains `epa`, `version_label = 'imported_from_sheet'`, and `source_notes = 'ETL from ref.' || table_name`. `effective_from` and `effective_to` are left null. That label is assigned by the migration, not copied from an EPA citation.
- The comment `'US EPA 2024 Fuel Factors'` in `20250127000003_create_scope1_fuel_factors.sql` is an example for the unused `scope1_fuel_factors.source` column. It is not a source record for `Fuel EPA 1/2/3`.

**Matched outside the repository, not recorded in it**

The dump’s rows match **Table 1, Stationary Combustion**, in EPA’s publication *Emission Factors for Greenhouse Gas Inventories* (the GHG Emission Factors Hub). The table is published as one sheet split into three blocks by heat-content unit. Those blocks are the three database tables:

| Dump table | Hub block | Heat-content unit in both |
| --- | --- | --- |
| `Fuel EPA 1` | Coal, solid, and solid biomass | mmBtu per short ton |
| `Fuel EPA 2` | Natural gas and other gases | mmBtu per scf |
| `Fuel EPA 3` | Petroleum, liquid biomass, kraft pulping liquor | mmBtu per gallon |

Compared values that match the 2024 and 2025 hub PDFs include anthracite (25.09 mmBtu/short ton, 103.69 kg CO₂/mmBtu, 11 g CH₄/mmBtu, 1.6 g N₂O/mmBtu, 2,602 kg CO₂/short ton) and natural gas (0.001026 mmBtu/scf, 53.06 kg CO₂/mmBtu, 1 g CH₄/mmBtu, 0.1 g N₂O/mmBtu, 0.05444 kg CO₂/scf). The same stationary-combustion numbers also appear in the 2022 and 2023 hub PDFs and in EPA’s November 2015 climate-leadership factor sheet. The dump does not say which edition was loaded, so the year and version are **not uniquely identified**.

Hub PDFs compared:

- 2025, last modified 15 January 2025: https://www.epa.gov/system/files/documents/2025-01/ghg-emission-factors-hub-2025.pdf
- 2024: https://www.epa.gov/system/files/documents/2024-02/ghg-emission-factors-hub-2024.pdf
- 2023: https://www.epa.gov/system/files/documents/2023-03/ghg_emission_factors_hub.pdf
- 2022: https://www.epa.gov/system/files/documents/2022-04/ghg_emission_factors_hub.pdf

The hub text says these factors are generally **not** already converted to CO₂e. That statement is in the publication. It is not stored on the database rows.

**Not established**

- No original source URL is stored on the tables.
- Whether the first load was a manual paste into Postgres, an Excel import done outside this repo, or a script that was never committed. The dump and the live tables show the rows after they were already in Postgres. They do not record the import step.

## 2. Dataset structure

Column names and Postgres types below are from the `CREATE TABLE` statements in the dump. Units below are from the unit cells in the `COPY` data, not from the code’s labels.

### `Fuel EPA 1` — 17 rows

| Column | Type in dump | What the cells contain |
| --- | --- | --- |
| `Category` | text | Fuel group |
| `Fuel Type` | text | Fuel name |
| `Heat Content (HHV)` | double precision | Higher heating value |
| `HIV Unit` | text | `mmBtu per short ton` on every row. The column is spelled `HIV`, not `HHV`. |
| `CO2 Factor` | double precision | CO₂ per mmBtu. Unit cell: `kg CO2 per mmBtu` |
| `CO2 Unit` | text | `kg CO2 per mmBtu` |
| `CH4 Factor` | double precision | CH₄ per mmBtu. Unit cell: `g CH4 per mmBtu` |
| `CH4 Unit` | text | `g CH4 per mmBtu` |
| `N2O Factor` | double precision | N₂O per mmBtu. Unit cell is the next column |
| `N20 Unit` | text | `g N2O per mmBtu`. The name uses a zero (`N20`), not the letter O. |
| `CO2 Factor_1` | **text** | Second CO₂ factor, with spaces and thousands separators (example: ` 2,602 `). Unit cell: `kg CO2 per short ton` |
| `CO2 Unit_1` | text | `kg CO2 per short ton` |
| `CH4 Factor_1` | **text** | Second CH₄ factor, also stored as text (example: ` 276 `). Unit cell: `g CH4 per short ton` |
| `CH4 Unit_1` | text | `g CH4 per short ton` |
| `N2O Factor_1` | **bigint** | Second N₂O factor. Integer in this copy (examples: 40, 28, 63) |
| `N2O Unit` | text | `g N2O per short ton`. This table has **no** `N2O Unit_1`. The column named `N2O Unit` is the short-ton unit, not the mmBtu unit. |

### `Fuel EPA 2` — 7 rows

Same first ten columns, with these differences:

- `HIV Unit` is `mmBtu per scf` on every row.
- `N2O Unit` (not `N20 Unit`) is `g N2O per mmBtu`.
- `CO2 Factor_1`, `CH4 Factor_1`, and `N2O Factor_1` are `double precision`.
- The second unit columns are `CO2 Unit_1` = `kg CO2 per scf`, `CH4 Unit_1` = `g CH4 per scf`, `N2O Unit_1` = `g N2O per scf`.

### `Fuel EPA 3` — 39 rows

Same column names and numeric types as `Fuel EPA 2`.

- `HIV Unit` is `mmBtu per gallon` on every row, including kraft-liquor rows whose heat-content value is null.
- Second-factor units are `kg CO2 per gallon`, `g CH4 per gallon`, and `g N2O per gallon`.
- For the five kraft-liquor rows, `Heat Content (HHV)` and all three `*_Factor_1` values are null. The per-mmBtu CO₂, CH₄, and N₂O factors are present.

### What the factor columns are

- `CO2 Factor`, `CH4 Factor`, and `N2O Factor` are the **per-mmBtu** factors.
- The `_1` columns are the **second physical unit** for the same fuel: per short ton in table 1, per scf in table 2, per gallon in table 3. They are not a second year, a second gas, or a CO₂e conversion.
- The factors are **gas-specific**. The unit strings say `kg CO2`, `g CH4`, and `g N2O`. None of the 63 rows uses a CO₂e unit.
- CH₄ and N₂O are stored in **grams of that gas**, not kilograms and not grams of CO₂e. CO₂ is stored in **kilograms of CO₂**.
- `Heat Content (HHV)` is the default higher heating value EPA prints beside the emission factors. It is not an emission factor. Its unit is the `HIV Unit` cell: mmBtu per short ton, per scf, or per gallon.

The loader multiplies the per-mmBtu gas factor by this HHV and by 1,000,000 when the HHV unit contains `scf`, and exposes the result as a per-MMSCF option. That scaling is calculator behavior. The table itself stores per scf, not per MMSCF.

## 3. Factor coverage

Row counts below are the live pgAdmin counts. They are the same as the dump.

### `Fuel EPA 1` — solids (17)

| Category as stored | Fuel types |
| --- | --- |
| `Coal and Coke` | Anthracite, Bituminous, Sub-bituminous, Lignite, Mixed (Commercial Sector), Mixed (Electric Power Sector), Mixed (Industrial Coking), Mixed (Industrial Sector), Coal Coke |
| `Other Fuels - Solid` | Municipal Solid Waste, Petroleum Coke (Solid), Plastics, Tires |
| `Biomass Fuels - Solid` | Agricultural Byproducts, Peat, Solid Byproducts, Wood and Wood Residuals |

### `Fuel EPA 2` — gases (7)

| Category as stored | Fuel types |
| --- | --- |
| `Natural Gas` | Natural Gas |
| ` Other Fuels - Gaseous ` | Blast Furnace Gas, Coke Oven Gas, Fuel Gas, Propane Gas |
| `Biomass Fuels - Gaseous` | Landfill Gas, Other Biomass Gases |

The gaseous category value has a leading and trailing space in the dump. The loader trims category and fuel before building the map key.

### `Fuel EPA 3` — liquids (39)

| Category as stored | Fuel types |
| --- | --- |
| ` Petroleum Products ` | Asphalt and Road Oil, Aviation Gasoline, Butane, Butylene, Crude Oil, Distillate Fuel Oil No. 1, Distillate Fuel Oil No. 2, Distillate Fuel Oil No. 4, Ethane, Ethylene, Heavy Gas Oils, Isobutane, Isobutylene, Kerosene, Kerosene-Type Jet Fuel, Liquefied Petroleum Gases (LPG), Lubricants, Motor Gasoline, Naphtha (<401 deg F), Natural Gasoline, Other Oil (>401 deg F), Pentanes Plus, Petrochemical Feedstocks, Propane, Propylene, Residual Fuel Oil No. 5, Residual Fuel Oil No. 6, Special Naphtha, Unfinished Oils, Used Oil |
| ` Biomass Fuels - Liquid ` | Biodiesel (100%), Ethanol (100%), Rendered Animal Fat, Vegetable Oil |
| ` Biomass Fuels - ` plus a line break plus `Kraft Pulping Liquor, by Wood Furnish ` | North American Softwood, North American Hardwood, Bagasse, Bamboo, Straw |

There is **no** fuel named Diesel, Fuel Oil, or Heating Oil. The distillate names are `Distillate Fuel Oil No. 1`, `No. 2`, and `No. 4`.

The kraft category contains a newline in the middle of the text. `trim()` does not remove that newline, so the category key keeps it.

### How 1, 2, and 3 are distinguished

The row has no dataset column. The split is which table the row was loaded from:

1. JWT mode asks for dataset codes `fuel_epa_1`, `fuel_epa_2`, `fuel_epa_3` (also `fuel_epa1` / `fuel_epa2` / `fuel_epa3`) and concatenates the sheets in that order.
2. If that returns nothing, the client selects `*` from `"Fuel EPA 1"`, then `"Fuel EPA 2"`, then `"Fuel EPA 3"`.
3. `buildEpaFuelFactorsMap` merges them into one map. Equipment type does not choose a table.

The live duplicate query returned no rows. No `Category` + `Fuel Type` pair is repeated inside a table or across the three tables, so the merge does not replace any current value. The loader still overwrites: a later row with the same category, fuel, and unit label replaces the earlier number for that label and leaves the other unit labels on that fuel in place. Tables are applied in order 1, then 2, then 3, so table 3 would win a collision.

### What is stored when a calculation is saved

The stationary save payload stores the selected fuel, category, unit label, quantity, the numeric factor that was used, and the calculated mass. It stores `emission_framework = "epa"`.

It does **not** store:

- which of the three tables supplied the row
- `factor_datasets.version_label` (`imported_from_sheet` in the ETL)
- `effective_from` / `effective_to`
- a publication year
- `factor_row_id` (the calc client accepts that field; the stationary screen does not send it)

A later change to a factor table does not mark old saved entries with the factor edition they used. Only the factor number copied onto the entry remains.

## Live pgAdmin confirmation

Run on 20 October 2026. These replace the earlier “dump only” status for the items below.

| Check | Live result |
| --- | --- |
| Object location | `ref."Fuel EPA 1"`, `ref."Fuel EPA 2"`, and `ref."Fuel EPA 3"` are tables. `public` has a view of each with the same name. No singular `Fuel EPA` object was returned. |
| Columns | `public` and `ref` have the same 16 columns on each dataset. Types match the dump, including `N20 Unit`, text `CO2 Factor_1` / `CH4 Factor_1` on table 1, and `bigint` `N2O Factor_1` on table 1. |
| Row counts | 17, 7, and 39. |
| Row values | The exported rows match the dump, including unit strings (`kg CO2 per mmBtu`, `g CH4 per mmBtu`, `g N2O per mmBtu`, and the per short ton / per scf / per gallon second factors), leading spaces on some categories, the newline inside the kraft category, and null heat content plus null per-gallon factors on the five kraft rows. |
| Duplicate fuels | No rows. Nothing in the current data is overwritten by a later dataset. |
| Year / source column on the sheets | No column whose name contains year, version, source, publication, or effective. |
| `ref.factor_datasets` | Three active rows, codes `fuel_epa_1`, `fuel_epa_2`, `fuel_epa_3`. Publisher `EPA`. `version_label` `imported_from_sheet`. `effective_from` and `effective_to` are null. `source_notes` is the ETL note `ETL from ref.` plus the table name. |
| `public.scope1_fuel_entries` | Columns are `id`, `user_id`, `fuel_type_group`, `fuel`, `unit`, `quantity`, `factor`, `emissions`, `created_at`, `counterparty_id`, `emissions_output`, `emissions_output_unit`, `uk_factor_basis`, `emission_framework`. There is no version or year column. 13 rows have `emission_framework = epa` and all 13 have a `factor`. 4 rows are `uk`. |
| `app.emission_activities` fuel rows | 12 rows with `legacy_source` or `raw._legacy_table` equal to `scope1_fuel_entries`. `factor_dataset_id` is null on all 12. `factor_row_id` is null on all 12. |
| JSON keys on those 12 rows | `_inferred_framework`, `counterparty_id`, `created_at`, `emission_framework`, `emissions`, `emissions_output`, `emissions_output_unit`, `factor`, `fuel`, `fuel_type_group`, `id`, `quantity`, `uk_factor_basis`, `unit`, `user_id`. No dataset, version, or publication-year key. |

The 13 legacy EPA rows and the 12 activity rows are different counts. This check does not explain that difference. Both stores keep a numeric `factor` and neither keeps the factor edition.

## 4. pgAdmin queries

These are the read-only queries that produced the live confirmation above. They do not insert, update, or delete.

In pgAdmin: connect to the app database, open **Query Tool**, paste one block, and run it. To keep a result, use the result-grid download button and save CSV. Do not put a password or connection string in the query window or in a file.

`public."Fuel EPA 1"` (and 2 and 3) is the name the calculator uses. If migration `0006` has been applied, those public names are views and the physical tables are in `ref`. Query 1 shows which one you have. Queries 4–6 read `public`, so they work for either a real table or that view.

Do not `UNION ALL` the three `SELECT *` exports. Table 1 has different columns from tables 2 and 3.

### 1. Where the three datasets are

```sql
SELECT n.nspname AS schema_name,
       c.relname AS object_name,
       CASE c.relkind
         WHEN 'r' THEN 'table'
         WHEN 'v' THEN 'view'
         WHEN 'm' THEN 'materialized view'
         ELSE c.relkind::text
       END AS object_type
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname IN ('Fuel EPA', 'Fuel EPA 1', 'Fuel EPA 2', 'Fuel EPA 3')
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY c.relname, n.nspname;
```

### 2. Column names and types

```sql
SELECT table_schema, table_name, ordinal_position, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('Fuel EPA 1', 'Fuel EPA 2', 'Fuel EPA 3')
ORDER BY table_schema, table_name, ordinal_position;
```

### 3. Row counts

```sql
SELECT 'public.Fuel EPA 1' AS dataset, COUNT(*) AS row_count FROM public."Fuel EPA 1"
UNION ALL
SELECT 'public.Fuel EPA 2', COUNT(*) FROM public."Fuel EPA 2"
UNION ALL
SELECT 'public.Fuel EPA 3', COUNT(*) FROM public."Fuel EPA 3";
```

### 4. All rows in Fuel EPA 1

```sql
SELECT *
FROM public."Fuel EPA 1"
ORDER BY "Category", "Fuel Type";
```

### 5. All rows in Fuel EPA 2

```sql
SELECT *
FROM public."Fuel EPA 2"
ORDER BY "Category", "Fuel Type";
```

### 6. All rows in Fuel EPA 3

```sql
SELECT *
FROM public."Fuel EPA 3"
ORDER BY "Category", "Fuel Type";
```

### 7. Categories and fuel types, with which dataset they come from

```sql
SELECT 'Fuel EPA 1' AS dataset, "Category", "Fuel Type"
FROM public."Fuel EPA 1"
UNION ALL
SELECT 'Fuel EPA 2', "Category", "Fuel Type"
FROM public."Fuel EPA 2"
UNION ALL
SELECT 'Fuel EPA 3', "Category", "Fuel Type"
FROM public."Fuel EPA 3"
ORDER BY 1, 2, 3;
```

### 8. Duplicate category + fuel inside one table, or across the three tables

A row here means a later dataset can overwrite that fuel in the calculator. No rows means the current data has no collision.

```sql
SELECT btrim("Category") AS category,
       btrim("Fuel Type") AS fuel_type,
       COUNT(*) AS copies,
       string_agg(dataset, ', ' ORDER BY dataset) AS datasets
FROM (
  SELECT 'Fuel EPA 1' AS dataset, "Category", "Fuel Type" FROM public."Fuel EPA 1"
  UNION ALL
  SELECT 'Fuel EPA 2', "Category", "Fuel Type" FROM public."Fuel EPA 2"
  UNION ALL
  SELECT 'Fuel EPA 3', "Category", "Fuel Type" FROM public."Fuel EPA 3"
) s
GROUP BY btrim("Category"), btrim("Fuel Type")
HAVING COUNT(*) > 1
ORDER BY category, fuel_type;
```

### 9. Factor edition stored on the sheet tables

This returns nothing if none of the three tables has a year, version, source, or publication column. That is the expected result from the dump.

```sql
SELECT table_schema, table_name, column_name
FROM information_schema.columns
WHERE table_name IN ('Fuel EPA 1', 'Fuel EPA 2', 'Fuel EPA 3')
  AND (
    column_name ILIKE '%year%'
    OR column_name ILIKE '%version%'
    OR column_name ILIKE '%source%'
    OR column_name ILIKE '%publication%'
    OR column_name ILIKE '%effective%'
  )
ORDER BY table_schema, table_name, column_name;
```

### 10. Edition recorded by the later factor-dataset copy

Skip this if query 1 did not show schema `ref`, or if this errors with `relation "ref.factor_datasets" does not exist`. The migration sets `version_label` to `imported_from_sheet` and does not store an EPA publication year.

```sql
SELECT code, publisher, title, version_label,
       effective_from, effective_to, source_notes, is_active
FROM ref.factor_datasets
WHERE code IN ('fuel_epa_1', 'fuel_epa_2', 'fuel_epa_3')
   OR title IN ('Fuel EPA 1', 'Fuel EPA 2', 'Fuel EPA 3')
ORDER BY code;
```

### 11. Whether a saved stationary entry keeps a factor version

Legacy rows in `public.scope1_fuel_entries` store the factor number. They have no version column in the migrations.

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'scope1_fuel_entries'
ORDER BY ordinal_position;
```

```sql
SELECT emission_framework,
       COUNT(*) AS entries,
       COUNT(factor) AS entries_with_factor
FROM public.scope1_fuel_entries
GROUP BY emission_framework
ORDER BY emission_framework;
```

JWT rows, when `app.emission_activities` exists, have `factor_dataset_id` and `factor_row_id`. The stationary screen does not send those ids. This shows whether saved fuel rows actually have them filled.

```sql
SELECT COUNT(*) AS fuel_entries,
       COUNT(factor_dataset_id) AS with_dataset_id,
       COUNT(factor_row_id) AS with_factor_row_id
FROM app.emission_activities
WHERE legacy_source = 'scope1_fuel_entries'
   OR raw->>'_legacy_table' = 'scope1_fuel_entries';
```

```sql
SELECT DISTINCT key
FROM app.emission_activities AS a
CROSS JOIN LATERAL jsonb_object_keys(a.raw) AS key
WHERE a.legacy_source = 'scope1_fuel_entries'
   OR a.raw->>'_legacy_table' = 'scope1_fuel_entries'
ORDER BY key;
```

The last query lists the JSON keys stored on a saved fuel entry. A publication year is tracked only if a key such as `version`, `factor_year`, or `dataset` appears there. The keys the app writes are the fuel payload plus `_legacy_table`.

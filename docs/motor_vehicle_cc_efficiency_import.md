# Motor vehicle CC-band efficiency — import for Score 5

Source sheet of **fuel efficiency by engine CC band + fuel type**.

One sheet for both local and regional Score 5 distance scope (geography is optional on import).

| PCAF UI score | Option code | App field | Value from sheet |
|---|---|---|---|
| Score 5 | `3b` | `efficiency` | `efficiency` + `unit` → converted to **L/km** by CC band + fuel type |

**Emission factor** on Score 5 stays **EPA Mobile Fuel by fuel type**. This sheet only supplies efficiency.

Do **not** keep this as a one-off `public` table only. Staging + promote into `ref.factor_datasets` / `ref.factor_rows`.

---

## Excel → staging column names

Each sheet has the same four columns. Rename headers before export (or map in pgAdmin). **Add a 5th column** `geography` so both sheets can share one table.

| Excel header | Staging column | Notes |
|---|---|---|
| CC Band | `cc_band` | e.g. `Under 1000cc`, `1000-1300cc` |
| Fuel Type | `fuel_type` | e.g. Petrol, Diesel, CNG |
| Efficiency | `efficiency` | number (TEXT in staging so blank / “N/A” still import) |
| Unit | `unit` | e.g. `km/L`, `L/100km`, `L/km` |
| *(add manually)* | `geography` | `local` for Pakistan sheet, `regional` for Regional sheet |

---

## Prepare two CSVs (Excel)

### Sheet A — LOCAL: Pakistan

1. Open the sheet  
2. Rename row-1 headers to: `cc_band`, `fuel_type`, `efficiency`, `unit`  
3. Insert column E header `geography`  
4. Fill every data row with `local`  
5. **File → Save As → CSV UTF-8** (or Tab-delimited `.tsv`)  
   Suggested name: `motor_vehicle_cc_efficiency_local.csv`

### Sheet B — Regional by CC

Same steps, but geography = `regional`  
Suggested name: `motor_vehicle_cc_efficiency_regional.csv`

Tab export tip (same as make/model): if commas inside cells break CSV, export as **Tab** and set Delimiter = Tab in pgAdmin.

---

## CSV columns (must match staging)

```
cc_band
fuel_type
efficiency
unit
geography
```

---

## Step 1 — Staging table (pgAdmin Query Tool)

```sql
CREATE SCHEMA IF NOT EXISTS public;

DROP TABLE IF EXISTS public.staging_motor_vehicle_cc_efficiency;

CREATE TABLE public.staging_motor_vehicle_cc_efficiency (
  cc_band     TEXT,
  fuel_type   TEXT,
  efficiency  TEXT,
  unit        TEXT,
  geography   TEXT
);
```

---

## Step 2 — Import both CSVs into the same staging table

### First file (local)

pgAdmin → right-click `public.staging_motor_vehicle_cc_efficiency` → **Import/Export Data**:

- Format: CSV  
- Header: **Yes**  
- Encoding: **UTF8** (or LATIN1 if UTF8 fails)  
- Delimiter: `,` or **Tab** (match the file)  
- Quote: `"`  
- Import: `motor_vehicle_cc_efficiency_local.csv`

### Second file (regional)

Same table → **Import/Export Data** again with `motor_vehicle_cc_efficiency_regional.csv`  
(pgAdmin appends rows; do **not** truncate between the two files.)

Or psql:

```sql
\copy public.staging_motor_vehicle_cc_efficiency FROM 'motor_vehicle_cc_efficiency_local.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');
\copy public.staging_motor_vehicle_cc_efficiency FROM 'motor_vehicle_cc_efficiency_regional.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');
```

### If you forgot the geography column in Excel

Import into a 4-column temp table, then insert with a fixed geography:

```sql
DROP TABLE IF EXISTS public.staging_motor_vehicle_cc_efficiency_raw;
CREATE TABLE public.staging_motor_vehicle_cc_efficiency_raw (
  cc_band TEXT, fuel_type TEXT, efficiency TEXT, unit TEXT
);

-- Import LOCAL CSV into _raw, then:
INSERT INTO public.staging_motor_vehicle_cc_efficiency (cc_band, fuel_type, efficiency, unit, geography)
SELECT cc_band, fuel_type, efficiency, unit, 'local'
FROM public.staging_motor_vehicle_cc_efficiency_raw;

TRUNCATE public.staging_motor_vehicle_cc_efficiency_raw;

-- Import REGIONAL CSV into _raw, then:
INSERT INTO public.staging_motor_vehicle_cc_efficiency (cc_band, fuel_type, efficiency, unit, geography)
SELECT cc_band, fuel_type, efficiency, unit, 'regional'
FROM public.staging_motor_vehicle_cc_efficiency_raw;
```

### Sanity check

```sql
SELECT geography, COUNT(*) AS rows,
       COUNT(DISTINCT cc_band) AS bands,
       COUNT(DISTINCT fuel_type) AS fuels
FROM public.staging_motor_vehicle_cc_efficiency
GROUP BY geography
ORDER BY geography;

SELECT geography, cc_band, fuel_type, efficiency, unit
FROM public.staging_motor_vehicle_cc_efficiency
ORDER BY geography, cc_band, fuel_type
LIMIT 50;
```

You should see both `local` and `regional` row counts.

---

## Step 3 — Promote into `ref.factor_*` (re-runnable)

```sql
CREATE SCHEMA IF NOT EXISTS ref;

INSERT INTO ref.factor_datasets (code, publisher, title, version_label, is_active, source_notes)
VALUES (
  'motor_vehicle_cc_efficiency',
  'internal',
  'Motor vehicle efficiency by engine CC band',
  'imported',
  true,
  'Score 5 (3b): efficiency by CC band + fuel type. Local = Pakistan real-world; Regional = regional by CC. App converts unit to L/km. EF remains EPA Mobile Fuel.'
)
ON CONFLICT (code) DO UPDATE
SET title = EXCLUDED.title,
    source_notes = EXCLUDED.source_notes,
    is_active = true;

DELETE FROM ref.factor_rows
WHERE dataset_id = (SELECT id FROM ref.factor_datasets WHERE code = 'motor_vehicle_cc_efficiency');

INSERT INTO ref.factor_rows (
  dataset_id,
  category,
  label,
  unit,
  kg_co2e,
  attributes,
  meta
)
SELECT
  d.id,
  COALESCE(NULLIF(TRIM(s.geography), ''), 'regional'),
  COALESCE(
    NULLIF(TRIM(CONCAT_WS(' — ', s.cc_band, s.fuel_type)), ''),
    NULLIF(TRIM(s.cc_band), ''),
    'Unknown'
  ),
  COALESCE(NULLIF(TRIM(s.unit), ''), 'km/L'),
  NULL,  -- efficiency sheet; Score 5 EF comes from EPA
  jsonb_build_object(
    'cc_band', s.cc_band,
    'fuel_type', s.fuel_type,
    'efficiency', s.efficiency,
    'unit', s.unit,
    'geography', s.geography
  ),
  jsonb_build_object(
    'source', 'motor vehicle CC efficiency CSV',
    'score5_field', 'efficiency',
    'geography_field', 'geography'
  )
FROM public.staging_motor_vehicle_cc_efficiency s
CROSS JOIN ref.factor_datasets d
WHERE d.code = 'motor_vehicle_cc_efficiency'
  AND COALESCE(NULLIF(TRIM(s.cc_band), ''), '') <> '';

-- Sanity check
SELECT
  d.code,
  COUNT(*) AS rows,
  COUNT(DISTINCT r.attributes->>'geography') AS geographies,
  COUNT(DISTINCT r.attributes->>'cc_band') AS bands
FROM ref.factor_datasets d
JOIN ref.factor_rows r ON r.dataset_id = d.id
WHERE d.code = 'motor_vehicle_cc_efficiency'
GROUP BY d.code;

SELECT
  r.attributes->>'geography' AS geography,
  r.attributes->>'cc_band' AS cc_band,
  r.attributes->>'fuel_type' AS fuel_type,
  r.attributes->>'efficiency' AS efficiency,
  r.attributes->>'unit' AS unit
FROM ref.factor_rows r
JOIN ref.factor_datasets d ON d.id = r.dataset_id
WHERE d.code = 'motor_vehicle_cc_efficiency'
ORDER BY r.attributes->>'geography', r.attributes->>'cc_band', r.attributes->>'fuel_type';
```

---

## What the app will read (after loader is wired)

Dataset code: `motor_vehicle_cc_efficiency`  
Fallback table: `public.staging_motor_vehicle_cc_efficiency`

| Form field | Sheet field |
|---|---|
| Local / regional scope | `geography` |
| Engine CC (user enters cc) | matched to `cc_band` |
| Fuel type | `fuel_type` |
| Efficiency (L/km) | `efficiency` + `unit` |

Until the Score 5 loader is wired, the form still uses the provisional `efficiencyForEngineCc()` bands in code.

---

## Re-import

1. `TRUNCATE public.staging_motor_vehicle_cc_efficiency;`  
2. Re-import both CSVs  
3. Re-run Step 3 promote (it deletes old `factor_rows` for this dataset first)

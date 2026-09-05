# Motor vehicle make / model efficiency — import for Score 2 & 3

Source CSV of **manufacturer fuel efficiency** (and optional emission factors) by brand / model / year.

Used to pre-load **fuel efficiency (L/km)** when the user picks Brand / Model / Year on:

| PCAF UI score | Option code | App field | Value from sheet |
|---|---|---|---|
| Score 1a | `1a` | Brand / Model / Year (record only) | same lookup — efficiency not used in fuel formula |
| Score 1b | `1b` | `efficiency` | `efficiency_average` → converted to **L/km** |
| Score 2 | `2a` | `efficiency` | same |
| Score 3 | `2b` | `efficiency` | same |

**Emission factor** on Score 2 / 3 stays **EPA Mobile Fuel by fuel type** (same as Score 1b). Sheet `emission_factor_*` columns are stored for reference / later use, not used in the Score 2–3 formula yet.

**Score 1b:** user still enters efficiency manually (make/model free text). This sheet is not required there.

Do **not** keep this as a one-off `public` table only. Staging + promote into `ref.factor_datasets` / `ref.factor_rows`.

---

## Excel → staging column names

Rename CSV headers to snake_case before import (or set column mapping in pgAdmin):

| Excel header | Staging column |
|---|---|
| Brand | `brand` |
| Model | `model` |
| Year | `year` |
| Model + Year | `model_year_label` |
| Category | `category` |
| Country of Origin | `country_of_origin` |
| Fuel Type | `fuel_type` |
| Efficiency (Standard) | `efficiency_standard` |
| Efficiency (As Published) | `efficiency_as_published` |
| Emission Factor (Standard) | `emission_factor_standard` |
| Emission Factor (As Published) | `emission_factor_as_published` |
| Source | `source` |
| Official Source? | `official_source` |
| Notes | `notes` |
| Pakistan Market Status | `pakistan_market_status` |
| Pakistan Verification Note | `pakistan_verification_note` |
| Efficiency (Average) | `efficiency_average` |
| Efficiency Unit | `efficiency_unit` |
| Emission Factor (Average) | `emission_factor_average` |
| Emission Factor Unit | `emission_factor_unit` |
| Emission Factor Basis | `emission_factor_basis` |

Default lookup: **`efficiency_average`** + **`efficiency_unit`** (app converts to L/km).

Fallback if average is blank: `efficiency_standard`, then `efficiency_as_published`.

---

## CSV columns (must match staging)

```
brand
model
year
model_year_label
category
country_of_origin
fuel_type
efficiency_standard
efficiency_as_published
emission_factor_standard
emission_factor_as_published
source
official_source
notes
pakistan_market_status
pakistan_verification_note
efficiency_average
efficiency_unit
emission_factor_average
emission_factor_unit
emission_factor_basis
```

Tab-separated: Delimiter = Tab. Comma CSV: delimiter `,`. Quote notes fields that contain commas.

---

## Step 1 — Staging table (pgAdmin Query Tool)

**Important:** efficiency / emission-factor columns are **TEXT**, not NUMERIC. The CSV has values like `Not researched` which break NUMERIC import. The app coerces numbers on read; promote keeps the raw text in `attributes`.

```sql
CREATE SCHEMA IF NOT EXISTS public;

DROP TABLE IF EXISTS public.staging_motor_vehicle_make_model;

CREATE TABLE public.staging_motor_vehicle_make_model (
  brand                         TEXT,
  model                         TEXT,
  year                          TEXT,
  model_year_label              TEXT,
  category                      TEXT,
  country_of_origin             TEXT,
  fuel_type                     TEXT,
  efficiency_standard           TEXT,
  efficiency_as_published       TEXT,
  emission_factor_standard      TEXT,
  emission_factor_as_published  TEXT,
  source                        TEXT,
  official_source               TEXT,
  notes                         TEXT,
  pakistan_market_status        TEXT,
  pakistan_verification_note    TEXT,
  efficiency_average            TEXT,
  efficiency_unit               TEXT,
  emission_factor_average       TEXT,
  emission_factor_unit          TEXT,
  emission_factor_basis         TEXT
);
```

---

## Step 2 — Import CSV

pgAdmin → right-click `public.staging_motor_vehicle_make_model` → **Import/Export Data**:

- Format: CSV  
- Header: **Yes**  
- Encoding: **UTF8** (or LATIN1 if UTF8 fails)  
- Delimiter: `,` or **Tab**  
- Quote: `"`  

Or psql:

```sql
\copy public.staging_motor_vehicle_make_model FROM 'motor_vehicle_make_model.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');
```

Sanity check:

```sql
SELECT COUNT(*) AS rows,
       COUNT(DISTINCT brand) AS brands,
       COUNT(DISTINCT fuel_type) AS fuels,
       COUNT(DISTINCT efficiency_unit) AS efficiency_units
FROM public.staging_motor_vehicle_make_model;

SELECT brand, model, year, model_year_label, fuel_type,
       efficiency_average, efficiency_unit
FROM public.staging_motor_vehicle_make_model
ORDER BY brand, model, year
LIMIT 40;
```

---

## Step 3 — Promote into `ref.factor_*` (re-runnable)

```sql
CREATE SCHEMA IF NOT EXISTS ref;

INSERT INTO ref.factor_datasets (code, publisher, title, version_label, is_active, source_notes)
VALUES (
  'motor_vehicle_make_model',
  'internal',
  'Motor vehicle make/model fuel efficiency',
  'imported',
  true,
  'Brand/model/year efficiency for PCAF Score 2–3. Default: efficiency_average + efficiency_unit (converted to L/km in app). EF on Score 2–3 remains EPA Mobile Fuel.'
)
ON CONFLICT (code) DO UPDATE
SET title = EXCLUDED.title,
    source_notes = EXCLUDED.source_notes,
    is_active = true;

DELETE FROM ref.factor_rows
WHERE dataset_id = (SELECT id FROM ref.factor_datasets WHERE code = 'motor_vehicle_make_model');

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
  COALESCE(NULLIF(TRIM(s.brand), ''), 'Unknown'),
  COALESCE(
    NULLIF(TRIM(s.model_year_label), ''),
    NULLIF(TRIM(CONCAT_WS(' ', s.model, s.year)), ''),
    NULLIF(TRIM(s.model), ''),
    'Unknown'
  ),
  COALESCE(NULLIF(TRIM(s.efficiency_unit), ''), 'L/km'),
  NULL,  -- efficiency sheet; Score 2–3 EF comes from EPA
  jsonb_build_object(
    'brand', s.brand,
    'model', s.model,
    'year', s.year,
    'model_year_label', s.model_year_label,
    'category', s.category,
    'country_of_origin', s.country_of_origin,
    'fuel_type', s.fuel_type,
    'efficiency_standard', s.efficiency_standard,
    'efficiency_as_published', s.efficiency_as_published,
    'emission_factor_standard', s.emission_factor_standard,
    'emission_factor_as_published', s.emission_factor_as_published,
    'source', s.source,
    'official_source', s.official_source,
    'notes', s.notes,
    'pakistan_market_status', s.pakistan_market_status,
    'pakistan_verification_note', s.pakistan_verification_note,
    'efficiency_average', s.efficiency_average,
    'efficiency_unit', s.efficiency_unit,
    'emission_factor_average', s.emission_factor_average,
    'emission_factor_unit', s.emission_factor_unit,
    'emission_factor_basis', s.emission_factor_basis
  ),
  jsonb_build_object(
    'source', 'motor vehicle make/model CSV',
    'score2_field', 'efficiency_average',
    'score3_field', 'efficiency_average'
  )
FROM public.staging_motor_vehicle_make_model s
CROSS JOIN ref.factor_datasets d
WHERE d.code = 'motor_vehicle_make_model'
  AND COALESCE(NULLIF(TRIM(s.brand), ''), '') <> '';

-- Sanity check (safe numeric extract — skips "Not researched" etc.)
SELECT
  d.code,
  COUNT(*) AS rows,
  COUNT(DISTINCT r.category) AS brands,
  MIN(NULLIF(regexp_replace(r.attributes->>'efficiency_average', '[^0-9.\-]', '', 'g'), '')::numeric) AS min_eff,
  MAX(NULLIF(regexp_replace(r.attributes->>'efficiency_average', '[^0-9.\-]', '', 'g'), '')::numeric) AS max_eff
FROM ref.factor_datasets d
JOIN ref.factor_rows r ON r.dataset_id = d.id
WHERE d.code = 'motor_vehicle_make_model'
GROUP BY d.code;

SELECT
  r.category AS brand,
  r.label AS model_year,
  r.attributes->>'fuel_type' AS fuel_type,
  r.attributes->>'efficiency_average' AS efficiency_average,
  r.attributes->>'efficiency_unit' AS efficiency_unit
FROM ref.factor_rows r
JOIN ref.factor_datasets d ON d.id = r.dataset_id
WHERE d.code = 'motor_vehicle_make_model'
ORDER BY r.category, r.label
LIMIT 40;
```

---

## What the app reads

Dataset code: `motor_vehicle_make_model`  
Fallback table: `public.staging_motor_vehicle_make_model`

| Form field | Sheet field |
|---|---|
| Make (Brand) | `brand` / `category` in `ref.factor_rows` |
| Model | `model_year_label` (or model + year) |
| Efficiency (L/km) | `efficiency_average` (+ unit conversion) |
| Fuel type (hint) | `fuel_type` — may help match EPA fuel list |

```sql
SELECT
  r.category AS brand,
  r.label AS model_year_label,
  r.attributes->>'fuel_type' AS fuel_type,
  r.attributes->>'efficiency_average' AS efficiency_average,
  r.attributes->>'efficiency_unit' AS efficiency_unit
FROM ref.factor_rows r
JOIN ref.factor_datasets d ON d.id = r.dataset_id
WHERE d.code = 'motor_vehicle_make_model'
ORDER BY r.category, r.label;
```

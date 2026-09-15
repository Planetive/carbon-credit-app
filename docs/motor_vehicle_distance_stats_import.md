# Motor vehicle distance stats — import for Score 2 & 3

Source CSV of **statistical annual / monthly kilometres** by vehicle segment.

Used to pre-load **distance travelled** for motor vehicle loans (Scores 2–5). Lookup is **vehicle use** (private / public) + **vehicle class**, plus public **intercity / outercity** (sheet Intracity) and local vs regional geography.

| PCAF UI score | Option code | App field | Value from sheet |
|---|---|---|---|
| Score 2 | `2a` | `distance_traveled` (local) | `annual_km_default` where geography is local (falls back to regional if no local row) |
| Score 3 | `2b` | `distance_traveled` (regional) | `annual_km_default` where geography is regional / national |
| Score 4 | `3a` | same + user picks local or regional | same lookup |
| Score 5 | `3b` | same + user picks local or regional | same lookup |

Default for calculation: **`annual_km_default`** (unit from `unit`, typically km). Low / high bands are stored for reference, not used in the formula unless we add a range picker later.

**Formula (Score 2 / 3):** Attribution × Distance(stats) × Efficiency × EF

Do **not** keep this as a one-off `public` table only. Staging + promote into `ref.factor_datasets` / `ref.factor_rows` (same pattern as CBECS / ICE).

---

## CSV columns (must match headers)

```
segment_name
vehicle_use
vehicle_class
operation_type
annual_km_default
annual_km_low
annual_km_high
monthly_km_default
monthly_km_low
monthly_km_high
unit
distance_geography
measurement_type
anchor_source
source_url
derivation_note
key_limitation
```

Tab-separated files: in pgAdmin Import, set **Delimiter** to `Tab`. Comma-separated: leave delimiter as `,`.

---

## Step 1 — Staging table (pgAdmin Query Tool)

```sql
CREATE SCHEMA IF NOT EXISTS public;

DROP TABLE IF EXISTS public.staging_motor_vehicle_distance_stats;

CREATE TABLE public.staging_motor_vehicle_distance_stats (
  segment_name          TEXT,
  vehicle_use           TEXT,
  vehicle_class         TEXT,
  operation_type        TEXT,
  annual_km_default     NUMERIC,
  annual_km_low         NUMERIC,
  annual_km_high        NUMERIC,
  monthly_km_default    NUMERIC,
  monthly_km_low        NUMERIC,
  monthly_km_high       NUMERIC,
  unit                  TEXT,
  distance_geography    TEXT,
  measurement_type      TEXT,
  anchor_source         TEXT,
  source_url            TEXT,
  derivation_note       TEXT,
  key_limitation        TEXT
);
```

Column order/names must match the CSV headers.

---

## Step 2 — Import CSV

pgAdmin → right-click `public.staging_motor_vehicle_distance_stats` → **Import/Export Data**:

- Format: CSV  
- Header: **Yes**  
- Encoding: **UTF8** (or LATIN1 if UTF8 fails)  
- Delimiter: `,` or **Tab** (match the file)  
- Quote: `"`  

Or psql (comma CSV):

```sql
\copy public.staging_motor_vehicle_distance_stats FROM 'motor_vehicle_distance_stats.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');
```

Tab-separated:

```sql
\copy public.staging_motor_vehicle_distance_stats FROM 'motor_vehicle_distance_stats.tsv' WITH (FORMAT csv, HEADER true, DELIMITER E'\t', ENCODING 'UTF8');
```

Sanity check:

```sql
SELECT COUNT(*) AS rows,
       COUNT(DISTINCT vehicle_use) AS uses,
       COUNT(DISTINCT vehicle_class) AS classes,
       COUNT(DISTINCT distance_geography) AS geographies
FROM public.staging_motor_vehicle_distance_stats;

SELECT vehicle_use, vehicle_class, operation_type, distance_geography,
       annual_km_default, unit
FROM public.staging_motor_vehicle_distance_stats
ORDER BY vehicle_use, vehicle_class
LIMIT 30;
```

If you get `extra data after last expected column`, delimiter is wrong or a note field has unquoted commas — wrap those columns in quotes in the CSV, or use Tab delimiter.

---

## Step 3 — Promote into `ref.factor_*` (re-runnable)

```sql
CREATE SCHEMA IF NOT EXISTS ref;

INSERT INTO ref.factor_datasets (code, publisher, title, version_label, is_active, source_notes)
VALUES (
  'motor_vehicle_distance_stats',
  'internal',
  'Motor vehicle statistical distance travelled',
  'imported',
  true,
  'Annual/monthly km by vehicle use, class, operation type, and geography. Score 2 uses local; Score 3 uses regional. Default lookup is annual_km_default.'
)
ON CONFLICT (code) DO UPDATE
SET title = EXCLUDED.title,
    source_notes = EXCLUDED.source_notes,
    is_active = true;

DELETE FROM ref.factor_rows
WHERE dataset_id = (SELECT id FROM ref.factor_datasets WHERE code = 'motor_vehicle_distance_stats');

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
  COALESCE(NULLIF(TRIM(s.vehicle_use), ''), 'Uncategorized'),
  COALESCE(
    NULLIF(TRIM(s.vehicle_class), ''),
    NULLIF(TRIM(s.segment_name), ''),
    'Unknown'
  ),
  COALESCE(NULLIF(TRIM(s.unit), ''), 'km'),
  NULL,  -- distance stats, not an emission factor
  jsonb_build_object(
    'segment_name', s.segment_name,
    'vehicle_use', s.vehicle_use,
    'vehicle_class', s.vehicle_class,
    'operation_type', s.operation_type,
    'annual_km_default', s.annual_km_default,
    'annual_km_low', s.annual_km_low,
    'annual_km_high', s.annual_km_high,
    'monthly_km_default', s.monthly_km_default,
    'monthly_km_low', s.monthly_km_low,
    'monthly_km_high', s.monthly_km_high,
    'distance_geography', s.distance_geography,
    'measurement_type', s.measurement_type,
    'anchor_source', s.anchor_source,
    'source_url', s.source_url,
    'derivation_note', s.derivation_note,
    'key_limitation', s.key_limitation
  ),
  jsonb_build_object(
    'source', 'motor vehicle distance stats CSV',
    'score2_field', 'annual_km_default',
    'score3_field', 'annual_km_default',
    'geography_field', 'distance_geography'
  )
FROM public.staging_motor_vehicle_distance_stats s
CROSS JOIN ref.factor_datasets d
WHERE d.code = 'motor_vehicle_distance_stats'
  AND s.annual_km_default IS NOT NULL;

-- Sanity check
SELECT
  d.code,
  COUNT(*) AS rows,
  MIN((r.attributes->>'annual_km_default')::numeric) AS min_annual_km,
  MAX((r.attributes->>'annual_km_default')::numeric) AS max_annual_km,
  COUNT(DISTINCT r.attributes->>'distance_geography') AS geographies
FROM ref.factor_datasets d
JOIN ref.factor_rows r ON r.dataset_id = d.id
WHERE d.code = 'motor_vehicle_distance_stats'
GROUP BY d.code;

SELECT
  r.category AS vehicle_use,
  r.label AS vehicle_class,
  r.attributes->>'operation_type' AS operation_type,
  r.attributes->>'distance_geography' AS geography,
  (r.attributes->>'annual_km_default')::numeric AS annual_km,
  r.unit
FROM ref.factor_rows r
JOIN ref.factor_datasets d ON d.id = r.dataset_id
WHERE d.code = 'motor_vehicle_distance_stats'
ORDER BY r.category, r.label;
```

---

## What the app should read later

Dataset code: `motor_vehicle_distance_stats`.

Lookup keys:

| Form field | Sheet field |
|---|---|
| Private / public | `vehicle_use` |
| Vehicle class / segment | `vehicle_class` / `segment_name` |
| Intercity / outercity (if public) | `operation_type` |
| Local vs regional | `distance_geography` |
| Distance (km) | `annual_km_default` |

```sql
SELECT
  r.category,
  r.label,
  r.attributes->>'operation_type' AS operation_type,
  r.attributes->>'distance_geography' AS distance_geography,
  (r.attributes->>'annual_km_default')::numeric AS annual_km_default,
  r.unit
FROM ref.factor_rows r
JOIN ref.factor_datasets d ON d.id = r.dataset_id
WHERE d.code = 'motor_vehicle_distance_stats'
  AND lower(trim(r.attributes->>'distance_geography')) LIKE '%local%'   -- Score 2
  -- AND lower(trim(r.attributes->>'distance_geography')) LIKE '%regional%'  -- Score 3
ORDER BY r.category, r.label;
```

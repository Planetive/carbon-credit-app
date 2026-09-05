# CBECS Table C4 — import for CRE / mortgage Score 4 & 5

Source: EIA CBECS Table C4 (commercial building energy consumption / intensity by building type).

Used to pre-load **estimated energy from statistics** for:

| PCAF UI score | Option code | App field | Unit the form expects |
|---|---|---|---|
| Score 4 | `2b` | `estimated_energy_consumption_from_statistics` × `floor_area` | **kWh/sqft** × **sqft** |
| Score 5 | `3` | `estimated_energy_consumption_from_statistics` × `number_of_buildings` | **kWh/building** × count |

**Conversions (only these — no sqft→m²):**

| CBECS unit | × | Result |
|---|---|---|
| kBtu/sqft | 0.29307 | kWh/sqft |
| MBtu/building | 293.07 | kWh/building |

Grid EF: kgCO₂e/kWh from EPA grid factors → stored as tCO₂e/kWh in `average_emission_factor`.

**Formula:** Attribution × (kWh/sqft × sqft × grid EF) or Attribution × (kWh/building × buildings × grid EF)

Do **not** create a standalone `public.cbecs_table_c4` as the long-term home. Use staging + `ref.factor_datasets` / `ref.factor_rows` (same pattern as ICE / Phase 2C).

---

## Problems with the naive CREATE TABLE

1. Lands in `public` as a one-off sheet — app already reads reference factors from `ref.factor_*`.
2. Pre-baked columns `consumption_per_sqft_kwh_score4` / `consumption_per_building_kwh_score5` assume the CSV already has them. Prefer raw CBECS columns + compute on ETL.
3. **Unit bug for Score 4:** `kBtu/sqft × 0.29307` → **kWh/sqft**, but the form multiplies by floor area in **m²**. You must convert to **kWh/m²** (`× 10.76391041671`).
4. `row_id INTEGER PRIMARY KEY` + `NOT NULL` on category/subcategory often fails on blank / total rows in CBECS exports.
5. Importing into `public` without promoting to `ref.factor_rows` means the SPA cannot pick it up the same way as other factor datasets.

---

## Step 1 — Staging table (pgAdmin Query Tool)

```sql
CREATE SCHEMA IF NOT EXISTS public;

DROP TABLE IF EXISTS public.staging_cbecs_table_c4;

-- Must match cbecs_table_c4_import.csv (14 columns including Claude-derived score cols)
CREATE TABLE public.staging_cbecs_table_c4 (
  row_id                                      INTEGER,
  category                                    TEXT,
  subcategory                                 TEXT,
  consumption_per_building_million_btu        NUMERIC,
  consumption_per_sqft_thousand_btu           NUMERIC,
  consumption_per_worker_million_btu          NUMERIC,
  intensity_25th_percentile_kbtu_sqft         NUMERIC,
  intensity_median_kbtu_sqft                  NUMERIC,
  intensity_75th_percentile_kbtu_sqft         NUMERIC,
  expenditure_per_building_thousand_dollars   NUMERIC,
  expenditure_per_sqft_dollars                NUMERIC,
  expenditure_per_million_btu_dollars         NUMERIC,
  consumption_per_sqft_kwh_score4             NUMERIC,  -- CSV has this; ETL recomputes kWh/m2
  consumption_per_building_kwh_score5         NUMERIC   -- CSV has this; ETL uses MBtu→kWh
);
```

Column order/names must match the CSV headers. Example first data row:

`1,All buildings,All buildings,1147.0,70.4,...,20.6321,336151.29`

---

## Step 2 — Import CSV

pgAdmin → right-click `public.staging_cbecs_table_c4` → **Import/Export Data**:

- Format: CSV  
- Header: Yes  
- Encoding: **UTF8** or **LATIN1** (whichever works for your file)  

Or psql:

```sql
\copy public.staging_cbecs_table_c4 FROM 'cbecs_table_c4_import.csv' WITH (FORMAT csv, HEADER true, ENCODING 'LATIN1');
```

If you get `extra data after last expected column`, staging is missing columns that exist in the CSV — recreate staging with all 14 columns as above.

---

## Step 3 — Promote into `ref.factor_*` (re-runnable)

```sql
CREATE SCHEMA IF NOT EXISTS ref;

INSERT INTO ref.factor_datasets (code, publisher, title, version_label, is_active, source_notes)
VALUES (
  'cbecs_table_c4',
  'EIA',
  'CBECS Table C4 — energy consumption and intensity by building type',
  'imported',
  true,
  'Commercial Buildings Energy Consumption Survey. Score 4 uses median intensity as kWh/m2; Score 5 uses consumption per building as kWh/building.'
)
ON CONFLICT (code) DO UPDATE
SET title = EXCLUDED.title,
    source_notes = EXCLUDED.source_notes,
    is_active = true;

-- Clear prior ETL for this dataset
DELETE FROM ref.factor_rows
WHERE dataset_id = (SELECT id FROM ref.factor_datasets WHERE code = 'cbecs_table_c4');

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
  COALESCE(NULLIF(TRIM(s.category), ''), 'Uncategorized'),
  COALESCE(NULLIF(TRIM(s.subcategory), ''), NULLIF(TRIM(s.category), ''), 'Unknown'),
  'kWh/sqft',  -- Score 4 intensity unit (app uses energy_intensity_kwh_per_sqft)
  NULL,      -- energy intensity, not an emission factor
  jsonb_build_object(
    -- Raw CBECS
    'consumption_per_building_million_btu', s.consumption_per_building_million_btu,
    'consumption_per_sqft_thousand_btu', s.consumption_per_sqft_thousand_btu,
    'consumption_per_worker_million_btu', s.consumption_per_worker_million_btu,
    'intensity_25th_percentile_kbtu_sqft', s.intensity_25th_percentile_kbtu_sqft,
    'intensity_median_kbtu_sqft', s.intensity_median_kbtu_sqft,
    'intensity_75th_percentile_kbtu_sqft', s.intensity_75th_percentile_kbtu_sqft,
    'expenditure_per_building_thousand_dollars', s.expenditure_per_building_thousand_dollars,
    'expenditure_per_sqft_dollars', s.expenditure_per_sqft_dollars,
    'expenditure_per_million_btu_dollars', s.expenditure_per_million_btu_dollars,
    -- App-ready PCAF fields
    -- Score 4 (option 2b): kBtu/sqft → kWh/sqft → kWh/m²
    'energy_intensity_kwh_per_m2_score4',
      ROUND(
        (COALESCE(s.intensity_median_kbtu_sqft, s.consumption_per_sqft_thousand_btu) * 0.29307107 * 10.76391041671)::numeric,
        4
      ),
    -- Score 5 (option 3): million Btu/building → kWh/building
    'energy_per_building_kwh_score5',
      ROUND(
        (s.consumption_per_building_million_btu * 293.07107)::numeric,
        2
      ),
    -- Also keep kWh/sqft if needed for US floor area workflows
    'energy_intensity_kwh_per_sqft',
      ROUND(
        (COALESCE(s.intensity_median_kbtu_sqft, s.consumption_per_sqft_thousand_btu) * 0.29307107)::numeric,
        4
      )
  ),
  jsonb_build_object(
    'source', 'CBECS Table C4',
    'score4_field', 'energy_intensity_kwh_per_m2_score4',
    'score5_field', 'energy_per_building_kwh_score5'
  )
FROM public.staging_cbecs_table_c4 s
CROSS JOIN ref.factor_datasets d
WHERE d.code = 'cbecs_table_c4'
  -- App Score 4/5 only use Principal building activity (Education, Food sales, …)
  AND lower(trim(s.category)) = 'principal building activity'
  AND nullif(trim(s.subcategory), '') IS NOT NULL
  AND (
    s.intensity_median_kbtu_sqft IS NOT NULL
    OR s.consumption_per_sqft_thousand_btu IS NOT NULL
    OR s.consumption_per_building_million_btu IS NOT NULL
  );

-- Sanity check
SELECT
  d.code,
  COUNT(*) AS rows,
  MIN((r.attributes->>'energy_intensity_kwh_per_m2_score4')::numeric) AS min_kwh_m2,
  MAX((r.attributes->>'energy_intensity_kwh_per_m2_score4')::numeric) AS max_kwh_m2,
  MIN((r.attributes->>'energy_per_building_kwh_score5')::numeric) AS min_kwh_bldg,
  MAX((r.attributes->>'energy_per_building_kwh_score5')::numeric) AS max_kwh_bldg
FROM ref.factor_datasets d
JOIN ref.factor_rows r ON r.dataset_id = d.id
WHERE d.code = 'cbecs_table_c4'
GROUP BY d.code;
```

### Conversion constants

| From | To | Factor |
|---|---|---|
| thousand Btu (kBtu) / sqft | kWh / sqft | × **0.29307107** |
| kWh / sqft | kWh / m² | × **10.76391041671** |
| million Btu / building | kWh / building | × **293.07107** |

Median intensity is preferred for Score 4; if missing, fall back to `consumption_per_sqft_thousand_btu`.

---

## Step 4 — What the app does (after import)

`CommercialRealEstateForm` (CRE + mortgage Score 4/5):

1. User picks **CBECS category + subcategory** → auto-fills kWh/sqft (Score 4) or kWh/building (Score 5)
2. User picks **grid country** → sets `average_emission_factor` (tCO₂e/kWh)
3. User enters **floor area (sqft)** or **number of buildings**
4. Calculate: attribution × total kWh × grid EF

Dataset code: `cbecs_table_c4`. Loader: `src/features/finance-emissions/utils/cbecsFactorLoaders.ts`.

### Optional — fix `unit` column on existing rows (AWS pgAdmin)

If you already promoted rows with `unit = 'kWh/m2'`, run:

```sql
UPDATE ref.factor_rows r
SET unit = 'kWh/sqft'
FROM ref.factor_datasets d
WHERE r.dataset_id = d.id AND d.code = 'cbecs_table_c4';
```

The app reads `energy_intensity_kwh_per_sqft` from `attributes`, not the `unit` column.

---

## Note on mortgages vs CRE

CBECS is **commercial** buildings. It fits **commercial real estate** Score 4/5 best. For **residential mortgages**, prefer a residential survey (e.g. RECS) unless you intentionally proxy with CBECS commercial types.

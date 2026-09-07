# Motor vehicle type efficiency — import for Score 4

Source sheet of **fuel efficiency by market vehicle type + fuel** (Hatchback, Sedan, SUV, …).

| Excel / CSV column | Staging column |
|---|---|
| vehicle_type | `vehicle_type` |
| fuel_type | `fuel_type` |
| efficiency | `efficiency` |
| unit | `unit` |
| geography | `geography` (`local` or `regional`) |

Dataset code: `motor_vehicle_type_efficiency`

---

## Step 1 — Staging

```sql
CREATE SCHEMA IF NOT EXISTS public;

DROP TABLE IF EXISTS public.staging_motor_vehicle_type_efficiency;

CREATE TABLE public.staging_motor_vehicle_type_efficiency (
  vehicle_type  TEXT,
  fuel_type     TEXT,
  efficiency    TEXT,
  unit          TEXT,
  geography     TEXT
);
```

## Step 2 — Import CSV (pgAdmin)

Right-click `public.staging_motor_vehicle_type_efficiency` → Import/Export:

- Header: Yes  
- Encoding: UTF8  
- Delimiter: `,` or Tab  

Import local rows (`geography=local`), then regional if you have them (append).

## Step 3 — Promote

```sql
CREATE SCHEMA IF NOT EXISTS ref;

INSERT INTO ref.factor_datasets (code, publisher, title, version_label, is_active, source_notes)
VALUES (
  'motor_vehicle_type_efficiency',
  'internal',
  'Motor vehicle efficiency by market vehicle type',
  'imported',
  true,
  'Score 4 (3a): efficiency by vehicle type + fuel + geography (Hatchback/Sedan/SUV/…). EF remains EPA Table 3/4/Mobile/Non-Road.'
)
ON CONFLICT (code) DO UPDATE
SET title = EXCLUDED.title,
    source_notes = EXCLUDED.source_notes,
    is_active = true;

DELETE FROM ref.factor_rows
WHERE dataset_id = (SELECT id FROM ref.factor_datasets WHERE code = 'motor_vehicle_type_efficiency');

INSERT INTO ref.factor_rows (
  dataset_id, category, label, unit, kg_co2e, attributes, meta
)
SELECT
  d.id,
  COALESCE(NULLIF(TRIM(s.geography), ''), 'local'),
  COALESCE(NULLIF(TRIM(CONCAT_WS(' — ', s.vehicle_type, s.fuel_type)), ''), s.vehicle_type, 'Unknown'),
  COALESCE(NULLIF(TRIM(s.unit), ''), 'km/L'),
  NULL,
  jsonb_build_object(
    'vehicle_type', s.vehicle_type,
    'fuel_type', s.fuel_type,
    'efficiency', s.efficiency,
    'unit', s.unit,
    'geography', s.geography
  ),
  jsonb_build_object(
    'source', 'motor vehicle type efficiency CSV',
    'score4_field', 'efficiency',
    'geography_field', 'geography'
  )
FROM public.staging_motor_vehicle_type_efficiency s
CROSS JOIN ref.factor_datasets d
WHERE d.code = 'motor_vehicle_type_efficiency'
  AND COALESCE(NULLIF(TRIM(s.vehicle_type), ''), '') <> '';

SELECT
  r.attributes->>'geography' AS geography,
  r.attributes->>'vehicle_type' AS vehicle_type,
  r.attributes->>'fuel_type' AS fuel_type,
  r.attributes->>'efficiency' AS efficiency,
  r.attributes->>'unit' AS unit
FROM ref.factor_rows r
JOIN ref.factor_datasets d ON d.id = r.dataset_id
WHERE d.code = 'motor_vehicle_type_efficiency'
ORDER BY 1, 2, 3;
```

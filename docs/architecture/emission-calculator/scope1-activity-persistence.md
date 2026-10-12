# Scope 1 activity-based persistence (AWS / PD Admin)

**Status:** current  
**Date:** 2026-10-12  
**Audience:** frontend + backend + anyone applying SQL in pgAdmin

## Important: not Supabase-first anymore

Production path is:

```txt
SPA (VITE_USE_JWT_AUTH=true)
  → FastAPI (VITE_BACKEND_URL / Railway)
  → EC2 Postgres (schemas app / catalog / ref + KEEP public tables)
```

SQL for this architecture lives in **`db/migrations/`** and is applied via **pgAdmin / psql** on EC2.  
Do **not** put new product schema only under `supabase/migrations/` for this path.

`ghgEntryClient` dual-reads:

| Flag | Writes go to |
|------|----------------|
| `VITE_USE_JWT_AUTH=true` | `app.emission_activities` (+ `raw` jsonb) via `/api/v1/emission-activities` |
| `false` (legacy) | Direct `public.scope1_*` tables via Supabase client |

## What must be stored (granular)

| Data | Where it lives |
|------|----------------|
| Screening Yes/No per group | `public.emission_calculator_preferences.scope1_screening` (jsonb) via `/api/v1/me/calculator-preferences` |
| Fuel qty / factor / emissions | Activity row columns + `raw` |
| Equipment, site, source id, period, method, gas breakdown | `emission_activities.raw.activity_meta` |
| Local UX cache only | `localStorage` key `rc_scope1_screening_v1:*` (merged with DB) |

Activity groups (UI only — not separate DB tables):

- `stationary`
- `vehicles_mobile`
- `leaks_releases`
- `industrial_other`

## Migrations / backend work

1. **EC2 (pgAdmin):** run `db/migrations/0013_scope1_activity_screening.sql`
2. **Backend:** implement/accept `scope1_screening` on calculator-preferences — see `parity/BACKEND_SCOPE1_SCREENING_PROMPT.md`
3. **SPA:** already writes `activity_meta` on save; JWT path nests it inside `raw` automatically

## What we deliberately did *not* do

- New `public.scope1_activity_screening` table (rejected — wrong for AWS prefs model)
- Adding `activity_meta` columns on every legacy `public.scope1_*` table for JWT (redundant with `raw`)
- Treating `supabase/migrations/*` as the source of truth for EC2

## SPA entry points

- Screening load/save: `screeningStorage.ts` → `scope1ActivityScreeningClient.ts`
- Activity meta builders: `activityMeta.ts`
- Entry CRUD: `integrations/supabase/ghgEntryClient.ts` (name is historical; JWT uses AWS API)

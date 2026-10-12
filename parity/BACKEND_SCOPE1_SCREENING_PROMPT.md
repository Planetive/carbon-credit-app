# Backend prompt — Scope 1 activity screening on calculator preferences

Copy everything below the line into a **backend** Cursor chat (`carbon-credit-backend`).

---

## Context

SPA activity-based Scope 1 stores Yes/No screening answers in calculator preferences.

- **JWT on (AWS / EC2)** → `GET` / `PUT` `/api/v1/me/calculator-preferences` with `scope1_screening`
- Entry-level granular fields (equipment, site, period, gases) already go in `app.emission_activities.raw.activity_meta` via existing emission-activities CRUD — **no new activity columns needed**

EC2 migration (apply in pgAdmin from SPA repo):

`db/migrations/0013_scope1_activity_screening.sql`

```sql
ALTER TABLE public.emission_calculator_preferences
  ADD COLUMN IF NOT EXISTS scope1_screening JSONB NOT NULL DEFAULT '{}'::jsonb;
```

## Auth

Same as existing calculator-preferences routes. Do not accept `user_id` from body.

## API change

Extend existing preferences responses / PUT body:

```json
{
  "user_id": "uuid",
  "has_lca_data": false,
  "calculation_mode": "manual",
  "initial_questionnaire_completed": true,
  "scope1_screening": {
    "stationary": "applicable_pending",
    "vehicles_mobile": "not_applicable",
    "leaks_releases": "not_assessed",
    "industrial_other": "calculated"
  }
}
```

Allowed values per key: `not_assessed` | `not_applicable` | `applicable_pending` | `calculated`.

Rules:

- On GET: include `scope1_screening` (default `{}` if null)
- On PUT: if `scope1_screening` provided, persist it; if omitted, leave existing value unchanged
- Validate keys/values or accept jsonb and store as-is (SPA validates)

## Do not

- Create a separate `scope1_activity_screening` table (superseded)
- Add `activity_meta` columns on public `scope1_*` tables for JWT path — use `emission_activities.raw`
- Break existing preferences fields

## Smoke test

```bash
TOKEN=...

curl -s -X PUT http://localhost:8000/api/v1/me/calculator-preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "has_lca_data": false,
    "calculation_mode": "manual",
    "initial_questionnaire_completed": true,
    "scope1_screening": {
      "stationary": "applicable_pending",
      "vehicles_mobile": "not_applicable",
      "leaks_releases": "not_assessed",
      "industrial_other": "not_assessed"
    }
  }'
```

Commit locally; do not push unless asked.

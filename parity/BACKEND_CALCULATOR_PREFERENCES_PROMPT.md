# Backend prompt — Calculator preferences

Copy everything below the line into a **backend** Cursor chat (`carbon-credit-backend`).

---

## Context

The SPA dual-reads emission calculator LCA/mode preferences:

- **JWT on** → `GET` / `PUT` `/api/v1/me/calculator-preferences`
- **JWT off** → Supabase table `public.emission_calculator_preferences` (unchanged)

Table is classified **KEEP** in Phase 5. One row per user (`user_id` UNIQUE).

Schema (existing EC2 / Supabase):

```sql
emission_calculator_preferences (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,  -- auth user id
  has_lca_data BOOLEAN DEFAULT NULL,
  calculation_mode TEXT DEFAULT 'manual' CHECK (calculation_mode IN ('lca', 'manual')),
  initial_questionnaire_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
)
```

SPA already calls these endpoints (see `src/api/calculatorPreferences.ts`). Implement them.

## Auth

Bearer JWT required. Resolve current user id the same way as `GET /api/v1/me/profile`.  
Do **not** accept `user_id` from the body — always use the authenticated user.

## Routes

### `GET /api/v1/me/calculator-preferences`

- Select row where `user_id = current_user_id`
- If no row: return **`null`** JSON body with **200** (preferred), or **404** (SPA treats both as “no prefs”)
- Response shape:

```json
{
  "user_id": "uuid",
  "has_lca_data": true,
  "calculation_mode": "lca",
  "initial_questionnaire_completed": true,
  "created_at": "ISO",
  "updated_at": "ISO"
}
```

### `PUT /api/v1/me/calculator-preferences`

Upsert by `user_id`.

Body:

```json
{
  "has_lca_data": true,
  "calculation_mode": "lca",
  "initial_questionnaire_completed": true
}
```

Rules:

- `calculation_mode` required: `"lca"` | `"manual"`
- `has_lca_data` optional boolean or null
- `initial_questionnaire_completed` boolean (default `true` if omitted is fine)
- On insert: set `user_id` from JWT, timestamps `now()`
- On update: bump `updated_at`
- Return the full row (same shape as GET)

SQL sketch:

```sql
INSERT INTO public.emission_calculator_preferences (
  user_id, has_lca_data, calculation_mode, initial_questionnaire_completed
) VALUES (:user_id, :has_lca_data, :calculation_mode, :initial_questionnaire_completed)
ON CONFLICT (user_id) DO UPDATE SET
  has_lca_data = EXCLUDED.has_lca_data,
  calculation_mode = EXCLUDED.calculation_mode,
  initial_questionnaire_completed = EXCLUDED.initial_questionnaire_completed,
  updated_at = now()
RETURNING *;
```

## Placement

Mirror `me/profile` router style (e.g. `fastapi_app/routers/me.py` or a small `calculator_preferences.py` included under `/api/v1/me`).

## Do not

- Change calculation formulas
- Require org context unless already required for `/me/profile`
- Drop or rename the KEEP table
- Accept cross-user reads/writes

## Smoke test

```bash
TOKEN=... # from /auth/login

curl -s http://localhost:8000/api/v1/me/calculator-preferences \
  -H "Authorization: Bearer $TOKEN"

curl -s -X PUT http://localhost:8000/api/v1/me/calculator-preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"has_lca_data":false,"calculation_mode":"manual","initial_questionnaire_completed":true}'
```

Commit locally; do not push unless asked.

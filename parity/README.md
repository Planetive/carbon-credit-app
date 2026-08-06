# Formula parity — SPA vs FastAPI

Goal: frontend math and backend `/api/v1/calc/*` produce the **same numbers**. Never change formulas to force a pass.

## Two layers

| Layer | Command | What it proves |
|---|---|---|
| 1. Frontend fixtures | `npm run parity` | `spaMath.ts` matches `cases.json` (SPA self-check) |
| 2. Live API compare | `npm run parity:api` | Same cases: SPA result == backend `emissions_kg` |

Layer 2 needs a running API (local uvicorn or Railway) and a JWT.

```powershell
# Terminal A — backend (carbon-credit-backend) with working DATABASE_URL
uvicorn fastapi_app.main:app --reload --port 8000

# Terminal B — this repo
$env:PARITY_BACKEND_URL="http://127.0.0.1:8000"
$env:PARITY_EMAIL="you@example.com"
$env:PARITY_PASSWORD="yourpass"
npm run parity:api
```

Or: `$env:PARITY_TOKEN="eyJ..."`

## Files

- `cases.json` — explicit-factor inputs (no sheet lookup; works offline)
- `spaMath.ts` — mirrors browser calculator rules
- `parity.test.ts` — Vitest layer 1
- `compareApi.ts` — layer 2 SPA ↔ API
- `runFrontendResults.mjs` — dump SPA results to `frontend_results.json`
- `BACKEND_BLIND_PROMPT.md` — paste into backend Cursor (inputs only, no answers)

## Blind deep compare workflow

1. Frontend: `node parity/runFrontendResults.mjs` → keep `frontend_results.json` here (do not share with backend agent).
2. Backend: paste `BACKEND_BLIND_PROMPT.md` into a backend-only chat; get their JSON results.
3. Bring backend JSON back here for 1:1 comparison.
# Backend: Admin ESG + Asset Monitoring deploy notes

Copy into the **backend** chat / Railway env if needed.

## New env (Railway)

Set **one** of:

- `ADMIN_API_KEY=<same value as SPA VITE_ADMIN_PASSWORD or VITE_ADMIN_API_KEY>`
- or `ADMIN_PASSWORD=<same value>`

SPA sends that value as header `X-Admin-Key` when `VITE_USE_JWT_AUTH=true`.

## New routes (already in `fastapi_app/routers/esg.py`)

- `GET /api/v1/esg/admin/assessments?assessment_type=issb_readiness_v1`
- `GET /api/v1/esg/admin/assessments/{id}`

Auth: `X-Admin-Key` only (no JWT). Cross-user list with profile + score join.

## Asset Monitoring (MRV)

No new routes. Uses existing user-scoped:

- `GET /api/v1/esg/assessments/latest?assessment_type=mrv_needs_v1`
- `POST /api/v1/esg/assessments`
- `PATCH /api/v1/esg/assessments/{id}`

Redeploy FastAPI after pulling these changes.

# Backend prompt — Admin ESG + Asset Monitoring (MRV)

Copy everything below the line into a **backend** Cursor chat (`carbon-credit-backend`).

---

## Context

The SPA now dual-reads ESG for:

1. **Admin dashboard / scoring** — cross-user list + detail (password admin panel, not JWT user)
2. **Asset Monitoring MRV questionnaire** — user-scoped CRUD on `esg_assessments` with `assessment_type=mrv_needs_v1`
3. **ESG Results screen** — `GET /assessments/latest?status=submitted` (already wired on SPA)

Implement or verify the backend pieces below. Match existing `fastapi_app/routers/esg.py` patterns (raw SQL, org-scoped user routes, JSONB for `readiness_answers`).

## 1. Platform admin auth

Add `require_platform_admin` in `fastapi_app/routers/deps.py`:

- Read header `X-Admin-Key`
- Compare with `os.environ["ADMIN_API_KEY"]` or fallback `ADMIN_PASSWORD` using `secrets.compare_digest`
- Missing/wrong key → `401 Invalid or missing admin key`
- **Do not** require JWT on admin routes

Railway env (required for admin SPA):

```
ADMIN_API_KEY=<same secret as SPA VITE_ADMIN_PASSWORD>
```

## 2. Optional query param on existing route (Results screen)

`GET /api/v1/esg/assessments/latest`

Add optional query param:

- `status` (alias ok): `draft` | `submitted`
- When set, filter `WHERE status = :status` before `ORDER BY updated_at DESC LIMIT 1`
- Invalid status → `422`

Example:

```
GET /api/v1/esg/assessments/latest?assessment_type=issb_readiness_v1&status=submitted
```

JWT + org context required (existing `require_org_context`).

## 3. New admin routes (cross-user)

Prefix: `/api/v1/esg/admin/...`  
Auth: `X-Admin-Key` only (`Depends(require_platform_admin)`), **no JWT**

### `GET /api/v1/esg/admin/assessments`

Query params:

- `assessment_type` (default `issb_readiness_v1`)
- `limit` (default 200, max 1000)

SQL: join `esg_assessments a`  
LEFT JOIN `profiles p ON p.user_id = a.user_id`  
LEFT JOIN `esg_scores s ON s.assessment_id = a.id`  
WHERE `a.assessment_type = :assessment_type`  
ORDER BY `a.created_at DESC`  
LIMIT `:limit`

Return JSON array items:

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "status": "draft|submitted",
  "total_completion": 0,
  "assessment_type": "issb_readiness_v1",
  "created_at": "ISO",
  "submitted_at": "ISO|null",
  "updated_at": "ISO|null",
  "user_display_name": "string|null",
  "organization_name": "string|null",
  "scored_at": "ISO|null",
  "has_score": true
}
```

### `GET /api/v1/esg/admin/assessments/{assessment_id}`

Single assessment + profile + optional score.

Return:

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "status": "submitted",
  "assessment_type": "issb_readiness_v1",
  "readiness_answers": {},
  "total_completion": 100,
  "readiness_version": 1,
  "submitted_at": "ISO",
  "created_at": "ISO",
  "updated_at": "ISO",
  "organization_id": "uuid|null",
  "user_display_name": "string|null",
  "organization_name": "string|null",
  "score": {
    "id": "uuid",
    "user_id": "uuid",
    "assessment_id": "uuid",
    "readiness_overall_score": 72.5,
    "readiness_maturity_band": "Developing",
    "readiness_completion_pct": 100,
    "readiness_results": {},
    "scored_by": "Automated System",
    "scored_at": "ISO"
  }
}
```

404 if assessment id not found.

## 4. Asset Monitoring (MRV) — no new routes

SPA uses existing user-scoped endpoints with JWT:

| Action | Route |
|--------|-------|
| Load latest MRV draft/submitted | `GET /api/v1/esg/assessments/latest?assessment_type=mrv_needs_v1` |
| Create | `POST /api/v1/esg/assessments` body `{ assessment_type: "mrv_needs_v1", status, readiness_answers, total_completion, readiness_version, submitted_at }` |
| Update | `PATCH /api/v1/esg/assessments/{id}` same body shape |

Verify create/update accept arbitrary JSON in `readiness_answers` (MRV questionnaire keys). Org + user scoping must match existing ESG CRUD.

## 5. Smoke tests (run locally or after deploy)

Replace `BASE`, `ADMIN_KEY`, `JWT`.

```bash
# Admin list (no JWT)
curl -s -H "X-Admin-Key: $ADMIN_KEY" \
  "$BASE/api/v1/esg/admin/assessments?assessment_type=issb_readiness_v1" | head

# Admin detail
curl -s -H "X-Admin-Key: $ADMIN_KEY" \
  "$BASE/api/v1/esg/admin/assessments/<assessment_id>"

# User: latest submitted ISSB
curl -s -H "Authorization: Bearer $JWT" \
  "$BASE/api/v1/esg/assessments/latest?assessment_type=issb_readiness_v1&status=submitted"

# User: MRV latest
curl -s -H "Authorization: Bearer $JWT" \
  "$BASE/api/v1/esg/assessments/latest?assessment_type=mrv_needs_v1"
```

Wrong admin key → 401. Valid admin key → 200 with array/object (may be empty).

## 6. Deliverable

When done, reply with:

1. Files changed
2. Confirmation `ADMIN_API_KEY` env documented
3. Sample JSON from one successful admin list call (redact PII if needed)
4. Any schema assumptions (`profiles.user_id` join, `esg_scores.assessment_id` FK)

Do **not** change SPA code. Backend only.

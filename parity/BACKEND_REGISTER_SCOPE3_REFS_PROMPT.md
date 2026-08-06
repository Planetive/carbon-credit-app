# Backend prompt — Register org + Scope 3 reference lookups

Copy everything below the line into a **backend** Cursor chat (`carbon-credit-backend`).

---

## Context

SPA changes already wired:

1. **Register (JWT)** — after `/auth/signup`, SPA calls `PATCH /api/v1/me/profile` (`user_type`) and `POST /api/v1/organizations` (`is_original: true`), then sets `current_organization_id`.
2. **Scope 3 waste + vehicle types** — load via existing `GET /api/v1/factors/sheets/{code}` (`waste`, `upstream_transportation_and_distribution`).
3. **Suppliers** — SPA calls `GET /api/v1/catalog/suppliers?q=&limit=` (new; KEEP table `public.suppliers`).

Verify/implement the pieces below. Do not change calculation formulas.

---

## A) Register / org (verify only)

Confirm these already work for a freshly signed-up JWT user:

- `PATCH /api/v1/me/profile` accepts `user_type`, `current_organization_id`
- `POST /api/v1/organizations` with `{ "name": "My Organization", "is_original": true }` creates membership + returns org id
- Creating org as the first/original org does not require a prior `current_organization_id`

If signup does not auto-create a profile row, fix that (SPA expects `/auth/me` to work immediately after signup).

---

## B) Factor sheets used by Scope 3 lookups (verify)

Ensure these dataset codes resolve and return rows:

| SPA use | Preferred codes / name hints |
|---------|------------------------------|
| Waste materials | `waste` |
| Upstream vehicle types | `upstream_transportation_and_distribution`, hint `"Upstream Transportation and Distribution"` |

Route: existing `GET /api/v1/factors/sheets/{code}`.

If ETL used different codes, either alias them or document the live codes so SPA `datasetCodes` can be updated.

---

## C) New catalog route — suppliers

`GET /api/v1/catalog/suppliers`

Auth: Bearer JWT (same as other catalog reads).

Query params:

- `q` (optional) — case-insensitive substring match on `supplier_name` (and `code` if present)
- `limit` (default 50, max 500)
- `offset` (default 0)

SQL against **KEEP** table `public.suppliers`:

```sql
SELECT *
FROM public.suppliers
WHERE (:q IS NULL OR :q = ''
       OR supplier_name ILIKE '%' || :q || '%'
       OR COALESCE(code, '') ILIKE '%' || :q || '%')
ORDER BY supplier_name ASC
LIMIT :limit OFFSET :offset;
```

Missing table → log warning + return `[]` (do not 500).

Match response style of other catalog list endpoints (array of row dicts).

### Smoke

```bash
TOKEN=...
curl -s "http://localhost:8000/api/v1/catalog/suppliers?q=acme&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Do not

- Drop KEEP tables
- Require admin key for catalog/suppliers
- Change GHG formulas

Commit locally; do not push unless asked.

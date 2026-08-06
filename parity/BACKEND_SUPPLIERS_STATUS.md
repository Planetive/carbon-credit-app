# Backend — Catalog suppliers

> **Status:** Backend shipped (`GET /api/v1/catalog/suppliers`). SPA already dual-reads via `listSuppliers` + `tryLoadCatalogViaApi("suppliers")` in `src/components/emissions/scope3/suppliers.ts`. No SPA code change required.

---

## Smoke (verified on backend)

```bash
TOKEN=...
curl -s "http://localhost:8000/api/v1/catalog/suppliers?q=acme&limit=20" \
  -H "Authorization: Bearer $TOKEN"
# → 200 []

curl -s "http://localhost:8000/api/v1/catalog/suppliers?limit=5" \
  -H "Authorization: Bearer $TOKEN"
# → 200 with rows (e.g. Abrasive Product Manufacturing)
```

Behavior: JWT, KEEP `public.suppliers`, ILIKE on `supplier_name` / `code`, missing table → `[]`, default `limit=50`, max `500`.

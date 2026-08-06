# Backend bug — emission-activities `legacy_source` query ignored

## Symptom

`GET /api/v1/emission-activities?scope=2&category=electricity&legacy_source=scope2_electricity_main`

returns **main + subanswer** rows. Each row’s `legacy_source` field is correct, but the query filter does not apply on the deployed API.

SPA dashboard then sorts by `created_at` desc and picks a **subanswer** (no `total_kwh`) as the electricity main → Scope 2 shows **0.00**.

## SPA workaround (shipped)

`listLegacyTableEntries` now also filters client-side:

`activity.legacy_source === tableName`

plus electricity total prefers rows with `total_kwh`.

## Backend fix

Confirm `list_activities` actually applies:

```python
if legacy_source:
    q = q.filter(EmissionActivity.legacy_source == legacy_source)
```

on Railway (redeploy if an older build is live). Smoke:

```bash
curl -s --get "$API/api/v1/emission-activities" \
  -H "Authorization: Bearer $TOKEN" \
  --data-urlencode "legacy_source=scope2_electricity_main" \
  --data-urlencode "scope=2" \
  --data-urlencode "category=electricity"
# expect only rows where legacy_source == scope2_electricity_main
```

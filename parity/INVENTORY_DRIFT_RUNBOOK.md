# Eliminate inventory drift (Supabase prod vs JWT/EC2)

## Not a calculation bug

Dashboard Scope 1/2/3 use the **same** SPA math (`loadEpaIpccResults` → sum row `emissions` / result kg → ÷1000 for tCO₂e).

ESG readiness % uses the **same** stored `esg_scores` row (44.1% Developing). Local briefly showed 0% because the SPA discarded scores after migration bumped `updated_at` — that was a display bug, not a rescore.

## Why numbers can still differ

| Surface | Auth | Inventory source |
|---------|------|------------------|
| www.rethinkcarbon.io | Supabase | Live `scope1_*` / `scope2_*` / … tables on **Supabase** |
| localhost JWT | Railway → EC2 | `app.emission_activities` (**Phase 4A backfill snapshot**, Aug 2026) |

Two stores. After the copy, either side can change without the other updating → **drift**. Small kg gaps matter; treat them as sync debt, not formula drift.

## How to remove drift (cutover-safe)

1. **Freeze writes** on one side (prefer: stop new inventory writes on Supabase once JWT testing starts in earnest).
2. **Re-sync KEEP scope tables** on EC2 from the production source of truth (or confirm EC2 `public.scope*` already is that source).
3. **Rebuild activities** from those tables (Phase 4A style): prefer `ON CONFLICT DO UPDATE` / truncate+reload so the snapshot matches KEEP — current `DO NOTHING` will **not** refresh changed rows.
4. **Re-check dashboard** local JWT vs production on the same user until Scope 1/2/3 match to the gram.
5. Only then flip `VITE_USE_JWT_AUTH` on the deployed frontend.

## Already fixed in SPA (not drift)

- ESG 0% → show scores even if `updated_at` > `scored_at`
- Scope 2 0.00 → client-filter `legacy_source` + electricity main/sub join (API currently ignores `legacy_source` query — see `BACKEND_ACTIVITIES_LEGACY_SOURCE_FILTER.md`)

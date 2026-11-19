# SSP Final Release Verification

**Date:** 2026-11-19  
**Scope:** Pre-production verification of Phase 6D reportable Save / Category 15 / portfolio — no redesign.  
**Migrations / deploy / production flags:** **not applied / not enabled** by this task.

---

## 1. Migration 0017

### Is 0017 required for SSP reporting?

**Yes, for safe multi-year holdings.** SSP Save writes `inputs.reporting_year` and upserts by `(org, counterparty, calc_kind, financing_instance_id[, reporting_year])`.

| Schema state | Behavior |
|---|---|
| **0014 only** (no year in unique index) | One row per financing instance. Saving a **different** reporting year would overwrite or conflict (`REPORTING_YEAR_CONFLICT`). Single-year ops can still Save. |
| **0017 applied** | Year-aware unique index `uq_financed_emissions_financing_instance_year`. Same holding, different years are distinct. |

SSP draft migration **0020** does not depend on 0017 (draft tables are separate). 0017 only touches `app.financed_emissions`. No conflict with 0020.

### Confirm 0017 on main PostgreSQL (read-only)

Run in pgAdmin against the **main** DB (read-only). Prefer the committed scripts:

- Preflight (before apply): `carbon-credit-backend/db/sql/0017_reporting_year_preflight.sql`
- Postcheck (after apply): `carbon-credit-backend/db/sql/0017_reporting_year_postcheck.sql`

**Quick status check:**

```sql
-- Is 0017 applied?
SELECT
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'app' AND table_name = 'financed_emissions'
      AND column_name = 'reporting_year'
  ) AS has_reporting_year_column,
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'app' AND tablename = 'financed_emissions'
      AND indexname = 'uq_financed_emissions_financing_instance_year'
  ) AS has_0017_unique_index,
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'app' AND tablename = 'financed_emissions'
      AND indexname = 'uq_financed_emissions_financing_instance'
  ) AS still_has_0014_unique_index,
  EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'app.financed_emissions'::regclass
      AND tgname = 'trg_financed_emissions_sync_reporting_year'
  ) AS has_sync_trigger;

-- Optional registry (if used on this host)
SELECT version, description, applied_at
FROM public.schema_migrations
WHERE version ILIKE '%0017%'
ORDER BY applied_at;
```

**Conflict preflight (must be 0 rows before applying 0017):**

```sql
SELECT
  organization_id,
  COALESCE(counterparty_id, '00000000-0000-0000-0000-000000000000'::uuid) AS counterparty_key,
  calc_kind,
  btrim(inputs->>'financing_instance_id') AS financing_instance_id,
  COALESCE(
    NULLIF(btrim(inputs->>'reporting_year'), ''),
    NULLIF(btrim(inputs->>'reportingYear'), ''),
    ''
  ) AS reporting_year_key,
  count(*) AS row_count
FROM app.financed_emissions
WHERE lower(COALESCE(formula_id, '')) <> 'aggregate'
  AND NULLIF(btrim(inputs->>'financing_instance_id'), '') IS NOT NULL
GROUP BY 1, 2, 3, 4, 5
HAVING count(*) > 1;
```

**0020 non-reportable CHECKs still intact (expected):**

```sql
SELECT c.conrelid::regclass AS table_name, c.conname, pg_get_constraintdef(c.oid)
FROM pg_constraint c
WHERE c.conrelid IN ('app.ssp_holdings'::regclass, 'app.ssp_calculations'::regclass)
  AND c.contype = 'c'
  AND c.conname ILIKE '%reportable%';
-- Expect: is_reportable IS FALSE / include_in_portfolio IS FALSE
```

**This task did not query the main database and did not apply 0017.**

---

## 2. Full browser Save workflow (isolated)

Stack: disposable PG + FastAPI (`--enable-ssp-reportable`) + Vite `--mode ssp-e2e` with `VITE_SSP_REPORTABLE_SAVE_AVAILABLE=true`.

Suite: `e2e/ssp-final-release.spec.ts` → **2 passed** (2026-11-19).

| Step | Result |
|---|---|
| Create / upsert SSP deal | PASS |
| Calculate preview | PASS (holding FE matched algebra) |
| Save reportable (after fingerprint) | PASS |
| Confirmation (`ssp-save-confirmation` + record id) | PASS |
| Repeat Save | PASS — same `reportable_record_id` |
| Recalculate + Save replace | PASS — same id, new total |
| Different holdings separate | PASS — two parents |
| Refresh + recalculate | PASS — total preserved |
| PoP reportable Save | PASS — `SSP_POP_NOT_REPORTABLE` (422) |
| Portfolio / Cat15 source list | PASS — `GET /financed-emissions` parent rows |
| Export source | PASS — same JWT list (authoritative export input) |

Save button remains **disabled until Calculate** returns a fingerprint (intentional).

---

## 3. Reporting reconciliation (persisted records)

| Check | Result |
|---|---|
| Saved FE == Calculate FE | PASS |
| Reporting year + financing_instance_id on parent | PASS |
| Scope breakdown on parent matches calculate scopes | PASS (`test_ssp_final_release`) |
| Dashboard / Cat15 selector total (holding parents only) | PASS — layers not independently included |
| Aggregate + SSP both selected once | PASS (6D + final suites) |
| Non-SSP mortgage row unchanged after SSP Save | PASS (`test_non_ssp_financed_row_unchanged_after_ssp_save`) |
| My Portfolio / Company Overview / Cat 15 UI | Consume JWT `financed-emissions` + `selectFinancedGroup` (SSP special parents). API reconciliation covers the same data path. |

---

## 4. Save integrity and security

| Check | Result |
|---|---|
| Flag default off | PASS |
| Stale fingerprint rejected (409) | PASS |
| Org isolation (other org sees empty list) | PASS |
| Generic `/financed-emissions` rejects SSP formula | PASS (6D) |
| Draft `ssp_holdings` / `ssp_calculations` stay non-reportable after Save | PASS (CHECK + tests) |
| Failed Save (PoP / flag off) leaves no parent row | PASS |
| Concurrent Save → single parent | PASS (isolated PG, 4 workers) |
| 0017 year index present on isolated UAT DB | PASS |

### Fixes applied during verification

1. **FE flag for isolated UAT only:** `SSP_REPORTABLE_SAVE_AVAILABLE` now reads `VITE_SSP_REPORTABLE_SAVE_AVAILABLE` (default false). `.env.ssp-e2e` sets it only when stack uses `--enable-ssp-reportable`.
2. **E2E Save order:** Save stays disabled until Calculate; tests updated accordingly.
3. **Browser draft reset:** Wizard uses loan-type instance `#1`; browser test re-upserts that holding before Calculate so totals are deterministic after the API suite.

No calculation-engine redesign.

---

## 5. Test summary

| Suite | Result |
|---|---|
| `tests/test_ssp_final_release.py` | **11 passed** |
| `tests/test_ssp_reportable.py` | **14 passed** (prior) |
| `tests/test_ssp_reportable_postgres.py` | **5 passed** (prior) |
| `e2e/ssp-final-release.spec.ts` | **2 passed** |
| FE unit (`sspPhase6d` / `sspPhase6a`) | **passed** — production default flag still false without Vite env |

---

## 6. Backend / frontend deployment changes (when enabling)

### Backend

- Deploy code containing `ssp_reportable.py` and updated `ssp/calculate`.
- Confirm **0017** applied on target DB (or accept single-year-only limitation).
- Confirm **0020** already applied (draft tables).
- Set env only after sign-off: `SSP_REPORTABLE_SAVE_ENABLED=true`
- Do **not** drop 0020 non-reportable CHECKs on `ssp_*`.

### Frontend

- Deploy SPA with reportable Save UI wiring.
- Production build must **omit** `VITE_SSP_REPORTABLE_SAVE_AVAILABLE` or set it `false`.
- To enable after sign-off: set `VITE_SSP_REPORTABLE_SAVE_AVAILABLE=true` in the production frontend env and rebuild.

### Exact feature flags

| Flag | Layer | Production default | Isolated UAT |
|---|---|---|---|
| `SSP_REPORTABLE_SAVE_ENABLED` | Backend env / module | **false** | `true` via `--enable-ssp-reportable` |
| `VITE_SSP_REPORTABLE_SAVE_AVAILABLE` | Frontend Vite env | **unset / false** | `true` in `.env.ssp-e2e` when stack enables reportable |

Both must be on for end users to Save. PoP remains blocked in backend gates regardless of flags.

---

## 7. Production activation checklist

1. Run read-only 0017 status + preflight SQL on main DB; resolve any duplicate groups.
2. Apply 0017 only if missing (manual ops — not this task).
3. Deploy backend + frontend builds that include Phase 6D.
4. Re-run isolated final suite green on the release candidate.
5. Spot-check one org: Save → My Portfolio → Cat 15 → export; confirm no double count vs non-SSP.
6. Explicit product/ops authorization.
7. Enable **backend** `SSP_REPORTABLE_SAVE_ENABLED=true`.
8. Enable **frontend** `VITE_SSP_REPORTABLE_SAVE_AVAILABLE=true` and redeploy SPA.
9. Keep PoP / unsupported methods non-reportable.
10. Monitor first Saves for fingerprint conflicts and org isolation.

---

## 8. Final GO / NO-GO

| Item | Verdict |
|---|---|
| Isolated implementation + verification | **GO** |
| Production reportable Save enablement | **NO-GO** until checklist + 0017 confirmation + authorization |
| PoP / unsupported methods reportable | **NO-GO** (permanent until methodology sign-off) |

**Overall:** SSP reportable Save is verified for release **candidate** enablement. **Do not** auto-enable production reporting, apply migrations, or deploy from this verification task.

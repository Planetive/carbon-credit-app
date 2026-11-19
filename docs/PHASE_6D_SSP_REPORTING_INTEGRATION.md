# Phase 6D — SSP Reportable Save, Category 15 and Portfolio Integration

**Date:** 2026-11-19  
**Scope:** Calculate → Validate → Save → Portfolio → Category 15 → Export for verified SSP holdings.  
**Production enablement:** **gated off** (`SSP_REPORTABLE_SAVE_ENABLED = false` / `SSP_REPORTABLE_SAVE_AVAILABLE = false`).

---

## 1. Existing reporting architecture findings

Authoritative store for portfolio / Category 15 / exports remains **`app.financed_emissions`** (same path as mortgages, CRE, motor, business loans, and UoP parents).

| Concern | Pattern reused |
|---|---|
| Identity | `inputs.financing_instance_id` + org + counterparty + `calc_kind` (+ reporting year via 0017) |
| Upsert | `routers/financed_emissions._persist_financed_row` |
| Reportable parent | Mirror of Phase 5D UoP: one **holding parent** row; draft/underlying tables stay non-reportable |
| Dashboard / Cat 15 | Frontend `selectFinancedGroup` / backend `select_component_rows` — special parents survive aggregates |
| Org isolation | JWT `OrgContext` on `/api/v1/ssp/*` and `/api/v1/financed-emissions` |

SSP draft tables from migration **0020** keep CHECK constraints:

- `ssp_holdings_not_reportable_chk`
- `ssp_calculations_not_reportable_chk`

So reportable totals **never** live in `app.ssp_*`; they are written only to `app.financed_emissions` with `results.reporting_role = "ssp_parent"`.

---

## 2. Implementation details

### Backend

- New module `fastapi_app/ssp_reportable.py`
  - Feature flag `SSP_REPORTABLE_SAVE_ENABLED` (default **false**; env override for isolated UAT)
  - `calculation_fingerprint` / `attach_fingerprint`
  - `assert_reportable_gates` (eligibility)
  - `persist_fields` / `parent_inputs` / `parent_results`
  - `select_component_rows` (SSP + UoP parents with aggregates)
- Extended `POST /api/v1/ssp/calculate`
  - `persist_reportable` + `expected_fingerprint`
  - On success: upsert holding parent via `_persist_financed_row`; draft `is_reportable` remains **false**
  - Response adds `calculation_fingerprint`, `persisted_reportable`, `reportable_record_id`
- Generic `/financed-emissions` create/calculate still **rejects** SSP formula IDs (dedicated path only)
- UoP `select_component_rows` updated to keep SSP parents alongside aggregates

### Frontend

- `reportableGuard.ts`: Save blockers + `canSubmitReportableSspSave` (flag still **false**)
- `SspResultsPanel.tsx`: Calculate / Save share the calculate API; confirmation shows record id when enabled
- `financedEmissionsReporting.ts`: `isSspParentFormulaId` / `isSpecialParentFormulaId` so SSP parents are not dropped when an aggregate exists
- API types extended for fingerprint / persist_reportable

### Isolated harness

- `bootstrap_ssp_reportable_schema` (0020 + financed_emissions identity + 0017)
- `run_ssp_e2e_stack.py --enable-ssp-reportable` sets env flag for disposable UAT only

---

## 3. Files created or modified

**Created**

- `fastapi_app/ssp_reportable.py`
- `tests/test_ssp_reportable.py`
- `tests/test_ssp_reportable_postgres.py`
- `e2e/ssp-phase6d.spec.ts`
- `src/features/finance-emissions/ssp/sspPhase6d.test.ts`
- `docs/PHASE_6D_SSP_REPORTING_INTEGRATION.md`

**Modified**

- `fastapi_app/routers/ssp_calculate.py`
- `fastapi_app/ssp_calc_schemas.py`
- `fastapi_app/ssp_drafts.py` (blocked-detail wording)
- `fastapi_app/uop_reportable.py` (selector)
- `tests/pg_isolated.py`, `tests/test_ssp_drafts.py`
- `scripts/run_ssp_e2e_stack.py`
- `src/api/sspDrafts.ts`
- `src/features/finance-emissions/ssp/reportableGuard.ts`
- `src/features/finance-emissions/ssp/SspResultsPanel.tsx`
- `src/features/finance-emissions/ssp/mapSspPreviewResponse.ts`
- `src/features/finance-emissions/ssp/index.ts`
- `src/utils/financedEmissionsReporting.ts`
- `package.json` (`test:e2e:ssp:6d`)

---

## 4. Database migration requirements

| Item | Decision |
|---|---|
| New migration after 0020 | **Not required** for core Save |
| `app.financed_emissions` | Existing columns + JSON `inputs`/`results` sufficient (same as UoP) |
| Year-aware uniqueness | Relies on prepared **0017** (already in repo; apply on target before multi-year holdings) |
| 0020 CHECKs | **Keep** — draft tables must stay non-reportable |
| Applied to main/prod by this phase | **No** (correct) |

If ops later want a `reporting_role` generated column or index, that would be a separate additive migration after checking the next free number.

---

## 5. Reportable eligibility matrix

| Candidate | Reportable? |
|---|---|
| Verified single-pool lookthrough / reported-pool | **Yes** (when flag on) |
| Verified multi-pool (no PoP) | **Yes** |
| Verified tranche-specific pools | **Yes** |
| Pool-of-pools | **No** — `SSP_POP_NOT_REPORTABLE` |
| Master trust / whole loan | **No** — blocked / unsupported |
| Company option 3c / unsupported hard asset / Figure 5.8-6 | **No** — incomplete/unsupported calc |
| Incomplete allocation / missing EF / incomplete status | **No** |
| Stale fingerprint / missing fingerprint | **No** — 409 |
| Feature flag off | **No** — 403 |

---

## 6. Save and recalculation behavior

| Action | Behavior |
|---|---|
| First Save | Insert parent in `app.financed_emissions` for holding instance + year |
| Repeat Save (unchanged) | Upsert same row — **no duplicate** |
| Edit draft → recalculate → Save | Replaces parent totals/scopes/DQ/fingerprint |
| Invalid recalculation | Save rejected; existing parent unchanged |
| Failed Save (flag off / gate fail) | No financed_emissions row written |
| Distinct holdings | Separate `financing_instance_id` → separate parents (not deduped by pool) |

Reportable boundary = **holding FE only** (IAF × tranche/deal path). Collateral / loan / pool / tranche layers are audit-only in the calculate payload and are not selected into Category 15.

---

## 7. Category 15 reconciliation results

- Parent `results.include_layers_independently = false` and `double_count_guard` document the boundary.
- Selector treats SSP like UoP: kept with a counterparty aggregate; never summed with intermediate SSP layers (those are not in `financed_emissions`).
- Unit proof: aggregate 50 + SSP 1 → dashboard total **51** with both rows selected once.
- Isolated postgres: one parent after repeat Save; draft `ssp_holdings` / `ssp_calculations` remain `is_reportable=false`.

---

## 8. Portfolio and export verification

- Saved rows use `company_type = securitization-structured-products`, `formula_id` `ssp-lookthrough` / `ssp-reported-pool`.
- My Portfolio / Company Overview / Cat 15 import candidates consume `app.financed_emissions` through existing JWT list + `selectFinancedGroup` (now SSP-aware).
- Exports that already read financed emissions pick up SSP parents without a parallel pipeline.
- Preview-only / PoP experimental results are never written as reportable parents.

---

## 9. Unit, integration and browser test results

| Suite | Result (2026-11-19) |
|---|---|
| `tests/test_ssp_reportable.py` | **14 passed** |
| `tests/test_ssp_reportable_postgres.py` | **5 passed** (isolated PG) |
| `tests/test_uop_reportable.py` (selector regression) | **passed** with SSP-aware selector |
| `tests/test_ssp_calc_phase6c1.py` | **passed** |
| `src/.../sspPhase6d.test.ts` | **3 passed** |
| Playwright `e2e/ssp-phase6d.spec.ts` | **2 passed** on isolated stack with `--enable-ssp-reportable` (Save once + no duplicate; SPA Save flag remains off) |

---

## 10. Remaining limitations

- PoP non-reportable until methodology sign-off
- Master trust / whole-loan deferred
- SPA `SSP_REPORTABLE_SAVE_AVAILABLE` remains **false** until product authorization
- No soft-delete / void UI beyond existing financed_emissions status conventions
- Multi-year same holding requires **0017** on the target database

---

## 11. Production deployment checklist

1. Confirm isolated unit + postgres suites green
2. Review whether 0017 is already applied on the target DB
3. Run isolated stack with `--enable-ssp-reportable` and Playwright Save path
4. Reconcile Category 15 / portfolio totals for a sample counterparty (no double count)
5. Explicit ops approval to set `SSP_REPORTABLE_SAVE_ENABLED=true`
6. Flip SPA `SSP_REPORTABLE_SAVE_AVAILABLE` in the same release
7. Do **not** drop 0020 non-reportable CHECKs on draft tables
8. Keep PoP blocked regardless of flag

---

## 12. Final GO / NO-GO recommendation

| Capability | Verdict |
|---|---|
| Preview Calculate (existing) | **GO** |
| Reportable Save implementation (code + isolated tests) | **GO for UAT** |
| Production reportable Save | **NO-GO** until checklist + authorization |
| Category 15 / portfolio inclusion of saved parents | **GO once flag on** |
| PoP reportable | **NO-GO** |

**Overall:** Phase 6D functionality is implemented and verified in isolation. **Do not** enable production Save automatically.

# Phase 6B — Securitization Database & Draft Persistence

PCAF 2025 Part A §5.8. Draft schema + authenticated persistence only. **Calculate and reportable Save remain disabled.** No `app.financed_emissions` writes. Migration prepared, **not applied**.

## 1. Files changed

### Backend (`carbon-credit-backend`)
| File | Role |
|------|------|
| `db/migrations/0020_ssp_structures.sql` | Canonical SSP schema (prepared) |
| `fastapi_app/ssp_models.py` | SQLAlchemy models |
| `fastapi_app/ssp_schemas.py` | Pydantic request/response contracts |
| `fastapi_app/ssp_drafts.py` | Upsert/list/get/patch/delete + shared-deal locks |
| `fastapi_app/routers/ssp_drafts.py` | `/api/v1/ssp/drafts` |
| `fastapi_app/main.py` | Router registration |
| `fastapi_app/routers/financed_emissions.py` | Reject SSP formula_ids |
| `tests/test_ssp_drafts.py` | Memory-session draft tests |

### Frontend (`carbon-credit-app-main`)
| File | Role |
|------|------|
| `db/migrations/0020_ssp_structures.sql` | Pointer only — do not apply |
| `src/api/sspDrafts.ts` | API client |
| `src/features/finance-emissions/ssp/draftPersistence.ts` | Snapshot hydrate / shared fingerprint |
| `src/features/finance-emissions/ssp/useSspDraftPersistence.ts` | Debounced resume/save hook |
| `src/features/finance-emissions/ssp/SspUnderlyingClassFields.tsx` | PCAF-class inputs into `classInputs` |
| `ssp/types.ts`, `state.ts`, `eligibility.ts`, `validation.ts`, `copy.ts`, `reportableGuard.ts`, `SspQuestionnaire.tsx`, `SspHierarchyEditor.tsx`, `index.ts`, `sspPhase6a.test.ts` | Persistence IDs, choose-class routing, soft COA warnings, wire-up |
| `esg/ESGWizard.tsx` | `useSspDraftPersistence` + status bar props |
| `docs/PHASE_6B_SSP_DRAFT_PERSISTENCE.md` | This report |

## 2. Database schema

`app` schema tables (all org-scoped; child org match triggers):

- `ssp_deals` — shared deal, eligibility JSON, reporting year, documentation, `shared_snapshot`, optimistic `updated_at`
- `ssp_holdings` — `financing_instance_id` unique per `(org, counterparty, btrim(id))`; **CHECK** `is_reportable=false`, `include_in_portfolio=false`
- `ssp_collateral` — stable `collateral_id`, `class_inputs` JSONB, scopes/DQ/evidence
- `ssp_loans` + `ssp_loan_collateral` (M:N)
- `ssp_pools` + `ssp_pool_loans`
- `ssp_pool_of_pools` + `ssp_pool_of_pools_members`
- `ssp_tranches` + `ssp_tranche_pools`
- `ssp_calculations` — child provenance; **CHECK** never reportable (reserved for 6C)

## 3. Migration

| Item | Value |
|------|--------|
| Number | **0020_ssp_structures** (after 0019) |
| Location | Backend canonical SQL |
| Apply? | **NO-GO** for production / auto-apply in this phase |
| SPA copy | Pointer file only |

## 4. API contract

Base: `/api/v1/ssp/drafts` (JWT org context)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/` | List (`counterparty_id`, `deal_id`, `financing_instance_id`) |
| PUT | `/` | Upsert by `financing_instance_id` |
| GET | `/by-instance/{financing_instance_id}` | Resume |
| GET | `/{holding_id}` | Get |
| PATCH | `/{holding_id}` | Patch |
| DELETE | `/{holding_id}` | Delete holding; cascade deal if last |

Upsert body highlights: `update_shared`, `expected_deal_updated_at`, `expected_holding_updated_at`, `deal_id`, `draft` (camelCase SspDraft snapshot).

Conflicts (409): `shared_deal_conflict`, `stale_deal`, `stale_holding`.

## 5. Frontend integration

- `SSP_DRAFT_API_AVAILABLE = true`; Calculate/Save still false.
- ESGWizard SSP-only path uses `useSspDraftPersistence` (debounce, resume, shared-deal confirm).
- Hierarchy collects `classInputs` via `SspUnderlyingClassFields` (mortgage/CRE/vehicle/business/corporate/other).
- Soft COA warnings shown; mismatched pool vs loan sums do **not** block Next.

## 6. Methodology issues found / fixed

| Issue | Resolution |
|-------|------------|
| Non-SSP instruments auto-routed to Business Loan | Changed to `choose-class` — return to loan-type selection without forcing a class |
| Pool COA must equal loan COA sum | Soft warning only; unrelated amounts not required to balance |
| Green bonds ≠ automatic UoP / SSP | Unchanged from 6A Fig 5.8-2 Steps 3a/3b |
| Whole-loan edge cases | Still marked for methodology review before 6C calculate |

## 7. Tests and results

| Suite | Result |
|-------|--------|
| Backend `tests/test_ssp_drafts.py` | **6 passed** (create/reload, multi-holding conflict, org isolation, financed_emissions reject, delete) |
| Frontend `vitest` `src/features/finance-emissions/ssp` | **18 passed** |
| Backend `tests/test_uop_drafts.py` | Regression run after wiring (confirm UoP untouched) |

## 8. GO / NO-GO for applying migration

### **NO-GO for applying 0020 to production**

Conditional GO for code merge / staging review if:

1. Migration 0020 is applied only under explicit human authorization on a non-production ledger.
2. Calculate and reportable Save stay **false**.
3. No SSP rows are UNION’d into dashboards / Category 15 / `app.financed_emissions`.
4. Shared-deal `update_shared` UX is reviewed with banking users.

### Blockers for calculation enablement (Phase 6C+)
Server §5.8 attribution engine, COA-weighted DQ aggregation, reportable Save product sign-off.

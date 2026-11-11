# Phase 6B.3 — SSP End-to-End UI Validation and UX Refinement

**Date:** 2026-11-10  
**Safety:** Calculate / reportable Save remain disabled. Migration 0020 not applied to staging/production.

## 1. Safe local environment

- Backend `.env` still points at EC2 `rethinkcarbon` — **not used** for this phase.
- Disposable Postgres via `tests/pg_isolated.py` / `scripts/ssp_isolated_stack_check.py`:
  - Loopback-only URL
  - Production host markers refused
  - Prepared **0020** applied only inside the disposable DB, then destroyed
- Smoke check result: `OK isolated stack` on `127.0.0.1`

## 2. Browser E2E — executed vs untested

### Blocker (browser E2E not completed)

| Requirement | Status |
|---|---|
| Playwright / Cypress in repo | **Absent** (scaffold only: `e2e/ssp-phase6b3.spec.ts`) |
| Running Vite app + JWT login | **Not available** in session (no browser tabs; no local stack with auth) |
| Safe API for UI | Full FastAPI+auth needs user/org schema beyond SSP bootstrap; production `DATABASE_URL` must not be used |

**Do not treat unit/API tests as browser E2E completion.**

### API / isolated-PG coverage mapped to scenarios

| Scenario | Browser | API / PG (executed) |
|---|---|---|
| A New securitization create → reload → edit | Untested in browser | Covered by PG create/reload/update + multi-class `class_inputs` round-trip |
| B Multiple holdings / shared deal / conflicts | Untested in browser | Covered (`shared_deal_conflict`, `stale_holding`, sibling holdings) |
| C Invalid inputs / soft COA warnings | Untested in browser | Covered (422 unknown links; soft COA warnings in vitest; attribution validation copy) |
| D Org isolation | Untested in browser | Covered (other org lists empty; SSP formula blocked from `financed_emissions`) |

Playwright scaffold skips unless `SSP_E2E_BASE_URL` + credentials target an **isolated** stack.

## 3. UX improvements shipped

- Amount glossary on Structure step (loan vs pool/tranche vs bank investment)
- Plain-language labels/tooltips for attribution value, loan outstanding, bank investment
- Warning banner: “does not block Save or Next”
- Save status: clearer draft vs portfolio wording; conflict sibling/changed-field detail
- Review: human emissions-path labels; technical draft id behind disclosure
- Wizard / results copy updated to Phase **6C** for Calculate
- Banner clarifies drafts can autosave when signed in, without portfolio inclusion
- Loan-type quantity → “Number of investments” for SSP

## 4. Questionnaire integration

Code-level reuse from 6B.2 remains: Mortgage, CRE, Motor, Business/Unlisted, Bond/Listed.  
**Live browser render of each form inside SSP was not executed this phase** (same blocker).  
Standalone calculator parity still passes (see below).

## 5. Persistence / regressions (executed)

- Frontend SSP suites (6A–6B.3): **pass**
- Standalone PCAF parity: **39/39**
- Backend memory + isolated PG SSP: **17/17**
- Isolated stack safety script: **OK**

## 6. Remaining gaps

- Live browser E2E against JWT + disposable full schema
- Wire Playwright into `package.json` once isolated auth stack exists
- FEC still has inline Option 2b production UI (SSP uses extracted component)
- other-hard-asset questionnaire still unavailable
- Methodology flags from 6B.2 unchanged

## 7. GO / NO-GO for Phase 6C **planning**

**Conditional GO** for Phase 6C **planning** (engine design only).  
**NO-GO** for implementing/enabling Calculate, reportable Save, `financed_emissions` writes, Category 15 inclusion, or applying 0020 to staging/production until browser E2E on an isolated stack is completed.

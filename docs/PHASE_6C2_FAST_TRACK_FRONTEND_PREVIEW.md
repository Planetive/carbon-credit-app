# Phase 6C.2 Fast Track — SSP Frontend Calculation Preview

**Date:** 2026-11-11  
**Status:** Complete for fast-track preview — browser E2E verified on isolated stack (Calculate shows backend 1.0 tCO₂e).  
**Safety:** Reportable Save off · Category 15 / `app.financed_emissions` / portfolio inclusion off · no production migrate or deploy.

**Depends on:** Phase 6C.1 backend preview engine (`PHASE_6C1_SSP_BACKEND_PREVIEW_CALCULATION.md`).

---

## 1. Implementation

| Area | Change |
|---|---|
| `src/api/sspDrafts.ts` | `calculateSsp()` → authenticated `POST /api/v1/ssp/calculate` |
| `src/features/finance-emissions/ssp/reportableGuard.ts` | `SSP_CALCULATE_AVAILABLE = true`; reportable Save remains `false` |
| `src/features/finance-emissions/ssp/previewGate.ts` | Frontend blockers: questionnaire complete, single pool, no PoP, supported structure types |
| `src/features/finance-emissions/ssp/mapSspPreviewResponse.ts` | Maps FE, scopes, CAF/LAF/TAF/IAF layers, DQ, provenance; never invents totals |
| `src/features/finance-emissions/ssp/SspResultsPanel.tsx` | Calls backend on Calculate; renders results / incomplete / unsupported |
| `SspQuestionnaire` / `ESGWizard` | Pass `counterpartyId` into calculate request |
| `e2e/ssp-phase6c2.spec.ts` | Isolated browser + live API verification |
| Unit tests | `sspPhase6c2.test.ts` (+ 6A/6B guard expectation updates) |

**Authority:** The UI never computes financed emissions. Button only posts the draft snapshot; displayed figures come from the response mapper.

---

## 2. Supported preview options (first release)

Enabled when questionnaire is complete **and**:

- Exactly **one** pool  
- **No** pool-of-pools  
- Structure type in: `rmbs`, `cmbs`, `auto-abs`, `clo-cdo`, `true-sale-abs`, `untranched`, mortgage/CRE covered bond, `private-abs`, `synthetic`, `warehouse`  
- Emissions path: look-through **or** reported pool (backend exclusivity)  
- Underlying absolute methods already supported by 6C.1 (mortgage/CRE/motor/business/bond reported or energy×EF paths)

**Blocked in UI (clear message) and/or backend:** multi-pool, PoP, `master-trust`, `whole-loan`, incomplete CAF/LAF/factor inputs, missing EF, etc.

---

## 3. Results panel fields

- Total financed emissions (tCO₂e)  
- Scope 1 / 2 / 3 where backend returns them  
- CAF (collateral), LAF (pool), TAF (tranche), IAF (holding)  
- Data-quality score  
- Factor / methodology provenance (`methodology_version`, `pcaf_ref`, path, notes/warnings)  
- Incomplete / unsupported `status` + `message` / `code`

Reportable Save button remains disabled.

---

## 4. Tests run

### Unit (frontend)

```bash
npx vitest run src/features/finance-emissions/ssp
```

### Isolated full-stack browser (executed)

```bash
# Backend repo — disposable Postgres + JWT API
python -u scripts/run_ssp_e2e_stack.py --write-env --serve --api-port 8013

# App
npm run dev:ssp-e2e
npm run test:e2e:ssp:6c2
```

Suite: `e2e/ssp-phase6c2.spec.ts` against live Vite + live FastAPI + disposable PG.

| # | Test | Result |
|---|---|---|
| 1 | Stack isolation refuses production markers | **PASS** |
| 2 | API preview = 1.0 tCO₂e + invalid JWT + unsupported PoP | **PASS** |
| 3 | Browser draft → Calculate shows 1.0 → refresh → recalculate; Save reportable disabled | **PASS** |

**Overall: 3 passed / 0 failed (~1.0m)** on 2026-11-11.

**Golden independent algebra (browser + API):**  
Absolute 10 × CAF 0.4 → loan FE 4; LAF 1; pool 4; TAF 1; IAF 0.25 → **1.0 tCO₂e**.

Backend companion fixes pushed with this track (`find_holding_by_instance` kwargs; `_check_deal_lock(..., siblings=)`).

Backend parity / PG suites from 6C.1–6C.2 remain in `carbon-credit-backend` (`test_ssp_calc_phase6c1.py`, `test_ssp_calc_phase6c2_parity.py`, `test_ssp_calc_phase6c2_postgres.py`) — run there against disposable Postgres only.

---

## 5. Remaining issues

- Multi-pool and pool-of-pools still deferred  
- Reportable Save / Category 15 / portfolio inclusion still intentionally off  
- Migration **0020** still prepared only — not applied to staging/production  
- Preview results are session-panel state (optional `persist_preview` stores non-reportable provenance on `ssp_calculations` when a stored holding exists); UI does not yet rehydrate last preview numbers on open  
- Review wizard step still requires a complete hierarchy before Calculate enables  

---

## 6. Completion check

A user on the **isolated** stack can open a supported single-pool SSP deal, enter/complete required inputs, click **Calculate preview**, and see accurate backend-generated financed emissions (verified at **1.0** for the golden fixture) without writing reportable portfolio rows.

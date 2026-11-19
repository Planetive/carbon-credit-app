# Phase 6C.3A — Final SSP Calculation Verification

**Date:** 2026-11-19  
**Scope:** Verify 6C.3 methods / multi-pool / PoP / tranche-specific — do not redesign.  
**Reportable Save / Category 15 / portfolio:** remain **disabled**.

---

## 1. Method-by-method parity matrix

Suite: `tests/test_ssp_calc_phase6c3a_method_parity.py` (+ retained `test_ssp_calc_phase6c2_parity.py`, `test_ssp_calc_phase6c3.py`, `test_ssp_calc_phase6c1.py`).

Comparison rule: **absolute** emissions only (shared `absolute_*` helpers vs `absolute_emissions_for_collateral`). Standalone financed totals are checked only to prove SSP applies CAF once more for holding FE.

| Method | Status | Notes |
|---|---|---|
| mortgage.reported | **PASS** | Scopes 1/2/3 + unit + DQ |
| mortgage.1a | **PASS** | Energy × EF; DQ=1 |
| mortgage.1b | **PASS** | Energy × avg EF; DQ=2 |
| mortgage.2a | **PASS** | Labels × area × EF; DQ=3 |
| mortgage.2b | **PASS** | Stats × area × EF; DQ=4 |
| mortgage.3 | **PASS** | Stats × buildings × EF; DQ=5 |
| cre.1a / 1b / 2a / 2b / 3 | **PASS** | Same absolute engine; `commercial-real-estate` |
| motor.1a (fuel) | **PASS** | Fuel × EF; DQ=1 |
| motor.1b / 2a / 2b / 3a / 3b | **PASS** | Distance × efficiency × EF |
| business.1a / 1b / 2a / 2b / 3a | **PASS** | Shared company absolute |
| corporate_bond.1a / 1b / 2a / 2b / 3a | **PASS** | Same absolute; CAF uses EVIC later |
| company.3c | **UNSUPPORTED** | Embeds outstanding attribution — blocked |
| other-hard-asset (no S1/S2) | **UNSUPPORTED** | No generic EF path |
| Figure 5.8-6 amortization fallback | **UNSUPPORTED** | Unverified — disabled |

**Correction applied:** `productionEmissionFactor` camelCase alias mapped in `normalize_finance_input_aliases` so company option 2b reaches SSP absolute parity.

**CAF double-application:** pipeline test confirms loan FE = absolute × CAF once; holding FE = loan/pool path × TAF × IAF ≠ standalone financed total after IAF.

Local result (2026-11-19): **88 collected/passed** in 6C.3A parity file; combined SSP calc suites (`6c1` + `6c2_parity` + `6c3` + `6c3a`) **113 passed**.

---

## 2. Real multi-pool browser test results

Isolated stack: disposable PostgreSQL + FastAPI (`run_ssp_e2e_stack.py --write-env --serve --api-port 8011`) + Vite `--mode ssp-e2e --port 8080` + Playwright `e2e/ssp-phase6c3a.spec.ts`.

**Re-run 2026-11-19:** **4 passed** (API ×2 + browser ×2) in 1.2m.

Independent expectations (reported absolute 10, CAF 0.4 → loan FE 4):

| Step | Expectation | Result |
|---|---|---|
| Two pools; loan split 25 / 15 | Pool FE 2.5 / 1.5; Σ 4 | **PASS** (API) |
| Two tranches COA 30 / 10 | TAF 0.75 / 0.25; FE 3 / 1 | **PASS** (API) |
| Holding 15 on senior | IAF 0.5 → **1.5** tCO₂e | **PASS** (API + browser) |
| Save draft + reload | Two pools persisted | **PASS** |
| Calculate + refresh + recalculate | Still 1.5 | **PASS** |
| Overallocation 30+20 | `laf_sum_exceeds_loan` | **PASS** (unit suite) |
| Save reportable | Disabled (`ssp-save-reportable` disabled) | **PASS** |

---

## 3. Tranche-specific pool test results

| Case | Expectation | Result |
|---|---|---|
| API: p1→t1 only (FE 4), p2→t2 only (FE 5) | No cross-attribution; holdings 1.0 / 2.0 | **PASS** |
| Browser: Calculate on tranche-specific draft | Primary holding shows 1.0; layers show both pools/tranches; Save off | **PASS** |

---

## 4. PoP methodology conclusion

**Source:** PCAF Part A Third Edition (2025), Table 5.8-3, page 124 — text extracted with `pypdf` from the official PDF (not OCR-only).

**Verified equation:**

\[
FE_{PoP} = \sum_{i=1}^{n} \left( \frac{\text{Pool COA (Nominal) in PoPDeal}_i}{\text{PoP COA (Nominal)}_{Deal}} \times FE_{pool,i} \right)
\]

| Question | Conclusion |
|---|---|
| Composition weight vs ownership share? | **Composition weight** with **PoP deal COA** as denominator (printed table). Ownership share (`pool_in_PoP / pool_total`) is **not** what Table 5.8-3 prints. |
| Full inclusion (amounts = pool COAs, PoP COA = Σ amounts)? | Weights sum to 1 → **COA-weighted blend** of pool FEs, **not** Σ FE_pool. |
| Partial inclusion? | Weight &lt; 1 for that member; engine warns when Σ weights ≠ 1. |
| Conservation identity | `Σ FE_tranche = FE_deal = FE_PoP` uses the **blend**, which matches the printed Deal row. |

**Labeling:** Equation transcription is verified. PoP remains **experimental / non-reportable** for Category 15 because the blend-vs-sum absolute conservation implication still warrants methodology-owner sign-off before reportable Save. Engine sets `is_methodology_verified: false` and emits an experimental warning; UI labels the PoP layer as experimental.

---

## 5. Remaining failures / unsupported paths

| Item | Status |
|---|---|
| Company option 3c | Unsupported (intentional) |
| Other hard asset without reported scopes | Unsupported |
| Figure 5.8-6 intensity/amortization fallbacks | Disabled |
| PoP reportable / methodology-final | Blocked (experimental preview only) |
| Master trust / whole loan structures | Deferred |
| New migration 0021 | **Not required** (`0020` sufficient) |

No open parity FAILs for supported options in the 6C.3A matrix.

---

## 6. Regression and safety

| Check | Result |
|---|---|
| Single-pool Calculate regression | **PASS** (6C.1 / 6C.2 / unit) |
| Standalone absolute helpers unchanged for supported options | **PASS** (parity uses same helpers) |
| Org isolation (JWT drafts / calculate auth) | **PASS** (stack smoke + prior 6C.2) |
| Reportable Save disabled | **PASS** (`SSP_REPORTABLE_SAVE_AVAILABLE = false`; FE Save button disabled; API forces `is_reportable=False` / `include_in_portfolio=False`) |
| No SSP → Category 15 / portfolio / `app.financed_emissions` | **PASS** (preview flags false) |
| Migrations applied to main/prod | **Not done** (correct) |

Harness note: isolated PG `initdb` timeout raised to 180s in `tests/pg_isolated.py` after a Windows timeout at 60s blocked stack bring-up.

---

## 7. GO / NO-GO — reportable Save & portfolio integration

| Capability | Verdict |
|---|---|
| Preview Calculate — single-pool | **GO** |
| Preview Calculate — multi-pool / tranche-specific | **GO** |
| Preview Calculate — PoP (equation-faithful, experimental label) | **GO (preview only)** |
| Reportable Save | **NO-GO** |
| Category 15 / portfolio inclusion | **NO-GO** |
| PoP as methodology-verified reportable | **NO-GO** until owners confirm blend intent |

**Overall:** Verification complete for preview paths. **Do not** enable reportable Save or portfolio integration yet.

---

## Files touched this phase

- `tests/test_ssp_calc_phase6c3a_method_parity.py` (new)
- `fastapi_app/shared_formula_utils.py` (productionEmissionFactor alias)
- `fastapi_app/ssp_calc_engine.py` (PoP experimental provenance)
- `e2e/ssp-phase6c3a.spec.ts` (new)
- `src/.../SspResultsPanel.tsx` (experimental PoP label)
- `scripts/run_ssp_e2e_stack.py` (smoke drafts assertion tolerance)
- `tests/pg_isolated.py` (initdb timeout 60→180 for Windows e2e)
- `docs/PHASE_6C3A_SSP_FINAL_VERIFICATION.md` (this file)

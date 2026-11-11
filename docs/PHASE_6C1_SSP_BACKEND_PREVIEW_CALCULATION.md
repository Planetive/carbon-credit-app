# Phase 6C.1 — SSP Backend Preview Calculation Engine

**Date:** 2026-11-11  
**Status:** Backend preview engine implemented and independently fixture-verified for single-pool first-release paths.  
**Safety:** Frontend Calculate remains off · reportable Save off · no `app.financed_emissions` / Category 15 writes · migration 0020 amended but **not** applied to staging/production · UoP 0019 untouched · no deploy.

**Sources:** `PHASE_6C0_SSP_CALCULATION_DESIGN.md`, `PHASE_6C0B_SSP_METHODOLOGY_CORRECTIONS.md`, PCAF 2025 Part A §5.8 Tables 5.8-2 / 5.8-3.

---

## 1. Files created and modified

### Created (backend)

| File | Role |
|---|---|
| `fastapi_app/ssp_underlying.py` | Absolute underlying emissions (no CAF/attribution) |
| `fastapi_app/ssp_calc.py` | CAF → LAF → pool → TAF → IAF pipeline + gates |
| `fastapi_app/ssp_calc_schemas.py` | Request/response models for preview API |
| `fastapi_app/routers/ssp_calculate.py` | `POST /api/v1/ssp/calculate` |
| `tests/test_ssp_calc_phase6c1.py` | Independent golden fixtures |

### Modified (backend)

| File | Change |
|---|---|
| `fastapi_app/main.py` | Mount `ssp_calculate` router |
| `fastapi_app/ssp_models.py` | `amount_in_pool`, `amount_in_pop`, `is_virtual_overcollateralization` |
| `fastapi_app/ssp_drafts.py` | Parse/persist/render `loanAllocations` / `amountInPool` |
| `db/migrations/0020_ssp_structures.sql` | Same additive columns (prepared only; safe to amend — not deployed to persistent envs) |

### Frontend / docs

| File | Change |
|---|---|
| `docs/PHASE_6C1_SSP_BACKEND_PREVIEW_CALCULATION.md` | This report |
| `src/features/finance-emissions/ssp/reportableGuard.ts` | **Unchanged** — `SSP_CALCULATE_AVAILABLE = false` |

---

## 2. Calculation services implemented

| # | Concern | Module / function |
|---|---|---|
| 1 | Eligibility / supported-structure validation | `ssp_calc.calculate_ssp_draft` gates (`SUPPORTED_*` / `BLOCKED_*`) |
| 2 | Org-scoped draft loading | `ssp_calculate.calculate_ssp` → `find_holding_by_instance` / `get_org_*` / `_compose_draft` |
| 3 | SSP hierarchy validation | Single-pool requirement, loan↔collateral links, duplicate pool-loan links |
| 4 | Underlying absolute emissions | `ssp_underlying.absolute_emissions_for_collateral` |
| 5 | CAF | `ssp_calc.compute_caf` |
| 6 | LAF | `ssp_calc.resolve_laf` |
| 7 | Pool FE aggregation | Look-through Σ `LAF × FE_loan`; reported-pool exclusive path |
| 8 | TAF | Tranche COA / Σ deal tranche COA; conservation check |
| 9 | IAF | Investment COA / tranche COA |
| 10 | Data-quality aggregation | COA-weighted only (`_coa_weighted`); no equal-weight fallback |
| 11 | Provenance / errors | Layer results + `status`/`code`/`message`/`error_details`; optional non-reportable `ssp_calculations` row |

**Attribution discipline:** underlying returns absolute tCO2e only; CAF/LAF/TAF/IAF applied once in `ssp_calc`. Never reuse standalone financed-emissions totals as if they were absolute.

---

## 3. Formula-to-code mapping

| PCAF / 6C.0B formula | Code |
|---|---|
| `CAF = min(1, COA/AVO)` (+ OOA/AVO, COA/UAV, OOA/UAV priority) | `compute_caf` — RE/motor pairs |
| `CAF = min(1, COA/(Equity+Debt))` | `compute_caf` — business/unlisted |
| `CAF = min(1, COA/EVIC)` | `compute_caf` — corp bond/listed |
| `FE_loan = Σ E_collateral,i × CAF_i` | Look-through loan loop in `calculate_ssp_draft` |
| `LAF = amount_in_pool / loan_COA` | `resolve_laf` (full allocation inferred only for exclusive single-pool membership) |
| `FE_pool = Σ LAF_i × FE_loan,i` | Pool aggregation block |
| Reported path: `FE_inv = Σ IAF × TAF × Reported` | `emissions_path == "reported_pool"` (no CAF/LAF/underlying) |
| `TAF = tranche_COA / deal_COA` | Tranche loop; `deal_coa = Σ usable tranche COA` |
| `Σ FE_tranche = FE_pool` | `taf_conservation_failed` if violated |
| `IAF = investment_COA / tranche_COA` | Holding loop |
| Untranched → synthetic `TAF = 1` | `__untranched__` synthetic tranche |
| PoP weight (Table 5.8-3) | **Not executed** — returns `unsupported_pool_of_pools` |

Numeric expectations in tests are **independent fixture algebra**, not claimed PCAF worked-figure parity.

---

## 4. Supported versus blocked paths

### Supported (preview)

- Single-pool look-through  
- Multiple collateral assets per loan  
- Multiple loans per pool  
- Partial loan allocations when `amountInPool` (or exclusive full membership) is known  
- Multiple tranches sharing one pool (TAF conservation)  
- Untranched structures  
- Multiple bank holdings  
- Reported-pool emissions, mutually exclusive with look-through  
- Mixed mapped classes when absolute methods exist: mortgage, CRE, motor, business/unlisted, corp bond/listed (reported scopes and/or energy×EF / company absolute inputs)

Structure types enabled when otherwise valid: `rmbs`, `cmbs`, `auto-abs`, `clo-cdo`, `true-sale-abs`, `untranched`, mortgage/CRE covered bond, `private-abs`, `synthetic`, `warehouse`.

### Blocked / incomplete (structured reason, no silent substitute)

| Case | Code / behaviour |
|---|---|
| Multi-pool / pool-of-pools | `unsupported_pool_of_pools` / `single_pool_required` |
| `master-trust`, `whole-loan` | `unsupported_structure` |
| Other hard asset without asset-level S1/S2 | `unsupported_other_hard_asset` |
| Missing CAF inputs / zero denom / missing COA | `incomplete` / `error` (`zero_denominator`, `missing_caf_inputs`, …) |
| Missing emission factor (property/motor) | `incomplete` (`missing_property_energy_factor` / `missing_motor_factor_inputs`) |
| Duplicate loan↔pool links | `duplicate_relationship` |
| Fig 5.8-6 amortization / intensity fallbacks | Not implemented |
| IO/PO strips, Re-REMIC, complex master-trust re-lever | Not implemented |

Eligibility questionnaire may list structures that remain calculation-blocked until methodology is confirmed.

---

## 5. Schema changes

Migration **0020** is prepared-only and was **amended in place** (not applied to staging/production):

| Column | Table | Purpose |
|---|---|---|
| `amount_in_pool` | `app.ssp_pool_loans` | LAF numerator |
| `amount_in_pop` | `app.ssp_pool_of_pools_members` | Reserved for deferred PoP |
| `is_virtual_overcollateralization` | `app.ssp_tranches` | OC virtual tranche flag |

Draft contract mirrors: `pools[].loanAllocations[{ loanId, amountInPool }]`.

Preview persistence (optional `persist_preview`): writes **non-reportable** `app.ssp_calculations` only (`is_reportable` / `include_in_portfolio` CHECK-forced false). Layer detail and `caf_basis` live in JSON `results` / `provenance` for 6C.1 (no extra reportable tables).

**Not applied:** staging/production migrate · UoP `0019` unchanged.

---

## 6. Golden-test results

```
pytest tests/test_ssp_calc_phase6c1.py -q
→ 9 passed
```

Coverage exercised:

| Focus | Result |
|---|---|
| CAF cap + denom selection (RE / business / bond) | Pass |
| Single-pool look-through pipeline (CAF→LAF→TAF→IAF) | Pass |
| Multi-collateral + partial LAF | Pass |
| Multi-loan pool aggregation | Pass |
| Multi-tranche conservation + multi-holding IAF | Pass |
| Untranched + reported-pool exclusivity | Pass |
| Zero denom / missing COA / PoP / multi-pool block | Pass |
| Missing EF / duplicate relationship / master-trust / other-hard | Pass |
| Preview API `is_reportable=false`, no portfolio | Pass |

---

## 7. Standalone calculator / SSP regressions

| Suite | Result |
|---|---|
| `pytest tests/test_ssp_calc_phase6c1.py` | **9 passed** |
| `pytest tests/test_ssp_drafts.py` (+ PCAF property/motor/golden/3a) | **71 passed** (earlier full batch) |
| `test_financed_emissions_rejects_ssp_formula` / `test_org_isolation` | Included in drafts suite — SSP formula IDs still rejected from financed-emissions router |
| `npx vitest run src/features/finance-emissions/ssp` | **28 passed** — `SSP_CALCULATE_AVAILABLE === false` |

---

## 8. Remaining methodology issues

1. **PoP conservation (6C.0B Q1):** literal Table 5.8-3 PoP weight vs ownership-share LAF-symmetric form — **blocked multi-pool until confirmed**.  
2. **CAF priority item (2):** PDF “Original outstanding amount (COA)” label vs OOA numerator — code uses OOA for steps 2/4 per 6C.0B lock; confirm with owners.  
3. **Fig 5.8-6:** amortization / intensity fallbacks not coded.  
4. **Intensity fallback UX:** opt-in vs auto — unresolved.  
5. **IO/PO, master-trust re-lever, Re-REMIC:** deferred.  
6. **Factor-library deep reuse:** property/motor absolute paths use draft energy×EF / reported scopes; full shared calculator service wiring for every option code remains incremental (absolute-only contract preserved).  
7. **Official PCAF numerical examples:** not claimed; no Fig 5.8-8/9 parity.

---

## 9. GO / NO-GO for Phase 6C.2

### **CONDITIONAL GO** — integration and verification on isolated stack

**Rationale:** Backend preview pipeline for **single-pool** supported paths produces independently verified fixture results; API is JWT/org-aware for stored drafts; Calculate UI and reportable Save remain hard-off; no Category 15 writes.

**6C.2 may proceed to:**

- Wire SPA preview call behind a still-disabled or feature-flagged Calculate (do not enable for users until 6C.2 verification checklist passes)  
- Isolated full-stack verification of draft → `POST /api/v1/ssp/calculate` → layer results  
- Staleness / conflict UX against draft locks  

**Still NO-GO until later phases:**

- Enabling `SSP_CALCULATE_AVAILABLE` for production users  
- Reportable Save / `app.financed_emissions` / portfolio / Category 15  
- Multi-pool PoP production behaviour  
- Staging/production migration apply without explicit authorization  
- Claiming PCAF worked-figure numerical parity  

### Phase 6C.1 complete?

**Yes, for the scoped backend preview engine** — supported single-pool calculations match independent fixture algebra; unsupported paths return structured failures; safety gates hold. Remaining open methodology items are documented and do not silently substitute formulas.

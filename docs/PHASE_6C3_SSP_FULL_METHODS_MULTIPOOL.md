    # Phase 6C.3 — SSP Full Methods, Multi-Pool, Pool-of-Pools

    **Status:** Preview Calculate enabled for verified multi-pool and literal Table 5.8-3 PoP paths.  
    **Reportable Save / Category 15 / `app.financed_emissions` writes:** still **disabled**.  
    **Main DB migrations:** do **not** apply anything new automatically. Migration `0020` already covers required columns; **no `0021` required**.

    ---

    ## 1. Underlying methods audited

    | Asset class | PCAF options (standalone) | Required inputs (summary) | Absolute function | DQ | SSP support | Notes |
    |---|---|---|---|---|---|---|
    | Mortgage | 1a, 1b, 2a, 2b, 3 | Energy×EF / labels / stats / buildings | `absolute_building_emissions_tco2e` | 1–5 per option | Yes | Multi-property 1a/1b summed before CAF |
    | Commercial RE | 1a, 1b, 2a, 2b, 3 | Same family as mortgage | same | same | Yes | |
    | Motor vehicle loans | 1a, 1b, 2a, 2b, 3a, 3b | Fuel×EF or distance×efficiency×EF | `absolute_motor_fleet_emissions_tco2e` | per option | Yes | |
    | Business loans / unlisted equity | 1a, 1b, 2a, 2b, 3a | Reported / revenue / asset / sector intensity | `absolute_company_emissions_tco2e` | per option | Yes (not 3c) | CAF uses equity+debt |
    | Corporate bonds / listed equity | 1a, 1b, 2a, 2b, 3a | Same company absolute path | same | same | Yes (not 3c) | CAF uses EVIC |
    | Reported scopes on collateral | n/a | Scope 1/2 (+ optional 3), unit | SSP pack → tCO₂e | entered / default 2 | Yes | |
    | Other hard asset | reported only | Asset-level S1/S2 | local pack | 2 | Reported only | No generic factor method |
    | Company option **3c** | outstanding×ATR×intensity | — | blocked | — | **Unsupported** | Embeds attribution; would double-count with CAF/LAF/TAF/IAF |
    | Figure 5.8-6 amortization/intensity fallbacks | — | — | — | — | **Disabled** | Unverified |

    Architecture: underlying questionnaire → shared absolute adapters (`ssp_underlying` → `absolute_emissions`) → SSP CAF → LAF → (optional PoP) → TAF → IAF. Absolute totals never reuse already-attributed financed emissions.

    ---

    ## 2. Methods integrated and parity-tested

    - Reported mortgage / CRE scopes through SSP (6C.1 fixtures; regression retained).
    - Property absolute options via shared `absolute_building_emissions_tco2e` (including multi-property 1a/1b sum).
    - Motor absolute via `absolute_motor_fleet_emissions_tco2e`.
    - Company absolute 1a/1b/2a/2b/3a via `absolute_company_emissions_tco2e`; 3c blocked.
    - Frontend catalogs hide 3c for SSP (`formulasForCollateral`).

    Independent algebra fixtures live in `tests/test_ssp_calc_phase6c1.py`, `tests/test_ssp_calc_phase6c2_parity.py`, and `tests/test_ssp_calc_phase6c3.py`. These are **not** claims of PCAF published worked-example parity unless numbers were independently verified against the PDF.

    ---

    ## 3. Remaining unsupported methods

    | Path | Reason |
    |---|---|
    | Company option 3c | Attribution embedded in option; SSP applies CAF separately |
    | Other hard asset without reported S1/S2 | No approved generic EF path |
    | Master trust / whole loan structures | Deferred structure types |
    | Figure 5.8-6 amortization/intensity fallbacks | Not independently verified |
    | Reportable persistence | Product gate — preview only |

    ---

    ## 4. Multi-pool implementation

    - Soft single-pool restriction removed when the graph validates.
    - `loanAllocations[].amountInPool` drives LAF = amount_in_pool / loan_COA.
    - Exclusive single-pool membership may infer full allocation when amount omitted.
    - Multi-pool membership **requires** explicit amounts; Σ amount_in_pool must not exceed loan COA (`laf_sum_exceeds_loan`).
    - Duplicate loan↔pool links rejected.
    - Each pool returns FE, scopes, LAF rows, DQ, and pool COA estimate.
    - Parallel multi-pool (no PoP): deal FE for TAF = Σ pool FE under a shared capital structure.

    Engine: `fastapi_app/ssp_calc_engine.py` (`validate_cross_pool_laf`, `_compute_pool_lookthrough`, `_compute_pool_reported`).

    ---

    ## 5. Pool-of-pools methodology verification and status

    ### Transcribed Table 5.8-3 (from Phase 6C.0B lock / rendered PDF review)

    Literal composition form used in code:

    \[
    FE_{PoP} = \sum_i \left( \frac{\text{nominal outstanding of pool } i \text{ in PoP}}{\text{PoP deal COA}} \times FE_{\text{pool } i} \right)
    \]

    - Numerator = pool COA **included in** the PoP (`amountInPop`).
    - Denominator = PoP deal COA (`poolOfPools.currentOutstandingAmount`).
    - Absolute emissions remain on underlying assets; PoP weights pool **financed** emissions already after CAF×LAF.
    - Look-through vs reported-pool remain mutually exclusive per emissions path; reported totals ignored on look-through with a warning.

    ### Open methodology note (6C.0B Q1)

    Composition weights that do not sum to 1 produce a COA-weighted **blend**, not an ownership-share sum that conserves Σ FE_pool. Preview implements the **literal table equation**, emits a warning when Σ weights ≠ 1, and records the note in provenance. Methodology owners must still confirm Q1 before calling PoP “methodology-final” for reportable use.

    **Implementation status:** Preview path **enabled** with literal equation + warnings. Not silently replaced by an ownership-share rewrite.

    ---

    ## 6. Tranche-specific pools

    When `poolsLinkedToSpecificTranches=yes`:

    - Each tranche must declare `linkedPoolIds`.
    - Each pool must link to ≥1 tranche.
    - For each pool, TAF uses only the COA of tranches linked to that pool (local deal COA).
    - Conservation checked per pool graph; a pool is not attributed outside its linked tranches.
    - Shared capital structure (`poolsLinked=no`) continues to apply global TAF to Σ pool FE or FE_PoP.

    ---

    ## 7. Files created / modified

    ### Backend
    - `fastapi_app/ssp_calc_engine.py` — **new** multi-pool / PoP / tranche helpers
    - `fastapi_app/ssp_calc.py` — wired 6C.3 engine; removed single-pool / hard PoP block
    - `fastapi_app/ssp_underlying.py`, `absolute_emissions.py` — shared absolute adapters (prior + retained)
    - `tests/test_ssp_calc_phase6c1.py` — expectations updated for multi-pool / PoP gates
    - `tests/test_ssp_calc_phase6c3.py` — **new** multipool / PoP / tranche fixtures

    ### Frontend
    - `previewGate.ts` — PoP allowed when COA + member amounts present
    - `validation.ts` — PoP COA / amountInPop checks
    - `SspHierarchyEditor.tsx` — amount-in-PoP fields
    - `mapSspPreviewResponse.ts` / `SspResultsPanel.tsx` — PoP layer in hierarchy
    - `types.ts`, `sspPhase6c2.test.ts`, `e2e/ssp-phase6c2.spec.ts` — gate / E2E updates

    ### Docs
    - `docs/PHASE_6C3_SSP_FULL_METHODS_MULTIPOOL.md` (this file)

    ---

    ## 8. New migration requirements

    **None.** `0020_ssp_structures.sql` already includes `ssp_pool_of_pools_members.amount_in_pop` and loan allocation storage used by drafts. Do **not** invent `0021` unless a future additive column is required. Do **not** apply migrations to main/production from this phase.

    ---

    ## 9. Independent numerical test results

    | Suite | Result |
    |---|---|
    | `tests/test_ssp_calc_phase6c1.py` + `test_ssp_calc_phase6c3.py` | **17 passed** (2026-11-12 local) |
    | `tests/test_ssp_calc_phase6c2_parity.py` | **8 passed** |
    | FE `sspPhase6c2.test.ts` | **6 passed** (PoP gate unlock + mapping) |

    6C.3 unit coverage includes: two independent pools, shared-loan partial LAF, LAF overallocation reject, tranche-specific graphs, PoP literal full/partial weights, reported multi-pool, single-pool regression.

    ---

    ## 10. Real browser E2E results

    Isolated stack (`run_ssp_e2e_stack.py --serve --write-env`) + Vite `--mode ssp-e2e` + Playwright `e2e/ssp-phase6c2.spec.ts` (2026-11-12):

    | Test | Result |
    |---|---|
    | Stack isolation refuses production markers | PASS |
    | API: golden 1.0 + org isolation + incomplete PoP (`missing_pop_coa`) + multi-pool shared LAF (2.5/1.5 → holding 1.0) + overallocation `laf_sum_exceeds_loan` | PASS |
    | Browser: draft save → Calculate 1.0 → refresh keeps draft → Save reportable blocked | PASS |

    **3/3 passed.** Save reportable remains disabled.

    ---

    ## 11. Remaining limitations

    - Q1 PoP conservation vs ownership-share still open for reportable methodology sign-off.
    - Unverified Figure 5.8-6 paths disabled.
    - Option 3c and other-hard-asset factor paths unsupported.
    - Preview only — no portfolio inclusion, no Category 15, no `financed_emissions` writes.
    - Frontend never invents FE formulas; backend remains authoritative.

    ---

    ## 12. GO / NO-GO for main application

    | Capability | Preview on main app (feature-flagged Calculate) | Reportable / production accounting |
    |---|---|---|
    | Single-pool verified methods | **GO** (already 6C.2) | **NO-GO** |
    | Multi-pool LAF + aggregation | **GO** (pytest + isolated E2E green 2026-11-19) | **NO-GO** |
    | Tranche-specific pools | **GO** (pytest + isolated E2E green 2026-11-19) | **NO-GO** |
    | PoP literal Table 5.8-3 | **GO for preview** with Q1 warning in provenance | **NO-GO** until methodology Q1 closed |
    | Save / Category 15 / portfolio | **NO-GO** | **NO-GO** |

    **Overall phase DoD for preview:** multi-pool and PoP (literal) calculable through existing Calculate UI; underlying absolute methods reuse shared engines; Save remains off. See `PHASE_6C3A_SSP_FINAL_VERIFICATION.md`.

    **Overall for reportable enablement:** **NO-GO** until Q1 confirmed and product authorization to lift Save / Category 15 gates.

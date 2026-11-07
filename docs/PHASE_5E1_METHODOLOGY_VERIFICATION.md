# Phase 5E.1 — Final Methodology Verification

**Date:** 2026-11-07  
**Constraints:** no migrate apply, no deploy, no historical overwrite, reportable Save remains off

## Defects found and corrections

| Defect | Correction |
|---|---|
| Silent 2024→2025 PPP-GDP fallback | UoP sovereign now incomplete unless `allowPppGdpFallback` / confirmation; UI checkbox with source/year evidence |
| Sub-sovereign hard-blocked | Implemented §5.10 territory method with **user-provided** regional GDP + emissions; AF capped at 1; Annex 10.3 PPP factor path supported |
| National GDP usable as regional | Refused when source looks like national catalog; direct regional PPP or nominal×PPP factor only |
| Nested two-level / duplicate / circular coverage thin | Added Phase 5E.1 tests (two levels, multi-asset, circular, duplicate) |
| Migration 0019 audit comments weak | Strengthened comments on evidence/authorization/no auto-subtraction (still prepare-only) |

## Unsupported / incomplete by design

- Corporate-like sub-sovereign → use business-loan / unlisted-equity (§5.10 Table 5.10-2)
- Economic without approved matched currency/price-year intensity → incomplete
- Gallons → incomplete
- Unresolved overlap → not reportable; no auto redistribution
- Migration **0019 not applied**

## Verification results

| Suite | Result |
|---|---|
| `test_uop_phase5e.py` + `test_uop_phase5e1.py` + `test_uop_calculate.py` | **43 passed** |
| Isolated PG (`factor_bind` + `reportable`) | run in this session |
| Frontend UoP vitest | run in this session |

## Formulas confirmed

- Sovereign UoP = standalone `run_sovereign_calculation` (§5.9)
- Nested = look-through; each AF once (§5.7)
- Sub-sovereign = Outstanding / regional PPP-GDP × regional emissions; AF ≤ 1 (§5.10 / Annex 10.3)

## GO / NO-GO

| Item | Recommendation |
|---|---|
| **Preview deployment (Save off)** | **Conditional GO** |
| **Apply migration 0019** | **NO-GO** until human authorization |
| **Enable reportable Save** | **NO-GO** |
| **Production reportable UoP** | **NO-GO** |

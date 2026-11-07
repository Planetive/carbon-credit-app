# Phase 5E — Remaining UoP Calculation Capabilities

**Date:** 2026-11-07  
**Scope:** PCAF 2025 Part A Third Edition §§5.7, 5.9, 5.10 (and annexes as applicable)  
**Constraints honored:** no deploy, migration 0019 not applied, no historical overwrite, reportable Save remains off

---

## 1. Existing sovereign GDP tables and exact fields

| Object | Fields | Notes |
|---|---|---|
| `ref.ppp_adjusted_gdp` (migration `0012_ref_ppp_adjusted_gdp.sql`) | `country_name` (TEXT PK), `gdp_2024` NUMERIC(20,4), `gdp_2025` NUMERIC(20,4) | Prefer 2025; fall back to 2024 when null (`ppp_gdp.PREFERRED_YEAR=2025`) |
| View `public.ppp_adjusted_gdp` | same three columns | Catalog API `/api/v1/catalog/ppp-adjusted-gdp` |
| Units / currency | PPP-adjusted GDP (catalog does not store currency code per row) | Employee-facing UI shows year + `ref.ppp_adjusted_gdp` provenance |
| Territorial emissions | **Not** in the GDP table | Verified/unverified country emissions remain separate inputs (ClimateTrace / inventory); presence of a sovereign calculator ≠ presence of emissions data |

**Formulas already implemented (standalone + reused in UoP):** PCAF §5.9 options `1a`, `1b`, `2a`, `3a`, `3b` via `run_sovereign_calculation` / `*-sovereign-debt`.

---

## 2. Data and calculation services reused

| Capability | Reused service | Not reinvented |
|---|---|---|
| Sovereign inside UoP | `uop_sovereign.calculate_uop_sovereign_asset` → `sovereign_pcaf.run_sovereign_calculation` + `ppp_gdp.load_ppp_gdp` / employee-confirmed catalog value | Second sovereign formula |
| Nested UoP | `uop_nested.calculate_nested_uop_asset` calling `_calculate_one_asset` per child | Collapsed recursive FE formula |
| Motor vehicles | Existing motor PCAF engine via `_motor_option` / `compute_motor_vehicle_pcaf_financed` | New vehicle math |
| Economic | Existing underlying economic options + approved factor library bind; `_economic_basis_incomplete` | EPA/DESNZ electricity/fuel as EEIO |
| Overlap detect | Existing `scan_uop_general_purpose_overlap` | Auto emission subtraction |
| Frontend PPP picker | `useSovereignPppGdp` / `SovereignCountrySelect` | Parallel GDP store |

---

## 3. Implemented formulas and PCAF references

| Path | Treatment | PCAF ref |
|---|---|---|
| Sovereign underlying asset | Outstanding ÷ PPP-adjusted GDP × country emissions (options 1a–3b) | §5.9; §5.7 Table 5.7-1 look-through |
| Nested UoP | Look-through: child object AF once → parent allocation / child capital once → investor AF later; circular/duplicate blocked | §5.7 |
| Motor multi-vehicle | Per-vehicle AF + activity; IDs preserved; gallons rejected | §5.6 engine reused under §5.7 |
| Economic | Revenue / sector share × approved intensity; currency + price year required | Corporate / project options under §5.7 |
| Overlap review | Document evidenced outstanding/allocation split; approve/reject; **no auto redistribution** | §5.7 pp.107–108 |

---

## 4. Remaining missing data sources

- **Regional (sub-sovereign) PPP-adjusted GDP** — not in catalog.
- **Regional territorial emissions** aligned to the same geography and reporting year — not in catalog.
- **Licensed EEIO / sector-intensity library coverage** — production remains fail-closed when no approved library row matches currency/price year/unit.
- **Full ClimateTrace / UNFCCC country emissions catalog for every sovereign option geography** — employees must confirm or enter verified figures; GDP alone is insufficient.
- **Migration `0019_uop_overlap_reviews`** — prepared only; table absent until human-applied.

---

## 5. Unsupported methods and why

| Method | Status | Why |
|---|---|---|
| Sub-sovereign / regional debt (§5.10) | **Unsupported** | No regional GDP or regional territorial emissions; national PPP-GDP and national emissions must not silently substitute |
| Nested UoP without child assets | **Incomplete** | Standard requires look-through; no invented single-number nested formula |
| Gallons as fuel unit | **Incomplete** | Must use litres (or litre-based approved factor) with evidenced conversion |
| Economic path with kWh/litre/gallon factor | **Incomplete** | Not a sector intensity |
| Unresolved overlap as reportable | **Blocked** | §5.7 review required; Save stays off regardless |
| Auto-subtract overlapping GP emissions | **Not implemented** | Would invent adjustment rules |

---

## 6. Files changed

### Backend (`carbon-credit-backend`)

- `fastapi_app/uop_sovereign.py` (new)
- `fastapi_app/uop_nested.py` (new)
- `fastapi_app/uop_overlap_review.py` (new)
- `fastapi_app/routers/uop_overlap_reviews.py` (new)
- `fastapi_app/uop_calc.py`, `uop_underlying.py`, `routers/uop_calculate.py`, `main.py`
- `db/migrations/0019_uop_overlap_reviews.sql` (prepared, not applied)
- `tests/test_uop_phase5e.py`, `tests/test_uop_calculate.py`, `tests/conftest.py` (formula seam)

### Frontend (`carbon-credit-app-main`)

- `src/features/finance-emissions/uop/UopPhase5eFields.tsx` (new)
- `src/features/finance-emissions/uop/OverlapReviewPanel.tsx` (new)
- `src/api/uopOverlapReviews.ts` (new)
- `src/features/finance-emissions/uop/uopPhase5e.test.ts` (new)
- `UopQuestionnaire.tsx`, `UopResultsPanel.tsx`, `validation.ts`, `state.ts`, `types.ts`, `draftPersistence.ts`, `underlyingOptions.ts`, `factorLibrary.ts`
- `db/migrations/0019_uop_overlap_reviews.sql` (copy for review)

---

## 7. Migration requirements

| Migration | Action |
|---|---|
| `0012_ref_ppp_adjusted_gdp` | Already the sovereign GDP source (assume present in environments that run sovereign) |
| `0019_uop_overlap_reviews` | **Prepare only** — creates `app.uop_overlap_reviews`. Do **not** apply until authorized. Overlap detect still works; review persist returns empty/`table missing` until applied |
| Reportable Save flags | Remain `UOP_REPORTABLE_SAVE_ENABLED/AVAILABLE = false` |

---

## 8. Test results

| Suite | Result |
|---|---|
| `tests/test_uop_phase5e.py` + `tests/test_uop_calculate.py` | **37 passed** |
| Isolated PG: `test_uop_factor_bind_postgres.py` + `test_uop_reportable_postgres.py` | **14 passed** |
| Frontend `vitest` `src/features/finance-emissions/uop` | **54 passed** (8 files) |

Covered: sovereign-in-UoP reuse, national GDP rejected as regional, nested look-through, circular nest, multi-vehicle, gallon reject, economic unit guard, overlap enrichment without auto-redistribution, Save off, frontend validation/snapshot round-trip.

---

## 9. Release GO / NO-GO

### **NO-GO for production enablement of reportable UoP Save**

**Conditional GO for preview-only code merge** if reviewers accept:

1. Sub-sovereign remains explicitly unavailable.
2. Migration 0019 is **not** applied in this release.
3. Reportable Save flags stay **false**.
4. Economic paths stay incomplete without approved intensity rows (no unauthorized licensed imports).
5. Overlap reviews document evidenced splits only; unresolved overlap is never treated as reportable.

**Blockers for GO on reportable UoP:** Save flags off by design; 0019 unapplied; regional §5.10 data absent; EEIO library coverage incomplete for many geographies.

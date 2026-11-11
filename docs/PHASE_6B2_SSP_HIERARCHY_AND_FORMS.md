# Phase 6B.2 — SSP Hierarchy Integrity and Underlying Calculator Form Integration

**Status:** Implementation complete in code; migration **0020 still unapplied** to staging/production.  
**Date:** 2026-11-10

## Safety (unchanged)

- `SSP_CALCULATE_AVAILABLE = false`
- `SSP_REPORTABLE_SAVE_AVAILABLE = false`
- No writes to `app.financed_emissions`
- No Category 15 / portfolio inclusion
- **Do not apply** migration 0020 without explicit authorization

## Objective 1 — Hierarchy integrity

### Assessment: amend prepared 0020 (safe)

Migration `0020_ssp_structures.sql` was still prepared-only. Canonical SQL was amended **in place** (no 0021) to add:

- Unique indexes `(id, deal_id)` on collateral, loans, pools, pool_of_pools, tranches
- **Composite FKs** on association tables so members must share `deal_id`:
  - loan ↔ collateral
  - pool ↔ loan
  - tranche ↔ pool
  - pool_of_pools ↔ member pools
- Org-match triggers on association tables + `ssp_pool_of_pools`

API `_validate_hierarchy` now rejects duplicate client ids; association sync raises 422 if a link target is missing from the deal map.

### Tests

PostgreSQL isolated suite extended for valid associations, cross-deal FK rejection, org-mismatch trigger rejection, API unknown association ids, multi-class `class_inputs` round-trip.

## Objective 2 — Underlying questionnaires

Replaced incomplete `SspUnderlyingClassFields` subsets with reusable forms:

| Collateral class | Reused components |
| --- | --- |
| Mortgage | `MortgageForm` + `CommercialRealEstateForm` (energy method paths) |
| CRE | `CommercialRealEstatePropertiesForm` + `CommercialRealEstateForm` |
| Motor vehicle | `MotorVehicleLoanForm` |
| Business / unlisted equity | `CompanyAttributionInputs` + reported scopes / `EnergyEmissionInputs` / `ProductionFactorInputs` / `SectorProxyInputs` |
| Corporate bond / listed equity | Same company stack (listed EVIC path) |

`classInputs` now uses schemaVersion 1 envelope: `methodSelection`, `formData`, `properties`, `commercialProperties`. Legacy flat keys migrate on read.

Outstanding amounts remain on SSP **loan / holding** layers (company attribution form hides outstanding by default).

### Extracted shared forms

- `forms/CompanyAttributionInputs.tsx`
- `forms/CompanyReportedEmissionsInputs.tsx`
- `forms/ProductionFactorInputs.tsx` (ICE Option 2b picker)

**Note:** `FinanceEmissionCalculator` still embeds an equivalent production-factor UI inline. Shared `ProductionFactorInputs` is the SSP source of truth; FEC refactor to import it is recommended follow-up (not required to unblock 6B.2 persistence).

### Missing / uncertain

- **other-hard-asset:** no standalone questionnaire — manual asset value only; method mapping needs review
- Listed equity vs corporate bond SSP mapping flagged for methodology review
- Motor vehicle form retains its existing local vehicle-entry emission helpers (standalone behaviour); SSP still does not run attribution / portfolio calculate

## Objective 3 — Persistence

Frontend vitest: multi-class draft serialize → hydrate → edit → serialize preserves hierarchy ids, nested properties, vehicle rows, units/factor metadata.

Backend PG: multi-class `class_inputs` JSON round-trip + edit.

## Phase 6B.3 readiness

**GO** for Phase 6B.3 planning (API validation polish / UI QA) **only after** isolated PG + frontend suites pass in CI locally.  
**NO-GO** for Calculate engine (6C), reportable Save, and any staging/production migration apply without authorization.

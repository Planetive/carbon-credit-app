# Phase 6B.1 — SSP Persistence Verification

Verification-only review of Phase 6B. **No production migration apply. No deploy. No Calculate / reportable Save enablement.**

## 1. Migration verification

### Sequence (backend canonical)
| Version | Status (codebase / process) |
|---------|-------------------------------|
| 0014–0018 | Prior ledger migrations (assumed present on EC2 where UoP runs) |
| **0019_uop_overlap_reviews** | **Still pending / prepare-only** per Phase 5E docs. Not required by 0020. Hosted Supabase MCP could not confirm live `schema_migrations` (tenant unreachable). |
| **0020_ssp_structures** | Prepared; verified on **isolated** Postgres only |

### 0020 dependencies (hard abort checks in SQL)
1. Schema `app`
2. Table `app.financed_emissions` (existence only — **no ALTER/INSERT**)
3. `gen_random_uuid()`
4. `public.organizations`
5. Soft FKs: `public.counterparties`, `public.exposures`

**Not a dependency:** `app.uop_overlap_reviews` / migration 0019.

### Constraints / indexes / triggers (isolated apply confirmed)
- Unique holding identity: `uq_ssp_holdings_financing_instance`
- Unique client IDs per deal: collateral, loans, pools, tranches, pool-of-pools
- CHECK: holdings + calculations `is_reportable=false`, `include_in_portfolio=false`
- Org-match triggers on: holdings, collateral, loans, pools, tranches, calculations
- **Gap:** association tables (`ssp_loan_collateral`, `ssp_pool_loans`, `ssp_tranche_pools`, `ssp_pool_of_pools_members`) have no org-match triggers (children inherit deal_id; defense-in-depth weaker than UoP asset path)

### Frontend pointer
`carbon-credit-app-main/db/migrations/0020_ssp_structures.sql` is **comments only** — cannot create tables if accidentally applied.

### Ordering / deployment risks
1. Applying 0020 before `organizations` / `financed_emissions` exist → hard abort (safe).
2. Applying SPA pointer → no-op (safe).
3. Naive SQL splitters that ignore quoted `;` previously broke the `schema_migrations` INSERT description — **fixed** in 0020 description + `tests/pg_isolated.py` quote-aware splitter.
4. 0019 remaining unapplied is **OK** for SSP staging; do not couple releases.
5. Production host markers are refused by isolated harness (`18.211.235.71`).

## 2. PostgreSQL integration tests

Harness: disposable portable Postgres via `tests/pg_isolated.py` → `bootstrap_ssp_schema()` → apply **0020 only**.

Command: `python -m pytest tests/test_ssp_drafts_postgres.py -q`

| Test | Result |
|------|--------|
| 0020 additive / no financed_emissions mutation | **PASS** |
| Schema constraints, indexes, triggers, schema_migrations row | **PASS** |
| Create → reload → update → delete | **PASS** |
| Multiple holdings one deal + independent deals | **PASS** |
| Shared deal conflict 409 + stale holding 409 | **PASS** |
| Org isolation + financed_emissions reject / zero rows | **PASS** |
| Cascade deletes children with last holding | **PASS** |

**7 passed** on isolated Postgres.

Also retained: memory-session `tests/test_ssp_drafts.py` (**6 passed** earlier).

Concurrent multi-writer timing beyond optimistic locks was not load-tested; 409 stale/shared paths cover the contract.

## 3. Frontend E2E

| Path | Result |
|------|--------|
| Live browser E2E (select SSP → screen → deal → hierarchy → save → refresh → resume) | **Not executed** — no running app tab / local server session in this verification pass |
| Snapshot serialize → hydrate round-trip (refresh proxy) | **PASS** (`sspPhase6b1.test.ts`) — eligibility, deal, collateral IDs, `classInputs`, loan↔collateral, pool↔loan, tranche, holding amounts survive |
| Phase 6A + 6B.1 vitest | **20 passed** |

Manual checklist still required before staging UX sign-off:
1. Select Securitization quantity ≥1  
2. Complete Fig 5.8-2 screening  
3. Enter deal + documentation  
4. Add ≥2 collateral + loans, pool, tranche, holding  
5. Confirm draft status “saved”  
6. Hard refresh → resume same `financing_instance_id` hierarchy  

## 4. Underlying calculator integration audit

`SspUnderlyingClassFields` vs existing FEC forms:

| Class | Present in SSP fields | Missing vs full existing questionnaire | Reuse recommendation |
|-------|------------------------|----------------------------------------|----------------------|
| Mortgage | Property value, floor area, energy/factor intensities (numeric) | Property **name** multi-row UX; **units** (MWh vs kWh); formula-option gating via `EnergyEmissionInputs`; outstanding lives on loan not always mirrored | Embed `MortgageForm` + `MortgageFinancialForm` + `EnergyEmissionInputs` behind `pcafMethodOption`; map into `classInputs` / loan COA — **no local FE formula** |
| CRE | Property value, # buildings, energy fields | Country/grid factor pickers; principal activity; sqft vs m² paths; option 1a/1b/2a/2b/3 branching in `CommercialRealEstateForm` | Mount CRE forms by option code; store raw inputs in `classInputs` |
| Motor vehicle | Value, outstanding, type/fuel text, fuel/distance/efficiency | Make/model/year sheets; distance scope/class; EPA/DESNZ factor libraries; multi-vehicle rows; progressive Score 1a–5 UX | Reuse `MotorVehicleLoanForm` / financial form; persist vehicle array in `classInputs.vehicles` |
| Business loan / unlisted | Outstanding, equity+debt, scopes, verification | Sector proxy / economic intensity paths; factor library picker; company-type nuances | Reuse FEC sector/EVIC panels + `ApprovedFactorPicker` patterns from UoP where applicable |
| Corporate bond / listed | Outstanding, EVIC, equity+debt fallback, scopes | Share price, shares, minority interest, preferred stock breakdown used to **compute** EVIC | Reuse listed EVIC inputs; keep EVIC as stored denominator (engine computes later) |

**Defect:** SSP does **not** yet mount the real form components — it duplicates a subset of fields. Safe for draft persistence; **insufficient** for Phase 6C look-through without embedding existing questionnaires.

## 5. Safety verification

| Control | Status |
|---------|--------|
| `SSP_CALCULATE_AVAILABLE` | **false** |
| `SSP_REPORTABLE_SAVE_AVAILABLE` | **false** |
| No `/ssp/calculate` router | Confirmed |
| Holdings forced `is_reportable=false` / `include_in_portfolio=false` | Code + DB CHECK + PG test |
| Calculations CHECK never reportable | Schema |
| `POST /financed-emissions` rejects SSP formula_ids | PG test **400**, FE count remains 0 |
| Category 15 / portfolio inclusion | Blocked by CHECK + flags |
| Draft API only | `SSP_DRAFT_API_AVAILABLE=true` |

## 6. Persistence defects found

1. **Association tables lack org-match triggers** — medium; recommend follow-up migration if staging applies 0020.
2. **SQL applicator quote/`';` bug** — fixed in harness + 0020 description (was blocking isolated apply).
3. **Underlying forms not fully reused** — functional gap for 6C, not a draft-API blocker.
4. **Live browser E2E not run** — process gap before UX GO.
5. **Production 0019 apply state unverified via MCP** — confirm on EC2 `schema_migrations` before any dual apply plan.

## 7. Production / staging blockers

- Do **not** apply 0020 to production.
- Confirm EC2 has `app` + `financed_emissions` + `organizations` before any staging apply.
- Keep Calculate/Save off after any staging apply.
- Complete manual browser resume test against staging API + JWT.

## 8. GO / NO-GO

### Applying **0020 to an isolated staging database**: **CONDITIONAL GO**

Allowed if **all** hold:
1. Target is non-production and backups exist.
2. Prerequisites (`app`, `financed_emissions`, `organizations`, counterparties/exposures) verified.
3. Apply **backend** `0020_ssp_structures.sql` only (never SPA pointer).
4. 0019 may remain unapplied.
5. Post-apply smoke: create/reload SSP draft; assert `financed_emissions` unchanged; holdings non-reportable.
6. Calculate / reportable Save remain disabled.

### Production apply: **NO-GO**

### Reportable calculation enablement: **NO-GO** (Phase 6C+)

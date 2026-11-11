# Phase 6A — Securitization & Structured Products Frontend

PCAF 2025 Part A §5.8 (pp. 110–138). Frontend questionnaire and hierarchy only. No local financed-emissions formulas, no backend endpoints, no migrations, no reportable Save, no Category 15 / `app.financed_emissions` writes.

## 1. Files created and modified

### Created
| File | Role |
|------|------|
| `src/features/finance-emissions/ssp/types.ts` | Domain models (deal, collateral, loan, pool, PoP, tranche, holding, draft) |
| `src/features/finance-emissions/ssp/eligibility.ts` | Figure 5.8-2 / Table 5.8-1 progressive screening |
| `src/features/finance-emissions/ssp/state.ts` | Stable IDs, instance map, patch helpers |
| `src/features/finance-emissions/ssp/validation.ts` | Deal / hierarchy / COA consistency checks |
| `src/features/finance-emissions/ssp/reportableGuard.ts` | Calculate + Save permanently off for 6A |
| `src/features/finance-emissions/ssp/wizardSteps.ts` | Screen → Deal → Structure → Review |
| `src/features/finance-emissions/ssp/copy.ts` | Plain-language labels and outcome copy |
| `src/features/finance-emissions/ssp/SspHierarchyEditor.tsx` | Expandable collateral → loan → pool → PoP → tranche → holding UI |
| `src/features/finance-emissions/ssp/SspQuestionnaire.tsx` | Eligibility + deal + structure wiring |
| `src/features/finance-emissions/ssp/SspResultsPanel.tsx` | Preview shell; no fabricated totals |
| `src/features/finance-emissions/ssp/index.ts` | Public exports |
| `src/features/finance-emissions/ssp/sspPhase6a.test.ts` | Vitest suite |
| `docs/PHASE_6A_SECURITIZATION_FRONTEND.md` | This report |

### Modified
| File | Change |
|------|--------|
| `src/features/finance-emissions/config/loanTypeOptions.ts` | `SSP_LOAN_TYPE`, card, `filterQuestionnaireOnlyLoanTypes` |
| `src/features/finance-emissions/esg/ESGWizard.tsx` | SSP instances, steps, validation, leave/reroute, save reject |
| `src/features/finance-emissions/esg/FinanceEmissionCalculator.tsx` | Skip SSP instances; block generic Calculate |

## 2. Wizard flow

1. **Loan type** — select “Securitization & Structured Products” (quantity = independent investments).
2. **ssp-eligibility** — one progressive question at a time (Figure 5.8-2).
3. Outcomes:
   - **Continue as SSP** → Deal → Structure → Review
   - **Reroute** → switch to suggested class (e.g. Use of Proceeds / business loan)
   - **Exclude** → explanation + leave SSP
   - **Needs info** — unfinished answers keep Next blocked
4. **ssp-deal** — name, parties, structure type, year, currency, documentation, tranche/PoP flags.
5. **ssp-structure** — emissions path + hierarchy editor.
6. **ssp-review** — summary + results shell; Calculate / Save disabled.

Company GHG / generic Inputs / Results steps are skipped when SSP is the only selected class (same pattern as UoP-only).

## 3. Supported structure types (frontend labels)

Mapped from eligibility / Table 5.8-1 guidance:

- True-sale ABS, RMBS, CMBS, CLO/CDO, Auto ABS
- Mortgage / CRE covered bonds
- Synthetic / CRT
- Warehouse, master trust, private ABS
- Untranched products
- Eligible whole-loan (flagged; applicability still subject to standard)
- Other in-scope (catch-all when family qualifies)

**Out of scope / exclude in screening:** TBA / classic repo (Table 5.8-4), consumer receivables ABS, public-sector / land-forest covered bonds, other hard-asset ABS without asset-level emissions, unknown collateral pools.

## 4. Frontend fields and source mapping

| UI field | Domain | PCAF source |
|----------|--------|-------------|
| Structure family / collateral family | `eligibility.*` | Fig 5.8-2, Table 5.8-1 |
| GSS collateral / standard bond questions | `eligibility.isGss*` | Fig 5.8-2 Steps 3a–3b |
| Deal name, id, issuer, originator, SPV | `deal.*` | Deal identity |
| Structure type, reporting year, currency, documentation | `deal.*` | Reporting metadata |
| Collateral attribution denominator | `collateral.attributionDenominator` | Table 5.8-2 CAF by class |
| Loan COA | `loans.currentOutstandingAmount` | Table 5.8-3 |
| Pool COA (optional override) | `pools.poolCurrentOutstandingAmount` | Table 5.8-3 |
| Pool-of-pools COA | `poolOfPools.currentOutstandingAmount` | Table 5.8-3 |
| Tranche COA | `tranches.currentOutstandingAmount` | Table 5.8-3 |
| Bank outstanding investment | `holdings.bankOutstandingInvestment` | Table 5.8-3 IAF numerator |
| Look-through vs reported pool | `emissionsPath` | §5.8 permitted paths |
| Reported pool total / period / verification / source | `pools.reported*` | Reported emissions path |
| Scope / DQ / factor ids on collateral | `collateral.*` | Underlying class methods + DQ guidance pp. 126–127 |
| Stable IDs | `*Id`, `financingInstanceId` | Instance integrity |

User-entered values are never silently overwritten to force totals to balance. Mismatched pool COA vs sum of loan COAs surfaces a warning error.

## 5. Additional PCAF rules identified (frontend)

- Follow-the-money look-through is required; unknown pools cannot use §5.8.
- Green-labelled notes alone do not make a deal Use of Proceeds; Secured Green Standard Bond (sale proceeds → originator GSS+ projects) reroutes to UoP (Step 3b).
- Secured Green Collateral Bond still uses SSP look-through (Step 3a).
- Covered bonds / synthetics commonly keep collateral with the originator.
- Untranched structures are allowed; seniority does not change attribution maths.
- Pool-of-pools is optional; tranche-specific pool linking creates separate attribution paths.
- Do not substitute one Table 5.8-3 denominator for another (loan ≠ pool ≠ tranche ≠ deal).
- Do not treat issuer corporate GHG as reported pool emissions without applicability evidence.
- Do not double-count a reported pool total with child look-through for the same pool.
- CAF denominators remain class-specific (Table 5.8-2); no universal denominator.
- COA-weighted data-quality aggregation is deferred to Phase 6B engine (frontend collects per-collateral DQ only).

**Methodology review (not invented):** Exact treatment of ambiguous “whole-loan” edge cases and any Table 5.8-4 instruments beyond TBA/repo when FI policy differs — mark for review against the official PDF before 6B.

## 6. Eligibility routing outcomes

| Outcome | When |
|---------|------|
| `ssp` | Structured product, identifiable in-scope collateral, structure not TBA/repo, GSS path does not force UoP |
| `reroute` → business-loan (generic) | Not a structured product |
| `reroute` → use-of-proceeds | Fig 5.8-2 Step 3b GSS standard bond for originator projects |
| `exclude` | Unknown collateral; TBA/repo; consumer receivables; public-sector CB; other hard assets without asset-level data |
| `needs-info` / incomplete | Unanswered progressive questions (`resolveSspAccounting` returns `null`) |

## 7. Underlying calculator reuse

- Collateral class options map to existing PCAF classes (mortgage, CRE, business loan, corporate bond, motor vehicle, listed/unlisted equity, other hard asset).
- Hierarchy UI collects the inputs those classes need; Phase 6A does **not** invoke FEC formulas or UoP calculators.
- Phase 6B should call existing asset-class engines per collateral row for look-through path B/A, then apply §5.8 attribution layers server-side.

## 8. Tests and results

`npx vitest run src/features/finance-emissions/ssp/sspPhase6a.test.ts`

**18 passed** covering: loan-type card; calculator exclusion; RMBS/CMBS/CLO; covered bond & synthetic; untranched; excludes; UoP reroute; stable IDs; multi loan/collateral/PoP/tranche; pool COA mismatch; reported vs look-through conflict; wizard steps; Calculate/Save blocked; no fabricated results.

## 9. Unsupported in Phase 6A

- Backend calculation engine and API
- Draft persistence API / refresh survival
- Reportable Save / portfolio / Category 15
- Local FE financed-emissions math
- Full embedded Mortgage/CRE/Motor forms inside each collateral card (fields stubbed for class linkage; deep forms reuse planned for 6B UX polish)
- Automatic COA-weighted DQ score
- Issuer-corporate-as-pool-emissions auto-acceptance
- Deployments / migrations

## 10. Phase 6B backend / API / database design (required)

### Tables (sketch)
- `ssp_deals` — deal metadata, structure type, reporting year, documentation, flags
- `ssp_collateral` — per deal/loan, class, denominators, scopes, DQ, factor refs, evidence
- `ssp_loans` — COA, notes, evidence
- `ssp_loan_collateral` — M:N links (multi-collateral loans)
- `ssp_pools` / `ssp_pool_loans`
- `ssp_pool_of_pools` / member pools
- `ssp_tranches` / `ssp_tranche_pools` (optional links)
- `ssp_holdings` — bank investment per tranche/deal, `financing_instance_id`
- `ssp_calculations` — server results, fingerprint, scope breakdown, attribution path JSON
- Do **not** write into `app.financed_emissions` until product policy explicitly enables reportable SSP

### API
- `POST /ssp/drafts` upsert questionnaire by `financing_instance_id`
- `GET /ssp/drafts/{financing_instance_id}`
- `POST /ssp/calculate` — authoritative §5.8 engine; returns preview; `persist_reportable` default false
- Reuse underlying class calculators for look-through; validate Tables 5.8-2/5.8-3 server-side

### Engine rules
- Apply CAF / LAF / (optional PoP) / TAF / IAF in order from Table 5.8-3
- COA-weighted DQ aggregation per §5.8 guidance pp. 126–127
- Reject double-count reported pool + child look-through
- Authority fingerprint + expected timestamps before reportable persist

### Frontend after 6B
- Flip `SSP_CALCULATE_AVAILABLE` / draft API flags only after engine verified
- Keep Save gated until product sign-off

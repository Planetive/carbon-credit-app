# Phase 6C.0 — PCAF SSP Methodology and Calculation Architecture

**Date:** 2026-11-11  
**Status:** Design only — **no Calculate implementation**, no reportable Save, no `app.financed_emissions` writes, no migrations applied, no deploy.

**Design lock:** Corrected by **Phase 6C.0B** (`docs/PHASE_6C0B_SSP_METHODOLOGY_CORRECTIONS.md`). Formula text below is locked to official PDF pp. 121–125 (Tables 5.8-2 / 5.8-3).

**Primary source (authoritative):**  
PCAF (2025). *The Global GHG Accounting and Reporting Standard Part A: Financed Emissions.* Third Edition.  
Section **5.8 Securitization and structured products** (≈ pp. 110–138).  
Official PDF: [PCAF-PartA-2025-V3](https://carbonaccountingfinancials.com/files/standard-launch-2025/PCAF-PartA-2025-V3-15012026.pdf).

**Secondary (repo, non-authoritative):** Phases 6A–6B.4 docs, migration `0020_ssp_structures.sql`, SSP frontend draft contract, existing asset-class calculators / UoP preview pattern.

**Source-integrity note:** Tables 5.8-2 and 5.8-3 were re-extracted with `pypdf` from the official PDF (readable Unicode equations on pp. 121 and 124). Remaining ambiguities are flagged — **no invented PCAF rules**.

---

## 1. PCAF methodology reference matrix

| # | PCAF locus | Supported interpretation | Implementation implication | Ambiguity / gap |
|---|---|---|---|---|
| M1 | §5.8 intro | SSP financed emissions leverage existing Part A methods for mortgages, CRE, business loans, motor vehicles; GSS “Secured Green Standard Bond” may route to Use of Proceeds (§5.7) | Eligibility already mirrors Fig 5.8-2 Steps 3a/3b; Calculate must refuse GSS-standard-bond-as-UoP path (reroute, not SSP FE) | — |
| M2 | Asset class definition | “Structured products” = whole loans (untranched), private ABF, public securitizations with bankruptcy remoteness; SPV naming is a simplification; covered bonds / synthetics keep collateral on originator BS | Support true-sale, covered bond, synthetic/CRT, warehouse, private, untranched | Whole-loan edge cases still need deal-by-deal confirmation |
| M3 | **Table 5.8-1** | In scope: RMBS; CMBS/CMO; mortgage & CRE covered bonds; other property-backed ABS/MBS; CLO/CDO; Auto ABS. Out of scope (unless optional asset-level data): other hard-asset ABS; consumer/misc ABS; public-sector / land-forest covered bonds | Hard-gate Calculate for out-of-scope families; other-hard only if asset-level emissions present | “Small business loans” under misc ABS vs §5.2 business loans — **flag** |
| M4 | Look-through principle | Method **cannot** apply if collateral nature unknown; follow-the-money requires asset class **and** sector visibility | Incomplete collateral class → incomplete/error, never invent FE | Stratified pool estimates allowed when loan-level unavailable — DQ must degrade |
| M5 | **Figure 5.8-2** | Decision tree: on/off BS → collateral family → optional GSS → classify → apply pool/deal/tranche/bond maths | Frontend eligibility already encodes steps; engine must re-validate eligibility before calc | Step 1 on/off BS does **not** change investor FE method |
| M6 | Fig 5.8-2 Step 6 + attribution list | (1) asset emissions (2) CAF → loan (3) aggregate to pool (4) allocate to tranches / retained interest (5) IAF → investor | Pipeline stages in §2–3 below | — |
| M7 | **Figure 5.8-3** | Originator FE pre-securitization; warehouse bank if holding; after close, investors account for securities; originator continues if retention / no derecognition | Investor product calculates **holding FE**; originator retention is separate Part A / risk-retention path | Jurisdiction / deconsolidation — **out of product scope**; store evidence flags only |
| M8 | Emissions scopes covered | Real estate: operational S1+S2 (whole building). Business/bonds: S1+S2+S3 with S3 disclosed separately. Auto: annual vehicle S1+S2. Other hard: equipment S1+S2. Optional construction/embodied S3 only if jurisdiction requires | Reuse existing scope-breakdown rules; never merge S3 into S1/S2 totals silently | Jurisdictional optional S3 — keep off by default |
| M9 | Guiding principles (5 bullets) | Sum of tranche FE = pool FE; equals on-BS attribution of assets; allocate only tranches repaid from principal receipts; originator+investor overlap for retained BS assets is acknowledged Scope 3 overlap; **do not** map individual assets to specific tranches unless distinct pools | Enforce Σ tranche FE = pool FE (tolerance); tranche-linked pools = separate attribution graphs | What counts as “largely repaid from principal receipts” for exotic notes — use Table 5.8-5 |
| M10 | **Figure 5.8-5** | CAF at loan/collateral; IAF at investment; TAF between pool and tranche | Distinct denominators per factor — never reuse one denom everywhere | — |
| M11 | **Table 5.8-2** CAF (p. 121) | RE: COA/Property AVO; Business: COA/(Equity+Debt); Corporate: COA/EVIC; Auto/hard: COA/Total value at origination; CAF ≤ 1.0 | `CAF = min(1, …)` per class | — |
| M12 | CAF priority stack (p. 122) | (1) COA/AVO (2) OOA/AVO (3) COA/UAV (4) OOA/UAV | Persist `caf_basis`; disclose if ≠ step 1 | Official PDF labels step 2 numerator “(COA)” while defining original outstanding — treat as **OOA** |
| M13 | Box 5.8-1 | Amortization shifts FE from FI toward borrower equity | Recalc each reporting year on updated COAs | — |
| M14 | LAF (Table 5.8-3) | `Loan COA in Pool / Total Loan COA` | Require `amount_in_pool` — **schema gap** | — |
| M15 | TAF (Table 5.8-3) | `Tranche COA / Deal COA`; seniority ignored | Deal COA is **graph-local** applicable deal COA | — |
| M16 | IAF (Table 5.8-3) | `Investment COA / Total tranche COA` | `bankOutstandingInvestment` | Currency consistency required |
| M17 | **Table 5.8-3 PoP** (p. 124) | `FE_PoP = Σ (Pool COA in PoPDeal / PoP COA_Deal) × FE_pool` — **not** 100% sum | Persist member `amount_in_pop` + PoP COA | Conservation vs guiding principles — see 6C.0B Q1 |
| M18 | Reported pool FE (p. 125) | `Σ IAF × TAF × Reported emissions` | Exclusive vs look-through | Intensity fallback only via Fig 5.8-6 + disclosure |
| M19 | DQ + **Figure 5.8-6** (p. 127) | COA-weighted DQ; amortization factor or constant intensity when pool COAs missing | **No equal-weight DQ fallback** | Fig 5.8-6 image nodes need human confirm |
| M20 | Assessment boundary | Only assets in collateral pool at reporting time; revolving pools use latest composition | Snapshot pool membership at calc time | — |
| M21 | Double counting § | Avoid within-structure double counting; Scope 3 overlaps across FIs acknowledged; EVIC interaction when originator keeps assets+liabilities on BS | Controls in §8 | Repo / risk-retention secondary sale double count acknowledged by PCAF |
| M22 | **Table 5.8-4** structures | Static/revolving, SRT/CRT, synthetic, warehouse, master trust, Re-REMIC **in scope** (with treatments); TBA until delivery **out**; classic repo under derivatives (Party A keeps FE) | Support matrix in §7 | Master-trust appreciating-asset refinancing changes AVO basis — complex; phase later |
| M23 | **Table 5.8-5** exposures | OC = virtual tranche; IO/PO split by issuance proceeds; reserve/liquidity/hedging **out**; X-notes/excess spread/residuals generally **out**; risk retention depends on form | First release: OC virtual tranche optional; IO/PO / X-notes unsupported pending confirmation | Subordinated loan split use-of-proceeds (OC vs reserve) needs evidence fields |
| M24 | Defaults / PDL | Use COA + AVO until asset leaves pool; prefer COA net of crystallized losses; unadjusted COA acceptable if PDL data unavailable | Do not invent PDL maths without inputs; accept unadjusted COA | Worked example Fig 5.8-9 not numeric in extract — no golden FE invented |

---

## 2. Calculation hierarchy and formulas (6C.0B locked)

### 2.1 Pipeline (investor holding)

```
Hard-asset absolute emissions (Part A class method)
        │  × CAF = min(1, COA/denom)   [fallback OOA/UAV per priority]
        ▼
Loan FE = Σ (Emissions_collateral × CAF)
        │  × LAF = (loan COA in pool) / (total loan COA)
        ▼
Pool FE = Σ (LAF × FE_loan)     ──or──  Reported pool FE (exclusive)
        │  × PoP_weight = (pool COA in PoP) / (PoP COA)   [if PoP]
        ▼
FE_pool_or_PoP
        │  × TAF = tranche COA / applicable deal COA
        ▼
Tranche FE
        │  × IAF = investment COA / tranche COA
        ▼
Bank holding FE
```

**Deal FE:** `Σ FE_tranche = FE_deal = FE_pool(or PoP)` (Table 5.8-3).

**Tranche-specific pools:** separate attribution graphs per linked pool/PoP; aggregate holding FE across graphs.

### 2.2 Attribution factors (distinct denominators)

| Factor | Numerator | Denominator | Cap / notes |
|---|---|---|---|
| **CAF** | COA (else OOA) | RE/auto/hard: AVO (else UAV); business: Equity+Debt; corp/listed: EVIC | `min(1, ·)` |
| **LAF** | Loan COA in this pool | Total loan COA | Full allocation only if entire loan in pool |
| **PoP weight** | Pool COA in PoP deal | PoP deal COA | **Not** automatic 100% sum of `FE_pool` |
| **TAF** | Tranche COA | Applicable deal COA (graph-local Σ tranche COA, incl. virtual OC when used) | Seniority ignored |
| **IAF** | Bank investment COA | Tranche COA | Holding may be < tranche |

### 2.3 Layer map vs product objects

| Layer | FE out | Required inputs | Attribution | DQ | Missing data |
|---|---|---|---|---|---|
| Collateral | Absolute emissions | `classInputs`, factors | Feeds CAF | Asset-class DQ | Incomplete questionnaire → incomplete |
| Loan | `Σ E×CAF` | Collateral links; loan COA/OOA | Per-type CAF | COA-weighted collateral DQ only | No COA → OOA; else Fig 5.8-6 / incomplete |
| Pool | `Σ LAF×FE_loan` or reported | Loans **or** reported fields; `amount_in_pool` | LAF | COA-weighted loan DQ | No equal-weight |
| Pool of pools | `Σ (pool_in_PoP/PoP_COA)×FE_pool` | Member amounts + PoP COA | PoP weights | COA-weighted member DQ | Empty members → error |
| Tranche | `TAF×FE_pool/PoP` | Tranche COA; links if tranche-specific | TAF | Inherit graph DQ | Warn on COA mismatch; no silent rewrite |
| Deal | Consistency | All graph tranches | `Σ FE_tranche` | — | — |
| Holding | `IAF×FE_tranche` | Investment COA | IAF | Provenance | Missing investment → incomplete |

---

## 3. Variable and denominator mapping (6C.0B locked)

### 3.1 CAF by collateral type (Table 5.8-2, PDF p. 121)

| Collateral type | Structure examples | Locked CAF | Denominator | Part A |
|---|---|---|---|---|
| Residential / commercial RE | RMBS, CMBS/CMO, mortgage/CRE covered, property ABS | `min(1, COA / Property_Value_at_Origination)` | AVO | §5.5 / §5.4 |
| Business loans / unlisted equity | CLO/CDO as applicable | `min(1, COA / (Total_Equity + Debt))` | Equity+Debt | §5.2 |
| Corporate bonds / listed equity | CLO/CDO as appropriate | `min(1, COA / EVIC)` | EVIC | §5.1 |
| Auto loans/leases | Auto ABS | `min(1, COA / Total_Value_at_Origination)` | Vehicle AVO | §5.6 |
| Other hard assets | Optional ABS | `min(1, COA / Total_Value_at_Origination)` | Equipment AVO; asset-level emissions required | Table 5.8-1 optional |

Fallback priority: COA/AVO → OOA/AVO → COA/UAV → OOA/UAV (disclose `caf_basis`).

### 3.2 Product field mapping

| PCAF variable | Draft / DB field |
|---|---|
| Loan COA / OOA | `loans.currentOutstandingAmount` / `originalOutstandingAmount` |
| AVO / UAV | `assetValueAtOrigination` / `updatedAssetValue`; UI `attributionDenominator` when it is the CAF denom |
| LAF numerator | **Proposed** `ssp_pool_loans.amount_in_pool` (+ draft mirror) |
| PoP weight numerator | **Proposed** `ssp_pool_of_pools_members.amount_in_pop` |
| PoP COA denom | `poolOfPools.currentOutstandingAmount` |
| Deal COA (TAF denom) | Σ graph tranche COAs (incl. virtual OC) |
| Tranche COA | `tranches.currentOutstandingAmount` |
| Investment COA | `holdings.bankOutstandingInvestment` |
| Reported pool FE | `pools.reportedEmissionsTotal` (+ period, verification, source) |

Denominators differ by layer — never reuse one amount for CAF, LAF, TAF, and IAF interchangeably.

### 3.3 Multi-collateral loans

Table 5.8-3: each collateral type assessed with its own CAF; `FE_loan = Σ E_i × CAF_i`.

---

## 4. Underlying calculator reuse matrix

**Principle:** Do **not** duplicate asset-class emission formulas. SSP orchestration calls the same backends/configs already used for standalone financed emissions / UoP underlying.

| SSP collateral class | Existing engine / config | Applicable under §5.8? | `classInputs` mapping | Factors / sources | Outputs | Unsupported / uncertain |
|---|---|---|---|---|---|---|
| Mortgage | FE configs `MORTGAGE_FORMULAS`; property PCAF helpers; `calculate_financed_emissions` | Yes (§5.5 via Table 5.8-1) | Method 1a–3; properties[]; energy + EF fields | Grid/supplier EF libraries already used by mortgage calc | Absolute building S1/S2 → then × CAF | — |
| CRE | `COMMERCIAL_REAL_ESTATE_FORMULAS`; property PCAF | Yes (§5.4) | commercialProperties[]; method options | Same pattern as CRE standalone | Absolute CRE S1/S2 → × CAF | — |
| Motor vehicle | `MOTOR_VEHICLE_LOAN_FORMULAS`; `motor_vehicle_pcaf` | Yes (§5.6) | vehicle_entries; distance/fuel; factor library | EPA / PCAF DB / national stats per existing loader | Vehicle S1/S2 → × CAF | VIN-level preferred but not required |
| Business loan / unlisted equity | `LISTED_EQUITY_FORMULAS` filtered to unlisted ids; corporate configs | Yes for CLO/CDO corporate debt (§5.2) | methodSelection + equity/debt/emissions fields | Company reported or sector intensity per option | Company S1/S2/(S3) → × CAF (Equity+Debt) | Confirm option 2a/2b/3* applicability inside SSP tape quality |
| Corporate bond / listed equity | Same company formula catalog, listed ids | Yes where collateral is corp bonds / listed (§5.1) | EVIC inputs (price, shares, debt, etc.) | Same | × CAF (EVIC) | **Listed-equity vs bond:** same §5.1 denom family; UI must not mix unlisted denom |
| Other hard asset | **None** | Optional only with asset-level emissions | Manual scopes + value | User/issuer reported | Manual absolute × CAF | **Unsupported** until dedicated method; no invented EF |

### Explicit resolutions / flags

| Topic | Resolution for 6C.1 |
|---|---|
| Listed equity vs corporate bond | Both use §5.1 EVIC-style attribution; keep separate collateral types for reporting labels; share calculator catalog with listing flag |
| Company options in SSP | Reuse 1a/1b/2a/2b/3a/3c as selected by questionnaire; do not invent SSP-only company options |
| Other hard asset | Calculate **blocked** unless eligibility `hasAssetLevelEmissionsForOtherHard=yes` **and** absolute S1/S2 supplied; still no generic EF library |
| Reported emissions vs asset-class estimates | Pool-level `reported_pool` path skips underlying calculators; look-through never reads `reportedEmissionsTotal` for the same pool |

---

## 5. Data-quality methodology (6C.0B corrected)

1. Score each underlying collateral with **existing Part A asset-class DQ scorers** only.
2. Aggregate upward with **COA-weighted** averages only (PCAF p. 127).
3. **No automatic equal-weight fallback** when COA is missing — mark DQ aggregation incomplete or escalate FE to Fig 5.8-6 paths.
4. **Figure 5.8-6 permitted FE fallbacks** when original/current loan amounts are unavailable at pool level:
   - pool amortization factor path, or
   - constant emissions intensity applied to tranche/investment COA  
   Both require transparent disclosure and Part A DQ scoring.
5. Preferred order: loan-level → stratified pool → Fig 5.8-6 fallback → incomplete (no fabricated FE).
6. Disclose `caf_basis` / path (`lookthrough` | `reported_pool` | `intensity_fallback` | `amortization_factor`).
7. Missing property type: prefer incomplete/disclose over silent “most intensive” assumption unless methodology owners approve estimate mode (open question).

---

## 6. Factor and evidence requirements

| Need | Requirement |
|---|---|
| Emission factors | Resolve only via existing factor-resolution services/libraries used by mortgage/CRE/motor/company calculators |
| Provenance | Persist factor library entry ids, version, geography, unit, retrieved_at in calculation provenance JSON |
| Reported pool path | Require `reportedSource`, period, scope coverage; verification status recorded; evidence document reference |
| CAF basis | Persist which of the four priority pairs was used |
| Issuer vs investor | Evidence that numbers are nominal outstanding, not mark-to-market |
| GSS | If Secured Green Standard Bond → **do not** run SSP FE; reroute UoP |

---

## 7. Supported versus unsupported structures

### Supported for Calculate design (6C.1 target)

| Structure | Mode notes |
|---|---|
| True-sale ABS / RMBS / CMBS / Auto ABS / CLO-CDO (simple) | Look-through default |
| Untranched | TAF = 1 synthetic tranche |
| Covered bonds (mortgage/CRE) | Look-through **or** eligible reported pool FE; collateral may remain on originator BS |
| Synthetic / CRT | Same attribution maths; on/off BS irrelevant for investor allocation |
| Warehouse | Allocate pool FE to **drawn** tranche amounts |
| Private ABS | Same as public if pool identifiable |
| Pool of pools | Weight each `FE_pool` by `pool_COA_in_PoP / PoP_COA` (Table 5.8-3); then TAF/IAF |
| Tranche-specific pools | Separate attribution graphs per linked pool set |
| Multiple holdings on one deal | Shared pool/tranche FE; independent IAF |

### Unsupported / deferred (hard-fail or exclude)

| Structure / exposure | Reason |
|---|---|
| Consumer/credit-card/student/HEL ABS | Table 5.8-1 out of scope |
| Public-sector / land-forest covered bonds | Table 5.8-1 out of scope |
| Other hard ABS without asset-level emissions | Table 5.8-1 |
| TBA (pre-delivery) | Table 5.8-4 out |
| Classic repo as Party B | Derivatives / Party A keeps FE |
| Reserve funds, liquidity facilities, hedging | Table 5.8-5 out |
| X-notes / pure excess-spread residuals | Table 5.8-5 out |
| IO/PO strips | Formula exists but needs issuance-proceeds inputs — **defer** |
| Master-trust appreciating-asset re-lever | Worked example complexity — **defer** |
| Re-REMIC full decomposition | Nested SSP recursion — **defer** |
| Facilitated emissions (arranger) | Part B not yet specific |

---

## 8. Double-counting controls

1. **Path exclusivity:** `emissions_path` is exactly one of `lookthrough` | `reported_pool` per deal/pool graph; engine errors if both underlying FE and reported totals would be summed.
2. **Tranche conservation:** Σ tranche FE ≈ pool/PoP FE (tolerance e.g. 1e-6 relative); fail closed on gross mismatch after OC virtual tranche included.
3. **No asset→tranche mapping** unless `pools_linked_to_specific_tranches=yes` with explicit links.
4. **Overlapping relationships:** reject duplicate loan in two pools without LAF shares; reject cycles; reject cross-deal links (already DB-enforced).
5. **Holdings:** independent IAF only; never attribute full tranche FE to every holding.
6. **Originator overlap:** do not auto-zero investor FE when `collateral_remains_with_originator=yes` (PCAF acknowledges Scope 3 overlap); surface disclosure banner.
7. **Category 15 / portfolio:** preview results stay in `ssp_calculations` (non-reportable); **no** write to `app.financed_emissions` until a later authorized reportable phase.

---

## 9. Proposed backend architecture

### 9.1 Service boundaries

```
SspDraftLoader (org-scoped)
    → SspEligibilityGuard
    → SspGraphBuilder (collateral→loan→pool→PoP→tranche→holding)
    → SspPathSelector (lookthrough | reported_pool)
         ├ lookthrough: UnderlyingAssetCalculatorPort (reuse existing formula runners)
         │               → CafService → LafService → PoolAggregator
         │               → PopWeightService (Table 5.8-3 weights; not 100% sum)
         └ reported: ReportedPoolIngestor
    → TafService (deal COA = graph-local) → IafService
    → DqAggregator → ProvenanceBuilder
    → SspCalculationResult (preview)
```

- **FactorResolutionPort:** existing loaders only.
- **No** shared mutable global state; deterministic pure functions over a frozen draft snapshot + factor pin set.
- **Org isolation:** all reads/writes filtered by `organization_id` (same as drafts).

### 9.2 Preview vs reportable

| Mode | Persist where | `is_reportable` | Portfolio |
|---|---|---|---|
| Preview calculate | Optional `ssp_calculations` draft rows / response-only | **false** (CHECK) | **false** |
| Reportable Save | **Not in 6C.1** | blocked | blocked |

Mirror UoP: dedicated `/api/v1/ssp/calculate` (preview) separate from financed-emissions router (which already rejects SSP formula ids).

### 9.3 Input / output schema (proposed)

**Request:** `financing_instance_id` | `deal_id` + `holding_id`, `reporting_year`, `mode=preview`, optional `expected_draft_updated_at` (conflict), `factor_pin_set`.

**Response (non-normative shape):**

```json
{
  "status": "complete|incomplete|error",
  "methodology_version": "PCAF-2025-PartA-5.8",
  "emissions_path": "lookthrough",
  "holding": {
    "financed_emissions_tco2e": null,
    "scope1": null, "scope2": null, "scope3": null,
    "iaf": null, "taf": null, "dq": null
  },
  "layers": {
    "collateral": [],
    "loans": [],
    "pools": [],
    "tranches": []
  },
  "provenance": {},
  "errors": [],
  "warnings": []
}
```

Incomplete ≠ fabricated zero FE.

### 9.4 Versioning

- Pin `methodology_version` (`PCAF-2025-PartA-5.8`) + engine semver + factor DB versions in provenance.
- Recalculation must reproduce given same snapshot + pins.

### 9.5 Error states

| Code | Meaning |
|---|---|
| `unsupported_structure` | Table 5.8-1/4/5 hard fail |
| `eligibility_failed` | Fig 5.8-2 outcome not SSP |
| `path_conflict` | look-through + reported |
| `zero_denominator` | CAF/LAF/PoP/TAF/IAF denom ≤ 0 |
| `incomplete_underlying` | Questionnaire/factors missing |
| `graph_invalid` | Unknown association / overlap |
| `stale_draft` | 409 conflict |

---

## 10. Golden-test plan (6C.0B revised)

**Rule:** numeric expectations are **independent fixture algebra** from locked equations. Do **not** claim PCAF worked-figure values until Figs 5.8-8/5.8-9 are transcribed.

| ID | Scenario | Assert | Source |
|---|---|---|---|
| G01 | Single loan/pool/untranched/holding | `FE_h = IAF × FE_loan`; `CAF=min(1,COA/AVO)`; `LAF=TAF=1` | Fixture |
| G02 | Multi-collateral loan | `FE_loan = Σ E_i×CAF_i` | Fixture |
| G03 | Partial LAF | Half loan in pool → `FE_pool = 0.5×FE_loan` | Fixture |
| G04 | **Partial PoP composition** | `FE_PoP = Σ (pool_COA_in_PoP/PoP_COA)×FE_pool` — **not** `Σ FE_pool` | Fixture |
| G05 | Full single-pool PoP | weight 1 → `FE_PoP = FE_pool` | Fixture |
| G06 | Two tranches | `TAF = T_i/Deal_COA`; `Σ FE_tranche = FE_pool/PoP` | Fixture |
| G07 | Tranche-specific pools | Independent graphs | Fixture |
| G08 | Two holdings | Independent IAF | Fixture |
| G09 | CAF cap | ratio 1.2 → CAF 1.0 | Fixture |
| G10 | Reported path | `IAF×TAF×Reported`; no underlying calc | Fixture |
| G11 | Path conflict / zero denom | errors | — |
| G12 | DQ COA weights | No equal-weight when COA present | Fixture |
| G13 | Missing COA for DQ | incomplete / Fig 5.8-6 — not equal-weight | Fixture |
| G14 | OC virtual tranche | Included in Deal COA | Fixture |
| G15 | Mixed classes / synthetic / covered reported | Per support matrix | Fixture |
| G16 | PCAF Fig 5.8-8/9 | Deferred pending transcription | Official PDF |

---

## 11. Outstanding methodology questions (post-6C.0B)

1. **PoP conservation:** Literal Table 5.8-3 uses PoP COA denominator (composition weights). Confirm vs LAF-symmetric ownership share (`pool_in_PoP / pool_total`) before multi-pool PoP production lock.
2. **CAF priority item (2):** Official PDF prints “Original outstanding amount **(COA)**” — confirm OOA numerator.
3. **Fig 5.8-6** image node order for amortization vs intensity.
4. Intensity fallback: auto vs explicit opt-in.
5. Missing property-type conservative assumption vs incomplete.
6. IO/PO, master-trust re-lever, Re-REMIC remain deferred.
7. Whole-loan §5.8 vs §5.5 boundary; small-business ABS classification.

---

## 12. Database suitability (migration 0020) — propose only

### Already adequate

Deal/holding/collateral/loan/pool/PoP/tranche graph; `ssp_tranche_pools`; org isolation; `emissions_path`; reported pool fields; AVO/OOA/COA; `class_inputs`; non-reportable `ssp_calculations`.

### Proposed additive changes (do **not** apply now)

| Change | Why |
|---|---|
| `ssp_pool_loans.amount_in_pool` | LAF numerator |
| `ssp_pool_of_pools_members.amount_in_pop` | PoP weight numerator |
| `ssp_tranches.is_virtual_overcollateralization` | Table 5.8-5 OC |
| `ssp_calculations.calculation_run_id`, `layer`, `caf_basis` | Provenance / DQ audit |
| `ssp_pools.pool_amortization_factor`, intensity fields | Fig 5.8-6 |
| Draft JSON mirrors of the above | FE contract before migrate |

**0019 UoP:** no shared migration dependency for SSP calculate.

---

## 13. GO / NO-GO for Phase 6C.1

### Recommendation: **CONDITIONAL GO** (preview engine only) — see also 6C.0B §8

**GO allows:** CAF/LAF/TAF/IAF + literal PoP weighting; underlying calculator reuse; preview API; non-reportable `ssp_calculations`; fixture goldens G01–G15; propose schema additives.

**Still NO-GO:** UI Calculate / reportable Save; `financed_emissions` / Category 15; applying migrations; deploy; multi-pool PoP as methodology-final until Q1 closed; PCAF figure-number claims without transcription.

**Later Calculate unlock:** Q1–Q2 closed, G01–G15 green on isolated stack, authorized schema apply.

---

## Safety affirmation

This document does **not** implement Calculate, enable reportable Save, write financed emissions, modify Category 15, apply migrations, or deploy.

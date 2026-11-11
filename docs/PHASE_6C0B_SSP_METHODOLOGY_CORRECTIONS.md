# Phase 6C.0B — SSP Methodology Corrections and Final Design Lock

**Date:** 2026-11-11  
**Status:** Design lock only — **no Calculate implementation**, no reportable Save, no `financed_emissions` / Category 15 writes, no migrations, no deploy.

**Updates:** `docs/PHASE_6C0_SSP_CALCULATION_DESIGN.md` (corrected in place)  
**Authoritative source:** PCAF (2025) Part A Third Edition §5.8, verified from official PDF text extraction (pp. 121–127 for Tables 5.8-2 / 5.8-3 and DQ guidance).

---

## 1. Exact formula corrections

### 1.1 CAF — Collateral Attribution Factor (Table 5.8-2, p. 121)

Apply `min(1, ·)` always (PCAF: CAF must never exceed 1.0).

| Collateral | Locked formula | Denominator |
|---|---|---|
| Real estate (RMBS, CMBS/CMO, mortgage covered bonds, other property ABS/MBS) | `CAF = min(1, COA / Property_Value_at_Origination)` | AVO (property) |
| Auto / other hard assets | `CAF = min(1, COA / Total_Value_at_Origination)` | AVO (vehicle/equipment) |
| Business loans / unlisted | `CAF = min(1, COA / (Total_Equity + Debt))` | Company equity+debt |
| Corporate bonds / listed equity | `CAF = min(1, COA / EVIC)` | Enterprise value including cash |

**Fallback priority** (PCAF prose p. 122; item 2 label says “(COA)” but defines original outstanding — treat numerator as **OOA** for steps 2 and 4):

1. COA / AVO  
2. OOA / AVO  
3. COA / UAV  
4. OOA / UAV  

Disclose `caf_basis` whenever step ≠ 1.

**Loan FE (Table 5.8-3):**

\[
FE_{loan} = \sum_i Emissions_{collateral,i} \times CAF_{collateral,i}
\]

Multi-type collateral: assess each type with its own CAF, then sum.

### 1.2 LAF — Loan Attribution Factor (Table 5.8-3 pool row)

\[
LAF_i = \frac{Loan\ COA\ (Nominal)\ in\ Pool_i}{Total\ Loan\ COA\ (Nominal)_i}
\]

\[
FE_{pool} = \sum_i LAF_i \times FE_{loan,i}
\]

Default `LAF = 1` only when the **entire** loan COA is in that pool (explicit full allocation), not as a silent substitute for missing amounts.

### 1.3 Pool of pools — CORRECTION (Table 5.8-3, p. 124)

**6C.0 error:** `FE_PoP = Σ FE_pool` (100% of each member).

**Locked Table 5.8-3 text:**

\[
FE_{PoP} = \sum_i \left( \frac{Pool\ COA\ (Nominal)\ in\ PoPDeal_i}{PoP\ COA\ (Nominal)_{Deal,i}} \times FE_{pool,i} \right)
\]

Interpretation locked for design:

- Numerator = nominal outstanding of pool \(i\) **included in** the pool-of-pools deal structure.  
- Denominator = nominal **PoP deal COA** for that structure.  
- This is an outstanding-share weight — **not** an automatic 100% sum.  
- When a single pool is fully wrapped and `PoP_COA = pool_COA_in_PoP`, weight = 1 and `FE_PoP = FE_pool`.

**Unresolved tension (do not invent a rewrite):** Guiding principles require `Σ FE_tranche = FE_deal = FE_pool(or PoP)`. Composition weights that sum to 1 produce a **COA-weighted blend** of absolute pool FEs. Methodology owners must confirm before 6C.1 ships multi-pool PoP production behaviour (see §4 Q1). Until confirmed, golden tests encode the **literal table equation**.

### 1.4 TAF — Tranche Attribution Factor (Table 5.8-3)

\[
TAF_i = \frac{Tranche\ COA\ (Nominal)_i}{Deal\ COA\ (Nominal)_i}
\]

\[
FE_{tranche,i} = TAF_i \times FE_{pool\ (or\ PoP)}
\]

**Applicable deal COA:** for a shared-pool capital structure, Deal COA = Σ nominal COA of all in-scope tranches (incl. virtual OC / seller share / retention-as-tranche when treated as tranches). For **tranche-specific pools**, use a **separate attribution graph**: Deal COA = Σ COA of tranches linked to that pool (or PoP) only. Seniority does not alter TAF.

Untranched: synthetic single tranche with `TAF = 1` and Deal COA = that tranche COA.

### 1.5 IAF — Investment Attribution Factor (Table 5.8-3)

\[
IAF = \frac{Tranche\ investment\ COA\ (Nominal)}{Total\ tranche\ COA\ (Nominal)}
\]

\[
FE_{investment} = \sum_i IAF_i \times FE_{tranche,i}
\]

(Single-holding case: one term.)

**Reported-pool path (p. 125):**

\[
FE_{investment} = \sum_i IAF_i \times TAF_i \times Reported\ emissions
\]

Never combine with look-through on the same pool.

---

## 2. Updated denominator mapping

| Factor | Numerator | Denominator | Product fields |
|---|---|---|---|
| CAF (RE / auto / hard) | Loan COA (else OOA) | AVO (else UAV) | loan COA/OOA; `assetValueAtOrigination` / `attributionDenominator`; `updatedAssetValue` |
| CAF (business) | Loan COA (else OOA) | Equity + Debt | from `classInputs` |
| CAF (corp bond / listed) | Loan COA (else OOA) | EVIC | from `classInputs` |
| LAF | Loan COA **in this pool** | Total loan COA | **needs** `ssp_pool_loans.amount_in_pool` (or draft equivalent) |
| PoP weight | Pool COA **in PoP deal** | PoP deal COA | **needs** member `amount_in_pop` + PoP `current_outstanding_amount` |
| TAF | Tranche COA | Applicable deal COA (graph-local Σ tranche COA) | tranche COA; OC virtual flag |
| IAF | Bank investment COA | Tranche COA | `bankOutstandingInvestment` |

---

## 3. Hierarchy (corrected)

```
Collateral absolute emissions
   × CAF(min 1, class denom)
→ Loan FE
   × LAF (loan COA in pool / total loan COA)
→ Pool FE
   × PoP_weight (pool COA in PoP / PoP COA)   [if PoP present]
→ Pool or PoP FE
   × TAF (tranche COA / applicable deal COA)
→ Tranche FE
   × IAF (investment COA / tranche COA)
→ Bank holding FE
```

**Tranche-specific pools:** build one graph per linked pool/PoP set; compute FE end-to-end per graph; sum investor FE across graphs for the holding’s portfolio total. Do **not** allocate individual collateral to tranches without distinct pools.

---

## 4. Data-quality corrections

| Rule | Locked behaviour |
|---|---|
| Aggregation | **COA-weighted** average of underlying asset/loan DQ scores only (PCAF p. 127) |
| Equal-weight fallback | **Removed** — not PCAF-prescribed for SSP |
| Missing COA for DQ weights | Do **not** equal-weight; mark DQ aggregation `incomplete` **or** follow Fig 5.8-6 fallback path for the FE itself |
| Fig 5.8-6 permitted FE fallbacks | When original/current loan amounts unavailable at pool level: (1) pool amortization factor path, or (2) constant emissions intensity applied to tranche/investment COA — **disclose** and score per Part A |
| Preferred data order | Loan-level → stratified pool → intensity/amortization fallback → incomplete |

---

## 5. Schema changes required (propose only — do not apply)

Migration **0020** already has the graph, reported-pool fields, COA/OOA/AVO columns, non-reportable `ssp_calculations`. Gaps:

| Proposed additive field | Table | Purpose |
|---|---|---|
| `amount_in_pool numeric` | `ssp_pool_loans` | LAF numerator |
| `amount_in_pop numeric` | `ssp_pool_of_pools_members` | PoP weight numerator |
| `is_virtual_overcollateralization boolean` | `ssp_tranches` | Table 5.8-5 OC virtual tranche |
| `caf_basis text` | `ssp_calculations` or provenance JSON | COA/AVO \| OOA/AVO \| COA/UAV \| OOA/UAV |
| `calculation_run_id uuid` | `ssp_calculations` | Preview run provenance |
| `layer text` | `ssp_calculations` | collateral\|loan\|pool\|pop\|tranche\|holding |
| `pool_amortization_factor numeric` (nullable) | `ssp_pools` | Fig 5.8-6 |
| `emissions_intensity numeric` + unit (nullable) | `ssp_pools` / tranche | Fig 5.8-6 intensity fallback |
| Draft JSON mirrors | FE draft contract | Same fields before DB migrate |

Tranche-specific pools: association table `ssp_tranche_pools` already exists — no structural change; engine must honour links.

---

## 6. Golden-test matrix updates

All numeric expectations are **independent fixtures** (algebra from locked equations). Separate from unpublished PCAF figure transcriptions.

| ID | Focus | Expected (fixture algebra) |
|---|---|---|
| G01 | Single loan/pool/untranched/holding | `FE_h = IAF × FE_loan` with `CAF=min(1,COA/AVO)`, `LAF=1`, `TAF=1` |
| G02 | Multi-collateral loan | `FE_loan = Σ E_i×CAF_i` |
| G03 | Partial LAF | Half loan in pool → `FE_pool = 0.5 × FE_loan` |
| G04 | **Partial PoP ownership/composition** | Two pools; weights `w_i = pool_COA_in_PoP / PoP_COA`; `FE_PoP = Σ w_i×FE_pool_i` (**not** `Σ FE_pool`) |
| G05 | Full single-pool PoP | `w=1` → `FE_PoP = FE_pool` |
| G06 | Two tranches | `TAF_i = T_i / Deal_COA`; `Σ FE_tranche = FE_pool/PoP` |
| G07 | Tranche-specific pools | Independent graphs; no cross leak |
| G08 | Two holdings | Independent IAF |
| G09 | CAF cap | Raw ratio 1.2 → CAF 1.0 |
| G10 | Reported path | `IAF×TAF×Reported`; no underlying calc |
| G11 | Path conflict | error |
| G12 | Zero denom | error |
| G13 | DQ COA weights | No equal-weight when COA present |
| G14 | Missing COA for DQ | incomplete / Fig 5.8-6 path — not equal-weight |
| G15 | OC virtual tranche | Included in Deal COA |
| G16–G18 | Mixed classes / synthetic / covered reported | Per §7 support matrix |
| G19 | PCAF Fig 5.8-8/9 | **Deferred** until official numbers transcribed (not fixture-invented) |

---

## 7. Remaining unresolved methodology questions

1. **PoP conservation:** Literal Table 5.8-3 PoP weights use **PoP COA** as denominator (blend). Confirm with methodology owners that this is intended vs LAF-symmetric `pool_in_PoP / pool_total` (ownership share that sums FE when fully included).  
2. **CAF priority item (2):** Official PDF still prints “Original outstanding amount **(COA)**” — confirm OOA numerator.  
3. **Fig 5.8-6:** Image decision tree not fully machine-readable — confirm node order for amortization vs intensity before coding fallbacks.  
4. **Intensity fallback:** Auto-apply vs require explicit user/opt-in disclosure mode.  
5. **IO/PO, master-trust re-lever, Re-REMIC:** remain deferred.

---

## 8. Final GO / NO-GO for Phase 6C.1

### **CONDITIONAL GO** — preview calculation engine only

**Allowed in 6C.1:**

- Implement CAF / LAF / TAF / IAF and **literal** PoP weighting from Table 5.8-3  
- Reuse existing underlying calculators  
- Preview API + non-reportable `ssp_calculations`  
- Fixture goldens G01–G18  
- Propose (not apply) schema additives above  

**Still NO-GO:**

- UI Calculate enablement / reportable Save  
- `app.financed_emissions` / Category 15 / portfolio inclusion  
- Applying migrations / deploy  
- Shipping multi-pool PoP as “methodology-final” until Q1 answered  
- Claiming parity with PCAF worked-figure numbers without transcription  

**Entry to unlock Calculate in a later phase:** Q1–Q2 closed, G01–G15 green on isolated stack, schema additives applied under authorization.

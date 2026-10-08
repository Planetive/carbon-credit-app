# EPA Emission Calculator Module — Enterprise Verification Brief

**Product:** Rethink Carbon  
**Module:** EPA / IPCC Emission Calculator (`/emission-calculator-epa`)  
**Audience:** External methodology / engineering verifier  
**Codebase date of audit:** October 2026  
**Frontend repo:** `carbon-credit-app`  
**Backend:** FastAPI (separate repo: `carbon-credit-backend`), Railway deployment  

**Legend**
- **[FACT]** — Confirmed in current code  
- **[INFERENCE]** — Reasoned risk / gap not explicitly documented in code  

---

## 1. Executive summary

The EPA module is a **browser-based GHG inventory calculator** covering Scope 1, Scope 2, and Scope 3. It mixes:

- **EPA-style factor sheets** (Fuel EPA 1/2/3, Mobile Combustion, On-Road*, Non-Road)
- **IPCC-style embedded calculators** (flaring, venting, vehicular litres, kitchen, power, heating)
- **Hardcoded GWP / stoichiometry** (refrigerant, flaring, venting; optional defaults for kitchen/power/heating)

**Enterprise readiness verdict (current):**  
**Useful operational calculator / MVP inventory tool — not yet enterprise-grade for assurance, attestation, or locked factor governance.**

Strengths: broad category coverage, separate persistence tables, UK/EPA framework column on shared tables, dual local/API calc bridge exists.  
Gaps: client-side calc as production default, unversioned hardcoded factors, no double-count guardrails, dormant server audit trail, large UI/calc monoliths, refrigerant GWP DB table not wired.

---

## 2. Architecture & entry points

| Route | Screen | Role |
|---|---|---|
| `/emission-calculator-epa` | `EpaCalculatorScreen.tsx` | Main EPA shell (sidebar + all Scope 1/2/3) |
| `/emission-calculator-ipcc` | Redirect → EPA | IPCC is **embedded**, not standalone |
| `/emission-results-calculator` | `EpaIpccResultsScreen.tsx` | Live EPA/IPCC results |
| `/emission-results-epa-ipcc` | Redirect → results-calculator | Legacy alias |

**[FACT]** Six IPCC Scope 1 categories render inside EPA via:

`EpaCalculatorScreen` → `<EmissionCalculatorIPCC embedded forcedCategory={…} />`

Key files:

- `src/features/emission-calculator/methodologies/epa-ipcc/EpaCalculatorScreen.tsx` (~1,800 LOC)
- `src/features/emission-calculator/methodologies/epa-ipcc/IpccCalculatorScreen.tsx` (~5,700+ LOC)
- `src/features/emission-calculator/core/loaders/epaIpccResults.ts`
- `src/api/calcConnection.ts` (local math + optional FastAPI reconcile)
- `src/integrations/supabase/ghgEntryClient.ts` / `ghgEntryAggregates.ts`

**[INFERENCE]** Mixing navigation, PDF HTML templates, wizard context, and category rendering in one component raises maintainability and independent formula-verification cost.

---

## 3. Scope inventory — factor source vs result storage

> **Factor source** = where the emission factor / GWP comes from.  
> **Result table** = where user inputs + computed emissions are stored.

### 3.1 Scope 1

| Tab | Factor source | Result / entry table |
|---|---|---|
| Fuel | DB: `Fuel EPA 1`, `Fuel EPA 2`, `Fuel EPA 3` | `scope1_fuel_entries` (`emission_framework = epa`) |
| Heat and Steam (S1) | Same Fuel EPA sheets | `scope1_heatsteam_entries_epa` |
| Mobile Fuel | DB: `Mobile Combustion` | `scope1_epa_mobile_fuel_entries` |
| On-Road Gasoline | DB: `On-Road Gasoline` | `scope1_epa_on_road_gasoline_entries` |
| On-Road Diesel & Alt Fuel | DB: `On-Road Diesel & Alt Fuel` | `scope1_epa_on_road_diesel_alt_fuel_entries` |
| Non-Road Vehicle | DB: `Non-Road Vehicle` | `scope1_epa_non_road_vehicle_entries` |
| Vehicular Carbon Footprints | Prefer `Mobile Combustion`; else fixed diesel **2.7**, petrol **2.32** kg/L | `ipcc_scope1_vehicular_entries` |
| Flaring | **Fixed** molar mass × multipliers in code | `ipcc_scope1_flaring_entries` |
| Venting | **Fixed** GWP map in code | `ipcc_scope1_venting_entries` |
| AC & refrigerant leakage | **Fixed** GWP in code (`epaRefrigerantGwp.ts` + `REFRIGERANT_FACTORS`) | `scope1_refrigerant_entries` (`emission_framework = epa`) |
| Kitchen Footprints | Prefer sheets; else LPG **1.51**, NG **53.06** | `ipcc_scope1_kitchen_entries` |
| Fuel Consumption for Power | Prefer sheets; else diesel **2.7**, NG **53.06** | `ipcc_scope1_power_entries` |
| Heating | Prefer sheets; else NG **53.06** | `ipcc_scope1_heating_entries` |

**Notes**

- Kitchen/Power try `Mobile Combustion` (LPG/diesel) + `Stationary Combustion` / `IPCC 1` (NG).  
- **[FACT]** DB table `"EPA Refrigerant GWP"` exists in migrations (`ref` schema) but **EPA UI does not load it**; GWP is hardcoded.  
- Flaring/venting visible only for `user_type = corporate`.

### 3.2 Scope 2

| Tab | Factor source | Result table |
|---|---|---|
| Electricity | Grid / subanswer factors (DB-backed path) | `scope2_electricity_main`, `scope2_electricity_subanswers` |
| Heat & Steam (purchased) | EPA heat/steam factors (DB-backed path) | `scope2_heatsteam_entries_epa` |

### 3.3 Scope 3

Shared `Scope3Section` with UK calculator. Categories include purchased goods, capital goods, fuel & energy, transport, waste, travel, commuting, leased assets, investments, facilitated emissions, downstream transport, processing/use of sold products, end-of-life, franchises.  
Persistence: dedicated `scope3_*` tables. Factor sources vary by category (spend-based, activity-based, portfolio import).

---

## 4. Core formulas (as implemented)

| Category | Formula (simplified) |
|---|---|
| Fuel / Heat S1 / Mobile | `quantity × factor` (CH4/N2O g-basis factors converted to kg where applicable) |
| On-Road / Non-Road | Often `(g_per_mile_or_gallon × activity) / 1000` — may be CH4- or N2O-only depending on selection |
| Refrigerant | `leakage_kg × GWP`; estimate mode: `charge_kg × (rate%/100)` then × GWP |
| Flaring | Ideal-gas moles from volume (+ temp correction) × composition × molar mass × CO₂e multipliers |
| Venting | Same volume→moles path × gas mass × fixed GWP |
| Kitchen | `lpg_kg×lpg_factor + ng_mmscf×GHV×ng_factor` |
| Power | `diesel_L×diesel_factor + ng_mmscf×GHV×ng_factor` |
| Heating | `ng_mmscf×GHV×ng_factor` |
| Vehicular IPCC | `diesel_L×2.7 + petrol_L×2.32` (or sheet override) |

---

## 5. Calculation runtime model

**[FACT]** Pattern in `calcConnection.ts`:

1. Compute **locally in the browser** (always, for UX).  
2. If `USE_JWT_AUTH` / JWT mode: call FastAPI `/api/v1/calc/...` and optionally persist assessment activities.  
3. On API failure: **silent fallback** to local math.

**[FACT]** Typical production path today: **client-side math + Supabase entry rows**. Server calc audit path exists but is largely dormant when JWT auth is off.

**Enterprise implication:** A verifier cannot rely on an immutable server-side calc ledger; reconstruction depends on stored `factor`/`gwp`/`emissions` on entry rows + current client/factor-sheet logic.

---

## 6. Results aggregation

**Canonical loader:** `loadEpaIpccResults(userId)`  
→ `src/features/emission-calculator/core/loaders/epaIpccResults.ts`  
→ used by `EpaIpccResultsScreen` and sidebar hydration.

**[FACT]** `UKResultsScreen` contains a **second, divergent** inline aggregation (and redirects EPA users away). Dead for UI, but still a drift risk if reused.

**[INFERENCE]** Live sidebar totals (component state) vs Results screen (DB reload) can disagree briefly after save / before hydration.

---

## 7. Framework separation (UK vs EPA)

| Mechanism | Used by |
|---|---|
| `emission_framework` column (`uk` / `epa` / legacy `uk_epa`) | Shared: `scope1_fuel_entries`, `scope1_refrigerant_entries` |
| Separate table names | EPA-only mobile/on-road/IPCC tables; UK passenger/delivery tables |

**[FACT]** Null `emission_framework` on fuel is treated as EPA (legacy).  
**[FACT]** Refrigerant EPA reads accept both `epa` and `uk_epa`.

---

## 8. Product integrations

- **Corporate vs FI:** Flaring/venting corporate-only; Facilitated emissions available to both (corporate note for FI use).  
- **Bank portfolio / counterparty:** `companyEmissionsContext` (sessionStorage, ~30 min TTL) → upsert `company_emissions`.  
- **Finance / facilitated wizard:** `esgWizardState` hand-off with scope totals.  
- **LCA mode:** Alternate questionnaire path vs manual category entry.

---

## 9. Enterprise practice scorecard

| Practice | Status | Comment |
|---|---|---|
| Versioned emission factors with citation / effective date | **Weak** | Sheets exist for many EPA categories; hardcoded GWP/defaults lack version stamps on rows |
| Wire refrigerant to `"EPA Refrigerant GWP"` | **Missing** | DB table present; UI hardcodes subset (some values may drift, e.g. R-404A) |
| Immutable calc audit trail | **Partial / dormant** | Entry rows store factor+emissions; `emission_activities` path not the default production truth |
| Preparer / reviewer attestation | **Missing** | No lock / sign-off workflow |
| Double-count prevention | **Missing** | Overlap clusters possible (see §10) |
| Uncertainty / data-quality score | **Partial** | Refrigerant has measured vs estimate; facilitated has DQ score; not module-wide |
| Visible factor-fallback warning | **Missing** | Kitchen/power/vehicular can silently use defaults |
| Separation of calc vs UI | **Weak** | Large monolith screens |
| Single results aggregator | **Partial** | Canonical loader exists; duplicate logic still in UK results file |
| Auth / CORS for API | **Ops risk** | Production login requires Railway CORS allowlist for `https://www.rethinkcarbon.io` |

---

## 10. Double-count / misclassification risks

| Risk | Type | Notes |
|---|---|---|
| Fuel ↔ Heat and Steam (S1) | Same factors, different result tables | Same form; user can enter same burn twice |
| Mobile Fuel ↔ On-Road* ↔ Non-Road ↔ Vehicular IPCC | Different factor sheets & tables | Same fleet activity can be entered multiple ways |
| Kitchen / Power / Heating ↔ Fuel | Mixed EPA + IPCC | Same NG/diesel physical use can be double-entered |
| S1 Heat Steam ↔ S2 Heat Steam | Naming confusion | Purchased vs on-site; tables are correctly separate |
| On-Road CH4/N2O-only vs full CO2e Mobile Fuel | Methodology mix | Not interchangeable; easy to misuse |

These are **not** shared factor-DB bugs for mobile (sheets differ). They are **inventory process** risks without guardrails.

---

## 11. What is already professionally sound

1. Clear Scope 1 / 2 / 3 navigation and category coverage aligned to GHG Protocol-style inventory.  
2. EPA mobile/on-road/non-road use **distinct official-style factor sheets**.  
3. Persistence split by category (and framework on shared tables).  
4. Refrigerant UX: AC vs other systems + measured vs estimate path.  
5. Results loader consolidates many tables into one EPA/IPCC report view.  
6. Calc API bridge designed for future server-side authority.  
7. Corporate gating for oil & gas–relevant flaring/venting.

---

## 12. Prioritized change list

### P0 — Correctness & assurance

1. Wire EPA refrigerant GWP to `"EPA Refrigerant GWP"` (or equivalent governed sheet); remove / shadow hardcoded map; stamp GWP source on save.  
2. Stamp every saved row with **factor source** (`sheet_name` / `hardcoded_fallback` / version).  
3. Activate or replace dormant **server calc audit trail** for production.  
4. Remove or unify duplicate aggregation in `UKResultsScreen` EPA path.  
5. Normalize `emission_framework` values (`epa` vs `uk_epa`; null handling).  
6. Ensure Railway CORS includes `https://www.rethinkcarbon.io` and apex.

### P1 — Methodology quality

7. Cross-category overlap warnings (Fuel/Heat S1; mobile cluster; kitchen/power/heating vs Fuel).  
8. Visible UI warning when sheet load fails and defaults are used.  
9. Document methodology per tab (EPA GHGRP / IPCC tier / AR5 GWP) in-product.  
10. Align On-Road (CH4/N2O) guidance so users do not treat it as full CO2e substitute for Mobile Fuel.  
11. Version citations for flaring/venting constants.

### P2 — Maintainability

12. Split calc pure functions from `EpaCalculatorScreen` / `IpccCalculatorScreen`.  
13. Unit/parity tests for every Scope 1 formula (parity suite already exists for some calcs — expand).  
14. Formal preparer/reviewer attestation + period lock.  
15. Module-wide data-quality / measured-vs-estimated flags.

---

## 13. Suggested questions for the verifying professional

1. Are Fuel EPA 1/2/3 factors the intended GHGRP / EPA stationary combustion set for your reporting year?  
2. Should On-Road CH4/N2O tables be presented as **supplemental** (not full mobile CO2e)?  
3. Is hardcoded AR5-style refrigerant GWP acceptable, or must factors come from `"EPA Refrigerant GWP"` only?  
4. Should kitchen/heating/power remain IPCC-style fixed/default calculators, or migrate fully to Stationary Combustion sheets?  
5. What assurance level is required (internal inventory vs limited/reasonable assurance)? That drives P0 audit-trail priority.  
6. Should flaring/venting remain corporate-only and IPCC composition-based?

---

## 14. File index for reviewers

| Area | Path |
|---|---|
| EPA shell | `src/features/emission-calculator/methodologies/epa-ipcc/EpaCalculatorScreen.tsx` |
| IPCC embed | `src/features/emission-calculator/methodologies/epa-ipcc/IpccCalculatorScreen.tsx` |
| Refrigerant GWP | `src/features/emission-calculator/scope1/constants/epaRefrigerantGwp.ts` |
| Fuel EPA | `src/features/emission-calculator/scope1/components/FuelEmissions.tsx` |
| Results loader | `src/features/emission-calculator/core/loaders/epaIpccResults.ts` |
| Calc bridge | `src/api/calcConnection.ts`, `src/api/calc.ts` |
| Fuel table docs | `docs/EPA_FUEL_TABLES_REFERENCE.md` |
| Ref GWP migration | `db/migrations/0006_phase2b_move_ref_factor_tables.sql` |

---

*This brief describes the system as implemented in code. It is not a legal GHG Protocol assurance opinion. Methodology acceptance remains with the verifying professional and product owners.*

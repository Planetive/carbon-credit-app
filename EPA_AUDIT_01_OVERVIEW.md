# EPA emissions calculator — overview audit

Research only. Findings below are taken from the application code (routes, screens, calculation clients, and table names). Emission-factor values and formulas are not analyzed here.

The product labeled **EPA** is one corporate GHG calculator at `/emission-calculator-epa`. It is not a set of separate EPA apps. Scope 1 is activity-based and EPA-oriented. Scope 2 and Scope 3 are shared modules also used by the UK calculator. A large IPCC calculator still exists in the same folder, but the standalone IPCC route redirects into this EPA screen, and only flaring and venting are mounted in the current journey.

---

## 1. Where the calculator lives

| Surface | Route | Component | Role |
| --- | --- | --- | --- |
| Entry redirect | `/emission-calculator` | `EmissionCalculatorChoiceRedirect` | Always redirects to `/emission-calculator-epa` (query string kept). |
| EPA calculator | `/emission-calculator-epa` | `EpaCalculatorScreen` | The live EPA / IPCC inventory UI. Company-protected. |
| Old IPCC URL | `/emission-calculator-ipcc` | redirect | `Navigate` to `/emission-calculator-epa`. |
| Results | `/emission-results-calculator` | `EpaIpccResultsScreen` | Reads saved rows and shows Scope 1 / 2 / 3 totals, CSV, and PDF. |
| Old results URL | `/emission-results-epa-ipcc` | redirect | `Navigate` to `/emission-results-calculator`. |
| UK calculator | `/emission-calculator-uk` | `UKCalculatorScreen` | Separate DEFRA/UK calculator. Not the EPA product. |
| UK results | `/emission-results` | `UKResultsScreen` | If `?source=epa`, it immediately redirects to the EPA results route. |
| History questionnaire | `/emission-history` | `EmissionHistoryScreen` | Company profile plus optional “use the calculator” step. On continue it navigates to `/emission-calculator`, which then lands on EPA. |

Sidebar and header links point at `/emission-calculator-epa`.

**Choice screen is unused.** `CalculatorChoiceScreen` still offers EPA vs UK, but nothing imports it. The live `/emission-calculator` route does not show that choice.

**Auth.** The screen requires a logged-in user (`CompanyProtectedRoute` plus an in-screen login prompt).

---

## 2. How the code is organized

```
/emission-calculator-epa
  EpaCalculatorScreen                          shell, sidebar, totals, LCA gate
    Source screening                           Scope 1 gate
    StationaryCombustionSection → FuelEmissions
    VehiclesMobileSection                      local mobile assembly + EPA tables
    LeaksReleasesSection → EpaRefrigerantEmissions
    IndustrialOtherSection → IpccCalculatorScreen (embedded, flaring or venting only)
    ElectricityEmissions                       shared Scope 2
    HeatSteamEPAEmissions → HeatSteamEmissions (EBT, EPA storage table)
    Scope3Section                              shared Scope 3 (re-export)
```

Real implementations live under `src/features/emission-calculator/`. Files under `src/components/emissions/` are mostly one-line re-exports of those feature files. The EPA screen imports a few of them through the re-export path (`HeatSteamEPAEmissions`, `ElectricityEmissions`).

There is **no calculation server in this repository**. The browser calls:

- `src/api/calc.ts` — typed clients for `POST /api/v1/calc/...`
- `src/api/calcConnection.ts` — local math first; if JWT auth is on, it replaces the result with the API and falls back to local math on any API error
- `src/integrations/supabase/ghgEntryClient.ts` — saves and loads rows. With JWT auth it writes `app.emission_activities`. Otherwise it writes the legacy Supabase tables named in each component.

Scope 1 screening is stored in `localStorage` (`rc_scope1_screening_v1:{userId}`) and written through to `emission_calculator_preferences.scope1_screening` (see `db/migrations/0013_scope1_activity_screening.sql`).

---

## 3. User journey (verified from `EpaCalculatorScreen`)

1. User opens `/emission-calculator-epa` (directly, from the dashboard sidebar, or via `/emission-calculator` or `/emission-history`).
2. Preferences load from `loadCalculatorPreferences`. If `initial_questionnaire_completed` is already true, the app skips the gate and restores `calculation_mode` (`manual` or `lca`).
3. Otherwise the user sees `LCAQuestionnaire` with the initial question:
   - **No LCA data** → manual mode, Scope 1, category `scope1Screening`.
   - **Has LCA data** → LCA mode. The user types Scope 1, Scope 2, upstream, and downstream totals. Those rows persist to `scope3_lca_entries`.
   A header switch can move between LCA and manual. Switching clears the other mode’s in-memory totals and saves the preference.
4. **Manual mode** opens a three-scope sidebar.
5. **Scope 1 starts at source screening.** The user answers Yes/No for four activity groups. Forms for a group render only after every group is answered and that group was marked Yes (`isGroupVisible`). Until then, choosing Stationary, Vehicles, Leaks, or Industrial shows an empty content area. Sidebar items for “No” groups are hidden.
6. Inside a Yes group the user enters activity data, the form calculates kilograms, and Save writes rows. “Save and next” moves to the next sidebar category (then Scope 2, then Scope 3).
7. The left rail shows running Scope 1 / 2 / 3 totals. On first load (and after inventory changes) those totals are re-read from saved tables via `loadEpaIpccResults`. Company/portfolio context skips that DB hydrate.
8. **Results** in the sidebar goes to `/emission-results-calculator`. That page lists category totals, can open row detail, and can download CSV or a PDF (`exportFullEmissionReportPdf` with `fuelFramework: "epa"`). Edit returns to `/emission-calculator-epa`.
9. **Portfolio / wizard path.** If `sessionStorage` has `esgWizardState` or `companyEmissionsContext` (or the URL has `counterpartyId`), a fixed **Save & Return** / **Continue** button writes scope totals onto the company (`PortfolioClient.upsertCompanyEmissions`, `calculation_source: "emission_calculator"`, notes “Calculated using EPA emission calculator version”) and navigates back to finance emission or the stored return URL.

`EpaCalculatorScreen` also contains a `generatePDF` function that builds an EPA/IPCC report. Nothing in the JSX calls it. PDF download that users can reach is on the results screen.

---

## 4. Scope 1 — what the EPA screen actually shows

Scope 1 sidebar title: “Direct emission sources.”

| Calculator | Purpose (from UI copy and wiring) | Scope | Activities the form accepts | Status | Main source files |
| --- | --- | --- | --- | --- | --- |
| Source screening | Asks which of the four direct-source groups apply. Does not calculate emissions. | 1 | Stationary, vehicles/mobile, leaks, industrial/other. Statuses: not assessed, not applicable, applicable pending, calculated. | Fully implemented. Gates the other Scope 1 forms. | `src/features/emission-calculator/scope1/activity-based/components/SourceScreeningPanel.tsx`, `screeningStorage.ts`, `types.ts` |
| Stationary combustion | Fuel burned on site in generators, boilers, heaters, furnaces, cooking equipment, or other stationary equipment. Purchased heat is called out as Scope 2. | 1 | Equipment type plus fuel rows. Optional site, equipment ID, period. Factors from Fuel EPA 1/2/3 unless `factorMode="uk_supabase"` (EPA screen does not pass that). | Fully implemented and mounted. Saves `scope1_fuel_entries` with `emission_framework: "epa"`. | `StationaryCombustionSection.tsx` → `scope1/components/FuelEmissions.tsx` |
| Vehicles and mobile equipment | Fuel burned in company vehicles and mobile equipment. | 1 | Equipment kind (passenger car, light truck, heavy truck, bus, motorcycle, agricultural, construction, industrial non-road, lawn & garden, other). Data mode: fuel, distance, or both. Fuel type, quantity, unit, optional distance and efficiency. | Mounted and calculating. Saves new rows only (no in-form edit of old rows). Does **not** call `/api/v1/calc/epa/mobile-fuel`, `on-road-gasoline`, `on-road-diesel`, or `non-road`. Math is local in `assembleMobileActivityResult`. | `VehiclesMobileSection.tsx`, `calc/mobileRouting.ts`, `calc/units.ts` |
| Leaks and gas releases | GHGs from cooling equipment and other gas-containing systems. | 1 | Use case AC/HVAC or other. Method: measured leakage, or estimated leakage from charge and rate. Refrigerant type and equipment type. | Fully implemented and mounted. Fire-suppression and other industrial F-gases are listed as “Not covered here yet.” | `LeaksReleasesSection.tsx` → `EpaRefrigerantEmissions.tsx`, `constants/epaRefrigerantGwp.ts`, `calc/refrigerantGwpLoader.ts` |
| Industrial and other direct | Flaring, venting, and other direct sources. | 1 | Toggles for flaring and venting only. Each opens the embedded IPCC form. | Flaring and venting are mounted. Process emissions, wastewater, and agriculture are listed as not covered. | `IndustrialOtherSection.tsx` → `IpccCalculatorScreen.tsx` (`embedded`, `forcedCategory`) |
| Saved inventory (all four groups) | Lists previously saved rows for that group and can delete them. | 1 | Read/delete of legacy keys mapped in `legacyMapping.ts`. | Implemented. New vehicles rows appear after save because the parent refreshes from the database. | `LegacySavedInventory.tsx`, `legacyMapping.ts`, `core/loaders/epaIpccResults.ts` |

Screening “calculated” is set when a group reports a positive total (fuel, mobile, refrigerant) or when flaring/venting totals are greater than zero.

### Scope 1 equipment lists (from `types.ts`)

**Stationary equipment:** generator / power, boiler, heater, furnace, cooking / kitchen, other stationary.

**Mobile equipment and the distance sheet the planner picks:**

| Equipment | Road class | Distance sheet |
| --- | --- | --- |
| Passenger car, light-duty truck/SUV/van, motorcycle | on-road | On-Road Gasoline (diesel/CNG/LNG labels switch the sheet to On-Road Diesel & Alt Fuel) |
| Heavy-duty truck, bus | on-road | On-Road Diesel & Alt Fuel (gasoline-like labels switch to On-Road Gasoline) |
| Agricultural, construction, industrial non-road, lawn & garden, other mobile | non-road | Non-Road Vehicle |

Fuel CO₂ is loaded from factor sheets named `Mobile Combustion` / `mobile_combustion`. Distance CH₄/N₂O come from the sheet named above. Persistence splits CO₂ onto `scope1_epa_mobile_fuel_entries` and supplementary CH₄/N₂O CO₂e onto the matching on-road or non-road table so the two are not both stored as the full total.

### Scope 1 EPA forms that exist but are not on the current screen

These components calculate, draft to `sessionStorage`, and CRUD their tables. No screen imports them except a re-export file. The current vehicles page replaced them. Their tables are still read into sidebar and results totals, including rows the new vehicles form inserts.

| Component | What it measures | Entry table | API helper (only if that component runs) |
| --- | --- | --- | --- |
| `MobileFuelEmissions` | Mobile fuel quantity × EPA mobile fuel factor | `scope1_epa_mobile_fuel_entries` | `resolveEpaMobileFuelEmissionsKg` → `POST /api/v1/calc/epa/mobile-fuel` |
| `OnRoadGasolineEmissions` | On-road gasoline distance by vehicle type and model year | `scope1_epa_on_road_gasoline_entries` | `POST /api/v1/calc/epa/on-road-gasoline` |
| `OnRoadDieselAltFuelEmissions` | On-road diesel and alternative-fuel distance | `scope1_epa_on_road_diesel_alt_fuel_entries` | `POST /api/v1/calc/epa/on-road-diesel` |
| `NonRoadVehicleEmissions` | Non-road vehicle fuel quantity | `scope1_epa_non_road_vehicle_entries` | `POST /api/v1/calc/epa/non-road` |

`EpaCalculatorScreen` still has state and handlers for those four row sets (`handleOnRoadGasolineDataChange` and the diesel/non-road twins). Nothing in the render tree calls those handlers. Totals for those keys are filled by `refreshSummaryFromDb`.

### Scope 1 heat-and-steam variant (not mounted)

`FuelEmissions` supports `variant="scope1HeatSteam"`, which would save `scope1_heatsteam_entries_epa`. No caller passes that variant. The table is still created (`supabase/migrations/20250209100000_create_scope1_heatsteam_entries_epa.sql`) and `loadEpaIpccResults` still adds its emissions into Scope 1 as “Heat & Steam Scope 1 (legacy).” `handleScope1HeatSteamDataChange` is also unused.

Purchased heat on the live EPA screen is Scope 2 (next section), table `scope2_heatsteam_entries_epa`.

---

## 5. Scope 2

Sidebar title: “Indirect emissions from purchased energy.”

| Calculator | Purpose | Activities | Status | Persistence | Source |
| --- | --- | --- | --- | --- | --- |
| Electricity | Purchased electricity: grid share, renewable share, and optional other fuel sources. | Total kWh, grid country, grid %, renewable %, other %. Grid countries in the built-in map are UAE and Pakistan. | Mounted and saving. **The EPA screen does not pass `factorLibrary="EPA"`.** Grid uses `SCOPE2_FACTORS.GridCountries` in `EmissionFactors.ts`. Other-source rows use the built-in `FACTORS` map and `quantity * factor`. The Fuel EPA 1/2/3 loader inside this component runs only when `factorLibrary` is `"EPA"`, which the finance forms set and this screen does not. | `scope2_electricity_main`, `scope2_electricity_subanswers` | `scope2/components/ElectricityEmissions.tsx` |
| Heat and steam | Purchased heat and steam. Wrapper comment says it locks the shared form to the EPA/EBT standard. | Activity type from the “heat and steam EBT” factor sheet, gas (CO₂, CH₄, or N₂O), quantity (base unit or MMSCF when the base unit is mmBtu). Standard selector is locked to `EBT`. | Mounted and saving. Calculation can call `POST /api/v1/calc/heat-steam` through `resolveHeatSteamEmissionsKg`. | `scope2_heatsteam_entries_epa` | `HeatSteamEPAEmissions.tsx` → `scope2/components/HeatSteamEmissions.tsx` (`forcedStandard="EBT"`, `storageVariant="epa"`) |

`HeatSteamEPAEmissions` lives under `scope1/components` and its file comment says “Scope 1 (EPA calculator) wrapper,” but `EpaCalculatorScreen` renders it only when `activeScope === "scope2"` and `activeCategory === "heatSteam"`, and the total is stored on the Scope 2 card (`id: "heat-total"`).

`Scope2Shell.tsx` is an older combined electricity + heat form. It is re-exported as `Scope2Emissions` and is not imported by any route or by the EPA screen.

---

## 6. Scope 3

Sidebar title: “Value chain emissions (same as main calculator).” The EPA screen and the UK screen both render `Scope3Section`. These categories are part of the EPA journey. They are not separate EPA-methodology calculators. Their calc clients in `calc.ts` are generic (`/api/v1/calc/waste`, `freight`, `spend-based`, and so on), not `/api/v1/calc/epa/*`.

Upstream and downstream groups in the sidebar start collapsed.

| Sidebar category | GHG-style category | What the form collects | Calculation | Save | Status |
| --- | --- | --- | --- | --- | --- |
| Purchased goods & services | Cat. 1 | Supplier and amount spent | `amount × supplier.emission_factor`, optional `resolveSpendBasedEmissionsKg` | `scope3_purchased_goods_services` | Implemented |
| Capital goods | Cat. 2 | Supplier and amount | Same spend-based pattern | `scope3_capital_goods` | Implemented |
| Fuel & energy related activities | Cat. 3 | Extraction, distance, refining, and an emissions number the user types | No factor lookup in this form. Emissions field placeholder is “Enter emissions.” | `scope3_fuel_energy_activities` | Partial: persisted, but the emissions figure is manual |
| Upstream transportation | Cat. 4 | Vehicle type, distance, weight | `co2_factor × distance × weight`, optional `resolveFreightEmissionsKg` | `scope3_upstream_transportation` | Implemented |
| Waste generated | Cat. 5 | Material, disposal method, volume | Waste factor lookup, optional `resolveWasteEmissionsKg` | `scope3_waste_generated` | Implemented |
| Business travel | Cat. 6 | Travel mode and distance | Distance × travel-type CO₂ factor, optional `resolveBusinessTravelEmissionsKg` | `scope3_business_travel` | Implemented |
| Employee commuting | Cat. 7 | Mode, employees, distance | Optional `resolveEmployeeCommutingEmissionsKg` | `scope3_employee_commuting` | Implemented |
| Upstream leased assets | Cat. 8 | Buildings, transport, equipment, infrastructure (electricity, transport, refrigerant sub-forms) | In-component totals; leased calc helpers exist (`/api/v1/calc/leased/...`) | Save buttons toast “saved (frontend only for now).” | UI calculates; persistence is not implemented |
| Downstream transportation | Cat. 9 | Same pattern as upstream | Freight factor × distance × weight | `scope3_downstream_transportation` | Implemented |
| Processing / use of sold products | Cat. 10 and 11 | Product type, then processing and/or use-phase rows | Quantity × factor, plus an electricity path for use-phase | `scope3_processing_sold_products`, `scope3_use_of_sold_products` | Implemented |
| End-of-life treatment | Cat. 12 | Material and disposal, same waste types as Cat. 5 | Waste factor path | `scope3_end_of_life_treatment` | Implemented |
| Downstream leased assets | Cat. 13 | Same `LeasedAssetsSection` with `type` downstream | Same as Cat. 8 | Same frontend-only save toasts | UI calculates; persistence is not implemented |
| Franchises | Cat. 14 | Franchise details, operational practices, energy consumption (text/number fields) | Sets `emissions: 0` | In-memory `emissionData` only. No table write. | UI-only. Does not affect a real emissions total. |
| Investments | Cat. 15 | Equity % of investee emissions, or financed emissions linked from portfolio calculations | Attribution from entered emissions and percentage, or copied financed emissions | `scope3_investments` | Implemented as data entry / attribution, not an EPA factor calculator |
| Facilitated emissions | (labeled in the sidebar as underwriting, advisory, or other facilitated emissions) | Activity label and emissions, optional link to a portfolio calculation | User-entered or copied emissions | `scope3_facilitated_emissions` | Implemented as data entry |

`loadEpaIpccResults` rolls up every Scope 3 table above except leased assets and franchises. Those two therefore do not appear in the results totals even if the user filled them in during the session (franchises are in React state with zero emissions; leased assets are not written to a table).

Orchestration file: `src/components/emissions/scope3/Scope3Section.tsx` (re-exported by `src/features/emission-calculator/scope3/Scope3Section.tsx`). Category UIs live under `src/features/emission-calculator/scope3/categories/`.

---

## 7. IPCC content inside the EPA product

`/emission-calculator-ipcc` does not open `IpccCalculatorScreen`. That screen is only imported by `IndustrialOtherSection`, with `embedded` and `forcedCategory` of `"flaring"` or `"venting"`. In embedded mode its own sidebar is hidden, so the user cannot switch to the other IPCC categories from the EPA UI.

The same file still implements these categories. They are unreachable from the current EPA sidebar. If old rows exist, results still add the Scope 1 ones listed as historical.

| Category id | Label in IPCC sidebar / meta | Entry table read by EPA results | Reachable from EPA UI now |
| --- | --- | --- | --- |
| `flaring` | Flaring | `ipcc_scope1_flaring_entries` | Yes, under Industrial and Other |
| `venting` | Venting | `ipcc_scope1_venting_entries` | Yes, under Industrial and Other |
| `stationaryFuelCombustion` | Stationary fuel combustion (IPCC chapter factors) | not in the EPA results loader as its own key | No |
| `vehicularCarbonFootprints` | Diesel and petrol litres | `ipcc_scope1_vehicular_entries` | No (historical totals only) |
| `kitchenFootprints` | LPG and natural gas | `ipcc_scope1_kitchen_entries` | No (historical totals only) |
| `powerFuelConsumption` | Diesel and natural gas for power | `ipcc_scope1_power_entries` | No (historical totals only) |
| `heatingFootprints` | Natural gas heating | `ipcc_scope1_heating_entries` | No (historical totals only) |
| `energyIndustries` | IPCC chapter 2 energy industries | not in the EPA results category list | No |
| `scope3ModeSelection` | Tier 1 / 2 / 3 mode picker | — | No |
| `roadTransport`, `roadTransportVehicleType`, `usaGasolineDieselVehicles`, `alternativeFuelVehicles` | Road and vehicle factor forms inside the same file | not in the EPA results category list | No. They are not even items on the IPCC sidebar array; they render only if `activeCategory` is set to those ids, and the current EPA embed never does that. |

API clients for these IPCC forms exist in `src/api/calc.ts` (`/api/v1/calc/ipcc/flaring`, `venting`, `stationary`, `vehicular`, `kitchen`, `power`, `heating`, `road`, `road-vehicle`, `usa-vehicles`, `alt-fuel`, `industry`) and are wrapped in `calcConnection.ts`.

---

## 8. Backend endpoints the EPA UI can hit

Called only when `USE_JWT_AUTH` is on. Local math is used when the flag is off or the request fails. This audit does not inspect the server implementation; it is not in this repo.

| Client | Path | Used by the live EPA screen? |
| --- | --- | --- |
| `calcEpaFuel` | `POST /api/v1/calc/epa/fuel` | Yes, via `FuelEmissions` when framework is EPA (stationary combustion). |
| `calcEpaRefrigerant` | `POST /api/v1/calc/epa/refrigerant` | Yes, via `EpaRefrigerantEmissions`. |
| `calcEpaMobileFuel` | `POST /api/v1/calc/epa/mobile-fuel` | No. Only the unmounted `MobileFuelEmissions` calls it. The mounted vehicles form calculates locally. |
| `calcEpaOnRoadGasoline` | `POST /api/v1/calc/epa/on-road-gasoline` | No. Unmounted `OnRoadGasolineEmissions` only. |
| `calcEpaOnRoadDiesel` | `POST /api/v1/calc/epa/on-road-diesel` | No. Unmounted `OnRoadDieselAltFuelEmissions` only. |
| `calcEpaNonRoad` | `POST /api/v1/calc/epa/non-road` | No. Unmounted `NonRoadVehicleEmissions` only. |
| `calcHeatSteam` | `POST /api/v1/calc/heat-steam` | Yes, Scope 2 heat and steam. |
| `calcElectricity` | `POST /api/v1/calc/electricity` | Yes, if JWT auth is on, from shared electricity save/calc path. |
| `calcIpccFlaring`, `calcIpccVenting` | `POST /api/v1/calc/ipcc/flaring`, `.../venting` | Yes, when those toggles are on. |
| Other `calcIpcc*` | various `/api/v1/calc/ipcc/...` | Only if the unmounted IPCC categories run. |
| Scope 3 helpers | `/api/v1/calc/waste`, `freight`, `business-travel`, `employee-commuting`, `spend-based`, `sold-products/*`, `leased/*` | Scope 3 sections call the matching `resolve*` helpers when JWT auth is on. Leased save is still frontend-only, so leased API results are not stored. |

`src/api/calc.ts` comments the electricity, refrigerant, freight, travel, spend, sold-products, and leased clients as “UI not wired yet.” That comment is stale for several of them: electricity, EPA refrigerant, freight, travel, commuting, spend-based, and sold-products are imported from `calcConnection.ts` and used by the sections above. Leased clients are imported by `calcConnection.ts`; the leased UI’s save path does not persist.

---

## 9. Database tables tied to this calculator

Entry rows (legacy Supabase names; JWT mode mirrors them into `app.emission_activities` through `ghgEntryClient`):

| Table | Written by current EPA UI | Read into EPA totals |
| --- | --- | --- |
| `scope1_fuel_entries` (`emission_framework` epa or null) | Yes, stationary | Yes |
| `scope1_epa_mobile_fuel_entries` | Yes, vehicles form (insert) | Yes |
| `scope1_epa_on_road_gasoline_entries` | Yes, vehicles form when a distance sheet applies (insert) | Yes |
| `scope1_epa_on_road_diesel_alt_fuel_entries` | Yes, same | Yes |
| `scope1_epa_non_road_vehicle_entries` | Yes, same | Yes |
| `scope1_refrigerant_entries` (`emission_framework: "epa"`) | Yes, leaks | Yes (`listRefrigerantEpaRows`) |
| `scope1_heatsteam_entries_epa` | No current caller | Yes, as legacy Scope 1 heat |
| `ipcc_scope1_flaring_entries`, `ipcc_scope1_venting_entries` | Yes, if those toggles are used | Yes |
| `ipcc_scope1_vehicular_entries`, `kitchen`, `power`, `heating` | No current EPA form | Yes, labeled historical |
| `scope2_electricity_main`, `scope2_electricity_subanswers` | Yes | Yes |
| `scope2_heatsteam_entries_epa` | Yes | Yes |
| Scope 3 tables listed in section 6 | As noted per category | All except leased and franchises |
| `scope3_lca_entries` | Yes, in LCA mode | Used for LCA sidebar totals inside the calculator. The EPA results loader’s category list in `epaIpccResults.ts` does not include an LCA key. |
| `emission_calculator_preferences` | Yes (mode, LCA flag, `scope1_screening`) | Screening reload |

Factor sheets (read, not entry storage): `Fuel EPA 1`, `Fuel EPA 2`, `Fuel EPA 3`; `Mobile Combustion`; `On-Road Gasoline`; `On-Road Diesel & Alt Fuel`; `Non-Road Vehicle`; `heat and steam EBT`. Names are the strings passed to the factor loaders.

---

## 10. Fully implemented vs partial vs unused

### Mounted and able to calculate and save

- Source screening
- Stationary combustion (Fuel EPA factors, `scope1_fuel_entries`)
- Vehicles and mobile equipment (local assembly, EPA mobile/on-road/non-road tables, insert plus delete-from-inventory)
- Refrigerant leaks (two methods, EPA GWP table with built-in fallback)
- Flaring and venting (embedded IPCC)
- Scope 2 electricity (with the factor-library caveat in section 5)
- Scope 2 purchased heat and steam (EBT sheet, EPA table)
- Scope 3 categories 1, 2, 4, 5, 6, 7, 9, 10, 11, 12, 15, and facilitated emissions
- Results page (totals, detail rows, CSV, PDF)
- LCA questionnaire path (manual totals, not an activity calculator)

### Mounted but partial

- Scope 3 fuel & energy activities: form and table exist; emissions are typed by the user.
- Scope 3 upstream and downstream leased assets: detailed forms and in-memory totals; save is an explicit “frontend only” toast.
- Scope 3 franchises: form only, emissions forced to 0, no database table.
- Industrial “other” beyond flaring/venting: copy says not covered; no form.
- Leaks beyond refrigerants: copy says not covered; no form.
- In-calculator `generatePDF`: implemented function, no button.

### Implemented components not mounted on the EPA screen

- `MobileFuelEmissions`, `OnRoadGasolineEmissions`, `OnRoadDieselAltFuelEmissions`, `NonRoadVehicleEmissions`
- `FuelEmissions` variant `scope1HeatSteam`
- Full `IpccCalculatorScreen` sidebar (stationary IPCC fuel, vehicular, kitchen, power, heating, energy industries, Scope 3 tier picker, road/vehicle forms)
- `CalculatorChoiceScreen`
- `Scope1Shell` (older combined fuel / UK refrigerant / passenger / delivery form; UK factors)
- `Scope2Shell` (older combined electricity and heat form)

`Scope1Shell` and the UK passenger, delivery, and UK refrigerant components are used by `UKCalculatorScreen`, not by the EPA screen.

### Adjacent, not this calculator

`src/features/finance-emissions/` is a separate financed-emissions module. It reuses `ElectricityEmissions` and **does** pass `factorLibrary` (`"EPA"` by default) so that path loads Fuel EPA 1/2/3. Motor-vehicle loan helpers also refer to EPA mobile-fuel factors. That module is not routed through `/emission-calculator-epa` and is outside this inventory.

---

## 11. File index

| Area | Path |
| --- | --- |
| Routes | `src/App.tsx` |
| EPA shell | `src/features/emission-calculator/methodologies/epa-ipcc/EpaCalculatorScreen.tsx` |
| IPCC screen (mostly unmounted) | `src/features/emission-calculator/methodologies/epa-ipcc/IpccCalculatorScreen.tsx` |
| IPCC labels | `src/features/emission-calculator/methodologies/epa-ipcc/categoryMeta.ts` |
| Unused methodology picker | `src/features/emission-calculator/core/screens/CalculatorChoiceScreen.tsx` |
| Live entry redirect | `src/features/emission-calculator/core/screens/EmissionCalculatorChoiceRedirect.tsx` |
| Results loader | `src/features/emission-calculator/core/loaders/epaIpccResults.ts` (re-exported from `src/lib/epaIpccResults.ts`) |
| Results UI | `src/features/emission-calculator/results/EpaIpccResultsScreen.tsx` |
| Scope 1 activity UI | `src/features/emission-calculator/scope1/activity-based/` |
| Scope 1 factor forms | `src/features/emission-calculator/scope1/components/` |
| Scope 2 forms | `src/features/emission-calculator/scope2/components/` |
| Scope 3 orchestration | `src/components/emissions/scope3/Scope3Section.tsx` |
| Scope 3 category UIs | `src/features/emission-calculator/scope3/categories/` |
| Calc HTTP client | `src/api/calc.ts` |
| Local-then-API wrappers | `src/api/calcConnection.ts` |
| Row persistence | `src/integrations/supabase/ghgEntryClient.ts` |
| Re-export shims | `src/components/emissions/**` |

---

## 12. Limits of this audit

- Factor numbers, GWP tables, and equation steps were not reviewed. A later audit should cover Fuel EPA sheets, mobile/on-road/non-road sheets, refrigerant GWP, EBT heat-and-steam factors, and the local functions in `calcConnection.ts` versus `mobileRouting.ts`.
- Whether `/api/v1/calc/epa/*` is deployed and matches the client was not checked. This repo only contains the client.
- Supabase row contents were not queried. “Historical” means the results loader still sums that table and the current EPA sidebar does not open a form that writes it.

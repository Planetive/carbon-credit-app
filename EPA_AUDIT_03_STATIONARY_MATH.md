# EPA Scope 1 stationary combustion — calculation audit

Research only. This covers the math used when `StationaryCombustionSection` renders `FuelEmissions` in EPA mode (`factorMode` defaults to `"epa"`).

Functions inspected:

- `localEpaFuelEmissionsKg` and `resolveEpaFuelEmissionsKg` in `src/api/calcConnection.ts`
- `updateRow` and `resolveRowEmissionsForSave` in `src/features/emission-calculator/scope1/components/FuelEmissions.tsx`
- `buildEpaFuelFactorsMap` in the same file
- `legacyPayloadToActivityFields` and `activityToLegacyRow` in `src/integrations/supabase/ghgEntryClient.ts`
- The frontend mirror `spaEpaFuel` in `parity/spaMath.ts` and the explicit-factor cases in `parity/cases.json`

No server implementation of `POST /api/v1/calc/epa/fuel` is in this repository. A read of the live Fuel EPA tables failed (`tenant/user postgres.yhticndmpvzczquivpfb not found`). Sheet rows for natural gas and diesel are therefore not available here.

---

## 1. Exact calculations

### 1.1 Formula

For one fuel row, after a numeric factor has been chosen:

```
raw = quantity × factor
if unit starts with "CH4" or unit starts with "N2O":
    emissions = round6(raw / 1000)
else:
    emissions = round6(raw)
```

`round6` is `Number(n.toFixed(6))`.

That is the whole local formula. Source: `localEpaFuelEmissionsKg` (`src/api/calcConnection.ts`, lines 140–149). The parity mirror `spaEpaFuel` (`parity/spaMath.ts`, lines 16–27) is the same expression and its comment says it matches the EPA branch in `FuelEmissions.tsx`.

There is no other term: no heating value at calculation time, no unit conversion of `quantity`, no GWP, no sum across gases.

### 1.2 When it runs

`updateRow` (`FuelEmissions.tsx`, lines 827–906), EPA branch:

1. If `type`, `fuel`, and `unit` are all set, `factor = effectiveFactors[type][fuel][unit]`.
2. If `quantity` and `factor` are both numbers, `emissions = localEpaFuelEmissionsKg(quantity, factor, unit)`.
3. Otherwise `emissions` is cleared.
4. If `USE_JWT_AUTH` is on and quantity, factor, and unit are set, `resolveEpaFuelEmissionsKg` is called and may replace `emissions`.

`resolveRowEmissionsForSave` (lines 944–965) always calls `resolveEpaFuelEmissionsKg` for EPA rows. Save writes that return value into `emissions`. It does not keep the number already on the row if the resolver returns something else.

`resolveEpaFuelEmissionsKg` (lines 214–228):

1. Computes `local = localEpaFuelEmissionsKg(quantity, factor, unit)`.
2. If JWT auth is off, returns `local`.
3. If JWT auth is on, `POST /api/v1/calc/epa/fuel` with `quantity`, `factor`, `unit`, `category` (the Type dropdown), and `fuel`.
4. `kgFrom` (`calcConnection.ts`, lines 74–77) uses `response.emissions_kg`, otherwise `response.emissions`, otherwise `local`. It does not read `emissions_tco2e`.
5. On any API error, it returns `local`.

`FuelEmissions` does not pass `persist: true` into this call. Saving the row is a separate `insertLegacyTableEntries` / `updateLegacyTableEntry`.

### 1.3 How quantity, factor, and unit are interpreted

| Input | Meaning in this formula |
| --- | --- |
| `quantity` | Number typed in Quantity. It is not converted. Its unit is whatever the selected factor label says after the slash (`mmBtu`, `MMSCF`, `gallon`, `short ton`). |
| `factor` | The number stored under that type/fuel/unit label. The user cannot type it. |
| `unit` | The dropdown label. The formula does not parse `mmBtu`, `gallon`, `MMSCF`, or `short ton`. It only checks whether the string starts with `CH4` or `N2O`. |

So:

- `CO2 (kg CO2 / mmBtu)` → `quantity` is treated as mmBtu, `factor` as kg CO₂ per mmBtu, result is kg CO₂.
- `CO2 (kg CO2 / gallon)` → `quantity` is gallons, result is kg CO₂.
- `CO2 (kg CO2 / short ton)` → `quantity` is short tons of fuel, result is kg CO₂.
- `CO2 (kg CO2 / MMSCF)` → `quantity` is MMSCF, result is kg CO₂. The MMSCF factor was already scaled when the map was built (section 2).
- `CH4 (g CH4 / …)` → `quantity × factor` is grams of CH₄, then `/ 1000` yields kilograms of CH₄.
- `N2O (g N2O / …)` → same, kilograms of N₂O.

The prefix test is only `startsWith("CH4")` or `startsWith("N2O")`. The formula does not look for the letters `g` or `kg` inside the label. A label that started with `CH4` but was actually kg CH₄ per unit would still be divided by 1000. The map builder always writes the CH₄ and N₂O labels with a `g` in them (section 2).

### 1.4 Gases, GWP, and what one entry calculates

One dropdown unit is one gas. Choosing `CO2 (kg CO2 / mmBtu)` does not also calculate CH₄ or N₂O. Covering all three gases means three rows, each with its own unit and the same or another quantity.

CH₄ and N₂O are not multiplied by a GWP in `localEpaFuelEmissionsKg`, `resolveEpaFuelEmissionsKg`, `updateRow`, or `buildEpaFuelFactorsMap`. A search of `FuelEmissions.tsx` finds no GWP constant. `REFRIGERANT_FACTORS` in `EmissionFactors.ts` has methane `28` and nitrous oxide `265`, and the mobile calculator uses AR5 100-year values, but those modules are not called from this formula.

The row total on screen is the sum of each row’s `emissions` (`FuelEmissions.tsx`, line 1206). A CO₂ row and a CH₄ row are added as plain numbers. They are not converted to a common CO₂e basis first.

### 1.5 Unit of the stored `emissions` value

`emissions` is the `round6` result above.

- CO₂ unit labels: kilograms of CO₂.
- CH₄ unit labels: kilograms of CH₄ (grams ÷ 1000), not kg CO₂e.
- N₂O unit labels: kilograms of N₂O, not kg CO₂e.

The fuel-step total is labeled `Total Fuel Emissions:` plus the output-unit word (`kg`, `tonnes`, `g`, or `short ton`). That output control does not change `emissions`. `convertEmission` / `convertEmissionNumeric` (`FuelEmissions.tsx`, lines 488–529) only rescale the already computed number for display and for `emissions_output`:

| Output unit | Display / `emissions_output` |
| --- | --- |
| `kg` | value |
| `tonnes` | value / 1000 |
| `g` | value × 1000 |
| `short_ton` | value / 907.18474 |

`907.18474` is kilograms per short ton, applied to the emission mass, not to the fuel quantity. The fuel-unit label `short ton` and the output label `short ton` are different fields.

The stationary inventory panel prints the same stored number as `kg CO₂e` (`LegacySavedInventory.tsx`, the total next to “Already in your inventory”). That label is not produced by a CO₂e conversion in the fuel formula.

---

## 2. Factor selection

### 2.1 Where the map comes from

`ensureEpaFuelFactors` loads every row from Fuel EPA 1, then 2, then 3:

1. API datasets `fuel_epa_1` / `fuel_epa1`, `fuel_epa_2` / `fuel_epa2`, `fuel_epa_3` / `fuel_epa3`.
2. If that returns nothing, Supabase `"Fuel EPA 1"`, `"Fuel EPA 2"`, `"Fuel EPA 3"`, `select("*")`.

`buildEpaFuelFactorsMap` walks that combined list in order. Category is the first non-empty of `Category`, `category`, `Fuel Category`, `fuel_category`. Fuel is the first non-empty of `Fuel Type`, `Fuel`, `fuel_type`, `fuel`. Rows missing either are skipped.

There is no rule that prefers table 1 over table 2, and no match on equipment type. The dropdown value is `map[category][fuel][unitLabel]`. If a later row writes the same category, fuel, and unit label, it replaces that one label. Other labels already stored for that fuel stay. Last write for each label wins.

`EmissionFactors.ts` (`FACTORS`) is not read by `FuelEmissions`.

### 2.2 Which sheet columns become which dropdown labels

Per-mmBtu block (`FuelEmissions.tsx`, lines 157–188):

| Sheet test | Number copied | Dropdown label |
| --- | --- | --- |
| `CO2 Unit` contains `mmbtu` | `CO2 Factor` | `CO2 (kg CO2 / mmBtu)` |
| `CH4 Unit` contains `mmbtu` | `CH4 Factor` | `CH4 (g CH4 / mmBtu)` |
| `N20 Unit`, else `N2O Unit`, contains `mmbtu` | `N2O Factor` | `N2O (g N2O / mmBtu)` |

The CO₂ per-mmBtu number is used only when `CO2 Unit` contains `mmbtu` (`useFirstSetMmbtu`). CH₄ and N₂O are tested on their own unit strings.

The code does not check that the CO₂ unit says `kg` or that the CH₄/N₂O unit says `g`. Those words are hardcoded into the label whenever the unit string contains `mmbtu`, `short ton`, `scf`, or `gallon`.

Second-factor columns (`CO2 Factor_1`, `CH4 Factor_1`, `N2O Factor_1`, and the matching `*_Unit_1` strings), lines 166–218:

| `*_Unit_1` contains | Label | Arithmetic on the sheet number |
| --- | --- | --- |
| `short ton` | `CO2 (kg CO2 / short ton)`, `CH4 (g CH4 / short ton)`, or `N2O (g N2O / short ton)` | copied unchanged |
| `gallon` | same pattern per gallon | copied unchanged |
| `scf` | `… / MMSCF` | sheet number × 1,000,000, and only if that MMSCF label is not already set |

`N2O Unit_1` falls back to `N2O Unit` when `N2O Unit_1` is missing (`row["N2O Unit_1"] ?? row["N2O Unit"]`). CO₂ and CH₄ do not use that fallback. If the fallback string is a per-mmBtu unit, it will not contain `short ton`, `gallon`, or `scf`, so the per-fuel second factors stay unset. If that fallback string did contain one of those substrings, `N2O Factor_1` would be filed under that branch.

### 2.3 Conversions that happen before the multiply

Only the MMSCF labels are scaled inside the map builder.

When heat content parses and the HHV unit string contains `scf` (`isScfBasedHHV`):

```
kg CO2 / MMSCF  = (kg CO2 / mmBtu)  × HHV × 1,000,000
g CH4 / MMSCF   = (g CH4 / mmBtu)   × HHV × 1,000,000
g N2O / MMSCF   = (g N2O / mmBtu)   × HHV × 1,000,000
```

HHV is the first parsed value among `Heat Content (HHV)`, `Heat Content`, `HeatContent`, `heat_content_hhv`, `hhv`. The `× 1,000,000` treats that HHV number as heat per scf, so the product is heat and emissions per million scf. The code does not test whether the number is already per MMSCF.

If the HHV path did not set the MMSCF label, and `CO2 Unit_1` / `CH4 Unit_1` / the N₂O unit string contains `scf`, the corresponding `*_Factor_1` is multiplied by `1,000,000` and stored as per MMSCF. That assumes `*_Factor_1` is per scf.

No other unit conversion is applied to the factor. Gallon and short-ton numbers are stored as they appear in `*_Factor_1`. At calculation time, `quantity × factor` does not convert mmBtu to gallons or short tons. The user has to enter quantity in the unit named in the label they selected.

---

## 3. Inconsistencies

Status is **confirmed** when the stationary code path does the thing described, and **unverified** when the Fuel EPA cell values or the API server would be required.

### 3.1 Grams of CH₄ or N₂O treated as kilograms

**Confirmed for the built labels:** those labels start with `CH4` or `N2O`, so `localEpaFuelEmissionsKg` divides by 1000. A factor of `3.0` with quantity `100` and unit `CH4 (g CH4 / mmBtu)` is `0.3`, which `parity/cases.json` names `expected_emissions_kg`.

**Confirmed limitation:** the split is the prefix, not the word `g`. The builder hardcodes `g` into CH₄ and N₂O labels and `kg` into CO₂ labels without reading `g` or `kg` from the sheet unit. If a sheet’s CH₄ factor were already in kilograms while its unit text still contained `mmbtu`, the label would still say grams and the formula would divide by 1000. Whether the live sheets are grams or kilograms is **unverified** (tables not readable from here).

CO₂ is not divided by 1000. A CO₂ factor that was actually in grams would be multiplied as kilograms. That depends on the sheet and is **unverified**.

### 3.2 CO₂ confused with CO₂e

**Confirmed in the formula:** the result is kg of the one selected gas. No GWP is applied, and the three gases are not combined inside one entry.

**Confirmed in the sum:** `totalEmissions` adds every row’s `emissions`. kg CO₂ and kg CH₄ are added together.

**Confirmed in the inventory label:** `LegacySavedInventory` prints that mass as `kg CO₂e`. The fuel-step total does not say CO₂e. It says `Total Fuel Emissions` and the output unit.

`REFRIGERANT_FACTORS` methane `28` and nitrous oxide `265` are not inputs to this calculation.

### 3.3 Fuel-consumption units confused with factor units

**Confirmed:** quantity has no unit of its own. The selected label’s denominator is the only unit. Nothing converts a gallon quantity when the user switches the label to mmBtu; the new factor is applied to the same number.

**Confirmed:** MMSCF factors are a pre-scaled number (`× HHV × 1,000,000` or `× 1,000,000`). The runtime multiply does not know about HHV. If the HHV cell is per MMSCF rather than per scf, the factor is one million times too large. Scale of the HHV column is **unverified** without the rows.

**Confirmed:** `*_Factor_1` for `short ton` and `gallon` is copied with no kg/tonne or gallon/mmBtu conversion, then labeled `kg CO2` or `g CH4` / `g N2O`. Whether those sheet columns are already in those units is **unverified**.

**Confirmed, separate meanings of “short ton”:** the fuel unit `CO2 (kg CO2 / short ton)` means short tons of fuel in `quantity`. The output unit `short_ton` divides the kilogram result by `907.18474`.

### 3.4 `emissions_tco2e` versus the calculator unit

**Confirmed on the JWT write path.** `legacyPayloadToActivityFields` sets:

```
emissions_tco2e = first numeric among payload.emissions, payload.emissions_tco2e, payload.emissions_output
```

(`ghgEntryClient.ts`, line 165). The fuel save payload’s `emissions` is the kilogram-of-gas result from section 1. That number is copied into `emissions_tco2e` with no `/ 1000` and no GWP. `emissions_output` is not used when `emissions` is present, so choosing output unit `tonnes` does not change `emissions_tco2e`.

`app.emission_activities.emissions_tco2e` is `numeric(20, 8)` (`db/migrations/0009_phase4a_emission_assessments_activities.sql`, line 34). The backfill copies the same JSON `emissions` value into that column (lines 216–218). The migration does not divide by 1000.

On read, `activityToLegacyRow` prefers `raw.emissions` over `raw.emissions_tco2e` and `activity.emissions_tco2e` (lines 115–118). The fuel form and the results sum therefore reload the stored kilogram figure when `raw.emissions` is present. The column name still holds that kilogram figure.

The direct Supabase insert writes `emissions` on `scope1_fuel_entries`. That table has no `emissions_tco2e` column. The name mismatch applies to the activity API column, not to the legacy fuel table.

### 3.5 Local result versus backend result

**Unverified.** This repo has the client and a parity contract, not the server.

What the client will do is confirmed:

- JWT off: save and the on-screen value are both `localEpaFuelEmissionsKg`.
- JWT on and the API returns a finite `emissions_kg` or `emissions`: that number replaces the local value (`kgFrom`). `emissions_tco2e` on the calc response is ignored.
- JWT on and the request throws: the local value is kept.
- Save calls the resolver again. An output-unit-only save still recalculates `emissions` through the API for every existing row.

`parity/cases.json` records the frontend expectation for three explicit factors (not sheet lookups):

| Case | Quantity | Factor | Unit | `expected_emissions_kg` |
| --- | --- | --- | --- | --- |
| `epa_co2_mmbtu` | 100 | 53.06 | `CO2 (kg CO2 / mmBtu)` | 5306 |
| `epa_ch4_g_per_mmbtu_div1000` | 100 | 3.0 | `CH4 (g CH4 / mmBtu)` | 0.3 |
| `epa_n2o_g_per_gallon_div1000` | 50 | 0.2 | `N2O (g N2O / gallon)` | 0.01 |

`parity/BACKEND_BLIND_PROMPT.md` asks a backend to match those cases. It is a prompt, not an implementation. No stored API response in this repo shows that the server returns these numbers.

---

## 4. Worked examples

Fuel EPA 1/2/3 rows are not in the repository. The database that holds those tables could not be queried. `FACTORS` in `EmissionFactors.ts` includes names such as diesel and natural gas, but `FuelEmissions` does not load that object, and its units are not the EPA dropdown labels. Those numbers are not used below.

The only numeric factor cases compiled into this calculator’s tests are the three parity inputs. They are not natural-gas or diesel sheet rows. They do exercise the same function the stationary form calls.

### 4.1 CO₂, per mmBtu (`epa_co2_mmbtu`)

Not a named fuel. Factor `53.06` is the test constant, not a value read from Fuel EPA.

```
unit     = "CO2 (kg CO2 / mmBtu)"   # does not start with CH4 or N2O
raw      = 100 × 53.06 = 5306
emissions = 5306.000000   # kg CO2
```

Intermediate GWP step: none. This is kg CO₂, not a three-gas CO₂e total.

### 4.2 CH₄, grams per mmBtu (`epa_ch4_g_per_mmbtu_div1000`)

Not a named fuel. Factor `3.0` is the test constant.

```
unit      = "CH4 (g CH4 / mmBtu)"   # starts with CH4
raw       = 100 × 3.0 = 300        # grams CH4
emissions = 300 / 1000 = 0.300000  # kg CH4
```

GWP is not applied. `0.3` is kilograms of CH₄. It is not `0.3 × 28` kg CO₂e.

### 4.3 N₂O, grams per gallon (`epa_n2o_g_per_gallon_div1000`)

Not a named fuel. Factor `0.2` is the test constant. This is the third coded EPA-fuel case.

```
unit      = "N2O (g N2O / gallon)"  # starts with N2O
raw       = 50 × 0.2 = 10          # grams N2O
emissions = 10 / 1000 = 0.010000   # kg N2O
```

GWP is not applied.

### 4.4 Natural gas and diesel from the factor sheets

No natural-gas row and no diesel row from Fuel EPA 1, 2, or 3 could be read. A sheet-based example would require the category name, the fuel name, the CO₂ / CH₄ / N₂O factors, their unit strings, and the HHV if an MMSCF label is involved. Those cells are not in the code, and the database query did not run. No natural-gas or diesel CO₂e total is calculated here.

---

## 5. What was not verified

- The server body of `POST /api/v1/calc/epa/fuel`, including whether it divides CH₄/N₂O by 1000, applies a GWP, or returns tonnes in `emissions`.
- Actual Fuel EPA 1/2/3 cells: gas units (`kg` vs `g`), HHV per scf vs per MMSCF, and gallon / short-ton column units.
- Whether a given fuel’s CO₂, CH₄, and N₂O labels are all created. That depends on which unit strings are on that row.

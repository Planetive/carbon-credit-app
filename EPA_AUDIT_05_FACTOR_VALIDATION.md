# EPA Stationary Combustion — factor-loader validation

Research only. No code and no database records were changed. The loader is `buildEpaFuelFactorsMap` and `parseFactorNumber` in `src/features/emission-calculator/scope1/components/FuelEmissions.tsx`. Dropdown units are the keys of that map (`unitsFor`, same file).

Factor values are the live pgAdmin rows confirmed in `EPA_AUDIT_04_FACTOR_SOURCES.md` (17 + 7 + 39). The numeric results below were produced by running the same `parseFactorNumber` rules and the same MMSCF formula in JavaScript.

## 1. Numeric parsing

`parseFactorNumber` (lines 125–131):

- A finite number is kept as a number.
- `null` and `undefined` become `undefined`.
- Any other value is turned into a string, every comma is removed, then `parseFloat` is used. `parseFloat` skips leading whitespace and stops at trailing whitespace.
- A blank string, a whitespace-only string, or a non-numeric string becomes `undefined`.

Checked against the live text and number shapes:

| Input | Result | In the live tables |
| --- | --- | --- |
| `" 2,602 "` | `2602` | Fuel EPA 1, `CO2 Factor_1` |
| `" 276 "` | `276` | Fuel EPA 1, `CH4 Factor_1` |
| `" 1,096 "`, `" 1,216 "` | `1096`, `1216` | Other Fuel EPA 1 comma strings, same rule |
| `53.06`, `0.001026`, `0.0001`, `40` | unchanged | double precision and small bigint cells |
| `"0.05444"` | `0.05444` | if a numeric cell arrives as a string |
| `null`, `""`, `"   "` | `undefined` | Fuel EPA 3 kraft rows: null HHV and null `*_Factor_1` |

Comma removal is required. Without it, `parseFloat(" 2,602 ")` returns `2`, not `2602`.

Null does not become zero. A null second factor is omitted from the map, so that dropdown unit is not created.

Classification: **Correct** for commas, whitespace, nulls, decimals, and numeric strings in these 63 rows.

Not exercised by these rows: a European decimal comma (`1,5` would become `15` after comma removal), and trailing junk after a number (`parseFloat` would keep the leading number). Neither shape is in the live cells.

## 2 and 3. Gas mapping and physical units

The map key is the unit the dropdown shows. The stored number is the factor for one quantity in that unit. Nothing here converts CO₂, CH₄, or N₂O into CO₂e.

How a column is accepted:

| Dropdown key | Gate | Transformation |
| --- | --- | --- |
| `CO2 (kg CO2 / mmBtu)` | `CO2 Unit` contains `mmbtu` | `CO2 Factor`, unchanged |
| `CH4 (g CH4 / mmBtu)` | `CH4 Unit` contains `mmbtu` | `CH4 Factor`, unchanged |
| `N2O (g N2O / mmBtu)` | `N20 Unit`, otherwise `N2O Unit`, contains `mmbtu` | `N2O Factor`, unchanged |
| `CO2/CH4/N2O (... / short ton)` | the `_1` unit contains `short ton` | `*_Factor_1`, unchanged after parsing |
| `CO2/CH4/N2O (... / gallon)` | the `_1` unit contains `gallon` | `*_Factor_1`, unchanged after parsing |
| `CO2/CH4/N2O (... / MMSCF)` | HHV parses and `HIV Unit` / `HHV Unit` contains `scf` | per-mmBtu factor × HHV × 1,000,000 |

There is no per-scf dropdown entry. The sheet’s per-scf columns are a fallback: `*_Factor_1 × 1,000,000`, and only when the MMSCF key is still empty (lines 200–208). Every live gaseous row has a numeric HHV and `HIV Unit` = `mmBtu per scf`, so that fallback does not run for the current 7 gas rows.

`N2O Unit_1` is used for the second N₂O unit. If that column is absent, the code uses `N2O Unit` (line 168).

### Anthracite — Fuel EPA 1, category `Coal and Coke`

`N20 Unit` is `g N2O per mmBtu`. There is no `N2O Unit_1`. The column named `N2O Unit` is `g N2O per short ton`. HHV unit is `mmBtu per short ton`, which does not contain `scf`, so no MMSCF key is created. HHV is not multiplied into the short-ton factors.

| Sheet column | Sheet value | Sheet unit | Map key | Map value |
| --- | --- | --- | --- | --- |
| `CO2 Factor` | `103.69` | kg CO2 per mmBtu | `CO2 (kg CO2 / mmBtu)` | `103.69` |
| `CH4 Factor` | `11` | g CH4 per mmBtu | `CH4 (g CH4 / mmBtu)` | `11` |
| `N2O Factor` | `1.6` | `N20 Unit`: g N2O per mmBtu | `N2O (g N2O / mmBtu)` | `1.6` |
| `CO2 Factor_1` | `" 2,602 "` | kg CO2 per short ton | `CO2 (kg CO2 / short ton)` | `2602` |
| `CH4 Factor_1` | `" 276 "` | g CH4 per short ton | `CH4 (g CH4 / short ton)` | `276` |
| `N2O Factor_1` | `40` | `N2O Unit`: g N2O per short ton | `N2O (g N2O / short ton)` | `40` |

The N20 / N2O split is handled correctly for this row: the mmBtu gate reads `N20 Unit`, and the short-ton gate falls back to `N2O Unit` because `N2O Unit_1` is not on this table.

Short ton is an identity copy of the published per-short-ton column. It is not `per mmBtu × HHV`. For anthracite those products are 103.69 × 25.09 = 2601.5821, 11 × 25.09 = 275.99, and 1.6 × 25.09 = 40.144. The map keeps the sheet’s rounded values 2602, 276, and 40.

Classification: **Correct.**

### Natural Gas — Fuel EPA 2, category `Natural Gas`

This table has no `N20 Unit`. `N2O Unit` is `g N2O per mmBtu`, and `N2O Unit_1` is `g N2O per scf`. The first gate therefore uses `N2O Unit`. The second gate uses `N2O Unit_1` and does not reuse `N2O Unit`.

HHV is `0.001026` mmBtu per scf. MMSCF is `per-mmBtu factor × 0.001026 × 1,000,000`. That is (mmBtu per scf) × (mass per mmBtu) × (1,000,000 scf per MMSCF), which is mass per MMSCF.

| Sheet column | Sheet value | Sheet unit | Map key | Map value |
| --- | --- | --- | --- | --- |
| `CO2 Factor` | `53.06` | kg CO2 per mmBtu | `CO2 (kg CO2 / mmBtu)` | `53.06` |
| `CH4 Factor` | `1` | g CH4 per mmBtu | `CH4 (g CH4 / mmBtu)` | `1` |
| `N2O Factor` | `0.1` | g N2O per mmBtu | `N2O (g N2O / mmBtu)` | `0.1` |
| HHV × CO2 | `0.001026` × `53.06` × 1,000,000 | derived per MMSCF | `CO2 (kg CO2 / MMSCF)` | `54439.560000000005` |
| HHV × CH4 | `0.001026` × `1` × 1,000,000 | derived per MMSCF | `CH4 (g CH4 / MMSCF)` | `1026` |
| HHV × N2O | `0.001026` × `0.1` × 1,000,000 | derived per MMSCF | `N2O (g N2O / MMSCF)` | `102.6` |

The per-scf columns are not used, because the MMSCF keys are already set. Those columns, multiplied by 1,000,000, would be:

| Sheet per scf | × 1,000,000 | Map value actually used |
| --- | --- | --- |
| `0.05444` kg CO2 per scf | `54440` | `54439.560000000005` |
| `0.00103` g CH4 per scf | `1030` | `1026` |
| `0.0001` g N2O per scf | `100` | `102.6` |

The gaps are the sheet’s own rounding of HHV × per-mmBtu into the per-scf column (53.06 × 0.001026 = 0.05443956, printed as 0.05444; 0.0001026 printed as 0.0001). The loader keeps the unrounded product. The unit is still per MMSCF.

Classification of the mmBtu copy, the N2O column choice, and the HHV × 1,000,000 dimension: **Correct.**

Classification of “MMSCF equals the printed per-scf factor × 1,000,000”: **Confirmed defect** relative to that equality. The loader does not do that when HHV parses. The difference is rounding, not a wrong dimension. The largest relative gap on this row is N₂O, 102.6 versus 100.

The fallback `per scf × 1,000,000` is dimensionally the same step (scf to MMSCF). It is **Unverified** as an executed path: none of the 7 live gas rows reach it.

### Distillate Fuel Oil No. 2 — Fuel EPA 3

The stored category is ` Petroleum Products ` with a leading and trailing space. Line 139 trims it, so the map category is `Petroleum Products`. The fuel name has no extra spaces.

`N2O Unit` is `g N2O per mmBtu`. `N2O Unit_1` is `g N2O per gallon`. HHV is `0.138` mmBtu per gallon. That unit does not contain `scf`, and the code never multiplies a gallon factor by HHV.

| Sheet column | Sheet value | Sheet unit | Map key | Map value |
| --- | --- | --- | --- | --- |
| `CO2 Factor` | `73.96` | kg CO2 per mmBtu | `CO2 (kg CO2 / mmBtu)` | `73.96` |
| `CH4 Factor` | `3` | g CH4 per mmBtu | `CH4 (g CH4 / mmBtu)` | `3` |
| `N2O Factor` | `0.6` | g N2O per mmBtu | `N2O (g N2O / mmBtu)` | `0.6` |
| `CO2 Factor_1` | `10.21` | kg CO2 per gallon | `CO2 (kg CO2 / gallon)` | `10.21` |
| `CH4 Factor_1` | `0.41` | g CH4 per gallon | `CH4 (g CH4 / gallon)` | `0.41` |
| `N2O Factor_1` | `0.08` | g N2O per gallon | `N2O (g N2O / gallon)` | `0.08` |

No short-ton keys and no MMSCF keys.

Gallon is an identity copy. The unrounded HHV products would be 73.96 × 0.138 = 10.20648, 3 × 0.138 = 0.414, and 0.6 × 0.138 = 0.0828. The map keeps the sheet’s rounded per-gallon values 10.21, 0.41, and 0.08. That matches the short-ton behavior and differs from the gas MMSCF behavior, which recomputes from HHV.

Classification: **Correct.**

## 4. Final findings

| Issue | Classification |
| --- | --- |
| `" 2,602 "`, `" 276 "`, other comma/space text, decimals, and numeric strings parse to the full number | **Correct** — `parseFactorNumber`, lines 125–131 |
| `null` and blank stay empty and do not become 0 | **Correct** — same function; live nulls are the kraft `*_Factor_1` cells |
| Anthracite `N20 Unit` supplies the mmBtu N₂O unit, and `N2O Unit` supplies the short-ton N₂O unit | **Correct** — lines 159 and 168 |
| Natural gas and distillate have no `N20 Unit`; `N2O Unit` is the mmBtu unit and `N2O Unit_1` is the scf or gallon unit | **Correct** — lines 159 and 168 |
| mmBtu, short ton, and gallon factors are copied in the unit the sheet already uses | **Correct** — lines 177–198 and 210–218 |
| MMSCF dimension is per-mmBtu × (mmBtu per scf) × 1,000,000 scf/MMSCF | **Correct** — lines 155 and 179–187 |
| MMSCF number equals the sheet’s printed per-scf factor × 1,000,000 | **Confirmed defect** against that equality. Natural gas uses 54439.560000000005, 1026, and 102.6 instead of 54440, 1030, and 100. Same dimension. |
| Fallback path `per scf × 1,000,000` actually runs on the current rows | **Unverified** as an executed path. All 7 gas rows take the HHV path first, so the fallback is skipped |

Source file for every line cited: `src/features/emission-calculator/scope1/components/FuelEmissions.tsx`.

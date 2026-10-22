# EPA Scope 1 — Stationary Combustion field audit

Code investigation only. This covers the form mounted when the EPA calculator’s Scope 1 category is `stationaryCombustion`.

Mounted path:

`EpaCalculatorScreen` → `StationaryCombustionSection` → `FuelEmissions` (`factorMode` left at its default `"epa"`, `variant` left at `"fuel"`).

Files read for this report:

- `src/features/emission-calculator/scope1/activity-based/components/StationaryCombustionSection.tsx`
- `src/features/emission-calculator/scope1/activity-based/components/ActivitySectionShell.tsx`
- `src/features/emission-calculator/scope1/activity-based/components/LegacySavedInventory.tsx`
- `src/features/emission-calculator/scope1/activity-based/types.ts`
- `src/features/emission-calculator/scope1/activity-based/activityMeta.ts`
- `src/features/emission-calculator/scope1/components/FuelEmissions.tsx`
- `src/components/emissions/shared/types.ts` (`FuelRow`, `FuelType`)
- `src/components/emissions/shared/utils.ts` (`newFuelRow`, `fuelRowChanged`)
- `src/api/calcConnection.ts` (`localEpaFuelEmissionsKg`, `resolveEpaFuelEmissionsKg` signatures only)
- `src/api/calc.ts` (`calcEpaFuel`)
- `src/integrations/supabase/ghgEntryClient.ts`
- `supabase/migrations/20250825000000_create_scope1_fuel_entries.sql` and later alters of that table

Factor numbers and the body of the emissions math are not documented here.

---

## 1. What the user sees

The section header is not an input.

| Visible text | Kind |
| --- | --- |
| Title “Stationary Combustion” | Heading |
| Subtitle “Fuel burned on site — boilers, generators, heaters, kitchens.” | Text |
| Info button (`aria-label` “About this section”) | Tooltip: “For fuel burned on site (boilers, generators, heaters, kitchens). Purchased steam or heat from a supplier belongs under Scope 2 instead.” |
| Step badge **1** and heading **Equipment** | Section label |
| Step badge **2** and heading **Fuel use** | Section label |

If saved stationary-group rows exist, an inventory panel is shown above step 1. If none exist, that panel renders nothing. See section 2.

There is no separate “Calculate” button. A fuel row’s emissions update inside `updateRow` as soon as type, fuel, unit, and quantity can produce a factor and a quantity.

---

## 2. Complete UI field inventory

### 2.1 Equipment (section-level, one set for every fuel row)

These live in `StationaryCombustionSection`. They are not repeated per fuel row. On save, the current values are copied onto each saved fuel row as `activity_meta` (section 5).

| UI label | State field | Input | Options | Default | Required in the UI | Validation | Conditional |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Equipment type | `equipmentType` | Dropdown (`Select`) | See table below. Stored value is the `id`; the label is what the user reads. | `boiler` (“Boiler”) | No asterisk and no submit check. A value is always present because the state is initialized. | None. Any of the six ids. | Always visible. |
| Optional details | `showOptional` | Button (not a data field) | — | Collapsed (`false`) | — | — | Toggles the three fields below. |
| Site | `site` | Text | — | `""` | Optional | None. No max length. Placeholder `e.g. Plant A`. | Hidden until “Optional details” is opened. |
| Equipment ID | `sourceId` | Text | — | `""` | Optional | None. No max length. Placeholder `e.g. Boiler-03`. | Hidden until “Optional details” is opened. |
| Period | `period` | Month (`input type="month"`) | Browser month picker. Value shape `YYYY-MM`. | Current month from `new Date().toISOString().slice(0, 7)` (UTC) | Optional in the sense that the user is not forced to open or change it. The state still has a month even while the field is hidden. | Native month input only. | The control is hidden until “Optional details” is opened. The default month is still kept in state. |

Equipment type options (`STATIONARY_EQUIPMENT_OPTIONS` in `types.ts`):

| Stored id | Exact label |
| --- | --- |
| `generator` | Generator / power equipment |
| `boiler` | Boiler |
| `heater` | Heater |
| `furnace` | Furnace |
| `cooking` | Cooking / kitchen equipment |
| `other_stationary` | Other stationary equipment |

Changing equipment type does not clear fuel rows, does not change fuel lists, and does not recalculate emissions.

### 2.2 Fuel rows (per entry)

`FuelEmissions` starts with `rows = []`. Column headers are always shown. A row appears only after **Add entry**, or when saved `scope1_fuel_entries` (or a session draft) are loaded.

`StationaryCombustionSection` passes `sectionTitle=""` and `sectionDescription=""`, so the inner “Fuel Entries” heading is not rendered. While EPA sheets are loading, the text **Loading EPA fuel factors…** is shown and **Add entry** is disabled (`epaFactorsReady === false`).

EPA mode uses a 4-column grid. The UK-only **Emission factor** column is not rendered, because `factorMode` is `"epa"` and `isUkActive` is false.

| UI label | `FuelRow` field | Input | Placeholder | Default on a new row | Required to save that row | Validation |
| --- | --- | --- | --- | --- | --- | --- |
| Type | `type` | Dropdown | “Select type” | unset (`undefined`) | Yes. A new row is skipped on save if `type` is missing. | Options are the category keys of the loaded EPA map (section 2.3). Disabled while factors are loading. |
| Fuel | `fuel` | Dropdown | “Select fuel” | unset | Yes, same rule. | Disabled while factors are loading or `type` is empty. |
| Unit | `unit` | Dropdown | “Select unit” | unset | Yes, same rule. | Disabled while factors are loading, or `type` or `fuel` is empty. |
| Quantity | `quantity` | Number | “Enter quantity” | unset (input shows `""`) | Yes. Save requires `typeof quantity === "number"`. | `type="number"`, `step="any"`, `min="0"`, `max="999999999999.999999"`. Empty clears the value. Any other value is kept only when `Number(value) >= 0` and `<= 999999999999.999999`. Other keystrokes are ignored. Not disabled when type/fuel/unit are empty. |
| Output unit | component state `outputUnit`, not a field on the row | Dropdown | — | `"kg"` (label `kg`), unless the first loaded row’s `emissions_output_unit` is one of the four values below | Not required to display a total. Changing it is enough to enable Save. | Only the four options below. |
| Total Fuel Emissions | derived `totalEmissions` | Read-only text | — | `0` when no row has `emissions` | — | Sum of each row’s `emissions`, then converted for display by `convertEmission`. |

Output unit options:

| Stored value | Exact label |
| --- | --- |
| `kg` | kg |
| `tonnes` | tonnes |
| `g` | g |
| `short_ton` | short ton |

Buttons on this step:

| Control | Behavior |
| --- | --- |
| **Add entry** | Appends `newFuelRow()` (`id` only). Disabled while EPA factors are loading. |
| Trash on a row that is not yet saved | `removeRow`. No confirm. Removes it from the form only. |
| Trash on a saved row (`isExisting` and `dbId`) | `deleteExistingRow`. `window.confirm`: “Are you sure you want to delete this entry? This action cannot be undone.” Then deletes that database row. |
| **Save** | `saveFuelEntries`. Disabled when nothing is new, no existing row changed, and the output unit is unchanged. Label becomes “Saving...” while `saving` is true. |
| **Next** | Calls `onSaveAndNext` (the EPA shell’s next-category navigation). It does not save. |

The factor number itself is not an input in EPA mode. It is written onto the row as `factor` inside `updateRow` and is not shown as its own field. Row emissions are not shown per line. Only the section total is shown.

### 2.3 Type, Fuel, and Unit options (EPA mode)

These three lists are not hardcoded in the stationary form. `FuelEmissions` does not import `FACTORS` from `EmissionFactors.ts`. That constant is used by the unused `Scope1Shell`, not by this screen.

On mount, `ensureEpaFuelFactors` loads rows from factor datasets, in order:

1. API dual-read: dataset codes `fuel_epa_1` / `fuel_epa1`, `fuel_epa_2` / `fuel_epa2`, `fuel_epa_3` / `fuel_epa3` (name hints “Fuel EPA 1”, “Fuel EPA”, “Fuel EPA 2”, “Fuel EPA 3”).
2. If that returns nothing, Supabase tables `"Fuel EPA 1"`, `"Fuel EPA 2"`, `"Fuel EPA 3"`, `select("*")`.

`buildEpaFuelFactorsMap` then builds `category → fuel → unit label → number`.

| Dropdown | What is listed | Sort |
| --- | --- | --- |
| Type | `Object.keys` of the map. Category text is the first non-empty value among columns `Category`, `category`, `Fuel Category`, `fuel_category`. | Insertion order from the sheets. Not alphabetically sorted. |
| Fuel | Keys under the selected category. Fuel text is the first non-empty value among `Fuel Type`, `Fuel`, `fuel_type`, `fuel`. | Insertion order. Not sorted. |
| Unit | Keys under that category and fuel. Only labels the builder actually wrote for that fuel (table below). | Insertion order. Not sorted. |

`FuelType` in `types.ts` is a TypeScript union, not the option list. The comment in that file says extra categories from the sheets are still rendered. The select maps whatever keys were built. If a saved row’s type, fuel, or unit is no longer in the map, one extra item is added so the stored string still appears.

Unit labels the builder can emit, and the sheet condition that adds each one (no factor values):

| Unit label shown in the dropdown | Added when the sheet row has |
| --- | --- |
| `CO2 (kg CO2 / mmBtu)` | `CO2 Unit` contains `mmbtu` and `CO2 Factor` parses as a number |
| `CH4 (g CH4 / mmBtu)` | `CH4 Unit` contains `mmbtu` and `CH4 Factor` parses |
| `N2O (g N2O / mmBtu)` | `N20 Unit` or `N2O Unit` contains `mmbtu` and `N2O Factor` parses |
| `CO2 (kg CO2 / MMSCF)` | mmBtu CO₂ factor exists and `HHV Unit` / `HIV Unit` / `hhv_unit` / `hiv_unit` / `heat_content_unit` contains `scf` and heat content parses; or, if that MMSCF key is still empty, `CO2 Unit_1` contains `scf` and `CO2 Factor_1` parses |
| `CH4 (g CH4 / MMSCF)` | Same pattern for CH₄ |
| `N2O (g N2O / MMSCF)` | Same pattern for N₂O (`N2O Unit_1` or `N2O Unit`) |
| `CO2 (kg CO2 / short ton)` | `CO2 Unit_1` contains `short ton` and `CO2 Factor_1` parses |
| `CH4 (g CH4 / short ton)` | `CH4 Unit_1` contains `short ton` and `CH4 Factor_1` parses |
| `N2O (g N2O / short ton)` | `N2O Unit_1` or `N2O Unit` contains `short ton` and `N2O Factor_1` parses |
| `CO2 (kg CO2 / gallon)` | `CO2 Unit_1` contains `gallon` and `CO2 Factor_1` parses |
| `CH4 (g CH4 / gallon)` | `CH4 Unit_1` contains `gallon` and `CH4 Factor_1` parses |
| `N2O (g N2O / gallon)` | `N2O Unit_1` or `N2O Unit` contains `gallon` and `N2O Factor_1` parses |

A fuel with no parsed factors produces no unit options. The unit dropdown then has only the placeholder, unless a previously saved unit is kept as a pending item.

If both sheet loads return no usable rows, the map stays empty, the three dropdowns have no options, and a new row cannot be saved (it never gets a numeric `factor`).

The UK “Emission factor” dropdown (`kg CO2e`, `kg CO2e of CO2 per unit`, `kg CO2e of CH4 per unit`, `kg CO2e of N2O per unit`) is implemented in this same component but is not shown for stationary combustion.

### 2.4 Conditional behavior inside a fuel row

| Earlier selection | What changes |
| --- | --- |
| Type changes | `updateRow` sets `fuel`, `unit`, and `ukFactorBasis` to `undefined`. Fuel list becomes the fuels for the new type. Unit list is empty until a fuel is chosen. Factor and emissions are cleared until type, fuel, and unit all resolve. |
| Fuel changes | `unit` and `ukFactorBasis` are cleared. Unit list becomes the units for that type and fuel. |
| Unit changes | Type and fuel stay. `updateRow` looks up `effectiveFactors[type][fuel][unit]`. |
| Quantity changes | If `factor` is already a number, emissions are recalculated. If quantity is cleared, `emissions` is set to `undefined`. |
| Output unit changes | Does not change type, fuel, unit, quantity, or `factor`. It changes the displayed total and, on save, `emissions_output` / `emissions_output_unit`. |

There is no equipment-type branch. Generator, boiler, heater, furnace, cooking, and other stationary equipment all use the same fuel dropdowns.

---

## 3. User journey

1. **Open Stationary Combustion.** The EPA shell renders this section only when Scope 1 screening is fully answered, the active category is `stationaryCombustion`, and the stationary group is visible (user answered Yes). `FuelEmissions` loads EPA factor sheets and existing `scope1_fuel_entries` for the signed-in user (`emission_framework: "epa"` on the list filter). In a company context it loads that counterparty’s rows, or a blank form if `counterpartyId` is missing.
2. **Saved rows.** If the list returns rows, they are mapped by `legacyEntryToFuelRow` into the grid (`isExisting: true`). The user can change their type, fuel, unit, and quantity in place. Equipment type, site, equipment ID, and period are **not** read back from the row. Those controls always open at Boiler, blank site, blank equipment ID, and the current month. `activity_meta` is not applied to the form on load.
3. **Draft.** After the database load, unsaved rows in `sessionStorage` under `fuelEmissionsDraft:fuel:user:{userId}` (or the company key) are merged if the draft is under 24 hours old and the fingerprint is not already on screen. Drafts are rewritten whenever unsaved rows or the output unit change.
4. **Equipment type.** Choosing another equipment option updates `equipmentType` only. Fuel rows stay as they are. Emissions are not recalculated.
5. **Optional details.** Opening the button shows Site, Equipment ID, and Period. Closing it hides them. It does not clear them. Period already holds the current month before the panel is opened, and that value is what save will put in `activity_meta.period` even if the user never opens the panel. Blank site and equipment ID are omitted from `activity_meta` (`trim()` then `undefined`).
6. **Add a fuel row.** **Add entry** adds an empty row. The user picks Type, then Fuel, then Unit. Each step clears the later dropdowns as in section 2.4.
7. **Quantity.** Typing a quantity calls `updateRow`. When `factor` is a number, emissions are set immediately. There is no calculate button.
8. **Change unit.** The unit dropdown replaces `unit`, looks up a new factor, and if quantity is set, replaces `emissions`.
9. **Output unit.** The total text is re-rendered in kg, tonnes, g, or short ton. Stored row `emissions` are not rewritten until Save.
10. **Several rows.** **Add entry** can be used repeatedly. One equipment block applies to all of them.
11. **Save.** **Save** runs `saveFuelEntries`. Rows that are new and have type, fuel, unit, a numeric quantity, and a numeric factor are inserted. Existing rows whose type, fuel, unit, quantity, factor, emissions, or `ukFactorBasis` differ from the loaded copy (`fuelRowChanged`) are updated. If only the output unit changed, every existing row that has numeric `emissions` is updated. If none of that is true, the toast is “Nothing to save” / “No new or changed fuel entries.” Incomplete new rows are omitted with no field-level error.
12. **Next.** Moves to the next EPA category and does not write the database.
13. **Delete a fuel row in the grid.** Unsaved: removed locally. Saved: confirm dialog, then `deleteLegacyTableEntry("scope1_fuel_entries", dbId)`.
14. **Inventory panel.** `LegacySavedInventory` with `groupId="stationary"` lists saved rows whose result keys map to stationary in `legacyMapping.ts`: `fuel`, `heatsteam`, `kitchen`, `power`, `heating`, when the total is greater than zero. The user can expand a source and delete a row (Confirm / Cancel). There is no edit control in that panel. The note under the fuel step says “Open a source to review or delete saved rows. New entries you add below appear here too.” After a delete, `fuelRefreshKey` increments and `FuelEmissions` remounts, so the grid reloads. Deleting a non-fuel stationary key (heat/steam, kitchen, power, heating) does not open that record in the fuel grid; those rows are not `scope1_fuel_entries`.

Edit of a stationary **fuel** record is the grid itself: saved `scope1_fuel_entries` are loaded as editable rows. There is no separate edit page.

---

## 4. Field-to-calculation mapping

Calculation for this screen goes through `updateRow` and, on save, `resolveRowEmissionsForSave`. Both call `resolveEpaFuelEmissionsKg` when `USE_JWT_AUTH` is on (save always calls it; typing calls it only when that flag is on). Otherwise typing uses `localEpaFuelEmissionsKg` only.

`resolveEpaFuelEmissionsKg` receives `{ quantity, factor, unit, category, fuel }` and calls `calcEpaFuel` → `POST /api/v1/calc/epa/fuel` with those fields. `category` is the Type dropdown. This audit does not open the function bodies beyond those arguments.

| Field | Role | Function that receives it |
| --- | --- | --- |
| Equipment type | Reporting / metadata only. Not an argument to the fuel emissions functions. | `buildStationaryActivityMeta` → `activity_meta.equipment_type` on save. |
| Site | Metadata only. Omitted when blank. | `buildStationaryActivityMeta` → `activity_meta.site`. |
| Equipment ID | Metadata only. Omitted when blank. | `buildStationaryActivityMeta` → `activity_meta.source_id`. |
| Period | Metadata only. Always the state value, including the default month while the control is hidden. | `buildStationaryActivityMeta` → `activity_meta.period`. |
| Type | Selects which branch of the factor map is used (`effectiveFactors[type]`). Also sent as `category` to the EPA fuel API. It does not enter `localEpaFuelEmissionsKg` as its own argument. | `updateRow` (factor lookup). `resolveEpaFuelEmissionsKg({ category: type })`. `calcEpaFuel`. |
| Fuel | Selects the fuel branch of the map (`effectiveFactors[type][fuel]`). Sent as `fuel` to the API. Not an argument of `localEpaFuelEmissionsKg`. | `updateRow`. `resolveEpaFuelEmissionsKg`. `calcEpaFuel`. |
| Unit | Selects the numeric factor (`effectiveFactors[type][fuel][unit]`). The unit **string** is also passed into the emissions functions. | `updateRow`. `localEpaFuelEmissionsKg(quantity, factor, unit)`. `resolveEpaFuelEmissionsKg({ unit })`. `calcEpaFuel`. |
| Quantity | Activity amount passed into the emissions functions with the factor. | `localEpaFuelEmissionsKg`. `resolveEpaFuelEmissionsKg`. `calcEpaFuel`. |
| Factor (not shown; set in `updateRow`) | The number stored for the chosen type/fuel/unit. Passed through as `factor`. The form does not let the user type it. | Same three functions. |
| Output unit | Does not choose the factor and is not passed to `localEpaFuelEmissionsKg` or `resolveEpaFuelEmissionsKg`. `convertEmission` / `convertEmissionNumeric` turn the kg result into the selected display unit for the total and for `emissions_output`. | `convertEmission`, `convertEmissionNumeric`. |
| `activity_meta.method_version` | Always `"activity_stationary_v1"`. Not entered by the user. Not passed to the emissions functions. | `buildStationaryActivityMeta`. |
| `activity_meta.activity_group` | Always `"stationary"`. Not passed to the emissions functions. | `buildStationaryActivityMeta`. |

`ukFactorBasis` exists on `FuelRow` and in `fuelRowChanged`, but the EPA stationary UI never sets it and the EPA save payload does not write `uk_factor_basis`.

---

## 5. Data persistence

### 5.1 Insert payload (new rows that pass the save filter)

`saveFuelEntries` builds this object and passes it to `insertLegacyTableEntries("scope1_fuel_entries", payload)`.

| Payload field | Source |
| --- | --- |
| `user_id` | Signed-in user id |
| `counterparty_id` | `counterpartyId` when `companyContext` is true, otherwise `null` |
| `emission_framework` | `"epa"` (`fuelFramework`, because `factorMode` is not `"uk_supabase"`) |
| `fuel_type_group` | Type dropdown |
| `fuel` | Fuel dropdown |
| `unit` | Unit dropdown |
| `quantity` | Quantity |
| `factor` | Factor looked up in `updateRow` |
| `emissions` | Return value of `resolveRowEmissionsForSave` → `resolveEpaFuelEmissionsKg` |
| `emissions_output` | `convertEmissionNumeric(emissions, outputUnit)` |
| `emissions_output_unit` | `kg` \| `tonnes` \| `g` \| `short_ton` |
| `activity_meta` | Present only when the section passed `activityMeta` (it does). Shape below. |

`activity_meta` from `buildStationaryActivityMeta`:

| Key | Value |
| --- | --- |
| `activity_group` | `"stationary"` |
| `equipment_type` | Equipment type id (`generator`, `boiler`, `heater`, `furnace`, `cooking`, `other_stationary`) |
| `site` | Trimmed site, or omitted if blank |
| `source_id` | Trimmed equipment ID, or omitted if blank |
| `period` | `YYYY-MM` from period state |
| `method_version` | `"activity_stationary_v1"` |

The same `activityMeta` object is attached to every new row and every updated row in that save. It is the equipment block at save time, not a per-row snapshot taken when the row was added.

`uk_factor_basis` is not in the EPA payload.

### 5.2 Update payload

`updateLegacyTableEntry("scope1_fuel_entries", dbId, …)` sends the same fields except `user_id` and `counterparty_id`: `emission_framework`, `fuel_type_group`, `fuel`, `unit`, `quantity`, `factor`, `emissions`, `emissions_output`, `emissions_output_unit`, and `activity_meta`.

### 5.3 Table columns that exist in this repo

`public.scope1_fuel_entries`, from the create migration plus later alters. `schema_recreate.sql` matches this list. No migration in this repo adds `counterparty_id` or `activity_meta` to this table.

| Column | Constraint in migrations |
| --- | --- |
| `id` | UUID primary key, default `gen_random_uuid()` |
| `user_id` | UUID, not null |
| `fuel_type_group` | text, not null |
| `fuel` | text, not null |
| `unit` | text, not null |
| `quantity` | `NUMERIC(20,6)`, not null |
| `factor` | `NUMERIC(20,6)`, not null |
| `emissions` | `NUMERIC(20,6)`, not null |
| `created_at` | timestamptz, default `now()` |
| `emissions_output` | numeric, nullable |
| `emissions_output_unit` | text, nullable |
| `uk_factor_basis` | text, nullable. EPA save does not set it. |
| `emission_framework` | text, not null, default `'epa'`, check `IN ('uk', 'epa')` |

### 5.4 Where the write goes

`insertLegacyTableEntries` / `updateLegacyTableEntry` / `deleteLegacyTableEntry`:

- **JWT auth on** (`isGhgEntryApiEnabled()`): `legacyPayloadToActivityFields` copies the entire payload into `raw` (plus `_legacy_table: "scope1_fuel_entries"`) and also sets activity columns `scope` 1, `category` `"fuel"` (because the table name contains `fuel`), `counterparty_id`, `quantity`, `unit`, and `emissions_tco2e` from `emissions`. `createEmissionActivity` / `patchEmissionActivity` in `src/api/ghg.ts` store that. `activity_meta` therefore sits inside `raw`, which matches the comment in `activityMeta.ts`.
- **JWT auth off:** `(supabase).from("scope1_fuel_entries").insert(payloads)` or `.update(payload)`. The payload includes `counterparty_id` and `activity_meta` even though those columns are not in the migrations above.

List-on-load passes `emission_framework: "epa"` into `listLegacyTableEntries`. The JWT filter (`matchesFilters`) keeps rows whose framework is `epa` or empty and drops `uk`. The direct Supabase query in `listLegacyTableEntries` filters `user_id` and `counterparty_id` only. `applyFuelFrameworkFilter` is defined in `FuelEmissions.tsx` and is never called.

Unsaved rows are also written to `sessionStorage` (section 3). That is not the database.

### 5.5 What load maps back into the form

`legacyEntryToFuelRow` reads `id`, `fuel_type_group`, `fuel`, `unit`, `quantity`, `factor`, `emissions`, and `uk_factor_basis`. It does not read `activity_meta`, `emission_framework`, `emissions_output` (except the separate output-unit init from the first row), `counterparty_id`, equipment, site, or period.

---

## 6. Scope of this note

Stationary combustion on the EPA screen is this equipment block plus EPA `FuelEmissions` rows into `scope1_fuel_entries`. Mobile combustion, refrigerants, electricity, heat and steam, and Scope 3 were not reviewed. The `scope1HeatSteam` branch inside `FuelEmissions.tsx` is not used by `StationaryCombustionSection`.

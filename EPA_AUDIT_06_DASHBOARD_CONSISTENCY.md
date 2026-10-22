# EPA Audit 06 — Dashboard and totals consistency

Research only. No application code, database rows, or reporting logic was changed.

Reference for the corrected EPA reporting workflow: `src/features/emission-calculator/results/reportingTotals.ts` (`buildReportingTotals`). That function is what the EPA results screen, its CSV export, and the full PDF export use.

Date of inspection: 20 October 2026.

## Reference rule

`buildReportingTotals` (`reportingTotals.ts` lines 44–86):

- Reportable Scope 1 kilograms = every Scope 1 category except `fuel`, `heatsteam`, `kitchen`, `power`, and `heating`, plus verified `epa_stationary` kilograms once.
- Verified kilograms = `emissions_tco2e` (metric tonnes) × 1,000. The conversion is in `stationaryResults.ts` (`KG_PER_TONNE`, `scaledTonnesToKg`).
- Reportable grand kilograms = that Scope 1 figure + the loader’s Scope 2 total + the loader’s Scope 3 total.
- Scope 2 heat-and-steam stays in Scope 2. It is not one of the excluded keys. The excluded `heatsteam` key is the Scope 1 category only.
- Historical `scope1_fuel_entries`, Scope 1 kitchen, power, heating, and Scope 1 heat-and-steam stay visible as legacy and are omitted from the reportable totals.
- If the verified stationary request fails, `scope1Kg` and `grandKg` are `null`. Zero is not substituted, and the screen does not present a complete inventory.
- The label is partial/provisional when any excluded source has a positive value. It is not described as audit-approved.

The shared loader does not apply this rule. `loadEpaIpccResults` in `src/features/emission-calculator/core/loaders/epaIpccResults.ts` still puts those five historical categories into `totals.scope1` and `totals.grand` (lines 124–170 and 195–209). Verified stationary data is attached as `stationaryVerified` and is not added to those two fields (comment at lines 33–37).

## 1. Consumer inventory

| Consumer | Role | What it reads | epa_stationary | Historical stationary in the total | Unit shown | Filters | Failure behavior |
| --- | --- | --- | --- | --- | --- | --- | --- |
| EPA results screen | Report | `buildReportingTotals` after `loadEpaIpccResults` | Yes, once, as kg | No | Cards: kg ÷ 1,000 → tCO2e. Stationary line keeps stored tonnes | Org, optional counterparty, EPA assessments. No period filter | Totals withheld |
| EPA results CSV | Report | `officialExportTotals` / `buildEpaResultsCsv` | Yes | Separate legacy section only | kg and tCO2e columns | Same payload as the screen | Scope 1 and grand cells say `Incomplete` |
| Full PDF export | Report | `withReportableTotals` then `results.totals` | Yes, as one Scope 1 category in kg | Removed from the Scope 1 array passed into the template | Most headlines: kg ÷ 1,000, two decimal tonnes. Activity line keeps stored tonnes | Same payload as the screen | Headlines say `Incomplete`. One trend row still prints the numeric total |
| Main dashboard overview | Dashboard | `totals.scope1` / `totals.scope2` / `totals.scope3` / `totals.grand` | No | Yes | Prop is named kg; overview divides by 1,000 and shows tCO2e | Legacy rows by `user_id` only. Verified fetch is org-scoped by the API but its result is not added. No counterparty or period | Whole-loader throw becomes 0. A stationary API failure does not |
| EPA calculator sidebar | Calculator sidebar | Category sums from the loader, then in-memory rows | Only the row currently on the form, and a later refresh can replace it | Yes, via the `fuel` category and Scope 1 heat/kitchen/power/heating | Number with no unit label. Sidebar PDF labels the same number tCO2e and does not divide by 1,000 | `user_id`. Skipped entirely when a company context is set | Refresh failure leaves the previous in-memory numbers |
| Calculator in-app PDF | Report inside the calculator | `buildPdfReportData` from those in-memory rows | Only if still sitting in `scope1.fuel` | Fuel, Scope 1 heat, kitchen, power, heating | Labeled tCO2e, not divided by 1,000 | Whatever is in the session | Missing rows contribute 0 |
| Company emissions save | Portfolio snapshot | `scopeTotals` from the sidebar | Same as the sidebar at save time | Same as the sidebar | Stored number, no conversion in the save call | Counterparty id on the snapshot. Not an assessment or period query | Save error is shown; no zero write on failure |
| Legacy saved inventory | Calculator list | `scope1ByActivity` | No. `epa_stationary` is not a legacy key | Yes, as the stationary group’s kilograms | kg | `user_id` | Load error leaves the list empty after the catch in the component’s caller path; the loader itself returns totals even if stationary fetch fails |
| Screening notice | Calculator warning | `scope1ByActivity` kilograms | No | Yes, inside the stationary group | kg | `user_id` | A rejected load is not caught in the notice; the notice stays empty |
| UK results screen | UK report | Its own UK category sums, mapped into `EpaIpccResultsData` | No | No EPA fuel tables | kg internally; cards divide by 1,000 | UK calculator data, not this loader | Separate from this audit’s EPA path |
| Older `pages/Dashboard.tsx` | Presence flag, not a total | Row count of `scope1_fuel_entries` and three other Scope 1 tables | No | Count only, not emissions | None | `user_id` via Supabase | Catch sets “no emissions” |
| Emission history | Self-reported history | `emission_history.scope1_emissions` entered by the user | No | No | As entered. The full PDF later treats history scope values × 1,000 before `fmt` | User | Null history becomes 0 in the PDF trend loader |
| Finance / facilitated emissions | Financed-emissions workflow | Questionnaire `scope1_emissions` | No | No | As stored on the questionnaire | Counterparty / mode | Defaults missing values to 0 |
| LCA form | LCA entry | `lcaData.scope1` | No | No | As entered | The LCA record | Non-numeric becomes 0 |

`scope1DisplayKg` (`stationaryResults.ts` lines 61–67) adds verified kilograms onto whatever base it is given. The results screen does not call it. Tests still show that adding a legacy kilogram base to verified kilograms produces a combined number. That helper is not the reportable total.

## 2. How each total is built

### Shared loader

`src/features/emission-calculator/core/loaders/epaIpccResults.ts`

- `fuel` is `sumEmissionsField` of `scope1_fuel_entries` after rows whose id or method is `epa_stationary` are removed (lines 119–128). Remaining historical fuel kilograms stay in Scope 1.
- `kitchen`, `power`, `heating` use `sumResultKgField` (lines 154–169).
- Scope 1 `heatsteam` uses `sumEmissionsField` on `scope1_heatsteam_entries_epa` (lines 138–141).
- Scope 2 `heatsteam` is a different array and stays in Scope 2 (lines 174–176).
- `totals.scope1` is the sum of every Scope 1 category, including the five historical stationary categories (line 195).
- `totals.grand` adds Scope 2 and Scope 3 (line 209).
- `fetchStationaryVerified` runs in the same `Promise.all` (line 116). Its catch returns `status: "unavailable"` and zero verified kilograms (`stationaryResults.ts` lines 256–261). That zero is not added to `totals.scope1`.
- Legacy reads use `safeListLegacyTable`, which returns `[]` on error (`ghgEntryAggregates.ts` lines 54–67). An empty legacy read becomes a zero category, not an error.
- No reporting-period filter. Legacy rows are limited by `user_id`. The verified activity query is limited by the authenticated organization inside the API. The loader only applies `organizationId` and `counterpartyId` when the caller passes them. The dashboard and the calculator do not pass them.

### EPA results screen, CSV, and full PDF

These three call `buildReportingTotals` and therefore match each other when the verified load succeeds.

- Screen: `EpaIpccResultsScreen.tsx` lines 150–154 and 226. Cards use `reporting.scope1Kg` and `reporting.grandKg`. `formatTonnes` divides kilograms by 1,000.
- CSV: `resultsExport.ts` `buildEpaResultsCsv` and `officialExportTotals`.
- Full PDF: `fullEmissionReportExport.ts` lines 371–376 apply `withReportableTotals` before the template reads `results.totals`.

Residual PDF mismatch: the year-comparison row at `fullEmissionReportExport.ts` lines 1411 and 1414 still calls `fmt(results.totals.scope1)` and `fmt(results.totals.grand)` with no `inventoryIncomplete` branch. When the stationary request fails, `withReportableTotals` has already replaced those fields with the sum of the other categories (not zero, and not the legacy stationary kilograms). The headline cells say `Incomplete`, but this trend row still prints that partial number. On success, the overlaid totals match the screen’s kilogram totals; `fmt` then shows two decimal tonnes, while the screen’s cards use up to three.

### Main dashboard

`src/features/dashboard/screens/DashboardScreen.tsx` lines 296–306.

```ts
const epaResults = await loadEpaIpccResults(user.id);
setScope1Total(epaResults.totals.scope1);
setHasAnyEmissions(epaResults.totals.grand > 0);
```

On any throw, all three scopes are set to 0 and `hasAnyEmissions` is false (lines 301–306).

`CompanyOverviewScreen.tsx` lines 35 and 258–261 divides those props by 1,000 and labels the result tCO2e. The donut and the scope rows use that converted figure. The trend chart above it is `MOCK_EMISSIONS_TREND` (lines 37–39), not inventory history.

Intended purpose: organization overview for the signed-in user, not an EPA reporting statement and not a counterparty or reporting-period inventory. It currently shows the shared loader total, so it includes unreconciled stationary kilograms and omits verified `epa_stationary` tonnes.

Same organization, compared with the results screen:

- Dashboard Scope 1 tonnes = (reportable non-stationary Scope 1 kg + legacy fuel + kitchen + power + heating + Scope 1 heat-steam) / 1,000.
- Results screen Scope 1 tonnes = (reportable non-stationary Scope 1 kg + verified tonnes × 1,000) / 1,000, or no total if the verified request failed.
- Those are equal only when verified stationary is zero and the five legacy stationary categories are zero.

The dashboard also does not apply the results screen’s counterparty filter. A company-scoped results view and the dashboard can differ for that reason even after the stationary terms match.

### EPA calculator sidebar

`EpaCalculatorScreen.tsx` `refreshSummaryFromDb` (lines 470–578) and `scopeTotals` (lines 342–353).

The refresh copies loader category kilograms into the form state:

- `fuel` ← historical `scope1_fuel_entries` sum only (lines 485–551). Verified `stationaryVerified` is ignored.
- Scope 1 heat, kitchen, power, heating, flaring, venting, and vehicular ← the same legacy category kilograms.
- Mobile and on-road tables ← their own legacy categories.

`scopeTotals.scope1` then adds fuel + mobile + on-road + non-road + Scope 1 heat + refrigerants + every `ipccScope1Totals` field (kitchen, power, heating, flaring, venting, vehicular). The sidebar cards (lines 1182–1185) print that sum with no unit.

While the stationary form is open, `StationaryCombustionSection` reports the current verified kilograms into `scope1.fuel`. The next `refreshSummaryFromDb` replaces that with the historical fuel sum. A user can see the verified kilogram figure, then see it disappear and the legacy fuel figure return.

Company context skips this refresh (`if (!user?.id || companyContext) return`, line 472). In that mode the sidebar is only the current session. `saveCompanyEmissions` (lines 591–606) writes `totals.scope1` to `company_emissions` for that counterparty. There is no assessment id, reporting period, or unit conversion in that write. Portfolio screens later read that stored snapshot (`portfolioClient.ts` `getCompanyEmissions`, about line 870). They are not live EPA inventory totals.

The calculator’s own PDF (`buildPdfReportData`, lines 1021–1071, and `getReportContent`, lines 210–249) labels those same figures tCO2e and formats them with `toFixed(2)` without dividing by 1,000. Stationary in that PDF is `emissionData.scope1.fuel`. Process emissions in that PDF are Scope 1 heat plus kitchen, power, and heating. That is a different grouping from the results screen, and the unit label does not match the results screen’s kg ÷ 1,000 display.

### Lists that should keep historical rows

`LegacySavedInventory.tsx` lines 111–113 uses `scope1ByActivity` to find the group and then loads legacy detail rows. For stationary, that group includes `fuel`, `heatsteam`, `kitchen`, `power`, and `heating` (`legacyMapping.ts` lines 8–13). It does not list `epa_stationary` records. Its purpose is the historical delete list. Changing `groupScope1LegacyTotals` or removing those keys from the loader’s `scope1` array would hide or empty that list.

`ScreeningExistingDataNotice.tsx` lines 25–37 sums the same activity groups to warn that saved Scope 1 data exists. It should continue to see historical kilograms. It does not see verified stationary records, so a user who only has `epa_stationary` rows gets no notice from this component.

### Surfaces that are not the EPA operational inventory

- `UKResultsScreen.tsx` builds its own totals (lines 514–530) and passes them to the shared cards. `withReportableTotals` returns that object unchanged when `stationaryVerified` is absent (`resultsExport.ts`). UK fuel is not `scope1_fuel_entries` under the EPA reporting rule. Do not route UK totals through `buildReportingTotals`.
- `pages/Dashboard.tsx` lines 134–143 counts legacy rows, including `scope1_fuel_entries`, and only sets a boolean. A failed count becomes “no emissions” (lines 142–144). It does not show a tonne total.
- `EmissionHistoryScreen.tsx` stores what the user typed. `fullEmissionReportExport.ts` lines 387–390 uses `Number(row.scope1_emissions || 0)`, so a missing history value becomes zero in the trend, then line 1411 multiplies the history figure by 1,000 before `fmt` (which divides by 1,000 again). That path is prior-year history, not the current EPA inventory.
- Finance wizard, facilitated emissions, and the LCA form read questionnaire or LCA fields. Their zero defaults mean “not entered,” not “EPA stationary failed.” They should not be switched to `buildReportingTotals`.

## 3. Inconsistencies for one organization

For the same signed-in organization, with no counterparty filter:

| Screen | Verified 100 mmBtu natural gas (5.31145 t) | Legacy fuel 100 kg | Scope 1 kitchen / power / heating / Scope 1 heat |
| --- | --- | --- | --- |
| EPA results screen, CSV, full PDF headlines | Included once | Excluded from the total, shown as legacy | Excluded from the total, shown as legacy |
| Dashboard overview | Omitted | Included, then ÷ 1,000 for display | Included, then ÷ 1,000 |
| Calculator sidebar after refresh | Omitted | Included as `fuel` | Included |
| Calculator in-app PDF | Only if the form has not been refreshed | Labeled tCO2e with no ÷ 1,000 | Labeled tCO2e with no ÷ 1,000 |
| Company snapshot | Whatever the sidebar held at save | Same | Same |
| Legacy inventory and screening notice | Omitted | Shown | Shown |

Double counting:

- The results screen does not count one `epa_stationary` id in both the verified total and the legacy fuel sum. The loader drops that id from `fuel` before any consumer sees it.
- The dashboard does not double count a new record because it never adds the verified tonnes. It still counts a different historical fuel row that describes the same equipment.
- The sidebar can briefly show verified kilograms in `fuel` and, after refresh, historical fuel kilograms instead. It does not add both at the same time after a refresh.
- `scope1DisplayKg` would double-count if a caller passed a legacy-inclusive base plus verified kilograms. No screen does that today.

Failed requests treated as zero:

- Dashboard: a thrown `loadEpaIpccResults` sets Scope 1, 2, and 3 to 0 and clears `hasAnyEmissions`. A failed stationary request alone does not throw, so the dashboard still shows the legacy-inclusive total and looks complete.
- Legacy category reads: a failed table read becomes 0 for that category inside the loader.
- Results screen: a failed stationary request withholds the reportable total.
- CSV and the PDF headlines follow that withhold. The PDF trend row at lines 1411 and 1414 does not.
- Calculator refresh: a thrown load keeps the previous session numbers. It does not write zero.
- Finance and LCA: missing inputs become 0. That is a different workflow.

## 4. Risk of changing the shared loader

`loadEpaIpccResults` and `groupScope1LegacyTotals` are shared.

If `totals.scope1` and `totals.grand` were changed in place to the reportable rule:

- The dashboard would change without a product decision that the overview is an EPA reporting total.
- The calculator sidebar would stop hydrating historical fuel, kitchen, power, heating, and Scope 1 heat into the working totals. Those rows would look deleted in the sidebar even though the legacy inventory still has them.
- `saveCompanyEmissions` would start writing a different number for the same button, because it saves the sidebar total.
- The screening notice and legacy inventory depend on `scope1ByActivity`, which is built from the full `scope1` array. Removing keys before `groupScope1LegacyTotals` removes them from that list.
- UK results do not call the loader. They would not change. The full PDF would change only for objects that already carry `stationaryVerified`.

`scope1DisplayKg` should not be used to “fix” the dashboard. It adds verified kilograms on top of the base it is given. The loader base already contains legacy stationary kilograms.

## 5. Recommended order

1. Leave `loadEpaIpccResults` totals and `groupScope1LegacyTotals` as they are until each consumer below has its own explicit total.
2. Dashboard overview. Decide whether it is an operational “all saved kilograms” view or the same reportable inventory as the results screen. If it is the reporting view, read `buildReportingTotals` and keep the withheld-total behavior. Do not catch a reporting failure by writing zero. Pass the organization id the results screen already passes. Do not apply a counterparty filter unless the overview is company-scoped.
3. Calculator sidebar refresh. Keep historical fuel, kitchen, power, heating, and Scope 1 heat available, and stop writing them into the same `scope1.fuel` slot the verified form uses. Add verified tonnes once, converted to kilograms only for a kilogram card, or show tonnes beside the legacy kilograms. Do not let refresh replace a verified session total with the legacy fuel sum.
4. Company snapshot. State the unit on `company_emissions.scope1_emissions` before changing the save. If the snapshot is meant to match the results screen, build it for that counterparty from `buildReportingTotals`, including the reporting period, and do not copy the mixed sidebar sum.
5. Calculator in-app PDF (`getReportContent`). Stop labeling undivided kilogram sums as tCO2e. Point it at the same reportable split as the results PDF, or mark it as a session worksheet.
6. Full PDF trend row (`fullEmissionReportExport.ts` lines 1411 and 1414). Use the same `Incomplete` branch as the headlines when the verified load failed.
7. Legacy inventory and the screening notice. Leave them on `scope1ByActivity`. After the sidebar no longer depends on that rollup for its official total, a later change can add a separate verified list without hiding historical rows.
8. Do not retarget UK results, finance questionnaires, LCA, or the emission-history form in this sequence. They are not the EPA operational inventory.

## 6. Files inspected

- `src/features/emission-calculator/core/loaders/epaIpccResults.ts`
- `src/features/emission-calculator/results/reportingTotals.ts`
- `src/features/emission-calculator/results/stationaryResults.ts`
- `src/features/emission-calculator/results/resultsExport.ts`
- `src/features/emission-calculator/results/EpaIpccResultsScreen.tsx`
- `src/features/emission-calculator/results/components/ResultsBreakdownTabs.tsx`
- `src/features/emission-calculator/results/components/ResultsSummaryCard.tsx`
- `src/features/emission-calculator/results/components/ScopeHighlightCards.tsx`
- `src/features/emission-calculator/results/UKResultsScreen.tsx`
- `src/utils/fullEmissionReportExport.ts`
- `src/features/dashboard/screens/DashboardScreen.tsx`
- `src/features/dashboard/CompanyOverviewScreen.tsx`
- `src/features/emission-calculator/methodologies/epa-ipcc/EpaCalculatorScreen.tsx`
- `src/features/emission-calculator/scope1/activity-based/legacyMapping.ts`
- `src/features/emission-calculator/scope1/activity-based/components/LegacySavedInventory.tsx`
- `src/features/emission-calculator/scope1/activity-based/components/ScreeningExistingDataNotice.tsx`
- `src/integrations/supabase/ghgEntryAggregates.ts`
- `src/integrations/supabase/portfolioClient.ts`
- `src/pages/Dashboard.tsx`
- `src/features/emission-calculator/results/EmissionHistoryScreen.tsx`
- `src/features/finance-emissions/esg/ESGWizard.tsx`
- `src/components/emissions/LCAInputForm.tsx`

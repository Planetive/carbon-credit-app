# EPA Audit 08 — Historical unit risk in company and finance records

Research only. No application code, database rows, or reporting logic was changed. Live database counts were not taken. The queries below are read-only and return aggregates only.

Date of inspection: 20 October 2026.

## Conclusion

The pre-fix EPA calculator wrote session totals in kilograms into fields that finance treats as tonnes. That write can be recognized on `company_emissions` when `notes` is exactly `Calculated using EPA emission calculator version` and a scope value is not zero. Those rows are a confirmed unit-contract mismatch: kilograms were stored where the column is documented as tCO2e.

`counterparty_questionnaires` has no source, unit, or notes column. A questionnaire number cannot be confirmed as an EPA kilogram value from the row alone. A large number is not evidence by itself.

No live row counts are available from this investigation.

## 1. Historical write path

```text
EPA calculator session scopeTotals
        kilograms, no ÷ 1000
        |
        +-- Save & Return, company context
        |     company_emissions.scope1/2/3_emissions
        |     notes = "Calculated using EPA emission calculator version"
        |     calculation_source intended as emission_calculator
        |
        +-- Same button, finance or facilitated wizard
              sessionStorage.esgWizardState
                scope1Emissions, scope2Emissions, scope3Emissions
                verified_emissions or unverified_emissions = the same total
              |
              ESGWizard resume preferred those numbers over the saved questionnaire
              |
              counterparty_questionnaires.scope1/2/3_emissions
              |
              finance and facilitated formulas
                (exposure / EVIC or equity+debt) × that total
                default unit tCO2e, and tCO2e is not divided
              |
              emission_calculations.financed_emissions
              emission_calculations.inputs (scope fields)
              finance_emission_calculations.financed_emissions
              finance_emission_calculations.pcaf_inputs
```

### Company snapshot

Before the safety guard, `EpaCalculatorScreen.saveCompanyEmissions` sent `scopeTotals.scope1`, `scope2`, and `scope3` unchanged. Those totals are the calculator sidebar sums. Stationary combustion contributed `total_kg_co2e`. Electricity is labeled kg CO2e in `ElectricityEmissions.tsx`. The migration comment on the destination columns is tCO2e (`supabase/migrations/20250115_000004_create_company_emissions.sql` lines 12–14).

The notes string `Calculated using EPA emission calculator version` is specific to that function. The UK calculator writes a different note, `Calculated using emission calculator` (`UKCalculatorScreen.tsx` lines 228–236). This repository’s current writers do not use `calculation_source` `manual` or `questionnaire`.

On the JWT path, the patch updates the scope columns and `notes`. It does not send `calculation_source`, so an older source value can remain. The JWT path also cannot insert the first row. An EPA note on a row means an existing snapshot was overwritten by that kilogram session.

A zero from that path is not a 1,000× error. Zero kilograms and zero tonnes are the same number.

### Questionnaire

The EPA button did not insert into `counterparty_questionnaires` itself. It copied the same kilogram totals onto `esgWizardState`. `ESGWizard` then saved `formData.scope1Emissions`, `scope2Emissions`, and `scope3Emissions` through `PortfolioClient.upsertCounterpartyQuestionnaire` (`ESGWizard.tsx` lines 1166–1199 and 1241–1262). Auto-save repeats that write about every 30 seconds.

The questionnaire upsert has no unit and no calculation source (`questionnaires.py` `WRITABLE_FIELDS`, lines 28–44). Manual numbers typed in the wizard use the same columns. The form comment calls those fields tCO2e (`ESGWizard.tsx` around the scope state). The finance form’s default emissions unit is `tCO2e` (`FinanceEmissionCalculator.tsx` lines 329–330).

`convertToTonnesCO2e` returns a `tCO2e` value unchanged. It has no kilograms case (`unitConversions.ts` lines 12–18). An auto-filled kilogram total left on the `tCO2e` unit is multiplied as tonnes.

## 2. Columns that can separate origins

### `company_emissions`

| Column | Role |
| --- | --- |
| `scope1_emissions`, `scope2_emissions`, `scope3_emissions`, `total_emissions` | `NUMERIC(20,6)`. Migration comment says tCO2e. No unit column |
| `notes` | EPA writer: `Calculated using EPA emission calculator version`. UK writer: `Calculated using emission calculator` |
| `calculation_source` | `emission_calculator`, `questionnaire`, or `manual`. EPA and UK both intend `emission_calculator`. JWT updates may leave an older value |
| `calculation_date` | Set on the Supabase upsert. Not updated by the JWT patch |
| `status` | `active` or `archived`. One row per user, counterparty, and bank flag |
| `created_at`, `updated_at` | Timestamps. `updated_at` can move without proving the unit |
| `user_id`, `counterparty_id`, `is_bank_emissions` | Identity. No organization id and no assessment id |

There is no column for kilograms versus tonnes, reporting year, or import batch.

### `counterparty_questionnaires`

| Column | Role |
| --- | --- |
| `scope1_emissions`, `scope2_emissions`, `scope3_emissions` | `NUMERIC(20,6)`. Migration comment says tCO2e (`20251014_000000_portfolio_emissions_schema.sql` lines 47–49) |
| `has_emissions` | Whether the company reported having emissions. Not a source |
| `verification_status`, `verifier_name` | Verification choice. The old handoff put the whole session total into verified or unverified based on this flag. It does not record that the number came from the EPA calculator |
| `corporate_structure` and the financial columns | Finance inputs. Not an emissions source |
| `created_at`, `updated_at` | Timestamps only |
| Unique `counterparty_id` | One questionnaire per company. A later manual edit replaces the earlier number |

No provenance, unit, notes, or calculation-source column exists. Manual entry, an EPA session, a UK session, and a later edit are not distinguishable from the questionnaire row alone.

### Results that consume those numbers

| Table | What is stored |
| --- | --- |
| `emission_calculations` | `financed_emissions` `NUMERIC(20,6)`, migration comment tCO2e. `inputs` JSON includes `scope1Emissions`, `scope2Emissions`, `scope3Emissions`. `results` JSON includes the financed total. `questionnaire_id` may link the run. `calculation_type` is `finance` or `facilitated` |
| `finance_emission_calculations` | Per-formula `financed_emissions`, `attribution_factor`, and `pcaf_inputs`. The portfolio falls back to this table |

`scenario_results.metrics` can hold a `financed_emissions` figure when a scenario was saved. That column is not a direct copy of the EPA session. It needs review only when the scenario was built from a financed total that itself used a mismatched input.

## 3. Classification

Counts were not queried. Do not treat a large tonne value as proof of a kilogram error. A real inventory can be thousands of tonnes.

| Class | Rule | What this investigation can say |
| --- | --- | --- |
| Confirmed unit mismatch | `company_emissions.notes` is exactly `Calculated using EPA emission calculator version`, and at least one of scope 1, 2, or 3 is not zero | The only writer of that note stored session kilograms in tCO2e columns. The number is not proof that the correct inventory is the stored value divided by 1,000. The session was not a full organization inventory |
| Potentially affected | Questionnaire or financed-result rows for the same counterparty whose scope numbers equal that confirmed company snapshot, or financed results whose `inputs` scope fields equal it | The wizard could copy the same session, but a person can also type the same number. Equality is not proof |
| Insufficient evidence | Questionnaire rows, financed results, and company rows whose notes are null, blank, or anything other than the EPA sentence | Origin cannot be established. Magnitude is not a class |
| No identified mismatch | EPA-note rows whose three scopes are all zero. Rows with the UK note are not EPA kilogram writes. Manual questionnaire values with no matching EPA snapshot | Zero does not create a 1,000× difference. The UK note is a different saver and is outside this confirmation |

## 4. Finance and facilitated impact

For listed and unlisted methods that use reported emissions, the formula is attribution times the emissions total. Examples:

- Corporate bonds and business loans: outstanding amount / EVIC × `verified_emissions` or `unverified_emissions` (`corporateBondAndBusinessLoanFormulaConfigs.ts`).
- Facilitated emissions: facilitated amount / EVIC or equity-plus-debt × weighting × the same total (`facilitatedEmissionFormulaConfigs.ts`).

The wizard sets `verified_emissions` or `unverified_emissions` to scope 1 + scope 2 + scope 3. The calculator default unit is `tCO2e`, so `smartConvertUnit` does not divide the auto-filled number. If that total was the EPA kilogram session, the financed or facilitated result is about 1,000 times the tonne figure, scaled again by the attribution factor. It is not automatically 1,000 times in every method. Methods that use energy, floor area, or sector intensity do not read these scope fields.

Stored results that may need review, only when their inputs match a confirmed or potentially affected scope total:

- `emission_calculations.financed_emissions` and `results`
- `emission_calculations.inputs` scope fields
- `finance_emission_calculations.financed_emissions` and `pcaf_inputs`
- Portfolio and dashboard sums of `emission_calculations.financed_emissions` (`DashboardScreen.tsx` and company detail)
- Scope 3 investment adapters that read `financed_emissions` from those tables

Those stored results do not record whether the input was kilograms. Recalculating them requires the original exposure and the corrected tonne total. Dividing every financed result by 1,000 would be wrong for manual tonne inputs and for methods that did not use the scope total.

## 5. Read-only counts

These queries were not run. They return counts only. They do not select company names, user ids, or counterparty ids.

```sql
-- Company snapshots by the only provenance this code writes.
SELECT
  COALESCE(notes, '(null)') AS notes,
  COALESCE(calculation_source, '(null)') AS calculation_source,
  COUNT(*) AS rows,
  COUNT(*) FILTER (
    WHERE COALESCE(scope1_emissions, 0) <> 0
       OR COALESCE(scope2_emissions, 0) <> 0
       OR COALESCE(scope3_emissions, 0) <> 0
  ) AS nonzero_rows
FROM company_emissions
GROUP BY 1, 2
ORDER BY rows DESC;
```

```sql
-- Confirmed EPA kilogram writes with a nonzero scope.
SELECT COUNT(*) AS confirmed_nonzero_epa_snapshots
FROM company_emissions
WHERE notes = 'Calculated using EPA emission calculator version'
  AND (
    COALESCE(scope1_emissions, 0) <> 0
    OR COALESCE(scope2_emissions, 0) <> 0
    OR COALESCE(scope3_emissions, 0) <> 0
  );
```

```sql
-- Questionnaires with any scope value, and how many match an EPA snapshot exactly.
-- A match is potentially affected, not confirmed.
SELECT
  COUNT(*) FILTER (
    WHERE COALESCE(q.scope1_emissions, 0) <> 0
       OR COALESCE(q.scope2_emissions, 0) <> 0
       OR COALESCE(q.scope3_emissions, 0) <> 0
  ) AS questionnaires_with_scopes,
  COUNT(*) FILTER (
    WHERE c.id IS NOT NULL
  ) AS questionnaires_equal_to_epa_snapshot
FROM counterparty_questionnaires q
LEFT JOIN company_emissions c
  ON c.counterparty_id = q.counterparty_id
 AND c.notes = 'Calculated using EPA emission calculator version'
 AND c.scope1_emissions IS NOT DISTINCT FROM q.scope1_emissions
 AND c.scope2_emissions IS NOT DISTINCT FROM q.scope2_emissions
 AND c.scope3_emissions IS NOT DISTINCT FROM q.scope3_emissions;
```

```sql
-- Financed or facilitated results whose stored scope inputs equal a confirmed EPA snapshot.
SELECT
  e.calculation_type,
  COUNT(*) AS result_rows
FROM emission_calculations e
JOIN company_emissions c
  ON c.counterparty_id = e.counterparty_id
 AND c.notes = 'Calculated using EPA emission calculator version'
WHERE (e.inputs ->> 'scope1Emissions')::numeric IS NOT DISTINCT FROM c.scope1_emissions
  AND (e.inputs ->> 'scope2Emissions')::numeric IS NOT DISTINCT FROM c.scope2_emissions
  AND (e.inputs ->> 'scope3Emissions')::numeric IS NOT DISTINCT FROM c.scope3_emissions
GROUP BY e.calculation_type;
```

If `inputs` is not JSON, or a scope value is not numeric, that last query will fail on those rows. Use a cast only after checking `jsonb_typeof`. Do not update from these statements.

## 6. Later reconciliation options

These are review options, not actions taken here.

1. List nonzero `company_emissions` rows with the EPA note. Keep them unchanged until someone compares each value with the company’s `epa_stationary` records and the other scope categories.
2. Do not divide the stored number by 1,000 as a batch. The session was one sidebar total, not a verified inventory, and other categories in that total were also kilograms.
3. Leave questionnaire rows in the insufficient-evidence class unless they match an EPA snapshot and a reviewer accepts that match.
4. For financed results, recompute from a reviewed tonne total and the original exposure. Do not scale every `financed_emissions` value.
5. Keep archived and active rows. The unique key means a later save already replaced the previous number. There is no older version in these tables.

## 7. Uncertainties

- Live counts are unknown. The database was not queried.
- A questionnaire can contain a correct tonne value that happens to be large.
- An EPA-note snapshot can be kilograms from a partial session, including one stationary activity, not the full inventory divided by 1,000.
- JWT updates may leave `calculation_source` and `calculation_date` from an earlier write. `notes` is the reliable EPA marker.
- UK company snapshots use a different note. Their unit was not classified here.
- `scenario_results` may repeat a financed total. That cannot be confirmed without the scenario inputs.
- Historical database rows were not migrated by the later safety guard. The guard only stops new session handoffs.

## 8. Files inspected

- `src/features/emission-calculator/methodologies/epa-ipcc/EpaCalculatorScreen.tsx`
- `src/features/emission-calculator/methodologies/uk/UKCalculatorScreen.tsx`
- `src/features/finance-emissions/esg/ESGWizard.tsx`
- `src/features/finance-emissions/esg/FinanceEmissionCalculator.tsx`
- `src/features/finance-emissions/utils/unitConversions.ts`
- `src/features/finance-emissions/config/corporateBondAndBusinessLoanFormulaConfigs.ts`
- `src/features/finance-emissions/config/facilitatedEmissionFormulaConfigs.ts`
- `src/integrations/supabase/portfolioClient.ts`
- `supabase/migrations/20250115_000004_create_company_emissions.sql`
- `supabase/migrations/20251014_000000_portfolio_emissions_schema.sql`
- `carbon-credit-backend/fastapi_app/routers/questionnaires.py`
- `carbon-credit-backend/fastapi_app/routers/company_emissions.py`
- `carbon-credit-backend/fastapi_app/portfolio_models.py`
- `EPA_AUDIT_07_COMPANY_EMISSIONS.md`

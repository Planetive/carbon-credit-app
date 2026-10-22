# Historical EPA stationary reconciliation

The tool is in the FastAPI backend. Dry-run is the default. Apply was not run, the correction-table SQL was not executed, and no production rows were changed.

## What was stored

Legacy EPA stationary rows in `scope1_fuel_entries` kept one gas per row: fuel, quantity, a factor unit such as `CO2 (kg CO2 / mmBtu)`, and `emissions`. That emissions figure is kilograms of the selected gas. CH4 and N2O were divided by 1,000 from grams; CO2 was left in kilograms. The import into `app.emission_activities` copied `emissions` into `emissions_tco2e` without dividing by 1,000 (`db/migrations/0009_phase4a_emission_assessments_activities.sql`).

The import also set `_inferred_framework` to `uk` for `scope1_fuel_entries`, because the table name does not contain `epa`. The row’s own `emission_framework` is the value that matters. A null framework with an EPA consumption unit is treated as EPA, matching the calculator, which treated a blank framework as EPA.

`method = epa_fuel` stored kilograms divided by 1,000, so the column is tonnes of one gas, not the three-gas total.

`method = epa_stationary` already stores `emissions_tco2e` from `stationary_combustion.py`. A row whose stored tonnes match a fresh calculation is left alone.

`company_emissions.notes = Calculated using EPA emission calculator version` identifies a snapshot written from calculator session kilograms into columns documented as tCO2e. Questionnaires and finance results have no unit column. They are not corrected, even when their scope numbers equal that snapshot. A large number by itself is not treated as an error.

## Classification

| Class | Meaning |
| --- | --- |
| Eligible for automatic recalculation | Fuel, quantity, and unit (`mmBtu`, `short ton`, `gallon`, or `MMSCF`) identify one activity, the Fuel EPA sheets return one factor set, and the stored value is not already the three-gas tCO2e |
| Confirmed incorrect but requiring review | The stored unit is known to be wrong, but fuel, quantity, category, or duplicate rows make an automatic correction unsafe |
| Insufficient information | The activity or the portfolio row does not show where the number came from |
| No identified issue | The stored tCO2e matches the engine, the row is UK fuel or another category, or an EPA snapshot is zero |

Distinct CO2, CH4, and N2O lines that share a user or assessment, fuel, quantity, and physical unit are one activity. The corrected total is counted once. Two rows with the same gas stay in review. A whole-activity row mixed with a single-gas row stays in review.

Company snapshots, questionnaires, and finance calculations are never eligible.

## Versioned correction

`fastapi_app/sql/003_emission_activity_corrections.sql` creates `app.emission_activity_corrections`. Apply inserts one row per eligible group with the original stored value, corrected gas masses, corrected tCO2e, factor publisher, dataset code, version label, and GWP. Status moves from `applied` to `reverted`. The original `emission_activities` row is not updated.

The current activity API still returns the original `emissions_tco2e`. Switching readers to the correction table is a later change. Until then, an applied correction is an audit record, not a change to what the screens display.

Apply is one transaction. The same reviewed ids and the same correction hash insert nothing on a second run. A different active hash is refused until that batch is reverted. A failed insert rolls back the batch. Revert does not delete the audit row and does not restore by editing the activity, because the activity was never overwritten.

## Dry-run

From `carbon-credit-backend`:

```text
python -m fastapi_app.ghg_calc.reconcile_historical_epa --output epa-stationary-reconciliation.csv
```

This only selects stationary-related activities, company snapshots, questionnaires, emission calculations, and financed-emission rows. It writes a CSV of record ids, original values, the unit those values represent, corrected gas masses and tCO2e where the engine can calculate them, factor provenance, difference, and classification. Difference is filled only when the stored column is already tCO2e. A kilogram stored in the tonnes column is not subtracted from the corrected tonnes.

The command was not run against the database in this session. Counts will come from that CSV. Sum only rows where `counts_in_corrected_total` is `true`.

## Apply, later and only after review

Do not run this as part of the current work. It needs all of the following:

1. A backup taken and recorded by name.
2. The correction-table SQL reviewed and applied separately.
3. A dry-run CSV reviewed by hand.
4. A text file of eligible activity ids, one per line, including every member of a grouped gas-line activity.
5. A manifest whose hash is the SHA-256 of those ids sorted, lower-cased, and joined by newlines:

```json
{
  "verified": true,
  "backup_reference": "the backup name",
  "reviewed_ids_sha256": "the hash of the id file"
}
```

The approval token is `APPROVE-EPA-STATIONARY-RECONCILIATION`.

```text
python -m fastapi_app.ghg_calc.reconcile_historical_epa --apply --approval-token APPROVE-EPA-STATIONARY-RECONCILIATION --backup-manifest backup.json --ids-file reviewed-ids.txt
```

Revert one batch with the same token and `--revert-batch <batch id>`. That does not modify source tables.

## Tests

`tests/test_historical_reconciliation.py` covers the natural-gas recalculation (100 mmBtu = 5.31145 tCO2e), an ambiguous fuel, duplicate rows, grouped gas lines, portfolio rows that must not be rewritten, rollback, a second run that inserts nothing, and a revert followed by another apply. Nine tests passed. No production connection was opened.

## Remaining uncertainty

Rows that share a fuel and quantity but belong to different equipment, and that were saved under different gas units, are treated as one activity. Same-gas duplicates are not. The reviewed id list is the place to separate them.

The dry-run has not been executed, so no live count is known yet.

Finance results that used a kilogram snapshot are marked for review when the scope numbers match. They are not rescaled, because the attribution inputs and the unit are not both proven.

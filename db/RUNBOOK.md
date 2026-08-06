# EC2 Postgres — backup & import runbook

## What you have now (after Phases 0–4)

| Schema | Purpose |
|---|---|
| `public` | Legacy tables + **compatibility views** (old names still work) |
| `app` | New product model: `financed_emissions`, `emission_assessments`, `emission_activities` |
| `catalog` | Explore encyclopedias (projects, CCUS, BESS, markets, country emissions) |
| `ref` | Factor sheets + new `factor_datasets` / `factor_rows` |

Old scope / calc / factor tables were **not deleted**. New models are copies alongside them.

## Nightly backup (recommended)

On the EC2 host (or a machine that can reach it):

```bash
export PGPASSWORD='YOUR_PASSWORD'
pg_dump -h YOUR_EC2_HOST -p 5432 -U postgres -d rethinkcarbon \
  -Fc -f "/backups/rethinkcarbon_$(date +%Y%m%d).dump"
```

Copy dumps to S3 or another disk. Keep at least 7 daily + 4 weekly.

## Restore test (do this once)

```bash
# create empty test db, then:
pg_restore -h YOUR_EC2_HOST -U postgres -d rethinkcarbon_restore_test --no-owner --no-acl \
  /backups/rethinkcarbon_YYYYMMDD.dump
```

## Supabase emergency copy

You already have:

`backups/supabase_full_20260730.dump`

Keep that file offline as well.

## Factor / catalog re-import

1. Load CSV/Excel into a staging table or replace sheet in `ref.*` / `catalog.*`
2. Re-run ETL style script (see `0007_phase2c_factor_datasets_rows_etl.sql`) for factors
3. Spot-check row counts

## Do NOT drop yet

Until the app reads from `app.*` / `catalog.*` / `ref.factor_rows`:

- Do not drop `scope*_` tables
- Do not drop `emission_calculations` / `finance_emission_calculations`
- Do not drop old factor sheets in `ref`

Safe to drop later (Phase 5B, after app cutover): unused empty IPCC shells, duplicate sheets already ETL’d, public views once clients point at schemas directly.

## Future scale (SAP / IBM / IoT) — do not stuff into the 33 core tables

The KEEP set (~orgs, portfolio, GHG activities, catalogs, versioned factors) is the **product OLTP core**.  
Extra data streams should get **new rooms**, not more Excel-style tables in `public`.

### Enterprise systems (SAP, IBM, ERP)
- Add an `integration` schema (or service) later:
  - `integration.connectors` (SAP, IBM, …)
  - `integration.sync_runs` (job log)
  - `integration.inbound_events` / staging tables (raw payload jsonb)
- Map cleaned rows into `app.*` (counterparties, activities, financed_emissions)
- Keep vendor payloads in staging for audit; don’t redesign core tables per vendor

### IoT / high-frequency sensors (100s of points per second)
- **Do not** store second-level telemetry in `emission_activities` or factor tables
- Use a dedicated time-series store, e.g.:
  - `iot` schema on same Postgres with **TimescaleDB** hypertables, or
  - separate DB / warehouse for telemetry
- Typical shape: `(device_id, metric, ts, value, meta jsonb)` partitioned by time
- Roll up to hourly/daily aggregates, then write **summaries** into `app.emission_activities` for GHG reporting

### Why this stays scalable
- Core stays small and clear (~25–40 tables)
- New streams = new schemas/services with clear boundaries
- Same EC2 can start with Timescale extension; split hosts only when volume demands it

Until those streams exist: keep nightly `pg_dump`, dual-read legacy tables, then cut the app over.

# Database migrations (EC2 Postgres)

Evolutionary redesign toward schemas `app` / `catalog` / `ref` on a single EC2 Postgres.
Existing imported tables stay in `public` until later phases move them.

## Apply a migration (pgAdmin)

1. Connect to your EC2 database (e.g. `rethinkcarbon`).
2. Open Query Tool.
3. Run the next unused file under `migrations/` in order.
4. Confirm the row was inserted into `public.schema_migrations`.

## Apply with psql

```powershell
$env:PGPASSWORD = 'YOUR_EC2_PASSWORD'
$env:PGSSLMODE = 'prefer'
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" `
  --host=YOUR_EC2_HOST `
  --port=5432 `
  --username=postgres `
  --dbname=rethinkcarbon `
  -f "db\migrations\0001_phase0_foundation.sql"
```

## Spot-check after Phase 0

```sql
SELECT nspname FROM pg_namespace WHERE nspname IN ('app','catalog','ref');
SELECT rolname FROM pg_roles WHERE rolname IN ('app_user','migrator','catalog_reader');
SELECT * FROM public.schema_migrations ORDER BY applied_at;
```

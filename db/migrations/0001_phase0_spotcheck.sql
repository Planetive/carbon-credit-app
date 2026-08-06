-- Phase 0 spot-checks (read-only). Run after 0001_phase0_foundation.sql

-- Schemas present
SELECT nspname AS schema_name
FROM pg_namespace
WHERE nspname IN ('app', 'catalog', 'ref', 'public')
ORDER BY 1;

-- Roles present
SELECT rolname, rolcanlogin, rolbypassrls
FROM pg_roles
WHERE rolname IN ('app_user', 'migrator', 'catalog_reader')
ORDER BY 1;

-- Migration ledger
SELECT * FROM public.schema_migrations ORDER BY applied_at;

-- Baseline row counts (imported public data — expect non-zero on Explore tables)
SELECT 'organizations' AS table_name, COUNT(*)::bigint AS n FROM public.organizations
UNION ALL SELECT 'global_projects_2025', COUNT(*) FROM public.global_projects_2025
UNION ALL SELECT 'ccus_projects', COUNT(*) FROM public.ccus_projects
UNION ALL SELECT 'bess', COUNT(*) FROM public.bess
UNION ALL SELECT 'country_emissions', COUNT(*) FROM public.country_emissions
UNION ALL SELECT 'UK_Fuel_Factors', COUNT(*) FROM public."UK_Fuel_Factors"
UNION ALL SELECT 'Fuel EPA 1', COUNT(*) FROM public."Fuel EPA 1"
ORDER BY 1;

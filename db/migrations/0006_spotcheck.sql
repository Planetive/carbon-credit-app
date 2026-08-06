-- Post Phase 1C + 2A/2B spot-check (read-only)

-- Schemas / object kinds
SELECT n.nspname AS schema_name,
       COUNT(*) FILTER (WHERE c.relkind = 'r') AS tables,
       COUNT(*) FILTER (WHERE c.relkind = 'v') AS views
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'catalog', 'ref', 'app')
GROUP BY 1
ORDER BY 1;

-- Catalog data still reachable via public views
SELECT 'global_projects_2025' AS name, COUNT(*)::bigint AS n FROM public.global_projects_2025
UNION ALL SELECT 'ccus_projects', COUNT(*) FROM public.ccus_projects
UNION ALL SELECT 'country_emissions', COUNT(*) FROM public.country_emissions
UNION ALL SELECT 'bess', COUNT(*) FROM public.bess
UNION ALL SELECT 'UK_Fuel_Factors', COUNT(*) FROM public."UK_Fuel_Factors"
UNION ALL SELECT 'Fuel EPA 1', COUNT(*) FROM public."Fuel EPA 1"
ORDER BY 1;

-- Tenant NOT NULL still healthy
SELECT 'counterparties' AS table_name,
       COUNT(*) AS total,
       COUNT(organization_id) AS with_org
FROM public.counterparties
UNION ALL
SELECT 'project_inputs', COUNT(*), COUNT(organization_id) FROM public.project_inputs;

-- Migration ledger
SELECT version, applied_at FROM public.schema_migrations ORDER BY applied_at;

-- Phase 5 — Final status snapshot (read-only)

SELECT version, applied_at
FROM public.schema_migrations
ORDER BY applied_at;

SELECT n.nspname AS schema,
       COUNT(*) FILTER (WHERE c.relkind = 'r') AS tables,
       COUNT(*) FILTER (WHERE c.relkind = 'v') AS views
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'app', 'catalog', 'ref')
GROUP BY 1
ORDER BY 1;

SELECT 'financed_emissions' AS model, COUNT(*)::bigint AS n FROM app.financed_emissions
UNION ALL SELECT 'emission_assessments', COUNT(*) FROM app.emission_assessments
UNION ALL SELECT 'emission_activities', COUNT(*) FROM app.emission_activities
UNION ALL SELECT 'factor_datasets', COUNT(*) FROM ref.factor_datasets
UNION ALL SELECT 'factor_rows', COUNT(*) FROM ref.factor_rows
ORDER BY 1;

SELECT 'catalog.global_projects_2025' AS name, COUNT(*)::bigint AS n FROM catalog.global_projects_2025
UNION ALL SELECT 'catalog.country_emissions', COUNT(*) FROM catalog.country_emissions
UNION ALL SELECT 'catalog.ccus_projects', COUNT(*) FROM catalog.ccus_projects
ORDER BY 1;

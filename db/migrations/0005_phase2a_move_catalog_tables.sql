-- Phase 2A — Move Explore encyclopedias into schema catalog
-- Leaves compatibility VIEWS in public with the old names so existing queries keep working.
-- Does not change row data.

BEGIN;

-- Helper: move table public.X -> catalog.X and recreate public.X as a view
-- (applied explicitly per table for clarity / pgAdmin)

-- carbon projects
ALTER TABLE IF EXISTS public.global_projects SET SCHEMA catalog;
CREATE OR REPLACE VIEW public.global_projects AS SELECT * FROM catalog.global_projects;

ALTER TABLE IF EXISTS public.global_projects_2025 SET SCHEMA catalog;
CREATE OR REPLACE VIEW public.global_projects_2025 AS SELECT * FROM catalog.global_projects_2025;

-- CCUS
ALTER TABLE IF EXISTS public.ccus_projects SET SCHEMA catalog;
CREATE OR REPLACE VIEW public.ccus_projects AS SELECT * FROM catalog.ccus_projects;

ALTER TABLE IF EXISTS public.ccus_policies SET SCHEMA catalog;
CREATE OR REPLACE VIEW public.ccus_policies AS SELECT * FROM catalog.ccus_policies;

ALTER TABLE IF EXISTS public.ccus_management_strategies SET SCHEMA catalog;
CREATE OR REPLACE VIEW public.ccus_management_strategies AS SELECT * FROM catalog.ccus_management_strategies;

-- BESS / markets / country
ALTER TABLE IF EXISTS public.bess SET SCHEMA catalog;
CREATE OR REPLACE VIEW public.bess AS SELECT * FROM catalog.bess;

ALTER TABLE IF EXISTS public.carbon_credit_markets SET SCHEMA catalog;
CREATE OR REPLACE VIEW public.carbon_credit_markets AS SELECT * FROM catalog.carbon_credit_markets;

ALTER TABLE IF EXISTS public.compliance_mechanisms SET SCHEMA catalog;
CREATE OR REPLACE VIEW public.compliance_mechanisms AS SELECT * FROM catalog.compliance_mechanisms;

ALTER TABLE IF EXISTS public.country_emissions SET SCHEMA catalog;
CREATE OR REPLACE VIEW public.country_emissions AS SELECT * FROM catalog.country_emissions;

-- Grants for app roles
GRANT SELECT ON ALL TABLES IN SCHEMA catalog TO catalog_reader, app_user;
GRANT USAGE ON SCHEMA catalog TO catalog_reader, app_user, migrator;

INSERT INTO public.schema_migrations (version, description)
VALUES (
  '0005_phase2a_move_catalog_tables',
  'Move Explore encyclopedia tables to catalog.*; public.* kept as compatibility views'
)
ON CONFLICT (version) DO NOTHING;

-- Spot-check counts via views (should match pre-move)
SELECT 'catalog.global_projects_2025' AS table_name, COUNT(*)::bigint AS n FROM catalog.global_projects_2025
UNION ALL SELECT 'catalog.ccus_projects', COUNT(*) FROM catalog.ccus_projects
UNION ALL SELECT 'catalog.bess', COUNT(*) FROM catalog.bess
UNION ALL SELECT 'catalog.country_emissions', COUNT(*) FROM catalog.country_emissions
UNION ALL SELECT 'public.view global_projects_2025', COUNT(*) FROM public.global_projects_2025
ORDER BY 1;

COMMIT;

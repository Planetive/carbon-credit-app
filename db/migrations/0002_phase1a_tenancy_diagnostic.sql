-- Phase 1A — Tenancy DIAGNOSTIC (read-only, safe)
-- Run in pgAdmin on EC2. Does not change any data.
-- Goal: see how many rows already have organization_id vs still NULL.

-- 1) Profiles: who has a current org?
SELECT
  COUNT(*) AS profiles_total,
  COUNT(current_organization_id) AS with_current_org,
  COUNT(*) FILTER (WHERE current_organization_id IS NULL) AS missing_current_org
FROM public.profiles;

-- 2) Memberships
SELECT
  COUNT(*) AS membership_rows,
  COUNT(DISTINCT user_id) AS users_with_membership,
  COUNT(DISTINCT organization_id) AS orgs_with_members
FROM public.user_organizations;

-- 3) Per-table organization_id fill rate (tables that have the column)
SELECT
  t.relname AS table_name,
  COALESCE(s.n_live_tup, 0) AS approx_rows,
  (
    SELECT COUNT(*)
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = t.relname
      AND c.column_name = 'organization_id'
  ) AS has_organization_id
FROM pg_class t
JOIN pg_namespace n ON n.oid = t.relnamespace
LEFT JOIN pg_stat_user_tables s
  ON s.relid = t.oid
WHERE n.nspname = 'public'
  AND t.relkind = 'r'
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = t.relname
      AND c.column_name = 'organization_id'
  )
ORDER BY t.relname;

-- 4) Exact NULL counts for tables that HAVE organization_id today
SELECT 'counterparties' AS table_name,
       COUNT(*) AS total,
       COUNT(organization_id) AS with_org,
       COUNT(*) FILTER (WHERE organization_id IS NULL) AS null_org
FROM public.counterparties
UNION ALL
SELECT 'exposures', COUNT(*), COUNT(organization_id),
       COUNT(*) FILTER (WHERE organization_id IS NULL)
FROM public.exposures
UNION ALL
SELECT 'emission_calculations', COUNT(*), COUNT(organization_id),
       COUNT(*) FILTER (WHERE organization_id IS NULL)
FROM public.emission_calculations
UNION ALL
SELECT 'project_inputs', COUNT(*), COUNT(organization_id),
       COUNT(*) FILTER (WHERE organization_id IS NULL)
FROM public.project_inputs
UNION ALL
SELECT 'esg_assessments', COUNT(*), COUNT(organization_id),
       COUNT(*) FILTER (WHERE organization_id IS NULL)
FROM public.esg_assessments
UNION ALL
SELECT 'emission_calculator', COUNT(*), COUNT(organization_id),
       COUNT(*) FILTER (WHERE organization_id IS NULL)
FROM public.emission_calculator
UNION ALL
SELECT 'organization_invitations', COUNT(*), COUNT(organization_id),
       COUNT(*) FILTER (WHERE organization_id IS NULL)
FROM public.organization_invitations
UNION ALL
SELECT 'user_organizations', COUNT(*), COUNT(organization_id),
       COUNT(*) FILTER (WHERE organization_id IS NULL)
FROM public.user_organizations
ORDER BY 1;

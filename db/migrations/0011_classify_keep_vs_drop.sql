-- Classify objects: KEEP vs DROP_LATER vs REVIEW
-- Uses a temp table so all result tabs work in pgAdmin.

DROP TABLE IF EXISTS tmp_object_fate;

CREATE TEMP TABLE tmp_object_fate AS
WITH objs AS (
  SELECT
    n.nspname AS schema_name,
    c.relname AS object_name,
    CASE c.relkind
      WHEN 'r' THEN 'table'
      WHEN 'v' THEN 'view'
      ELSE c.relkind::text
    END AS object_type
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('public', 'app', 'catalog', 'ref')
    AND c.relkind IN ('r', 'v')
)
SELECT
  schema_name,
  object_name,
  object_type,
  CASE
    WHEN schema_name = 'app' THEN 'KEEP'
    WHEN schema_name = 'catalog' AND object_type = 'table' THEN 'KEEP'
    WHEN schema_name = 'ref'
         AND object_name IN ('factor_datasets', 'factor_rows')
         AND object_type = 'table' THEN 'KEEP'

    WHEN schema_name = 'public'
         AND object_type = 'table'
         AND object_name IN (
           'organizations',
           'user_organizations',
           'organization_invitations',
           'profiles',
           'counterparties',
           'exposures',
           'counterparty_questionnaires',
           'suppliers',
           'project_inputs',
           'esg_assessments',
           'esg_scores',
           'contact_submissions',
           'schema_migrations',
           'company_emissions',
           'emission_calculator',
           'emission_calculator_preferences',
           'emission_history_assessments',
           'scenario_runs',
           'scenario_results'
         ) THEN 'KEEP'

    WHEN schema_name = 'public' AND object_type = 'view' THEN 'DROP_LATER'
    WHEN schema_name = 'ref' AND object_type = 'table'
         AND object_name NOT IN ('factor_datasets', 'factor_rows') THEN 'DROP_LATER'
    WHEN schema_name = 'public' AND object_type = 'table'
         AND (
           object_name LIKE 'scope1_%'
           OR object_name LIKE 'scope2_%'
           OR object_name LIKE 'scope3_%'
           OR object_name LIKE 'ipcc_scope1_%'
           OR object_name IN (
             'emission_calculations',
             'finance_emission_calculations'
           )
         ) THEN 'DROP_LATER'

    ELSE 'REVIEW'
  END AS fate
FROM objs;

-- 1) Summary
SELECT fate, object_type, COUNT(*) AS n
FROM tmp_object_fate
GROUP BY fate, object_type
ORDER BY fate, object_type;

-- 2) Everything that SHOULD REMAIN
SELECT schema_name, object_type, object_name
FROM tmp_object_fate
WHERE fate = 'KEEP'
ORDER BY schema_name, object_type, object_name;

-- 3) Drop after app cutover (optional — uncomment if you want the list)
-- SELECT schema_name, object_type, object_name
-- FROM tmp_object_fate
-- WHERE fate = 'DROP_LATER'
-- ORDER BY schema_name, object_type, object_name;

-- 4) Ambiguous (optional)
-- SELECT schema_name, object_type, object_name
-- FROM tmp_object_fate
-- WHERE fate = 'REVIEW'
-- ORDER BY schema_name, object_type, object_name;

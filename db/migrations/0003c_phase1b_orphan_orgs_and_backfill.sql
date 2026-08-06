-- Phase 1B fix — orphan data owners have no membership, so backfill matched 0 rows.
-- This script:
--   1) Finds users who own tenant data but have no user_organizations row
--   2) Creates a personal organization + admin membership for each
--   3) Sets profiles.current_organization_id when missing
--   4) Re-runs organization_id backfill on tenant tables
--
-- Safe: does not delete data. Idempotent-ish (skips users who already have membership).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Orphan user_ids (own data, no membership)
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE tmp_orphan_users ON COMMIT DROP AS
SELECT DISTINCT x.user_id
FROM (
  SELECT user_id FROM public.counterparties WHERE user_id IS NOT NULL
  UNION
  SELECT user_id FROM public.exposures WHERE user_id IS NOT NULL
  UNION
  SELECT user_id FROM public.emission_calculations WHERE user_id IS NOT NULL
  UNION
  SELECT user_id FROM public.emission_calculator WHERE user_id IS NOT NULL
  UNION
  SELECT user_id FROM public.esg_assessments WHERE user_id IS NOT NULL
  UNION
  SELECT user_id FROM public.project_inputs WHERE user_id IS NOT NULL
) x
WHERE NOT EXISTS (
  SELECT 1
  FROM public.user_organizations uo
  WHERE uo.user_id = x.user_id
);

SELECT 'orphan_users' AS check_name, COUNT(*) AS n FROM tmp_orphan_users;
SELECT user_id FROM tmp_orphan_users;

-- ---------------------------------------------------------------------------
-- 2) Create personal org + membership for each orphan
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE tmp_created_orgs ON COMMIT DROP AS
SELECT
  o.user_id,
  gen_random_uuid() AS organization_id,
  COALESCE(
    NULLIF(trim(p.display_name), ''),
    NULLIF(trim(p.organization_name), ''),
    'Legacy user ' || left(o.user_id::text, 8)
  ) || ' (legacy)' AS org_name
FROM tmp_orphan_users o
LEFT JOIN public.profiles p ON p.user_id = o.user_id;

INSERT INTO public.organizations (id, name, description, created_at)
SELECT
  c.organization_id,
  c.org_name,
  'Auto-created during Phase 1B tenancy backfill for orphan data owner',
  now()
FROM tmp_created_orgs c
WHERE NOT EXISTS (
  SELECT 1 FROM public.organizations org WHERE org.id = c.organization_id
);

-- If organizations table requires different columns, adjust — common extras ignored if absent via dynamic? 
-- Keep to columns that exist on imported schema: id, name, description, created_at

INSERT INTO public.user_organizations (user_id, organization_id, role, status, created_at, joined_at)
SELECT
  c.user_id,
  c.organization_id,
  'admin',
  'active',
  now(),
  now()
FROM tmp_created_orgs c
WHERE NOT EXISTS (
  SELECT 1
  FROM public.user_organizations uo
  WHERE uo.user_id = c.user_id
    AND uo.organization_id = c.organization_id
);

UPDATE public.profiles p
SET current_organization_id = c.organization_id
FROM tmp_created_orgs c
WHERE p.id = c.user_id
  AND p.current_organization_id IS NULL;

-- ---------------------------------------------------------------------------
-- 3) Preferred org map for ALL users (same rules as before)
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE tmp_user_org ON COMMIT DROP AS
SELECT
  p.id AS user_id,
  COALESCE(
    CASE
      WHEN p.current_organization_id IS NOT NULL
       AND EXISTS (
         SELECT 1
         FROM public.user_organizations uo
         WHERE uo.user_id = p.id
           AND uo.organization_id = p.current_organization_id
       )
      THEN p.current_organization_id
    END,
    (
      SELECT uo.organization_id
      FROM public.user_organizations uo
      WHERE uo.user_id = p.id
      ORDER BY
        CASE WHEN lower(COALESCE(uo.role, '')) IN ('admin', 'owner') THEN 0 ELSE 1 END,
        uo.created_at ASC NULLS LAST
      LIMIT 1
    )
  ) AS organization_id
FROM public.profiles p;

-- Also cover orphan users who might not have a profiles row
INSERT INTO tmp_user_org (user_id, organization_id)
SELECT c.user_id, c.organization_id
FROM tmp_created_orgs c
WHERE NOT EXISTS (SELECT 1 FROM tmp_user_org t WHERE t.user_id = c.user_id);

-- ---------------------------------------------------------------------------
-- 4) Backfill NULL organization_id
-- ---------------------------------------------------------------------------
UPDATE public.counterparties c
SET organization_id = t.organization_id
FROM tmp_user_org t
WHERE c.user_id = t.user_id
  AND c.organization_id IS NULL
  AND t.organization_id IS NOT NULL;

UPDATE public.exposures e
SET organization_id = t.organization_id
FROM tmp_user_org t
WHERE e.user_id = t.user_id
  AND e.organization_id IS NULL
  AND t.organization_id IS NOT NULL;

UPDATE public.emission_calculations ec
SET organization_id = t.organization_id
FROM tmp_user_org t
WHERE ec.user_id = t.user_id
  AND ec.organization_id IS NULL
  AND t.organization_id IS NOT NULL;

UPDATE public.emission_calculator ecalc
SET organization_id = t.organization_id
FROM tmp_user_org t
WHERE ecalc.user_id = t.user_id
  AND ecalc.organization_id IS NULL
  AND t.organization_id IS NOT NULL;

UPDATE public.esg_assessments ea
SET organization_id = t.organization_id
FROM tmp_user_org t
WHERE ea.user_id = t.user_id
  AND ea.organization_id IS NULL
  AND t.organization_id IS NOT NULL;

UPDATE public.project_inputs pi
SET organization_id = t.organization_id
FROM tmp_user_org t
WHERE pi.user_id = t.user_id
  AND pi.organization_id IS NULL
  AND t.organization_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 5) Verify
-- ---------------------------------------------------------------------------
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
SELECT 'emission_calculator', COUNT(*), COUNT(organization_id),
       COUNT(*) FILTER (WHERE organization_id IS NULL)
FROM public.emission_calculator
UNION ALL
SELECT 'esg_assessments', COUNT(*), COUNT(organization_id),
       COUNT(*) FILTER (WHERE organization_id IS NULL)
FROM public.esg_assessments
UNION ALL
SELECT 'project_inputs', COUNT(*), COUNT(organization_id),
       COUNT(*) FILTER (WHERE organization_id IS NULL)
FROM public.project_inputs
ORDER BY 1;

INSERT INTO public.schema_migrations (version, description)
VALUES (
  '0003c_phase1b_orphan_orgs_and_backfill',
  'Create orgs/memberships for orphan data owners, then backfill organization_id'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;

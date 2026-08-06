-- Phase 1B FIX — corrected backfill
--
-- Root cause of previous failure:
--   profiles.id <> profiles.user_id (always).
--   Work tables + user_organizations use auth user id = profiles.user_id.
--   Old script mapped profiles.id → matched 0 rows.
--
-- This script:
--   1) Ensures auth.uid() stub exists (EC2 has no Supabase auth schema)
--   2) Builds preferred org map from profiles.user_id + user_organizations
--   3) Creates personal org + membership for any orphan data owners
--   4) Backfills NULL organization_id on tenant tables
--
-- Safe: fills NULLs only; no deletes; no NOT NULL yet.

BEGIN;

-- ---------------------------------------------------------------------------
-- EC2 compatibility: organizations trigger may call auth.uid()
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(
    current_setting('request.jwt.claim.sub', true),
    ''
  )::uuid;
$$;

-- ---------------------------------------------------------------------------
-- Preferred org per auth user (profiles.user_id)
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE tmp_user_org ON COMMIT DROP AS
SELECT
  p.user_id AS user_id,
  COALESCE(
    CASE
      WHEN p.current_organization_id IS NOT NULL
       AND EXISTS (
         SELECT 1
         FROM public.user_organizations uo
         WHERE uo.user_id = p.user_id
           AND uo.organization_id = p.current_organization_id
       )
      THEN p.current_organization_id
    END,
    (
      SELECT uo.organization_id
      FROM public.user_organizations uo
      WHERE uo.user_id = p.user_id
      ORDER BY
        CASE WHEN lower(COALESCE(uo.role, '')) IN ('admin', 'owner') THEN 0 ELSE 1 END,
        uo.created_at ASC NULLS LAST
      LIMIT 1
    )
  ) AS organization_id
FROM public.profiles p
WHERE p.user_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Orphan auth users: own data, no membership
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
  SELECT 1 FROM public.user_organizations uo WHERE uo.user_id = x.user_id
);

SELECT 'orphan_users_before_fix' AS check_name, COUNT(*) AS n FROM tmp_orphan_users;

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

INSERT INTO public.organizations (id, name, description)
SELECT
  c.organization_id,
  c.org_name,
  'Auto-created during Phase 1B for orphan data owner'
FROM tmp_created_orgs c;

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

-- Ensure orphan users appear in the org map with a real org id
INSERT INTO tmp_user_org (user_id, organization_id)
SELECT c.user_id, c.organization_id
FROM tmp_created_orgs c
WHERE NOT EXISTS (
  SELECT 1 FROM tmp_user_org t
  WHERE t.user_id = c.user_id AND t.organization_id IS NOT NULL
);

UPDATE public.profiles p
SET current_organization_id = t.organization_id
FROM tmp_user_org t
WHERE p.user_id = t.user_id
  AND p.current_organization_id IS NULL
  AND t.organization_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Backfill NULL organization_id
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
-- Verify
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
  '0003d_phase1b_backfill_fixed_user_id',
  'Fix tenancy backfill to use profiles.user_id; create orgs for orphans'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;

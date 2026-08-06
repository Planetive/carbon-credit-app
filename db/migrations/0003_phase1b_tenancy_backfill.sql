-- Phase 1B — Backfill organization_id on tenant tables
-- SAFE: only fills NULL organization_id; does not DELETE; does not set NOT NULL yet.
-- Rule per user:
--   1) profiles.current_organization_id if user is a member of that org
--   2) else first membership (admin preferred, then oldest)
--
-- Run in pgAdmin on EC2. Review the PREVIEW section first if you want, then run the UPDATE block.
-- Re-run 0002_phase1a_tenancy_diagnostic.sql afterward to confirm null_org dropped.

BEGIN;

-- ---------------------------------------------------------------------------
-- Preferred org per user (temp)
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

-- Who still cannot be mapped (no membership / no current org)
SELECT
  'users_without_resolvable_org' AS check_name,
  COUNT(*) AS n
FROM tmp_user_org
WHERE organization_id IS NULL;

-- ---------------------------------------------------------------------------
-- Backfill (NULL only)
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

-- Also fill profiles.current_organization_id when missing but user has a membership
UPDATE public.profiles p
SET current_organization_id = t.organization_id
FROM tmp_user_org t
WHERE p.id = t.user_id
  AND p.current_organization_id IS NULL
  AND t.organization_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Post-check (same shape as diagnostic)
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
  '0003_phase1b_tenancy_backfill',
  'Backfill organization_id from profiles.current_organization_id / user_organizations'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- Phase 1B failure diagnosis (read-only)
-- Why organization_id is still NULL after backfill

-- 1) Sample counterparties: do they have user_id?
SELECT id, user_id, organization_id
FROM public.counterparties
LIMIT 5;

-- 2) Can we resolve an org for those user_ids?
SELECT
  c.id AS counterparty_id,
  c.user_id,
  p.id AS profile_id,
  p.current_organization_id,
  (
    SELECT uo.organization_id
    FROM public.user_organizations uo
    WHERE uo.user_id = c.user_id
    ORDER BY uo.created_at ASC NULLS LAST
    LIMIT 1
  ) AS membership_org
FROM public.counterparties c
LEFT JOIN public.profiles p ON p.id = c.user_id
LIMIT 10;

-- 3) Coverage: how many rows can be mapped?
SELECT
  COUNT(*) AS counterparties_total,
  COUNT(c.user_id) AS with_user_id,
  COUNT(p.id) AS user_has_profile,
  COUNT(uo.organization_id) AS user_has_membership
FROM public.counterparties c
LEFT JOIN public.profiles p ON p.id = c.user_id
LEFT JOIN LATERAL (
  SELECT organization_id
  FROM public.user_organizations u
  WHERE u.user_id = c.user_id
  LIMIT 1
) uo ON true;

-- 4) Same for emission_calculations
SELECT
  COUNT(*) AS emission_calculations_total,
  COUNT(ec.user_id) AS with_user_id,
  COUNT(p.id) AS user_has_profile,
  COUNT(uo.organization_id) AS user_has_membership
FROM public.emission_calculations ec
LEFT JOIN public.profiles p ON p.id = ec.user_id
LEFT JOIN LATERAL (
  SELECT organization_id
  FROM public.user_organizations u
  WHERE u.user_id = ec.user_id
  LIMIT 1
) uo ON true;

-- 5) Distinct user_ids on work tables vs members
SELECT 'counterparties_users' AS src, COUNT(DISTINCT user_id) AS n
FROM public.counterparties
UNION ALL
SELECT 'emission_calc_users', COUNT(DISTINCT user_id)
FROM public.emission_calculations
UNION ALL
SELECT 'member_users', COUNT(DISTINCT user_id)
FROM public.user_organizations
UNION ALL
SELECT 'profile_users', COUNT(*)
FROM public.profiles;

-- 6) Users who own counterparties but have NO membership
SELECT DISTINCT c.user_id
FROM public.counterparties c
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_organizations uo WHERE uo.user_id = c.user_id
)
LIMIT 20;

-- Scope 1 activity-based screening answers (Yes/No/pending/calculated).
-- Target: EC2 Postgres (pgAdmin / AWS) — NOT supabase/migrations.
--
-- Architecture note:
--   With VITE_USE_JWT_AUTH=true, Scope 1 entry rows live in app.emission_activities
--   and granular form fields are stored in emission_activities.raw (jsonb), including
--   activity_meta. Screening answers belong on the KEEP preferences row so they
--   survive devices and are not jammed into localStorage-only.

BEGIN;

ALTER TABLE public.emission_calculator_preferences
  ADD COLUMN IF NOT EXISTS scope1_screening JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.emission_calculator_preferences.scope1_screening IS
  'Activity-group screening: { stationary, vehicles_mobile, leaks_releases, industrial_other }
   each in (not_assessed | not_applicable | applicable_pending | calculated).';

INSERT INTO public.schema_migrations (version, description)
VALUES (
  '0013_scope1_activity_screening',
  'Add scope1_screening jsonb to emission_calculator_preferences for activity-based Scope 1'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;

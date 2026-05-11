-- Allow one assessment per user per assessment_type.
-- Keeps legacy rows intact and enables readiness rows for users who already have legacy rows.

DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'esg_assessments'
      AND c.contype = 'u'
      AND pg_get_constraintdef(c.oid) LIKE 'UNIQUE (user_id)%'
      AND pg_get_constraintdef(c.oid) NOT LIKE '%assessment_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.esg_assessments DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'esg_assessments'
      AND c.contype = 'u'
      AND pg_get_constraintdef(c.oid) = 'UNIQUE (user_id, assessment_type)'
  ) THEN
    ALTER TABLE public.esg_assessments
      ADD CONSTRAINT esg_assessments_user_id_assessment_type_key UNIQUE (user_id, assessment_type);
  END IF;
END $$;

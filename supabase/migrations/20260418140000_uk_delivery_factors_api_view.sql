-- supabase-js / PostgREST can turn "UK_delivery-factors" into public.UK_delivery_factors (underscore),
-- which does not exist. Provide uk_delivery_factors as a view over the real table.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'UK_delivery-factors'
      AND table_type = 'BASE TABLE'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'uk_delivery_factors'
  ) THEN
    BEGIN
      EXECUTE $sql$
        CREATE VIEW public.uk_delivery_factors
        WITH (security_invoker = true)
        AS SELECT * FROM public."UK_delivery-factors"
      $sql$;
    EXCEPTION
      WHEN OTHERS THEN
        EXECUTE $sql$
          CREATE VIEW public.uk_delivery_factors
          AS SELECT * FROM public."UK_delivery-factors"
        $sql$;
    END;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'uk_delivery_factors'
      AND table_type = 'VIEW'
  ) THEN
    EXECUTE 'GRANT SELECT ON public.uk_delivery_factors TO authenticated';
    EXECUTE 'GRANT SELECT ON public.uk_delivery_factors TO anon';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'uk_delivery_factors'
  ) THEN
    EXECUTE $c$
      COMMENT ON VIEW public.uk_delivery_factors IS
        'REST-friendly name for "UK_delivery-factors" (hyphenated table breaks some client resolution).'
    $c$;
  END IF;
END $$;

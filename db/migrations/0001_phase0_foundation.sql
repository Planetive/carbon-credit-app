-- Phase 0 — Foundation on EC2 Postgres
-- Safe to re-run (IF NOT EXISTS / exception handlers).
-- Does NOT move or drop existing public tables.

BEGIN;

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- ---------------------------------------------------------------------------
-- Schemas (empty drawers beside public)
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS ref;

COMMENT ON SCHEMA app IS 'Transactional / per-tenant product data (orgs, portfolio, GHG, ESG)';
COMMENT ON SCHEMA catalog IS 'Shared Explore encyclopedias (projects, CCUS, BESS, markets, country emissions)';
COMMENT ON SCHEMA ref IS 'Emission factor dictionaries (versioned datasets + rows)';

-- ---------------------------------------------------------------------------
-- Roles
-- Change passwords after first apply (or set via ALTER ROLE before production use).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'migrator') THEN
    CREATE ROLE migrator LOGIN PASSWORD 'CHANGE_ME_migrator' BYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN PASSWORD 'CHANGE_ME_app_user' NOSUPERUSER NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'catalog_reader') THEN
    CREATE ROLE catalog_reader NOLOGIN;
  END IF;
END
$$;

COMMENT ON ROLE migrator IS 'Migrations and bulk imports; bypasses RLS';
COMMENT ON ROLE app_user IS 'Application runtime role; subject to RLS';
COMMENT ON ROLE catalog_reader IS 'Read-only grants for catalog + ref (grant to app_user)';

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA app, catalog, ref, public TO migrator;
GRANT USAGE ON SCHEMA app, catalog, ref, public TO app_user;
GRANT USAGE ON SCHEMA catalog, ref TO catalog_reader;

GRANT ALL ON SCHEMA app, catalog, ref TO migrator;
GRANT CREATE ON SCHEMA app, catalog, ref TO migrator;

GRANT catalog_reader TO app_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA catalog
  GRANT SELECT ON TABLES TO catalog_reader, app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA ref
  GRANT SELECT ON TABLES TO catalog_reader, app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA app
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;

-- Existing public tables: keep current ownership; app_user can still use
-- whatever grants already exist from the import. Do not revoke public access here.

-- ---------------------------------------------------------------------------
-- Migration ledger
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version text PRIMARY KEY,
  description text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.schema_migrations (version, description)
VALUES (
  '0001_phase0_foundation',
  'Create schemas app/catalog/ref, roles migrator/app_user/catalog_reader, pgcrypto, migration ledger'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;

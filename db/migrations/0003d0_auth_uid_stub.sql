-- Fix for EC2: organizations trigger calls auth.uid() (Supabase-only).
-- Run this ONCE, then ROLLBACK any aborted txn and re-run 0003d.

BEGIN;

CREATE SCHEMA IF NOT EXISTS auth;

-- Stub: on EC2 there is no JWT session; return NULL (created_by stays unset).
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

COMMIT;

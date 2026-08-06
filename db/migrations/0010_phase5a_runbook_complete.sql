-- Phase 5A — Record completion; no destructive drops
-- Old scope/calc/factor sheets intentionally kept until app cutover.

BEGIN;

INSERT INTO public.schema_migrations (version, description)
VALUES (
  '0010_phase5a_runbook_complete',
  'Phases 0-4 complete on EC2; runbook documented; legacy tables retained for dual-read'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;

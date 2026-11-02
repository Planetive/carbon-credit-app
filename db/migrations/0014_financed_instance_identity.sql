-- PROPOSED — do not apply from this task. Do not run against production.
--
-- Calculator loan identity is financing_instance_id in JSON, not formula_id
-- and not public.exposures.id. app.financed_emissions.exposure_id remains a
-- UUID FK to the portfolio exposures table and must not store calculator IDs.
--
-- This migration is backward compatible:
--   * does not rewrite historical rows
--   * does not guess instance ids for unlinked records
--   * does not unique-index formula_id
--
-- FastAPI contract required before applying:
--   * persist inputs JSON as sent, including financing_instance_id
--   * match updates by inputs.financing_instance_id when present
--   * do not unique (counterparty_id, formula_id)
--   * never write calculator instance UUIDs into exposure_id

BEGIN;

CREATE INDEX IF NOT EXISTS idx_financed_emissions_instance_id
  ON app.financed_emissions ((inputs->>'financing_instance_id'))
  WHERE nullif(inputs->>'financing_instance_id', '') IS NOT NULL;

-- Active instanced calculations only. Unlinked legacy rows stay unrestricted.
CREATE UNIQUE INDEX IF NOT EXISTS uq_financed_emissions_active_instance
  ON app.financed_emissions (
    organization_id,
    counterparty_id,
    calc_kind,
    (inputs->>'financing_instance_id')
  )
  WHERE nullif(inputs->>'financing_instance_id', '') IS NOT NULL
    AND coalesce(formula_id, '') <> 'aggregate'
    AND status IS DISTINCT FROM 'failed';

COMMIT;

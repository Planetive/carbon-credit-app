-- Reference data for Scope 1 delivery / freight (DEFRA-style).
-- Canonical table name: UK_delivery-factors (quoted identifier). App loads via ukDeliveryFactors.ts.

CREATE TABLE IF NOT EXISTS public."UK_delivery-factors" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity TEXT NOT NULL,
  type TEXT NOT NULL,
  unit TEXT NOT NULL,
  fuel_type TEXT NOT NULL,
  laden_lev TEXT NOT NULL DEFAULT '',
  kg_co2e NUMERIC,
  kg_co2e_of_co2_per_unit NUMERIC,
  kg_co2e_of_ch4_per_unit NUMERIC,
  kg_co2e_of_n2o_per_unit NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public."UK_delivery-factors" IS
  'UK delivery vehicle emission factors; at least one of kg_co2e / per-gas columns should be set per row.';

CREATE INDEX IF NOT EXISTS idx_uk_delivery_factors_activity_type
  ON public."UK_delivery-factors" (activity, type);

ALTER TABLE public."UK_delivery-factors" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS uk_delivery_factors_select_authenticated ON public."UK_delivery-factors";

CREATE POLICY uk_delivery_factors_select_authenticated
  ON public."UK_delivery-factors"
  FOR SELECT
  TO authenticated
  USING (auth.role() = 'authenticated');

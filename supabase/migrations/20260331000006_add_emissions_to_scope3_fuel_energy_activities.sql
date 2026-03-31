-- Add emissions field to Scope 3 Fuel & Energy Related Activities
ALTER TABLE public.scope3_fuel_energy_activities
ADD COLUMN IF NOT EXISTS emissions NUMERIC NOT NULL DEFAULT 0 CHECK (emissions >= 0);

CREATE INDEX IF NOT EXISTS idx_s3_fea_emissions
  ON public.scope3_fuel_energy_activities(emissions);

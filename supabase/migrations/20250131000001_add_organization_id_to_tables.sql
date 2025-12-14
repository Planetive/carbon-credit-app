-- Add organization_id to key tables for data scoping
-- This allows data to be filtered by organization instead of just user_id

-- Add organization_id to project_inputs
ALTER TABLE public.project_inputs 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add organization_id to esg_assessments
ALTER TABLE public.esg_assessments 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add organization_id to emission_calculator
ALTER TABLE public.emission_calculator 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add organization_id to counterparties (for bank portfolio)
ALTER TABLE public.counterparties 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add organization_id to exposures
ALTER TABLE public.exposures 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add organization_id to emission_calculations
ALTER TABLE public.emission_calculations 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_project_inputs_org_id ON public.project_inputs(organization_id);
CREATE INDEX IF NOT EXISTS idx_esg_assessments_org_id ON public.esg_assessments(organization_id);
CREATE INDEX IF NOT EXISTS idx_emission_calculator_org_id ON public.emission_calculator(organization_id);
CREATE INDEX IF NOT EXISTS idx_counterparties_org_id ON public.counterparties(organization_id);
CREATE INDEX IF NOT EXISTS idx_exposures_org_id ON public.exposures(organization_id);
CREATE INDEX IF NOT EXISTS idx_emission_calculations_org_id ON public.emission_calculations(organization_id);

-- Note: Existing data will have NULL organization_id
-- You may want to backfill this data by setting organization_id based on user_id
-- Example migration for backfilling (run separately if needed):
-- UPDATE public.project_inputs pi
-- SET organization_id = (
--   SELECT current_organization_id 
--   FROM public.profiles 
--   WHERE user_id = pi.user_id
-- )
-- WHERE organization_id IS NULL;


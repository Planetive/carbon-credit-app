-- Remove organization dependencies from database
-- Make organization_id columns nullable and remove foreign key constraints where possible

-- Make organization_name nullable in profiles (if not already)
ALTER TABLE public.profiles 
ALTER COLUMN organization_name DROP NOT NULL;

-- Make current_organization_id nullable in profiles (if not already)
ALTER TABLE public.profiles 
ALTER COLUMN current_organization_id DROP NOT NULL;

-- Make organization_id nullable in all tables that reference organizations
-- Note: We keep the columns but make them optional so existing data isn't lost

ALTER TABLE public.project_inputs 
ALTER COLUMN organization_id DROP NOT NULL;

ALTER TABLE public.esg_assessments 
ALTER COLUMN organization_id DROP NOT NULL;

ALTER TABLE public.emission_calculator 
ALTER COLUMN organization_id DROP NOT NULL;

ALTER TABLE public.counterparties 
ALTER COLUMN organization_id DROP NOT NULL;

ALTER TABLE public.exposures 
ALTER COLUMN organization_id DROP NOT NULL;

ALTER TABLE public.emission_calculations 
ALTER COLUMN organization_id DROP NOT NULL;

-- Note: We're not dropping the organization_id columns or foreign key constraints
-- to preserve data integrity. The columns are now optional and can be NULL.
-- The organizations and user_organizations tables remain but are no longer used in the UI.


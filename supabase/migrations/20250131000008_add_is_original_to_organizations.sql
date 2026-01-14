-- Add is_original field to organizations table
-- This marks the user's first/original organization created during signup

-- Add the column
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS is_original BOOLEAN DEFAULT false;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_organizations_is_original ON public.organizations(is_original) WHERE is_original = true;

-- Update existing organizations: mark the first one created by each user as original
-- This finds the earliest organization for each user and marks it as original
UPDATE public.organizations o
SET is_original = true
WHERE o.id IN (
  SELECT DISTINCT ON (uo.user_id) o2.id
  FROM public.user_organizations uo
  JOIN public.organizations o2 ON o2.id = uo.organization_id
  WHERE uo.role = 'admin'
  ORDER BY uo.user_id, o2.created_at ASC
)
AND o.is_original = false;

-- Update the trigger function to mark the first organization as original
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  user_org_count INTEGER;
BEGIN
  -- Get the current user ID from the JWT token
  current_user_id := auth.uid();
  
  -- If no user ID, we can't proceed
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to create an organization';
  END IF;
  
  -- Check if this is the user's first organization
  SELECT COUNT(*) INTO user_org_count
  FROM public.user_organizations
  WHERE user_id = current_user_id;
  
  -- If this is the first organization, mark it as original
  IF user_org_count = 0 THEN
    UPDATE public.organizations
    SET is_original = true
    WHERE id = NEW.id;
  END IF;
  
  -- Use the helper function to add user as admin (bypasses RLS)
  PERFORM public.add_user_to_organization(current_user_id, NEW.id, 'admin');
  
  -- If this is the user's first organization, set it as current
  UPDATE public.profiles
  SET current_organization_id = NEW.id
  WHERE user_id = current_user_id 
    AND current_organization_id IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON COLUMN public.organizations.is_original IS 'Marks the user''s first/original organization created during signup. Only one organization per user should have this set to true.';


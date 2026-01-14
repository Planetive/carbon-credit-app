-- Fix infinite recursion in user_organizations RLS policies
-- The issue: "Admins can add users to organizations" policy queries user_organizations
-- while trying to insert into it, creating infinite recursion

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Admins can add users to organizations" ON public.user_organizations;

-- Create a SECURITY DEFINER function to handle inserting users into organizations
-- This bypasses RLS and prevents recursion
CREATE OR REPLACE FUNCTION public.add_user_to_organization(
  p_user_id UUID,
  p_organization_id UUID,
  p_role TEXT DEFAULT 'viewer'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert the user-organization relationship
  -- SECURITY DEFINER bypasses RLS, so no recursion
  INSERT INTO public.user_organizations (user_id, organization_id, role)
  VALUES (p_user_id, p_organization_id, p_role)
  ON CONFLICT (user_id, organization_id) DO UPDATE
  SET role = EXCLUDED.role;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.add_user_to_organization(UUID, UUID, TEXT) TO authenticated;

-- Update the trigger function to use the new helper function
DROP TRIGGER IF EXISTS on_organization_created ON public.organizations;
DROP FUNCTION IF EXISTS public.handle_new_organization();

CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get the current user ID from the JWT token
  current_user_id := auth.uid();
  
  -- If no user ID, we can't proceed
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to create an organization';
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

-- Recreate the trigger
CREATE TRIGGER on_organization_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_organization();

-- Keep the simple policy for users to add themselves (no recursion here)
-- This is for when users create their own organization membership
DROP POLICY IF EXISTS "Users can create organization memberships" ON public.user_organizations;

CREATE POLICY "Users can create organization memberships"
  ON public.user_organizations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Fix the SELECT policy that's also causing recursion
-- The "Admins can view organization memberships" policy queries user_organizations
-- while checking SELECT on user_organizations, causing infinite recursion

DROP POLICY IF EXISTS "Admins can view organization memberships" ON public.user_organizations;
DROP POLICY IF EXISTS "Admins can update organization memberships" ON public.user_organizations;
DROP POLICY IF EXISTS "Admins can remove users from organizations" ON public.user_organizations;

-- Create a helper function for admins to check if they're admin of an organization
-- This avoids querying user_organizations in the policy itself
CREATE OR REPLACE FUNCTION public.is_org_admin(p_organization_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1
    FROM public.user_organizations
    WHERE user_id = current_user_id
      AND organization_id = p_organization_id
      AND role = 'admin'
      AND (status = 'active' OR status IS NULL)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_org_admin(UUID) TO authenticated;

-- Now create non-recursive policies using the helper function
CREATE POLICY "Admins can view organization memberships"
  ON public.user_organizations FOR SELECT
  TO authenticated
  USING (
    -- Users can view their own memberships (no recursion)
    user_id = auth.uid()
    OR
    -- Admins can view memberships in their organizations (uses function, no recursion)
    public.is_org_admin(organization_id)
  );

CREATE POLICY "Admins can update organization memberships"
  ON public.user_organizations FOR UPDATE
  TO authenticated
  USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "Admins can remove users from organizations"
  ON public.user_organizations FOR DELETE
  TO authenticated
  USING (public.is_org_admin(organization_id));

-- For admins adding other users, we'll use the function instead of a policy
-- This prevents recursion. Admins should call the add_user_to_organization function
-- through an RPC or the function will be called by the application

COMMENT ON FUNCTION public.add_user_to_organization IS 'Helper function to add users to organizations. Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion.';
COMMENT ON FUNCTION public.is_org_admin IS 'Helper function to check if current user is admin of an organization. Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion.';



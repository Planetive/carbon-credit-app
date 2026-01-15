-- Fix DELETE policy for organizations
-- Ensure the policy exists and works correctly

-- Drop the policy if it exists (to recreate it)
DROP POLICY IF EXISTS "Admins can delete organizations" ON public.organizations;

-- Recreate the policy with proper error handling
CREATE POLICY "Admins can delete organizations"
  ON public.organizations FOR DELETE
  TO authenticated
  USING (public.is_org_admin(id));

-- Verify the function exists and is correct
-- The is_org_admin function should check for admin role with active or null status
-- This is already defined in 20250131000006_fix_user_organizations_recursion.sql

-- Add a comment
COMMENT ON POLICY "Admins can delete organizations" ON public.organizations IS 'Allows admins to delete organizations they are admin of. Uses is_org_admin function to avoid RLS recursion.';


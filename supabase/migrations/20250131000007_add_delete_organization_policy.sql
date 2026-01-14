-- Add DELETE policy for organizations
-- Only admins can delete organizations they are admin of

-- Use the is_org_admin helper function to avoid recursion
CREATE POLICY "Admins can delete organizations"
  ON public.organizations FOR DELETE
  TO authenticated
  USING (public.is_org_admin(id));

COMMENT ON POLICY "Admins can delete organizations" ON public.organizations IS 'Allows admins to delete organizations they are admin of. Uses is_org_admin function to avoid RLS recursion.';


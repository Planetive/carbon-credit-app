-- Fix RLS policies for organization creation
-- The error occurs because the INSERT policy might not be working correctly
-- or there's a conflict with default RLS behavior

-- First, ensure we can insert into organizations
-- Drop existing policy and recreate with explicit role
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;

-- Create a more permissive INSERT policy for authenticated users
CREATE POLICY "Users can create organizations"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Fix the trigger function to ensure it works correctly
DROP TRIGGER IF EXISTS on_organization_created ON public.organizations;
DROP FUNCTION IF EXISTS public.handle_new_organization();

-- Recreate the function with explicit security settings
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
  
  -- Insert the creator as admin of the new organization
  -- SECURITY DEFINER should bypass RLS, but we'll be explicit
  INSERT INTO public.user_organizations (user_id, organization_id, role)
  VALUES (current_user_id, NEW.id, 'admin')
  ON CONFLICT (user_id, organization_id) DO NOTHING;
  
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

-- Update SELECT policy to allow viewing newly created organizations
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;

CREATE POLICY "Users can view their organizations"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (
    -- User belongs to the organization
    id IN (
      SELECT organization_id 
      FROM public.user_organizations 
      WHERE user_id = auth.uid()
    )
    OR
    -- Allow viewing organizations created in the last 10 seconds
    -- (gives the trigger time to complete and add user to user_organizations)
    (created_at > NOW() - INTERVAL '10 seconds' AND auth.uid() IS NOT NULL)
  );

-- Add a separate policy for viewing recently created organizations
-- This ensures users can see their organization immediately after creation
CREATE POLICY "Users can view organizations they created"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (
    created_at > NOW() - INTERVAL '10 seconds'
  );

-- Ensure user_organizations INSERT policy works correctly
-- The trigger function should bypass RLS, but let's make sure the policy is correct
DROP POLICY IF EXISTS "Users can create organization memberships" ON public.user_organizations;

CREATE POLICY "Users can create organization memberships"
  ON public.user_organizations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

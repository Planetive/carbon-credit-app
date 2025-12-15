-- Fix organization creation during signup
-- The issue is that after signUp(), the session might not be immediately available
-- This function will be called via RPC to create organization and profile

-- Create a function to handle organization creation for new users
-- This function bypasses RLS using SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.create_organization_for_user(
  p_user_id UUID,
  p_organization_name TEXT,
  p_display_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_user_type TEXT DEFAULT 'financial_institution'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_result JSONB;
BEGIN
  -- Create the organization
  INSERT INTO public.organizations (name, description, parent_organization_id)
  VALUES (p_organization_name, NULL, NULL)
  RETURNING id INTO v_org_id;

  -- Add user as admin of the organization
  -- Since this is SECURITY DEFINER, we can bypass RLS
  INSERT INTO public.user_organizations (user_id, organization_id, role)
  VALUES (p_user_id, v_org_id, 'admin')
  ON CONFLICT (user_id, organization_id) DO NOTHING;

  -- Create or update the profile
  INSERT INTO public.profiles (
    user_id,
    organization_name,
    display_name,
    phone,
    user_type,
    current_organization_id
  )
  VALUES (
    p_user_id,
    p_organization_name,
    COALESCE(p_display_name, split_part((SELECT email FROM auth.users WHERE id = p_user_id), '@', 1)),
    p_phone,
    p_user_type,
    v_org_id
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    organization_name = EXCLUDED.organization_name,
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    user_type = EXCLUDED.user_type,
    current_organization_id = v_org_id;

  -- Return the result
  v_result := jsonb_build_object(
    'organization_id', v_org_id,
    'success', true
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_organization_for_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_organization_for_user TO anon;

-- Also update the INSERT policy to be more explicit
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;

CREATE POLICY "Users can create organizations"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Ensure the trigger function works correctly even if called from RPC
-- The trigger should still work, but let's make sure it handles the case where profile doesn't exist yet
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
  
  -- If no user ID, we can't proceed (but this shouldn't happen with SECURITY DEFINER)
  IF current_user_id IS NULL THEN
    -- Try to get user_id from the context if available
    -- This is a fallback for when called from RPC
    RETURN NEW;
  END IF;
  
  -- Insert the creator as admin of the new organization
  INSERT INTO public.user_organizations (user_id, organization_id, role)
  VALUES (current_user_id, NEW.id, 'admin')
  ON CONFLICT (user_id, organization_id) DO NOTHING;
  
  -- If this is the user's first organization, set it as current
  -- Only update if profile exists
  UPDATE public.profiles
  SET current_organization_id = NEW.id
  WHERE user_id = current_user_id 
    AND current_organization_id IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


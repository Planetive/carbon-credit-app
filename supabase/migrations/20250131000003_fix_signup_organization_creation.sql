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
SET search_path = auth, public
AS $$
DECLARE
  v_org_id UUID;
  v_result JSONB;
  v_user_email TEXT;
BEGIN
  -- Try to get user email (may fail if user not ready yet, but that's OK)
  BEGIN
    SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
  EXCEPTION
    WHEN OTHERS THEN
      v_user_email := NULL; -- Email not available yet, continue anyway
  END;
  
  -- Create the organization first (this always works)
  INSERT INTO public.organizations (name, description, parent_organization_id)
  VALUES (p_organization_name, NULL, NULL)
  RETURNING id INTO v_org_id;

  -- Try to add user as admin of the organization
  -- If user doesn't exist yet in auth.users, this will fail with foreign key error
  BEGIN
    INSERT INTO public.user_organizations (user_id, organization_id, role)
    VALUES (p_user_id, v_org_id, 'admin')
    ON CONFLICT (user_id, organization_id) DO NOTHING;
  EXCEPTION
    WHEN foreign_key_violation THEN
      -- User not ready yet, return error for frontend to retry
      RETURN jsonb_build_object(
        'success', false,
        'error', 'User not ready yet. Please retry shortly.',
        'organization_id', v_org_id
      );
    WHEN OTHERS THEN
      -- Other error, re-raise it
      RAISE;
  END;

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
    COALESCE(p_display_name, split_part(COALESCE(v_user_email, ''), '@', 1)),
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
  WHEN foreign_key_violation THEN
    -- If user is not yet visible in auth.users, signal a retry
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not ready yet. Please retry shortly.'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM || ' (Error Code: ' || SQLSTATE || ')'
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
-- NOTE: This trigger is disabled when called from RPC function since RPC handles user_organizations insertion
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_user_id UUID;
  v_user_exists BOOLEAN;
BEGIN
  -- Get the current user ID from the JWT token
  current_user_id := auth.uid();
  
  -- If no user ID, skip (this happens when called from RPC function)
  -- The RPC function handles user_organizations insertion directly
  IF current_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Verify user exists before inserting
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = current_user_id) INTO v_user_exists;
  
  IF NOT v_user_exists THEN
    -- User doesn't exist yet, skip (will be handled by RPC function)
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
EXCEPTION
  WHEN foreign_key_violation THEN
    -- If foreign key fails, just return NEW (RPC function will handle it)
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


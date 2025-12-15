-- IMPORTANT: Apply this migration in Supabase SQL Editor
-- This updates the create_profile_for_user function to remove organization_name parameter

-- Step 1: Update the function signature
CREATE OR REPLACE FUNCTION public.create_profile_for_user(
  p_user_id UUID,
  p_display_name TEXT,
  p_phone TEXT DEFAULT NULL,
  p_user_type TEXT DEFAULT 'financial_institution'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Upsert profile
  INSERT INTO public.profiles (
    user_id,
    display_name,
    phone,
    user_type
  )
  VALUES (
    p_user_id,
    p_display_name,
    p_phone,
    p_user_type
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    display_name = EXCLUDED.display_name,
    phone = EXCLUDED.phone,
    user_type = EXCLUDED.user_type;

  v_result := jsonb_build_object(
    'success', true
  );

  RETURN v_result;
EXCEPTION
  WHEN foreign_key_violation THEN
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

-- Step 2: Grant permissions
GRANT EXECUTE ON FUNCTION public.create_profile_for_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_profile_for_user TO anon;

-- Step 3: Make organization columns nullable (optional - if you want to remove organization dependencies)
ALTER TABLE public.profiles 
ALTER COLUMN organization_name DROP NOT NULL;

ALTER TABLE public.profiles 
ALTER COLUMN current_organization_id DROP NOT NULL;


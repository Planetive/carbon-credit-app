-- RPC to create or update profile with SECURITY DEFINER to bypass RLS timing issues
-- This avoids "row-level security" errors when auth.uid() is not yet available after signup

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

-- Allow authenticated and anon (signup flow) to call
GRANT EXECUTE ON FUNCTION public.create_profile_for_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_profile_for_user TO anon;


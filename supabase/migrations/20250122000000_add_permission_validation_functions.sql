-- Migration: Add server-side permission validation functions
-- These functions validate permissions at the database level for security

-- ============================================
-- 1. PERMISSION VALIDATION FUNCTIONS
-- ============================================

-- Function to check if user has a specific permission in an organization
CREATE OR REPLACE FUNCTION public.check_user_permission(
  p_user_id UUID,
  p_organization_id UUID,
  p_permission TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
  v_permissions JSONB;
BEGIN
  -- Get user's role and permissions in the organization
  SELECT role, permissions INTO v_role, v_permissions
  FROM public.user_organizations
  WHERE user_id = p_user_id
    AND organization_id = p_organization_id
    AND status = 'active';

  -- If user is not a member, return false
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Admins have all permissions
  IF v_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Check specific permission
  IF v_permissions IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if permission is explicitly set to true
  RETURN (v_permissions->>p_permission)::boolean = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user has a specific permission
CREATE OR REPLACE FUNCTION public.check_current_user_permission(
  p_organization_id UUID,
  p_permission TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.check_user_permission(auth.uid(), p_organization_id, p_permission);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has any of the specified permissions (OR logic)
CREATE OR REPLACE FUNCTION public.check_user_any_permission(
  p_user_id UUID,
  p_organization_id UUID,
  p_permissions TEXT[]
)
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
  v_user_permissions JSONB;
  v_perm TEXT;
BEGIN
  -- Get user's role and permissions
  SELECT role, permissions INTO v_role, v_user_permissions
  FROM public.user_organizations
  WHERE user_id = p_user_id
    AND organization_id = p_organization_id
    AND status = 'active';

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Admins have all permissions
  IF v_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Check if user has any of the specified permissions
  IF v_user_permissions IS NULL THEN
    RETURN FALSE;
  END IF;

  FOREACH v_perm IN ARRAY p_permissions
  LOOP
    IF (v_user_permissions->>v_perm)::boolean = TRUE THEN
      RETURN TRUE;
    END IF;
  END LOOP;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has all of the specified permissions (AND logic)
CREATE OR REPLACE FUNCTION public.check_user_all_permissions(
  p_user_id UUID,
  p_organization_id UUID,
  p_permissions TEXT[]
)
RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT;
  v_user_permissions JSONB;
  v_perm TEXT;
BEGIN
  -- Get user's role and permissions
  SELECT role, permissions INTO v_role, v_user_permissions
  FROM public.user_organizations
  WHERE user_id = p_user_id
    AND organization_id = p_organization_id
    AND status = 'active';

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Admins have all permissions
  IF v_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Check if user has all of the specified permissions
  IF v_user_permissions IS NULL THEN
    RETURN FALSE;
  END IF;

  FOREACH v_perm IN ARRAY p_permissions
  LOOP
    IF (v_user_permissions->>v_perm)::boolean != TRUE THEN
      RETURN FALSE;
    END IF;
  END LOOP;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's effective permissions (including role-based defaults)
CREATE OR REPLACE FUNCTION public.get_user_effective_permissions(
  p_user_id UUID,
  p_organization_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_role TEXT;
  v_permissions JSONB;
  v_default_permissions JSONB;
BEGIN
  -- Get user's role and custom permissions
  SELECT role, permissions INTO v_role, v_permissions
  FROM public.user_organizations
  WHERE user_id = p_user_id
    AND organization_id = p_organization_id
    AND status = 'active';

  IF NOT FOUND THEN
    RETURN '{}'::jsonb;
  END IF;

  -- Get default permissions for the role
  SELECT get_default_permissions(v_role) INTO v_default_permissions;

  -- If user has custom permissions, merge them (custom overrides defaults)
  IF v_permissions IS NOT NULL THEN
    RETURN v_default_permissions || v_permissions;
  END IF;

  RETURN v_default_permissions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. PERMISSION-BASED RLS HELPER FUNCTIONS
-- ============================================

-- Function to check if user can create projects in organization
CREATE OR REPLACE FUNCTION public.can_create_projects(p_organization_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.check_current_user_permission(p_organization_id, 'can_create_projects');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can edit projects in organization
CREATE OR REPLACE FUNCTION public.can_edit_projects(p_organization_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.check_current_user_permission(p_organization_id, 'can_edit_projects');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can delete projects in organization
CREATE OR REPLACE FUNCTION public.can_delete_projects(p_organization_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.check_current_user_permission(p_organization_id, 'can_delete_projects');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can view reports in organization
CREATE OR REPLACE FUNCTION public.can_view_reports(p_organization_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.check_current_user_permission(p_organization_id, 'can_view_reports');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can manage users in organization
CREATE OR REPLACE FUNCTION public.can_manage_users(p_organization_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.check_current_user_permission(p_organization_id, 'can_manage_users');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. COMMENTS
-- ============================================

COMMENT ON FUNCTION public.check_user_permission IS 'Check if a user has a specific permission in an organization';
COMMENT ON FUNCTION public.check_current_user_permission IS 'Check if the current authenticated user has a specific permission';
COMMENT ON FUNCTION public.check_user_any_permission IS 'Check if user has any of the specified permissions (OR logic)';
COMMENT ON FUNCTION public.check_user_all_permissions IS 'Check if user has all of the specified permissions (AND logic)';
COMMENT ON FUNCTION public.get_user_effective_permissions IS 'Get user''s effective permissions (role defaults + custom overrides)';


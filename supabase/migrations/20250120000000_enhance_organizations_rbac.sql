-- Phase 1: Enhanced Multi-Organization and RBAC System
-- This migration enhances the existing organization system with:
-- 1. Granular per-feature permissions
-- 2. Invitation system
-- 3. Enhanced role management
-- 4. Status tracking

-- ============================================
-- 1. ENHANCE EXISTING TABLES
-- ============================================

-- Add created_by to organizations table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'organizations' 
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.organizations 
    ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add is_active to organizations table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'organizations' 
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.organizations 
    ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Enhance user_organizations table with new fields
DO $$ 
BEGIN
  -- Add invited_by if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_organizations' 
    AND column_name = 'invited_by'
  ) THEN
    ALTER TABLE public.user_organizations 
    ADD COLUMN invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  -- Add invited_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_organizations' 
    AND column_name = 'invited_at'
  ) THEN
    ALTER TABLE public.user_organizations 
    ADD COLUMN invited_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add joined_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_organizations' 
    AND column_name = 'joined_at'
  ) THEN
    ALTER TABLE public.user_organizations 
    ADD COLUMN joined_at TIMESTAMP WITH TIME ZONE DEFAULT now();
  END IF;

  -- Add status if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_organizations' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.user_organizations 
    ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'inactive'));
  END IF;

  -- Add permissions JSONB field for granular per-feature permissions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_organizations' 
    AND column_name = 'permissions'
  ) THEN
    ALTER TABLE public.user_organizations 
    ADD COLUMN permissions JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- Update role constraint to include 'user' (if not already)
  -- Note: We'll handle this with a new constraint
END $$;

-- Update role constraint to allow 'admin' and 'user' roles
ALTER TABLE public.user_organizations 
DROP CONSTRAINT IF EXISTS user_organizations_role_check;

ALTER TABLE public.user_organizations 
ADD CONSTRAINT user_organizations_role_check 
CHECK (role IN ('admin', 'user', 'editor', 'viewer'));

-- ============================================
-- 2. CREATE INVITATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'editor', 'viewer')),
  permissions JSONB DEFAULT '{}'::jsonb,
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Organizations indexes
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON public.organizations(created_by);
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON public.organizations(is_active);
CREATE INDEX IF NOT EXISTS idx_organizations_parent_active ON public.organizations(parent_organization_id, is_active) WHERE is_active = true;

-- User organizations indexes
CREATE INDEX IF NOT EXISTS idx_user_organizations_status ON public.user_organizations(status);
CREATE INDEX IF NOT EXISTS idx_user_organizations_role ON public.user_organizations(role);
CREATE INDEX IF NOT EXISTS idx_user_organizations_invited_by ON public.user_organizations(invited_by);
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_status ON public.user_organizations(user_id, status) WHERE status = 'active';

-- Invitations indexes
CREATE INDEX IF NOT EXISTS idx_org_invitations_email ON public.organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_org_invitations_token ON public.organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_org_invitations_org_id ON public.organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_status ON public.organization_invitations(status);
CREATE INDEX IF NOT EXISTS idx_org_invitations_expires ON public.organization_invitations(expires_at) WHERE status = 'pending';

-- ============================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. RLS POLICIES FOR ORGANIZATIONS
-- ============================================

-- Drop existing policies if they exist (to recreate with enhancements)
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update organizations" ON public.organizations;

-- Enhanced: Users can view organizations they belong to (active members only)
CREATE POLICY "Users can view their organizations"
  ON public.organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id 
      FROM public.user_organizations 
      WHERE user_id = auth.uid() 
        AND status = 'active'
    )
  );

-- Enhanced: Users can create organizations (they'll be added as admin automatically)
CREATE POLICY "Users can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (true);

-- Enhanced: Admins can update organizations they are admin of
CREATE POLICY "Admins can update organizations"
  ON public.organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id 
      FROM public.user_organizations 
      WHERE user_id = auth.uid() 
        AND role = 'admin' 
        AND status = 'active'
    )
  );

-- ============================================
-- 6. RLS POLICIES FOR USER_ORGANIZATIONS
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their organization memberships" ON public.user_organizations;
DROP POLICY IF EXISTS "Users can create organization memberships" ON public.user_organizations;
DROP POLICY IF EXISTS "Admins can add users to organizations" ON public.user_organizations;
DROP POLICY IF EXISTS "Admins can update organization memberships" ON public.user_organizations;

-- Enhanced: Users can view their own memberships
CREATE POLICY "Users can view their organization memberships"
  ON public.user_organizations FOR SELECT
  USING (user_id = auth.uid());

-- Enhanced: Admins can view all memberships in their organizations
CREATE POLICY "Admins can view organization memberships"
  ON public.user_organizations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.user_organizations 
      WHERE user_id = auth.uid() 
        AND role = 'admin' 
        AND status = 'active'
    )
  );

-- Enhanced: Users can create organization memberships (for themselves initially)
CREATE POLICY "Users can create organization memberships"
  ON public.user_organizations FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Enhanced: Admins can add other users to their organizations
CREATE POLICY "Admins can add users to organizations"
  ON public.user_organizations FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM public.user_organizations 
      WHERE user_id = auth.uid() 
        AND role = 'admin' 
        AND status = 'active'
    )
  );

-- Enhanced: Admins can update organization memberships (role, permissions, status)
CREATE POLICY "Admins can update organization memberships"
  ON public.user_organizations FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.user_organizations 
      WHERE user_id = auth.uid() 
        AND role = 'admin' 
        AND status = 'active'
    )
  );

-- Enhanced: Admins can remove users from organizations
CREATE POLICY "Admins can remove users from organizations"
  ON public.user_organizations FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.user_organizations 
      WHERE user_id = auth.uid() 
        AND role = 'admin' 
        AND status = 'active'
    )
    AND user_id != auth.uid() -- Cannot remove yourself
  );

-- ============================================
-- 7. RLS POLICIES FOR INVITATIONS
-- ============================================

-- Admins can view invitations for their organizations
CREATE POLICY "Admins can view organization invitations"
  ON public.organization_invitations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.user_organizations 
      WHERE user_id = auth.uid() 
        AND role = 'admin' 
        AND status = 'active'
    )
  );

-- Users can view invitations sent to their email
CREATE POLICY "Users can view their invitations"
  ON public.organization_invitations FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND status = 'pending'
  );

-- Admins can create invitations for their organizations
CREATE POLICY "Admins can create invitations"
  ON public.organization_invitations FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM public.user_organizations 
      WHERE user_id = auth.uid() 
        AND role = 'admin' 
        AND status = 'active'
    )
    AND invited_by = auth.uid()
  );

-- Admins can update invitations for their organizations
CREATE POLICY "Admins can update invitations"
  ON public.organization_invitations FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.user_organizations 
      WHERE user_id = auth.uid() 
        AND role = 'admin' 
        AND status = 'active'
    )
  );

-- Admins can cancel invitations for their organizations
CREATE POLICY "Admins can cancel invitations"
  ON public.organization_invitations FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.user_organizations 
      WHERE user_id = auth.uid() 
        AND role = 'admin' 
        AND status = 'active'
    )
  );

-- ============================================
-- 8. FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to generate secure invitation token
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Function to automatically set created_by when organization is created
CREATE OR REPLACE FUNCTION public.set_organization_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to set created_by
DROP TRIGGER IF EXISTS set_org_created_by ON public.organizations;
CREATE TRIGGER set_org_created_by
  BEFORE INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_organization_created_by();

-- Enhanced function to handle new organization creation
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert the creator as admin of the new organization with full permissions
  INSERT INTO public.user_organizations (
    user_id, 
    organization_id, 
    role,
    status,
    joined_at,
    permissions
  )
  VALUES (
    auth.uid(), 
    NEW.id, 
    'admin',
    'active',
    now(),
    '{
      "can_create_projects": true,
      "can_edit_projects": true,
      "can_delete_projects": true,
      "can_view_reports": true,
      "can_manage_users": true,
      "can_manage_organizations": true,
      "can_invite_users": true,
      "can_remove_users": true,
      "can_edit_permissions": true
    }'::jsonb
  )
  ON CONFLICT (user_id, organization_id) DO NOTHING;
  
  -- If this is the user's first organization, set it as current
  UPDATE public.profiles
  SET current_organization_id = NEW.id
  WHERE user_id = auth.uid() 
    AND current_organization_id IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept invitation and create membership
CREATE OR REPLACE FUNCTION public.accept_organization_invitation(invitation_token TEXT)
RETURNS TABLE(success BOOLEAN, message TEXT, organization_id UUID) AS $$
DECLARE
  v_invitation public.organization_invitations%ROWTYPE;
  v_user_email TEXT;
BEGIN
  -- Get user's email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = auth.uid();

  -- Find the invitation
  SELECT * INTO v_invitation
  FROM public.organization_invitations
  WHERE token = invitation_token
    AND email = v_user_email
    AND status = 'pending'
    AND expires_at > now();

  -- Check if invitation exists and is valid
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Invalid or expired invitation'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Create user_organization membership
  INSERT INTO public.user_organizations (
    user_id,
    organization_id,
    role,
    permissions,
    invited_by,
    invited_at,
    joined_at,
    status
  )
  VALUES (
    auth.uid(),
    v_invitation.organization_id,
    v_invitation.role,
    v_invitation.permissions,
    v_invitation.invited_by,
    v_invitation.created_at,
    now(),
    'active'
  )
  ON CONFLICT (user_id, organization_id) 
  DO UPDATE SET
    role = EXCLUDED.role,
    permissions = EXCLUDED.permissions,
    status = 'active',
    joined_at = now();

  -- Update invitation status
  UPDATE public.organization_invitations
  SET 
    status = 'accepted',
    accepted_at = now(),
    accepted_by = auth.uid()
  WHERE id = v_invitation.id;

  -- Set as current organization if user has none
  UPDATE public.profiles
  SET current_organization_id = v_invitation.organization_id
  WHERE user_id = auth.uid() 
    AND current_organization_id IS NULL;

  RETURN QUERY SELECT true, 'Invitation accepted successfully'::TEXT, v_invitation.organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get default permissions for a role
CREATE OR REPLACE FUNCTION public.get_default_permissions(role_name TEXT)
RETURNS JSONB AS $$
BEGIN
  CASE role_name
    WHEN 'admin' THEN
      RETURN '{
        "can_create_projects": true,
        "can_edit_projects": true,
        "can_delete_projects": true,
        "can_view_reports": true,
        "can_manage_users": true,
        "can_manage_organizations": true,
        "can_invite_users": true,
        "can_remove_users": true,
        "can_edit_permissions": true
      }'::jsonb;
    WHEN 'user' THEN
      RETURN '{
        "can_create_projects": true,
        "can_edit_projects": true,
        "can_delete_projects": false,
        "can_view_reports": true,
        "can_manage_users": false,
        "can_manage_organizations": false,
        "can_invite_users": false,
        "can_remove_users": false,
        "can_edit_permissions": false
      }'::jsonb;
    WHEN 'editor' THEN
      RETURN '{
        "can_create_projects": true,
        "can_edit_projects": true,
        "can_delete_projects": false,
        "can_view_reports": true,
        "can_manage_users": false,
        "can_manage_organizations": false,
        "can_invite_users": false,
        "can_remove_users": false,
        "can_edit_permissions": false
      }'::jsonb;
    WHEN 'viewer' THEN
      RETURN '{
        "can_create_projects": false,
        "can_edit_projects": false,
        "can_delete_projects": false,
        "can_view_reports": true,
        "can_manage_users": false,
        "can_manage_organizations": false,
        "can_invite_users": false,
        "can_remove_users": false,
        "can_edit_permissions": false
      }'::jsonb;
    ELSE
      RETURN '{}'::jsonb;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. UPDATE EXISTING DATA
-- ============================================

-- Set default permissions for existing admin members
UPDATE public.user_organizations
SET permissions = public.get_default_permissions('admin')
WHERE role = 'admin' 
  AND (permissions IS NULL OR permissions = '{}'::jsonb);

-- Set default permissions for existing user members
UPDATE public.user_organizations
SET permissions = public.get_default_permissions('user')
WHERE role = 'user' 
  AND (permissions IS NULL OR permissions = '{}'::jsonb);

-- Set default permissions for existing editor members
UPDATE public.user_organizations
SET permissions = public.get_default_permissions('editor')
WHERE role = 'editor' 
  AND (permissions IS NULL OR permissions = '{}'::jsonb);

-- Set default permissions for existing viewer members
UPDATE public.user_organizations
SET permissions = public.get_default_permissions('viewer')
WHERE role = 'viewer' 
  AND (permissions IS NULL OR permissions = '{}'::jsonb);

-- Set status to 'active' for existing memberships without status
UPDATE public.user_organizations
SET status = 'active'
WHERE status IS NULL;

-- Set joined_at for existing memberships without joined_at
UPDATE public.user_organizations
SET joined_at = created_at
WHERE joined_at IS NULL;

-- Set created_by for existing organizations without created_by
UPDATE public.organizations
SET created_by = (
  SELECT user_id 
  FROM public.user_organizations 
  WHERE organization_id = organizations.id 
    AND role = 'admin' 
  LIMIT 1
)
WHERE created_by IS NULL;

-- ============================================
-- 10. COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE public.organizations IS 'Organizations table supporting parent-child relationships (max 2 levels: parent and children)';
COMMENT ON TABLE public.user_organizations IS 'Many-to-many relationship between users and organizations with roles and granular permissions';
COMMENT ON TABLE public.organization_invitations IS 'Invitation system for adding users to organizations via email';
COMMENT ON COLUMN public.user_organizations.permissions IS 'JSONB object containing granular per-feature permissions';
COMMENT ON COLUMN public.organization_invitations.permissions IS 'JSONB object containing permissions to be assigned when invitation is accepted';


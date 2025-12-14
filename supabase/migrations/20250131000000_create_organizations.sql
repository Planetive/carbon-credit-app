-- Create organizations table for company hierarchy (parent/subsidiary relationships)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_organizations junction table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.user_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

-- Add current_organization_id to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Enable Row Level Security
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view organizations they belong to
CREATE POLICY "Users can view their organizations"
  ON public.organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id 
      FROM public.user_organizations 
      WHERE user_id = auth.uid()
    )
  );

-- RLS: Users can create organizations (they'll be added as admin automatically)
CREATE POLICY "Users can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (true);

-- RLS: Users can update organizations they are admin of
CREATE POLICY "Admins can update organizations"
  ON public.organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id 
      FROM public.user_organizations 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS: Users can view their organization memberships
CREATE POLICY "Users can view their organization memberships"
  ON public.user_organizations FOR SELECT
  USING (user_id = auth.uid());

-- RLS: Users can create organization memberships (for themselves initially)
CREATE POLICY "Users can create organization memberships"
  ON public.user_organizations FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS: Admins can add other users to their organizations
CREATE POLICY "Admins can add users to organizations"
  ON public.user_organizations FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM public.user_organizations 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS: Admins can update organization memberships
CREATE POLICY "Admins can update organization memberships"
  ON public.user_organizations FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.user_organizations 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS: Users can update their own current_organization_id
CREATE POLICY "Users can update their current organization"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_organizations_parent_id ON public.organizations(parent_organization_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_id ON public.user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_org_id ON public.user_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_current_org_id ON public.profiles(current_organization_id);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION public.update_organizations_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_organizations_updated_at_column();

-- Function to automatically add creator as admin when organization is created
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert the creator as admin of the new organization
  INSERT INTO public.user_organizations (user_id, organization_id, role)
  VALUES (auth.uid(), NEW.id, 'admin')
  ON CONFLICT (user_id, organization_id) DO NOTHING;
  
  -- If this is the user's first organization, set it as current
  UPDATE public.profiles
  SET current_organization_id = NEW.id
  WHERE user_id = auth.uid() 
    AND current_organization_id IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically add creator as admin
CREATE TRIGGER on_organization_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_organization();


import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface Organization {
  id: string;
  name: string;
  parent_organization_id: string | null;
  description: string | null;
  role: 'admin' | 'editor' | 'viewer';
}

interface OrganizationContextType {
  currentOrganization: Organization | null;
  organizations: Organization[];
  loading: boolean;
  switchOrganization: (organizationId: string) => Promise<void>;
  createOrganization: (name: string, description?: string, parentId?: string) => Promise<{ data: Organization | null; error: any }>;
  refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrganizations = async () => {
    if (!user) {
      setOrganizations([]);
      setCurrentOrganization(null);
      setLoading(false);
      return;
    }

    try {
      // Fetch user's organizations with their roles
      // Using 'as any' because types haven't been regenerated yet
      const { data: userOrgs, error: userOrgsError } = await (supabase as any)
        .from('user_organizations')
        .select(`
          role,
          organization_id,
          organizations (
            id,
            name,
            parent_organization_id,
            description
          )
        `)
        .eq('user_id', user.id);

      if (userOrgsError) throw userOrgsError;

      // Transform the data
      const orgs: Organization[] = (userOrgs || []).map((uo: any) => ({
        id: String(uo.organizations.id),
        name: String(uo.organizations.name),
        parent_organization_id: uo.organizations.parent_organization_id ? String(uo.organizations.parent_organization_id) : null,
        description: uo.organizations.description ? String(uo.organizations.description) : null,
        role: uo.role as 'admin' | 'editor' | 'viewer',
      }));

      setOrganizations(orgs);

      // If user has no organizations but has a profile, create one from their organization_name
      if (orgs.length === 0) {
        const { data: profile, error: profileError } = await (supabase as any)
          .from('profiles')
          .select('organization_name')
          .eq('user_id', user.id)
          .single();

        if (!profileError && profile?.organization_name) {
          // Create organization from existing profile data
          const orgName = profile.organization_name;
          const { data: newOrg, error: createError } = await (supabase as any)
            .from('organizations')
            .insert([{ name: orgName, description: null, parent_organization_id: null }])
            .select()
            .single();

          if (!createError && newOrg) {
            // Refresh organizations list
            const org: Organization = {
              id: String(newOrg.id),
              name: String(newOrg.name),
              parent_organization_id: newOrg.parent_organization_id ? String(newOrg.parent_organization_id) : null,
              description: newOrg.description ? String(newOrg.description) : null,
              role: 'admin',
            };
            orgs.push(org);
            setOrganizations(orgs);
            setCurrentOrganization(org);
            return; // Exit early since we just created the org
          }
        }
      }

      // Get current organization from profile
      const { data: profile, error: profileError } = await (supabase as any)
        .from('profiles')
        .select('current_organization_id')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      }

      const currentOrgId = profile?.current_organization_id;
      
      if (currentOrgId) {
        const currentOrg = orgs.find(o => o.id === currentOrgId);
        if (currentOrg) {
          setCurrentOrganization(currentOrg);
        } else {
          // Current org not found in user's orgs, use first one or null
          setCurrentOrganization(orgs.length > 0 ? orgs[0] : null);
          // Update profile to reflect this
          if (orgs.length > 0) {
            await (supabase as any)
              .from('profiles')
              .update({ current_organization_id: orgs[0].id })
              .eq('user_id', user.id);
          }
        }
      } else {
        // No current org set, use first one
        setCurrentOrganization(orgs.length > 0 ? orgs[0] : null);
        // Update profile to reflect this
        if (orgs.length > 0) {
          await (supabase as any)
            .from('profiles')
            .update({ current_organization_id: orgs[0].id })
            .eq('user_id', user.id);
        }
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
      setOrganizations([]);
      setCurrentOrganization(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, [user]);

  const switchOrganization = async (organizationId: string) => {
    if (!user) return;

    const org = organizations.find(o => o.id === organizationId);
    if (!org) return;

    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ current_organization_id: organizationId })
        .eq('user_id', user.id);

      if (error) throw error;

      setCurrentOrganization(org);
      
      // Reload the page to refresh all data scoped to the new organization
      window.location.reload();
    } catch (error) {
      console.error('Error switching organization:', error);
    }
  };

  const createOrganization = async (name: string, description?: string, parentId?: string) => {
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    try {
      const { data: newOrg, error: orgError } = await (supabase as any)
        .from('organizations')
        .insert([
          {
            name,
            description: description || null,
            parent_organization_id: parentId || null,
          },
        ])
        .select()
        .single();

      if (orgError) throw orgError;

      // The trigger will automatically add the user as admin
      // Refresh organizations list
      await fetchOrganizations();

      const org: Organization = {
        id: String(newOrg.id),
        name: String(newOrg.name),
        parent_organization_id: newOrg.parent_organization_id ? String(newOrg.parent_organization_id) : null,
        description: newOrg.description ? String(newOrg.description) : null,
        role: 'admin', // Creator is always admin
      };

      return { data: org, error: null };
    } catch (error: any) {
      console.error('Error creating organization:', error);
      return { data: null, error };
    }
  };

  const refreshOrganizations = async () => {
    await fetchOrganizations();
  };

  const value = {
    currentOrganization,
    organizations,
    loading,
    switchOrganization,
    createOrganization,
    refreshOrganizations,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}

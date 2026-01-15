import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

// Permission types
export interface Permissions {
  can_create_projects?: boolean;
  can_edit_projects?: boolean;
  can_delete_projects?: boolean;
  can_view_reports?: boolean;
  can_manage_users?: boolean;
  can_manage_organizations?: boolean;
  can_invite_users?: boolean;
  can_remove_users?: boolean;
  can_edit_permissions?: boolean;
}

export interface Organization {
  id: string;
  name: string;
  parent_organization_id: string | null;
  description: string | null;
  role: 'admin' | 'user' | 'editor' | 'viewer';
  permissions: Permissions;
  status: 'pending' | 'active' | 'inactive';
  is_active?: boolean;
  is_original?: boolean;
}

export interface OrganizationUser {
  id: string;
  user_id: string;
  organization_id: string;
  role: 'admin' | 'user' | 'editor' | 'viewer';
  permissions: Permissions;
  status: 'pending' | 'active' | 'inactive';
  joined_at: string | null;
  invited_by: string | null;
  invited_at: string | null;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface OrganizationInvitation {
  id: string;
  email: string;
  organization_id: string;
  role: 'admin' | 'user' | 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  token: string;
  invited_by: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  inviter_name?: string;
}

interface OrganizationContextType {
  currentOrganization: Organization | null;
  organizations: Organization[];
  loading: boolean;
  switchOrganization: (organizationId: string) => Promise<void>;
  createOrganization: (name: string, description?: string, parentId?: string) => Promise<{ data: Organization | null; error: any }>;
  deleteOrganization: (orgId: string) => Promise<{ data: { success: boolean } | null; error: any }>;
  refreshOrganizations: () => Promise<void>;
  hasPermission: (permission: keyof Permissions) => boolean;
  canManageUsers: () => boolean;
  canInviteUsers: () => boolean;
  // User management functions
  fetchOrganizationUsers: (organizationId: string) => Promise<{ data: OrganizationUser[] | null; error: any }>;
  inviteUserToOrganization: (email: string, role: 'admin' | 'user' | 'editor' | 'viewer', permissions?: Permissions) => Promise<{ data: any; error: any }>;
  updateUserRole: (userId: string, role: 'admin' | 'user' | 'editor' | 'viewer') => Promise<{ data: any; error: any }>;
  updateUserPermissions: (userId: string, permissions: Permissions) => Promise<{ data: any; error: any }>;
  removeUserFromOrganization: (userId: string) => Promise<{ data: any; error: any }>;
  fetchPendingInvitations: (organizationId: string) => Promise<{ data: OrganizationInvitation[] | null; error: any }>;
  cancelInvitation: (invitationId: string) => Promise<{ data: any; error: any }>;
  resendInvitation: (invitationId: string) => Promise<{ data: any; error: any }>;
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
      // Fetch user's active organizations with their roles and permissions
      const { data: userOrgs, error: userOrgsError } = await (supabase as any)
        .from('user_organizations')
        .select(`
          role,
          organization_id,
          permissions,
          status,
          organizations (
            id,
            name,
            parent_organization_id,
            description,
            is_active,
            is_original
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (userOrgsError) throw userOrgsError;

      // Transform the data and deduplicate by organization ID
      const orgMap = new Map<string, Organization>();
      
      (userOrgs || [])
        .filter((uo: any) => uo.organizations && uo.organizations.is_active !== false)
        .forEach((uo: any) => {
          const orgId = String(uo.organizations.id);
          // Only keep the first occurrence (or prefer admin role if multiple)
          if (!orgMap.has(orgId) || uo.role === 'admin') {
            orgMap.set(orgId, {
              id: orgId,
          name: String(uo.organizations.name),
          parent_organization_id: uo.organizations.parent_organization_id ? String(uo.organizations.parent_organization_id) : null,
          description: uo.organizations.description ? String(uo.organizations.description) : null,
          role: uo.role as 'admin' | 'user' | 'editor' | 'viewer',
          permissions: (uo.permissions || {}) as Permissions,
          status: (uo.status || 'active') as 'pending' | 'active' | 'inactive',
          is_active: uo.organizations.is_active !== false,
              is_original: uo.organizations.is_original === true,
            });
          }
        });

      const orgs = Array.from(orgMap.values());
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
            .insert([{ 
              name: orgName, 
              description: null, 
              parent_organization_id: null,
              is_original: true // Mark as original since it's the first one
            }])
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
              permissions: {
                can_create_projects: true,
                can_edit_projects: true,
                can_delete_projects: true,
                can_view_reports: true,
                can_manage_users: true,
                can_manage_organizations: true,
                can_invite_users: true,
                can_remove_users: true,
                can_edit_permissions: true,
              },
              status: 'active',
              is_active: true,
              is_original: true,
            };
            orgs.push(org);
            setOrganizations(orgs);
            setCurrentOrganization(org);
            return; // Exit early since we just created the org
          }
        }
      }

      // Get current organization from profile or localStorage
      const { data: profile, error: profileError } = await (supabase as any)
        .from('profiles')
        .select('current_organization_id')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      }

      // Try to get from localStorage first (for faster switching)
      const storedOrgId = localStorage.getItem(`current_org_${user.id}`);
      const currentOrgId = storedOrgId || profile?.current_organization_id;
      
      if (currentOrgId) {
        const currentOrg = orgs.find(o => o.id === currentOrgId);
        if (currentOrg) {
          setCurrentOrganization(currentOrg);
          // Sync with localStorage
          localStorage.setItem(`current_org_${user.id}`, currentOrgId);
        } else {
          // Current org not found in user's orgs, use first one or null
          const firstOrg = orgs.length > 0 ? orgs[0] : null;
          setCurrentOrganization(firstOrg);
          // Update profile and localStorage to reflect this
          if (firstOrg) {
            await (supabase as any)
              .from('profiles')
              .update({ current_organization_id: firstOrg.id })
              .eq('user_id', user.id);
            localStorage.setItem(`current_org_${user.id}`, firstOrg.id);
          } else {
            localStorage.removeItem(`current_org_${user.id}`);
          }
        }
      } else {
        // No current org set, use first one
        const firstOrg = orgs.length > 0 ? orgs[0] : null;
        setCurrentOrganization(firstOrg);
        // Update profile and localStorage to reflect this
        if (firstOrg) {
          await (supabase as any)
            .from('profiles')
            .update({ current_organization_id: firstOrg.id })
            .eq('user_id', user.id);
          localStorage.setItem(`current_org_${user.id}`, firstOrg.id);
        } else {
          localStorage.removeItem(`current_org_${user.id}`);
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

    const org = organizations.find(o => o.id === organizationId && o.status === 'active');
    if (!org) {
      console.error('Organization not found or not active');
      return;
    }

    try {
      // Update in database
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ current_organization_id: organizationId })
        .eq('user_id', user.id);

      if (error) throw error;

      // Update in localStorage for faster access
      localStorage.setItem(`current_org_${user.id}`, organizationId);

      // Update state
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
      // Wait a bit for the trigger to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Set the new organization as current immediately
      await (supabase as any)
        .from('profiles')
        .update({ current_organization_id: newOrg.id })
        .eq('user_id', user.id);
      
      // Update localStorage
      localStorage.setItem(`current_org_${user.id}`, String(newOrg.id));
      
      // Refresh organizations list to get the full org data with permissions
      await fetchOrganizations();
      
      // Wait a bit more for the refresh
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Refresh again to ensure we have the latest data
      await fetchOrganizations();
      
      const createdOrg = organizations.find(o => o.id === String(newOrg.id));
      const org: Organization = createdOrg || {
        id: String(newOrg.id),
        name: String(newOrg.name),
        parent_organization_id: newOrg.parent_organization_id ? String(newOrg.parent_organization_id) : null,
        description: newOrg.description ? String(newOrg.description) : null,
        role: 'admin', // Creator is always admin
        permissions: {
          can_create_projects: true,
          can_edit_projects: true,
          can_delete_projects: true,
          can_view_reports: true,
          can_manage_users: true,
          can_manage_organizations: true,
          can_invite_users: true,
          can_remove_users: true,
          can_edit_permissions: true,
        },
        status: 'active',
        is_active: true,
      };

      // Set as current organization in state
      setCurrentOrganization(org);
      
      // Reload the page to refresh all data scoped to the new organization
      window.location.reload();

      return { data: org, error: null };
    } catch (error: any) {
      console.error('Error creating organization:', error);
      return { data: null, error };
    }
  };

  const refreshOrganizations = async () => {
    await fetchOrganizations();
  };

  const deleteOrganization = async (orgId: string) => {
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    try {
      // Check if user is admin of this organization
      const org = organizations.find(o => o.id === orgId);
      if (!org || org.role !== 'admin') {
        return { data: null, error: { message: 'You must be an admin to delete this organization' } };
      }

      console.log('Attempting to delete organization:', orgId);

      // Try using the RPC function first (more reliable)
      const { error: rpcError } = await (supabase as any)
        .rpc('delete_organization', { p_organization_id: orgId });

      if (rpcError) {
        console.log('RPC delete failed, trying direct delete:', rpcError);
        // Fallback to direct delete
        const { data: deletedData, error: deleteError } = await (supabase as any)
          .from('organizations')
          .delete()
          .eq('id', orgId)
          .select();

        console.log('Delete result:', { deletedData, deleteError });

        if (deleteError) {
          console.error('Delete error details:', deleteError);
          throw deleteError;
        }
      } else {
        console.log('Organization deleted via RPC function');
      }

      // If this was the current organization, switch to another one or clear it
      if (currentOrganization?.id === orgId) {
        const remainingOrgs = organizations.filter(o => o.id !== orgId);
        if (remainingOrgs.length > 0) {
          await switchOrganization(remainingOrgs[0].id);
        } else {
          // No more organizations, clear current
          setCurrentOrganization(null);
          // Clear from profile
          await (supabase as any)
            .from('profiles')
            .update({ current_organization_id: null })
            .eq('user_id', user.id);
        }
      }

      // Refresh organizations list
      await fetchOrganizations();

      return { data: { success: true }, error: null };
    } catch (error: any) {
      console.error('Error deleting organization:', error);
      return { data: null, error: { message: error.message || 'Failed to delete organization', details: error } };
    }
  };

  // Permission checking functions
  const hasPermission = useCallback((permission: keyof Permissions): boolean => {
    if (!currentOrganization) return false;
    
    // Admins have all permissions
    if (currentOrganization.role === 'admin') {
      return true;
    }
    
    // Check specific permission
    return currentOrganization.permissions[permission] === true;
  }, [currentOrganization]);

  const canManageUsers = useCallback((): boolean => {
    return hasPermission('can_manage_users');
  }, [hasPermission]);

  const canInviteUsers = useCallback((): boolean => {
    return hasPermission('can_invite_users');
  }, [hasPermission]);

  // User management functions
  const fetchOrganizationUsers = async (organizationId: string) => {
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    try {
      // First, get user_organizations
      const { data: userOrgs, error: userOrgsError } = await (supabase as any)
        .from('user_organizations')
        .select(`
          id,
          user_id,
          organization_id,
          role,
          permissions,
          status,
          joined_at,
          invited_by,
          invited_at
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'active');

      if (userOrgsError) throw userOrgsError;

      if (!userOrgs || userOrgs.length === 0) {
        return { data: [], error: null };
      }

      // Get user IDs
      const userIds = userOrgs.map((uo: any) => uo.user_id);

      // Fetch profiles for these users
      const { data: profiles, error: profilesError } = await (supabase as any)
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Get emails from auth.users (we'll need to use a different approach)
      // For now, we'll use the profile data and try to get email from auth
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      // Combine data
      const users: OrganizationUser[] = userOrgs.map((uo: any) => {
        const profile = profileMap.get(uo.user_id) as { display_name?: string } | undefined;
        return {
          id: uo.id,
          user_id: uo.user_id,
          organization_id: uo.organization_id,
          role: uo.role,
          permissions: (uo.permissions || {}) as Permissions,
          status: uo.status,
          joined_at: uo.joined_at,
          invited_by: uo.invited_by,
          invited_at: uo.invited_at,
          email: '', // Will be fetched separately if needed
          display_name: profile?.display_name || null,
          avatar_url: null, // avatar_url column doesn't exist in profiles table
        };
      });

      // Try to get emails from invitations for users who were invited
      const { data: invitations } = await (supabase as any)
        .from('organization_invitations')
        .select('email, accepted_by, status')
        .eq('organization_id', organizationId)
        .in('status', ['accepted', 'pending']);

      // Create a map of user_id to email from invitations
      const invitationMap = new Map();
      if (invitations) {
        // We'll match by accepted_by for accepted invitations
        // For pending, we can't match yet, but we'll try to get emails from auth
        invitations.forEach((inv: any) => {
          if (inv.status === 'accepted' && inv.accepted_by) {
            invitationMap.set(inv.accepted_by, inv.email);
          }
        });
      }

      // Update users with emails from invitations
      const usersWithEmails = users.map((u) => {
        const emailFromInvitation = invitationMap.get(u.user_id);
        // If we have the current user, we can get their email from auth
        if (u.user_id === user.id && user.email) {
          return { ...u, email: user.email };
        }
        return { ...u, email: emailFromInvitation || u.email || 'N/A' };
      });

      return { data: usersWithEmails, error: null };
    } catch (error: any) {
      console.error('Error fetching organization users:', error);
      return { data: null, error };
    }
  };

  const inviteUserToOrganization = async (
    email: string,
    role: 'admin' | 'user' | 'editor' | 'viewer',
    permissions?: Permissions
  ) => {
    if (!user || !currentOrganization) {
      return { data: null, error: { message: 'User not authenticated or no organization selected' } };
    }

    try {
      // Get default permissions if not provided
      let finalPermissions = permissions;
      if (!finalPermissions) {
        const { data: defaultPerms, error: permsError } = await (supabase as any)
          .rpc('get_default_permissions', { role_name: role });
        
        if (permsError) throw permsError;
        finalPermissions = defaultPerms;
      }

      // Generate invitation token
      const { data: tokenData, error: tokenError } = await (supabase as any)
        .rpc('generate_invitation_token');

      if (tokenError) throw tokenError;

      // Create invitation (expires in 7 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data, error } = await (supabase as any)
        .from('organization_invitations')
        .insert([
          {
            email,
            organization_id: currentOrganization.id,
            role,
            permissions: finalPermissions,
            token: tokenData,
            invited_by: user.id,
            expires_at: expiresAt.toISOString(),
            status: 'pending',
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Send invitation email
      const { sendInvitationEmail, generateInvitationLink } = await import('@/utils/emailService');
      const invitationLink = generateInvitationLink(tokenData);
      
      // Get inviter's name
      const { data: inviterProfile } = await (supabase as any)
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();

      await sendInvitationEmail({
        email,
        organizationName: currentOrganization.name,
        inviterName: inviterProfile?.display_name || user.email?.split('@')[0] || 'Team',
        role,
        invitationLink,
        expiresAt,
      });

      return { data, error: null };
    } catch (error: any) {
      console.error('Error inviting user:', error);
      return { data: null, error };
    }
  };

  const updateUserRole = async (
    userId: string,
    role: 'admin' | 'user' | 'editor' | 'viewer'
  ) => {
    if (!user || !currentOrganization) {
      return { data: null, error: { message: 'User not authenticated or no organization selected' } };
    }

    try {
      // Get default permissions for the new role
      const { data: defaultPerms, error: permsError } = await (supabase as any)
        .rpc('get_default_permissions', { role_name: role });

      if (permsError) throw permsError;

      const { data, error } = await (supabase as any)
        .from('user_organizations')
        .update({
          role,
          permissions: defaultPerms,
        })
        .eq('user_id', userId)
        .eq('organization_id', currentOrganization.id)
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error: any) {
      console.error('Error updating user role:', error);
      return { data: null, error };
    }
  };

  const updateUserPermissions = async (
    userId: string,
    permissions: Permissions
  ) => {
    if (!user || !currentOrganization) {
      return { data: null, error: { message: 'User not authenticated or no organization selected' } };
    }

    try {
      const { data, error } = await (supabase as any)
        .from('user_organizations')
        .update({ permissions })
        .eq('user_id', userId)
        .eq('organization_id', currentOrganization.id)
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error: any) {
      console.error('Error updating user permissions:', error);
      return { data: null, error };
    }
  };

  const removeUserFromOrganization = async (userId: string) => {
    if (!user || !currentOrganization) {
      return { data: null, error: { message: 'User not authenticated or no organization selected' } };
    }

    // Prevent removing yourself
    if (userId === user.id) {
      return { data: null, error: { message: 'Cannot remove yourself from the organization' } };
    }

    try {
      const { data, error } = await (supabase as any)
        .from('user_organizations')
        .delete()
        .eq('user_id', userId)
        .eq('organization_id', currentOrganization.id)
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error: any) {
      console.error('Error removing user:', error);
      return { data: null, error };
    }
  };

  const fetchPendingInvitations = async (organizationId: string) => {
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    try {
      const { data, error } = await (supabase as any)
        .from('organization_invitations')
        .select(`
          id,
          email,
          organization_id,
          role,
          status,
          token,
          invited_by,
          created_at,
          expires_at,
          accepted_at
        `)
        .eq('organization_id', organizationId)
        .in('status', ['pending', 'expired']);

      if (error) throw error;

      // Get inviter names
      const invitations: OrganizationInvitation[] = await Promise.all(
        (data || []).map(async (inv: any) => {
          let inviterName = 'Team';
          if (inv.invited_by) {
            const { data: inviterProfile } = await (supabase as any)
              .from('profiles')
              .select('display_name')
              .eq('user_id', inv.invited_by)
              .single();
            inviterName = inviterProfile?.display_name || 'Team';
          }

          return {
            id: inv.id,
            email: inv.email,
            organization_id: inv.organization_id,
            role: inv.role,
            status: inv.status,
            token: inv.token,
            invited_by: inv.invited_by,
            created_at: inv.created_at,
            expires_at: inv.expires_at,
            accepted_at: inv.accepted_at,
            inviter_name: inviterName,
          };
        })
      );

      return { data: invitations, error: null };
    } catch (error: any) {
      console.error('Error fetching pending invitations:', error);
      return { data: null, error };
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    if (!user || !currentOrganization) {
      return { data: null, error: { message: 'User not authenticated or no organization selected' } };
    }

    try {
      const { data, error } = await (supabase as any)
        .from('organization_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId)
        .eq('organization_id', currentOrganization.id)
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error: any) {
      console.error('Error cancelling invitation:', error);
      return { data: null, error };
    }
  };

  const resendInvitation = async (invitationId: string) => {
    if (!user || !currentOrganization) {
      return { data: null, error: { message: 'User not authenticated or no organization selected' } };
    }

    try {
      // Get invitation details
      const { data: invitation, error: fetchError } = await (supabase as any)
        .from('organization_invitations')
        .select('*')
        .eq('id', invitationId)
        .eq('organization_id', currentOrganization.id)
        .single();

      if (fetchError || !invitation) {
        throw fetchError || new Error('Invitation not found');
      }

      // Check if expired
      const expiresAt = new Date(invitation.expires_at);
      if (expiresAt < new Date()) {
        // Generate new token and extend expiration
        const { data: tokenData, error: tokenError } = await (supabase as any)
          .rpc('generate_invitation_token');

        if (tokenError) throw tokenError;

        const newExpiresAt = new Date();
        newExpiresAt.setDate(newExpiresAt.getDate() + 7);

        // Update invitation
        const { error: updateError } = await (supabase as any)
          .from('organization_invitations')
          .update({
            token: tokenData,
            expires_at: newExpiresAt.toISOString(),
            status: 'pending',
          })
          .eq('id', invitationId);

        if (updateError) throw updateError;
        invitation.token = tokenData;
        invitation.expires_at = newExpiresAt.toISOString();
      }

      // Resend email
      const { sendInvitationEmail, generateInvitationLink } = await import('@/utils/emailService');
      const invitationLink = generateInvitationLink(invitation.token);

      // Get inviter's name
      const { data: inviterProfile } = await (supabase as any)
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();

      await sendInvitationEmail({
        email: invitation.email,
        organizationName: currentOrganization.name,
        inviterName: inviterProfile?.display_name || user.email?.split('@')[0] || 'Team',
        role: invitation.role,
        invitationLink,
        expiresAt: new Date(invitation.expires_at),
      });

      return { data: { success: true }, error: null };
    } catch (error: any) {
      console.error('Error resending invitation:', error);
      return { data: null, error };
    }
  };

  const value = {
    currentOrganization,
    organizations,
    loading,
    switchOrganization,
    createOrganization,
    deleteOrganization,
    refreshOrganizations,
    hasPermission,
    canManageUsers,
    canInviteUsers,
    fetchOrganizationUsers,
    inviteUserToOrganization,
    updateUserRole,
    updateUserPermissions,
    removeUserFromOrganization,
    fetchPendingInvitations,
    cancelInvitation,
    resendInvitation,
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
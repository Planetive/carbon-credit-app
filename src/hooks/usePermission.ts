import { useCallback, useMemo } from 'react';
import { useOrganization, Permissions } from '@/contexts/OrganizationContext';

// Export Permissions type for use in other files
export type { Permissions };

/**
 * Hook to check user permissions in the current organization
 * @returns Object with permission checking functions and state
 */
export function usePermission() {
  const { currentOrganization, hasPermission, loading } = useOrganization();

  const checkPermission = useCallback((permission: keyof Permissions): boolean => {
    if (loading || !currentOrganization) {
      return false;
    }
    return hasPermission(permission);
  }, [hasPermission, loading, currentOrganization]);

  // Memoize all permission checks for performance
  const permissions = useMemo(() => ({
    canCreateProjects: checkPermission('can_create_projects'),
    canEditProjects: checkPermission('can_edit_projects'),
    canDeleteProjects: checkPermission('can_delete_projects'),
    canViewReports: checkPermission('can_view_reports'),
    canManageUsers: checkPermission('can_manage_users'),
    canManageOrganizations: checkPermission('can_manage_organizations'),
    canInviteUsers: checkPermission('can_invite_users'),
    canRemoveUsers: checkPermission('can_remove_users'),
    canEditPermissions: checkPermission('can_edit_permissions'),
  }), [checkPermission]);

  const canCreateProjects = useCallback(() => {
    return permissions.canCreateProjects;
  }, [permissions.canCreateProjects]);

  const canEditProjects = useCallback(() => {
    return permissions.canEditProjects;
  }, [permissions.canEditProjects]);

  const canDeleteProjects = useCallback(() => {
    return permissions.canDeleteProjects;
  }, [permissions.canDeleteProjects]);

  const canViewReports = useCallback(() => {
    return permissions.canViewReports;
  }, [permissions.canViewReports]);

  const canManageUsers = useCallback(() => {
    return permissions.canManageUsers;
  }, [permissions.canManageUsers]);

  const canManageOrganizations = useCallback(() => {
    return permissions.canManageOrganizations;
  }, [permissions.canManageOrganizations]);

  const canInviteUsers = useCallback(() => {
    return permissions.canInviteUsers;
  }, [permissions.canInviteUsers]);

  const canRemoveUsers = useCallback(() => {
    return permissions.canRemoveUsers;
  }, [permissions.canRemoveUsers]);

  const canEditPermissions = useCallback(() => {
    return permissions.canEditPermissions;
  }, [permissions.canEditPermissions]);

  const isAdmin = useCallback(() => {
    if (loading || !currentOrganization) {
      return false;
    }
    return currentOrganization.role === 'admin';
  }, [currentOrganization, loading]);

  // Check if user has any of the specified permissions (OR logic)
  const hasAnyPermission = useCallback((perms: (keyof Permissions)[]): boolean => {
    if (loading || !currentOrganization) {
      return false;
    }
    return perms.some(perm => hasPermission(perm));
  }, [hasPermission, loading, currentOrganization]);

  // Check if user has all of the specified permissions (AND logic)
  const hasAllPermissions = useCallback((perms: (keyof Permissions)[]): boolean => {
    if (loading || !currentOrganization) {
      return false;
    }
    return perms.every(perm => hasPermission(perm));
  }, [hasPermission, loading, currentOrganization]);

  return {
    checkPermission,
    canCreateProjects,
    canEditProjects,
    canDeleteProjects,
    canViewReports,
    canManageUsers,
    canManageOrganizations,
    canInviteUsers,
    canRemoveUsers,
    canEditPermissions,
    isAdmin,
    hasAnyPermission,
    hasAllPermissions,
    hasOrganization: !!currentOrganization,
    loading,
    permissions, // Direct access to all permissions object
  };
}


import { ReactNode } from 'react';
import { usePermission } from '@/hooks/usePermission';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Permissions } from '@/contexts/OrganizationContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, AlertCircle } from 'lucide-react';

interface PermissionGateProps {
  children: ReactNode;
  permission?: keyof Permissions;
  requireAnyPermission?: (keyof Permissions)[];
  requireAllPermissions?: (keyof Permissions)[];
  requiredRole?: 'admin' | 'user' | 'editor' | 'viewer';
  fallback?: ReactNode;
  showAccessDenied?: boolean;
  hideContent?: boolean; // If true, hides content instead of showing message
}

/**
 * Component that conditionally renders children based on user permissions
 * Useful for hiding/showing UI elements based on permissions
 */
export function PermissionGate({
  children,
  permission,
  requireAnyPermission,
  requireAllPermissions,
  requiredRole,
  fallback,
  showAccessDenied = false,
  hideContent = true,
}: PermissionGateProps) {
  const { checkPermission, hasAnyPermission, hasAllPermissions, isAdmin } = usePermission();
  const { currentOrganization } = useOrganization();

  // Check role requirement
  if (requiredRole) {
    if (requiredRole === 'admin' && !isAdmin()) {
      if (hideContent) {
        return fallback || null;
      }
      return showAccessDenied ? (
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            Administrator access required for this action.
          </AlertDescription>
        </Alert>
      ) : (fallback || null);
    }

    // For other roles, check hierarchy
    const roleHierarchy: Record<string, number> = {
      viewer: 1,
      editor: 2,
      user: 3,
      admin: 4,
    };

    const userRoleLevel = roleHierarchy[currentOrganization?.role || 'viewer'] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

    if (userRoleLevel < requiredRoleLevel) {
      if (hideContent) {
        return fallback || null;
      }
      return showAccessDenied ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {requiredRole} role or higher required for this action.
          </AlertDescription>
        </Alert>
      ) : (fallback || null);
    }
  }

  // Check single permission
  if (permission && !checkPermission(permission)) {
    if (hideContent) {
      return fallback || null;
    }
    return showAccessDenied ? (
      <Alert variant="destructive">
        <Lock className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to perform this action.
        </AlertDescription>
      </Alert>
    ) : (fallback || null);
  }

  // Check "any" permissions (OR logic)
  if (requireAnyPermission && requireAnyPermission.length > 0) {
    if (!hasAnyPermission(requireAnyPermission)) {
      if (hideContent) {
        return fallback || null;
      }
      return showAccessDenied ? (
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            You don't have any of the required permissions for this action.
          </AlertDescription>
        </Alert>
      ) : (fallback || null);
    }
  }

  // Check "all" permissions (AND logic)
  if (requireAllPermissions && requireAllPermissions.length > 0) {
    if (!hasAllPermissions(requireAllPermissions)) {
      if (hideContent) {
        return fallback || null;
      }
      return showAccessDenied ? (
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            You don't have all the required permissions for this action.
          </AlertDescription>
        </Alert>
      ) : (fallback || null);
    }
  }

  // All checks passed, render children
  return <>{children}</>;
}


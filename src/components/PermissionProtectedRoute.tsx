import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermission } from '@/hooks/usePermission';
import { Permissions } from '@/contexts/OrganizationContext';
import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Lock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PermissionProtectedRouteProps {
  children: ReactNode;
  permission: keyof Permissions;
  fallbackPath?: string;
  showAccessDenied?: boolean;
  requiredRole?: 'admin' | 'user' | 'editor' | 'viewer';
  requireAnyPermission?: (keyof Permissions)[];
  requireAllPermissions?: (keyof Permissions)[];
}

/**
 * Route protection component that checks user permissions
 * Can check single permission, multiple permissions (any/all), or role
 */
export function PermissionProtectedRoute({
  children,
  permission,
  fallbackPath = '/dashboard',
  showAccessDenied = true,
  requiredRole,
  requireAnyPermission,
  requireAllPermissions,
}: PermissionProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { currentOrganization, loading: orgLoading } = useOrganization();
  const { checkPermission, isAdmin } = usePermission();

  // Show loading while checking auth and organization
  if (authLoading || orgLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Must be authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Must have an organization
  if (!currentOrganization) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              No Organization
            </CardTitle>
            <CardDescription>
              You need to be part of an organization to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                Please contact your administrator to be added to an organization.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check role requirement
  if (requiredRole) {
    if (requiredRole === 'admin' && !isAdmin()) {
      return showAccessDenied ? (
        <AccessDeniedPage
          title="Admin Access Required"
          message="You need administrator privileges to access this page."
        />
      ) : (
        <Navigate to={fallbackPath} replace />
      );
    }

    // For other roles, check if user has at least that role level
    const roleHierarchy: Record<string, number> = {
      viewer: 1,
      editor: 2,
      user: 3,
      admin: 4,
    };

    const userRoleLevel = roleHierarchy[currentOrganization.role] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

    if (userRoleLevel < requiredRoleLevel) {
      return showAccessDenied ? (
        <AccessDeniedPage
          title="Insufficient Permissions"
          message={`You need at least ${requiredRole} role to access this page.`}
        />
      ) : (
        <Navigate to={fallbackPath} replace />
      );
    }
  }

  // Check single permission
  if (permission && !checkPermission(permission)) {
    return showAccessDenied ? (
      <AccessDeniedPage
        title="Permission Denied"
        message="You don't have the required permissions to access this page."
      />
    ) : (
      <Navigate to={fallbackPath} replace />
    );
  }

  // Check "any" permissions (OR logic)
  if (requireAnyPermission && requireAnyPermission.length > 0) {
    const hasAny = requireAnyPermission.some(perm => checkPermission(perm));
    if (!hasAny) {
      return showAccessDenied ? (
        <AccessDeniedPage
          title="Permission Denied"
          message="You don't have any of the required permissions to access this page."
        />
      ) : (
        <Navigate to={fallbackPath} replace />
      );
    }
  }

  // Check "all" permissions (AND logic)
  if (requireAllPermissions && requireAllPermissions.length > 0) {
    const hasAll = requireAllPermissions.every(perm => checkPermission(perm));
    if (!hasAll) {
      return showAccessDenied ? (
        <AccessDeniedPage
          title="Permission Denied"
          message="You don't have all the required permissions to access this page."
        />
      ) : (
        <Navigate to={fallbackPath} replace />
      );
    }
  }

  // All checks passed, render children
  return <>{children}</>;
}

/**
 * Access Denied page component
 */
function AccessDeniedPage({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <Lock className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              If you believe you should have access to this page, please contact your organization administrator.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}


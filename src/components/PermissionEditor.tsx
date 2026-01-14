import React, { useState, useEffect } from 'react';
import { Permissions } from '@/contexts/OrganizationContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, Settings, CheckCircle2, XCircle } from 'lucide-react';
import { OrganizationUser } from '@/contexts/OrganizationContext';

interface PermissionEditorProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  user?: OrganizationUser;
  permissions?: Permissions;
  onPermissionsChange?: (permissions: Permissions) => void;
  onSuccess?: () => void;
  compact?: boolean;
}

const PERMISSION_GROUPS = [
  {
    title: 'Projects',
    description: 'Control access to project creation and management',
    permissions: [
      { key: 'can_create_projects' as keyof Permissions, label: 'Create Projects', description: 'Allow creating new projects' },
      { key: 'can_edit_projects' as keyof Permissions, label: 'Edit Projects', description: 'Allow editing existing projects' },
      { key: 'can_delete_projects' as keyof Permissions, label: 'Delete Projects', description: 'Allow deleting projects' },
    ],
  },
  {
    title: 'Reports',
    description: 'Control access to reports and analytics',
    permissions: [
      { key: 'can_view_reports' as keyof Permissions, label: 'View Reports', description: 'Allow viewing reports and analytics' },
    ],
  },
  {
    title: 'User Management',
    description: 'Control access to user and organization management',
    permissions: [
      { key: 'can_manage_users' as keyof Permissions, label: 'Manage Users', description: 'Allow managing organization users' },
      { key: 'can_invite_users' as keyof Permissions, label: 'Invite Users', description: 'Allow inviting new users' },
      { key: 'can_remove_users' as keyof Permissions, label: 'Remove Users', description: 'Allow removing users from organization' },
      { key: 'can_edit_permissions' as keyof Permissions, label: 'Edit Permissions', description: 'Allow editing user permissions' },
    ],
  },
  {
    title: 'Organization',
    description: 'Control access to organization settings',
    permissions: [
      { key: 'can_manage_organizations' as keyof Permissions, label: 'Manage Organizations', description: 'Allow managing organization settings' },
    ],
  },
];

export function PermissionEditor({
  open,
  onOpenChange,
  user,
  permissions: initialPermissions,
  onPermissionsChange,
  onSuccess,
  compact = false,
}: PermissionEditorProps) {
  const { updateUserPermissions } = useOrganization();
  const { canEditPermissions } = usePermission();
  const { toast } = useToast();
  
  const [permissions, setPermissions] = useState<Permissions>(initialPermissions || {});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialPermissions) {
      setPermissions(initialPermissions);
    } else if (user) {
      setPermissions(user.permissions || {});
    }
  }, [initialPermissions, user]);

  const handlePermissionToggle = (key: keyof Permissions) => {
    const newPermissions = {
      ...permissions,
      [key]: !permissions[key],
    };
    setPermissions(newPermissions);
    
    if (onPermissionsChange) {
      onPermissionsChange(newPermissions);
    }
  };

  const handleSave = async () => {
    if (!user) {
      // If no user, just call onPermissionsChange
      if (onPermissionsChange) {
        onPermissionsChange(permissions);
      }
      if (onSuccess) {
        onSuccess();
      }
      return;
    }

    if (!canEditPermissions()) {
      toast({
        title: 'Permission denied',
        description: 'You do not have permission to edit user permissions.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await updateUserPermissions(user.user_id, permissions);
      
      if (error) {
        throw error;
      }

      toast({
        title: 'Permissions updated',
        description: `Permissions for ${user.display_name || user.email} have been updated.`,
      });

      if (onOpenChange) {
        onOpenChange(false);
      }
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast({
        title: 'Error updating permissions',
        description: error.message || 'Failed to update permissions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderPermissions = () => (
    <div className="space-y-6">
      {PERMISSION_GROUPS.map((group) => (
        <div key={group.title} className="space-y-3">
          <div>
            <h4 className="font-semibold text-sm">{group.title}</h4>
            <p className="text-xs text-muted-foreground">{group.description}</p>
          </div>
          <div className="space-y-3 pl-4">
            {group.permissions.map((perm) => {
              const isEnabled = permissions[perm.key] === true;
              return (
                <div key={perm.key} className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={perm.key} className="text-sm font-medium cursor-pointer">
                        {perm.label}
                      </Label>
                      {isEnabled ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{perm.description}</p>
                  </div>
                  <Switch
                    id={perm.key}
                    checked={isEnabled}
                    onCheckedChange={() => handlePermissionToggle(perm.key)}
                    disabled={loading || (user?.role === 'admin')}
                  />
                </div>
              );
            })}
          </div>
          {group !== PERMISSION_GROUPS[PERMISSION_GROUPS.length - 1] && <Separator />}
        </div>
      ))}
      
      {user?.role === 'admin' && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Note:</strong> Admins have all permissions enabled by default and cannot be modified.
          </p>
        </div>
      )}
    </div>
  );

  if (compact) {
    return (
      <div className="space-y-4">
        {PERMISSION_GROUPS.map((group) => (
          <div key={group.title} className="space-y-2">
            <div>
              <h4 className="font-semibold text-xs">{group.title}</h4>
            </div>
            <div className="space-y-2 pl-2">
              {group.permissions.map((perm) => {
                const isEnabled = permissions[perm.key] === true;
                return (
                  <div key={perm.key} className="flex items-center justify-between gap-3">
                    <Label htmlFor={`${perm.key}-compact`} className="text-xs cursor-pointer">
                      {perm.label}
                    </Label>
                    <Switch
                      id={`${perm.key}-compact`}
                      checked={isEnabled}
                      onCheckedChange={() => handlePermissionToggle(perm.key)}
                      disabled={loading || (user?.role === 'admin')}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Edit Permissions
          </DialogTitle>
          <DialogDescription>
            {user
              ? `Manage permissions for ${user.display_name || user.email}`
              : 'Configure custom permissions'}
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Permission Settings</CardTitle>
            <CardDescription>
              Toggle individual permissions to grant or revoke access to specific features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderPermissions()}
          </CardContent>
        </Card>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange && onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Permissions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


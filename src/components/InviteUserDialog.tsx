import React, { useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermission } from '@/hooks/usePermission';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, UserPlus } from 'lucide-react';
import { Permissions } from '@/contexts/OrganizationContext';
import { PermissionEditor } from './PermissionEditor';

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function InviteUserDialog({ open, onOpenChange, onSuccess }: InviteUserDialogProps) {
  const { currentOrganization, inviteUserToOrganization } = useOrganization();
  const { canInviteUsers } = usePermission();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'user' | 'editor' | 'viewer'>('user');
  const [loading, setLoading] = useState(false);
  const [showCustomPermissions, setShowCustomPermissions] = useState(false);
  const [customPermissions, setCustomPermissions] = useState<Permissions>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canInviteUsers()) {
      toast({
        title: 'Permission denied',
        description: 'You do not have permission to invite users.',
        variant: 'destructive',
      });
      return;
    }

    if (!email || !email.includes('@')) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    
    try {
      const permissions = showCustomPermissions ? customPermissions : undefined;
      const { data, error } = await inviteUserToOrganization(email, role, permissions);
      
      if (error) {
        throw error;
      }

      toast({
        title: 'Invitation sent',
        description: `An invitation has been sent to ${email}.`,
      });

      // Reset form
      setEmail('');
      setRole('user');
      setShowCustomPermissions(false);
      setCustomPermissions({});
      onOpenChange(false);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast({
        title: 'Error sending invitation',
        description: error.message || 'Failed to send invitation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionUpdate = (permissions: Permissions) => {
    setCustomPermissions(permissions);
  };

  if (!currentOrganization) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite User to Organization
          </DialogTitle>
          <DialogDescription>
            Send an invitation to join {currentOrganization.name}. The user will receive an email with instructions.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value: any) => setRole(value)} disabled={loading}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin - Full access</SelectItem>
                <SelectItem value="user">User - Create and edit</SelectItem>
                <SelectItem value="editor">Editor - Edit only</SelectItem>
                <SelectItem value="viewer">Viewer - Read only</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {role === 'admin' && 'Full access to all features and settings'}
              {role === 'user' && 'Can create and edit projects, view reports'}
              {role === 'editor' && 'Can edit existing projects, view reports'}
              {role === 'viewer' && 'Can only view projects and reports'}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="customPermissions"
                checked={showCustomPermissions}
                onChange={(e) => setShowCustomPermissions(e.target.checked)}
                className="rounded border-gray-300"
                disabled={loading || role === 'admin'}
              />
              <Label htmlFor="customPermissions" className="text-sm font-normal cursor-pointer">
                Use custom permissions (overrides role defaults)
              </Label>
            </div>
            {showCustomPermissions && role !== 'admin' && (
              <div className="mt-2 p-4 border rounded-lg bg-muted/50">
                <PermissionEditor
                  permissions={customPermissions}
                  onPermissionsChange={handlePermissionUpdate}
                  compact
                />
              </div>
            )}
            {role === 'admin' && (
              <p className="text-xs text-muted-foreground">
                Admins automatically have all permissions enabled.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


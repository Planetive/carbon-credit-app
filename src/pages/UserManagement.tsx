import React, { useState, useEffect } from 'react';
import { useOrganization, OrganizationUser, OrganizationInvitation } from '@/contexts/OrganizationContext';
import { usePermission } from '@/hooks/usePermission';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Users,
  UserPlus,
  MoreVertical,
  Crown,
  User,
  Edit,
  Eye,
  Trash2,
  Settings,
  Mail,
  Calendar,
  Send,
  X,
  Clock,
  Loader2,
} from 'lucide-react';
import { InviteUserDialog } from '@/components/InviteUserDialog';
import { PermissionEditor } from '@/components/PermissionEditor';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function UserManagement() {
  const { 
    currentOrganization, 
    fetchOrganizationUsers, 
    updateUserRole, 
    updateUserPermissions, 
    removeUserFromOrganization,
    fetchPendingInvitations,
    cancelInvitation,
    resendInvitation,
  } = useOrganization();
  const { canManageUsers, canInviteUsers, canRemoveUsers, canEditPermissions, isAdmin } = usePermission();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<OrganizationUser | null>(null);
  const [userToRemove, setUserToRemove] = useState<OrganizationUser | null>(null);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [resendingInvitation, setResendingInvitation] = useState<string | null>(null);

  useEffect(() => {
    if (currentOrganization) {
      loadUsers();
      loadInvitations();
    }
  }, [currentOrganization]);

  const loadUsers = async () => {
    if (!currentOrganization) return;
    
    setLoading(true);
    const { data, error } = await fetchOrganizationUsers(currentOrganization.id);
    
    if (error) {
      toast({
        title: 'Error loading users',
        description: error.message || 'Failed to load organization users',
        variant: 'destructive',
      });
    } else {
      setUsers(data || []);
    }
    
    setLoading(false);
  };

  const loadInvitations = async () => {
    if (!currentOrganization) return;
    
    setLoadingInvitations(true);
    const { data, error } = await fetchPendingInvitations(currentOrganization.id);
    
    if (error) {
      console.error('Error loading invitations:', error);
    } else {
      setInvitations(data || []);
    }
    
    setLoadingInvitations(false);
  };

  const handleInviteSuccess = () => {
    setIsInviteDialogOpen(false);
    loadUsers();
    loadInvitations();
    toast({
      title: 'Invitation sent',
      description: 'The user has been invited to join the organization.',
    });
  };

  const handleResendInvitation = async (invitationId: string) => {
    setResendingInvitation(invitationId);
    const { error } = await resendInvitation(invitationId);
    
    if (error) {
      toast({
        title: 'Error resending invitation',
        description: error.message || 'Failed to resend invitation',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Invitation resent',
        description: 'The invitation has been resent successfully.',
      });
      loadInvitations();
    }
    
    setResendingInvitation(null);
  };

  const handleCancelInvitation = async (invitationId: string) => {
    const { error } = await cancelInvitation(invitationId);
    
    if (error) {
      toast({
        title: 'Error cancelling invitation',
        description: error.message || 'Failed to cancel invitation',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Invitation cancelled',
        description: 'The invitation has been cancelled.',
      });
      loadInvitations();
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'user' | 'editor' | 'viewer') => {
    const { error } = await updateUserRole(userId, newRole);
    
    if (error) {
      toast({
        title: 'Error updating role',
        description: error.message || 'Failed to update user role',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Role updated',
        description: `User role has been updated to ${newRole}.`,
      });
      loadUsers();
    }
  };

  const handleEditPermissions = (user: OrganizationUser) => {
    setSelectedUser(user);
    setIsPermissionDialogOpen(true);
  };

  const handlePermissionUpdate = () => {
    setIsPermissionDialogOpen(false);
    setSelectedUser(null);
    loadUsers();
    toast({
      title: 'Permissions updated',
      description: 'User permissions have been updated successfully.',
    });
  };

  const handleRemoveUser = async () => {
    if (!userToRemove) return;
    
    const { error } = await removeUserFromOrganization(userToRemove.user_id);
    
    if (error) {
      toast({
        title: 'Error removing user',
        description: error.message || 'Failed to remove user from organization',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'User removed',
        description: 'The user has been removed from the organization.',
      });
      loadUsers();
    }
    
    setIsRemoveDialogOpen(false);
    setUserToRemove(null);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4 text-amber-500" />;
      case 'user':
        return <User className="h-4 w-4 text-blue-500" />;
      case 'editor':
        return <Edit className="h-4 w-4 text-green-500" />;
      case 'viewer':
        return <Eye className="h-4 w-4 text-gray-500" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'user':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'editor':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'viewer':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  if (!currentOrganization) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No organization selected.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canManageUsers()) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              You don't have permission to manage users in this organization.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage users and permissions for {currentOrganization.name}
          </p>
        </div>
        {canInviteUsers() && (
          <Button onClick={() => setIsInviteDialogOpen(true)} className="animate-in slide-in-from-right duration-500">
            <UserPlus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        )}
      </div>

      <Card className="animate-in slide-in-from-bottom duration-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Organization Members
          </CardTitle>
          <CardDescription>
            {users.length} {users.length === 1 ? 'member' : 'members'} in this organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No members yet</h3>
              <p className="text-muted-foreground mb-4">
                Start by inviting users to join this organization.
              </p>
              {canInviteUsers() && (
                <Button onClick={() => setIsInviteDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite First User
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const isCurrentUser = user.user_id === currentUser?.id;
                  return (
                    <TableRow key={user.id} className="animate-in fade-in slide-in-from-left duration-300">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback>
                              {getInitials(user.display_name, user.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {user.display_name || user.email}
                              {isCurrentUser && (
                                <Badge variant="outline" className="text-xs">
                                  You
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getRoleBadgeColor(user.role)} flex items-center gap-1 w-fit`}>
                          {getRoleIcon(user.role)}
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDate(user.joined_at)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {!isCurrentUser && isAdmin() && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleRoleChange(user.user_id, 'admin')}
                                  disabled={user.role === 'admin'}
                                >
                                  <Crown className="h-4 w-4 mr-2" />
                                  Set as Admin
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleRoleChange(user.user_id, 'user')}
                                  disabled={user.role === 'user'}
                                >
                                  <User className="h-4 w-4 mr-2" />
                                  Set as User
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleRoleChange(user.user_id, 'editor')}
                                  disabled={user.role === 'editor'}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Set as Editor
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleRoleChange(user.user_id, 'viewer')}
                                  disabled={user.role === 'viewer'}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Set as Viewer
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            {canEditPermissions() && !isCurrentUser && (
                              <DropdownMenuItem onClick={() => handleEditPermissions(user)}>
                                <Settings className="h-4 w-4 mr-2" />
                                Edit Permissions
                              </DropdownMenuItem>
                            )}
                            {canRemoveUsers() && !isCurrentUser && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setUserToRemove(user);
                                    setIsRemoveDialogOpen(true);
                                  }}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remove User
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <InviteUserDialog
        open={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
        onSuccess={handleInviteSuccess}
      />

      {selectedUser && (
        <PermissionEditor
          open={isPermissionDialogOpen}
          onOpenChange={setIsPermissionDialogOpen}
          user={selectedUser}
          onSuccess={handlePermissionUpdate}
        />
      )}

      <AlertDialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {userToRemove?.display_name || userToRemove?.email} from this organization?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pending Invitations Section */}
      {canInviteUsers() && (
        <Card className="animate-in slide-in-from-bottom duration-700 delay-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              {invitations.length} {invitations.length === 1 ? 'invitation' : 'invitations'} pending
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingInvitations ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            ) : invitations.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No pending invitations</p>
              </div>
            ) : (
              <div className="space-y-3">
                {invitations.map((invitation) => {
                  const expiresAt = new Date(invitation.expires_at);
                  const isExpired = expiresAt < new Date();
                  
                  return (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-4 border rounded-lg animate-in fade-in slide-in-from-left duration-300"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <Mail className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{invitation.email}</p>
                            <Badge className={isExpired ? 'bg-red-100 text-red-800 border-red-200' : 'bg-amber-100 text-amber-800 border-amber-200'}>
                              {isExpired ? 'Expired' : 'Pending'}
                            </Badge>
                            <Badge className={getRoleBadgeColor(invitation.role)}>
                              {getRoleIcon(invitation.role)}
                              {invitation.role}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Expires {expiresAt.toLocaleDateString()}
                            </span>
                            <span>Invited by {invitation.inviter_name || 'Team'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isExpired && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResendInvitation(invitation.id)}
                            disabled={resendingInvitation === invitation.id}
                          >
                            {resendingInvitation === invitation.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4 mr-2" />
                            )}
                            Resend
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelInvitation(invitation.id)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}


import React, { useState, useEffect } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings as SettingsIcon,
  Building2,
  User,
  Users,
  Plus,
  Crown,
  Edit,
  Eye,
  User as UserIcon,
  Mail,
  Shield,
  ArrowRight,
  CheckCircle2,
  Copy,
  Calendar,
  Sparkles,
  ExternalLink,
  Trash2,
  AlertTriangle,
  UserPlus,
  MoreVertical,
  Send,
  X,
  Clock,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { PermissionGate } from '@/components/PermissionGate';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { InviteUserDialog } from '@/components/InviteUserDialog';
import { PermissionEditor } from '@/components/PermissionEditor';
import { OrganizationUser, OrganizationInvitation } from '@/contexts/OrganizationContext';

export default function Settings() {
  const { user } = useAuth();
  const { 
    currentOrganization, 
    organizations, 
    loading, 
    switchOrganization,
    refreshOrganizations,
    createOrganization,
    deleteOrganization,
    fetchOrganizationUsers,
    updateUserRole,
    updateUserPermissions,
    removeUserFromOrganization,
    fetchPendingInvitations,
    cancelInvitation,
    resendInvitation,
  } = useOrganization();
  const { isAdmin, canManageUsers, canManageOrganizations, canInviteUsers, canRemoveUsers, canEditPermissions } = usePermission();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [switchingOrg, setSwitchingOrg] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteSecondConfirmOpen, setDeleteSecondConfirmOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deletingOrg, setDeletingOrg] = useState(false);
  
  // User management state
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<OrganizationUser | null>(null);
  const [userToRemove, setUserToRemove] = useState<OrganizationUser | null>(null);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [resendingInvitation, setResendingInvitation] = useState<string | null>(null);

  const handleSwitchOrganization = async (orgId: string) => {
    setSwitchingOrg(orgId);
    try {
      await switchOrganization(orgId);
      toast({
        title: 'Organization switched',
        description: 'You have switched to a different organization.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to switch organization. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSwitchingOrg(null);
    }
  };


  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4 text-amber-500" />;
      case 'user':
        return <UserIcon className="h-4 w-4 text-blue-500" />;
      case 'editor':
        return <Edit className="h-4 w-4 text-green-500" />;
      case 'viewer':
        return <Eye className="h-4 w-4 text-gray-500" />;
      default:
        return <UserIcon className="h-4 w-4" />;
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

  const getInitials = (email: string) => {
    return email[0].toUpperCase();
  };

  const getInitialsForUser = (name: string | null, email: string) => {
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // User management functions
  const loadUsers = async () => {
    if (!currentOrganization) return;
    
    setLoadingUsers(true);
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
    
    setLoadingUsers(false);
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

  useEffect(() => {
    if (currentOrganization) {
      loadUsers();
      loadInvitations();
    }
  }, [currentOrganization]);

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

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orgName.trim()) {
      toast({
        title: 'Organization name required',
        description: 'Please enter a name for your organization.',
        variant: 'destructive',
      });
      return;
    }

    setCreatingOrg(true);
    try {
      const { data, error } = await createOrganization(orgName.trim());
      
      if (error) {
        toast({
          title: 'Error creating organization',
          description: error.message || 'Failed to create organization. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      if (data) {
        toast({
          title: 'Organization created!',
          description: `${data.name} has been created successfully.`,
        });
        setShowCreateForm(false);
        setOrgName('');
        await refreshOrganizations();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setCreatingOrg(false);
    }
  };

  const handleDeleteClick = (org: { id: string; name: string }) => {
    setOrgToDelete(org);
    setDeleteConfirmOpen(true);
  };

  const handleFirstConfirm = () => {
    setDeleteConfirmOpen(false);
    setDeleteSecondConfirmOpen(true);
  };

  const handleDeleteOrganization = async () => {
    if (!orgToDelete) return;

    setDeletingOrg(true);
    try {
      console.log('Deleting organization:', orgToDelete);
      const { data, error } = await deleteOrganization(orgToDelete.id);
      
      console.log('Delete response:', { data, error });
      
      if (error) {
        console.error('Delete error:', error);
        toast({
          title: 'Error deleting organization',
          description: error.message || error.details?.message || 'Failed to delete organization. Please check the console for details.',
          variant: 'destructive',
        });
        setDeleteSecondConfirmOpen(false);
        setOrgToDelete(null);
        return;
      }

      if (data) {
        toast({
          title: 'Organization deleted',
          description: `${orgToDelete.name} has been deleted successfully.`,
        });
        setDeleteSecondConfirmOpen(false);
        setOrgToDelete(null);
        await refreshOrganizations();
      } else {
        toast({
          title: 'Delete failed',
          description: 'Organization deletion returned no data. Please check the console.',
          variant: 'destructive',
        });
        setDeleteSecondConfirmOpen(false);
        setOrgToDelete(null);
      }
    } catch (error: any) {
      console.error('Delete exception:', error);
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred. Please check the console.',
        variant: 'destructive',
      });
      setDeleteSecondConfirmOpen(false);
      setOrgToDelete(null);
    } finally {
      setDeletingOrg(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    });
  };

        return (
    <div className="container mx-auto p-6 md:p-8 lg:p-10 space-y-8 animate-in fade-in duration-500 max-w-6xl">
      {/* Enhanced Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 border border-primary/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(20,184,166,0.1),transparent_50%)] pointer-events-none" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
              <SettingsIcon className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                Settings
              </h1>
              <p className="text-muted-foreground text-lg mt-1">
                Manage your account and organizations
              </p>
            </div>
          </div>
        </div>
            </div>

      <Tabs defaultValue="account" className="space-y-8">
        <TabsList className="grid w-full grid-cols-4 h-auto p-1.5 bg-muted/50 rounded-xl border border-border/50">
          <TabsTrigger 
            value="account" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/10 data-[state=active]:to-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-primary/20 rounded-lg transition-all duration-300"
          >
            <User className="h-4 w-4 mr-2" />
            Account
          </TabsTrigger>
          <TabsTrigger 
            value="organizations"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/10 data-[state=active]:to-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-primary/20 rounded-lg transition-all duration-300"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Organizations
          </TabsTrigger>
          <TabsTrigger 
            value="users"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/10 data-[state=active]:to-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-primary/20 rounded-lg transition-all duration-300"
          >
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger 
            value="permissions"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/10 data-[state=active]:to-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:border data-[state=active]:border-primary/20 rounded-lg transition-all duration-300"
          >
            <Shield className="h-4 w-4 mr-2" />
            Permissions
          </TabsTrigger>
        </TabsList>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-8 animate-in fade-in duration-500">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-white to-primary/5 backdrop-blur-sm overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />
            <CardHeader className="pb-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold">Account Information</CardTitle>
                  <CardDescription className="text-base mt-1">
                  Your personal account details
                </CardDescription>
                </div>
              </div>
              </CardHeader>
            <CardContent className="space-y-8 pt-2 relative z-10">
              {/* Enhanced Profile Section */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 rounded-2xl bg-gradient-to-br from-primary/5 via-primary/3 to-transparent border border-primary/10 backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:border-primary/20">
                <div className="relative">
                  <Avatar className="h-24 w-24 border-4 border-white shadow-xl ring-4 ring-primary/10">
                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600 text-white text-3xl font-bold shadow-lg">
                      {getInitials(user?.email || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 p-1.5 bg-white rounded-full shadow-lg border-2 border-primary/20">
                    <div className="h-4 w-4 rounded-full bg-green-500 border-2 border-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-2xl mb-2 text-foreground">
                      {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                  </h3>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4 text-primary" />
                    <span className="text-base">{user?.email}</span>
                  </div>
                  </div>
                </div>

              <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />

              {/* Enhanced Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group p-5 rounded-xl border border-border/50 bg-gradient-to-br from-background to-muted/30 hover:border-primary/30 hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      User ID
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => copyToClipboard(user?.id || '', 'User ID')}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-sm font-mono text-foreground break-all bg-muted/50 p-3 rounded-lg border border-border/50">
                    {user?.id}
                  </p>
                </div>
                
                <div className="group p-5 rounded-xl border border-border/50 bg-gradient-to-br from-background to-muted/30 hover:border-primary/30 hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      Account Created
                    </p>
                  </div>
                  <p className="text-base font-semibold text-foreground flex items-center gap-2">
                      {user?.created_at 
                        ? new Date(user.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
        </TabsContent>

        {/* Organizations Tab */}
        <TabsContent value="organizations" className="space-y-8 animate-in fade-in duration-500">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-white to-primary/5 backdrop-blur-sm overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />
            <CardHeader className="relative z-10">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
              <div>
                    <CardTitle className="text-2xl font-bold">Your Organizations</CardTitle>
                    <CardDescription className="text-base mt-1">
                  Manage your organizations and switch between them
                    </CardDescription>
              </div>
                </div>
                <Button 
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20"
                >
                <Plus className="h-4 w-4 mr-2" />
                  {showCreateForm ? 'Cancel' : 'Create Organization'}
              </Button>
            </div>
              </CardHeader>
            <CardContent className="relative z-10 space-y-4">
              {/* Create Organization Form */}
              {showCreateForm && (
                <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/2 p-4 mb-4">
                  <form onSubmit={handleCreateOrganization} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="org-name" className="text-sm font-semibold">
                        Organization Name <span className="text-destructive">*</span>
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="org-name"
                          type="text"
                          placeholder="Enter organization name"
                          value={orgName}
                          onChange={(e) => setOrgName(e.target.value)}
                          required
                          disabled={creatingOrg}
                          className="flex-1 h-10 border-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                          autoFocus
                        />
                        <Button
                          type="submit"
                          disabled={creatingOrg || !orgName.trim()}
                          className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
                        >
                          {creatingOrg ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                              Creating...
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              Create
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowCreateForm(false);
                            setOrgName('');
                          }}
                          disabled={creatingOrg}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </form>
                </Card>
              )}

                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                        <Skeleton className="h-12 w-12 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                        <Skeleton className="h-8 w-24" />
                      </div>
                    ))}
                  </div>
                ) : organizations.length === 0 ? (
                <div className="text-center py-16 px-6">
                  <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 mb-6">
                    <Building2 className="h-16 w-16 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">No Organizations</h3>
                  <p className="text-muted-foreground mb-8 max-w-md mx-auto text-base">
                      Create your first organization to get started. You'll be the administrator and can invite others.
                    </p>
                    <Button 
                      onClick={() => setShowCreateForm(true)}
                      className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Organization
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {organizations.map((org) => {
                      const isCurrent = org.id === currentOrganization?.id;
                      const isSwitching = switchingOrg === org.id;

                      return (
                        <div
                          key={org.id}
                        className={`flex items-center justify-between p-5 border rounded-xl transition-all animate-in fade-in slide-in-from-left duration-300 group ${
                            isCurrent 
                            ? 'border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 ring-2 ring-primary/20 shadow-lg shadow-primary/10' 
                            : 'border-border/50 hover:bg-gradient-to-r hover:from-muted/50 hover:to-muted/30 hover:border-primary/20 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-center gap-4 flex-1">
                          <div className={`h-14 w-14 rounded-xl flex items-center justify-center transition-all duration-300 shadow-lg ${
                              isCurrent 
                              ? 'bg-gradient-to-br from-primary to-primary/80 text-white shadow-primary/30' 
                              : 'bg-gradient-to-br from-muted to-muted/80 group-hover:from-primary/10 group-hover:to-primary/5'
                            }`}>
                            <Building2 className={`h-7 w-7 ${isCurrent ? 'text-white' : 'text-primary'}`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold">{org.name}</p>
                                {isCurrent && (
                                  <Badge variant="outline" className="text-xs">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Current
                                  </Badge>
                                )}
                              {org.is_original && (
                                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                                  <Crown className="h-3 w-3 mr-1" />
                                  Original
                                </Badge>
                              )}
                                <Badge className={`${getRoleBadgeColor(org.role)} flex items-center gap-1`}>
                                  {getRoleIcon(org.role)}
                                  {org.role}
                                </Badge>
                              </div>
                              {org.description && (
                                <p className="text-sm text-muted-foreground">{org.description}</p>
                              )}
                              {org.parent_organization_id && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Sub-organization
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!isCurrent && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSwitchOrganization(org.id)}
                                disabled={isSwitching}
                              >
                                {isSwitching ? (
                                  <>Switching...</>
                                ) : (
                                  <>
                                    Switch
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                  </>
                                )}
                              </Button>
                            )}
                            {isAdmin() && isCurrent && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/organization-settings?org=${org.id}`)}
                              >
                                <SettingsIcon className="h-4 w-4 mr-2" />
                                Settings
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteClick({ id: org.id, name: org.name })}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                            </>
                          )}
                          {isAdmin() && !isCurrent && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteClick({ id: org.id, name: org.name })}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-8 animate-in fade-in duration-500">
          {!currentOrganization ? (
            <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-white to-primary/5 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="text-center py-16 px-6">
                  <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 mb-6">
                    <Users className="h-16 w-16 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">No Organization Selected</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Please select an organization to manage users.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : !canManageUsers() ? (
            <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-white to-primary/5 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="text-center py-16 px-6">
                  <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 mb-6">
                    <Shield className="h-16 w-16 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Access Denied</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    You don't have permission to manage users in this organization.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-white to-primary/5 backdrop-blur-sm overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />
                <CardHeader className="relative z-10">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-bold">Organization Members</CardTitle>
                        <CardDescription className="text-base mt-1">
                          Manage users and permissions for {currentOrganization.name}
                      </CardDescription>
                      </div>
                    </div>
                    {canInviteUsers() && (
                      <Button 
                        onClick={() => setIsInviteDialogOpen(true)}
                        className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Invite User
                      </Button>
                    )}
                  </div>
                    </CardHeader>
                <CardContent className="relative z-10">
                  {loadingUsers ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
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
                    <div className="text-center py-16 px-6">
                      <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 mb-6">
                        <Users className="h-16 w-16 text-primary" />
                      </div>
                      <h3 className="text-2xl font-bold mb-3">No members yet</h3>
                      <p className="text-muted-foreground mb-8 max-w-md mx-auto text-base">
                        Start by inviting users to join this organization.
                      </p>
                      {canInviteUsers() && (
                        <Button 
                          onClick={() => setIsInviteDialogOpen(true)}
                          className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20"
                        >
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
                        {users.map((orgUser) => {
                          const isCurrentUser = orgUser.user_id === user?.id;
                          return (
                            <TableRow key={orgUser.id} className="animate-in fade-in slide-in-from-left duration-300">
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar>
                                    <AvatarImage src={orgUser.avatar_url || undefined} />
                                    <AvatarFallback className="bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600 text-white">
                                      {getInitialsForUser(orgUser.display_name, orgUser.email)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-medium flex items-center gap-2">
                                      {orgUser.display_name || orgUser.email}
                                      {isCurrentUser && (
                                        <Badge variant="outline" className="text-xs">
                                          You
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                                      <Mail className="h-3 w-3" />
                                      {orgUser.email}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={`${getRoleBadgeColor(orgUser.role)} flex items-center gap-1 w-fit`}>
                                  {getRoleIcon(orgUser.role)}
                                  {orgUser.role}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(orgUser.joined_at)}
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
                                          onClick={() => handleRoleChange(orgUser.user_id, 'admin')}
                                          disabled={orgUser.role === 'admin'}
                                        >
                                          <Crown className="h-4 w-4 mr-2" />
                                          Set as Admin
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => handleRoleChange(orgUser.user_id, 'user')}
                                          disabled={orgUser.role === 'user'}
                                        >
                                          <UserIcon className="h-4 w-4 mr-2" />
                                          Set as User
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => handleRoleChange(orgUser.user_id, 'editor')}
                                          disabled={orgUser.role === 'editor'}
                                        >
                                          <Edit className="h-4 w-4 mr-2" />
                                          Set as Editor
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => handleRoleChange(orgUser.user_id, 'viewer')}
                                          disabled={orgUser.role === 'viewer'}
                                        >
                                          <Eye className="h-4 w-4 mr-2" />
                                          Set as Viewer
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                      </>
                                    )}
                                    {canEditPermissions() && !isCurrentUser && (
                                      <DropdownMenuItem onClick={() => handleEditPermissions(orgUser)}>
                                        <SettingsIcon className="h-4 w-4 mr-2" />
                                        Edit Permissions
                                      </DropdownMenuItem>
                                    )}
                                    {canRemoveUsers() && !isCurrentUser && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setUserToRemove(orgUser);
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

              {/* Pending Invitations Section */}
              {canInviteUsers() && (
                <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-white to-primary/5 backdrop-blur-sm overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />
                  <CardHeader className="relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
                        <Mail className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-bold">Pending Invitations</CardTitle>
                        <CardDescription className="text-base mt-1">
                          {invitations.length} {invitations.length === 1 ? 'invitation' : 'invitations'} pending
                      </CardDescription>
                      </div>
                    </div>
                    </CardHeader>
                  <CardContent className="relative z-10">
                    {loadingInvitations ? (
                      <div className="space-y-3">
                        {[1, 2].map((i) => (
                          <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
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
                      <div className="text-center py-12">
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
                              className="flex items-center justify-between p-4 border rounded-lg animate-in fade-in slide-in-from-left duration-300 hover:border-primary/20 transition-colors"
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

              {/* Invite User Dialog */}
              <InviteUserDialog
                open={isInviteDialogOpen}
                onOpenChange={setIsInviteDialogOpen}
                onSuccess={handleInviteSuccess}
              />

              {/* Permission Editor Dialog */}
              {selectedUser && (
                <PermissionEditor
                  open={isPermissionDialogOpen}
                  onOpenChange={setIsPermissionDialogOpen}
                  user={selectedUser}
                  onSuccess={handlePermissionUpdate}
                />
              )}

              {/* Remove User Dialog */}
              <AlertDialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
                <AlertDialogContent className="border-0 shadow-2xl bg-gradient-to-br from-white via-white to-destructive/5 backdrop-blur-xl">
                  <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-destructive to-destructive/80 shadow-lg shadow-destructive/20">
                        <AlertTriangle className="h-5 w-5 text-white" />
            </div>
                      <AlertDialogTitle className="text-2xl font-bold">
                        Remove User
                      </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-base mt-2">
                      Are you sure you want to remove <strong>{userToRemove?.display_name || userToRemove?.email}</strong> from this organization?
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-3">
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRemoveUser}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-8 animate-in fade-in duration-500">
            {currentOrganization ? (
            <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-white to-primary/5 backdrop-blur-sm overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />
              <CardHeader className="relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold">Current Organization Permissions</CardTitle>
                    <CardDescription className="text-base mt-1">
                    Your permissions in {currentOrganization.name}
                  </CardDescription>
                  </div>
                </div>
                </CardHeader>
              <CardContent className="relative z-10">
                <div className="space-y-6">
                    <div>
                    <p className="text-sm font-semibold mb-3 uppercase tracking-wide text-muted-foreground">Your Role</p>
                    <Badge className={`${getRoleBadgeColor(currentOrganization.role)} flex items-center gap-1 w-fit text-base px-3 py-1.5`}>
                        {getRoleIcon(currentOrganization.role)}
                        {currentOrganization.role}
                      </Badge>
                      {isAdmin() && (
                      <p className="text-sm text-muted-foreground mt-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                          As an administrator, you have all permissions enabled.
                        </p>
                      )}
                    </div>

                  <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />

                    <div>
                    <p className="text-sm font-semibold mb-4 uppercase tracking-wide text-muted-foreground">Your Permissions</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(currentOrganization.permissions || {}).map(([key, value]) => (
                          <div
                            key={key}
                          className="flex items-center justify-between p-4 border rounded-xl bg-gradient-to-br from-background to-muted/30 hover:border-primary/30 hover:shadow-md transition-all duration-300 group"
                          >
                          <span className="text-sm font-medium">
                              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                            {value ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                              <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {!isAdmin() && (
                    <Alert className="border-primary/20 bg-primary/5">
                      <AlertDescription className="text-sm">
                          Contact your organization administrator to request additional permissions.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
            <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-white to-primary/5 backdrop-blur-sm">
                <CardContent className="pt-6">
                <div className="text-center py-16 px-6">
                  <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 mb-6">
                    <Shield className="h-16 w-16 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">No Organization Selected</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                      Select an organization to view your permissions.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
        </TabsContent>
      </Tabs>

      {/* First Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="border-0 shadow-2xl bg-gradient-to-br from-white via-white to-destructive/5 backdrop-blur-xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-destructive to-destructive/80 shadow-lg shadow-destructive/20">
                <AlertTriangle className="h-5 w-5 text-white" />
            </div>
              <AlertDialogTitle className="text-2xl font-bold">
                Delete Organization?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base mt-2">
              Are you sure you want to delete <strong>{orgToDelete?.name}</strong>? This action cannot be undone and will permanently remove the organization and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFirstConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Second Confirmation Dialog */}
      <AlertDialog open={deleteSecondConfirmOpen} onOpenChange={setDeleteSecondConfirmOpen}>
        <AlertDialogContent className="border-0 shadow-2xl bg-gradient-to-br from-white via-white to-destructive/5 backdrop-blur-xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-destructive to-destructive/80 shadow-lg shadow-destructive/20">
                <AlertTriangle className="h-5 w-5 text-white" />
                          </div>
              <AlertDialogTitle className="text-2xl font-bold">
                Final Confirmation
              </AlertDialogTitle>
          </div>
            <AlertDialogDescription className="text-base mt-2 space-y-2">
              <p>
                <strong>This is your final warning.</strong>
              </p>
              <p>
                Deleting <strong>{orgToDelete?.name}</strong> will:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm mt-2 ml-2">
                <li>Permanently remove the organization</li>
                <li>Remove all users from this organization</li>
                <li>Delete all associated data</li>
                <li>This action cannot be undone</li>
              </ul>
              <p className="mt-3 font-semibold text-destructive">
                Type the organization name to confirm: <strong>{orgToDelete?.name}</strong>
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel onClick={() => setOrgToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrganization}
              disabled={deletingOrg}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {deletingOrg ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Permanently
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
  );
}


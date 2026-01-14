import React, { useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermission } from '@/hooks/usePermission';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Plus, 
  Settings, 
  Users, 
  ChevronRight,
  Crown,
  User,
  Eye,
  Edit
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export default function OrganizationManagement() {
  const { organizations, currentOrganization, loading, refreshOrganizations } = useOrganization();
  const { canManageOrganizations, isAdmin } = usePermission();
  const navigate = useNavigate();

  // Separate parent and child organizations
  const parentOrgs = organizations.filter(org => !org.parent_organization_id);
  const childOrgs = organizations.filter(org => org.parent_organization_id);

  const getChildOrgsForParent = (parentId: string) => {
    return childOrgs.filter(org => org.parent_organization_id === parentId);
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
        return 'bg-amber-100 text-amber-800';
      case 'user':
        return 'bg-blue-100 text-blue-800';
      case 'editor':
        return 'bg-green-100 text-green-800';
      case 'viewer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
            <p className="text-muted-foreground mt-1">
              Manage your organizations and sub-organizations
            </p>
          </div>
          {canManageOrganizations() && (
            <Button 
              onClick={() => navigate('/settings')}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Organization
            </Button>
          )}
        </div>

        {/* Current Organization Card */}
        {currentOrganization && (
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {currentOrganization.name}
                      <Badge className={getRoleBadgeColor(currentOrganization.role)}>
                        {getRoleIcon(currentOrganization.role)}
                        <span className="ml-1 capitalize">{currentOrganization.role}</span>
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Currently active organization
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => navigate('/organization-settings')}
                  className="gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Organizations List */}
        <div className="space-y-6">
          {/* Parent Organizations */}
          {parentOrgs.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Parent Organizations</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {parentOrgs.map((org) => {
                  const children = getChildOrgsForParent(org.id);
                  const isCurrent = currentOrganization?.id === org.id;
                  
                  return (
                    <Card 
                      key={org.id} 
                      className={`transition-all duration-300 hover:shadow-lg ${
                        isCurrent ? 'ring-2 ring-primary' : ''
                      }`}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="p-2 rounded-lg bg-teal-100">
                              <Building2 className="h-5 w-5 text-teal-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <CardTitle className="text-lg truncate">{org.name}</CardTitle>
                              <CardDescription className="flex items-center gap-2 mt-1">
                                {getRoleIcon(org.role)}
                                <span className="capitalize">{org.role}</span>
                                {children.length > 0 && (
                                  <span className="text-xs">• {children.length} sub-org{children.length !== 1 ? 's' : ''}</span>
                                )}
                              </CardDescription>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {org.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {org.description}
                          </p>
                        )}
                        
                        {/* Child Organizations Preview */}
                        {children.length > 0 && (
                          <div className="pt-2 border-t">
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              Sub-Organizations:
                            </p>
                            <div className="space-y-1">
                              {children.slice(0, 2).map((child) => (
                                <div 
                                  key={child.id} 
                                  className="flex items-center gap-2 text-sm text-muted-foreground"
                                >
                                  <ChevronRight className="h-3 w-3" />
                                  <span className="truncate">{child.name}</span>
                                </div>
                              ))}
                              {children.length > 2 && (
                                <p className="text-xs text-muted-foreground pl-5">
                                  +{children.length - 2} more
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          {isAdmin() && org.id === currentOrganization?.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 gap-2"
                              onClick={() => navigate('/settings')}
                            >
                              <Plus className="h-3 w-3" />
                              Add Sub-Org
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-2"
                            onClick={() => navigate(`/organization-settings?org=${org.id}`)}
                          >
                            <Settings className="h-3 w-3" />
                            Settings
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Child Organizations Section */}
          {childOrgs.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Sub-Organizations</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {childOrgs.map((org) => {
                  const parent = parentOrgs.find(p => p.id === org.parent_organization_id);
                  const isCurrent = currentOrganization?.id === org.id;
                  
                  return (
                    <Card 
                      key={org.id} 
                      className={`transition-all duration-300 hover:shadow-lg ${
                        isCurrent ? 'ring-2 ring-primary' : ''
                      }`}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="p-2 rounded-lg bg-blue-100">
                              <Building2 className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <CardTitle className="text-lg truncate">{org.name}</CardTitle>
                              <CardDescription className="flex items-center gap-2 mt-1">
                                {getRoleIcon(org.role)}
                                <span className="capitalize">{org.role}</span>
                                {parent && (
                                  <span className="text-xs">• {parent.name}</span>
                                )}
                              </CardDescription>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {org.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {org.description}
                          </p>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-2"
                          onClick={() => navigate(`/organization-settings?org=${org.id}`)}
                        >
                          <Settings className="h-3 w-3" />
                          Settings
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {organizations.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Organizations</h3>
                <p className="text-muted-foreground text-center mb-4 max-w-md">
                  You don't have any organizations yet. Create your first organization to get started.
                </p>
                {canManageOrganizations() && (
                  <Button onClick={() => navigate('/settings')} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Organization
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

      </div>
    </div>
  );
}


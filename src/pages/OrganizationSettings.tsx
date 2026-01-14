import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermission } from '@/hooks/usePermission';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Building2, Save, Loader2, Crown, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function OrganizationSettings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orgIdFromUrl = searchParams.get('org');
  
  const { organizations, currentOrganization, refreshOrganizations } = useOrganization();
  const { isAdmin, canManageOrganizations } = usePermission();
  const { toast } = useToast();
  
  const [orgToEdit, setOrgToEdit] = useState<typeof currentOrganization | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrganization = async () => {
      setLoading(true);
      try {
        let targetOrg = currentOrganization;
        
        // If org ID is in URL, find that organization
        if (orgIdFromUrl) {
          targetOrg = organizations.find(org => org.id === orgIdFromUrl) || null;
        }

        if (targetOrg) {
          setOrgToEdit(targetOrg);
          setName(targetOrg.name);
          setDescription(targetOrg.description || '');
        } else if (organizations.length > 0) {
          // Fallback to first organization
          const firstOrg = organizations[0];
          setOrgToEdit(firstOrg);
          setName(firstOrg.name);
          setDescription(firstOrg.description || '');
        }
      } catch (error) {
        console.error('Error loading organization:', error);
      } finally {
        setLoading(false);
      }
    };

    if (organizations.length > 0) {
      loadOrganization();
    } else {
      setLoading(false);
    }
  }, [organizations, orgIdFromUrl, currentOrganization]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orgToEdit) return;
    
    if (!canManageOrganizations() || !isAdmin()) {
      toast({
        title: 'Permission Denied',
        description: 'You do not have permission to edit this organization',
        variant: 'destructive',
      });
      return;
    }

    if (!name.trim()) {
      toast({
        title: 'Error',
        description: 'Organization name is required',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('organizations')
        .update({
          name: name.trim(),
          description: description.trim() || null,
        })
        .eq('id', orgToEdit.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Organization updated successfully',
      });

      await refreshOrganizations();
    } catch (error: any) {
      console.error('Error updating organization:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update organization',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!orgToEdit) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Organization Not Found</h3>
              <p className="text-muted-foreground text-center mb-4">
                The organization you're looking for doesn't exist or you don't have access to it.
              </p>
              <Button onClick={() => navigate('/settings')}>
                Back to Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const canEdit = canManageOrganizations() && isAdmin();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/settings')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">Organization Settings</h1>
            <p className="text-muted-foreground mt-1">
              Manage your organization details and preferences
            </p>
          </div>
        </div>

        {/* Organization Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {orgToEdit.name}
                    <Badge className={orgToEdit.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}>
                      <Crown className="h-3 w-3 mr-1" />
                      {orgToEdit.role}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {orgToEdit.parent_organization_id 
                      ? 'Sub-Organization' 
                      : 'Parent Organization'}
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!canEdit && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  You don't have permission to edit this organization. Only admins can modify organization settings.
                </p>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!canEdit || isSaving}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!canEdit || isSaving}
                  rows={4}
                  placeholder="Enter organization description"
                />
              </div>

              {canEdit && (
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/settings')}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving || !name.trim()}>
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
            <CardDescription>Additional information about this organization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-muted-foreground">Organization ID</Label>
                <p className="text-sm font-mono mt-1">{orgToEdit.id}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Your Role</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={orgToEdit.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}>
                    {orgToEdit.role}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


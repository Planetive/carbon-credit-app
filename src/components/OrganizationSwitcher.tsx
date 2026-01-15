import React, { useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, ChevronDown, Plus, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface OrganizationSwitcherProps {
  onCreateOrganization?: () => void;
}

export function OrganizationSwitcher({ onCreateOrganization }: OrganizationSwitcherProps) {
  const { currentOrganization, organizations, switchOrganization, loading } = useOrganization();
  const [isSwitching, setIsSwitching] = useState(false);
  const navigate = useNavigate();

  const handleSwitch = async (orgId: string) => {
    if (orgId === currentOrganization?.id) return;
    
    setIsSwitching(true);
    try {
      await switchOrganization(orgId);
    } catch (error) {
      console.error('Error switching organization:', error);
    } finally {
      setIsSwitching(false);
    }
  };

  if (loading) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <Building2 className="h-4 w-4" />
        <span className="hidden sm:inline">Loading...</span>
      </Button>
    );
  }

  if (!currentOrganization && organizations.length === 0) {
    return (
      <Button 
        variant="outline" 
        onClick={onCreateOrganization}
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Create Organization</span>
      </Button>
    );
  }

  // Separate parent and child organizations
  const parentOrgs = organizations.filter(org => !org.parent_organization_id);
  const childOrgs = organizations.filter(org => org.parent_organization_id);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="gap-2 min-w-[200px] justify-between"
          disabled={isSwitching}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span className="truncate hidden sm:inline">
              {currentOrganization?.name || 'Select Organization'}
            </span>
            <span className="truncate sm:hidden">
              {currentOrganization?.name?.substring(0, 10) || 'Select'}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Switch Organization</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Parent Organizations */}
        {parentOrgs.length > 0 && (
          <>
            {parentOrgs.length > 1 && (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Parent Organizations
                </DropdownMenuLabel>
              </>
            )}
            {parentOrgs.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => handleSwitch(org.id)}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Building2 className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{org.name}</span>
                </div>
                {currentOrganization?.id === org.id && (
                  <Check className="h-4 w-4 flex-shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {/* Child Organizations */}
        {childOrgs.length > 0 && (
          <>
            {parentOrgs.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Sub-Organizations
            </DropdownMenuLabel>
            {childOrgs.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => handleSwitch(org.id)}
                className="flex items-center justify-between cursor-pointer pl-6"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Building2 className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{org.name}</span>
                </div>
                {currentOrganization?.id === org.id && (
                  <Check className="h-4 w-4 flex-shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            if (onCreateOrganization) {
              onCreateOrganization();
            } else {
              navigate('/settings');
            }
          }}
          className="cursor-pointer"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { EmissionData } from "@/components/emissions/shared/types";
import { Edit2, Save, CheckCircle2, Factory, Zap, Globe, RotateCcw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LCAInputFormProps {
  emissionData: EmissionData;
  setEmissionData: React.Dispatch<React.SetStateAction<EmissionData>>;
  onSwitchToManual: () => void;
  companyContext?: boolean;
  counterpartyId?: string;
}

interface LCAData {
  scope1: number | '';
  scope2: number | '';
  scope3Upstream: number | '';
  scope3Downstream: number | '';
}

const LCAInputForm: React.FC<LCAInputFormProps> = ({ 
  emissionData, 
  setEmissionData,
  onSwitchToManual,
  companyContext = false,
  counterpartyId,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [editingScope, setEditingScope] = useState<string | null>(null);
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lcaData, setLcaData] = useState<LCAData>({
    scope1: '',
    scope2: '',
    scope3Upstream: '',
    scope3Downstream: '',
  });
  
  // Track database IDs for each scope
  const [lcaDbIds, setLcaDbIds] = useState<{
    scope1?: string;
    scope2?: string;
    scope3Upstream?: string;
    scope3Downstream?: string;
  }>({});

  // Load existing LCA data from database
  useEffect(() => {
    const loadExistingLCA = async () => {
      if (!user) return;

      // Skip loading data when in company context - start with blank form
      if (companyContext && !counterpartyId) {
        return;
      }

      try {
        let query = supabase
          .from('scope3_lca_entries')
          .select('*')
          .eq('user_id', user.id);

        // Filter by counterparty_id if in company context
        if (companyContext && counterpartyId) {
          query = query.eq('counterparty_id', counterpartyId);
        } else {
          // Only personal entries (no counterparty_id)
          query = query.is('counterparty_id', null);
        }

        const { data: lcaData, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        if (lcaData && lcaData.length > 0) {
          const dbIds: typeof lcaDbIds = {};
          const loadedData: LCAData = {
            scope1: '',
            scope2: '',
            scope3Upstream: '',
            scope3Downstream: '',
          };
          
          lcaData.forEach(entry => {
            const scopeType = entry.scope_type;
            if (scopeType === 'scope1') {
              loadedData.scope1 = entry.emissions;
              dbIds.scope1 = entry.id;
            } else if (scopeType === 'scope2') {
              loadedData.scope2 = entry.emissions;
              dbIds.scope2 = entry.id;
            } else if (scopeType === 'scope3_upstream') {
              loadedData.scope3Upstream = entry.emissions;
              dbIds.scope3Upstream = entry.id;
            } else if (scopeType === 'scope3_downstream') {
              loadedData.scope3Downstream = entry.emissions;
              dbIds.scope3Downstream = entry.id;
            }
          });

          setLcaData(loadedData);
          setLcaDbIds(dbIds);

          // Also update emissionData
          setEmissionData(prev => ({
            ...prev,
            scope1: {
              fuel: [],
              refrigerant: [],
              passengerVehicle: [],
              deliveryVehicle: [],
            },
            scope2: [],
            scope3: [
              ...prev.scope3.filter(r => !r.category?.startsWith('lca_')),
              ...lcaData.map(entry => ({
                id: entry.id,
                dbId: entry.id,
                category: `lca_${entry.scope_type.replace('scope3_', '')}` as any,
                activity: `LCA: ${entry.scope_type === 'scope1' ? 'Scope 1' : entry.scope_type === 'scope2' ? 'Scope 2' : entry.scope_type === 'scope3_upstream' ? 'Scope 3 Upstream' : 'Scope 3 Downstream'} Emissions`,
                unit: entry.unit,
                quantity: entry.emissions,
                emissions: entry.emissions,
                isExisting: true,
              }))
            ]
          }));
        }
      } catch (error: any) {
        console.error('Error loading LCA data:', error);
        // Don't show error toast on initial load, just continue with empty form
      }
    };

    loadExistingLCA();
  }, [user, companyContext, counterpartyId]);

  const handleSave = async (scope: string, value: number) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please log in to save.", variant: "destructive" });
      return;
    }

    const numValue = value || 0;
    
    // Update local state immediately for UI feedback
    setLcaData(prev => ({ ...prev, [scope]: numValue }));
    
    setSaving(true);
    try {
      // Map scope name to database scope_type
      const scopeTypeMap: Record<string, string> = {
        'scope1': 'scope1',
        'scope2': 'scope2',
        'scope3Upstream': 'scope3_upstream',
        'scope3Downstream': 'scope3_downstream',
      };
      
      const scopeType = scopeTypeMap[scope];
      const dbId = lcaDbIds[scope as keyof typeof lcaDbIds];

      if (dbId) {
        // Update existing entry
        const { error } = await supabase
          .from('scope3_lca_entries')
          .update({ emissions: numValue })
          .eq('id', dbId);

        if (error) throw error;
      } else if (numValue > 0) {
        // Insert new entry
        const { data, error } = await supabase
          .from('scope3_lca_entries')
          .insert({
            user_id: user.id,
            counterparty_id: companyContext ? counterpartyId : null,
            scope_type: scopeType,
            emissions: numValue,
            unit: 'kg CO2e',
            calculation_mode: 'direct_lca',
          })
          .select('id')
          .single();

        if (error) throw error;
        
        // Update dbIds
        setLcaDbIds(prev => ({ ...prev, [scope]: data.id }));
      }

      // Update emissionData
      const categoryMap: Record<string, string> = {
        'scope1': 'lca_scope1',
        'scope2': 'lca_scope2',
        'scope3Upstream': 'lca_upstream',
        'scope3Downstream': 'lca_downstream',
      };

      const activityMap: Record<string, string> = {
        'scope1': 'LCA: Scope 1 Emissions',
        'scope2': 'LCA: Scope 2 Emissions',
        'scope3Upstream': 'LCA: Scope 3 Upstream Emissions',
        'scope3Downstream': 'LCA: Scope 3 Downstream Emissions',
      };

      setEmissionData(prev => ({
        ...prev,
        scope1: scope === 'scope1' ? {
          fuel: [],
          refrigerant: [],
          passengerVehicle: [],
          deliveryVehicle: [],
        } : prev.scope1,
        scope2: scope === 'scope2' ? [] : prev.scope2,
        scope3: [
          ...prev.scope3.filter(r => r.category !== categoryMap[scope]),
          {
            id: dbId || crypto.randomUUID(),
            dbId: dbId || lcaDbIds[scope as keyof typeof lcaDbIds],
            category: categoryMap[scope] as any,
            activity: activityMap[scope],
            unit: 'kg CO2e',
            quantity: numValue,
            emissions: numValue,
            isExisting: !!dbId,
          }
        ]
      }));

      setEditingScope(null);
      toast({
        title: 'Saved',
        description: `${scope === 'scope1' ? 'Scope 1' : scope === 'scope2' ? 'Scope 2' : scope === 'scope3Upstream' ? 'Scope 3 Upstream' : 'Scope 3 Downstream'} emissions saved.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save LCA data',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Delete all LCA entries from database
      let deleteQuery = supabase
        .from('scope3_lca_entries')
        .delete()
        .eq('user_id', user.id);

      if (companyContext && counterpartyId) {
        deleteQuery = deleteQuery.eq('counterparty_id', counterpartyId);
      } else {
        deleteQuery = deleteQuery.is('counterparty_id', null);
      }

      const { error } = await deleteQuery;
      if (error) throw error;

      // Reset all state
      setLcaData({
        scope1: '',
        scope2: '',
        scope3Upstream: '',
        scope3Downstream: '',
      });
      setLcaDbIds({});

      // Clear emissionData
      setEmissionData(prev => ({
        ...prev,
        scope1: {
          fuel: [],
          refrigerant: [],
          passengerVehicle: [],
          deliveryVehicle: [],
        },
        scope2: [],
        scope3: prev.scope3.filter(r => !r.category?.startsWith('lca_')),
      }));

      toast({
        title: 'Reset Complete',
        description: 'All LCA data has been cleared.',
      });

      setShowResetDialog(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset LCA data',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchToManual = () => {
    setShowSwitchDialog(true);
  };

  const confirmSwitch = () => {
    // Clear all LCA data
    setEmissionData({
      scope1: {
        fuel: [],
        refrigerant: [],
        passengerVehicle: [],
        deliveryVehicle: [],
      },
      scope2: [],
      scope3: [],
    });
    setLcaData({
      scope1: '',
      scope2: '',
      scope3Upstream: '',
      scope3Downstream: '',
    });
    setShowSwitchDialog(false);
    onSwitchToManual();
  };

  // Calculate totals
  const scope1Total = typeof lcaData.scope1 === 'number' ? lcaData.scope1 : 0;
  const scope2Total = typeof lcaData.scope2 === 'number' ? lcaData.scope2 : 0;
  const scope3UpstreamTotal = typeof lcaData.scope3Upstream === 'number' ? lcaData.scope3Upstream : 0;
  const scope3DownstreamTotal = typeof lcaData.scope3Downstream === 'number' ? lcaData.scope3Downstream : 0;
  const scope3Total = scope3UpstreamTotal + scope3DownstreamTotal;
  const totalEmissions = scope1Total + scope2Total + scope3Total;

  const ScopeInputCard = ({ 
    scope, 
    title, 
    description, 
    icon: Icon, 
    value, 
    color 
  }: { 
    scope: string; 
    title: string; 
    description: string; 
    icon: any; 
    value: number | ''; 
    color: string;
  }) => {
    const isEditing = editingScope === scope;
    const displayValue = typeof value === 'number' ? value : 0;

    return (
      <Card className={`border-2 ${isEditing ? 'border-teal-500 shadow-lg' : 'border-gray-200'} transition-all`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </div>
            </div>
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingScope(scope)}
                className="flex items-center gap-2"
              >
                <Edit2 className="h-4 w-4" />
                {displayValue > 0 ? 'Edit' : 'Enter'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor={`${scope}-input`}>Emissions (kg CO₂e)</Label>
                <Input
                  id={`${scope}-input`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={value}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                    setLcaData(prev => ({ ...prev, [scope]: val }));
                  }}
                  placeholder="Enter emissions value"
                  className="mt-1"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const numValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
                    handleSave(scope, numValue);
                  }}
                  className="flex-1 bg-teal-600 hover:bg-teal-700"
                  disabled={saving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingScope(null);
                    // Reset to original value
                    const original = scope === 'scope1' ? scope1Total :
                                    scope === 'scope2' ? scope2Total :
                                    scope === 'scope3Upstream' ? scope3UpstreamTotal :
                                    scope3DownstreamTotal;
                    setLcaData(prev => ({ ...prev, [scope]: original > 0 ? original : '' }));
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-4">
              {displayValue > 0 ? (
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-gray-900">
                    {displayValue.toLocaleString('en-US', { maximumFractionDigits: 2 })} kg CO₂e
                  </span>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
              ) : (
                <p className="text-gray-400 italic">No data entered yet</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Switch Button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">LCA Input Mode</h2>
          <p className="text-gray-600 mt-1">Enter your emissions data directly from your lifecycle assessment studies</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowResetDialog(true)}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            disabled={saving}
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button
            variant="outline"
            onClick={handleSwitchToManual}
            className="flex items-center gap-2"
          >
            Switch to Manual Calculation
          </Button>
        </div>
      </div>

      {/* Input Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        <ScopeInputCard
          scope="scope1"
          title="Scope 1 Emissions"
          description="Direct emissions from owned or controlled sources"
          icon={Factory}
          value={lcaData.scope1}
          color="bg-red-500"
        />
        <ScopeInputCard
          scope="scope2"
          title="Scope 2 Emissions"
          description="Indirect emissions from purchased energy"
          icon={Zap}
          value={lcaData.scope2}
          color="bg-yellow-500"
        />
        <ScopeInputCard
          scope="scope3Upstream"
          title="Scope 3 Upstream"
          description="Indirect emissions from upstream activities"
          icon={Globe}
          value={lcaData.scope3Upstream}
          color="bg-blue-500"
        />
        <ScopeInputCard
          scope="scope3Downstream"
          title="Scope 3 Downstream"
          description="Indirect emissions from downstream activities"
          icon={Globe}
          value={lcaData.scope3Downstream}
          color="bg-purple-500"
        />
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-200">
        <CardHeader>
          <CardTitle className="text-xl">Emission Summary</CardTitle>
          <CardDescription>Total emissions across all scopes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-white rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Scope 1</p>
              <p className="text-2xl font-bold text-red-600">
                {scope1Total.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500">kg CO₂e</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Scope 2</p>
              <p className="text-2xl font-bold text-yellow-600">
                {scope2Total.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500">kg CO₂e</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Scope 3</p>
              <p className="text-2xl font-bold text-blue-600">
                {scope3Total.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500">kg CO₂e</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg border-2 border-teal-500">
              <p className="text-sm text-gray-600 mb-1">Total</p>
              <p className="text-2xl font-bold text-teal-600">
                {totalEmissions.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500">kg CO₂e</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Switch Confirmation Dialog */}
      <AlertDialog open={showSwitchDialog} onOpenChange={setShowSwitchDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch to Manual Calculation?</AlertDialogTitle>
            <AlertDialogDescription>
              Switching to manual calculation will clear all your current LCA data. 
              This action cannot be undone. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSwitch}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Switch and Clear Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset LCA Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all your LCA emissions data. 
              This action cannot be undone. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              className="bg-red-600 hover:bg-red-700"
              disabled={saving}
            >
              {saving ? 'Resetting...' : 'Yes, Reset All Data'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LCAInputForm;


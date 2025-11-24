import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { EmissionData } from "@/components/emissions/shared/types";
import { Edit2, Save, CheckCircle2, Factory, Zap, Globe } from "lucide-react";
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
  onSwitchToManual 
}) => {
  const { toast } = useToast();
  const [editingScope, setEditingScope] = useState<string | null>(null);
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);
  const [lcaData, setLcaData] = useState<LCAData>({
    scope1: '',
    scope2: '',
    scope3Upstream: '',
    scope3Downstream: '',
  });

  // Load existing LCA data from emissionData
  React.useEffect(() => {
    // Check if we have LCA data stored
    const scope1LCA = emissionData.scope3.find(r => r.category === 'lca_scope1');
    const scope2LCA = emissionData.scope3.find(r => r.category === 'lca_scope2');
    const scope3Upstream = emissionData.scope3.find(r => r.category === 'lca_upstream');
    const scope3Downstream = emissionData.scope3.find(r => r.category === 'lca_downstream');

    setLcaData({
      scope1: scope1LCA?.emissions || '',
      scope2: scope2LCA?.emissions || '',
      scope3Upstream: scope3Upstream?.emissions || '',
      scope3Downstream: scope3Downstream?.emissions || '',
    });
  }, [emissionData]);

  const handleSave = (scope: string, value: number) => {
    const numValue = value || 0;
    
    // Update local state immediately for UI feedback
    setLcaData(prev => ({ ...prev, [scope]: numValue }));
    
    if (scope === 'scope1') {
      // Store LCA scope1 data in scope3 array with special category
      setEmissionData(prev => ({
        ...prev,
        scope1: {
          fuel: [],
          refrigerant: [],
          passengerVehicle: [],
          deliveryVehicle: [],
        },
        scope3: [
          ...prev.scope3.filter(r => r.category !== 'lca_scope1'),
          {
            id: 'lca-scope1',
            category: 'lca_scope1',
            activity: 'LCA: Scope 1 Emissions',
            unit: 'kg CO2e',
            quantity: numValue,
            emissions: numValue,
          }
        ]
      }));
    } else if (scope === 'scope2') {
      // Store LCA scope2 data in scope3 array with special category
      setEmissionData(prev => ({
        ...prev,
        scope2: [],
        scope3: [
          ...prev.scope3.filter(r => r.category !== 'lca_scope2'),
          {
            id: 'lca-scope2',
            category: 'lca_scope2',
            activity: 'LCA: Scope 2 Emissions',
            unit: 'kg CO2e',
            quantity: numValue,
            emissions: numValue,
          }
        ]
      }));
    } else if (scope === 'scope3Upstream') {
      setEmissionData(prev => ({
        ...prev,
        scope3: [
          ...prev.scope3.filter(r => r.category !== 'lca_upstream' && r.category !== 'lca_total'),
          {
            id: 'lca-scope3-upstream',
            category: 'lca_upstream',
            activity: 'LCA: Scope 3 Upstream Emissions',
            unit: 'kg CO2e',
            quantity: numValue,
            emissions: numValue,
          }
        ]
      }));
    } else if (scope === 'scope3Downstream') {
      setEmissionData(prev => ({
        ...prev,
        scope3: [
          ...prev.scope3.filter(r => r.category !== 'lca_downstream' && r.category !== 'lca_total'),
          {
            id: 'lca-scope3-downstream',
            category: 'lca_downstream',
            activity: 'LCA: Scope 3 Downstream Emissions',
            unit: 'kg CO2e',
            quantity: numValue,
            emissions: numValue,
          }
        ]
      }));
    }

    setEditingScope(null);
    toast({
      title: 'Saved',
      description: `${scope === 'scope1' ? 'Scope 1' : scope === 'scope2' ? 'Scope 2' : scope === 'scope3Upstream' ? 'Scope 3 Upstream' : 'Scope 3 Downstream'} emissions saved.`,
    });
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
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
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
        <Button
          variant="outline"
          onClick={handleSwitchToManual}
          className="flex items-center gap-2"
        >
          Switch to Manual Calculation
        </Button>
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
    </div>
  );
};

export default LCAInputForm;


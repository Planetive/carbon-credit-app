import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { EmissionData } from "@/components/emissions/shared/types";
import { CheckCircle2, ArrowRight, ArrowLeft, Edit2, Factory, Zap, XCircle, ArrowUpDown, TrendingUp, Calculator, RotateCcw } from "lucide-react";
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

interface LCAQuestionnaireProps {
  emissionData: EmissionData;
  setEmissionData: React.Dispatch<React.SetStateAction<EmissionData>>;
  onComplete: () => void;
  showInitialQuestion?: boolean;
  onInitialAnswer?: (hasLCA: boolean) => void;
  onSwitchToManual?: () => void;
  showHeader?: boolean;
  companyContext?: boolean;
  counterpartyId?: string;
}

const LCAQuestionnaire: React.FC<LCAQuestionnaireProps> = ({
  emissionData,
  setEmissionData,
  onComplete,
  showInitialQuestion = false,
  onInitialAnswer,
  onSwitchToManual,
  showHeader = true,
  companyContext = false,
  counterpartyId,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  // If showing initial question, start at -1, otherwise start at 0
  const [currentStep, setCurrentStep] = useState(showInitialQuestion ? -1 : 0);
  const [scope1Emissions, setScope1Emissions] = useState<number | ''>('');
  const [scope2Emissions, setScope2Emissions] = useState<number | ''>('');
  const [scope3Upstream, setScope3Upstream] = useState<number | ''>('');
  const [scope3Downstream, setScope3Downstream] = useState<number | ''>('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [editingScope, setEditingScope] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  
  // Track database IDs for each scope
  const [lcaDbIds, setLcaDbIds] = useState<{
    scope1?: string;
    scope2?: string;
    scope3Upstream?: string;
    scope3Downstream?: string;
  }>({});

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (currentStep >= 0 && !showSummary) {
      setIsMounted(false);
      setTimeout(() => setIsMounted(true), 50);
    }
  }, [currentStep, showSummary]);

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
          
          lcaData.forEach(entry => {
            const scopeType = entry.scope_type;
            if (scopeType === 'scope1') {
              setScope1Emissions(entry.emissions);
              dbIds.scope1 = entry.id;
            } else if (scopeType === 'scope2') {
              setScope2Emissions(entry.emissions);
              dbIds.scope2 = entry.id;
            } else if (scopeType === 'scope3_upstream') {
              setScope3Upstream(entry.emissions);
              dbIds.scope3Upstream = entry.id;
            } else if (scopeType === 'scope3_downstream') {
              setScope3Downstream(entry.emissions);
              dbIds.scope3Downstream = entry.id;
            }
          });

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

  const handleInitialAnswer = (answer: boolean) => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsAnimating(false);
      if (answer) {
        // User said yes, call the callback to set LCA mode
        if (onInitialAnswer) {
          onInitialAnswer(true);
        }
        setCurrentStep(0); // Move to first data entry step
      } else {
        // User said no, call the callback to switch to manual mode
        if (onInitialAnswer) {
          onInitialAnswer(false);
        }
      }
    }, 400);
  };

  const steps = [
    {
      id: 'scope1',
      question: 'Enter Scope 1 Emissions',
      description: 'Please enter your Scope 1 emissions (direct emissions from owned or controlled sources) in kg CO2e',
      value: scope1Emissions,
      setValue: setScope1Emissions,
      color: 'from-red-500 to-red-600',
      icon: Factory,
    },
    {
      id: 'scope2',
      question: 'Enter Scope 2 Emissions',
      description: 'Please enter your Scope 2 emissions (indirect emissions from purchased energy) in kg CO2e',
      value: scope2Emissions,
      setValue: setScope2Emissions,
      color: 'from-yellow-500 to-yellow-600',
      icon: Zap,
    },
    {
      id: 'scope3Upstream',
      question: 'Enter Scope 3 Upstream Emissions',
      description: 'Please enter your Scope 3 upstream emissions (indirect emissions from upstream activities) in kg CO2e',
      value: scope3Upstream,
      setValue: setScope3Upstream,
      color: 'from-blue-500 to-blue-600',
      icon: ArrowUpDown,
    },
    {
      id: 'scope3Downstream',
      question: 'Enter Scope 3 Downstream Emissions',
      description: 'Please enter your Scope 3 downstream emissions (indirect emissions from downstream activities) in kg CO2e',
      value: scope3Downstream,
      setValue: setScope3Downstream,
      color: 'from-purple-500 to-purple-600',
      icon: TrendingUp,
    },
  ];

  const handleStepSubmit = async (stepIndex: number) => {
    const step = steps[stepIndex];
    const value = parseFloat(String(step.value)) || 0;
    
    if (value < 0) {
      toast({
        title: 'Invalid input',
        description: 'Please enter a valid non-negative number.',
        variant: 'destructive',
      });
      return;
    }

    setIsAnimating(true);
    setTimeout(async () => {
      setIsAnimating(false);
      if (stepIndex < steps.length - 1) {
        setCurrentStep(stepIndex + 1);
      } else {
        // Save all data and show summary
        await saveAllData();
        setShowSummary(true);
      }
    }, 400);
  };

  const saveAllData = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please log in to save.", variant: "destructive" });
      return;
    }

    const scope1 = parseFloat(String(scope1Emissions)) || 0;
    const scope2 = parseFloat(String(scope2Emissions)) || 0;
    const upstream = parseFloat(String(scope3Upstream)) || 0;
    const downstream = parseFloat(String(scope3Downstream)) || 0;

    setSaving(true);
    try {
      const entries = [
        { scope_type: 'scope1', emissions: scope1, dbId: lcaDbIds.scope1 },
        { scope_type: 'scope2', emissions: scope2, dbId: lcaDbIds.scope2 },
        { scope_type: 'scope3_upstream', emissions: upstream, dbId: lcaDbIds.scope3Upstream },
        { scope_type: 'scope3_downstream', emissions: downstream, dbId: lcaDbIds.scope3Downstream },
      ];

      const newEntries = entries.filter(e => !e.dbId && e.emissions > 0);
      const existingEntries = entries.filter(e => e.dbId && e.emissions > 0);

      // Insert new entries
      if (newEntries.length > 0) {
        const payload = newEntries.map(e => ({
          user_id: user.id,
          counterparty_id: companyContext ? counterpartyId : null,
          scope_type: e.scope_type,
          emissions: e.emissions,
          unit: 'kg CO2e',
          calculation_mode: 'direct_lca',
        }));

        const { data: insertedData, error: insertError } = await supabase
          .from('scope3_lca_entries')
          .insert(payload)
          .select('id, scope_type');

        if (insertError) throw insertError;

        // Update dbIds with newly inserted IDs
        if (insertedData) {
          const newDbIds = { ...lcaDbIds };
          insertedData.forEach(entry => {
            if (entry.scope_type === 'scope1') newDbIds.scope1 = entry.id;
            else if (entry.scope_type === 'scope2') newDbIds.scope2 = entry.id;
            else if (entry.scope_type === 'scope3_upstream') newDbIds.scope3Upstream = entry.id;
            else if (entry.scope_type === 'scope3_downstream') newDbIds.scope3Downstream = entry.id;
          });
          setLcaDbIds(newDbIds);
        }
      }

      // Update existing entries
      if (existingEntries.length > 0) {
        const updates = existingEntries.map(e => 
          supabase
            .from('scope3_lca_entries')
            .update({ emissions: e.emissions })
            .eq('id', e.dbId!)
        );
        const results = await Promise.all(updates);
        const updateError = results.find(r => r.error)?.error;
        if (updateError) throw updateError;
      }

      // Update emissionData
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
          ...entries.map(e => ({
            id: e.dbId || crypto.randomUUID(),
            dbId: e.dbId,
            category: `lca_${e.scope_type.replace('scope3_', '')}` as any,
            activity: `LCA: ${e.scope_type === 'scope1' ? 'Scope 1' : e.scope_type === 'scope2' ? 'Scope 2' : e.scope_type === 'scope3_upstream' ? 'Scope 3 Upstream' : 'Scope 3 Downstream'} Emissions`,
          unit: 'kg CO2e',
            quantity: e.emissions,
            emissions: e.emissions,
            isExisting: !!e.dbId,
          }))
      ]
    }));

    toast({
      title: 'LCA Data Saved',
      description: 'All emissions data has been saved successfully.',
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
      setScope1Emissions('');
      setScope2Emissions('');
      setScope3Upstream('');
      setScope3Downstream('');
      setLcaDbIds({});
      setShowSummary(false);
      setCurrentStep(-1); // Always go back to initial question
      setEditingScope(null);

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
        description: 'All LCA data has been cleared. You can start over.',
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

  const handleEdit = (scopeId: string) => {
    setEditingScope(scopeId);
    setShowSummary(false);
    const stepIndex = steps.findIndex(s => s.id === scopeId);
    if (stepIndex >= 0) {
      setCurrentStep(stepIndex);
      setIsMounted(false);
      setTimeout(() => setIsMounted(true), 50);
    }
  };

  // Show summary cards
  if (showSummary && !editingScope) {
    const totalEmissions = (parseFloat(String(scope1Emissions)) || 0) +
                          (parseFloat(String(scope2Emissions)) || 0) +
                          (parseFloat(String(scope3Upstream)) || 0) +
                          (parseFloat(String(scope3Downstream)) || 0);

    return (
      <div className="space-y-8">
        {/* Toggle Switch Button in Summary */}
        {onSwitchToManual && (
          <div className="flex justify-end items-center gap-3 mb-4">
            <span className="text-sm font-medium text-gray-600">LCA Mode</span>
            <div className="flex items-center gap-2">
              <Switch
                checked={false}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onSwitchToManual();
                  }
                }}
                className="data-[state=checked]:bg-teal-600"
              />
              <span className="text-sm font-medium text-gray-600">Manual Mode</span>
            </div>
          </div>
        )}
        
        {/* Success Header with Animation */}
        <div className="text-center space-y-6 py-8 animate-in fade-in slide-in-from-bottom duration-700">
          <div className="flex justify-center mb-4">
            <div className="relative">
              {/* Animated background rings */}
              <div className="absolute inset-0 w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full opacity-20 animate-ping"></div>
              <div className="absolute inset-0 w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full opacity-30 animate-pulse"></div>
              {/* Main icon */}
              <div className="relative w-24 h-24 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-2xl transform transition-all duration-500 hover:scale-110 hover:rotate-12 animate-in fade-in duration-500" style={{ animationDelay: '0.2s' }}>
                <CheckCircle2 className="h-12 w-12 text-white" />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent animate-in fade-in duration-700" style={{ animationDelay: '0.3s' }}>
              LCA Data Saved Successfully
            </h3>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto animate-in fade-in duration-700" style={{ animationDelay: '0.4s' }}>
              Your emissions data has been saved. Review and edit the values below.
            </p>
          </div>
        </div>

        {/* Scope Cards with Staggered Animation - 2 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const value = parseFloat(String(step.value)) || 0;
            const percentage = totalEmissions > 0 ? (value / totalEmissions) * 100 : 0;
            
            return (
              <div
                key={step.id}
                className="animate-in fade-in slide-in-from-bottom duration-500"
                style={{ animationDelay: `${0.5 + index * 0.1}s` }}
              >
                <Card className="group relative overflow-hidden bg-white/90 backdrop-blur-sm border-2 border-gray-200/50 hover:border-teal-300/70 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 h-full">
                  {/* Progress bar at top */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gray-100 overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${step.color} transition-all duration-1000 ease-out`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>

                  <CardHeader className="pb-3 pt-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`relative w-12 h-12 bg-gradient-to-br ${step.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(step.id)}
                        className="flex items-center gap-1 text-gray-600 hover:text-teal-600 hover:bg-teal-50 transition-all duration-300 rounded-lg p-2"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-gray-900 group-hover:text-teal-700 transition-colors mb-1">
                        {step.question.replace('Enter ', '')}
                      </CardTitle>
                      <CardDescription className="text-xs font-medium text-gray-500">
                        {percentage.toFixed(1)}% of total
                      </CardDescription>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0 pb-4">
                    <div>
                      <div className="text-3xl font-extrabold bg-gradient-to-br from-gray-900 to-gray-700 bg-clip-text text-transparent mb-1">
                        {value.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                      </div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">kg CO₂e</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Total Emissions - Compact Design */}
        <div 
          className="animate-in fade-in slide-in-from-bottom duration-700"
          style={{ animationDelay: '0.9s' }}
        >
          <Card className="relative overflow-hidden bg-gradient-to-r from-gray-50 to-teal-50/30 border-2 border-teal-200/50 shadow-lg hover:shadow-xl transition-all duration-500">
            <div className="flex items-center justify-between p-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></div>
                  <CardTitle className="text-lg font-semibold text-gray-700">
                    Total Emissions
                  </CardTitle>
                </div>
                <CardDescription className="text-sm text-gray-600 ml-5">
                  Sum of all scope emissions
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-3xl md:text-4xl font-extrabold bg-gradient-to-br from-teal-700 to-emerald-700 bg-clip-text text-transparent mb-1">
                  {totalEmissions.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs font-medium text-teal-600 uppercase tracking-wide">kg CO₂e</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Action Buttons */}
        <div 
          className="flex flex-col sm:flex-row justify-center gap-4 pt-4 animate-in fade-in duration-700"
          style={{ animationDelay: '1s' }}
        >
          <Button
            onClick={() => setShowResetDialog(true)}
            variant="outline"
            className="px-8 py-6 text-lg font-semibold rounded-xl border-2 border-red-300 hover:border-red-400 text-red-600 hover:text-red-700 hover:bg-red-50 shadow-lg hover:shadow-xl transform transition-all duration-300 hover:scale-105"
            disabled={saving}
          >
            <div className="flex items-center gap-3">
              <RotateCcw className="h-5 w-5" />
              <span>Reset & Start Over</span>
            </div>
          </Button>
          <Button
            onClick={() => {
              navigate('/dashboard');
            }}
            className="px-8 py-6 text-lg font-semibold rounded-xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-600 hover:from-teal-700 hover:via-emerald-700 hover:to-teal-700 text-white shadow-xl hover:shadow-2xl transform transition-all duration-300 hover:scale-105 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            <div className="relative flex items-center gap-3">
              <span>Continue to Dashboard</span>
              <ArrowRight className="h-5 w-5" />
            </div>
          </Button>
        </div>

        {/* Reset Confirmation Dialog */}
        <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset LCA Data?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all your LCA emissions data and reset the questionnaire. 
                You will need to start from the beginning. This action cannot be undone.
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
  }

  // Show initial question (step -1)
  if (currentStep === -1) {
    return (
      <div className={`space-y-6 transition-all duration-500 ${isAnimating ? 'opacity-0 scale-95 translate-x-4' : isMounted ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-95 -translate-x-4'}`}>
        <div className="text-center space-y-4 py-8">
          {/* Progress Bar */}
          <div className="max-w-2xl mx-auto mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-teal-600">Step 1 of 5</span>
              <span className="text-xs font-medium text-gray-500">20%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-teal-500 to-cyan-500 h-2 rounded-full transition-all duration-500" style={{ width: '20%' }}></div>
            </div>
          </div>
          
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg transform transition-all duration-300 hover:scale-110">
              <span className="text-3xl font-bold text-white">?</span>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            Do you have lifecycle assessment (LCA) data?
          </h3>
          <p className="text-gray-600 max-w-2xl mx-auto">
            If you have completed LCA studies for all scopes, you can enter your Scope 1, 2, and 3 (Upstream & Downstream) emissions directly. Otherwise, you can calculate emissions manually using our detailed forms.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="flex gap-4 justify-center mt-8">
            <Button
              onClick={() => handleInitialAnswer(true)}
              className="group relative overflow-hidden bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5" />
                <span>Yes</span>
              </div>
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
            </Button>

            <Button
              onClick={() => handleInitialAnswer(false)}
              variant="outline"
              className="group relative overflow-hidden border-2 border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 px-8 py-6 text-lg font-semibold rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
            >
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5" />
                <span>No</span>
              </div>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show questionnaire steps
  const currentStepData = steps[currentStep];
  const stepNumber = currentStep + 2; // +2 because step 0 is actually step 2 (after initial question)
  const totalSteps = steps.length + 1; // +1 for initial question
  const progress = (stepNumber / totalSteps) * 100;
  const Icon = currentStepData.icon;
  const isEditing = editingScope === currentStepData.id;

  return (
    <div className={`space-y-6 transition-all duration-500 ${isAnimating ? 'opacity-0 scale-95 translate-x-4' : isMounted ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-95 -translate-x-4'}`}>
      {/* Toggle Switch Button during steps */}
      {onSwitchToManual && (
        <div className="flex justify-end items-center gap-3 mb-4">
          <span className="text-sm font-medium text-gray-600">LCA Mode</span>
          <div className="flex items-center gap-2">
            <Switch
              checked={false}
              onCheckedChange={(checked) => {
                if (checked) {
                  onSwitchToManual();
                }
              }}
              className="data-[state=checked]:bg-teal-600"
            />
            <span className="text-sm font-medium text-gray-600">Manual Mode</span>
          </div>
        </div>
      )}
      
      <div className="text-center space-y-4 py-8">
        {/* Progress Bar */}
        <div className="max-w-2xl mx-auto mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-medium ${currentStep === 0 ? 'text-red-600' : currentStep === 1 ? 'text-yellow-600' : currentStep === 2 ? 'text-blue-600' : 'text-purple-600'}`}>
              {isEditing ? 'Editing' : `Step ${stepNumber} of ${totalSteps}`}
            </span>
            <span className="text-xs font-medium text-gray-500">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className={`bg-gradient-to-r ${currentStepData.color} h-2 rounded-full transition-all duration-500`} style={{ width: `${progress}%` }}></div>
          </div>
        </div>
        
        <div className="flex justify-center mb-6">
          <div className={`w-20 h-20 bg-gradient-to-br ${currentStepData.color} rounded-full flex items-center justify-center shadow-lg transform transition-all duration-300 hover:scale-110`}>
            <Icon className="h-10 w-10 text-white" />
          </div>
        </div>
        <h3 className="text-2xl font-bold text-gray-900">
          {isEditing ? `Edit ${currentStepData.question.replace('Enter ', '')}` : currentStepData.question}
        </h3>
        <p className="text-gray-600 max-w-2xl mx-auto">
          {currentStepData.description}
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6 mt-8">
        <div className="space-y-2">
          <Label htmlFor={`${currentStepData.id}-emissions`} className="text-base font-semibold">
            Emissions (kg CO₂e)
          </Label>
          <Input
            id={`${currentStepData.id}-emissions`}
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={currentStepData.value}
            onChange={(e) => currentStepData.setValue(e.target.value === '' ? '' : parseFloat(e.target.value))}
            className="text-lg py-6 border-2 focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
            autoFocus
          />
          <p className="text-sm text-gray-500">
            Enter the total emissions value from your LCA data
          </p>
        </div>

        <div className="flex gap-4">
          <Button
            onClick={() => {
              if (isEditing) {
                setEditingScope(null);
                setShowSummary(true);
              } else if (currentStep > 0) {
                setIsAnimating(true);
                setTimeout(() => {
                  setIsAnimating(false);
                  setCurrentStep(currentStep - 1);
                }, 400);
              }
            }}
            variant="outline"
            className="flex-1 border-2 border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 px-8 py-6 text-lg font-semibold rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
          >
            <div className="flex items-center justify-center gap-3">
              <ArrowLeft className="h-5 w-5" />
              <span>{isEditing ? 'Cancel' : 'Back'}</span>
            </div>
          </Button>
          <Button
            onClick={async () => {
              if (isEditing) {
                // Save and return to summary
                await saveAllData();
                setEditingScope(null);
                setShowSummary(true);
                toast({
                  title: 'Updated',
                  description: `${currentStepData.question.replace('Enter ', '')} has been updated.`,
                });
              } else {
                handleStepSubmit(currentStep);
              }
            }}
            disabled={saving || currentStepData.value === '' || parseFloat(String(currentStepData.value)) < 0}
            className={`flex-1 bg-gradient-to-r ${currentStepData.color} hover:opacity-90 text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
          >
            <div className="flex items-center justify-center gap-3">
              <span>{isEditing ? 'Save Changes' : currentStep === totalSteps - 1 ? 'Complete & Save' : 'Continue'}</span>
              {isEditing || currentStep === totalSteps - 1 ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <ArrowRight className="h-5 w-5" />
              )}
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LCAQuestionnaire;


import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { EmissionData } from "@/components/emissions/shared/types";
import { CheckCircle2, ArrowRight, ArrowLeft, Edit2, Factory, Zap, XCircle, ArrowUpDown, TrendingUp, Calculator } from "lucide-react";

interface LCAQuestionnaireProps {
  emissionData: EmissionData;
  setEmissionData: React.Dispatch<React.SetStateAction<EmissionData>>;
  onComplete: () => void;
  showInitialQuestion?: boolean;
  onInitialAnswer?: (hasLCA: boolean) => void;
  onSwitchToManual?: () => void;
  showHeader?: boolean;
}

const LCAQuestionnaire: React.FC<LCAQuestionnaireProps> = ({
  emissionData,
  setEmissionData,
  onComplete,
  showInitialQuestion = false,
  onInitialAnswer,
  onSwitchToManual,
  showHeader = true,
}) => {
  const { toast } = useToast();
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

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (currentStep >= 0 && !showSummary) {
      setIsMounted(false);
      setTimeout(() => setIsMounted(true), 50);
    }
  }, [currentStep, showSummary]);

  // Load existing data if available
  useEffect(() => {
    const scope1LCA = emissionData.scope3.find(r => r.category === 'lca_scope1');
    const scope2LCA = emissionData.scope3.find(r => r.category === 'lca_scope2');
    const scope3UpstreamLCA = emissionData.scope3.find(r => r.category === 'lca_upstream');
    const scope3DownstreamLCA = emissionData.scope3.find(r => r.category === 'lca_downstream');

    if (scope1LCA) setScope1Emissions(scope1LCA.emissions || '');
    if (scope2LCA) setScope2Emissions(scope2LCA.emissions || '');
    if (scope3UpstreamLCA) setScope3Upstream(scope3UpstreamLCA.emissions || '');
    if (scope3DownstreamLCA) setScope3Downstream(scope3DownstreamLCA.emissions || '');
  }, []);

  const handleInitialAnswer = (answer: boolean) => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsAnimating(false);
      if (answer) {
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

  const handleStepSubmit = (stepIndex: number) => {
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
    setTimeout(() => {
      setIsAnimating(false);
      if (stepIndex < steps.length - 1) {
        setCurrentStep(stepIndex + 1);
      } else {
        // Save all data and show summary
        saveAllData();
        setShowSummary(true);
      }
    }, 400);
  };

  const saveAllData = () => {
    const scope1 = parseFloat(String(scope1Emissions)) || 0;
    const scope2 = parseFloat(String(scope2Emissions)) || 0;
    const upstream = parseFloat(String(scope3Upstream)) || 0;
    const downstream = parseFloat(String(scope3Downstream)) || 0;

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
        {
          id: 'lca-scope1',
          category: 'lca_scope1',
          activity: 'LCA: Scope 1 Emissions',
          unit: 'kg CO2e',
          quantity: scope1,
          emissions: scope1,
        },
        {
          id: 'lca-scope2',
          category: 'lca_scope2',
          activity: 'LCA: Scope 2 Emissions',
          unit: 'kg CO2e',
          quantity: scope2,
          emissions: scope2,
        },
        {
          id: 'lca-scope3-upstream',
          category: 'lca_upstream',
          activity: 'LCA: Scope 3 Upstream Emissions',
          unit: 'kg CO2e',
          quantity: upstream,
          emissions: upstream,
        },
        {
          id: 'lca-scope3-downstream',
          category: 'lca_downstream',
          activity: 'LCA: Scope 3 Downstream Emissions',
          unit: 'kg CO2e',
          quantity: downstream,
          emissions: downstream,
        }
      ]
    }));

    toast({
      title: 'LCA Data Saved',
      description: 'All emissions data has been saved successfully.',
    });
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

        {/* Action Button */}
        <div 
          className="flex justify-center pt-4 animate-in fade-in duration-700"
          style={{ animationDelay: '1s' }}
        >
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
            onClick={() => {
              if (isEditing) {
                // Save and return to summary
                saveAllData();
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
            disabled={currentStepData.value === '' || parseFloat(String(currentStepData.value)) < 0}
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


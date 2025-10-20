import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight, Plus, Trash2, Building2, Users, CheckCircle, TrendingUp, BarChart3, Building, ArrowLeft } from 'lucide-react';
import { FinanceEmissionCalculator } from './FinanceEmissionCalculator';
import { FormattedNumberInput } from '../components/FormattedNumberInput';
import { PortfolioClient } from '@/integrations/supabase/portfolioClient';
import { useToast } from '@/hooks/use-toast';

interface WizardStep {
  id: string;
  title: string;
  description: string;
}

export const ESGWizard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const mode: 'finance' | 'facilitated' = (location.state as any)?.mode || 'finance';
  const counterpartyId: string | undefined = (location.state as any)?.counterpartyId || (location.state as any)?.counterparty || (location.state as any)?.id;
  
  // Debug logging to see what we're receiving
  useEffect(() => {
    console.log('ESGWizard - location.state:', location.state);
    console.log('ESGWizard - counterpartyId:', counterpartyId);
  }, [location.state, counterpartyId]);

  // Shared answers cache (frontend-only for now)
  type SharedAnswers = {
    corporateStructure?: string;
    hasEmissions?: string;
    scope1Emissions?: number;
    scope2Emissions?: number;
    scope3Emissions?: number;
    verificationStatus?: string;
  };

  const sharedKey = counterpartyId ? `esgSharedAnswers:${counterpartyId}` : undefined;
  const loadSharedAnswers = (): SharedAnswers | null => {
    if (!sharedKey) return null;
    try {
      const raw = localStorage.getItem(sharedKey);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };
  const saveSharedAnswers = (data: SharedAnswers) => {
    if (!sharedKey) return;
    try { localStorage.setItem(sharedKey, JSON.stringify(data)); } catch {}
  };

  const sharedPrefill = loadSharedAnswers();

  // Build steps dynamically: remove 'loan-type' for facilitated mode
  // Always show all steps - no skipping logic
  const baseStepsFinance: WizardStep[] = [
    { id: 'corporate-structure', title: 'Corporate Structure', description: 'Is the company listed or unlisted?' },
    { id: 'loan-type', title: 'Loan Type', description: 'Select your loan classification' },
    { id: 'emission-status', title: 'Emission Status', description: 'Do you have emissions calculated?' },
    { id: 'verification', title: 'Verification', description: 'Verification details' },
    { id: 'emission-calculation', title: 'Finance Emission', description: 'Calculate your finance emissions' },
    { id: 'results', title: 'Results', description: 'Per-loan emission results' }
  ];
  const baseStepsFacilitated: WizardStep[] = [
    { id: 'corporate-structure', title: 'Corporate Structure', description: 'Is the company listed or unlisted?' },
    { id: 'emission-status', title: 'Emission Status', description: 'Do you have emissions calculated?' },
    { id: 'verification', title: 'Verification', description: 'Verification details' },
    { id: 'emission-calculation', title: 'Facilitated Emission', description: 'Calculate your facilitated emissions' },
    { id: 'results', title: 'Results', description: 'Per-loan emission results' }
  ];

  const steps: WizardStep[] = mode === 'finance' ? baseStepsFinance : baseStepsFacilitated;
  
  const [currentStep, setCurrentStep] = useState(0);

  // Safety check: ensure currentStep is within bounds
  useEffect(() => {
    if (currentStep >= steps.length && steps.length > 0) {
      setCurrentStep(0);
    }
  }, [steps.length, currentStep]);
  const [formData, setFormData] = useState({
    corporateStructure: '', // 'listed' or 'unlisted'
    loanTypes: [], // Array of loan type objects with quantity
    hasEmissions: '',
    verificationStatus: '',
    calculationMethod: '',
    score: 0,
    // Emission scopes (tCO2e)
    scope1Emissions: 0,
    scope2Emissions: 0,
    scope3Emissions: 0,
    // Verification details
    verifierName: ''
  });

  const [results, setResults] = useState<Array<{ type: string; label: string; attributionFactor: number; financedEmissions: number; denominatorLabel: string; denominatorValue: number }>>([]);

  // Track per-loan-type quantity inputs before adding
  const [pendingQuantities, setPendingQuantities] = useState<Record<string, number>>({});

  // Helper function to sanitize numeric values for database storage
  const sanitizeNumericValue = (value: number | null): number | null => {
    if (value === null || value === undefined) return null;
    if (!isFinite(value)) return null; // Convert Infinity/NaN to null
    return value;
  };

  // Save questionnaire data to database
  const saveQuestionnaireData = async () => {
    if (!counterpartyId) {
      console.warn('No counterparty ID available for saving questionnaire data');
      return;
    }

    // Validate that counterpartyId is a UUID (not a string code)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(counterpartyId)) {
      console.error('Invalid counterparty ID format (not a UUID):', counterpartyId);
      toast({
        title: "Invalid Company ID",
        description: "The company ID format is invalid. Please try again.",
        variant: "destructive"
      });
      return;
    }

    // Convert form data to match database schema
    const questionnaireData = {
      counterparty_id: counterpartyId,
      corporate_structure: formData.corporateStructure || 'unlisted',
      has_emissions: formData.hasEmissions === 'yes',
      scope1_emissions: formData.scope1Emissions || null,
      scope2_emissions: formData.scope2Emissions || null,
      scope3_emissions: formData.scope3Emissions || null,
      verification_status: formData.verificationStatus || 'unverified',
      verifier_name: formData.verifierName || null,
      // These fields are not captured in the current questionnaire but are required by the schema
      evic: null,
      total_equity_plus_debt: null,
      share_price: null,
      outstanding_shares: null,
      total_debt: null,
      minority_interest: null,
      preferred_stock: null,
      total_equity: null
    };

    try {
      await PortfolioClient.upsertCounterpartyQuestionnaire(questionnaireData);

      toast({
        title: "Questionnaire Data Saved",
        description: "Successfully saved questionnaire responses to the database.",
        variant: "default"
      });
    } catch (error) {
      console.error('Error saving questionnaire data:', error);
      console.error('Questionnaire data being saved:', questionnaireData);
      console.error('Counterparty ID being used:', counterpartyId);
      toast({
        title: "Save Error",
        description: `Failed to save questionnaire data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  // Save emission calculations to database
  const saveEmissionCalculations = async (calculationResults: Array<{ type: string; label: string; attributionFactor: number; financedEmissions: number; denominatorLabel: string; denominatorValue: number }>) => {
    if (!counterpartyId) {
      console.warn('No counterparty ID available for saving emission calculations');
      return;
    }

    // Validate that counterpartyId is a UUID (not a string code)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(counterpartyId)) {
      console.error('Invalid counterparty ID format (not a UUID):', counterpartyId);
      toast({
        title: "Invalid Company ID",
        description: "The company ID format is invalid. Please try again.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Save questionnaire data first if we haven't already
      await saveQuestionnaireData();

      // Save each calculation result as a separate emission calculation record
      for (const result of calculationResults) {
        await PortfolioClient.upsertEmissionCalculation({
          counterparty_id: counterpartyId,
          exposure_id: null, // We don't have specific exposure IDs in this flow
          questionnaire_id: null, // We'll link this later when we save questionnaire data
          calculation_type: mode, // 'finance' or 'facilitated'
          company_type: formData.corporateStructure || 'unlisted',
          formula_id: result.type, // Use the loan type as formula ID
          inputs: {
            // Store the form data that was used for calculation
            corporateStructure: formData.corporateStructure,
            hasEmissions: formData.hasEmissions,
            verificationStatus: formData.verificationStatus,
            scope1Emissions: formData.scope1Emissions,
            scope2Emissions: formData.scope2Emissions,
            scope3Emissions: formData.scope3Emissions,
            verifierName: formData.verifierName
          },
          results: {
            // Store the calculation results
            attributionFactor: sanitizeNumericValue(result.attributionFactor),
            financedEmissions: sanitizeNumericValue(result.financedEmissions),
            denominatorLabel: result.denominatorLabel,
            denominatorValue: sanitizeNumericValue(result.denominatorValue),
            loanType: result.type,
            loanLabel: result.label
          },
          financed_emissions: sanitizeNumericValue(result.financedEmissions),
          attribution_factor: sanitizeNumericValue(result.attributionFactor),
          evic: sanitizeNumericValue(result.denominatorValue), // This could be EVIC or total equity + debt
          total_equity_plus_debt: sanitizeNumericValue(result.denominatorValue), // This could be EVIC or total equity + debt
          status: 'completed'
        });
      }

      toast({
        title: "Emission Calculations Saved",
        description: `Successfully saved ${calculationResults.length} ${mode} emission calculation(s) to the database.`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error saving emission calculations:', error);
      console.error('Counterparty ID being used for emission calculations:', counterpartyId);
      console.error('Calculation results being saved:', calculationResults);
      toast({
        title: "Save Error",
        description: `Failed to save emission calculations: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  // Load questionnaire data from database when user returns
  const loadQuestionnaireFromDatabase = async () => {
    if (!counterpartyId) return;
    
    try {
      const { PortfolioClient } = await import('@/integrations/supabase/portfolioClient');
      const questionnaire = await PortfolioClient.getQuestionnaire(counterpartyId);
      
      if (questionnaire) {
        console.log('Loaded questionnaire from database:', questionnaire);
        
        // Update form data with database values
        setFormData(prev => ({
          ...prev,
          corporateStructure: questionnaire.corporate_structure || prev.corporateStructure,
          hasEmissions: questionnaire.has_emissions ? 'yes' : 'no',
          scope1Emissions: questionnaire.scope1_emissions || 0,
          scope2Emissions: questionnaire.scope2_emissions || 0,
          scope3Emissions: questionnaire.scope3_emissions || 0,
          verificationStatus: questionnaire.verification_status || prev.verificationStatus,
          verifierName: questionnaire.verifier_name || prev.verifierName
        }));
        
        // Update shared answers cache
        const sharedData = {
          corporateStructure: questionnaire.corporate_structure,
          hasEmissions: questionnaire.has_emissions ? 'yes' : 'no',
          scope1Emissions: questionnaire.scope1_emissions || 0,
          scope2Emissions: questionnaire.scope2_emissions || 0,
          scope3Emissions: questionnaire.scope3_emissions || 0,
          verificationStatus: questionnaire.verification_status
        };
        saveSharedAnswers(sharedData);
      }
    } catch (error) {
      console.error('Error loading questionnaire from database:', error);
    }
  };

  // Restore saved wizard state when returning from emission calculator
  useEffect(() => {
    const initializeForm = async () => {
      try {
        // First, try to load from database
        await loadQuestionnaireFromDatabase();
        
        // Then, restore from sessionStorage (this will override database values if more recent)
        const saved = sessionStorage.getItem('esgWizardState');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.formData) {
            setFormData(prev => ({ ...prev, ...parsed.formData }));
          }
          // Only auto-resume to calculation if explicitly requested by calculator return flow
          if (parsed?.resumeAtCalculation === true) {
            setCurrentStep(steps.length - 1);
          }
        }
        
        // Finally, prefill shared answers if present and not already populated
        if (sharedPrefill) {
          setFormData(prev => ({
            ...prev,
            corporateStructure: prev.corporateStructure || sharedPrefill.corporateStructure || '',
            hasEmissions: prev.hasEmissions || sharedPrefill.hasEmissions || '',
            scope1Emissions: prev.scope1Emissions || sharedPrefill.scope1Emissions || 0,
            scope2Emissions: prev.scope2Emissions || sharedPrefill.scope2Emissions || 0,
            scope3Emissions: prev.scope3Emissions || sharedPrefill.scope3Emissions || 0,
            verificationStatus: prev.verificationStatus || sharedPrefill.verificationStatus || ''
          }));
        }
      } catch (error) {
        console.error('Error initializing form:', error);
      }
    };
    
    initializeForm();
  }, [counterpartyId]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Persist shared answers when leaving calculation or arriving at results
  const persistSharedIfAvailable = async () => {
    const payload: SharedAnswers = {
      corporateStructure: formData.corporateStructure,
      hasEmissions: formData.hasEmissions,
      scope1Emissions: formData.scope1Emissions,
      scope2Emissions: formData.scope2Emissions,
      scope3Emissions: formData.scope3Emissions,
      verificationStatus: formData.verificationStatus
    };
    saveSharedAnswers(payload);
    
    // Also save to database if we have a counterparty ID
    if (counterpartyId) {
      try {
        await saveQuestionnaireData();
      } catch (error) {
        console.error('Error saving questionnaire data during shared answers persistence:', error);
        // Don't show toast here as it might be called multiple times
      }
    }
  };

  const addLoanType = (loanType: string, quantity: number = 1) => {
    const existingIndex = formData.loanTypes.findIndex(item => item.type === loanType);
    if (existingIndex >= 0) {
      // Update quantity if already exists
      setFormData(prev => ({
        ...prev,
        loanTypes: prev.loanTypes.map((item, index) => 
          index === existingIndex 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      }));
    } else {
      // Add new loan type
      setFormData(prev => ({
        ...prev,
        loanTypes: [...prev.loanTypes, { type: loanType, quantity }]
      }));
    }
  };

  const removeLoanType = (loanType: string) => {
    setFormData(prev => ({
      ...prev,
      loanTypes: prev.loanTypes.filter(item => item.type !== loanType)
    }));
  };

  const updateLoanTypeQuantity = (loanType: string, quantity: number) => {
    if (quantity <= 0) {
      removeLoanType(loanType);
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      loanTypes: prev.loanTypes.map(item => 
        item.type === loanType 
          ? { ...item, quantity }
          : item
      )
    }));
  };

  // Remove tab handling since we only show one form based on mode

  const renderStepContent = () => {
    if (!steps[currentStep]) {
      return <div className="text-center text-muted-foreground py-8">Loading step content...</div>;
    }
    
    switch (steps[currentStep].id) {
      case 'corporate-structure':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="corporate-structure">Corporate Structure</Label>
              {formData.corporateStructure && (
                <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Current Selection:</strong> {formData.corporateStructure === 'listed' ? 'Listed Company' : 'Unlisted Company'}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">You can change this selection below if needed.</p>
                </div>
              )}
              <Select value={formData.corporateStructure} onValueChange={(value) => updateFormData('corporateStructure', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select corporate structure" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="listed">Listed Company</SelectItem>
                  <SelectItem value="unlisted">Unlisted Company</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              <p><strong>Listed:</strong> Company whose shares are traded on a public stock exchange (uses EVIC calculation)</p>
              <p><strong>Unlisted:</strong> Private company not traded on public exchanges (uses debt + equity calculation)</p>
            </div>
          </div>
        );

      case 'loan-type':
        if (mode === 'facilitated') {
          // Skip rendering loan-type step entirely for facilitated mode (defensive)
          return null;
        }
        const loanTypeOptions = [
          { value: 'corporate-bond', label: 'Corporate Bond', description: 'Debt securities issued by corporations' },
          { value: 'business-loan', label: 'Business Loan', description: 'Traditional loans to businesses for operations' },
          { value: 'project-finance', label: 'Project Finance', description: 'Financing for specific infrastructure or development projects' },
          { value: 'mortgage', label: 'Mortgage', description: 'Loans secured by real estate property' },
          { value: 'sovereign-debt', label: 'Sovereign Debt', description: 'Loans or bonds issued by national governments' },
          { value: 'motor-vehicle-loan', label: 'Motor Vehicle Loan', description: 'Loans for purchasing cars, trucks, motorcycles, and other vehicles' },
          { value: 'commercial-real-estate', label: 'Commercial Real Estate', description: 'Loans for commercial properties like offices, retail, and industrial buildings' }
        ];

        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">Select Loan Types</Label>
              <p className="text-sm text-muted-foreground mt-1">
                You can select multiple loan types for your {mode === 'finance' ? 'finance' : 'facilitated'} emission calculation.
              </p>
            </div>

            {/* Selected Loan Types */}
            {formData.loanTypes.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Selected Loan Types:</Label>
                <div className="space-y-2">
                  {formData.loanTypes.map((loanTypeItem) => {
                    const option = loanTypeOptions.find(opt => opt.value === loanTypeItem.type);
                    return (
                      <div key={loanTypeItem.type} className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-lg px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-teal-800">{option?.label}</span>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`quantity-${loanTypeItem.type}`} className="text-xs text-teal-600">Quantity:</Label>
                            <Input
                              id={`quantity-${loanTypeItem.type}`}
                              type="number"
                              min="1"
                              value={loanTypeItem.quantity}
                              onChange={(e) => updateLoanTypeQuantity(loanTypeItem.type, parseInt(e.target.value) || 1)}
                              className="w-16 h-8 text-center text-sm"
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLoanType(loanTypeItem.type)}
                          className="h-8 w-8 p-0 hover:bg-teal-100"
                        >
                          <Trash2 className="h-4 w-4 text-teal-600" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Available Loan Types */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Available Loan Types:</Label>
              <div className="grid grid-cols-1 gap-2">
                {loanTypeOptions.map((option) => {
                  const isSelected = formData.loanTypes.some(item => item.type === option.value);
                  const selectedItem = formData.loanTypes.find(item => item.type === option.value);
                  
                  return (
                    <div key={option.value} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{option.label}</div>
                        <div className="text-sm text-gray-600">{option.description}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isSelected ? (
                          <>
                            <span className="text-sm text-gray-600">Quantity: {selectedItem?.quantity}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addLoanType(option.value, 1)}
                            >
                              +1
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => removeLoanType(option.value)}
                            >
                              Remove
                            </Button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="1"
                              placeholder="Qty"
                              className="w-16 h-8 text-center text-sm"
                              value={pendingQuantities[option.value] ?? 1}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setPendingQuantities(prev => ({ ...prev, [option.value]: isNaN(val) ? 1 : Math.max(1, val) }));
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const quantity = pendingQuantities[option.value] ?? 1;
                                  addLoanType(option.value, quantity);
                                  setPendingQuantities(prev => ({ ...prev, [option.value]: 1 }));
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const quantity = pendingQuantities[option.value] ?? 1;
                                addLoanType(option.value, quantity);
                                setPendingQuantities(prev => ({ ...prev, [option.value]: 1 }));
                              }}
                            >
                              Add
                            </Button>
            </div>
                        )}
            </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {formData.loanTypes.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <p>Please select at least one loan type to continue.</p>
              </div>
            )}
          </div>
        );

      case 'emission-status':
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">Do you have your emissions calculated?</Label>
              <RadioGroup
                value={formData.hasEmissions}
                onValueChange={(value) => updateFormData('hasEmissions', value)}
                className="mt-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="yes" />
                  <Label htmlFor="yes">Yes (Score: 1)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="no" />
                  <Label htmlFor="no">No (Score: 2)</Label>
                </div>
              </RadioGroup>
            </div>

            {formData.hasEmissions === 'yes' && (
              <div className="space-y-4 pl-6 border-l-4 border-teal-300 bg-teal-50 p-4 rounded-r-lg">
                <div className="text-sm text-muted-foreground">Enter your emissions by scope. Values are in tCO2e.</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="scope1">Scope 1 Emissions (tCO2e)</Label>
                    <div className="flex items-center gap-2">
                      <FormattedNumberInput
                        id="scope1"
                        placeholder="0"
                        value={formData.scope1Emissions || 0}
                        onChange={(value) => updateFormData('scope1Emissions', value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="scope2">Scope 2 Emissions (tCO2e)</Label>
                    <div className="flex items-center gap-2">
                      <FormattedNumberInput
                        id="scope2"
                        placeholder="0"
                        value={formData.scope2Emissions || 0}
                        onChange={(value) => updateFormData('scope2Emissions', value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="scope3">Scope 3 Emissions (tCO2e)</Label>
                    <div className="flex items-center gap-2">
                      <FormattedNumberInput
                        id="scope3"
                        placeholder="0"
                        value={formData.scope3Emissions || 0}
                        onChange={(value) => updateFormData('scope3Emissions', value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'verification':
        if (formData.hasEmissions === 'yes') {
          return (
            <div className="space-y-6">
              <div>
                <Label className="text-base font-medium">Is it verified by a third party?</Label>
                <RadioGroup
                  value={formData.verificationStatus}
                  onValueChange={(value) => updateFormData('verificationStatus', value)}
                  className="mt-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="verified" id="verified" />
                    <Label htmlFor="verified">Verified (Score: 1)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="unverified" id="unverified" />
                    <Label htmlFor="unverified">Unverified (Score: 2)</Label>
                  </div>
                </RadioGroup>
              </div>

              {formData.verificationStatus === 'verified' && (
                <div className="pl-6 border-l-4 border-teal-300 bg-teal-50 p-4 rounded-r-lg">
                  <Label htmlFor="verifier-name" className="text-sm font-medium">Verified by (Organization/Agency Name)</Label>
                  <Input
                    id="verifier-name"
                    placeholder="e.g., SGS, DNV, Bureau Veritas"
                    className="mt-1"
                    value={formData.verifierName}
                    onChange={(e) => updateFormData('verifierName', e.target.value)}
                  />
                </div>
              )}
            </div>
          );
        } else if (formData.hasEmissions === 'no') {
          return (
            <div className="space-y-6">
              <div>
                <Label className="text-base font-medium">Choose calculation method:</Label>
                <div className="mt-4 space-y-3">
                  <Button
                    type="button"
                    onClick={() => {
                      // Persist current state and mark to resume at calculation
                      try {
                        sessionStorage.setItem('esgWizardState', JSON.stringify({ formData, resumeAtCalculation: true, mode, ts: Date.now() }));
                      } catch {}
                      // Navigate to the site's main emission calculator
                      const url = `/emission-calculator?from=wizard&mode=${mode}`;
                      window.location.href = url;
                    }}
                  >
                    Our Own Emission Calculator
                  </Button>
                  </div>
              </div>
            </div>
          );
        }
        return (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Please complete the previous step first.</p>
          </div>
        );

      case 'emission-calculation':
        return <FinanceEmissionCalculator 
          hasEmissions={formData.hasEmissions}
          verificationStatus={formData.verificationStatus}
          corporateStructure={formData.corporateStructure}
          loanTypes={formData.loanTypes}
          activeTab={mode}
          onTabChange={() => {}} // No tab change needed since we only show one form
          onResults={(r) => {
            setResults(r);
            setCurrentStep(steps.findIndex(s => s.id === 'results'));
            // Save emission calculations to database
            saveEmissionCalculations(r);
          }}
        />;

      case 'results':
        console.log('ESGWizard - Results array:', results);
        
        // Calculate totals for summary
        const totalEmissions = results?.reduce((sum, r) => sum + (r.financedEmissions || 0), 0) || 0;
        const totalDenominatorValue = results?.reduce((sum, r) => sum + (r.denominatorValue || 0), 0) || 0;
        const averageAttributionFactor = results?.length > 0 
          ? results.reduce((sum, r) => sum + (r.attributionFactor || 0), 0) / results.length 
          : 0;

        return (
          <div className="space-y-8">
            {!results || results.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-muted-foreground text-lg">No results yet. Please run a calculation.</div>
              </div>
            ) : (
              <>
                {/* Header with Summary */}
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {mode === 'finance' ? 'Finance Emissions' : 'Facilitated Emissions'} Calculated
                    </h2>
                  </div>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    Your {mode === 'finance' ? 'finance' : 'facilitated'} emissions have been successfully calculated. 
                    Review the detailed results below.
                  </p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                          <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-blue-700">Total Emissions</div>
                          <div className="text-2xl font-bold text-blue-900">{totalEmissions.toFixed(2)} tCO2e</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                          <BarChart3 className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-green-700">Average Attribution</div>
                          <div className="text-2xl font-bold text-green-900">{(averageAttributionFactor * 100).toFixed(2)}%</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                          <Building className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-purple-700">Total EVIC</div>
                          <div className="text-2xl font-bold text-purple-900">
                            {totalDenominatorValue.toLocaleString()} PKR
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>


                {/* Action Buttons */}
                <div className="flex items-center justify-center space-x-4 pt-6">
                  <Button 
                    onClick={() => setCurrentStep(steps.findIndex(s => s.id === 'emission-calculation'))}
                    variant="outline" 
                    className="flex items-center space-x-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Recalculate</span>
                  </Button>
                  <Button 
                    onClick={() => navigate('/bank-portfolio')}
                    className="flex items-center space-x-2 bg-primary hover:bg-primary/90"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Complete & Return to Portfolio</span>
                  </Button>
                </div>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (steps[currentStep].id) {
      case 'corporate-structure':
        return formData.corporateStructure !== '';
      case 'loan-type':
        return formData.loanTypes.length > 0;
      case 'emission-status':
        return formData.hasEmissions !== '';
      case 'verification':
        if (formData.hasEmissions === 'yes') {
          return formData.verificationStatus !== '';
        } else if (formData.hasEmissions === 'no') {
          return formData.calculationMethod !== '';
        }
        return false;
      default:
        return true;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br bg-[var(--gradient-subtle)] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Go Back</span>
            </Button>
            <div className="flex-1"></div>
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">
            {mode === 'finance' ? 'ESG Finance Assessment' : 'ESG Facilitated Assessment'}
          </h1>
          <p className="text-muted-foreground">
            {mode === 'finance' ? 'Loan Risk Assessment & Finance Emission Calculator' : 'Facilitated Emission Calculator'}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-between items-center mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                  index <= currentStep
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border'
                }`}
              >
                {index + 1}
              </div>
              {index < steps.length - 1 && (
                <div className={`h-0.5 w-16 mx-2 ${index < currentStep ? 'bg-primary' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card className="shadow-[var(--shadow-elegant)]">
          <CardHeader>
            <CardTitle>
              {steps[currentStep]?.title || 'Loading...'}
            </CardTitle>
            <CardDescription>
              {steps[currentStep]?.description || 'Please wait...'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderStepContent()}
            
            {/* Navigation - only show for non-results steps */}
            {steps[currentStep].id !== 'results' && (
              <>
                <Separator className="my-6" />
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentStep === 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                  
                  {currentStep < steps.length - 1 ? (
                    <Button onClick={handleNext} disabled={!canProceed()}>
                      Next
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button variant="default" onClick={() => persistSharedIfAvailable()}>
                      Complete Assessment
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
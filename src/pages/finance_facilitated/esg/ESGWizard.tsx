import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight, Plus, Trash2, Building2, Users } from 'lucide-react';
import { FinanceEmissionCalculator } from './FinanceEmissionCalculator';
import { FormattedNumberInput } from '../components/FormattedNumberInput';

interface WizardStep {
  id: string;
  title: string;
  description: string;
}

export const ESGWizard: React.FC = () => {
  const location = useLocation();
  const mode: 'finance' | 'facilitated' = (location.state as any)?.mode || 'finance';

const steps: WizardStep[] = [
  {
    id: 'corporate-structure',
    title: 'Corporate Structure',
    description: 'Is the company listed or unlisted?'
  },
  {
    id: 'loan-type',
    title: 'Loan Type',
    description: 'Select your loan classification'
  },
  {
    id: 'emission-status',
    title: 'Emission Status',
    description: 'Do you have emissions calculated?'
  },
  {
    id: 'verification',
    title: 'Verification',
    description: 'Verification details'
  },
  {
      id: 'emission-calculation',
      title: mode === 'finance' ? 'Finance Emission' : 'Facilitated Emission',
      description: mode === 'finance' ? 'Calculate your finance emissions' : 'Calculate your facilitated emissions'
    },
  {
    id: 'results',
    title: 'Results',
    description: 'Per-loan emission results'
  }
  ];
  
  const [currentStep, setCurrentStep] = useState(0);
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

  // Restore saved wizard state when returning from emission calculator
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('esgWizardState');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.formData) setFormData(parsed.formData);
        // Only auto-resume to calculation if explicitly requested by calculator return flow
        if (parsed?.resumeAtCalculation === true) {
          setCurrentStep(steps.length - 1);
        }
      }
    } catch {}
  }, []);

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
    switch (steps[currentStep].id) {
      case 'corporate-structure':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="corporate-structure">Corporate Structure</Label>
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
          }}
        />;

      case 'results':
        return (
          <div className="space-y-6">
            {results.length === 0 ? (
              <div className="text-center text-muted-foreground">No results yet. Please run a calculation.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.map((r, idx) => (
                  <Card key={idx} className="border-primary/20">
                    <CardHeader>
                      <CardTitle className="text-base">{r.label}</CardTitle>
                      <CardDescription>{r.denominatorLabel}: {r.denominatorValue.toLocaleString()} PKR</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="p-3 bg-primary/5 rounded">
                        <div className="text-xs text-muted-foreground">Attribution Factor</div>
                        <div className="text-xl font-semibold text-primary">{r.attributionFactor.toFixed(6)}</div>
                      </div>
                      <div className="p-3 bg-primary/5 rounded">
                        <div className="text-xs text-muted-foreground">{mode === 'finance' ? 'Finance Emission' : 'Facilitated Emission'}</div>
                        <div className="text-xl font-semibold text-primary">{r.financedEmissions.toFixed(2)} tCO2e</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
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
          <h1 className="text-3xl font-bold text-primary mb-2">ESG Finance Assessment</h1>
          <p className="text-muted-foreground">Loan Risk Assessment & Finance Emission Calculator</p>
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
              {steps[currentStep].title}
            </CardTitle>
            <CardDescription>
              {steps[currentStep].description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderStepContent()}
            
            <Separator className="my-6" />
            
            {/* Navigation */}
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
                <Button variant="default">
                  Complete Assessment
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
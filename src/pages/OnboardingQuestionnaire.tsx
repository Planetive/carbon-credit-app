import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft, ChevronRight } from 'lucide-react';
// TODO: If a dedicated FinanceEmissionCalculator exists later, import and use it.
const FinanceEmissionCalculator: React.FC<{ hasEmissions: string; verificationStatus: string; corporateStructure: string; loanType: string; }> = ({ hasEmissions, verificationStatus, corporateStructure, loanType }) => {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">Finance emission calculator placeholder.</p>
      <ul className="text-sm text-muted-foreground list-disc pl-5">
        <li>Has Emissions: {hasEmissions || 'n/a'}</li>
        <li>Verification: {verificationStatus || 'n/a'}</li>
        <li>Corporate Structure: {corporateStructure || 'n/a'}</li>
        <li>Loan Type: {loanType || 'n/a'}</li>
      </ul>
    </div>
  );
};

interface WizardStep {
  id: string;
  title: string;
  description: string;
}

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
  }
];

interface ESGWizardProps {
  onComplete?: () => void;
}

export const ESGWizard: React.FC<ESGWizardProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const mode = (location.state as any)?.mode === 'facilitated' ? 'facilitated' : 'finance';
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    corporateStructure: '', // 'listed' or 'unlisted'
    loanType: '', // 'corporate-bond'
    hasEmissions: '',
    verificationStatus: '',
    calculationMethod: '',
    score: 0
  });

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

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="loan-type">Loan Type</Label>
              <Select value={formData.loanType} onValueChange={(value) => updateFormData('loanType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select loan type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="corporate-bond">Corporate Bond</SelectItem>
                  <SelectItem value="business-loan">Business Loan</SelectItem>
                  <SelectItem value="project-finance">Project Finance</SelectItem>
                  <SelectItem value="mortgage">Mortgage</SelectItem>
                  <SelectItem value="sovereign-debt">Sovereign Debt</SelectItem>
                  <SelectItem value="motor-vehicle-loan">Motor Vehicle Loan</SelectItem>
                  <SelectItem value="commercial-real-estate">Commercial Real Estate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              <p><strong>Corporate Bond:</strong> Debt securities issued by corporations</p>
              <p><strong>Business Loan:</strong> Traditional loans to businesses for operations</p>
              <p><strong>Project Finance:</strong> Financing for specific infrastructure or development projects</p>
              <p><strong>Mortgage:</strong> Loans secured by real estate property</p>
              <p><strong>Sovereign Debt:</strong> Loans or bonds issued by national governments</p>
              <p><strong>Motor Vehicle Loan:</strong> Loans for purchasing cars, trucks, motorcycles, and other vehicles</p>
              <p><strong>Commercial Real Estate:</strong> Loans for commercial properties like offices, retail, and industrial buildings</p>
            </div>
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
            </div>
          );
        } else if (formData.hasEmissions === 'no') {
          return (
            <div className="space-y-6">
              <div>
                <Label className="text-base font-medium">Choose calculation method:</Label>
                <RadioGroup
                  value={formData.calculationMethod}
                  onValueChange={(value) => {
                    updateFormData('calculationMethod', value);
                    if (value === 'our-own-calculator') {
                      navigate('/emission-calculator');
                    }
                  }}
                  className="mt-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="our-own-calculator" id="our-own-calculator" />
                    <Label htmlFor="our-own-calculator">Our Own Emission Calculator</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          );
        }
        return (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Please complete the previous step first.</p>
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
        return formData.loanType !== '';
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
    <div className="min-h-screen bg-background text-foreground p-6">
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
        <Card className="shadow">
          <CardHeader>
            <CardTitle>{steps[currentStep].title}</CardTitle>
            <CardDescription>{steps[currentStep].description}</CardDescription>
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
                  <Button 
                  variant="default"
                  onClick={() => {
                    try {
                      localStorage.setItem('onboarding_completed', 'true');
                    } catch (_) {}
                    
                    // Navigate to integrated page with collected data and mode
                    navigate('/finance-emission', {
                      state: {
                        onboardingData: formData,
                        mode
                      }
                    });
                  }}
                >
                  Complete Assessment & Calculate Emissions
                  </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
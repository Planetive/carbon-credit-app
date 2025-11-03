import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Calculator, TrendingUp, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CalculationEngine } from '../engines/CalculationEngine';
import { ALL_FACILITATED_FORMULAS, getFacilitatedFormulaById } from '../config/facilitatedEmissionFormulaConfigs';
import { smartConvertUnit } from '../utils/unitConversions';
import { formatNumberWithCommas, parseFormattedNumber, handleFormattedNumberChange } from '../utils/numberFormatting';
import { FormattedNumberInput } from '../components/FormattedNumberInput';
import { FieldTooltip } from '../components/FieldTooltip';

interface FacilitatedEmissionFormProps {
  corporateStructure?: string; // 'listed' or 'unlisted'
  hasEmissions?: string; // 'yes' or 'no'
  verificationStatus?: string; // 'verified' or 'unverified'
  verifiedEmissions?: number; // Auto-calculated verified emissions from parent
  unverifiedEmissions?: number; // Auto-calculated unverified emissions from parent
  onCalculationComplete?: (result: any) => void;
}

interface CalculationResult {
  attributionFactor: number;
  facilitatedEmission: number;
  evic?: number;
  totalEquityPlusDebt?: number;
  dataQualityScore?: number;
  methodology?: string;
  calculationSteps?: Array<{
    step: string;
    value: number;
    formula: string;
  }>;
}

export const FacilitatedEmissionForm: React.FC<FacilitatedEmissionFormProps> = ({
  corporateStructure = 'listed',
  hasEmissions = '',
  verificationStatus = '',
  verifiedEmissions = 0,
  unverifiedEmissions = 0,
  onCalculationComplete
}) => {
  const { toast } = useToast();
  const calculationEngine = new CalculationEngine();
  
  const [formData, setFormData] = useState({
    // Financial Information
    underwritingAmount: 0,
    underwritingShare: 0, // percentage
    sharePrice: 0,
    outstandingShares: 0,
    totalDebt: 0,
    minorityInterest: 0,
    preferredStock: 0,
    totalEquity: 0,
    // Weighting Factor - Fixed at 33%
    weightingFactor: 0.33,
    // Option 1a - Verified GHG Emissions
    verifiedEmissions: 0,
    verifiedEmissionsUnit: 'tCO2e',
    // Option 1b - Unverified GHG Emissions
    unverifiedEmissions: 0,
    unverifiedEmissionsUnit: 'tCO2e',
    // Option 2a - Energy Consumption Data
    energyConsumption: 0,
    energyConsumptionUnit: 'MWh',
    emissionFactor: 0,
    emissionFactorUnit: 'tCO2e/MWh',
    processEmissions: 0,
    processEmissionsUnit: 'tCO2e',
    // Option 2b - Production Data
    production: 0,
    productionUnit: 'tonnes',
    productionEmissionFactor: 0,
    productionEmissionFactorUnit: 'tCO2e/tonne'
  });
  
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [companyType, setCompanyType] = useState<'listed' | 'unlisted'>(corporateStructure === 'listed' ? 'listed' : 'unlisted');

  // Load questionnaire data from database and restore saved form state
  useEffect(() => {
    const initializeForm = async () => {
      try {
        // First, try to load from database if we have a counterparty ID
        const urlParams = new URLSearchParams(window.location.search);
        const counterpartyId = urlParams.get('counterpartyId') || 
                              (window.location.state as any)?.counterpartyId ||
                              (window.location.state as any)?.counterparty ||
                              (window.location.state as any)?.id;
        
        if (counterpartyId) {
          const { PortfolioClient } = await import('@/integrations/supabase/portfolioClient');
          const questionnaire = await PortfolioClient.getQuestionnaire(counterpartyId);
          
          if (questionnaire) {
            console.log('FacilitatedEmissionForm - Loaded questionnaire from database:', questionnaire);
            
            // Update company type from database
            const dbCompanyType = questionnaire.corporate_structure === 'listed' ? 'listed' : 'unlisted';
            setCompanyType(dbCompanyType);
            
            // Calculate total emissions from scope 1, 2, 3
            const totalEmissions = (questionnaire.scope1_emissions || 0) + 
                                 (questionnaire.scope2_emissions || 0) + 
                                 (questionnaire.scope3_emissions || 0);
            
            console.log('Auto-fill debug:', {
              scope1: questionnaire.scope1_emissions,
              scope2: questionnaire.scope2_emissions,
              scope3: questionnaire.scope3_emissions,
              totalEmissions,
              verificationStatus: questionnaire.verification_status
            });
            
            // Update form data with database values
            setFormData(prev => ({
              ...prev,
              sharePrice: questionnaire.share_price || 0,
              outstandingShares: questionnaire.outstanding_shares || 0,
              totalDebt: questionnaire.total_debt || 0,
              minorityInterest: questionnaire.minority_interest || 0,
              preferredStock: questionnaire.preferred_stock || 0,
              totalEquity: questionnaire.total_equity || 0,
              // Auto-fill emissions based on verification status
              verifiedEmissions: questionnaire.verification_status === 'verified' ? totalEmissions : 0,
              unverifiedEmissions: questionnaire.verification_status === 'unverified' ? totalEmissions : 0
            }));
          }
        }
        
        // Then, restore from sessionStorage (this will override database values if more recent)
        const raw = sessionStorage.getItem('facilitatedFormState');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.formData) {
            setFormData(prev => {
              const restored = { ...prev, ...parsed.formData };
              // Preserve auto-filled emissions if they were set from questionnaire
              if (prev.verifiedEmissions > 0 || prev.unverifiedEmissions > 0) {
                restored.verifiedEmissions = prev.verifiedEmissions;
                restored.unverifiedEmissions = prev.unverifiedEmissions;
              }
              return restored;
            });
          }
          if (parsed?.companyType) setCompanyType(parsed.companyType);
        }
      } catch (error) {
        console.error('Error initializing facilitated form:', error);
      }
    };
    
    initializeForm();
  }, []);

  // Auto-fill emissions from props (calculated by parent ESGWizard)
  useEffect(() => {
    console.log('🔍 FacilitatedEmissionForm - Auto-fill useEffect triggered:', {
      hasEmissions,
      verificationStatus,
      verifiedEmissions,
      unverifiedEmissions,
      currentFormData: formData
    });
    
    if (hasEmissions === 'yes' && (verifiedEmissions > 0 || unverifiedEmissions > 0)) {
      setFormData(prev => {
        const newData = {
          ...prev,
          verifiedEmissions: verifiedEmissions || prev.verifiedEmissions,
          unverifiedEmissions: unverifiedEmissions || prev.unverifiedEmissions
        };
        console.log('🔍 FacilitatedEmissionForm - Auto-fill form data updated:', newData);
        return newData;
      });
    }
  }, [hasEmissions, verificationStatus, verifiedEmissions, unverifiedEmissions]);

  // Get available formulas based on selections (same logic as Finance Emission)
  const getAvailableFormulas = () => {
    let formulas = ALL_FACILITATED_FORMULAS.filter(formula => {
      // Check company type from the formula ID (listed/unlisted)
      const isListed = formula.id.includes('-listed');
      const isUnlisted = formula.id.includes('-unlisted');
      const matchesCompanyType = (companyType === 'listed' && isListed) || (companyType === 'unlisted' && isUnlisted);
      return matchesCompanyType;
    });

    // Filter based on hasEmissions and verificationStatus
    if (hasEmissions === 'yes') {
      if (verificationStatus === 'verified') {
        // Show only Option 1a (Verified GHG Emissions)
        formulas = formulas.filter(formula => formula.optionCode === '1a');
      } else if (verificationStatus === 'unverified') {
        // Show only Option 1b (Unverified GHG Emissions)
        formulas = formulas.filter(formula => formula.optionCode === '1b');
      }
      // If no verification status selected, show both 1a and 1b
    } else if (hasEmissions === 'no') {
      // Show Options 2a and 2b (Activity-based data)
      formulas = formulas.filter(formula => 
        formula.optionCode === '2a' || formula.optionCode === '2b'
      );
    }

    return formulas;
  };

  const availableFormulas = getAvailableFormulas();
  
  // Automatically select the first (and only) available formula
  const selectedFormula = availableFormulas.length > 0 ? availableFormulas[0].id : '';

  // Calculate facilitated amount from underwriting amount and share percentage
  const facilitatedAmount = formData.underwritingAmount * (formData.underwritingShare / 100);

  // Unit conversion using centralized utility

  const updateFormData = (field: string, value: number | string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getDataQualityColor = (score: number) => {
    switch (score) {
      case 1: return 'bg-green-100 text-green-800 border-green-200';
      case 2: return 'bg-blue-100 text-blue-800 border-blue-200';
      case 3: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 4: return 'bg-orange-100 text-orange-800 border-orange-200';
      case 5: return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const calculateFacilitatedEmission = () => {
    if (!selectedFormula) {
      toast({
        title: "No Formula Selected",
        description: "Please select a calculation formula first.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Calculate EVIC or Total Equity + Debt based on company type
      const totalAssetsValue = companyType === 'listed' ? 
        (formData.sharePrice * formData.outstandingShares) + formData.totalDebt + formData.minorityInterest + formData.preferredStock :
        formData.totalEquity + formData.totalDebt;

       // Prepare inputs for calculation
       const calculationInputs = {
         facilitated_amount: facilitatedAmount,
         total_assets: totalAssetsValue,
         evic: companyType === 'listed' ? totalAssetsValue : 0,
         total_equity_plus_debt: companyType === 'unlisted' ? totalAssetsValue : 0,
         // Individual fields for EVIC calculation
         sharePrice: formData.sharePrice,
         outstandingShares: formData.outstandingShares,
         totalDebt: formData.totalDebt,
         minorityInterest: formData.minorityInterest,
         preferredStock: formData.preferredStock,
         // Individual fields for unlisted companies
         totalEquity: companyType === 'unlisted' ? formData.totalEquity : 0,
         // Weighting factor
         weighting_factor: formData.weightingFactor,
         // Option 1a - Verified GHG Emissions (convert to tonnes CO2e)
         verified_emissions: smartConvertUnit(formData.verifiedEmissions, formData.verifiedEmissionsUnit),
         // Option 1b - Unverified GHG Emissions (convert to tonnes CO2e)
         unverified_emissions: smartConvertUnit(formData.unverifiedEmissions, formData.unverifiedEmissionsUnit),
         // Option 2a - Energy Consumption Data
         energy_consumption: smartConvertUnit(formData.energyConsumption, formData.energyConsumptionUnit),
         emission_factor: smartConvertUnit(formData.emissionFactor, formData.emissionFactorUnit),
         process_emissions: smartConvertUnit(formData.processEmissions, formData.processEmissionsUnit),
         // Option 2b - Production Data
         production: smartConvertUnit(formData.production, formData.productionUnit),
         production_emission_factor: smartConvertUnit(formData.productionEmissionFactor, formData.productionEmissionFactorUnit)
       };

      const calculationResult = calculationEngine.calculate(selectedFormula, calculationInputs, companyType === 'unlisted' ? 'private' : companyType);
      
      const result: CalculationResult = {
        attributionFactor: calculationResult.attributionFactor,
        facilitatedEmission: calculationResult.financedEmissions,
        evic: companyType === 'listed' ? totalAssetsValue : undefined,
        totalEquityPlusDebt: companyType === 'unlisted' ? totalAssetsValue : undefined,
        dataQualityScore: calculationResult.dataQualityScore,
        methodology: calculationResult.methodology,
        calculationSteps: calculationResult.calculationSteps
      };

      setResult(result);
      // Persist facilitated form state for navigation back
      try {
        sessionStorage.setItem('facilitatedFormState', JSON.stringify({
          formData,
          companyType,
          ts: Date.now()
        }));
      } catch {}
      
      if (onCalculationComplete) {
        onCalculationComplete(result);
      }
      
      toast({
        title: "Facilitated Emission Calculation Complete",
        description: `Facilitated emission calculated using ${calculationResult.methodology}`,
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Calculation Error",
        description: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const getCurrentFormula = () => {
    return availableFormulas.find(f => f.id === selectedFormula);
  };

  // Get required inputs for the selected formula
  const getRequiredInputs = () => {
    const currentFormula = getCurrentFormula();
    if (!currentFormula) return [];
    return currentFormula.inputs || [];
  };

  // Check if a specific input is required for the selected formula
  const isInputRequired = (inputName: string) => {
    const requiredInputs = getRequiredInputs();
    return requiredInputs.some(input => input.name === inputName);
  };

  // Get input configuration for a specific field
  const getInputConfig = (inputName: string) => {
    const requiredInputs = getRequiredInputs();
    return requiredInputs.find(input => input.name === inputName);
  };

  // Render input field based on configuration
  const renderInputField = (inputConfig: any) => {
    const { name, label, type, required, unit, description, validation, unitOptions } = inputConfig;
    const value = formData[name] || '';
    
    return (
      <div key={name}>
        <Label htmlFor={name}>
          {label} {required && '*'}
        </Label>
        <div className="flex gap-2">
          <Input
            id={name}
            type={type}
            placeholder="0"
            value={value}
            onChange={(e) => updateFormData(name, parseFloat(e.target.value) || 0)}
            className="mt-1"
            min={validation?.min}
            max={validation?.max}
            step={type === 'number' ? '0.01' : undefined}
          />
          {unitOptions && (
            <Select 
              value={formData[`${name}Unit`] || unitOptions[0]} 
              onValueChange={(value) => updateFormData(`${name}Unit`, value)}
            >
              <SelectTrigger className="w-32 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {unitOptions.map((option: string) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Show selected formula info */}
      {selectedFormula && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Selected Calculation Method
            </CardTitle>
            <CardDescription>
              Based on your selections, the following formula has been automatically selected
            </CardDescription>
          </CardHeader>
          <CardContent>
            {availableFormulas.length > 0 && (
              <div className="p-4 border rounded-lg bg-primary/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Label className="font-medium">
                      {availableFormulas[0].name}
                    </Label>
                  </div>
                  <Badge className={getDataQualityColor(availableFormulas[0].dataQualityScore)}>
                    Score {availableFormulas[0].dataQualityScore}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {availableFormulas[0].description}
                </p>
                <div className="text-xs text-muted-foreground">
                  <strong>Formula:</strong> {availableFormulas[0].metadata?.formula || 'Formula will be displayed during calculation'}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Show error if no formula found */}
      {availableFormulas.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Calculator className="h-5 w-5" />
              No Formula Available
            </CardTitle>
            <CardDescription>
              No calculation method is available for your current selections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
              <p className="text-red-600 font-medium">Please check your previous selections:</p>
              <div className="mt-2 text-sm text-red-500">
                <p>• Corporate Structure: {corporateStructure}</p>
                <p>• Has Emissions: {hasEmissions || 'Not selected'}</p>
                <p>• Verification Status: {verificationStatus || 'Not selected'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dynamic Form Fields - Show when formula is automatically selected */}
      {selectedFormula && (
        <>
          {/* Financial Information - Always required */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Information</CardTitle>
              <CardDescription>
                Enter the financial data for attribution factor calculation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Underwriting Amount */}
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="underwriting-amount">Underwriting Amount (PKR) *</Label>
                    <FieldTooltip content="How much money you provided to underwrite the deal" />
                  </div>
                  <FormattedNumberInput
                    id="underwriting-amount"
                    placeholder="0"
                    value={formData.underwritingAmount || 0}
                    onChange={(value) => updateFormData('underwritingAmount', value)}
                    className="mt-1"
                  />
                </div>

                {/* Underwriting Share Percentage */}
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="underwriting-share">Underwriting Share (%) *</Label>
                    <FieldTooltip content="What percentage of the total deal you underwrote" />
                  </div>
                  <FormattedNumberInput
                    id="underwriting-share"
                    placeholder="0"
                    min={0}
                    max={100}
                    step={0.01}
                    value={formData.underwritingShare || 0}
                    onChange={(value) => updateFormData('underwritingShare', value)}
                    className="mt-1"
                  />
                </div>

                {/* Calculated Facilitated Amount */}
                <div className="md:col-span-2">
                  <div className="p-4 bg-primary/5 rounded-lg">
                    <div className="text-sm font-medium text-muted-foreground">Calculated Facilitated Amount</div>
                    <div className="text-xl font-bold text-primary">
                      ${facilitatedAmount.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.underwritingAmount.toLocaleString()} × {formData.underwritingShare}% = ${facilitatedAmount.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Weighting Factor - Fixed at 33% */}
                <div className="md:col-span-2">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-muted-foreground">Weighting Factor (Fixed)</div>
                    <div className="text-xl font-bold text-gray-700">
                      33% (0.33)
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Standard factor used to calculate your share of emissions (set by regulations)
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Company Value Calculation - Dynamic based on company type */}
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  {companyType === 'listed' ? 'EVIC Calculation (Enterprise Value Including Cash)' : 'Total Equity + Debt Calculation'}
                </h3>
                {companyType === 'listed' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* EVIC Components - Always show for listed companies */}
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="share-price">Share Price (PKR)</Label>
                    <FieldTooltip content="Current price of one company share" />
                  </div>
                  <FormattedNumberInput
                    id="share-price"
                    placeholder="0"
                    value={formData.sharePrice || 0}
                    onChange={(value) => updateFormData('sharePrice', value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="outstanding-shares">Outstanding Shares</Label>
                    <FieldTooltip content="Total number of company shares available" />
                  </div>
                  <FormattedNumberInput
                    id="outstanding-shares"
                    placeholder="0"
                    value={formData.outstandingShares || 0}
                    onChange={(value) => updateFormData('outstandingShares', value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="total-debt">Total Debt (PKR)</Label>
                    <FieldTooltip content="Total amount of money the company owes" />
                  </div>
                  <FormattedNumberInput
                    id="total-debt"
                    placeholder="0"
                    value={formData.totalDebt || 0}
                    onChange={(value) => updateFormData('totalDebt', value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="minority-interest">Minority Interest</Label>
                    <FieldTooltip content="The share of a subsidiary's ownership that belongs to outside (non-parent) investors." />
                  </div>
                  <FormattedNumberInput
                    id="minority-interest"
                    placeholder="0"
                    value={formData.minorityInterest || 0}
                    onChange={(value) => updateFormData('minorityInterest', value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="preferred-stock">Preferred Stock</Label>
                    <FieldTooltip content="The share of a subsidiary's ownership that belongs to outside (non-parent) investors." />
                  </div>
                  <FormattedNumberInput
                    id="preferred-stock"
                    placeholder="0"
                    value={formData.preferredStock || 0}
                    onChange={(value) => updateFormData('preferredStock', value)}
                    className="mt-1"
                  />
                </div>
                    <div className="p-4 bg-primary/5 rounded-lg">
                      <div className="text-sm font-medium text-muted-foreground">Calculated EVIC</div>
                      <div className="text-xl font-bold text-primary">
                        ${((formData.sharePrice * formData.outstandingShares) + formData.totalDebt + formData.minorityInterest + formData.preferredStock).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Unlisted Company Components - Always show for unlisted companies */}
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="total-equity">Total Equity (PKR)</Label>
                    <FieldTooltip content="Total value of company ownership (shares, retained earnings, etc.)" />
                  </div>
                  <FormattedNumberInput
                    id="total-equity"
                    placeholder="0"
                    value={formData.totalEquity || 0}
                    onChange={(value) => updateFormData('totalEquity', value)}
                    className="mt-1"
                  />
                </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="total-debt-unlisted">Total Debt (PKR)</Label>
                        <FieldTooltip content="Total amount of money the company owes" />
                      </div>
                      <FormattedNumberInput
                        id="total-debt-unlisted"
                        placeholder="0"
                        value={formData.totalDebt || 0}
                        onChange={(value) => updateFormData('totalDebt', value)}
                        className="mt-1"
                      />
                    </div>
                    <div className="p-4 bg-primary/5 rounded-lg">
                      <div className="text-sm font-medium text-muted-foreground">Total Equity + Debt</div>
                      <div className="text-xl font-bold text-primary">
                        ${(formData.totalEquity + formData.totalDebt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Option-Specific Data - Only show relevant fields */}
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedFormula.includes('1a') && 'Verified GHG Emissions Data (Option 1a)'}
                {selectedFormula.includes('1b') && 'Unverified GHG Emissions Data (Option 1b)'}
                {selectedFormula.includes('2a') && 'Energy Consumption Data (Option 2a)'}
                {selectedFormula.includes('2b') && 'Production Data (Option 2b)'}
              </CardTitle>
              <CardDescription>
                {selectedFormula.includes('1a') && 'Enter verified GHG emissions data from the client company'}
                {selectedFormula.includes('1b') && 'Enter unverified GHG emissions data from the client company'}
                {selectedFormula.includes('2a') && 'Enter energy consumption data and emission factors'}
                {selectedFormula.includes('2b') && 'Enter production data and emission factors'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Option 1a - Verified Emissions */}
                {isInputRequired('verified_emissions') && (
                  <div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="verified-emissions">Verified GHG Emissions *</Label>
                      {hasEmissions === 'yes' && verificationStatus === 'verified' && (
                        <span className="text-xs text-muted-foreground">(auto-filled)</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <FormattedNumberInput
                        id="verified-emissions"
                        placeholder="0"
                        value={formData.verifiedEmissions || 0}
                        onChange={(value) => updateFormData('verifiedEmissions', value)}
                        disabled={hasEmissions === 'yes' && verificationStatus === 'verified'}
                        className="mt-1"
                      />
                      <Select value={formData.verifiedEmissionsUnit} onValueChange={(value) => updateFormData('verifiedEmissionsUnit', value)} disabled={hasEmissions === 'yes' && verificationStatus === 'verified'}>
                        <SelectTrigger className="w-32 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tCO2e">tCO2e</SelectItem>
                          <SelectItem value="ktCO2e">ktCO2e</SelectItem>
                          <SelectItem value="MtCO2e">MtCO2e</SelectItem>
                          <SelectItem value="GtCO2e">GtCO2e</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Verified GHG emissions from the client company (third-party verified)
                    </p>
                  </div>
                )}

                {/* Option 1b - Unverified Emissions */}
                {isInputRequired('unverified_emissions') && (
                  <div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="unverified-emissions">Unverified GHG Emissions *</Label>
                      {hasEmissions === 'yes' && verificationStatus === 'unverified' && (
                        <span className="text-xs text-muted-foreground">(auto-filled)</span>
                      )}
                      <FieldTooltip content="Emissions data reported by the company but not yet verified by an external auditor." />
                    </div>
                    <div className="flex gap-2">
                      <FormattedNumberInput
                        id="unverified-emissions"
                        placeholder="0"
                        value={formData.unverifiedEmissions || 0}
                        onChange={(value) => updateFormData('unverifiedEmissions', value)}
                        disabled={hasEmissions === 'yes' && verificationStatus === 'unverified'}
                        className="mt-1"
                      />
                      <Select value={formData.unverifiedEmissionsUnit} onValueChange={(value) => updateFormData('unverifiedEmissionsUnit', value)} disabled={hasEmissions === 'yes' && verificationStatus === 'unverified'}>
                        <SelectTrigger className="w-32 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tCO2e">tCO2e</SelectItem>
                          <SelectItem value="ktCO2e">ktCO2e</SelectItem>
                          <SelectItem value="MtCO2e">MtCO2e</SelectItem>
                          <SelectItem value="GtCO2e">GtCO2e</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Unverified GHG emissions from the client company (company-specific data)
                    </p>
                  </div>
                )}

                {/* Option 2a - Energy Consumption */}
                {isInputRequired('energy_consumption') && (
                  <div>
                    <Label htmlFor="energy-consumption">Energy Consumption *</Label>
                    <div className="flex gap-2">
                      <FormattedNumberInput
                        id="energy-consumption"
                        placeholder="0"
                        value={formData.energyConsumption || 0}
                        onChange={(value) => updateFormData('energyConsumption', value)}
                        className="mt-1"
                      />
                      <Select value={formData.energyConsumptionUnit} onValueChange={(value) => updateFormData('energyConsumptionUnit', value)}>
                        <SelectTrigger className="w-32 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MWh">MWh</SelectItem>
                          <SelectItem value="GWh">GWh</SelectItem>
                          <SelectItem value="TWh">TWh</SelectItem>
                          <SelectItem value="kWh">kWh</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Option 2a - Emission Factor */}
                {isInputRequired('emission_factor') && (
                  <div>
                    <Label htmlFor="emission-factor">Emission Factor *</Label>
                    <div className="flex gap-2">
                      <FormattedNumberInput
                        id="emission-factor"
                        placeholder="0"
                        value={formData.emissionFactor || 0}
                        onChange={(value) => updateFormData('emissionFactor', value)}
                        className="mt-1"
                      />
                      <Select value={formData.emissionFactorUnit} onValueChange={(value) => updateFormData('emissionFactorUnit', value)}>
                        <SelectTrigger className="w-32 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tCO2e/MWh">tCO2e/MWh</SelectItem>
                          <SelectItem value="kgCO2e/MWh">kgCO2e/MWh</SelectItem>
                          <SelectItem value="tCO2e/GWh">tCO2e/GWh</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Option 2a - Process Emissions (Optional) */}
                {isInputRequired('process_emissions') && (
                  <div>
                    <Label htmlFor="process-emissions">Process Emissions (Optional)</Label>
                    <div className="flex gap-2">
                      <FormattedNumberInput
                        id="process-emissions"
                        placeholder="0"
                        value={formData.processEmissions || 0}
                        onChange={(value) => updateFormData('processEmissions', value)}
                        className="mt-1"
                      />
                      <Select value={formData.processEmissionsUnit} onValueChange={(value) => updateFormData('processEmissionsUnit', value)}>
                        <SelectTrigger className="w-32 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tCO2e">tCO2e</SelectItem>
                          <SelectItem value="ktCO2e">ktCO2e</SelectItem>
                          <SelectItem value="MtCO2e">MtCO2e</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Option 2b - Production */}
                {isInputRequired('production') && (
                  <div>
                    <Label htmlFor="production">Production *</Label>
                    <div className="flex gap-2">
                      <FormattedNumberInput
                        id="production"
                        placeholder="0"
                        value={formData.production || 0}
                        onChange={(value) => updateFormData('production', value)}
                        className="mt-1"
                      />
                      <Select value={formData.productionUnit} onValueChange={(value) => updateFormData('productionUnit', value)}>
                        <SelectTrigger className="w-32 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tonnes">Tonnes</SelectItem>
                          <SelectItem value="mt">Mt</SelectItem>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="units">Units</SelectItem>
                          <SelectItem value="barrels">Barrels</SelectItem>
                          <SelectItem value="cubic-meters">m³</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Option 2b - Production Emission Factor */}
                {isInputRequired('production_emission_factor') && (
                  <div>
                    <Label htmlFor="production-emission-factor">Emission Factor *</Label>
                    <div className="flex gap-2">
                      <FormattedNumberInput
                        id="production-emission-factor"
                        placeholder="0"
                        value={formData.productionEmissionFactor || 0}
                        onChange={(value) => updateFormData('productionEmissionFactor', value)}
                        className="mt-1"
                      />
                      <Select value={formData.productionEmissionFactorUnit} onValueChange={(value) => updateFormData('productionEmissionFactorUnit', value)}>
                        <SelectTrigger className="w-32 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tCO2e/tonne">tCO2e/tonne</SelectItem>
                          <SelectItem value="kgCO2e/tonne">kgCO2e/tonne</SelectItem>
                          <SelectItem value="tCO2e/unit">tCO2e/unit</SelectItem>
                          <SelectItem value="tCO2e/barrel">tCO2e/barrel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Calculate Button */}
      <div className="flex justify-center">
        <Button
          onClick={calculateFacilitatedEmission}
          disabled={!selectedFormula}
          className="px-8 py-3"
        >
          <Calculator className="h-5 w-5 mr-2" />
          Calculate Facilitated Emission
        </Button>
      </div>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Calculation Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-primary/5 rounded-lg">
                <div className="text-sm font-medium text-muted-foreground">Attribution Factor</div>
                <div className="text-2xl font-bold text-primary">{result.attributionFactor.toFixed(6)}</div>
              </div>
              <div className="p-4 bg-primary/5 rounded-lg">
                <div className="text-sm font-medium text-muted-foreground">Facilitated Emission</div>
                <div className="text-2xl font-bold text-primary">{result.facilitatedEmission.toFixed(2)} tCO2e</div>
              </div>
            </div>

            {result.dataQualityScore && (
              <div className="p-4 bg-primary/5 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-sm font-medium text-muted-foreground">Data Quality Score</div>
                  <Badge className={getDataQualityColor(result.dataQualityScore)}>
                    Score {result.dataQualityScore}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {result.methodology}
                </div>
              </div>
            )}

            {result.calculationSteps && result.calculationSteps.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-medium text-muted-foreground">Calculation Steps</div>
                {result.calculationSteps.map((step, index) => (
                  <div key={index} className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-sm font-medium">{step.step}</div>
                    <div className="text-lg font-bold text-primary">{step.value.toFixed(6)}</div>
                    <div className="text-xs text-muted-foreground font-mono">{step.formula}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

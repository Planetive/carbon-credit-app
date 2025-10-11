import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Calculator, TrendingUp, Info, Building2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CalculationEngine } from '../engines/CalculationEngine';
import { ALL_FORMULAS, getFormulasByCategory } from '../config/corporateBondAndBusinessLoanFormulaConfigs';
import { PROJECT_FINANCE_FORMULAS } from '../config/projectFinanceFormulaConfigs';
import { MORTGAGE_FORMULAS } from '../config/mortgageFormulaConfigs';
import { SOVEREIGN_DEBT_FORMULAS } from '../config/sovereignDebtFormulaConfigs';
import { MOTOR_VEHICLE_LOAN_FORMULAS } from '../config/motorVehicleLoanFormulaConfigs';
import { COMMERCIAL_REAL_ESTATE_FORMULAS } from '../config/commercialRealEstateFormulaConfigs';
import { MortgageForm, Property } from '../forms/MortgageForm';
import { MortgageFinancialForm } from '../forms/MortgageFinancialForm';
import { SovereignDebtForm } from '../forms/SovereignDebtForm';
import { SovereignDebtFinancialForm } from '../forms/SovereignDebtFinancialForm';
import { MotorVehicleLoanForm } from '../forms/MotorVehicleLoanForm';
import { MotorVehicleLoanFinancialForm } from '../forms/MotorVehicleLoanFinancialForm';
import { CommercialRealEstateForm } from '../forms/CommercialRealEstateForm';
import { CommercialRealEstateFinancialForm } from '../forms/CommercialRealEstateFinancialForm';
import { FacilitatedEmissionForm } from '../forms/FacilitatedEmissionForm';
import { smartConvertUnit } from '../utils/unitConversions';
import { formatNumberWithCommas, parseFormattedNumber, handleFormattedNumberChange } from '../utils/numberFormatting';
import { FormattedNumberInput } from '../components/FormattedNumberInput';
import { FieldTooltip } from '../components/FieldTooltip';



interface CalculationResult {
  attributionFactor: number;
  financeEmission: number;
  totalProductOutput: number;
  evic: number;
  dataQualityScore?: number;
  methodology?: string;
  calculationSteps?: Array<{
    step: string;
    value: number;
    formula: string;
  }>;
}

interface FinanceEmissionCalculatorProps {
  hasEmissions?: string;
  verificationStatus?: string;
  corporateStructure?: string; // 'listed' or 'unlisted'
  loanTypes?: Array<{ type: string; quantity: number }>; // Array of loan type objects with quantity
  activeTab: 'finance' | 'facilitated';
  onTabChange?: (tab: 'finance' | 'facilitated') => void;
  onResults?: (results: Array<{ type: string; label: string; attributionFactor: number; financedEmissions: number; denominatorLabel: string; denominatorValue: number }>) => void;
}

export const FinanceEmissionCalculator: React.FC<FinanceEmissionCalculatorProps> = ({
  hasEmissions: propHasEmissions,
  verificationStatus: propVerificationStatus,
  corporateStructure: propCorporateStructure,
  loanTypes: propLoanTypes = [],
  activeTab,
  onTabChange,
  onResults
}) => {
  const { toast } = useToast();
  const calculationEngine = new CalculationEngine();
  
  // Support navigating multiple selected loan types from the questionnaire
  const [currentLoanIndex, setCurrentLoanIndex] = useState(0);
  const typeLabels: { [key: string]: string } = {
    'corporate-bond': 'Corporate Bond',
    'business-loan': 'Business Loan',
    'project-finance': 'Project Finance',
    'mortgage': 'Mortgage',
    'sovereign-debt': 'Sovereign Debt',
    'motor-vehicle-loan': 'Motor Vehicle Loan',
    'commercial-real-estate': 'Commercial Real Estate'
  };

  // Simple per-loan-type form data store to avoid clobbering inputs across types
  const [perLoanFormData, setPerLoanFormData] = useState<Record<string, any>>({});

  const persistCurrentLoanForm = (loanTypeKey: string, data: any) => {
    if (!loanTypeKey) return;
    setPerLoanFormData(prev => ({ ...prev, [loanTypeKey]: data }));
  };

  // Clamp index if the incoming selection shrinks
  useEffect(() => {
    if (currentLoanIndex >= propLoanTypes.length) {
      setCurrentLoanIndex(Math.max(0, propLoanTypes.length - 1));
    }
  }, [propLoanTypes.length]);

  const [properties, setProperties] = useState<Property[]>([
    { 
      id: '1', 
      name: 'Property 1', 
      propertyValueAtOrigination: 0,
      actualEnergyConsumption: 0,
      actualEnergyConsumptionUnit: 'MWh',
      supplierSpecificEmissionFactor: 0,
      supplierSpecificEmissionFactorUnit: 'tCO2e/MWh',
      averageEmissionFactor: 0,
      averageEmissionFactorUnit: 'tCO2e/MWh',
      estimatedEnergyConsumptionFromLabels: 0,
      estimatedEnergyConsumptionFromLabelsUnit: 'MWh',
      estimatedEnergyConsumptionFromStatistics: 0,
      estimatedEnergyConsumptionFromStatisticsUnit: 'MWh',
      floorArea: 0
    }
  ]);
  const [formData, setFormData] = useState({
    totalAssetsValue: 0,
    outstandingLoan: 0,
    totalEmission: 0,
    sharePrice: 0,
    outstandingShares: 0,
    totalDebt: 0,
    totalEquity: 0,
    minorityInterest: 0,
    preferredStock: 0,
    property_value: 0,
    // Mortgage-specific fields (shared with commercial real estate)
    // Fields are defined below in commercial real estate section
    // PCAF specific fields
    verified_emissions: 0,
    unverified_emissions: 0,
    energyConsumption: 0,
    emissionFactor: 0,
    processEmissions: 0,
    production: 0,
    sectorEmissions: 0,
    sectorRevenue: 0,
    sectorAssets: 0,
    assetTurnoverRatio: 0,
    // Sovereign debt specific fields
    ppp_adjustment_factor: 0,
    gdp: 0,
    verified_country_emissions: 0,
    unverified_country_emissions: 0,
    energy_consumption: 0,
    emission_factor: 0,
    // Motor vehicle loan specific fields
    total_value_at_origination: 0,
    fuel_consumption: 0,
    fuel_consumption_unit: 'L',
    distance_traveled: 0,
    efficiency: 0,
    vehicle_emission_factor: 0,
    vehicle_emission_factor_unit: 'tCO2e/L',
    // Commercial real estate specific fields
    property_value_at_origination: 0,
    actual_energy_consumption: 0,
    actual_energy_consumption_unit: 'kWh',
    supplier_specific_emission_factor: 0,
    supplier_specific_emission_factor_unit: 'tCO2e/kWh',
    average_emission_factor: 0,
    average_emission_factor_unit: 'tCO2e/kWh',
    estimated_energy_consumption_from_labels: 0,
    estimated_energy_consumption_from_labels_unit: 'kWh',
    estimated_energy_consumption_from_statistics: 0,
    estimated_energy_consumption_from_statistics_unit: 'kWh',
    floor_area: 0,
    // Project finance specific fields
    totalProjectEquity: 0,
    totalProjectDebt: 0,
    // Emission units
    verified_emissionsUnit: 'tCO2e',
    unverified_emissionsUnit: 'tCO2e'
  });
  // Shared company financials used across all loan forms when multiple are selected
  const [sharedCompanyData, setSharedCompanyData] = useState({
    sharePrice: 0,
    outstandingShares: 0,
    totalDebt: 0,
    totalEquity: 0,
    minorityInterest: 0,
    preferredStock: 0
  });
  const updateSharedCompanyData = (field: keyof typeof sharedCompanyData, value: number) => {
    setSharedCompanyData(prev => ({ ...prev, [field]: value }));
  };
  const initialFormDataRef = useRef<any>(null);
  useEffect(() => {
    if (!initialFormDataRef.current) {
      initialFormDataRef.current = formData;
    }
  }, []);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [multiResults, setMultiResults] = useState<Array<{ type: string; label: string; attributionFactor: number; financeEmission: number; denominatorLabel: string; denominatorValue: number }>>([]);
  const [selectedFormula, setSelectedFormula] = useState<string>('');
  const [companyType, setCompanyType] = useState<'listed' | 'private'>('listed');
  // Remove local tab state - use prop from parent instead
  
  // Use props from ESGWizard questionnaire
  const hasEmissions = propHasEmissions || '';
  const verificationStatus = propVerificationStatus || '';
  const corporateStructure = propCorporateStructure || '';
  const loanType = propLoanTypes.length > 0 ? (propLoanTypes[currentLoanIndex]?.type || propLoanTypes[0].type) : '';

  // When switching loan type: restore saved form if exists; otherwise reset to initial blank
  useEffect(() => {
    if (!loanType) return;
    const saved = perLoanFormData[loanType];
    if (saved && typeof saved === 'object') {
      setFormData(saved);
    } else if (initialFormDataRef.current) {
      setFormData(initialFormDataRef.current);
    }
  }, [loanType, currentLoanIndex]);

  // Restore calculator state from sessionStorage (so going back keeps values)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('financeCalculatorState');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.perLoanFormData) setPerLoanFormData(parsed.perLoanFormData);
      if (parsed?.sharedCompanyData) setSharedCompanyData(parsed.sharedCompanyData);
      if (parsed?.properties) setProperties(parsed.properties);
      if (parsed?.selectedFormula) setSelectedFormula(parsed.selectedFormula);
      if (typeof parsed?.currentLoanIndex === 'number') setCurrentLoanIndex(parsed.currentLoanIndex);
      if (parsed?.formData) setFormData(parsed.formData);
    } catch {}
  }, []);

  // Get available formulas based on questionnaire answers for a given loan type
  const getAvailableFormulasForLoan = (loanTypeParam: string) => {
    const isListed = corporateStructure === 'listed';
    const isProjectFinance = loanTypeParam === 'project-finance';
    const isMortgage = loanTypeParam === 'mortgage';
    const isSovereignDebt = loanTypeParam === 'sovereign-debt';
    const isMotorVehicleLoan = loanTypeParam === 'motor-vehicle-loan';
    const isCommercialRealEstate = loanTypeParam === 'commercial-real-estate';
    
    // Handle Commercial Real Estate formulas
    if (isCommercialRealEstate) {
      if (hasEmissions === 'yes') {
        if (verificationStatus === 'verified') {
          return COMMERCIAL_REAL_ESTATE_FORMULAS.filter(f => f.id === '1a-commercial-real-estate');
        } else if (verificationStatus === 'unverified') {
          return COMMERCIAL_REAL_ESTATE_FORMULAS.filter(f => f.id === '1b-commercial-real-estate');
        }
      } else if (hasEmissions === 'no') {
        if (verificationStatus === 'verified') {
          return COMMERCIAL_REAL_ESTATE_FORMULAS.filter(f => f.id === '2a-commercial-real-estate');
        } else if (verificationStatus === 'unverified') {
          return COMMERCIAL_REAL_ESTATE_FORMULAS.filter(f => f.id === '2b-commercial-real-estate');
        }
      }
    }
    
    // Handle Motor Vehicle Loan formulas
    if (isMotorVehicleLoan) {
      if (hasEmissions === 'yes') {
        if (verificationStatus === 'verified') {
          return MOTOR_VEHICLE_LOAN_FORMULAS.filter(f => f.id === '1a-motor-vehicle');
        } else if (verificationStatus === 'unverified') {
          return MOTOR_VEHICLE_LOAN_FORMULAS.filter(f => f.id === '1b-motor-vehicle');
        }
      } else if (hasEmissions === 'no') {
        if (verificationStatus === 'verified') {
          return MOTOR_VEHICLE_LOAN_FORMULAS.filter(f => f.id === '2a-motor-vehicle');
        } else if (verificationStatus === 'unverified') {
          return MOTOR_VEHICLE_LOAN_FORMULAS.filter(f => f.id === '2b-motor-vehicle');
        }
      }
    }
    
    // Handle Sovereign Debt formulas
    if (isSovereignDebt) {
      if (hasEmissions === 'yes') {
        if (verificationStatus === 'verified') {
          return SOVEREIGN_DEBT_FORMULAS.filter(f => f.id === '1a-sovereign-debt');
        } else if (verificationStatus === 'unverified') {
          return SOVEREIGN_DEBT_FORMULAS.filter(f => f.id === '1b-sovereign-debt');
        }
      } else if (hasEmissions === 'no') {
        return SOVEREIGN_DEBT_FORMULAS.filter(f => f.id === '2a-sovereign-debt');
      }
    }
    
    // Handle Project Finance formulas
    if (isProjectFinance) {
      if (hasEmissions === 'yes') {
        if (verificationStatus === 'verified') {
          return PROJECT_FINANCE_FORMULAS.filter(f => f.id === '1a-project-finance');
        } else if (verificationStatus === 'unverified') {
          return PROJECT_FINANCE_FORMULAS.filter(f => f.id === '1b-project-finance');
        }
      } else if (hasEmissions === 'no') {
        // Show all available formulas for projects without emissions data (Options 2a and 2b)
        return PROJECT_FINANCE_FORMULAS.filter(f => f.optionCode === '2a' || f.optionCode === '2b');
      }
    }
    
    // Handle Mortgage formulas
    if (isMortgage) {
      if (hasEmissions === 'yes') {
        if (verificationStatus === 'verified') {
          return MORTGAGE_FORMULAS.filter(f => f.id === '1a-mortgage');
        } else if (verificationStatus === 'unverified') {
          return MORTGAGE_FORMULAS.filter(f => f.id === '1b-mortgage');
        }
      } else if (hasEmissions === 'no') {
        // Show all available formulas for mortgages without emissions data (Options 2a and 2b)
        return MORTGAGE_FORMULAS.filter(f => f.optionCode === '2a' || f.optionCode === '2b');
      }
    }
    
    // Handle Corporate Bonds and Business Loans (same logic)
    if (hasEmissions === 'yes') {
      if (verificationStatus === 'verified') {
        return isListed ? 
          ALL_FORMULAS.filter(f => f.id === '1a-listed-equity') :
          ALL_FORMULAS.filter(f => f.id === '1a-unlisted-equity');
      } else if (verificationStatus === 'unverified') {
        return isListed ? 
          ALL_FORMULAS.filter(f => f.id === '1b-listed-equity') :
          ALL_FORMULAS.filter(f => f.id === '1b-unlisted-equity');
      }
    } else if (hasEmissions === 'no') {
      // Show all available formulas for companies without emissions data (Options 2a and 2b)
      return isListed ? 
        ALL_FORMULAS.filter(f => f.category === 'listed_equity' && (f.optionCode === '2a' || f.optionCode === '2b') && f.id.includes('listed')) :
        ALL_FORMULAS.filter(f => f.category === 'listed_equity' && (f.optionCode === '2a' || f.optionCode === '2b') && f.id.includes('unlisted'));
    }
    
    return [];
  };

  // Backward-compatible accessor for current loan type
  const getAvailableFormulas = () => getAvailableFormulasForLoan(loanType);

  const availableFormulas = getAvailableFormulas();

  // Auto-select formula if only one is available
  useEffect(() => {
    if (availableFormulas.length === 1) {
      setSelectedFormula(availableFormulas[0].id);
    } else if (availableFormulas.length > 1 && !selectedFormula) {
      // If multiple formulas available, let user choose
      setSelectedFormula('');
    }
  }, [availableFormulas, selectedFormula]);



  const addProperty = () => {
    const newProperty: Property = {
      id: Date.now().toString(),
      name: `Property ${properties.length + 1}`,
      propertyValueAtOrigination: 0,
      actualEnergyConsumption: 0,
      actualEnergyConsumptionUnit: 'MWh',
      supplierSpecificEmissionFactor: 0,
      supplierSpecificEmissionFactorUnit: 'tCO2e/MWh',
      averageEmissionFactor: 0,
      averageEmissionFactorUnit: 'tCO2e/MWh',
      estimatedEnergyConsumptionFromLabels: 0,
      estimatedEnergyConsumptionFromLabelsUnit: 'MWh',
      estimatedEnergyConsumptionFromStatistics: 0,
      estimatedEnergyConsumptionFromStatisticsUnit: 'MWh',
      floorArea: 0
    };
    setProperties([...properties, newProperty]);
  };

  const removeProperty = (id: string) => {
    if (properties.length > 1) {
      setProperties(properties.filter(property => property.id !== id));
    }
  };

  const updateProperty = (id: string, field: keyof Property, value: string | number) => {
    setProperties(properties.map(property => 
      property.id === id ? { ...property, [field]: value } : property
    ));
  };


  const updateFormData = (field: string, value: number) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value } as typeof prev;
      if (loanType) {
        persistCurrentLoanForm(loanType, next);
      }
      
      // If this is the first loan and it's an EVIC-related field, update sharedCompanyData
      if (propLoanTypes.length > 1 && currentLoanIndex === 0) {
        const evicFields = ['sharePrice', 'outstandingShares', 'totalDebt', 'minorityInterest', 'preferredStock', 'totalEquity'];
        if (evicFields.includes(field)) {
          setSharedCompanyData(prev => ({ ...prev, [field]: value }));
        }
      }
      
      return next;
    });
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

  const calculateSingleLoan = (loanTypeKey: string, loanFormData: typeof formData) => {
    const useShared = propLoanTypes.length > 1;
    const formulas = getAvailableFormulasForLoan(loanTypeKey);
    const selectedId = formulas.length === 1 ? formulas[0].id : selectedFormula; // fallback to current selection if multiple
    if (!selectedId) {
      throw new Error('No formula selected for ' + (typeLabels[loanTypeKey] || loanTypeKey));
    }

    // Calculate totals for mortgages if applicable (uses current properties state for mortgages only)
    const totalPropertyValueAtOrigination = loanTypeKey === 'mortgage'
      ? properties.reduce((sum, property) => sum + property.propertyValueAtOrigination, 0)
      : 0;
    const totalActualEnergyConsumption = loanTypeKey === 'mortgage'
      ? properties.reduce((sum, property) => sum + smartConvertUnit(property.actualEnergyConsumption, property.actualEnergyConsumptionUnit), 0)
      : 0;
    const totalFloorArea = loanTypeKey === 'mortgage'
      ? properties.reduce((sum, property) => sum + property.floorArea, 0)
      : 0;
    const totalEstimatedEnergyFromLabels = loanTypeKey === 'mortgage'
      ? properties.reduce((sum, property) => sum + smartConvertUnit(property.estimatedEnergyConsumptionFromLabels, property.estimatedEnergyConsumptionFromLabelsUnit), 0)
      : 0;
    const totalEstimatedEnergyFromStatistics = loanTypeKey === 'mortgage'
      ? properties.reduce((sum, property) => sum + smartConvertUnit(property.estimatedEnergyConsumptionFromStatistics, property.estimatedEnergyConsumptionFromStatisticsUnit), 0)
      : 0;

    const weightedAverageSupplierEmissionFactor = loanTypeKey === 'mortgage' && totalActualEnergyConsumption > 0 ? 
      properties.reduce((sum, property) => {
        const convertedEnergy = smartConvertUnit(property.actualEnergyConsumption, property.actualEnergyConsumptionUnit);
        const convertedEmissionFactor = smartConvertUnit(property.supplierSpecificEmissionFactor, property.supplierSpecificEmissionFactorUnit);
        return sum + (convertedEnergy * convertedEmissionFactor);
      }, 0) / totalActualEnergyConsumption : 0;

    const weightedAverageEmissionFactor = loanTypeKey === 'mortgage' && totalActualEnergyConsumption > 0 ? 
      properties.reduce((sum, property) => {
        const convertedEnergy = smartConvertUnit(property.actualEnergyConsumption, property.actualEnergyConsumptionUnit);
        const convertedEmissionFactor = smartConvertUnit(property.averageEmissionFactor, property.averageEmissionFactorUnit);
        return sum + (convertedEnergy * convertedEmissionFactor);
      }, 0) / totalActualEnergyConsumption : 0;

    // Validate minimal fields per type (keep existing validations brief here)
    if (loanTypeKey === 'mortgage') {
      if (totalPropertyValueAtOrigination === 0) throw new Error('Property value at origination must be greater than 0.');
      if ((loanFormData.outstandingLoan || 0) === 0) throw new Error('Outstanding loan amount must be greater than 0.');
    }

    // Calculate total assets value based on corporate structure (use shared when multi)
    const totalAssetsValue = corporateStructure === 'listed' ? 
      ((useShared ? sharedCompanyData.sharePrice : loanFormData.sharePrice) || 0) * ((useShared ? sharedCompanyData.outstandingShares : loanFormData.outstandingShares) || 0) + ((useShared ? sharedCompanyData.totalDebt : loanFormData.totalDebt) || 0) + ((useShared ? sharedCompanyData.minorityInterest : loanFormData.minorityInterest) || 0) + ((useShared ? sharedCompanyData.preferredStock : loanFormData.preferredStock) || 0) :
      ((useShared ? sharedCompanyData.totalDebt : loanFormData.totalDebt) || 0) + ((useShared ? sharedCompanyData.totalEquity : loanFormData.totalEquity) || 0);

    const pcafInputs = {
      outstanding_amount: loanFormData.outstandingLoan,
      total_assets: totalAssetsValue,
      evic: corporateStructure === 'listed' ? totalAssetsValue : totalAssetsValue,
      total_equity_plus_debt: totalAssetsValue,
      sharePrice: (useShared ? sharedCompanyData.sharePrice : loanFormData.sharePrice) || 0,
      outstandingShares: (useShared ? sharedCompanyData.outstandingShares : loanFormData.outstandingShares) || 0,
      totalDebt: (useShared ? sharedCompanyData.totalDebt : loanFormData.totalDebt) || 0,
      minorityInterest: (useShared ? sharedCompanyData.minorityInterest : loanFormData.minorityInterest) || 0,
      preferredStock: (useShared ? sharedCompanyData.preferredStock : loanFormData.preferredStock) || 0,
      totalEquity: corporateStructure === 'unlisted' ? ((useShared ? sharedCompanyData.totalEquity : loanFormData.totalEquity) || 0) : 0,
      totalProjectEquity: loanFormData.totalProjectEquity || 0,
      totalProjectDebt: loanFormData.totalProjectDebt || 0,
      ppp_adjustment_factor: loanFormData.ppp_adjustment_factor || 0,
      gdp: loanFormData.gdp || 0,
      verified_country_emissions: smartConvertUnit(loanFormData.verified_country_emissions || 0, loanFormData.verified_emissionsUnit),
      unverified_country_emissions: smartConvertUnit(loanFormData.unverified_country_emissions || 0, loanFormData.unverified_emissionsUnit),
      total_value_at_origination: loanFormData.total_value_at_origination || 0,
      fuel_consumption: smartConvertUnit(loanFormData.fuel_consumption || 0, loanFormData.fuel_consumption_unit),
      distance_traveled: loanFormData.distance_traveled || 0,
      efficiency: loanFormData.efficiency || 0,
      vehicle_emission_factor: smartConvertUnit(loanFormData.vehicle_emission_factor || 0, loanFormData.vehicle_emission_factor_unit),
      verified_emissions: smartConvertUnit(loanFormData.verified_emissions || 0, loanFormData.verified_emissionsUnit),
      unverified_emissions: smartConvertUnit(loanFormData.unverified_emissions || 0, loanFormData.unverified_emissionsUnit),
      energy_consumption: loanFormData.energyConsumption || 0,
      emission_factor: loanFormData.emission_factor || 0,
      production: loanFormData.production || 0,
      sector_emissions: loanFormData.sectorEmissions || 0,
      sector_revenue: loanFormData.sectorRevenue || 0,
      sector_assets: loanFormData.sectorAssets || 0,
      asset_turnover_ratio: loanFormData.assetTurnoverRatio || 0,
      property_value: loanFormData.property_value || 0,
      property_value_at_origination: loanTypeKey === 'mortgage' ? totalPropertyValueAtOrigination : (loanFormData.property_value_at_origination || 0),
      actual_energy_consumption: loanTypeKey === 'mortgage' ? totalActualEnergyConsumption : smartConvertUnit(loanFormData.actual_energy_consumption || 0, loanFormData.actual_energy_consumption_unit),
      supplier_specific_emission_factor: loanTypeKey === 'mortgage' ? weightedAverageSupplierEmissionFactor : smartConvertUnit(loanFormData.supplier_specific_emission_factor || 0, loanFormData.supplier_specific_emission_factor_unit),
      average_emission_factor: loanTypeKey === 'mortgage' ? weightedAverageEmissionFactor : smartConvertUnit(loanFormData.average_emission_factor || 0, loanFormData.average_emission_factor_unit),
      estimated_energy_consumption_from_labels: loanTypeKey === 'mortgage' ? totalEstimatedEnergyFromLabels : smartConvertUnit(loanFormData.estimated_energy_consumption_from_labels || 0, loanFormData.estimated_energy_consumption_from_labels_unit),
      estimated_energy_consumption_from_statistics: loanTypeKey === 'mortgage' ? totalEstimatedEnergyFromStatistics : smartConvertUnit(loanFormData.estimated_energy_consumption_from_statistics || 0, loanFormData.estimated_energy_consumption_from_statistics_unit),
      floor_area: loanTypeKey === 'mortgage' ? totalFloorArea : (loanFormData.floor_area || 0)
    } as Record<string, any>;

    const pcafResult = calculationEngine.calculate(selectedId, pcafInputs, companyType);

    let denominatorValue: number;
    let denominatorLabel: string;
    if (loanTypeKey === 'mortgage') {
      denominatorValue = totalPropertyValueAtOrigination;
      denominatorLabel = 'Total Property Value at Origination';
    } else if (loanTypeKey === 'sovereign-debt') {
      const pppAdjustedGDP = (loanFormData.ppp_adjustment_factor || 0) * (loanFormData.gdp || 0);
      denominatorValue = pppAdjustedGDP;
      denominatorLabel = 'PPP-adjusted GDP';
    } else if (loanTypeKey === 'motor-vehicle-loan') {
      denominatorValue = loanFormData.total_value_at_origination || 0;
      denominatorLabel = 'Total Value at Origination';
    } else if (loanTypeKey === 'commercial-real-estate') {
      denominatorValue = loanFormData.property_value_at_origination || 0;
      denominatorLabel = 'Property Value at Origination';
    } else if (loanTypeKey === 'project-finance') {
      denominatorValue = (loanFormData.totalProjectEquity || 0) + (loanFormData.totalProjectDebt || 0);
      denominatorLabel = 'Total Project Equity + Debt';
    } else if (corporateStructure === 'listed') {
      const marketCap = ((useShared ? sharedCompanyData.sharePrice : loanFormData.sharePrice) || 0) * ((useShared ? sharedCompanyData.outstandingShares : loanFormData.outstandingShares) || 0);
      denominatorValue = marketCap + ((useShared ? sharedCompanyData.totalDebt : loanFormData.totalDebt) || 0) + ((useShared ? sharedCompanyData.minorityInterest : loanFormData.minorityInterest) || 0) + ((useShared ? sharedCompanyData.preferredStock : loanFormData.preferredStock) || 0);
      denominatorLabel = 'EVIC';
    } else {
      denominatorValue = ((useShared ? sharedCompanyData.totalEquity : loanFormData.totalEquity) || 0) + ((useShared ? sharedCompanyData.totalDebt : loanFormData.totalDebt) || 0);
      denominatorLabel = 'Total Equity + Debt';
    }

    return {
      attributionFactor: pcafResult.attributionFactor,
      financeEmission: pcafResult.financedEmissions,
      denominatorLabel,
      denominatorValue
    };
  };

  const calculateFinanceEmission = () => {
    if (!selectedFormula) {
      toast({
        title: "No Formula Selected",
        description: "Please select a calculation formula first.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Single-loan detailed calculation (kept for current view and validations)
      const totalPropertyValueAtOrigination = properties.reduce((sum, property) => sum + property.propertyValueAtOrigination, 0);
      const totalActualEnergyConsumption = properties.reduce((sum, property) => 
        sum + smartConvertUnit(property.actualEnergyConsumption, property.actualEnergyConsumptionUnit), 0);
      const totalFloorArea = properties.reduce((sum, property) => sum + property.floorArea, 0);
      const totalEstimatedEnergyFromLabels = properties.reduce((sum, property) => 
        sum + smartConvertUnit(property.estimatedEnergyConsumptionFromLabels, property.estimatedEnergyConsumptionFromLabelsUnit), 0);
      const totalEstimatedEnergyFromStatistics = properties.reduce((sum, property) => 
        sum + smartConvertUnit(property.estimatedEnergyConsumptionFromStatistics, property.estimatedEnergyConsumptionFromStatisticsUnit), 0);
      
      // Calculate weighted average emission factors for multiple properties with unit conversion
      const weightedAverageSupplierEmissionFactor = totalActualEnergyConsumption > 0 ? 
        properties.reduce((sum, property) => {
          const convertedEnergy = smartConvertUnit(property.actualEnergyConsumption, property.actualEnergyConsumptionUnit);
          const convertedEmissionFactor = smartConvertUnit(property.supplierSpecificEmissionFactor, property.supplierSpecificEmissionFactorUnit);
          return sum + (convertedEnergy * convertedEmissionFactor);
        }, 0) / totalActualEnergyConsumption : 0;
      
      const weightedAverageEmissionFactor = totalActualEnergyConsumption > 0 ? 
        properties.reduce((sum, property) => {
          const convertedEnergy = smartConvertUnit(property.actualEnergyConsumption, property.actualEnergyConsumptionUnit);
          const convertedEmissionFactor = smartConvertUnit(property.averageEmissionFactor, property.averageEmissionFactorUnit);
          return sum + (convertedEnergy * convertedEmissionFactor);
        }, 0) / totalActualEnergyConsumption : 0;

      // Validate data based on loan type
      if (loanType === 'mortgage') {
        if (totalPropertyValueAtOrigination === 0) {
          throw new Error('Property value at origination must be greater than 0. Please enter property values.');
        }
        if (formData.outstandingLoan === 0) {
          throw new Error('Outstanding loan amount must be greater than 0. Please enter the loan amount.');
        }
        
        // Check for required data based on selected formula
        const formula = getCurrentFormula();
        if (formula?.optionCode === '1a' || formula?.optionCode === '1b') {
          if (totalActualEnergyConsumption === 0) {
            throw new Error('Actual energy consumption must be greater than 0. Please enter energy consumption data for your properties.');
          }
        }
        if (formula?.optionCode === '2a' || formula?.optionCode === '2b') {
          if (totalFloorArea === 0) {
            throw new Error('Floor area must be greater than 0. Please enter floor area data for your properties.');
          }
        }
      } else if (loanType === 'commercial-real-estate') {
        if (formData.property_value_at_origination === 0) {
          throw new Error('Property value at origination must be greater than 0. Please enter the property value.');
        }
        if (formData.outstandingLoan === 0) {
          throw new Error('Outstanding loan amount must be greater than 0. Please enter the loan amount.');
        }
        
        const formula = getCurrentFormula();
        if (formula?.optionCode === '1a' || formula?.optionCode === '1b') {
          if (formData.actual_energy_consumption === 0) {
            throw new Error('Actual energy consumption must be greater than 0. Please enter energy consumption data.');
          }
        }
        if (formula?.optionCode === '2a' || formula?.optionCode === '2b') {
          if (formData.floor_area === 0) {
            throw new Error('Floor area must be greater than 0. Please enter the floor area.');
          }
        }
      } else if (loanType === 'motor-vehicle-loan') {
        // DEBUG: Log motor vehicle loan validation values
        console.log('🔍 MOTOR VEHICLE LOAN DEBUG - Loan Type:', loanType);
        console.log('🔍 MOTOR VEHICLE LOAN DEBUG - Total Value at Origination:', formData.total_value_at_origination);
        console.log('🔍 MOTOR VEHICLE LOAN DEBUG - Distance Traveled:', formData.distance_traveled);
        console.log('🔍 MOTOR VEHICLE LOAN DEBUG - Fuel Efficiency:', formData.efficiency);
        console.log('🔍 MOTOR VEHICLE LOAN DEBUG - Vehicle Emission Factor:', formData.vehicle_emission_factor);
        console.log('🔍 MOTOR VEHICLE LOAN DEBUG - Outstanding Loan:', formData.outstandingLoan);
        console.log('🔍 MOTOR VEHICLE LOAN DEBUG - Selected Formula:', getCurrentFormula()?.name);
        console.log('🔍 MOTOR VEHICLE LOAN DEBUG - Full Form Data:', formData);
        
        if (formData.total_value_at_origination === 0) {
          console.log('❌ MOTOR VEHICLE LOAN VALIDATION - Total Value at Origination validation failed!');
          throw new Error('Total value at origination must be greater than 0. Please enter the vehicle value.');
        }
        if (formData.outstandingLoan === 0) {
          console.log('❌ MOTOR VEHICLE LOAN VALIDATION - Outstanding Loan validation failed!');
          throw new Error('Outstanding loan amount must be greater than 0. Please enter the loan amount.');
        }
      } else if (loanType === 'sovereign-debt') {
        // DEBUG: Log sovereign debt validation values
        console.log('🔍 SOVEREIGN DEBT DEBUG - Loan Type:', loanType);
        console.log('🔍 SOVEREIGN DEBT DEBUG - PPP Adjustment Factor:', formData.ppp_adjustment_factor);
        console.log('🔍 SOVEREIGN DEBT DEBUG - GDP:', formData.gdp);
        console.log('🔍 SOVEREIGN DEBT DEBUG - Outstanding Loan:', formData.outstandingLoan);
        console.log('🔍 SOVEREIGN DEBT DEBUG - Verified Country Emissions:', formData.verified_country_emissions);
        console.log('🔍 SOVEREIGN DEBT DEBUG - Unverified Country Emissions:', formData.unverified_country_emissions);
        console.log('🔍 SOVEREIGN DEBT DEBUG - Selected Formula:', getCurrentFormula()?.name);
        console.log('🔍 SOVEREIGN DEBT DEBUG - Full Form Data:', formData);
        
        if (formData.gdp === 0) {
          console.log('❌ SOVEREIGN DEBT VALIDATION - GDP validation failed!');
          throw new Error('GDP must be greater than 0. Please enter the country GDP.');
        }
        if (formData.ppp_adjustment_factor === 0) {
          console.log('❌ SOVEREIGN DEBT VALIDATION - PPP Adjustment Factor validation failed!');
          throw new Error('PPP adjustment factor must be greater than 0. Please enter the PPP adjustment factor.');
        }
        if (formData.outstandingLoan === 0) {
          console.log('❌ SOVEREIGN DEBT VALIDATION - Outstanding Loan validation failed!');
          throw new Error('Outstanding loan amount must be greater than 0. Please enter the loan amount.');
        }
      }

      // Calculate total assets value based on corporate structure (use shared data when multiple loan types)
      const useShared = propLoanTypes.length > 1;
      const totalAssetsValue = corporateStructure === 'listed' ? 
        ((useShared ? sharedCompanyData.sharePrice : formData.sharePrice) || 0) * ((useShared ? sharedCompanyData.outstandingShares : formData.outstandingShares) || 0) + ((useShared ? sharedCompanyData.totalDebt : formData.totalDebt) || 0) + ((useShared ? sharedCompanyData.minorityInterest : formData.minorityInterest) || 0) + ((useShared ? sharedCompanyData.preferredStock : formData.preferredStock) || 0) :
        ((useShared ? sharedCompanyData.totalDebt : formData.totalDebt) || 0) + ((useShared ? sharedCompanyData.totalEquity : formData.totalEquity) || 0);

      // Prepare inputs for PCAF calculation
      const pcafInputs = {
        outstanding_amount: formData.outstandingLoan,
        total_assets: totalAssetsValue, // Use calculated Total Assets for attribution factor
        evic: corporateStructure === 'listed' ? 
          totalAssetsValue : // Use calculated EVIC for listed companies
          totalAssetsValue, // For unlisted companies, use total assets as EVIC equivalent
        total_equity_plus_debt: totalAssetsValue, // Use calculated total assets for both listed and unlisted
        // Add individual fields for EVIC calculation (required by calculateEVIC function)
        sharePrice: (useShared ? sharedCompanyData.sharePrice : formData.sharePrice) || 0,
        outstandingShares: (useShared ? sharedCompanyData.outstandingShares : formData.outstandingShares) || 0,
        totalDebt: (useShared ? sharedCompanyData.totalDebt : formData.totalDebt) || 0,
        minorityInterest: (useShared ? sharedCompanyData.minorityInterest : formData.minorityInterest) || 0,
        preferredStock: (useShared ? sharedCompanyData.preferredStock : formData.preferredStock) || 0,
        // Add individual fields for unlisted companies
        totalEquity: corporateStructure === 'unlisted' ? ((useShared ? sharedCompanyData.totalEquity : formData.totalEquity) || 0) : 0,
        // Add Project Finance specific fields
        totalProjectEquity: formData.totalProjectEquity || 0,
        totalProjectDebt: formData.totalProjectDebt || 0,
        // Add Sovereign Debt specific fields
        ppp_adjustment_factor: formData.ppp_adjustment_factor || 0,
        gdp: formData.gdp || 0,
        verified_country_emissions: smartConvertUnit(formData.verified_country_emissions || 0, formData.verified_emissionsUnit),
        unverified_country_emissions: smartConvertUnit(formData.unverified_country_emissions || 0, formData.unverified_emissionsUnit),
        // Add Motor Vehicle Loan specific fields
        total_value_at_origination: formData.total_value_at_origination || 0,
        fuel_consumption: smartConvertUnit(formData.fuel_consumption || 0, formData.fuel_consumption_unit),
        distance_traveled: formData.distance_traveled || 0,
        efficiency: formData.efficiency || 0,
        vehicle_emission_factor: smartConvertUnit(formData.vehicle_emission_factor || 0, formData.vehicle_emission_factor_unit),
        verified_emissions: smartConvertUnit(formData.verified_emissions || 0, formData.verified_emissionsUnit),
        unverified_emissions: smartConvertUnit(formData.unverified_emissions || 0, formData.unverified_emissionsUnit),
        energy_consumption: formData.energyConsumption || 0,
        emission_factor: formData.emission_factor || 0,
        production: formData.production || 0,
        sector_emissions: formData.sectorEmissions || 0,
        sector_revenue: formData.sectorRevenue || 0,
        sector_assets: formData.sectorAssets || 0,
        asset_turnover_ratio: formData.assetTurnoverRatio || 0,
        property_value: formData.property_value || 0,
        // Mortgage-specific inputs (aggregated from multiple properties)
        property_value_at_origination: loanType === 'mortgage' ? totalPropertyValueAtOrigination : (formData.property_value_at_origination || 0),
        actual_energy_consumption: loanType === 'mortgage' ? totalActualEnergyConsumption : smartConvertUnit(formData.actual_energy_consumption || 0, formData.actual_energy_consumption_unit),
        supplier_specific_emission_factor: loanType === 'mortgage' ? weightedAverageSupplierEmissionFactor : smartConvertUnit(formData.supplier_specific_emission_factor || 0, formData.supplier_specific_emission_factor_unit),
        average_emission_factor: loanType === 'mortgage' ? weightedAverageEmissionFactor : smartConvertUnit(formData.average_emission_factor || 0, formData.average_emission_factor_unit),
        estimated_energy_consumption_from_labels: loanType === 'mortgage' ? totalEstimatedEnergyFromLabels : smartConvertUnit(formData.estimated_energy_consumption_from_labels || 0, formData.estimated_energy_consumption_from_labels_unit),
        estimated_energy_consumption_from_statistics: loanType === 'mortgage' ? totalEstimatedEnergyFromStatistics : smartConvertUnit(formData.estimated_energy_consumption_from_statistics || 0, formData.estimated_energy_consumption_from_statistics_unit),
        floor_area: loanType === 'mortgage' ? totalFloorArea : (formData.floor_area || 0)
      };


      // DEBUG: Log PCAF inputs before calculation
      console.log('🔍 PCAF CALCULATION DEBUG - Selected Formula ID:', selectedFormula);
      console.log('🔍 PCAF CALCULATION DEBUG - PCAF Inputs:', pcafInputs);
      console.log('🔍 PCAF CALCULATION DEBUG - Company Type:', companyType);
      
      const pcafResult = calculationEngine.calculate(selectedFormula, pcafInputs, companyType);
      
      // Calculate the appropriate denominator based on company type
      let denominatorValue: number;
      let denominatorLabel: string;
      
      if (loanType === 'mortgage') {
        // For mortgages: Total Property Value at Origination (sum of all properties)
        denominatorValue = totalPropertyValueAtOrigination;
        denominatorLabel = 'Total Property Value at Origination';
      } else if (loanType === 'sovereign-debt') {
        // For sovereign debt: PPP-adjusted GDP (calculated from PPP factor × GDP)
        const pppAdjustedGDP = (formData.ppp_adjustment_factor || 0) * (formData.gdp || 0);
        denominatorValue = pppAdjustedGDP;
        denominatorLabel = 'PPP-adjusted GDP';
      } else if (loanType === 'motor-vehicle-loan') {
        // For motor vehicle loans: Total Value at Origination
        denominatorValue = formData.total_value_at_origination || 0;
        denominatorLabel = 'Total Value at Origination';
      } else if (loanType === 'commercial-real-estate') {
        // For commercial real estate: Property Value at Origination
        denominatorValue = formData.property_value_at_origination || 0;
        denominatorLabel = 'Property Value at Origination';
      } else if (loanType === 'project-finance') {
        // For project finance: Total Project Equity + Debt (regardless of listing status)
        denominatorValue = (formData.totalProjectEquity || 0) + (formData.totalProjectDebt || 0);
        denominatorLabel = 'Total Project Equity + Debt';
      } else if (corporateStructure === 'listed') {
        // For listed companies: EVIC = Market Capitalization + Total Debt + Minority Interest + Preferred Stock
        const marketCap = ((useShared ? sharedCompanyData.sharePrice : formData.sharePrice) || 0) * ((useShared ? sharedCompanyData.outstandingShares : formData.outstandingShares) || 0);
        denominatorValue = marketCap + ((useShared ? sharedCompanyData.totalDebt : formData.totalDebt) || 0) + ((useShared ? sharedCompanyData.minorityInterest : formData.minorityInterest) || 0) + ((useShared ? sharedCompanyData.preferredStock : formData.preferredStock) || 0);
        denominatorLabel = 'EVIC';
      } else {
        // For unlisted companies: Total Equity + Debt
        denominatorValue = ((useShared ? sharedCompanyData.totalEquity : formData.totalEquity) || 0) + ((useShared ? sharedCompanyData.totalDebt : formData.totalDebt) || 0);
        denominatorLabel = 'Total Equity + Debt';
      }
      
      // Total Product Output (for non-mortgage loans) or Total Property Value (for mortgages) or PPP-adjusted GDP (for sovereign debt) or Vehicle Value (for motor vehicle loans)
      const totalProductOutput = loanType === 'mortgage' ? 
        totalPropertyValueAtOrigination : 
        loanType === 'sovereign-debt' ?
        ((formData.ppp_adjustment_factor || 0) * (formData.gdp || 0)) :
        loanType === 'motor-vehicle-loan' ?
        (formData.total_value_at_origination || 0) :
        loanType === 'commercial-real-estate' ?
        (formData.property_value_at_origination || 0) :
        0; // No products section anymore

    const calculationResult: CalculationResult = {
        attributionFactor: pcafResult.attributionFactor,
        financeEmission: pcafResult.financedEmissions,
      totalProductOutput: totalProductOutput,
        evic: denominatorValue, // Store the appropriate denominator value
        dataQualityScore: pcafResult.dataQualityScore,
        methodology: pcafResult.methodology,
        calculationSteps: pcafResult.calculationSteps
    };

      setResult(calculationResult);

      // Multi-loan: iterate and compute per-loan results when more than one selected
      if (propLoanTypes.length > 1) {
        const results: Array<{ type: string; label: string; attributionFactor: number; financeEmission: number; denominatorLabel: string; denominatorValue: number }> = [];
        for (const lt of propLoanTypes) {
          const ltKey = lt.type;
          const saved = perLoanFormData[ltKey] || formData; // fall back to current formData
          try {
            const r = calculateSingleLoan(ltKey, saved);
            results.push({
              type: ltKey,
              label: typeLabels[ltKey] || ltKey,
              attributionFactor: r.attributionFactor,
              financeEmission: r.financeEmission,
              denominatorLabel: r.denominatorLabel,
              denominatorValue: r.denominatorValue
            });
          } catch (e) {
            console.warn('Failed to calculate for loan type', ltKey, e);
          }
        }
        setMultiResults(results);
        // Persist state so navigating back restores values
        try {
          sessionStorage.setItem('financeCalculatorState', JSON.stringify({
            perLoanFormData,
            sharedCompanyData,
            properties,
            formData,
            selectedFormula,
            currentLoanIndex,
            ts: Date.now()
          }));
        } catch {}
        if (onResults) {
          onResults(results.map(r => ({
            type: r.type,
            label: r.label,
            attributionFactor: r.attributionFactor,
            financedEmissions: r.financeEmission,
            denominatorLabel: r.denominatorLabel,
            denominatorValue: r.denominatorValue
          })));
        }
      } else {
        setMultiResults([]);
        // Persist state for single-loan as well
        try {
          sessionStorage.setItem('financeCalculatorState', JSON.stringify({
            perLoanFormData,
            sharedCompanyData,
            properties,
            formData,
            selectedFormula,
            currentLoanIndex,
            ts: Date.now()
          }));
        } catch {}
        if (onResults) {
          onResults([
            {
              type: loanType,
              label: typeLabels[loanType] || loanType,
              attributionFactor: calculationResult.attributionFactor,
              financedEmissions: calculationResult.financeEmission,
              denominatorLabel: (loanType === 'mortgage' ? 'Total Property Value at Origination' : loanType === 'sovereign-debt' ? 'PPP-adjusted GDP' : loanType === 'motor-vehicle-loan' ? 'Total Value at Origination' : loanType === 'commercial-real-estate' ? 'Property Value at Origination' : corporateStructure === 'listed' ? 'EVIC' : 'Total Equity + Debt'),
              denominatorValue: calculationResult.evic
            }
          ]);
        }
      }
    
    toast({
        title: "PCAF Calculation Complete",
        description: `Finance emission calculated using ${pcafResult.methodology}`,
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

  // Unit conversion using centralized utility

  const renderDynamicInputs = () => {
    const formula = getCurrentFormula();
    if (!formula) return null;

    // Fields that are already captured in other sections
    const duplicateFields = [
      'outstanding_amount', 
      'evic', 
      'total_equity_plus_debt', 
      'total_assets',
      // Project finance fields (handled in main form)
      'totalProjectEquity',
      'totalProjectDebt',
      // Sovereign debt fields (handled by SovereignDebtForm)
      'ppp_adjustment_factor',
      'gdp',
      'verified_country_emissions',
      'unverified_country_emissions',
      'energy_consumption',
      'emission_factor',
      // Motor vehicle loan fields (handled by MotorVehicleLoanForm)
      'total_value_at_origination',
      'fuel_consumption',
      'distance_traveled',
      'efficiency',
      'vehicle_emission_factor',
      // Commercial real estate fields (handled by CommercialRealEstateForm)
      'property_value_at_origination',
      'actual_energy_consumption',
      'supplier_specific_emission_factor',
      'average_emission_factor',
      'estimated_energy_consumption_from_labels',
      'estimated_energy_consumption_from_statistics',
      'floor_area'
    ];

    return formula.inputs
      .filter(input => !duplicateFields.includes(input.name)) // Remove duplicate fields
      .map((input) => {
        const fieldName = input.name;
        const fieldValue = formData[fieldName as keyof typeof formData] || '';
        const unitFieldName = `${fieldName}Unit`;
        const unitValue = formData[unitFieldName as keyof typeof formData] || input.unit || '';

        return (
          <div key={input.name} className="space-y-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor={input.name}>
                    {input.label} {input.required && <span className="text-red-500">*</span>}
                  </Label>
                  {input.description && (
                    <FieldTooltip content={input.description} />
                  )}
                </div>
                <Input
                  id={input.name}
                  type="number"
                  placeholder="0"
                  value={fieldValue}
                  onChange={(e) => updateFormData(fieldName, parseFloat(e.target.value) || 0)}
                  className="mt-1"
                  required={input.required}
                />
              </div>
              {input.unitOptions && (
                <div className="w-48">
                  <Label htmlFor={unitFieldName}>Unit</Label>
                  <Select value={String(unitValue)} onValueChange={(value) => updateFormData(unitFieldName, value as any)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {input.unitOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        );
    });
  };


  return (
    <div className="space-y-6">
      {/* Show content based on active tab */}
      {activeTab === 'finance' && (
        <>
          {/* Current loan type heading */}
          {loanType && (
            <div className="pb-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {(typeLabels[loanType] || loanType)} Form
              </h3>
            </div>
          )}
          {/* Removed top pill navigation for cleaner UI */}
          {/* Selected Loan Types Display */}
          {propLoanTypes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Selected Loan Types
                </CardTitle>
                <CardDescription>
                  You are calculating emissions for the following loan types:
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {propLoanTypes.map((loanTypeItem, index) => {
                    const typeLabels: { [key: string]: string } = {
                      'corporate-bond': 'Corporate Bond',
                      'business-loan': 'Business Loan',
                      'project-finance': 'Project Finance',
                      'mortgage': 'Mortgage',
                      'sovereign-debt': 'Sovereign Debt',
                      'motor-vehicle-loan': 'Motor Vehicle Loan',
                      'commercial-real-estate': 'Commercial Real Estate'
                    };
                    return (
                      <Badge key={index} variant="secondary" className="px-3 py-1">
                        {typeLabels[loanTypeItem.type] || loanTypeItem.type} 
                        {loanTypeItem.quantity > 1 && ` (${loanTypeItem.quantity})`}
                      </Badge>
                    );
                  })}
                </div>
                {propLoanTypes.length > 1 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Note: Currently showing form for the first loan type. Multiple loan type support is being developed.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
          {/* Navigation buttons between loan forms (bottom only) */}
          {propLoanTypes.length > 1 && (
            <div className="flex justify-between items-center pt-4">
              <Button
                variant="outline"
                disabled={currentLoanIndex === 0}
                onClick={() => setCurrentLoanIndex(i => Math.max(0, i - 1))}
              >
                Previous Loan
              </Button>
              <div className="text-sm text-gray-600">
                {currentLoanIndex + 1} of {propLoanTypes.length}
              </div>
              <Button
                variant="default"
                disabled={currentLoanIndex >= propLoanTypes.length - 1}
                onClick={() => setCurrentLoanIndex(i => Math.min(propLoanTypes.length - 1, i + 1))}
              >
                Next Loan
              </Button>
            </div>
          )}
        </>
      )}

      {activeTab === 'finance' && (
        <>
          {/* Properties Section - Only for Mortgages */}
          {loanType === 'mortgage' && (
        <MortgageForm
          properties={properties}
          selectedFormula={getCurrentFormula()}
          onAddProperty={addProperty}
          onRemoveProperty={removeProperty}
          onUpdateProperty={updateProperty}
        />
      )}

      {/* Country Data Section - Only for Sovereign Debt */}
      {loanType === 'sovereign-debt' && (
        <SovereignDebtForm
          selectedFormula={getCurrentFormula()}
          formData={formData}
          onUpdateFormData={updateFormData}
        />
      )}

      {/* Vehicle Data Section - Only for Motor Vehicle Loans */}
      {loanType === 'motor-vehicle-loan' && (
        <MotorVehicleLoanForm
          selectedFormula={getCurrentFormula()}
          formData={formData}
          onUpdateFormData={updateFormData}
        />
      )}

      {/* Property Data Section - Only for Commercial Real Estate */}
      {loanType === 'commercial-real-estate' && (
        <CommercialRealEstateForm
          selectedFormula={getCurrentFormula()}
          formData={formData}
          onUpdateFormData={updateFormData}
        />
      )}

      {/* Financial Information - Different for Each Loan Type */}
      {loanType === 'mortgage' ? (
        <MortgageFinancialForm
          outstandingLoan={formData.outstandingLoan}
          onUpdateOutstandingLoan={(value) => updateFormData('outstandingLoan', value)}
        />
      ) : loanType === 'sovereign-debt' ? (
        <SovereignDebtFinancialForm
          outstandingLoan={formData.outstandingLoan}
          onUpdateOutstandingLoan={(value) => updateFormData('outstandingLoan', value)}
        />
      ) : loanType === 'motor-vehicle-loan' ? (
        <MotorVehicleLoanFinancialForm
          outstandingLoan={formData.outstandingLoan}
          onUpdateOutstandingLoan={(value) => updateFormData('outstandingLoan', value)}
        />
      ) : loanType === 'commercial-real-estate' ? (
        <CommercialRealEstateFinancialForm
          outstandingLoan={formData.outstandingLoan}
          onUpdateOutstandingLoan={(value) => updateFormData('outstandingLoan', value)}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Financial Information & EVIC Calculation</CardTitle>
            <CardDescription>
              Enter the core financial data and {corporateStructure === 'listed' ? 'EVIC calculation details' : 'debt and equity information'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Financial Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="outstanding-loan">Outstanding Loan Amount (PKR)</Label>
                  <FieldTooltip content="How much money is currently owed on the loan or investment" />
                </div>
                <FormattedNumberInput
                  id="outstanding-loan"
                  placeholder="0"
                  value={formData.outstandingLoan || 0}
                  onChange={(value) => updateFormData('outstandingLoan', value)}
                  className="mt-1"
                />
                {loanType !== 'project-finance' &&
                  corporateStructure === 'unlisted' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Calculated as Total Debt + Total Equity
                    </p>
                  )}
              </div>
            </div>

          <Separator />

          {/* EVIC Calculation Section - Only show for Corporate Bonds and Business Loans */}
          {loanType === 'corporate-bond' || loanType === 'business-loan' ? (
            <div>
              <h3 className="text-lg font-semibold mb-4">
                {corporateStructure === 'listed' ? 'EVIC Calculation (Enterprise Value Including Cash)' : 'Total Equity + Debt Calculation'}
              </h3>
            {corporateStructure === 'listed' ? (
              // Show full EVIC form only for first loan or single loan
              propLoanTypes.length === 1 || currentLoanIndex === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      {((formData.sharePrice || 0) * (formData.outstandingShares || 0) + (formData.totalDebt || 0) + (formData.minorityInterest || 0) + (formData.preferredStock || 0)).toLocaleString()} PKR
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      (Share Price × Shares) + Total Debt + Minority Interest + Preferred Stock
                    </div>
                  </div>
                </div>
              ) : (
                // Show read-only EVIC display for subsequent loans
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="text-sm font-medium text-muted-foreground mb-2">Shared EVIC (from first loan)</div>
                  <div className="text-xl font-bold text-primary">
                    {((sharedCompanyData.sharePrice || 0) * (sharedCompanyData.outstandingShares || 0) + (sharedCompanyData.totalDebt || 0) + (sharedCompanyData.minorityInterest || 0) + (sharedCompanyData.preferredStock || 0)).toLocaleString()} PKR
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    (Share Price × Shares) + Total Debt + Minority Interest + Preferred Stock
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 text-amber-600">
                    ⚠️ EVIC values are shared across all loans and can only be edited in the first loan form
                  </div>
                </div>
              )
            ) : (
              // Show full form only for first loan or single loan
              propLoanTypes.length === 1 || currentLoanIndex === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      {((formData.totalEquity || 0) + (formData.totalDebt || 0)).toLocaleString()} PKR
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Total Equity + Total Debt
                    </div>
                  </div>
                </div>
              ) : (
                // Show read-only display for subsequent loans
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="text-sm font-medium text-muted-foreground mb-2">Shared Total Equity + Debt (from first loan)</div>
                  <div className="text-xl font-bold text-primary">
                    {((sharedCompanyData.totalEquity || 0) + (sharedCompanyData.totalDebt || 0)).toLocaleString()} PKR
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Total Equity + Total Debt
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 text-amber-600">
                    ⚠️ Equity and Debt values are shared across all loans and can only be edited in the first loan form
                  </div>
                </div>
              )
            )}
            </div>
          ) : loanType === 'project-finance' ? (
            /* Project Finance Section - Total Project Equity + Debt */
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Total Project Equity + Debt Calculation
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="total-project-equity">Total Project Equity (PKR)</Label>
                    <FieldTooltip content="Total equity value invested in the project" />
                  </div>
                  <FormattedNumberInput
                    id="total-project-equity"
                    placeholder="0"
                    value={formData.totalProjectEquity || 0}
                    onChange={(value) => updateFormData('totalProjectEquity', value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="total-project-debt">Total Project Debt (PKR)</Label>
                    <FieldTooltip content="Total debt amount for the project" />
                  </div>
                  <FormattedNumberInput
                    id="total-project-debt"
                    placeholder="0"
                    value={formData.totalProjectDebt || 0}
                    onChange={(value) => updateFormData('totalProjectDebt', value)}
                    className="mt-1"
                  />
                </div>
                <div className="p-4 bg-primary/5 rounded-lg">
                  <div className="text-sm font-medium text-muted-foreground">Total Project Equity + Debt</div>
                  <div className="text-xl font-bold text-primary">
                    {((formData.totalProjectEquity || 0) + (formData.totalProjectDebt || 0)).toLocaleString()} PKR
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Total Project Equity + Total Project Debt
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
      )}

      {/* Auto-Selected Formula Display */}
      {selectedFormula && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Selected PCAF Formula
            </CardTitle>
            <CardDescription>
              Formula automatically selected based on your questionnaire answers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={getDataQualityColor(getCurrentFormula()?.dataQualityScore || 0)}>
                  Score {getCurrentFormula()?.dataQualityScore}
                </Badge>
                <span className="text-sm font-medium text-primary">
                  {getCurrentFormula()?.name}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {getCurrentFormula()?.description}
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                <strong>Based on:</strong> {hasEmissions === 'yes' ? 'Has emissions' : 'No emissions'} 
                {verificationStatus && ` • ${verificationStatus === 'verified' ? 'Verified' : 'Unverified'}`}
                {corporateStructure && ` • ${corporateStructure === 'listed' ? 'Listed Company' : 'Unlisted Company'}`}
                {loanType && ` • ${loanType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}`}
              </div>
              
              {/* Display the actual formula that will be used */}
              {getCurrentFormula()?.metadata?.formula && (
                <div className="mt-3 p-3 bg-muted/50 border border-muted rounded-md">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Formula that will be used:</div>
                  <div className="text-sm font-mono text-foreground bg-background p-2 rounded border">
                    {getCurrentFormula()?.metadata?.formula}
                  </div>
                </div>
              )}
              {getCurrentFormula()?.notes && (
                <div className="mt-3">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Notes:</div>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {getCurrentFormula()?.notes.map((note, index) => (
                      <li key={index} className="flex items-start gap-1">
                        <span className="text-primary">•</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dynamic Form Fields */}
      {(() => {
        const dynamicInputs = renderDynamicInputs();
        return selectedFormula && dynamicInputs && dynamicInputs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Additional Required Data</CardTitle>
              <CardDescription>
                Enter the additional data required for {getCurrentFormula()?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {dynamicInputs}
            </CardContent>
          </Card>
        );
      })()}




      {/* Calculate Button */}
      <div className="flex justify-center">
        <Button
          onClick={calculateFinanceEmission}
          disabled={!selectedFormula}
          className="px-8 py-3"
        >
          <Calculator className="h-5 w-5 mr-2" />
        Calculate Finance Emission
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
                <div className="text-sm font-medium text-muted-foreground">Finance Emission</div>
                <div className="text-2xl font-bold text-primary">{result.financeEmission.toFixed(2)} tCO2e</div>
              </div>
              <div className="p-4 bg-primary/5 rounded-lg">
                <div className="text-sm font-medium text-muted-foreground">
                  {loanType === 'mortgage' ? 'Attribution Factor Denominator' : 
                   loanType === 'sovereign-debt' ? 'PPP-adjusted GDP' :
                   loanType === 'motor-vehicle-loan' ? 'Total Value at Origination' :
                   loanType === 'commercial-real-estate' ? 'Property Value at Origination' :
                   corporateStructure === 'listed' ? 'EVIC' : 'Total Equity + Debt'}
                </div>
                <div className="text-2xl font-bold text-primary">{result.evic.toLocaleString()} PKR</div>
              </div>
              </div>

            {multiResults.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-medium text-muted-foreground">Per-Loan Results</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {multiResults.map((r, idx) => (
                    <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-sm font-medium">{r.label}</div>
                      <div className="text-xs text-muted-foreground">{r.denominatorLabel}: {r.denominatorValue.toLocaleString()} PKR</div>
                      <div className="mt-1 text-sm">
                        <span className="text-muted-foreground">Attribution Factor:</span> <span className="font-semibold">{r.attributionFactor.toFixed(6)}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Finance Emission:</span> <span className="font-semibold">{r.financeEmission.toFixed(2)} tCO2e</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
        </>
      )}

      {activeTab === 'facilitated' && (
        <FacilitatedEmissionForm 
          corporateStructure={corporateStructure}
          hasEmissions={propHasEmissions}
          verificationStatus={propVerificationStatus}
          onCalculationComplete={(result) => {
            // Handle facilitated emission calculation result
            console.log('Facilitated emission result:', result);
          }}
        />
      )}
    </div>
  );
};
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
import { CommercialRealEstatePropertiesForm, CommercialRealEstateProperty as CREProperty } from '../forms/CommercialRealEstatePropertiesForm';
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
  counterpartyId?: string; // Prefer this when provided
  scope1Emissions?: number;
  scope2Emissions?: number;
  scope3Emissions?: number;
  verifiedEmissions?: number;
  unverifiedEmissions?: number;
  activeTab: 'finance' | 'facilitated';
  onTabChange?: (tab: 'finance' | 'facilitated') => void;
  onResults?: (results: Array<{ type: string; label: string; attributionFactor: number; financedEmissions: number; denominatorLabel: string; denominatorValue: number }>, formData?: any) => void;
}

export const FinanceEmissionCalculator: React.FC<FinanceEmissionCalculatorProps> = ({
  hasEmissions: propHasEmissions,
  verificationStatus: propVerificationStatus,
  corporateStructure: propCorporateStructure,
  loanTypes: propLoanTypes = [],
  counterpartyId: propCounterpartyId,
  scope1Emissions: propScope1,
  scope2Emissions: propScope2,
  scope3Emissions: propScope3,
  verifiedEmissions: propVerifiedEmissions,
  unverifiedEmissions: propUnverifiedEmissions,
  activeTab,
  onTabChange,
  onResults
}) => {
  const { toast } = useToast();
  const calculationEngine = new CalculationEngine();
  
  // Build expanded loan instances from quantities (e.g., 2 mortgages => [mortgage#1, mortgage#2])
  const expandedLoanTypes = React.useMemo(() => {
    const list: Array<{ type: string; instance: number; key: string }> = [];
    (propLoanTypes || []).forEach(({ type, quantity }) => {
      const qty = Math.max(1, Number(quantity) || 1);
      for (let i = 0; i < qty; i++) {
        list.push({ type, instance: i + 1, key: `${type}#${i + 1}` });
      }
    });
    return list;
  }, [propLoanTypes]);

  // Support navigating across all loan instances
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

  // Per-loan-instance form data store so duplicate types don't overwrite each other
  const [perLoanFormData, setPerLoanFormData] = useState<Record<string, any>>({});

  const persistCurrentLoanForm = (loanInstanceKey: string, data: any) => {
    if (!loanInstanceKey) return;
    setPerLoanFormData(prev => ({ ...prev, [loanInstanceKey]: data }));
  };

  // Clamp index if the incoming selection shrinks
  useEffect(() => {
    if (currentLoanIndex >= expandedLoanTypes.length) {
      setCurrentLoanIndex(Math.max(0, expandedLoanTypes.length - 1));
    }
  }, [expandedLoanTypes.length]);

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

  // Commercial Real Estate Properties (simpler - only needs property value)
  const [commercialProperties, setCommercialProperties] = useState<CREProperty[]>([
    {
      id: '1',
      name: 'Property 1',
      propertyValueAtOrigination: 0
    }
  ]);
  console.log('🔄 FinanceEmissionCalculator - Initial props:', {
    propVerifiedEmissions,
    propUnverifiedEmissions,
    propHasEmissions,
    propVerificationStatus,
    activeTab,
    propLoanTypes,
    expandedLoanTypes: expandedLoanTypes.length
  });
  
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
    verified_emissions: propVerifiedEmissions || 0,
    unverified_emissions: propUnverifiedEmissions || 0,
    emissions: 0, // Combined Energy Consumption × Emission Factor
    processEmissions: 0,
    production: 0,
    sectorEmissions: 0,
    sectorRevenue: 0,
    sectorAssets: 0,
    assetTurnoverRatio: 0,
    // Sovereign debt specific fields
    pp_adjusted_gdp: 0,
    verified_country_emissions: 0,
    unverified_country_emissions: 0,
    energy_consumption: 0,
    emission_factor: 0,
    // Motor vehicle loan specific fields
    total_value_at_origination: 0,
    total_vehicle_emissions: 0, // Auto-calculated from vehicle details (in kg CO2e)
    fuel_consumption: 0,
    fuel_consumption_unit: 'L',
    distance_traveled: 0,
    efficiency: 0,
    vehicle_emission_factor: 0,
    vehicle_emission_factor_unit: 'tCO2e/L',
    // Commercial real estate specific fields
    property_value_at_origination: 0,
    total_emission: 0, // Total emission from questionnaire (Scope 1 + Scope 2 + Scope 3) = actual energy consumption × supplier specific emission factor
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

  // Save EVIC values to questionnaire for sharing across loan types
  const saveEVICToQuestionnaire = async (evicData: typeof sharedCompanyData) => {
    if (!resolvedCounterpartyId) {
      console.warn('No counterpartyId available for saving EVIC data');
      return;
    }

    try {
      const { PortfolioClient } = await import('@/integrations/supabase/portfolioClient');
      
      // Calculate EVIC and Total Equity + Debt values
      const evic = corporateStructure === 'listed' 
        ? (evicData.sharePrice || 0) * (evicData.outstandingShares || 0) + (evicData.totalDebt || 0) + (evicData.minorityInterest || 0) + (evicData.preferredStock || 0)
        : 0;
      
      const totalEquityPlusDebt = corporateStructure === 'unlisted'
        ? (evicData.totalEquity || 0) + (evicData.totalDebt || 0)
        : 0;

      // Update questionnaire with EVIC data for THIS specific company
      await PortfolioClient.upsertCounterpartyQuestionnaire({
        counterparty_id: resolvedCounterpartyId,
        corporate_structure: corporateStructure,
        has_emissions: false, // This will be updated by the main questionnaire
        scope1_emissions: 0,
        scope2_emissions: 0,
        scope3_emissions: 0,
        verification_status: 'unverified',
        verifier_name: null,
        evic: evic > 0 ? evic : null,
        total_equity_plus_debt: totalEquityPlusDebt > 0 ? totalEquityPlusDebt : null,
        share_price: evicData.sharePrice || null,
        outstanding_shares: evicData.outstandingShares || null,
        total_debt: evicData.totalDebt || null,
        minority_interest: evicData.minorityInterest || null,
        preferred_stock: evicData.preferredStock || null,
        total_equity: evicData.totalEquity || null
      });

      console.log('Saved EVIC data to questionnaire for company:', {
        counterpartyId: resolvedCounterpartyId,
        evic,
        totalEquityPlusDebt,
        corporateStructure,
        evicData
      });
    } catch (error) {
      console.error('Error saving EVIC to questionnaire:', error);
    }
  };

  // Calculate shared EVIC/Total Equity + Debt once and cache it
  const getSharedDenominatorValue = (corporateStructure: string) => {
    // If shared data is empty, try to get it from the first loan
    const hasSharedData = sharedCompanyData.sharePrice > 0 || sharedCompanyData.totalEquity > 0;
    let dataToUse = sharedCompanyData;
    
    if (!hasSharedData && propLoanTypes.length > 1) {
      const firstLoanType = propLoanTypes[0].type;
      const firstLoanData = perLoanFormData[firstLoanType];
      if (firstLoanData) {
        console.log('Shared data empty, using first loan data:', firstLoanData);
        dataToUse = {
          sharePrice: firstLoanData.sharePrice || 0,
          outstandingShares: firstLoanData.outstandingShares || 0,
          totalDebt: firstLoanData.totalDebt || 0,
          minorityInterest: firstLoanData.minorityInterest || 0,
          preferredStock: firstLoanData.preferredStock || 0,
          totalEquity: firstLoanData.totalEquity || 0
        };
      }
    }

    if (corporateStructure === 'listed') {
      // EVIC = Market Cap + Total Debt + Minority Interest + Preferred Stock
      const marketCap = (dataToUse.sharePrice || 0) * (dataToUse.outstandingShares || 0);
      const evic = marketCap + (dataToUse.totalDebt || 0) + (dataToUse.minorityInterest || 0) + (dataToUse.preferredStock || 0);
      console.log('Shared EVIC calculation:', {
        sharePrice: dataToUse.sharePrice,
        outstandingShares: dataToUse.outstandingShares,
        totalDebt: dataToUse.totalDebt,
        minorityInterest: dataToUse.minorityInterest,
        preferredStock: dataToUse.preferredStock,
        marketCap,
        evic,
        dataSource: hasSharedData ? 'sharedData' : 'firstLoanData'
      });
      return evic;
    } else {
      // Total Equity + Debt for unlisted companies
      const totalEquityPlusDebt = (dataToUse.totalEquity || 0) + (dataToUse.totalDebt || 0);
      console.log('Shared Total Equity + Debt calculation:', {
        totalEquity: dataToUse.totalEquity,
        totalDebt: dataToUse.totalDebt,
        totalEquityPlusDebt,
        dataSource: hasSharedData ? 'sharedData' : 'firstLoanData'
      });
      return totalEquityPlusDebt;
    }
  };
  const initialFormDataRef = useRef<any>(null);
  const prevFormulaIdsRef = useRef<string>('');
  
  // Sync shared data when loan index changes
  useEffect(() => {
    syncSharedDataFromAnyLoan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLoanIndex]); // Only depend on currentLoanIndex, not perLoanFormData (object reference changes)

  // Load EVIC values from shared company data when switching loans
  useEffect(() => {
    if (expandedLoanTypes.length > 1) {
      const evicFields = ['sharePrice', 'outstandingShares', 'totalDebt', 'minorityInterest', 'preferredStock', 'totalEquity'];
      const hasSharedEVICData = evicFields.some(field => sharedCompanyData[field] > 0);
      
      if (hasSharedEVICData) {
        setFormData(prev => {
          const updated = { ...prev };
          let hasChanges = false;
          evicFields.forEach(field => {
            if (sharedCompanyData[field] > 0 && prev[field] !== sharedCompanyData[field]) {
              updated[field] = sharedCompanyData[field];
              hasChanges = true;
            }
          });
          // Only return new object if there are actual changes
          return hasChanges ? updated : prev;
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLoanIndex]); // Only depend on currentLoanIndex, not sharedCompanyData (to prevent loops)

  // Removed this useEffect - it was causing infinite loops with sharedCompanyData
  // The shared data is already synced in the above useEffect when currentLoanIndex changes

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
  const currentLoan = expandedLoanTypes.length > 0 ? expandedLoanTypes[currentLoanIndex] : undefined;
  const loanType = currentLoan?.type || '';
  const loanInstanceKey = currentLoan?.key || '';
  // Resolve counterpartyId from prop first, then URL/state
  const resolvedCounterpartyId = (() => {
    if (propCounterpartyId) return propCounterpartyId;
    const urlParams = new URLSearchParams(window.location.search);
    const locationState = (window.location as any).state;
    return (
      urlParams.get('counterpartyId') ||
      locationState?.counterpartyId ||
      locationState?.counterparty ||
      locationState?.id ||
      ''
    );
  })();

  // Debug props
  console.log('FinanceEmissionCalculator props:', {
    propHasEmissions,
    propVerificationStatus,
    propCorporateStructure,
    hasEmissions,
    verificationStatus,
    corporateStructure,
    loanType,
    propCounterpartyId,
    resolvedCounterpartyId,
    propScope1,
    propScope2,
    propScope3
  });

  // When switching loan type: restore saved form if exists; otherwise reset to initial blank
  useEffect(() => {
    if (!loanInstanceKey) return;
    const saved = perLoanFormData[loanInstanceKey];
    if (saved && typeof saved === 'object') {
      setFormData(saved);
    } else if (initialFormDataRef.current) {
      setFormData(initialFormDataRef.current);
    }
  }, [loanInstanceKey, currentLoanIndex]);

  // Always start fresh - no database pre-filling
  useEffect(() => {
    // Only reset when we have valid props to avoid overriding with undefined values
    if (propVerifiedEmissions !== undefined || propUnverifiedEmissions !== undefined) {
      // Clear all data when switching companies - always start fresh
      setSharedCompanyData({
        sharePrice: 0,
        outstandingShares: 0,
        totalDebt: 0,
        minorityInterest: 0,
        preferredStock: 0,
        totalEquity: 0
      });
      
      // Clear form data
      console.log('🔄 FinanceEmissionCalculator - Resetting form data with props:', {
        propVerifiedEmissions,
        propUnverifiedEmissions,
        resolvedCounterpartyId,
        activeTab,
        expandedLoanTypes: expandedLoanTypes.length
      });
      // Reset form data to initial state, preserving existing structure and only updating specific fields
      setFormData(prev => ({
        ...prev, // Preserve all existing fields
        outstandingLoan: 0,
        verified_emissions: propVerifiedEmissions || 0,
        unverified_emissions: propUnverifiedEmissions || 0,
        emissions: 0,
        energyConsumption: 0,
        emissionFactor: 0,
        totalDebt: 0,
        totalEquity: 0,
        minorityInterest: 0,
        preferredStock: 0,
        sharePrice: 0,
        outstandingShares: 0
      }));
      
      // Clear per-loan form data
      setPerLoanFormData({});
      
      console.log('🔄 FinanceEmissionCalculator - Starting fresh for counterparty:', resolvedCounterpartyId);
    }
  }, [resolvedCounterpartyId, propVerifiedEmissions, propUnverifiedEmissions]);

  // No auto-filling - always start fresh

  // Auto-fill total_emission from questionnaire scope emissions for commercial real estate and sovereign debt
  useEffect(() => {
    if (propScope1 === undefined && propScope2 === undefined && propScope3 === undefined) return;
    
    const totalEmission = (propScope1 || 0) + (propScope2 || 0) + (propScope3 || 0);
    
    // Auto-fill for commercial real estate and mortgage loan types (Options 1a, 1b)
    if (loanType === 'commercial-real-estate') {
      setFormData(prev => {
        // Only update if value has changed to prevent infinite loops
        if (prev.total_emission === totalEmission) return prev;
        return {
          ...prev,
          total_emission: totalEmission
        };
      });
    }
    
    // Auto-fill for mortgage loan type (Options 1a and 1b use total_emission from questionnaire)
    if (loanType === 'mortgage') {
      const isOption1a1b = selectedFormula === '1a-mortgage' || selectedFormula === '1b-mortgage';
      if (isOption1a1b) {
        // Update total_emission for all properties (aggregate from scope emissions)
        setProperties(prevProperties => 
          prevProperties.map(property => ({
            ...property,
            totalEmission: totalEmission // Auto-fill from questionnaire (Scope 1 + Scope 2 + Scope 3)
          }))
        );
      }
    }
    
    // Auto-fill for sovereign debt loan type
    // For Option 1a/1b: verified/unverified country emissions (auto-filled from questionnaire)
    // For Option 2a: total_emission (user enters manually - Energy Consumption × Emission Factor)
    if (loanType === 'sovereign-debt') {
      // Only auto-fill verified/unverified for Options 1a/1b (not Option 2a)
      // Option 2a uses total_emission which is entered manually
      const isOption2a = selectedFormula?.includes('2a-sovereign-debt');
      
      if (!isOption2a) {
        // For Options 1a/1b, auto-fill verified and unverified country emissions
        setFormData(prev => {
          // Only update if values have changed to prevent infinite loops
          if (prev.verified_country_emissions === totalEmission && prev.unverified_country_emissions === totalEmission) {
            return prev;
          }
          return {
            ...prev,
            verified_country_emissions: totalEmission,
            unverified_country_emissions: totalEmission
          };
        });
      }
    }
  }, [propScope1, propScope2, propScope3, loanType, selectedFormula]);

  // Always start fresh - no auto-filling from database

  // No auto-saving - data is only saved when user completes the form

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
    // Create stable formula IDs array to prevent unnecessary re-runs
    const formulaIds = availableFormulas.map(f => f.id).join(',');
    
    // Only run if formulas actually changed
    if (formulaIds === prevFormulaIdsRef.current) return;
    prevFormulaIdsRef.current = formulaIds;
    
    if (availableFormulas.length === 1) {
      if (selectedFormula !== availableFormulas[0].id) {
        setSelectedFormula(availableFormulas[0].id);
      }
    } else if (availableFormulas.length > 1 && !selectedFormula) {
      // Auto-select the first formula (2a for hasEmissions="no")
      setSelectedFormula(availableFormulas[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanType, hasEmissions, verificationStatus]); // Only depend on props that affect formula availability



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
      floorArea: 0,
      totalEmission: 0 // For Option 2a: Total emission = Estimated Energy Consumption from Energy Labels × Floor Area × Average Emission Factor
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

  // Commercial Real Estate property management functions
  const addCommercialProperty = () => {
    const newProperty: CREProperty = {
      id: Date.now().toString(),
      name: `Property ${commercialProperties.length + 1}`,
      propertyValueAtOrigination: 0
    };
    setCommercialProperties([...commercialProperties, newProperty]);
  };

  const removeCommercialProperty = (id: string) => {
    if (commercialProperties.length > 1) {
      setCommercialProperties(commercialProperties.filter(property => property.id !== id));
    }
  };

  const updateCommercialProperty = (id: string, field: keyof CREProperty, value: string | number) => {
    setCommercialProperties(commercialProperties.map(property => 
      property.id === id ? { ...property, [field]: value } : property
    ));
  };


  // Get the correct value for EVIC fields (prioritize shared data)
  const getEVICFieldValue = (field: string) => {
    const evicFields = ['sharePrice', 'outstandingShares', 'totalDebt', 'minorityInterest', 'preferredStock', 'totalEquity'];
    if (evicFields.includes(field) && expandedLoanTypes.length > 1) {
      // If we have shared data, use it
      if (sharedCompanyData[field] > 0) {
        return sharedCompanyData[field];
      }
    }
    // Otherwise use form data
    return formData[field] || 0;
  };

  const updateFormData = (field: string, value: number) => {
    // Prevent editing of auto-filled emissions when user has emissions
    if (hasEmissions === 'yes' && (field === 'verified_emissions' || field === 'unverified_emissions')) {
      return;
    }
    setFormData(prev => {
      const next = { ...prev, [field]: value } as typeof prev;
      if (loanInstanceKey) {
        persistCurrentLoanForm(loanInstanceKey, next);
      }
      
      // If this is an EVIC-related field, update ALL loan forms with the same value
      if (expandedLoanTypes.length > 1) {
        const evicFields = ['sharePrice', 'outstandingShares', 'totalDebt', 'minorityInterest', 'preferredStock', 'totalEquity'];
        if (evicFields.includes(field)) {
          console.log('Updating EVIC field across all loans:', { field, value, currentLoanIndex, loanType });
          
          // Update shared company data
          setSharedCompanyData(prev => {
            const updated = { ...prev, [field]: value };
            console.log('Updated shared company data:', updated);
            return updated;
          });
          
          // Update ALL loan forms with the same EVIC value (including current one)
          setPerLoanFormData(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(loanKey => {
              updated[loanKey] = {
                ...updated[loanKey],
                [field]: value
              };
              console.log(`Updated ${loanKey} with ${field}:`, value);
            });
            return updated;
          });
        }
      }
      
      return next;
    });
  };

  // Edit Company Emissions - Navigate to emission calculator with company context
  const editCompanyEmissions = (counterpartyId: string) => {
    // Store company context in session storage
    sessionStorage.setItem('companyEmissionsContext', JSON.stringify({
      counterpartyId,
      returnUrl: window.location.pathname,
      timestamp: Date.now()
    }));
    
    // Navigate to emission calculator
    window.location.href = '/emission-calculator';
  };

  // Sync shared data from any loan that has EVIC data when switching between loans
  const syncSharedDataFromAnyLoan = () => {
    if (expandedLoanTypes.length > 1) {
      const evicFields = ['sharePrice', 'outstandingShares', 'totalDebt', 'minorityInterest', 'preferredStock', 'totalEquity'];
      
      // Find any loan that has EVIC data
      let sourceLoanData = null;
      for (const loanType of expandedLoanTypes) {
        const loanData = perLoanFormData[loanType.key];
        if (loanData) {
          const hasEVICData = evicFields.some(field => loanData[field] && loanData[field] > 0);
          if (hasEVICData) {
            sourceLoanData = loanData;
            console.log('Found EVIC data in loan:', loanType.type, loanData);
            break;
          }
        }
      }
      
      if (sourceLoanData) {
        console.log('Syncing shared data from loan with EVIC data:', sourceLoanData);
        setSharedCompanyData(prev => {
          const updated = { ...prev };
          evicFields.forEach(field => {
            if (sourceLoanData[field] && sourceLoanData[field] > 0) {
              updated[field] = sourceLoanData[field];
            }
          });
          console.log('Synced shared company data:', updated);
          return updated;
        });

        // Also pre-fill the current form with EVIC data if it's empty
        setFormData(prev => {
          const updated = { ...prev };
          evicFields.forEach(field => {
            if (sourceLoanData[field] && sourceLoanData[field] > 0 && (!prev[field] || prev[field] === 0)) {
              updated[field] = sourceLoanData[field];
              console.log(`Pre-filling ${field} with value:`, sourceLoanData[field]);
            }
          });
          return updated;
        });
      }
    }
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

  // Validate that all loan forms are filled when there are multiple loans
  const validateAllLoanForms = (): { isValid: boolean; errors: Array<{ loanKey: string; loanLabel: string; error: string }> } => {
    const errors: Array<{ loanKey: string; loanLabel: string; error: string }> = [];
    
    // If only one loan, validation will happen in calculateFinanceEmission
    if (expandedLoanTypes.length <= 1) {
      return { isValid: true, errors: [] };
    }

    const useShared = expandedLoanTypes.length > 1;

    for (const inst of expandedLoanTypes) {
      const loanData = (perLoanFormData[inst.key] || formData) as typeof formData; // fallback to current formData
      const loanType = inst.type;
      const loanLabel = `${typeLabels[loanType] || loanType} #${inst.instance}`;

      // Check if formula is selected (needed for each loan calculation)
      const formulas = getAvailableFormulasForLoan(loanType);
      const selectedId = formulas.length === 1 ? formulas[0].id : selectedFormula;
      if (!selectedId) {
        errors.push({
          loanKey: inst.key,
          loanLabel,
          error: `Please select a formula for ${loanLabel}`
        });
        continue;
      }

      // Validate based on loan type
      if (loanType === 'mortgage') {
        if (loanData.outstandingLoan === 0 || !loanData.outstandingLoan) {
          errors.push({
            loanKey: inst.key,
            loanLabel,
            error: `Outstanding loan amount is required for ${loanLabel}`
          });
        }
        // Properties validation for mortgage (uses current properties state)
        const totalPropertyValue = properties.reduce((sum, p) => sum + p.propertyValueAtOrigination, 0);
        if (totalPropertyValue === 0) {
          errors.push({
            loanKey: inst.key,
            loanLabel,
            error: `At least one property with value is required for ${loanLabel}`
          });
        }
      } else if (loanType === 'commercial-real-estate') {
        if (loanData.outstandingLoan === 0 || !loanData.outstandingLoan) {
          errors.push({
            loanKey: inst.key,
            loanLabel,
            error: `Outstanding loan amount is required for ${loanLabel}`
          });
        }
        // Properties validation for commercial real estate (uses current commercialProperties state)
        const totalPropertyValue = commercialProperties.reduce((sum, p) => sum + p.propertyValueAtOrigination, 0);
        if (totalPropertyValue === 0) {
          errors.push({
            loanKey: inst.key,
            loanLabel,
            error: `At least one property with value at origination is required for ${loanLabel}`
          });
        }
      } else if (loanType === 'motor-vehicle-loan') {
        if (loanData.outstandingLoan === 0 || !loanData.outstandingLoan) {
          errors.push({
            loanKey: inst.key,
            loanLabel,
            error: `Outstanding loan amount is required for ${loanLabel}`
          });
        }
        if (loanData.total_value_at_origination === 0 || !loanData.total_value_at_origination) {
          errors.push({
            loanKey: inst.key,
            loanLabel,
            error: `Total value at origination is required for ${loanLabel}`
          });
        }
        if (loanData.total_vehicle_emissions === 0 || !loanData.total_vehicle_emissions) {
          errors.push({
            loanKey: inst.key,
            loanLabel,
            error: `Total Vehicle Emissions is required for ${loanLabel}. Please add vehicle details and calculate emissions.`
          });
        }
      } else if (loanType === 'sovereign-debt') {
        if (loanData.outstandingLoan === 0 || !loanData.outstandingLoan) {
          errors.push({
            loanKey: inst.key,
            loanLabel,
            error: `Outstanding loan amount is required for ${loanLabel}`
          });
        }
        if (loanData.pp_adjusted_gdp === 0 || !loanData.pp_adjusted_gdp) {
          errors.push({
            loanKey: inst.key,
            loanLabel,
            error: `PP-Adjusted GDP is required for ${loanLabel}`
          });
        }
        
        // Check formula-specific requirements
        const formulas = getAvailableFormulasForLoan(loanType);
        const formula = formulas.find(f => f.id === selectedId) || formulas[0];
        if (formula?.optionCode === '1a') {
          if (loanData.verified_country_emissions === 0 || !loanData.verified_country_emissions) {
            errors.push({
              loanKey: inst.key,
              loanLabel,
              error: `Verified Country Emissions is required for ${loanLabel}`
            });
          }
        } else if (formula?.optionCode === '1b') {
          if (loanData.unverified_country_emissions === 0 || !loanData.unverified_country_emissions) {
            errors.push({
              loanKey: inst.key,
              loanLabel,
              error: `Unverified Country Emissions is required for ${loanLabel}`
            });
          }
        } else if (formula?.optionCode === '2a') {
          if (loanData.total_emission === 0 || !loanData.total_emission) {
            errors.push({
              loanKey: inst.key,
              loanLabel,
              error: `Total Emission is required for ${loanLabel}`
            });
          }
        }
      } else if (loanType === 'project-finance') {
        if (loanData.outstandingLoan === 0 || !loanData.outstandingLoan) {
          errors.push({
            loanKey: inst.key,
            loanLabel,
            error: `Outstanding loan amount is required for ${loanLabel}`
          });
        }
        const totalProjectEquityPlusDebt = (loanData.totalProjectEquity || 0) + (loanData.totalProjectDebt || 0);
        if (totalProjectEquityPlusDebt === 0) {
          errors.push({
            loanKey: inst.key,
            loanLabel,
            error: `Total Project Equity + Debt is required for ${loanLabel}`
          });
        }
      } else {
        // For corporate-bond, business-loan, etc.
        if (loanData.outstandingLoan === 0 || !loanData.outstandingLoan) {
          errors.push({
            loanKey: inst.key,
            loanLabel,
            error: `Outstanding loan amount is required for ${loanLabel}`
          });
        }

        // Check EVIC/Total Equity + Debt based on corporate structure
        if (corporateStructure === 'listed') {
          let evic = 0;
          if (useShared) {
            evic = getSharedDenominatorValue('listed');
          } else {
            evic = ((loanData.sharePrice || 0) * (loanData.outstandingShares || 0) + (loanData.totalDebt || 0) + (loanData.minorityInterest || 0) + (loanData.preferredStock || 0));
          }
          if (evic === 0) {
            errors.push({
              loanKey: inst.key,
              loanLabel,
              error: `EVIC (Enterprise Value including Cash) is required for ${loanLabel}. Please fill in share price, outstanding shares, total debt, minority interest, and preferred stock.`
            });
          }
        } else {
          // Unlisted company
          let totalEquityPlusDebt = 0;
          if (useShared) {
            totalEquityPlusDebt = getSharedDenominatorValue('unlisted');
          } else {
            totalEquityPlusDebt = ((loanData.totalEquity || 0) + (loanData.totalDebt || 0));
          }
          if (totalEquityPlusDebt === 0) {
            errors.push({
              loanKey: inst.key,
              loanLabel,
              error: `Total Equity + Debt is required for ${loanLabel}. Please fill in total equity and total debt.`
            });
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const calculateSingleLoan = (loanTypeKey: string, loanFormData: typeof formData) => {
    const useShared = expandedLoanTypes.length > 1;
    const formulas = getAvailableFormulasForLoan(loanTypeKey);
    const selectedId = formulas.length === 1 ? formulas[0].id : selectedFormula; // fallback to current selection if multiple
    if (!selectedId) {
      throw new Error('No formula selected for ' + (typeLabels[loanTypeKey] || loanTypeKey));
    }

    // Calculate totals for mortgages and commercial real estate if applicable (uses current properties state)
    const totalPropertyValueAtOrigination = loanTypeKey === 'mortgage'
      ? properties.reduce((sum, property) => sum + property.propertyValueAtOrigination, 0)
      : loanTypeKey === 'commercial-real-estate'
      ? commercialProperties.reduce((sum, property) => sum + property.propertyValueAtOrigination, 0)
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
    // IMPORTANT: When multiple loans, use shared EVIC/Total Equity + Debt from first form
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
      pp_adjusted_gdp: loanFormData.pp_adjusted_gdp || 0,
      verified_country_emissions: loanFormData.verified_country_emissions || 0, // Always tCO2e (auto-filled from questionnaire)
      unverified_country_emissions: loanFormData.unverified_country_emissions || 0, // Always tCO2e (auto-filled from questionnaire)
      total_value_at_origination: loanFormData.total_value_at_origination || 0,
      total_vehicle_emissions: loanFormData.total_vehicle_emissions ? loanFormData.total_vehicle_emissions / 1000 : 0, // Convert from kg CO2e to tCO2e
      fuel_consumption: smartConvertUnit(loanFormData.fuel_consumption || 0, loanFormData.fuel_consumption_unit),
      distance_traveled: loanFormData.distance_traveled || 0,
      efficiency: loanFormData.efficiency || 0,
      vehicle_emission_factor: smartConvertUnit(loanFormData.vehicle_emission_factor || 0, loanFormData.vehicle_emission_factor_unit),
      verified_emissions: smartConvertUnit(loanFormData.verified_emissions || 0, loanFormData.verified_emissionsUnit),
      unverified_emissions: smartConvertUnit(loanFormData.unverified_emissions || 0, loanFormData.unverified_emissionsUnit),
      energy_consumption: loanFormData.emissions || 0, // Use combined emissions field
      emission_factor: 1, // Always 1 since emissions already includes the multiplication
      production: loanFormData.production || 0,
      sector_emissions: loanFormData.sectorEmissions || 0,
      sector_revenue: loanFormData.sectorRevenue || 0,
      sector_assets: loanFormData.sectorAssets || 0,
      asset_turnover_ratio: loanFormData.assetTurnoverRatio || 0,
      property_value: loanFormData.property_value || 0,
        property_value_at_origination: loanTypeKey === 'mortgage' ? totalPropertyValueAtOrigination : 
          loanTypeKey === 'commercial-real-estate' ? totalPropertyValueAtOrigination : 
          (loanFormData.property_value_at_origination || 0),
        total_emission: loanTypeKey === 'commercial-real-estate' ? (loanFormData.total_emission || 0) : 
          loanTypeKey === 'sovereign-debt' ? (loanFormData.total_emission || 0) : 
          loanTypeKey === 'mortgage' && (selectedId === '1a-mortgage' || selectedId === '1b-mortgage' || selectedId === '2a-mortgage') ? (properties.reduce((sum, p) => sum + (p.totalEmission || 0), 0)) : 0, // For commercial real estate, sovereign debt Option 2a, and mortgage Options 1a, 1b, 2a, use total_emission
        actual_energy_consumption: loanTypeKey === 'mortgage' ? totalActualEnergyConsumption : 0, // Only for mortgage
        supplier_specific_emission_factor: loanTypeKey === 'mortgage' ? weightedAverageSupplierEmissionFactor : 0, // Only for mortgage
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
      const ppAdjustedGDP = loanFormData.pp_adjusted_gdp || 0;
      denominatorValue = ppAdjustedGDP;
      denominatorLabel = 'PP-Adjusted GDP';
    } else if (loanTypeKey === 'motor-vehicle-loan') {
      denominatorValue = loanFormData.total_value_at_origination || 0;
      denominatorLabel = 'Total Value at Origination';
    } else if (loanTypeKey === 'commercial-real-estate') {
      denominatorValue = totalPropertyValueAtOrigination; // Use aggregated property value from commercialProperties
      denominatorLabel = 'Total Property Value at Origination';
    } else if (loanTypeKey === 'project-finance') {
      denominatorValue = (loanFormData.totalProjectEquity || 0) + (loanFormData.totalProjectDebt || 0);
      denominatorLabel = 'Total Project Equity + Debt';
    } else if (corporateStructure === 'listed') {
      // For listed companies: ALWAYS use shared EVIC value when multiple loans exist
      // This ensures all loans use the same EVIC calculated from form 1
      denominatorValue = getSharedDenominatorValue('listed');
      if (denominatorValue === 0) {
        // Fallback to individual calculation if shared is not available
        denominatorValue = ((loanFormData.sharePrice || 0) * (loanFormData.outstandingShares || 0) + (loanFormData.totalDebt || 0) + (loanFormData.minorityInterest || 0) + (loanFormData.preferredStock || 0));
        console.log('Using individual EVIC (shared not available) for loan:', loanTypeKey, 'Value:', denominatorValue);
      } else {
        console.log('Using shared EVIC for loan:', loanTypeKey, 'Value:', denominatorValue);
      }
      denominatorLabel = 'EVIC';
    } else {
      // For unlisted companies: ALWAYS use shared Total Equity + Debt value when multiple loans exist
      // This ensures all loans use the same Total Equity + Debt calculated from form 1
      denominatorValue = getSharedDenominatorValue('unlisted');
      if (denominatorValue === 0) {
        // Fallback to individual calculation if shared is not available
        denominatorValue = ((loanFormData.totalEquity || 0) + (loanFormData.totalDebt || 0));
        console.log('Using individual Total Equity + Debt (shared not available) for loan:', loanTypeKey, 'Value:', denominatorValue);
      } else {
        console.log('Using shared Total Equity + Debt for loan:', loanTypeKey, 'Value:', denominatorValue);
      }
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

    // Validate all loan forms if there are multiple loans
    if (expandedLoanTypes.length > 1) {
      const validation = validateAllLoanForms();
      if (!validation.isValid) {
        toast({
          title: "Incomplete Forms",
          description: "Please complete all selected forms before calculating",
          variant: "destructive"
        });
        return;
      }
    }

    try {
      // Single-loan detailed calculation (kept for current view and validations)
      // Calculate total property value for mortgages and commercial real estate
      const totalPropertyValueAtOrigination = loanType === 'mortgage'
        ? properties.reduce((sum, property) => sum + property.propertyValueAtOrigination, 0)
        : loanType === 'commercial-real-estate'
        ? commercialProperties.reduce((sum, property) => sum + property.propertyValueAtOrigination, 0)
        : 0;
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
          // For mortgage Options 1a and 1b, validate total_emission instead of actual energy consumption
          const totalEmission = properties.reduce((sum, p) => sum + (p.totalEmission || 0), 0);
          if (totalEmission === 0) {
            throw new Error('Total Emission must be greater than 0. Please complete the questionnaire to set scope emissions (Scope 1 + Scope 2 + Scope 3).');
          }
        }
        if (formula?.optionCode === '2a') {
          // For mortgage Option 2a, validate total_emission instead of floor_area
          const totalEmission = properties.reduce((sum, p) => sum + (p.totalEmission || 0), 0);
          if (totalEmission === 0) {
            throw new Error('Total Emission must be greater than 0. Please enter the total emission (Estimated Energy Consumption from Energy Labels × Floor Area × Average Emission Factor).');
          }
        } else if (formula?.optionCode === '2b') {
          if (totalFloorArea === 0) {
            throw new Error('Floor area must be greater than 0. Please enter floor area data for your properties.');
          }
        }
      } else if (loanType === 'commercial-real-estate') {
        // Validate commercial properties
        const totalPropertyValue = commercialProperties.reduce((sum, p) => sum + p.propertyValueAtOrigination, 0);
        if (totalPropertyValue === 0) {
          throw new Error('At least one property with value at origination is required. Please enter property values.');
        }
        if (formData.outstandingLoan === 0) {
          throw new Error('Outstanding loan amount must be greater than 0. Please enter the loan amount.');
        }
        
        const formula = getCurrentFormula();
        if (formula?.optionCode === '1a' || formula?.optionCode === '1b') {
          if (formData.total_emission === 0) {
            throw new Error('Total emission must be greater than 0. Please complete the questionnaire to set scope emissions.');
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
        console.log('🔍 MOTOR VEHICLE LOAN DEBUG - Total Vehicle Emissions:', formData.total_vehicle_emissions);
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
        if (formData.total_vehicle_emissions === 0 || !formData.total_vehicle_emissions) {
          console.log('❌ MOTOR VEHICLE LOAN VALIDATION - Total Vehicle Emissions validation failed!');
          throw new Error('Total Vehicle Emissions must be greater than 0. Please add vehicle details and calculate emissions.');
        }
      } else if (loanType === 'sovereign-debt') {
        // DEBUG: Log sovereign debt validation values
        console.log('🔍 SOVEREIGN DEBT DEBUG - Loan Type:', loanType);
        console.log('🔍 SOVEREIGN DEBT DEBUG - PP-Adjusted GDP:', formData.pp_adjusted_gdp);
        console.log('🔍 SOVEREIGN DEBT DEBUG - Outstanding Loan:', formData.outstandingLoan);
        console.log('🔍 SOVEREIGN DEBT DEBUG - Verified Country Emissions:', formData.verified_country_emissions);
        console.log('🔍 SOVEREIGN DEBT DEBUG - Unverified Country Emissions:', formData.unverified_country_emissions);
        console.log('🔍 SOVEREIGN DEBT DEBUG - Total Emission:', formData.total_emission);
        console.log('🔍 SOVEREIGN DEBT DEBUG - Selected Formula:', getCurrentFormula()?.name);
        console.log('🔍 SOVEREIGN DEBT DEBUG - Full Form Data:', formData);
        
        if (formData.pp_adjusted_gdp === 0) {
          console.log('❌ SOVEREIGN DEBT VALIDATION - PP-Adjusted GDP validation failed!');
          throw new Error('PP-Adjusted GDP must be greater than 0. Please enter the PP-Adjusted GDP.');
        }
        if (formData.outstandingLoan === 0) {
          console.log('❌ SOVEREIGN DEBT VALIDATION - Outstanding Loan validation failed!');
          throw new Error('Outstanding loan amount must be greater than 0. Please enter the loan amount.');
        }
        
        const formula = getCurrentFormula();
        if (formula?.optionCode === '1a') {
          if (formData.verified_country_emissions === 0) {
            throw new Error('Verified Country Emissions must be greater than 0. Please complete the questionnaire to set scope emissions.');
          }
        }
        if (formula?.optionCode === '1b') {
          if (formData.unverified_country_emissions === 0) {
            throw new Error('Unverified Country Emissions must be greater than 0. Please complete the questionnaire to set scope emissions.');
          }
        }
        if (formula?.optionCode === '2a') {
          if (formData.total_emission === 0) {
            throw new Error('Total Emission must be greater than 0. Please enter the total emission (Energy Consumption × Emission Factor).');
          }
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
        pp_adjusted_gdp: formData.pp_adjusted_gdp || 0,
        verified_country_emissions: formData.verified_country_emissions || 0, // Always tCO2e (auto-filled from questionnaire)
        unverified_country_emissions: formData.unverified_country_emissions || 0, // Always tCO2e (auto-filled from questionnaire)
        // Add Motor Vehicle Loan specific fields
        total_value_at_origination: formData.total_value_at_origination || 0,
        total_vehicle_emissions: formData.total_vehicle_emissions ? formData.total_vehicle_emissions / 1000 : 0, // Convert from kg CO2e to tCO2e
        fuel_consumption: smartConvertUnit(formData.fuel_consumption || 0, formData.fuel_consumption_unit),
        distance_traveled: formData.distance_traveled || 0,
        efficiency: formData.efficiency || 0,
        vehicle_emission_factor: smartConvertUnit(formData.vehicle_emission_factor || 0, formData.vehicle_emission_factor_unit),
        verified_emissions: smartConvertUnit(formData.verified_emissions || 0, formData.verified_emissionsUnit),
        unverified_emissions: smartConvertUnit(formData.unverified_emissions || 0, formData.unverified_emissionsUnit),
        energy_consumption: formData.emissions || 0, // Use combined emissions field
        emission_factor: 1, // Always 1 since emissions already includes the multiplication
        production: formData.production || 0,
        sector_emissions: formData.sectorEmissions || 0,
        sector_revenue: formData.sectorRevenue || 0,
        sector_assets: formData.sectorAssets || 0,
        asset_turnover_ratio: formData.assetTurnoverRatio || 0,
        property_value: formData.property_value || 0,
        // Mortgage-specific inputs (aggregated from multiple properties)
        property_value_at_origination: loanType === 'mortgage' ? totalPropertyValueAtOrigination : 
          loanType === 'commercial-real-estate' ? totalPropertyValueAtOrigination : 
          (formData.property_value_at_origination || 0),
        total_emission: loanType === 'commercial-real-estate' ? (formData.total_emission || 0) : 
          loanType === 'sovereign-debt' ? (formData.total_emission || 0) : 
          loanType === 'mortgage' && (selectedFormula === '1a-mortgage' || selectedFormula === '1b-mortgage' || selectedFormula === '2a-mortgage') ? (properties.reduce((sum, p) => sum + (p.totalEmission || 0), 0)) : 0, // For commercial real estate, sovereign debt Option 2a, and mortgage Options 1a, 1b, 2a, use total_emission
        actual_energy_consumption: loanType === 'mortgage' ? totalActualEnergyConsumption : 0, // Only for mortgage
        supplier_specific_emission_factor: loanType === 'mortgage' ? weightedAverageSupplierEmissionFactor : 0, // Only for mortgage
        average_emission_factor: loanType === 'mortgage' ? weightedAverageEmissionFactor : smartConvertUnit(formData.average_emission_factor || 0, formData.average_emission_factor_unit),
        estimated_energy_consumption_from_labels: loanType === 'mortgage' ? totalEstimatedEnergyFromLabels : smartConvertUnit(formData.estimated_energy_consumption_from_labels || 0, formData.estimated_energy_consumption_from_labels_unit),
        estimated_energy_consumption_from_statistics: loanType === 'mortgage' ? totalEstimatedEnergyFromStatistics : smartConvertUnit(formData.estimated_energy_consumption_from_statistics || 0, formData.estimated_energy_consumption_from_statistics_unit),
        floor_area: loanType === 'mortgage' ? totalFloorArea : (formData.floor_area || 0)
      };


      // DEBUG: Log PCAF inputs before calculation
      console.log('🔍 PCAF CALCULATION DEBUG - Selected Formula ID:', selectedFormula);
      console.log('🔍 PCAF CALCULATION DEBUG - PCAF Inputs:', pcafInputs);
      console.log('🔍 PCAF CALCULATION DEBUG - Company Type:', companyType);
      console.log('🔍 PCAF CALCULATION DEBUG - Loan Type:', loanType);
      console.log('🔍 PCAF CALCULATION DEBUG - Total Emission (for Options 1a, 1b, 2a):', (loanType === 'sovereign-debt' || (loanType === 'mortgage' && (selectedFormula === '1a-mortgage' || selectedFormula === '1b-mortgage' || selectedFormula === '2a-mortgage'))) ? pcafInputs.total_emission : 'N/A');
      
      const pcafResult = calculationEngine.calculate(selectedFormula, pcafInputs, companyType);
      console.log('🔍 PCAF CALCULATION DEBUG - Calculation Result:', pcafResult);
      
      // Calculate the appropriate denominator based on company type
      let denominatorValue: number;
      let denominatorLabel: string;
      
      if (loanType === 'mortgage') {
        // For mortgages: Total Property Value at Origination (sum of all properties)
        denominatorValue = totalPropertyValueAtOrigination;
        denominatorLabel = 'Total Property Value at Origination';
      } else if (loanType === 'sovereign-debt') {
        // For sovereign debt: PP-Adjusted GDP
        const ppAdjustedGDP = formData.pp_adjusted_gdp || 0;
        denominatorValue = ppAdjustedGDP;
        denominatorLabel = 'PP-Adjusted GDP';
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
        // For listed companies: ALWAYS use shared EVIC value when multiple loans exist
        // This ensures all loans use the same EVIC calculated from form 1
        denominatorValue = getSharedDenominatorValue('listed');
        if (denominatorValue === 0) {
          // Fallback to individual calculation if shared is not available
          denominatorValue = ((formData.sharePrice || 0) * (formData.outstandingShares || 0) + (formData.totalDebt || 0) + (formData.minorityInterest || 0) + (formData.preferredStock || 0));
          console.log('Using individual EVIC (shared not available) for loan type:', loanType, 'Value:', denominatorValue);
        } else {
          console.log('Using shared EVIC for loan type:', loanType, 'Value:', denominatorValue);
        }
        denominatorLabel = 'EVIC';
      } else {
        // For unlisted companies: ALWAYS use shared Total Equity + Debt value when multiple loans exist
        // This ensures all loans use the same Total Equity + Debt calculated from form 1
        denominatorValue = getSharedDenominatorValue('unlisted');
        if (denominatorValue === 0) {
          // Fallback to individual calculation if shared is not available
          denominatorValue = ((formData.totalEquity || 0) + (formData.totalDebt || 0));
          console.log('Using individual Total Equity + Debt (shared not available) for loan type:', loanType, 'Value:', denominatorValue);
        } else {
          console.log('Using shared Total Equity + Debt for loan type:', loanType, 'Value:', denominatorValue);
        }
        denominatorLabel = 'Total Equity + Debt';
      }
      
      // Total Product Output (for non-mortgage loans) or Total Property Value (for mortgages) or PPP-adjusted GDP (for sovereign debt) or Vehicle Value (for motor vehicle loans)
      const totalProductOutput = loanType === 'mortgage' ? 
        totalPropertyValueAtOrigination : 
        loanType === 'sovereign-debt' ?
        (formData.pp_adjusted_gdp || 0) :
        loanType === 'motor-vehicle-loan' ?
        (formData.total_value_at_origination || 0) :
        loanType === 'commercial-real-estate' ?
        totalPropertyValueAtOrigination : // Use aggregated property value from commercialProperties
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
      if (expandedLoanTypes.length > 1) {
        const results: Array<{ type: string; label: string; attributionFactor: number; financeEmission: number; denominatorLabel: string; denominatorValue: number }> = [];
        for (const inst of expandedLoanTypes) {
          const ltKey = inst.type;
          const saved = perLoanFormData[inst.key] || formData; // fall back to current formData
          try {
            const r = calculateSingleLoan(ltKey, saved);
            results.push({
              type: ltKey,
              label: `${typeLabels[ltKey] || ltKey} #${inst.instance}`,
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
          })), {
            outstandingLoan: formData.outstandingLoan,
            totalAssetsValue: formData.totalAssetsValue,
            sharePrice: sharedCompanyData.sharePrice,
            outstandingShares: sharedCompanyData.outstandingShares,
            totalDebt: sharedCompanyData.totalDebt,
            totalEquity: sharedCompanyData.totalEquity,
            minorityInterest: sharedCompanyData.minorityInterest,
            preferredStock: sharedCompanyData.preferredStock
          });
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
        console.log('🔍 CALCULATION COMPLETE - Calling onResults callback with:', {
          result: calculationResult,
          loanType,
          denominatorLabel: (loanType === 'mortgage' ? 'Total Property Value at Origination' : loanType === 'sovereign-debt' ? 'PP-Adjusted GDP' : loanType === 'motor-vehicle-loan' ? 'Total Value at Origination' : loanType === 'commercial-real-estate' ? 'Property Value at Origination' : corporateStructure === 'listed' ? 'EVIC' : 'Total Equity + Debt'),
          hasOnResults: !!onResults
        });
        
        if (onResults) {
          console.log('🔍 CALLING onResults callback');
          onResults([
            {
              type: loanType,
              label: `${typeLabels[loanType] || loanType} #${currentLoan?.instance || 1}`,
              attributionFactor: calculationResult.attributionFactor,
              financedEmissions: calculationResult.financeEmission,
              denominatorLabel: (loanType === 'mortgage' ? 'Total Property Value at Origination' : loanType === 'sovereign-debt' ? 'PP-Adjusted GDP' : loanType === 'motor-vehicle-loan' ? 'Total Value at Origination' : loanType === 'commercial-real-estate' ? 'Property Value at Origination' : corporateStructure === 'listed' ? 'EVIC' : 'Total Equity + Debt'),
              denominatorValue: calculationResult.evic
            }
          ], {
            outstandingLoan: formData.outstandingLoan,
            totalAssetsValue: formData.totalAssetsValue,
            sharePrice: sharedCompanyData.sharePrice,
            outstandingShares: sharedCompanyData.outstandingShares,
            totalDebt: sharedCompanyData.totalDebt,
            totalEquity: sharedCompanyData.totalEquity,
            minorityInterest: sharedCompanyData.minorityInterest,
            preferredStock: sharedCompanyData.preferredStock
          });
          console.log('🔍 onResults callback completed');
        } else {
          console.warn('⚠️ onResults callback is NOT provided - results will not be passed to parent');
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
      'pp_adjusted_gdp',
      'verified_country_emissions',
      'unverified_country_emissions',
      'energy_consumption',
      'emission_factor',
      // Motor vehicle loan fields (handled by MotorVehicleLoanForm)
      'total_value_at_origination',
      'total_vehicle_emissions', // Auto-calculated from vehicle details
      'fuel_consumption',
      'distance_traveled',
      'efficiency',
      'vehicle_emission_factor',
      // Commercial real estate fields (handled by CommercialRealEstateForm)
      'property_value_at_origination',
      'total_emission', // For commercial real estate: total emission from questionnaire
      'actual_energy_consumption', // Only for mortgage
      'supplier_specific_emission_factor', // Only for mortgage
      'average_emission_factor',
      'estimated_energy_consumption_from_labels',
      'estimated_energy_consumption_from_statistics',
      'floor_area'
    ];

    console.log('🔍 Rendering formula inputs:', {
      formulaName: formula.name,
      formulaId: formula.id,
      inputsCount: formula.inputs.length,
      inputs: formula.inputs.map(input => input.name),
      duplicateFields,
      filteredInputs: formula.inputs.filter(input => !duplicateFields.includes(input.name)).map(input => input.name)
    });

    return formula.inputs
      .filter(input => !duplicateFields.includes(input.name)) // Remove duplicate fields
      .map((input) => {
        const fieldName = input.name;
        const fieldValue = formData[fieldName as keyof typeof formData] || '';
        const unitFieldName = `${fieldName}Unit`;
        const unitValue = formData[unitFieldName as keyof typeof formData] || input.unit || '';

        // Debug logging for emissions field
        if (fieldName === 'emissions') {
          console.log('🔍 Rendering emissions field:', {
            fieldName,
            fieldValue,
            formDataEmissions: formData.emissions,
            hasEmissions,
            verificationStatus
          });
        }

        // Debug logging for verified/unverified emissions fields
        if (fieldName === 'verified_emissions' || fieldName === 'unverified_emissions') {
          console.log('🔍 Rendering verified/unverified emissions field:', {
            fieldName,
            fieldValue,
            formDataValue: formData[fieldName as keyof typeof formData],
            hasEmissions,
            verificationStatus,
            isEmissionAutoFilled: hasEmissions === 'yes' && (fieldName === 'verified_emissions' || fieldName === 'unverified_emissions'),
            propVerifiedEmissions,
            propUnverifiedEmissions,
            activeTab,
            expandedLoanTypes: expandedLoanTypes.length,
            currentLoanIndex,
            loanInstanceKey
          });
        }

        // Lock emissions fields when user has emissions (auto-filled)
        const isEmissionAutoFilled = hasEmissions === 'yes' && (fieldName === 'verified_emissions' || fieldName === 'unverified_emissions');

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
                  {isEmissionAutoFilled && (
                    <span className="text-xs text-muted-foreground">(auto-filled)</span>
                  )}
                </div>
                <Input
                  id={input.name}
                  type="number"
                  placeholder="0"
                  value={fieldValue}
                  onChange={(e) => updateFormData(fieldName, parseFloat(e.target.value) || 0)}
                  disabled={isEmissionAutoFilled}
                  className="mt-1"
                  required={input.required}
                />
              </div>
              {input.unitOptions && (
                <div className="w-48">
                  <Label htmlFor={unitFieldName}>Unit</Label>
                  <Select value={String(unitValue)} onValueChange={(value) => updateFormData(unitFieldName, value as any)} disabled={isEmissionAutoFilled}>
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


  console.log('🔍 FinanceEmissionCalculator - Rendering decision:', {
    activeTab,
    willRenderFinance: activeTab === 'finance',
    willRenderFacilitated: activeTab === 'facilitated'
  });

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
          {expandedLoanTypes.length > 0 && (
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
                  {expandedLoanTypes.map((inst, index) => (
                    <Badge key={inst.key || index} variant="secondary" className="px-3 py-1">
                      {(typeLabels[inst.type] || inst.type)} #{inst.instance}
                    </Badge>
                  ))}
                </div>
                {expandedLoanTypes.length > 1 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Use Previous/Next to switch between loan instances.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
          {/* Navigation buttons between loan forms (bottom only) */}
          {expandedLoanTypes.length > 1 && (
            <div className="flex justify-between items-center pt-4">
              <Button
                variant="outline"
                disabled={currentLoanIndex === 0}
                onClick={() => setCurrentLoanIndex(i => Math.max(0, i - 1))}
              >
                Previous Loan
              </Button>
              <div className="text-sm text-gray-600">
                {currentLoanIndex + 1} of {expandedLoanTypes.length}
              </div>
              <Button
                variant="default"
                disabled={currentLoanIndex >= expandedLoanTypes.length - 1}
                onClick={() => setCurrentLoanIndex(i => Math.min(expandedLoanTypes.length - 1, i + 1))}
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
          totalEmission={(propScope1 || 0) + (propScope2 || 0) + (propScope3 || 0)}
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
        <CommercialRealEstatePropertiesForm
          properties={commercialProperties}
          totalEmission={formData.total_emission || 0}
          onAddProperty={addCommercialProperty}
          onRemoveProperty={removeCommercialProperty}
          onUpdateProperty={updateCommercialProperty}
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




      {/* Edit Company Emissions Button */}
      {resolvedCounterpartyId && (
        <div className="flex justify-center mb-4">
          <Button
            variant="outline"
            onClick={() => editCompanyEmissions(resolvedCounterpartyId)}
            className="px-6 py-2"
          >
            <Building2 className="h-4 w-4 mr-2" />
            Edit Company Emissions
          </Button>
        </div>
      )}

      {/* Calculate Button */}
      <div className="flex flex-col items-center">
        {(() => {
          const validation = expandedLoanTypes.length > 1 ? validateAllLoanForms() : { isValid: true };
          const isDisabled = !selectedFormula || (expandedLoanTypes.length > 1 && !validation.isValid);
          return (
            <>
              <Button
                onClick={calculateFinanceEmission}
                disabled={isDisabled}
                className="px-8 py-3"
              >
                <Calculator className="h-5 w-5 mr-2" />
                Calculate Finance Emission
              </Button>
              {expandedLoanTypes.length > 1 && !validation.isValid && (
                <div className="mt-2 text-center">
                  <p className="text-sm text-amber-600 font-medium">
                    Please complete all selected forms
                  </p>
                </div>
              )}
            </>
          );
        })()}
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
                   loanType === 'sovereign-debt' ? 'PP-Adjusted GDP' :
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
        <>
          {console.log('🔍 Rendering FacilitatedEmissionForm')}
          <FacilitatedEmissionForm 
            corporateStructure={corporateStructure}
            hasEmissions={propHasEmissions}
            verificationStatus={propVerificationStatus}
            verifiedEmissions={propVerifiedEmissions}
            unverifiedEmissions={propUnverifiedEmissions}
          onCalculationComplete={(result) => {
            // Handle facilitated emission calculation result
            console.log('Facilitated emission result:', result);
            // Convert facilitated result to the expected format and pass to parent
            if (onResults) {
              const denominatorValue = result.evic || result.totalEquityPlusDebt || 0;
              const denominatorLabel = result.evic ? 'EVIC' : 'Total Equity + Debt';
              
              const formattedResult = {
                type: 'facilitated',
                label: 'Facilitated Emission',
                attributionFactor: result.attributionFactor,
                financedEmissions: result.facilitatedEmission,
                denominatorLabel: denominatorLabel,
                denominatorValue: denominatorValue
              };
              onResults([formattedResult]);
            }
          }}
        />
        </>
      )}
    </div>
  );
};
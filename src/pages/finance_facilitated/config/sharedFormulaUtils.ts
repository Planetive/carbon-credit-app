import { FormulaInput } from '../types/formula';

// ============================================================================
// COMMON INPUT FIELD DEFINITIONS (shared across loan types)
// ============================================================================
export const COMMON_INPUTS: Record<string, FormulaInput> = {
  outstanding_amount: {
    name: 'outstanding_amount',
    label: 'Outstanding Amount',
    type: 'number',
    required: true,
    unit: 'PKR',
    description: 'Outstanding amount in the company'
  },
  total_assets: {
    name: 'total_assets',
    label: 'Total Assets Value',
    type: 'number',
    required: true,
    unit: 'PKR',
    description: 'Total assets value for attribution factor calculation'
  },
  evic: {
    name: 'evic',
    label: 'EVIC (Enterprise Value Including Cash)',
    type: 'number',
    required: true,
    unit: 'PKR',
    description: 'EVIC for listed companies'
  },
  total_equity_plus_debt: {
    name: 'total_equity_plus_debt',
    label: 'Total Equity + Debt',
    type: 'number',
    required: true,
    unit: 'PKR',
    description: 'Total equity plus debt for business loans and equity investments'
  }
};

// ============================================================================
// COMMON EMISSION UNIT OPTIONS
// ============================================================================
export const EMISSION_UNIT_OPTIONS = [
  { value: 'tCO2e', label: 'tCO2e (Tonnes CO2e)' },
  { value: 'MtCO2e', label: 'MtCO2e (Million Tonnes CO2e)' },
  { value: 'ktCO2e', label: 'ktCO2e (Thousand Tonnes CO2e)' },
  { value: 'GtCO2e', label: 'GtCO2e (Gigatonnes CO2e)' }
];

// ============================================================================
// HELPER FUNCTIONS (shared across loan types)
// ============================================================================

// Attribution factor for Corporate Bonds/Business Loans (Listed) - uses EVIC
export const calculateAttributionFactorListed = (outstandingAmount: number, evic: number): number => {
  if (evic === 0 || !isFinite(evic)) {
    return 0;
  }
  const result = outstandingAmount / evic;
  return isFinite(result) ? result : 0;
};

// Attribution factor for Corporate Bonds/Business Loans (Unlisted) - uses Total Equity + Debt
export const calculateAttributionFactorUnlisted = (outstandingAmount: number, totalEquityPlusDebt: number): number => {
  if (totalEquityPlusDebt === 0 || !isFinite(totalEquityPlusDebt)) {
    return 0;
  }
  const result = outstandingAmount / totalEquityPlusDebt;
  return isFinite(result) ? result : 0;
};

// Attribution factor for Project Finance - uses Total Project Equity + Debt
export const calculateAttributionFactorProject = (outstandingAmount: number, totalProjectEquityPlusDebt: number): number => {
  if (totalProjectEquityPlusDebt === 0 || !isFinite(totalProjectEquityPlusDebt)) {
    return 0;
  }
  const result = outstandingAmount / totalProjectEquityPlusDebt;
  return isFinite(result) ? result : 0;
};

// Attribution factor for Commercial Real Estate - uses Property Value at Origination
export const calculateAttributionFactorCommercialRealEstate = (outstandingAmount: number, propertyValueAtOrigination: number): number => {
  if (propertyValueAtOrigination === 0 || !isFinite(propertyValueAtOrigination)) {
    return 0;
  }
  const result = outstandingAmount / propertyValueAtOrigination;
  return isFinite(result) ? result : 0;
};

// Legacy function - kept for backward compatibility but should not be used
export const calculateAttributionFactor = (outstandingAmount: number, totalAssets: number): number => {
  if (totalAssets === 0 || !isFinite(totalAssets)) {
    return 0;
  }
  const result = outstandingAmount / totalAssets;
  return isFinite(result) ? result : 0;
};

export const calculateEVIC = (inputs: any): number => {
  const sharePrice = inputs.sharePrice || 0;
  const outstandingShares = inputs.outstandingShares || 0;
  const totalDebt = inputs.totalDebt || 0;
  const minorityInterest = inputs.minorityInterest || 0;
  const preferredStock = inputs.preferredStock || 0;
  
  const marketCap = sharePrice * outstandingShares;
  const result = marketCap + totalDebt + minorityInterest + preferredStock;
  
  return isFinite(result) ? result : 0;
};

export const calculateTotalEquityPlusDebt = (inputs: any): number => {
  const totalEquity = inputs.totalEquity || 0;
  const totalDebt = inputs.totalDebt || 0;
  const result = totalEquity + totalDebt;
  
  return isFinite(result) ? result : 0;
};

export const calculateFinancedEmissions = (outstandingAmount: number, denominator: number, emissionData: number): number => {
  // Prevent division by zero to avoid Infinity values
  if (denominator === 0 || !isFinite(denominator)) {
    return 0;
  }
  const result = (outstandingAmount / denominator) * emissionData;
  // Ensure result is finite
  return isFinite(result) ? result : 0;
};

export const createCommonCalculationSteps = (
  outstandingAmount: number,
  totalAssets: number,
  denominator: number,
  denominatorLabel: string,
  denominatorFormula: string,
  emissionData: number,
  emissionLabel: string,
  financedEmissions: number
) => {
  const attributionFactor = calculateAttributionFactor(outstandingAmount, totalAssets);

  return [
    {
      step: 'Attribution Factor',
      value: attributionFactor,
      formula: `${outstandingAmount} / ${totalAssets} = ${attributionFactor.toFixed(6)}`
    },
    {
      step: denominatorLabel,
      value: denominator,
      formula: denominatorFormula
    },
    {
      step: 'Financed Emissions',
      value: financedEmissions,
      formula: `(${outstandingAmount} / ${denominator.toFixed(2)}) × ${emissionData} = ${financedEmissions.toFixed(2)}`
    }
  ];
};



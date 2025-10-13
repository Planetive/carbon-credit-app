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
  return outstandingAmount / evic;
};

// Attribution factor for Corporate Bonds/Business Loans (Unlisted) - uses Total Equity + Debt
export const calculateAttributionFactorUnlisted = (outstandingAmount: number, totalEquityPlusDebt: number): number => {
  return outstandingAmount / totalEquityPlusDebt;
};

// Attribution factor for Project Finance - uses Total Project Equity + Debt
export const calculateAttributionFactorProject = (outstandingAmount: number, totalProjectEquityPlusDebt: number): number => {
  return outstandingAmount / totalProjectEquityPlusDebt;
};

// Attribution factor for Commercial Real Estate - uses Property Value at Origination
export const calculateAttributionFactorCommercialRealEstate = (outstandingAmount: number, propertyValueAtOrigination: number): number => {
  return outstandingAmount / propertyValueAtOrigination;
};

// Legacy function - kept for backward compatibility but should not be used
export const calculateAttributionFactor = (outstandingAmount: number, totalAssets: number): number => {
  return outstandingAmount / totalAssets;
};

export const calculateEVIC = (inputs: any): number => {
  return inputs.sharePrice * inputs.outstandingShares + inputs.totalDebt + inputs.minorityInterest + inputs.preferredStock;
};

export const calculateTotalEquityPlusDebt = (inputs: any): number => {
  return inputs.totalEquity + inputs.totalDebt;
};

export const calculateFinancedEmissions = (outstandingAmount: number, denominator: number, emissionData: number): number => {
  return (outstandingAmount / denominator) * emissionData;
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



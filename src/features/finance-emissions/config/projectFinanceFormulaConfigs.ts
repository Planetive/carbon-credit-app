/**
 * PROJECT FINANCE FORMULA CONFIGURATIONS
 * 
 * This file contains all PCAF (Partnership for Carbon Accounting Financials) formulas
 * for Project Finance investments.
 * 
 * Based on PCAF Global GHG Accounting and Reporting Standard for the Financial Industry
 * Table 10.1-3: Project Finance formulas
 * 
 * Key Differences from Corporate Bonds/Business Loans:
 * - Attribution Factor: Outstanding Amount / Total Project Equity + Debt (consistent)
 * - Financed Emissions: Uses Total Project Equity + Debt as denominator (no EVIC)
 * - All formulas use project-specific data (subscript 'p' for project)
 * 
 * Formula Categories:
 * - Option 1a: Verified GHG emissions data (Score 1) - Highest quality
 * - Option 1b: Unverified GHG emissions data (Score 2) - Good quality
 * - Option 2a: Energy consumption + emission factors (Score 3) - Fair quality
 * - Option 2b: Production data + emission factors (Score 3) - Fair quality
 * 
 * Attribution Factor: Outstanding Amount / Total Assets (consistent across all formulas)
 * Financed Emissions: Uses Total Project Equity + Debt as denominator
 */

import { FormulaConfig } from '../types/formula';
import { 
  COMMON_INPUTS, 
  EMISSION_UNIT_OPTIONS,
  calculateAttributionFactorProject,
  calculateFinancedEmissions,
} from './sharedFormulaUtils';

// ============================================================================
// PROJECT FINANCE FORMULA CONFIGURATIONS
// ============================================================================

/**
 * OPTION 1A - VERIFIED GHG EMISSIONS (PROJECT FINANCE)
 * Data Quality Score: 1 (Highest)
 * Uses: Verified GHG emissions data from project in accordance with GHG Protocol
 * Formula: Σ (Outstanding amount_p / (Total equity + debt)_p) × Verified project emissions_p
 */
export const OPTION_1A_PROJECT_FINANCE: FormulaConfig = {
  id: '1a-project-finance',
  name: 'Option 1a - Verified GHG Emissions (Project Finance)',
  description: 'Verified GHG emissions data from the project in accordance with the GHG Protocol',
  dataQualityScore: 1,
  category: 'project_finance',
  optionCode: '1a',
  inputs: [
    COMMON_INPUTS.outstanding_amount,
    COMMON_INPUTS.total_assets,
    {
      name: 'totalProjectEquity',
      label: 'Total Project Equity',
      type: 'number',
      required: true,
      unit: 'PKR',
      description: 'Total equity invested in the project'
    },
    {
      name: 'totalProjectDebt',
      label: 'Total Project Debt',
      type: 'number',
      required: true,
      unit: 'PKR',
      description: 'Total debt for the project'
    },
    {
      name: 'verified_emissions',
      label: 'Verified Project GHG Emissions',
      type: 'number',
      required: true,
      unit: 'tCO2e',
      description: 'Verified GHG emissions data from project',
      unitOptions: EMISSION_UNIT_OPTIONS
    }
  ],
  calculate: (inputs, companyType) => {
    const outstandingAmount = inputs.outstanding_amount;
    const verifiedEmissions = inputs.verified_emissions;

    // Step 1: Calculate Total Project Equity + Debt
    const totalProjectEquityPlusDebt = inputs.totalProjectEquity + inputs.totalProjectDebt;

    // Step 2: Calculate attribution factor using Total Project Equity + Debt (correct PCAF formula)
    const attributionFactor = calculateAttributionFactorProject(outstandingAmount, totalProjectEquityPlusDebt);

    // Step 3: Calculate financed emissions using Total Project Equity + Debt as denominator
    const financedEmissions = calculateFinancedEmissions(outstandingAmount, totalProjectEquityPlusDebt, verifiedEmissions);

    return {
      attributionFactor,
      emissionFactor: verifiedEmissions,
      financedEmissions,
      dataQualityScore: 1,
      methodology: 'PCAF Option 1a - Verified GHG Emissions (Project Finance)',
      calculationSteps: [
        {
          step: 'Total Project Equity + Debt Calculation',
          value: totalProjectEquityPlusDebt,
          formula: `${inputs.totalProjectEquity} + ${inputs.totalProjectDebt} = ${totalProjectEquityPlusDebt.toFixed(2)}`
        },
        {
          step: 'Attribution Factor',
          value: attributionFactor,
          formula: `${outstandingAmount} / ${totalProjectEquityPlusDebt.toFixed(2)} = ${attributionFactor.toFixed(6)}`
        },
        {
          step: 'Financed Emissions',
          value: financedEmissions,
          formula: `(${outstandingAmount} / ${totalProjectEquityPlusDebt.toFixed(2)}) × ${verifiedEmissions} = ${financedEmissions.toFixed(2)}`
        }
      ],
      metadata: {
        companyType,
        optionCode: '1a',
        category: 'project_finance',
        totalProjectEquityPlusDebt,
        formula: 'Σ (Outstanding amount_p / (Total equity + debt)_p) × Verified project emissions_p'
      }
    };
  },
  notes: [
    'Highest data quality score (1)',
    'Requires verified emissions data from project',
    'Applicable to all scopes (1, 2, 3)',
    'Formula: Σ (Outstanding amount_p / (Total equity + debt)_p) × Verified project emissions_p'
  ]
};

/**
 * OPTION 1B - UNVERIFIED GHG EMISSIONS (PROJECT FINANCE)
 * Data Quality Score: 2 (Good)
 * Uses: Unverified GHG emissions data calculated by project in accordance with GHG Protocol
 * Formula: Σ (Outstanding amount_p / (Total equity + debt)_p) × Unverified project emissions_p
 */
export const OPTION_1B_PROJECT_FINANCE: FormulaConfig = {
  id: '1b-project-finance',
  name: 'Option 1b - Unverified GHG Emissions (Project Finance)',
  description: 'Unverified GHG emissions data calculated by the project in accordance with the GHG Protocol',
  dataQualityScore: 2,
  category: 'project_finance',
  optionCode: '1b',
  inputs: [
    COMMON_INPUTS.outstanding_amount,
    COMMON_INPUTS.total_assets,
    {
      name: 'totalProjectEquity',
      label: 'Total Project Equity',
      type: 'number',
      required: true,
      unit: 'PKR',
      description: 'Total equity invested in the project'
    },
    {
      name: 'totalProjectDebt',
      label: 'Total Project Debt',
      type: 'number',
      required: true,
      unit: 'PKR',
      description: 'Total debt for the project'
    },
    {
      name: 'unverified_emissions',
      label: 'Unverified Project GHG Emissions',
      type: 'number',
      required: true,
      unit: 'tCO2e',
      description: 'Unverified GHG emissions data from project',
      unitOptions: EMISSION_UNIT_OPTIONS
    }
  ],
  calculate: (inputs, companyType) => {
    const outstandingAmount = inputs.outstanding_amount;
    const unverifiedEmissions = inputs.unverified_emissions;

    // Step 1: Calculate Total Project Equity + Debt
    const totalProjectEquityPlusDebt = inputs.totalProjectEquity + inputs.totalProjectDebt;

    // Step 2: Calculate attribution factor using Total Project Equity + Debt (correct PCAF formula)
    const attributionFactor = calculateAttributionFactorProject(outstandingAmount, totalProjectEquityPlusDebt);

    // Step 3: Calculate financed emissions using Total Project Equity + Debt as denominator
    const financedEmissions = calculateFinancedEmissions(outstandingAmount, totalProjectEquityPlusDebt, unverifiedEmissions);

    return {
      attributionFactor,
      emissionFactor: unverifiedEmissions,
      financedEmissions,
      dataQualityScore: 2,
      methodology: 'PCAF Option 1b - Unverified GHG Emissions (Project Finance)',
      calculationSteps: [
        {
          step: 'Total Project Equity + Debt Calculation',
          value: totalProjectEquityPlusDebt,
          formula: `${inputs.totalProjectEquity} + ${inputs.totalProjectDebt} = ${totalProjectEquityPlusDebt.toFixed(2)}`
        },
        {
          step: 'Attribution Factor',
          value: attributionFactor,
          formula: `${outstandingAmount} / ${totalProjectEquityPlusDebt.toFixed(2)} = ${attributionFactor.toFixed(6)}`
        },
        {
          step: 'Financed Emissions',
          value: financedEmissions,
          formula: `(${outstandingAmount} / ${totalProjectEquityPlusDebt.toFixed(2)}) × ${unverifiedEmissions} = ${financedEmissions.toFixed(2)}`
        }
      ],
      metadata: {
        companyType,
        optionCode: '1b',
        category: 'project_finance',
        totalProjectEquityPlusDebt,
        formula: 'Σ (Outstanding amount_p / (Total equity + debt)_p) × Unverified project emissions_p'
      }
    };
  },
  notes: [
    'Good data quality score (2)',
    'Requires unverified emissions data from project',
    'Applicable to all scopes (1, 2, 3)',
    'Formula: Σ (Outstanding amount_p / (Total equity + debt)_p) × Unverified project emissions_p'
  ]
};

/**
 * OPTION 2A - ENERGY CONSUMPTION DATA (PROJECT FINANCE)
 * Data Quality Score: 3 (Fair)
 * Uses: Primary physical activity data for project's energy consumption + emission factors
 * Formula: Σ (Outstanding amount_p / (Total equity + debt)_p) × Energy consumption_p × Emission factor
 */
export const OPTION_2A_PROJECT_FINANCE: FormulaConfig = {
  id: '2a-project-finance',
  name: 'Option 2a - Energy Consumption Data (Project Finance)',
  description: 'Primary physical activity data for the project\'s energy consumption by energy source plus any process emissions',
  dataQualityScore: 3,
  category: 'project_finance',
  optionCode: '2a',
  inputs: [
    COMMON_INPUTS.outstanding_amount,
    COMMON_INPUTS.total_assets,
    {
      name: 'totalProjectEquity',
      label: 'Total Project Equity',
      type: 'number',
      required: true,
      unit: 'PKR',
      description: 'Total equity invested in the project'
    },
    {
      name: 'totalProjectDebt',
      label: 'Total Project Debt',
      type: 'number',
      required: true,
      unit: 'PKR',
      description: 'Total debt for the project'
    },
    {
      name: 'energy_consumption',
      label: 'Project Energy Consumption',
      type: 'number',
      required: true,
      unit: 'MWh',
      description: 'Primary physical activity data for project\'s energy consumption'
    },
    {
      name: 'emission_factor',
      label: 'Emission Factor',
      type: 'number',
      required: true,
      unit: 'tCO2e/MWh',
      description: 'Emission factors specific to the energy source'
    }
  ],
    calculate: (inputs, companyType) => {
    const outstandingAmount = inputs.outstanding_amount;
    const energyConsumption = inputs.energy_consumption;
    const emissionFactor = inputs.emission_factor;
    if (!energyConsumption || !emissionFactor) {
      throw new Error('Energy consumption and emission factor must be greater than 0');
    }
    const processEmissions = Number(inputs.process_emissions || 0);
    const totalProjectEquityPlusDebt = inputs.totalProjectEquity + inputs.totalProjectDebt;
    const attributionFactor = calculateAttributionFactorProject(outstandingAmount, totalProjectEquityPlusDebt);
    const energyEmissions = energyConsumption * emissionFactor + processEmissions;
    const financedEmissions = calculateFinancedEmissions(outstandingAmount, totalProjectEquityPlusDebt, energyEmissions);

    return {
      attributionFactor,
      emissionFactor: energyEmissions,
      financedEmissions,
      dataQualityScore: 3,
      methodology: 'PCAF Option 2a - Energy Consumption Data (Project Finance)',
      calculationSteps: [
        {
          step: 'Total Project Equity + Debt',
          value: totalProjectEquityPlusDebt,
          formula: `${inputs.totalProjectEquity} + ${inputs.totalProjectDebt} = ${totalProjectEquityPlusDebt.toFixed(2)}`
        },
        {
          step: 'Attribution Factor',
          value: attributionFactor,
          formula: `${outstandingAmount} / ${totalProjectEquityPlusDebt.toFixed(2)} = ${attributionFactor.toFixed(6)}`
        },
        {
          step: 'Energy Emissions',
          value: energyEmissions,
          formula: `${energyConsumption} × ${emissionFactor}${processEmissions ? ` + ${processEmissions}` : ''} = ${energyEmissions.toFixed(2)}`
        },
        {
          step: 'Financed Emissions',
          value: financedEmissions,
          formula: `(${outstandingAmount} / ${totalProjectEquityPlusDebt.toFixed(2)}) × ${energyEmissions.toFixed(2)} = ${financedEmissions.toFixed(2)}`
        }
      ],
      metadata: {
        companyType,
        optionCode: '2a',
        category: 'project_finance',
        totalProjectEquityPlusDebt,
        energyEmissions,
        formula: 'Σ (Outstanding amount_p / (Total equity + debt)_p) × Energy consumption_p × Emission factor'
      }
    };
  },
  notes: [
    'Fair data quality score (3)',
    'Requires energy consumption data and emission factors',
    'Applicable to scope 1 and 2 emissions only',
    'Formula: Σ (Outstanding amount_p / (Total equity + debt)_p) × Energy consumption_p × Emission factor'
  ]
};

/**
 * OPTION 2B - PRODUCTION DATA (PROJECT FINANCE)
 * Data Quality Score: 3 (Fair)
 * Uses: Primary physical activity data for project's production + emission factors
 * Formula: Σ (Outstanding amount_p / (Total equity + debt)_p) × Production_p × Emission factor
 */
export const OPTION_2B_PROJECT_FINANCE: FormulaConfig = {
  id: '2b-project-finance',
  name: 'Option 2b - Production Data (Project Finance)',
  description: 'Primary physical activity data for the project\'s production plus emission factors',
  dataQualityScore: 3,
  category: 'project_finance',
  optionCode: '2b',
  inputs: [
    COMMON_INPUTS.outstanding_amount,
    COMMON_INPUTS.total_assets,
    {
      name: 'totalProjectEquity',
      label: 'Total Project Equity',
      type: 'number',
      required: true,
      unit: 'PKR',
      description: 'Total equity invested in the project'
    },
    {
      name: 'totalProjectDebt',
      label: 'Total Project Debt',
      type: 'number',
      required: true,
      unit: 'PKR',
      description: 'Total debt for the project'
    },
    {
      name: 'production',
      label: 'Project Production',
      type: 'number',
      required: true,
      unit: 'tonnes',
      description: 'Primary physical activity data for project\'s production'
    },
    {
      name: 'emission_factor',
      label: 'Emission Factor',
      type: 'number',
      required: true,
      unit: 'tCO2e/tonne',
      description: 'Emission factors specific to the production data'
    }
  ],
    calculate: (inputs, companyType) => {
    const outstandingAmount = inputs.outstanding_amount;
    const production = inputs.production;
    const emissionFactor = inputs.emission_factor;
    const totalProjectEquityPlusDebt = inputs.totalProjectEquity + inputs.totalProjectDebt;
    const attributionFactor = calculateAttributionFactorProject(outstandingAmount, totalProjectEquityPlusDebt);
    const productionEmissions = production * emissionFactor;
    const financedEmissions = calculateFinancedEmissions(outstandingAmount, totalProjectEquityPlusDebt, productionEmissions);

    return {
      attributionFactor,
      emissionFactor: productionEmissions,
      financedEmissions,
      dataQualityScore: 3,
      methodology: 'PCAF Option 2b - Production Data (Project Finance)',
      calculationSteps: [
        {
          step: 'Total Project Equity + Debt',
          value: totalProjectEquityPlusDebt,
          formula: `${inputs.totalProjectEquity} + ${inputs.totalProjectDebt} = ${totalProjectEquityPlusDebt.toFixed(2)}`
        },
        {
          step: 'Attribution Factor',
          value: attributionFactor,
          formula: `${outstandingAmount} / ${totalProjectEquityPlusDebt.toFixed(2)} = ${attributionFactor.toFixed(6)}`
        },
        {
          step: 'Production Emissions',
          value: productionEmissions,
          formula: `${production} × ${emissionFactor} = ${productionEmissions.toFixed(2)}`
        },
        {
          step: 'Financed Emissions',
          value: financedEmissions,
          formula: `(${outstandingAmount} / ${totalProjectEquityPlusDebt.toFixed(2)}) × ${productionEmissions.toFixed(2)} = ${financedEmissions.toFixed(2)}`
        }
      ],
      metadata: {
        companyType,
        optionCode: '2b',
        category: 'project_finance',
        totalProjectEquityPlusDebt,
        productionEmissions,
        formula: 'Σ (Outstanding amount_p / (Total equity + debt)_p) × Production_p × Emission factor'
      }
    };
  },
  notes: [
    'Fair data quality score (3)',
    'Requires production data and emission factors',
    'Applicable to all scopes (1, 2, 3)',
    'Formula: Σ (Outstanding amount_p / (Total equity + debt)_p) × Production_p × Emission factor'
  ]
};

export const OPTION_3A_PROJECT_FINANCE: FormulaConfig = {
  id: '3a-project-finance',
  name: 'Option 3a - Revenue-based (Project Finance)',
  description: 'Project revenue × sector GHG intensity (emissions / revenue)',
  dataQualityScore: 4,
  category: 'project_finance',
  optionCode: '3a',
  inputs: [
    COMMON_INPUTS.outstanding_amount,
    {
      name: 'totalProjectEquity',
      label: 'Total Project Equity',
      type: 'number',
      required: true,
      unit: 'PKR',
    },
    {
      name: 'totalProjectDebt',
      label: 'Total Project Debt',
      type: 'number',
      required: true,
      unit: 'PKR',
    },
    { name: 'company_revenue', label: 'Project Revenue', type: 'number', required: true, unit: 'PKR' },
    { name: 'sector_emissions', label: 'Sector GHG Emissions', type: 'number', required: true, unit: 'tCO2e' },
    { name: 'sector_revenue', label: 'Sector Revenue', type: 'number', required: true, unit: 'PKR' },
  ],
  calculate: (inputs, companyType) => {
    const outstandingAmount = inputs.outstanding_amount;
    const projectRevenue = Number(inputs.company_revenue || 0);
    const sectorEmissions = Number(inputs.sector_emissions || 0);
    const sectorRevenue = Number(inputs.sector_revenue || 0);
    if (!projectRevenue || !sectorRevenue || !sectorEmissions) {
      throw new Error('Project revenue, sector emissions, and sector revenue must be greater than 0');
    }
    const totalProjectEquityPlusDebt = inputs.totalProjectEquity + inputs.totalProjectDebt;
    const attributionFactor = calculateAttributionFactorProject(outstandingAmount, totalProjectEquityPlusDebt);
    const intensity = sectorEmissions / sectorRevenue;
    const estimatedEmissions = projectRevenue * intensity;
    const financedEmissions = calculateFinancedEmissions(outstandingAmount, totalProjectEquityPlusDebt, estimatedEmissions);
    return {
      attributionFactor,
      emissionFactor: intensity,
      financedEmissions,
      dataQualityScore: 4,
      methodology: 'PCAF Option 3a - Revenue-based (Project Finance)',
      calculationSteps: [
        { step: 'Total Project Equity + Debt', value: totalProjectEquityPlusDebt, formula: `${inputs.totalProjectEquity} + ${inputs.totalProjectDebt} = ${totalProjectEquityPlusDebt.toFixed(2)}` },
        { step: 'Attribution Factor', value: attributionFactor, formula: `${outstandingAmount} / ${totalProjectEquityPlusDebt.toFixed(2)} = ${attributionFactor.toFixed(6)}` },
        { step: 'Sector intensity', value: intensity, formula: `${sectorEmissions} / ${sectorRevenue} = ${intensity.toFixed(8)}` },
        { step: 'Estimated project emissions', value: estimatedEmissions, formula: `${projectRevenue} × ${intensity.toFixed(8)} = ${estimatedEmissions.toFixed(4)}` },
        { step: 'Financed Emissions', value: financedEmissions, formula: `(${outstandingAmount} / ${totalProjectEquityPlusDebt.toFixed(2)}) × ${estimatedEmissions.toFixed(4)} = ${financedEmissions.toFixed(4)}` },
      ],
      metadata: {
        companyType,
        optionCode: '3a',
        category: 'project_finance',
        totalProjectEquityPlusDebt,
        estimatedEmissions,
        formula: 'Σ (Outstanding_p / (Total equity + debt)_p) × Revenue_p × (GHG_s / Revenue_s)',
      },
    };
  },
  notes: ['Data quality score: 4', 'Uses project revenue and sector intensity'],
};

export const OPTION_3B_PROJECT_FINANCE: FormulaConfig = {
  id: '3b-project-finance',
  name: 'Option 3b - Asset-based (Project Finance)',
  description: 'Outstanding amount × sector GHG / sector assets (no attribution factor)',
  dataQualityScore: 5,
  category: 'project_finance',
  optionCode: '3b',
  inputs: [
    COMMON_INPUTS.outstanding_amount,
    { name: 'sector_emissions', label: 'Sector GHG Emissions', type: 'number', required: true, unit: 'tCO2e' },
    { name: 'sector_assets', label: 'Sector Assets', type: 'number', required: true, unit: 'PKR' },
  ],
  calculate: (inputs, companyType) => {
    const outstandingAmount = inputs.outstanding_amount;
    const sectorEmissions = Number(inputs.sector_emissions || 0);
    const sectorAssets = Number(inputs.sector_assets || 0);
    if (!outstandingAmount || !sectorEmissions || !sectorAssets) {
      throw new Error('Outstanding amount, sector emissions, and sector assets must be greater than 0');
    }
    const intensity = sectorEmissions / sectorAssets;
    const financedEmissions = outstandingAmount * intensity;
    return {
      attributionFactor: 1,
      emissionFactor: intensity,
      financedEmissions,
      dataQualityScore: 5,
      methodology: 'PCAF Option 3b - Asset-based (Project Finance)',
      calculationSteps: [
        { step: 'Sector asset intensity', value: intensity, formula: `${sectorEmissions} / ${sectorAssets} = ${intensity.toFixed(8)}` },
        { step: 'Financed Emissions', value: financedEmissions, formula: `${outstandingAmount} × ${intensity.toFixed(8)} = ${financedEmissions.toFixed(4)}` },
      ],
      metadata: {
        companyType,
        optionCode: '3b',
        category: 'project_finance',
        formula: 'Σ Outstanding_p × (GHG_s / Assets_s)',
      },
    };
  },
  notes: ['Data quality score: 5', 'No project equity+debt attribution — outstanding is applied directly'],
};

export const OPTION_3C_PROJECT_FINANCE: FormulaConfig = {
  id: '3c-project-finance',
  name: 'Option 3c - Asset Turnover Ratio (Project Finance)',
  description: 'Outstanding × sector ATR × sector GHG / sector revenue',
  dataQualityScore: 5,
  category: 'project_finance',
  optionCode: '3c',
  inputs: [
    COMMON_INPUTS.outstanding_amount,
    { name: 'asset_turnover_ratio', label: 'Asset Turnover Ratio', type: 'number', required: true, unit: 'ratio' },
    { name: 'sector_emissions', label: 'Sector GHG Emissions', type: 'number', required: true, unit: 'tCO2e' },
    { name: 'sector_revenue', label: 'Sector Revenue', type: 'number', required: true, unit: 'PKR' },
  ],
  calculate: (inputs, companyType) => {
    const outstandingAmount = inputs.outstanding_amount;
    const atr = Number(inputs.asset_turnover_ratio || 0);
    const sectorEmissions = Number(inputs.sector_emissions || 0);
    const sectorRevenue = Number(inputs.sector_revenue || 0);
    if (!outstandingAmount || !atr || !sectorEmissions || !sectorRevenue) {
      throw new Error('Outstanding amount, ATR, sector emissions, and sector revenue must be greater than 0');
    }
    const intensity = sectorEmissions / sectorRevenue;
    const financedEmissions = outstandingAmount * atr * intensity;
    return {
      attributionFactor: 1,
      emissionFactor: intensity,
      financedEmissions,
      dataQualityScore: 5,
      methodology: 'PCAF Option 3c - Asset Turnover Ratio (Project Finance)',
      calculationSteps: [
        { step: 'Sector revenue intensity', value: intensity, formula: `${sectorEmissions} / ${sectorRevenue} = ${intensity.toFixed(8)}` },
        { step: 'Financed Emissions', value: financedEmissions, formula: `${outstandingAmount} × ${atr} × ${intensity.toFixed(8)} = ${financedEmissions.toFixed(4)}` },
      ],
      metadata: {
        companyType,
        optionCode: '3c',
        category: 'project_finance',
        formula: 'Σ Outstanding_p × ATR_s × (GHG_s / Revenue_s)',
      },
    };
  },
  notes: ['Data quality score: 5', 'No project equity+debt attribution — outstanding is applied directly'],
};

export const PROJECT_FINANCE_FORMULAS = [
  OPTION_1A_PROJECT_FINANCE,
  OPTION_1B_PROJECT_FINANCE,
  OPTION_2A_PROJECT_FINANCE,
  OPTION_2B_PROJECT_FINANCE,
  OPTION_3A_PROJECT_FINANCE,
  OPTION_3B_PROJECT_FINANCE,
  OPTION_3C_PROJECT_FINANCE,
];

// Helper function to get project finance formulas by category
export const getProjectFinanceFormulasByCategory = (category: string) => {
  return PROJECT_FINANCE_FORMULAS.filter(formula => formula.category === category);
};

// Helper function to get project finance formula by ID
export const getProjectFinanceFormulaById = (id: string) => {
  return PROJECT_FINANCE_FORMULAS.find(formula => formula.id === id);
};

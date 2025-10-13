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
  calculateAttributionFactor,
  calculateAttributionFactorProject,
  calculateTotalEquityPlusDebt,
  calculateFinancedEmissions,
  createCommonCalculationSteps
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

    // Step 1: Calculate attribution factor (consistent across all formulas)
    const attributionFactor = calculateAttributionFactor(outstandingAmount, inputs.total_assets);

    // Step 2: Calculate Total Project Equity + Debt
    const totalProjectEquityPlusDebt = inputs.totalProjectEquity + inputs.totalProjectDebt;

    // Step 3: Calculate emissions from energy consumption
    const energyEmissions = energyConsumption * emissionFactor;

    // Step 4: Calculate financed emissions
    const financedEmissions = calculateFinancedEmissions(outstandingAmount, totalProjectEquityPlusDebt, energyEmissions);

    return {
      attributionFactor,
      emissionFactor: energyEmissions,
      financedEmissions,
      dataQualityScore: 3,
      methodology: 'PCAF Option 2a - Energy Consumption Data (Project Finance)',
      calculationSteps: [
        {
          step: 'Attribution Factor',
          value: attributionFactor,
          formula: `${outstandingAmount} / ${inputs.total_assets} = ${attributionFactor.toFixed(6)}`
        },
        {
          step: 'Total Project Equity + Debt',
          value: totalProjectEquityPlusDebt,
          formula: `${inputs.totalProjectEquity} + ${inputs.totalProjectDebt} = ${totalProjectEquityPlusDebt.toFixed(2)}`
        },
        {
          step: 'Energy Emissions',
          value: energyEmissions,
          formula: `${energyConsumption} × ${emissionFactor} = ${energyEmissions.toFixed(2)}`
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

    // Step 1: Calculate attribution factor (consistent across all formulas)
    const attributionFactor = calculateAttributionFactor(outstandingAmount, inputs.total_assets);

    // Step 2: Calculate Total Project Equity + Debt
    const totalProjectEquityPlusDebt = inputs.totalProjectEquity + inputs.totalProjectDebt;

    // Step 3: Calculate emissions from production
    const productionEmissions = production * emissionFactor;

    // Step 4: Calculate financed emissions
    const financedEmissions = calculateFinancedEmissions(outstandingAmount, totalProjectEquityPlusDebt, productionEmissions);

    return {
      attributionFactor,
      emissionFactor: productionEmissions,
      financedEmissions,
      dataQualityScore: 3,
      methodology: 'PCAF Option 2b - Production Data (Project Finance)',
      calculationSteps: [
        {
          step: 'Attribution Factor',
          value: attributionFactor,
          formula: `${outstandingAmount} / ${inputs.total_assets} = ${attributionFactor.toFixed(6)}`
        },
        {
          step: 'Total Project Equity + Debt',
          value: totalProjectEquityPlusDebt,
          formula: `${inputs.totalProjectEquity} + ${inputs.totalProjectDebt} = ${totalProjectEquityPlusDebt.toFixed(2)}`
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

// Export all project finance formulas
export const PROJECT_FINANCE_FORMULAS = [
  OPTION_1A_PROJECT_FINANCE,
  OPTION_1B_PROJECT_FINANCE,
  OPTION_2A_PROJECT_FINANCE,
  OPTION_2B_PROJECT_FINANCE
];

// Helper function to get project finance formulas by category
export const getProjectFinanceFormulasByCategory = (category: string) => {
  return PROJECT_FINANCE_FORMULAS.filter(formula => formula.category === category);
};

// Helper function to get project finance formula by ID
export const getProjectFinanceFormulaById = (id: string) => {
  return PROJECT_FINANCE_FORMULAS.find(formula => formula.id === id);
};

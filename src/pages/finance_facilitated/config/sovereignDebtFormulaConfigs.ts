/**
 * SOVEREIGN DEBT FORMULA CONFIGURATIONS
 * 
 * This file contains all PCAF (Partnership for Carbon Accounting Financials) formulas
 * for Sovereign Debt loans.
 * 
 * Based on PCAF Global GHG Accounting and Reporting Standard for the Financial Industry
 * Table 10.1-7: Sovereign Debt formulas
 * 
 * Key Differences from Other Loan Types:
 * - Attribution Factor: Outstanding Amount / PPP-adjusted GDP (consistent)
 * - Financed Emissions: Uses country-level emissions data
 * - All formulas use country-specific data
 * 
 * Formula Categories:
 * - Option 1a: Verified GHG emissions data (Score 1) - Highest quality
 * - Option 1b: Unverified GHG emissions data (Score 2) - Good quality
 * - Option 2a: Energy consumption + emission factors (Score 3) - Fair quality
 * 
 * Attribution Factor: Outstanding Amount / PPP-adjusted GDP (consistent across all formulas)
 * Financed Emissions: Uses country-level emissions or energy consumption data
 */

import { FormulaConfig } from '../types/formula';
import { 
  COMMON_INPUTS, 
  calculateAttributionFactor,
  calculateFinancedEmissions
} from './sharedFormulaUtils';

// ============================================================================
// SOVEREIGN DEBT FORMULA CONFIGURATIONS
// ============================================================================

/**
 * OPTION 1A - VERIFIED COUNTRY EMISSIONS (SOVEREIGN DEBT)
 * Data Quality Score: 1 (Highest)
 * Uses: Verified GHG emissions of the country, reported by the country to UNFCCC
 * Formula: Σ_c (Outstanding amount_c / (PPP-adjusted GDP_c)) × Verified country emissions_c
 */
export const OPTION_1A_SOVEREIGN_DEBT: FormulaConfig = {
  id: '1a-sovereign-debt',
  name: 'Option 1a - Verified Country Emissions (Sovereign Debt)',
  description: 'Verified GHG emissions of the country, reported by the country to UNFCCC',
  dataQualityScore: 1,
  category: 'sovereign-debt',
  optionCode: '1a',
  inputs: [
    COMMON_INPUTS.outstanding_amount,
    {
      name: 'pp_adjusted_gdp',
      label: 'PP-Adjusted GDP',
      type: 'number',
      required: true,
      unit: 'PKR',
      description: 'Purchasing Power Parity-adjusted Gross Domestic Product (nominal GDP)'
    },
    {
      name: 'verified_country_emissions',
      label: 'Verified Country Emissions',
      type: 'number',
      required: true,
      unit: 'tCO2e',
      description: 'Verified GHG emissions of the country (auto-filled from questionnaire: Scope 1 + Scope 2 + Scope 3)'
    }
  ],
  calculate: (inputs, companyType) => {
    const outstandingAmount = inputs.outstanding_amount;
    const ppAdjustedGDP = inputs.pp_adjusted_gdp;
    const verifiedCountryEmissions = inputs.verified_country_emissions;

    // Calculate attribution factor using PP-adjusted GDP
    const attributionFactor = outstandingAmount / ppAdjustedGDP;

    // Calculate financed emissions
    const financedEmissions = attributionFactor * verifiedCountryEmissions;

    return {
      attributionFactor,
      emissionFactor: verifiedCountryEmissions,
      financedEmissions,
      dataQualityScore: 1,
      methodology: 'PCAF Option 1a - Verified Country Emissions (Sovereign Debt)',
      calculationSteps: [
        {
          step: 'PP-Adjusted GDP',
          value: ppAdjustedGDP,
          formula: `PP-Adjusted GDP = $${ppAdjustedGDP.toFixed(2)}`
        },
        {
          step: 'Attribution Factor',
          value: attributionFactor,
          formula: `${outstandingAmount} / ${ppAdjustedGDP.toFixed(2)} = ${attributionFactor.toFixed(6)}`
        },
        {
          step: 'Verified Country Emissions',
          value: verifiedCountryEmissions,
          formula: `Verified Country Emissions = ${verifiedCountryEmissions.toFixed(2)} tCO2e`
        },
        {
          step: 'Financed Emissions',
          value: financedEmissions,
          formula: `(${outstandingAmount} / ${ppAdjustedGDP.toFixed(2)}) × ${verifiedCountryEmissions.toFixed(2)} = ${financedEmissions.toFixed(2)}`
        }
      ],
      metadata: {
        companyType,
        optionCode: '1a',
        category: 'sovereign-debt',
        ppAdjustedGDP,
        verifiedCountryEmissions,
        formula: 'Σ_c (Outstanding amount_c / (PP-adjusted GDP_c)) × Verified country emissions_c'
      }
    };
  },
  notes: [
    'Highest data quality score (1)',
    'Requires verified GHG emissions data from UNFCCC',
    'Applicable to all scopes (1, 2, 3)',
    'Formula: Σ_c (Outstanding amount_c / (PP-adjusted GDP_c)) × Verified country emissions_c'
  ]
};

/**
 * OPTION 1B - UNVERIFIED COUNTRY EMISSIONS (SOVEREIGN DEBT)
 * Data Quality Score: 2 (Good)
 * Uses: Unverified GHG emissions of the country
 * Formula: Σ_c (Outstanding amount_c / (PPP-adjusted GDP_c)) × Unverified country emissions_c
 */
export const OPTION_1B_SOVEREIGN_DEBT: FormulaConfig = {
  id: '1b-sovereign-debt',
  name: 'Option 1b - Unverified Country Emissions (Sovereign Debt)',
  description: 'Unverified GHG emissions of the country',
  dataQualityScore: 2,
  category: 'sovereign-debt',
  optionCode: '1b',
  inputs: [
    COMMON_INPUTS.outstanding_amount,
    {
      name: 'pp_adjusted_gdp',
      label: 'PP-Adjusted GDP',
      type: 'number',
      required: true,
      unit: 'PKR',
      description: 'Purchasing Power Parity-adjusted Gross Domestic Product (nominal GDP)'
    },
    {
      name: 'unverified_country_emissions',
      label: 'Unverified Country Emissions',
      type: 'number',
      required: true,
      unit: 'tCO2e',
      description: 'Unverified GHG emissions of the country (auto-filled from questionnaire: Scope 1 + Scope 2 + Scope 3)'
    }
  ],
  calculate: (inputs, companyType) => {
    const outstandingAmount = inputs.outstanding_amount;
    const ppAdjustedGDP = inputs.pp_adjusted_gdp;
    const unverifiedCountryEmissions = inputs.unverified_country_emissions;

    // Calculate attribution factor using PP-adjusted GDP
    const attributionFactor = outstandingAmount / ppAdjustedGDP;

    // Calculate financed emissions
    const financedEmissions = attributionFactor * unverifiedCountryEmissions;

    return {
      attributionFactor,
      emissionFactor: unverifiedCountryEmissions,
      financedEmissions,
      dataQualityScore: 2,
      methodology: 'PCAF Option 1b - Unverified Country Emissions (Sovereign Debt)',
      calculationSteps: [
        {
          step: 'PP-Adjusted GDP',
          value: ppAdjustedGDP,
          formula: `PP-Adjusted GDP = $${ppAdjustedGDP.toFixed(2)}`
        },
        {
          step: 'Attribution Factor',
          value: attributionFactor,
          formula: `${outstandingAmount} / ${ppAdjustedGDP.toFixed(2)} = ${attributionFactor.toFixed(6)}`
        },
        {
          step: 'Unverified Country Emissions',
          value: unverifiedCountryEmissions,
          formula: `Unverified Country Emissions = ${unverifiedCountryEmissions.toFixed(2)} tCO2e`
        },
        {
          step: 'Financed Emissions',
          value: financedEmissions,
          formula: `(${outstandingAmount} / ${ppAdjustedGDP.toFixed(2)}) × ${unverifiedCountryEmissions.toFixed(2)} = ${financedEmissions.toFixed(2)}`
        }
      ],
      metadata: {
        companyType,
        optionCode: '1b',
        category: 'sovereign-debt',
        ppAdjustedGDP,
        unverifiedCountryEmissions,
        formula: 'Σ_c (Outstanding amount_c / (PP-adjusted GDP_c)) × Unverified country emissions_c'
      }
    };
  },
  notes: [
    'Good data quality score (2)',
    'Requires unverified GHG emissions data',
    'Applicable to all scopes (1, 2, 3)',
    'Formula: Σ_c (Outstanding amount_c / (PP-adjusted GDP_c)) × Unverified country emissions_c'
  ]
};

/**
 * OPTION 2A - ENERGY CONSUMPTION DATA (SOVEREIGN DEBT)
 * Data Quality Score: 3 (Fair)
 * Uses: Primary physical activity data of the country's energy consumption + emission factors
 * Formula: Σ_c (Outstanding amount_c / (PPP-adjusted GDP_c)) × Energy consumption_c × Emission factor
 */
export const OPTION_2A_SOVEREIGN_DEBT: FormulaConfig = {
  id: '2a-sovereign-debt',
  name: 'Option 2a - Energy Consumption Data (Sovereign Debt)',
  description: 'Primary physical activity data of the country\'s energy consumption (domestic generated and imported) by energy source plus any process emissions',
  dataQualityScore: 3,
  category: 'sovereign-debt',
  optionCode: '2a',
  inputs: [
    COMMON_INPUTS.outstanding_amount,
    {
      name: 'pp_adjusted_gdp',
      label: 'PP-Adjusted GDP',
      type: 'number',
      required: true,
      unit: 'PKR',
      description: 'Purchasing Power Parity-adjusted Gross Domestic Product (nominal GDP)'
    },
    {
      name: 'total_emission',
      label: 'Total Emission',
      type: 'number',
      required: true,
      unit: 'tCO2e',
      description: 'Total emission = Energy Consumption × Emission Factor'
    }
  ],
  calculate: (inputs, companyType) => {
    const outstandingAmount = inputs.outstanding_amount;
    const ppAdjustedGDP = inputs.pp_adjusted_gdp;
    const totalEmissions = inputs.total_emission; // Total emission = Energy Consumption × Emission Factor

    // Calculate attribution factor using PP-adjusted GDP
    const attributionFactor = outstandingAmount / ppAdjustedGDP;

    // Use total emissions directly (already calculated from Energy Consumption × Emission Factor)
    const energyEmissions = totalEmissions;

    // Calculate financed emissions
    const financedEmissions = attributionFactor * energyEmissions;

    return {
      attributionFactor,
      emissionFactor: energyEmissions,
      financedEmissions,
      dataQualityScore: 3,
      methodology: 'PCAF Option 2a - Energy Consumption Data (Sovereign Debt)',
      calculationSteps: [
        {
          step: 'PP-Adjusted GDP',
          value: ppAdjustedGDP,
          formula: `PP-Adjusted GDP = $${ppAdjustedGDP.toFixed(2)}`
        },
        {
          step: 'Attribution Factor',
          value: attributionFactor,
          formula: `${outstandingAmount} / ${ppAdjustedGDP.toFixed(2)} = ${attributionFactor.toFixed(6)}`
        },
        {
          step: 'Total Emission',
          value: totalEmissions,
          formula: `Total Emission (Energy Consumption × Emission Factor) = ${totalEmissions.toFixed(2)} tCO2e`
        },
        {
          step: 'Financed Emissions',
          value: financedEmissions,
          formula: `(${outstandingAmount} / ${ppAdjustedGDP.toFixed(2)}) × ${energyEmissions.toFixed(2)} = ${financedEmissions.toFixed(2)}`
        }
      ],
      metadata: {
        companyType,
        optionCode: '2a',
        category: 'sovereign-debt',
        ppAdjustedGDP,
        totalEmissions,
        formula: 'Σ_c (Outstanding amount_c / (PP-adjusted GDP_c)) × Total emission_c'
      }
    };
  },
  notes: [
    'Fair data quality score (3)',
    'Requires total emission data (Energy Consumption × Emission Factor)',
    'Applicable to scope 1 and 2 emissions only',
    'Formula: Σ_c (Outstanding amount_c / (PP-adjusted GDP_c)) × Total emission_c'
  ]
};

// Export all sovereign debt formulas
export const SOVEREIGN_DEBT_FORMULAS = [
  OPTION_1A_SOVEREIGN_DEBT,
  OPTION_1B_SOVEREIGN_DEBT,
  OPTION_2A_SOVEREIGN_DEBT
];

// Helper function to get sovereign debt formulas by category
export const getSovereignDebtFormulasByCategory = (category: string) => {
  return SOVEREIGN_DEBT_FORMULAS.filter(formula => formula.category === category);
};

// Helper function to get sovereign debt formula by ID
export const getSovereignDebtFormulaById = (id: string) => {
  return SOVEREIGN_DEBT_FORMULAS.find(formula => formula.id === id);
};

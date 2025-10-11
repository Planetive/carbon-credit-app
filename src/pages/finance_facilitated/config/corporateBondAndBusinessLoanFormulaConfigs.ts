/**
 * PCAF Formula Configurations - Corporate Bonds & Business Loans
 * 
 * This file contains PCAF (Partnership for Carbon Accounting Financials) formula configurations
 * for calculating financed emissions for both Corporate Bonds and Business Loans. It implements the 
 * Global GHG Accounting and Reporting Standard for the Financial Industry.
 * 
 * The formulas are identical for both loan types - only the context/description differs.
 * 
 * Key Concepts:
 * - Attribution Factor: Outstanding Amount / Total Assets (consistent across all formulas)
 * - EVIC: Enterprise Value Including Cash (for listed companies)
 * - Financed Emissions: The final calculated emissions attributed to the financial institution
 * 
 * Available Formula Options (8 total for each loan type):
 * 
 * LISTED COMPANIES (Uses EVIC as denominator):
 * - Option 1a: Verified GHG Emissions (Data Quality Score: 1) - Highest quality
 * - Option 1b: Unverified GHG Emissions (Data Quality Score: 2) - Good quality  
 * - Option 2a: Energy Consumption Data (Data Quality Score: 3) - Fair quality
 * - Option 2b: Production Data (Data Quality Score: 3) - Fair quality
 * 
 * UNLISTED/PRIVATE COMPANIES (Uses Total Equity + Debt as denominator):
 * - Option 1a: Verified GHG Emissions (Data Quality Score: 1) - Highest quality
 * - Option 1b: Unverified GHG Emissions (Data Quality Score: 2) - Good quality  
 * - Option 2a: Energy Consumption Data (Data Quality Score: 3) - Fair quality
 * - Option 2b: Production Data (Data Quality Score: 3) - Fair quality
 */

import { FormulaConfig } from '../types/formula';
import {
  COMMON_INPUTS,
  EMISSION_UNIT_OPTIONS,
  calculateAttributionFactor,
  calculateAttributionFactorListed,
  calculateAttributionFactorUnlisted,
  calculateEVIC,
  calculateTotalEquityPlusDebt,
  calculateFinancedEmissions,
  createCommonCalculationSteps
} from './sharedFormulaUtils';

// Common inputs, unit options, and helper functions are imported from sharedFormulaUtils

// ============================================================================
// CORPORATE BONDS & BUSINESS LOANS FORMULAS (Table 10.1-1 & 10.1-2)
// ============================================================================
// These formulas are used for both Corporate Bonds and Business Loans. The calculation
// logic is identical for both loan types - only the context differs.
// 
// Corporate Bonds: Debt securities issued by corporations
// Business Loans: Traditional loans to businesses for operations
// 
// Available Options (8 total formulas):
// 
// LISTED COMPANIES (Uses EVIC as denominator):
// - Option 1a: Verified GHG Emissions (Data Quality Score: 1) - Highest quality
// - Option 1b: Unverified GHG Emissions (Data Quality Score: 2) - Good quality  
// - Option 2a: Energy Consumption Data (Data Quality Score: 3) - Fair quality
// - Option 2b: Production Data (Data Quality Score: 3) - Fair quality
//
// UNLISTED/PRIVATE COMPANIES (Uses Total Equity + Debt as denominator):
// - Option 1a: Verified GHG Emissions (Data Quality Score: 1) - Highest quality
// - Option 1b: Unverified GHG Emissions (Data Quality Score: 2) - Good quality  
// - Option 2a: Energy Consumption Data (Data Quality Score: 3) - Fair quality
// - Option 2b: Production Data (Data Quality Score: 3) - Fair quality
//
// Note: Options 3a, 3b, 3c (sector-based calculations) have been removed as requested
export const LISTED_EQUITY_FORMULAS: FormulaConfig[] = [
  /**
   * OPTION 1A - VERIFIED GHG EMISSIONS (LISTED)
   * 
   * This is the highest quality calculation method for listed companies.
   * It uses verified GHG emissions data directly from the company.
   * 
   * Formula: Σ (Outstanding amount_c / EVIC_c) × Verified company emissions_c
   * 
   * Data Quality Score: 1 (Highest)
   * Applicable Scopes: 1, 2, 3 (All scopes)
   * 
   * When to use: When the company has verified emissions data from a third party
   */
  {
    id: '1a-listed-equity',
    name: 'Option 1a - Verified GHG Emissions (Listed)',
    description: 'Verified GHG emissions data from the company in accordance with the GHG Protocol',
    category: 'listed_equity',
    optionCode: '1a',
    dataQualityScore: 1, // Highest quality score
    applicableScopes: ['scope1', 'scope2', 'scope3'], // All scopes
    // Input fields required for this calculation
    inputs: [
      COMMON_INPUTS.outstanding_amount,  // Outstanding amount invested/loaned
      COMMON_INPUTS.total_assets,        // Total assets for attribution factor
      COMMON_INPUTS.evic,                // EVIC for financed emissions calculation
      {
        name: 'verified_emissions',
        label: 'Verified GHG Emissions',
        type: 'number',
        required: true,
        unit: 'tCO2e',
        description: 'Verified GHG emissions data from the company',
        unitOptions: EMISSION_UNIT_OPTIONS
      }
    ],
    /**
     * Calculation function for Option 1a (Verified GHG Emissions - Listed)
     * 
     * Process:
     * 1. Calculate attribution factor: Outstanding Amount / Total Assets
     * 2. Calculate EVIC: Share Price × Outstanding Shares + Total Debt + Minority Interest + Preferred Stock
     * 3. Calculate financed emissions: (Outstanding Amount / EVIC) × Verified Emissions
     * 
     * @param inputs - Form data containing all required financial and emission data
     * @param companyType - Type of company (listed/unlisted)
     * @returns Calculation results with attribution factor, financed emissions, and metadata
     */
    calculate: (inputs, companyType) => {
      const outstandingAmount = inputs.outstanding_amount;
      const verifiedEmissions = inputs.verified_emissions;
      
      // Step 1: Calculate EVIC for listed companies
      const evic = calculateEVIC(inputs);
      
      // Step 2: Calculate attribution factor using EVIC (correct PCAF formula)
      const attributionFactor = calculateAttributionFactorListed(outstandingAmount, evic);
      
      // Step 3: Calculate financed emissions using EVIC as denominator
      const financedEmissions = calculateFinancedEmissions(outstandingAmount, evic, verifiedEmissions);
      
      return {
        attributionFactor,
        emissionFactor: verifiedEmissions,
        financedEmissions,
        dataQualityScore: 1,
        methodology: 'PCAF Option 1a - Verified GHG Emissions (Listed)',
        calculationSteps: [
          {
            step: 'EVIC Calculation',
            value: evic,
            formula: `${inputs.sharePrice} × ${inputs.outstandingShares} + ${inputs.totalDebt} + ${inputs.minorityInterest} + ${inputs.preferredStock} = ${evic.toFixed(2)}`
          },
          {
            step: 'Attribution Factor',
            value: attributionFactor,
            formula: `${outstandingAmount} / ${evic.toFixed(2)} = ${attributionFactor.toFixed(6)}`
          },
          {
            step: 'Financed Emissions',
            value: financedEmissions,
            formula: `(${outstandingAmount} / ${evic.toFixed(2)}) × ${verifiedEmissions} = ${financedEmissions.toFixed(2)}`
          }
        ],
        metadata: {
          companyType,
          optionCode: '1a',
          category: 'listed_equity',
          evic,
          formula: 'Σ (Outstanding amount_c / EVIC_c) × Verified company emissions_c'
        }
      };
    },
    notes: [
      'Highest data quality score (1)',
      'Requires verified emissions data from company',
      'Applicable to all scopes (1, 2, 3)',
      'Formula: Σ (Outstanding amount_c / EVIC_c) × Verified company emissions_c'
    ]
  },

  /**
   * OPTION 1B - UNVERIFIED GHG EMISSIONS (LISTED)
   * 
   * This is the second highest quality calculation method for listed companies.
   * It uses unverified GHG emissions data calculated by the company itself.
   * 
   * Formula: Σ (Outstanding amount_c / EVIC_c) × Unverified company emissions_c
   * 
   * Data Quality Score: 2 (Good)
   * Applicable Scopes: 1, 2, 3 (All scopes)
   * 
   * When to use: When the company has calculated their own emissions but they haven't been verified by a third party
   */
  {
    id: '1b-listed-equity',
    name: 'Option 1b - Unverified GHG Emissions (Listed)',
    description: 'Unverified GHG emissions data calculated by the company in accordance with the GHG Protocol',
    category: 'listed_equity',
    optionCode: '1b',
    dataQualityScore: 2, // Good quality score
    applicableScopes: ['scope1', 'scope2', 'scope3'], // All scopes
    inputs: [
      COMMON_INPUTS.outstanding_amount,  // Outstanding amount invested/loaned
      COMMON_INPUTS.total_assets,        // Total assets for attribution factor
      COMMON_INPUTS.evic,                // EVIC for financed emissions calculation
      {
        name: 'unverified_emissions',
        label: 'Unverified GHG Emissions',
        type: 'number',
        required: true,
        unit: 'tCO2e',
        description: 'Unverified GHG emissions data calculated by the company',
        unitOptions: EMISSION_UNIT_OPTIONS // Use common emission unit options
      }
    ],
    /**
     * Calculation function for Option 1b (Unverified GHG Emissions - Listed)
     * 
     * Process:
     * 1. Calculate attribution factor: Outstanding Amount / Total Assets
     * 2. Calculate EVIC: Share Price × Outstanding Shares + Total Debt + Minority Interest + Preferred Stock
     * 3. Calculate financed emissions: (Outstanding Amount / EVIC) × Unverified Emissions
     * 
     * @param inputs - Form data containing all required financial and emission data
     * @param companyType - Type of company (listed/unlisted)
     * @returns Calculation results with attribution factor, financed emissions, and metadata
     */
    calculate: (inputs, companyType) => {
      const outstandingAmount = inputs.outstanding_amount;
      const unverifiedEmissions = inputs.unverified_emissions;
      
      // Step 1: Calculate attribution factor (consistent across all formulas)
      const attributionFactor = calculateAttributionFactor(outstandingAmount, inputs.total_assets);
      
      // Step 2: Calculate EVIC for listed companies
      const evic = calculateEVIC(inputs);
      
      // Step 3: Calculate financed emissions using EVIC as denominator
      const financedEmissions = calculateFinancedEmissions(outstandingAmount, evic, unverifiedEmissions);
      
      return {
        attributionFactor,
        emissionFactor: unverifiedEmissions,
        financedEmissions,
        dataQualityScore: 2,
        methodology: 'PCAF Option 1b - Unverified GHG Emissions (Listed)',
        calculationSteps: [
          {
            step: 'Attribution Factor',
            value: attributionFactor,
            formula: `${outstandingAmount} / ${inputs.total_assets} = ${attributionFactor.toFixed(6)}`
          },
          {
            step: 'EVIC Calculation',
            value: evic,
            formula: `${inputs.sharePrice} × ${inputs.outstandingShares} + ${inputs.totalDebt} + ${inputs.minorityInterest} + ${inputs.preferredStock} = ${evic.toFixed(2)}`
          },
          {
            step: 'Financed Emissions',
            value: financedEmissions,
            formula: `(${outstandingAmount} / ${evic.toFixed(2)}) × ${unverifiedEmissions} = ${financedEmissions.toFixed(2)}`
          }
        ],
        metadata: {
          companyType,
          optionCode: '1b',
          category: 'listed_equity',
          evic,
          formula: 'Σ (Outstanding amount_c / EVIC_c) × Unverified company emissions_c'
        }
      };
    },
    notes: [
      'Data quality score: 2',
      'Requires unverified emissions data from company',
      'Applicable to all scopes (1, 2, 3)',
      'Formula: Σ (Outstanding amount_c / EVIC_c) × Unverified company emissions_c'
    ]
  },

  /**
   * OPTION 2A - ENERGY CONSUMPTION DATA (LISTED)
   * 
   * This method uses primary physical activity data for energy consumption by energy source.
   * It's useful when direct emissions data is not available but energy consumption data is.
   * 
   * Formula: Σ (Outstanding amount_c / EVIC_c) × Energy consumption_c × Emission factor_c
   * 
   * Data Quality Score: 3 (Fair)
   * Applicable Scopes: 1, 2 (Scope 3 cannot be estimated by this option)
   * 
   * When to use: When you have energy consumption data (MWh) and corresponding emission factors
   * Note: Process emissions must be added separately if applicable
   */
  {
    id: '2a-listed-equity',
    name: 'Option 2a - Energy Consumption Data (Listed)',
    description: 'Primary physical activity data for energy consumption by energy source plus any process emissions',
    category: 'listed_equity',
    optionCode: '2a',
    dataQualityScore: 3, // Fair quality score
    applicableScopes: ['scope1', 'scope2'], // Note: Scope 3 cannot be estimated by this option
    inputs: [
      COMMON_INPUTS.outstanding_amount,  // Outstanding amount invested/loaned
      COMMON_INPUTS.total_assets,        // Total assets for attribution factor
      COMMON_INPUTS.evic,                // EVIC for financed emissions calculation
      {
        name: 'energy_consumption',
        label: 'Energy Consumption',
        type: 'number',
        required: true,
        unit: 'MWh',
        description: 'Primary physical activity data for energy consumption'
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
    /**
     * Calculation function for Option 2a (Energy Consumption Data - Listed)
     * 
     * Process:
     * 1. Calculate attribution factor: Outstanding Amount / Total Assets
     * 2. Calculate EVIC: Share Price × Outstanding Shares + Total Debt + Minority Interest + Preferred Stock
     * 3. Calculate energy emissions: Energy Consumption × Emission Factor
     * 4. Calculate financed emissions: (Outstanding Amount / EVIC) × Energy Emissions
     * 
     * @param inputs - Form data containing all required financial and energy data
     * @param companyType - Type of company (listed/unlisted)
     * @returns Calculation results with attribution factor, financed emissions, and metadata
     */
    calculate: (inputs, companyType) => {
      const outstandingAmount = inputs.outstanding_amount;
      const energyConsumption = inputs.energy_consumption;
      const emissionFactor = inputs.emission_factor;
      
      // Step 1: Calculate attribution factor (consistent across all formulas)
      const attributionFactor = calculateAttributionFactor(outstandingAmount, inputs.total_assets);
      
      // Step 2: Calculate EVIC for listed companies
      const evic = calculateEVIC(inputs);
      
      // Step 3: Calculate energy-based emissions
      const energyEmissions = energyConsumption * emissionFactor;
      
      // Step 4: Calculate financed emissions using EVIC as denominator
      const financedEmissions = calculateFinancedEmissions(outstandingAmount, evic, energyEmissions);
      
      return {
        attributionFactor,
        emissionFactor: energyEmissions,
        financedEmissions,
        dataQualityScore: 3,
        methodology: 'PCAF Option 2a - Energy Consumption Data (Listed)',
        calculationSteps: [
          {
            step: 'Attribution Factor',
            value: attributionFactor,
            formula: `${outstandingAmount} / ${inputs.total_assets} = ${attributionFactor.toFixed(6)}`
          },
          {
            step: 'EVIC Calculation',
            value: evic,
            formula: `${inputs.sharePrice} × ${inputs.outstandingShares} + ${inputs.totalDebt} + ${inputs.minorityInterest} + ${inputs.preferredStock} = ${evic.toFixed(2)}`
          },
          {
            step: 'Energy Emissions',
            value: energyEmissions,
            formula: `${energyConsumption} × ${emissionFactor} = ${energyEmissions.toFixed(2)}`
          },
          {
            step: 'Financed Emissions',
            value: financedEmissions,
            formula: `(${outstandingAmount} / ${evic.toFixed(2)}) × ${energyEmissions.toFixed(2)} = ${financedEmissions.toFixed(2)}`
          }
        ],
        metadata: {
          companyType,
          optionCode: '2a',
          category: 'listed_equity',
          evic,
          energyEmissions,
          formula: 'Σ (Outstanding amount_c / EVIC_c) × Energy consumption_c × Emission factor'
        }
      };
    },
    notes: [
      'Data quality score: 3',
      'Only applicable to Scope 1 and Scope 2 emissions',
      'Process emissions must be added if applicable',
      'Supplier-specific emission factors preferred',
      'Formula: Σ (Outstanding amount_c / EVIC_c) × Energy consumption_c × Emission factor'
    ]
  },

  {
    id: '2b-listed-equity',
    name: 'Option 2b - Production Data (Listed)',
    description: 'Primary physical activity data for company production (e.g., tonnes of rice produced)',
    category: 'listed_equity',
    optionCode: '2b',
    dataQualityScore: 3,
    applicableScopes: ['scope1', 'scope2', 'scope3'],
    inputs: [
      {
        name: 'outstanding_amount',
        label: 'Outstanding Amount',
        type: 'number',
        required: true,
        unit: 'USD',
        description: 'Outstanding amount in the company'
      },
      {
        name: 'total_assets',
        label: 'Total Assets Value',
        type: 'number',
        required: true,
        unit: 'USD',
        description: 'Total assets value for attribution factor calculation'
      },
      {
        name: 'evic',
        label: 'EVIC (Enterprise Value Including Cash)',
        type: 'number',
        required: true,
        unit: 'USD',
        description: 'EVIC for listed companies'
      },
      {
        name: 'production',
        label: 'Production Volume',
        type: 'number',
        required: true,
        unit: 'tonnes',
        description: 'Primary physical activity data for production'
      },
      {
        name: 'emission_factor',
        label: 'Emission Factor per Unit',
        type: 'number',
        required: true,
        unit: 'tCO2e/tonne',
        description: 'Emission factor per unit of production'
      }
    ],
    calculate: (inputs, companyType) => {
      const outstandingAmount = inputs.outstanding_amount;
      const production = inputs.production;
      const emissionFactor = inputs.emission_factor;
      
      // Calculate common values
      const attributionFactor = calculateAttributionFactor(outstandingAmount, inputs.total_assets);
      const evic = calculateEVIC(inputs);
      const productionEmissions = production * emissionFactor;
      const financedEmissions = calculateFinancedEmissions(outstandingAmount, evic, productionEmissions);
      
      return {
        attributionFactor,
        emissionFactor: productionEmissions,
        financedEmissions,
        dataQualityScore: 3,
        methodology: 'PCAF Option 2b - Production Data (Listed)',
        calculationSteps: [
          {
            step: 'Attribution Factor',
            value: attributionFactor,
            formula: `${outstandingAmount} / ${inputs.total_assets} = ${attributionFactor.toFixed(6)}`
          },
          {
            step: 'EVIC Calculation',
            value: evic,
            formula: `${inputs.sharePrice} × ${inputs.outstandingShares} + ${inputs.totalDebt} + ${inputs.minorityInterest} + ${inputs.preferredStock} = ${evic.toFixed(2)}`
          },
          {
            step: 'Production Emissions',
            value: productionEmissions,
            formula: `${production} × ${emissionFactor} = ${productionEmissions.toFixed(2)}`
          },
          {
            step: 'Financed Emissions',
            value: financedEmissions,
            formula: `(${outstandingAmount} / ${evic.toFixed(2)}) × ${productionEmissions.toFixed(2)} = ${financedEmissions.toFixed(2)}`
          }
        ],
        metadata: {
          companyType,
          optionCode: '2b',
          category: 'listed_equity',
          evic,
          productionEmissions,
          formula: 'Σ (Outstanding amount_c / EVIC_c) × Production_c × Emission factor'
        }
      };
    },
    notes: [
      'Data quality score: 3',
      'Applicable to all scopes (1, 2, 3)',
      'Based on production volume and emission factors',
      'Formula: Σ (Outstanding amount_c / EVIC_c) × Production_c × Emission factor'
    ]
  },

  /**
   * OPTION 1A - VERIFIED GHG EMISSIONS (UNLISTED/PRIVATE)
   * 
   * This is the highest quality calculation method for unlisted/private companies.
   * It uses verified GHG emissions data directly from the company.
   * 
   * Formula: Σ (Outstanding amount_c / (Total equity + debt)_c) × Verified company emissions_c
   * 
   * Data Quality Score: 1 (Highest)
   * Applicable Scopes: 1, 2, 3 (All scopes)
   * 
   * When to use: When the company has verified emissions data from a third party
   */
  {
    id: '1a-unlisted-equity',
    name: 'Option 1a - Verified GHG Emissions (Unlisted/Private)',
    description: 'Verified GHG emissions data from the company in accordance with the GHG Protocol',
    category: 'listed_equity', // Using same category for consistency
    optionCode: '1a',
    dataQualityScore: 1, // Highest quality score
    applicableScopes: ['scope1', 'scope2', 'scope3'], // All scopes
    inputs: [
      COMMON_INPUTS.outstanding_amount,  // Outstanding amount invested/loaned
      COMMON_INPUTS.total_assets,        // Total assets for attribution factor
      COMMON_INPUTS.total_equity_plus_debt, // Total Equity + Debt for financed emissions calculation
      {
        name: 'verified_emissions',
        label: 'Verified GHG Emissions',
        type: 'number',
        required: true,
        unit: 'tCO2e',
        description: 'Verified GHG emissions data from the company',
        unitOptions: EMISSION_UNIT_OPTIONS // Use common emission unit options
      }
    ],
    /**
     * Calculation function for Option 1a (Verified GHG Emissions - Unlisted/Private)
     * 
     * Process:
     * 1. Calculate attribution factor: Outstanding Amount / Total Assets
     * 2. Calculate Total Equity + Debt: Total Equity + Total Debt
     * 3. Calculate financed emissions: (Outstanding Amount / Total Equity + Debt) × Verified Emissions
     * 
     * @param inputs - Form data containing all required financial and emission data
     * @param companyType - Type of company (listed/unlisted)
     * @returns Calculation results with attribution factor, financed emissions, and metadata
     */
    calculate: (inputs, companyType) => {
      const outstandingAmount = inputs.outstanding_amount;
      const verifiedEmissions = inputs.verified_emissions;
      
      // Step 1: Calculate Total Equity + Debt for unlisted companies
      const totalEquityPlusDebt = calculateTotalEquityPlusDebt(inputs);
      
      // Step 2: Calculate attribution factor using Total Equity + Debt (correct PCAF formula)
      const attributionFactor = calculateAttributionFactorUnlisted(outstandingAmount, totalEquityPlusDebt);
      
      // Step 3: Calculate financed emissions using Total Equity + Debt as denominator
      const financedEmissions = calculateFinancedEmissions(outstandingAmount, totalEquityPlusDebt, verifiedEmissions);
      
      return {
        attributionFactor,
        emissionFactor: verifiedEmissions,
        financedEmissions,
        dataQualityScore: 1, // Highest quality score
        methodology: 'PCAF Option 1a - Verified GHG Emissions (Unlisted/Private)',
        calculationSteps: [
          {
            step: 'Total Equity + Debt Calculation',
            value: totalEquityPlusDebt,
            formula: `${inputs.totalEquity} + ${inputs.totalDebt} = ${totalEquityPlusDebt.toFixed(2)}`
          },
          {
            step: 'Attribution Factor',
            value: attributionFactor,
            formula: `${outstandingAmount} / ${totalEquityPlusDebt.toFixed(2)} = ${attributionFactor.toFixed(6)}`
          },
          {
            step: 'Financed Emissions',
            value: financedEmissions,
            formula: `(${outstandingAmount} / ${totalEquityPlusDebt.toFixed(2)}) × ${verifiedEmissions} = ${financedEmissions.toFixed(2)}`
          }
        ],
        metadata: {
          companyType,
          optionCode: '1a',
          category: 'listed_equity',
          totalEquityPlusDebt,
          formula: 'Σ (Outstanding amount_c / (Total equity + debt)_c) × Verified company emissions_c'
        }
      };
    },
    notes: [
      'Highest data quality score (1)',
      'Requires verified emissions data from company',
      'Applicable to all scopes (1, 2, 3)',
      'Formula: Σ (Outstanding amount_c / (Total equity + debt)_c) × Verified company emissions_c'
    ]
  },

  /**
   * OPTION 1B - UNVERIFIED GHG EMISSIONS (UNLISTED/PRIVATE)
   * 
   * This is the second highest quality calculation method for unlisted/private companies.
   * It uses unverified GHG emissions data calculated by the company itself.
   * 
   * Formula: Σ (Outstanding amount_c / (Total equity + debt)_c) × Unverified company emissions_c
   * 
   * Data Quality Score: 2 (Good)
   * Applicable Scopes: 1, 2, 3 (All scopes)
   * 
   * When to use: When the company has calculated their own emissions but they haven't been verified by a third party
   */
  {
    id: '1b-unlisted-equity',
    name: 'Option 1b - Unverified GHG Emissions (Unlisted/Private)',
    description: 'Unverified GHG emissions data calculated by the company in accordance with the GHG Protocol',
    category: 'listed_equity', // Using same category for consistency
    optionCode: '1b',
    dataQualityScore: 2, // Good quality score
    applicableScopes: ['scope1', 'scope2', 'scope3'], // All scopes
    inputs: [
      COMMON_INPUTS.outstanding_amount,  // Outstanding amount invested/loaned
      COMMON_INPUTS.total_assets,        // Total assets for attribution factor
      COMMON_INPUTS.total_equity_plus_debt, // Total Equity + Debt for financed emissions calculation
      {
        name: 'unverified_emissions',
        label: 'Unverified GHG Emissions',
        type: 'number',
        required: true,
        unit: 'tCO2e',
        description: 'Unverified GHG emissions data calculated by the company',
        unitOptions: EMISSION_UNIT_OPTIONS // Use common emission unit options
      }
    ],
    /**
     * Calculation function for Option 1b (Unverified GHG Emissions - Unlisted/Private)
     * 
     * Process:
     * 1. Calculate attribution factor: Outstanding Amount / Total Assets
     * 2. Calculate Total Equity + Debt: Total Equity + Total Debt
     * 3. Calculate financed emissions: (Outstanding Amount / Total Equity + Debt) × Unverified Emissions
     * 
     * @param inputs - Form data containing all required financial and emission data
     * @param companyType - Type of company (listed/unlisted)
     * @returns Calculation results with attribution factor, financed emissions, and metadata
     */
    calculate: (inputs, companyType) => {
      const outstandingAmount = inputs.outstanding_amount;
      const unverifiedEmissions = inputs.unverified_emissions;
      
      // Step 1: Calculate attribution factor (consistent across all formulas)
      const attributionFactor = calculateAttributionFactor(outstandingAmount, inputs.total_assets);
      
      // Step 2: Calculate Total Equity + Debt for unlisted companies
      const totalEquityPlusDebt = calculateTotalEquityPlusDebt(inputs);
      
      // Step 3: Calculate financed emissions using Total Equity + Debt as denominator
      const financedEmissions = calculateFinancedEmissions(outstandingAmount, totalEquityPlusDebt, unverifiedEmissions);
      
      return {
        attributionFactor,
        emissionFactor: unverifiedEmissions,
        financedEmissions,
        dataQualityScore: 2, // Good quality score
        methodology: 'PCAF Option 1b - Unverified GHG Emissions (Unlisted/Private)',
        calculationSteps: createCommonCalculationSteps(
          outstandingAmount,
          inputs.total_assets,
          totalEquityPlusDebt,
          'Total Equity + Debt Calculation',
          `${inputs.totalEquity} + ${inputs.totalDebt} = ${totalEquityPlusDebt.toFixed(2)}`,
          unverifiedEmissions,
          'Unverified Emissions',
          financedEmissions
        ),
        metadata: {
          companyType,
          optionCode: '1b',
          category: 'listed_equity',
          totalEquityPlusDebt,
          formula: 'Σ (Outstanding amount_c / (Total equity + debt)_c) × Unverified company emissions_c'
        }
      };
    },
    notes: [
      'Data quality score: 2',
      'Requires unverified emissions data from company',
      'Applicable to all scopes (1, 2, 3)',
      'Formula: Σ (Outstanding amount_c / (Total equity + debt)_c) × Unverified company emissions_c'
    ]
  },

  /**
   * OPTION 2A - ENERGY CONSUMPTION DATA (UNLISTED/PRIVATE)
   * 
   * This method uses primary physical activity data for energy consumption by energy source
   * for unlisted/private companies. It uses Total Equity + Debt as the denominator.
   * 
   * Formula: Σ (Outstanding amount_c / (Total equity + debt)_c) × Energy consumption_c × Emission factor_c
   * 
   * Data Quality Score: 3 (Fair)
   * Applicable Scopes: 1, 2 (Scope 3 cannot be estimated by this option)
   * 
   * When to use: When you have energy consumption data (MWh) and corresponding emission factors for unlisted companies
   * Note: Process emissions must be added separately if applicable
   */
  {
    id: '2a-unlisted-equity',
    name: 'Option 2a - Energy Consumption Data (Unlisted/Private)',
    description: 'Primary physical activity data for energy consumption by energy source plus any process emissions',
    category: 'listed_equity', // Using same category for consistency
    optionCode: '2a',
    dataQualityScore: 3, // Fair quality score
    applicableScopes: ['scope1', 'scope2'], // Note: Scope 3 cannot be estimated by this option
    inputs: [
      COMMON_INPUTS.outstanding_amount,  // Outstanding amount invested/loaned
      COMMON_INPUTS.total_assets,        // Total assets for attribution factor
      COMMON_INPUTS.total_equity_plus_debt, // Total Equity + Debt for financed emissions calculation
      {
        name: 'energy_consumption',
        label: 'Energy Consumption',
        type: 'number',
        required: true,
        unit: 'MWh',
        description: 'Primary physical activity data for energy consumption'
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
    /**
     * Calculation function for Option 2a (Energy Consumption Data - Unlisted/Private)
     * 
     * Process:
     * 1. Calculate attribution factor: Outstanding Amount / Total Assets
     * 2. Calculate Total Equity + Debt: Total Equity + Total Debt
     * 3. Calculate energy emissions: Energy Consumption × Emission Factor
     * 4. Calculate financed emissions: (Outstanding Amount / Total Equity + Debt) × Energy Emissions
     * 
     * @param inputs - Form data containing all required financial and energy data
     * @param companyType - Type of company (listed/unlisted)
     * @returns Calculation results with attribution factor, financed emissions, and metadata
     */
    calculate: (inputs, companyType) => {
      const outstandingAmount = inputs.outstanding_amount;
      const energyConsumption = inputs.energy_consumption;
      const emissionFactor = inputs.emission_factor;
      
      // Step 1: Calculate attribution factor (consistent across all formulas)
      const attributionFactor = calculateAttributionFactor(outstandingAmount, inputs.total_assets);
      
      // Step 2: Calculate Total Equity + Debt for unlisted companies
      const totalEquityPlusDebt = calculateTotalEquityPlusDebt(inputs);
      
      // Step 3: Calculate energy-based emissions
      const energyEmissions = energyConsumption * emissionFactor;
      
      // Step 4: Calculate financed emissions using Total Equity + Debt as denominator
      const financedEmissions = calculateFinancedEmissions(outstandingAmount, totalEquityPlusDebt, energyEmissions);
      
      return {
        attributionFactor,
        emissionFactor: energyEmissions,
        financedEmissions,
        dataQualityScore: 3,
        methodology: 'PCAF Option 2a - Energy Consumption Data (Unlisted/Private)',
        calculationSteps: createCommonCalculationSteps(
          outstandingAmount,
          inputs.total_assets,
          totalEquityPlusDebt,
          'Total Equity + Debt Calculation',
          `${inputs.totalEquity} + ${inputs.totalDebt} = ${totalEquityPlusDebt.toFixed(2)}`,
          energyEmissions,
          'Energy Emissions',
          financedEmissions
        ),
        metadata: {
          companyType,
          optionCode: '2a',
          category: 'listed_equity',
          totalEquityPlusDebt,
          energyEmissions,
          formula: 'Σ (Outstanding amount_c / (Total equity + debt)_c) × Energy consumption_c × Emission factor'
        }
      };
    },
    notes: [
      'Data quality score: 3',
      'Applicable to scopes 1 and 2 only',
      'Based on energy consumption and emission factors',
      'Formula: Σ (Outstanding amount_c / (Total equity + debt)_c) × Energy consumption_c × Emission factor'
    ]
  },

  /**
   * OPTION 2B - PRODUCTION DATA (UNLISTED/PRIVATE)
   * 
   * This method uses primary physical activity data for production volume
   * for unlisted/private companies. It uses Total Equity + Debt as the denominator.
   * 
   * Formula: Σ (Outstanding amount_c / (Total equity + debt)_c) × Production_c × Emission factor_c
   * 
   * Data Quality Score: 3 (Fair)
   * Applicable Scopes: 1, 2, 3 (All scopes)
   * 
   * When to use: When you have production data and corresponding emission factors for unlisted companies
   */
  {
    id: '2b-unlisted-equity',
    name: 'Option 2b - Production Data (Unlisted/Private)',
    description: 'Primary physical activity data for the company\'s production plus emission factors',
    category: 'listed_equity', // Using same category for consistency
    optionCode: '2b',
    dataQualityScore: 3, // Fair quality score
    applicableScopes: ['scope1', 'scope2', 'scope3'], // All scopes
    inputs: [
      COMMON_INPUTS.outstanding_amount,  // Outstanding amount invested/loaned
      COMMON_INPUTS.total_assets,        // Total assets for attribution factor
      COMMON_INPUTS.total_equity_plus_debt, // Total Equity + Debt for financed emissions calculation
      {
        name: 'production',
        label: 'Production Volume',
        type: 'number',
        required: true,
        unit: 'tonnes',
        description: 'Primary physical activity data for production (e.g., tonnes of rice produced)'
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
    /**
     * Calculation function for Option 2b (Production Data - Unlisted/Private)
     * 
     * Process:
     * 1. Calculate attribution factor: Outstanding Amount / Total Assets
     * 2. Calculate Total Equity + Debt: Total Equity + Total Debt
     * 3. Calculate production emissions: Production × Emission Factor
     * 4. Calculate financed emissions: (Outstanding Amount / Total Equity + Debt) × Production Emissions
     * 
     * @param inputs - Form data containing all required financial and production data
     * @param companyType - Type of company (listed/unlisted)
     * @returns Calculation results with attribution factor, financed emissions, and metadata
     */
    calculate: (inputs, companyType) => {
      const outstandingAmount = inputs.outstanding_amount;
      const production = inputs.production;
      const emissionFactor = inputs.emission_factor;
      
      // Step 1: Calculate attribution factor (consistent across all formulas)
      const attributionFactor = calculateAttributionFactor(outstandingAmount, inputs.total_assets);
      
      // Step 2: Calculate Total Equity + Debt for unlisted companies
      const totalEquityPlusDebt = calculateTotalEquityPlusDebt(inputs);
      
      // Step 3: Calculate production-based emissions
      const productionEmissions = production * emissionFactor;
      
      // Step 4: Calculate financed emissions using Total Equity + Debt as denominator
      const financedEmissions = calculateFinancedEmissions(outstandingAmount, totalEquityPlusDebt, productionEmissions);
      
      return {
        attributionFactor,
        emissionFactor: productionEmissions,
        financedEmissions,
        dataQualityScore: 3,
        methodology: 'PCAF Option 2b - Production Data (Unlisted/Private)',
        calculationSteps: createCommonCalculationSteps(
          outstandingAmount,
          inputs.total_assets,
          totalEquityPlusDebt,
          'Total Equity + Debt Calculation',
          `${inputs.totalEquity} + ${inputs.totalDebt} = ${totalEquityPlusDebt.toFixed(2)}`,
          productionEmissions,
          'Production Emissions',
          financedEmissions
        ),
        metadata: {
          companyType,
          optionCode: '2b',
          category: 'listed_equity',
          totalEquityPlusDebt,
          productionEmissions,
          formula: 'Σ (Outstanding amount_c / (Total equity + debt)_c) × Production_c × Emission factor'
        }
      };
    },
    notes: [
      'Data quality score: 3',
      'Applicable to all scopes (1, 2, 3)',
      'Based on production volume and emission factors',
      'Formula: Σ (Outstanding amount_c / (Total equity + debt)_c) × Production_c × Emission factor'
    ]
  }
];

// ============================================================================
// EXPORT SECTION
// ============================================================================
// Note: Business Loans formulas have been removed as requested.
// This file now focuses only on Corporate Bonds (Listed Equity formulas).

/**
 * Export all available formulas
 * Currently only includes Listed Equity & Corporate Bonds formulas
 */
export const ALL_FORMULAS = [
  ...LISTED_EQUITY_FORMULAS
];

/**
 * Helper function to get formulas by category
 * @param category - The category to filter by ('listed_equity' only)
 * @returns Array of formulas matching the category
 */
export const getFormulasByCategory = (category: 'listed_equity') => {
  return ALL_FORMULAS.filter(formula => formula.category === category);
};

/**
 * Helper function to get a specific formula by its ID
 * @param id - The unique identifier of the formula
 * @returns The formula configuration object or undefined if not found
 */
export const getFormulaById = (id: string) => {
  return ALL_FORMULAS.find(formula => formula.id === id);
};

/**
 * Helper function to get formulas by data quality score
 * @param score - The data quality score to filter by (1-5, where 1 is highest quality)
 * @returns Array of formulas matching the specified data quality score
 */
export const getFormulasByScore = (score: number) => {
  return ALL_FORMULAS.filter(formula => formula.dataQualityScore === score);
};
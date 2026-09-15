/**
 * PCAF Formula Configurations - Facilitated Emissions
 * 
 * This file contains PCAF (Partnership for Carbon Accounting Financials) formula configurations
 * for calculating facilitated emissions. Facilitated emissions are emissions that result from 
 * financial services provided to clients, such as investment banking, advisory services, 
 * underwriting, and asset management.
 * 
 * Key Concepts:
 * - Facilitated Amount: The amount of financial services provided
 * - Attribution Factor: Facilitated Amount / Total Company Value (EVIC for listed, Total Equity + Debt for unlisted)
 * - Weighting Factor: Factor to account for the proportion of services provided
 * - Facilitated Emissions: The final calculated emissions attributed to the financial services
 * 
 * Available Formula Options (12 total - 6 options × 2 company types):
 * 
 * LISTED / UNLISTED COMPANIES:
 * - Option 1a: Verified GHG Emissions (Score 1)
 * - Option 1b: Unverified GHG Emissions (Score 2)
 * - Option 2a: Energy Consumption Data (Score 2)
 * - Option 2b: Production Data (Score 3)
 * - Option 3a: Revenue-based sector intensity (Score 4)
 * - Option 3c: Asset turnover ratio (Score 5)
 */

import { FormulaConfig } from '../types/formula';
import {
  COMMON_INPUTS,
  EMISSION_UNIT_OPTIONS,
  calculateAttributionFactorListed,
  calculateAttributionFactorUnlisted,
  calculateEVIC,
  calculateTotalEquityPlusDebt,
  calculateFinancedEmissions,
  createCommonCalculationSteps
} from './sharedFormulaUtils';

// ============================================================================
// FACILITATED EMISSION FORMULAS (Table 10-1)
// ============================================================================
// These formulas are used for calculating facilitated emissions from financial services
// provided to clients. Separate formulas for listed and unlisted companies.

export const FACILITATED_EMISSION_FORMULAS: FormulaConfig[] = [
  /**
   * OPTION 1A - VERIFIED GHG EMISSIONS (FACILITATED - LISTED)
   * 
   * Formula: Σ (Facilitated amount_c / EVIC_c) × Weighting factor × Verified company emissions_c
   * Data Quality Score: 1 (Highest)
   */
  {
    id: '1a-facilitated-verified-listed',
    name: 'Option 1a - Verified GHG Emissions (Facilitated - Listed)',
    description: 'Verified GHG emissions data from the listed client company in accordance with the GHG Protocol',
    category: 'facilitated_emission',
    optionCode: '1a',
    dataQualityScore: 1,
    applicableScopes: ['scope1', 'scope2', 'scope3'],
    inputs: [
      {
        name: 'facilitated_amount',
        label: 'Facilitated Amount',
        type: 'number',
        required: true,
        unit: 'PKR',
        description: 'Total amount of financial services provided to the client'
      },
      COMMON_INPUTS.total_assets,
      COMMON_INPUTS.evic,
      {
        name: 'weighting_factor',
        label: 'Weighting Factor',
        type: 'number',
        required: true,
        unit: 'ratio',
        description: 'Factor representing the proportion of services provided (0-1)',
        validation: { min: 0, max: 1 }
      },
      {
        name: 'verified_emissions',
        label: 'Verified GHG Emissions',
        type: 'number',
        required: true,
        unit: 'tCO2e',
        description: 'Total carbon emissions from the client company (verified by third party)',
        unitOptions: EMISSION_UNIT_OPTIONS
      }
    ],
    calculate: (inputs: Record<string, unknown>, companyType: 'listed' | 'private') => {
      const facilitatedAmount = inputs.facilitated_amount || 0;
      const weightingFactor = inputs.weighting_factor || 0;
      const verifiedEmissions = inputs.verified_emissions || 0;
      const evic = calculateEVIC(inputs);
      const attributionFactor = calculateAttributionFactorListed(facilitatedAmount, evic);
      const facilitatedEmissions = (facilitatedAmount / evic) * weightingFactor * verifiedEmissions;
      
      return {
        attributionFactor,
        emissionFactor: verifiedEmissions,
        financedEmissions: facilitatedEmissions,
        dataQualityScore: 1,
        methodology: 'Option 1a - Verified GHG Emissions (Facilitated - Listed)',
        calculationSteps: [
          {
            step: 'EVIC Calculation',
            value: evic,
            formula: `Share Price × Outstanding Shares + Total Debt + Minority Interest + Preferred Stock = ${evic.toFixed(2)}`
          },
          {
            step: 'Attribution Factor',
            value: attributionFactor,
            formula: `${facilitatedAmount} / ${evic} = ${attributionFactor.toFixed(6)}`
          },
          {
            step: 'Facilitated Emissions',
            value: facilitatedEmissions,
            formula: `(${facilitatedAmount} / ${evic}) × ${weightingFactor} × ${verifiedEmissions} = ${facilitatedEmissions.toFixed(2)} tCO2e`
          }
        ],
        metadata: {
          companyType: 'listed',
          optionCode: '1a',
          category: 'facilitated_emission',
          formula: 'Σ (Facilitated amount_c / EVIC_c) × Weighting factor × Verified company emissions_c'
        }
      };
    },
    notes: [
      'Use verified emissions data from the listed client company',
      'Data should be verified by a third party',
      'Weighting factor should reflect the proportion of services provided',
      'Highest data quality score available'
    ]
  },

  /**
   * OPTION 1A - VERIFIED GHG EMISSIONS (FACILITATED - UNLISTED)
   * 
   * Formula: Σ (Facilitated amount_c / (Total equity + debt)_c) × Weighting factor × Verified company emissions_c
   * Data Quality Score: 1 (Highest)
   */
  {
    id: '1a-facilitated-verified-unlisted',
    name: 'Option 1a - Verified GHG Emissions (Facilitated - Unlisted)',
    description: 'Verified GHG emissions data from the unlisted client company in accordance with the GHG Protocol',
    category: 'facilitated_emission',
    optionCode: '1a',
    dataQualityScore: 1,
    applicableScopes: ['scope1', 'scope2', 'scope3'],
    inputs: [
      {
        name: 'facilitated_amount',
        label: 'Facilitated Amount',
        type: 'number',
        required: true,
        unit: 'PKR',
        description: 'Total amount of financial services provided to the client'
      },
      COMMON_INPUTS.total_assets,
      COMMON_INPUTS.total_equity_plus_debt,
      {
        name: 'weighting_factor',
        label: 'Weighting Factor',
        type: 'number',
        required: true,
        unit: 'ratio',
        description: 'Factor representing the proportion of services provided (0-1)',
        validation: { min: 0, max: 1 }
      },
      {
        name: 'verified_emissions',
        label: 'Verified GHG Emissions',
        type: 'number',
        required: true,
        unit: 'tCO2e',
        description: 'Total carbon emissions from the client company (verified by third party)',
        unitOptions: EMISSION_UNIT_OPTIONS
      }
    ],
    calculate: (inputs: Record<string, unknown>, companyType: 'listed' | 'private') => {
      const facilitatedAmount = inputs.facilitated_amount || 0;
      const weightingFactor = inputs.weighting_factor || 0;
      const verifiedEmissions = inputs.verified_emissions || 0;
      const totalEquityPlusDebt = calculateTotalEquityPlusDebt(inputs);
      const attributionFactor = calculateAttributionFactorUnlisted(facilitatedAmount, totalEquityPlusDebt);
      const facilitatedEmissions = (facilitatedAmount / totalEquityPlusDebt) * weightingFactor * verifiedEmissions;
      
      return {
        attributionFactor,
        emissionFactor: verifiedEmissions,
        financedEmissions: facilitatedEmissions,
        dataQualityScore: 1,
        methodology: 'Option 1a - Verified GHG Emissions (Facilitated - Unlisted)',
        calculationSteps: [
          {
            step: 'Total Equity + Debt Calculation',
            value: totalEquityPlusDebt,
            formula: `Total Equity + Total Debt = ${totalEquityPlusDebt.toFixed(2)}`
          },
          {
            step: 'Attribution Factor',
            value: attributionFactor,
            formula: `${facilitatedAmount} / ${totalEquityPlusDebt} = ${attributionFactor.toFixed(6)}`
          },
          {
            step: 'Facilitated Emissions',
            value: facilitatedEmissions,
            formula: `(${facilitatedAmount} / ${totalEquityPlusDebt}) × ${weightingFactor} × ${verifiedEmissions} = ${facilitatedEmissions.toFixed(2)} tCO2e`
          }
        ],
        metadata: {
          companyType: 'unlisted',
          optionCode: '1a',
          category: 'facilitated_emission',
          formula: 'Σ (Facilitated amount_c / (Total equity + debt)_c) × Weighting factor × Verified company emissions_c'
        }
      };
    },
    notes: [
      'Use verified emissions data from the unlisted client company',
      'Data should be verified by a third party',
      'Weighting factor should reflect the proportion of services provided',
      'Highest data quality score available for unlisted companies'
    ]
  },

  /**
   * OPTION 1B - UNVERIFIED GHG EMISSIONS (FACILITATED - LISTED)
   * 
   * Formula: Σ (Facilitated amount_c / EVIC_c) × Weighting factor × Unverified company emissions_c
   * Data Quality Score: 2 (Good)
   */
  {
    id: '1b-facilitated-unverified-listed',
    name: 'Option 1b - Unverified GHG Emissions (Facilitated - Listed)',
    description: 'Unverified GHG emissions data from the listed client company',
    category: 'facilitated_emission',
    optionCode: '1b',
    dataQualityScore: 2,
    applicableScopes: ['scope1', 'scope2', 'scope3'],
    inputs: [
      {
        name: 'facilitated_amount',
        label: 'Facilitated Amount',
        type: 'number',
        required: true,
        unit: 'PKR',
        description: 'Total amount of financial services provided to the client'
      },
      COMMON_INPUTS.total_assets,
      COMMON_INPUTS.evic,
      {
        name: 'weighting_factor',
        label: 'Weighting Factor',
        type: 'number',
        required: true,
        unit: 'ratio',
        description: 'Factor representing the proportion of services provided (0-1)',
        validation: { min: 0, max: 1 }
      },
      {
        name: 'unverified_emissions',
        label: 'Unverified GHG Emissions',
        type: 'number',
        required: true,
        unit: 'tCO2e',
        description: 'Total carbon emissions from the client company (not verified by third party)',
        unitOptions: EMISSION_UNIT_OPTIONS
      }
    ],
    calculate: (inputs: Record<string, unknown>, companyType: 'listed' | 'private') => {
      const facilitatedAmount = inputs.facilitated_amount || 0;
      const weightingFactor = inputs.weighting_factor || 0;
      const unverifiedEmissions = inputs.unverified_emissions || 0;
      const evic = calculateEVIC(inputs);
      const attributionFactor = calculateAttributionFactorListed(facilitatedAmount, evic);
      const facilitatedEmissions = (facilitatedAmount / evic) * weightingFactor * unverifiedEmissions;
      
      return {
        attributionFactor,
        emissionFactor: unverifiedEmissions,
        financedEmissions: facilitatedEmissions,
        dataQualityScore: 2,
        methodology: 'Option 1b - Unverified GHG Emissions (Facilitated - Listed)',
        calculationSteps: [
          {
            step: 'EVIC Calculation',
            value: evic,
            formula: `Share Price × Outstanding Shares + Total Debt + Minority Interest + Preferred Stock = ${evic.toFixed(2)}`
          },
          {
            step: 'Attribution Factor',
            value: attributionFactor,
            formula: `${facilitatedAmount} / ${evic} = ${attributionFactor.toFixed(6)}`
          },
          {
            step: 'Facilitated Emissions',
            value: facilitatedEmissions,
            formula: `(${facilitatedAmount} / ${evic}) × ${weightingFactor} × ${unverifiedEmissions} = ${facilitatedEmissions.toFixed(2)} tCO2e`
          }
        ],
        metadata: {
          companyType: 'listed',
          optionCode: '1b',
          category: 'facilitated_emission',
          formula: 'Σ (Facilitated amount_c / EVIC_c) × Weighting factor × Unverified company emissions_c'
        }
      };
    },
    notes: [
      'Use unverified emissions data from the listed client company',
      'Data should be company-specific but not third-party verified',
      'Weighting factor should reflect the proportion of services provided',
      'Good data quality score for listed companies'
    ]
  },

  /**
   * OPTION 1B - UNVERIFIED GHG EMISSIONS (FACILITATED - UNLISTED)
   * 
   * Formula: Σ (Facilitated amount_c / (Total equity + debt)_c) × Weighting factor × Unverified company emissions_c
   * Data Quality Score: 2 (Good)
   */
  {
    id: '1b-facilitated-unverified-unlisted',
    name: 'Option 1b - Unverified GHG Emissions (Facilitated - Unlisted)',
    description: 'Unverified GHG emissions data from the unlisted client company',
    category: 'facilitated_emission',
    optionCode: '1b',
    dataQualityScore: 2,
    applicableScopes: ['scope1', 'scope2', 'scope3'],
    inputs: [
      {
        name: 'facilitated_amount',
        label: 'Facilitated Amount',
        type: 'number',
        required: true,
        unit: 'PKR',
        description: 'Total amount of financial services provided to the client'
      },
      COMMON_INPUTS.total_assets,
      COMMON_INPUTS.total_equity_plus_debt,
      {
        name: 'weighting_factor',
        label: 'Weighting Factor',
        type: 'number',
        required: true,
        unit: 'ratio',
        description: 'Factor representing the proportion of services provided (0-1)',
        validation: { min: 0, max: 1 }
      },
      {
        name: 'unverified_emissions',
        label: 'Unverified GHG Emissions',
        type: 'number',
        required: true,
        unit: 'tCO2e',
        description: 'Total carbon emissions from the client company (not verified by third party)',
        unitOptions: EMISSION_UNIT_OPTIONS
      }
    ],
    calculate: (inputs: Record<string, unknown>, companyType: 'listed' | 'private') => {
      const facilitatedAmount = inputs.facilitated_amount || 0;
      const weightingFactor = inputs.weighting_factor || 0;
      const unverifiedEmissions = inputs.unverified_emissions || 0;
      const totalEquityPlusDebt = calculateTotalEquityPlusDebt(inputs);
      const attributionFactor = calculateAttributionFactorUnlisted(facilitatedAmount, totalEquityPlusDebt);
      const facilitatedEmissions = (facilitatedAmount / totalEquityPlusDebt) * weightingFactor * unverifiedEmissions;
      
      return {
        attributionFactor,
        emissionFactor: unverifiedEmissions,
        financedEmissions: facilitatedEmissions,
        dataQualityScore: 2,
        methodology: 'Option 1b - Unverified GHG Emissions (Facilitated - Unlisted)',
        calculationSteps: [
          {
            step: 'Total Equity + Debt Calculation',
            value: totalEquityPlusDebt,
            formula: `Total Equity + Total Debt = ${totalEquityPlusDebt.toFixed(2)}`
          },
          {
            step: 'Attribution Factor',
            value: attributionFactor,
            formula: `${facilitatedAmount} / ${totalEquityPlusDebt} = ${attributionFactor.toFixed(6)}`
          },
          {
            step: 'Facilitated Emissions',
            value: facilitatedEmissions,
            formula: `(${facilitatedAmount} / ${totalEquityPlusDebt}) × ${weightingFactor} × ${unverifiedEmissions} = ${facilitatedEmissions.toFixed(2)} tCO2e`
          }
        ],
        metadata: {
          companyType: 'unlisted',
          optionCode: '1b',
          category: 'facilitated_emission',
          formula: 'Σ (Facilitated amount_c / (Total equity + debt)_c) × Weighting factor × Unverified company emissions_c'
        }
      };
    },
    notes: [
      'Use unverified emissions data from the unlisted client company',
      'Data should be company-specific but not third-party verified',
      'Weighting factor should reflect the proportion of services provided',
      'Good data quality score for unlisted companies'
    ]
  },

  /**
   * OPTION 2A - ENERGY CONSUMPTION DATA (FACILITATED - LISTED)
   * 
   * Formula: Σ (Facilitated amount_c / EVIC_c) × Weighting factor × Energy consumption_c × Emission factor
   * Data Quality Score: 2 (Good)
   */
  {
    id: '2a-facilitated-energy-listed',
    name: 'Option 2a - Energy Consumption Data (Facilitated - Listed)',
    description: 'Energy consumption data with energy-specific emission factors for facilitated emissions from listed companies',
    category: 'facilitated_emission',
    optionCode: '2a',
    dataQualityScore: 2,
    applicableScopes: ['scope1', 'scope2'],
    inputs: [
      {
        name: 'facilitated_amount',
        label: 'Facilitated Amount',
        type: 'number',
        required: true,
        unit: 'PKR',
        description: 'Total amount of financial services provided to the client'
      },
      COMMON_INPUTS.total_assets,
      COMMON_INPUTS.evic,
      {
        name: 'weighting_factor',
        label: 'Weighting Factor',
        type: 'number',
        required: true,
        unit: 'ratio',
        description: 'Factor representing the proportion of services provided (0-1)',
        validation: { min: 0, max: 1 }
      },
      {
        name: 'energy_consumption',
        label: 'Energy Consumption',
        type: 'number',
        required: true,
        unit: 'tCO2e',
        description: 'Electricity emissions from EPA/DEFRA Scope 2 form (tCO2e)'
      },
      {
        name: 'emission_factor',
        label: 'Emission Factor',
        type: 'number',
        required: true,
        unit: 'ratio',
        description: 'Set to 1 when electricity is already converted via EPA/DEFRA'
      },
      {
        name: 'process_emissions',
        label: 'Process Emissions',
        type: 'number',
        required: false,
        unit: 'tCO2e',
        description: 'Optional process emissions added to electricity (tCO2e)',
        unitOptions: EMISSION_UNIT_OPTIONS
      }
    ],
    calculate: (inputs: Record<string, unknown>, companyType: 'listed' | 'private') => {
      const facilitatedAmount = inputs.facilitated_amount || 0;
      const weightingFactor = inputs.weighting_factor || 0;
      const energyConsumption = inputs.energy_consumption || 0;
      const emissionFactor = inputs.emission_factor || 0;
      const processEmissions = inputs.process_emissions || 0;
      const evic = calculateEVIC(inputs);
      const attributionFactor = calculateAttributionFactorListed(facilitatedAmount, evic);
      const energyEmissions = energyConsumption * emissionFactor;
      const facilitatedEmissions = (facilitatedAmount / evic) * weightingFactor * energyEmissions + processEmissions;
      
      return {
        attributionFactor,
        emissionFactor: energyEmissions,
        financedEmissions: facilitatedEmissions,
        dataQualityScore: 2,
        methodology: 'Option 2a - Energy Consumption Data (Facilitated - Listed)',
        calculationSteps: [
          {
            step: 'EVIC Calculation',
            value: evic,
            formula: `Share Price × Outstanding Shares + Total Debt + Minority Interest + Preferred Stock = ${evic.toFixed(2)}`
          },
          {
            step: 'Attribution Factor',
            value: attributionFactor,
            formula: `${facilitatedAmount} / ${evic} = ${attributionFactor.toFixed(6)}`
          },
          {
            step: 'Energy Emissions',
            value: energyEmissions,
            formula: `${energyConsumption} × ${emissionFactor} = ${energyEmissions.toFixed(2)} tCO2e`
          },
          {
            step: 'Facilitated Emissions',
            value: facilitatedEmissions,
            formula: `(${facilitatedAmount} / ${evic}) × ${weightingFactor} × ${energyEmissions} + ${processEmissions} = ${facilitatedEmissions.toFixed(2)} tCO2e`
          }
        ],
        metadata: {
          companyType: 'listed',
          optionCode: '2a',
          category: 'facilitated_emission',
          formula: 'Σ (Facilitated amount_c / EVIC_c) × Weighting factor × Energy consumption_c × Emission factor'
        }
      };
    },
    notes: [
      'Use EPA/DEFRA Scope 2 electricity form (same as finance emissions Option 2a)',
      'Include process emissions if available',
      'Weighting factor should reflect the proportion of services provided'
    ]
  },

  /**
   * OPTION 2A - ENERGY CONSUMPTION DATA (FACILITATED - UNLISTED)
   * 
   * Formula: Σ (Facilitated amount_c / (Total equity + debt)_c) × Weighting factor × Energy consumption_c × Emission factor
   * Data Quality Score: 2 (Good)
   */
  {
    id: '2a-facilitated-energy-unlisted',
    name: 'Option 2a - Energy Consumption Data (Facilitated - Unlisted)',
    description: 'Energy consumption data with energy-specific emission factors for facilitated emissions from unlisted companies',
    category: 'facilitated_emission',
    optionCode: '2a',
    dataQualityScore: 2,
    applicableScopes: ['scope1', 'scope2'],
    inputs: [
      {
        name: 'facilitated_amount',
        label: 'Facilitated Amount',
        type: 'number',
        required: true,
        unit: 'PKR',
        description: 'Total amount of financial services provided to the client'
      },
      COMMON_INPUTS.total_assets,
      COMMON_INPUTS.total_equity_plus_debt,
      {
        name: 'weighting_factor',
        label: 'Weighting Factor',
        type: 'number',
        required: true,
        unit: 'ratio',
        description: 'Factor representing the proportion of services provided (0-1)',
        validation: { min: 0, max: 1 }
      },
      {
        name: 'energy_consumption',
        label: 'Energy Consumption',
        type: 'number',
        required: true,
        unit: 'tCO2e',
        description: 'Electricity emissions from EPA/DEFRA Scope 2 form (tCO2e)'
      },
      {
        name: 'emission_factor',
        label: 'Emission Factor',
        type: 'number',
        required: true,
        unit: 'ratio',
        description: 'Set to 1 when electricity is already converted via EPA/DEFRA'
      },
      {
        name: 'process_emissions',
        label: 'Process Emissions',
        type: 'number',
        required: false,
        unit: 'tCO2e',
        description: 'Optional process emissions added to electricity (tCO2e)',
        unitOptions: EMISSION_UNIT_OPTIONS
      }
    ],
    calculate: (inputs: Record<string, unknown>, companyType: 'listed' | 'private') => {
      const facilitatedAmount = inputs.facilitated_amount || 0;
      const weightingFactor = inputs.weighting_factor || 0;
      const energyConsumption = inputs.energy_consumption || 0;
      const emissionFactor = inputs.emission_factor || 0;
      const processEmissions = inputs.process_emissions || 0;
      const totalEquityPlusDebt = calculateTotalEquityPlusDebt(inputs);
      const attributionFactor = calculateAttributionFactorUnlisted(facilitatedAmount, totalEquityPlusDebt);
      const energyEmissions = energyConsumption * emissionFactor;
      const facilitatedEmissions = (facilitatedAmount / totalEquityPlusDebt) * weightingFactor * energyEmissions + processEmissions;
      
      return {
        attributionFactor,
        emissionFactor: energyEmissions,
        financedEmissions: facilitatedEmissions,
        dataQualityScore: 2,
        methodology: 'Option 2a - Energy Consumption Data (Facilitated - Unlisted)',
        calculationSteps: [
          {
            step: 'Total Equity + Debt Calculation',
            value: totalEquityPlusDebt,
            formula: `Total Equity + Total Debt = ${totalEquityPlusDebt.toFixed(2)}`
          },
          {
            step: 'Attribution Factor',
            value: attributionFactor,
            formula: `${facilitatedAmount} / ${totalEquityPlusDebt} = ${attributionFactor.toFixed(6)}`
          },
          {
            step: 'Energy Emissions',
            value: energyEmissions,
            formula: `${energyConsumption} × ${emissionFactor} = ${energyEmissions.toFixed(2)} tCO2e`
          },
          {
            step: 'Facilitated Emissions',
            value: facilitatedEmissions,
            formula: `(${facilitatedAmount} / ${totalEquityPlusDebt}) × ${weightingFactor} × ${energyEmissions} + ${processEmissions} = ${facilitatedEmissions.toFixed(2)} tCO2e`
          }
        ],
        metadata: {
          companyType: 'unlisted',
          optionCode: '2a',
          category: 'facilitated_emission',
          formula: 'Σ (Facilitated amount_c / (Total equity + debt)_c) × Weighting factor × Energy consumption_c × Emission factor'
        }
      };
    },
    notes: [
      'Use EPA/DEFRA Scope 2 electricity form (same as finance emissions Option 2a)',
      'Include process emissions if available',
      'Weighting factor should reflect the proportion of services provided'
    ]
  },

  /**
   * OPTION 2B - PRODUCTION DATA (FACILITATED - LISTED)
   * 
   * Formula: Σ (Facilitated amount_c / EVIC_c) × Weighting factor × Production_c × Emission factor
   * Data Quality Score: 3 (Fair)
   */
  {
    id: '2b-facilitated-production-listed',
    name: 'Option 2b - Production Data (Facilitated - Listed)',
    description: 'Production data with production-specific emission factors for facilitated emissions from listed companies',
    category: 'facilitated_emission',
    optionCode: '2b',
    dataQualityScore: 3,
    applicableScopes: ['scope1', 'scope2', 'scope3'],
    inputs: [
      {
        name: 'facilitated_amount',
        label: 'Facilitated Amount',
        type: 'number',
        required: true,
        unit: 'PKR',
        description: 'Total amount of financial services provided to the client'
      },
      COMMON_INPUTS.total_assets,
      COMMON_INPUTS.evic,
      {
        name: 'weighting_factor',
        label: 'Weighting Factor',
        type: 'number',
        required: true,
        unit: 'ratio',
        description: 'Factor representing the proportion of services provided (0-1)',
        validation: { min: 0, max: 1 }
      },
      {
        name: 'production',
        label: 'Production',
        type: 'number',
        required: true,
        unit: 'tonnes',
        description: 'How much the client company produced (e.g., tonnes of rice, steel, etc.)',
        unitOptions: [
          { value: 'tonnes', label: 'Tonnes' },
          { value: 'mt', label: 'Mt (Million Tonnes)' },
          { value: 'kg', label: 'Kilograms' },
          { value: 'units', label: 'Units' },
          { value: 'barrels', label: 'Barrels' },
          { value: 'cubic-meters', label: 'Cubic Meters' }
        ]
      },
      {
        name: 'emission_factor',
        label: 'Emission Factor',
        type: 'number',
        required: true,
        unit: 'tCO2e/tonne',
        description: 'How much carbon is released per unit of product made',
        unitOptions: [
          { value: 'tCO2e/tonne', label: 'tCO2e/tonne' },
          { value: 'kgCO2e/tonne', label: 'kgCO2e/tonne' },
          { value: 'tCO2e/unit', label: 'tCO2e/unit' },
          { value: 'tCO2e/barrel', label: 'tCO2e/barrel' }
        ]
      }
    ],
    calculate: (inputs: Record<string, unknown>, companyType: 'listed' | 'private') => {
      const facilitatedAmount = inputs.facilitated_amount || 0;
      const weightingFactor = inputs.weighting_factor || 0;
      const production = inputs.production || 0;
      const emissionFactor = inputs.emission_factor || 0;
      const evic = calculateEVIC(inputs);
      const attributionFactor = calculateAttributionFactorListed(facilitatedAmount, evic);
      const productionEmissions = production * emissionFactor;
      const facilitatedEmissions = (facilitatedAmount / evic) * weightingFactor * productionEmissions;
      
      return {
        attributionFactor,
        emissionFactor: productionEmissions,
        financedEmissions: facilitatedEmissions,
        dataQualityScore: 3,
        methodology: 'Option 2b - Production Data (Facilitated - Listed)',
        calculationSteps: [
          {
            step: 'EVIC Calculation',
            value: evic,
            formula: `Share Price × Outstanding Shares + Total Debt + Minority Interest + Preferred Stock = ${evic.toFixed(2)}`
          },
          {
            step: 'Attribution Factor',
            value: attributionFactor,
            formula: `${facilitatedAmount} / ${evic} = ${attributionFactor.toFixed(6)}`
          },
          {
            step: 'Production Emissions',
            value: productionEmissions,
            formula: `${production} × ${emissionFactor} = ${productionEmissions.toFixed(2)} tCO2e`
          },
          {
            step: 'Facilitated Emissions',
            value: facilitatedEmissions,
            formula: `(${facilitatedAmount} / ${evic}) × ${weightingFactor} × ${productionEmissions} = ${facilitatedEmissions.toFixed(2)} tCO2e`
          }
        ],
        metadata: {
          companyType: 'listed',
          optionCode: '2b',
          category: 'facilitated_emission',
          formula: 'Σ (Facilitated amount_c / EVIC_c) × Weighting factor × Production_c × Emission factor'
        }
      };
    },
    notes: [
      'Use production data from the listed client company',
      'Apply production-specific emission factors',
      'Weighting factor should reflect the proportion of services provided',
      'Include all relevant production outputs'
    ]
  },

  /**
   * OPTION 2B - PRODUCTION DATA (FACILITATED - UNLISTED)
   * 
   * Formula: Σ (Facilitated amount_c / (Total equity + debt)_c) × Weighting factor × Production_c × Emission factor
   * Data Quality Score: 3 (Fair)
   */
  {
    id: '2b-facilitated-production-unlisted',
    name: 'Option 2b - Production Data (Facilitated - Unlisted)',
    description: 'Production data with production-specific emission factors for facilitated emissions from unlisted companies',
    category: 'facilitated_emission',
    optionCode: '2b',
    dataQualityScore: 3,
    applicableScopes: ['scope1', 'scope2', 'scope3'],
    inputs: [
      {
        name: 'facilitated_amount',
        label: 'Facilitated Amount',
        type: 'number',
        required: true,
        unit: 'PKR',
        description: 'Total amount of financial services provided to the client'
      },
      COMMON_INPUTS.total_assets,
      COMMON_INPUTS.total_equity_plus_debt,
      {
        name: 'weighting_factor',
        label: 'Weighting Factor',
        type: 'number',
        required: true,
        unit: 'ratio',
        description: 'Factor representing the proportion of services provided (0-1)',
        validation: { min: 0, max: 1 }
      },
      {
        name: 'production',
        label: 'Production',
        type: 'number',
        required: true,
        unit: 'tonnes',
        description: 'How much the client company produced (e.g., tonnes of rice, steel, etc.)',
        unitOptions: [
          { value: 'tonnes', label: 'Tonnes' },
          { value: 'mt', label: 'Mt (Million Tonnes)' },
          { value: 'kg', label: 'Kilograms' },
          { value: 'units', label: 'Units' },
          { value: 'barrels', label: 'Barrels' },
          { value: 'cubic-meters', label: 'Cubic Meters' }
        ]
      },
      {
        name: 'emission_factor',
        label: 'Emission Factor',
        type: 'number',
        required: true,
        unit: 'tCO2e/tonne',
        description: 'How much carbon is released per unit of product made',
        unitOptions: [
          { value: 'tCO2e/tonne', label: 'tCO2e/tonne' },
          { value: 'kgCO2e/tonne', label: 'kgCO2e/tonne' },
          { value: 'tCO2e/unit', label: 'tCO2e/unit' },
          { value: 'tCO2e/barrel', label: 'tCO2e/barrel' }
        ]
      }
    ],
    calculate: (inputs: Record<string, unknown>, companyType: 'listed' | 'private') => {
      const facilitatedAmount = inputs.facilitated_amount || 0;
      const weightingFactor = inputs.weighting_factor || 0;
      const production = inputs.production || 0;
      const emissionFactor = inputs.emission_factor || 0;
      const totalEquityPlusDebt = calculateTotalEquityPlusDebt(inputs);
      const attributionFactor = calculateAttributionFactorUnlisted(facilitatedAmount, totalEquityPlusDebt);
      const productionEmissions = production * emissionFactor;
      const facilitatedEmissions = (facilitatedAmount / totalEquityPlusDebt) * weightingFactor * productionEmissions;
      
      return {
        attributionFactor,
        emissionFactor: productionEmissions,
        financedEmissions: facilitatedEmissions,
        dataQualityScore: 3,
        methodology: 'Option 2b - Production Data (Facilitated - Unlisted)',
        calculationSteps: [
          {
            step: 'Total Equity + Debt Calculation',
            value: totalEquityPlusDebt,
            formula: `Total Equity + Total Debt = ${totalEquityPlusDebt.toFixed(2)}`
          },
          {
            step: 'Attribution Factor',
            value: attributionFactor,
            formula: `${facilitatedAmount} / ${totalEquityPlusDebt} = ${attributionFactor.toFixed(6)}`
          },
          {
            step: 'Production Emissions',
            value: productionEmissions,
            formula: `${production} × ${emissionFactor} = ${productionEmissions.toFixed(2)} tCO2e`
          },
          {
            step: 'Facilitated Emissions',
            value: facilitatedEmissions,
            formula: `(${facilitatedAmount} / ${totalEquityPlusDebt}) × ${weightingFactor} × ${productionEmissions} = ${facilitatedEmissions.toFixed(2)} tCO2e`
          }
        ],
        metadata: {
          companyType: 'unlisted',
          optionCode: '2b',
          category: 'facilitated_emission',
          formula: 'Σ (Facilitated amount_c / (Total equity + debt)_c) × Weighting factor × Production_c × Emission factor'
        }
      };
    },
    notes: [
      'Use production data from the unlisted client company',
      'Apply production-specific emission factors',
      'Weighting factor should reflect the proportion of services provided',
      'Include all relevant production outputs'
    ]
  },

  /**
   * OPTION 3A - REVENUE-BASED (FACILITATED - LISTED)
   * Formula: Σ (Facilitated amount_c / EVIC_c) × Weighting factor × Revenue_c × sector intensity
   */
  {
    id: '3a-facilitated-revenue-listed',
    name: 'Option 3a - Revenue-based (Facilitated - Listed)',
    description: 'Company revenue × sector intensity (GHG / revenue from reference table) with EVIC attribution and weighting factor',
    category: 'facilitated_emission',
    optionCode: '3a',
    dataQualityScore: 4,
    applicableScopes: ['scope1', 'scope2', 'scope3'],
    inputs: [
      { name: 'facilitated_amount', label: 'Facilitated Amount', type: 'number', required: true, unit: 'PKR' },
      COMMON_INPUTS.evic,
      { name: 'weighting_factor', label: 'Weighting Factor', type: 'number', required: true, unit: 'ratio', validation: { min: 0, max: 1 } },
      { name: 'company_revenue', label: 'Company Revenue', type: 'number', required: true, unit: 'PKR' },
      { name: 'sector_intensity', label: 'Sector intensity', type: 'number', required: true, unit: 'kgCO2e/PKR' },
    ],
    calculate: (inputs) => {
      const facilitatedAmount = Number(inputs.facilitated_amount || 0);
      const weightingFactor = Number(inputs.weighting_factor || 0);
      const companyRevenue = Number(inputs.company_revenue || 0);
      const rawIntensity = Number(inputs.sector_intensity || 0);
      if (!facilitatedAmount || !weightingFactor || !companyRevenue || !rawIntensity) {
        throw new Error('Facilitated amount, weighting factor, company revenue, and sector intensity must be greater than 0');
      }
      const unit = String(inputs.sector_intensity_unit || 'kgCO2e/PKR');
      const intensity = unit.toLowerCase().includes('kg') ? rawIntensity / 1000 : rawIntensity;
      const evic = calculateEVIC(inputs);
      if (!evic) throw new Error('EVIC must be greater than 0');
      const attributionFactor = calculateAttributionFactorListed(facilitatedAmount, evic);
      const estimatedEmissions = companyRevenue * intensity;
      const facilitatedEmissions = attributionFactor * weightingFactor * estimatedEmissions;
      return {
        attributionFactor,
        emissionFactor: intensity,
        financedEmissions: facilitatedEmissions,
        dataQualityScore: 4,
        methodology: 'Option 3a - Revenue-based (Facilitated - Listed)',
        calculationSteps: [
          { step: 'EVIC', value: evic, formula: `EVIC = ${evic.toFixed(2)}` },
          { step: 'Attribution Factor', value: attributionFactor, formula: `${facilitatedAmount} / ${evic.toFixed(2)} = ${attributionFactor.toFixed(6)}` },
          { step: 'Sector intensity', value: intensity, formula: `${rawIntensity} ${unit} → ${intensity.toExponential(6)} tCO2e/PKR` },
          { step: 'Estimated company emissions', value: estimatedEmissions, formula: `${companyRevenue} × ${intensity.toExponential(6)} = ${estimatedEmissions.toFixed(4)}` },
          { step: 'Facilitated Emissions', value: facilitatedEmissions, formula: `${attributionFactor.toFixed(6)} × ${weightingFactor} × ${estimatedEmissions.toFixed(4)} = ${facilitatedEmissions.toFixed(4)}` },
        ],
        metadata: {
          companyType: 'listed',
          optionCode: '3a',
          category: 'facilitated_emission',
          formula: 'Σ (Facilitated amount_c / EVIC_c) × Weighting factor × Revenue_c × sector intensity',
        },
      };
    },
    notes: ['Data quality score: 4', 'Weighting factor fixed at 33% in the UI', 'Uses reference table intensity (GHG / revenue)'],
  },

  /**
   * OPTION 3A - REVENUE-BASED (FACILITATED - UNLISTED)
   * Formula: Σ (Facilitated amount_c / (Total equity + debt)_c) × Weighting factor × Revenue_c × sector intensity
   */
  {
    id: '3a-facilitated-revenue-unlisted',
    name: 'Option 3a - Revenue-based (Facilitated - Unlisted)',
    description: 'Company revenue × sector intensity (GHG / revenue from reference table) with equity+debt attribution and weighting factor',
    category: 'facilitated_emission',
    optionCode: '3a',
    dataQualityScore: 4,
    applicableScopes: ['scope1', 'scope2', 'scope3'],
    inputs: [
      { name: 'facilitated_amount', label: 'Facilitated Amount', type: 'number', required: true, unit: 'PKR' },
      COMMON_INPUTS.total_equity_plus_debt,
      { name: 'weighting_factor', label: 'Weighting Factor', type: 'number', required: true, unit: 'ratio', validation: { min: 0, max: 1 } },
      { name: 'company_revenue', label: 'Company Revenue', type: 'number', required: true, unit: 'PKR' },
      { name: 'sector_intensity', label: 'Sector intensity', type: 'number', required: true, unit: 'kgCO2e/PKR' },
    ],
    calculate: (inputs) => {
      const facilitatedAmount = Number(inputs.facilitated_amount || 0);
      const weightingFactor = Number(inputs.weighting_factor || 0);
      const companyRevenue = Number(inputs.company_revenue || 0);
      const rawIntensity = Number(inputs.sector_intensity || 0);
      if (!facilitatedAmount || !weightingFactor || !companyRevenue || !rawIntensity) {
        throw new Error('Facilitated amount, weighting factor, company revenue, and sector intensity must be greater than 0');
      }
      const unit = String(inputs.sector_intensity_unit || 'kgCO2e/PKR');
      const intensity = unit.toLowerCase().includes('kg') ? rawIntensity / 1000 : rawIntensity;
      const totalEquityPlusDebt = calculateTotalEquityPlusDebt(inputs);
      if (!totalEquityPlusDebt) throw new Error('Total equity + debt must be greater than 0');
      const attributionFactor = calculateAttributionFactorUnlisted(facilitatedAmount, totalEquityPlusDebt);
      const estimatedEmissions = companyRevenue * intensity;
      const facilitatedEmissions = attributionFactor * weightingFactor * estimatedEmissions;
      return {
        attributionFactor,
        emissionFactor: intensity,
        financedEmissions: facilitatedEmissions,
        dataQualityScore: 4,
        methodology: 'Option 3a - Revenue-based (Facilitated - Unlisted)',
        calculationSteps: [
          { step: 'Total Equity + Debt', value: totalEquityPlusDebt, formula: `Equity + Debt = ${totalEquityPlusDebt.toFixed(2)}` },
          { step: 'Attribution Factor', value: attributionFactor, formula: `${facilitatedAmount} / ${totalEquityPlusDebt.toFixed(2)} = ${attributionFactor.toFixed(6)}` },
          { step: 'Sector intensity', value: intensity, formula: `${rawIntensity} ${unit} → ${intensity.toExponential(6)} tCO2e/PKR` },
          { step: 'Estimated company emissions', value: estimatedEmissions, formula: `${companyRevenue} × ${intensity.toExponential(6)} = ${estimatedEmissions.toFixed(4)}` },
          { step: 'Facilitated Emissions', value: facilitatedEmissions, formula: `${attributionFactor.toFixed(6)} × ${weightingFactor} × ${estimatedEmissions.toFixed(4)} = ${facilitatedEmissions.toFixed(4)}` },
        ],
        metadata: {
          companyType: 'unlisted',
          optionCode: '3a',
          category: 'facilitated_emission',
          formula: 'Σ (Facilitated amount_c / (Total equity + debt)_c) × Weighting factor × Revenue_c × sector intensity',
        },
      };
    },
    notes: ['Data quality score: 4', 'Weighting factor fixed at 33% in the UI', 'Uses reference table intensity (GHG / revenue)'],
  },

  /**
   * OPTION 3C - ASSET TURNOVER RATIO (FACILITATED - LISTED)
   * Formula: Σ Facilitated amount_c × Weighting factor × ATR_s × sector intensity
   */
  {
    id: '3c-facilitated-atr-listed',
    name: 'Option 3c - Asset Turnover Ratio (Facilitated - Listed)',
    description: 'Facilitated amount × weighting factor × ATR × sector intensity (GHG / revenue from reference table)',
    category: 'facilitated_emission',
    optionCode: '3c',
    dataQualityScore: 5,
    applicableScopes: ['scope1', 'scope2', 'scope3'],
    inputs: [
      { name: 'facilitated_amount', label: 'Facilitated Amount', type: 'number', required: true, unit: 'PKR' },
      { name: 'weighting_factor', label: 'Weighting Factor', type: 'number', required: true, unit: 'ratio', validation: { min: 0, max: 1 } },
      { name: 'asset_turnover_ratio', label: 'Asset Turnover Ratio', type: 'number', required: true, unit: 'ratio' },
      { name: 'sector_intensity', label: 'Sector intensity', type: 'number', required: true, unit: 'kgCO2e/PKR' },
    ],
    calculate: (inputs) => {
      const facilitatedAmount = Number(inputs.facilitated_amount || 0);
      const weightingFactor = Number(inputs.weighting_factor || 0);
      const atr = Number(inputs.asset_turnover_ratio || 0);
      const rawIntensity = Number(inputs.sector_intensity || 0);
      if (!facilitatedAmount || !weightingFactor || !atr || !rawIntensity) {
        throw new Error('Facilitated amount, weighting factor, ATR, and sector intensity must be greater than 0');
      }
      const unit = String(inputs.sector_intensity_unit || 'kgCO2e/PKR');
      const intensity = unit.toLowerCase().includes('kg') ? rawIntensity / 1000 : rawIntensity;
      const facilitatedEmissions = facilitatedAmount * weightingFactor * atr * intensity;
      return {
        attributionFactor: 1,
        emissionFactor: intensity,
        financedEmissions: facilitatedEmissions,
        dataQualityScore: 5,
        methodology: 'Option 3c - Asset Turnover Ratio (Facilitated - Listed)',
        calculationSteps: [
          { step: 'Sector intensity', value: intensity, formula: `${rawIntensity} ${unit} → ${intensity.toExponential(6)} tCO2e/PKR` },
          { step: 'Facilitated Emissions', value: facilitatedEmissions, formula: `${facilitatedAmount} × ${weightingFactor} × ${atr} × ${intensity.toExponential(6)} = ${facilitatedEmissions.toFixed(4)}` },
        ],
        metadata: {
          companyType: 'listed',
          optionCode: '3c',
          category: 'facilitated_emission',
          formula: 'Σ Facilitated amount_c × Weighting factor × ATR_s × sector intensity',
        },
      };
    },
    notes: ['Data quality score: 5', 'No EVIC attribution — facilitated amount is applied directly'],
  },

  /**
   * OPTION 3C - ASSET TURNOVER RATIO (FACILITATED - UNLISTED)
   */
  {
    id: '3c-facilitated-atr-unlisted',
    name: 'Option 3c - Asset Turnover Ratio (Facilitated - Unlisted)',
    description: 'Facilitated amount × weighting factor × ATR × sector intensity (GHG / revenue from reference table)',
    category: 'facilitated_emission',
    optionCode: '3c',
    dataQualityScore: 5,
    applicableScopes: ['scope1', 'scope2', 'scope3'],
    inputs: [
      { name: 'facilitated_amount', label: 'Facilitated Amount', type: 'number', required: true, unit: 'PKR' },
      { name: 'weighting_factor', label: 'Weighting Factor', type: 'number', required: true, unit: 'ratio', validation: { min: 0, max: 1 } },
      { name: 'asset_turnover_ratio', label: 'Asset Turnover Ratio', type: 'number', required: true, unit: 'ratio' },
      { name: 'sector_intensity', label: 'Sector intensity', type: 'number', required: true, unit: 'kgCO2e/PKR' },
    ],
    calculate: (inputs) => {
      const facilitatedAmount = Number(inputs.facilitated_amount || 0);
      const weightingFactor = Number(inputs.weighting_factor || 0);
      const atr = Number(inputs.asset_turnover_ratio || 0);
      const rawIntensity = Number(inputs.sector_intensity || 0);
      if (!facilitatedAmount || !weightingFactor || !atr || !rawIntensity) {
        throw new Error('Facilitated amount, weighting factor, ATR, and sector intensity must be greater than 0');
      }
      const unit = String(inputs.sector_intensity_unit || 'kgCO2e/PKR');
      const intensity = unit.toLowerCase().includes('kg') ? rawIntensity / 1000 : rawIntensity;
      const facilitatedEmissions = facilitatedAmount * weightingFactor * atr * intensity;
      return {
        attributionFactor: 1,
        emissionFactor: intensity,
        financedEmissions: facilitatedEmissions,
        dataQualityScore: 5,
        methodology: 'Option 3c - Asset Turnover Ratio (Facilitated - Unlisted)',
        calculationSteps: [
          { step: 'Sector intensity', value: intensity, formula: `${rawIntensity} ${unit} → ${intensity.toExponential(6)} tCO2e/PKR` },
          { step: 'Facilitated Emissions', value: facilitatedEmissions, formula: `${facilitatedAmount} × ${weightingFactor} × ${atr} × ${intensity.toExponential(6)} = ${facilitatedEmissions.toFixed(4)}` },
        ],
        metadata: {
          companyType: 'unlisted',
          optionCode: '3c',
          category: 'facilitated_emission',
          formula: 'Σ Facilitated amount_c × Weighting factor × ATR_s × sector intensity',
        },
      };
    },
    notes: ['Data quality score: 5', 'No equity+debt attribution — facilitated amount is applied directly'],
  },
];

// Export all facilitated emission formulas
export const ALL_FACILITATED_FORMULAS = FACILITATED_EMISSION_FORMULAS;

// Helper function to get formulas by option code
export const getFacilitatedFormulasByOption = (
  optionCode: '1a' | '1b' | '2a' | '2b' | '3a' | '3c'
): FormulaConfig[] => {
  return FACILITATED_EMISSION_FORMULAS.filter(formula => formula.optionCode === optionCode);
};

// Helper function to get formulas by company type
export const getFacilitatedFormulasByCompanyType = (companyType: 'listed' | 'unlisted'): FormulaConfig[] => {
  return FACILITATED_EMISSION_FORMULAS.filter((formula) =>
    companyType === 'listed' ? formula.id.includes('-listed') : formula.id.includes('-unlisted')
  );
};

// Helper function to get formula by ID
export const getFacilitatedFormulaById = (id: string): FormulaConfig | undefined => {
  return FACILITATED_EMISSION_FORMULAS.find(formula => formula.id === id);
};
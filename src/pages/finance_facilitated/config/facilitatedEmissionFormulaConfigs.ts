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
 * Available Formula Options (8 total - 4 options × 2 company types):
 * 
 * LISTED COMPANIES (Uses EVIC as denominator):
 * - Option 1a: Verified GHG Emissions (Data Quality Score: 1) - Highest quality
 * - Option 1b: Unverified GHG Emissions (Data Quality Score: 2) - Good quality
 * - Option 2a: Energy Consumption Data (Data Quality Score: 3) - Fair quality
 * - Option 2b: Production Data (Data Quality Score: 3) - Fair quality
 * 
 * UNLISTED COMPANIES (Uses Total Equity + Debt as denominator):
 * - Option 1a: Verified GHG Emissions (Data Quality Score: 1) - Highest quality
 * - Option 1b: Unverified GHG Emissions (Data Quality Score: 2) - Good quality
 * - Option 2a: Energy Consumption Data (Data Quality Score: 3) - Fair quality
 * - Option 2b: Production Data (Data Quality Score: 3) - Fair quality
 * 
 * Note: Options 1a and 1b use direct emissions data, while Options 2a and 2b use activity data.
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
    calculate: (inputs: Record<string, any>, companyType: 'listed' | 'private') => {
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
    calculate: (inputs: Record<string, any>, companyType: 'listed' | 'private') => {
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
    calculate: (inputs: Record<string, any>, companyType: 'listed' | 'private') => {
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
    calculate: (inputs: Record<string, any>, companyType: 'listed' | 'private') => {
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
   * Data Quality Score: 3 (Fair)
   */
  {
    id: '2a-facilitated-energy-listed',
    name: 'Option 2a - Energy Consumption Data (Facilitated - Listed)',
    description: 'Energy consumption data with energy-specific emission factors for facilitated emissions from listed companies',
    category: 'facilitated_emission',
    optionCode: '2a',
    dataQualityScore: 3,
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
        unit: 'MWh',
        description: 'How much energy the client company used (from utility bills)',
        unitOptions: [
          { value: 'MWh', label: 'MWh (Megawatt-hours)' },
          { value: 'GWh', label: 'GWh (Gigawatt-hours)' },
          { value: 'TWh', label: 'TWh (Terawatt-hours)' },
          { value: 'kWh', label: 'kWh (Kilowatt-hours)' }
        ]
      },
      {
        name: 'emission_factor',
        label: 'Emission Factor',
        type: 'number',
        required: true,
        unit: 'tCO2e/MWh',
        description: 'How much carbon is released per unit of energy used',
        unitOptions: [
          { value: 'tCO2e/MWh', label: 'tCO2e/MWh' },
          { value: 'kgCO2e/MWh', label: 'kgCO2e/MWh' },
          { value: 'tCO2e/GWh', label: 'tCO2e/GWh' }
        ]
      },
      {
        name: 'process_emissions',
        label: 'Process Emissions',
        type: 'number',
        required: false,
        unit: 'tCO2e',
        description: 'Extra carbon emissions from manufacturing processes (not from energy use)',
        unitOptions: EMISSION_UNIT_OPTIONS
      }
    ],
    calculate: (inputs: Record<string, any>, companyType: 'listed' | 'private') => {
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
        dataQualityScore: 3,
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
      'Use energy consumption data from the listed client company',
      'Apply energy source-specific emission factors',
      'Include process emissions if available',
      'Weighting factor should reflect the proportion of services provided'
    ]
  },

  /**
   * OPTION 2A - ENERGY CONSUMPTION DATA (FACILITATED - UNLISTED)
   * 
   * Formula: Σ (Facilitated amount_c / (Total equity + debt)_c) × Weighting factor × Energy consumption_c × Emission factor
   * Data Quality Score: 3 (Fair)
   */
  {
    id: '2a-facilitated-energy-unlisted',
    name: 'Option 2a - Energy Consumption Data (Facilitated - Unlisted)',
    description: 'Energy consumption data with energy-specific emission factors for facilitated emissions from unlisted companies',
    category: 'facilitated_emission',
    optionCode: '2a',
    dataQualityScore: 3,
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
        unit: 'MWh',
        description: 'How much energy the client company used (from utility bills)',
        unitOptions: [
          { value: 'MWh', label: 'MWh (Megawatt-hours)' },
          { value: 'GWh', label: 'GWh (Gigawatt-hours)' },
          { value: 'TWh', label: 'TWh (Terawatt-hours)' },
          { value: 'kWh', label: 'kWh (Kilowatt-hours)' }
        ]
      },
      {
        name: 'emission_factor',
        label: 'Emission Factor',
        type: 'number',
        required: true,
        unit: 'tCO2e/MWh',
        description: 'How much carbon is released per unit of energy used',
        unitOptions: [
          { value: 'tCO2e/MWh', label: 'tCO2e/MWh' },
          { value: 'kgCO2e/MWh', label: 'kgCO2e/MWh' },
          { value: 'tCO2e/GWh', label: 'tCO2e/GWh' }
        ]
      },
      {
        name: 'process_emissions',
        label: 'Process Emissions',
        type: 'number',
        required: false,
        unit: 'tCO2e',
        description: 'Extra carbon emissions from manufacturing processes (not from energy use)',
        unitOptions: EMISSION_UNIT_OPTIONS
      }
    ],
    calculate: (inputs: Record<string, any>, companyType: 'listed' | 'private') => {
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
        dataQualityScore: 3,
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
      'Use energy consumption data from the unlisted client company',
      'Apply energy source-specific emission factors',
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
    calculate: (inputs: Record<string, any>, companyType: 'listed' | 'private') => {
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
    calculate: (inputs: Record<string, any>, companyType: 'listed' | 'private') => {
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
  }
];

// Export all facilitated emission formulas
export const ALL_FACILITATED_FORMULAS = FACILITATED_EMISSION_FORMULAS;

// Helper function to get formulas by option code
export const getFacilitatedFormulasByOption = (optionCode: '1a' | '1b' | '2a' | '2b'): FormulaConfig[] => {
  return FACILITATED_EMISSION_FORMULAS.filter(formula => formula.optionCode === optionCode);
};

// Helper function to get formulas by company type
export const getFacilitatedFormulasByCompanyType = (companyType: 'listed' | 'unlisted'): FormulaConfig[] => {
  return FACILITATED_EMISSION_FORMULAS.filter(formula => 
    formula.metadata?.companyType === companyType
  );
};

// Helper function to get formula by ID
export const getFacilitatedFormulaById = (id: string): FormulaConfig | undefined => {
  return FACILITATED_EMISSION_FORMULAS.find(formula => formula.id === id);
};
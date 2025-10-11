/**
 * MORTGAGE FORMULA CONFIGURATIONS
 * 
 * This file contains all PCAF (Partnership for Carbon Accounting Financials) formulas
 * for Mortgage loans.
 * 
 * Based on PCAF Global GHG Accounting and Reporting Standard for the Financial Industry
 * Table 10.1-4: Mortgage formulas (hypothetical - following same pattern as other loan types)
 * 
 * Key Differences from Other Loan Types:
 * - Attribution Factor: Outstanding Amount / Property Value (consistent)
 * - Financed Emissions: Uses Property Value as denominator
 * - All formulas use property-specific data
 * 
 * Formula Categories:
 * - Option 1a: Verified GHG emissions data (Score 1) - Highest quality
 * - Option 1b: Unverified GHG emissions data (Score 2) - Good quality
 * - Option 2a: Energy consumption + emission factors (Score 3) - Fair quality
 * - Option 2b: Production data + emission factors (Score 3) - Fair quality
 * 
 * Attribution Factor: Outstanding Amount / Property Value (consistent across all formulas)
 * Financed Emissions: Uses Property Value as denominator
 */

import { FormulaConfig } from '../types/formula';
import { 
  COMMON_INPUTS, 
  EMISSION_UNIT_OPTIONS,
  calculateAttributionFactor,
  calculateFinancedEmissions
} from './sharedFormulaUtils';

// ============================================================================
// MORTGAGE FORMULA CONFIGURATIONS
// ============================================================================

/**
 * OPTION 1A - SUPPLIER-SPECIFIC EMISSION FACTORS (MORTGAGE)
 * Data Quality Score: 1 (Highest)
 * Uses: Supplier-specific emission factors + Primary data on actual building energy consumption
 * Formula: Σ_{b,e} (Outstanding amount_b / Property value at origination_b) × Actual energy consumption_b,e × Supplier specific emission factor_e
 */
export const OPTION_1A_MORTGAGE: FormulaConfig = {
  id: '1a-mortgage',
  name: 'Option 1a - Supplier-Specific Emission Factors (Mortgage)',
  description: 'Supplier-specific emission factors specific to the energy source + Primary data on actual building energy consumption',
  dataQualityScore: 1,
  category: 'mortgage',
  optionCode: '1a',
  inputs: [
    COMMON_INPUTS.outstanding_amount,
    {
      name: 'property_value_at_origination',
      label: 'Property Value at Origination',
      type: 'number',
      required: true,
      unit: 'USD',
      description: 'Property value at the time of mortgage origination'
    },
    {
      name: 'actual_energy_consumption',
      label: 'Actual Building Energy Consumption',
      type: 'number',
      required: true,
      unit: 'MWh',
      description: 'Primary data on actual building energy consumption'
    },
    {
      name: 'supplier_specific_emission_factor',
      label: 'Supplier-Specific Emission Factor',
      type: 'number',
      required: true,
      unit: 'tCO2e/MWh',
      description: 'Supplier-specific emission factors specific to the energy source'
    }
  ],
  calculate: (inputs, companyType) => {
    const outstandingAmount = inputs.outstanding_amount;
    const propertyValueAtOrigination = inputs.property_value_at_origination;
    const actualEnergyConsumption = inputs.actual_energy_consumption;
    const supplierSpecificEmissionFactor = inputs.supplier_specific_emission_factor;

    // Step 1: Calculate attribution factor using Property Value at Origination
    const attributionFactor = outstandingAmount / propertyValueAtOrigination;

    // Step 2: Calculate emissions from actual energy consumption
    // For multiple properties, we use the total energy consumption and average emission factor
    const energyEmissions = actualEnergyConsumption * supplierSpecificEmissionFactor;

    // Step 3: Calculate financed emissions
    const financedEmissions = attributionFactor * energyEmissions;

    return {
      attributionFactor,
      emissionFactor: energyEmissions,
      financedEmissions,
      dataQualityScore: 1,
      methodology: 'PCAF Option 1a - Supplier-Specific Emission Factors (Mortgage)',
      calculationSteps: [
        {
          step: 'Property Value at Origination',
          value: propertyValueAtOrigination,
          formula: `Property Value at Origination = ${propertyValueAtOrigination.toFixed(2)}`
        },
        {
          step: 'Attribution Factor',
          value: attributionFactor,
          formula: `${outstandingAmount} / ${propertyValueAtOrigination.toFixed(2)} = ${attributionFactor.toFixed(6)}`
        },
        {
          step: 'Energy Emissions',
          value: energyEmissions,
          formula: `${actualEnergyConsumption} × ${supplierSpecificEmissionFactor} = ${energyEmissions.toFixed(2)}`
        },
        {
          step: 'Financed Emissions',
          value: financedEmissions,
          formula: `(${outstandingAmount} / ${propertyValueAtOrigination.toFixed(2)}) × ${energyEmissions.toFixed(2)} = ${financedEmissions.toFixed(2)}`
        }
      ],
      metadata: {
        companyType,
        optionCode: '1a',
        category: 'mortgage',
        propertyValueAtOrigination,
        energyEmissions,
        formula: 'Σ_{b,e} (Outstanding amount_b / Property value at origination_b) × Actual energy consumption_b,e × Supplier specific emission factor_e'
      }
    };
  },
  notes: [
    'Highest data quality score (1)',
    'Requires supplier-specific emission factors and actual energy consumption data',
    'Applicable to scope 1 and 2 emissions only',
    'Formula: Σ_{b,e} (Outstanding amount_b / Property value at origination_b) × Actual energy consumption_b,e × Supplier specific emission factor_e'
  ]
};

/**
 * OPTION 1B - AVERAGE EMISSION FACTORS (MORTGAGE)
 * Data Quality Score: 2 (Good)
 * Uses: Primary data on actual building energy consumption + Average emission factor
 * Formula: Σ_{b,e} (Outstanding amount_b / Property value at origination_b) × Actual energy consumption_b,e × Average emission factor_e
 */
export const OPTION_1B_MORTGAGE: FormulaConfig = {
  id: '1b-mortgage',
  name: 'Option 1b - Average Emission Factors (Mortgage)',
  description: 'Primary data on actual building energy consumption + Average emission factor',
  dataQualityScore: 2,
  category: 'mortgage',
  optionCode: '1b',
  inputs: [
    COMMON_INPUTS.outstanding_amount,
    {
      name: 'property_value_at_origination',
      label: 'Property Value at Origination',
      type: 'number',
      required: true,
      unit: 'USD',
      description: 'Property value at the time of mortgage origination'
    },
    {
      name: 'actual_energy_consumption',
      label: 'Actual Building Energy Consumption',
      type: 'number',
      required: true,
      unit: 'MWh',
      description: 'Primary data on actual building energy consumption'
    },
    {
      name: 'average_emission_factor',
      label: 'Average Emission Factor',
      type: 'number',
      required: true,
      unit: 'tCO2e/MWh',
      description: 'Average emission factor for the energy source'
    }
  ],
  calculate: (inputs, companyType) => {
    const outstandingAmount = inputs.outstanding_amount;
    const propertyValueAtOrigination = inputs.property_value_at_origination;
    const actualEnergyConsumption = inputs.actual_energy_consumption;
    const averageEmissionFactor = inputs.average_emission_factor;

    // Step 1: Calculate attribution factor using Property Value at Origination
    const attributionFactor = outstandingAmount / propertyValueAtOrigination;

    // Step 2: Calculate emissions from actual energy consumption
    const energyEmissions = actualEnergyConsumption * averageEmissionFactor;

    // Step 3: Calculate financed emissions
    const financedEmissions = attributionFactor * energyEmissions;

    return {
      attributionFactor,
      emissionFactor: energyEmissions,
      financedEmissions,
      dataQualityScore: 2,
      methodology: 'PCAF Option 1b - Average Emission Factors (Mortgage)',
      calculationSteps: [
        {
          step: 'Property Value at Origination',
          value: propertyValueAtOrigination,
          formula: `Property Value at Origination = ${propertyValueAtOrigination.toFixed(2)}`
        },
        {
          step: 'Attribution Factor',
          value: attributionFactor,
          formula: `${outstandingAmount} / ${propertyValueAtOrigination.toFixed(2)} = ${attributionFactor.toFixed(6)}`
        },
        {
          step: 'Energy Emissions',
          value: energyEmissions,
          formula: `${actualEnergyConsumption} × ${averageEmissionFactor} = ${energyEmissions.toFixed(2)}`
        },
        {
          step: 'Financed Emissions',
          value: financedEmissions,
          formula: `(${outstandingAmount} / ${propertyValueAtOrigination.toFixed(2)}) × ${energyEmissions.toFixed(2)} = ${financedEmissions.toFixed(2)}`
        }
      ],
      metadata: {
        companyType,
        optionCode: '1b',
        category: 'mortgage',
        propertyValueAtOrigination,
        energyEmissions,
        formula: 'Σ_{b,e} (Outstanding amount_b / Property value at origination_b) × Actual energy consumption_b,e × Average emission factor_e'
      }
    };
  },
  notes: [
    'Good data quality score (2)',
    'Requires actual energy consumption data and average emission factors',
    'Applicable to scope 1 and 2 emissions only',
    'Formula: Σ_{b,e} (Outstanding amount_b / Property value at origination_b) × Actual energy consumption_b,e × Average emission factor_e'
  ]
};

/**
 * OPTION 2A - ENERGY LABELS DATA (MORTGAGE)
 * Data Quality Score: 3 (Fair)
 * Uses: Estimated building energy consumption per floor area based on official building energy labels + floor area financed
 * Formula: Σ_{b,e} (Outstanding amount_b / Property value at origination_b) × Estimated energy consumption from energy labels_b,e × Floor area_b × Average emission factor_e
 */
export const OPTION_2A_MORTGAGE: FormulaConfig = {
  id: '2a-mortgage',
  name: 'Option 2a - Energy Labels Data (Mortgage)',
  description: 'Estimated building energy consumption per floor area based on official building energy labels and floor area financed',
  dataQualityScore: 3,
  category: 'mortgage',
  optionCode: '2a',
  inputs: [
    COMMON_INPUTS.outstanding_amount,
    {
      name: 'property_value_at_origination',
      label: 'Property Value at Origination',
      type: 'number',
      required: true,
      unit: 'USD',
      description: 'Property value at the time of mortgage origination'
    },
    {
      name: 'estimated_energy_consumption_from_labels',
      label: 'Estimated Energy Consumption from Energy Labels',
      type: 'number',
      required: true,
      unit: 'MWh/m²',
      description: 'Estimated building energy consumption per floor area based on official building energy labels'
    },
    {
      name: 'floor_area',
      label: 'Floor Area',
      type: 'number',
      required: true,
      unit: 'm²',
      description: 'Floor area financed'
    },
    {
      name: 'average_emission_factor',
      label: 'Average Emission Factor',
      type: 'number',
      required: true,
      unit: 'tCO2e/MWh',
      description: 'Average emission factors specific to the energy source'
    }
  ],
  calculate: (inputs, companyType) => {
    const outstandingAmount = inputs.outstanding_amount;
    const propertyValueAtOrigination = inputs.property_value_at_origination;
    const estimatedEnergyConsumptionFromLabels = inputs.estimated_energy_consumption_from_labels;
    const floorArea = inputs.floor_area;
    const averageEmissionFactor = inputs.average_emission_factor;

    // Step 1: Calculate attribution factor using Property Value at Origination
    const attributionFactor = outstandingAmount / propertyValueAtOrigination;

    // Step 2: Calculate total energy consumption from floor area and energy labels
    const totalEnergyConsumption = estimatedEnergyConsumptionFromLabels * floorArea;

    // Step 3: Calculate emissions from energy consumption
    const energyEmissions = totalEnergyConsumption * averageEmissionFactor;

    // Step 4: Calculate financed emissions
    const financedEmissions = attributionFactor * energyEmissions;

    return {
      attributionFactor,
      emissionFactor: energyEmissions,
      financedEmissions,
      dataQualityScore: 3,
      methodology: 'PCAF Option 2a - Energy Labels Data (Mortgage)',
      calculationSteps: [
        {
          step: 'Property Value at Origination',
          value: propertyValueAtOrigination,
          formula: `Property Value at Origination = ${propertyValueAtOrigination.toFixed(2)}`
        },
        {
          step: 'Attribution Factor',
          value: attributionFactor,
          formula: `${outstandingAmount} / ${propertyValueAtOrigination.toFixed(2)} = ${attributionFactor.toFixed(6)}`
        },
        {
          step: 'Total Energy Consumption',
          value: totalEnergyConsumption,
          formula: `${estimatedEnergyConsumptionFromLabels} × ${floorArea} = ${totalEnergyConsumption.toFixed(2)} MWh`
        },
        {
          step: 'Energy Emissions',
          value: energyEmissions,
          formula: `${totalEnergyConsumption.toFixed(2)} × ${averageEmissionFactor} = ${energyEmissions.toFixed(2)}`
        },
        {
          step: 'Financed Emissions',
          value: financedEmissions,
          formula: `(${outstandingAmount} / ${propertyValueAtOrigination.toFixed(2)}) × ${energyEmissions.toFixed(2)} = ${financedEmissions.toFixed(2)}`
        }
      ],
      metadata: {
        companyType,
        optionCode: '2a',
        category: 'mortgage',
        propertyValueAtOrigination,
        totalEnergyConsumption,
        energyEmissions,
        formula: 'Σ_{b,e} (Outstanding amount_b / Property value at origination_b) × Estimated energy consumption from energy labels_b,e × Floor area_b × Average emission factor_e'
      }
    };
  },
  notes: [
    'Fair data quality score (3)',
    'Requires energy labels data, floor area, and average emission factors',
    'Applicable to scope 1 and 2 emissions only',
    'Formula: Σ_{b,e} (Outstanding amount_b / Property value at origination_b) × Estimated energy consumption from energy labels_b,e × Floor area_b × Average emission factor_e'
  ]
};

/**
 * OPTION 2B - STATISTICAL DATA (MORTGAGE)
 * Data Quality Score: 4 (Lowest)
 * Uses: Estimated building energy consumption per floor area based on building type and location-specific statistical data + floor area financed
 * Formula: Σ_{b,e} (Outstanding amount_b / Property value at origination_b) × Estimated energy consumption from statistics_b,e × Floor area_b × Average emission factor_e
 */
export const OPTION_2B_MORTGAGE: FormulaConfig = {
  id: '2b-mortgage',
  name: 'Option 2b - Statistical Data (Mortgage)',
  description: 'Estimated building energy consumption per floor area based on building type and location-specific statistical data and floor area financed',
  dataQualityScore: 4,
  category: 'mortgage',
  optionCode: '2b',
  inputs: [
    COMMON_INPUTS.outstanding_amount,
    {
      name: 'property_value_at_origination',
      label: 'Property Value at Origination',
      type: 'number',
      required: true,
      unit: 'USD',
      description: 'Property value at the time of mortgage origination'
    },
    {
      name: 'estimated_energy_consumption_from_statistics',
      label: 'Estimated Energy Consumption from Statistics',
      type: 'number',
      required: true,
      unit: 'MWh/m²',
      description: 'Estimated building energy consumption per floor area based on building type and location-specific statistical data'
    },
    {
      name: 'floor_area',
      label: 'Floor Area',
      type: 'number',
      required: true,
      unit: 'm²',
      description: 'Floor area financed'
    },
    {
      name: 'average_emission_factor',
      label: 'Average Emission Factor',
      type: 'number',
      required: true,
      unit: 'tCO2e/MWh',
      description: 'Average emission factor for the energy source'
    }
  ],
  calculate: (inputs, companyType) => {
    const outstandingAmount = inputs.outstanding_amount;
    const propertyValueAtOrigination = inputs.property_value_at_origination;
    const estimatedEnergyConsumptionFromStatistics = inputs.estimated_energy_consumption_from_statistics;
    const floorArea = inputs.floor_area;
    const averageEmissionFactor = inputs.average_emission_factor;

    // Step 1: Calculate attribution factor using Property Value at Origination
    const attributionFactor = outstandingAmount / propertyValueAtOrigination;

    // Step 2: Calculate total energy consumption from floor area and statistical data
    const totalEnergyConsumption = estimatedEnergyConsumptionFromStatistics * floorArea;

    // Step 3: Calculate emissions from energy consumption
    const energyEmissions = totalEnergyConsumption * averageEmissionFactor;

    // Step 4: Calculate financed emissions
    const financedEmissions = attributionFactor * energyEmissions;

    return {
      attributionFactor,
      emissionFactor: energyEmissions,
      financedEmissions,
      dataQualityScore: 4,
      methodology: 'PCAF Option 2b - Statistical Data (Mortgage)',
      calculationSteps: [
        {
          step: 'Property Value at Origination',
          value: propertyValueAtOrigination,
          formula: `Property Value at Origination = ${propertyValueAtOrigination.toFixed(2)}`
        },
        {
          step: 'Attribution Factor',
          value: attributionFactor,
          formula: `${outstandingAmount} / ${propertyValueAtOrigination.toFixed(2)} = ${attributionFactor.toFixed(6)}`
        },
        {
          step: 'Total Energy Consumption',
          value: totalEnergyConsumption,
          formula: `${estimatedEnergyConsumptionFromStatistics} × ${floorArea} = ${totalEnergyConsumption.toFixed(2)} MWh`
        },
        {
          step: 'Energy Emissions',
          value: energyEmissions,
          formula: `${totalEnergyConsumption.toFixed(2)} × ${averageEmissionFactor} = ${energyEmissions.toFixed(2)}`
        },
        {
          step: 'Financed Emissions',
          value: financedEmissions,
          formula: `(${outstandingAmount} / ${propertyValueAtOrigination.toFixed(2)}) × ${energyEmissions.toFixed(2)} = ${financedEmissions.toFixed(2)}`
        }
      ],
      metadata: {
        companyType,
        optionCode: '2b',
        category: 'mortgage',
        propertyValueAtOrigination,
        totalEnergyConsumption,
        energyEmissions,
        formula: 'Σ_{b,e} (Outstanding amount_b / Property value at origination_b) × Estimated energy consumption from statistics_b,e × Floor area_b × Average emission factor_e'
      }
    };
  },
  notes: [
    'Lowest data quality score (4)',
    'Requires statistical data, floor area, and average emission factors',
    'Applicable to scope 1 and 2 emissions only',
    'Formula: Σ_{b,e} (Outstanding amount_b / Property value at origination_b) × Estimated energy consumption from statistics_b,e × Floor area_b × Average emission factor_e'
  ]
};

// Export all mortgage formulas
export const MORTGAGE_FORMULAS = [
  OPTION_1A_MORTGAGE,
  OPTION_1B_MORTGAGE,
  OPTION_2A_MORTGAGE,
  OPTION_2B_MORTGAGE
];

// Helper function to get mortgage formulas by category
export const getMortgageFormulasByCategory = (category: string) => {
  return MORTGAGE_FORMULAS.filter(formula => formula.category === category);
};

// Helper function to get mortgage formula by ID
export const getMortgageFormulaById = (id: string) => {
  return MORTGAGE_FORMULAS.find(formula => formula.id === id);
};

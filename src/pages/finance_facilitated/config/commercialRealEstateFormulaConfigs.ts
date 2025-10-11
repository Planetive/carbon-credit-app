/**
 * COMMERCIAL REAL ESTATE LOAN FORMULA CONFIGURATIONS
 * 
 * This file contains all PCAF (Partnership for Carbon Accounting Financials) formulas
 * for Commercial Real Estate Loans.
 * 
 * Based on PCAF Global GHG Accounting and Reporting Standard for the Financial Industry
 * Table 10.1-X: Commercial Real Estate Loan formulas (to be updated with specific formulas)
 * 
 * Key Differences from Other Loan Types:
 * - Attribution Factor: Outstanding Amount / Property Value (consistent)
 * - Financed Emissions: Uses property-specific emissions data
 * - All formulas use property-specific data
 * 
 * Formula Categories:
 * - Option 1a: Verified property emissions data (Score 1) - Highest quality
 * - Option 1b: Unverified property emissions data (Score 2) - Good quality
 * - Option 2a: Property activity data + emission factors (Score 3) - Fair quality
 * - Option 2b: Property statistics + emission factors (Score 4) - Lower quality
 * 
 * Attribution Factor: Outstanding Amount / Property Value (consistent across all formulas)
 * Financed Emissions: Uses property-specific emissions or activity data
 */

import { FormulaConfig } from '../types/formula';
import { 
  COMMON_INPUTS, 
  EMISSION_UNIT_OPTIONS,
  calculateAttributionFactorCommercialRealEstate,
  calculateFinancedEmissions
} from './sharedFormulaUtils';

// ============================================================================
// COMMERCIAL REAL ESTATE LOAN FORMULA CONFIGURATIONS
// ============================================================================

/**
 * OPTION 1A - SUPPLIER-SPECIFIC EMISSION FACTORS (COMMERCIAL REAL ESTATE)
 * Data Quality Score: 1 (Highest)
 * Uses: Primary data on actual building energy consumption with supplier-specific emission factors
 * Formula: Σ_p (Outstanding amount_p / Property value at origination_p) × Actual energy consumption_p,e × Supplier specific emission factor_e
 */
export const OPTION_1A_COMMERCIAL_REAL_ESTATE: FormulaConfig = {
  id: '1a-commercial-real-estate',
  name: 'Option 1a - Supplier-Specific Emission Factors (Commercial Real Estate)',
  description: 'Primary data on actual building energy consumption with supplier-specific emission factors',
  dataQualityScore: 1,
  category: 'commercial_real_estate',
  optionCode: '1a',
  inputs: [
    COMMON_INPUTS.outstanding_amount,
    {
      name: 'property_value_at_origination',
      label: 'Property Value at Origination',
      type: 'number',
      required: true,
      unit: 'USD',
      description: 'Value of the commercial property at the time of loan origination'
    },
    {
      name: 'actual_energy_consumption',
      label: 'Actual Energy Consumption',
      type: 'number',
      required: true,
      unit: 'kWh',
      description: 'Primary data on actual building energy consumption'
    },
    {
      name: 'supplier_specific_emission_factor',
      label: 'Supplier Specific Emission Factor',
      type: 'number',
      required: true,
      unit: 'tCO2e/kWh',
      description: 'Supplier-specific emission factors specific to the energy source'
    }
  ],
  calculate: (inputs, companyType) => {
    const outstandingAmount = inputs.outstanding_amount;
    const propertyValueAtOrigination = inputs.property_value_at_origination;
    const actualEnergyConsumption = inputs.actual_energy_consumption;
    const supplierSpecificEmissionFactor = inputs.supplier_specific_emission_factor;

    // Step 1: Calculate attribution factor using Property Value at Origination
    const attributionFactor = calculateAttributionFactorCommercialRealEstate(outstandingAmount, propertyValueAtOrigination);

    // Step 2: Calculate total emissions from energy consumption
    const totalEmissions = actualEnergyConsumption * supplierSpecificEmissionFactor;

    // Step 3: Calculate financed emissions
    const financedEmissions = attributionFactor * totalEmissions;

    return {
      attributionFactor,
      emissionFactor: totalEmissions,
      financedEmissions,
      dataQualityScore: 1,
      methodology: 'PCAF Option 1a - Supplier-Specific Emission Factors (Commercial Real Estate)',
      calculationSteps: [
        {
          step: 'Property Value at Origination',
          value: propertyValueAtOrigination,
          formula: `Property Value at Origination = $${propertyValueAtOrigination.toFixed(2)}`
        },
        {
          step: 'Attribution Factor',
          value: attributionFactor,
          formula: `${outstandingAmount} / ${propertyValueAtOrigination.toFixed(2)} = ${attributionFactor.toFixed(6)}`
        },
        {
          step: 'Total Emissions',
          value: totalEmissions,
          formula: `${actualEnergyConsumption.toFixed(2)} kWh × ${supplierSpecificEmissionFactor} tCO2e/kWh = ${totalEmissions.toFixed(2)} tCO2e`
        },
        {
          step: 'Financed Emissions',
          value: financedEmissions,
          formula: `${attributionFactor.toFixed(6)} × ${totalEmissions.toFixed(2)} = ${financedEmissions.toFixed(2)} tCO2e`
        }
      ],
      metadata: {
        companyType,
        optionCode: '1a',
        category: 'commercial_real_estate',
        propertyValueAtOrigination,
        actualEnergyConsumption,
        supplierSpecificEmissionFactor,
        totalEmissions,
        formula: 'Σ_p (Outstanding amount_p / Property value at origination_p) × Actual energy consumption_p,e × Supplier specific emission factor_e'
      }
    };
  },
  notes: [
    'Highest data quality score (1)',
    'Requires primary data on actual building energy consumption',
    'Uses supplier-specific emission factors',
    'Formula: Σ_p (Outstanding amount_p / Property value at origination_p) × Actual energy consumption_p,e × Supplier specific emission factor_e'
  ]
};

/**
 * OPTION 1B - AVERAGE EMISSION FACTORS (COMMERCIAL REAL ESTATE)
 * Data Quality Score: 2 (Good)
 * Uses: Primary data on actual building energy consumption with average emission factors
 * Formula: Σ_p (Outstanding amount_p / Property value at origination_p) × Actual energy consumption_p,e × Average emission factor_e
 */
export const OPTION_1B_COMMERCIAL_REAL_ESTATE: FormulaConfig = {
  id: '1b-commercial-real-estate',
  name: 'Option 1b - Average Emission Factors (Commercial Real Estate)',
  description: 'Primary data on actual building energy consumption with average emission factors',
  dataQualityScore: 2,
  category: 'commercial_real_estate',
  optionCode: '1b',
  inputs: [
    COMMON_INPUTS.outstanding_amount,
    {
      name: 'property_value_at_origination',
      label: 'Property Value at Origination',
      type: 'number',
      required: true,
      unit: 'USD',
      description: 'Value of the commercial property at the time of loan origination'
    },
    {
      name: 'actual_energy_consumption',
      label: 'Actual Energy Consumption',
      type: 'number',
      required: true,
      unit: 'kWh',
      description: 'Primary data on actual building energy consumption'
    },
    {
      name: 'average_emission_factor',
      label: 'Average Emission Factor',
      type: 'number',
      required: true,
      unit: 'tCO2e/kWh',
      description: 'Average emission factors for the energy source'
    }
  ],
  calculate: (inputs, companyType) => {
    const outstandingAmount = inputs.outstanding_amount;
    const propertyValueAtOrigination = inputs.property_value_at_origination;
    const actualEnergyConsumption = inputs.actual_energy_consumption;
    const averageEmissionFactor = inputs.average_emission_factor;

    // Step 1: Calculate attribution factor using Property Value at Origination
    const attributionFactor = calculateAttributionFactorCommercialRealEstate(outstandingAmount, propertyValueAtOrigination);

    // Step 2: Calculate total emissions from energy consumption
    const totalEmissions = actualEnergyConsumption * averageEmissionFactor;

    // Step 3: Calculate financed emissions
    const financedEmissions = attributionFactor * totalEmissions;

    return {
      attributionFactor,
      emissionFactor: totalEmissions,
      financedEmissions,
      dataQualityScore: 2,
      methodology: 'PCAF Option 1b - Average Emission Factors (Commercial Real Estate)',
      calculationSteps: [
        {
          step: 'Property Value at Origination',
          value: propertyValueAtOrigination,
          formula: `Property Value at Origination = $${propertyValueAtOrigination.toFixed(2)}`
        },
        {
          step: 'Attribution Factor',
          value: attributionFactor,
          formula: `${outstandingAmount} / ${propertyValueAtOrigination.toFixed(2)} = ${attributionFactor.toFixed(6)}`
        },
        {
          step: 'Total Emissions',
          value: totalEmissions,
          formula: `${actualEnergyConsumption.toFixed(2)} kWh × ${averageEmissionFactor} tCO2e/kWh = ${totalEmissions.toFixed(2)} tCO2e`
        },
        {
          step: 'Financed Emissions',
          value: financedEmissions,
          formula: `${attributionFactor.toFixed(6)} × ${totalEmissions.toFixed(2)} = ${financedEmissions.toFixed(2)} tCO2e`
        }
      ],
      metadata: {
        companyType,
        optionCode: '1b',
        category: 'commercial_real_estate',
        propertyValueAtOrigination,
        actualEnergyConsumption,
        averageEmissionFactor,
        totalEmissions,
        formula: 'Σ_p (Outstanding amount_p / Property value at origination_p) × Actual energy consumption_p,e × Average emission factor_e'
      }
    };
  },
  notes: [
    'Good data quality score (2)',
    'Requires primary data on actual building energy consumption',
    'Uses average emission factors',
    'Formula: Σ_p (Outstanding amount_p / Property value at origination_p) × Actual energy consumption_p,e × Average emission factor_e'
  ]
};

/**
 * OPTION 2A - ESTIMATED ENERGY CONSUMPTION FROM ENERGY LABELS (COMMERCIAL REAL ESTATE)
 * Data Quality Score: 3 (Fair)
 * Uses: Estimated building energy consumption per floor area based on official building energy labels
 * Formula: Σ_p (Outstanding amount_p / Property value at origination_p) × Estimated energy consumption from energy labels_p,e × Floor area_p × Average emission factor_e
 */
export const OPTION_2A_COMMERCIAL_REAL_ESTATE: FormulaConfig = {
  id: '2a-commercial-real-estate',
  name: 'Option 2a - Estimated Energy Consumption from Energy Labels (Commercial Real Estate)',
  description: 'Estimated building energy consumption per floor area based on official building energy labels and floor area financed',
  dataQualityScore: 3,
  category: 'commercial_real_estate',
  optionCode: '2a',
  inputs: [
    COMMON_INPUTS.outstanding_amount,
    {
      name: 'property_value_at_origination',
      label: 'Property Value at Origination',
      type: 'number',
      required: true,
      unit: 'USD',
      description: 'Value of the commercial property at the time of loan origination'
    },
    {
      name: 'estimated_energy_consumption_from_labels',
      label: 'Estimated Energy Consumption from Energy Labels',
      type: 'number',
      required: true,
      unit: 'kWh/m²',
      description: 'Estimated building energy consumption per floor area based on official building energy labels'
    },
    {
      name: 'floor_area',
      label: 'Floor Area',
      type: 'number',
      required: true,
      unit: 'm²',
      description: 'Floor area of the commercial property'
    },
    {
      name: 'average_emission_factor',
      label: 'Average Emission Factor',
      type: 'number',
      required: true,
      unit: 'tCO2e/kWh',
      description: 'Average emission factors for the energy source'
    }
  ],
  calculate: (inputs, companyType) => {
    const outstandingAmount = inputs.outstanding_amount;
    const propertyValueAtOrigination = inputs.property_value_at_origination;
    const estimatedEnergyConsumptionFromLabels = inputs.estimated_energy_consumption_from_labels;
    const floorArea = inputs.floor_area;
    const averageEmissionFactor = inputs.average_emission_factor;

    // Step 1: Calculate attribution factor using Property Value at Origination
    const attributionFactor = calculateAttributionFactorCommercialRealEstate(outstandingAmount, propertyValueAtOrigination);

    // Step 2: Calculate total energy consumption
    const totalEnergyConsumption = estimatedEnergyConsumptionFromLabels * floorArea;

    // Step 3: Calculate total emissions
    const totalEmissions = totalEnergyConsumption * averageEmissionFactor;

    // Step 4: Calculate financed emissions
    const financedEmissions = attributionFactor * totalEmissions;

    return {
      attributionFactor,
      emissionFactor: totalEmissions,
      financedEmissions,
      dataQualityScore: 3,
      methodology: 'PCAF Option 2a - Estimated Energy Consumption from Energy Labels (Commercial Real Estate)',
      calculationSteps: [
        {
          step: 'Property Value at Origination',
          value: propertyValueAtOrigination,
          formula: `Property Value at Origination = $${propertyValueAtOrigination.toFixed(2)}`
        },
        {
          step: 'Attribution Factor',
          value: attributionFactor,
          formula: `${outstandingAmount} / ${propertyValueAtOrigination.toFixed(2)} = ${attributionFactor.toFixed(6)}`
        },
        {
          step: 'Total Energy Consumption',
          value: totalEnergyConsumption,
          formula: `${estimatedEnergyConsumptionFromLabels.toFixed(2)} kWh/m² × ${floorArea.toFixed(2)} m² = ${totalEnergyConsumption.toFixed(2)} kWh`
        },
        {
          step: 'Total Emissions',
          value: totalEmissions,
          formula: `${totalEnergyConsumption.toFixed(2)} kWh × ${averageEmissionFactor} tCO2e/kWh = ${totalEmissions.toFixed(2)} tCO2e`
        },
        {
          step: 'Financed Emissions',
          value: financedEmissions,
          formula: `${attributionFactor.toFixed(6)} × ${totalEmissions.toFixed(2)} = ${financedEmissions.toFixed(2)} tCO2e`
        }
      ],
      metadata: {
        companyType,
        optionCode: '2a',
        category: 'commercial_real_estate',
        propertyValueAtOrigination,
        estimatedEnergyConsumptionFromLabels,
        floorArea,
        averageEmissionFactor,
        totalEnergyConsumption,
        totalEmissions,
        formula: 'Σ_p (Outstanding amount_p / Property value at origination_p) × Estimated energy consumption from energy labels_p,e × Floor area_p × Average emission factor_e'
      }
    };
  },
  notes: [
    'Fair data quality score (3)',
    'Uses estimated building energy consumption per floor area based on official building energy labels',
    'Requires floor area financed and average emission factors',
    'Formula: Σ_p (Outstanding amount_p / Property value at origination_p) × Estimated energy consumption from energy labels_p,e × Floor area_p × Average emission factor_e'
  ]
};

/**
 * OPTION 2B - ESTIMATED ENERGY CONSUMPTION FROM STATISTICS (COMMERCIAL REAL ESTATE)
 * Data Quality Score: 4 (Lower)
 * Uses: Estimated building energy consumption per floor area based on building type and location-specific statistical data
 * Formula: Σ_p (Outstanding amount_p / Property value at origination_p) × Estimated energy consumption from statistics_p,e × Floor area_p × Average emission factor_e
 */
export const OPTION_2B_COMMERCIAL_REAL_ESTATE: FormulaConfig = {
  id: '2b-commercial-real-estate',
  name: 'Option 2b - Estimated Energy Consumption from Statistics (Commercial Real Estate)',
  description: 'Estimated building energy consumption per floor area based on building type and location-specific statistical data and floor area financed',
  dataQualityScore: 4,
  category: 'commercial_real_estate',
  optionCode: '2b',
  inputs: [
    COMMON_INPUTS.outstanding_amount,
    {
      name: 'property_value_at_origination',
      label: 'Property Value at Origination',
      type: 'number',
      required: true,
      unit: 'USD',
      description: 'Value of the commercial property at the time of loan origination'
    },
    {
      name: 'estimated_energy_consumption_from_statistics',
      label: 'Estimated Energy Consumption from Statistics',
      type: 'number',
      required: true,
      unit: 'kWh/m²',
      description: 'Estimated building energy consumption per floor area based on building type and location-specific statistical data'
    },
    {
      name: 'floor_area',
      label: 'Floor Area',
      type: 'number',
      required: true,
      unit: 'm²',
      description: 'Floor area of the commercial property'
    },
    {
      name: 'average_emission_factor',
      label: 'Average Emission Factor',
      type: 'number',
      required: true,
      unit: 'tCO2e/kWh',
      description: 'Average emission factors for the energy source'
    }
  ],
  calculate: (inputs, companyType) => {
    const outstandingAmount = inputs.outstanding_amount;
    const propertyValueAtOrigination = inputs.property_value_at_origination;
    const estimatedEnergyConsumptionFromStatistics = inputs.estimated_energy_consumption_from_statistics;
    const floorArea = inputs.floor_area;
    const averageEmissionFactor = inputs.average_emission_factor;

    // Step 1: Calculate attribution factor using Property Value at Origination
    const attributionFactor = calculateAttributionFactorCommercialRealEstate(outstandingAmount, propertyValueAtOrigination);

    // Step 2: Calculate total energy consumption
    const totalEnergyConsumption = estimatedEnergyConsumptionFromStatistics * floorArea;

    // Step 3: Calculate total emissions
    const totalEmissions = totalEnergyConsumption * averageEmissionFactor;

    // Step 4: Calculate financed emissions
    const financedEmissions = attributionFactor * totalEmissions;

    return {
      attributionFactor,
      emissionFactor: totalEmissions,
      financedEmissions,
      dataQualityScore: 4,
      methodology: 'PCAF Option 2b - Estimated Energy Consumption from Statistics (Commercial Real Estate)',
      calculationSteps: [
        {
          step: 'Property Value at Origination',
          value: propertyValueAtOrigination,
          formula: `Property Value at Origination = $${propertyValueAtOrigination.toFixed(2)}`
        },
        {
          step: 'Attribution Factor',
          value: attributionFactor,
          formula: `${outstandingAmount} / ${propertyValueAtOrigination.toFixed(2)} = ${attributionFactor.toFixed(6)}`
        },
        {
          step: 'Total Energy Consumption',
          value: totalEnergyConsumption,
          formula: `${estimatedEnergyConsumptionFromStatistics.toFixed(2)} kWh/m² × ${floorArea.toFixed(2)} m² = ${totalEnergyConsumption.toFixed(2)} kWh`
        },
        {
          step: 'Total Emissions',
          value: totalEmissions,
          formula: `${totalEnergyConsumption.toFixed(2)} kWh × ${averageEmissionFactor} tCO2e/kWh = ${totalEmissions.toFixed(2)} tCO2e`
        },
        {
          step: 'Financed Emissions',
          value: financedEmissions,
          formula: `${attributionFactor.toFixed(6)} × ${totalEmissions.toFixed(2)} = ${financedEmissions.toFixed(2)} tCO2e`
        }
      ],
      metadata: {
        companyType,
        optionCode: '2b',
        category: 'commercial_real_estate',
        propertyValueAtOrigination,
        estimatedEnergyConsumptionFromStatistics,
        floorArea,
        averageEmissionFactor,
        totalEnergyConsumption,
        totalEmissions,
        formula: 'Σ_p (Outstanding amount_p / Property value at origination_p) × Estimated energy consumption from statistics_p,e × Floor area_p × Average emission factor_e'
      }
    };
  },
  notes: [
    'Lower data quality score (4)',
    'Uses estimated building energy consumption per floor area based on building type and location-specific statistical data',
    'Requires floor area financed and average emission factors',
    'Formula: Σ_p (Outstanding amount_p / Property value at origination_p) × Estimated energy consumption from statistics_p,e × Floor area_p × Average emission factor_e'
  ]
};

// Export all commercial real estate loan formulas
export const COMMERCIAL_REAL_ESTATE_FORMULAS = [
  OPTION_1A_COMMERCIAL_REAL_ESTATE,
  OPTION_1B_COMMERCIAL_REAL_ESTATE,
  OPTION_2A_COMMERCIAL_REAL_ESTATE,
  OPTION_2B_COMMERCIAL_REAL_ESTATE
];

// Helper function to get commercial real estate loan formulas by category
export const getCommercialRealEstateFormulasByCategory = (category: string) => {
  return COMMERCIAL_REAL_ESTATE_FORMULAS.filter(formula => formula.category === category);
};

// Helper function to get commercial real estate loan formula by ID
export const getCommercialRealEstateFormulaById = (id: string) => {
  return COMMERCIAL_REAL_ESTATE_FORMULAS.find(formula => formula.id === id);
};

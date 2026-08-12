/**
 * MORTGAGE FORMULA CONFIGURATIONS
 *
 * PCAF Global GHG Accounting and Reporting Standard
 * Table 10.1-5: Detailed description of the data quality score table for mortgages
 *
 * Attribution (all options): Outstanding amount / Property value at origination
 * - 1a: actual energy × supplier-specific EF
 * - 1b: actual energy × average EF
 * - 2a: energy from labels × floor area × average EF
 * - 2b: energy from statistics × floor area × average EF
 * - 3:  energy from statistics × number of buildings × average EF
 */

import { FormulaConfig } from '../types/formula';
import {
  COMMON_INPUTS,
  calculateAttributionFactorCommercialRealEstate,
} from './sharedFormulaUtils';

const propertyValueInput = {
  name: 'property_value_at_origination',
  label: 'Property Value at Origination',
  type: 'number' as const,
  required: true,
  unit: 'PKR',
  description: 'Property value at the time of mortgage origination',
};

export const OPTION_1A_MORTGAGE: FormulaConfig = {
  id: '1a-mortgage',
  name: 'Option 1a - Supplier-Specific Emission Factors (Mortgage)',
  description: 'Primary data on actual building energy consumption with supplier-specific emission factors',
  dataQualityScore: 1,
  category: 'mortgage',
  optionCode: '1a',
  inputs: [
    COMMON_INPUTS.outstanding_amount,
    propertyValueInput,
    {
      name: 'energy_consumption',
      label: 'Actual building energy emissions',
      type: 'number',
      required: true,
      unit: 'tCO2e',
      description: 'Actual energy × EPA/DEFRA supplier-specific factor from the electricity form',
    },
    {
      name: 'emission_factor',
      label: 'Emission Factor',
      type: 'number',
      required: true,
      unit: 'tCO2e / unit',
    },
  ],
  calculate: (inputs, companyType) => {
    const outstandingAmount = inputs.outstanding_amount;
    const propertyValueAtOrigination = inputs.property_value_at_origination;
    const energyConsumption = Number(inputs.energy_consumption || 0);
    const emissionFactor = Number(inputs.emission_factor || 0);
    if (!energyConsumption || !emissionFactor) {
      throw new Error('Actual energy consumption and emission factor must be greater than 0');
    }
    const attributionFactor = calculateAttributionFactorCommercialRealEstate(
      outstandingAmount,
      propertyValueAtOrigination
    );
    const totalEmissions = energyConsumption * emissionFactor;
    const financedEmissions = attributionFactor * totalEmissions;

    return {
      attributionFactor,
      emissionFactor: totalEmissions,
      financedEmissions,
      dataQualityScore: 1,
      methodology: 'PCAF Option 1a - Supplier-Specific Emission Factors (Mortgage)',
      calculationSteps: [
        {
          step: 'Property Value at Origination',
          value: propertyValueAtOrigination,
          formula: `Property Value at Origination = ${propertyValueAtOrigination.toFixed(2)}`,
        },
        {
          step: 'Attribution Factor',
          value: attributionFactor,
          formula: `${outstandingAmount} / ${propertyValueAtOrigination.toFixed(2)} = ${attributionFactor.toFixed(6)}`,
        },
        {
          step: 'Building energy emissions',
          value: totalEmissions,
          formula: `${energyConsumption} × ${emissionFactor} = ${totalEmissions.toFixed(6)} tCO2e`,
        },
        {
          step: 'Financed Emissions',
          value: financedEmissions,
          formula: `${attributionFactor.toFixed(6)} × ${totalEmissions.toFixed(6)} = ${financedEmissions.toFixed(2)} tCO2e`,
        },
      ],
      metadata: {
        companyType,
        optionCode: '1a',
        category: 'mortgage',
        propertyValueAtOrigination,
        totalEmissions,
        formula: 'Σ (Outstanding / Property value) × Actual energy × Supplier-specific EF',
      },
    };
  },
  notes: [
    'Highest data quality score (1)',
    'Actual building energy × EPA/DEFRA (supplier-specific) emission factor',
    'Formula: Σ (Outstanding / Property value at origination) × Actual energy × EF',
  ],
};

export const OPTION_1B_MORTGAGE: FormulaConfig = {
  id: '1b-mortgage',
  name: 'Option 1b - Average Emission Factors (Mortgage)',
  description: 'Primary data on actual building energy consumption with average emission factors',
  dataQualityScore: 2,
  category: 'mortgage',
  optionCode: '1b',
  inputs: [
    COMMON_INPUTS.outstanding_amount,
    propertyValueInput,
    {
      name: 'energy_consumption',
      label: 'Actual building energy emissions',
      type: 'number',
      required: true,
      unit: 'tCO2e',
      description: 'Actual energy × EPA/DEFRA average factor from the electricity form',
    },
    {
      name: 'emission_factor',
      label: 'Emission Factor',
      type: 'number',
      required: true,
      unit: 'tCO2e / unit',
    },
  ],
  calculate: (inputs, companyType) => {
    const outstandingAmount = inputs.outstanding_amount;
    const propertyValueAtOrigination = inputs.property_value_at_origination;
    const energyConsumption = Number(inputs.energy_consumption || 0);
    const emissionFactor = Number(inputs.emission_factor || 0);
    if (!energyConsumption || !emissionFactor) {
      throw new Error('Actual energy consumption and emission factor must be greater than 0');
    }
    const attributionFactor = calculateAttributionFactorCommercialRealEstate(
      outstandingAmount,
      propertyValueAtOrigination
    );
    const totalEmissions = energyConsumption * emissionFactor;
    const financedEmissions = attributionFactor * totalEmissions;

    return {
      attributionFactor,
      emissionFactor: totalEmissions,
      financedEmissions,
      dataQualityScore: 2,
      methodology: 'PCAF Option 1b - Average Emission Factors (Mortgage)',
      calculationSteps: [
        {
          step: 'Property Value at Origination',
          value: propertyValueAtOrigination,
          formula: `Property Value at Origination = ${propertyValueAtOrigination.toFixed(2)}`,
        },
        {
          step: 'Attribution Factor',
          value: attributionFactor,
          formula: `${outstandingAmount} / ${propertyValueAtOrigination.toFixed(2)} = ${attributionFactor.toFixed(6)}`,
        },
        {
          step: 'Building energy emissions',
          value: totalEmissions,
          formula: `${energyConsumption} × ${emissionFactor} = ${totalEmissions.toFixed(6)} tCO2e`,
        },
        {
          step: 'Financed Emissions',
          value: financedEmissions,
          formula: `${attributionFactor.toFixed(6)} × ${totalEmissions.toFixed(6)} = ${financedEmissions.toFixed(2)} tCO2e`,
        },
      ],
      metadata: {
        companyType,
        optionCode: '1b',
        category: 'mortgage',
        propertyValueAtOrigination,
        totalEmissions,
        formula: 'Σ (Outstanding / Property value) × Actual energy × Average EF',
      },
    };
  },
  notes: [
    'Good data quality score (2)',
    'Actual building energy × EPA/DEFRA average emission factor',
    'Formula: Σ (Outstanding / Property value at origination) × Actual energy × EF',
  ],
};

export const OPTION_2A_MORTGAGE: FormulaConfig = {
  id: '2a-mortgage',
  name: 'Option 2a - Energy Labels Data (Mortgage)',
  description: 'Estimated building energy consumption per floor area based on official building energy labels and floor area financed',
  dataQualityScore: 3,
  category: 'mortgage',
  optionCode: '2a',
  inputs: [
    COMMON_INPUTS.outstanding_amount,
    propertyValueInput,
    {
      name: 'estimated_energy_consumption_from_labels',
      label: 'Estimated Energy Consumption from Energy Labels',
      type: 'number',
      required: true,
      unit: 'kWh/m²',
      description: 'Estimated building energy consumption per floor area based on official building energy labels',
    },
    {
      name: 'floor_area',
      label: 'Floor Area',
      type: 'number',
      required: true,
      unit: 'm²',
      description: 'Floor area financed',
    },
    {
      name: 'average_emission_factor',
      label: 'Average Emission Factor',
      type: 'number',
      required: true,
      unit: 'tCO2e/kWh',
      description: 'Average emission factors for the energy source',
    },
  ],
  calculate: (inputs, companyType) => {
    const outstandingAmount = inputs.outstanding_amount;
    const propertyValueAtOrigination = inputs.property_value_at_origination;
    const estimatedEnergyConsumptionFromLabels = inputs.estimated_energy_consumption_from_labels;
    const floorArea = inputs.floor_area;
    const averageEmissionFactor = inputs.average_emission_factor;

    const attributionFactor = calculateAttributionFactorCommercialRealEstate(
      outstandingAmount,
      propertyValueAtOrigination
    );
    const totalEnergyConsumption = estimatedEnergyConsumptionFromLabels * floorArea;
    const totalEmissions = totalEnergyConsumption * averageEmissionFactor;
    const financedEmissions = attributionFactor * totalEmissions;

    return {
      attributionFactor,
      emissionFactor: totalEmissions,
      financedEmissions,
      dataQualityScore: 3,
      methodology: 'PCAF Option 2a - Energy Labels Data (Mortgage)',
      calculationSteps: [
        {
          step: 'Property Value at Origination',
          value: propertyValueAtOrigination,
          formula: `Property Value at Origination = ${propertyValueAtOrigination.toFixed(2)}`,
        },
        {
          step: 'Attribution Factor',
          value: attributionFactor,
          formula: `${outstandingAmount} / ${propertyValueAtOrigination.toFixed(2)} = ${attributionFactor.toFixed(6)}`,
        },
        {
          step: 'Total Energy Consumption',
          value: totalEnergyConsumption,
          formula: `${estimatedEnergyConsumptionFromLabels.toFixed(2)} kWh/m² × ${floorArea.toFixed(2)} m² = ${totalEnergyConsumption.toFixed(2)} kWh`,
        },
        {
          step: 'Total Emissions',
          value: totalEmissions,
          formula: `${totalEnergyConsumption.toFixed(2)} kWh × ${averageEmissionFactor} tCO2e/kWh = ${totalEmissions.toFixed(2)} tCO2e`,
        },
        {
          step: 'Financed Emissions',
          value: financedEmissions,
          formula: `${attributionFactor.toFixed(6)} × ${totalEmissions.toFixed(2)} = ${financedEmissions.toFixed(2)} tCO2e`,
        },
      ],
      metadata: {
        companyType,
        optionCode: '2a',
        category: 'mortgage',
        propertyValueAtOrigination,
        estimatedEnergyConsumptionFromLabels,
        floorArea,
        averageEmissionFactor,
        totalEnergyConsumption,
        totalEmissions,
        formula: 'Σ (Outstanding / Property value) × Energy from labels × Floor area × Average EF',
      },
    };
  },
  notes: [
    'Fair data quality score (3)',
    'Energy from labels × floor area × EPA/DEFRA average factor',
    'Formula: Σ (Outstanding / Property value at origination) × Labels × Floor × EF',
  ],
};

export const OPTION_2B_MORTGAGE: FormulaConfig = {
  id: '2b-mortgage',
  name: 'Option 2b - Statistical Data (Mortgage)',
  description: 'Estimated building energy consumption per floor area based on building type and location-specific statistical data and floor area financed',
  dataQualityScore: 4,
  category: 'mortgage',
  optionCode: '2b',
  inputs: [
    COMMON_INPUTS.outstanding_amount,
    propertyValueInput,
    {
      name: 'estimated_energy_consumption_from_statistics',
      label: 'Estimated Energy Consumption from Statistics',
      type: 'number',
      required: true,
      unit: 'kWh/m²',
      description: 'Estimated building energy consumption per floor area based on building type and location-specific statistical data',
    },
    {
      name: 'floor_area',
      label: 'Floor Area',
      type: 'number',
      required: true,
      unit: 'm²',
      description: 'Floor area financed',
    },
    {
      name: 'average_emission_factor',
      label: 'Average Emission Factor',
      type: 'number',
      required: true,
      unit: 'tCO2e/kWh',
      description: 'Average emission factor for the energy source',
    },
  ],
  calculate: (inputs, companyType) => {
    const outstandingAmount = inputs.outstanding_amount;
    const propertyValueAtOrigination = inputs.property_value_at_origination;
    const estimatedEnergyConsumptionFromStatistics = inputs.estimated_energy_consumption_from_statistics;
    const floorArea = inputs.floor_area;
    const averageEmissionFactor = inputs.average_emission_factor;

    const attributionFactor = calculateAttributionFactorCommercialRealEstate(
      outstandingAmount,
      propertyValueAtOrigination
    );
    const totalEnergyConsumption = estimatedEnergyConsumptionFromStatistics * floorArea;
    const totalEmissions = totalEnergyConsumption * averageEmissionFactor;
    const financedEmissions = attributionFactor * totalEmissions;

    return {
      attributionFactor,
      emissionFactor: totalEmissions,
      financedEmissions,
      dataQualityScore: 4,
      methodology: 'PCAF Option 2b - Statistical Data (Mortgage)',
      calculationSteps: [
        {
          step: 'Property Value at Origination',
          value: propertyValueAtOrigination,
          formula: `Property Value at Origination = ${propertyValueAtOrigination.toFixed(2)}`,
        },
        {
          step: 'Attribution Factor',
          value: attributionFactor,
          formula: `${outstandingAmount} / ${propertyValueAtOrigination.toFixed(2)} = ${attributionFactor.toFixed(6)}`,
        },
        {
          step: 'Total Energy Consumption',
          value: totalEnergyConsumption,
          formula: `${estimatedEnergyConsumptionFromStatistics.toFixed(2)} kWh/m² × ${floorArea.toFixed(2)} m² = ${totalEnergyConsumption.toFixed(2)} kWh`,
        },
        {
          step: 'Total Emissions',
          value: totalEmissions,
          formula: `${totalEnergyConsumption.toFixed(2)} kWh × ${averageEmissionFactor} tCO2e/kWh = ${totalEmissions.toFixed(2)} tCO2e`,
        },
        {
          step: 'Financed Emissions',
          value: financedEmissions,
          formula: `${attributionFactor.toFixed(6)} × ${totalEmissions.toFixed(2)} = ${financedEmissions.toFixed(2)} tCO2e`,
        },
      ],
      metadata: {
        companyType,
        optionCode: '2b',
        category: 'mortgage',
        propertyValueAtOrigination,
        estimatedEnergyConsumptionFromStatistics,
        floorArea,
        averageEmissionFactor,
        totalEnergyConsumption,
        totalEmissions,
        formula: 'Σ (Outstanding / Property value) × Energy from statistics × Floor area × Average EF',
      },
    };
  },
  notes: [
    'Lower data quality score (4)',
    'Energy from statistics × floor area × EPA/DEFRA average factor',
    'Formula: Σ (Outstanding / Property value at origination) × Statistics × Floor × EF',
  ],
};

export const OPTION_3_MORTGAGE: FormulaConfig = {
  id: '3-mortgage',
  name: 'Option 3 - Estimated Energy from Statistics × Buildings (Mortgage)',
  description: 'Estimated building energy consumption from statistics × number of buildings × average emission factor',
  dataQualityScore: 5,
  category: 'mortgage',
  optionCode: '3',
  inputs: [
    COMMON_INPUTS.outstanding_amount,
    propertyValueInput,
    {
      name: 'estimated_energy_consumption_from_statistics',
      label: 'Estimated Energy Consumption from Statistics',
      type: 'number',
      required: true,
      unit: 'kWh/building',
      description: 'Estimated energy consumption per building from statistics',
    },
    {
      name: 'number_of_buildings',
      label: 'Number of Buildings',
      type: 'number',
      required: true,
      unit: 'buildings',
    },
    {
      name: 'average_emission_factor',
      label: 'Average Emission Factor',
      type: 'number',
      required: true,
      unit: 'tCO2e/kWh',
    },
  ],
  calculate: (inputs, companyType) => {
    const outstandingAmount = inputs.outstanding_amount;
    const propertyValueAtOrigination = inputs.property_value_at_origination;
    const estimatedEnergyFromStats = Number(inputs.estimated_energy_consumption_from_statistics || 0);
    const numberOfBuildings = Number(inputs.number_of_buildings || 0);
    const averageEmissionFactor = Number(inputs.average_emission_factor || 0);
    if (!estimatedEnergyFromStats || !numberOfBuildings || !averageEmissionFactor) {
      throw new Error('Statistics energy, number of buildings, and average emission factor must be greater than 0');
    }
    const attributionFactor = calculateAttributionFactorCommercialRealEstate(
      outstandingAmount,
      propertyValueAtOrigination
    );
    const totalEnergyConsumption = estimatedEnergyFromStats * numberOfBuildings;
    const totalEmissions = totalEnergyConsumption * averageEmissionFactor;
    const financedEmissions = attributionFactor * totalEmissions;

    return {
      attributionFactor,
      emissionFactor: totalEmissions,
      financedEmissions,
      dataQualityScore: 5,
      methodology: 'PCAF Option 3 - Estimated Energy from Statistics × Buildings (Mortgage)',
      calculationSteps: [
        {
          step: 'Property Value at Origination',
          value: propertyValueAtOrigination,
          formula: `Property Value at Origination = ${propertyValueAtOrigination.toFixed(2)}`,
        },
        {
          step: 'Attribution Factor',
          value: attributionFactor,
          formula: `${outstandingAmount} / ${propertyValueAtOrigination.toFixed(2)} = ${attributionFactor.toFixed(6)}`,
        },
        {
          step: 'Total Energy Consumption',
          value: totalEnergyConsumption,
          formula: `${estimatedEnergyFromStats.toFixed(2)} kWh/building × ${numberOfBuildings} = ${totalEnergyConsumption.toFixed(2)} kWh`,
        },
        {
          step: 'Total Emissions',
          value: totalEmissions,
          formula: `${totalEnergyConsumption.toFixed(2)} kWh × ${averageEmissionFactor} tCO2e/kWh = ${totalEmissions.toFixed(2)} tCO2e`,
        },
        {
          step: 'Financed Emissions',
          value: financedEmissions,
          formula: `${attributionFactor.toFixed(6)} × ${totalEmissions.toFixed(2)} = ${financedEmissions.toFixed(2)} tCO2e`,
        },
      ],
      metadata: {
        companyType,
        optionCode: '3',
        category: 'mortgage',
        propertyValueAtOrigination,
        estimatedEnergyFromStats,
        numberOfBuildings,
        averageEmissionFactor,
        totalEnergyConsumption,
        totalEmissions,
        formula: 'Σ (Outstanding / Property value) × Energy from statistics × Number of buildings × Average EF',
      },
    };
  },
  notes: [
    'Lowest data quality score (5)',
    'Uses statistical energy per building and number of buildings financed',
    'Formula: Σ (Outstanding / Property value at origination) × Energy from statistics × Buildings × EF',
  ],
};

export const MORTGAGE_FORMULAS = [
  OPTION_1A_MORTGAGE,
  OPTION_1B_MORTGAGE,
  OPTION_2A_MORTGAGE,
  OPTION_2B_MORTGAGE,
  OPTION_3_MORTGAGE,
];

export const getMortgageFormulasByCategory = (category: string) => {
  return MORTGAGE_FORMULAS.filter((formula) => formula.category === category);
};

export const getMortgageFormulaById = (id: string) => {
  return MORTGAGE_FORMULAS.find((formula) => formula.id === id);
};

/**
 * MOTOR VEHICLE LOAN FORMULA CONFIGURATIONS
 *
 * PCAF Global GHG Accounting and Reporting Standard
 * Table 10.1-6: Motor vehicle loans — data needs and equations
 *
 * Attribution (all options): Outstanding amount / Total value at origination
 * Emission factor (all options): fuel-specific EF
 * - 1a (score 1): actual fuel consumption × EF
 * - 1b (score 1): actual distance × make/model efficiency × EF
 * - 2a (score 2): local statistical distance × make/model efficiency × EF
 * - 2b (score 3): regional statistical distance × make/model efficiency × EF
 * - 3a (score 4): statistical distance × vehicle-type efficiency × EF
 * - 3b (score 5): statistical distance × average-vehicle efficiency × EF
 */

import { FormulaConfig } from '../types/formula';
import { COMMON_INPUTS } from './sharedFormulaUtils';

const valueAtOriginationInput = {
  name: 'total_value_at_origination',
  label: 'Total Value at Origination',
  type: 'number' as const,
  required: true,
  unit: 'PKR',
  description: 'Vehicle value at the time the loan was originated',
};

const fuelConsumptionInput = {
  name: 'fuel_consumption',
  label: 'Actual Fuel Consumption',
  type: 'number' as const,
  required: true,
  unit: 'L',
  description: 'Primary data on actual vehicle fuel consumption',
};

const distanceInput = (label: string, description: string) => ({
  name: 'distance_traveled',
  label,
  type: 'number' as const,
  required: true,
  unit: 'km',
  description,
});

const efficiencyInput = (description: string) => ({
  name: 'efficiency',
  label: 'Fuel Efficiency',
  type: 'number' as const,
  required: true,
  unit: 'L/km',
  description,
});

const emissionFactorInput = {
  name: 'emission_factor',
  label: 'Fuel Emission Factor',
  type: 'number' as const,
  required: true,
  unit: 'tCO2e/L',
  description: 'Emission factor specific to the fuel type',
};

const totalVehicleEmissionsInput = {
  name: 'total_vehicle_emissions',
  label: 'Total Vehicle Emissions',
  type: 'number' as const,
  required: false,
  unit: 'tCO2e',
  description: 'Aggregated vehicle emissions from the vehicle form',
};

const attribution = (outstanding: number, value: number) => {
  if (!value) throw new Error('Total value at origination must be greater than 0');
  return outstanding / value;
};

const num = (v: unknown) => Number(v || 0);

const resolveFuelEmissions = (inputs: Record<string, unknown>) => {
  const aggregated = num(inputs.total_vehicle_emissions);
  if (aggregated > 0) return aggregated;
  return num(inputs.fuel_consumption) * num(inputs.emission_factor);
};

const resolveDistanceEmissions = (inputs: Record<string, unknown>) => {
  const aggregated = num(inputs.total_vehicle_emissions);
  if (aggregated > 0) return aggregated;
  return num(inputs.distance_traveled) * num(inputs.efficiency) * num(inputs.emission_factor);
};

const buildFuelOption = (
  id: string,
  name: string,
  description: string,
  optionCode: string,
  dataQualityScore: number,
  methodology: string,
  formulaNote: string
): FormulaConfig => ({
  id,
  name,
  description,
  dataQualityScore,
  category: 'motor_vehicle_loan',
  optionCode,
  inputs: [
    COMMON_INPUTS.outstanding_amount,
    valueAtOriginationInput,
    fuelConsumptionInput,
    emissionFactorInput,
    totalVehicleEmissionsInput,
  ],
  calculate: (inputs, companyType) => {
    const outstandingAmount = num(inputs.outstanding_amount);
    const totalValueAtOrigination = num(inputs.total_value_at_origination);
    const fuelConsumption = num(inputs.fuel_consumption);
    const emissionFactor = num(inputs.emission_factor);
    const attributionFactor = attribution(outstandingAmount, totalValueAtOrigination);
    const vehicleEmissions = resolveFuelEmissions(inputs);
    if (!vehicleEmissions) {
      throw new Error('Enter actual fuel consumption and a fuel emission factor.');
    }
    const financedEmissions = attributionFactor * vehicleEmissions;
    return {
      attributionFactor,
      emissionFactor: vehicleEmissions,
      financedEmissions,
      dataQualityScore,
      methodology,
      calculationSteps: [
        {
          step: 'Total Value at Origination',
          value: totalValueAtOrigination,
          formula: `Total Value at Origination = ${totalValueAtOrigination.toFixed(2)} PKR`,
        },
        {
          step: 'Attribution Factor',
          value: attributionFactor,
          formula: `${outstandingAmount} / ${totalValueAtOrigination.toFixed(2)} = ${attributionFactor.toFixed(6)}`,
        },
        {
          step: 'Vehicle Emissions',
          value: vehicleEmissions,
          formula: `${fuelConsumption || vehicleEmissions} × ${emissionFactor || 1} = ${vehicleEmissions.toFixed(6)} tCO2e`,
        },
        {
          step: 'Financed Emissions',
          value: financedEmissions,
          formula: `${attributionFactor.toFixed(6)} × ${vehicleEmissions.toFixed(6)} = ${financedEmissions.toFixed(6)} tCO2e`,
        },
      ],
      metadata: {
        companyType,
        optionCode,
        category: 'motor_vehicle_loan',
        totalValueAtOrigination,
        fuelConsumption,
        emissionFactor,
        vehicleEmissions,
        formula: formulaNote,
      },
    };
  },
  notes: [formulaNote],
});

const buildDistanceOption = (
  id: string,
  name: string,
  description: string,
  optionCode: string,
  dataQualityScore: number,
  methodology: string,
  distanceLabel: string,
  distanceDescription: string,
  efficiencyDescription: string,
  formulaNote: string
): FormulaConfig => ({
  id,
  name,
  description,
  dataQualityScore,
  category: 'motor_vehicle_loan',
  optionCode,
  inputs: [
    COMMON_INPUTS.outstanding_amount,
    valueAtOriginationInput,
    distanceInput(distanceLabel, distanceDescription),
    efficiencyInput(efficiencyDescription),
    emissionFactorInput,
    totalVehicleEmissionsInput,
  ],
  calculate: (inputs, companyType) => {
    const outstandingAmount = num(inputs.outstanding_amount);
    const totalValueAtOrigination = num(inputs.total_value_at_origination);
    const distanceTraveled = num(inputs.distance_traveled);
    const efficiency = num(inputs.efficiency);
    const emissionFactor = num(inputs.emission_factor);
    const attributionFactor = attribution(outstandingAmount, totalValueAtOrigination);
    const vehicleEmissions = resolveDistanceEmissions(inputs);
    if (!vehicleEmissions) {
      throw new Error('Enter distance, fuel efficiency, and a fuel emission factor.');
    }
    const financedEmissions = attributionFactor * vehicleEmissions;
    return {
      attributionFactor,
      emissionFactor: vehicleEmissions,
      financedEmissions,
      dataQualityScore,
      methodology,
      calculationSteps: [
        {
          step: 'Total Value at Origination',
          value: totalValueAtOrigination,
          formula: `Total Value at Origination = ${totalValueAtOrigination.toFixed(2)} PKR`,
        },
        {
          step: 'Attribution Factor',
          value: attributionFactor,
          formula: `${outstandingAmount} / ${totalValueAtOrigination.toFixed(2)} = ${attributionFactor.toFixed(6)}`,
        },
        {
          step: 'Vehicle Emissions',
          value: vehicleEmissions,
          formula: `${distanceTraveled} × ${efficiency} × ${emissionFactor} = ${vehicleEmissions.toFixed(6)} tCO2e`,
        },
        {
          step: 'Financed Emissions',
          value: financedEmissions,
          formula: `${attributionFactor.toFixed(6)} × ${vehicleEmissions.toFixed(6)} = ${financedEmissions.toFixed(6)} tCO2e`,
        },
      ],
      metadata: {
        companyType,
        optionCode,
        category: 'motor_vehicle_loan',
        totalValueAtOrigination,
        distanceTraveled,
        efficiency,
        emissionFactor,
        vehicleEmissions,
        formula: formulaNote,
      },
    };
  },
  notes: [formulaNote],
});

export const OPTION_1A_MOTOR_VEHICLE = buildFuelOption(
  '1a-motor-vehicle',
  'Option 1a - Actual Fuel Consumption (Motor Vehicle Loan)',
  'Primary data on actual vehicle fuel consumption × fuel-specific emission factor',
  '1a',
  1,
  'PCAF Option 1a - Actual Vehicle Fuel Consumption (Motor Vehicle Loan)',
  'Σ (Outstanding / Value at origination) × Fuel consumption × Fuel EF'
);

export const OPTION_1B_MOTOR_VEHICLE = buildDistanceOption(
  '1b-motor-vehicle',
  'Option 1b - Actual Distance + Make/Model Efficiency (Motor Vehicle Loan)',
  'Primary distance traveled × make/model fuel efficiency × fuel-specific emission factor',
  '1b',
  1,
  'PCAF Option 1b - Actual Distance Traveled (Motor Vehicle Loan)',
  'Actual Distance Traveled',
  'Primary data on actual vehicle distance traveled',
  'Fuel efficiency from known vehicle make and model',
  'Σ (Outstanding / Value at origination) × Distance × Efficiency × Fuel EF'
);

export const OPTION_2A_MOTOR_VEHICLE = buildDistanceOption(
  '2a-motor-vehicle',
  'Option 2a - Local Distance Statistics (Motor Vehicle Loan)',
  'Local statistical distance × make/model fuel efficiency × fuel-specific emission factor',
  '2a',
  2,
  'PCAF Option 2a - Local Statistical Distance (Motor Vehicle Loan)',
  'Local Statistical Distance',
  'Local statistical data for distance traveled',
  'Fuel efficiency from known vehicle make and model',
  'Σ (Outstanding / Value at origination) × Local distance × Efficiency × Fuel EF'
);

export const OPTION_2B_MOTOR_VEHICLE = buildDistanceOption(
  '2b-motor-vehicle',
  'Option 2b - Regional Distance Statistics (Motor Vehicle Loan)',
  'Regional statistical distance × make/model fuel efficiency × fuel-specific emission factor',
  '2b',
  3,
  'PCAF Option 2b - Regional Statistical Distance (Motor Vehicle Loan)',
  'Regional Statistical Distance',
  'Regional statistical data for distance traveled',
  'Fuel efficiency from known vehicle make and model',
  'Σ (Outstanding / Value at origination) × Regional distance × Efficiency × Fuel EF'
);

export const OPTION_3A_MOTOR_VEHICLE = buildDistanceOption(
  '3a-motor-vehicle',
  'Option 3a - Vehicle-Type Efficiency (Motor Vehicle Loan)',
  'Statistical distance × vehicle-type fuel efficiency × fuel-specific emission factor',
  '3a',
  4,
  'PCAF Option 3a - Vehicle-Type Efficiency (Motor Vehicle Loan)',
  'Statistical Distance',
  'Local or regional statistical data for distance traveled',
  'Fuel efficiency from known vehicle type',
  'Σ (Outstanding / Value at origination) × Statistical distance × Type efficiency × Fuel EF'
);

export const OPTION_3B_MOTOR_VEHICLE = buildDistanceOption(
  '3b-motor-vehicle',
  'Option 3b - Average Vehicle Efficiency (Motor Vehicle Loan)',
  'Statistical distance × average-vehicle fuel efficiency × fuel-specific emission factor',
  '3b',
  5,
  'PCAF Option 3b - Average Vehicle Efficiency (Motor Vehicle Loan)',
  'Statistical Distance',
  'Local or regional statistical data for distance traveled',
  'Fuel efficiency from an average vehicle',
  'Σ (Outstanding / Value at origination) × Statistical distance × Average efficiency × Fuel EF'
);

export const MOTOR_VEHICLE_LOAN_FORMULAS = [
  OPTION_1A_MOTOR_VEHICLE,
  OPTION_1B_MOTOR_VEHICLE,
  OPTION_2A_MOTOR_VEHICLE,
  OPTION_2B_MOTOR_VEHICLE,
  OPTION_3A_MOTOR_VEHICLE,
  OPTION_3B_MOTOR_VEHICLE,
];

export const getMotorVehicleLoanFormulasByCategory = (category: string) => {
  return MOTOR_VEHICLE_LOAN_FORMULAS.filter((formula) => formula.category === category);
};

export const getMotorVehicleLoanFormulaById = (id: string) => {
  return MOTOR_VEHICLE_LOAN_FORMULAS.find((formula) => formula.id === id);
};

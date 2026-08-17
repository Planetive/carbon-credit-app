/**
 * MOTOR VEHICLE LOAN FORMULA CONFIGURATIONS
 *
 * PCAF Global GHG Accounting and Reporting Standard
 * Table 10.1-6: Motor vehicle loans — data needs and equations
 *
 * Multi-vehicle: Σ_v (Outstanding_v / Value_v) × Emissions_v
 * Single vehicle: same with one row.
 */

import { FormulaConfig } from '../types/formula';
import { COMMON_INPUTS } from './sharedFormulaUtils';
import {
  computeMotorVehiclePcafFinanced,
  parseMotorVehicleEntries,
  type MotorVehiclePcafEntry,
} from '../utils/motorVehiclePcaf';

const valueAtOriginationInput = {
  name: 'total_value_at_origination',
  label: 'Total Value at Origination',
  type: 'number' as const,
  required: true,
  unit: 'PKR',
  description: 'Sum of vehicle values at origination (auto-calculated from vehicle rows)',
};

const vehicleEntriesInput = {
  name: 'vehicle_entries',
  label: 'Vehicle entries',
  type: 'text' as const,
  required: false,
  description: 'Per-vehicle value, emissions, and optional outstanding (JSON)',
};

const fuelConsumptionInput = {
  name: 'fuel_consumption',
  label: 'Actual Fuel Consumption',
  type: 'number' as const,
  required: true,
  unit: 'L',
  description: 'Primary data on actual vehicle fuel consumption (aggregate fallback)',
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
  description: 'Emission factor specific to the fuel type (aggregate fallback)',
};

const totalVehicleEmissionsInput = {
  name: 'total_vehicle_emissions',
  label: 'Total Vehicle Emissions',
  type: 'number' as const,
  required: false,
  unit: 'tCO2e',
  description: 'Aggregated vehicle emissions from the vehicle form',
};

const num = (v: unknown) => Number(v || 0);

function resolveVehicleRows(inputs: Record<string, unknown>): MotorVehiclePcafEntry[] {
  const parsed = parseMotorVehicleEntries(inputs.vehicle_entries);
  if (parsed.length > 0) return parsed;
  const emissions = num(inputs.total_vehicle_emissions);
  const value = num(inputs.total_value_at_origination);
  if (emissions > 0 && value > 0) {
    return [
      {
        id: 'single',
        name: 'Vehicle 1',
        value_at_origination: value,
        emissions_tco2e: emissions,
        fuel_consumption: num(inputs.fuel_consumption) || undefined,
        distance_traveled: num(inputs.distance_traveled) || undefined,
        efficiency: num(inputs.efficiency) || undefined,
        emission_factor: num(inputs.emission_factor) || undefined,
      },
    ];
  }
  return [];
}

function resolveLegacyVehicleEmissions(inputs: Record<string, unknown>, fuelPath: boolean): number {
  const aggregated = num(inputs.total_vehicle_emissions);
  if (aggregated > 0) return aggregated;
  if (fuelPath) {
    return num(inputs.fuel_consumption) * num(inputs.emission_factor);
  }
  return num(inputs.distance_traveled) * num(inputs.efficiency) * num(inputs.emission_factor);
}

function runMotorVehicleCalculation(
  inputs: Record<string, unknown>,
  companyType: string,
  optionCode: string,
  dataQualityScore: number,
  methodology: string,
  formulaNote: string,
  fuelPath: boolean
) {
  const outstandingAmount = num(inputs.outstanding_amount);
  let vehicles = resolveVehicleRows(inputs);

  if (vehicles.length === 0) {
    const legacyEmissions = resolveLegacyVehicleEmissions(inputs, fuelPath);
    const value = num(inputs.total_value_at_origination);
    if (legacyEmissions > 0 && value > 0) {
      vehicles = [
        {
          id: 'legacy',
          name: 'Vehicle 1',
          value_at_origination: value,
          emissions_tco2e: legacyEmissions,
        },
      ];
    }
  }

  if (vehicles.length === 0) {
    throw new Error(
      fuelPath
        ? 'Add at least one vehicle with fuel data and value at origination.'
        : 'Add at least one vehicle with distance, efficiency, and value at origination.'
    );
  }

  if (vehicles.some((v) => v.value_at_origination <= 0)) {
    throw new Error('Each vehicle must have a value at origination greater than 0.');
  }

  if (vehicles.some((v) => v.emissions_tco2e <= 0)) {
    throw new Error('Each vehicle must have emissions greater than 0.');
  }

  if (outstandingAmount <= 0) {
    throw new Error('Outstanding loan amount must be greater than 0.');
  }

  const pcaf = computeMotorVehiclePcafFinanced(outstandingAmount, vehicles);

  const calculationSteps = [
    {
      step: 'Total value at origination',
      value: pcaf.totalValueAtOrigination,
      formula: `Σ Value_v = ${pcaf.totalValueAtOrigination.toFixed(2)} PKR`,
    },
    ...pcaf.vehicleResults.map((vr) => ({
      step: `${vr.name} — attribution`,
      value: vr.attributionFactor,
      formula: `${vr.outstandingAllocated.toFixed(2)} / ${vr.valueAtOrigination.toFixed(2)} = ${vr.attributionFactor.toFixed(6)}`,
    })),
    ...pcaf.vehicleResults.map((vr) => ({
      step: `${vr.name} — financed`,
      value: vr.financedEmissions,
      formula: vr.formula,
    })),
    {
      step: 'Total financed emissions',
      value: pcaf.totalFinancedEmissions,
      formula: `Σ_v (Outstanding_v / Value_v) × Emissions_v = ${pcaf.totalFinancedEmissions.toFixed(6)} tCO2e`,
    },
  ];

  return {
    attributionFactor: pcaf.displayAttributionFactor,
    emissionFactor: pcaf.totalVehicleEmissions,
    financedEmissions: pcaf.totalFinancedEmissions,
    dataQualityScore,
    methodology,
    calculationSteps,
    metadata: {
      companyType,
      optionCode,
      category: 'motor_vehicle_loan',
      totalValueAtOrigination: pcaf.totalValueAtOrigination,
      totalVehicleEmissions: pcaf.totalVehicleEmissions,
      vehicleCount: vehicles.length,
      vehicleResults: pcaf.vehicleResults,
      formula: formulaNote,
    },
  };
}

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
    vehicleEntriesInput,
    fuelConsumptionInput,
    emissionFactorInput,
    totalVehicleEmissionsInput,
  ],
  calculate: (inputs, companyType) =>
    runMotorVehicleCalculation(inputs, companyType, optionCode, dataQualityScore, methodology, formulaNote, true),
  notes: [formulaNote, 'Multi-vehicle: Σ (Outstanding_v / Value_v) × Fuel_v × EF_f'],
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
    vehicleEntriesInput,
    distanceInput(distanceLabel, distanceDescription),
    efficiencyInput(efficiencyDescription),
    emissionFactorInput,
    totalVehicleEmissionsInput,
  ],
  calculate: (inputs, companyType) =>
    runMotorVehicleCalculation(inputs, companyType, optionCode, dataQualityScore, methodology, formulaNote, false),
  notes: [formulaNote, 'Multi-vehicle: Σ (Outstanding_v / Value_v) × Distance_v × Efficiency_v × EF_f'],
});

export const OPTION_1A_MOTOR_VEHICLE = buildFuelOption(
  '1a-motor-vehicle',
  'Option 1a - Actual Fuel Consumption (Motor Vehicle Loan)',
  'Primary data on actual vehicle fuel consumption × fuel-specific emission factor',
  '1a',
  1,
  'PCAF Option 1a - Actual Vehicle Fuel Consumption (Motor Vehicle Loan)',
  'Σ_v (Outstanding_v / Value_v) × Fuel_v × EF_f'
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
  'Σ_v (Outstanding_v / Value_v) × Distance_v × Efficiency_v,f × EF_f'
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
  'Σ_v (Outstanding_v / Value_v) × Distance_l,v × Efficiency_v,f × EF_f'
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
  'Σ_v (Outstanding_v / Value_v) × Distance_r,v × Efficiency_v,f × EF_f'
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
  'Σ_v (Outstanding_v / Value_v) × Distance_s,v × Efficiency_t,f × EF_f'
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
  'Σ_v (Outstanding_v / Value_v) × Distance_s,v × Efficiency_a,f × EF_f'
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

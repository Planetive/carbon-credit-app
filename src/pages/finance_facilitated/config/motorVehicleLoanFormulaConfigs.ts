/**
 * MOTOR VEHICLE LOAN FORMULA CONFIGURATIONS
 * 
 * This file contains all PCAF (Partnership for Carbon Accounting Financials) formulas
 * for Motor Vehicle Loans.
 * 
 * Based on PCAF Global GHG Accounting and Reporting Standard for the Financial Industry
 * Table 10.1-X: Motor Vehicle Loan formulas (to be updated with specific formulas)
 * 
 * Key Differences from Other Loan Types:
 * - Attribution Factor: Outstanding Amount / Vehicle Value (consistent)
 * - Financed Emissions: Uses vehicle-specific emissions data
 * - All formulas use vehicle-specific data
 * 
 * Formula Categories:
 * - Option 1a: Verified vehicle emissions data (Score 1) - Highest quality
 * - Option 1b: Unverified vehicle emissions data (Score 2) - Good quality
 * - Option 2a: Vehicle activity data + emission factors (Score 3) - Fair quality
 * - Option 2b: Vehicle statistics + emission factors (Score 4) - Lower quality
 * 
 * Attribution Factor: Outstanding Amount / Vehicle Value (consistent across all formulas)
 * Financed Emissions: Uses vehicle-specific emissions or activity data
 */

import { FormulaConfig } from '../types/formula';
import { 
  COMMON_INPUTS, 
  EMISSION_UNIT_OPTIONS,
  calculateAttributionFactor,
  calculateFinancedEmissions
} from './sharedFormulaUtils';

// ============================================================================
// MOTOR VEHICLE LOAN FORMULA CONFIGURATIONS
// ============================================================================

/**
 * OPTION 1A - PRIMARY DATA ON ACTUAL VEHICLE FUEL CONSUMPTION (MOTOR VEHICLE LOAN)
 * Data Quality Score: 1 (Highest)
 * Uses: Primary data on actual vehicle fuel consumption
 * Formula: Σ (Outstanding amount_v / Total value at origination_v) × Fuel consumption_v × Emission factor_f
 */
export const OPTION_1A_MOTOR_VEHICLE: FormulaConfig = {
  id: '1a-motor-vehicle',
  name: 'Option 1a - Primary Data on Actual Vehicle Fuel Consumption (Motor Vehicle Loan)',
  description: 'Primary data on actual vehicle fuel consumption',
  dataQualityScore: 1,
  category: 'motor_vehicle_loan',
  optionCode: '1a',
  inputs: [
    COMMON_INPUTS.outstanding_amount,
    {
      name: 'total_value_at_origination',
      label: 'Total Value at Origination',
      type: 'number',
      required: true,
      unit: 'PKR',
      description: 'The total amount of the motor vehicle loan when it was first approved or issued.'
    },
    {
      name: 'total_vehicle_emissions',
      label: 'Total Vehicle Emissions',
      type: 'number',
      required: true,
      unit: 'tCO2e',
      description: 'Total emissions calculated from all vehicles (auto-calculated from vehicle details)'
    }
  ],
  calculate: (inputs, companyType) => {
    const outstandingAmount = inputs.outstanding_amount;
    const totalValueAtOrigination = inputs.total_value_at_origination;
    const totalVehicleEmissions = inputs.total_vehicle_emissions;

    // Validate inputs to prevent division by zero
    if (!totalValueAtOrigination || totalValueAtOrigination === 0) {
      throw new Error('Total value at origination must be greater than 0');
    }
    if (!totalVehicleEmissions || totalVehicleEmissions === 0) {
      throw new Error('Total vehicle emissions must be greater than 0');
    }

    // Step 1: Calculate attribution factor
    const attributionFactor = outstandingAmount / totalValueAtOrigination;

    // Step 2: Use total vehicle emissions (already calculated from detailed vehicle data)
    const vehicleEmissions = totalVehicleEmissions;

    // Step 3: Calculate financed emissions
    const financedEmissions = attributionFactor * vehicleEmissions;

    return {
      attributionFactor,
      emissionFactor: vehicleEmissions,
      financedEmissions,
      dataQualityScore: 1,
      methodology: 'PCAF Option 1a - Primary Data on Actual Vehicle Fuel Consumption (Motor Vehicle Loan)',
      calculationSteps: [
        {
          step: 'Total Value at Origination',
          value: totalValueAtOrigination,
          formula: `Total Value at Origination = ${totalValueAtOrigination.toFixed(2)} PKR`
        },
        {
          step: 'Attribution Factor',
          value: attributionFactor,
          formula: `${outstandingAmount} / ${totalValueAtOrigination.toFixed(2)} = ${attributionFactor.toFixed(6)}`
        },
        {
          step: 'Total Vehicle Emissions',
          value: vehicleEmissions,
          formula: `Total Vehicle Emissions = ${vehicleEmissions.toFixed(2)} tCO2e (calculated from detailed vehicle data)`
        },
        {
          step: 'Financed Emissions',
          value: financedEmissions,
          formula: `(${outstandingAmount} / ${totalValueAtOrigination.toFixed(2)}) × ${vehicleEmissions.toFixed(2)} = ${financedEmissions.toFixed(2)} tCO2e`
        }
      ],
      metadata: {
        companyType,
        optionCode: '1a',
        category: 'motor_vehicle_loan',
        totalValueAtOrigination,
        totalVehicleEmissions,
        vehicleEmissions,
        formula: 'Σ (Outstanding amount_v / Total value at origination_v) × Total vehicle emissions_v'
      }
    };
  },
  notes: [
    'Highest data quality score (1)',
    'Primary data on actual vehicle fuel consumption calculated from detailed vehicle entries',
    'Formula: Σ (Outstanding amount_v / Total value at origination_v) × Total vehicle emissions_v'
  ]
};

/**
 * OPTION 1B - PRIMARY DATA ON ACTUAL VEHICLE DISTANCE TRAVELED (MOTOR VEHICLE LOAN)
 * Data Quality Score: 1 (Highest)
 * Uses: Primary data on actual vehicle distance traveled plus vehicle's fuel efficiency and fuel type
 * Formula: Σ (Outstanding amount_v / Total value at origination_v) × Distance traveled_v × Efficiency_v,f × Emission factor_f
 */
export const OPTION_1B_MOTOR_VEHICLE: FormulaConfig = {
  id: '1b-motor-vehicle',
  name: 'Option 1b - Primary Data on Actual Vehicle Distance Traveled (Motor Vehicle Loan)',
  description: 'Primary data on actual vehicle distance traveled plus vehicle\'s fuel efficiency and fuel type from known vehicle make and model',
  dataQualityScore: 1,
  category: 'motor_vehicle_loan',
  optionCode: '1b',
  inputs: [
    COMMON_INPUTS.outstanding_amount,
    {
      name: 'total_value_at_origination',
      label: 'Total Value at Origination',
      type: 'number',
      required: true,
      unit: 'PKR',
      description: 'The total amount of the motor vehicle loan when it was first approved or issued.'
    },
    {
      name: 'total_vehicle_emissions',
      label: 'Total Vehicle Emissions',
      type: 'number',
      required: true,
      unit: 'tCO2e',
      description: 'Total emissions calculated from all vehicles (auto-calculated from vehicle details)'
    }
  ],
  calculate: (inputs, companyType) => {
    const outstandingAmount = inputs.outstanding_amount;
    const totalValueAtOrigination = inputs.total_value_at_origination;
    const totalVehicleEmissions = inputs.total_vehicle_emissions;

    // Validate inputs to prevent division by zero
    if (!totalValueAtOrigination || totalValueAtOrigination === 0) {
      throw new Error('Total value at origination must be greater than 0');
    }
    if (!totalVehicleEmissions || totalVehicleEmissions === 0) {
      throw new Error('Total vehicle emissions must be greater than 0');
    }

    // Step 1: Calculate attribution factor
    const attributionFactor = outstandingAmount / totalValueAtOrigination;

    // Step 2: Use total vehicle emissions (already calculated from detailed vehicle data)
    const vehicleEmissions = totalVehicleEmissions;

    // Step 3: Calculate financed emissions
    const financedEmissions = attributionFactor * vehicleEmissions;

    return {
      attributionFactor,
      emissionFactor: vehicleEmissions,
      financedEmissions,
      dataQualityScore: 1,
      methodology: 'PCAF Option 1b - Primary Data on Actual Vehicle Distance Traveled (Motor Vehicle Loan)',
      calculationSteps: [
        {
          step: 'Total Value at Origination',
          value: totalValueAtOrigination,
          formula: `Total Value at Origination = ${totalValueAtOrigination.toFixed(2)}`
        },
        {
          step: 'Attribution Factor',
          value: attributionFactor,
          formula: `${outstandingAmount} / ${totalValueAtOrigination.toFixed(2)} = ${attributionFactor.toFixed(6)}`
        },
        {
          step: 'Distance Traveled',
          value: distanceTraveled,
          formula: `Distance Traveled = ${distanceTraveled.toFixed(2)} km`
        },
        {
          step: 'Vehicle Emissions',
          value: vehicleEmissions,
          formula: `${distanceTraveled.toFixed(2)} × ${efficiency} × ${emissionFactor} = ${vehicleEmissions.toFixed(2)} tCO2e`
        },
        {
          step: 'Financed Emissions',
          value: financedEmissions,
          formula: `(${outstandingAmount} / ${totalValueAtOrigination.toFixed(2)}) × ${vehicleEmissions.toFixed(2)} = ${financedEmissions.toFixed(2)}`
        }
      ],
      metadata: {
        companyType,
        optionCode: '1b',
        category: 'motor_vehicle_loan',
        totalValueAtOrigination,
        distanceTraveled,
        efficiency,
        emissionFactor,
        vehicleEmissions,
        formula: 'Σ (Outstanding amount_v / Total value at origination_v) × Distance traveled_v × Efficiency_v,f × Emission factor_f'
      }
    };
  },
  notes: [
    'Highest data quality score (1)',
    'Primary data on actual vehicle distance traveled plus vehicle\'s fuel efficiency and fuel type from known vehicle make and model',
    'Formula: Σ (Outstanding amount_v / Total value at origination_v) × Distance traveled_v × Efficiency_v,f × Emission factor_f'
  ]
};

/**
 * OPTION 2A - LOCAL STATISTICAL DATA FOR DISTANCE TRAVELED (MOTOR VEHICLE LOAN)
 * Data Quality Score: 2 (Good)
 * Uses: Local statistical data for distance traveled plus vehicle's fuel efficiency and fuel type
 * Formula: Σ (Outstanding amount_v / Total value at origination_v) × Distance traveled_v × Efficiency_v,f × Emission factor_f
 */
export const OPTION_2A_MOTOR_VEHICLE: FormulaConfig = {
  id: '2a-motor-vehicle',
  name: 'Option 2a - Local Statistical Data for Distance Traveled (Motor Vehicle Loan)',
  description: 'Local statistical data for distance traveled plus vehicle\'s fuel efficiency and fuel type from known vehicle make and model',
  dataQualityScore: 2,
  category: 'motor_vehicle_loan',
  optionCode: '2a',
  inputs: [
    COMMON_INPUTS.outstanding_amount,
    {
      name: 'total_value_at_origination',
      label: 'Total Value at Origination',
      type: 'number',
      required: true,
      unit: 'PKR',
      description: 'The total amount of the motor vehicle loan when it was first approved or issued.'
    },
    {
      name: 'distance_traveled',
      label: 'Distance Traveled',
      type: 'number',
      required: true,
      unit: 'km',
      description: 'Local statistical data for distance traveled'
    },
    {
      name: 'efficiency',
      label: 'Fuel Efficiency',
      type: 'number',
      required: true,
      unit: 'L/km',
      description: 'The amount of fuel the vehicle uses to travel one kilometer.'
    },
    {
      name: 'emission_factor',
      label: 'Emission Factor',
      type: 'number',
      required: true,
      unit: 'tCO2e/L',
      description: 'Emission factor specific to the fuel type'
    }
  ],
  calculate: (inputs, companyType) => {
    const outstandingAmount = inputs.outstanding_amount;
    const totalValueAtOrigination = inputs.total_value_at_origination;
    const distanceTraveled = inputs.distance_traveled;
    const efficiency = inputs.efficiency;
    const emissionFactor = inputs.emission_factor;

    // Step 1: Calculate attribution factor
    const attributionFactor = outstandingAmount / totalValueAtOrigination;

    // Step 2: Calculate emissions from distance traveled, efficiency, and emission factor
    const vehicleEmissions = distanceTraveled * efficiency * emissionFactor;

    // Step 3: Calculate financed emissions
    const financedEmissions = attributionFactor * vehicleEmissions;

    return {
      attributionFactor,
      emissionFactor: vehicleEmissions,
      financedEmissions,
      dataQualityScore: 2,
      methodology: 'PCAF Option 2a - Local Statistical Data for Distance Traveled (Motor Vehicle Loan)',
      calculationSteps: [
        {
          step: 'Total Value at Origination',
          value: totalValueAtOrigination,
          formula: `Total Value at Origination = ${totalValueAtOrigination.toFixed(2)}`
        },
        {
          step: 'Attribution Factor',
          value: attributionFactor,
          formula: `${outstandingAmount} / ${totalValueAtOrigination.toFixed(2)} = ${attributionFactor.toFixed(6)}`
        },
        {
          step: 'Distance Traveled',
          value: distanceTraveled,
          formula: `Distance Traveled = ${distanceTraveled.toFixed(2)} km`
        },
        {
          step: 'Vehicle Emissions',
          value: vehicleEmissions,
          formula: `${distanceTraveled.toFixed(2)} × ${efficiency} × ${emissionFactor} = ${vehicleEmissions.toFixed(2)} tCO2e`
        },
        {
          step: 'Financed Emissions',
          value: financedEmissions,
          formula: `(${outstandingAmount} / ${totalValueAtOrigination.toFixed(2)}) × ${vehicleEmissions.toFixed(2)} = ${financedEmissions.toFixed(2)}`
        }
      ],
      metadata: {
        companyType,
        optionCode: '2a',
        category: 'motor_vehicle_loan',
        totalValueAtOrigination,
        distanceTraveled,
        efficiency,
        emissionFactor,
        vehicleEmissions,
        formula: 'Σ (Outstanding amount_v / Total value at origination_v) × Distance traveled_v × Efficiency_v,f × Emission factor_f'
      }
    };
  },
  notes: [
    'Good data quality score (2)',
    'Local statistical data for distance traveled plus vehicle\'s fuel efficiency and fuel type from known vehicle make and model',
    'Formula: Σ (Outstanding amount_v / Total value at origination_v) × Distance traveled_v × Efficiency_v,f × Emission factor_f'
  ]
};

/**
 * OPTION 2B - REGIONAL STATISTICAL DATA FOR DISTANCE TRAVELED (MOTOR VEHICLE LOAN)
 * Data Quality Score: 3 (Fair)
 * Uses: Regional statistical data for distance traveled plus vehicle's fuel efficiency and fuel type
 * Formula: Σ (Outstanding amount_v / Total value at origination_v) × Distance traveled_v × Efficiency_v,f × Emission factor_f
 */
export const OPTION_2B_MOTOR_VEHICLE: FormulaConfig = {
  id: '2b-motor-vehicle',
  name: 'Option 2b - Regional Statistical Data for Distance Traveled (Motor Vehicle Loan)',
  description: 'Regional statistical data for distance traveled plus vehicle\'s fuel efficiency and fuel type from known vehicle make and model',
  dataQualityScore: 3,
  category: 'motor_vehicle_loan',
  optionCode: '2b',
  inputs: [
    COMMON_INPUTS.outstanding_amount,
    {
      name: 'total_value_at_origination',
      label: 'Total Value at Origination',
      type: 'number',
      required: true,
      unit: 'PKR',
      description: 'The total amount of the motor vehicle loan when it was first approved or issued.'
    },
    {
      name: 'distance_traveled',
      label: 'Distance Traveled',
      type: 'number',
      required: true,
      unit: 'km',
      description: 'Regional statistical data for distance traveled'
    },
    {
      name: 'efficiency',
      label: 'Fuel Efficiency',
      type: 'number',
      required: true,
      unit: 'L/km',
      description: 'The amount of fuel the vehicle uses to travel one kilometer.'
    },
    {
      name: 'emission_factor',
      label: 'Emission Factor',
      type: 'number',
      required: true,
      unit: 'tCO2e/L',
      description: 'Emission factor specific to the fuel type'
    }
  ],
  calculate: (inputs, companyType) => {
    const outstandingAmount = inputs.outstanding_amount;
    const totalValueAtOrigination = inputs.total_value_at_origination;
    const distanceTraveled = inputs.distance_traveled;
    const efficiency = inputs.efficiency;
    const emissionFactor = inputs.emission_factor;

    // Step 1: Calculate attribution factor
    const attributionFactor = outstandingAmount / totalValueAtOrigination;

    // Step 2: Calculate emissions from distance traveled, efficiency, and emission factor
    const vehicleEmissions = distanceTraveled * efficiency * emissionFactor;

    // Step 3: Calculate financed emissions
    const financedEmissions = attributionFactor * vehicleEmissions;

    return {
      attributionFactor,
      emissionFactor: vehicleEmissions,
      financedEmissions,
      dataQualityScore: 3,
      methodology: 'PCAF Option 2b - Regional Statistical Data for Distance Traveled (Motor Vehicle Loan)',
      calculationSteps: [
        {
          step: 'Total Value at Origination',
          value: totalValueAtOrigination,
          formula: `Total Value at Origination = ${totalValueAtOrigination.toFixed(2)}`
        },
        {
          step: 'Attribution Factor',
          value: attributionFactor,
          formula: `${outstandingAmount} / ${totalValueAtOrigination.toFixed(2)} = ${attributionFactor.toFixed(6)}`
        },
        {
          step: 'Distance Traveled',
          value: distanceTraveled,
          formula: `Distance Traveled = ${distanceTraveled.toFixed(2)} km`
        },
        {
          step: 'Vehicle Emissions',
          value: vehicleEmissions,
          formula: `${distanceTraveled.toFixed(2)} × ${efficiency} × ${emissionFactor} = ${vehicleEmissions.toFixed(2)} tCO2e`
        },
        {
          step: 'Financed Emissions',
          value: financedEmissions,
          formula: `(${outstandingAmount} / ${totalValueAtOrigination.toFixed(2)}) × ${vehicleEmissions.toFixed(2)} = ${financedEmissions.toFixed(2)}`
        }
      ],
      metadata: {
        companyType,
        optionCode: '2b',
        category: 'motor_vehicle_loan',
        totalValueAtOrigination,
        distanceTraveled,
        efficiency,
        emissionFactor,
        vehicleEmissions,
        formula: 'Σ (Outstanding amount_v / Total value at origination_v) × Distance traveled_v × Efficiency_v,f × Emission factor_f'
      }
    };
  },
  notes: [
    'Fair data quality score (3)',
    'Regional statistical data for distance traveled plus vehicle\'s fuel efficiency and fuel type from known vehicle make and model',
    'Formula: Σ (Outstanding amount_v / Total value at origination_v) × Distance traveled_v × Efficiency_v,f × Emission factor_f'
  ]
};

// Export all motor vehicle loan formulas
export const MOTOR_VEHICLE_LOAN_FORMULAS = [
  OPTION_1A_MOTOR_VEHICLE,
  OPTION_1B_MOTOR_VEHICLE,
  OPTION_2A_MOTOR_VEHICLE,
  OPTION_2B_MOTOR_VEHICLE
];

// Helper function to get motor vehicle loan formulas by category
export const getMotorVehicleLoanFormulasByCategory = (category: string) => {
  return MOTOR_VEHICLE_LOAN_FORMULAS.filter(formula => formula.category === category);
};

// Helper function to get motor vehicle loan formula by ID
export const getMotorVehicleLoanFormulaById = (id: string) => {
  return MOTOR_VEHICLE_LOAN_FORMULAS.find(formula => formula.id === id);
};

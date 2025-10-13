"""
Motor Vehicle Loan Formula Configurations - Migrated from TypeScript
This file contains all PCAF formulas for Motor Vehicle Loans.

Migrated from: src/pages/finance_facilitated/config/motorVehicleLoanFormulaConfigs.ts
No formulas or working logic has been changed - only converted from TypeScript to Python.
"""

from .finance_models import FormulaConfig, FormulaInput, FormulaInputType, FormulaCategory, ScopeType
from .shared_formula_utils import (
    calculate_attribution_factor,
    calculate_financed_emissions
)

# ============================================================================
# MOTOR VEHICLE LOAN FORMULA CONFIGURATIONS
# ============================================================================

def create_motor_vehicle_loan_formulas():
    """Create all motor vehicle loan formula configurations"""
    
    # Common inputs for motor vehicle loans
    outstanding_amount_input = FormulaInput(
        name='outstanding_amount',
        label='Outstanding Amount',
        type=FormulaInputType.NUMBER,
        required=True,
        unit='PKR',
        description='Outstanding amount in the motor vehicle loan'
    )
    
    vehicle_value_input = FormulaInput(
        name='total_value_at_origination',
        label='Total Value at Origination',
        type=FormulaInputType.NUMBER,
        required=True,
        unit='PKR',
        description='Total value of the vehicle at the time of loan origination'
    )
    
    return [
        # OPTION 1A - PRIMARY DATA ON ACTUAL VEHICLE FUEL CONSUMPTION
        FormulaConfig(
            id='1a-motor-vehicle',
            name='Option 1a - Primary Data on Actual Vehicle Fuel Consumption (Motor Vehicle Loan)',
            description='Primary data on actual vehicle fuel consumption',
            category=FormulaCategory.MOTOR_VEHICLE_LOAN,
            option_code='1a',
            data_quality_score=1,
            inputs=[
                outstanding_amount_input,
                vehicle_value_input,
                FormulaInput(
                    name='fuel_consumption',
                    label='Fuel Consumption',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='L',
                    description='Primary data on actual vehicle fuel consumption'
                ),
                FormulaInput(
                    name='emission_factor',
                    label='Emission Factor',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='tCO2e/L',
                    description='Emission factor for the fuel type'
                )
            ],
            applicable_scopes=[ScopeType.SCOPE1]
        ),
        
        # OPTION 1B - AVERAGE EMISSION FACTORS
        FormulaConfig(
            id='1b-motor-vehicle',
            name='Option 1b - Average Emission Factors (Motor Vehicle Loan)',
            description='Average emission factors for the fuel type + Primary data on actual vehicle fuel consumption',
            category=FormulaCategory.MOTOR_VEHICLE_LOAN,
            option_code='1b',
            data_quality_score=2,
            inputs=[
                outstanding_amount_input,
                vehicle_value_input,
                FormulaInput(
                    name='fuel_consumption',
                    label='Fuel Consumption',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='L',
                    description='Primary data on actual vehicle fuel consumption'
                ),
                FormulaInput(
                    name='average_emission_factor',
                    label='Average Emission Factor',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='tCO2e/L',
                    description='Average emission factors for the fuel type'
                )
            ],
            applicable_scopes=[ScopeType.SCOPE1]
        ),
        
        # OPTION 2A - ESTIMATED FUEL CONSUMPTION FROM VEHICLE SPECIFICATIONS
        FormulaConfig(
            id='2a-motor-vehicle',
            name='Option 2a - Estimated Fuel Consumption from Vehicle Specifications (Motor Vehicle Loan)',
            description='Estimated fuel consumption based on vehicle specifications',
            category=FormulaCategory.MOTOR_VEHICLE_LOAN,
            option_code='2a',
            data_quality_score=3,
            inputs=[
                outstanding_amount_input,
                vehicle_value_input,
                FormulaInput(
                    name='estimated_fuel_consumption_from_specifications',
                    label='Estimated Fuel Consumption from Vehicle Specifications',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='L',
                    description='Estimated fuel consumption based on vehicle specifications'
                ),
                FormulaInput(
                    name='average_emission_factor',
                    label='Average Emission Factor',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='tCO2e/L',
                    description='Average emission factors for the fuel type'
                )
            ],
            applicable_scopes=[ScopeType.SCOPE1]
        ),
        
        # OPTION 2B - ESTIMATED FUEL CONSUMPTION FROM STATISTICS
        FormulaConfig(
            id='2b-motor-vehicle',
            name='Option 2b - Estimated Fuel Consumption from Statistics (Motor Vehicle Loan)',
            description='Estimated fuel consumption based on vehicle statistics',
            category=FormulaCategory.MOTOR_VEHICLE_LOAN,
            option_code='2b',
            data_quality_score=4,
            inputs=[
                outstanding_amount_input,
                vehicle_value_input,
                FormulaInput(
                    name='estimated_fuel_consumption_from_statistics',
                    label='Estimated Fuel Consumption from Statistics',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='L',
                    description='Estimated fuel consumption based on vehicle statistics'
                ),
                FormulaInput(
                    name='average_emission_factor',
                    label='Average Emission Factor',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='tCO2e/L',
                    description='Average emission factors for the fuel type'
                )
            ],
            applicable_scopes=[ScopeType.SCOPE1]
        )
    ]

# Export the formulas
MOTOR_VEHICLE_LOAN_FORMULAS = create_motor_vehicle_loan_formulas()

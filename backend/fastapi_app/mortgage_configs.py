"""
Mortgage Formula Configurations - Migrated from TypeScript
This file contains all PCAF formulas for Mortgage loans.

Migrated from: src/pages/finance_facilitated/config/mortgageFormulaConfigs.ts
No formulas or working logic has been changed - only converted from TypeScript to Python.
"""

from .finance_models import FormulaConfig, FormulaInput, FormulaInputType, FormulaCategory, ScopeType
from .shared_formula_utils import (
    calculate_attribution_factor,
    calculate_financed_emissions
)

# ============================================================================
# MORTGAGE FORMULA CONFIGURATIONS
# ============================================================================

def create_mortgage_formulas():
    """Create all mortgage formula configurations"""
    
    # Common inputs for mortgage
    outstanding_amount_input = FormulaInput(
        name='outstanding_amount',
        label='Outstanding Amount',
        type=FormulaInputType.NUMBER,
        required=True,
        unit='PKR',
        description='Outstanding amount in the mortgage loan'
    )
    
    property_value_input = FormulaInput(
        name='property_value_at_origination',
        label='Property Value at Origination',
        type=FormulaInputType.NUMBER,
        required=True,
        unit='PKR',
        description='Value of the property at the time of mortgage origination'
    )
    
    return [
        # OPTION 1A - SUPPLIER-SPECIFIC EMISSION FACTORS
        FormulaConfig(
            id='1a-mortgage',
            name='Option 1a - Supplier-Specific Emission Factors (Mortgage)',
            description='Supplier-specific emission factors specific to the energy source + Primary data on actual building energy consumption',
            category=FormulaCategory.MORTGAGE,
            option_code='1a',
            data_quality_score=1,
            inputs=[
                outstanding_amount_input,
                property_value_input,
                FormulaInput(
                    name='actual_energy_consumption',
                    label='Actual Energy Consumption',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='kWh',
                    description='Primary data on actual building energy consumption'
                ),
                FormulaInput(
                    name='supplier_specific_emission_factor',
                    label='Supplier Specific Emission Factor',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='tCO2e/kWh',
                    description='Supplier-specific emission factors specific to the energy source'
                )
            ],
            applicable_scopes=[ScopeType.SCOPE1, ScopeType.SCOPE2]
        ),
        
        # OPTION 1B - AVERAGE EMISSION FACTORS
        FormulaConfig(
            id='1b-mortgage',
            name='Option 1b - Average Emission Factors (Mortgage)',
            description='Average emission factors for the energy source + Primary data on actual building energy consumption',
            category=FormulaCategory.MORTGAGE,
            option_code='1b',
            data_quality_score=2,
            inputs=[
                outstanding_amount_input,
                property_value_input,
                FormulaInput(
                    name='actual_energy_consumption',
                    label='Actual Energy Consumption',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='kWh',
                    description='Primary data on actual building energy consumption'
                ),
                FormulaInput(
                    name='average_emission_factor',
                    label='Average Emission Factor',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='tCO2e/kWh',
                    description='Average emission factors for the energy source'
                )
            ],
            applicable_scopes=[ScopeType.SCOPE1, ScopeType.SCOPE2]
        ),
        
        # OPTION 2A - ESTIMATED ENERGY CONSUMPTION FROM LABELS
        FormulaConfig(
            id='2a-mortgage',
            name='Option 2a - Estimated Energy Consumption from Labels (Mortgage)',
            description='Estimated energy consumption based on energy labels or certificates',
            category=FormulaCategory.MORTGAGE,
            option_code='2a',
            data_quality_score=3,
            inputs=[
                outstanding_amount_input,
                property_value_input,
                FormulaInput(
                    name='estimated_energy_consumption_from_labels',
                    label='Estimated Energy Consumption from Labels',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='kWh',
                    description='Estimated energy consumption based on energy labels or certificates'
                ),
                FormulaInput(
                    name='average_emission_factor',
                    label='Average Emission Factor',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='tCO2e/kWh',
                    description='Average emission factors for the energy source'
                )
            ],
            applicable_scopes=[ScopeType.SCOPE1, ScopeType.SCOPE2]
        ),
        
        # OPTION 2B - ESTIMATED ENERGY CONSUMPTION FROM STATISTICS
        FormulaConfig(
            id='2b-mortgage',
            name='Option 2b - Estimated Energy Consumption from Statistics (Mortgage)',
            description='Estimated energy consumption based on building statistics',
            category=FormulaCategory.MORTGAGE,
            option_code='2b',
            data_quality_score=3,
            inputs=[
                outstanding_amount_input,
                property_value_input,
                FormulaInput(
                    name='estimated_energy_consumption_from_statistics',
                    label='Estimated Energy Consumption from Statistics',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='kWh',
                    description='Estimated energy consumption based on building statistics'
                ),
                FormulaInput(
                    name='average_emission_factor',
                    label='Average Emission Factor',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='tCO2e/kWh',
                    description='Average emission factors for the energy source'
                )
            ],
            applicable_scopes=[ScopeType.SCOPE1, ScopeType.SCOPE2]
        )
    ]

# Export the formulas
MORTGAGE_FORMULAS = create_mortgage_formulas()

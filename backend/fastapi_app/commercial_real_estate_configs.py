"""
Commercial Real Estate Formula Configurations - Migrated from TypeScript
This file contains all PCAF formulas for Commercial Real Estate Loans.

Migrated from: src/pages/finance_facilitated/config/commercialRealEstateFormulaConfigs.ts
No formulas or working logic has been changed - only converted from TypeScript to Python.
"""

from .finance_models import FormulaConfig, FormulaInput, FormulaInputType, FormulaCategory, ScopeType
from .shared_formula_utils import (
    calculate_attribution_factor_commercial_real_estate,
    calculate_financed_emissions
)

# ============================================================================
# COMMERCIAL REAL ESTATE LOAN FORMULA CONFIGURATIONS
# ============================================================================

def create_commercial_real_estate_formulas():
    """Create all commercial real estate formula configurations"""
    
    # Common inputs for commercial real estate
    outstanding_amount_input = FormulaInput(
        name='outstanding_amount',
        label='Outstanding Amount',
        type=FormulaInputType.NUMBER,
        required=True,
        unit='PKR',
        description='Outstanding amount in the commercial real estate loan'
    )
    
    property_value_input = FormulaInput(
        name='property_value_at_origination',
        label='Property Value at Origination',
        type=FormulaInputType.NUMBER,
        required=True,
        unit='PKR',
        description='Value of the commercial property at the time of loan origination'
    )
    
    return [
        # OPTION 1A - SUPPLIER-SPECIFIC EMISSION FACTORS
        FormulaConfig(
            id='1a-commercial-real-estate',
            name='Option 1a - Supplier-Specific Emission Factors (Commercial Real Estate)',
            description='Primary data on actual building energy consumption with supplier-specific emission factors',
            category=FormulaCategory.COMMERCIAL_REAL_ESTATE,
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
            id='1b-commercial-real-estate',
            name='Option 1b - Average Emission Factors (Commercial Real Estate)',
            description='Primary data on actual building energy consumption with average emission factors',
            category=FormulaCategory.COMMERCIAL_REAL_ESTATE,
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
            id='2a-commercial-real-estate',
            name='Option 2a - Estimated Energy Consumption from Labels (Commercial Real Estate)',
            description='Estimated energy consumption based on energy labels or certificates',
            category=FormulaCategory.COMMERCIAL_REAL_ESTATE,
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
            id='2b-commercial-real-estate',
            name='Option 2b - Estimated Energy Consumption from Statistics (Commercial Real Estate)',
            description='Estimated energy consumption based on building statistics',
            category=FormulaCategory.COMMERCIAL_REAL_ESTATE,
            option_code='2b',
            data_quality_score=4,
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
COMMERCIAL_REAL_ESTATE_FORMULAS = create_commercial_real_estate_formulas()

"""
Sovereign Debt Formula Configurations - Migrated from TypeScript
This file contains all PCAF formulas for Sovereign Debt loans.

Migrated from: src/pages/finance_facilitated/config/sovereignDebtFormulaConfigs.ts
No formulas or working logic has been changed - only converted from TypeScript to Python.
"""

from .finance_models import FormulaConfig, FormulaInput, FormulaInputType, FormulaCategory, ScopeType
from .shared_formula_utils import (
    calculate_attribution_factor,
    calculate_financed_emissions
)

# ============================================================================
# SOVEREIGN DEBT FORMULA CONFIGURATIONS
# ============================================================================

def create_sovereign_debt_formulas():
    """Create all sovereign debt formula configurations"""
    
    # Common inputs for sovereign debt
    outstanding_amount_input = FormulaInput(
        name='outstanding_amount',
        label='Outstanding Amount',
        type=FormulaInputType.NUMBER,
        required=True,
        unit='PKR',
        description='Outstanding amount in the sovereign debt loan'
    )
    
    ppp_adjusted_gdp_input = FormulaInput(
        name='ppp_adjusted_gdp',
        label='PPP-adjusted GDP',
        type=FormulaInputType.NUMBER,
        required=True,
        unit='PKR',
        description='Purchasing Power Parity adjusted GDP of the country'
    )
    
    return [
        # OPTION 1A - VERIFIED COUNTRY EMISSIONS
        FormulaConfig(
            id='1a-sovereign-debt',
            name='Option 1a - Verified Country Emissions (Sovereign Debt)',
            description='Verified GHG emissions of the country, reported by the country to UNFCCC',
            category=FormulaCategory.SOVEREIGN_DEBT,
            option_code='1a',
            data_quality_score=1,
            inputs=[
                outstanding_amount_input,
                ppp_adjusted_gdp_input,
                FormulaInput(
                    name='verified_emissions',
                    label='Verified Country Emissions',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='tCO2e',
                    description='Verified GHG emissions of the country'
                )
            ],
            applicable_scopes=[ScopeType.SCOPE1, ScopeType.SCOPE2, ScopeType.SCOPE3]
        ),
        
        # OPTION 1B - UNVERIFIED COUNTRY EMISSIONS
        FormulaConfig(
            id='1b-sovereign-debt',
            name='Option 1b - Unverified Country Emissions (Sovereign Debt)',
            description='Unverified GHG emissions of the country',
            category=FormulaCategory.SOVEREIGN_DEBT,
            option_code='1b',
            data_quality_score=2,
            inputs=[
                outstanding_amount_input,
                ppp_adjusted_gdp_input,
                FormulaInput(
                    name='unverified_emissions',
                    label='Unverified Country Emissions',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='tCO2e',
                    description='Unverified GHG emissions of the country'
                )
            ],
            applicable_scopes=[ScopeType.SCOPE1, ScopeType.SCOPE2, ScopeType.SCOPE3]
        ),
        
        # OPTION 2A - ENERGY CONSUMPTION DATA
        FormulaConfig(
            id='2a-sovereign-debt',
            name='Option 2a - Energy Consumption Data (Sovereign Debt)',
            description='Energy consumption data of the country',
            category=FormulaCategory.SOVEREIGN_DEBT,
            option_code='2a',
            data_quality_score=3,
            inputs=[
                outstanding_amount_input,
                ppp_adjusted_gdp_input,
                FormulaInput(
                    name='energy_consumption',
                    label='Country Energy Consumption',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='MWh',
                    description='Energy consumption data of the country'
                ),
                FormulaInput(
                    name='emission_factor',
                    label='Emission Factor',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='tCO2e/MWh',
                    description='Emission factor for the energy source'
                )
            ],
            applicable_scopes=[ScopeType.SCOPE1, ScopeType.SCOPE2]
        )
    ]

# Export the formulas
SOVEREIGN_DEBT_FORMULAS = create_sovereign_debt_formulas()

"""
Project Finance Formula Configurations - Migrated from TypeScript
This file contains all PCAF formulas for Project Finance investments.

Migrated from: src/pages/finance_facilitated/config/projectFinanceFormulaConfigs.ts
No formulas or working logic has been changed - only converted from TypeScript to Python.
"""

from .finance_models import FormulaConfig, FormulaInput, FormulaInputType, FormulaCategory, ScopeType
from .shared_formula_utils import (
    calculate_attribution_factor_project,
    calculate_total_equity_plus_debt,
    calculate_financed_emissions
)

# ============================================================================
# PROJECT FINANCE FORMULA CONFIGURATIONS
# ============================================================================

def create_project_finance_formulas():
    """Create all project finance formula configurations"""
    
    # Common inputs for project finance
    outstanding_amount_input = FormulaInput(
        name='outstanding_amount',
        label='Outstanding Amount',
        type=FormulaInputType.NUMBER,
        required=True,
        unit='PKR',
        description='Outstanding amount in the project finance investment'
    )
    
    total_project_equity_plus_debt_input = FormulaInput(
        name='total_project_equity_plus_debt',
        label='Total Project Equity + Debt',
        type=FormulaInputType.NUMBER,
        required=True,
        unit='PKR',
        description='Total project equity plus debt for project finance investments'
    )
    
    return [
        # OPTION 1A - VERIFIED GHG EMISSIONS
        FormulaConfig(
            id='1a-project-finance',
            name='Option 1a - Verified GHG Emissions (Project Finance)',
            description='Verified GHG emissions data from the project in accordance with the GHG Protocol',
            category=FormulaCategory.PROJECT_FINANCE,
            option_code='1a',
            data_quality_score=1,
            inputs=[
                outstanding_amount_input,
                total_project_equity_plus_debt_input,
                FormulaInput(
                    name='verified_emissions',
                    label='Verified GHG Emissions',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='tCO2e',
                    description='Verified GHG emissions data from the project'
                )
            ],
            applicable_scopes=[ScopeType.SCOPE1, ScopeType.SCOPE2, ScopeType.SCOPE3]
        ),
        
        # OPTION 1B - UNVERIFIED GHG EMISSIONS
        FormulaConfig(
            id='1b-project-finance',
            name='Option 1b - Unverified GHG Emissions (Project Finance)',
            description='Unverified GHG emissions data from the project',
            category=FormulaCategory.PROJECT_FINANCE,
            option_code='1b',
            data_quality_score=2,
            inputs=[
                outstanding_amount_input,
                total_project_equity_plus_debt_input,
                FormulaInput(
                    name='unverified_emissions',
                    label='Unverified GHG Emissions',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='tCO2e',
                    description='Unverified GHG emissions data from the project'
                )
            ],
            applicable_scopes=[ScopeType.SCOPE1, ScopeType.SCOPE2, ScopeType.SCOPE3]
        ),
        
        # OPTION 2A - ENERGY CONSUMPTION DATA
        FormulaConfig(
            id='2a-project-finance',
            name='Option 2a - Energy Consumption Data (Project Finance)',
            description='Energy consumption data from the project',
            category=FormulaCategory.PROJECT_FINANCE,
            option_code='2a',
            data_quality_score=3,
            inputs=[
                outstanding_amount_input,
                total_project_equity_plus_debt_input,
                FormulaInput(
                    name='energy_consumption',
                    label='Energy Consumption',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='MWh',
                    description='Energy consumption data from the project'
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
        ),
        
        # OPTION 2B - PRODUCTION DATA
        FormulaConfig(
            id='2b-project-finance',
            name='Option 2b - Production Data (Project Finance)',
            description='Production data from the project',
            category=FormulaCategory.PROJECT_FINANCE,
            option_code='2b',
            data_quality_score=3,
            inputs=[
                outstanding_amount_input,
                total_project_equity_plus_debt_input,
                FormulaInput(
                    name='production',
                    label='Production',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='tonnes',
                    description='Production data from the project'
                ),
                FormulaInput(
                    name='production_emission_factor',
                    label='Production Emission Factor',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='tCO2e/tonne',
                    description='Emission factor per unit of production'
                )
            ],
            applicable_scopes=[ScopeType.SCOPE1, ScopeType.SCOPE2]
        )
    ]

# Export the formulas
PROJECT_FINANCE_FORMULAS = create_project_finance_formulas()

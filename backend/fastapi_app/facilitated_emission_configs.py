"""
Facilitated Emission Formula Configurations - Migrated from TypeScript
This file contains all PCAF formulas for Facilitated Emissions.

Migrated from: src/pages/finance_facilitated/config/facilitatedEmissionFormulaConfigs.ts
No formulas or working logic has been changed - only converted from TypeScript to Python.
"""

from .finance_models import FormulaConfig, FormulaInput, FormulaInputType, FormulaCategory, ScopeType
from .shared_formula_utils import (
    calculate_evic,
    calculate_total_equity_plus_debt,
    calculate_facilitated_emissions
)

# ============================================================================
# FACILITATED EMISSION FORMULA CONFIGURATIONS
# ============================================================================

def create_facilitated_emission_formulas():
    """Create all facilitated emission formula configurations"""
    
    # Common inputs for facilitated emissions
    facilitated_amount_input = FormulaInput(
        name='facilitated_amount',
        label='Facilitated Amount',
        type=FormulaInputType.NUMBER,
        required=True,
        unit='PKR',
        description='Total amount of financial services provided to the client'
    )
    
    weighting_factor_input = FormulaInput(
        name='weighting_factor',
        label='Weighting Factor',
        type=FormulaInputType.NUMBER,
        required=True,
        unit='ratio',
        description='Factor representing the proportion of services provided (0-1)',
        validation={'min': 0, 'max': 1}
    )
    
    return [
        # OPTION 1A - VERIFIED GHG EMISSIONS (FACILITATED - LISTED)
        FormulaConfig(
            id='1a-facilitated-verified-listed',
            name='Option 1a - Verified GHG Emissions (Facilitated - Listed)',
            description='Verified GHG emissions data from the listed client company in accordance with the GHG Protocol',
            category=FormulaCategory.FACILITATED_EMISSION,
            option_code='1a',
            data_quality_score=1,
            inputs=[
                facilitated_amount_input,
                FormulaInput(
                    name='total_assets',
                    label='Total Assets',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='PKR',
                    description='Total assets value for attribution factor calculation'
                ),
                FormulaInput(
                    name='evic',
                    label='EVIC (Enterprise Value Including Cash)',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='PKR',
                    description='EVIC for listed companies'
                ),
                weighting_factor_input,
                FormulaInput(
                    name='verified_emissions',
                    label='Verified GHG Emissions',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='tCO2e',
                    description='Total carbon emissions from the client company (verified by third party)'
                )
            ],
            applicable_scopes=[ScopeType.SCOPE1, ScopeType.SCOPE2, ScopeType.SCOPE3]
        ),
        
        # OPTION 1A - VERIFIED GHG EMISSIONS (FACILITATED - UNLISTED)
        FormulaConfig(
            id='1a-facilitated-verified-unlisted',
            name='Option 1a - Verified GHG Emissions (Facilitated - Unlisted)',
            description='Verified GHG emissions data from the unlisted client company in accordance with the GHG Protocol',
            category=FormulaCategory.FACILITATED_EMISSION,
            option_code='1a',
            data_quality_score=1,
            inputs=[
                facilitated_amount_input,
                FormulaInput(
                    name='total_assets',
                    label='Total Assets',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='PKR',
                    description='Total assets value for attribution factor calculation'
                ),
                FormulaInput(
                    name='total_equity_plus_debt',
                    label='Total Equity + Debt',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='PKR',
                    description='Total equity plus debt for unlisted companies'
                ),
                weighting_factor_input,
                FormulaInput(
                    name='verified_emissions',
                    label='Verified GHG Emissions',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='tCO2e',
                    description='Total carbon emissions from the client company (verified by third party)'
                )
            ],
            applicable_scopes=[ScopeType.SCOPE1, ScopeType.SCOPE2, ScopeType.SCOPE3]
        ),
        
        # OPTION 1B - UNVERIFIED GHG EMISSIONS (FACILITATED - LISTED)
        FormulaConfig(
            id='1b-facilitated-unverified-listed',
            name='Option 1b - Unverified GHG Emissions (Facilitated - Listed)',
            description='Unverified GHG emissions data from the listed client company',
            category=FormulaCategory.FACILITATED_EMISSION,
            option_code='1b',
            data_quality_score=2,
            inputs=[
                facilitated_amount_input,
                FormulaInput(
                    name='total_assets',
                    label='Total Assets',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='PKR',
                    description='Total assets value for attribution factor calculation'
                ),
                FormulaInput(
                    name='evic',
                    label='EVIC (Enterprise Value Including Cash)',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='PKR',
                    description='EVIC for listed companies'
                ),
                weighting_factor_input,
                FormulaInput(
                    name='unverified_emissions',
                    label='Unverified GHG Emissions',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='tCO2e',
                    description='Total carbon emissions from the client company (unverified)'
                )
            ],
            applicable_scopes=[ScopeType.SCOPE1, ScopeType.SCOPE2, ScopeType.SCOPE3]
        ),
        
        # OPTION 1B - UNVERIFIED GHG EMISSIONS (FACILITATED - UNLISTED)
        FormulaConfig(
            id='1b-facilitated-unverified-unlisted',
            name='Option 1b - Unverified GHG Emissions (Facilitated - Unlisted)',
            description='Unverified GHG emissions data from the unlisted client company',
            category=FormulaCategory.FACILITATED_EMISSION,
            option_code='1b',
            data_quality_score=2,
            inputs=[
                facilitated_amount_input,
                FormulaInput(
                    name='total_assets',
                    label='Total Assets',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='PKR',
                    description='Total assets value for attribution factor calculation'
                ),
                FormulaInput(
                    name='total_equity_plus_debt',
                    label='Total Equity + Debt',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='PKR',
                    description='Total equity plus debt for unlisted companies'
                ),
                weighting_factor_input,
                FormulaInput(
                    name='unverified_emissions',
                    label='Unverified GHG Emissions',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='tCO2e',
                    description='Total carbon emissions from the client company (unverified)'
                )
            ],
            applicable_scopes=[ScopeType.SCOPE1, ScopeType.SCOPE2, ScopeType.SCOPE3]
        ),
        
        # OPTION 2A - ENERGY CONSUMPTION DATA (FACILITATED - LISTED)
        FormulaConfig(
            id='2a-facilitated-energy-listed',
            name='Option 2a - Energy Consumption Data (Facilitated - Listed)',
            description='Energy consumption data with energy-specific emission factors for facilitated emissions from listed companies',
            category=FormulaCategory.FACILITATED_EMISSION,
            option_code='2a',
            data_quality_score=3,
            inputs=[
                facilitated_amount_input,
                FormulaInput(
                    name='total_assets',
                    label='Total Assets',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='PKR',
                    description='Total assets value for attribution factor calculation'
                ),
                FormulaInput(
                    name='evic',
                    label='EVIC (Enterprise Value Including Cash)',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='PKR',
                    description='EVIC for listed companies'
                ),
                weighting_factor_input,
                FormulaInput(
                    name='energy_consumption',
                    label='Energy Consumption',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='MWh',
                    description='How much energy the client company used (from utility bills)'
                ),
                FormulaInput(
                    name='emission_factor',
                    label='Emission Factor',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='tCO2e/MWh',
                    description='How much carbon is released per unit of energy used'
                )
            ],
            applicable_scopes=[ScopeType.SCOPE1, ScopeType.SCOPE2]
        ),
        
        # OPTION 2A - ENERGY CONSUMPTION DATA (FACILITATED - UNLISTED)
        FormulaConfig(
            id='2a-facilitated-energy-unlisted',
            name='Option 2a - Energy Consumption Data (Facilitated - Unlisted)',
            description='Energy consumption data with energy-specific emission factors for facilitated emissions from unlisted companies',
            category=FormulaCategory.FACILITATED_EMISSION,
            option_code='2a',
            data_quality_score=3,
            inputs=[
                facilitated_amount_input,
                FormulaInput(
                    name='total_assets',
                    label='Total Assets',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='PKR',
                    description='Total assets value for attribution factor calculation'
                ),
                FormulaInput(
                    name='total_equity_plus_debt',
                    label='Total Equity + Debt',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='PKR',
                    description='Total equity plus debt for unlisted companies'
                ),
                weighting_factor_input,
                FormulaInput(
                    name='energy_consumption',
                    label='Energy Consumption',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='MWh',
                    description='How much energy the client company used (from utility bills)'
                ),
                FormulaInput(
                    name='emission_factor',
                    label='Emission Factor',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='tCO2e/MWh',
                    description='How much carbon is released per unit of energy used'
                )
            ],
            applicable_scopes=[ScopeType.SCOPE1, ScopeType.SCOPE2]
        ),
        
        # OPTION 2B - PRODUCTION DATA (FACILITATED - LISTED)
        FormulaConfig(
            id='2b-facilitated-production-listed',
            name='Option 2b - Production Data (Facilitated - Listed)',
            description='Production data with production-specific emission factors for facilitated emissions from listed companies',
            category=FormulaCategory.FACILITATED_EMISSION,
            option_code='2b',
            data_quality_score=3,
            inputs=[
                facilitated_amount_input,
                FormulaInput(
                    name='total_assets',
                    label='Total Assets',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='PKR',
                    description='Total assets value for attribution factor calculation'
                ),
                FormulaInput(
                    name='evic',
                    label='EVIC (Enterprise Value Including Cash)',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='PKR',
                    description='EVIC for listed companies'
                ),
                weighting_factor_input,
                FormulaInput(
                    name='production',
                    label='Production',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='tonnes',
                    description='How much the client company produced (e.g., tonnes of rice, steel, etc.)'
                ),
                FormulaInput(
                    name='emission_factor',
                    label='Emission Factor',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='tCO2e/tonne',
                    description='How much carbon is released per unit of production'
                )
            ],
            applicable_scopes=[ScopeType.SCOPE1, ScopeType.SCOPE2, ScopeType.SCOPE3]
        ),
        
        # OPTION 2B - PRODUCTION DATA (FACILITATED - UNLISTED)
        FormulaConfig(
            id='2b-facilitated-production-unlisted',
            name='Option 2b - Production Data (Facilitated - Unlisted)',
            description='Production data with production-specific emission factors for facilitated emissions from unlisted companies',
            category=FormulaCategory.FACILITATED_EMISSION,
            option_code='2b',
            data_quality_score=3,
            inputs=[
                facilitated_amount_input,
                FormulaInput(
                    name='total_assets',
                    label='Total Assets',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='PKR',
                    description='Total assets value for attribution factor calculation'
                ),
                FormulaInput(
                    name='total_equity_plus_debt',
                    label='Total Equity + Debt',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='PKR',
                    description='Total equity plus debt for unlisted companies'
                ),
                weighting_factor_input,
                FormulaInput(
                    name='production',
                    label='Production',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='tonnes',
                    description='How much the client company produced (e.g., tonnes of rice, steel, etc.)'
                ),
                FormulaInput(
                    name='emission_factor',
                    label='Emission Factor',
                    type=FormulaInputType.NUMBER,
                    required=True,
                    unit='tCO2e/tonne',
                    description='How much carbon is released per unit of production'
                )
            ],
            applicable_scopes=[ScopeType.SCOPE1, ScopeType.SCOPE2, ScopeType.SCOPE3]
        )
    ]

# Export the formulas
FACILITATED_EMISSION_FORMULAS = create_facilitated_emission_formulas()

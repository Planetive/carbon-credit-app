"""
Basic Formula Configurations for Testing
This file contains basic formula configurations to test the calculation engine
"""

from .finance_models import FormulaConfig, FormulaInput, FormulaInputType, FormulaCategory, ScopeType

# Basic formula configurations for testing
BASIC_FORMULAS = [
    # Finance Emission - Listed Company
    FormulaConfig(
        id="1a-listed-equity",
        name="Option 1a - Verified GHG Emissions (Listed)",
        description="Verified GHG emissions data from the company",
        category=FormulaCategory.LISTED_EQUITY,
        option_code="1a",
        data_quality_score=1,
        inputs=[
            FormulaInput(
                name="outstanding_amount",
                label="Outstanding Amount",
                type=FormulaInputType.NUMBER,
                required=True,
                unit="USD"
            ),
            FormulaInput(
                name="evic",
                label="EVIC (Enterprise Value Including Cash)",
                type=FormulaInputType.NUMBER,
                required=True,
                unit="USD"
            ),
            FormulaInput(
                name="verified_emissions",
                label="Verified GHG Emissions",
                type=FormulaInputType.NUMBER,
                required=True,
                unit="tCO2e"
            )
        ],
        applicable_scopes=[ScopeType.SCOPE1, ScopeType.SCOPE2, ScopeType.SCOPE3]
    ),
    
    # Finance Emission - Unlisted Company
    FormulaConfig(
        id="1a-unlisted-equity",
        name="Option 1a - Verified GHG Emissions (Unlisted)",
        description="Verified GHG emissions data from the company",
        category=FormulaCategory.LISTED_EQUITY,
        option_code="1a",
        data_quality_score=1,
        inputs=[
            FormulaInput(
                name="outstanding_amount",
                label="Outstanding Amount",
                type=FormulaInputType.NUMBER,
                required=True,
                unit="USD"
            ),
            FormulaInput(
                name="total_equity_plus_debt",
                label="Total Equity + Debt",
                type=FormulaInputType.NUMBER,
                required=True,
                unit="USD"
            ),
            FormulaInput(
                name="verified_emissions",
                label="Verified GHG Emissions",
                type=FormulaInputType.NUMBER,
                required=True,
                unit="tCO2e"
            )
        ],
        applicable_scopes=[ScopeType.SCOPE1, ScopeType.SCOPE2, ScopeType.SCOPE3]
    ),
    
    # Facilitated Emission - Listed Company
    FormulaConfig(
        id="1a-facilitated-listed",
        name="Option 1a - Verified GHG Emissions (Facilitated - Listed)",
        description="Verified GHG emissions data for facilitated emissions",
        category=FormulaCategory.FACILITATED_EMISSION,
        option_code="1a",
        data_quality_score=1,
        inputs=[
            FormulaInput(
                name="facilitated_amount",
                label="Facilitated Amount",
                type=FormulaInputType.NUMBER,
                required=True,
                unit="USD"
            ),
            FormulaInput(
                name="evic",
                label="EVIC (Enterprise Value Including Cash)",
                type=FormulaInputType.NUMBER,
                required=True,
                unit="USD"
            ),
            FormulaInput(
                name="weighting_factor",
                label="Weighting Factor",
                type=FormulaInputType.NUMBER,
                required=True,
                unit="decimal"
            ),
            FormulaInput(
                name="verified_emissions",
                label="Verified GHG Emissions",
                type=FormulaInputType.NUMBER,
                required=True,
                unit="tCO2e"
            )
        ],
        applicable_scopes=[ScopeType.SCOPE1, ScopeType.SCOPE2, ScopeType.SCOPE3]
    ),
    
    # Facilitated Emission - Unlisted Company
    FormulaConfig(
        id="1a-facilitated-unlisted",
        name="Option 1a - Verified GHG Emissions (Facilitated - Unlisted)",
        description="Verified GHG emissions data for facilitated emissions",
        category=FormulaCategory.FACILITATED_EMISSION,
        option_code="1a",
        data_quality_score=1,
        inputs=[
            FormulaInput(
                name="facilitated_amount",
                label="Facilitated Amount",
                type=FormulaInputType.NUMBER,
                required=True,
                unit="USD"
            ),
            FormulaInput(
                name="total_equity_plus_debt",
                label="Total Equity + Debt",
                type=FormulaInputType.NUMBER,
                required=True,
                unit="USD"
            ),
            FormulaInput(
                name="weighting_factor",
                label="Weighting Factor",
                type=FormulaInputType.NUMBER,
                required=True,
                unit="decimal"
            ),
            FormulaInput(
                name="verified_emissions",
                label="Verified GHG Emissions",
                type=FormulaInputType.NUMBER,
                required=True,
                unit="tCO2e"
            )
        ],
        applicable_scopes=[ScopeType.SCOPE1, ScopeType.SCOPE2, ScopeType.SCOPE3]
    )
]

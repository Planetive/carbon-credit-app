"""
Finance Emission Models - Migrated from TypeScript
This file contains Pydantic models that mirror the TypeScript types exactly.
No formulas or working logic has been changed - only converted from TypeScript to Python.
"""

from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any, Literal, Union
from decimal import Decimal
from enum import Enum


# ============================================================================
# CORE TYPES (migrated from types/formula.ts)
# ============================================================================

class FormulaInputType(str, Enum):
    NUMBER = "number"
    TEXT = "text"
    SELECT = "select"


class FormulaCategory(str, Enum):
    LISTED_EQUITY = "listed_equity"
    BUSINESS_LOANS = "business_loans"
    PROJECT_FINANCE = "project_finance"
    MORTGAGE = "mortgage"
    SOVEREIGN_DEBT = "sovereign-debt"
    MOTOR_VEHICLE_LOAN = "motor_vehicle_loan"
    COMMERCIAL_REAL_ESTATE = "commercial_real_estate"
    FACILITATED_EMISSION = "facilitated_emission"


class CompanyType(str, Enum):
    LISTED = "listed"
    PRIVATE = "private"


class ScopeType(str, Enum):
    SCOPE1 = "scope1"
    SCOPE2 = "scope2"
    SCOPE3 = "scope3"


class FormulaInput(BaseModel):
    """FormulaInput - migrated from TypeScript interface"""
    name: str
    label: str
    type: FormulaInputType
    required: bool
    unit: Optional[str] = None
    description: Optional[str] = None
    options: Optional[List[Dict[str, str]]] = None
    unit_options: Optional[List[Dict[str, str]]] = None
    validation: Optional[Dict[str, Any]] = None


class FormulaConfig(BaseModel):
    """FormulaConfig - migrated from TypeScript interface"""
    id: str
    name: str
    description: str
    category: FormulaCategory
    option_code: str  # '1a', '1b', '2a', etc.
    data_quality_score: int  # 1-5, where 1 is best
    inputs: List[FormulaInput]
    calculate: Optional[Any] = None  # Function reference - will be handled differently in Python
    applicable_scopes: Optional[List[ScopeType]] = None
    notes: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None


class CalculationStep(BaseModel):
    """Individual calculation step"""
    step: str
    value: float
    formula: str


class CalculationResult(BaseModel):
    """CalculationResult - migrated from TypeScript interface"""
    attribution_factor: float
    emission_factor: float
    financed_emissions: float
    data_quality_score: int
    methodology: str
    calculation_steps: List[CalculationStep]
    metadata: Optional[Dict[str, Any]] = None


class CompanyData(BaseModel):
    """CompanyData - migrated from TypeScript interface"""
    type: CompanyType
    outstanding_amount: float
    evic: Optional[float] = None  # For listed companies
    total_equity: Optional[float] = None  # For private companies
    total_debt: Optional[float] = None  # For private companies
    revenue: Optional[float] = None
    assets: Optional[float] = None
    asset_turnover_ratio: Optional[float] = None
    sector: Optional[str] = None


class FormulaValidationResult(BaseModel):
    """FormulaValidationResult - migrated from TypeScript interface"""
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    missing_inputs: List[str]


# ============================================================================
# DATABASE MODELS (for Supabase integration)
# ============================================================================

class FinanceEmissionCalculation(BaseModel):
    """Database model for finance emission calculations"""
    id: Optional[str] = None
    user_id: str
    calculation_type: Literal["finance_emission", "facilitated_emission"]
    formula_id: str
    formula_name: str
    company_type: CompanyType
    
    # Financial inputs
    outstanding_amount: Optional[float] = None
    total_assets: Optional[float] = None
    evic: Optional[float] = None
    total_equity_plus_debt: Optional[float] = None
    
    # Company financial data (for listed companies)
    share_price: Optional[float] = None
    outstanding_shares: Optional[float] = None
    total_debt: Optional[float] = None
    minority_interest: Optional[float] = None
    preferred_stock: Optional[float] = None
    
    # Company financial data (for unlisted companies)
    total_equity: Optional[float] = None
    
    # Facilitated emission specific fields
    facilitated_amount: Optional[float] = None
    underwriting_amount: Optional[float] = None
    underwriting_share_pct: Optional[float] = None
    weighting_factor: Optional[float] = None
    
    # Emission/activity inputs
    verified_emissions: Optional[float] = None
    unverified_emissions: Optional[float] = None
    energy_consumption: Optional[float] = None
    emission_factor: Optional[float] = None
    production: Optional[float] = None
    production_emission_factor: Optional[float] = None
    process_emissions: Optional[float] = None
    
    # Calculation results
    attribution_factor: Optional[float] = None
    financed_emissions: Optional[float] = None
    data_quality_score: Optional[int] = None
    methodology: Optional[str] = None
    
    # Calculation steps (stored as JSON)
    calculation_steps: Optional[List[CalculationStep]] = None
    
    # Metadata
    status: Literal["draft", "completed", "failed"] = "completed"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class FinanceEmissionFormula(BaseModel):
    """Database model for formula configurations"""
    id: str
    name: str
    description: Optional[str] = None
    category: FormulaCategory
    option_code: str
    data_quality_score: int
    applicable_scopes: Optional[List[ScopeType]] = None
    inputs: List[FormulaInput]
    calculation_logic: Optional[Dict[str, Any]] = None
    notes: Optional[List[str]] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# ============================================================================
# REQUEST/RESPONSE MODELS (for API endpoints)
# ============================================================================

class FinanceEmissionRequest(BaseModel):
    """Request model for finance emission calculation"""
    formula_id: str
    company_type: CompanyType
    inputs: Dict[str, Any]
    
    @validator('inputs')
    def validate_inputs(cls, v):
        if not isinstance(v, dict):
            raise ValueError('Inputs must be a dictionary')
        return v


class FacilitatedEmissionRequest(BaseModel):
    """Request model for facilitated emission calculation"""
    formula_id: str
    company_type: CompanyType
    inputs: Dict[str, Any]
    
    @validator('inputs')
    def validate_inputs(cls, v):
        if not isinstance(v, dict):
            raise ValueError('Inputs must be a dictionary')
        return v


class FinanceEmissionResponse(BaseModel):
    """Response model for finance emission calculation"""
    success: bool
    result: Optional[CalculationResult] = None
    error: Optional[str] = None
    calculation_id: Optional[str] = None


class FacilitatedEmissionResponse(BaseModel):
    """Response model for facilitated emission calculation"""
    success: bool
    result: Optional[CalculationResult] = None
    error: Optional[str] = None
    calculation_id: Optional[str] = None


class FormulaListResponse(BaseModel):
    """Response model for formula list"""
    formulas: List[FinanceEmissionFormula]
    total_count: int


class CalculationHistoryResponse(BaseModel):
    """Response model for calculation history"""
    calculations: List[FinanceEmissionCalculation]
    total_count: int
    page: int
    page_size: int


# ============================================================================
# UNIT CONVERSION MODELS (migrated from utils/unitConversions.ts)
# ============================================================================

class UnitType(str, Enum):
    EMISSIONS = "emissions"
    ENERGY = "energy"
    EMISSION_FACTOR = "emissionFactor"
    PRODUCTION = "production"
    PRODUCTION_EMISSION_FACTOR = "productionEmissionFactor"
    FUEL_CONSUMPTION = "fuelConsumption"
    VEHICLE_EMISSION_FACTOR = "vehicleEmissionFactor"


class UnitConversionRequest(BaseModel):
    """Request model for unit conversion"""
    value: float
    unit: str
    target_type: UnitType


class UnitConversionResponse(BaseModel):
    """Response model for unit conversion"""
    original_value: float
    original_unit: str
    converted_value: float
    target_type: UnitType


# ============================================================================
# VALIDATION MODELS
# ============================================================================

class FormulaValidationRequest(BaseModel):
    """Request model for formula validation"""
    formula_id: str
    inputs: Dict[str, Any]


class FormulaValidationResponse(BaseModel):
    """Response model for formula validation"""
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    missing_inputs: List[str]


# ============================================================================
# EXPORT MODELS
# ============================================================================

class ExportFormat(str, Enum):
    JSON = "json"
    CSV = "csv"
    SUMMARY = "summary"


class ExportRequest(BaseModel):
    """Request model for exporting calculation results"""
    calculation_ids: List[str]
    format: ExportFormat


class ExportResponse(BaseModel):
    """Response model for export"""
    success: bool
    data: Optional[str] = None
    filename: Optional[str] = None
    error: Optional[str] = None

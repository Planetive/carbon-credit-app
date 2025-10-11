from pydantic import BaseModel, Field, conlist, confloat
from typing import List, Optional, Literal, Dict, Any


class HealthResponse(BaseModel):
    status: Literal["ok"]
    engine_version: str
    database_status: Optional[str] = None


class FinanceEmissionRequest(BaseModel):
    formula_id: str
    company_type: Literal["listed", "unlisted"]
    inputs: Dict[str, Any]


class FacilitatedEmissionRequest(BaseModel):
    formula_id: str
    company_type: Literal["listed", "unlisted"]
    inputs: Dict[str, Any]


class CalculationResult(BaseModel):
    attribution_factor: float
    emission_factor: float
    financed_emissions: float
    data_quality_score: int
    methodology: str
    calculation_steps: List[Dict[str, Any]]
    metadata: Optional[Dict[str, Any]] = None


class FinanceEmissionResponse(BaseModel):
    success: bool
    result: Optional[CalculationResult] = None
    error: Optional[str] = None
    calculation_id: Optional[str] = None


class FacilitatedEmissionResponse(BaseModel):
    success: bool
    result: Optional[CalculationResult] = None
    error: Optional[str] = None
    calculation_id: Optional[str] = None
    # Shared company fields
    share_price: Optional[confloat(ge=0)] = 0
    outstanding_shares: Optional[confloat(ge=0)] = 0
    total_debt: Optional[confloat(ge=0)] = 0
    total_equity: Optional[confloat(ge=0)] = 0
    minority_interest: Optional[confloat(ge=0)] = 0
    preferred_stock: Optional[confloat(ge=0)] = 0
    # Loan-specific fields
    outstanding_amount: confloat(ge=0) = 0
    total_project_equity: Optional[confloat(ge=0)] = 0
    total_project_debt: Optional[confloat(ge=0)] = 0
    property_value_at_origination: Optional[confloat(ge=0)] = 0
    total_value_at_origination: Optional[confloat(ge=0)] = 0
    ppp_adjustment_factor: Optional[confloat(ge=0)] = 0
    gdp: Optional[confloat(ge=0)] = 0
    # Emission/activity inputs (already in base units on backend)
    verified_emissions: Optional[confloat(ge=0)] = 0
    unverified_emissions: Optional[confloat(ge=0)] = 0
    energy_consumption: Optional[confloat(ge=0)] = 0
    emission_factor: Optional[confloat(ge=0)] = 0
    production: Optional[confloat(ge=0)] = 0
    production_emission_factor: Optional[confloat(ge=0)] = 0
    # Metadata
    formula_hint: Optional[str] = None


class FinanceEmissionResponse(BaseModel):
    engine_version: str
    methodology: str
    attribution_factor: float
    financed_emissions: float
    denominator_label: str
    denominator_value: float


class FacilitatedEmissionRequest(BaseModel):
    company_type: Literal["listed", "unlisted"]
    # financials
    share_price: Optional[confloat(ge=0)] = 0
    outstanding_shares: Optional[confloat(ge=0)] = 0
    total_debt: Optional[confloat(ge=0)] = 0
    minority_interest: Optional[confloat(ge=0)] = 0
    preferred_stock: Optional[confloat(ge=0)] = 0
    total_equity: Optional[confloat(ge=0)] = 0
    # underwriting
    underwriting_amount: confloat(ge=0)
    underwriting_share_pct: confloat(ge=0, le=100)
    # emissions/activity
    verified_emissions: Optional[confloat(ge=0)] = 0
    unverified_emissions: Optional[confloat(ge=0)] = 0
    energy_consumption: Optional[confloat(ge=0)] = 0
    emission_factor: Optional[confloat(ge=0)] = 0
    production: Optional[confloat(ge=0)] = 0
    production_emission_factor: Optional[confloat(ge=0)] = 0
    # Metadata
    formula_hint: Optional[str] = None


class FacilitatedEmissionResponse(BaseModel):
    engine_version: str
    methodology: str
    attribution_factor: float
    facilitated_emissions: float
    calculation_steps: Optional[List[str]] = None



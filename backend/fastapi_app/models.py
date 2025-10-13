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
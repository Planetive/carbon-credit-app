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


# Scenario Building Models
class PortfolioEntry(BaseModel):
    id: str
    company: str
    amount: float  # Exposure amount
    counterparty: str
    sector: str
    geography: str
    probability_of_default: float  # Baseline PD (%)
    loss_given_default: float  # Baseline LGD (%)
    tenor: int  # months


class ScenarioRequest(BaseModel):
    scenario_type: Literal["transition", "physical", "combined"]
    portfolio_entries: List[PortfolioEntry]


class ScenarioResult(BaseModel):
    company: str
    sector: str
    exposure: float
    baseline_pd: float
    baseline_lgd: float
    pd_multiplier: float
    adjusted_pd: float
    lgd_change: float
    adjusted_lgd: float
    climate_adjusted_expected_loss: float
    baseline_expected_loss: float
    loss_increase: float
    loss_increase_percentage: float


class ScenarioResponse(BaseModel):
    success: bool
    scenario_type: str
    total_exposure: float
    total_baseline_expected_loss: float
    total_climate_adjusted_expected_loss: float
    total_loss_increase: float
    total_loss_increase_percentage: float
    results: List[ScenarioResult]
    error: Optional[str] = None
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .models import (
    HealthResponse,
    FinanceEmissionRequest,
    FinanceEmissionResponse,
    FacilitatedEmissionRequest,
    FacilitatedEmissionResponse,
    ScenarioRequest,
    ScenarioResponse,
)
from .calculation_engine import CalculationEngine
from .scenario_engine import ScenarioEngine
from .database import test_connection, get_supabase_client
from .finance_models import CompanyType
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


app = FastAPI(title="Finance Emission Service", version="0.1.0")

# Allow local dev from typical ports; tighten in prod
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Bank portfolio management removed - keeping simple individual company approach

# Initialize the calculation engines
calculation_engine = CalculationEngine()
scenario_engine = ScenarioEngine()


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    # Test database connection
    db_status = "connected" if test_connection() else "disconnected"
    return HealthResponse(
        status="ok", 
        engine_version="1.0.0",
        database_status=db_status
    )


@app.get("/")
def root():
    """Simple root endpoint for testing"""
    return {"message": "FastAPI backend is running!", "status": "ok"}


@app.get("/test-db")
def test_database():
    """
    Test database connection endpoint
    Returns detailed connection status
    """
    try:
        client = get_supabase_client()
        # Test with a simple query
        result = client.table("profiles").select("id").limit(1).execute()
        
        return {
            "status": "success",
            "message": "Database connection successful",
            "tables_accessible": True,
            "sample_data_count": len(result.data) if result.data else 0
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Database connection failed: {str(e)}",
            "tables_accessible": False
        }


@app.post("/finance-emission", response_model=FinanceEmissionResponse)
def finance_emission(req: FinanceEmissionRequest) -> FinanceEmissionResponse:
    """
    Calculate financed emissions using PCAF methodology
    """
    try:
        logger.info(f"Calculating finance emission for formula: {req.formula_id}")
        
        # Convert company_type string to enum
        company_type = CompanyType.LISTED if req.company_type == "listed" else CompanyType.PRIVATE
        
        # Perform calculation
        result = calculation_engine.calculate(
            formula_id=req.formula_id,
            inputs=req.inputs,
            company_type=company_type
        )
        
        # Convert result to response format
        response = FinanceEmissionResponse(
            success=True,
            result=result,
            calculation_id=None  # TODO: Save to database and return ID
        )
        
        logger.info(f"Finance emission calculation completed successfully")
        return response
        
    except ValueError as e:
        logger.error(f"Validation error in finance emission calculation: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Internal error in finance emission calculation: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal calculation error")


@app.post("/facilitated-emission", response_model=FacilitatedEmissionResponse)
def facilitated_emission(req: FacilitatedEmissionRequest) -> FacilitatedEmissionResponse:
    """
    Calculate facilitated emissions using PCAF methodology
    """
    try:
        logger.info(f"Calculating facilitated emission for formula: {req.formula_id}")
        
        # Convert company_type string to enum
        company_type = CompanyType.LISTED if req.company_type == "listed" else CompanyType.PRIVATE
        
        # Perform calculation
        result = calculation_engine.calculate(
            formula_id=req.formula_id,
            inputs=req.inputs,
            company_type=company_type
        )
        
        # Convert result to response format
        response = FacilitatedEmissionResponse(
            success=True,
            result=result,
            calculation_id=None  # TODO: Save to database and return ID
        )
        
        logger.info(f"Facilitated emission calculation completed successfully")
        return response
        
    except ValueError as e:
        logger.error(f"Validation error in facilitated emission calculation: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Internal error in facilitated emission calculation: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal calculation error")


@app.post("/scenario/calculate", response_model=ScenarioResponse)
def calculate_scenario(req: ScenarioRequest) -> ScenarioResponse:
    """
    Calculate climate stress testing scenarios using sector-specific multipliers
    """
    try:
        logger.info(f"Calculating {req.scenario_type} scenario for {len(req.portfolio_entries)} portfolio entries")
        
        # Validate portfolio entries
        if not req.portfolio_entries:
            raise ValueError("Portfolio entries cannot be empty")
        
        # Perform scenario calculation
        result = scenario_engine.calculate_scenario(
            portfolio_entries=req.portfolio_entries,
            scenario_type=req.scenario_type
        )
        
        if not result.success:
            raise ValueError(result.error or "Scenario calculation failed")
        
        logger.info(f"Scenario calculation completed successfully. Total loss increase: {result.total_loss_increase_percentage:.2f}%")
        return result
        
    except ValueError as e:
        logger.error(f"Validation error in scenario calculation: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Internal error in scenario calculation: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal scenario calculation error")


# Local dev entrypoint: uvicorn backend.fastapi_app.main:app --reload


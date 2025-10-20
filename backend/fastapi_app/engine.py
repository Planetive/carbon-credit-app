from .models import (
    FinanceEmissionRequest,
    FinanceEmissionResponse,
    FacilitatedEmissionRequest,
    FacilitatedEmissionResponse,
)


class EngineError(Exception):
    pass


class CalculationEngine:
    version = "pcaf-engine-0.1.0"

    def calculate_finance(self, req: FinanceEmissionRequest) -> FinanceEmissionResponse:
        # NOTE: Placeholder logic to be replaced by ported JS formulas
        if req.company_type == "listed":
            market_cap = (req.share_price or 0) * (req.outstanding_shares or 0)
            denominator_value = market_cap + (req.total_debt or 0) + (req.minority_interest or 0) + (req.preferred_stock or 0)
            denominator_label = "EVIC"
        else:
            denominator_value = (req.total_equity or 0) + (req.total_debt or 0)
            denominator_label = "Total Equity + Debt"

        if denominator_value <= 0:
            raise EngineError("Denominator must be greater than 0")

        # Simplified attribution factor
        attribution_factor = (req.outstanding_amount or 0) / denominator_value

        # Choose activity/emissions
        emissions = (req.verified_emissions or 0) or (req.unverified_emissions or 0)
        if emissions == 0 and req.energy_consumption and req.emission_factor:
            emissions = req.energy_consumption * req.emission_factor

        financed_emissions = attribution_factor * emissions

        return FinanceEmissionResponse(
            engine_version=self.version,
            methodology="PCAF (placeholder)",
            attribution_factor=attribution_factor,
            financed_emissions=financed_emissions,
            denominator_label=denominator_label,
            denominator_value=denominator_value,
        )

    def calculate_facilitated(self, req: FacilitatedEmissionRequest) -> FacilitatedEmissionResponse:
        """
        DEPRECATED: This method is no longer used.
        Facilitated emission calculations now use the detailed formula configurations
        in facilitated_emission_configs.py through the main calculation engine.
        """
        raise EngineError("This method is deprecated. Use the main calculation engine with formula configurations instead.")



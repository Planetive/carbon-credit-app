import { describe, expect, it } from "vitest";
import { mapSspPreviewResponse } from "./mapSspPreviewResponse";
import { SSP_CALCULATE_AVAILABLE, canCalculateSsp, canSaveReportableSsp } from "./reportableGuard";

describe("Phase 6C.2 SSP preview response mapping", () => {
  it("keeps Calculate and reportable Save disabled", () => {
    expect(SSP_CALCULATE_AVAILABLE).toBe(false);
    expect(canCalculateSsp()).toBe(false);
    expect(canSaveReportableSsp()).toBe(false);
  });

  it("maps complete preview layers, scopes, DQ, and provenance", () => {
    const vm = mapSspPreviewResponse({
      status: "complete",
      financed_emissions: 1.0,
      scope_breakdown: { scope1: 0, scope2: 1, scope3: null },
      data_quality_score: 2,
      iaf: 0.25,
      taf: 1,
      pool_financed_emissions: 4,
      methodology_version: "PCAF-2025-PartA-5.8",
      pcaf_ref: "PCAF 2025 Part A §5.8",
      emissions_path: "lookthrough",
      is_reportable: false,
      include_in_portfolio: false,
      collateral: [
        {
          collateral_id: "c1",
          name: "House",
          absolute_total_tco2e: 10,
          data_quality_score: 2,
          method: "reported",
        },
      ],
      loans: [{ loan_id: "l1", financed_emissions_tco2e: 4, data_quality_score: 2 }],
      pools: [{ pool_id: "p1", path: "lookthrough", financed_emissions_tco2e: 4 }],
      tranches: [{ tranche_id: "t1", taf: 1, financed_emissions_tco2e: 4 }],
      holdings: [{ holding_id: "h1", iaf: 0.25, financed_emissions_tco2e: 1 }],
      notes: ["preview"],
      warnings: [],
    });

    expect(vm.financedEmissions).toBe(1);
    expect(vm.scopeBreakdown.scope2).toBe(1);
    expect(vm.scopeBreakdown.scope3).toBeNull();
    expect(vm.dataQualityScore).toBe(2);
    expect(vm.layers.loans[0].financedEmissions).toBe(4);
    expect(vm.layers.holdings[0].factor).toBe(0.25);
    expect(vm.factorProvenance.methodologyVersion).toContain("PCAF");
    expect(vm.factorProvenance.collateralMethods).toEqual(["reported"]);
    expect(vm.isReportable).toBe(false);
    expect(vm.includeInPortfolio).toBe(false);
    expect(vm.missingOrBlocked).toBe(false);
  });

  it("surfaces unsupported / incomplete without fabricating zeros", () => {
    const unsupported = mapSspPreviewResponse({
      status: "unsupported",
      code: "unsupported_pool_of_pools",
      message: "PoP deferred",
      financed_emissions: null,
    });
    expect(unsupported.financedEmissions).toBeNull();
    expect(unsupported.missingOrBlocked).toBe(true);
    expect(unsupported.code).toBe("unsupported_pool_of_pools");

    const incomplete = mapSspPreviewResponse({
      status: "incomplete",
      code: "missing_property_energy_factor",
      message: "Need EF",
    });
    expect(incomplete.financedEmissions).toBeNull();
    expect(incomplete.missingOrBlocked).toBe(true);
  });
});

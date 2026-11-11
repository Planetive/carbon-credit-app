import { describe, expect, it } from "vitest";
import { mapSspPreviewResponse } from "./mapSspPreviewResponse";
import { canPreviewCalculateSsp, sspPreviewCalculateBlockers } from "./previewGate";
import { SSP_CALCULATE_AVAILABLE, canCalculateSsp, canSaveReportableSsp } from "./reportableGuard";
import { createSspDraft, createCollateral, createLoan, createPool, createTranche, createHolding } from "./state";

describe("Phase 6C.2 SSP preview response mapping", () => {
  it("enables preview Calculate while keeping reportable Save off", () => {
    expect(SSP_CALCULATE_AVAILABLE).toBe(true);
    expect(canCalculateSsp()).toBe(true);
    expect(canSaveReportableSsp()).toBe(false);
  });

  it("blocks unsupported multi-pool / PoP before calling the API", () => {
    const c1 = createCollateral({
      name: "House",
      collateralType: "mortgage",
      attributionDenominator: 100,
    });
    const loan = createLoan({
      name: "L1",
      collateralIds: [c1.collateralId],
      currentOutstandingAmount: 40,
    });
    const poolA = createPool({ name: "P1", loanIds: [loan.loanId] });
    const poolB = createPool({ name: "P2", loanIds: [loan.loanId] });
    const tranche = createTranche({ name: "Senior", currentOutstandingAmount: 40 });
    const holding = createHolding({
      name: "Bank",
      trancheId: tranche.trancheId,
      bankOutstandingInvestment: 10,
    });
    const draft = createSspDraft("securitization-structured-products#1");
    draft.eligibility = {
      ...draft.eligibility,
      isStructuredProduct: "yes",
      underlyingIdentifiable: "yes",
      structureFamily: "true-sale",
      collateralFamily: "residential-real-estate",
      hasAssetLevelEmissionsForOtherHard: "",
      isGssCollateralBond: "no",
      isGssStandardBondForOriginatorProjects: "no",
      collateralRemainsWithOriginator: "no",
      hasTranches: "yes",
      hasPoolOfPools: "no",
      poolsLinkedToSpecificTranches: "no",
    };
    draft.deal = {
      ...draft.deal,
      dealName: "Gate",
      structureType: "rmbs",
      reportingYear: "2024",
      documentationSource: "Trustee",
      hasTranches: "yes",
      hasPoolOfPools: "no",
      collateralRemainsWithOriginator: "no",
      poolsLinkedToSpecificTranches: "no",
    };
    draft.emissionsPath = "lookthrough";
    draft.collateral = [c1];
    draft.loans = [loan];
    draft.pools = [poolA, poolB];
    draft.tranches = [tranche];
    draft.holdings = [holding];
    expect(canPreviewCalculateSsp(draft)).toBe(false);
    expect(sspPreviewCalculateBlockers(draft).some((b) => /single pool|one pool/i.test(b))).toBe(true);
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

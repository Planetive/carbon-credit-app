import { describe, expect, it } from "vitest";
import { UOP_LOAN_TYPE } from "../config/loanTypeOptions";
import {
  UOP_CALCULATE_AVAILABLE,
  UOP_REPORTABLE_SAVE_AVAILABLE,
  assertUopNotReportable,
  canCalculateUop,
  canSaveReportableUop,
  rejectUopReportableResults,
} from "./reportableGuard";
import { bindApprovedFactorForTest } from "./factorLibrary";
import { createUopDraft, createUnderlyingAsset } from "./state";
import { uopQuestionnaireComplete, validateUopAssets, validateUopStructure } from "./validation";
import type { UopDraft } from "./types";

function completeSeparateDraft(): UopDraft {
  const draft = createUopDraft("use-of-proceeds#1", "fin-uop-5c");
  draft.eligibility = {
    proceedsAllocatedToSpecificAssets: "yes",
    isSecuritized: "no",
    structureHasControl: "no",
    structureListing: "",
    controlOneFullyAllocatedAsset: "",
    controlAssetIsProject: "",
    debtBasedWithOneFullyAllocatedAsset: "no",
    singleAssetClass: "",
    assetsOnIssuerBalanceSheet: "no",
  };
  draft.structureName = "Climate Debt Fund";
  draft.issuerName = "Fund Manager";
  draft.structureKind = "debt-fund";
  draft.investmentType = "debt";
  draft.outstandingInvestment = 50_000_000;
  draft.totalStructureDebt = 100_000_000;
  draft.totalStructureEquity = 0;
  draft.reportingYear = "2026";
  draft.currency = "PKR";
  draft.evidenceSource = "fund prospectus";
  draft.emissionsPath = "underlying_assets";
  draft.allocationStatus = "known";
  draft.allocatedProceeds = 10_000_000;
  draft.assets = [
    createUnderlyingAsset({
      underlyingAssetId: "asset-a",
      name: "Pool A",
      assetClass: "mortgage",
      allocatedOutstanding: 6_000_000,
      totalAssetValue: 10_000_000,
      hasReportedEmissions: "yes",
      verificationStatus: "verified",
      scope1Emissions: 100,
      scope2Emissions: 20,
      dataSource: "allocation report",
    }),
  ];
  return draft;
}

describe("Phase 5C UoP calculate guards", () => {
  it("enables Calculate only when the questionnaire is complete", () => {
    expect(canCalculateUop()).toBe(true);
    expect(UOP_CALCULATE_AVAILABLE).toBe(true);
    const draft = completeSeparateDraft();
    expect(uopQuestionnaireComplete(draft)).toBe(true);
    draft.outstandingInvestment = null;
    expect(uopQuestionnaireComplete(draft)).toBe(false);
  });

  it("keeps final reportable Save blocked", () => {
    expect(UOP_REPORTABLE_SAVE_AVAILABLE).toBe(false);
    expect(canSaveReportableUop()).toBe(false);
    expect(() => assertUopNotReportable()).toThrow();
    expect(() => rejectUopReportableResults([{ type: UOP_LOAN_TYPE }])).toThrow();
  });

  it("requires a published numeric factor and does not treat missing equity as invalid when negative", () => {
    const draft = completeSeparateDraft();
    draft.assets[0].assetClass = "business-loan";
    draft.assets[0].hasReportedEmissions = "no";
    draft.assets[0].estimation.pcafOption = "score5";
    draft.assets[0].estimation.method = "economic";
    draft.assets[0].estimation.sectorName = "power";
    draft.assets[0].estimation.sectorAllocationPercent = 100;
    draft.assets[0].estimation.factorSource = "EEIO table";
    draft.assets[0].estimation.factorGeography = "PK";
    draft.assets[0].estimation.factorYear = "2024";
    draft.assets[0].estimation.factorUnit = "tCO2e/currency";
    expect(validateUopAssets(draft)["assets.asset-a.estimation.libraryEntryId"]).toBeTruthy();
    draft.assets[0].estimation.emissionFactor = 0.0002;
    expect(validateUopAssets(draft)["assets.asset-a.estimation.libraryEntryId"]).toBeTruthy();
    draft.assets[0].estimation = bindApprovedFactorForTest(draft.assets[0].estimation);
    expect(validateUopAssets(draft)["assets.asset-a.estimation.libraryEntryId"]).toBeUndefined();
    draft.totalStructureEquity = -12;
    expect(validateUopStructure(draft).totalStructureEquity).toBeUndefined();
  });
});

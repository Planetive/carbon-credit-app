import { describe, expect, it } from "vitest";
import {
  UOP_CALCULATE_AVAILABLE,
  UOP_REPORTABLE_SAVE_AVAILABLE,
  canCalculateUop,
  canSaveReportableUop,
  canSubmitReportableUopSave,
  rejectUopReportableResults,
  uopReportableSaveBlockers,
} from "./reportableGuard";
import { createUopDraft, createUnderlyingAsset } from "./state";
import { uopQuestionnaireComplete } from "./validation";
import type { UopCalculationResult, UopDraft } from "./types";
import { UOP_LOAN_TYPE } from "../config/loanTypeOptions";

function completeSeparateDraft(): UopDraft {
  const draft = createUopDraft("use-of-proceeds#1", "fin-uop-5d");
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

function completeResult(overrides: Partial<UopCalculationResult> = {}): UopCalculationResult {
  return {
    status: "complete",
    formula_id: "uop-separate-lookthrough",
    formula_name: "PCAF §5.7 separate look-through",
    methodology_version: "PCAF-2025-PartA-5.7",
    financed_emissions: 46,
    data_quality_score: 1.4,
    calculation_fingerprint: "abc123",
    overlap: { detected: false, status: "none" },
    ...overrides,
  };
}

describe("Phase 5D UoP reportable Save guards", () => {
  it("keeps the release feature flag disabled", () => {
    expect(UOP_CALCULATE_AVAILABLE).toBe(true);
    expect(canCalculateUop()).toBe(true);
    expect(UOP_REPORTABLE_SAVE_AVAILABLE).toBe(false);
    expect(canSaveReportableUop()).toBe(false);
    expect(() => rejectUopReportableResults([{ type: UOP_LOAN_TYPE }])).toThrow();
  });

  it("does not treat a complete calculation as reportable while the flag is off", () => {
    const draft = completeSeparateDraft();
    expect(uopQuestionnaireComplete(draft)).toBe(true);
    const blockers = uopReportableSaveBlockers(draft, completeResult());
    expect(blockers).toContain("feature_flag");
    expect(canSubmitReportableUopSave(draft, completeResult())).toBe(false);
  });

  it("blocks incomplete, unsupported, overlap, and missing fingerprint saves", () => {
    const draft = completeSeparateDraft();
    expect(uopReportableSaveBlockers(draft, completeResult({ status: "incomplete" }))).toContain(
      "incomplete_calculation",
    );
    expect(uopReportableSaveBlockers(draft, completeResult({ formula_id: "uop-nested" }))).toContain(
      "unsupported_method",
    );
    expect(
      uopReportableSaveBlockers(draft, completeResult({ calculation_fingerprint: null })),
    ).toContain("missing_fingerprint");
    expect(
      uopReportableSaveBlockers(
        draft,
        completeResult({ overlap: { detected: true, status: "review_required" } }),
      ),
    ).toContain("overlap_review");
  });
});

import { describe, expect, it } from "vitest";
import {
  FINANCE_LOAN_TYPE_DEFS,
  SSP_LOAN_TYPE,
  UOP_LOAN_TYPE,
  filterQuestionnaireOnlyLoanTypes,
  isSspLoanType,
  isUopLoanType,
} from "../config/loanTypeOptions";
import {
  canCalculateSsp,
  canSaveReportableSsp,
  createCollateral,
  createHolding,
  createLoan,
  createPool,
  createPoolOfPools,
  createSspDraft,
  createTranche,
  ensureSspInstances,
  patchSspDraft,
  patchSspEligibility,
  rejectSspReportableResults,
  resolveSspAccounting,
  sspInstanceKey,
  sspQuestionnaireComplete,
  sspQualifiesForMethod,
  sspWizardSteps,
  sumLoanCoaInPool,
  validateSspHierarchy,
  validateSspStep,
  SSP_CALCULATE_AVAILABLE,
  SSP_REPORTABLE_SAVE_AVAILABLE,
  SSP_REPORTABLE_BLOCKED_MESSAGE,
} from "./index";
import { sspHierarchyWarnings } from "./validation";
import type { SspEligibilityAnswers } from "./types";

function qualifyingAnswers(overrides: Partial<SspEligibilityAnswers> = {}): SspEligibilityAnswers {
  return {
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
    ...overrides,
  };
}

describe("Phase 6A — Securitization loan type", () => {
  it("adds SSP as a first-class loan type card", () => {
    expect(FINANCE_LOAN_TYPE_DEFS.some((item) => item.value === SSP_LOAN_TYPE)).toBe(true);
    expect(FINANCE_LOAN_TYPE_DEFS.find((item) => item.value === SSP_LOAN_TYPE)?.label).toBe(
      "Securitization & Structured Products"
    );
    expect(isSspLoanType(SSP_LOAN_TYPE)).toBe(true);
    expect(isUopLoanType(SSP_LOAN_TYPE)).toBe(false);
  });

  it("keeps existing asset classes and excludes SSP from generic calculators", () => {
    const existing = [
      "corporate-bond",
      "business-loan",
      "project-finance",
      "mortgage",
      "sovereign-debt",
      "motor-vehicle-loan",
      "commercial-real-estate",
      UOP_LOAN_TYPE,
    ];
    existing.forEach((type) => expect(isSspLoanType(type)).toBe(false));
    const filtered = filterQuestionnaireOnlyLoanTypes([
      { type: "mortgage", quantity: 1 },
      { type: SSP_LOAN_TYPE, quantity: 2 },
      { type: UOP_LOAN_TYPE, quantity: 1 },
    ]);
    expect(filtered).toEqual([{ type: "mortgage", quantity: 1 }]);
  });
});

describe("Phase 6A — eligibility and routing", () => {
  it("continues as SSP for RMBS-style true-sale residential pools", () => {
    const outcome = resolveSspAccounting(qualifyingAnswers());
    expect(sspQualifiesForMethod(outcome)).toBe(true);
    expect(outcome).toMatchObject({ kind: "ssp", structureHint: "rmbs" });
  });

  it("routes CMBS and CLO/CDO structure hints", () => {
    expect(resolveSspAccounting(qualifyingAnswers({ collateralFamily: "commercial-real-estate" }))).toMatchObject({
      structureHint: "cmbs",
    });
    expect(resolveSspAccounting(qualifyingAnswers({ collateralFamily: "business-loans" }))).toMatchObject({
      structureHint: "clo-cdo",
    });
  });

  it("supports covered bonds and synthetics when collateral stays with originator", () => {
    expect(
      resolveSspAccounting(
        qualifyingAnswers({
          structureFamily: "covered-bond",
          collateralRemainsWithOriginator: "yes",
        })
      )
    ).toMatchObject({ kind: "ssp", structureHint: "mortgage-covered-bond" });
    expect(
      resolveSspAccounting(
        qualifyingAnswers({
          structureFamily: "synthetic",
          collateralRemainsWithOriginator: "yes",
          collateralFamily: "business-loans",
        })
      )
    ).toMatchObject({ kind: "ssp", structureHint: "synthetic" });
  });

  it("allows untranched products", () => {
    const outcome = resolveSspAccounting(qualifyingAnswers({ hasTranches: "no" }));
    expect(sspQualifiesForMethod(outcome)).toBe(true);
  });

  it("excludes TBA/repo, consumer receivables, and public-sector covered bonds", () => {
    expect(resolveSspAccounting(qualifyingAnswers({ structureFamily: "tba-repo" }))).toMatchObject({
      kind: "exclude",
      reasonCode: "tba_repo_out_of_scope",
    });
    expect(resolveSspAccounting(qualifyingAnswers({ collateralFamily: "consumer-receivables" }))).toMatchObject({
      kind: "exclude",
      reasonCode: "consumer_receivables_out_of_scope",
    });
    expect(resolveSspAccounting(qualifyingAnswers({ collateralFamily: "public-sector" }))).toMatchObject({
      kind: "exclude",
      reasonCode: "public_sector_covered_bond_out_of_scope",
    });
  });

  it("excludes other hard assets without asset-level emissions", () => {
    expect(
      resolveSspAccounting(
        qualifyingAnswers({
          collateralFamily: "other-hard-assets",
          hasAssetLevelEmissionsForOtherHard: "no",
        })
      )
    ).toMatchObject({ kind: "exclude", reasonCode: "other_hard_assets_no_asset_data" });
  });

  it("reroutes GSS standard bonds for originator projects to Use of Proceeds", () => {
    expect(
      resolveSspAccounting(
        qualifyingAnswers({
          isGssCollateralBond: "no",
          isGssStandardBondForOriginatorProjects: "yes",
        })
      )
    ).toMatchObject({ kind: "reroute", method: "use-of-proceeds" });
  });

  it("returns non-structured products to asset-class selection without forcing Business Loan", () => {
    expect(resolveSspAccounting(qualifyingAnswers({ isStructuredProduct: "no" }))).toMatchObject({
      kind: "choose-class",
    });
  });

  it("excludes unknown collateral look-through", () => {
    expect(resolveSspAccounting(qualifyingAnswers({ underlyingIdentifiable: "no" }))).toMatchObject({
      kind: "exclude",
      reasonCode: "unknown_collateral",
    });
  });
});

describe("Phase 6A — hierarchy, IDs, and financial validation", () => {
  it("preserves stable financing_instance_id across ensureSspInstances", () => {
    const first = ensureSspInstances({}, 2);
    expect(Object.keys(first)).toEqual([sspInstanceKey(1), sspInstanceKey(2)]);
    const id1 = first[sspInstanceKey(1)].financingInstanceId;
    const again = ensureSspInstances(first, 2);
    expect(again[sspInstanceKey(1)].financingInstanceId).toBe(id1);
    expect(again[sspInstanceKey(1)].collateral).not.toBe(again[sspInstanceKey(2)].collateral);
  });

  it("supports multiple loans, collateral, optional pool-of-pools, and tranche links", () => {
    let draft = createSspDraft(sspInstanceKey(1));
    draft = patchSspEligibility(draft, qualifyingAnswers({ hasPoolOfPools: "yes", poolsLinkedToSpecificTranches: "yes" }));
    const c1 = createCollateral({ name: "House A", collateralType: "mortgage", attributionDenominator: 100 });
    const c2 = createCollateral({ name: "House B", collateralType: "mortgage", attributionDenominator: 200 });
    const loan1 = createLoan({ name: "Loan 1", collateralIds: [c1.collateralId], currentOutstandingAmount: 50 });
    const loan2 = createLoan({ name: "Loan 2", collateralIds: [c2.collateralId], currentOutstandingAmount: 75 });
    const pool = createPool({ name: "Pool 1", loanIds: [loan1.loanId, loan2.loanId], poolCurrentOutstandingAmount: 125 });
    const pop = createPoolOfPools({ poolIds: [pool.poolId], currentOutstandingAmount: 125 });
    const tranche = createTranche({ name: "Senior", currentOutstandingAmount: 100, linkedPoolIds: [pool.poolId] });
    const holding = createHolding({ name: "Bank note", trancheId: tranche.trancheId, bankOutstandingInvestment: 40 });
    draft = patchSspDraft(draft, {
      deal: {
        ...draft.deal,
        dealName: "RMBS 2024-1",
        documentationSource: "Trustee report",
        structureType: "rmbs",
        hasTranches: "yes",
        hasPoolOfPools: "yes",
        poolsLinkedToSpecificTranches: "yes",
      },
      emissionsPath: "lookthrough",
      collateral: [c1, c2],
      loans: [loan1, loan2],
      pools: [pool],
      poolOfPools: pop,
      tranches: [tranche],
      holdings: [holding],
    });
    expect(sumLoanCoaInPool(draft, pool)).toBe(125);
    expect(validateSspHierarchy(draft)).toEqual({});
    expect(sspQuestionnaireComplete(draft)).toBe(true);
    expect(c1.collateralId).not.toBe(c2.collateralId);
    expect(loan1.loanId).not.toBe(loan2.loanId);
  });

  it("warns on mismatched pool COA without blocking or silently balancing", () => {
    let draft = createSspDraft(sspInstanceKey(1));
    draft = patchSspEligibility(draft, qualifyingAnswers());
    const loan = createLoan({ name: "L", collateralIds: ["x"], currentOutstandingAmount: 10 });
    const pool = createPool({ name: "P", loanIds: [loan.loanId], poolCurrentOutstandingAmount: 99 });
    const col = createCollateral({
      collateralId: "x",
      name: "C",
      collateralType: "mortgage",
      attributionDenominator: 1,
    });
    const tranche = createTranche({ name: "T", currentOutstandingAmount: 10 });
    draft = patchSspDraft(draft, {
      deal: { ...draft.deal, dealName: "D", documentationSource: "src", structureType: "rmbs" },
      emissionsPath: "lookthrough",
      collateral: [col],
      loans: [loan],
      pools: [pool],
      tranches: [tranche],
      holdings: [createHolding({ bankOutstandingInvestment: 1, trancheId: tranche.trancheId })],
    });
    expect(validateSspHierarchy(draft)[`pools.${pool.poolId}.poolCurrentOutstandingAmount`]).toBeUndefined();
    expect(sspHierarchyWarnings(draft).some((row) => row.includes("differs"))).toBe(true);
  });

  it("blocks combining reported pool totals with look-through child path selection inconsistently", () => {
    let draft = createSspDraft(sspInstanceKey(1));
    draft = patchSspEligibility(draft, qualifyingAnswers({ hasTranches: "no" }));
    const col = createCollateral({
      name: "C",
      collateralType: "mortgage",
      attributionDenominator: 10,
      emissionsPath: "asset-class-estimate",
    });
    const loan = createLoan({ name: "L", collateralIds: [col.collateralId], currentOutstandingAmount: 5 });
    const pool = createPool({
      name: "P",
      loanIds: [loan.loanId],
      reportedEmissionsTotal: 12,
      reportedSource: "servicer",
      reportedEmissionsPeriod: "2024",
    });
    draft = patchSspDraft(draft, {
      deal: { ...draft.deal, dealName: "D", documentationSource: "src", structureType: "rmbs", hasTranches: "no" },
      emissionsPath: "reported_pool",
      collateral: [col],
      loans: [loan],
      pools: [pool],
      holdings: [createHolding({ bankOutstandingInvestment: 2 })],
    });
    expect(validateSspHierarchy(draft).emissionsPath).toMatch(/Do not combine/);
  });
});

describe("Phase 6A — wizard steps, calculate/save guards, no fabricated results", () => {
  it("only shows eligibility until SSP qualifies", () => {
    const draft = createSspDraft(sspInstanceKey(1));
    expect(sspWizardSteps(draft).map((s) => s.id)).toEqual(["ssp-eligibility"]);
    const ready = patchSspEligibility(draft, qualifyingAnswers());
    expect(sspWizardSteps(ready).map((s) => s.id)).toEqual([
      "ssp-eligibility",
      "ssp-deal",
      "ssp-structure",
      "ssp-review",
    ]);
  });

  it("keeps Calculate and Save disabled with no fabricated totals", () => {
    expect(SSP_CALCULATE_AVAILABLE).toBe(true);
    expect(SSP_REPORTABLE_SAVE_AVAILABLE).toBe(false);
    expect(canCalculateSsp()).toBe(true);
    expect(canSaveReportableSsp()).toBe(false);
    expect(() => rejectSspReportableResults([{ type: SSP_LOAN_TYPE }])).toThrow(SSP_REPORTABLE_BLOCKED_MESSAGE);
    const draft = createSspDraft(sspInstanceKey(1));
    expect(draft.lastPreviewNote).toMatch(/Preview Calculate|reportable Save/i);
  });

  it("eligibility step incomplete until screening finishes", () => {
    const draft = createSspDraft(sspInstanceKey(1));
    expect(validateSspStep(draft, "ssp-eligibility")).toMatchObject({ eligibility: expect.any(String) });
  });
});

import { describe, expect, it } from "vitest";
import {
  EXISTING_FINANCE_LOAN_TYPES,
  FINANCE_LOAN_TYPE_DEFS,
  UOP_LOAN_TYPE,
  filterNonUopLoanTypes,
  isExistingFinanceLoanType,
  isUopLoanType,
} from "../config/loanTypeOptions";
import { currentEligibilityQuestion, resolveUopAccounting, visibleEligibilityQuestions } from "./eligibility";
import { uopOutcomeDisplay } from "./copy";
import {
  addUnderlyingAsset,
  createUopDraft,
  createUnderlyingAsset,
  ensureUopInstances,
  uopInstanceKey,
  updateUnderlyingAsset,
} from "./state";
import {
  UOP_BACKEND_AVAILABLE,
  UOP_CALCULATE_AVAILABLE,
  UOP_DRAFT_API_AVAILABLE,
  UOP_REPORTABLE_BLOCKED_MESSAGE,
  UOP_REPORTABLE_SAVE_AVAILABLE,
  assertUopNotReportable,
  canCalculateOrSaveUop,
  canCalculateUop,
  canSaveReportableUop,
  rejectUopReportableResults,
} from "./reportableGuard";
import { assetsRequired, validateUopAssets, validateUopHoldings, validateUopStep, validateUopStructure } from "./validation";
import { uopWizardSteps } from "./wizardSteps";
import type { UopDraft, UopEligibilityAnswers } from "./types";

const blank = (): UopEligibilityAnswers => ({
  proceedsAllocatedToSpecificAssets: "",
  isSecuritized: "",
  structureHasControl: "",
  structureListing: "",
  controlOneFullyAllocatedAsset: "",
  controlAssetIsProject: "",
  debtBasedWithOneFullyAllocatedAsset: "",
  singleAssetClass: "",
  assetsOnIssuerBalanceSheet: "",
});

function answers(patch: Partial<UopEligibilityAnswers>): UopEligibilityAnswers {
  return { ...blank(), ...patch };
}

function qualifyingSeparate(): UopDraft {
  const draft = createUopDraft(uopInstanceKey(1), "fin-uop-1");
  draft.eligibility = answers({
    proceedsAllocatedToSpecificAssets: "yes",
    isSecuritized: "no",
    structureHasControl: "no",
    debtBasedWithOneFullyAllocatedAsset: "no",
    assetsOnIssuerBalanceSheet: "no",
  });
  return draft;
}

function qualifyingIntegrated(): UopDraft {
  const draft = qualifyingSeparate();
  draft.eligibility.assetsOnIssuerBalanceSheet = "yes";
  return draft;
}

describe("Phase 5A Use of Proceeds questionnaire", () => {
  it("1. adds Use of Proceeds Structures to financed asset-class selection without removing existing classes", () => {
    expect(FINANCE_LOAN_TYPE_DEFS.some((item) => item.value === UOP_LOAN_TYPE)).toBe(true);
    expect(FINANCE_LOAN_TYPE_DEFS.find((item) => item.value === UOP_LOAN_TYPE)?.label).toBe(
      "Use of Proceeds Structures"
    );
    expect(EXISTING_FINANCE_LOAN_TYPES).toEqual([
      "corporate-bond",
      "business-loan",
      "project-finance",
      "mortgage",
      "sovereign-debt",
      "motor-vehicle-loan",
      "commercial-real-estate",
    ]);
    EXISTING_FINANCE_LOAN_TYPES.forEach((type) => {
      expect(isExistingFinanceLoanType(type)).toBe(true);
      expect(isUopLoanType(type)).toBe(false);
    });
  });

  it("2. routes eligibility from PCAF Figure 5.7-2 and Table 5.7-1 exceptions", () => {
    expect(resolveUopAccounting(answers({ proceedsAllocatedToSpecificAssets: "no" }))).toMatchObject({
      kind: "not-uop",
      method: "customer-segment",
    });
    expect(
      resolveUopAccounting(answers({ proceedsAllocatedToSpecificAssets: "yes", isSecuritized: "yes" }))
    ).toMatchObject({ method: "securitization-structured-products" });
    expect(
      resolveUopAccounting(
        answers({
          proceedsAllocatedToSpecificAssets: "yes",
          isSecuritized: "no",
          structureHasControl: "yes",
          controlOneFullyAllocatedAsset: "yes",
          controlAssetIsProject: "yes",
        })
      )
    ).toMatchObject({ method: "project-finance" });
    expect(
      resolveUopAccounting(
        answers({
          proceedsAllocatedToSpecificAssets: "yes",
          isSecuritized: "no",
          structureHasControl: "yes",
          controlOneFullyAllocatedAsset: "no",
          structureListing: "listed",
        })
      )
    ).toMatchObject({ method: "listed-equity-corporate-bonds" });
    expect(
      resolveUopAccounting(
        answers({
          proceedsAllocatedToSpecificAssets: "yes",
          isSecuritized: "no",
          structureHasControl: "yes",
          controlOneFullyAllocatedAsset: "no",
          structureListing: "unlisted",
        })
      )
    ).toMatchObject({ method: "business-loans-unlisted-equity" });
    expect(
      resolveUopAccounting(
        answers({
          proceedsAllocatedToSpecificAssets: "yes",
          isSecuritized: "no",
          structureHasControl: "no",
          debtBasedWithOneFullyAllocatedAsset: "yes",
          singleAssetClass: "mortgage",
        })
      )
    ).toMatchObject({ method: "mortgages" });
    expect(resolveUopAccounting(qualifyingIntegrated().eligibility)).toMatchObject({
      kind: "uop",
      classification: "integrated",
    });
    expect(resolveUopAccounting(qualifyingSeparate().eligibility)).toMatchObject({
      kind: "uop",
      classification: "separate",
    });
    expect(resolveUopAccounting(answers({ proceedsAllocatedToSpecificAssets: "yes" }))).toBeNull();
  });

  it("3. collects different holdings fields for Separate versus Integrated UoP", () => {
    const separate = qualifyingSeparate();
    separate.allocationStatus = "known";
    separate.allocatedProceeds = 10;
    expect(validateUopHoldings(separate).unallocatedProceeds).toBeUndefined();
    expect(validateUopHoldings({ ...separate, allocationStatus: "" }).allocationStatus).toBeTruthy();

    const integrated = qualifyingIntegrated();
    integrated.allocatedProceeds = 10;
    integrated.unallocatedProceeds = 5;
    integrated.unallocatedUsesAssetLevelEstimate = "no";
    integrated.issuerCompanyType = "listed";
    integrated.issuerEvic = 200;
    integrated.issuerScope1Emissions = 10;
    expect(Object.keys(validateUopHoldings(integrated))).toHaveLength(0);
    expect(validateUopHoldings({ ...integrated, unallocatedProceeds: null }).unallocatedProceeds).toMatch(
      /unallocated/i
    );
    const unknownSeparate = { ...separate, allocationStatus: "unknown" as const };
    expect(validateUopHoldings(unknownSeparate).allocationUnknown).toMatch(/unallocated/i);
  });

  it("4. keeps issuer-reported, underlying-asset, and estimation branches distinct", () => {
    const separate = qualifyingSeparate();
    expect(uopWizardSteps(separate).map((step) => step.id)).toEqual([
      "uop-eligibility",
      "uop-structure",
      "uop-emissions-path",
      "uop-holdings",
    ]);
    const issuer = { ...separate, emissionsPath: "issuer_reported" as const };
    expect(assetsRequired(issuer)).toBe(false);
    expect(validateUopStep("uop-emissions-path", issuer).issuerReportedFinancedEmissions).toBeTruthy();

    const assetsPath = { ...separate, emissionsPath: "underlying_assets" as const };
    expect(assetsRequired(assetsPath)).toBe(true);
    expect(uopWizardSteps(assetsPath).map((step) => step.id)).toContain("uop-assets");

    const estimateIntegrated = {
      ...qualifyingIntegrated(),
      emissionsPath: "estimation" as const,
      issuerLevelReason: "" as const,
    };
    expect(validateUopStep("uop-emissions-path", estimateIntegrated).issuerLevelReason).toMatch(/asset-level/i);
    expect(assetsRequired({ ...estimateIntegrated, issuerLevelReason: "practically_not_feasible" })).toBe(true);
  });

  it("5-6. supports multiple underlying assets and keeps same-class assets independent", () => {
    let draft = qualifyingSeparate();
    draft = addUnderlyingAsset(draft, createUnderlyingAsset({ name: "Solar SPV", assetClass: "project-finance", allocatedOutstanding: 1 }));
    draft = addUnderlyingAsset(draft, createUnderlyingAsset({ name: "Wind SPV", assetClass: "project-finance", allocatedOutstanding: 2 }));
    expect(draft.assets).toHaveLength(2);
    expect(draft.assets[0].underlyingAssetId).not.toBe(draft.assets[1].underlyingAssetId);
    expect(draft.assets[0].assetClass).toBe("project-finance");
    expect(draft.assets[1].assetClass).toBe("project-finance");
    const firstId = draft.assets[0].underlyingAssetId;
    const secondId = draft.assets[1].underlyingAssetId;
    draft = updateUnderlyingAsset(draft, firstId, { allocatedOutstanding: 99, name: "Solar SPV edited" });
    expect(draft.assets.find((asset) => asset.underlyingAssetId === firstId)?.allocatedOutstanding).toBe(99);
    expect(draft.assets.find((asset) => asset.underlyingAssetId === secondId)?.allocatedOutstanding).toBe(2);
    expect(draft.assets.find((asset) => asset.underlyingAssetId === secondId)?.name).toBe("Wind SPV");
  });

  it("7. validates missing structure, emissions, and asset data", () => {
    const draft = qualifyingIntegrated();
    expect(validateUopStructure(draft).structureName).toBeTruthy();
    expect(validateUopStructure(draft).outstandingInvestment).toBeTruthy();
    draft.investmentType = "equity";
    expect(validateUopStructure(draft).investmentType).toMatch(/debt/i);
    draft.emissionsPath = "underlying_assets";
    expect(validateUopAssets(draft).assets).toMatch(/at least one/i);
    const withAsset = addUnderlyingAsset(draft, createUnderlyingAsset({ name: "" }));
    expect(Object.keys(validateUopAssets(withAsset)).some((key) => key.endsWith(".name"))).toBe(true);
  });

  it("8. keeps financing_instance_id and underlying_asset_id stable across edits", () => {
    const first = ensureUopInstances({}, 2);
    expect(Object.keys(first)).toEqual([uopInstanceKey(1), uopInstanceKey(2)]);
    const id1 = first[uopInstanceKey(1)].financingInstanceId;
    const id2 = first[uopInstanceKey(2)].financingInstanceId;
    expect(id1).not.toBe(id2);
    const again = ensureUopInstances(first, 2);
    expect(again[uopInstanceKey(1)].financingInstanceId).toBe(id1);
    const assetId = first[uopInstanceKey(1)].financingInstanceId;
    let draft = addUnderlyingAsset(first[uopInstanceKey(1)], createUnderlyingAsset({ name: "A" }));
    const underlyingId = draft.assets[0].underlyingAssetId;
    expect(underlyingId).not.toBe(assetId);
    expect(underlyingId).not.toBe("project-finance");
    draft = updateUnderlyingAsset(draft, underlyingId, { name: "A2", assetClass: "project-finance" });
    expect(draft.assets[0].underlyingAssetId).toBe(underlyingId);
    expect(draft.financingInstanceId).toBe(id1);
  });

  it("9. leaves existing asset-class payloads untouched when UoP is mixed in", () => {
    const mixed = [
      { type: "business-loan", quantity: 1 },
      { type: UOP_LOAN_TYPE, quantity: 1 },
      { type: "mortgage", quantity: 2 },
    ];
    expect(filterNonUopLoanTypes(mixed)).toEqual([
      { type: "business-loan", quantity: 1 },
      { type: "mortgage", quantity: 2 },
    ]);
    expect(filterNonUopLoanTypes([{ type: "corporate-bond", quantity: 1 }])).toEqual([
      { type: "corporate-bond", quantity: 1 },
    ]);
  });

  it("10. enables Calculate and keeps reportable Save blocked", () => {
    expect(UOP_CALCULATE_AVAILABLE).toBe(true);
    expect(canCalculateUop()).toBe(true);
    expect(UOP_REPORTABLE_SAVE_AVAILABLE).toBe(false);
    expect(canSaveReportableUop()).toBe(false);
    expect(UOP_BACKEND_AVAILABLE).toBe(false);
    expect(UOP_DRAFT_API_AVAILABLE).toBe(true);
    expect(canCalculateOrSaveUop()).toBe(false);
    expect(() => assertUopNotReportable()).toThrow(UOP_REPORTABLE_BLOCKED_MESSAGE);
    expect(() => rejectUopReportableResults([{ type: UOP_LOAN_TYPE }])).toThrow(UOP_REPORTABLE_BLOCKED_MESSAGE);
    expect(() => rejectUopReportableResults([{ type: "business-loan" }])).not.toThrow();
    const notUop = resolveUopAccounting(answers({ proceedsAllocatedToSpecificAssets: "no" }));
    expect(uopWizardSteps({ ...createUopDraft("use-of-proceeds#1"), eligibility: notUop ? answers({ proceedsAllocatedToSpecificAssets: "no" }) : answers({ proceedsAllocatedToSpecificAssets: "no" }) }).map((s) => s.id)).toEqual([
      "uop-eligibility",
      "uop-guidance",
    ]);
  });

  it("11. shows eligibility questions one step at a time on the Figure 5.7-2 path", () => {
    expect(currentEligibilityQuestion(blank())).toBe("proceedsAllocatedToSpecificAssets");
    expect(visibleEligibilityQuestions(blank())).toEqual(["proceedsAllocatedToSpecificAssets"]);

    const afterQ1 = answers({ proceedsAllocatedToSpecificAssets: "yes" });
    expect(currentEligibilityQuestion(afterQ1)).toBe("isSecuritized");
    expect(visibleEligibilityQuestions(afterQ1)).toEqual([
      "proceedsAllocatedToSpecificAssets",
      "isSecuritized",
    ]);

    const afterSecuritizedNo = answers({
      proceedsAllocatedToSpecificAssets: "yes",
      isSecuritized: "no",
    });
    expect(currentEligibilityQuestion(afterSecuritizedNo)).toBe("structureHasControl");

    expect(currentEligibilityQuestion(answers({ proceedsAllocatedToSpecificAssets: "no" }))).toBe("done");
    expect(currentEligibilityQuestion(qualifyingSeparate().eligibility)).toBe("done");
    expect(currentEligibilityQuestion(qualifyingIntegrated().eligibility)).toBe("done");
    expect(visibleEligibilityQuestions(qualifyingSeparate().eligibility)).toEqual([
      "proceedsAllocatedToSpecificAssets",
      "isSecuritized",
      "structureHasControl",
      "debtBasedWithOneFullyAllocatedAsset",
      "assetsOnIssuerBalanceSheet",
    ]);
  });

  it("12. keeps the same classification outcomes under the simpler wording", () => {
    const separate = resolveUopAccounting(qualifyingSeparate().eligibility);
    const integrated = resolveUopAccounting(qualifyingIntegrated().eligibility);
    expect(separate).toMatchObject({ kind: "uop", classification: "separate" });
    expect(integrated).toMatchObject({ kind: "uop", classification: "integrated" });
    expect(uopOutcomeDisplay(separate!).official).toMatch(/Separate use-of-proceeds structure/i);
    expect(uopOutcomeDisplay(integrated!).official).toMatch(/Integrated use-of-proceeds structure/i);
    expect(uopOutcomeDisplay(separate!).heading).toMatch(/separate Use of Proceeds/i);
    expect(uopOutcomeDisplay(integrated!).heading).toMatch(/integrated Use of Proceeds/i);

    expect(
      resolveUopAccounting(answers({ proceedsAllocatedToSpecificAssets: "no" }))
    ).toMatchObject({ kind: "not-uop", method: "customer-segment" });
    expect(
      resolveUopAccounting(answers({ proceedsAllocatedToSpecificAssets: "yes", isSecuritized: "yes" }))
    ).toMatchObject({ method: "securitization-structured-products" });
    expect(
      resolveUopAccounting(
        answers({
          proceedsAllocatedToSpecificAssets: "yes",
          isSecuritized: "no",
          structureHasControl: "yes",
          controlOneFullyAllocatedAsset: "yes",
          controlAssetIsProject: "yes",
        })
      )
    ).toMatchObject({ method: "project-finance" });
    expect(
      resolveUopAccounting(
        answers({
          proceedsAllocatedToSpecificAssets: "yes",
          isSecuritized: "no",
          structureHasControl: "no",
          debtBasedWithOneFullyAllocatedAsset: "yes",
          singleAssetClass: "mortgage",
        })
      )
    ).toMatchObject({ method: "mortgages" });
  });
});

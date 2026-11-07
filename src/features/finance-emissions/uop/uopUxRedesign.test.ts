import { describe, expect, it } from "vitest";
import { bindApprovedFactorForTest } from "./factorLibrary";
import {
  addUnderlyingAsset,
  createUopDraft,
  createUnderlyingAsset,
  uopInstanceKey,
} from "./state";
import {
  assetsRequired,
  structureKindFitsClassification,
  uopQuestionnaireComplete,
  validateUopAllocation,
  validateUopEmissionsPath,
  validateUopStep,
  validateUopStructure,
} from "./validation";
import { questionnairePayload, toUopDraftUpsertBody } from "./draftPersistence";
import { UOP_REPORTABLE_SAVE_AVAILABLE, canSaveReportableUop } from "./reportableGuard";
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

function qualifyingSeparate(): UopDraft {
  const draft = createUopDraft(uopInstanceKey(1), "fin-uop-ux");
  draft.eligibility = {
    ...blank(),
    proceedsAllocatedToSpecificAssets: "yes",
    isSecuritized: "no",
    structureHasControl: "no",
    debtBasedWithOneFullyAllocatedAsset: "no",
    assetsOnIssuerBalanceSheet: "no",
  };
  return draft;
}

function completeLookthrough(draft: UopDraft): UopDraft {
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

describe("UoP UX redesign contracts", () => {
  it("uses five banking stages whenever the deal qualifies", () => {
    const separate = qualifyingSeparate();
    expect(uopWizardSteps(separate).map((step) => step.id)).toEqual([
      "uop-eligibility",
      "uop-structure",
      "uop-allocation",
      "uop-emissions",
      "uop-review",
    ]);
    expect(uopWizardSteps({ ...createUopDraft("use-of-proceeds#1"), eligibility: blank() }).map((step) => step.id)).toEqual([
      "uop-eligibility",
    ]);
  });

  it("keeps legacy step ids as validation aliases", () => {
    const draft = qualifyingSeparate();
    draft.emissionsPath = "issuer_reported";
    expect(validateUopStep("uop-emissions-path", draft).issuerReportedFinancedEmissions).toBeTruthy();
    expect(validateUopStep("uop-holdings", draft).allocationStatus).toBeTruthy();
    draft.emissionsPath = "underlying_assets";
    expect(validateUopStep("uop-assets", draft).assets).toMatch(/at least one/i);
  });

  it("blocks contradictory classification, structure type, and investment type", () => {
    expect(structureKindFitsClassification("equity-fund", "integrated")).toBe(false);
    expect(structureKindFitsClassification("labeled-bond", "separate")).toBe(false);
    expect(structureKindFitsClassification("debt-fund", "separate")).toBe(true);
    expect(structureKindFitsClassification("labeled-loan", "integrated")).toBe(true);
    expect(structureKindFitsClassification("other", "integrated")).toBe(true);

    const separate = qualifyingSeparate();
    separate.structureName = "Fund";
    separate.issuerName = "Manager";
    separate.structureKind = "labeled-bond";
    separate.investmentType = "debt";
    separate.outstandingInvestment = 1;
    separate.totalStructureDebt = 2;
    separate.totalStructureEquity = 0;
    separate.reportingYear = "2026";
    separate.currency = "PKR";
    separate.evidenceSource = "prospectus";
    expect(validateUopStructure(separate).structureKind).toMatch(/borrower’s books|separate fund/i);

    const integrated = qualifyingSeparate();
    integrated.eligibility.assetsOnIssuerBalanceSheet = "yes";
    integrated.structureName = "Bond";
    integrated.issuerName = "Issuer";
    integrated.structureKind = "labeled-bond";
    integrated.investmentType = "equity";
    integrated.outstandingInvestment = 1;
    integrated.totalStructureDebt = 2;
    integrated.totalStructureEquity = 0;
    integrated.reportingYear = "2026";
    integrated.currency = "PKR";
    integrated.evidenceSource = "prospectus";
    expect(validateUopStructure(integrated).investmentType).toMatch(/loan or bond|debt/i);

    const equityFund = { ...separate, structureKind: "equity-fund" as const, investmentType: "debt" as const };
    expect(validateUopStructure(equityFund).investmentType).toMatch(/shares/i);
  });

  it("treats blank numeric fields as missing and preserves a genuine zero", () => {
    const draft = qualifyingSeparate();
    draft.structureName = "Fund";
    draft.issuerName = "Manager";
    draft.structureKind = "debt-fund";
    draft.investmentType = "debt";
    draft.outstandingInvestment = null;
    draft.totalStructureDebt = null;
    draft.totalStructureEquity = 0;
    draft.reportingYear = "2026";
    draft.currency = "PKR";
    draft.evidenceSource = "prospectus";
    const errors = validateUopStructure(draft);
    expect(errors.outstandingInvestment).toBeTruthy();
    expect(errors.totalStructureDebt).toBeTruthy();
    expect(errors.totalStructureEquity).toBeUndefined();

    draft.outstandingInvestment = 10;
    draft.totalStructureDebt = 0;
    draft.totalStructureAssets = 20;
    expect(validateUopStructure(draft).outstandingInvestment).toBeUndefined();
    expect(validateUopStructure(draft).totalStructureDebt).toBeUndefined();
  });

  it("validates the empty questionnaire on first Next without inventing zeros", () => {
    const draft = createUopDraft(uopInstanceKey(1), "fin-empty");
    expect(validateUopStep("uop-eligibility", draft).eligibility).toBeTruthy();
    expect(draft.outstandingInvestment).toBeNull();
    expect(draft.allocatedProceeds).toBeNull();
    expect(draft.totalStructureDebt).toBeNull();
    expect(uopQuestionnaireComplete(draft)).toBe(false);

    const qualifying = qualifyingSeparate();
    expect(validateUopStructure(qualifying).structureName).toBeTruthy();
    expect(validateUopStructure(qualifying).outstandingInvestment).toBeTruthy();
    expect(qualifying.outstandingInvestment).toBeNull();
  });

  it("splits allocation identity from emissions inputs", () => {
    const draft = completeLookthrough(qualifyingSeparate());
    draft.assets[0].hasReportedEmissions = "";
    draft.assets[0].dataSource = "";
    expect(validateUopAllocation(draft)["assets.asset-a.name"]).toBeUndefined();
    expect(validateUopAllocation(draft)["assets.asset-a.hasReportedEmissions"]).toBeUndefined();
    expect(validateUopStep("uop-emissions", draft)["assets.asset-a.hasReportedEmissions"]).toBeTruthy();
  });

  it("keeps issuer-reported, look-through, and estimation branches distinct", () => {
    const issuer = completeLookthrough(qualifyingSeparate());
    issuer.emissionsPath = "issuer_reported";
    issuer.issuerReportedFinancedEmissions = null;
    issuer.issuerReportYear = "";
    issuer.issuerReportSource = "";
    expect(assetsRequired(issuer)).toBe(false);
    expect(validateUopEmissionsPath(issuer).issuerReportedFinancedEmissions).toBeTruthy();

    const lookthrough = completeLookthrough(qualifyingSeparate());
    expect(assetsRequired(lookthrough)).toBe(true);
    expect(uopQuestionnaireComplete(lookthrough)).toBe(true);

    const estimate = completeLookthrough(qualifyingSeparate());
    estimate.eligibility.assetsOnIssuerBalanceSheet = "yes";
    estimate.structureKind = "labeled-bond";
    estimate.emissionsPath = "estimation";
    estimate.issuerLevelReason = "";
    estimate.allocatedProceeds = 10;
    estimate.unallocatedProceeds = 0;
    expect(validateUopEmissionsPath(estimate).issuerLevelReason).toMatch(/asset-level/i);
  });

  it("does not treat a typed factor as bound until an approved library id is confirmed", () => {
    const draft = completeLookthrough(qualifyingSeparate());
    draft.assets[0].hasReportedEmissions = "no";
    draft.assets[0].assetClass = "mortgage";
    draft.assets[0].estimation.pcafOption = "1b";
    draft.assets[0].estimation.method = "physical";
    draft.assets[0].estimation.energyConsumption = 1000;
    draft.assets[0].estimation.physicalActivityAmount = 1000;
    draft.assets[0].estimation.emissionFactor = 0.13096;
    draft.assets[0].estimation.factorSource = "typed";
    draft.assets[0].estimation.factorGeography = "United Kingdom";
    draft.assets[0].estimation.factorYear = "2026";
    draft.assets[0].estimation.factorUnit = "kg CO2e/kWh";
    expect(validateUopStep("uop-emissions", draft)["assets.asset-a.estimation.libraryEntryId"]).toBeTruthy();
    draft.assets[0].estimation = bindApprovedFactorForTest(draft.assets[0].estimation);
    expect(validateUopStep("uop-emissions", draft)["assets.asset-a.estimation.libraryEntryId"]).toBeUndefined();
    expect(uopQuestionnaireComplete(draft)).toBe(true);
  });

  it("keeps draft persistence keys, financing_instance_id, and reporting year unchanged", () => {
    const draft = completeLookthrough(qualifyingSeparate());
    const payload = questionnairePayload(draft);
    const body = toUopDraftUpsertBody(draft, { counterpartyId: "cp-1" });
    expect(payload.financingInstanceId).toBe("fin-uop-ux");
    expect(payload.reportingYear).toBe("2026");
    expect(payload).not.toHaveProperty("wizardStep");
    expect(body.financing_instance_id).toBe("fin-uop-ux");
    expect(body.draft.reportingYear).toBe("2026");
    expect(body.update_shared).toBe(false);
  });

  it("does not change calculation completeness or enable reportable Save", () => {
    const draft = completeLookthrough(qualifyingSeparate());
    expect(uopQuestionnaireComplete(draft)).toBe(true);
    draft.outstandingInvestment = null;
    expect(uopQuestionnaireComplete(draft)).toBe(false);
    expect(UOP_REPORTABLE_SAVE_AVAILABLE).toBe(false);
    expect(canSaveReportableUop()).toBe(false);
  });

  it("keeps two same-class assets independent after the layout split", () => {
    let draft = completeLookthrough(qualifyingSeparate());
    draft = addUnderlyingAsset(
      draft,
      createUnderlyingAsset({
        underlyingAssetId: "asset-b",
        name: "Pool B",
        assetClass: "mortgage",
        allocatedOutstanding: 2_000_000,
        totalAssetValue: 8_000_000,
        hasReportedEmissions: "yes",
        verificationStatus: "unverified",
        scope1Emissions: 10,
        dataSource: "operator report",
      })
    );
    expect(draft.assets).toHaveLength(2);
    expect(draft.assets[0].underlyingAssetId).not.toBe(draft.assets[1].underlyingAssetId);
    expect(draft.assets[0].allocatedOutstanding).toBe(6_000_000);
    expect(draft.assets[1].allocatedOutstanding).toBe(2_000_000);
    expect(uopQuestionnaireComplete(draft)).toBe(true);
  });
});

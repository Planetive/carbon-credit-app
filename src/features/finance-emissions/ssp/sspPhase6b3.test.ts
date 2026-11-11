import { describe, expect, it } from "vitest";
import {
  SSP_CALCULATE_AVAILABLE,
  SSP_REPORTABLE_SAVE_AVAILABLE,
  createCollateral,
  createHolding,
  createLoan,
  createPool,
  createSspDraft,
  createTranche,
  patchSspDraft,
  sspHierarchyWarnings,
  sspInstanceKey,
  sspWizardSteps,
  validateSspHierarchy,
} from "./index";

describe("Phase 6B.3 — safety gates", () => {
  it("keeps Calculate and reportable Save disabled", () => {
    expect(SSP_CALCULATE_AVAILABLE).toBe(true);
    expect(SSP_REPORTABLE_SAVE_AVAILABLE).toBe(false);
  });
});

describe("Phase 6B.3 — UX copy / soft vs hard validation", () => {
  it("review step copy points to backend preview Calculate", () => {
    const draft = createSspDraft(sspInstanceKey(1));
    const withEligibility = patchSspDraft(draft, {
      eligibility: {
        ...draft.eligibility,
        isStructuredProduct: "yes",
        underlyingIdentifiable: "yes",
        structureFamily: "true-sale",
        collateralFamily: "residential-real-estate",
        isGssCollateralBond: "no",
        isGssStandardBondForOriginatorProjects: "no",
        collateralRemainsWithOriginator: "no",
        hasTranches: "yes",
        hasPoolOfPools: "no",
        poolsLinkedToSpecificTranches: "no",
      },
    });
    const review = sspWizardSteps(withEligibility).find((s) => s.id === "ssp-review");
    expect(review?.description.toLowerCase()).toMatch(/preview calculate|backend/);
    expect(review?.description.toLowerCase()).toMatch(/reportable save stays off/);
  });

  it("COA mismatch warns but does not block hierarchy validation", () => {
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
    const pool = createPool({
      name: "Pool",
      loanIds: [loan.loanId],
      poolCurrentOutstandingAmount: 99,
    });
    const tranche = createTranche({ name: "Senior", currentOutstandingAmount: 99 });
    const holding = createHolding({
      name: "Note",
      trancheId: tranche.trancheId,
      bankOutstandingInvestment: 20,
    });
    const draft = patchSspDraft(createSspDraft(sspInstanceKey(1)), {
      eligibility: {
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
      },
      emissionsPath: "lookthrough",
      deal: {
        ...createSspDraft(sspInstanceKey(1)).deal,
        dealName: "UX Deal",
        structureType: "rmbs",
        reportingYear: "2024",
        documentationSource: "Trustee",
      },
      collateral: [c1],
      loans: [loan],
      pools: [pool],
      tranches: [tranche],
      holdings: [holding],
    });

    const warnings = sspHierarchyWarnings(draft);
    expect(warnings.length).toBeGreaterThan(0);
    const errors = validateSspHierarchy(draft);
    expect(Object.keys(errors).some((k) => k.includes("poolCurrentOutstanding"))).toBe(false);
  });

  it("uses plain-language attribution validation", () => {
    const c1 = createCollateral({
      name: "House",
      collateralType: "mortgage",
      attributionDenominator: null,
    });
    const loan = createLoan({
      name: "L1",
      collateralIds: [c1.collateralId],
      currentOutstandingAmount: 10,
    });
    const pool = createPool({ name: "P", loanIds: [loan.loanId] });
    const holding = createHolding({ name: "H", bankOutstandingInvestment: 5, trancheId: "" });
    const draft = patchSspDraft(createSspDraft(sspInstanceKey(1)), {
      eligibility: {
        isStructuredProduct: "yes",
        underlyingIdentifiable: "yes",
        structureFamily: "true-sale",
        collateralFamily: "residential-real-estate",
        hasAssetLevelEmissionsForOtherHard: "",
        isGssCollateralBond: "no",
        isGssStandardBondForOriginatorProjects: "no",
        collateralRemainsWithOriginator: "no",
        hasTranches: "no",
        hasPoolOfPools: "no",
        poolsLinkedToSpecificTranches: "no",
      },
      emissionsPath: "lookthrough",
      deal: {
        ...createSspDraft(sspInstanceKey(1)).deal,
        dealName: "Deal",
        structureType: "rmbs",
        reportingYear: "2024",
        documentationSource: "Doc",
        hasTranches: "no",
      },
      collateral: [c1],
      loans: [loan],
      pools: [pool],
      tranches: [],
      holdings: [holding],
    });
    const errors = validateSspHierarchy(draft);
    const msg = errors[`collateral.${c1.collateralId}.attributionDenominator`] || "";
    expect(msg.toLowerCase()).toContain("property or vehicle");
    expect(msg.toLowerCase()).not.toContain("table 5.8");
  });
});

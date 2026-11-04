/**
 * PCAF 2025 Part A, Figure 5.7-2 — GHG accounting treatment for UoP structures.
 * Also applies Figure 5-1 Step 3b (securitization) as the documented exception
 * that removes a structure from §5.7 before the 5.7-2 questions continue.
 */

import type { UopAccountingOutcome, UopEligibilityAnswers, UopYesNo } from "./types";

export const PCAF_UOP_REF = "PCAF Part A 2025, §5.7 / Figure 5.7-2";
export const PCAF_FIGURE_5_1_REF = "PCAF Part A 2025, Figure 5-1";

function answeredNo(value: UopYesNo): boolean {
  return value === "no";
}

function answeredYes(value: UopYesNo): boolean {
  return value === "yes";
}

export function resolveUopAccounting(answers: UopEligibilityAnswers): UopAccountingOutcome | null {
  if (!answers.proceedsAllocatedToSpecificAssets) return null;

  if (answeredNo(answers.proceedsAllocatedToSpecificAssets)) {
    return {
      kind: "not-uop",
      method: "customer-segment",
      title: "Not a use-of-proceeds structure",
      guidance:
        "There is not sufficient evidence that proceeds are allocated only to identifiable assets. Do not use the Use of Proceeds method. Select the asset class from customer-segment classification in Figure 5-1 Step 3a (listed equity and corporate bonds, or business loans and unlisted equity). Examples: general-purpose loans, working-capital loans, and general corporate bonds.",
      pcafRef: `${PCAF_UOP_REF} Question 1; Table 5.7-1`,
    };
  }

  if (!answers.isSecuritized) return null;
  if (answeredYes(answers.isSecuritized)) {
    return {
      kind: "other-method",
      method: "securitization-structured-products",
      title: "Account as securitization or structured product",
      guidance:
        "A structure that is legally distinct from the issuing entity and issues securities backed by identifiable loans, leases, or receivables (for example RMBS, CMBS, CLO, Auto ABS) is in scope for Securitizations & Structured Products (§5.8), not Use of Proceeds (§5.7).",
      pcafRef: `${PCAF_FIGURE_5_1_REF} Steps 3b and 4b`,
    };
  }

  if (!answers.structureHasControl) return null;

  if (answeredYes(answers.structureHasControl)) {
    if (!answers.controlOneFullyAllocatedAsset) return null;
    if (answeredYes(answers.controlOneFullyAllocatedAsset)) {
      if (!answers.controlAssetIsProject) return null;
      if (answeredYes(answers.controlAssetIsProject)) {
        return {
          kind: "other-method",
          method: "project-finance",
          title: "Account as project finance",
          guidance:
            "A use-of-proceeds structure with control over the underlying assets is treated as a corporate, except when there is one fully allocated asset and that asset is a project. Account in line with the Project Finance method (including project-finance SPVs).",
          pcafRef: `${PCAF_UOP_REF} Question 2 exception; Table 5.7-1`,
        };
      }
    }
    if (!answers.structureListing) return null;
    if (answers.structureListing === "listed") {
      return {
        kind: "other-method",
        method: "listed-equity-corporate-bonds",
        title: "Account as listed equity or corporate bonds",
        guidance:
          "A UoP structure that has control over underlying assets is equivalent to a corporate. Because the structure is listed, account it under Listed equity and corporate bonds. Typical example: a top-level holding with control.",
        pcafRef: `${PCAF_UOP_REF} Question 2; Table 5.7-1`,
      };
    }
    return {
      kind: "other-method",
      method: "business-loans-unlisted-equity",
      title: "Account as business loans and unlisted equity",
      guidance:
        "A UoP structure that has control over underlying assets is equivalent to a corporate. Because the structure is unlisted, account it under Business loans and unlisted equity. Typical example: a top-level holding with control.",
      pcafRef: `${PCAF_UOP_REF} Question 2; Table 5.7-1`,
    };
  }

  if (!answers.debtBasedWithOneFullyAllocatedAsset) return null;
  if (answeredYes(answers.debtBasedWithOneFullyAllocatedAsset)) {
    if (!answers.singleAssetClass) return null;
    const byClass: Record<Exclude<UopEligibilityAnswers["singleAssetClass"], "">, UopAccountingOutcome> = {
      mortgage: {
        kind: "other-method",
        method: "mortgages",
        title: "Account as mortgages",
        guidance:
          "A debt-based structure with one fully allocated identifiable asset is not calculated with the Use of Proceeds method. Use the Mortgages asset class (Figure 5-1 Step 6).",
        pcafRef: `${PCAF_UOP_REF} Question 3; Table 5.7-1`,
      },
      "commercial-real-estate": {
        kind: "other-method",
        method: "commercial-real-estate",
        title: "Account as commercial real estate",
        guidance:
          "A debt-based structure with one fully allocated identifiable asset is not calculated with the Use of Proceeds method. Use the Commercial real estate asset class (Figure 5-1 Step 6).",
        pcafRef: `${PCAF_UOP_REF} Question 3; Table 5.7-1`,
      },
      "motor-vehicle-loan": {
        kind: "other-method",
        method: "motor-vehicle-loans",
        title: "Account as motor vehicle loans",
        guidance:
          "A debt-based structure with one fully allocated identifiable asset is not calculated with the Use of Proceeds method. Use the Motor vehicle loans asset class (Figure 5-1 Step 6).",
        pcafRef: `${PCAF_UOP_REF} Question 3; Table 5.7-1`,
      },
      "project-finance": {
        kind: "other-method",
        method: "project-finance",
        title: "Account as project finance",
        guidance:
          "A debt-based structure with one fully allocated project is not calculated with the Use of Proceeds method. Use Project finance, including the guidance for projects without a separate balance sheet.",
        pcafRef: `${PCAF_UOP_REF} Question 3; Table 5.7-1`,
      },
      other: {
        kind: "other-method",
        method: "figure-5-1-step-6",
        title: "Account under the matching asset class",
        guidance:
          "A debt-based structure with one fully allocated identifiable asset is not calculated with the Use of Proceeds method. Select the asset class from asset type in Figure 5-1 Step 6.",
        pcafRef: `${PCAF_UOP_REF} Question 3`,
      },
    };
    return byClass[answers.singleAssetClass];
  }

  if (!answers.assetsOnIssuerBalanceSheet) return null;
  if (answeredYes(answers.assetsOnIssuerBalanceSheet)) {
    return {
      kind: "uop",
      classification: "integrated",
      title: "Integrated use-of-proceeds structure",
      guidance:
        "Underlying assets are part of the issuer’s balance sheet (for example labeled bonds/loans allocated to specific assets, or a loan earmarked to multiple designated projects). Account with the Use of Proceeds method. Investors may use issuer-level data when asset-level accounting is theoretically impossible, not practically feasible, or not material.",
      pcafRef: `${PCAF_UOP_REF} Question 4`,
    };
  }

  return {
    kind: "uop",
    classification: "separate",
    title: "Separate use-of-proceeds structure",
    guidance:
      "Underlying assets are not part of the issuer’s balance sheet (for example debt funds, private equity funds, and certain SPVs without control). Account with the Use of Proceeds method. Issuer-level corporate emissions must not be used as a proxy for unallocated amounts.",
    pcafRef: `${PCAF_UOP_REF} Question 4; footnote 167`,
  };
}

export function uopQualifiesForMethod(outcome: UopAccountingOutcome | null): outcome is Extract<UopAccountingOutcome, { kind: "uop" }> {
  return outcome?.kind === "uop";
}

export function allowedUopEmissionsPaths(
  outcome: UopAccountingOutcome | null
): Array<"issuer_reported" | "underlying_assets" | "estimation"> {
  if (!uopQualifiesForMethod(outcome)) return [];
  return ["issuer_reported", "underlying_assets", "estimation"];
}

export function issuerLevelPathAllowed(outcome: UopAccountingOutcome | null): boolean {
  return outcome?.kind === "uop" && outcome.classification === "integrated";
}

export type UopEligibilityQuestionId =
  | "proceedsAllocatedToSpecificAssets"
  | "isSecuritized"
  | "structureHasControl"
  | "controlOneFullyAllocatedAsset"
  | "controlAssetIsProject"
  | "structureListing"
  | "debtBasedWithOneFullyAllocatedAsset"
  | "singleAssetClass"
  | "assetsOnIssuerBalanceSheet";

/**
 * Next Figure 5.7-2 question on the active path. Does not change outcomes.
 * "done" means resolveUopAccounting already has a classification or redirect.
 */
export function currentEligibilityQuestion(
  answers: UopEligibilityAnswers
): UopEligibilityQuestionId | "done" {
  if (!answers.proceedsAllocatedToSpecificAssets) return "proceedsAllocatedToSpecificAssets";
  if (answeredNo(answers.proceedsAllocatedToSpecificAssets)) return "done";

  if (!answers.isSecuritized) return "isSecuritized";
  if (answeredYes(answers.isSecuritized)) return "done";

  if (!answers.structureHasControl) return "structureHasControl";

  if (answeredYes(answers.structureHasControl)) {
    if (!answers.controlOneFullyAllocatedAsset) return "controlOneFullyAllocatedAsset";
    if (answeredYes(answers.controlOneFullyAllocatedAsset)) {
      if (!answers.controlAssetIsProject) return "controlAssetIsProject";
      if (answeredYes(answers.controlAssetIsProject)) return "done";
    }
    if (!answers.structureListing) return "structureListing";
    return "done";
  }

  if (!answers.debtBasedWithOneFullyAllocatedAsset) return "debtBasedWithOneFullyAllocatedAsset";
  if (answeredYes(answers.debtBasedWithOneFullyAllocatedAsset)) {
    if (!answers.singleAssetClass) return "singleAssetClass";
    return "done";
  }

  if (!answers.assetsOnIssuerBalanceSheet) return "assetsOnIssuerBalanceSheet";
  return "done";
}

/** Questions on the active Figure 5.7-2 path, in order, including the current unanswered one. */
export function visibleEligibilityQuestions(
  answers: UopEligibilityAnswers
): UopEligibilityQuestionId[] {
  const path: UopEligibilityQuestionId[] = ["proceedsAllocatedToSpecificAssets"];
  if (!answers.proceedsAllocatedToSpecificAssets) return path;
  if (answeredNo(answers.proceedsAllocatedToSpecificAssets)) return path;

  path.push("isSecuritized");
  if (!answers.isSecuritized) return path;
  if (answeredYes(answers.isSecuritized)) return path;

  path.push("structureHasControl");
  if (!answers.structureHasControl) return path;

  if (answeredYes(answers.structureHasControl)) {
    path.push("controlOneFullyAllocatedAsset");
    if (!answers.controlOneFullyAllocatedAsset) return path;
    if (answeredYes(answers.controlOneFullyAllocatedAsset)) {
      path.push("controlAssetIsProject");
      if (!answers.controlAssetIsProject) return path;
      if (answeredYes(answers.controlAssetIsProject)) return path;
    }
    path.push("structureListing");
    return path;
  }

  path.push("debtBasedWithOneFullyAllocatedAsset");
  if (!answers.debtBasedWithOneFullyAllocatedAsset) return path;
  if (answeredYes(answers.debtBasedWithOneFullyAllocatedAsset)) {
    path.push("singleAssetClass");
    return path;
  }

  path.push("assetsOnIssuerBalanceSheet");
  return path;
}

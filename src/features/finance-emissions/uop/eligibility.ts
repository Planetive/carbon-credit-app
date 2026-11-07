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
        "There is not enough evidence that the money is reserved for named assets. Do not use Use of Proceeds. Treat this as ordinary lending or investment instead — for example a general-purpose loan, working-capital loan, or general corporate bond.",
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
        "A separate company that issues notes backed by a pool of loans, leases, or receivables (for example RMBS, CMBS, CLO, or auto ABS) is treated as a securitization, not Use of Proceeds.",
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
            "If this vehicle controls the assets, treat it as ordinary company financing — unless all of the money goes to one project. In that case, treat it as project finance.",
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
          "Because this vehicle controls the assets and is listed, treat it as listed shares or corporate bonds — not Use of Proceeds.",
        pcafRef: `${PCAF_UOP_REF} Question 2; Table 5.7-1`,
      };
    }
    return {
      kind: "other-method",
      method: "business-loans-unlisted-equity",
      title: "Account as business loans and unlisted equity",
      guidance:
        "Because this vehicle controls the assets and is private, treat it as a business loan or private shares — not Use of Proceeds.",
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
          "A loan for one home should be treated as a mortgage, not Use of Proceeds.",
        pcafRef: `${PCAF_UOP_REF} Question 3; Table 5.7-1`,
      },
      "commercial-real-estate": {
        kind: "other-method",
        method: "commercial-real-estate",
        title: "Account as commercial real estate",
        guidance:
          "A loan for one commercial building should be treated as a commercial property loan, not Use of Proceeds.",
        pcafRef: `${PCAF_UOP_REF} Question 3; Table 5.7-1`,
      },
      "motor-vehicle-loan": {
        kind: "other-method",
        method: "motor-vehicle-loans",
        title: "Account as motor vehicle loans",
        guidance:
          "A loan for one vehicle should be treated as a vehicle loan, not Use of Proceeds.",
        pcafRef: `${PCAF_UOP_REF} Question 3; Table 5.7-1`,
      },
      "project-finance": {
        kind: "other-method",
        method: "project-finance",
        title: "Account as project finance",
        guidance:
          "A loan for one project should be treated as project finance, not Use of Proceeds.",
        pcafRef: `${PCAF_UOP_REF} Question 3; Table 5.7-1`,
      },
      other: {
        kind: "other-method",
        method: "figure-5-1-step-6",
        title: "Account under the matching asset class",
        guidance:
          "A loan for one named asset should use that asset’s usual loan type, not Use of Proceeds.",
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
        "The funded assets sit on the borrower’s own books. Both money already assigned and leftover money count. Use the borrower’s company figures only when you cannot reasonably work it out asset by asset.",
      pcafRef: `${PCAF_UOP_REF} Question 4`,
    };
  }

  return {
    kind: "uop",
    classification: "separate",
    title: "Separate use-of-proceeds structure",
    guidance:
      "The funded assets sit in a fund or special vehicle, not on the borrower’s own books. Work the emissions out from those assets. Do not use the borrower’s company-wide emissions as a stand-in for leftover cash.",
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

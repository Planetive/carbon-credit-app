import type {
  SspAccountingOutcome,
  SspCollateralFamily,
  SspEligibilityAnswers,
  SspStructureType,
  SspYesNo,
} from "./types";

export type SspEligibilityQuestionId =
  | "isStructuredProduct"
  | "underlyingIdentifiable"
  | "structureFamily"
  | "collateralFamily"
  | "hasAssetLevelEmissionsForOtherHard"
  | "isGssCollateralBond"
  | "isGssStandardBondForOriginatorProjects"
  | "collateralRemainsWithOriginator"
  | "hasTranches"
  | "hasPoolOfPools"
  | "poolsLinkedToSpecificTranches";

const PCAF_58 = "PCAF Part A 2025 §5.8";
const PCAF_58_FIG2 = "PCAF Part A 2025 §5.8 Figure 5.8-2";
const PCAF_58_T1 = "PCAF Part A 2025 §5.8 Table 5.8-1";

function answered(value: string): boolean {
  return Boolean(String(value || "").trim());
}

/** Progressive disclosure — only ask the next unanswered relevant question. */
export function visibleEligibilityQuestions(answers: SspEligibilityAnswers): SspEligibilityQuestionId[] {
  const ids: SspEligibilityQuestionId[] = ["isStructuredProduct"];
  if (answers.isStructuredProduct !== "yes") return ids;

  ids.push("underlyingIdentifiable");
  if (answers.underlyingIdentifiable !== "yes") return ids;

  ids.push("structureFamily");
  if (!answered(answers.structureFamily)) return ids;
  if (answers.structureFamily === "tba-repo") return ids;

  ids.push("collateralFamily");
  if (!answered(answers.collateralFamily)) return ids;

  if (answers.collateralFamily === "other-hard-assets") {
    ids.push("hasAssetLevelEmissionsForOtherHard");
    if (!answered(answers.hasAssetLevelEmissionsForOtherHard)) return ids;
  }

  if (
    answers.collateralFamily === "residential-real-estate" ||
    answers.collateralFamily === "commercial-real-estate" ||
    answers.collateralFamily === "business-loans" ||
    answers.collateralFamily === "corporate-bonds" ||
    answers.collateralFamily === "auto-loans" ||
    (answers.collateralFamily === "other-hard-assets" && answers.hasAssetLevelEmissionsForOtherHard === "yes")
  ) {
    ids.push("isGssCollateralBond");
    if (!answered(answers.isGssCollateralBond)) return ids;
    if (answers.isGssCollateralBond === "no") {
      ids.push("isGssStandardBondForOriginatorProjects");
      if (!answered(answers.isGssStandardBondForOriginatorProjects)) return ids;
    }
  }

  if (resolveUopReroute(answers)) return ids;

  ids.push("collateralRemainsWithOriginator");
  if (!answered(answers.collateralRemainsWithOriginator)) return ids;
  ids.push("hasTranches");
  if (!answered(answers.hasTranches)) return ids;
  ids.push("hasPoolOfPools");
  if (!answered(answers.hasPoolOfPools)) return ids;
  if (answers.hasTranches === "yes" && answers.hasPoolOfPools !== "") {
    ids.push("poolsLinkedToSpecificTranches");
  }
  return ids;
}

export function currentEligibilityQuestion(
  answers: SspEligibilityAnswers
): SspEligibilityQuestionId | null {
  const visible = visibleEligibilityQuestions(answers);
  for (const id of visible) {
    if (!answered(answers[id] as string)) return id;
  }
  return null;
}

function resolveUopReroute(answers: SspEligibilityAnswers): boolean {
  return (
    answers.isGssCollateralBond === "no" &&
    answers.isGssStandardBondForOriginatorProjects === "yes"
  );
}

function structureHint(answers: SspEligibilityAnswers): SspStructureType {
  switch (answers.structureFamily) {
    case "covered-bond":
      return answers.collateralFamily === "commercial-real-estate" ? "cre-covered-bond" : "mortgage-covered-bond";
    case "synthetic":
      return "synthetic";
    case "warehouse":
      return "warehouse";
    case "private-abs":
      return "private-abs";
    case "whole-loan":
      return "whole-loan";
    case "true-sale":
      if (answers.collateralFamily === "residential-real-estate") return "rmbs";
      if (answers.collateralFamily === "commercial-real-estate") return "cmbs";
      if (answers.collateralFamily === "business-loans" || answers.collateralFamily === "corporate-bonds") {
        return "clo-cdo";
      }
      if (answers.collateralFamily === "auto-loans") return "auto-abs";
      return "true-sale-abs";
    default:
      return "other-in-scope";
  }
}

/**
 * PCAF §5.8 Figure 5.8-2 + Table 5.8-1 eligibility outcome.
 * Does not invent rules beyond the official decision tree.
 */
export function resolveSspAccounting(answers: SspEligibilityAnswers): SspAccountingOutcome | null {
  if (!answered(answers.isStructuredProduct)) return null;
  if (answers.isStructuredProduct === "no") {
    return {
      kind: "choose-class",
      title: "Not a securitization or structured product",
      guidance:
        "Return to loan-type selection and pick the matching PCAF asset class (for example mortgage, business loan, or Use of Proceeds). Do not force every green bond or ordinary loan into securitization, and do not assume Business Loan by default.",
      pcafRef: PCAF_58_FIG2,
    };
  }

  if (!answered(answers.underlyingIdentifiable)) return null;
  if (answers.underlyingIdentifiable === "no") {
    return {
      kind: "exclude",
      reasonCode: "unknown_collateral",
      title: "Look-through required",
      guidance:
        "PCAF cannot apply §5.8 when the nature of assets in the collateral pool is unknown. Follow-the-money look-through is required.",
      pcafRef: `${PCAF_58}; Table 5.8-1`,
    };
  }

  if (!answered(answers.structureFamily)) return null;
  if (answers.structureFamily === "tba-repo") {
    return {
      kind: "exclude",
      reasonCode: "tba_repo_out_of_scope",
      title: "TBAs / repurchase agreements are out of scope here",
      guidance:
        "PCAF §5.8 Table 5.8-4 places TBAs out of scope and repurchase agreements under separate derivative guidance when available.",
      pcafRef: `${PCAF_58} Table 5.8-4`,
    };
  }

  if (!answered(answers.collateralFamily)) return null;

  if (answers.collateralFamily === "consumer-receivables") {
    return {
      kind: "exclude",
      reasonCode: "consumer_receivables_out_of_scope",
      title: "Consumer receivables structures are out of scope",
      guidance:
        "Credit-card, student-loan, home-equity and similar consumer ABS are out of scope unless asset-level emissions data exists under another supported PCAF class (Table 5.8-1).",
      pcafRef: PCAF_58_T1,
    };
  }

  if (answers.collateralFamily === "public-sector") {
    return {
      kind: "exclude",
      reasonCode: "public_sector_covered_bond_out_of_scope",
      title: "Public-sector covered bonds are out of scope",
      guidance:
        "Public-sector covered bonds and land/forest covered bonds are not included in Part A §5.8 (Table 5.8-1).",
      pcafRef: PCAF_58_T1,
    };
  }

  if (answers.collateralFamily === "unknown") {
    return {
      kind: "exclude",
      reasonCode: "unknown_collateral_family",
      title: "Collateral type must be known",
      guidance: "Classify the collateral family before continuing with securitization accounting.",
      pcafRef: PCAF_58_T1,
    };
  }

  if (answers.collateralFamily === "other-hard-assets") {
    if (!answered(answers.hasAssetLevelEmissionsForOtherHard)) return null;
    if (answers.hasAssetLevelEmissionsForOtherHard !== "yes") {
      return {
        kind: "exclude",
        reasonCode: "other_hard_assets_no_asset_data",
        title: "Other hard-asset ABS needs asset-level emissions",
        guidance:
          "Aircraft, solar, railcar and similar hard-asset ABS are optional only when the FI has access to asset-level emissions data (Table 5.8-1).",
        pcafRef: PCAF_58_T1,
      };
    }
  }

  if (
    answers.collateralFamily === "residential-real-estate" ||
    answers.collateralFamily === "commercial-real-estate" ||
    answers.collateralFamily === "business-loans" ||
    answers.collateralFamily === "corporate-bonds" ||
    answers.collateralFamily === "auto-loans" ||
    answers.collateralFamily === "other-hard-assets"
  ) {
    if (!answered(answers.isGssCollateralBond)) return null;
    if (answers.isGssCollateralBond === "no") {
      if (!answered(answers.isGssStandardBondForOriginatorProjects)) return null;
      if (answers.isGssStandardBondForOriginatorProjects === "yes") {
        return {
          kind: "reroute",
          method: "use-of-proceeds",
          title: "Use Use of Proceeds instead",
          guidance:
            "If net sale proceeds fund the originator’s GSS+ corporate projects (Secured Green Standard Bond), PCAF Figure 5.8-2 Step 3b points to the Use of Proceeds Structures method — not SSP look-through of green-labelled notes alone.",
          pcafRef: `${PCAF_58_FIG2} Step 3b`,
        };
      }
    }
  }

  if (!answered(answers.collateralRemainsWithOriginator)) return null;
  if (!answered(answers.hasTranches)) return null;
  if (!answered(answers.hasPoolOfPools)) return null;
  if (answers.hasTranches === "yes" && !answered(answers.poolsLinkedToSpecificTranches)) return null;

  return {
    kind: "ssp",
    title: "Continue as Securitization & Structured Products",
    guidance:
      "Apply the §5.8 look-through: collateral → loan → pool → optional pool-of-pools → tranche → investment. Do not invent a single universal attribution denominator.",
    pcafRef: `${PCAF_58}; Tables 5.8-1 to 5.8-3`,
    structureHint: structureHint(answers),
    collateralFamily: answers.collateralFamily as SspCollateralFamily,
  };
}

export function sspQualifiesForMethod(outcome: SspAccountingOutcome | null | undefined): boolean {
  return outcome?.kind === "ssp";
}

export function defaultPcafClassForFamily(family: SspCollateralFamily): string {
  switch (family) {
    case "residential-real-estate":
      return "mortgage";
    case "commercial-real-estate":
      return "commercial-real-estate";
    case "business-loans":
      return "business-loan";
    case "corporate-bonds":
      return "corporate-bond";
    case "auto-loans":
      return "motor-vehicle-loan";
    default:
      return "";
  }
}

export function cafDenominatorHint(collateralType: string): string {
  switch (collateralType) {
    case "mortgage":
    case "commercial-real-estate":
      return "Property value at origination (preferred)";
    case "motor-vehicle-loan":
      return "Vehicle value at origination";
    case "business-loan":
    case "unlisted-equity":
      return "Total equity + debt";
    case "corporate-bond":
    case "listed-equity":
      return "EVIC (listed) / equity + debt";
    default:
      return "Collateral attribution denominator from the underlying PCAF class (Table 5.8-2)";
  }
}

export function emptyEligibility(): SspEligibilityAnswers {
  return {
    isStructuredProduct: "" as SspYesNo,
    underlyingIdentifiable: "" as SspYesNo,
    structureFamily: "",
    collateralFamily: "",
    hasAssetLevelEmissionsForOtherHard: "" as SspYesNo,
    isGssCollateralBond: "" as SspYesNo,
    isGssStandardBondForOriginatorProjects: "" as SspYesNo,
    collateralRemainsWithOriginator: "" as SspYesNo,
    hasTranches: "" as SspYesNo,
    hasPoolOfPools: "" as SspYesNo,
    poolsLinkedToSpecificTranches: "" as SspYesNo,
  };
}

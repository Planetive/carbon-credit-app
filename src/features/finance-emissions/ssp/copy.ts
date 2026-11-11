import type { SspEligibilityQuestionId } from "./eligibility";
import type { SspAccountingOutcome } from "./types";

export const ELIGIBILITY_COPY: Record<
  SspEligibilityQuestionId,
  { title: string; help: string; options?: Array<{ value: string; label: string; hint?: string }> }
> = {
  isStructuredProduct: {
    title: "Is this investment a securitization or structured product?",
    help: "Examples: RMBS, CMBS, CLO, Auto ABS, covered bonds, synthetics, warehouses. Ordinary loans and earmarked green bonds are usually not.",
  },
  underlyingIdentifiable: {
    title: "Can you identify the underlying assets in the collateral pool?",
    help: "PCAF needs a look-through to the collateral class and sector. Unknown pools cannot use §5.8.",
  },
  structureFamily: {
    title: "What kind of structure is it?",
    help: "Pick the closest match. TBAs and classic repos are out of scope for this method.",
    options: [
      { value: "true-sale", label: "True-sale ABS / MBS to an SPV", hint: "Assets sold into a bankruptcy-remote vehicle" },
      { value: "covered-bond", label: "Covered bond", hint: "Collateral usually stays with the issuer" },
      { value: "synthetic", label: "Synthetic / credit-risk transfer", hint: "Risk transferred; assets may stay on balance sheet" },
      { value: "warehouse", label: "Warehouse facility", hint: "Growing pool funded over time" },
      { value: "private-abs", label: "Private asset-backed financing", hint: "Private deal with identifiable collateral" },
      { value: "whole-loan", label: "Eligible whole-loan transaction", hint: "Only if it qualifies under §5.8 guidance" },
      { value: "tba-repo", label: "TBA or repurchase agreement", hint: "Out of scope for §5.8" },
      { value: "unknown", label: "Not sure yet", hint: "We’ll ask for more detail" },
    ],
  },
  collateralFamily: {
    title: "What mainly backs the pool?",
    help: "Table 5.8-1. Consumer receivables and public-sector covered bonds are generally out of scope.",
    options: [
      { value: "residential-real-estate", label: "Residential mortgages (RMBS)" },
      { value: "commercial-real-estate", label: "Commercial property loans (CMBS / CRE)" },
      { value: "business-loans", label: "Business loans (CLO)" },
      { value: "corporate-bonds", label: "Corporate bonds / debt (CDO as applicable)" },
      { value: "auto-loans", label: "Auto loans or leases (Auto ABS)" },
      { value: "other-hard-assets", label: "Other hard assets (aircraft, equipment, etc.)" },
      { value: "consumer-receivables", label: "Credit cards / student loans / similar" },
      { value: "public-sector", label: "Public-sector covered bonds / land-forest" },
      { value: "unknown", label: "Unknown" },
    ],
  },
  hasAssetLevelEmissionsForOtherHard: {
    title: "Do you have asset-level emissions for those hard assets?",
    help: "Other hard-asset ABS is optional only when asset-level emissions data is available (Table 5.8-1).",
  },
  isGssCollateralBond: {
    title: "Is this a Secured Green Collateral Bond (GSS+ collateral itself)?",
    help: "Optional Figure 5.8-2 Step 3a. Green collateral still uses SSP look-through — it does not automatically become Use of Proceeds.",
  },
  isGssStandardBondForOriginatorProjects: {
    title: "Do sale proceeds fund the originator’s GSS+ corporate projects instead?",
    help: "Figure 5.8-2 Step 3b. If yes, Use of Proceeds may apply instead of SSP.",
  },
  collateralRemainsWithOriginator: {
    title: "Does the collateral stay with the originator / issuer?",
    help: "Common for covered bonds and synthetics. True-sale ABS usually moves assets to an SPV.",
  },
  hasTranches: {
    title: "Does the deal have tranches?",
    help: "Untranched structures are allowed. Seniority does not change financed-emissions maths.",
  },
  hasPoolOfPools: {
    title: "Is there a pool of pools?",
    help: "Optional. Some deals wrap several loan pools before tranche allocation (Table 5.8-3).",
  },
  poolsLinkedToSpecificTranches: {
    title: "Are specific pools linked to particular tranches?",
    help: "If yes, treat those as separate attribution paths and aggregate investor holdings afterwards.",
  },
};

export function sspOutcomeDisplay(outcome: SspAccountingOutcome | null | undefined): {
  heading: string;
  body: string;
  tone: "ok" | "reroute" | "exclude" | "info";
} {
  if (!outcome) {
    return { heading: "Keep answering", body: "Finish the screening questions.", tone: "info" };
  }
  if (outcome.kind === "ssp") return { heading: outcome.title, body: outcome.guidance, tone: "ok" };
  if (outcome.kind === "reroute") return { heading: outcome.title, body: outcome.guidance, tone: "reroute" };
  if (outcome.kind === "choose-class") return { heading: outcome.title, body: outcome.guidance, tone: "reroute" };
  if (outcome.kind === "exclude") return { heading: outcome.title, body: outcome.guidance, tone: "exclude" };
  return { heading: outcome.title, body: outcome.guidance, tone: "info" };
}

export function sspRedirectLoanType(outcome: SspAccountingOutcome | null | undefined): string | null {
  if (outcome?.kind === "reroute") return outcome.method;
  return null;
}

export const STRUCTURE_TYPE_LABELS: Record<string, string> = {
  "true-sale-abs": "True-sale ABS",
  rmbs: "RMBS",
  cmbs: "CMBS",
  "clo-cdo": "CLO / CDO",
  "auto-abs": "Auto ABS",
  "mortgage-covered-bond": "Mortgage covered bond",
  "cre-covered-bond": "CRE covered bond",
  synthetic: "Synthetic / CRT",
  warehouse: "Warehouse",
  "master-trust": "Master trust",
  "private-abs": "Private ABS",
  untranched: "Untranched structured product",
  "whole-loan": "Eligible whole-loan",
  "other-in-scope": "Other in-scope structure",
};

export const COLLATERAL_CLASS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "mortgage", label: "Mortgage (residential)" },
  { value: "commercial-real-estate", label: "Commercial real estate" },
  { value: "business-loan", label: "Business loan / unlisted equity" },
  { value: "corporate-bond", label: "Corporate bond" },
  { value: "listed-equity", label: "Listed equity (where applicable)" },
  { value: "unlisted-equity", label: "Unlisted equity" },
  { value: "motor-vehicle-loan", label: "Motor vehicle loan" },
  { value: "other-hard-asset", label: "Other hard asset (with asset-level data)" },
];

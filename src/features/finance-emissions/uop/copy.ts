/**
 * Bank-employee wording for the Use of Proceeds questionnaire.
 * Eligibility outcomes and field values stay in eligibility.ts / types.ts.
 */

import type { UopAccountingOutcome, UopEligibilityAnswers, UopYesNo } from "./types";
import type { UopEligibilityQuestionId } from "./eligibility";

export const ELIGIBILITY_COPY: Record<
  UopEligibilityQuestionId,
  { title: string; example: string; pcaf: string; recap: (answers: UopEligibilityAnswers) => string }
> = {
  proceedsAllocatedToSpecificAssets: {
    title: "Is this money earmarked for named assets?",
    example: "Example: a green bond that must fund listed solar projects, not general working capital.",
    pcaf: "The money must be reserved for named assets you can identify. Calling it a green or sustainable loan is not enough on its own.",
    recap: (answers) => yesNoRecap(answers.proceedsAllocatedToSpecificAssets),
  },
  isSecuritized: {
    title: "Is this a securitization (pooled loans sold as securities)?",
    example: "Example: RMBS, CMBS, CLO, or auto ABS — a separate company issues notes backed by a pool of loans.",
    pcaf: "This is when a separate company sells notes backed by a pool of loans, leases, or receivables. Those deals are not treated as Use of Proceeds.",
    recap: (answers) => yesNoRecap(answers.isSecuritized),
  },
  structureHasControl: {
    title: "Does this vehicle control the underlying assets?",
    example: "Example: a holding company that consolidates subsidiaries. A minority stake in a fund usually does not have control.",
    pcaf: "Control usually means the vehicle consolidates the assets, as a parent company would. A minority stake in a fund usually does not have control. If it does, treat it like ordinary company financing instead.",
    recap: (answers) => yesNoRecap(answers.structureHasControl),
  },
  controlOneFullyAllocatedAsset: {
    title: "Is all of the money going to one asset?",
    example: "Example: the vehicle exists only to own one power plant, and every rupee is tied to that plant.",
    pcaf: "If every rupee is tied to one project, this is treated as project finance rather than Use of Proceeds.",
    recap: (answers) => yesNoRecap(answers.controlOneFullyAllocatedAsset),
  },
  controlAssetIsProject: {
    title: "Is that single asset a project?",
    example: "Example: a wind farm, toll road, or plant with its own financing — not a portfolio of many loans.",
    pcaf: "A project is something like a wind farm, toll road, or plant with its own financing — not a portfolio of many loans.",
    recap: (answers) => yesNoRecap(answers.controlAssetIsProject),
  },
  structureListing: {
    title: "Is this vehicle listed on a stock exchange?",
    example: "Example: listed = shares trade on an exchange. Unlisted = a private holding company.",
    pcaf: "If the vehicle’s shares trade on an exchange, treat it as listed shares or corporate bonds. If it is private, treat it as a business loan or private shares.",
    recap: (answers) =>
      answers.structureListing === "listed"
        ? "Listed"
        : answers.structureListing === "unlisted"
          ? "Not listed"
          : "Not answered",
  },
  debtBasedWithOneFullyAllocatedAsset: {
    title: "Is this a loan for one single asset (a house, building, car, or project)?",
    example: "Example: a mortgage on one home, a loan on one office building, or a loan for one project company.",
    pcaf: "A loan for one house, one building, one vehicle, or one project should use that loan type instead of Use of Proceeds.",
    recap: (answers) => yesNoRecap(answers.debtBasedWithOneFullyAllocatedAsset),
  },
  singleAssetClass: {
    title: "What type of asset is that loan for?",
    example: "Example: choose Mortgage for a home, Commercial real estate for an office, or Project finance for a plant.",
    pcaf: "Choose the matching loan type for that one asset, such as a home mortgage or a commercial property loan.",
    recap: (answers) => singleAssetRecap(answers.singleAssetClass),
  },
  assetsOnIssuerBalanceSheet: {
    title: "Do the funded assets sit on the borrower’s own books?",
    example: "Example: Yes — a company’s green bond funding projects on its balance sheet. No — a fund or SPV that holds the assets separately.",
    pcaf: "If the funded assets sit on the borrower’s own books, this is integrated Use of Proceeds. If they sit in a separate fund or vehicle, this is separate Use of Proceeds.",
    recap: (answers) => yesNoRecap(answers.assetsOnIssuerBalanceSheet),
  },
};

function yesNoRecap(value: UopYesNo): string {
  if (value === "yes") return "Yes";
  if (value === "no") return "No";
  return "Not answered";
}

function singleAssetRecap(value: UopEligibilityAnswers["singleAssetClass"]): string {
  switch (value) {
    case "mortgage":
      return "Home mortgage";
    case "commercial-real-estate":
      return "Commercial property";
    case "motor-vehicle-loan":
      return "Vehicle loan";
    case "project-finance":
      return "Project";
    case "other":
      return "Another asset type";
    default:
      return "Not answered";
  }
}

export function uopOutcomeDisplay(outcome: UopAccountingOutcome): {
  heading: string;
  body: string;
  official: string;
} {
  if (outcome.kind === "uop" && outcome.classification === "separate") {
    return {
      heading: "Treat this as a separate Use of Proceeds investment",
      body: "The assets sit in a fund or special vehicle, not on the borrower’s own books. You will say how much of your money has already been assigned to those assets.",
      official: "",
    };
  }
  if (outcome.kind === "uop" && outcome.classification === "integrated") {
    return {
      heading: "Treat this as an integrated Use of Proceeds investment",
      body: "The assets sit on the borrower’s own books (for example a labeled bond or an earmarked loan). Both money already assigned and money still unassigned are in scope.",
      official: "",
    };
  }
  const redirects: Record<string, string> = {
    "customer-segment": "Treat this as ordinary lending or investment",
    "securitization-structured-products": "Treat this as a securitization, not Use of Proceeds",
    "project-finance": "Treat this as project finance",
    "listed-equity-corporate-bonds": "Treat this as listed shares or corporate bonds",
    "business-loans-unlisted-equity": "Treat this as a business loan or private shares",
    mortgages: "Treat this as a mortgage",
    "commercial-real-estate": "Treat this as a commercial property loan",
    "motor-vehicle-loans": "Treat this as a vehicle loan",
    "figure-5-1-step-6": "Treat this under the matching loan type",
  };
  return {
    heading: redirects[outcome.method] || outcome.title,
    body: outcome.guidance,
    official: "",
  };
}

/** Matching financed loan type when eligibility says this is not Use of Proceeds. */
export function uopRedirectLoanType(outcome: UopAccountingOutcome | null | undefined): string | null {
  if (!outcome || outcome.kind === "uop") return null;
  switch (outcome.method) {
    case "project-finance":
      return "project-finance";
    case "listed-equity-corporate-bonds":
      return "corporate-bond";
    case "business-loans-unlisted-equity":
      return "business-loan";
    case "mortgages":
      return "mortgage";
    case "commercial-real-estate":
      return "commercial-real-estate";
    case "motor-vehicle-loans":
      return "motor-vehicle-loan";
    default:
      return null;
  }
}

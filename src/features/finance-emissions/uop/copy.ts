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
    pcaf: "PCAF Figure 5.7-2 Question 1: proceeds allocated only to specific, identifiable assets. A green or sustainable label is not enough on its own.",
    recap: (answers) => yesNoRecap(answers.proceedsAllocatedToSpecificAssets),
  },
  isSecuritized: {
    title: "Is this a securitization (pooled loans sold as securities)?",
    example: "Example: RMBS, CMBS, CLO, or auto ABS — a separate company issues notes backed by a pool of loans.",
    pcaf: "PCAF Figure 5-1 Step 3b: legally distinct issuer of securities backed by loans, leases, or receivables is §5.8, not Use of Proceeds.",
    recap: (answers) => yesNoRecap(answers.isSecuritized),
  },
  structureHasControl: {
    title: "Does this vehicle control the underlying assets?",
    example: "Example: a holding company that consolidates subsidiaries. A minority stake in a fund usually does not have control.",
    pcaf: "PCAF Figure 5.7-2 Question 2: only equity structures can have control. Control or equity-share consolidation is treated as a corporate, not Use of Proceeds.",
    recap: (answers) => yesNoRecap(answers.structureHasControl),
  },
  controlOneFullyAllocatedAsset: {
    title: "Is all of the money going to one asset?",
    example: "Example: the vehicle exists only to own one power plant, and every rupee is tied to that plant.",
    pcaf: "PCAF Figure 5.7-2 Question 2 exception: one fully allocated asset that is a project is Project Finance.",
    recap: (answers) => yesNoRecap(answers.controlOneFullyAllocatedAsset),
  },
  controlAssetIsProject: {
    title: "Is that single asset a project?",
    example: "Example: a wind farm, toll road, or plant with its own financing — not a portfolio of many loans.",
    pcaf: "PCAF Table 5.7-1: a controlling structure with one fully allocated project uses the Project Finance method.",
    recap: (answers) => yesNoRecap(answers.controlAssetIsProject),
  },
  structureListing: {
    title: "Is this vehicle listed on a stock exchange?",
    example: "Example: listed = shares trade on an exchange. Unlisted = a private holding company.",
    pcaf: "PCAF Figure 5.7-2 Question 2: a controlling listed vehicle is listed equity / corporate bonds; unlisted is business loans and unlisted equity.",
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
    pcaf: "PCAF Figure 5.7-2 Question 3: debt-only financing fully allocated to one identifiable asset uses that asset class, not Use of Proceeds.",
    recap: (answers) => yesNoRecap(answers.debtBasedWithOneFullyAllocatedAsset),
  },
  singleAssetClass: {
    title: "What type of asset is that loan for?",
    example: "Example: choose Mortgage for a home, Commercial real estate for an office, or Project finance for a plant.",
    pcaf: "PCAF Figure 5-1 Step 6: select the matching asset class instead of Use of Proceeds.",
    recap: (answers) => singleAssetRecap(answers.singleAssetClass),
  },
  assetsOnIssuerBalanceSheet: {
    title: "Do the funded assets sit on the borrower’s own books?",
    example: "Example: Yes — a company’s green bond funding projects on its balance sheet. No — a fund or SPV that holds the assets separately.",
    pcaf: "PCAF Figure 5.7-2 Question 4: on the issuer balance sheet = Integrated Use of Proceeds; otherwise Separate Use of Proceeds (footnote 167).",
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
      official: `${outcome.title}. ${outcome.pcafRef}`,
    };
  }
  if (outcome.kind === "uop" && outcome.classification === "integrated") {
    return {
      heading: "Treat this as an integrated Use of Proceeds investment",
      body: "The assets sit on the borrower’s own books (for example a labeled bond or an earmarked loan). Both money already assigned and money still unassigned are in scope.",
      official: `${outcome.title}. ${outcome.pcafRef}`,
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
    official: `${outcome.title}. ${outcome.pcafRef}`,
  };
}

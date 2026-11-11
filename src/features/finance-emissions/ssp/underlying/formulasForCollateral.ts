import type { FormulaConfig } from "../../types/formula";
import { MORTGAGE_FORMULAS } from "../../config/mortgageFormulaConfigs";
import { COMMERCIAL_REAL_ESTATE_FORMULAS } from "../../config/commercialRealEstateFormulaConfigs";
import { MOTOR_VEHICLE_LOAN_FORMULAS } from "../../config/motorVehicleLoanFormulaConfigs";
import { LISTED_EQUITY_FORMULAS } from "../../config/corporateBondAndBusinessLoanFormulaConfigs";
import type { SspCollateralPcafClass } from "../types";
import type { SspClassInputsV1 } from "./classInputs";

export type UnderlyingApplicability =
  | { status: "supported"; formulas: FormulaConfig[]; notes?: string[] }
  | { status: "unsupported"; reason: string; notes?: string[] }
  | {
      status: "uncertain";
      reason: string;
      formulas: FormulaConfig[];
      notes: string[];
    };

const COMPANY_FORMULAS = LISTED_EQUITY_FORMULAS;

function isListedStructure(structure: string, collateralType: SspCollateralPcafClass): boolean {
  if (structure === "listed") return true;
  if (structure === "unlisted") return false;
  if (collateralType === "listed-equity" || collateralType === "corporate-bond") return true;
  if (collateralType === "unlisted-equity" || collateralType === "business-loan") return false;
  return false;
}

function matchListing(id: string, listed: boolean): boolean {
  return listed ? id.endsWith("-listed-equity") : id.includes("unlisted-equity");
}

function withUncertainty(
  formulas: FormulaConfig[],
  notes: string[]
): UnderlyingApplicability {
  if (!notes.length) return { status: "supported", formulas };
  return { status: "uncertain", reason: notes[0], formulas, notes };
}

/**
 * Resolve which standalone calculator formulas apply to an SSP collateral class.
 * Does not invent formulas — reuses existing config catalogs.
 */
export function formulasForCollateral(
  collateralType: SspCollateralPcafClass,
  method: SspClassInputsV1["methodSelection"]
): UnderlyingApplicability {
  switch (collateralType) {
    case "mortgage": {
      const allowed = ["1a", "1b", "2a", "2b", "3"];
      const picked = allowed.includes(method.calculationMethod) ? method.calculationMethod : null;
      return {
        status: "supported",
        formulas: MORTGAGE_FORMULAS.filter((f) =>
          picked ? f.optionCode === picked : allowed.includes(f.optionCode)
        ),
        notes: [
          "Mortgage look-through uses the same Table 10.1-5 options as the standalone mortgage calculator.",
        ],
      };
    }
    case "commercial-real-estate": {
      const allowed = ["1a", "1b", "2a", "2b", "3"];
      const picked = allowed.includes(method.calculationMethod) ? method.calculationMethod : null;
      return {
        status: "supported",
        formulas: COMMERCIAL_REAL_ESTATE_FORMULAS.filter((f) =>
          picked ? f.optionCode === picked : allowed.includes(f.optionCode)
        ),
      };
    }
    case "motor-vehicle-loan": {
      const allowed = ["1a", "1b", "2a", "2b", "3a", "3b"];
      const picked = allowed.includes(method.calculationMethod) ? method.calculationMethod : null;
      return {
        status: "supported",
        formulas: MOTOR_VEHICLE_LOAN_FORMULAS.filter((f) =>
          picked ? f.optionCode === picked : allowed.includes(f.optionCode)
        ),
      };
    }
    case "business-loan":
    case "unlisted-equity":
    case "corporate-bond":
    case "listed-equity": {
      const listed = isListedStructure(method.corporateStructure, collateralType);
      const notes: string[] = [];
      if (
        (collateralType === "listed-equity" && !listed) ||
        (collateralType === "unlisted-equity" && listed)
      ) {
        notes.push(
          "Equity collateral type and listed/unlisted selection disagree — confirm which denominator applies before Phase 6C."
        );
      }
      if (collateralType === "corporate-bond" || collateralType === "listed-equity") {
        notes.push(
          "SSP Table 5.8-2 maps listed exposures to corporate bond / listed equity methods; confirm tranche/collateral mapping with methodology review."
        );
      }
      if (method.hasEmissions === "yes") {
        if (method.verificationStatus === "verified") {
          return withUncertainty(
            COMPANY_FORMULAS.filter(
              (f) => f.id === (listed ? "1a-listed-equity" : "1a-unlisted-equity")
            ),
            notes
          );
        }
        if (method.verificationStatus === "unverified") {
          return withUncertainty(
            COMPANY_FORMULAS.filter(
              (f) => f.id === (listed ? "1b-listed-equity" : "1b-unlisted-equity")
            ),
            notes
          );
        }
        return {
          status: "supported",
          formulas: [],
          notes: ["Select verification status to lock Option 1a or 1b."],
        };
      }
      if (method.hasEmissions === "no") {
        const allowed = ["2a", "2b", "3a", "3c"];
        const picked = allowed.includes(method.calculationMethod) ? method.calculationMethod : null;
        return withUncertainty(
          COMPANY_FORMULAS.filter(
            (f) =>
              matchListing(f.id, listed) &&
              (picked ? f.optionCode === picked : allowed.includes(f.optionCode))
          ),
          notes
        );
      }
      return {
        status: "supported",
        formulas: [],
        notes: ["Answer whether company GHG emissions are available to select a method."],
      };
    }
    case "other-hard-asset":
      return {
        status: "unsupported",
        reason:
          "No standalone ‘other hard asset’ PCAF questionnaire exists yet. Collect asset value and scopes manually; method mapping needs methodology review before Phase 6C.",
      };
    case "":
      return { status: "unsupported", reason: "Select a collateral PCAF class first." };
    default:
      return {
        status: "uncertain",
        reason: `Collateral class “${collateralType}” has no confirmed SSP look-through questionnaire mapping.`,
        formulas: [],
        notes: [
          "Do not assume every standalone asset-class method applies to every SSP collateral type.",
        ],
      };
  }
}

export function selectedFormula(
  applicability: UnderlyingApplicability,
  pcafMethodOption: string
): FormulaConfig | null {
  if (applicability.status === "unsupported") return null;
  const formulas = applicability.formulas;
  if (!formulas.length) return null;
  if (pcafMethodOption) {
    const byId = formulas.find((f) => f.id === pcafMethodOption);
    if (byId) return byId;
    const byOption = formulas.find((f) => f.optionCode === pcafMethodOption);
    if (byOption) return byOption;
  }
  return formulas.length === 1 ? formulas[0] : null;
}

export function optionChoices(applicability: UnderlyingApplicability): FormulaConfig[] {
  if (applicability.status === "unsupported") return [];
  const seen = new Set<string>();
  const out: FormulaConfig[] = [];
  for (const f of applicability.formulas) {
    if (seen.has(f.optionCode)) continue;
    seen.add(f.optionCode);
    out.push(f);
  }
  return out;
}

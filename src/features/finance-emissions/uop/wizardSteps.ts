import { resolveUopAccounting, uopQualifiesForMethod } from "./eligibility";
import type { UopDraft } from "./types";

export type UopWizardStepId =
  | "uop-eligibility"
  | "uop-structure"
  | "uop-allocation"
  | "uop-emissions"
  | "uop-review"
  | "uop-emissions-path"
  | "uop-holdings"
  | "uop-assets";

export type UopWizardStep = {
  id: Exclude<UopWizardStepId, "uop-emissions-path" | "uop-holdings" | "uop-assets">;
  title: string;
  shortTitle: string;
  description: string;
};

export const UOP_STAGE_IDS = [
  "uop-eligibility",
  "uop-structure",
  "uop-allocation",
  "uop-emissions",
  "uop-review",
] as const;

export function isUopWizardStepId(id: string | null | undefined): boolean {
  return String(id || "").startsWith("uop-");
}

export function uopWizardSteps(draft: UopDraft | null | undefined): UopWizardStep[] {
  const resolved = draft ? resolveUopAccounting(draft.eligibility) : null;
  const steps: UopWizardStep[] = [
    {
      id: "uop-eligibility",
      title: "Financing type",
      shortTitle: "Type",
      description: "Check whether this deal is Use of Proceeds",
    },
  ];
  if (!resolved || !uopQualifiesForMethod(resolved)) return steps;
  steps.push(
    {
      id: "uop-structure",
      title: "Investment details",
      shortTitle: "Details",
      description: "Name, amounts, and documents",
    },
    {
      id: "uop-allocation",
      title: "Funded assets",
      shortTitle: "Assets",
      description:
        resolved.classification === "separate"
          ? "How much has been assigned, and to which assets"
          : "Assigned amounts, leftover funds, and funded assets",
    },
    {
      id: "uop-emissions",
      title: "Emissions data",
      shortTitle: "Emissions",
      description: "Issuer report, asset figures, or an approved factor",
    },
    {
      id: "uop-review",
      title: "Review and results",
      shortTitle: "Review",
      description: "Check the figures and calculate a preview",
    }
  );
  return steps;
}

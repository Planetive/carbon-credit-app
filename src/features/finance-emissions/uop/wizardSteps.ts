import { resolveUopAccounting, uopQualifiesForMethod } from "./eligibility";
import { assetsRequired } from "./validation";
import type { UopDraft } from "./types";

export type UopWizardStepId =
  | "uop-eligibility"
  | "uop-guidance"
  | "uop-structure"
  | "uop-emissions-path"
  | "uop-holdings"
  | "uop-assets";

export type UopWizardStep = {
  id: UopWizardStepId;
  title: string;
  description: string;
};

export function uopWizardSteps(draft: UopDraft | null | undefined): UopWizardStep[] {
  const resolved = draft ? resolveUopAccounting(draft.eligibility) : null;
  const steps: UopWizardStep[] = [
    {
      id: "uop-eligibility",
      title: "Check this financing",
      description: "A few yes/no questions",
    },
  ];
  if (!resolved) return steps;
  if (!uopQualifiesForMethod(resolved)) {
    steps.push({
      id: "uop-guidance",
      title: "Use a different method",
      description: "This is not calculated as Use of Proceeds",
    });
    return steps;
  }
  steps.push(
    {
      id: "uop-structure",
      title: "Describe the financing",
      description: "Name, amounts, and documents",
    },
    {
      id: "uop-emissions-path",
      title: "Where emissions come from",
      description: "Issuer report, assets, or estimate",
    },
    {
      id: "uop-holdings",
      title: resolved.classification === "separate" ? "How much has been assigned" : "Assigned and leftover proceeds",
      description:
        resolved.classification === "separate"
          ? "Leftover cash in a separate vehicle is not treated as emissions"
          : "Assigned and leftover amounts are both in scope",
    }
  );
  if (draft && assetsRequired(draft)) {
    steps.push({
      id: "uop-assets",
      title: "Assets that received the money",
      description: "Each asset is listed separately",
    });
  }
  return steps;
}

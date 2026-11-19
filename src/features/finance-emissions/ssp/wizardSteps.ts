import { resolveSspAccounting, sspQualifiesForMethod } from "./eligibility";
import type { SspDraft } from "./types";

export type SspWizardStepId = "ssp-eligibility" | "ssp-deal" | "ssp-structure" | "ssp-review";

export type SspWizardStep = {
  id: SspWizardStepId;
  title: string;
  shortTitle: string;
  description: string;
};

export function isSspWizardStepId(id: string | null | undefined): boolean {
  return String(id || "").startsWith("ssp-");
}

export function sspWizardSteps(draft: SspDraft | null | undefined): SspWizardStep[] {
  const resolved = draft ? resolveSspAccounting(draft.eligibility) : null;
  const steps: SspWizardStep[] = [
    {
      id: "ssp-eligibility",
      title: "Eligibility",
      shortTitle: "Eligibility",
      description: "Confirm whether securitization accounting applies",
    },
  ];
  if (!resolved || !sspQualifiesForMethod(resolved)) return steps;
  steps.push(
    {
      id: "ssp-deal",
      title: "Deal details",
      shortTitle: "Deal details",
      description: "Name, structure, year and documentation",
    },
    {
      id: "ssp-structure",
      title: "Assets & structure",
      shortTitle: "Assets & structure",
      description: "Underlying assets, pools, tranches and your investment",
    },
    {
      id: "ssp-review",
      title: "Review",
      shortTitle: "Review",
      description: "Check the structure and calculate financed emissions",
    }
  );
  return steps;
}

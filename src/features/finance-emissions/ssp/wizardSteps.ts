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
      title: "Is this a securitization?",
      shortTitle: "Screen",
      description: "Check whether securitization accounting applies, or another method",
    },
  ];
  if (!resolved || !sspQualifiesForMethod(resolved)) return steps;
  steps.push(
    {
      id: "ssp-deal",
      title: "Deal information",
      shortTitle: "Deal",
      description: "Name, structure, year, and documentation",
    },
    {
      id: "ssp-structure",
      title: "Collateral, pools and tranches",
      shortTitle: "Structure",
      description: "Build the look-through hierarchy",
    },
    {
      id: "ssp-review",
      title: "Review",
      shortTitle: "Review",
      description: "Check the structure, then run a backend preview Calculate (reportable Save stays off)",
    }
  );
  return steps;
}

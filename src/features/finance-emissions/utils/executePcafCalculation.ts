import type { FinancedLocalResult } from "@/api/financedConnection";
import { resolveFinancedCalculation } from "@/api/financedConnection";
import { resolveSovereignFinancedCalculation } from "./sovereignPcafRunner";

export async function executePcafCalculation(opts: {
  loanTypeKey: string;
  formulaId: string;
  pcafInputs: Record<string, unknown>;
  companyType: string;
  counterparty_id?: string | null;
  persist?: boolean;
}): Promise<FinancedLocalResult> {
  const {
    loanTypeKey,
    formulaId,
    pcafInputs,
    companyType,
    counterparty_id,
    persist,
  } = opts;

  if (loanTypeKey === "sovereign-debt") {
    return resolveSovereignFinancedCalculation({
      formula_id: formulaId,
      company_type: companyType,
      inputs: pcafInputs,
      counterparty_id,
      persist,
    });
  }

  return resolveFinancedCalculation({
    calc_kind: "finance",
    formula_id: formulaId,
    company_type: companyType,
    inputs: pcafInputs,
    counterparty_id,
    persist,
  });
}

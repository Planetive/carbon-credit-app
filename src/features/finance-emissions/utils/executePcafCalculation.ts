import type { CalculationStepDto } from "@/features/finance-emissions/types/contracts";
import { CalculationEngine } from "@/features/finance-emissions/engines/CalculationEngine";
import {
  resolveFinancedCalculation,
  type FinancedLocalResult,
} from "@/api/financedConnection";
import { resolveSovereignFinancedCalculation } from "./sovereignPcafRunner";

const pcafEngine = new CalculationEngine();

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

  const local = pcafEngine.calculate(formulaId, pcafInputs, companyType);
  return resolveFinancedCalculation({
    calc_kind: "finance",
    formula_id: formulaId,
    company_type: companyType,
    inputs: pcafInputs,
    counterparty_id,
    persist,
    local: {
      attributionFactor: local.attributionFactor,
      financedEmissions: local.financedEmissions,
      dataQualityScore: local.dataQualityScore,
      methodology: local.methodology,
      calculationSteps: local.calculationSteps as CalculationStepDto[],
      emissionFactor: local.emissionFactor,
    },
  });
}

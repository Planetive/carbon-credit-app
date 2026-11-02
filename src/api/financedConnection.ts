/**
 * FastAPI is the only authoritative PCAF calculator.
 * Local engine results are never used as a silent fallback for reportable saves.
 */

import type { CalculationStepDto } from "@/features/finance-emissions/types/contracts";
import type { FinancedScopeBreakdown } from "@/features/finance-emissions/utils/financedScopeBreakdown";
import {
  requestAuthoritativePcafCalculation,
  type AuthoritativePcafResult,
} from "@/features/finance-emissions/utils/pcafAuthority";

export type FinancedLocalResult = {
  authority: "backend";
  formulaId: string;
  inputFingerprint: string;
  attributionFactor: number;
  financedEmissions: number;
  dataQualityScore?: number;
  methodology?: string;
  calculationSteps?: CalculationStepDto[];
  emissionFactor?: number;
  emissionsUnit?: "tCO2e";
  scopeBreakdown?: FinancedScopeBreakdown;
};

function toLocalResult(result: AuthoritativePcafResult): FinancedLocalResult {
  return {
    authority: "backend",
    formulaId: result.formulaId,
    inputFingerprint: result.inputFingerprint,
    attributionFactor: result.attributionFactor,
    financedEmissions: result.financedEmissions,
    dataQualityScore: result.dataQualityScore,
    methodology: result.methodology,
    calculationSteps: result.calculationSteps,
    emissionFactor: result.emissionFactor,
    emissionsUnit: result.emissionsUnit,
    scopeBreakdown: result.scopeBreakdown,
  };
}

/**
 * Request a validated backend calculation. `local` is ignored and never applied.
 */
export async function resolveFinancedCalculation(opts: {
  calc_kind?: "finance" | "facilitated" | string;
  formula_id: string;
  company_type: string;
  inputs: Record<string, unknown>;
  /** Ignored. Kept so existing callers compile; never used as fallback. */
  local?: {
    attributionFactor: number;
    financedEmissions: number;
    dataQualityScore?: number;
    methodology?: string;
    calculationSteps?: CalculationStepDto[];
    emissionFactor?: number;
  };
  persist?: boolean;
  counterparty_id?: string | null;
  exposure_id?: string | null;
  currentFingerprint?: string;
}): Promise<FinancedLocalResult> {
  const confirmed = await requestAuthoritativePcafCalculation({
    calc_kind: opts.calc_kind,
    formula_id: opts.formula_id,
    company_type: opts.company_type,
    inputs: opts.inputs,
    persist: opts.persist,
    counterparty_id: opts.counterparty_id,
    exposure_id: opts.exposure_id,
    currentFingerprint: opts.currentFingerprint,
  });
  return toLocalResult(confirmed);
}

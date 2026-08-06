/**
 * Local PCAF math stays instant; when JWT is on, confirm via
 * POST /api/v1/financed-emissions/calculate (persist defaults false for preview).
 */

import { USE_JWT_AUTH } from "./config";
import { calculateFinancedEmission } from "./financed";
import type { CalculationStepDto } from "@/features/finance-emissions/types/contracts";

export type FinancedLocalResult = {
  attributionFactor: number;
  financedEmissions: number;
  dataQualityScore?: number;
  methodology?: string;
  calculationSteps?: CalculationStepDto[];
  emissionFactor?: number;
};

function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function mapSteps(raw: unknown): CalculationStepDto[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.map((s) => {
    const row = s as Record<string, unknown>;
    return {
      step: String(row.step ?? ""),
      value: num(row.value, 0),
      formula: String(row.formula ?? ""),
    };
  });
}

/**
 * @param persist false for preview; true only when intentionally writing via calculate
 */
export async function resolveFinancedCalculation(opts: {
  calc_kind?: "finance" | "facilitated" | string;
  formula_id: string;
  company_type: string;
  inputs: Record<string, unknown>;
  local: FinancedLocalResult;
  persist?: boolean;
  counterparty_id?: string | null;
  exposure_id?: string | null;
}): Promise<FinancedLocalResult> {
  if (!USE_JWT_AUTH) return opts.local;

  const companyType =
    opts.company_type === "private" || opts.company_type === "unlisted"
      ? "unlisted"
      : opts.company_type === "listed"
        ? "listed"
        : opts.company_type;

  try {
    const res = await calculateFinancedEmission({
      calc_kind: opts.calc_kind ?? "finance",
      formula_id: opts.formula_id,
      company_type: companyType,
      inputs: opts.inputs,
      counterparty_id: opts.counterparty_id,
      exposure_id: opts.exposure_id,
      persist: opts.persist ?? false,
    });

    const r = (res.result || {}) as Record<string, unknown>;
    return {
      attributionFactor: num(r.attribution_factor, opts.local.attributionFactor),
      financedEmissions: num(r.financed_emissions, opts.local.financedEmissions),
      dataQualityScore:
        r.data_quality_score == null
          ? opts.local.dataQualityScore
          : num(r.data_quality_score, opts.local.dataQualityScore ?? 0),
      methodology:
        typeof r.methodology === "string"
          ? r.methodology
          : opts.local.methodology,
      calculationSteps:
        mapSteps(r.calculation_steps) ?? opts.local.calculationSteps,
      emissionFactor:
        r.emission_factor == null
          ? opts.local.emissionFactor
          : num(r.emission_factor, opts.local.emissionFactor ?? 0),
    };
  } catch (err) {
    console.warn(
      "[financedConnection] calculate API failed; using local PCAF math",
      err
    );
    return opts.local;
  }
}

/**
 * Sovereign debt PCAF runs on the backend when JWT auth is enabled.
 * PPP-adjusted GDP is resolved server-side from ref.ppp_adjusted_gdp.
 */

import { USE_JWT_AUTH } from "@/api/config";
import { calculateFinancedEmission } from "@/api/financed";
import { resolvePppGdpForCountryName } from "@/features/finance-emissions/api/pppAdjustedGdp";
import { CalculationEngine } from "@/features/finance-emissions/engines/CalculationEngine";
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

async function enrichSovereignInputs(
  inputs: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const enriched = { ...inputs, resolve_ppp_gdp: true };

  const countryName = String(inputs.sovereign_country_name ?? "").trim();
  if (countryName && !num(inputs.pp_adjusted_gdp, 0)) {
    const resolved = await resolvePppGdpForCountryName(countryName);
    if (resolved) {
      enriched.pp_adjusted_gdp = resolved.value;
      enriched.ppp_gdp_year = resolved.year;
      enriched.ppp_gdp_used_fallback = resolved.usedFallback;
    }
  }

  const proxyCountry = String(inputs.proxy_sovereign_country_name ?? "").trim();
  if (proxyCountry && !num(inputs.proxy_pp_adjusted_gdp, 0)) {
    const resolved = await resolvePppGdpForCountryName(proxyCountry);
    if (resolved) {
      enriched.proxy_pp_adjusted_gdp = resolved.value;
      enriched.proxy_ppp_gdp_year = resolved.year;
      enriched.proxy_ppp_gdp_used_fallback = resolved.usedFallback;
    }
  }

  if (String(inputs.sector_key ?? "").trim() || String(inputs.sector_code ?? "").trim()) {
    enriched.resolve_sector_intensity = true;
  }

  return enriched;
}

/**
 * Sovereign debt: backend-only when JWT is on; dev fallback uses local engine + DB-resolved PPP.
 */
export async function resolveSovereignFinancedCalculation(opts: {
  formula_id: string;
  company_type: string;
  inputs: Record<string, unknown>;
  persist?: boolean;
  counterparty_id?: string | null;
  exposure_id?: string | null;
}): Promise<FinancedLocalResult> {
  const inputs = await enrichSovereignInputs(opts.inputs);

  if (!num(inputs.pp_adjusted_gdp, 0)) {
    throw new Error(
      "Select a sovereign country with PPP-adjusted GDP data before calculating."
    );
  }

  const companyType =
    opts.company_type === "private" || opts.company_type === "unlisted"
      ? "unlisted"
      : opts.company_type === "listed"
        ? "listed"
        : opts.company_type;

  if (USE_JWT_AUTH) {
    const res = await calculateFinancedEmission({
      calc_kind: "finance",
      formula_id: opts.formula_id,
      company_type: companyType,
      inputs,
      counterparty_id: opts.counterparty_id,
      exposure_id: opts.exposure_id,
      persist: opts.persist ?? false,
    });

    const r = (res.result || {}) as Record<string, unknown>;
    return {
      attributionFactor: num(r.attribution_factor, 0),
      financedEmissions: num(r.financed_emissions, 0),
      dataQualityScore:
        r.data_quality_score == null ? undefined : num(r.data_quality_score, 0),
      methodology: typeof r.methodology === "string" ? r.methodology : undefined,
      calculationSteps: mapSteps(r.calculation_steps),
      emissionFactor:
        r.emission_factor == null ? undefined : num(r.emission_factor, 0),
    };
  }

  const localEngine = new CalculationEngine();
  const local = localEngine.calculate(opts.formula_id, inputs, companyType);
  return {
    attributionFactor: local.attributionFactor,
    financedEmissions: local.financedEmissions,
    dataQualityScore: local.dataQualityScore,
    methodology: local.methodology,
    calculationSteps: local.calculationSteps,
    emissionFactor: local.emissionFactor,
  };
}

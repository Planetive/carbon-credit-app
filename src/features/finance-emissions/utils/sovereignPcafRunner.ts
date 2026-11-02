/**
 * Sovereign debt PCAF runs on FastAPI. PPP-adjusted GDP is resolved server-side
 * when JWT is enabled; a country still must be selected before the request.
 */

import { resolvePppGdpForCountryName } from "@/features/finance-emissions/api/pppAdjustedGdp";
import type { FinancedLocalResult } from "@/api/financedConnection";
import { requestAuthoritativePcafCalculation } from "./pcafAuthority";

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function enrichSovereignInputs(
  inputs: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const enriched = { ...inputs, resolve_ppp_gdp: true };

  const countryName = String(inputs.sovereign_country_name ?? "").trim();
  if (countryName && !num(inputs.pp_adjusted_gdp)) {
    const resolved = await resolvePppGdpForCountryName(countryName);
    if (resolved) {
      enriched.pp_adjusted_gdp = resolved.value;
      enriched.ppp_gdp_year = resolved.year;
      enriched.ppp_gdp_used_fallback = resolved.usedFallback;
    }
  }

  const proxyCountry = String(inputs.proxy_sovereign_country_name ?? "").trim();
  if (proxyCountry && !num(inputs.proxy_pp_adjusted_gdp)) {
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

export async function resolveSovereignFinancedCalculation(opts: {
  formula_id: string;
  company_type: string;
  inputs: Record<string, unknown>;
  persist?: boolean;
  counterparty_id?: string | null;
  exposure_id?: string | null;
}): Promise<FinancedLocalResult> {
  const inputs = await enrichSovereignInputs(opts.inputs);

  if (!num(inputs.pp_adjusted_gdp)) {
    throw new Error(
      "Select a sovereign country with PPP-adjusted GDP data before calculating."
    );
  }

  const confirmed = await requestAuthoritativePcafCalculation({
    calc_kind: "finance",
    formula_id: opts.formula_id,
    company_type: opts.company_type,
    inputs,
    persist: opts.persist,
    counterparty_id: opts.counterparty_id,
    exposure_id: opts.exposure_id,
  });

  return {
    authority: "backend",
    formulaId: confirmed.formulaId,
    inputFingerprint: confirmed.inputFingerprint,
    attributionFactor: confirmed.attributionFactor,
    financedEmissions: confirmed.financedEmissions,
    dataQualityScore: confirmed.dataQualityScore,
    methodology: confirmed.methodology,
    calculationSteps: confirmed.calculationSteps,
    emissionFactor: confirmed.emissionFactor,
    emissionsUnit: confirmed.emissionsUnit,
    scopeBreakdown: confirmed.scopeBreakdown,
  };
}

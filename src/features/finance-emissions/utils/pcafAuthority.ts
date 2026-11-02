/**
 * Backend-authoritative PCAF calculation.
 * Local engine math is preview-only and must never be persisted as a reportable result.
 */

import * as apiConfig from "@/api/config";
import { ApiError } from "@/api/client";
import { calculateFinancedEmission } from "@/api/financed";
import type { CalculationStepDto } from "@/features/finance-emissions/types/contracts";
import {
  parseFinancedScopeBreakdown,
  type FinancedScopeBreakdown,
} from "./financedScopeBreakdown";

export const PCAF_EMISSIONS_UNIT = "tCO2e";

export const FASTAPI_CONFIG_MESSAGE =
  "Reportable PCAF calculations require FastAPI. Set VITE_USE_JWT_AUTH=true and VITE_BACKEND_URL to your API (for example https://api.rethinkcarbon.io), then sign in with JWT. Local preview cannot be saved as a reportable result.";

export type PcafAuthorityCode =
  | "CONFIG"
  | "UNAVAILABLE"
  | "VALIDATION"
  | "UNSUPPORTED"
  | "INVALID_RESPONSE"
  | "STALE"
  | "MISSING_FACTOR";

export class PcafAuthorityError extends Error {
  code: PcafAuthorityCode;
  constructor(code: PcafAuthorityCode, message: string) {
    super(message);
    this.name = "PcafAuthorityError";
    this.code = code;
  }
}

export type AuthoritativePcafResult = {
  authority: "backend";
  formulaId: string;
  inputFingerprint: string;
  attributionFactor: number;
  financedEmissions: number;
  dataQualityScore: number;
  methodology: string;
  calculationSteps: CalculationStepDto[];
  emissionFactor?: number;
  emissionsUnit: typeof PCAF_EMISSIONS_UNIT;
  optionCode?: string;
  scopeBreakdown: FinancedScopeBreakdown;
};

export type PreviewPcafResult = {
  authority: "preview";
  formulaId: string;
  inputFingerprint: string;
  attributionFactor: number;
  financedEmissions: number;
  dataQualityScore?: number;
  methodology?: string;
  calculationSteps?: CalculationStepDto[];
  emissionFactor?: number;
};

export function isBackendCalculationAvailable(): boolean {
  return Boolean(apiConfig.USE_JWT_AUTH && apiConfig.BACKEND_URL);
}

export function assertReportableResults(
  results: Array<{ authority?: string } | null | undefined>
): void {
  if (!results.length) {
    throw new PcafAuthorityError(
      "INVALID_RESPONSE",
      "No backend-validated PCAF result is available to save."
    );
  }
  if (results.some((result) => result?.authority !== "backend")) {
    throw new PcafAuthorityError(
      "INVALID_RESPONSE",
      "Only FastAPI-validated PCAF results can be saved as reportable. Recalculate after the API is available."
    );
  }
}

export function pcafCompanyTypeFromStructure(
  corporateStructure: string | null | undefined
): "listed" | "private" {
  return corporateStructure === "listed" ? "listed" : "private";
}

/** Value snapshot so cloned objects with the same fields do not look like input edits. */
export function financeWizardInputSignature(state: unknown): string {
  return JSON.stringify(state);
}

export function fingerprintPcafInputs(
  formulaId: string,
  inputs: Record<string, unknown>
): string {
  const skip = new Set([
    "financing_instance_id",
    "instance_key",
    "pcaf_formula_id",
  ]);
  const keys = Object.keys(inputs)
    .filter((key) => !skip.has(key))
    .sort();
  return JSON.stringify({
    formulaId,
    values: keys.map((key) => [key, inputs[key]]),
  });
}

function finiteNumber(value: unknown, label: string): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    throw new PcafAuthorityError(
      "INVALID_RESPONSE",
      `The calculation API returned a non-finite ${label}. Reportable save is blocked.`
    );
  }
  return n;
}

function mapSteps(raw: unknown): CalculationStepDto[] {
  if (!Array.isArray(raw)) {
    throw new PcafAuthorityError(
      "INVALID_RESPONSE",
      "The calculation API omitted calculation steps. Reportable save is blocked."
    );
  }
  return raw.map((step) => {
    const row = (step ?? {}) as Record<string, unknown>;
    return {
      step: String(row.step ?? ""),
      value: finiteNumber(row.value, "calculation step value"),
      formula: String(row.formula ?? ""),
    };
  });
}

export function validateAuthoritativePcafResult(
  raw: Record<string, unknown> | null | undefined,
  expected: { formulaId: string; fingerprint: string }
): AuthoritativePcafResult {
  if (!raw || typeof raw !== "object") {
    throw new PcafAuthorityError(
      "INVALID_RESPONSE",
      "The calculation API returned an empty result. Reportable save is blocked."
    );
  }

  const metadata =
    raw.metadata && typeof raw.metadata === "object"
      ? (raw.metadata as Record<string, unknown>)
      : {};
  const formulaId = String(metadata.formula_id ?? raw.formula_id ?? "");
  if (!formulaId || formulaId !== expected.formulaId) {
    throw new PcafAuthorityError(
      "INVALID_RESPONSE",
      `The calculation API result does not match formula ${expected.formulaId}. Reportable save is blocked.`
    );
  }

  const unit = String(
    raw.emissions_unit ?? metadata.emissions_unit ?? PCAF_EMISSIONS_UNIT
  );
  if (unit !== PCAF_EMISSIONS_UNIT) {
    throw new PcafAuthorityError(
      "INVALID_RESPONSE",
      `The calculation API used unit ${unit} instead of ${PCAF_EMISSIONS_UNIT}. Reportable save is blocked.`
    );
  }

  const financedEmissions = finiteNumber(raw.financed_emissions, "financed emissions");
  const attributionFactor = finiteNumber(
    raw.attribution_factor,
    "attribution factor"
  );
  const dataQualityScore = finiteNumber(
    raw.data_quality_score,
    "data-quality score"
  );
  if (dataQualityScore < 1 || dataQualityScore > 5) {
    throw new PcafAuthorityError(
      "INVALID_RESPONSE",
      "The calculation API returned an invalid data-quality score. Reportable save is blocked."
    );
  }

  const methodology = String(raw.methodology ?? "").trim();
  if (!methodology) {
    throw new PcafAuthorityError(
      "INVALID_RESPONSE",
      "The calculation API omitted methodology identity. Reportable save is blocked."
    );
  }

  const emissionFactor =
    raw.emission_factor == null
      ? undefined
      : finiteNumber(raw.emission_factor, "emission factor");

  let scopeBreakdown: FinancedScopeBreakdown;
  try {
    scopeBreakdown = parseFinancedScopeBreakdown(raw, financedEmissions);
  } catch (error) {
    throw new PcafAuthorityError(
      "INVALID_RESPONSE",
      error instanceof Error
        ? error.message
        : "The calculation API returned an invalid financed scope breakdown."
    );
  }

  return {
    authority: "backend",
    formulaId,
    inputFingerprint: expected.fingerprint,
    attributionFactor,
    financedEmissions,
    dataQualityScore,
    methodology,
    calculationSteps: mapSteps(raw.calculation_steps),
    emissionFactor,
    emissionsUnit: PCAF_EMISSIONS_UNIT,
    optionCode:
      typeof metadata.option_code === "string" ? metadata.option_code : undefined,
    scopeBreakdown,
  };
}

export function assertCurrentFingerprint(
  expected: string,
  current: string
): void {
  if (expected !== current) {
    throw new PcafAuthorityError(
      "STALE",
      "Inputs changed before the calculation finished. Recalculate to save a reportable result."
    );
  }
}

export function isReportablePcafResult(
  result: { authority?: string } | null | undefined
): result is AuthoritativePcafResult {
  return result?.authority === "backend";
}

function mapApiError(err: unknown): PcafAuthorityError {
  if (err instanceof PcafAuthorityError) return err;
  if (err instanceof ApiError) {
    const message = err.message || "Calculation request failed.";
    const lower = message.toLowerCase();
    if (err.status === 400 && (lower.includes("not found") || lower.includes("unsupported"))) {
      return new PcafAuthorityError("UNSUPPORTED", message);
    }
    if (lower.includes("emission factor") || lower.includes("sector intensity")) {
      return new PcafAuthorityError("MISSING_FACTOR", message);
    }
    if (err.status === 400) {
      return new PcafAuthorityError("VALIDATION", message);
    }
    if (err.status === 0 || err.status >= 500) {
      return new PcafAuthorityError(
        "UNAVAILABLE",
        `${message} Questionnaire data was kept. Reportable results were not saved.`
      );
    }
    return new PcafAuthorityError("UNAVAILABLE", message);
  }
  if (err instanceof Error && /failed to fetch|network/i.test(err.message)) {
    return new PcafAuthorityError(
      "UNAVAILABLE",
      "The calculation API is unavailable. Questionnaire data was kept. Reportable results were not saved."
    );
  }
  return new PcafAuthorityError(
    "UNAVAILABLE",
    err instanceof Error
      ? err.message
      : "The calculation API is unavailable. Questionnaire data was kept. Reportable results were not saved."
  );
}

export async function requestAuthoritativePcafCalculation(opts: {
  calc_kind?: "finance" | "facilitated" | string;
  formula_id: string;
  company_type: string;
  inputs: Record<string, unknown>;
  persist?: boolean;
  counterparty_id?: string | null;
  exposure_id?: string | null;
  currentFingerprint?: string;
}): Promise<AuthoritativePcafResult> {
  if (!isBackendCalculationAvailable()) {
    throw new PcafAuthorityError("CONFIG", FASTAPI_CONFIG_MESSAGE);
  }

  const fingerprint = fingerprintPcafInputs(opts.formula_id, opts.inputs);
  if (opts.currentFingerprint) {
    assertCurrentFingerprint(fingerprint, opts.currentFingerprint);
  }

  const companyType =
    opts.company_type === "private" || opts.company_type === "unlisted"
      ? "unlisted"
      : opts.company_type === "listed"
        ? "listed"
        : opts.company_type;

  let res: { success?: boolean; result?: Record<string, unknown> };
  try {
    res = await calculateFinancedEmission({
      calc_kind: opts.calc_kind ?? "finance",
      formula_id: opts.formula_id,
      company_type: companyType,
      inputs: opts.inputs,
      counterparty_id: opts.counterparty_id,
      exposure_id: opts.exposure_id,
      persist: opts.persist ?? false,
    });
  } catch (err) {
    throw mapApiError(err);
  }

  if (res?.success !== true || !res.result) {
    throw new PcafAuthorityError(
      "INVALID_RESPONSE",
      "The calculation API did not return a successful result payload. Reportable save is blocked."
    );
  }

  const validated = validateAuthoritativePcafResult(res.result, {
    formulaId: opts.formula_id,
    fingerprint,
  });
  if (opts.currentFingerprint) {
    assertCurrentFingerprint(validated.inputFingerprint, opts.currentFingerprint);
  }
  return validated;
}

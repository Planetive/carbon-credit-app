import { PcafAuthorityError } from "../utils/pcafAuthority";
import { SSP_LOAN_TYPE } from "../config/loanTypeOptions";
import { canPreviewCalculateSsp, sspPreviewCalculateBlockers } from "./previewGate";
import type { SspDraft } from "./types";

/**
 * Reportable holding Save is gated for production. Isolated UAT may set
 * VITE_SSP_REPORTABLE_SAVE_AVAILABLE=true in `.env.ssp-e2e` only.
 */
function envFlagTrue(name: string): boolean {
  const value = String((import.meta.env as Record<string, unknown>)[name] ?? "")
    .trim()
    .toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

export const SSP_CALCULATE_AVAILABLE = true;
/** Production default false unless Vite env explicitly enables for UAT. */
export const SSP_REPORTABLE_SAVE_AVAILABLE = envFlagTrue("VITE_SSP_REPORTABLE_SAVE_AVAILABLE");
export const SSP_DRAFT_API_AVAILABLE = true;
export const SSP_BACKEND_AVAILABLE = true;

export const SSP_CALCULATE_BLOCKED_MESSAGE =
  "This securitization structure cannot be calculated yet. Use a supported single-pool deal with complete inputs, or finish the questionnaire.";

export const SSP_REPORTABLE_BLOCKED_MESSAGE =
  "Calculation preview only. Results have not been added to your portfolio.";

const IMPLEMENTED_SSP_FORMULAS = new Set(["ssp-lookthrough", "ssp-reported-pool"]);

export type SspCalculationResult = {
  status?: string | null;
  formula_id?: string | null;
  financed_emissions?: number | null;
  calculation_fingerprint?: string | null;
  pool_of_pools?: unknown;
  poolOfPools?: unknown;
  structure_type?: string | null;
  iaf?: number | null;
  is_reportable?: boolean;
  include_in_portfolio?: boolean;
  persisted_reportable?: boolean;
  reportable_record_id?: string | null;
};

export function canCalculateSsp(): boolean {
  return SSP_CALCULATE_AVAILABLE;
}

export function canSaveReportableSsp(): boolean {
  return SSP_REPORTABLE_SAVE_AVAILABLE;
}

export function assertSspNotReportable(): void {
  if (!canSaveReportableSsp()) {
    throw new PcafAuthorityError("UNSUPPORTED", SSP_REPORTABLE_BLOCKED_MESSAGE);
  }
}

export function isSspResultType(type: string | null | undefined): boolean {
  return (
    type === SSP_LOAN_TYPE ||
    String(type || "").startsWith("ssp-") ||
    String(type || "").includes("securitization")
  );
}

export function rejectSspReportableResults(results: Array<{ type?: string | null }> | null | undefined): void {
  if ((results || []).some((row) => isSspResultType(row.type))) {
    throw new PcafAuthorityError("UNSUPPORTED", SSP_REPORTABLE_BLOCKED_MESSAGE);
  }
}

export function sspReportableSaveBlockers(
  draft: SspDraft | null | undefined,
  result: SspCalculationResult | null | undefined,
): string[] {
  const blockers: string[] = [];
  if (!canSaveReportableSsp()) blockers.push("feature_flag");
  if (!draft) {
    blockers.push("missing_draft");
    return blockers;
  }
  try {
    blockers.push(...sspPreviewCalculateBlockers(draft).map((b) => `preview:${b}`));
  } catch {
    blockers.push("incomplete_draft");
  }
  if (draft.deal?.hasPoolOfPools === "yes" || draft.poolOfPools) {
    blockers.push("pool_of_pools");
  }
  const structure = String(draft.deal?.structureType || "").trim().toLowerCase();
  if (structure === "master-trust" || structure === "whole-loan") {
    blockers.push("blocked_structure");
  }
  if (!result) {
    blockers.push("missing_calculation");
    return blockers;
  }
  if (result.status !== "complete") blockers.push("incomplete_calculation");
  if (!IMPLEMENTED_SSP_FORMULAS.has(String(result.formula_id || ""))) blockers.push("unsupported_method");
  if (result.financed_emissions == null || !Number.isFinite(Number(result.financed_emissions))) {
    blockers.push("missing_total");
  }
  if (result.iaf == null || !Number.isFinite(Number(result.iaf))) blockers.push("missing_iaf");
  if (!result.calculation_fingerprint) blockers.push("missing_fingerprint");
  if (result.pool_of_pools || result.poolOfPools) blockers.push("pool_of_pools");
  return [...new Set(blockers)];
}

export function canSubmitReportableSspSave(
  draft: SspDraft | null | undefined,
  result: SspCalculationResult | null | undefined,
): boolean {
  return sspReportableSaveBlockers(draft, result).length === 0;
}

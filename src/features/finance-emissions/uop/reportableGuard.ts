import { PcafAuthorityError } from "../utils/pcafAuthority";
import { UOP_LOAN_TYPE } from "../config/loanTypeOptions";
import { uopQuestionnaireComplete } from "./validation";
import type { UopCalculationResult, UopDraft } from "./types";

/**
 * Phase 5D implements reportable parent Save on the backend.
 * The SPA release flag stays false until isolated Postgres UAT passes.
 */
export const UOP_CALCULATE_AVAILABLE = true;
export const UOP_REPORTABLE_SAVE_AVAILABLE = false;
export const UOP_DRAFT_API_AVAILABLE = true;
/** Combined flag: reportable backend path is still closed in this release. */
export const UOP_BACKEND_AVAILABLE = UOP_REPORTABLE_SAVE_AVAILABLE;

export const UOP_REPORTABLE_BLOCKED_MESSAGE =
  "You can calculate a preview. Saving this result into your portfolio is not available yet.";

export function canCalculateUop(): boolean {
  return UOP_CALCULATE_AVAILABLE;
}

export function canSaveReportableUop(): boolean {
  return UOP_REPORTABLE_SAVE_AVAILABLE;
}

export function canCalculateOrSaveUop(): boolean {
  return canSaveReportableUop();
}

export function assertUopNotReportable(): void {
  if (!canSaveReportableUop()) {
    throw new PcafAuthorityError("UNSUPPORTED", UOP_REPORTABLE_BLOCKED_MESSAGE);
  }
}

export function isUopResultType(type: string | null | undefined): boolean {
  return type === UOP_LOAN_TYPE || String(type || "").startsWith("uop-") || String(type || "").includes("use-of-proceeds");
}

export function rejectUopReportableResults(results: Array<{ type?: string | null }> | null | undefined): void {
  if ((results || []).some((row) => isUopResultType(row.type))) {
    throw new PcafAuthorityError("UNSUPPORTED", UOP_REPORTABLE_BLOCKED_MESSAGE);
  }
}

const IMPLEMENTED_UOP_FORMULAS = new Set([
  "uop-separate-lookthrough",
  "uop-integrated-lookthrough",
  "uop-issuer-reported",
]);

export function uopReportableSaveBlockers(
  draft: UopDraft | null | undefined,
  result: UopCalculationResult | null | undefined,
): string[] {
  const blockers: string[] = [];
  if (!canSaveReportableUop()) blockers.push("feature_flag");
  if (!draft || !uopQuestionnaireComplete(draft)) blockers.push("incomplete_draft");
  if (!result) {
    blockers.push("missing_calculation");
    return blockers;
  }
  if (result.status !== "complete") blockers.push("incomplete_calculation");
  if (!IMPLEMENTED_UOP_FORMULAS.has(String(result.formula_id || ""))) blockers.push("unsupported_method");
  if (result.financed_emissions == null || !Number.isFinite(Number(result.financed_emissions))) {
    blockers.push("missing_total");
  }
  if (!result.calculation_fingerprint) blockers.push("missing_fingerprint");
  const overlap = result.overlap as { status?: string; detected?: boolean } | null | undefined;
  if (overlap?.status === "review_required" || overlap?.detected) blockers.push("overlap_review");
  return blockers;
}

export function canSubmitReportableUopSave(
  draft: UopDraft | null | undefined,
  result: UopCalculationResult | null | undefined,
): boolean {
  return uopReportableSaveBlockers(draft, result).length === 0;
}

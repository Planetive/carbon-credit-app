import { PcafAuthorityError } from "../utils/pcafAuthority";
import { SSP_LOAN_TYPE } from "../config/loanTypeOptions";

/** Phase 6C.2: preview Calculate on; reportable Save still off. */
export const SSP_CALCULATE_AVAILABLE = true;
export const SSP_REPORTABLE_SAVE_AVAILABLE = false;
export const SSP_DRAFT_API_AVAILABLE = true;
export const SSP_BACKEND_AVAILABLE = true;

export const SSP_CALCULATE_BLOCKED_MESSAGE =
  "This securitization structure cannot be calculated yet. Use a supported single-pool deal with complete inputs, or finish the questionnaire.";

export const SSP_REPORTABLE_BLOCKED_MESSAGE =
  "Securitization results cannot be saved to the portfolio yet. Reportable Save stays disabled.";

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

import type { BoundaryDraftV2 } from "./boundaryTypes";
import type { OrgBoundaryMethod } from "./orgBoundaryMethod";
import { assetFieldValidationMessage } from "./assetFieldValidationMessages";

/** Matches sector id used in BoundarySettingPage for oil & gas. */
export const OIL_GAS_SECTOR_ID = "oil_and_gas";

function parseIso(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function startOfToday(): Date {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

/** Same rules as step 1 in Boundary setting (reporting period). */
export function validateReportingPeriod(start: string, end: string): { start?: string; end?: string } {
  const err: { start?: string; end?: string } = {};
  const startDt = parseIso(start);
  const endDt = parseIso(end);
  const today = startOfToday();
  if (!startDt) err.start = "Enter a valid start date.";
  else if (startDt > today) err.start = "Start date must be today or earlier.";
  if (!endDt) err.end = "Enter a valid end date.";
  else if (startDt && endDt <= startDt) err.end = "End date must be after the start date.";
  return err;
}

/**
 * Human-readable list of what still blocks global ESG setup completion (for UI messaging).
 */
export function getEsgSetupIncompleteReasons(draft: BoundaryDraftV2): string[] {
  const reasons: string[] = [];
  const periodErr = validateReportingPeriod(draft.period_start, draft.period_end);
  if (Object.keys(periodErr).length > 0) {
    reasons.push("Reporting period: fix the start and end dates in step 1.");
    if (periodErr.start) reasons.push(periodErr.start);
    if (periodErr.end) reasons.push(periodErr.end);
  }
  if (draft.sector === null) {
    reasons.push("Industry: choose a sector in step 2.");
  }
  if (draft.sector === OIL_GAS_SECTOR_ID && !draft.business_segment) {
    reasons.push("Oil and gas: select a business segment (upstream is available).");
  }
  if (draft.org_boundary_method === "") {
    reasons.push("Organisational boundary: pick an approach in step 3.");
  }
  if (draft.org_boundary_method === "equity_share" && !draft.equity_share_confirmed) {
    reasons.push("Equity share: confirm you will report using ownership percentages.");
  }
  if (draft.assets.length === 0) {
    reasons.push("Sites and assets: add at least one site or asset in step 4.");
  }
  for (const a of draft.assets) {
    const msg = assetFieldValidationMessage(a, draft.org_boundary_method as OrgBoundaryMethod);
    if (msg) reasons.push(msg);
  }
  return reasons;
}

/**
 * Global ESG setup is complete when the boundary draft satisfies the same gates as finishing step 4
 * (asset register) in BoundarySettingPage: valid reporting period, sector (+ oil & gas segment),
 * organisational boundary method, and at least one fully valid asset row.
 */
export function isGlobalEsgSetupComplete(draft: BoundaryDraftV2): boolean {
  if (Object.keys(validateReportingPeriod(draft.period_start, draft.period_end)).length > 0) return false;
  if (draft.sector === null) return false;
  if (draft.sector === OIL_GAS_SECTOR_ID && !draft.business_segment) return false;
  if (draft.org_boundary_method === "") return false;
  if (draft.org_boundary_method === "equity_share" && !draft.equity_share_confirmed) return false;
  if (draft.assets.length === 0) return false;
  return draft.assets.every(
    (a) => assetFieldValidationMessage(a, draft.org_boundary_method as OrgBoundaryMethod) === null
  );
}

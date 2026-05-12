import type { BoundaryDraftV2 } from "../../boundary/boundaryTypes";
import { validateReportingPeriod } from "../../boundary/isGlobalEsgSetupComplete";

export function periodKeyFromDraft(draft: BoundaryDraftV2): string {
  return `${draft.period_start}|${draft.period_end}`;
}

/**
 * Inclusive calendar months from reporting period start to end (year–month only).
 * @deprecated Prefer {@link monthsInReportingPeriodIfValid} for topic totals — this falls back to 12 when dates are invalid.
 */
export function monthsInReportingPeriod(periodStart: string, periodEnd: string): number {
  const v = monthsInReportingPeriodIfValid(periodStart, periodEnd);
  if (v !== null) return v;
  return 12;
}

/**
 * Same month count as the old helper, but returns `null` when dates are missing or fail
 * {@link validateReportingPeriod} so callers do not silently scale with an arbitrary duration.
 */
export function monthsInReportingPeriodIfValid(periodStart: string, periodEnd: string): number | null {
  if (Object.keys(validateReportingPeriod(periodStart, periodEnd)).length > 0) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodStart) || !/^\d{4}-\d{2}-\d{2}$/.test(periodEnd)) return null;
  const [ys, ms] = periodStart.split("-").map(Number);
  const [ye, me] = periodEnd.split("-").map(Number);
  const months = (ye - ys) * 12 + (me - ms) + 1;
  return Math.max(1, months);
}

export function formatPeriodRangeLabel(periodStart: string, periodEnd: string): string {
  if (!periodStart || !periodEnd) return "—";
  try {
    const a = new Date(periodStart + "T12:00:00");
    const b = new Date(periodEnd + "T12:00:00");
    const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
    return `${a.toLocaleDateString("en-GB", opts)} – ${b.toLocaleDateString("en-GB", opts)}`;
  } catch {
    return `${periodStart} – ${periodEnd}`;
  }
}

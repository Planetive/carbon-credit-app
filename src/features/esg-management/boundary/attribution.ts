import type { OrgBoundaryMethod } from "./orgBoundaryMethod";
import type { AssetSnapshotRow } from "./boundaryTypes";

function parseIso(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** Inclusive day count between two calendar dates (UTC-safe for date-only strings). */
function inclusiveDays(start: Date, end: Date): number {
  const s = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const e = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.max(0, Math.floor((e - s) / 86400000) + 1);
}

/**
 * Organisation-boundary attribution only (0–1). Uses supervisor rules; independent of ownership_type.
 */
export function computeAttributionFactor(
  method: OrgBoundaryMethod,
  asset: Pick<AssetSnapshotRow, "is_operator" | "has_financial_control" | "ownership_percentage">
): number {
  if (!method) return 0;
  if (method === "operational_control") {
    return asset.is_operator ? 1 : 0;
  }
  if (method === "financial_control") {
    return asset.has_financial_control ? 1 : 0;
  }
  if (method === "equity_share") {
    const p = Number(asset.ownership_percentage);
    if (!Number.isFinite(p) || p < 0) return 0;
    return Math.min(1, p / 100);
  }
  return 0;
}

/**
 * Active fraction of reporting period from AST-10 vs period bounds.
 * If operation_start is empty → full period (1).
 */
export function computeTimeFactor(
  periodStartIso: string,
  periodEndIso: string,
  operationStartInPeriodIso: string
): number {
  const p0 = parseIso(periodStartIso);
  const p1 = parseIso(periodEndIso);
  if (!p0 || !p1 || p1 <= p0) return 0;

  const periodDays = inclusiveDays(p0, p1);
  if (periodDays <= 0) return 0;

  if (!operationStartInPeriodIso?.trim()) {
    return 1;
  }

  const op = parseIso(operationStartInPeriodIso);
  if (!op) return 1;

  if (op > p1) return 0;

  const activeStart = op > p0 ? op : p0;
  const activeDays = inclusiveDays(activeStart, p1);
  return Math.min(1, Math.max(0, activeDays / periodDays));
}

export function computeFinalReportingFactor(
  method: OrgBoundaryMethod,
  asset: AssetSnapshotRow,
  periodStartIso: string,
  periodEndIso: string
): {
  attribution_factor: number;
  time_factor: number;
  final_reporting_factor: number;
} {
  const attribution_factor = computeAttributionFactor(method, asset);
  const time_factor = computeTimeFactor(periodStartIso, periodEndIso, asset.operation_start_in_period);
  return {
    attribution_factor,
    time_factor,
    final_reporting_factor: attribution_factor * time_factor,
  };
}

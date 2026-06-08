import type { GrievanceRow } from "./types";

export function calcTotalGrievances(rows: GrievanceRow[]): number {
  return rows.length;
}

export function calcResolvedGrievances(rows: GrievanceRow[]): number {
  return rows.filter((r) => r.resolved).length;
}

export function calcUnresolvedGrievances(rows: GrievanceRow[]): number {
  return rows.filter((r) => !r.resolved).length;
}

export function calcGrievanceResolutionRatePct(rows: GrievanceRow[]): number {
  const total = calcTotalGrievances(rows);
  if (total === 0) return 0;
  return (calcResolvedGrievances(rows) / total) * 100;
}

export function formatIndigenousRightsNum(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-GB", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

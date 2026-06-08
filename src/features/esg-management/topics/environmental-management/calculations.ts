import type { SpillRow, WellIntegrityRow } from "./types";

export function calcSpillCount(rows: SpillRow[]): number {
  return rows.length;
}

export function calcTotalSpillVolumeCubicM(rows: SpillRow[]): number {
  return rows.reduce((sum, r) => sum + (r.spillVolumeCubicM || 0), 0);
}

export function calcPctSpillsInSensitiveAreas(rows: SpillRow[]): number {
  if (rows.length === 0) return 0;
  const sensitive = rows.filter((r) => r.sensitiveAreaFlag).length;
  return (sensitive / rows.length) * 100;
}

export function calcTotalVolumeRecovered(rows: SpillRow[]): number {
  return rows.reduce((sum, r) => sum + (r.volumeRecoveredCubicM || 0), 0);
}

export function calcPctVolumeRecovered(rows: SpillRow[]): number {
  const released = calcTotalSpillVolumeCubicM(rows);
  if (released === 0) return 0;
  return (calcTotalVolumeRecovered(rows) / released) * 100;
}

export function calcTotalWellsAssessed(rows: WellIntegrityRow[]): number {
  return rows.length;
}

export function calcWellIntegrityFailures(rows: WellIntegrityRow[]): number {
  return rows.filter(
    (r) => r.barrierStatus === "Defect in primary" || r.barrierStatus === "Loss of containment"
  ).length;
}

export function calcPctWellsWithIntegrityIssues(rows: WellIntegrityRow[]): number {
  if (rows.length === 0) return 0;
  const issues = rows.filter((r) => r.barrierStatus !== "All barriers intact").length;
  return (issues / rows.length) * 100;
}

export function formatEnvMgmtNum(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-GB", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

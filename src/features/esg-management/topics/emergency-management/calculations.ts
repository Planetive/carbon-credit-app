import type {
  HydrocarbonReleaseRow,
  PreparednessScore,
  WellControlIncidentRow,
} from "./types";

/** Parses user numeric fields; non-finite input is treated as 0. */
export function parseEmergencyNumericInput(s: string): number {
  const n = Number(String(s).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

export function calcTotalHydrocarbonReleases(rows: HydrocarbonReleaseRow[]): number {
  return rows.length;
}

export function calcTotalReleaseVolumeM3(rows: HydrocarbonReleaseRow[]): number {
  return rows.reduce((acc, r) => acc + parseEmergencyNumericInput(r.volumeM3), 0);
}

export function calcWellControlIncidents(rows: WellControlIncidentRow[]): number {
  return rows.length;
}

export function calcBlowouts(rows: WellControlIncidentRow[]): number {
  return rows.filter((r) => r.isBlowout).length;
}

/** Sum of all 5 domain scores ÷ 5, rounded to 1 decimal place. */
export function calcPreparednessAverageScore(score: PreparednessScore): number {
  const values = [
    score.emergencyPlanCoverage,
    score.drillFrequencyQuality,
    score.wellControlTraining,
    score.equipmentReadiness,
    score.mutualAidAgreements,
  ];
  const sum = values.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0);
  return Math.round((sum / 5) * 10) / 10;
}

export function formatEmergencyNum(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-GB", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

/**
 * Reportable totals for the EPA results screen and the organization dashboard.
 * The shared loader's totals.scope1 stays unchanged for the calculator and legacy lists.
 * Unreconciled historical stationary kilograms are omitted here.
 * Verified epa_stationary tonnes are added once, as kilograms (× 1000).
 */

import type { EmissionCategoryTotal, EpaIpccResultsData } from "@/features/emission-calculator/core/loaders/epaIpccResults";

export const UNRECONCILED_STATIONARY_KEYS = [
  "fuel",
  "heatsteam",
  "kitchen",
  "power",
  "heating",
] as const;

export type UnreconciledStationaryKey = (typeof UNRECONCILED_STATIONARY_KEYS)[number];

export type ReportingInventoryStatus = "reportable" | "provisional" | "incomplete";

export type ReportingTotals = {
  status: ReportingInventoryStatus;
  statusLabel: string;
  scope1Kg: number | null;
  grandKg: number | null;
  verifiedTco2e: number | null;
  verifiedKg: number | null;
  legacyStationary: EmissionCategoryTotal[];
  reportableScope1: EmissionCategoryTotal[];
  excludedKg: number;
};

const UNRECONCILED = new Set<string>(UNRECONCILED_STATIONARY_KEYS);

export function isUnreconciledStationaryKey(key: string): boolean {
  return UNRECONCILED.has(key);
}

function sumKg(rows: EmissionCategoryTotal[]): number {
  return rows.reduce((sum, row) => sum + (Number(row.value) || 0), 0);
}

export function buildReportingTotals(results: EpaIpccResultsData): ReportingTotals {
  const legacyStationary = results.scope1.filter((row) => isUnreconciledStationaryKey(row.key));
  const reportableScope1 = results.scope1.filter((row) => !isUnreconciledStationaryKey(row.key));
  const excludedKg = sumKg(legacyStationary);
  const baseScope1Kg = sumKg(reportableScope1);
  const verified = results.stationaryVerified;
  const legacyVisible = legacyStationary.filter((row) => row.value > 0);

  if (!verified || verified.status === "unavailable") {
    return {
      status: "incomplete",
      statusLabel:
        verified?.error ||
        "Verified stationary records could not be loaded. This is not a complete inventory.",
      scope1Kg: null,
      grandKg: null,
      verifiedTco2e: null,
      verifiedKg: null,
      legacyStationary: legacyVisible,
      reportableScope1,
      excludedKg,
    };
  }

  const verifiedKg = verified.totalKgCo2e;
  const scope1Kg = baseScope1Kg + verifiedKg;
  const grandKg = scope1Kg + results.totals.scope2 + results.totals.scope3;
  const provisional = legacyVisible.length > 0;

  return {
    status: provisional ? "provisional" : "reportable",
    statusLabel: provisional
      ? "Partial / provisional. Unreconciled legacy stationary combustion is excluded from these totals. This is not an audit-approved inventory."
      : "Reportable total for loaded categories. This is not an independently verified or audit-approved inventory.",
    scope1Kg,
    grandKg,
    verifiedTco2e: verified.totalTco2e,
    verifiedKg,
    legacyStationary: legacyVisible,
    reportableScope1,
    excludedKg,
  };
}

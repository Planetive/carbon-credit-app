/**
 * Organization dashboard emissions summary.
 *
 * Uses buildReportingTotals, the same aggregation as the EPA results screen.
 * It does not add verified tonnes onto the loader's legacy-inclusive totals.scope1.
 *
 * Stationary combustion, mobile combustion, and refrigerant leakage are limited
 * to the authenticated organization and are not filtered by counterparty.
 * Other categories still come from the shared loader, which reads the signed-in user's saved rows.
 */

import type { EpaIpccResultsData } from "@/features/emission-calculator/core/loaders/epaIpccResults";
import type { StationaryReadContext } from "@/features/emission-calculator/results/stationaryResults";
import {
  biogenicReportLabel,
  buildReportingTotals,
  type AnnualInventory,
  type ReportingInventoryStatus,
} from "@/features/emission-calculator/results/reportingTotals";

export const DASHBOARD_PERIOD_NOTE =
  "Select a reporting year. Records without a reporting period stay unassigned and are not included.";

export const DASHBOARD_SCOPE_NOTE =
  "Stationary combustion, mobile combustion, and refrigerant leakage use this organization's calculated records. Other categories use the signed-in user's saved EPA entries. This is a calculated total, not an assured inventory.";

export type DashboardEmissionsStatus = ReportingInventoryStatus | "missing_organization";

export type DashboardEmissionsSummary = {
  status: DashboardEmissionsStatus;
  inventory: AnnualInventory | "missing_organization";
  reportingYear: number | null;
  statusLabel: string;
  periodNote: string;
  scopeNote: string;
  reconciliationPending: boolean;
  scope1Kg: number | null;
  scope2Kg: number | null;
  scope3Kg: number | null;
  grandKg: number | null;
  verifiedTco2e: number | null;
  biogenicCo2T: number | null;
  biogenicLabel: string;
};

export function kgToTco2e(kg: number): number {
  return kg / 1000;
}

export function kgToTco2eOrNull(kg: number | null): number | null {
  if (kg == null || !Number.isFinite(kg)) return null;
  return kgToTco2e(kg);
}

/** Organization-level read for one reporting year. No counterparty filter. */
export function dashboardStationaryContext(
  organizationId: string,
  reportingYear: number
): StationaryReadContext {
  return { organizationId, reportingYear };
}

function emptyNumbers(): Pick<
  DashboardEmissionsSummary,
  "scope1Kg" | "scope2Kg" | "scope3Kg" | "grandKg" | "verifiedTco2e" | "biogenicCo2T" | "biogenicLabel" | "reconciliationPending"
> {
  return {
    reconciliationPending: false,
    scope1Kg: null,
    scope2Kg: null,
    scope3Kg: null,
    grandKg: null,
    verifiedTco2e: null,
    biogenicCo2T: null,
    biogenicLabel: "Biogenic CO2 unavailable",
  };
}

export function missingOrganizationSummary(): DashboardEmissionsSummary {
  return {
    status: "missing_organization",
    inventory: "missing_organization",
    reportingYear: null,
    statusLabel: "An organization is required before emissions can be shown.",
    periodNote: DASHBOARD_PERIOD_NOTE,
    scopeNote: DASHBOARD_SCOPE_NOTE,
    ...emptyNumbers(),
  };
}

export function failedDashboardSummary(message?: string): DashboardEmissionsSummary {
  return {
    status: "incomplete",
    inventory: "unavailable",
    reportingYear: null,
    statusLabel: message || "Emissions could not be loaded. This is not a zero inventory.",
    periodNote: DASHBOARD_PERIOD_NOTE,
    scopeNote: DASHBOARD_SCOPE_NOTE,
    ...emptyNumbers(),
  };
}

export function summarizeDashboardEmissions(results: EpaIpccResultsData): DashboardEmissionsSummary {
  const reporting = buildReportingTotals(results);
  const year = reporting.reportingYear;
  return {
    status: reporting.status,
    inventory: reporting.inventory,
    reportingYear: year,
    statusLabel: reporting.statusLabel,
    periodNote: [
      year
        ? `Reporting year ${year}. Other years are excluded. Records without a reporting period stay unassigned.`
        : DASHBOARD_PERIOD_NOTE,
      biogenicReportLabel(reporting.biogenicCo2T, reporting.biogenicStatus),
    ].join(" "),
    scopeNote: DASHBOARD_SCOPE_NOTE,
    reconciliationPending: reporting.legacyStationary.some((row) => row.value > 0),
    scope1Kg: reporting.scope1Kg,
    scope2Kg: reporting.scope2Kg,
    scope3Kg: reporting.scope3Kg,
    grandKg: reporting.grandKg,
    verifiedTco2e: reporting.verifiedTco2e,
    biogenicCo2T: reporting.biogenicCo2T,
    biogenicLabel: biogenicReportLabel(reporting.biogenicCo2T, reporting.biogenicStatus),
  };
}

export function dashboardTrackedLabel(summary: DashboardEmissionsSummary): { value: string; sub: string } {
  if (summary.inventory === "partial") {
    return { value: "Partial", sub: "Annual total is not complete" };
  }
  if (
    summary.inventory === "unavailable" ||
    summary.status === "incomplete" ||
    summary.status === "missing_organization" ||
    summary.grandKg == null
  ) {
    return { value: "Unavailable", sub: "Totals were not shown" };
  }
  if (summary.grandKg > 0) {
    return {
      value: "Yes",
      sub: summary.reconciliationPending
        ? "Calculated · reconciliation pending"
        : "Calculated total",
    };
  }
  return {
    value: "No",
    sub: summary.reconciliationPending
      ? "Reportable total is zero; historical stationary is excluded"
      : "No emissions in the loaded records",
  };
}

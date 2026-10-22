/**
 * Organization dashboard emissions summary.
 *
 * Uses buildReportingTotals, the same aggregation as the EPA results screen.
 * It does not add epa_stationary kilograms onto the loader's legacy-inclusive totals.scope1.
 *
 * Stationary records are limited to the authenticated organization and are not
 * filtered by counterparty. Other categories still come from the shared loader,
 * which reads the signed-in user's saved rows. There is no reporting-year filter:
 * the figures span the records that loader returns.
 */

import type { EpaIpccResultsData } from "@/features/emission-calculator/core/loaders/epaIpccResults";
import type { StationaryReadContext } from "@/features/emission-calculator/results/stationaryResults";
import {
  buildReportingTotals,
  type ReportingInventoryStatus,
} from "@/features/emission-calculator/results/reportingTotals";

export const DASHBOARD_PERIOD_NOTE =
  "Totals span the available records. They are not limited to a reporting year.";

export const DASHBOARD_SCOPE_NOTE =
  "Stationary combustion uses this organization's calculated records. Other categories use the signed-in user's saved EPA entries. This is a calculated total, not an assured inventory.";

export type DashboardEmissionsStatus = ReportingInventoryStatus | "missing_organization";

export type DashboardEmissionsSummary = {
  status: DashboardEmissionsStatus;
  statusLabel: string;
  periodNote: string;
  scopeNote: string;
  reconciliationPending: boolean;
  scope1Kg: number | null;
  scope2Kg: number | null;
  scope3Kg: number | null;
  grandKg: number | null;
  verifiedTco2e: number | null;
};

export function kgToTco2e(kg: number): number {
  return kg / 1000;
}

export function kgToTco2eOrNull(kg: number | null): number | null {
  if (kg == null || !Number.isFinite(kg)) return null;
  return kgToTco2e(kg);
}

/** Organization-level read. No counterparty and no invented period filter. */
export function dashboardStationaryContext(organizationId: string): StationaryReadContext {
  return { organizationId };
}

function emptyNumbers(): Pick<
  DashboardEmissionsSummary,
  "scope1Kg" | "scope2Kg" | "scope3Kg" | "grandKg" | "verifiedTco2e" | "reconciliationPending"
> {
  return {
    reconciliationPending: false,
    scope1Kg: null,
    scope2Kg: null,
    scope3Kg: null,
    grandKg: null,
    verifiedTco2e: null,
  };
}

export function missingOrganizationSummary(): DashboardEmissionsSummary {
  return {
    status: "missing_organization",
    statusLabel: "An organization is required before emissions can be shown.",
    periodNote: DASHBOARD_PERIOD_NOTE,
    scopeNote: DASHBOARD_SCOPE_NOTE,
    ...emptyNumbers(),
  };
}

export function failedDashboardSummary(message?: string): DashboardEmissionsSummary {
  return {
    status: "incomplete",
    statusLabel: message || "Emissions could not be loaded. This is not a zero inventory.",
    periodNote: DASHBOARD_PERIOD_NOTE,
    scopeNote: DASHBOARD_SCOPE_NOTE,
    ...emptyNumbers(),
  };
}

export function summarizeDashboardEmissions(results: EpaIpccResultsData): DashboardEmissionsSummary {
  const reporting = buildReportingTotals(results);
  return {
    status: reporting.status,
    statusLabel: reporting.statusLabel,
    periodNote: DASHBOARD_PERIOD_NOTE,
    scopeNote: DASHBOARD_SCOPE_NOTE,
    reconciliationPending: reporting.legacyStationary.some((row) => row.value > 0),
    scope1Kg: reporting.scope1Kg,
    scope2Kg: results.totals.scope2,
    scope3Kg: results.totals.scope3,
    grandKg: reporting.grandKg,
    verifiedTco2e: reporting.verifiedTco2e,
  };
}

export function dashboardTrackedLabel(summary: DashboardEmissionsSummary): { value: string; sub: string } {
  if (summary.status === "incomplete" || summary.status === "missing_organization" || summary.grandKg == null) {
    return { value: "Incomplete", sub: "Totals were not shown" };
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

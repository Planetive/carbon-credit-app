/**
 * EPA calculator sidebar totals.
 *
 * Uses the same reportable aggregation as the results screen and dashboard.
 * Loader category values are kilograms. Verified stationary records are tonnes
 * and are included once. Legacy stationary kilograms stay out of these totals.
 */

import type { EpaIpccResultsData } from "@/features/emission-calculator/core/loaders/epaIpccResults";
import {
  kgToTco2eOrNull,
  summarizeDashboardEmissions,
} from "@/features/dashboard/dashboardEmissions";
import type { AnnualInventory } from "@/features/emission-calculator/results/reportingTotals";

export const EPA_SIDEBAR_UNIT = "tCO2e";

export type EpaSidebarDisplay = {
  unit: typeof EPA_SIDEBAR_UNIT;
  inventory: AnnualInventory;
  reportingYear: number | null;
  scope1: number | null;
  scope2: number | null;
  scope3: number | null;
  grand: number | null;
  scope1Label: string;
  scope2Label: string;
  scope3Label: string;
  grandLabel: string;
  biogenicLabel: string;
  statusLabel: string;
  /** Short calculator-sidebar copy. Methodology paragraphs stay on the results screen. */
  compactNote: string | null;
  incomplete: boolean;
};

function tonnesLabel(kg: number | null): string {
  const tonnes = kgToTco2eOrNull(kg);
  if (tonnes == null) return "Unavailable";
  return tonnes.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 6 });
}

export function buildEpaSidebarDisplay(
  results: EpaIpccResultsData | null,
  loadError?: string | null
): EpaSidebarDisplay {
  if (!results) {
    return {
      unit: EPA_SIDEBAR_UNIT,
      inventory: "unavailable",
      reportingYear: null,
      scope1: null,
      scope2: null,
      scope3: null,
      grand: null,
      scope1Label: "Unavailable",
      scope2Label: "Unavailable",
      scope3Label: "Unavailable",
      grandLabel: "Unavailable",
      biogenicLabel: "Biogenic CO2 unavailable",
      statusLabel:
        loadError ||
        "EPA totals have not loaded. This is not a zero inventory.",
      compactNote: loadError || "Emissions could not be loaded for this reporting year.",
      incomplete: true,
    };
  }

  const summary = summarizeDashboardEmissions(results);
  const inventory = summary.inventory === "missing_organization" ? "unavailable" : summary.inventory;
  const unavailable = inventory === "unavailable";
  const scope1 = kgToTco2eOrNull(summary.scope1Kg);
  const scope2 = kgToTco2eOrNull(summary.scope2Kg);
  const scope3 = kgToTco2eOrNull(summary.scope3Kg);
  const grand = kgToTco2eOrNull(summary.grandKg);
  return {
    unit: EPA_SIDEBAR_UNIT,
    inventory,
    reportingYear: summary.reportingYear,
    scope1,
    scope2,
    scope3,
    grand,
    scope1Label: unavailable || scope1 == null ? "Unavailable" : tonnesLabel(summary.scope1Kg),
    scope2Label: unavailable ? "Unavailable" : scope2 == null ? "Unassigned" : tonnesLabel(summary.scope2Kg),
    scope3Label: unavailable ? "Unavailable" : scope3 == null ? "Unassigned" : tonnesLabel(summary.scope3Kg),
    grandLabel: grand != null ? tonnesLabel(summary.grandKg) : inventory === "partial" ? "Partial" : "Unavailable",
    biogenicLabel: summary.biogenicLabel,
    statusLabel: loadError || summary.statusLabel,
    compactNote: unavailable
      ? loadError || "Emissions could not be loaded for this reporting year."
      : summary.reconciliationPending
        ? "Historical stationary combustion is excluded until reconciliation."
        : null,
    incomplete: unavailable,
  };
}

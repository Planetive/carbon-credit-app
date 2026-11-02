/**
 * Figures for the EPA calculator's own PDF.
 * Headlines match the sidebar and the EPA results screen.
 * Category values in the loader are kilograms. Verified stationary, mobile, and
 * refrigerant tonnes are included once. Legacy stationary, legacy mobile, and
 * legacy refrigerant kilograms are not added.
 */

import type { EmissionCategoryTotal, EpaIpccResultsData } from "@/features/emission-calculator/core/loaders/epaIpccResults";
import { kgToTco2e } from "@/features/dashboard/dashboardEmissions";
import { buildReportingTotals } from "@/features/emission-calculator/results/reportingTotals";
import { buildEpaSidebarDisplay } from "./epaSidebarTotals";

export type EpaCalculatorPdfFigures = {
  unit: "tCO2e";
  inventory: "complete" | "partial" | "unavailable";
  reportingYear: number | null;
  incomplete: boolean;
  statusLabel: string;
  reconciliationNotice: string | null;
  scope1: number | null;
  scope2: number | null;
  scope3: number | null;
  grand: number | null;
  scope1Label: string;
  scope2Label: string;
  scope3Label: string;
  grandLabel: string;
  biogenicLabel: string;
  stationary: number | null;
  mobile: number | null;
  refrigerant: number | null;
  fugitive: number | null;
  process: number | null;
  electricity: number | null;
  heat: number | null;
  upstream: number | null;
  downstream: number | null;
  travel: number | null;
  commute: number | null;
  waste: number | null;
};

const FUGITIVE_KEYS = ["flaring", "venting"];
const UPSTREAM_KEYS = ["purchased_goods", "capital_goods", "fuel_energy", "upstream_transport"];
const DOWNSTREAM_KEYS = [
  "investments",
  "facilitated",
  "downstream_transport",
  "end_of_life",
  "processing_sold",
  "use_of_sold",
];

function kgOf(rows: EmissionCategoryTotal[], key: string): number {
  return Number(rows.find((row) => row.key === key)?.value) || 0;
}

function tonnesOf(rows: EmissionCategoryTotal[], keys: string[]): number {
  return kgToTco2e(keys.reduce((sum, key) => sum + kgOf(rows, key), 0));
}

export function formatPdfTonnes(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "Incomplete";
  const text = value.toFixed(6).replace(/\.?0+$/, "");
  return text.includes(".") ? text : text;
}

function emptyFigures(statusLabel: string): EpaCalculatorPdfFigures {
  return {
    unit: "tCO2e",
    inventory: "unavailable",
    reportingYear: null,
    incomplete: true,
    statusLabel,
    reconciliationNotice: null,
    scope1: null,
    scope2: null,
    scope3: null,
    grand: null,
    scope1Label: "Unavailable",
    scope2Label: "Unavailable",
    scope3Label: "Unavailable",
    grandLabel: "Unavailable",
    biogenicLabel: "Biogenic CO2 unavailable",
    stationary: null,
    mobile: null,
    refrigerant: null,
    fugitive: null,
    process: null,
    electricity: null,
    heat: null,
    upstream: null,
    downstream: null,
    travel: null,
    commute: null,
    waste: null,
  };
}

export function buildEpaCalculatorPdf(
  results: EpaIpccResultsData | null,
  loadError?: string | null
): EpaCalculatorPdfFigures {
  const sidebar = buildEpaSidebarDisplay(results, loadError);
  if (!results) return emptyFigures(sidebar.statusLabel);

  const reporting = buildReportingTotals(results);
  const scope2Assigned = results.annualReporting?.scope2 === "assigned";
  const scope3Assigned = results.annualReporting?.scope3 === "assigned";
  const assignedScope1 = new Set(results.annualReporting?.scope1Keys ?? []);
  const assignedTonnes = (rows: EmissionCategoryTotal[], keys: string[]): number | null => {
    const allowed = keys.filter((key) => assignedScope1.has(key));
    if (allowed.length === 0) return null;
    return tonnesOf(rows, allowed);
  };
  const knownScope3 = new Set([
    ...UPSTREAM_KEYS,
    ...DOWNSTREAM_KEYS,
    "business_travel",
    "employee_commuting",
    "waste",
  ]);
  const otherScope3 = results.scope3
    .filter((row) => !knownScope3.has(row.key))
    .map((row) => row.key);
  const blocked = sidebar.inventory === "unavailable";
  const stationaryBlock = results.stationaryVerified;
  const mobileBlock = results.mobileVerified;
  const refrigerantBlock = results.refrigerantVerified;
  const electricityBlock = results.electricityVerified;
  const heatBlock = results.heatSteamVerified;
  const heatKnown = Boolean(heatBlock && heatBlock.status !== "unavailable");
  const notices = [
    reporting.legacyStationary.length > 0
      ? "Legacy stationary combustion is excluded from these totals and requires reconciliation."
      : "",
    reporting.legacyMobile.length > 0
      ? "Legacy mobile combustion is excluded from these totals."
      : "",
    reporting.legacyRefrigerant.length > 0
      ? "Legacy refrigerant leakage is excluded from these totals."
      : "",
    electricityBlock && electricityBlock.status !== "unavailable" && !heatKnown
      ? "Verified Scope 2 is location-based purchased electricity only. Heat, steam, and cooling are not included. Legacy Scope 2 records are excluded."
      : "",
    heatKnown
      ? "Verified Scope 2 includes purchased heat and steam. Purchased cooling is not included. The heat and steam factor assumes natural-gas production at 80 percent thermal efficiency and is not supplier-specific. Legacy Scope 2 records are excluded."
      : "",
  ].filter(Boolean);

  return {
    unit: "tCO2e",
    inventory: sidebar.inventory,
    reportingYear: sidebar.reportingYear,
    incomplete: sidebar.incomplete,
    statusLabel: sidebar.statusLabel,
    reconciliationNotice: notices.length ? notices.join(" ") : null,
    scope1: sidebar.scope1,
    scope2: sidebar.scope2,
    scope3: sidebar.scope3,
    grand: sidebar.grand,
    scope1Label: sidebar.scope1Label,
    scope2Label: sidebar.scope2Label,
    scope3Label: sidebar.scope3Label,
    grandLabel: sidebar.grandLabel,
    biogenicLabel: sidebar.biogenicLabel,
    stationary:
      blocked || !stationaryBlock || stationaryBlock.status === "unavailable"
        ? null
        : stationaryBlock.totalTco2e,
    mobile: blocked || mobileBlock?.status === "unavailable" ? null : (mobileBlock?.totalTco2e ?? 0),
    refrigerant:
      blocked || refrigerantBlock?.status === "unavailable" ? null : (refrigerantBlock?.totalTco2e ?? 0),
    fugitive: assignedTonnes(results.scope1, FUGITIVE_KEYS),
    process: null,
    electricity:
      electricityBlock && electricityBlock.status !== "unavailable"
        ? electricityBlock.totalTco2e
        : scope2Assigned
          ? tonnesOf(results.scope2, ["electricity"])
          : null,
    heat: heatKnown
      ? heatBlock?.totalTco2e ?? 0
      : scope2Assigned
        ? tonnesOf(results.scope2, ["heatsteam"])
        : null,
    upstream: scope3Assigned ? tonnesOf(results.scope3, [...UPSTREAM_KEYS, ...otherScope3]) : null,
    downstream: scope3Assigned ? tonnesOf(results.scope3, DOWNSTREAM_KEYS) : null,
    travel: scope3Assigned ? tonnesOf(results.scope3, ["business_travel"]) : null,
    commute: scope3Assigned ? tonnesOf(results.scope3, ["employee_commuting"]) : null,
    waste: scope3Assigned ? tonnesOf(results.scope3, ["waste"]) : null,
  };
}

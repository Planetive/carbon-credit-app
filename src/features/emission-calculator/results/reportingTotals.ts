/**
 * Reportable totals for the EPA results screen and the organization dashboard.
 * The shared loader's totals.scope1 stays unchanged for the calculator and legacy lists.
 * Unreconciled historical stationary kilograms are omitted here.
 * Verified epa_stationary, epa_mobile_v1, and epa_refrigerant_v1 tonnes are added once, as kilograms (× 1000).
 * Legacy mobile and legacy refrigerant rows stay out of those totals.
 */

import type { EmissionCategoryTotal, EpaIpccResultsData } from "@/features/emission-calculator/core/loaders/epaIpccResults";
import { SHARED_SCOPE_WITHHELD_REASON } from "./reportingYear";
import { scaledTonnesToKg, scaledTonnesToNumber, tonnesToScaled } from "./stationaryResults";
import { emptyMobileVerified } from "./mobileResults";
import { emptyRefrigerantVerified } from "./refrigerantResults";
import { emptyScope3Verified } from "./scope3Results";
import { LEGACY_SCOPE3_EXCLUDED_LABEL, scope3CompletenessNote } from "./scope3Reporting";

export const UNRECONCILED_STATIONARY_KEYS = [
  "fuel",
  "heatsteam",
  "kitchen",
  "power",
  "heating",
] as const;

export type UnreconciledStationaryKey = (typeof UNRECONCILED_STATIONARY_KEYS)[number];

export type ReportingInventoryStatus = "reportable" | "provisional" | "incomplete";
export type AnnualInventory = "complete" | "partial" | "unavailable";

export type ReportingTotals = {
  status: ReportingInventoryStatus;
  inventory: AnnualInventory;
  reportingYear: number | null;
  statusLabel: string;
  scope1Kg: number | null;
  scope2Kg: number | null;
  scope3Kg: number | null;
  grandKg: number | null;
  verifiedTco2e: number | null;
  verifiedKg: number | null;
  /** Tonnes of biogenic CO2. Never included in scope1Kg or grandKg. */
  biogenicCo2T: number | null;
  biogenicStatus: "recorded" | "partial" | "not_recorded" | "unavailable";
  legacyStationary: EmissionCategoryTotal[];
  /** Historical mobile rows. They are not included in scope1Kg or grandKg. */
  legacyMobile: EmissionCategoryTotal[];
  /** Historical refrigerant rows, stored as kilograms. They are not included in scope1Kg or grandKg. */
  legacyRefrigerant: EmissionCategoryTotal[];
  /** Scope 1 categories assigned to the selected year. Legacy stationary is not included. */
  reportableScope1: EmissionCategoryTotal[];
  excludedKg: number;
  withheldReason: string | null;
};

export const LEGACY_MOBILE_KEYS = [
  "mobile",
  "onroad_gas",
  "onroad_diesel",
  "nonroad",
  "vehicular",
] as const;

export const LEGACY_REFRIGERANT_KEYS = ["uk_refrigerant"] as const;

const LEGACY_MOBILE = new Set<string>(LEGACY_MOBILE_KEYS);
const LEGACY_REFRIGERANT = new Set<string>(LEGACY_REFRIGERANT_KEYS);
const UNRECONCILED = new Set<string>(UNRECONCILED_STATIONARY_KEYS);

export function isUnreconciledStationaryKey(key: string): boolean {
  return UNRECONCILED.has(key);
}

export function formatBiogenicTonnes(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "Not recorded";
  return value.toFixed(6).replace(/\.?0+$/, "") || "0";
}

export function biogenicReportLabel(
  tonnes: number | null,
  status: ReportingTotals["biogenicStatus"]
): string {
  if (status === "unavailable") return "Biogenic CO2 unavailable";
  if (status === "not_recorded" || tonnes == null) return "Biogenic CO2 not recorded";
  const amount = `${formatBiogenicTonnes(tonnes)} t CO2, outside Scope 1`;
  if (status === "partial") return `Biogenic CO2 ${amount} on recorded entries`;
  return `Biogenic CO2 ${amount}`;
}

function sumKg(rows: EmissionCategoryTotal[]): number {
  return rows.reduce((sum, row) => sum + (Number(row.value) || 0), 0);
}

function assignmentOf(results: EpaIpccResultsData): AnnualReportingAssignment {
  return (
    results.annualReporting ?? {
      reportingYear: null,
      scope1Keys: [],
      scope2: "withheld",
      scope3: "withheld",
      withheldReason: SHARED_SCOPE_WITHHELD_REASON,
    }
  );
}

export function isLegacyMobileKey(key: string): boolean {
  return LEGACY_MOBILE.has(key);
}

export function isLegacyRefrigerantKey(key: string): boolean {
  return LEGACY_REFRIGERANT.has(key);
}

export function verifiedScope1Lines(results: EpaIpccResultsData): EmissionCategoryTotal[] {
  const lines: EmissionCategoryTotal[] = [];
  const stationary = results.stationaryVerified;
  const mobile = results.mobileVerified;
  const refrigerant = results.refrigerantVerified;
  if (stationary?.status === "ready" && stationary.totalKgCo2e > 0) {
    lines.push({
      key: "stationary_verified",
      label: "Stationary combustion (verified)",
      value: stationary.totalKgCo2e,
    });
  }
  if (mobile?.status === "ready" && mobile.totalKgCo2e > 0) {
    lines.push({
      key: "mobile_verified",
      label: "Mobile combustion (verified)",
      value: mobile.totalKgCo2e,
    });
  }
  if (refrigerant?.status === "ready" && refrigerant.totalKgCo2e > 0) {
    lines.push({
      key: "refrigerant_verified",
      label: "Refrigerant leakage (verified)",
      value: refrigerant.totalKgCo2e,
    });
  }
  return lines;
}

type BiogenicPart = { tonnes: number | null; status: ReportingTotals["biogenicStatus"]; stated: boolean };

function biogenicOf(block: {
  status: string;
  activities?: unknown[];
  biogenicCo2Tonnes?: number | null;
  biogenicStatus?: "recorded" | "partial" | "not_recorded";
} | null | undefined): BiogenicPart {
  if (!block || block.status === "unavailable") return { tonnes: null, status: "unavailable", stated: false };
  if (!block.activities || block.activities.length === 0) return { tonnes: 0, status: "recorded", stated: false };
  const status = block.biogenicStatus || (block.biogenicCo2Tonnes == null ? "not_recorded" : "recorded");
  return {
    tonnes: status === "not_recorded" ? null : (block.biogenicCo2Tonnes ?? null),
    status,
    stated: true,
  };
}

function combineBiogenic(stationary: BiogenicPart, mobile: BiogenicPart): BiogenicPart {
  if (stationary.status === "unavailable" || mobile.status === "unavailable") {
    return { tonnes: null, status: "unavailable", stated: false };
  }
  const stated = [stationary, mobile].filter((part) => part.stated);
  if (stated.length === 0) return { tonnes: 0, status: "recorded", stated: false };
  if (stated.every((part) => part.status === "not_recorded")) {
    return { tonnes: null, status: "not_recorded", stated: true };
  }
  const known = stated.filter((part) => part.status !== "not_recorded" && part.tonnes != null);
  const scaled = known.reduce((sum, part) => sum + (tonnesToScaled(part.tonnes) || 0), 0);
  return {
    tonnes: known.length ? scaledTonnesToNumber(scaled) : null,
    status: stated.every((part) => part.status === "recorded") ? "recorded" : "partial",
    stated: true,
  };
}

export function buildReportingTotals(results: EpaIpccResultsData): ReportingTotals {
  const assignment = assignmentOf(results);
  const legacyStationary = results.scope1.filter((row) => isUnreconciledStationaryKey(row.key));
  const eligibleScope1 = results.scope1.filter((row) => !isUnreconciledStationaryKey(row.key));
  const assignedKeys = new Set(assignment.scope1Keys);
  const reportableScope1 = eligibleScope1.filter(
    (row) => assignedKeys.has(row.key) && !isLegacyMobileKey(row.key) && !isLegacyRefrigerantKey(row.key)
  );
  const excludedKg = sumKg(legacyStationary);
  const verified = results.stationaryVerified;
  const mobile = results.mobileVerified ?? emptyMobileVerified();
  const refrigerant = results.refrigerantVerified ?? emptyRefrigerantVerified();
  const electricity = results.electricityVerified;
  const heatSteam = results.heatSteamVerified;
  const scope3 = results.scope3Verified ?? emptyScope3Verified();
  const electricityKnown = electricity != null && electricity.status !== "unavailable";
  const heatSteamKnown = heatSteam != null && heatSteam.status !== "unavailable";
  const scope2Known = electricityKnown || heatSteamKnown;
  const scope3Known = results.scope3Verified != null && scope3.status !== "unavailable";
  const legacyVisible = legacyStationary.filter((row) => row.value > 0);
  const legacyMobile = results.scope1.filter((row) => isLegacyMobileKey(row.key) && row.value > 0);
  const legacyRefrigerant = results.scope1.filter((row) => isLegacyRefrigerantKey(row.key) && row.value > 0);
  const legacyScope3Kg = sumKg(results.scope3.filter((row) => row.value > 0));
  const withheldReason =
    assignment.scope2 === "withheld" || (!scope3Known && assignment.scope3 === "withheld")
      ? assignment.withheldReason
      : null;
  if (
    !verified ||
    verified.status === "unavailable" ||
    mobile.status === "unavailable" ||
    refrigerant.status === "unavailable" ||
    electricity?.status === "unavailable" ||
    heatSteam?.status === "unavailable" ||
    results.scope3Verified?.status === "unavailable" ||
    assignment.reportingYear == null
  ) {
    const statusLabel =
      verified?.status === "unavailable"
        ? verified.error || "Verified stationary records could not be loaded. This is not a complete inventory."
        : !verified
          ? "Verified stationary records could not be loaded. This is not a complete inventory."
          : mobile.status === "unavailable"
            ? mobile.error || "Verified mobile records could not be loaded. This is not a complete inventory."
              : refrigerant.status === "unavailable"
              ? refrigerant.error || "Verified refrigerant records could not be loaded. This is not a complete inventory."
              : electricity?.status === "unavailable"
                ? electricity.error || "Verified electricity records could not be loaded. This is not a complete inventory."
                : heatSteam?.status === "unavailable"
                  ? heatSteam.error || "Verified heat and steam records could not be loaded. This is not a complete inventory."
                  : results.scope3Verified?.status === "unavailable"
                    ? results.scope3Verified.error || "Verified Scope 3 records could not be loaded. This is not a complete inventory."
              : "A reporting year is required. This is not a zero inventory.";
    return {
      status: "incomplete",
      inventory: "unavailable",
      reportingYear: assignment.reportingYear,
      statusLabel,
      scope1Kg: null,
      scope2Kg: null,
      scope3Kg: null,
      grandKg: null,
      verifiedTco2e: null,
      verifiedKg: null,
      biogenicCo2T: null,
      biogenicStatus: "unavailable",
      legacyStationary: legacyVisible,
      legacyMobile,
      legacyRefrigerant,
      reportableScope1,
      excludedKg,
      withheldReason,
    };
  }

  const verifiedScaled =
    (tonnesToScaled(verified.totalTco2e) || 0) +
    (tonnesToScaled(mobile.totalTco2e) || 0) +
    (tonnesToScaled(refrigerant.totalTco2e) || 0);
  const verifiedKg = scaledTonnesToKg(verifiedScaled);
  const verifiedTco2e = scaledTonnesToNumber(verifiedScaled);
  const biogenic = combineBiogenic(biogenicOf(verified), biogenicOf(mobile));
  const scope1Kg = sumKg(reportableScope1) + verifiedKg;
  const scope2Kg = scope2Known
    ? (electricityKnown ? (electricity?.totalKgCo2e ?? 0) : 0) + (heatSteamKnown ? (heatSteam?.totalKgCo2e ?? 0) : 0)
    : assignment.scope2 === "assigned" ? results.totals.scope2 : null;
  // Verified Scope 3 only. Legacy results.totals.scope3 is never assigned here.
  const scope3Kg = scope3Known ? scope3.totalKgCo2e : null;
  const unassigned =
    (verified.unassignedCount ?? 0) > 0 ||
    (mobile.unassignedCount ?? 0) > 0 ||
    (refrigerant.unassignedCount ?? 0) > 0 ||
    (electricity?.unassignedCount ?? 0) > 0 ||
    (heatSteam?.unassignedCount ?? 0) > 0 ||
    (scope3.unassignedCount ?? 0) > 0;
  const otherYear =
    (verified.otherYearCount ?? 0) > 0 ||
    (mobile.otherYearCount ?? 0) > 0 ||
    (refrigerant.otherYearCount ?? 0) > 0 ||
    (electricity?.otherYearCount ?? 0) > 0 ||
    (heatSteam?.otherYearCount ?? 0) > 0 ||
    (scope3.otherYearCount ?? 0) > 0;
  const sharedWithheld = scope2Kg == null || scope3Kg == null;
  // Scope 3 inventory is never complete while unsupported categories remain.
  const scope3Partial = scope3Known && scope3.inventoryComplete === false;
  const partial =
    sharedWithheld ||
    unassigned ||
    otherYear ||
    (refrigerant.rejectedCount ?? 0) > 0 ||
    (verified.rejectedCount ?? 0) > 0 ||
    (mobile.rejectedCount ?? 0) > 0 ||
    (electricity?.rejectedCount ?? 0) > 0 ||
    (heatSteam?.rejectedCount ?? 0) > 0 ||
    (scope3.rejectedCount ?? 0) > 0 ||
    scope2Known ||
    scope3Partial ||
    legacyVisible.length > 0 ||
    legacyMobile.length > 0 ||
    legacyRefrigerant.length > 0 ||
    legacyScope3Kg > 0;
  // Partial inventories still expose a summed figure when Scopes 1–3 are known,
  // without claiming a complete corporate inventory (inventory stays "partial").
  const grandKg =
    scope1Kg != null && scope2Kg != null && scope3Kg != null
      ? scope1Kg + scope2Kg + scope3Kg
      : null;
  const year = assignment.reportingYear;
  const notes = [
    `Reporting year ${year}.`,
    (verified.unassignedCount ?? 0) > 0
      ? "Stationary records without a reporting period are unassigned and are not included."
      : "",
    (mobile.unassignedCount ?? 0) > 0
      ? "Mobile records without a reporting period are unassigned and are not included."
      : "",
    (refrigerant.unassignedCount ?? 0) > 0
      ? "Refrigerant records without a reporting period are unassigned and are not included."
      : "",
    (verified.otherYearCount ?? 0) > 0 ? "Stationary records from other reporting years are not included." : "",
    (mobile.otherYearCount ?? 0) > 0 ? "Mobile records from other reporting years are not included." : "",
    (refrigerant.otherYearCount ?? 0) > 0 ? "Refrigerant records from other reporting years are not included." : "",
    (refrigerant.rejectedCount ?? 0) > 0
      ? "Refrigerant records with missing provenance are excluded and are not counted as verified."
      : "",
    (verified.rejectedCount ?? 0) > 0
      ? "Stationary records with missing provenance are excluded and are not counted as verified."
      : "",
    (mobile.rejectedCount ?? 0) > 0
      ? "Mobile records with missing provenance are excluded and are not counted as verified."
      : "",
    (electricity?.rejectedCount ?? 0) > 0
      ? "Electricity records with missing provenance are excluded and are not counted as verified."
      : "",
    (electricity?.unassignedCount ?? 0) > 0
      ? "Electricity records without a reporting period are unassigned and are not included."
      : "",
    (electricity?.otherYearCount ?? 0) > 0
      ? "Electricity records from other reporting years are not included."
      : "",
    (heatSteam?.rejectedCount ?? 0) > 0
      ? "Heat and steam records with missing provenance are excluded and are not counted as verified."
      : "",
    (heatSteam?.unassignedCount ?? 0) > 0
      ? "Heat and steam records without a reporting period are unassigned and are not included."
      : "",
    (heatSteam?.otherYearCount ?? 0) > 0
      ? "Heat and steam records from other reporting years are not included."
      : "",
    electricityKnown
      ? "Verified Scope 2 includes location-based purchased electricity. Contractual renewable claims are not deducted and are not added as a second total."
      : "",
    heatSteamKnown
      ? "Verified Scope 2 includes purchased heat and steam. The factor assumes natural-gas production at 80 percent thermal efficiency and is not a supplier-specific factor. On-site combustion is not included."
      : "",
    electricityKnown && !heatSteamKnown
      ? "Heat, steam, and cooling are not included. Legacy Scope 2 records are excluded."
      : "",
    heatSteamKnown
      ? "Purchased cooling is not included. Legacy Scope 2 records are excluded."
      : "",
    legacyVisible.length > 0 ? "Legacy stationary combustion is excluded and requires reconciliation." : "",
    legacyMobile.length > 0 ? "Legacy mobile combustion is excluded from the annual totals." : "",
    legacyRefrigerant.length > 0 ? "Legacy refrigerant leakage is excluded from the annual totals." : "",
    sharedWithheld && !scope3Known ? withheldReason || SHARED_SCOPE_WITHHELD_REASON : "",
    scope3Kg == null ? LEGACY_SCOPE3_EXCLUDED_LABEL + "." : "",
    scope3Known ? scope3CompletenessNote(scope3.byCategory) : "",
    (scope3.unassignedCount ?? 0) > 0
      ? "Scope 3 records without a reporting period are unassigned and are not included."
      : "",
    (scope3.otherYearCount ?? 0) > 0
      ? "Scope 3 records from other reporting years are not included."
      : "",
    (scope3.rejectedCount ?? 0) > 0
      ? "Scope 3 records with missing provenance are excluded and are not counted as verified."
      : "",
    legacyScope3Kg > 0 ? "Legacy undated Scope 3 rows are listed separately and are not added to the verified total." : "",
    "This is not an independently verified or audit-approved inventory.",
  ].filter(Boolean);

  return {
    status: partial ? "provisional" : "reportable",
    inventory: partial ? "partial" : "complete",
    reportingYear: year,
    statusLabel: notes.join(" "),
    scope1Kg,
    scope2Kg,
    scope3Kg,
    grandKg,
    verifiedTco2e,
    verifiedKg,
    biogenicCo2T: biogenic.tonnes,
    biogenicStatus: biogenic.status,
    legacyStationary: legacyVisible,
    legacyMobile,
    legacyRefrigerant,
    reportableScope1,
    excludedKg,
    withheldReason,
  };
}

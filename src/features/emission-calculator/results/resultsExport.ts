/**
 * CSV and PDF fragments for the EPA results screen.
 * Totals come from the same reportable aggregation as the on-screen figures.
 * Gas masses are copied from the stored backend record.
 */

import type { EmissionCategoryTotal, EpaIpccResultsData } from "@/features/emission-calculator/core/loaders/epaIpccResults";
import type { MobileResultActivity } from "./mobileResults";
import {
  refrigerantMethodLabel,
  refrigerantRateDisclosure,
  type RefrigerantResultActivity,
} from "./refrigerantResults";
import { biogenicReportLabel, buildReportingTotals, verifiedScope1Lines } from "./reportingTotals";
import type { StationaryResultActivity } from "./stationaryResults";

export type OfficialExportTotals = {
  scope1Kg: number | null;
  scope2Kg: number | null;
  scope3Kg: number | null;
  grandKg: number | null;
  verifiedTco2e: number | null;
  statusLabel: string;
  incomplete: boolean;
  inventory: "complete" | "partial" | "unavailable";
  reportingYear: number | null;
  biogenicCo2T: number | null;
  biogenicLabel: string;
};

function finiteCo2eKg(value: string | null | undefined): number | null {
  if (value == null || String(value).trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

/** Stored gas CO2e for verified stationary and mobile rows, plus refrigerant CO2e kept separate from CO2 mass. */
export function verifiedScope1GasCo2eKg(
  results: EpaIpccResultsData
): { CO2: number; CH4: number; N2O: number; refrigerantCo2eKg: number } | null {
  if (!results.stationaryVerified) return null;
  const reporting = buildReportingTotals(results);
  if (reporting.scope1Kg == null) return null;
  const activities = [
    ...(results.stationaryVerified.activities || []),
    ...(results.mobileVerified?.activities || []),
  ];
  const totals = { CO2: 0, CH4: 0, N2O: 0, refrigerantCo2eKg: 0 };
  for (const activity of activities) {
    const co2 = finiteCo2eKg(activity.co2.co2eKg);
    const ch4 = finiteCo2eKg(activity.ch4.co2eKg);
    const n2o = finiteCo2eKg(activity.n2o.co2eKg);
    if (co2 == null || ch4 == null || n2o == null) return null;
    totals.CO2 += co2;
    totals.CH4 += ch4;
    totals.N2O += n2o;
  }
  for (const activity of results.refrigerantVerified?.activities || []) {
    const refrigerant = finiteCo2eKg(activity.emissionsKgCo2e);
    if (refrigerant == null) return null;
    totals.refrigerantCo2eKg += refrigerant;
  }
  return totals;
}

/** Verified purchased electricity and heat/steam, in kilograms. Null when those blocks are absent. */
export function reportableScope2Rows(results: EpaIpccResultsData): EmissionCategoryTotal[] | null {
  const electricity = results.electricityVerified;
  const heat = results.heatSteamVerified;
  const electricityKnown = electricity != null && electricity.status !== "unavailable";
  const heatKnown = heat != null && heat.status !== "unavailable";
  if (!electricityKnown && !heatKnown) return null;
  const rows: EmissionCategoryTotal[] = [];
  if (electricityKnown && electricity) {
    rows.push({
      key: "purchased_electricity",
      label: "Purchased electricity (location-based, verified)",
      value: electricity.totalKgCo2e,
    });
  }
  if (heatKnown && heat) {
    rows.push({
      key: "purchased_heat_steam",
      label: "Purchased heat and steam (verified)",
      value: heat.totalKgCo2e,
    });
  }
  return rows;
}

export function officialExportTotals(results: EpaIpccResultsData): OfficialExportTotals {
  if (!results.stationaryVerified) {
    // UK / non-EPA path: never treat legacy Scope 3 as verified, and never mark complete.
    const scope3Block = results.scope3Verified;
    const scope3Known = scope3Block != null && scope3Block.status !== "unavailable";
    const scope3Kg = scope3Known ? scope3Block.totalKgCo2e : null;
    const scope1Kg = results.totals.scope1;
    const scope2Kg = results.totals.scope2;
    const grandKg =
      scope3Kg == null ? null : scope1Kg + scope2Kg + scope3Kg;
    return {
      scope1Kg,
      scope2Kg,
      scope3Kg,
      grandKg,
      verifiedTco2e: null,
      statusLabel: scope3Known
        ? "Verified Scope 3 subtotal is partial. Legacy Scope 3 rows are excluded."
        : "Legacy Scope 3 records are excluded from the verified annual total.",
      incomplete: true,
      inventory: "partial",
      reportingYear: null,
      biogenicCo2T: null,
      biogenicLabel: "Biogenic CO2 not recorded",
    };
  }
  const reporting = buildReportingTotals(results);
  return {
    scope1Kg: reporting.scope1Kg,
    scope2Kg: reporting.scope2Kg,
    scope3Kg: reporting.scope3Kg,
    grandKg: reporting.grandKg,
    verifiedTco2e: reporting.verifiedTco2e,
    statusLabel: reporting.statusLabel,
    incomplete: reporting.inventory === "unavailable",
    inventory: reporting.inventory,
    reportingYear: reporting.reportingYear,
    biogenicCo2T: reporting.biogenicCo2T,
    biogenicLabel: biogenicReportLabel(reporting.biogenicCo2T, reporting.biogenicStatus),
  };
}

export function reportableScope3Rows(results: EpaIpccResultsData): EmissionCategoryTotal[] | null {
  const block = results.scope3Verified;
  if (!block || block.status === "unavailable") return null;
  return block.byCategory
    .filter((row) => row.status === "verified" && row.kgCo2e != null)
    .map((row) => ({ key: row.key, label: `${row.label} (verified)`, value: row.kgCo2e || 0 }));
}

export function withReportableTotals(results: EpaIpccResultsData): EpaIpccResultsData {
  if (!results.stationaryVerified) return results;
  const reporting = buildReportingTotals(results);
  const verifiedLines = reporting.scope1Kg == null ? [] : verifiedScope1Lines(results);
  const scope3Rows = reportableScope3Rows(results);
  return {
    ...results,
    scope1: [...verifiedLines, ...reporting.reportableScope1],
    scope3: scope3Rows ?? results.scope3,
    totals: {
      scope1: reporting.scope1Kg ?? 0,
      scope2: reporting.scope2Kg ?? results.totals.scope2,
      scope3: reporting.scope3Kg ?? 0,
      grand: reporting.grandKg ?? 0,
    },
  };
}

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function line(cells: Array<string | number | null | undefined>): string {
  return cells.map(csvCell).join(",");
}

function kgToTonnes(kg: number): string {
  const scaled = Math.round(kg * 100000);
  return String(scaled / 100000000);
}

export function buildEpaResultsCsv(results: EpaIpccResultsData): string {
  const official = officialExportTotals(results);
  const reporting = results.stationaryVerified ? buildReportingTotals(results) : null;
  const rows: string[] = [];

  rows.push(line(["Report", "Carbon Footprint Assessment"]));
  rows.push(line(["Reporting year", official.reportingYear ?? "Unassigned"]));
  rows.push(line(["Inventory", official.inventory]));
  rows.push(line(["Inventory status", official.statusLabel || "Reportable"]));
  rows.push(line([]));
  rows.push(line(["Scope", "Category", "Emissions (kg CO2e)", "Emissions (t CO2e)"]));

  const scope1Rows = reporting ? reporting.reportableScope1 : results.scope1;
  if (reporting && reporting.scope1Kg != null) {
    verifiedScope1Lines(results).forEach((row) => {
      rows.push(line(["Scope 1", row.label, row.value, kgToTonnes(row.value)]));
    });
  }
  scope1Rows.forEach((row) => {
    rows.push(line(["Scope 1", row.label, row.value, kgToTonnes(row.value)]));
  });
  rows.push(
    line([
      "Scope 1",
      "Total",
      official.scope1Kg == null ? "Unavailable" : official.scope1Kg,
      official.scope1Kg == null ? "Unavailable" : kgToTonnes(official.scope1Kg),
    ])
  );
  rows.push(
    line([
      "Biogenic CO2",
      "Reported outside Scope 1",
      "not included",
      official.biogenicLabel,
    ])
  );
  rows.push(line([]));

  if (official.scope2Kg == null) {
    rows.push(line(["Scope 2", "Total", "Unassigned", "Unassigned"]));
  } else if (results.electricityVerified || results.heatSteamVerified) {
    if (results.electricityVerified) {
      const electricityKg =
        results.electricityVerified.status === "unavailable" ? null : results.electricityVerified.totalKgCo2e;
      rows.push(
        line([
          "Scope 2",
          "Purchased electricity (location-based, verified)",
          electricityKg == null ? "Unavailable" : electricityKg,
          electricityKg == null ? "Unavailable" : kgToTonnes(electricityKg),
        ])
      );
    }
    if (results.heatSteamVerified && results.heatSteamVerified.status !== "unavailable") {
      rows.push(
        line([
          "Scope 2",
          "Purchased heat and steam (verified)",
          results.heatSteamVerified.totalKgCo2e,
          kgToTonnes(results.heatSteamVerified.totalKgCo2e),
        ])
      );
      rows.push(line(["Scope 2", "Purchased cooling", "Not included", "Not included"]));
    } else {
      rows.push(line(["Scope 2", "Heat, steam and cooling", "Not included", "Not included"]));
    }
    rows.push(
      line([
        "Scope 2",
        "Total",
        official.scope2Kg,
        kgToTonnes(official.scope2Kg),
      ])
    );
  } else {
    results.scope2.forEach((row) => rows.push(line(["Scope 2", row.label, row.value, kgToTonnes(row.value)])));
    rows.push(line(["Scope 2", "Total", official.scope2Kg, kgToTonnes(official.scope2Kg)]));
  }
  rows.push(line([]));

  if (official.scope3Kg == null) {
    rows.push(line(["Scope 3", "Total", "Unassigned", "Legacy excluded from verified annual total"]));
    rows.push(line(["Scope 3", "Fuel- and energy-related activities", "Not calculated", "Not calculated"]));
    rows.push(line(["Scope 3", "Franchises", "Not calculated", "Not calculated"]));
    rows.push(line(["Scope 3", "Upstream leased assets", "Not calculated", "Not calculated"]));
    rows.push(line(["Scope 3", "Downstream leased assets", "Not calculated", "Not calculated"]));
  } else {
    const verifiedRows = reportableScope3Rows(results);
    if (verifiedRows && verifiedRows.length > 0) {
      verifiedRows.forEach((row) => rows.push(line(["Scope 3", row.label, row.value, kgToTonnes(row.value)])));
    }
    const completeness = results.scope3Verified?.byCategory || [];
    completeness
      .filter((row) => row.status !== "verified" && row.status !== "legacy_excluded")
      .forEach((row) =>
        rows.push(
          line([
            "Scope 3",
            row.label,
            row.status === "no_activity" ? "No activity" : "Not calculated",
            row.status === "no_activity" ? "Incomplete" : "Unsupported / awaiting factors",
          ]),
        ),
      );
    rows.push(line(["Scope 3", "Verified partial total", official.scope3Kg, kgToTonnes(official.scope3Kg)]));
    rows.push(line(["Scope 3", "Inventory status", "Partial", "Not a complete Scope 3 inventory"]));
  }
  rows.push(line([]));
  rows.push(
    line([
      "All Scopes",
      "Grand Total",
      official.grandKg == null ? (official.inventory === "partial" ? "Partial" : "Unavailable") : official.grandKg,
      official.grandKg == null ? (official.inventory === "partial" ? "Partial" : "Unavailable") : kgToTonnes(official.grandKg),
    ])
  );

  if (official.statusLabel) {
    rows.push(line([]));
    rows.push(line(["Note", official.statusLabel]));
  }
  if (
    (results.electricityVerified && results.electricityVerified.status !== "unavailable") ||
    (results.heatSteamVerified && results.heatSteamVerified.status !== "unavailable")
  ) {
    rows.push(line([]));
    rows.push(line(["Legacy Scope 2 — excluded from verified annual totals"]));
    results.scope2.forEach((row) => rows.push(line(["Scope 2", row.label, row.value, "excluded"])));
    rows.push(line(["Legacy Scope 3 — excluded from verified annual totals"]));
    results.scope3.forEach((row) => rows.push(line(["Scope 3", row.label, row.value, "legacy excluded"])));
  } else if (official.scope2Kg == null || official.scope3Kg == null) {
    rows.push(line([]));
    rows.push(line(["Unassigned stored records — not in the annual total"]));
    results.scope2.forEach((row) => rows.push(line(["Scope 2", row.label, row.value, "unassigned"])));
    results.scope3.forEach((row) => rows.push(line(["Scope 3", `${row.label} (legacy, excluded)`, row.value, "legacy excluded"])));
  }

  rows.push(line([]));
  rows.push(line(["Verified stationary combustion"]));
  rows.push(
    line([
      "Record ID",
      "Fuel category",
      "Fuel name",
      "Equipment type",
      "Site",
      "Equipment ID",
      "Reporting period",
      "Quantity",
      "Unit",
      "CO2 mass (kg)",
      "CH4 mass (kg)",
      "N2O mass (kg)",
      "CO2 CO2e (kg)",
      "CH4 CO2e (kg)",
      "N2O CO2e (kg)",
      "Total emissions (kg CO2e)",
      "Scope 1 emissions (tCO2e)",
      "Biogenic CO2 (t CO2)",
      "Accounting treatment",
      "GWP version",
      "Methodology",
      "Emission factor source",
      "Dataset version",
    ])
  );
  const activities = results.stationaryVerified?.activities || [];
  activities.forEach((activity) => rows.push(line(stationaryCsvCells(activity))));

  rows.push(line([]));
  rows.push(line(["Legacy stationary combustion — requires reconciliation"]));
  rows.push(line(["Source", "Emissions (kg CO2e)", "Emissions (t CO2e)"]));
  (reporting?.legacyStationary || []).forEach((row) => {
    rows.push(line([row.label, row.value, kgToTonnes(row.value)]));
  });

  rows.push(line([]));
  rows.push(line(["Verified mobile combustion"]));
  rows.push(
    line([
      "Record ID",
      "Vehicle or equipment",
      "Fuel",
      "Reporting period",
      "Fuel quantity",
      "Fuel unit",
      "Distance",
      "Distance unit",
      "CO2 mass (kg)",
      "CH4 mass (kg)",
      "N2O mass (kg)",
      "Scope 1 emissions (tCO2e)",
      "Biogenic CO2 (t CO2)",
      "GWP version",
      "Factor provenance",
      "Methodology",
    ])
  );
  (results.mobileVerified?.activities || []).forEach((activity) => rows.push(line(mobileCsvCells(activity))));

  rows.push(line([]));
  rows.push(line(["Legacy Mobile Combustion — Excluded from Annual Totals"]));
  rows.push(line(["Source", "Emissions (kg CO2e)", "Emissions (t CO2e)"]));
  (reporting?.legacyMobile || []).forEach((row) => {
    rows.push(line([row.label, row.value, kgToTonnes(row.value)]));
  });

  rows.push(line([]));
  rows.push(line(["Verified refrigerant leakage"]));
  rows.push(
    line([
      "Record ID",
      "Refrigerant",
      "Method",
      "Leaked refrigerant (kg)",
      "Charge (kg)",
      "User leakage rate assumption",
      "Equipment type",
      "Equipment ID",
      "Site",
      "Reporting month",
      "GWP",
      "Factor source",
      "Methodology",
      "Emissions (tCO2e)",
    ])
  );
  (results.refrigerantVerified?.activities || []).forEach((activity) => rows.push(line(refrigerantCsvCells(activity))));

  rows.push(line([]));
  rows.push(line(["Legacy Refrigerant Leakage — Excluded from Annual Totals"]));
  rows.push(line(["Source", "Stored kg CO2e", "Not a verified tonne total"]));
  (reporting?.legacyRefrigerant || []).forEach((row) => {
    rows.push(line([row.label, row.value, "excluded"]));
  });

  return rows.join("\n");
}

function stationaryCsvCells(activity: StationaryResultActivity): Array<string | number> {
  return [
    activity.id,
    activity.fuelCategory,
    activity.fuel,
    activity.equipmentType,
    activity.site,
    activity.equipmentId,
    activity.period,
    activity.quantity,
    activity.unit,
    activity.co2.massKg,
    activity.ch4.massKg,
    activity.n2o.massKg,
    activity.co2.co2eKg,
    activity.ch4.co2eKg,
    activity.n2o.co2eKg,
    activity.totalKgCo2e,
    activity.totalTco2e,
    activity.biogenicCo2Tonnes ?? "not recorded",
    activity.accountingTreatment || "not recorded",
    activity.gwpVersion,
    activity.methodology || "not recorded",
    activity.factorSource,
    activity.factorVersion || "imported_from_sheet",
  ];
}

function refrigerantCsvCells(activity: RefrigerantResultActivity): Array<string | number> {
  return [
    activity.id,
    activity.refrigerant,
    refrigerantMethodLabel(activity.method),
    activity.leakageKg,
    activity.chargeKg,
    refrigerantRateDisclosure(activity) || "",
    activity.equipmentType,
    activity.equipmentId,
    activity.site,
    activity.period,
    activity.gwp,
    `${activity.gwpPublication}; ${activity.factorProvenance}`,
    activity.methodology,
    activity.totalTco2e,
  ];
}

function mobileCsvCells(activity: MobileResultActivity): Array<string | number> {
  return [
    activity.id,
    activity.vehicleType || activity.roadClass,
    activity.fuel,
    activity.period,
    activity.fuelQuantity,
    activity.fuelUnit,
    activity.distance,
    activity.distanceUnit,
    activity.co2.massKg,
    activity.ch4.massKg,
    activity.n2o.massKg,
    activity.totalTco2e,
    activity.biogenicCo2Tonnes ?? "not recorded",
    activity.gwpVersion,
    activity.factorSource,
    activity.methodology || "not recorded",
  ];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function stationaryReportHtml(results: EpaIpccResultsData): string {
  const reporting = results.stationaryVerified ? buildReportingTotals(results) : null;
  const activities = results.stationaryVerified?.activities || [];
  const stationaryBlock = results.stationaryVerified;
  const stationaryTotal =
    !stationaryBlock || stationaryBlock.status === "unavailable" || reporting?.scope1Kg == null
      ? "Unavailable"
      : `${stationaryBlock.totalTco2e} tCO2e`;
  const activityRows = activities
    .map(
      (activity) => `<tr>
        <td>${escapeHtml(activity.fuel || "—")}</td>
        <td>${escapeHtml(activity.equipmentType || "—")}<br/>${escapeHtml(activity.equipmentId || "")}</td>
        <td>${escapeHtml(activity.site || "—")}</td>
        <td>${escapeHtml(activity.period || "—")}</td>
        <td>${escapeHtml(activity.quantity)} ${escapeHtml(activity.unit)}</td>
        <td>${escapeHtml(activity.co2.massKg)} kg<br/>${escapeHtml(activity.co2.co2eKg)} kg CO2e</td>
        <td>${escapeHtml(activity.ch4.massKg)} kg<br/>${escapeHtml(activity.ch4.co2eKg)} kg CO2e</td>
        <td>${escapeHtml(activity.n2o.massKg)} kg<br/>${escapeHtml(activity.n2o.co2eKg)} kg CO2e</td>
        <td>${escapeHtml(activity.totalTco2e)}<br/>Biogenic ${escapeHtml(activity.biogenicCo2Tonnes || "not recorded")} t CO2</td>
        <td>${escapeHtml(activity.gwpVersion || "—")}<br/>${escapeHtml(activity.factorSource || "—")}</td>
      </tr>`
    )
    .join("");
  const legacyRows = (reporting?.legacyStationary || [])
    .map(
      (row) =>
        `<tr><td>${escapeHtml(row.label)}</td><td class="num">${row.value}</td></tr>`
    )
    .join("");

  return `
    <div class="subsection-title" style="margin-top:16px;">Verified stationary combustion</div>
    <p class="body-text">${
      results.stationaryVerified
        ? `Stationary ${escapeHtml(stationaryTotal)}. ${escapeHtml(biogenicReportLabel(reporting?.biogenicCo2T ?? null, reporting?.biogenicStatus || "not_recorded"))}. GWP AR5. Biogenic CO2 is not included in Scope 1 or the report total. Gas masses are the stored backend results.`
        : `Total ${escapeHtml(stationaryTotal)}. Gas masses are the stored backend results. Dataset version is imported_from_sheet when that is the factor version on the record.`
    }</p>
    ${
      reporting?.status === "incomplete"
        ? `<p class="body-text">${escapeHtml(reporting.statusLabel)} This is not a complete inventory.</p>`
        : ""
    }
    <table class="scope3-table">
      <thead><tr><th>Fuel</th><th>Equipment</th><th>Site</th><th>Period</th><th>Consumption</th><th>CO2</th><th>CH4</th><th>N2O</th><th>tCO2e</th><th>GWP / factor source</th></tr></thead>
      <tbody>${activityRows || `<tr><td colspan="10">No verified stationary combustion records.</td></tr>`}</tbody>
    </table>
    <div class="subsection-title" style="margin-top:16px;">Legacy stationary combustion — requires reconciliation</div>
    <p class="body-text">These historical figures are not included in the verified stationary total or the reportable Scope 1 and grand totals.</p>
    <table class="scope3-table">
      <thead><tr><th>Source</th><th>Stored kg</th></tr></thead>
      <tbody>${legacyRows || `<tr><td colspan="2">No unreconciled legacy stationary records.</td></tr>`}</tbody>
    </table>
    ${mobileReportHtml(results, reporting)}
    ${refrigerantReportHtml(results, reporting)}
    ${electricityReportHtml(results, reporting)}
    ${heatSteamReportHtml(results, reporting)}
  `;
}

function electricityReportHtml(
  results: EpaIpccResultsData,
  reporting: ReturnType<typeof buildReportingTotals> | null
): string {
  const block = results.electricityVerified;
  if (!block) return "";
  const heatIncluded = results.heatSteamVerified && results.heatSteamVerified.status !== "unavailable";
  const total =
    block.status === "unavailable" || reporting?.scope2Kg == null
      ? "Unavailable"
      : `${block.totalTco2e} tCO2e`;
  const activityRows = (block.activities || [])
    .map(
      (activity) => `<tr>
        <td>${escapeHtml(activity.period || "—")}</td>
        <td>${escapeHtml(activity.country)} / ${escapeHtml(activity.gridRegion)}</td>
        <td>${escapeHtml(activity.quantity)} ${escapeHtml(activity.unit)}</td>
        <td>${escapeHtml(activity.publisher)}<br/>${escapeHtml(activity.sourceDocument)} (${escapeHtml(activity.publicationYear)})</td>
        <td>${escapeHtml(activity.factorValue)} ${escapeHtml(activity.factorUnit)}<br/>${escapeHtml(activity.gasCoverage)}</td>
        <td>${escapeHtml(activity.totalTco2e)}</td>
      </tr>`
    )
    .join("");
  const legacyRows = (results.scope2 || [])
    .map((row) => `<tr><td>${escapeHtml(row.label)}</td><td class="num">${row.value}</td><td>excluded</td></tr>`)
    .join("");
  return `
    <div class="subsection-title" style="margin-top:16px;">Verified purchased electricity — location-based</div>
    <p class="body-text">Purchased electricity ${escapeHtml(total)}. ${
      heatIncluded
        ? "Purchased heat and steam are reported separately. Purchased cooling is not included."
        : "Heat, steam, and cooling are not included."
    } Contractual renewable claims are not deducted. Legacy Scope 2 records are excluded. This is not a complete Scope 2 inventory.</p>
    <table class="scope3-table">
      <thead><tr><th>Period</th><th>Grid</th><th>Quantity</th><th>Factor source</th><th>Factor</th><th>tCO2e</th></tr></thead>
      <tbody>${activityRows || `<tr><td colspan="6">No verified purchased-electricity records.</td></tr>`}</tbody>
    </table>
    <div class="subsection-title" style="margin-top:16px;">Legacy Scope 2 — excluded from verified annual totals</div>
    <table class="scope3-table">
      <thead><tr><th>Source</th><th>Stored kg</th><th>Annual total</th></tr></thead>
      <tbody>${legacyRows || `<tr><td colspan="3">No legacy Scope 2 records.</td></tr>`}</tbody>
    </table>
  `;
}

function heatSteamReportHtml(
  results: EpaIpccResultsData,
  reporting: ReturnType<typeof buildReportingTotals> | null
): string {
  const block = results.heatSteamVerified;
  if (!block) return "";
  const total =
    block.status === "unavailable" || reporting?.scope2Kg == null
      ? "Unavailable"
      : `${block.totalTco2e} tCO2e`;
  const activityRows = (block.activities || [])
    .map(
      (activity) => `<tr>
        <td>${escapeHtml(activity.period || "—")}</td>
        <td>${escapeHtml(activity.energyForm === "purchased_steam" ? "Purchased steam" : "Purchased heat")}</td>
        <td>${escapeHtml(activity.quantity)} ${escapeHtml(activity.unit)}</td>
        <td>${escapeHtml(activity.supplierName || "—")}</td>
        <td>${escapeHtml(activity.publisher)}<br/>${escapeHtml(activity.sourceDocument)}</td>
        <td>${escapeHtml(activity.totalTco2e)}</td>
      </tr>`
    )
    .join("");
  return `
    <div class="subsection-title" style="margin-top:16px;">Verified purchased heat and steam</div>
    <p class="body-text">Purchased heat and steam ${escapeHtml(total)}. US EPA Table 7 factors assume natural-gas production at 80 percent thermal efficiency and are not supplier-specific. On-site combustion is not included. Purchased cooling is not included. Legacy heat and steam records are excluded.</p>
    <table class="scope3-table">
      <thead><tr><th>Period</th><th>Energy</th><th>Quantity</th><th>Supplier</th><th>Factor source</th><th>tCO2e</th></tr></thead>
      <tbody>${activityRows || `<tr><td colspan="6">No verified purchased heat or steam records.</td></tr>`}</tbody>
    </table>
  `;
}

function mobileReportHtml(
  results: EpaIpccResultsData,
  reporting: ReturnType<typeof buildReportingTotals> | null
): string {
  const mobile = results.mobileVerified;
  const mobileTotal =
    !mobile || mobile.status === "unavailable" || reporting?.scope1Kg == null
      ? "Unavailable"
      : `${mobile.totalTco2e} tCO2e`;
  const activityRows = (mobile?.activities || [])
    .map(
      (activity) => `<tr>
        <td>${escapeHtml(activity.vehicleType || activity.roadClass || "—")}</td>
        <td>${escapeHtml(activity.fuel || "—")}</td>
        <td>${escapeHtml(activity.period || "—")}</td>
        <td>${escapeHtml(activity.co2.massKg)} kg</td>
        <td>${escapeHtml(activity.ch4.massKg)} kg</td>
        <td>${escapeHtml(activity.n2o.massKg)} kg</td>
        <td>${escapeHtml(activity.totalTco2e)}</td>
        <td>${escapeHtml(activity.biogenicCo2Tonnes || "not recorded")}</td>
        <td>${escapeHtml(activity.gwpVersion || "—")}<br/>${escapeHtml(activity.factorSource || "—")}</td>
      </tr>`
    )
    .join("");
  const legacyRows = (reporting?.legacyMobile || [])
    .map((row) => `<tr><td>${escapeHtml(row.label)}</td><td class="num">${row.value}</td></tr>`)
    .join("");
  return `
    <div class="subsection-title" style="margin-top:16px;">Verified mobile combustion</div>
    <p class="body-text">Mobile ${escapeHtml(mobileTotal)}. Biogenic CO2 is reported separately and is not included in Scope 1.</p>
    <table class="scope3-table">
      <thead><tr><th>Vehicle or equipment</th><th>Fuel</th><th>Period</th><th>CO2</th><th>CH4</th><th>N2O</th><th>Scope 1 tCO2e</th><th>Biogenic CO2 (t)</th><th>GWP / factor provenance</th></tr></thead>
      <tbody>${activityRows || `<tr><td colspan="9">No verified mobile combustion records.</td></tr>`}</tbody>
    </table>
    <div class="subsection-title" style="margin-top:16px;">Legacy Mobile Combustion — Excluded from Annual Totals</div>
    <p class="body-text">These historical mobile figures are not included in Scope 1 or the annual total. They are not recalculated.</p>
    <table class="scope3-table">
      <thead><tr><th>Source</th><th>Stored kg</th></tr></thead>
      <tbody>${legacyRows || `<tr><td colspan="2">No legacy mobile combustion records in this view.</td></tr>`}</tbody>
    </table>
  `;
}

function refrigerantReportHtml(
  results: EpaIpccResultsData,
  reporting: ReturnType<typeof buildReportingTotals> | null
): string {
  const refrigerant = results.refrigerantVerified;
  const refrigerantTotal =
    !refrigerant || refrigerant.status === "unavailable" || reporting?.scope1Kg == null
      ? "Unavailable"
      : `${refrigerant.totalTco2e} tCO2e`;
  const activityRows = (refrigerant?.activities || [])
    .map((activity) => {
      const rate = refrigerantRateDisclosure(activity);
      const equipment = [activity.equipmentType, activity.equipmentId, activity.site].filter(Boolean).join(" · ");
      return `<tr>
        <td>${escapeHtml(activity.refrigerant)}</td>
        <td>${escapeHtml(refrigerantMethodLabel(activity.method))}${rate ? `<br/>${escapeHtml(rate)}` : ""}</td>
        <td>${escapeHtml(activity.leakageKg)} kg refrigerant</td>
        <td>${escapeHtml(equipment || "—")}</td>
        <td>${escapeHtml(activity.period || "—")}</td>
        <td>${escapeHtml(activity.gwp)}<br/>${escapeHtml(activity.gwpPublication)}<br/>${escapeHtml(activity.factorProvenance)}</td>
        <td>${escapeHtml(activity.totalTco2e)} tCO2e</td>
      </tr>`;
    })
    .join("");
  const legacyRows = (reporting?.legacyRefrigerant || [])
    .map((row) => `<tr><td>${escapeHtml(row.label)}</td><td class="num">${row.value} kg CO2e</td></tr>`)
    .join("");
  return `
    <div class="subsection-title" style="margin-top:16px;">Verified refrigerant leakage</div>
    <p class="body-text">Refrigerant leakage ${escapeHtml(refrigerantTotal)}. This is refrigerant CO2e, not CO2 mass. Leaked kilograms are not added to the annual total.</p>
    <table class="scope3-table">
      <thead><tr><th>Refrigerant</th><th>Method</th><th>Leaked refrigerant</th><th>Equipment</th><th>Reporting month</th><th>GWP / factor source</th><th>tCO2e</th></tr></thead>
      <tbody>${activityRows || `<tr><td colspan="7">No verified refrigerant leakage records.</td></tr>`}</tbody>
    </table>
    <div class="subsection-title" style="margin-top:16px;">Legacy Refrigerant Leakage — Excluded from Annual Totals</div>
    <p class="body-text">These historical refrigerant figures are stored kilograms of CO2e. They are not verified tonnes, and they are not included in Scope 1.</p>
    <table class="scope3-table">
      <thead><tr><th>Source</th><th>Stored kg CO2e</th></tr></thead>
      <tbody>${legacyRows || `<tr><td colspan="2">No legacy refrigerant leakage records in this view.</td></tr>`}</tbody>
    </table>
  `;
}

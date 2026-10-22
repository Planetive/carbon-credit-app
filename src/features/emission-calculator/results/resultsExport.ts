/**
 * CSV and PDF fragments for the EPA results screen.
 * Totals come from the same reportable aggregation as the on-screen figures.
 * Gas masses are copied from the stored backend record.
 */

import type { EpaIpccResultsData } from "@/features/emission-calculator/core/loaders/epaIpccResults";
import { buildReportingTotals } from "./reportingTotals";
import type { StationaryResultActivity } from "./stationaryResults";

export type OfficialExportTotals = {
  scope1Kg: number | null;
  grandKg: number | null;
  verifiedTco2e: number | null;
  statusLabel: string;
  incomplete: boolean;
};

export function officialExportTotals(results: EpaIpccResultsData): OfficialExportTotals {
  if (!results.stationaryVerified) {
    return {
      scope1Kg: results.totals.scope1,
      grandKg: results.totals.grand,
      verifiedTco2e: null,
      statusLabel: "",
      incomplete: false,
    };
  }
  const reporting = buildReportingTotals(results);
  return {
    scope1Kg: reporting.scope1Kg,
    grandKg: reporting.grandKg,
    verifiedTco2e: reporting.verifiedTco2e,
    statusLabel: reporting.statusLabel,
    incomplete: reporting.status === "incomplete",
  };
}

export function withReportableTotals(results: EpaIpccResultsData): EpaIpccResultsData {
  if (!results.stationaryVerified) return results;
  const reporting = buildReportingTotals(results);
  if (reporting.scope1Kg == null || reporting.grandKg == null) {
    const otherScope1Kg = reporting.reportableScope1.reduce((sum, row) => sum + (row.value || 0), 0);
    return {
      ...results,
      scope1: reporting.reportableScope1,
      totals: {
        scope1: otherScope1Kg,
        scope2: results.totals.scope2,
        scope3: results.totals.scope3,
        grand: otherScope1Kg + results.totals.scope2 + results.totals.scope3,
      },
    };
  }
  const verifiedLine =
    reporting.verifiedKg != null && reporting.verifiedKg > 0
      ? [
          {
            key: "stationary_verified",
            label: "Stationary combustion (verified)",
            value: reporting.verifiedKg,
          },
        ]
      : [];
  return {
    ...results,
    scope1: [...verifiedLine, ...reporting.reportableScope1],
    totals: {
      scope1: reporting.scope1Kg,
      scope2: results.totals.scope2,
      scope3: results.totals.scope3,
      grand: reporting.grandKg,
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
  rows.push(line(["Inventory status", official.statusLabel || "Reportable"]));
  rows.push(line([]));
  rows.push(line(["Scope", "Category", "Emissions (kg CO2e)", "Emissions (t CO2e)"]));

  const scope1Rows = reporting ? reporting.reportableScope1 : results.scope1;
  if (reporting?.verifiedKg != null && reporting.verifiedKg > 0) {
    rows.push(
      line([
        "Scope 1",
        "Stationary combustion (verified)",
        reporting.verifiedKg,
        reporting.verifiedTco2e,
      ])
    );
  }
  scope1Rows.forEach((row) => {
    rows.push(line(["Scope 1", row.label, row.value, kgToTonnes(row.value)]));
  });
  rows.push(
    line([
      "Scope 1",
      "Total",
      official.scope1Kg == null ? "Incomplete" : official.scope1Kg,
      official.scope1Kg == null ? "Incomplete" : kgToTonnes(official.scope1Kg),
    ])
  );
  rows.push(line([]));

  results.scope2.forEach((row) => rows.push(line(["Scope 2", row.label, row.value, kgToTonnes(row.value)])));
  rows.push(line(["Scope 2", "Total", results.totals.scope2, kgToTonnes(results.totals.scope2)]));
  rows.push(line([]));

  results.scope3.forEach((row) => rows.push(line(["Scope 3", row.label, row.value, kgToTonnes(row.value)])));
  rows.push(line(["Scope 3", "Total", results.totals.scope3, kgToTonnes(results.totals.scope3)]));
  rows.push(line([]));
  rows.push(
    line([
      "All Scopes",
      "Grand Total",
      official.grandKg == null ? "Incomplete" : official.grandKg,
      official.grandKg == null ? "Incomplete" : kgToTonnes(official.grandKg),
    ])
  );

  if (official.incomplete) {
    rows.push(line([]));
    rows.push(line(["Note", official.statusLabel]));
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
      "Total emissions (tCO2e)",
      "GWP version",
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
    activity.gwpVersion,
    activity.factorSource,
    activity.factorVersion || "imported_from_sheet",
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
  const verifiedTotal =
    reporting?.verifiedTco2e == null
      ? "Incomplete"
      : `${reporting.verifiedTco2e} tCO2e`;
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
        <td>${escapeHtml(activity.totalTco2e)}</td>
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
    <p class="body-text">Total ${escapeHtml(verifiedTotal)}. Gas masses are the stored backend results. Dataset version is imported_from_sheet when that is the factor version on the record.</p>
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
  `;
}

import { describe, expect, it } from "vitest";
import type { EpaIpccResultsData } from "@/features/emission-calculator/core/loaders/epaIpccResults";
import { buildReportingTotals } from "@/features/emission-calculator/results/reportingTotals";
import type { StationaryVerifiedResults } from "@/features/emission-calculator/results/stationaryResults";
import { productionAnnualAssignment } from "@/features/emission-calculator/results/reportingYear";
import {
  dashboardOverviewNote,
  dashboardStationaryContext,
  dashboardTrackedLabel,
  failedDashboardSummary,
  kgToTco2e,
  missingOrganizationSummary,
  summarizeDashboardEmissions,
  type DashboardEmissionsSummary,
} from "./dashboardEmissions";

function verified(
  totalTco2e: number,
  totalKgCo2e: number,
  ids: string[] = ["activity-ng"]
): StationaryVerifiedResults {
  return {
    status: "ready",
    error: null,
    totalTco2e,
    totalKgCo2e,
    activities: ids.map((id) => ({
      id,
      assessmentId: "assessment-1",
      organizationId: "org-1",
      counterpartyId: null,
      fuel: "Natural Gas",
      fuelCategory: "Natural Gas",
      quantity: "100",
      unit: "mmBtu",
      equipmentType: "Boiler",
      site: "North plant",
      equipmentId: "BLR-1",
      period: "2026-10",
      co2: { massKg: "5306", gwp: "1", co2eKg: "5306" },
      ch4: { massKg: "0.1", gwp: "28", co2eKg: "2.8" },
      n2o: { massKg: "0.01", gwp: "265", co2eKg: "2.65" },
      totalKgCo2e: String(totalKgCo2e),
      totalTco2e: String(totalTco2e),
      gwpVersion: "AR5",
      factorSource: "EPA",
      factorVersion: "imported_from_sheet",
    })),
  };
}

function results(overrides: Partial<EpaIpccResultsData> = {}): EpaIpccResultsData {
  const scope1 = overrides.scope1 || [
    { key: "fuel", label: "Fuel", value: 0 },
    { key: "mobile", label: "Mobile", value: 20 },
    { key: "kitchen", label: "Kitchen", value: 0 },
    { key: "power", label: "Power", value: 0 },
    { key: "heating", label: "Heating", value: 0 },
    { key: "heatsteam", label: "Heat", value: 0 },
    { key: "flaring", label: "Flaring", value: 7 },
  ];
  const scope1Total = scope1.reduce((sum, row) => sum + row.value, 0);
  const scope2 = overrides.totals?.scope2 ?? 30;
  const scope3 = overrides.totals?.scope3 ?? 4;
  return {
    scope1,
    scope1ByActivity: [],
    scope2: overrides.scope2 || [{ key: "electricity", label: "Electricity", value: scope2 }],
    scope3: overrides.scope3 || [{ key: "waste", label: "Waste", value: scope3 }],
    stationaryVerified:
      "stationaryVerified" in overrides ? overrides.stationaryVerified : verified(5.31145, 5311.45),
    annualReporting: overrides.annualReporting || productionAnnualAssignment(2026),
    totals: overrides.totals || {
      scope1: scope1Total,
      scope2,
      scope3,
      grand: scope1Total + scope2 + scope3,
    },
  };
}

describe("dashboard EPA summary", () => {
  it("includes 100 mmBtu natural gas as 5.31145 tCO2e once", () => {
    const data = results();
    const summary = summarizeDashboardEmissions(data);
    expect(summary.verifiedTco2e).toBe(5.31145);
    expect(summary.scope1Kg).toBe(5311.45);
    expect(summary.scope2Kg).toBeNull();
    expect(summary.grandKg).toBeNull();
    expect(summary.inventory).toBe("partial");
    expect(kgToTco2e(summary.scope1Kg!)).toBe(5.31145);
  });

  it("aggregates multiple stationary records once and leaves Scope 2 and 3 unchanged", () => {
    const data = results({
      stationaryVerified: verified(5.31145 + 2.620328, 5311.45 + 2620.328, ["activity-ng", "activity-anthracite"]),
    });
    const summary = summarizeDashboardEmissions(data);
    const screen = buildReportingTotals(data);
    expect(summary.scope1Kg).toBe(screen.scope1Kg);
    expect(summary.scope1Kg).toBe(7931.778);
    expect(summary.scope2Kg).toBeNull();
    expect(summary.scope3Kg).toBeNull();
    expect(summary.grandKg).toBeNull();
    expect(summary.grandKg).toBe(screen.grandKg);
  });

  it("excludes historical stationary and does not count a verified record twice", () => {
    const data = results({
      scope1: [
        { key: "fuel", label: "Fuel", value: 100 },
        { key: "kitchen", label: "Kitchen", value: 5 },
        { key: "power", label: "Power", value: 6 },
        { key: "heating", label: "Heating", value: 7 },
        { key: "heatsteam", label: "Heat", value: 8 },
        { key: "mobile", label: "Mobile", value: 20 },
        { key: "flaring", label: "Flaring", value: 7 },
      ],
    });
    const summary = summarizeDashboardEmissions(data);
    expect(summary.reconciliationPending).toBe(true);
    expect(summary.status).toBe("provisional");
    expect(summary.scope1Kg).toBe(5311.45);
    expect(summary.scope1Kg).not.toBe(data.totals.scope1);
    expect(summary.scope1Kg).not.toBe(5311.45 + 5311.45);
    expect(summary.scope2Kg).toBeNull();
    expect(summary.scope3Kg).toBeNull();
    expect(summary.grandKg).toBe(buildReportingTotals(data).grandKg);
  });

  it("converts kilograms to tonnes by dividing by 1000", () => {
    expect(kgToTco2e(5311.45)).toBe(5.31145);
    expect(kgToTco2e(7931.778)).toBe(7.931778);
    expect(kgToTco2e(0)).toBe(0);
  });

  it("loads the organization and does not set a counterparty", () => {
    expect(dashboardStationaryContext("org-1", 2026)).toEqual({
      organizationId: "org-1",
      reportingYear: 2026,
    });
    expect(dashboardStationaryContext("org-1", 2026).counterpartyId).toBeUndefined();
    const missing = missingOrganizationSummary();
    expect(missing.status).toBe("missing_organization");
    expect(missing.scope1Kg).toBeNull();
    expect(missing.grandKg).toBeNull();
    expect(dashboardTrackedLabel(missing).value).toBe("Unavailable");
  });

  it("does not turn a failed stationary request into zero", () => {
    const data = results({
      stationaryVerified: {
        status: "unavailable",
        error: "API unavailable",
        totalTco2e: 0,
        totalKgCo2e: 0,
        activities: [],
      },
    });
    const summary = summarizeDashboardEmissions(data);
    expect(summary.status).toBe("incomplete");
    expect(summary.scope1Kg).toBeNull();
    expect(summary.grandKg).toBeNull();
    expect(summary.scope2Kg).toBeNull();
    expect(summary.scope3Kg).toBeNull();
    expect(summary.verifiedTco2e).toBeNull();
    expect(summary.scope1Kg).not.toBe(0);
    expect(summary.inventory).toBe("unavailable");
    expect(dashboardTrackedLabel(summary).value).toBe("Unavailable");

    const thrown = failedDashboardSummary("API unavailable");
    expect(thrown.scope1Kg).toBeNull();
    expect(thrown.grandKg).toBeNull();
    expect(thrown.scope2Kg).toBeNull();
  });

  it("treats a successful empty stationary load as a real zero", () => {
    const data = results({
      scope1: [
        { key: "mobile", label: "Mobile", value: 0 },
        { key: "flaring", label: "Flaring", value: 0 },
      ],
      stationaryVerified: {
        status: "empty",
        error: null,
        totalTco2e: 0,
        totalKgCo2e: 0,
        activities: [],
      },
      totals: { scope1: 0, scope2: 0, scope3: 0, grand: 0 },
    });
    const summary = summarizeDashboardEmissions(data);
    expect(summary.inventory).toBe("partial");
    expect(summary.scope1Kg).toBe(0);
    expect(summary.grandKg).toBeNull();
    expect(summary.scope1Kg).not.toBeNull();
    expect(dashboardTrackedLabel(summary)).toEqual({
      value: "Partial",
      sub: "Annual total is not complete",
    });
  });

  it("matches the EPA results screen for the same unfiltered organization payload", () => {
    const data = results({
      scope1: [
        { key: "fuel", label: "Fuel", value: 100 },
        { key: "mobile", label: "Mobile", value: 20 },
        { key: "flaring", label: "Flaring", value: 7 },
      ],
      scope2: [{ key: "electricity", label: "Electricity", value: 30 }, { key: "heatsteam", label: "Heat", value: 15 }],
      totals: { scope1: 127, scope2: 45, scope3: 4, grand: 176 },
    });
    const screen = buildReportingTotals(data);
    const summary = summarizeDashboardEmissions(data);
    expect(summary.scope1Kg).toBe(screen.scope1Kg);
    expect(summary.grandKg).toBe(screen.grandKg);
    expect(summary.scope2Kg).toBeNull();
    expect(summary.scope3Kg).toBeNull();
    expect(summary.statusLabel).toBe(screen.statusLabel);
    expect(summary.periodNote).toMatch(/Reporting year 2026/);
    expect(summary.periodNote).toMatch(/unassigned/i);
    expect(summary.statusLabel).toMatch(/not an independently verified or audit-approved inventory/i);
    const overviewNote = dashboardOverviewNote(summary);
    expect(overviewNote == null || overviewNote.length < 120).toBe(true);
    expect(overviewNote ?? "").not.toMatch(/location-based/);
    expect(overviewNote ?? "").not.toMatch(/independently verified/i);
  });

  it("shows calculated tonnes on the dashboard KPI instead of Partial or Yes", () => {
    const summary: DashboardEmissionsSummary = {
      status: "provisional",
      inventory: "partial",
      reportingYear: 2026,
      statusLabel:
        "Reporting year 2026. Verified Scope 2 includes location-based purchased electricity. This is not an independently verified or audit-approved inventory.",
      periodNote: "Reporting year 2026. Other years are excluded.",
      scopeNote: "Stationary combustion uses this organization's calculated records.",
      reconciliationPending: false,
      scope1Kg: 5311.45,
      scope2Kg: 0,
      scope3Kg: 0,
      grandKg: 5311.45,
      verifiedTco2e: 5.31145,
      biogenicCo2T: 0,
      biogenicLabel: "Biogenic CO2 not recorded",
    };
    expect(dashboardTrackedLabel(summary)).toEqual({
      value: "5.31",
      sub: "Partial tCO₂e",
    });
    expect(dashboardOverviewNote(summary)).toBeNull();
  });

  it("does not dump methodology paragraphs onto the dashboard overview", () => {
    const missing = missingOrganizationSummary();
    expect(dashboardOverviewNote(missing)).toBe("Select an organization to load emissions.");
    const failed = failedDashboardSummary("API unavailable");
    expect(dashboardOverviewNote(failed)).toBe("Emissions could not be loaded for this reporting year.");
    expect(dashboardOverviewNote(failed)).not.toBe(failed.statusLabel);
  });
});

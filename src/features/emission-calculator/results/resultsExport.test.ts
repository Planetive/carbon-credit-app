import { describe, expect, it } from "vitest";
import type { EpaIpccResultsData } from "@/features/emission-calculator/core/loaders/epaIpccResults";
import type { StationaryVerifiedResults } from "./stationaryResults";
import { buildReportingTotals } from "./reportingTotals";
import { buildEpaResultsCsv, officialExportTotals, stationaryReportHtml, withReportableTotals } from "./resultsExport";

function verified(totalTco2e: number, totalKgCo2e: number, id = "activity-ng"): StationaryVerifiedResults {
  return {
    status: "ready",
    error: null,
    totalTco2e,
    totalKgCo2e,
    activities: [
      {
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
        factorSource: "EPA · Fuel EPA 2 · imported_from_sheet",
        factorVersion: "imported_from_sheet",
      },
    ],
  };
}

function base(overrides: Partial<EpaIpccResultsData> = {}): EpaIpccResultsData {
  const scope1 = overrides.scope1 || [
    { key: "fuel", label: "Fuel", value: 100 },
    { key: "mobile", label: "Mobile", value: 20 },
    { key: "kitchen", label: "Kitchen", value: 5 },
    { key: "flaring", label: "Flaring", value: 7 },
  ];
  const scope1Total = scope1.reduce((sum, row) => sum + row.value, 0);
  return {
    scope1,
    scope1ByActivity: [],
    scope2: [{ key: "electricity", label: "Electricity", value: 30 }],
    scope3: [{ key: "waste", label: "Waste", value: 4 }],
    stationaryVerified:
      "stationaryVerified" in overrides ? overrides.stationaryVerified : verified(5.31145, 5311.45),
    totals: overrides.totals || {
      scope1: scope1Total,
      scope2: 30,
      scope3: 4,
      grand: scope1Total + 34,
    },
  };
}

describe("EPA results export", () => {
  it("matches the results-screen total for one natural-gas record and keeps legacy out", () => {
    const results = base();
    const screen = buildReportingTotals(results);
    const exported = officialExportTotals(results);
    expect(exported.scope1Kg).toBe(screen.scope1Kg);
    expect(exported.grandKg).toBe(screen.grandKg);
    expect(exported.verifiedTco2e).toBe(5.31145);
    expect(exported.scope1Kg).toBe(5311.45 + 20 + 7);

    const csv = buildEpaResultsCsv(results);
    expect(csv).toContain("5.31145");
    expect(csv).toContain("activity-ng");
    expect(csv).toContain("Natural Gas");
    expect(csv).toContain("Boiler");
    expect(csv).toContain("North plant");
    expect(csv).toContain("BLR-1");
    expect(csv).toContain("2026-10");
    expect(csv).toContain("5306");
    expect(csv).toContain("2.8");
    expect(csv).toContain("2.65");
    expect(csv).toContain("AR5");
    expect(csv).toContain("imported_from_sheet");
    expect(csv).toContain("Legacy stationary combustion — requires reconciliation");
    expect(csv).toContain("Mobile");
    expect(csv).toContain("Electricity");
    expect(csv).toContain("Waste");
    const pdf = withReportableTotals(results);
    expect(pdf.totals.scope1).toBe(screen.scope1Kg);
    expect(pdf.totals.grand).toBe(screen.grandKg);
    expect(pdf.scope1.some((row) => row.key === "fuel" || row.key === "kitchen")).toBe(false);
    expect(stationaryReportHtml(results)).toContain("Legacy stationary combustion — requires reconciliation");
  });

  it("adds a second verified record once", () => {
    const first = verified(5.31145, 5311.45);
    const second = verified(2.620328, 2620.328, "activity-anthracite");
    second.activities[0].fuel = "Anthracite";
    const combined: StationaryVerifiedResults = {
      status: "ready",
      error: null,
      totalTco2e: 7.931778,
      totalKgCo2e: 7931.778,
      activities: [...first.activities, ...second.activities],
    };
    const results = base({
      stationaryVerified: combined,
      scope1: [{ key: "mobile", label: "Mobile", value: 20 }],
      totals: { scope1: 20, scope2: 30, scope3: 4, grand: 54 },
    });
    const exported = officialExportTotals(results);
    expect(exported.verifiedTco2e).toBe(7.931778);
    expect(exported.scope1Kg).toBe(7931.778 + 20);
    const csv = buildEpaResultsCsv(results);
    expect(csv.match(/activity-ng/g)).toHaveLength(1);
    expect(csv.match(/activity-anthracite/g)).toHaveLength(1);
  });

  it("writes Incomplete instead of zero when verified records fail to load", () => {
    const results = base({
      stationaryVerified: {
        status: "unavailable",
        error: "API unavailable",
        totalTco2e: 0,
        totalKgCo2e: 0,
        activities: [],
      },
    });
    const exported = officialExportTotals(results);
    expect(exported.incomplete).toBe(true);
    expect(exported.scope1Kg).toBeNull();
    expect(exported.grandKg).toBeNull();
    const csv = buildEpaResultsCsv(results);
    expect(csv).toContain("Incomplete");
    expect(csv).toContain("API unavailable");
    expect(csv).not.toContain("Stationary combustion (verified),0");
    expect(stationaryReportHtml(results)).toContain("not a complete inventory");
  });

  it("leaves a results object without stationary records on its existing totals", () => {
    const results = base({ stationaryVerified: undefined });
    const exported = officialExportTotals(results);
    expect(exported.scope1Kg).toBe(results.totals.scope1);
    expect(exported.grandKg).toBe(results.totals.grand);
    expect(withReportableTotals(results)).toBe(results);
  });
});

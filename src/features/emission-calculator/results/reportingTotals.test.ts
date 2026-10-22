import { describe, expect, it } from "vitest";
import type { EpaIpccResultsData } from "@/features/emission-calculator/core/loaders/epaIpccResults";
import type { StationaryVerifiedResults } from "./stationaryResults";
import { buildReportingTotals } from "./reportingTotals";

function verified(totalTco2e: number, totalKgCo2e: number): StationaryVerifiedResults {
  return {
    status: "ready",
    error: null,
    totalTco2e,
    totalKgCo2e,
    activities: [
      {
        id: "activity-ng",
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
  return {
    scope1,
    scope1ByActivity: [],
    scope2: overrides.scope2 || [{ key: "electricity", label: "Electricity", value: 30 }],
    scope3: overrides.scope3 || [{ key: "waste", label: "Waste", value: 4 }],
    stationaryVerified: overrides.stationaryVerified,
    totals: overrides.totals || {
      scope1: scope1Total,
      scope2: 30,
      scope3: 4,
      grand: scope1Total + 34,
    },
  };
}

describe("reportable EPA totals", () => {
  it("includes one verified stationary record as 5.31145 tCO2e exactly once", () => {
    const reporting = buildReportingTotals(
      results({ stationaryVerified: verified(5.31145, 5311.45) })
    );
    expect(reporting.verifiedTco2e).toBe(5.31145);
    expect(reporting.verifiedKg).toBe(5311.45);
    expect(reporting.scope1Kg).toBe(5311.45 + 20 + 7);
    expect(reporting.grandKg).toBe(5311.45 + 20 + 7 + 30 + 4);
    expect(reporting.reportableScope1.map((row) => row.key)).toEqual(["mobile", "flaring"]);
  });

  it("keeps a legacy fuel record out of the reportable total and still lists it", () => {
    const reporting = buildReportingTotals(
      results({
        stationaryVerified: verified(5.31145, 5311.45),
        scope1: [
          { key: "fuel", label: "Fuel", value: 100 },
          { key: "mobile", label: "Mobile", value: 20 },
        ],
        totals: { scope1: 120, scope2: 30, scope3: 4, grand: 154 },
      })
    );
    expect(reporting.scope1Kg).toBe(5311.45 + 20);
    expect(reporting.grandKg).toBe(5311.45 + 20 + 30 + 4);
    expect(reporting.legacyStationary).toEqual([{ key: "fuel", label: "Fuel", value: 100 }]);
    expect(reporting.status).toBe("provisional");
    expect(reporting.scope1Kg).not.toBe(5311.45 + 20 + 100);
  });

  it("excludes legacy kitchen, power, heating, and scope 1 heat-and-steam", () => {
    const reporting = buildReportingTotals(
      results({
        stationaryVerified: verified(5.31145, 5311.45),
        scope1: [
          { key: "kitchen", label: "Kitchen", value: 5 },
          { key: "power", label: "Power", value: 6 },
          { key: "heating", label: "Heating", value: 7 },
          { key: "heatsteam", label: "Scope 1 heat", value: 8 },
          { key: "mobile", label: "Mobile", value: 20 },
        ],
        scope2: [
          { key: "heatsteam", label: "Scope 2 heat", value: 15 },
          { key: "electricity", label: "Electricity", value: 30 },
        ],
        totals: { scope1: 46, scope2: 45, scope3: 4, grand: 95 },
      })
    );
    expect(reporting.excludedKg).toBe(5 + 6 + 7 + 8);
    expect(reporting.scope1Kg).toBe(5311.45 + 20);
    expect(reporting.grandKg).toBe(5311.45 + 20 + 45 + 4);
    expect(reporting.legacyStationary.map((row) => row.key)).toEqual([
      "kitchen",
      "power",
      "heating",
      "heatsteam",
    ]);
    expect(reporting.reportableScope1.map((row) => row.key)).toEqual(["mobile"]);
  });

  it("does not turn a failed stationary load into zero or a complete total", () => {
    const reporting = buildReportingTotals(
      results({
        stationaryVerified: {
          status: "unavailable",
          error: "API unavailable",
          totalTco2e: 0,
          totalKgCo2e: 0,
          activities: [],
        },
        scope1: [
          { key: "fuel", label: "Fuel", value: 100 },
          { key: "mobile", label: "Mobile", value: 20 },
        ],
      })
    );
    expect(reporting.status).toBe("incomplete");
    expect(reporting.scope1Kg).toBeNull();
    expect(reporting.grandKg).toBeNull();
    expect(reporting.verifiedKg).toBeNull();
    expect(reporting.verifiedTco2e).toBeNull();
    expect(reporting.statusLabel).toBe("API unavailable");
    expect(reporting.legacyStationary).toEqual([{ key: "fuel", label: "Fuel", value: 100 }]);
  });

  it("treats a successful empty stationary result as zero without calling it audit-approved", () => {
    const reporting = buildReportingTotals(
      results({
        stationaryVerified: {
          status: "empty",
          error: null,
          totalTco2e: 0,
          totalKgCo2e: 0,
          activities: [],
        },
      })
    );
    expect(reporting.status).toBe("reportable");
    expect(reporting.verifiedTco2e).toBe(0);
    expect(reporting.scope1Kg).toBe(27);
    expect(reporting.statusLabel).toMatch(/not an independently verified or audit-approved inventory/i);
  });
});

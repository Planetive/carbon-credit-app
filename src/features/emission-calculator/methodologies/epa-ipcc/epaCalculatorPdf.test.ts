import { describe, expect, it } from "vitest";
import type { EpaIpccResultsData } from "@/features/emission-calculator/core/loaders/epaIpccResults";
import type { StationaryVerifiedResults } from "@/features/emission-calculator/results/stationaryResults";
import { productionAnnualAssignment } from "@/features/emission-calculator/results/reportingYear";
import { buildEpaCalculatorPdf, formatPdfTonnes } from "./epaCalculatorPdf";

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
        site: "",
        equipmentId: "",
        period: "2026-10",
        co2: { massKg: "5306", gwp: "1", co2eKg: "5306" },
        ch4: { massKg: "0.1", gwp: "28", co2eKg: "2.8" },
        n2o: { massKg: "0.01", gwp: "265", co2eKg: "2.65" },
        totalKgCo2e: String(totalKgCo2e),
        totalTco2e: String(totalTco2e),
        gwpVersion: "AR5",
        factorSource: "EPA",
        factorVersion: "imported_from_sheet",
      },
    ],
  };
}

function results(overrides: Partial<EpaIpccResultsData> = {}): EpaIpccResultsData {
  const scope1 = overrides.scope1 || [
    { key: "fuel", label: "Fuel", value: 0 },
    { key: "mobile", label: "Mobile", value: 0 },
    { key: "kitchen", label: "Kitchen", value: 0 },
    { key: "power", label: "Power", value: 0 },
    { key: "heating", label: "Heating", value: 0 },
    { key: "heatsteam", label: "Heat", value: 0 },
  ];
  const scope2Value = overrides.totals?.scope2 ?? 0;
  const scope3Value = overrides.totals?.scope3 ?? 0;
  const scope1Total = scope1.reduce((sum, row) => sum + row.value, 0);
  return {
    scope1,
    scope1ByActivity: [],
    scope2: overrides.scope2 || [{ key: "electricity", label: "Electricity", value: scope2Value }],
    scope3: overrides.scope3 || [{ key: "waste", label: "Waste", value: scope3Value }],
    stationaryVerified: overrides.stationaryVerified,
    annualReporting: overrides.annualReporting || productionAnnualAssignment(2026),
    totals: overrides.totals || {
      scope1: scope1Total,
      scope2: scope2Value,
      scope3: scope3Value,
      grand: scope1Total + scope2Value + scope3Value,
    },
  };
}

describe("EPA calculator PDF totals", () => {
  it("prints 100 mmBtu natural gas as 5.31145 tCO2e once", () => {
    const figures = buildEpaCalculatorPdf(
      results({
        scope1: [
          { key: "fuel", label: "Fuel", value: 5311.45 },
          { key: "kitchen", label: "Kitchen", value: 100 },
          { key: "mobile", label: "Mobile", value: 0 },
        ],
        stationaryVerified: verified(5.31145, 5311.45),
        totals: { scope1: 5411.45, scope2: 1000, scope3: 500, grand: 6911.45 },
      })
    );

    expect(figures.unit).toBe("tCO2e");
    expect(figures.reportingYear).toBe(2026);
    expect(figures.stationary).toBe(5.31145);
    expect(figures.scope1).toBe(5.31145);
    expect(figures.scope2).toBeNull();
    expect(figures.scope2Label).toBe("Unassigned");
    expect(figures.scope3Label).toBe("Unassigned");
    expect(figures.grand).toBeNull();
    expect(figures.grandLabel).toBe("Partial");
    expect(figures.scope1).not.toBe(5311.45);
    expect(figures.scope1).not.toBe(5.31145 * 2);
    expect(formatPdfTonnes(figures.stationary)).toBe("5.31145");
    expect(figures.reconciliationNotice).toMatch(/legacy stationary combustion is excluded/i);
    expect(figures.incomplete).toBe(false);
  });

  it("labels a failed stationary load as incomplete instead of zero", () => {
    const figures = buildEpaCalculatorPdf(
      results({
        stationaryVerified: {
          status: "unavailable",
          error: "API unavailable",
          totalTco2e: 0,
          totalKgCo2e: 0,
          activities: [],
        },
        totals: { scope1: 0, scope2: 1000, scope3: 0, grand: 1000 },
      })
    );

    expect(figures.incomplete).toBe(true);
    expect(figures.scope1).toBeNull();
    expect(figures.grand).toBeNull();
    expect(figures.stationary).toBeNull();
    expect(figures.scope1Label).toBe("Unavailable");
    expect(figures.grandLabel).toBe("Unavailable");
    expect(figures.scope2).toBeNull();
    expect(figures.scope1).not.toBe(0);
  });
});
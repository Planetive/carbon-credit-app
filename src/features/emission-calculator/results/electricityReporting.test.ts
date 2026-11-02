import { describe, expect, it } from "vitest";
import type { EmissionActivity } from "@/api/ghg";
import type { EpaIpccResultsData } from "@/features/emission-calculator/core/loaders/epaIpccResults";
import { buildEpaCalculatorPdf } from "@/features/emission-calculator/methodologies/epa-ipcc/epaCalculatorPdf";
import { productionAnnualAssignment } from "./reportingYear";
import { buildReportingTotals } from "./reportingTotals";
import { buildEpaResultsCsv, stationaryReportHtml } from "./resultsExport";
import {
  buildScope2ElectricitySaveBody,
  partitionElectricityActivities,
  summarizeElectricityActivities,
} from "./electricityResults";
import type { StationaryVerifiedResults } from "./stationaryResults";

function stationary(totalTco2e = 5.31145): StationaryVerifiedResults {
  return {
    status: "ready",
    error: null,
    totalTco2e,
    totalKgCo2e: totalTco2e * 1000,
    activities: [],
    biogenicCo2Tonnes: 0,
    biogenicStatus: "recorded",
  };
}

function electricityActivity(overrides: Partial<EmissionActivity> = {}): EmissionActivity {
  return {
    id: "elec-1",
    assessment_id: "assessment-1",
    organization_id: "org-1",
    user_id: "user-1",
    scope: 2,
    category: "purchased_electricity",
    method: "location_based",
    counterparty_id: null,
    quantity: 2500,
    unit: "kWh",
    factor_dataset_id: "dataset-1",
    factor_row_id: "row-1",
    emissions_tco2e: 1,
    legacy_source: "scope2_location_electricity_v1",
    raw: {
      total_t_co2e: "1.00000000",
      activity_meta: { period: "2026-06", method_version: "scope2_location_electricity_v1" },
      inputs: { quantity: "2500.00000000", unit: "kWh", electricity_kwh: "2500.00000000", renewable_kwh: "2500.00000000" },
      contractual_renewable: { kwh: "2500.00000000", applied_to_location_total: false },
      factor: {
        dataset_id: "dataset-1",
        factor_row_id: "row-1",
        publisher: "Fixture Publisher",
        source_document: "Grid Factor Fixture 2024",
        publication_year: 2024,
        value: "0.40000000",
        unit: "kg CO2e/kWh",
        gas_coverage: "CO2e",
        boundary: "consumption",
        country: "Pakistan",
        grid_region: "national",
      },
      accounting: { version: "scope2_location_electricity_v1", status: "verified" },
    },
    ...overrides,
  };
}

function results(electricity: ReturnType<typeof summarizeElectricityActivities> | undefined): EpaIpccResultsData {
  return {
    scope1: [],
    scope1ByActivity: [],
    scope2: [{ key: "electricity", label: "Electricity", value: 9000 }],
    scope3: [{ key: "waste", label: "Waste", value: 4 }],
    stationaryVerified: stationary(),
    electricityVerified: electricity,
    annualReporting: productionAnnualAssignment(2026),
    totals: { scope1: 0, scope2: 9000, scope3: 4, grand: 9004 },
  };
}

describe("location-based purchased electricity reporting", () => {
  it("counts one verified record once and leaves the legacy kilogram total outside Scope 2", () => {
    const row = electricityActivity();
    const partitioned = partitionElectricityActivities([row, row], {
      organizationId: "org-1",
      reportingYear: 2026,
    });
    expect(partitioned.included).toHaveLength(1);
    const summary = summarizeElectricityActivities(partitioned.included);
    const reporting = buildReportingTotals(results(summary));
    expect(summary.totalTco2e).toBe(1);
    expect(reporting.scope1Kg).toBe(5311.45);
    expect(reporting.scope2Kg).toBe(1000);
    expect(reporting.scope2Kg).not.toBe(10000);
    expect(reporting.grandKg).toBeNull();
    expect(reporting.inventory).toBe("partial");
    expect(reporting.statusLabel).toContain("Heat, steam, and cooling are not included");
    const csv = buildEpaResultsCsv(results(summary));
    expect(csv).toContain("Purchased electricity (location-based, verified)");
    expect(csv).toContain("excluded");
    expect(csv).not.toContain("9000,9");
    expect(stationaryReportHtml(results(summary))).toContain("Legacy Scope 2 — excluded from verified annual totals");
    expect(buildEpaCalculatorPdf(results(summary)).electricity).toBe(1);
    expect(buildEpaCalculatorPdf(results(summary)).scope1).toBeCloseTo(5.31145, 5);
  });

  it("excludes a legacy electricity row and a record whose renewable claim was used to zero the total", () => {
    const legacy = electricityActivity({
      id: "legacy",
      method: "electricity",
      category: "electricity",
      legacy_source: "api",
      emissions_tco2e: 4,
    });
    const zeroed = electricityActivity({
      id: "zeroed",
      emissions_tco2e: 0,
      raw: {
        ...electricityActivity().raw,
        total_t_co2e: "0",
        contractual_renewable: { applied_to_location_total: true },
      },
    });
    const partitioned = partitionElectricityActivities([legacy, zeroed], {
      organizationId: "org-1",
      reportingYear: 2026,
    });
    const ukRecord = electricityActivity({
      id: "uk-elec",
      assessment_id: "uk-assessment",
      legacy_source: "scope2_uk_location_electricity_v1",
      emissions_tco2e: 0.177,
      raw: {
        ...electricityActivity().raw,
        total_t_co2e: "0.17700000",
        activity_meta: { period: "2026-06", method_version: "scope2_uk_location_electricity_v1" },
        accounting: { version: "scope2_uk_location_electricity_v1", status: "verified" },
      },
    });
    const withUk = partitionElectricityActivities([legacy, zeroed, ukRecord], {
      organizationId: "org-1",
      reportingYear: 2026,
      epaAssessmentIds: ["assessment-1", "uk-assessment"],
    });
    expect(withUk.included).toHaveLength(0);
    expect(withUk.included.reduce((sum, row) => sum + Number(row.totalTco2e), 0)).toBe(0);
    expect(partitioned.included).toHaveLength(0);
    expect(partitioned.rejectedCount).toBe(1);
    expect(summarizeElectricityActivities(partitioned.included).totalTco2e).toBe(0);
  });

  it("does not put a client factor or a renewable deduction into the save body", () => {
    const body = buildScope2ElectricitySaveBody({
      country: "Pakistan",
      grid_region: "national",
      quantity: "2500",
      unit: "kWh",
      period: "2026-06",
      assessment_id: "assessment-1",
      renewable_kwh: "2500",
    });
    expect(body).not.toHaveProperty("grid_factor");
    expect(body).not.toHaveProperty("emissions_tco2e");
    expect(body.renewable_kwh).toBe("2500");
  });
});

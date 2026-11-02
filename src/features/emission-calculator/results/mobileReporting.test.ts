import { describe, expect, it } from "vitest";
import type { EmissionActivity, EmissionAssessment } from "@/api/ghg";
import type { EpaIpccResultsData } from "@/features/emission-calculator/core/loaders/epaIpccResults";
import { summarizeDashboardEmissions } from "@/features/dashboard/dashboardEmissions";
import { buildEpaCalculatorPdf } from "@/features/emission-calculator/methodologies/epa-ipcc/epaCalculatorPdf";
import { buildEpaSidebarDisplay } from "@/features/emission-calculator/methodologies/epa-ipcc/epaSidebarTotals";
import {
  fetchMobileVerified,
  partitionMobileActivities,
  summarizeMobileActivities,
  type MobileResultActivity,
  type MobileVerifiedResults,
} from "./mobileResults";
import { productionAnnualAssignment } from "./reportingYear";
import { buildReportingTotals, verifiedScope1Lines } from "./reportingTotals";
import { buildEpaResultsCsv, officialExportTotals, stationaryReportHtml, verifiedScope1GasCo2eKg, withReportableTotals } from "./resultsExport";
import type { StationaryVerifiedResults } from "./stationaryResults";

function stationary(totalTco2e: number): StationaryVerifiedResults {
  return {
    status: "ready",
    error: null,
    totalTco2e,
    totalKgCo2e: 5311.45,
    biogenicCo2Tonnes: null,
    biogenicStatus: "not_recorded",
    activities: [
      {
        id: "stationary-1",
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
        period: "2026-06",
        co2: { massKg: "5306", gwp: "1", co2eKg: "5306" },
        ch4: { massKg: "0.1", gwp: "28", co2eKg: "2.8" },
        n2o: { massKg: "0.01", gwp: "265", co2eKg: "2.65" },
        totalKgCo2e: String(totalTco2e * 1000),
        totalTco2e: String(totalTco2e),
        gwpVersion: "AR5",
        factorSource: "EPA",
        factorVersion: "imported_from_sheet",
      },
    ],
  };
}

function mobileActivity(overrides: Partial<MobileResultActivity> = {}): MobileResultActivity {
  return {
    id: "mobile-1",
    assessmentId: "assessment-1",
    organizationId: "org-1",
    userId: "user-a",
    counterpartyId: null,
    roadClass: "on_road",
    vehicleType: "Passenger car",
    fuel: "Motor Gasoline",
    fuelQuantity: "10",
    fuelUnit: "gallon",
    distance: "100",
    distanceUnit: "mile",
    modelYear: "2020",
    equipmentId: "CAR-1",
    site: "Fleet yard",
    period: "2026-04",
    co2: { massKg: "87.8", gwp: "1", co2eKg: "87.8" },
    ch4: { massKg: "0.001", gwp: "28", co2eKg: "0.028" },
    n2o: { massKg: "0.002", gwp: "265", co2eKg: "0.53" },
    totalKgCo2e: "88.358",
    totalTco2e: "0.088358",
    biogenicCo2Tonnes: "0",
    accountingTreatment: "fossil",
    methodology: "epa_mobile_biogenic_v1",
    gwpVersion: "AR5",
    factorSource: "EPA · mobile_combustion · rows gas-2020",
    factorVersion: "sheet",
    ...overrides,
  };
}

function readyMobile(activities: MobileResultActivity[], extra: Partial<MobileVerifiedResults> = {}): MobileVerifiedResults {
  return { ...summarizeMobileActivities(activities), unassignedCount: 0, otherYearCount: 0, ...extra };
}

function results(overrides: Partial<EpaIpccResultsData> = {}): EpaIpccResultsData {
  return {
    scope1: [],
    scope1ByActivity: [],
    scope2: [{ key: "electricity", label: "Electricity", value: 1000 }],
    scope3: [{ key: "waste", label: "Waste", value: 500 }],
    totals: { scope1: 0, scope2: 1000, scope3: 500, grand: 1500 },
    annualReporting: productionAnnualAssignment(2026),
    stationaryVerified: stationary(5.31145),
    mobileVerified: readyMobile([mobileActivity()]),
    ...overrides,
  };
}

function storedActivity(overrides: Partial<EmissionActivity> = {}): EmissionActivity {
  return {
    id: "mobile-1",
    assessment_id: "assessment-1",
    organization_id: "org-1",
    user_id: "user-a",
    scope: 1,
    category: "mobile_combustion",
    method: "epa_mobile_v1",
    legacy_source: "epa_mobile_v1",
    counterparty_id: null,
    emissions_tco2e: 0.088358,
    created_at: "2020-01-01T00:00:00Z",
    raw: {
      inputs: {
        road_class: "on_road",
        vehicle_type: "Passenger car",
        fuel: "Motor Gasoline",
        fuel_quantity: "10",
        fuel_unit: "gallon",
        distance: "100",
        distance_unit: "mile",
      },
      activity_meta: { period: "2026-04", equipment_id: "CAR-1" },
      gases: {
        co2: { mass_kg: "87.8", gwp: "1", co2e_kg: "87.8" },
        ch4: { mass_kg: "0.001", gwp: "28", co2e_kg: "0.028" },
        n2o: { mass_kg: "0.002", gwp: "265", co2e_kg: "0.53" },
      },
      accounting: {
        biogenic_co2_t: "0",
        gwp_version: "AR5",
        version: "epa_mobile_biogenic_v1",
        methodology: "epa_mobile_biogenic_v1",
      },
      factors: {
        co2: { publisher: "EPA", dataset_code: "mobile_combustion", factor_row_id: "co2-gas" },
        ch4: { publisher: "EPA", dataset_code: "on_road_gasoline", factor_row_id: "gas-2020" },
      },
      total_t_co2e: "0.088358",
    },
    ...overrides,
  };
}

const assessment: EmissionAssessment = {
  id: "assessment-1",
  organization_id: "org-1",
  user_id: "user-a",
  framework: "epa",
  status: "draft",
};

describe("verified mobile reporting", () => {
  it("adds stationary and mobile Scope 1 once", () => {
    const reporting = buildReportingTotals(results());
    expect(reporting.scope1Kg).toBeCloseTo(5399.808, 6);
    expect(reporting.verifiedTco2e).toBeCloseTo(5.399808, 8);
    expect(reporting.scope1Kg).not.toBeCloseTo(5399.808 * 2, 3);
    const lines = verifiedScope1Lines(results());
    expect(lines.map((line) => line.key)).toEqual(["stationary_verified", "mobile_verified"]);
    expect(lines.reduce((sum, line) => sum + line.value, 0)).toBeCloseTo(reporting.scope1Kg!, 6);
  });

  it("counts each mobile activity once and ignores a repeated id", () => {
    const first = mobileActivity({ id: "mobile-1", totalTco2e: "0.04000000" });
    const second = mobileActivity({ id: "mobile-2", totalTco2e: "0.04835800", userId: "user-b" });
    const summary = summarizeMobileActivities([first, second]);
    expect(summary.totalTco2e).toBeCloseTo(0.088358, 8);
    expect(summary.activities).toHaveLength(2);

    const duplicate = partitionMobileActivities(
      [storedActivity(), storedActivity({ user_id: "user-b" })],
      { organizationId: "org-1", reportingYear: 2026, epaAssessmentIds: ["assessment-1"] }
    );
    expect(duplicate.included).toHaveLength(1);
    expect(summarizeMobileActivities(duplicate.included).totalTco2e).toBeCloseTo(0.088358, 8);
  });

  it("excludes a mobile row with no accounting version and does not treat it as zero", () => {
    const valid = storedActivity();
    const invalid = storedActivity({
      id: "mobile-invalid",
      emissions_tco2e: 4,
      raw: { inputs: { fuel: "Motor Gasoline" }, activity_meta: { period: "2026-04" }, total_t_co2e: "4" },
    });
    const partitioned = partitionMobileActivities([valid, invalid], {
      organizationId: "org-1",
      reportingYear: 2026,
      epaAssessmentIds: ["assessment-1"],
    });
    expect(partitioned.included).toHaveLength(1);
    expect(partitioned.rejectedCount).toBe(1);
    const reporting = buildReportingTotals(
      results({
        mobileVerified: {
          ...summarizeMobileActivities(partitioned.included),
          rejectedCount: partitioned.rejectedCount,
        },
      })
    );
    expect(reporting.inventory).toBe("partial");
    expect(reporting.verifiedTco2e).toBeCloseTo(5.399808, 8);
    expect(reporting.statusLabel).toContain("Mobile records with missing provenance are excluded");
    expect(reporting.verifiedTco2e).not.toBeCloseTo(5.399808 + 4, 3);
  });

  it("keeps another organization, another counterparty, and another year out", async () => {
    const rows = [
      storedActivity({
        id: "same-org-a",
        user_id: "user-a",
        emissions_tco2e: 0.01,
        raw: { ...(storedActivity().raw as Record<string, unknown>), total_t_co2e: "0.01" },
      }),
      storedActivity({
        id: "same-org-b",
        user_id: "user-b",
        emissions_tco2e: 0.02,
        raw: { ...(storedActivity().raw as Record<string, unknown>), total_t_co2e: "0.02" },
      }),
      storedActivity({ id: "other-org", organization_id: "org-2", emissions_tco2e: 9 }),
      storedActivity({
        id: "other-counterparty",
        counterparty_id: "cp-2",
        emissions_tco2e: 4,
        raw: {
          ...(storedActivity().raw as Record<string, unknown>),
          activity_meta: { period: "2026-04" },
          total_t_co2e: "4",
        },
      }),
      storedActivity({
        id: "other-year",
        counterparty_id: "cp-1",
        emissions_tco2e: 3,
        created_at: "2026-04-01T00:00:00Z",
        raw: {
          ...(storedActivity().raw as Record<string, unknown>),
          activity_meta: { period: "2025-04" },
          total_t_co2e: "3",
        },
      }),
    ];
    const loaded = await fetchMobileVerified(
      { organizationId: "org-1", reportingYear: 2026, counterpartyId: "cp-1" },
      {
        listAssessments: async () => [assessment],
        listActivities: async (params) => {
          expect(params).toEqual({ scope: 1, category: "mobile_combustion", legacy_source: "epa_mobile_v1" });
          return rows.map((row) =>
            row.id === "same-org-a" || row.id === "same-org-b"
              ? { ...row, counterparty_id: "cp-1" }
              : row
          );
        },
      }
    );
    expect(loaded.status).toBe("ready");
    expect(loaded.activities.map((row) => row.id).sort()).toEqual(["same-org-a", "same-org-b"]);
    expect(loaded.totalTco2e).toBeCloseTo(0.03, 8);
    expect(loaded.otherYearCount).toBe(1);
  });

  it("leaves a missing reporting period unassigned and out of the year total", async () => {
    const loaded = await fetchMobileVerified(
      { organizationId: "org-1", reportingYear: 2026 },
      {
        listAssessments: async () => [assessment],
        listActivities: async () => [
          storedActivity({
            emissions_tco2e: 1.5,
            created_at: "2026-08-01T00:00:00Z",
            raw: {
              ...(storedActivity().raw as Record<string, unknown>),
              activity_meta: { period: "" },
              total_t_co2e: "1.5",
            },
          }),
        ],
      }
    );
    expect(loaded.totalTco2e).toBe(0);
    expect(loaded.unassignedCount).toBe(1);
    const reporting = buildReportingTotals(
      results({
        mobileVerified: loaded,
        stationaryVerified: {
          ...stationary(0),
          status: "empty",
          activities: [],
          totalTco2e: 0,
          totalKgCo2e: 0,
        },
      })
    );
    expect(reporting.scope1Kg).toBe(0);
    expect(reporting.inventory).toBe("partial");
    expect(reporting.statusLabel).toMatch(/without a reporting period/i);
  });

  it("does not add biogenic CO2 to Scope 1", () => {
    const biodiesel = mobileActivity({
      id: "bio-1",
      fuel: "Biodiesel (100%)",
      totalTco2e: "0.0000558",
      totalKgCo2e: "0.0558",
      biogenicCo2Tonnes: "0.00945",
    });
    const reporting = buildReportingTotals(
      results({
        stationaryVerified: { ...stationary(0), status: "empty", activities: [], totalTco2e: 0, totalKgCo2e: 0, biogenicStatus: "recorded", biogenicCo2Tonnes: 0 },
        mobileVerified: readyMobile([biodiesel]),
      })
    );
    expect(reporting.scope1Kg).toBeCloseTo(0.0558, 6);
    expect(reporting.biogenicCo2T).toBeCloseTo(0.00945, 8);
    expect(reporting.scope1Kg).not.toBeCloseTo(0.0558 + 9.45, 3);
  });

  it("excludes every legacy mobile source from the annual total", () => {
    const legacy = [
      { key: "mobile", label: "Mobile Fuel (legacy)", value: 20 },
      { key: "onroad_gas", label: "On-road Gasoline (legacy)", value: 5 },
      { key: "onroad_diesel", label: "On-road Diesel & Alt Fuel (legacy)", value: 4 },
      { key: "nonroad", label: "Non-road Vehicle (legacy)", value: 3 },
      { key: "vehicular", label: "Vehicular (legacy)", value: 2 },
    ];
    const data = results({
      scope1: legacy,
      annualReporting: {
        reportingYear: 2026,
        scope1Keys: legacy.map((row) => row.key),
        scope2: "withheld",
        scope3: "withheld",
        withheldReason: "Shared Scope 2 and Scope 3 tables do not store a reporting period.",
      },
      mobileVerified: readyMobile([]),
    });
    const reporting = buildReportingTotals(data);
    expect(reporting.scope1Kg).toBeCloseTo(5311.45, 6);
    expect(reporting.legacyMobile).toHaveLength(5);
    expect(reporting.reportableScope1).toHaveLength(0);
    expect(reporting.inventory).toBe("partial");
    const csv = buildEpaResultsCsv(data);
    expect(csv).toContain("Legacy Mobile Combustion — Excluded from Annual Totals");
    expect(csv).toContain("On-road Gasoline (legacy)");
    expect(stationaryReportHtml(data)).toContain("Legacy Mobile Combustion — Excluded from Annual Totals");
    expect(buildEpaCalculatorPdf(data).scope1).toBeCloseTo(5.31145, 8);
  });

  it("marks Scope 1 unavailable when verified mobile records fail to load", () => {
    const data = results({
      mobileVerified: {
        status: "unavailable",
        error: "Verified mobile records could not be loaded.",
        totalTco2e: 0,
        totalKgCo2e: 0,
        activities: [],
      },
    });
    const reporting = buildReportingTotals(data);
    expect(reporting.inventory).toBe("unavailable");
    expect(reporting.scope1Kg).toBeNull();
    expect(reporting.grandKg).toBeNull();
    expect(reporting.scope1Kg).not.toBe(0);
    const sidebar = buildEpaSidebarDisplay(data);
    expect(sidebar.scope1).toBeNull();
    expect(sidebar.incomplete).toBe(true);
    expect(officialExportTotals(data).scope1Kg).toBeNull();
    expect(buildEpaResultsCsv(data)).toContain("Unavailable");
    expect(buildEpaResultsCsv(data)).not.toContain("Mobile combustion (verified),0");
  });

  it("treats a loaded empty mobile result as zero", () => {
    const data = results({ mobileVerified: readyMobile([]) });
    const reporting = buildReportingTotals(data);
    expect(reporting.scope1Kg).toBeCloseTo(5311.45, 6);
    expect(reporting.inventory).not.toBe("unavailable");
    expect(buildEpaCalculatorPdf(data).mobile).toBe(0);
  });

  it("uses the same Scope 1 total on the sidebar, dashboard, PDF, and CSV", () => {
    const data = results();
    const reporting = buildReportingTotals(data);
    const sidebar = buildEpaSidebarDisplay(data);
    const dashboard = summarizeDashboardEmissions(data);
    const pdf = buildEpaCalculatorPdf(data);
    const exported = officialExportTotals(data);
    const csv = buildEpaResultsCsv(data);
    const pdfRows = withReportableTotals(data);
    expect(sidebar.scope1).toBeCloseTo(reporting.verifiedTco2e!, 8);
    expect(dashboard.scope1Kg).toBe(reporting.scope1Kg);
    expect(pdf.scope1).toBe(sidebar.scope1);
    expect(pdf.mobile).toBeCloseTo(0.088358, 8);
    expect(pdf.stationary).toBeCloseTo(5.31145, 8);
    expect(exported.scope1Kg).toBe(reporting.scope1Kg);
    expect(csv).toContain("Mobile combustion (verified)");
    expect(csv).toContain("Passenger car");
    expect(csv).toContain("0.088358");
    expect(csv).toContain("AR5");
    expect(pdfRows.scope1.reduce((sum, row) => sum + row.value, 0)).toBeCloseTo(reporting.scope1Kg!, 6);
    expect(stationaryReportHtml(data)).toContain("Passenger car");
    expect(stationaryReportHtml(data)).toContain("Biogenic CO2");
    const gases = verifiedScope1GasCo2eKg(data);
    expect(gases?.CO2).toBeCloseTo(5306 + 87.8, 6);
    expect(gases?.CH4).toBeCloseTo(2.8 + 0.028, 6);
    expect(gases?.N2O).toBeCloseTo(2.65 + 0.53, 6);
    expect((gases?.CO2 || 0) + (gases?.CH4 || 0) + (gases?.N2O || 0)).toBeCloseTo(reporting.scope1Kg!, 3);
  });

  it("omits a gas breakdown when a verified gas total is missing", () => {
    const broken = mobileActivity({ ch4: { massKg: "0.001", gwp: "28", co2eKg: "" } });
    expect(verifiedScope1GasCo2eKg(results({ mobileVerified: readyMobile([broken]) }))).toBeNull();
    expect(
      verifiedScope1GasCo2eKg(
        results({
          mobileVerified: {
            status: "unavailable",
            error: "Verified mobile records could not be loaded.",
            totalTco2e: 0,
            totalKgCo2e: 0,
            activities: [],
          },
        })
      )
    ).toBeNull();
  });
});

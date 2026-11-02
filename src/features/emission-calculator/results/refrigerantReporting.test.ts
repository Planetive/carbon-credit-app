import { describe, expect, it } from "vitest";
import type { EmissionActivity, EmissionAssessment } from "@/api/ghg";
import type { EpaIpccResultsData } from "@/features/emission-calculator/core/loaders/epaIpccResults";
import { summarizeDashboardEmissions } from "@/features/dashboard/dashboardEmissions";
import { buildEpaCalculatorPdf } from "@/features/emission-calculator/methodologies/epa-ipcc/epaCalculatorPdf";
import { buildEpaSidebarDisplay } from "@/features/emission-calculator/methodologies/epa-ipcc/epaSidebarTotals";
import type { MobileResultActivity, MobileVerifiedResults } from "./mobileResults";
import { summarizeMobileActivities } from "./mobileResults";
import { productionAnnualAssignment } from "./reportingYear";
import {
  fetchRefrigerantVerified,
  partitionRefrigerantActivities,
  summarizeRefrigerantActivities,
  type RefrigerantResultActivity,
  type RefrigerantVerifiedResults,
} from "./refrigerantResults";
import { buildReportingTotals, verifiedScope1Lines } from "./reportingTotals";
import {
  buildEpaResultsCsv,
  officialExportTotals,
  stationaryReportHtml,
  verifiedScope1GasCo2eKg,
  withReportableTotals,
} from "./resultsExport";
import type { StationaryVerifiedResults } from "./stationaryResults";

function stationary(totalTco2e: number): StationaryVerifiedResults {
  return {
    status: "ready",
    error: null,
    totalTco2e,
    totalKgCo2e: totalTco2e * 1000,
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

function mobileActivity(): MobileResultActivity {
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
    factorSource: "EPA",
    factorVersion: "sheet",
  };
}

function readyMobile(activities: MobileResultActivity[]): MobileVerifiedResults {
  return { ...summarizeMobileActivities(activities), unassignedCount: 0, otherYearCount: 0 };
}

function readyRefrigerant(activities: RefrigerantResultActivity[]): RefrigerantVerifiedResults {
  return { ...summarizeRefrigerantActivities(activities), unassignedCount: 0, otherYearCount: 0, rejectedCount: 0 };
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

function refrigerantRaw(patch: Record<string, unknown> = {}) {
  return {
    calc: "epa_refrigerant_v1",
    inputs: {
      method: "leakage_record",
      refrigerant: "R-404A",
      leakage_kg: "2",
      leakage_rate_source: null,
    },
    activity_meta: {
      period: "2026-10",
      method_version: "epa_refrigerant_v1",
      equipment_type: "chiller",
      equipment_id: "CH-1",
      site: "North",
    },
    gwp: "3943",
    gwp_publication: "EPA GHG Emission Factors Hub, Table 12",
    factor_provenance: "Resolved from dataset epa_refrigerant_gwp",
    dataset_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    factor_row_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    dataset_code: "epa_refrigerant_gwp",
    emissions_kg_co2e: "7886",
    emissions_tco2e: "7.886",
    accounting: {
      version: "epa_refrigerant_v1",
      methodology: "EPA GHG Emission Factors Hub 2024, Tables 11 and 12",
    },
    ...patch,
  };
}

function storedActivity(overrides: Partial<EmissionActivity> = {}): EmissionActivity {
  return {
    id: "ref-404a",
    assessment_id: "assessment-1",
    organization_id: "org-1",
    user_id: "user-a",
    scope: 1,
    category: "refrigerant_leakage",
    method: "epa_refrigerant_v1",
    legacy_source: "epa_refrigerant_v1",
    counterparty_id: null,
    emissions_tco2e: "7.886" as unknown as number,
    created_at: "2020-01-01T00:00:00Z",
    raw: refrigerantRaw(),
    ...overrides,
  };
}

function estimatedActivity(): EmissionActivity {
  return storedActivity({
    id: "ref-134a",
    user_id: "user-b",
    emissions_tco2e: "1.3" as unknown as number,
    raw: refrigerantRaw({
      inputs: {
        method: "estimated_leakage",
        refrigerant: "HFC-134a",
        leakage_kg: "1",
        charge_kg: "10",
        leakage_rate_percent: "10",
        leakage_rate_source: "user_assumption",
      },
      gwp: "1300",
      gwp_publication: "EPA GHG Emission Factors Hub Table 11",
      factor_provenance: "Explicit Table 11 allowlist value",
      table11_reference: "EPA GHG Emission Factors Hub Table 11 allowlist",
      dataset_id: null,
      factor_row_id: null,
      dataset_code: null,
      emissions_kg_co2e: "1300",
      emissions_tco2e: "1.3",
      activity_meta: {
        period: "2026-08",
        method_version: "epa_refrigerant_v1",
        equipment_type: "vehicle AC",
        equipment_id: "VAN-1",
        site: "Depot",
      },
    }),
  });
}

const assessment: EmissionAssessment = {
  id: "assessment-1",
  organization_id: "org-1",
  user_id: "user-a",
  framework: "epa",
  status: "draft",
};

describe("verified refrigerant reporting", () => {
  it("adds stationary, mobile, and refrigerant Scope 1 once", async () => {
    const loaded = await fetchRefrigerantVerified(
      { organizationId: "org-1", reportingYear: 2026 },
      {
        listAssessments: async () => [assessment],
        listActivities: async () => [storedActivity(), estimatedActivity()],
      }
    );
    const data = results({ refrigerantVerified: loaded });
    const reporting = buildReportingTotals(data);
    expect(loaded.activities).toHaveLength(2);
    expect(loaded.totalTco2e).toBeCloseTo(9.186, 8);
    expect(reporting.scope1Kg).toBeCloseTo(5311.45 + 88.358 + 9186, 6);
    expect(reporting.verifiedTco2e).toBeCloseTo(5.31145 + 0.088358 + 9.186, 8);
    expect(reporting.scope1Kg).not.toBeCloseTo(5311.45 + 88.358 + 9186 + 2, 3);
    const lines = verifiedScope1Lines(data);
    expect(lines.map((line) => line.key)).toEqual([
      "stationary_verified",
      "mobile_verified",
      "refrigerant_verified",
    ]);
    expect(lines.reduce((sum, line) => sum + line.value, 0)).toBeCloseTo(reporting.scope1Kg!, 6);
  });

  it("counts each refrigerant activity once", () => {
    const duplicate = partitionRefrigerantActivities(
      [storedActivity(), storedActivity({ user_id: "user-b" })],
      { organizationId: "org-1", reportingYear: 2026, epaAssessmentIds: ["assessment-1"] }
    );
    expect(duplicate.included).toHaveLength(1);
    expect(summarizeRefrigerantActivities(duplicate.included).totalTco2e).toBeCloseTo(7.886, 8);
  });

  it("keeps another organization, counterparty, and year out, and keeps every user in the organization", async () => {
    const loaded = await fetchRefrigerantVerified(
      { organizationId: "org-1", reportingYear: 2026, counterpartyId: "cp-1" },
      {
        listAssessments: async () => [assessment],
        listActivities: async (params) => {
          expect(params).toEqual({ scope: 1, category: "refrigerant_leakage", legacy_source: "epa_refrigerant_v1" });
          return [
            storedActivity({ id: "user-a", user_id: "user-a", counterparty_id: "cp-1", emissions_tco2e: "1" as unknown as number, raw: refrigerantRaw({ emissions_tco2e: "1", emissions_kg_co2e: "1000" }) }),
            storedActivity({ id: "user-b", user_id: "user-b", counterparty_id: "cp-1", emissions_tco2e: "2" as unknown as number, raw: refrigerantRaw({ emissions_tco2e: "2", emissions_kg_co2e: "2000" }) }),
            storedActivity({ id: "other-org", organization_id: "org-2", counterparty_id: "cp-1", emissions_tco2e: "9" as unknown as number }),
            storedActivity({ id: "other-company", counterparty_id: "cp-2", emissions_tco2e: "4" as unknown as number }),
            storedActivity({
              id: "other-year",
              counterparty_id: "cp-1",
              created_at: "2026-10-01T00:00:00Z",
              emissions_tco2e: "3" as unknown as number,
              raw: refrigerantRaw({
                emissions_tco2e: "3",
                emissions_kg_co2e: "3000",
                activity_meta: { period: "2025-10", method_version: "epa_refrigerant_v1" },
              }),
            }),
          ];
        },
      }
    );
    expect(loaded.activities.map((row) => row.id).sort()).toEqual(["user-a", "user-b"]);
    expect(loaded.totalTco2e).toBeCloseTo(3, 8);
    expect(loaded.otherYearCount).toBe(1);
  });

  it("leaves a missing or malformed reporting period unassigned", async () => {
    const loaded = await fetchRefrigerantVerified(
      { organizationId: "org-1", reportingYear: 2026 },
      {
        listAssessments: async () => [assessment],
        listActivities: async () => [
          storedActivity({
            created_at: "2026-08-01T00:00:00Z",
            raw: refrigerantRaw({ activity_meta: { period: "", method_version: "epa_refrigerant_v1" } }),
          }),
          storedActivity({
            id: "bad-month",
            raw: refrigerantRaw({ activity_meta: { period: "2026-13", method_version: "epa_refrigerant_v1" } }),
          }),
        ],
      }
    );
    expect(loaded.totalTco2e).toBe(0);
    expect(loaded.unassignedCount).toBe(2);
    const reporting = buildReportingTotals(results({ refrigerantVerified: loaded }));
    expect(reporting.scope1Kg).toBeCloseTo(5311.45 + 88.358, 6);
    expect(reporting.inventory).toBe("partial");
    expect(reporting.statusLabel).toMatch(/without a reporting period/i);
  });

  it("does not count a record with missing provenance as verified", () => {
    const broken = storedActivity({
      id: "no-gwp",
      raw: refrigerantRaw({ gwp: null, factor_provenance: "" }),
    });
    const legacyMethod = storedActivity({
      id: "legacy-method",
      method: "epa_refrigerant",
      legacy_source: "scope1_refrigerant_entries",
      category: "refrigerant",
    });
    const partitioned = partitionRefrigerantActivities([broken, legacyMethod], {
      organizationId: "org-1",
      reportingYear: 2026,
      epaAssessmentIds: ["assessment-1"],
    });
    expect(partitioned.included).toHaveLength(0);
    expect(partitioned.rejectedCount).toBe(1);
    const reporting = buildReportingTotals(
      results({
        refrigerantVerified: {
          ...summarizeRefrigerantActivities(partitioned.included),
          rejectedCount: partitioned.rejectedCount,
        },
      })
    );
    expect(reporting.scope1Kg).toBeCloseTo(5311.45 + 88.358, 6);
    expect(reporting.inventory).toBe("partial");
    expect(reporting.statusLabel).toMatch(/missing provenance/i);
  });

  it("marks Scope 1 unavailable when the refrigerant load fails and treats an empty load as zero", () => {
    const failed = results({
      refrigerantVerified: {
        status: "unavailable",
        error: "Verified refrigerant records could not be loaded.",
        totalTco2e: 0,
        totalKgCo2e: 0,
        activities: [],
      },
    });
    const failedReporting = buildReportingTotals(failed);
    expect(failedReporting.inventory).toBe("unavailable");
    expect(failedReporting.scope1Kg).toBeNull();
    expect(failedReporting.grandKg).toBeNull();
    expect(buildEpaSidebarDisplay(failed).scope1).toBeNull();
    expect(buildEpaSidebarDisplay(failed).incomplete).toBe(true);
    expect(officialExportTotals(failed).scope1Kg).toBeNull();
    expect(buildEpaResultsCsv(failed)).toContain("Unavailable");
    expect(buildEpaResultsCsv(failed)).not.toContain("Refrigerant leakage (verified),0");

    const empty = results({ refrigerantVerified: readyRefrigerant([]) });
    const emptyReporting = buildReportingTotals(empty);
    expect(emptyReporting.scope1Kg).toBeCloseTo(5311.45 + 88.358, 6);
    expect(emptyReporting.inventory).not.toBe("unavailable");
    expect(buildEpaCalculatorPdf(empty).refrigerant).toBe(0);
  });

  it("excludes legacy EPA, UK, and UK-EPA refrigerant kilograms from the annual total", () => {
    const data = results({
      scope1: [
        { key: "uk_refrigerant", label: "Legacy EPA and UK-EPA refrigerant", value: 40 },
        { key: "flaring", label: "Flaring", value: 7 },
      ],
      refrigerantVerified: readyRefrigerant([]),
    });
    const reporting = buildReportingTotals(data);
    expect(reporting.scope1Kg).toBeCloseTo(5311.45 + 88.358, 6);
    expect(reporting.scope1Kg).not.toBeCloseTo(5311.45 + 88.358 + 40, 3);
    expect(reporting.legacyRefrigerant).toEqual([
      { key: "uk_refrigerant", label: "Legacy EPA and UK-EPA refrigerant", value: 40 },
    ]);
    expect(reporting.reportableScope1).toHaveLength(0);
    expect(reporting.inventory).toBe("partial");
    const csv = buildEpaResultsCsv(data);
    expect(csv).toContain("Legacy Refrigerant Leakage — Excluded from Annual Totals");
    expect(csv).toContain("Legacy EPA and UK-EPA refrigerant");
    expect(csv).toContain("excluded");
    expect(stationaryReportHtml(data)).toContain("Legacy Refrigerant Leakage — Excluded from Annual Totals");
    expect(stationaryReportHtml(data)).toContain("40 kg CO2e");
  });

  it("keeps refrigerant CO2e out of the CO2 mass subtotal", async () => {
    const loaded = await fetchRefrigerantVerified(
      { organizationId: "org-1", reportingYear: 2026 },
      {
        listAssessments: async () => [assessment],
        listActivities: async () => [storedActivity(), estimatedActivity()],
      }
    );
    const gases = verifiedScope1GasCo2eKg(results({ refrigerantVerified: loaded }));
    expect(gases?.CO2).toBeCloseTo(5306 + 87.8, 6);
    expect(gases?.refrigerantCo2eKg).toBeCloseTo(7886 + 1300, 6);
    expect(gases?.CO2).not.toBeCloseTo(5306 + 87.8 + 7886, 3);
    expect((gases?.CO2 || 0) + (gases?.CH4 || 0) + (gases?.N2O || 0) + (gases?.refrigerantCo2eKg || 0)).toBeCloseTo(
      5311.45 + 88.358 + 9186,
      3
    );
  });

  it("uses the same Scope 1 total and discloses measured and estimated leakage", async () => {
    const loaded = await fetchRefrigerantVerified(
      { organizationId: "org-1", reportingYear: 2026 },
      {
        listAssessments: async () => [assessment],
        listActivities: async () => [storedActivity(), estimatedActivity()],
      }
    );
    const data = results({ refrigerantVerified: loaded });
    const reporting = buildReportingTotals(data);
    const sidebar = buildEpaSidebarDisplay(data);
    const dashboard = summarizeDashboardEmissions(data);
    const pdf = buildEpaCalculatorPdf(data);
    const exported = officialExportTotals(data);
    const csv = buildEpaResultsCsv(data);
    const html = stationaryReportHtml(data);
    expect(sidebar.scope1).toBeCloseTo(reporting.verifiedTco2e!, 8);
    expect(dashboard.scope1Kg).toBe(reporting.scope1Kg);
    expect(pdf.scope1).toBe(sidebar.scope1);
    expect(pdf.stationary + (pdf.mobile || 0) + (pdf.refrigerant || 0)).toBeCloseTo(sidebar.scope1!, 8);
    expect(pdf.refrigerant).toBeCloseTo(9.186, 8);
    expect(exported.scope1Kg).toBe(reporting.scope1Kg);
    expect(withReportableTotals(data).scope1.reduce((sum, row) => sum + row.value, 0)).toBeCloseTo(reporting.scope1Kg!, 6);
    expect(csv).toContain("Refrigerant leakage (verified)");
    expect(csv).toContain("Measured leakage");
    expect(csv).toContain("Estimated leakage");
    expect(csv).toContain("user assumption, not an EPA-published leakage rate");
    expect(csv).toContain("R-404A");
    expect(csv).toContain("HFC-134a");
    expect(csv).toContain("7.886");
    expect(csv).toContain("1.3");
    expect(html).toContain("Measured leakage");
    expect(html).toContain("Estimated leakage");
    expect(html).toContain("user assumption");
    expect(html).toContain("2 kg refrigerant");
    expect(reporting.scope2Kg).toBeNull();
    expect(reporting.scope3Kg).toBeNull();
    expect(reporting.grandKg).toBeNull();
    expect(reporting.inventory).toBe("partial");
  });
});

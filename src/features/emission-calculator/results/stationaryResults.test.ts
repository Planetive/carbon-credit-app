import { describe, expect, it } from "vitest";
import type { EmissionActivity, EmissionAssessment } from "@/api/ghg";
import { buildReportingTotals } from "./reportingTotals";
import { productionAnnualAssignment } from "./reportingYear";
import {
  fetchStationaryVerified,
  legacyFuelRowsExcludingVerified,
  partitionStationaryActivities,
  scope1DisplayKg,
  selectStationaryActivities,
  summarizeStationaryActivities,
  tonnesToKg,
} from "./stationaryResults";

const ORG = "org-1";
const ASSESSMENT = "assessment-epa";

const ASSESSMENTS: EmissionAssessment[] = [
  {
    id: ASSESSMENT,
    organization_id: ORG,
    user_id: "user-1",
    framework: "epa",
    status: "draft",
  },
  {
    id: "assessment-uk",
    organization_id: ORG,
    user_id: "user-1",
    framework: "uk",
    status: "draft",
  },
  {
    id: "assessment-other-org",
    organization_id: "org-2",
    user_id: "user-2",
    framework: "epa",
    status: "draft",
  },
];

function stationaryActivity(overrides: Partial<EmissionActivity> = {}): EmissionActivity {
  return {
    id: "activity-ng",
    assessment_id: ASSESSMENT,
    organization_id: ORG,
    user_id: "user-1",
    scope: 1,
    category: "stationary_combustion",
    method: "epa_stationary",
    counterparty_id: "company-1",
    quantity: 100,
    unit: "mmBtu",
    emissions_tco2e: "5.31145" as unknown as number,
    legacy_source: "epa_stationary",
    raw: {
      inputs: {
        fuel: "Natural Gas",
        fuel_category: "Natural Gas",
        quantity: "100",
        unit: "mmBtu",
      },
      activity_meta: {
        equipment_type: "Boiler",
        site: "North plant",
        equipment_id: "BLR-1",
        period: "2026-10",
        method_version: "epa_stationary_biogenic_v1",
      },
      gases: {
        co2: { mass_kg: "5306", gwp: "1", co2e_kg: "5306" },
        ch4: { mass_kg: "0.1", gwp: "28", co2e_kg: "2.8" },
        n2o: { mass_kg: "0.01", gwp: "265", co2e_kg: "2.65" },
      },
      total_kg_co2e: "5311.45",
      total_t_co2e: "5.31145",
      factor_source: {
        publisher: "EPA",
        dataset_title: "Fuel EPA 2",
        version_label: "imported_from_sheet",
        gwp_version: "AR5",
      },
      accounting: { version: "epa_stationary_biogenic_v1", treatment: "fossil_scope1" },
    },
    ...overrides,
  };
}

describe("stationary results", () => {
  it("keeps natural gas at 5.31145 tCO2e and shows the stored gas breakdown", () => {
    const [activity] = selectStationaryActivities([stationaryActivity()], {
      organizationId: ORG,
      reportingYear: 2026,
      epaAssessmentIds: [ASSESSMENT],
    });
    const summary = summarizeStationaryActivities([activity]);
    expect(summary.totalTco2e).toBe(5.31145);
    expect(summary.totalKgCo2e).toBe(tonnesToKg(5.31145));
    expect(summary.totalKgCo2e).toBe(5311.45);
    expect(activity.fuel).toBe("Natural Gas");
    expect(activity.quantity).toBe("100");
    expect(activity.unit).toBe("mmBtu");
    expect(activity.equipmentType).toBe("Boiler");
    expect(activity.site).toBe("North plant");
    expect(activity.period).toBe("2026-10");
    expect(activity.co2).toEqual({ massKg: "5306", gwp: "1", co2eKg: "5306" });
    expect(activity.ch4).toEqual({ massKg: "0.1", gwp: "28", co2eKg: "2.8" });
    expect(activity.n2o).toEqual({ massKg: "0.01", gwp: "265", co2eKg: "2.65" });
    expect(activity.gwpVersion).toBe("AR5");
    expect(activity.factorSource).toContain("Fuel EPA 2");
    expect(activity.factorSource).toContain("imported_from_sheet");
  });

  it("adds multiple stationary records in tonnes", () => {
    const first = stationaryActivity();
    const second = stationaryActivity({
      id: "activity-anthracite",
      emissions_tco2e: "2.620328" as unknown as number,
      raw: {
        ...(first.raw as Record<string, unknown>),
        inputs: { fuel: "Anthracite", quantity: "1", unit: "short ton" },
        total_t_co2e: "2.620328",
        total_kg_co2e: "2620.328",
      },
    });
    const summary = summarizeStationaryActivities(
      selectStationaryActivities([stationaryActivity(), second], {
        organizationId: ORG,
        reportingYear: 2026,
        epaAssessmentIds: [ASSESSMENT],
      })
    );
    expect(summary.activities).toHaveLength(2);
    expect(summary.totalTco2e).toBe(7.931778);
    expect(summary.totalKgCo2e).toBe(7931.778);
    expect(scope1DisplayKg(1000, summary)).toBe(8931.778);
  });

  it("filters by organization, EPA assessment, and counterparty", async () => {
    const rows = [
      stationaryActivity(),
      stationaryActivity({ id: "other-org", organization_id: "org-2", assessment_id: "assessment-other-org" }),
      stationaryActivity({ id: "uk-assessment", assessment_id: "assessment-uk" }),
      stationaryActivity({ id: "other-company", counterparty_id: "company-2" }),
      stationaryActivity({ id: "not-stationary", method: "epa_fuel", legacy_source: "scope1_fuel_entries" }),
    ];
    const selected = selectStationaryActivities(rows, {
      organizationId: ORG,
      counterpartyId: "company-1",
      reportingYear: 2026,
      epaAssessmentIds: [ASSESSMENT],
    });
    expect(selected.map((row) => row.id)).toEqual(["activity-ng"]);

    const loaded = await fetchStationaryVerified(
      { organizationId: ORG, counterpartyId: "company-1", reportingYear: 2026 },
      {
        listAssessments: async () => ASSESSMENTS,
        listActivities: async () => rows,
      }
    );
    expect(loaded.status).toBe("ready");
    expect(loaded.activities.map((row) => row.id)).toEqual(["activity-ng"]);
    expect(loaded.totalTco2e).toBe(5.31145);
  });

  it("does not count the same activity twice and leaves a different legacy row separate", () => {
    const selected = selectStationaryActivities(
      [stationaryActivity(), stationaryActivity()],
      { organizationId: ORG, reportingYear: 2026, epaAssessmentIds: [ASSESSMENT] }
    );
    expect(summarizeStationaryActivities(selected).totalTco2e).toBe(5.31145);

    const legacy = legacyFuelRowsExcludingVerified(
      [
        { id: "activity-ng", emissions: 5311.45, legacy_source: "epa_stationary", method: "epa_stationary" },
        { id: "old-fuel", emissions: 10, legacy_source: "scope1_fuel_entries", method: "epa_fuel" },
      ],
      selected.map((row) => row.id)
    );
    expect(legacy.map((row) => row.id)).toEqual(["old-fuel"]);
    const legacyKg = legacy.reduce((sum, row) => sum + Number(row.emissions || 0), 0);
    expect(legacyKg).toBe(10);
    expect(scope1DisplayKg(legacyKg, summarizeStationaryActivities(selected))).toBe(5321.45);
  });

  it("returns an empty verified total and reports an API failure without inventing zero as verified data", async () => {
    const empty = await fetchStationaryVerified(
      { organizationId: ORG, reportingYear: 2026 },
      {
        listAssessments: async () => ASSESSMENTS,
        listActivities: async () => [],
      }
    );
    expect(empty.status).toBe("empty");
    expect(empty.totalTco2e).toBe(0);
    expect(scope1DisplayKg(20, empty)).toBe(20);

    const failed = await fetchStationaryVerified(
      { organizationId: ORG, reportingYear: 2026 },
      {
        listAssessments: async () => {
          throw new Error("API unavailable");
        },
        listActivities: async () => [stationaryActivity()],
      }
    );
    expect(failed.status).toBe("unavailable");
    expect(failed.error).toBe("API unavailable");
    expect(failed.activities).toEqual([]);
    expect(scope1DisplayKg(20, failed)).toBe(20);
    expect(failed.biogenicCo2Tonnes).toBeNull();
  });

  it("keeps biogenic CO2 out of the Scope 1 total and leaves older records unrecorded", () => {
    const naturalGas = selectStationaryActivities([stationaryActivity()], {
      organizationId: ORG,
      reportingYear: 2026,
      epaAssessmentIds: [ASSESSMENT],
    })[0];
    const wood = selectStationaryActivities(
      [
        stationaryActivity({
          id: "activity-wood",
          emissions_tco2e: "0.020223" as unknown as number,
          raw: {
            inputs: { fuel: "Wood and Wood Residuals", quantity: "1", unit: "short ton" },
            activity_meta: { period: "2026-10", method_version: "epa_stationary_biogenic_v1" },
            gases: {
              co2: { mass_kg: "0", gwp: "1", co2e_kg: "0" },
              ch4: { mass_kg: "0.126", gwp: "28", co2e_kg: "3.528" },
              n2o: { mass_kg: "0.063", gwp: "265", co2e_kg: "16.695" },
            },
            total_t_co2e: "0.020223",
            total_kg_co2e: "20.223",
            factor_source: {
              publisher: "EPA",
              dataset_title: "Fuel EPA 2",
              version_label: "imported_from_sheet",
              gwp_version: "AR5",
            },
            accounting: {
              version: "epa_stationary_biogenic_v1",
              treatment: "biogenic_co2_outside_scope1",
              biogenic_co2_t: "1.64",
              methodology: "Biogenic CO2 is outside Scope 1.",
              gwp_version: "AR5",
            },
          },
        }),
      ],
      { organizationId: ORG, reportingYear: 2026, epaAssessmentIds: [ASSESSMENT] }
    )[0];

    expect(naturalGas.biogenicCo2Tonnes).toBeNull();
    expect(wood.biogenicCo2Tonnes).toBe("1.64");
    expect(wood.totalTco2e).toBe("0.020223");

    const mixed = summarizeStationaryActivities([naturalGas, wood]);
    expect(mixed.totalTco2e).toBeCloseTo(5.331673, 6);
    expect(mixed.biogenicCo2Tonnes).toBe(1.64);
    expect(mixed.biogenicStatus).toBe("partial");
    expect(mixed.totalTco2e).not.toBeCloseTo(5.331673 + 1.64, 6);

    const reporting = buildReportingTotals({
      scope1: [],
      scope1ByActivity: [],
      scope2: [],
      scope3: [],
      stationaryVerified: summarizeStationaryActivities([wood]),
      annualReporting: productionAnnualAssignment(2026),
      totals: { scope1: 0, scope2: 0, scope3: 0, grand: 0 },
    });
    expect(reporting.scope1Kg).toBeCloseTo(20.223, 6);
    expect(reporting.biogenicCo2T).toBe(1.64);
    expect(reporting.grandKg).toBeNull();
    expect(reporting.scope1Kg).not.toBeCloseTo(20.223 + 1640, 3);
  });

  it("keeps a complete earlier stationary version and excludes a tonne-only row", () => {
    const current = stationaryActivity();
    const prior = stationaryActivity({
      id: "activity-prior",
      raw: {
        ...(current.raw as Record<string, unknown>),
        accounting: { version: "epa_stationary_v1", treatment: "fossil_scope1" },
      },
    });
    const incomplete = stationaryActivity({
      id: "activity-incomplete",
      emissions_tco2e: "9" as unknown as number,
      raw: {
        inputs: { fuel: "Natural Gas", quantity: "100", unit: "mmBtu" },
        activity_meta: { period: "2026-10" },
        total_t_co2e: "9",
      },
    });
    const partitioned = partitionStationaryActivities([current, prior, incomplete], {
      organizationId: ORG,
      reportingYear: 2026,
      epaAssessmentIds: [ASSESSMENT],
    });
    expect(partitioned.included.map((row) => row.id)).toEqual(["activity-ng", "activity-prior"]);
    expect(partitioned.rejectedCount).toBe(1);
    expect(summarizeStationaryActivities(partitioned.included).totalTco2e).toBe(10.6229);

    const reporting = buildReportingTotals({
      scope1: [],
      scope1ByActivity: [],
      scope2: [],
      scope3: [],
      stationaryVerified: {
        ...summarizeStationaryActivities(partitioned.included),
        rejectedCount: partitioned.rejectedCount,
      },
      annualReporting: productionAnnualAssignment(2026),
      totals: { scope1: 0, scope2: 0, scope3: 0, grand: 0 },
    });
    expect(reporting.inventory).toBe("partial");
    expect(reporting.scope1Kg).toBeCloseTo(10622.9, 6);
    expect(reporting.statusLabel).toContain("Stationary records with missing provenance are excluded");
    expect(reporting.scope1Kg).not.toBeCloseTo(10622.9 + 9000, 3);
  });

  it("includes every counterparty when none is selected and only the selected one otherwise", () => {
    const rows = [
      stationaryActivity({ id: "company-1", counterparty_id: "company-1" }),
      stationaryActivity({ id: "company-2", counterparty_id: "company-2" }),
    ];
    const all = partitionStationaryActivities(rows, {
      organizationId: ORG,
      reportingYear: 2026,
      epaAssessmentIds: [ASSESSMENT],
    });
    const selected = partitionStationaryActivities(rows, {
      organizationId: ORG,
      counterpartyId: "company-1",
      reportingYear: 2026,
      epaAssessmentIds: [ASSESSMENT],
    });
    expect(all.included.map((row) => row.id)).toEqual(["company-1", "company-2"]);
    expect(summarizeStationaryActivities(all.included).totalTco2e).toBe(10.6229);
    expect(selected.included.map((row) => row.id)).toEqual(["company-1"]);
    expect(summarizeStationaryActivities(selected.included).totalTco2e).toBe(5.31145);
    expect(summarizeStationaryActivities(all.included).totalTco2e).not.toBe(5.31145 * 3);
  });
});

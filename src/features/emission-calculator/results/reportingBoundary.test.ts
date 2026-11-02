import { describe, expect, it } from "vitest";
import type { EmissionActivity } from "@/api/ghg";
import type { EpaIpccResultsData } from "@/features/emission-calculator/core/loaders/epaIpccResults";
import { buildReportingTotals } from "./reportingTotals";
import {
  reportingYearFromPeriod,
  selectDraftAssessment,
} from "./reportingYear";
import {
  partitionStationaryActivities,
  type StationaryVerifiedResults,
} from "./stationaryResults";

const ORG = "org-1";
const ASSESSMENT = "assessment-epa";

function activity(id: string, period: string | null, tonnes: string, extras: Partial<EmissionActivity> = {}): EmissionActivity {
  return {
    id,
    assessment_id: ASSESSMENT,
    organization_id: ORG,
    user_id: "user-1",
    scope: 1,
    category: "stationary_combustion",
    method: "epa_stationary",
    legacy_source: "epa_stationary",
    counterparty_id: "company-1",
    emissions_tco2e: tonnes as unknown as number,
    raw: {
      inputs: { fuel: "Natural Gas", quantity: "100", unit: "mmBtu" },
      activity_meta: period
        ? { period, method_version: "epa_stationary_biogenic_v1" }
        : { method_version: "epa_stationary_biogenic_v1" },
      gases: {
        co2: { mass_kg: "5306", gwp: "1", co2e_kg: "5306" },
        ch4: { mass_kg: "0.1", gwp: "28", co2e_kg: "2.8" },
        n2o: { mass_kg: "0.01", gwp: "265", co2e_kg: "2.65" },
      },
      factor_source: {
        publisher: "EPA",
        dataset_title: "Fuel EPA 2",
        version_label: "imported_from_sheet",
        gwp_version: "AR5",
      },
      accounting: { version: "epa_stationary_biogenic_v1" },
      total_t_co2e: tonnes,
      total_kg_co2e: String(Number(tonnes) * 1000),
    },
    created_at: "2024-01-01T00:00:00.000Z",
    ...extras,
  };
}

function verified(totalTco2e: number, totalKgCo2e: number): StationaryVerifiedResults {
  return {
    status: "ready",
    error: null,
    totalTco2e,
    totalKgCo2e,
    activities: [],
  };
}

describe("EPA reporting year boundaries", () => {
  it("reads a year only from YYYY or YYYY-MM", () => {
    expect(reportingYearFromPeriod("2026-10")).toBe(2026);
    expect(reportingYearFromPeriod("2025")).toBe(2025);
    expect(reportingYearFromPeriod("2026-10-22T00:00:00.000Z")).toBeNull();
    expect(reportingYearFromPeriod("emission_history")).toBeNull();
    expect(reportingYearFromPeriod("")).toBeNull();
  });

  it("keeps 100 mmBtu natural gas in 2026 and leaves 2025 and a blank period out", () => {
    const rows = [
      activity("ng-2026", "2026-10", "5.31145"),
      activity("ng-2025", "2025-06", "10"),
      activity("ng-blank", null, "3"),
      activity("other-org", "2026-10", "9", { organization_id: "org-2" }),
      activity("other-company", "2026-10", "4", { counterparty_id: "company-2" }),
    ];
    const year2026 = partitionStationaryActivities(rows, {
      organizationId: ORG,
      counterpartyId: "company-1",
      reportingYear: 2026,
      epaAssessmentIds: [ASSESSMENT],
    });
    expect(year2026.included.map((row) => row.id)).toEqual(["ng-2026"]);
    expect(year2026.otherYear.map((row) => row.id)).toEqual(["ng-2025"]);
    expect(year2026.unassigned.map((row) => row.id)).toEqual(["ng-blank"]);

    const year2025 = partitionStationaryActivities(rows, {
      organizationId: ORG,
      counterpartyId: "company-1",
      reportingYear: 2025,
      epaAssessmentIds: [ASSESSMENT],
    });
    expect(year2025.included.map((row) => row.id)).toEqual(["ng-2025"]);
    expect(year2025.included.map((row) => row.totalTco2e)).not.toContain("5.31145");
  });

  it("includes every counterparty in the organization when none is selected", () => {
    const rows = [
      activity("company-1", "2026-10", "5.31145"),
      activity("company-2", "2026-11", "1", { counterparty_id: "company-2" }),
    ];
    const selected = partitionStationaryActivities(rows, {
      organizationId: ORG,
      reportingYear: 2026,
      epaAssessmentIds: [ASSESSMENT],
    });
    expect(selected.included.map((row) => row.id)).toEqual(["company-1", "company-2"]);
  });

  it("does not use an assessment period or created_at to assign a blank activity", () => {
    const blank = activity("ng-blank", null, "3");
    const selected = partitionStationaryActivities([blank], {
      organizationId: ORG,
      reportingYear: 2026,
      epaAssessmentIds: [ASSESSMENT],
    });
    expect(selected.included).toEqual([]);
    expect(selected.unassigned).toHaveLength(1);
  });

  it("does not put undated Scope 2 or Scope 3 into the 2026 annual total", () => {
    const results: EpaIpccResultsData = {
      scope1: [
        { key: "fuel", label: "Fuel", value: 5311.45 },
        { key: "mobile", label: "Mobile", value: 20 },
      ],
      scope1ByActivity: [],
      scope2: [{ key: "electricity", label: "Electricity", value: 1000 }],
      scope3: [{ key: "waste", label: "Waste", value: 500 }],
      stationaryVerified: verified(5.31145, 5311.45),
      annualReporting: {
        reportingYear: 2026,
        scope1Keys: [],
        scope2: "withheld",
        scope3: "withheld",
        withheldReason: "Shared Scope 2 and Scope 3 tables do not store a reporting period.",
      },
      totals: { scope1: 5331.45, scope2: 1000, scope3: 500, grand: 6831.45 },
    };
    const reporting = buildReportingTotals(results);
    expect(reporting.scope1Kg).toBe(5311.45);
    expect(reporting.scope2Kg).toBeNull();
    expect(reporting.scope3Kg).toBeNull();
    expect(reporting.grandKg).toBeNull();
    expect(reporting.inventory).toBe("partial");
    expect(reporting.scope1Kg).not.toBe(5311.45 + 1000);
  });

  it("can form a complete year only when every scope is explicitly assigned", () => {
    const results: EpaIpccResultsData = {
      scope1: [{ key: "flaring", label: "Flaring", value: 20 }],
      scope1ByActivity: [],
      scope2: [{ key: "electricity", label: "Electricity", value: 1000 }],
      scope3: [{ key: "waste", label: "Waste", value: 500 }],
      stationaryVerified: verified(5.31145, 5311.45),
      annualReporting: {
        reportingYear: 2026,
        scope1Keys: ["flaring"],
        scope2: "assigned",
        scope3: "assigned",
        withheldReason: null,
      },
      totals: { scope1: 20, scope2: 1000, scope3: 500, grand: 1520 },
    };
    const reporting = buildReportingTotals(results);
    expect(reporting.inventory).toBe("complete");
    expect(reporting.scope1Kg).toBe(5311.45 + 20);
    expect(reporting.scope2Kg).toBe(1000);
    expect(reporting.scope3Kg).toBe(500);
    expect(reporting.grandKg).toBe(5311.45 + 20 + 1000 + 500);
  });

  it("marks a failed stationary load unavailable instead of zero", () => {
    const results: EpaIpccResultsData = {
      scope1: [],
      scope1ByActivity: [],
      scope2: [],
      scope3: [],
      stationaryVerified: {
        status: "unavailable",
        error: "API unavailable",
        totalTco2e: 0,
        totalKgCo2e: 0,
        activities: [],
      },
      annualReporting: {
        reportingYear: 2026,
        scope1Keys: [],
        scope2: "withheld",
        scope3: "withheld",
        withheldReason: null,
      },
      totals: { scope1: 0, scope2: 0, scope3: 0, grand: 0 },
    };
    const reporting = buildReportingTotals(results);
    expect(reporting.inventory).toBe("unavailable");
    expect(reporting.scope1Kg).toBeNull();
    expect(reporting.grandKg).toBeNull();
    expect(reporting.scope1Kg).not.toBe(0);
  });

  it("reuses an EPA draft only when its stored year matches", () => {
    const drafts = [
      { framework: "epa", status: "draft", reporting_period: "2025" },
      { framework: "epa", status: "draft", reporting_period: null },
      { framework: "uk", status: "draft", reporting_period: null },
    ];
    expect(selectDraftAssessment(drafts, "epa", "2026-10")).toBeNull();
    expect(selectDraftAssessment(drafts, "epa", "2025-04")?.reporting_period).toBe("2025");
    expect(selectDraftAssessment(drafts, "uk")?.framework).toBe("uk");
  });
});

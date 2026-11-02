import { describe, expect, it } from "vitest";
import type { EmissionActivity } from "@/api/ghg";
import {
  SCOPE3_ACCOUNTING_VERSION,
  buildCompleteness,
  emptyScope3Verified,
  partitionScope3Activities,
  summarizeScope3Activities,
  verifiedScope3AnnualKgFromBlock,
} from "./scope3Results";
import { buildReportingTotals } from "./reportingTotals";
import { productionAnnualAssignment } from "./reportingYear";
import { officialExportTotals, buildEpaResultsCsv, reportableScope3Rows } from "./resultsExport";
import type { EpaIpccResultsData } from "@/features/emission-calculator/core/loaders/epaIpccResults";
import {
  scope3CompletionPercent,
  verifiedAnnualGrandKg,
  verifiedScope3AnnualKg,
} from "./scope3Reporting";

function activity(overrides: Partial<EmissionActivity> & { id: string; period: string }): EmissionActivity {
  const tonnes = overrides.emissions_tco2e ?? "0.5";
  return {
    id: overrides.id,
    assessment_id: overrides.assessment_id || "assess-1",
    organization_id: overrides.organization_id || "org-1",
    user_id: "user-1",
    scope: 3,
    category: overrides.category || "purchased_goods",
    method: overrides.method || "scope3_spend_v1",
    counterparty_id: overrides.counterparty_id ?? null,
    quantity: 100,
    unit: "USD",
    emissions_tco2e: tonnes,
    legacy_source: SCOPE3_ACCOUNTING_VERSION,
    raw: {
      calc: SCOPE3_ACCOUNTING_VERSION,
      activity_meta: {
        period: overrides.period,
        method_version: "scope3_spend_v1",
        reporting_year: Number(overrides.period.slice(0, 4)),
      },
      accounting: { version: SCOPE3_ACCOUNTING_VERSION, boundary: "purchased_goods" },
      total_t_co2e: String(tonnes),
      inputs: { amount: 100 },
      ...(overrides.raw || {}),
    },
  };
}

function stationaryReady() {
  return {
    status: "ready" as const,
    error: null,
    totalTco2e: 1,
    totalKgCo2e: 1000,
    activities: [],
    unassignedCount: 0,
    otherYearCount: 0,
    rejectedCount: 0,
  };
}

describe("Scope 3 verified annual aggregation", () => {
  it("keeps two reporting years separate and excludes other-year rows", () => {
    const rows = [
      activity({ id: "a", period: "2025-06", emissions_tco2e: "1" }),
      activity({ id: "b", period: "2026-01", emissions_tco2e: "2" }),
      activity({ id: "c", period: "2026-12", emissions_tco2e: "3" }),
    ];
    const y2026 = partitionScope3Activities(rows, {
      organizationId: "org-1",
      reportingYear: 2026,
      assessmentIds: ["assess-1"],
    });
    expect(y2026.included.map((r) => r.id).sort()).toEqual(["b", "c"]);
    expect(y2026.otherYear).toHaveLength(1);
    const summary = summarizeScope3Activities(y2026.included);
    expect(summary.totalTco2e).toBe(5);
    expect(summary.totalKgCo2e).toBe(5000);
    expect(verifiedScope3AnnualKgFromBlock(2026, summary)).toBe(5000);
    expect(verifiedScope3AnnualKgFromBlock(2025, summary)).toBe(5000); // block already filtered
  });

  it("separates organizations and counterparties", () => {
    const rows = [
      activity({ id: "a", period: "2026-01", organization_id: "org-1", counterparty_id: "cp-1" }),
      activity({ id: "b", period: "2026-01", organization_id: "org-2", counterparty_id: "cp-1" }),
      activity({ id: "c", period: "2026-01", organization_id: "org-1", counterparty_id: "cp-2" }),
    ];
    const org1 = partitionScope3Activities(rows, {
      organizationId: "org-1",
      reportingYear: 2026,
      assessmentIds: ["assess-1"],
    });
    expect(org1.included.map((r) => r.id).sort()).toEqual(["a", "c"]);
    const cp1 = partitionScope3Activities(rows, {
      organizationId: "org-1",
      reportingYear: 2026,
      counterpartyId: "cp-1",
      assessmentIds: ["assess-1"],
    });
    expect(cp1.included.map((r) => r.id)).toEqual(["a"]);
  });

  it("keeps multiple distinct activities in one month and dedupes repeated ids", () => {
    const rows = [
      activity({ id: "a", period: "2026-03", emissions_tco2e: "0.1", category: "business_travel" }),
      activity({ id: "b", period: "2026-03", emissions_tco2e: "0.2", category: "business_travel" }),
      activity({ id: "a", period: "2026-03", emissions_tco2e: "0.1", category: "business_travel" }),
    ];
    const partitioned = partitionScope3Activities(rows, {
      organizationId: "org-1",
      reportingYear: 2026,
      assessmentIds: ["assess-1"],
    });
    expect(partitioned.included).toHaveLength(2);
    const summary = summarizeScope3Activities(partitioned.included);
    expect(summary.totalKgCo2e).toBe(300);
  });

  it("excludes legacy rows and unsupported categories from verified totals", () => {
    const legacyLike = activity({ id: "legacy", period: "2026-01" });
    legacyLike.legacy_source = "scope3_legacy";
    const investments = activity({
      id: "inv",
      period: "2026-01",
      category: "investments",
    });
    const ok = activity({ id: "ok", period: "2026-01", emissions_tco2e: "1.5" });
    const partitioned = partitionScope3Activities([legacyLike, investments, ok], {
      organizationId: "org-1",
      reportingYear: 2026,
      assessmentIds: ["assess-1"],
    });
    expect(partitioned.included.map((r) => r.id)).toEqual(["ok"]);
    const completeness = buildCompleteness(partitioned.included, 999);
    expect(completeness.some((row) => row.status === "legacy_excluded" && row.kgCo2e === 999)).toBe(true);
    expect(completeness.find((row) => row.key === "investments")?.status).toBe("unsupported");
    expect(completeness.find((row) => row.key === "fuel_energy_activities")?.status).toBe("awaiting_factors");
  });

  it("never marks Scope 3 inventory complete from a partial verified subtotal", () => {
    const partitioned = partitionScope3Activities(
      [activity({ id: "a", period: "2026-01", emissions_tco2e: "1" })],
      { organizationId: "org-1", reportingYear: 2026, assessmentIds: ["assess-1"] },
    );
    const summary = summarizeScope3Activities(partitioned.included);
    expect(summary.inventoryComplete).toBe(false);
    expect(scope3CompletionPercent(5000, summary.totalKgCo2e, summary.categoriesWithActivity)).toBeLessThan(100);
    expect(scope3CompletionPercent(5000, null)).toBe(0);
  });

  it("converts tonnes to kilograms once and includes verified Scope 3 in the grand helper", () => {
    const partitioned = partitionScope3Activities(
      [activity({ id: "a", period: "2026-01", emissions_tco2e: "1.5" })],
      { organizationId: "org-1", reportingYear: 2026, assessmentIds: ["assess-1"] },
    );
    const summary = summarizeScope3Activities(partitioned.included);
    expect(summary.totalTco2e).toBe(1.5);
    expect(summary.totalKgCo2e).toBe(1500);
    expect(verifiedScope3AnnualKg(2026, summary.totalKgCo2e)).toBe(1500);
    expect(
      verifiedAnnualGrandKg({
        reportingYear: 2026,
        scope1Kg: 100,
        scope2Kg: 50,
        legacyScope3Kg: 9999,
        verifiedScope3Kg: summary.totalKgCo2e,
      }),
    ).toBe(1650);
  });

  it("keeps PCAF/facilitated out of verified Scope 3 annual kilograms", () => {
    expect(verifiedScope3AnnualKg(2026)).toBeNull();
    expect(verifiedScope3AnnualKgFromBlock(2026, emptyScope3Verified())).toBe(0);
  });
});

describe("Scope 3 reporting surface parity", () => {
  it("uses the same verified Scope 3 kg for reporting totals, CSV and export helpers", () => {
    const partitioned = partitionScope3Activities(
      [
        activity({
          id: "a",
          period: "2026-06",
          emissions_tco2e: "2",
          category: "upstream_transportation",
        }),
      ],
      { organizationId: "org-1", reportingYear: 2026, assessmentIds: ["assess-1"] },
    );
    const scope3Verified = summarizeScope3Activities(partitioned.included);
    const results: EpaIpccResultsData = {
      scope1: [{ key: "flaring", label: "Flaring", value: 0 }],
      scope1ByActivity: [],
      scope2: [{ key: "electricity", label: "Electricity", value: 10 }],
      scope3: [{ key: "waste", label: "Waste (legacy)", value: 999 }],
      stationaryVerified: stationaryReady(),
      mobileVerified: { ...stationaryReady(), totalTco2e: 0, totalKgCo2e: 0 },
      refrigerantVerified: { ...stationaryReady(), totalTco2e: 0, totalKgCo2e: 0 },
      electricityVerified: { ...stationaryReady(), totalTco2e: 0.1, totalKgCo2e: 100 },
      heatSteamVerified: { ...stationaryReady(), totalTco2e: 0, totalKgCo2e: 0 },
      scope3Verified,
      annualReporting: productionAnnualAssignment(2026),
      totals: { scope1: 0, scope2: 10, scope3: 999, grand: 1009 },
    };
    const reporting = buildReportingTotals(results);
    expect(reporting.scope3Kg).toBe(2000);
    expect(reporting.scope3Kg).not.toBe(999);
    expect(reporting.inventory).toBe("partial");
    expect(reporting.grandKg).toBe((reporting.scope1Kg || 0) + (reporting.scope2Kg || 0) + 2000);
    expect(reportableScope3Rows(results)?.[0]?.value).toBe(2000);
    const official = officialExportTotals(results);
    expect(official.scope3Kg).toBe(2000);
    expect(official.inventory).toBe("partial");
    const csv = buildEpaResultsCsv(results);
    expect(csv).toContain("Verified partial total");
    expect(csv).toContain("Not a complete Scope 3 inventory");
    expect(csv).toContain("legacy excluded");
  });
});

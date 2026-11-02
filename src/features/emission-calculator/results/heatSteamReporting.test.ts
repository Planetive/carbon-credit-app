import { describe, expect, it } from "vitest";
import type { EmissionActivity } from "@/api/ghg";
import type { EpaIpccResultsData } from "@/features/emission-calculator/core/loaders/epaIpccResults";
import { buildEpaCalculatorPdf } from "@/features/emission-calculator/methodologies/epa-ipcc/epaCalculatorPdf";
import { productionAnnualAssignment } from "./reportingYear";
import { buildReportingTotals } from "./reportingTotals";
import { buildEpaResultsCsv, stationaryReportHtml, reportableScope2Rows } from "./resultsExport";
import {
  buildScope2HeatSteamSaveBody,
  co2eTonnesFromMmBtu,
  partitionHeatSteamActivities,
  summarizeHeatSteamActivities,
} from "./heatSteamResults";
import type { StationaryVerifiedResults } from "./stationaryResults";

function stationary(): StationaryVerifiedResults {
  return {
    status: "ready",
    error: null,
    totalTco2e: 5.31145,
    totalKgCo2e: 5311.45,
    activities: [],
    biogenicCo2Tonnes: 0,
    biogenicStatus: "recorded",
  };
}

function heatActivity(overrides: Partial<EmissionActivity> = {}): EmissionActivity {
  return {
    id: "heat-1",
    assessment_id: "assessment-1",
    organization_id: "org-1",
    user_id: "user-1",
    scope: 2,
    category: "purchased_heat_steam",
    method: "purchased_energy",
    counterparty_id: null,
    quantity: 10,
    unit: "mmBtu",
    factor_dataset_id: null,
    factor_row_id: null,
    emissions_tco2e: 0.66398125,
    legacy_source: "scope2_purchased_heat_steam_v1",
    raw: {
      total_t_co2e: "0.66398125",
      total_kg_co2e: "663.98125000",
      activity_meta: {
        period: "2026-06",
        method_version: "scope2_purchased_heat_steam_v1",
        energy_form: "purchased_steam",
      },
      inputs: {
        energy_form: "purchased_steam",
        quantity: "10.00000000",
        unit: "mmBtu",
        supplier_name: "District plant",
      },
      on_site_combustion: { included: false },
      factor: {
        publisher: "US EPA",
        source_document: "Emission Factors for Greenhouse Gas Inventories, Table 7, Steam and Heat",
        boundary: "purchased_energy",
        supplier_specific: false,
        co2_kg_per_mmbtu: "66.33000000",
        ch4_g_per_mmbtu: "1.25000000",
        n2o_g_per_mmbtu: "0.12500000",
        gwp_version: "AR5",
        gwp_ch4: 28,
        gwp_n2o: 265,
      },
      gases: {
        co2: { mass_kg: "663.30000000" },
        ch4: { mass_kg: "0.01250000" },
        n2o: { mass_kg: "0.00125000" },
      },
      accounting: { version: "scope2_purchased_heat_steam_v1", status: "verified" },
    },
    ...overrides,
  };
}

function results(heat = summarizeHeatSteamActivities([])): EpaIpccResultsData {
  return {
    scope1: [],
    scope1ByActivity: [],
    scope2: [{ key: "heatsteam", label: "Heat & Steam (Scope 2)", value: 15000 }],
    scope3: [{ key: "waste", label: "Waste", value: 4 }],
    stationaryVerified: stationary(),
    heatSteamVerified: heat,
    annualReporting: productionAnnualAssignment(2026),
    totals: { scope1: 0, scope2: 15000, scope3: 4, grand: 15004 },
  };
}

describe("purchased heat and steam reporting", () => {
  it("recomputes 10 mmBtu from the Table 7 gases and AR5 GWPs", () => {
    expect(co2eTonnesFromMmBtu("10")).toBe("0.66398125");
    expect(co2eTonnesFromMmBtu("1")).toBe("0.06639813");
  });

  it("counts one verified record once and leaves the legacy kilogram total outside Scope 2", () => {
    const row = heatActivity();
    const partitioned = partitionHeatSteamActivities([row, row], {
      organizationId: "org-1",
      reportingYear: 2026,
    });
    expect(partitioned.included).toHaveLength(1);
    const summary = summarizeHeatSteamActivities(partitioned.included);
    const reporting = buildReportingTotals(results(summary));
    expect(summary.totalTco2e).toBeCloseTo(0.66398125, 8);
    expect(reporting.scope2Kg).toBeCloseTo(663.98125, 5);
    expect(reporting.scope2Kg).not.toBe(15000);
    expect(reporting.inventory).toBe("partial");
    expect(reporting.statusLabel).toContain("80 percent thermal efficiency");
    expect(reporting.statusLabel).toContain("Purchased cooling is not included");
    const csv = buildEpaResultsCsv(results(summary));
    expect(csv).toContain("Purchased heat and steam (verified)");
    expect(csv).toContain("excluded");
    expect(csv).not.toContain("15000,15");
    expect(stationaryReportHtml(results(summary))).toContain("Verified purchased heat and steam");
    expect(buildEpaCalculatorPdf(results(summary)).heat).toBeCloseTo(0.66398125, 8);
    const rows = reportableScope2Rows(results(summary));
    expect(rows?.map((row) => row.key)).toEqual(["purchased_heat_steam"]);
    expect(rows?.[0].value).toBeCloseTo(663.98125, 5);
    expect(rows?.some((row) => row.value === 15000)).toBe(false);
  });

  it("rejects on-site combustion, a substituted factor, and a legacy row", () => {
    const onsite = heatActivity({
      id: "onsite",
      raw: {
        ...heatActivity().raw,
        on_site_combustion: { included: true },
        inputs: { ...(heatActivity().raw as { inputs: object }).inputs, energy_form: "onsite" },
      },
    });
    const substituted = heatActivity({
      id: "fallback",
      raw: {
        ...heatActivity().raw,
        factor: {
          ...(heatActivity().raw as { factor: object }).factor,
          co2_kg_per_mmbtu: "0.17355000",
        },
      },
    });
    const legacy = heatActivity({
      id: "legacy",
      method: "heat_steam",
      category: "heat_steam",
      legacy_source: "api",
      emissions_tco2e: 12,
    });
    const ukRecord = heatActivity({
      id: "uk-heat",
      legacy_source: "scope2_uk_purchased_heat_steam_v1",
      emissions_tco2e: 0.0017529,
    });
    const partitioned = partitionHeatSteamActivities([onsite, substituted, legacy, ukRecord], {
      organizationId: "org-1",
      reportingYear: 2026,
    });
    expect(partitioned.included).toHaveLength(0);
    expect(partitioned.rejectedCount).toBe(2);
  });

  it("does not put a client factor into the save body", () => {
    const body = buildScope2HeatSteamSaveBody({
      energy_form: "purchased_heat",
      quantity: "10",
      unit: "mmBtu",
      period: "2026-06",
      assessment_id: "assessment-1",
      supplier_name: "  District plant  ",
    });
    expect(body).toEqual({
      energy_form: "purchased_heat",
      quantity: "10",
      unit: "mmBtu",
      period: "2026-06",
      assessment_id: "assessment-1",
      counterparty_id: null,
      supplier_name: "District plant",
    });
    expect(body).not.toHaveProperty("co2_factor");
    expect(body).not.toHaveProperty("emissions_tco2e");
  });
});

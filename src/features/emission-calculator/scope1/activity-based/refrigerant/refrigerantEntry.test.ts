import { describe, expect, it } from "vitest";
import { activityMatchesReportingYear, matchesVerifiedCounterparty } from "@/features/emission-calculator/results/reportingYear";
import type { EmissionActivity } from "@/api/ghg";
import type { RefrigerantCalcResponse, RefrigerantSaveResponse } from "@/api/calc";
import {
  canonicalRefrigerant,
  filterRefrigerantGroups,
  isSupportedRefrigerant,
  offeredRefrigerants,
} from "./refrigerantCatalog";
import {
  applyCalcFailure,
  applyCalcSuccess,
  applySaveSuccess,
  blankRefrigerantEntry,
  buildRefrigerantCalcBody,
  buildRefrigerantSaveBody,
  canSave,
  changeRefrigerantInputs,
  claimSave,
  draftAssessmentForRefrigerantPeriod,
  isEditableRefrigerantActivity,
  legacyRefrigerantKind,
  legacyRefrigerantLabel,
  matchesSelectedCounterparty,
  refrigerantEntryBlocker,
  releaseSave,
  saveUsesUpdate,
  stateFromRefrigerantActivity,
  verifiedTonnesText,
} from "./refrigerantEntry";

function entry(patch: Partial<ReturnType<typeof blankRefrigerantEntry>> = {}) {
  return { ...blankRefrigerantEntry(), gas: "R-404A", leakageKg: "2", ...patch };
}

function calcResult(patch: Partial<RefrigerantCalcResponse> = {}): RefrigerantCalcResponse {
  return {
    success: true,
    method: "leakage_record",
    refrigerant: "R-404A",
    leakage_kg: "2",
    gwp: "3943",
    gwp_publication: "EPA GHG Emission Factors Hub, Table 12, document last modified 05 June 2024",
    factor_provenance: "Resolved from dataset epa_refrigerant_gwp",
    emissions_kg_co2e: "7886",
    emissions_tco2e: "7.886",
    accounting: { version: "epa_refrigerant_v1" },
    ...patch,
  };
}

function activity(patch: Partial<EmissionActivity> = {}): EmissionActivity {
  return {
    id: "act-1",
    assessment_id: "as-1",
    organization_id: "org-1",
    user_id: "user-1",
    scope: 1,
    category: "refrigerant_leakage",
    method: "epa_refrigerant_v1",
    legacy_source: "epa_refrigerant_v1",
    emissions_tco2e: 7.886,
    raw: {
      inputs: { method: "leakage_record", refrigerant: "R-404A", leakage_kg: "2" },
      activity_meta: { period: "2026-10", equipment_type: "chiller", site: "North" },
    },
    ...patch,
  };
}

describe("supported refrigerant choices", () => {
  it("offers the approved blends and pure HFCs and hides unsupported gases", () => {
    const offered = offeredRefrigerants();
    expect(offered).toContain("R-404A");
    expect(offered).toContain("R-410A");
    expect(offered).toContain("HFC-134a");
    expect(offered).toContain("HFC-32");
    expect(offered).not.toContain("R-22");
    expect(offered).not.toContain("R-12");
    expect(offered).not.toContain("R-406A");
    expect(offered).not.toContain("R-401A");
    expect(offered).not.toContain("SF6");
    expect(offered).not.toContain("CO2");
    expect(isSupportedRefrigerant("R-134a")).toBe(true);
    expect(canonicalRefrigerant("HFC-43-I0mee")).toBe("HFC-43-10mee");
    expect(isSupportedRefrigerant("R-502")).toBe(false);
    expect(refrigerantEntryBlocker(entry({ gas: "SF6" }), "2026-10")).toMatch(/not available/i);
  });

  it("narrows the list as the user types R, 134, or an ASHRAE alias", () => {
    const names = (query: string) => filterRefrigerantGroups(query).flatMap((group) => [...group.options]);
    expect(names("R")).toContain("R-404A");
    expect(names("R")).toContain("R-410A");
    expect(names("R")).toContain("HFC-134a");
    expect(names("134")).toContain("HFC-134a");
    expect(names("r-134a")).toEqual(["HFC-134a"]);
    expect(names("hfc-32")).toEqual(["HFC-32"]);
    expect(names("R-22")).not.toContain("R-22");
    expect(names("SF6")).toEqual([]);
  });
});

describe("calculation requests", () => {
  it("builds a measured R-404A request without a browser GWP", () => {
    const body = buildRefrigerantCalcBody(entry());
    expect(body).toEqual({
      method: "leakage_record",
      gas: "R-404A",
      leakage_kg: "2",
      equipment_type: null,
    });
    expect(body).not.toHaveProperty("gwp");
    expect(body).not.toHaveProperty("emissions_tco2e");
  });

  it("builds an estimated HFC-134a request from the alias and a typed rate", () => {
    const state = changeRefrigerantInputs(entry({ gas: "R-134a", leakageKg: "9" }), {
      method: "estimated_leakage",
      chargeKg: "10",
      leakageRatePercent: "10",
    });
    expect(state.leakageRatePercent).toBe("10");
    expect(state.leakageKg).toBe("");
    const body = buildRefrigerantCalcBody(state);
    expect(body).toEqual({
      method: "estimated_leakage",
      gas: "HFC-134a",
      charge_kg: "10",
      leakage_rate_percent: "10",
      equipment_type: null,
    });
    expect(body).not.toHaveProperty("gwp");
  });

  it("does not invent a leakage rate when the method or equipment changes", () => {
    const estimated = changeRefrigerantInputs(entry(), { method: "estimated_leakage", equipmentType: "chiller" });
    expect(estimated.leakageRatePercent).toBe("");
    expect(estimated.method).toBe("estimated_leakage");
    const typed = changeRefrigerantInputs(estimated, { leakageRatePercent: "4", chargeKg: "8" });
    const relabeled = changeRefrigerantInputs(typed, { equipmentType: "cold room" });
    expect(relabeled.leakageRatePercent).toBe("4");
    expect(refrigerantEntryBlocker(changeRefrigerantInputs(estimated, { chargeKg: "8" }), "2026-10")).toMatch(/not treated as zero/i);
    expect(refrigerantEntryBlocker(changeRefrigerantInputs(estimated, { chargeKg: "8", leakageRatePercent: "0" }), "2026-10")).toBeNull();
  });
});

describe("api failure and display", () => {
  it("keeps the entered values and does not present a failed calculation as zero", () => {
    const started = entry();
    const failed = applyCalcFailure(started, "The calculation service is unavailable.");
    expect(failed.gas).toBe("R-404A");
    expect(failed.leakageKg).toBe("2");
    expect(failed.result).toBeNull();
    expect(failed.error).toMatch(/unavailable/);
    expect(canSave(failed, "2026-10")).toBe(false);
    expect(verifiedTonnesText(failed.result)).toBeNull();
    expect(verifiedTonnesText({ ...calcResult(), success: false, emissions_tco2e: "0" })).toBeNull();
  });

  it("shows the backend tonnes string for a successful result", () => {
    const ready = applyCalcSuccess(entry(), calcResult());
    expect(verifiedTonnesText(ready.result)).toBe("7.886");
    expect(canSave(ready, "2026-10")).toBe(true);
    const hfc = applyCalcSuccess(
      entry({ method: "estimated_leakage", gas: "HFC-134a", leakageKg: "", chargeKg: "10", leakageRatePercent: "10" }),
      calcResult({
        method: "estimated_leakage",
        refrigerant: "HFC-134a",
        gwp: "1300",
        leakage_kg: "1",
        emissions_kg_co2e: "1300",
        emissions_tco2e: "1.3",
        table11_reference: "EPA GHG Emission Factors Hub Table 11 allowlist",
      })
    );
    expect(verifiedTonnesText(hfc.result)).toBe("1.3");
    expect(hfc.result?.gwp).toBe("1300");
  });
});

describe("save and edit", () => {
  it("saves a new row and then updates the same activity without a client total", () => {
    const ready = applyCalcSuccess(entry({ equipmentType: "chiller" }), calcResult());
    const created = buildRefrigerantSaveBody({
      state: ready,
      assessmentId: "as-2026",
      period: "2026-10",
      equipmentId: "CH-1",
      site: "North",
      counterpartyId: "cp-1",
    });
    expect(created.assessment_id).toBe("as-2026");
    expect(created.period).toBe("2026-10");
    expect(created.counterparty_id).toBe("cp-1");
    expect(created).not.toHaveProperty("gwp");
    expect(created).not.toHaveProperty("emissions_tco2e");
    expect(saveUsesUpdate(ready)).toBe(false);

    const response: RefrigerantSaveResponse = {
      activity_id: "act-1",
      assessment_id: "as-2026",
      organization_id: "org-1",
      emissions_kg_co2e: "7886",
      emissions_tco2e: "7.886",
      calculation: calcResult(),
      raw: {},
    };
    const saved = applySaveSuccess(ready, response);
    expect(saved.activityId).toBe("act-1");
    expect(saveUsesUpdate(saved)).toBe(true);
    expect(verifiedTonnesText(saved.result)).toBe("7.886");
  });

  it("ignores a second save while the first is still running", () => {
    const lock = { current: false };
    expect(claimSave(lock)).toBe(true);
    expect(claimSave(lock)).toBe(false);
    releaseSave(lock);
    expect(claimSave(lock)).toBe(true);
  });

  it("selects the draft assessment for the reporting month", () => {
    const drafts = [
      { framework: "epa", status: "draft", reporting_period: "2025" },
      { framework: "epa", status: "draft", reporting_period: "2026" },
      { framework: "uk", status: "draft", reporting_period: "2026" },
    ];
    expect(draftAssessmentForRefrigerantPeriod(drafts, "2026-10")?.reporting_period).toBe("2026");
    expect(draftAssessmentForRefrigerantPeriod(drafts, "2026-10")).not.toMatchObject({ framework: "uk" });
    expect(draftAssessmentForRefrigerantPeriod(drafts, "2024-01")).toBeNull();
    expect(draftAssessmentForRefrigerantPeriod(drafts, "")).toBeNull();
  });
});

describe("record isolation", () => {
  it("edits only this organization's verified refrigerant activities", () => {
    expect(isEditableRefrigerantActivity(activity(), "org-1")).toBe(true);
    expect(isEditableRefrigerantActivity(activity(), "org-2")).toBe(false);
    expect(isEditableRefrigerantActivity(activity({ method: "epa_refrigerant", legacy_source: "api" }), "org-1")).toBe(false);
    expect(isEditableRefrigerantActivity(activity({ method: "epa_stationary", category: "stationary_combustion", legacy_source: "epa_stationary" }), "org-1")).toBe(false);
    expect(matchesSelectedCounterparty(activity({ counterparty_id: "cp-1" }), "cp-1")).toBe(true);
    expect(matchesSelectedCounterparty(activity({ counterparty_id: "cp-2" }), "cp-1")).toBe(false);
    expect(matchesSelectedCounterparty(activity({ counterparty_id: "cp-1" }), null)).toBe(false);
    expect(matchesVerifiedCounterparty("cp-1", null)).toBe(true);
    expect(matchesVerifiedCounterparty(null, null)).toBe(true);
    expect(matchesVerifiedCounterparty("cp-2", "cp-1")).toBe(false);
    expect(matchesVerifiedCounterparty("cp-1", "cp-1")).toBe(true);
    expect(activityMatchesReportingYear("2026-10", 2026)).toBe(true);
    expect(activityMatchesReportingYear("2025-10", 2026)).toBe(false);

    const loaded = stateFromRefrigerantActivity(activity({ raw: {
      inputs: { method: "estimated_leakage", refrigerant: "R-134a", charge_kg: "10", leakage_rate_percent: "10", leakage_kg: "1" },
      activity_meta: { period: "2026-04", equipment_type: "vehicle AC", equipment_id: "VAN-1", site: "Depot" },
    } }));
    expect(loaded.entry.gas).toBe("HFC-134a");
    expect(loaded.entry.method).toBe("estimated_leakage");
    expect(loaded.entry.leakageRatePercent).toBe("10");
    expect(loaded.entry.activityId).toBe("act-1");
    expect(loaded.context.period).toBe("2026-04");
    expect(loaded.entry.result).toBeNull();
  });

  it("labels legacy EPA and UK-EPA rows and does not treat them as editable activities", () => {
    expect(legacyRefrigerantKind({ emission_framework: "epa" })).toBe("epa");
    expect(legacyRefrigerantKind({ emission_framework: "uk_epa" })).toBe("uk_epa");
    expect(legacyRefrigerantKind({ emission_framework: "uk" })).toBeNull();
    expect(legacyRefrigerantLabel("epa")).toMatch(/Legacy EPA/);
    expect(legacyRefrigerantLabel("epa")).toMatch(/read only/i);
    expect(legacyRefrigerantLabel("uk_epa")).toMatch(/UK-EPA/);
    expect(legacyRefrigerantLabel("uk_epa")).toMatch(/read only/i);
  });
});

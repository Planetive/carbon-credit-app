import { describe, expect, it } from "vitest";
import type { StationaryCalcResponse, StationarySaveResponse } from "@/api/calc";
import type { EmissionActivity } from "@/api/ghg";
import {
  applyCalcFailure,
  applyCalcSuccess,
  applySaveFailure,
  applySaveSuccess,
  blankStationaryEntry,
  buildStationarySaveBody,
  canSave,
  changeStationaryInputs,
  activityContextFromStationaryActivity,
  isEpaStationaryActivity,
  physicalUnitsForFuel,
  saveUsesUpdate,
  stateFromStationaryActivity,
} from "./stationaryEntry";

const NATURAL_GAS: StationaryCalcResponse = {
  success: true,
  fuel: "Natural Gas",
  category: "Natural Gas",
  quantity: "100",
  unit: "mmBtu",
  gases: {
    co2: { mass_kg: "5306", gwp: "1", co2e_kg: "5306" },
    ch4: { mass_kg: "0.1", gwp: "28", co2e_kg: "2.8" },
    n2o: { mass_kg: "0.01", gwp: "265", co2e_kg: "2.65" },
  },
  total_kg_co2e: "5311.45",
  total_t_co2e: "5.31145",
  factors: {
    co2: { value: "53.06", unit: "kg CO2 / mmBtu" },
    ch4: { value: "1", unit: "g CH4 / mmBtu" },
    n2o: { value: "0.1", unit: "g N2O / mmBtu" },
  },
  factor_source: {
    publisher: "EPA",
    dataset_code: "fuel_epa_2",
    dataset_title: "Fuel EPA 2",
    version_label: "imported_from_sheet",
    gwp_version: "AR5",
  },
};

function readyState() {
  return changeStationaryInputs(blankStationaryEntry(), {
    category: "Natural Gas",
    fuel: "Natural Gas",
    unit: "mmBtu",
    quantity: "100",
  });
}

describe("stationary entry", () => {
  it("shows only physical units present for a fuel", () => {
    expect(
      physicalUnitsForFuel({
        "CO2 (kg CO2 / mmBtu)": 53.06,
        "CH4 (g CH4 / mmBtu)": 1,
        "N2O (g N2O / mmBtu)": 0.1,
        "CO2 (kg CO2 / MMSCF)": 54439.56,
        "CH4 (g CH4 / MMSCF)": 1026,
        "N2O (g N2O / MMSCF)": 102.6,
      })
    ).toEqual(["mmBtu", "MMSCF"]);
    expect(
      physicalUnitsForFuel({
        "CO2 (kg CO2 / gallon)": 10.21,
        "CO2 (kg CO2 / mmBtu)": 73.96,
      })
    ).toEqual(["mmBtu", "gallon"]);
  });

  it("displays the backend natural-gas result and does not keep it after an input change", () => {
    const verified = applyCalcSuccess(readyState(), NATURAL_GAS);
    expect(verified.result?.total_t_co2e).toBe("5.31145");
    expect(verified.result?.gases.co2.mass_kg).toBe("5306");
    expect(verified.result?.gases.ch4.co2e_kg).toBe("2.8");
    expect(verified.result?.gases.n2o.co2e_kg).toBe("2.65");
    expect(verified.result?.factor_source.gwp_version).toBe("AR5");
    expect(verified.result?.factor_source.version_label).toBe("imported_from_sheet");
    expect(canSave(verified)).toBe(true);

    const edited = changeStationaryInputs(verified, { quantity: "101" });
    expect(edited.quantity).toBe("101");
    expect(edited.result).toBeNull();
    expect(canSave(edited)).toBe(false);
  });

  it("clears the result when the backend fails and still keeps the entered fuel", () => {
    const verified = applyCalcSuccess(readyState(), NATURAL_GAS);
    const failed = applyCalcFailure(verified, "Backend unavailable");
    expect(failed.fuel).toBe("Natural Gas");
    expect(failed.quantity).toBe("100");
    expect(failed.result).toBeNull();
    expect(failed.error).toBe("Backend unavailable");
    expect(canSave(failed)).toBe(false);
  });

  it("creates with POST and updates the same activity with PATCH", () => {
    const verified = applyCalcSuccess(readyState(), NATURAL_GAS);
    expect(saveUsesUpdate(verified)).toBe(false);
    const body = buildStationarySaveBody({
      state: verified,
      assessmentId: "assessment-1",
      equipmentType: "Boiler",
      site: "North plant",
      equipmentId: "BLR-1",
      period: "2026-10",
    });
    expect(body.assessment_id).toBe("assessment-1");
    expect(body).not.toHaveProperty("factor");
    expect(body).not.toHaveProperty("emissions_tco2e");
    expect(body.period).toBe("2026-10");

    const created: StationarySaveResponse = {
      activity_id: "activity-1",
      assessment_id: "assessment-1",
      organization_id: "org-1",
      emissions_tco2e: "5.31145",
      calculation: NATURAL_GAS,
      raw: {},
    };
    const saved = applySaveSuccess(verified, created);
    expect(saved.activityId).toBe("activity-1");
    expect(saveUsesUpdate(saved)).toBe(true);
    expect(saved.result?.total_t_co2e).toBe("5.31145");

    const saveFailed = applySaveFailure(saved, "Save failed");
    expect(saveFailed.quantity).toBe("100");
    expect(saveFailed.activityId).toBe("activity-1");
    expect(saveFailed.result?.total_t_co2e).toBe("5.31145");
    expect(canSave(saveFailed)).toBe(true);
  });

  it("does not treat a historical fuel row as an editable stationary record", () => {
    const historical = {
      id: "old-1",
      legacy_source: "scope1_fuel_entries",
      method: "epa_fuel",
    } as EmissionActivity;
    const current = {
      id: "new-1",
      legacy_source: "epa_stationary",
      method: "epa_stationary",
      unit: "mmBtu",
      quantity: 100,
      raw: {
        inputs: {
          fuel_category: "Natural Gas",
          fuel: "Natural Gas",
          unit: "mmBtu",
          quantity: "100",
        },
      },
    } as EmissionActivity;
    expect(isEpaStationaryActivity(historical)).toBe(false);
    expect(isEpaStationaryActivity(current)).toBe(true);
    expect(stateFromStationaryActivity(current).activityId).toBe("new-1");
    expect(stateFromStationaryActivity(current).result).toBeNull();
  });

  it("reloads equipment, site, and reporting period from a saved stationary record", () => {
    const current = {
      id: "new-1",
      legacy_source: "epa_stationary",
      method: "epa_stationary",
      raw: {
        activity_meta: {
          equipment_type: "Boiler",
          site: "North plant",
          equipment_id: "BLR-1",
          source_id: "BLR-1",
          period: "2026-10",
        },
      },
    } as EmissionActivity;
    expect(activityContextFromStationaryActivity(current)).toEqual({
      equipmentType: "Boiler",
      site: "North plant",
      equipmentId: "BLR-1",
      period: "2026-10",
    });
  });
});

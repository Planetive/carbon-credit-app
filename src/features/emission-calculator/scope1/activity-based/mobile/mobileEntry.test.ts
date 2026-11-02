import { describe, expect, it } from "vitest";
import type { MobileCalcResponse, MobileSaveResponse } from "@/api/calc";
import type { EmissionActivity } from "@/api/ghg";
import { buildMobileFactorCatalog, fuelsEquivalent, yearMatchesChoice } from "./mobileFactorCatalog";
import {
  applyCalcFailure,
  applyCalcSuccess,
  applySaveSuccess,
  biogenicTonnes,
  blankMobileEntry,
  buildMobileSaveBody,
  canSave,
  changeMobileInputs,
  draftAssessmentForMobilePeriod,
  isEditableMobileActivity,
  saveUsesUpdate,
  stateFromMobileActivity,
} from "./mobileEntry";

const SHEETS = [
  {
    dataset_code: "mobile_combustion",
    rows: [
      { "Fuel Type": "Motor Gasoline", Unit: "gallon", "kg CO2 per unit": "8.78" },
      { "Fuel Type": "Diesel Fuel", Unit: "gallon", "kg CO2 per unit": "10.21" },
      { "Fuel Type": "Biodiesel (100%)", Unit: "gallon", "kg CO2 per unit": "9.45" },
      { "Fuel Type": "Compressed Natural Gas", Unit: "scf", "kg CO2 per unit": "0.05444" },
      { "Fuel Type": "B20", Unit: "gallon", "kg CO2 per unit": "10.01" },
    ],
  },
  {
    dataset_code: "on_road_gasoline",
    rows: [
      {
        "Vehicle Type": "Passenger Cars",
        "Model Year": "2020",
        "CH4 Factor (g CH4 / vehicle-mile)": "0.01",
        "N2O Factor (g N2O / vehicle-mile)": "0.02",
      },
      {
        "Vehicle Type": "Passenger Cars",
        "Model Year": "2010-2014",
        "CH4 Factor (g CH4 / vehicle-mile)": "0.03",
        "N2O Factor (g N2O / vehicle-mile)": "0.04",
      },
    ],
  },
  {
    dataset_code: "on_road_diesel_alt_fuel",
    rows: [
      {
        "Vehicle Type": "Heavy-Duty Trucks",
        "Fuel Type": "Diesel Fuel",
        "Model Year": "2007-2020",
        "CH4 Factor (g CH4 / vehicle-mile)": "0.01",
        "N2O Factor (g N2O / vehicle-mile)": "0.02",
      },
      {
        "Vehicle Type": "Light-Duty Cars",
        "Fuel Type": "Compressed Natural Gas",
        "CH4 Factor (g CH4 / vehicle-mile)": "0.1",
        "N2O Factor (g N2O / vehicle-mile)": "0.1",
      },
      {
        "Vehicle Type": "Light-Duty Cars",
        "Fuel Type": "Biodiesel (100%)",
        "CH4 Factor (g CH4 / vehicle-mile)": "0.01",
        "N2O Factor (g N2O / vehicle-mile)": "0.02",
      },
    ],
  },
  {
    dataset_code: "non_road_vehicle",
    rows: [
      {
        "Vehicle Type": "Agricultural Equipment",
        "Fuel Type": "Diesel Fuel",
        "CH4 Factor (g CH4 / gallon)": "1",
        "N2O Factor (g N2O / gallon)": "0.4",
      },
    ],
  },
];

const GASOLINE: MobileCalcResponse = {
  success: true,
  road_class: "on_road",
  vehicle_type: "Passenger Cars",
  fuel: "Motor Gasoline",
  model_year: "2020",
  gases: {
    co2: { mass_kg: "87.8", gwp: "1", co2e_kg: "87.8", reporting: "scope1" },
    ch4: { mass_kg: "0.001", gwp: "28", co2e_kg: "0.028", reporting: "scope1" },
    n2o: { mass_kg: "0.002", gwp: "265", co2e_kg: "0.53", reporting: "scope1" },
  },
  total_kg_co2e: "88.358",
  total_t_co2e: "0.088358",
  biogenic_co2_t: "0",
  factors: {
    co2: { value: "8.78", unit: "kg CO2 / gallon", dataset_code: "mobile_combustion" },
    ch4: { value: "0.01", unit: "g / vehicle-mile", dataset_code: "on_road_gasoline", factor_row_id: "gas-2020" },
    n2o: { value: "0.02", unit: "g / vehicle-mile", dataset_code: "on_road_gasoline", factor_row_id: "gas-2020" },
  },
  accounting: {
    version: "epa_mobile_biogenic_v1",
    treatment: "fossil_scope1",
    methodology: "EPA mobile combustion",
    gwp_version: "AR5",
  },
};

function readyGasoline() {
  return changeMobileInputs(blankMobileEntry(), {
    roadClass: "on_road",
    vehicle: "Passenger Cars",
    fuel: "Motor Gasoline",
    fuelUnit: "gallon",
    fuelQuantity: "10",
    distance: "100",
    distanceUnit: "mile",
    modelYear: "2020",
  });
}

describe("mobile factor catalog", () => {
  const catalog = buildMobileFactorCatalog(SHEETS);

  it("offers exact EPA vehicle, fuel, and model-year rows", () => {
    expect(catalog.vehicles.on_road).toEqual(["Heavy-Duty Trucks", "Light-Duty Cars", "Passenger Cars"]);
    expect(catalog.vehicles.on_road).not.toContain("passenger_car");
    expect(catalog.fuelsFor("on_road", "Passenger Cars").map((fuel) => fuel.fuel)).toEqual(["Motor Gasoline"]);
    const gasoline = catalog.choiceFor("on_road", "Passenger Cars", "Motor Gasoline");
    expect(gasoline?.yearMode).toBe("required");
    expect(gasoline?.yearBands.map((band) => band.label)).toEqual(["2020", "2010-2014"]);
    expect(yearMatchesChoice("2020", gasoline!)).toBeNull();
    expect(yearMatchesChoice("2012", gasoline!)).toBeNull();
    expect(yearMatchesChoice("2015", gasoline!)).toMatch(/not in the factor rows/);
    expect(catalog.choiceFor("on_road", "Motorcycles", "Motor Gasoline")).toBeNull();
  });

  it("limits CNG to scf and non-road diesel to gallon or liter", () => {
    const cng = catalog.choiceFor("on_road", "Light-Duty Cars", "Compressed Natural Gas");
    expect(cng?.units).toEqual(["scf"]);
    expect(cng?.factorUnit).toBe("scf");
    expect(cng?.yearMode).toBe("none");
    expect(catalog.choiceFor("non_road", "Light-Duty Cars", "Compressed Natural Gas")).toBeNull();

    const equipment = catalog.choiceFor("non_road", "Agricultural Equipment", "Diesel Fuel");
    expect(equipment?.units).toEqual(["gallon", "liter"]);
    expect(equipment?.yearMode).toBe("none");
    expect(catalog.vehicles.non_road).toEqual(["Agricultural Equipment"]);
  });

  it("maps only the documented fuel names and keeps unsupported fuels out", () => {
    expect(fuelsEquivalent("Diesel Fuel", "Diesel")).toBe(true);
    expect(fuelsEquivalent("Compressed Natural Gas (CNG)", "CNG")).toBe(true);
    expect(fuelsEquivalent("Diesel Equipment", "Diesel Fuel")).toBe(true);
    expect(fuelsEquivalent("Diesel", "Diesel Equipment")).toBe(false);
    expect(fuelsEquivalent("CNG", "LNG")).toBe(false);
    expect(fuelsEquivalent("LNG", "Liquefied Natural Gas (LNG)")).toBe(true);
    expect(fuelsEquivalent("Biodiesel (100%)", "Biodiesel")).toBe(true);
    expect(fuelsEquivalent("Ethanol (100%)", "Ethanol")).toBe(true);
    expect(fuelsEquivalent("Biodiesel (100%)", "B20")).toBe(false);
    expect(fuelsEquivalent("Ethanol (100%)", "E85")).toBe(false);
    expect(fuelsEquivalent("Diesel Off-Road Trucks", "Diesel Fuel")).toBe(false);
    expect(fuelsEquivalent("Diesel Fuel", "B20")).toBe(false);

    const hub = buildMobileFactorCatalog([
      {
        dataset_code: "mobile_combustion",
        rows: [
          { "Fuel Type": "Motor Gasoline", Unit: "gallon", "kg CO2 per unit": "8.78" },
          { "Fuel Type": "Diesel Fuel", Unit: "gallon", "kg CO2 per unit": "10.21" },
          { "Fuel Type": "Compressed Natural Gas (CNG)", Unit: "scf", "kg CO2 per unit": "0.05444" },
          { "Fuel Type": "Biodiesel (100%)", Unit: "gallon", "kg CO2 per unit": "9.45" },
          { "Fuel Type": "Ethanol (100%)", Unit: "gallon", "kg CO2 per unit": "5.75" },
          { "Fuel Type": "Liquefied Natural Gas (LNG)", Unit: "gallon", "kg CO2 per unit": "4.50" },
          { "Fuel Type": "Liquefied Petroleum Gases (LPG)", Unit: "gallon", "kg CO2 per unit": "5.68" },
        ],
      },
      SHEETS[1],
      {
        dataset_code: "on_road_diesel_alt_fuel",
        rows: [
          {
            "Vehicle Type": "Passenger Cars",
            "Fuel Type": "Diesel",
            "Model Year": "2007-2022",
            "CH4 Factor (g CH4 / vehicle-mile)": "0.0302",
            "N2O Factor (g N2O / vehicle-mile)": "0.0192",
          },
          {
            "Vehicle Type": "Light-Duty Cars",
            "Fuel Type": "CNG",
            "CH4 Factor (g CH4 / vehicle-mile)": "0.12",
            "N2O Factor (g N2O / vehicle-mile)": "0.004",
          },
          {
            "Vehicle Type": "Light-Duty Cars",
            "Fuel Type": "B20",
            "CH4 Factor (g CH4 / vehicle-mile)": "0.01",
            "N2O Factor (g N2O / vehicle-mile)": "0.01",
          },
          {
            "Vehicle Type": "Light-Duty Cars",
            "Fuel Type": "Biodiesel",
            "CH4 Factor (g CH4 / vehicle-mile)": "0.03",
            "N2O Factor (g N2O / vehicle-mile)": "0.001",
          },
          {
            "Vehicle Type": "Light-Duty Cars",
            "Fuel Type": "Ethanol",
            "CH4 Factor (g CH4 / vehicle-mile)": "0.013",
            "N2O Factor (g N2O / vehicle-mile)": "0.005",
          },
          {
            "Vehicle Type": "Light-Duty Trucks",
            "Fuel Type": "LNG",
            "CH4 Factor (g CH4 / vehicle-mile)": "0.13",
            "N2O Factor (g N2O / vehicle-mile)": "0.005",
          },
          {
            "Vehicle Type": "Light-Duty Cars",
            "Fuel Type": "LPG",
            "CH4 Factor (g CH4 / vehicle-mile)": "0.012",
            "N2O Factor (g N2O / vehicle-mile)": "0.004",
          },
        ],
      },
      {
        dataset_code: "non_road_vehicle",
        rows: [
          {
            "Vehicle Type": "Agricultural Equipment",
            "Fuel Type": "Diesel Equipment",
            "CH4 Factor (g CH4 / gallon)": "1.26",
            "N2O Factor (g N2O / gallon)": "1.07",
          },
          {
            "Vehicle Type": "Construction Equipment",
            "Fuel Type": "Diesel Off-Road Trucks",
            "CH4 Factor (g CH4 / gallon)": "0.92",
            "N2O Factor (g N2O / gallon)": "0.74",
          },
        ],
      },
    ]);

    expect(hub.fuelsFor("on_road", "Passenger Cars").map((fuel) => fuel.fuel)).toEqual([
      "Diesel Fuel",
      "Motor Gasoline",
    ]);
    expect(hub.choiceFor("on_road", "Light-Duty Cars", "Compressed Natural Gas (CNG)")?.units).toEqual(["scf"]);
    expect(hub.choiceFor("on_road", "Light-Duty Cars", "Biodiesel (100%)")?.units).toEqual(["gallon", "liter"]);
    expect(hub.choiceFor("on_road", "Light-Duty Cars", "Ethanol (100%)")?.factorUnit).toBe("gallon");
    expect(hub.choiceFor("on_road", "Light-Duty Trucks", "Liquefied Natural Gas (LNG)")?.units).toEqual(["gallon", "liter"]);
    expect(hub.choiceFor("on_road", "Light-Duty Cars", "Liquefied Petroleum Gases (LPG)")?.factorUnit).toBe("gallon");
    expect(hub.fuelsFor("on_road", "Light-Duty Cars").map((fuel) => fuel.fuel)).not.toContain("B20");
    expect(hub.fuelsFor("on_road", "Light-Duty Cars").map((fuel) => fuel.fuel)).not.toContain("LNG");
    expect(hub.choiceFor("non_road", "Agricultural Equipment", "Diesel Fuel")?.units).toEqual(["gallon", "liter"]);
    expect(hub.choiceFor("non_road", "Construction Equipment", "Diesel Off-Road Trucks")).toBeNull();
    expect(hub.unsupported.some((item) => item.includes("Diesel Off-Road Trucks"))).toBe(true);
    expect(hub.unsupported.some((item) => item.includes("B20"))).toBe(true);
  });

  it("does not offer a blend or an ambiguous model year", () => {
    expect(catalog.fuelsFor("on_road", "Light-Duty Cars").map((fuel) => fuel.fuel)).not.toContain("B20");
    expect(catalog.unsupported.some((item) => item.includes("B20"))).toBe(true);

    const overlap = buildMobileFactorCatalog([
      SHEETS[0],
      {
        dataset_code: "on_road_gasoline",
        rows: [
          ...SHEETS[1].rows,
          {
            "Vehicle Type": "Passenger Cars",
            "Model Year": "2014-2016",
            "CH4 Factor (g CH4 / vehicle-mile)": "0.05",
            "N2O Factor (g N2O / vehicle-mile)": "0.05",
          },
        ],
      },
      SHEETS[2],
      SHEETS[3],
    ]);
    const gasoline = overlap.choiceFor("on_road", "Passenger Cars", "Motor Gasoline");
    expect(yearMatchesChoice("2014", gasoline!)).toMatch(/more than one/);
  });
});

describe("mobile entry", () => {
  const catalog = buildMobileFactorCatalog(SHEETS);

  it("keeps the backend result, then clears it when an input changes", () => {
    const verified = applyCalcSuccess(readyGasoline(), GASOLINE);
    expect(canSave(verified, catalog, "2026-10")).toBe(true);
    expect(verified.result?.total_t_co2e).toBe("0.088358");
    expect(verified.result?.gases.co2.mass_kg).toBe("87.8");
    expect(biogenicTonnes(verified.result)).toBe("0");
    expect(verified.result?.accounting?.gwp_version).toBe("AR5");

    const edited = changeMobileInputs(verified, { fuelQuantity: "11" });
    expect(edited.fuelQuantity).toBe("11");
    expect(edited.vehicle).toBe("Passenger Cars");
    expect(edited.result).toBeNull();
    expect(canSave(edited, catalog, "2026-10")).toBe(false);
  });

  it("preserves the entered values when the backend returns an error", () => {
    const failed = applyCalcFailure(readyGasoline(), "No CH4/N2O factor row matches Motorcycles");
    expect(failed.vehicle).toBe("Passenger Cars");
    expect(failed.fuelQuantity).toBe("10");
    expect(failed.modelYear).toBe("2020");
    expect(failed.result).toBeNull();
    expect(failed.error).toMatch(/Motorcycles/);
    expect(canSave(failed, catalog, "2026-10")).toBe(false);
  });

  it("saves one activity and updates that same activity", () => {
    const verified = applyCalcSuccess(readyGasoline(), GASOLINE);
    expect(saveUsesUpdate(verified)).toBe(false);
    const body = buildMobileSaveBody({
      state: verified,
      assessmentId: "assessment-2026",
      period: "2026-10",
      equipmentId: "VAN-1",
      site: "Depot",
    });
    expect(body.assessment_id).toBe("assessment-2026");
    expect(body.period).toBe("2026-10");
    expect(body.vehicle_type).toBe("Passenger Cars");
    expect(body.model_year).toBe(2020);
    expect(body.fuel_unit).toBe("gallon");
    expect(body).not.toHaveProperty("factor");
    expect(body).not.toHaveProperty("emissions_tco2e");
    expect(body).not.toHaveProperty("gases");

    const created: MobileSaveResponse = {
      activity_id: "activity-1",
      assessment_id: "assessment-2026",
      organization_id: "org-1",
      emissions_tco2e: "0.088358",
      biogenic_co2_t: "0",
      calculation: GASOLINE,
      raw: {},
    };
    const saved = applySaveSuccess(verified, created);
    expect(saved.activityId).toBe("activity-1");
    expect(saveUsesUpdate(saved)).toBe(true);
    expect(buildMobileSaveBody({
      state: saved,
      assessmentId: "assessment-2026",
      period: "2026-10",
    }).assessment_id).toBe("assessment-2026");
  });

  it("reloads an existing mobile activity without treating a legacy row as editable", () => {
    const activity = {
      id: "activity-1",
      organization_id: "org-1",
      method: "epa_mobile_v1",
      legacy_source: "epa_mobile_v1",
      category: "mobile_combustion",
      quantity: 10,
      unit: "gallon",
      raw: {
        inputs: {
          road_class: "on_road",
          vehicle_type: "Passenger Cars",
          fuel: "Motor Gasoline",
          fuel_quantity: "10",
          fuel_unit: "gallon",
          distance: "100",
          distance_unit: "mile",
          model_year: "2020",
        },
        activity_meta: { period: "2026-10", equipment_id: "VAN-1", site: "Depot" },
        biogenic_co2_t: "0",
      },
    } as EmissionActivity;
    expect(isEditableMobileActivity(activity, "org-1")).toBe(true);
    expect(isEditableMobileActivity(activity, "org-2")).toBe(false);
    expect(isEditableMobileActivity({ ...activity, method: "activity_data", legacy_source: "scope1_epa_mobile_fuel_entries" }, "org-1")).toBe(false);
    const loaded = stateFromMobileActivity(activity);
    expect(loaded.entry.activityId).toBe("activity-1");
    expect(loaded.entry.vehicle).toBe("Passenger Cars");
    expect(loaded.entry.modelYear).toBe("2020");
    expect(loaded.entry.result).toBeNull();
    expect(loaded.context.period).toBe("2026-10");
    expect(saveUsesUpdate(loaded.entry)).toBe(true);
    expect(canSave(loaded.entry, catalog, loaded.context.period)).toBe(false);
  });

  it("uses the draft assessment for the reporting month's year", () => {
    const drafts = [
      { framework: "epa", status: "draft", reporting_period: "2025" },
      { framework: "epa", status: "draft", reporting_period: "2026" },
      { framework: "uk", status: "draft", reporting_period: "2026" },
    ];
    expect(draftAssessmentForMobilePeriod(drafts, "2026-10")?.reporting_period).toBe("2026");
    expect(draftAssessmentForMobilePeriod(drafts, "2026-10")).not.toMatchObject({ reporting_period: "2025" });
    expect(draftAssessmentForMobilePeriod(drafts, "")).toBeNull();
  });

  it("shows biodiesel biogenic CO2 separately from Scope 1", () => {
    const biodiesel: MobileCalcResponse = {
      ...GASOLINE,
      fuel: "Biodiesel (100%)",
      total_t_co2e: "0.0000558",
      biogenic_co2_t: "0.00945",
      gases: {
        ...GASOLINE.gases,
        co2: { mass_kg: "9.45", gwp: "1", co2e_kg: "9.45", reporting: "biogenic_outside_scope1" },
      },
      accounting: { ...GASOLINE.accounting, treatment: "biogenic_co2_outside_scope1" },
    };
    expect(biodiesel.total_t_co2e).not.toBe(biogenicTonnes(biodiesel));
    expect(biogenicTonnes(biodiesel)).toBe("0.00945");
  });
});

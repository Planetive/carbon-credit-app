import { describe, expect, it } from "vitest";
import {
  assembleMobileActivityResult,
  planMobileCalculation,
  roadClassForEquipment,
} from "./mobileRouting";
import { findDuplicateIdentityKeys, groupScope1LegacyTotals } from "../legacyMapping";
import { calculateStationaryCombustion } from "./stationaryCalc";

describe("mobileRouting", () => {
  it("classifies road type from equipment, not from available data", () => {
    expect(roadClassForEquipment("passenger_car")).toBe("on_road");
    expect(roadClassForEquipment("construction")).toBe("non_road");
    const planFuelOnly = planMobileCalculation({
      equipment: "passenger_car",
      dataAvailable: "fuel",
    });
    expect(planFuelOnly.roadClass).toBe("on_road");
    const planDistanceNonRoad = planMobileCalculation({
      equipment: "agricultural",
      dataAvailable: "distance",
    });
    expect(planDistanceNonRoad.roadClass).toBe("non_road");
  });

  it("does not invent fuel from distance without documented efficiency", () => {
    const result = assembleMobileActivityResult({
      dataAvailable: "distance",
      distance: 1000,
      distanceUnit: "miles",
      factors: {
        ch4GPerActivity: 0.01,
        n2oGPerActivity: 0.02,
        activityBasis: "per_mile",
      },
    });
    // CH4/N2O may still assemble from distance sheets; CO2 stays missing without efficiency.
    expect(result.co2Kg).toBeUndefined();
    expect(result.missing?.some((m) => /efficiency/i.test(m))).toBe(true);
    expect(result.completeness).toBe("partial_gases");
    expect(result.coverage).toBe("ch4_and_n2o");
  });

  it("assembles CO2 from fuel and CH4/N2O from distance without double-counting combined CO2e", () => {
    const result = assembleMobileActivityResult({
      dataAvailable: "both",
      fuelQuantity: 10,
      fuelUnit: "gallon",
      distance: 100,
      distanceUnit: "miles",
      factors: {
        mobileCombustionCo2KgPerGallon: 8.78,
        ch4GPerActivity: 0.01,
        n2oGPerActivity: 0.02,
        activityBasis: "per_mile",
      },
      fuelFactorIsCombinedCo2e: false,
    });
    expect(result.co2Kg).toBeCloseTo(87.8, 3);
    expect(result.ch4Kg).toBeCloseTo(0.001, 5);
    expect(result.n2oKg).toBeCloseTo(0.002, 5);
    expect(result.coverage).toBe("co2_ch4_n2o_assembled");
    // CO2 + CH4*28 + N2O*265
    expect(result.totalCo2eKg).toBeCloseTo(87.8 + 0.001 * 28 + 0.002 * 265, 3);
  });

  it("never adds CH4/N2O on top of a combined CO2e fuel factor", () => {
    const result = assembleMobileActivityResult({
      dataAvailable: "both",
      fuelQuantity: 10,
      fuelUnit: "gallon",
      distance: 100,
      distanceUnit: "miles",
      factors: {
        mobileCombustionCo2KgPerGallon: 10,
        ch4GPerActivity: 1,
        n2oGPerActivity: 1,
        activityBasis: "per_mile",
      },
      fuelFactorIsCombinedCo2e: true,
    });
    expect(result.co2eCombinedKg).toBe(100);
    expect(result.totalCo2eKg).toBe(100);
    expect(result.coverage).toBe("co2e_combined");
  });
});

describe("stationaryCalc", () => {
  it("uses CO2-only path with partial completeness when only CO2 factor selected", () => {
    const r = calculateStationaryCombustion({
      quantity: 100,
      unitLabel: "CO2 (kg CO2 / mmBtu)",
      selectedGas: "co2",
      selectedFactor: 53.06,
    });
    expect(r.co2Kg).toBeCloseTo(5306, 3);
    expect(r.completeness).toBe("partial_gases");
  });
});

describe("legacyMapping", () => {
  it("maps each legacy key to exactly one activity group without double counting", () => {
    const grouped = groupScope1LegacyTotals([
      { key: "fuel", label: "Fuel", value: 100 },
      { key: "kitchen", label: "Kitchen", value: 50 },
      { key: "mobile", label: "Mobile", value: 20 },
      { key: "onroad_gas", label: "OnRoad", value: 5 },
      { key: "uk_refrigerant", label: "Refrig", value: 3 },
      { key: "flaring", label: "Flaring", value: 7 },
    ]);
    const stationary = grouped.find((g) => g.groupId === "stationary")!;
    const vehicles = grouped.find((g) => g.groupId === "vehicles_mobile")!;
    expect(stationary.valueKg).toBe(150);
    expect(vehicles.valueKg).toBe(25);
    expect(grouped.reduce((s, g) => s + g.valueKg, 0)).toBe(185);
  });

  it("flags duplicate site/equipment/period identities", () => {
    const dups = findDuplicateIdentityKeys([
      { id: "1", site: "A", equipmentId: "B1", period: "2024-01" },
      { id: "2", site: "A", equipmentId: "B1", period: "2024-01" },
      { id: "3", site: "A", equipmentId: "B2", period: "2024-01" },
    ]);
    expect(dups).toHaveLength(1);
  });
});

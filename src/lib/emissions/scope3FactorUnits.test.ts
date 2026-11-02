import { describe, expect, it } from "vitest";
import {
  KG_PER_SHORT_TON,
  WASTE_DATASET_FACTOR_UNIT,
  annualizeCommutingDistanceKm,
  freightEmissionsKg,
  scope3GridElectricityKg,
  spendEmissionsKg,
  travelDistanceEmissionsKg,
  wasteEmissionsKg,
} from "./scope3FactorUnits";

describe("scope3FactorUnits Stage 2", () => {
  it("converts short ton-mile freight from km and kg", () => {
    const kg = freightEmissionsKg({
      distanceKm: 100,
      weightKg: 50,
      co2Factor: 0.12,
      factorUnit: "short ton-mile",
    });
    expect(kg).toBeCloseTo(0.41096771754547373, 9);
  });

  it("uses vehicle-mile without mass", () => {
    const kg = freightEmissionsKg({
      distanceKm: 100,
      weightKg: 0,
      co2Factor: 0.394,
      factorUnit: "vehicle-mile",
    });
    expect(kg).toBeCloseTo(24.482085824002386, 9);
  });

  it("does not treat 1000 kg as 1 short ton", () => {
    const kg = freightEmissionsKg({
      distanceKm: 100,
      weightKg: 1000,
      co2Factor: 1.0,
      factorUnit: "short ton-mile",
    });
    const oneShortTon = 1.0 * (100 / 1.60934);
    expect(kg).not.toBeCloseTo(oneShortTon, 3);
    expect(kg).toBeCloseTo(1.0 * (100 / 1.60934) * (1000 / KG_PER_SHORT_TON), 9);
  });

  it("refuses freight without unit", () => {
    expect(
      freightEmissionsKg({
        distanceKm: 100,
        weightKg: 50,
        co2Factor: 0.12,
      }),
    ).toBeNull();
  });

  it("converts waste MTCO2e/short ton from kg mass", () => {
    const kg = wasteEmissionsKg({
      mass: 100,
      massUnit: "kg",
      factor: 0.05,
      factorUnit: WASTE_DATASET_FACTOR_UNIT,
    });
    expect(kg).toBeCloseTo((100 / KG_PER_SHORT_TON) * 0.05 * 1000, 9);
  });

  it("refuses waste with ambiguous unit", () => {
    expect(
      wasteEmissionsKg({
        mass: 100,
        massUnit: "kg",
        factor: 0.05,
        factorUnit: "per unit",
      }),
    ).toBeNull();
  });

  it("applies supplier USD spend intensity as kg CO2e", () => {
    const kg = spendEmissionsKg({
      amount: 1000,
      emissionFactor: 0.488,
      factorUnit: "kg CO2e/2022 USD, purchaser price",
      activityCurrency: "USD",
      activityPriceYear: 2022,
    });
    expect(kg).toBeCloseTo(488, 9);
  });

  it("refuses spend without currency unit", () => {
    expect(
      spendEmissionsKg({
        amount: 1000,
        emissionFactor: 0.488,
        factorUnit: "tCO2e/tonne",
        activityCurrency: "USD",
        activityPriceYear: 2022,
      }),
    ).toBeNull();
  });

  it("refuses PKR spend against USD factor and wrong price year", () => {
    expect(
      spendEmissionsKg({
        amount: 1000,
        emissionFactor: 0.488,
        factorUnit: "kg CO2e/2022 USD, purchaser price",
        activityCurrency: "PKR",
        activityPriceYear: 2022,
      }),
    ).toBeNull();
    expect(
      spendEmissionsKg({
        amount: 1000,
        emissionFactor: 0.488,
        factorUnit: "kg CO2e/2022 USD, purchaser price",
        activityCurrency: "USD",
        activityPriceYear: 2024,
      }),
    ).toBeNull();
  });

  it("converts passenger-mile and vehicle-km travel", () => {
    expect(
      travelDistanceEmissionsKg({
        distanceKm: 160.934,
        co2Factor: 0.207,
        factorUnit: "passenger-mile",
      }),
    ).toBeCloseTo(20.7, 6);
    expect(
      travelDistanceEmissionsKg({
        distanceKm: 50,
        co2Factor: 0.12,
        factorUnit: "vehicle-km",
      }),
    ).toBeCloseTo(6, 9);
    expect(
      annualizeCommutingDistanceKm({
        distanceKm: 10,
        distanceBasis: "one_way",
        workingDaysPerYear: 200,
      }),
    ).toBe(4000);
    expect(
      annualizeCommutingDistanceKm({
        distanceKm: 20,
        distanceBasis: "round_trip",
        workingDaysPerYear: 200,
      }),
    ).toBe(4000);
    expect(
      scope3GridElectricityKg({
        totalKwh: 1000,
        gridPct: 100,
        gridFactor: 0.4041,
      }),
    ).toBeNull();
    expect(
      scope3GridElectricityKg({
        totalKwh: 1000,
        gridPct: 100,
        gridFactor: 0.177,
      }),
    ).toBeCloseTo(177, 6);
  });
});

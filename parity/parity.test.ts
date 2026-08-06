import { describe, expect, it } from "vitest";
import cases from "./cases.json";
import {
  approxEqual,
  spaBusinessTravel,
  spaEmployeeCommuting,
  spaEpaFuel,
  spaEpaRefrigerant,
  spaElectricity,
  spaFreight,
  spaHeatSteam,
  spaIpccFlaring,
  spaIpccHeating,
  spaIpccIndustry,
  spaIpccKitchen,
  spaIpccPower,
  spaIpccQtyFactor,
  spaIpccSelectedGas,
  spaIpccVehicular,
  spaIpccVenting,
  spaMobileFuel,
  spaNonRoad,
  spaOnRoad,
  spaQtyFactorRound6,
  spaSpendBased,
  spaUkMultiply,
  spaWaste,
} from "./spaMath";

/**
 * Layer 1 — Frontend self-check: spaMath must match fixture expected.
 * If this fails, the fixture or the SPA mirror is wrong (not the API).
 */
describe("parity spaMath vs fixtures (frontend)", () => {
  for (const c of cases.uk_fuel) {
    it(`uk_fuel ${c.id}`, () => {
      const got = spaUkMultiply(c.quantity, c.factor);
      expect(approxEqual(got, c.expected_emissions_kg)).toBe(true);
    });
  }

  for (const c of cases.epa_fuel) {
    it(`epa_fuel ${c.id}`, () => {
      const got = spaEpaFuel(c.quantity, c.factor, c.unit);
      expect(approxEqual(got, c.expected_emissions_kg)).toBe(true);
    });
  }

  for (const c of cases.mobile_fuel) {
    it(`mobile_fuel ${c.id}`, () => {
      const got = spaMobileFuel(c.quantity, c.factor, c.input_unit);
      expect(approxEqual(got, c.expected_emissions_kg)).toBe(true);
    });
  }

  for (const c of cases.on_road_gasoline) {
    it(`on_road_gasoline ${c.id}`, () => {
      const got = spaOnRoad(c.distance, c.distance_unit, c.ch4_g_per_mile);
      expect(approxEqual(got, c.expected_emissions_kg)).toBe(true);
    });
  }

  for (const c of cases.on_road_diesel) {
    it(`on_road_diesel ${c.id}`, () => {
      const got = spaOnRoad(c.distance, c.distance_unit, c.ch4_g_per_mile);
      expect(approxEqual(got, c.expected_emissions_kg)).toBe(true);
    });
  }

  for (const c of cases.non_road) {
    it(`non_road ${c.id}`, () => {
      const got = spaNonRoad(c.quantity, c.unit, c.ch4_g_per_gallon);
      expect(approxEqual(got, c.expected_emissions_kg)).toBe(true);
    });
  }

  for (const c of cases.heat_steam) {
    it(`heat_steam ${c.id}`, () => {
      const got = spaHeatSteam(c);
      expect(approxEqual(got, c.expected_emissions_kg)).toBe(true);
    });
  }

  for (const c of cases.waste) {
    it(`waste ${c.id}`, () => {
      const got = spaWaste(c.volume, c.factor);
      expect(approxEqual(got, c.expected_emissions_kg)).toBe(true);
    });
  }

  for (const c of cases.uk_passenger) {
    it(`uk_passenger ${c.id}`, () => {
      const got = spaUkMultiply(c.distance, c.factor);
      expect(approxEqual(got, c.expected_emissions_kg)).toBe(true);
    });
  }

  for (const c of cases.uk_delivery) {
    it(`uk_delivery ${c.id}`, () => {
      const got = spaUkMultiply(c.distance, c.factor);
      expect(approxEqual(got, c.expected_emissions_kg)).toBe(true);
    });
  }

  for (const c of cases.uk_refrigerant) {
    it(`uk_refrigerant ${c.id}`, () => {
      const got = spaUkMultiply(c.quantity, c.factor);
      expect(approxEqual(got, c.expected_emissions_kg)).toBe(true);
    });
  }

  for (const c of cases.electricity) {
    it(`electricity ${c.id}`, () => {
      const got = spaElectricity(c);
      expect(approxEqual(got, c.expected_emissions_kg)).toBe(true);
    });
  }

  for (const c of cases.epa_refrigerant) {
    it(`epa_refrigerant ${c.id}`, () => {
      const got = spaEpaRefrigerant(c as any);
      expect(got).not.toBeNull();
      expect(approxEqual(got!.emissions_kg, c.expected_emissions_kg)).toBe(true);
      expect(approxEqual(got!.leakage_kg, c.expected_leakage_kg)).toBe(true);
    });
  }

  for (const c of cases.freight) {
    it(`freight ${c.id}`, () => {
      const got = spaFreight(c.distance, c.weight, c.co2_factor);
      expect(approxEqual(got, c.expected_emissions_kg)).toBe(true);
    });
  }

  for (const c of cases.business_travel) {
    it(`business_travel ${c.id}`, () => {
      const got = spaBusinessTravel(c.distance, c.co2_factor, (c as any).unit);
      expect(approxEqual(got, c.expected_emissions_kg)).toBe(true);
    });
  }

  for (const c of cases.employee_commuting) {
    it(`employee_commuting ${c.id}`, () => {
      const got = spaEmployeeCommuting(
        c.employees,
        c.distance,
        c.co2_factor,
        (c as any).unit
      );
      expect(approxEqual(got, c.expected_emissions_kg)).toBe(true);
    });
  }

  for (const c of cases.spend_based) {
    it(`spend_based ${c.id}`, () => {
      const got = spaSpendBased(c.amount, c.emission_factor);
      expect(approxEqual(got, c.expected_emissions_kg)).toBe(true);
    });
  }

  for (const c of cases.sold_products_qty) {
    it(`sold_products_qty ${c.id}`, () => {
      const got = spaQtyFactorRound6(c.quantity, c.factor);
      expect(approxEqual(got, c.expected_emissions_kg)).toBe(true);
    });
  }

  for (const c of cases.ipcc_stationary) {
    it(`ipcc_stationary ${c.id}`, () => {
      const got = spaIpccQtyFactor(c.quantity, c.factor);
      expect(approxEqual(got, c.expected_emissions_kg)).toBe(true);
    });
  }

  for (const c of cases.ipcc_flaring) {
    it(`ipcc_flaring ${c.id}`, () => {
      const got = spaIpccFlaring(c);
      expect(approxEqual(got, c.expected_emissions_kg)).toBe(true);
    });
  }

  for (const c of cases.ipcc_venting) {
    it(`ipcc_venting ${c.id}`, () => {
      const got = spaIpccVenting(c);
      expect(approxEqual(got, c.expected_emissions_kg)).toBe(true);
    });
  }

  for (const c of cases.ipcc_vehicular) {
    it(`ipcc_vehicular ${c.id}`, () => {
      const got = spaIpccVehicular(c);
      expect(approxEqual(got, c.expected_emissions_kg)).toBe(true);
    });
  }

  for (const c of cases.ipcc_kitchen) {
    it(`ipcc_kitchen ${c.id}`, () => {
      const got = spaIpccKitchen(c);
      expect(approxEqual(got, c.expected_emissions_kg)).toBe(true);
    });
  }

  for (const c of cases.ipcc_power) {
    it(`ipcc_power ${c.id}`, () => {
      const got = spaIpccPower(c);
      expect(approxEqual(got, c.expected_emissions_kg)).toBe(true);
    });
  }

  for (const c of cases.ipcc_heating) {
    it(`ipcc_heating ${c.id}`, () => {
      const got = spaIpccHeating(c);
      expect(approxEqual(got, c.expected_emissions_kg)).toBe(true);
    });
  }

  for (const c of cases.ipcc_road) {
    it(`ipcc_road ${c.id}`, () => {
      const got = spaIpccQtyFactor(c.quantity, c.factor);
      expect(approxEqual(got, c.expected_emissions_kg)).toBe(true);
    });
  }

  for (const c of cases.ipcc_road_vehicle) {
    it(`ipcc_road_vehicle ${c.id}`, () => {
      const got = spaIpccSelectedGas(c);
      expect(approxEqual(got, c.expected_emissions_kg)).toBe(true);
    });
  }

  for (const c of cases.ipcc_usa_vehicles) {
    it(`ipcc_usa_vehicles ${c.id}`, () => {
      const got = spaIpccQtyFactor(c.quantity, c.factor);
      expect(approxEqual(got, c.expected_emissions_kg)).toBe(true);
    });
  }

  for (const c of cases.ipcc_alt_fuel) {
    it(`ipcc_alt_fuel ${c.id}`, () => {
      const got = spaIpccSelectedGas(c);
      expect(approxEqual(got, c.expected_emissions_kg)).toBe(true);
    });
  }

  for (const c of cases.ipcc_industry) {
    it(`ipcc_industry ${c.id}`, () => {
      const got = spaIpccIndustry(c);
      expect(approxEqual(got, c.expected_emissions_kg)).toBe(true);
    });
  }
});

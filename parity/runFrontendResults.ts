/**
 * Dump frontend spaMath results for every parity case (no API).
 * Run: npx --yes tsx parity/runFrontendResults.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
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
} from "./spaMath.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cases = JSON.parse(readFileSync(join(__dirname, "cases.json"), "utf8"));

type ResultRow = {
  suite: string;
  id: string;
  emissions_kg: number | null;
  extra?: Record<string, number>;
  error?: string;
};

const results: ResultRow[] = [];

function add(suite: string, id: string, emissions_kg: number, extra?: Record<string, number>) {
  results.push({ suite, id, emissions_kg, extra });
}

for (const c of cases.uk_fuel) {
  add("uk_fuel", c.id, spaUkMultiply(c.quantity, c.factor));
}
for (const c of cases.epa_fuel) {
  add("epa_fuel", c.id, spaEpaFuel(c.quantity, c.factor, c.unit));
}
for (const c of cases.mobile_fuel) {
  add("mobile_fuel", c.id, spaMobileFuel(c.quantity, c.factor, c.input_unit));
}
for (const c of cases.on_road_gasoline) {
  add("on_road_gasoline", c.id, spaOnRoad(c.distance, c.distance_unit, c.ch4_g_per_mile));
}
for (const c of cases.on_road_diesel) {
  add("on_road_diesel", c.id, spaOnRoad(c.distance, c.distance_unit, c.ch4_g_per_mile));
}
for (const c of cases.non_road) {
  add("non_road", c.id, spaNonRoad(c.quantity, c.unit, c.ch4_g_per_gallon));
}
for (const c of cases.heat_steam) {
  add("heat_steam", c.id, spaHeatSteam(c));
}
for (const c of cases.waste) {
  add("waste", c.id, spaWaste(c.volume, c.factor));
}
for (const c of cases.uk_passenger) {
  add("uk_passenger", c.id, spaUkMultiply(c.distance, c.factor));
}
for (const c of cases.uk_delivery) {
  add("uk_delivery", c.id, spaUkMultiply(c.distance, c.factor));
}
for (const c of cases.uk_refrigerant) {
  add("uk_refrigerant", c.id, spaUkMultiply(c.quantity, c.factor));
}
for (const c of cases.electricity) {
  add("electricity", c.id, spaElectricity(c));
}
for (const c of cases.epa_refrigerant) {
  const got = spaEpaRefrigerant(c);
  if (!got) {
    results.push({ suite: "epa_refrigerant", id: c.id, emissions_kg: null, error: "null" });
  } else {
    add("epa_refrigerant", c.id, got.emissions_kg, { leakage_kg: got.leakage_kg });
  }
}
for (const c of cases.freight) {
  add("freight", c.id, spaFreight(c.distance, c.weight, c.co2_factor));
}
for (const c of cases.business_travel) {
  add("business_travel", c.id, spaBusinessTravel(c.distance, c.co2_factor, c.unit));
}
for (const c of cases.employee_commuting) {
  add(
    "employee_commuting",
    c.id,
    spaEmployeeCommuting(c.employees, c.distance, c.co2_factor, c.unit)
  );
}
for (const c of cases.spend_based) {
  add("spend_based", c.id, spaSpendBased(c.amount, c.emission_factor));
}
for (const c of cases.sold_products_qty) {
  add("sold_products_qty", c.id, spaQtyFactorRound6(c.quantity, c.factor));
}
for (const c of cases.ipcc_stationary) {
  add("ipcc_stationary", c.id, spaIpccQtyFactor(c.quantity, c.factor));
}
for (const c of cases.ipcc_flaring) {
  add("ipcc_flaring", c.id, spaIpccFlaring(c));
}
for (const c of cases.ipcc_venting) {
  add("ipcc_venting", c.id, spaIpccVenting(c));
}
for (const c of cases.ipcc_vehicular) {
  add("ipcc_vehicular", c.id, spaIpccVehicular(c));
}
for (const c of cases.ipcc_kitchen) {
  add("ipcc_kitchen", c.id, spaIpccKitchen(c));
}
for (const c of cases.ipcc_power) {
  add("ipcc_power", c.id, spaIpccPower(c));
}
for (const c of cases.ipcc_heating) {
  add("ipcc_heating", c.id, spaIpccHeating(c));
}
for (const c of cases.ipcc_road) {
  add("ipcc_road", c.id, spaIpccQtyFactor(c.quantity, c.factor));
}
for (const c of cases.ipcc_road_vehicle) {
  add("ipcc_road_vehicle", c.id, spaIpccSelectedGas(c));
}
for (const c of cases.ipcc_usa_vehicles) {
  add("ipcc_usa_vehicles", c.id, spaIpccQtyFactor(c.quantity, c.factor));
}
for (const c of cases.ipcc_alt_fuel) {
  add("ipcc_alt_fuel", c.id, spaIpccSelectedGas(c));
}
for (const c of cases.ipcc_industry) {
  add("ipcc_industry", c.id, spaIpccIndustry(c));
}

const out = {
  side: "frontend_spaMath",
  generated_at: new Date().toISOString(),
  case_count: results.length,
  results,
};

writeFileSync(join(__dirname, "frontend_results.json"), JSON.stringify(out, null, 2));
console.log(`Wrote ${results.length} frontend results to parity/frontend_results.json`);
for (const r of results) {
  const extra = r.extra ? ` ${JSON.stringify(r.extra)}` : "";
  console.log(`${r.suite}\t${r.id}\t${r.emissions_kg}${extra}`);
}

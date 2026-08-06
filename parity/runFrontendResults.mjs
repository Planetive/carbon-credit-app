/**
 * Plain Node dump of frontend spaMath results (no tsx).
 * node parity/runFrontendResults.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cases = JSON.parse(readFileSync(join(__dirname, "cases.json"), "utf8"));

const round6 = (n) => Number(n.toFixed(6));
const spaUkMultiply = (q, f) => round6(q * f);
const spaEpaFuel = (q, f, unit) => {
  let raw = q * f;
  const u = String(unit || "");
  if (u.startsWith("CH4") || u.startsWith("N2O")) raw = raw / 1000;
  return round6(raw);
};
const spaMobileFuel = (q, f, inputUnit = "gallon") => {
  const qty =
    String(inputUnit).toLowerCase().startsWith("liter") ||
    String(inputUnit).toLowerCase().startsWith("litre")
      ? q / 3.78541
      : q;
  return round6(qty * f);
};
const spaOnRoad = (distance, distanceUnit, gPerMile) => {
  const miles = String(distanceUnit).toLowerCase().startsWith("km")
    ? distance * 0.621371
    : distance;
  return (gPerMile * miles) / 1000;
};
const spaNonRoad = (quantity, unit, gPerGallon) => {
  const gallons =
    String(unit).toLowerCase().startsWith("liter") ||
    String(unit).toLowerCase().startsWith("litre")
      ? quantity / 3.78541
      : quantity;
  return (gPerGallon * gallons) / 1000;
};
const spaHeatSteam = (opts) => {
  let qty = opts.quantity;
  if (String(opts.quantity_unit || "").toLowerCase() === "mmscf") qty = qty * 1037;
  const gas = String(opts.gas || "co2").toLowerCase();
  if (gas === "ch4") return (qty * (opts.ch4_factor ?? 0)) / 1000;
  if (gas === "n2o") return (qty * (opts.n2o_factor ?? 0)) / 1000;
  return qty * (opts.co2_factor ?? 0);
};
const spaWaste = (volume, factor) => volume * factor;
const spaElectricity = (opts) => {
  const total = opts.total_kwh;
  if (!total) return 0;
  const gridPart =
    opts.grid_pct && opts.grid_factor
      ? (opts.grid_pct / 100) * total * opts.grid_factor
      : 0;
  const otherPart =
    opts.other_pct && opts.other_pct > 0 && opts.other_row_emissions_sum
      ? (opts.other_pct / 100) * total * opts.other_row_emissions_sum
      : 0;
  return round6(gridPart + otherPart);
};
const spaEpaRefrigerant = (opts) => {
  if (!Number.isFinite(opts.gwp) || opts.gwp <= 0) return null;
  let leakageKg = 0;
  if (opts.method === "leakage_record") {
    if (typeof opts.leakage_kg !== "number" || opts.leakage_kg < 0) return null;
    leakageKg = opts.leakage_kg;
  } else {
    leakageKg = opts.charge_kg * (opts.leakage_rate_percent / 100);
  }
  return {
    leakage_kg: Number(leakageKg.toFixed(6)),
    emissions_kg: Number((leakageKg * opts.gwp).toFixed(6)),
  };
};
const spaFreight = (d, w, f) => f * d * w;
const spaBusinessTravel = (distance, co2Factor, unit) => {
  let factor = co2Factor;
  if (unit && String(unit).toLowerCase().includes("mile")) factor = co2Factor / 1.60934;
  return distance * factor;
};
const spaEmployeeCommuting = (employees, distance, co2Factor, unit) => {
  let factor = co2Factor;
  if (unit && String(unit).toLowerCase().includes("mile")) factor = co2Factor / 1.60934;
  return employees * distance * factor;
};
const spaSpendBased = (amount, emissionFactor) => amount * emissionFactor;
const spaQtyFactorRound6 = (q, f) => round6(q * f);
const spaIpccQtyFactor = (q, f) => q * f;
const spaIpccVehicular = (o) =>
  (o.diesel_liters ?? 0) * (o.diesel_factor ?? 0) +
  (o.petrol_liters ?? 0) * (o.petrol_factor ?? 0);
const spaIpccKitchen = (o) =>
  (o.lpg_kg ?? 0) * (o.lpg_factor ?? 0) +
  (o.ng_mmscf ?? 0) * (o.ghv ?? 0) * (o.natural_gas_co2 ?? 0);
const spaIpccPower = (o) =>
  (o.diesel_liters ?? 0) * (o.diesel_factor ?? 0) +
  (o.ng_mmscf ?? 0) * (o.ghv ?? 0) * (o.natural_gas_co2 ?? 0);
const spaIpccHeating = (o) =>
  (o.ng_mmscf ?? 0) * (o.ghv ?? 0) * (o.natural_gas_co2 ?? 0);
const spaIpccSelectedGas = (o) => {
  const sel = String(o.selected_factor || "CH4").toUpperCase();
  const factor =
    sel === "N2O" || sel === "NO2" ? o.n2o_factor ?? 0 : o.ch4_factor ?? 0;
  return o.quantity * factor;
};
const spaIpccIndustry = (o) => {
  const sel = String(o.selected_factor || "CO2").toUpperCase();
  let factor = o.ef_co2 ?? 0;
  if (sel === "CH4") factor = o.ef_ch4 ?? 0;
  else if (sel === "N2O" || sel === "NO2") factor = o.ef_n2o ?? 0;
  return o.quantity * factor;
};
const M3_PER_MMSCF = 28316.8466;
const IDEAL_GAS_VOLUME_DIVISOR = 22.414;
const TEMP_CORR = 273.15 / 288.71;
const FLARING_FACTORS = {
  CO2: { molarMass: 44.01, multiplier: 1 },
  CH4: { molarMass: 16.04, multiplier: 28 },
  C2H6: { molarMass: 30.07, multiplier: 5.5 },
  C3H8: { molarMass: 44.1, multiplier: 3 },
  C4H10: { molarMass: 58.12, multiplier: 4 },
  C5H12: { molarMass: 72.15, multiplier: 4 },
  C6H14: { molarMass: 86.18, multiplier: 4 },
};
const VENTING_GWP = { N2: 0, CO2: 1, CH4: 28, C2H6: 5.5, C3H8: 3, C4H10: 4, C5H12: 4, C6H14: 4 };
const VENTING_MM = { N2: 28.014, CO2: 44.01, CH4: 16.04, C2H6: 30.07, C3H8: 44.1, C4H10: 58.12, C5H12: 72.15, C6H14: 86.18 };
const spaIpccFlaring = (o) => {
  const volumeM3 = String(o.unit || "m3").toUpperCase() === "MMSCF" ? o.volume * M3_PER_MMSCF : o.volume;
  const totalMoles = (volumeM3 / IDEAL_GAS_VOLUME_DIVISOR) * TEMP_CORR;
  let weighted = 0;
  for (const item of o.composition) {
    const formula = String(item.formula || "").trim().toUpperCase();
    const def = FLARING_FACTORS[formula];
    weighted += (item.percentage / 100) * (def?.molarMass ?? 0) * (def?.multiplier ?? 0);
  }
  return totalMoles * weighted;
};
const spaIpccVenting = (o) => {
  const volumeM3 = String(o.unit || "m3").toUpperCase() === "MMSCF" ? o.volume * M3_PER_MMSCF : o.volume;
  const totalMoles = (volumeM3 / IDEAL_GAS_VOLUME_DIVISOR) * TEMP_CORR;
  const byGas = { N2: 0, CO2: 0, CH4: 0, C2H6: 0, C3H8: 0, C4H10: 0, C5H12: 0, C6H14: 0 };
  for (const item of o.composition) byGas[String(item.gas).toUpperCase()] += item.percentage;
  let total = 0;
  for (const gas of Object.keys(byGas)) {
    if (byGas[gas] <= 0) continue;
    total += totalMoles * (byGas[gas] / 100) * VENTING_MM[gas] * VENTING_GWP[gas];
  }
  return total;
};

const results = [];
const add = (suite, id, emissions_kg, extra) => {
  results.push({ suite, id, emissions_kg, ...(extra ? { extra } : {}) });
};

for (const c of cases.uk_fuel) add("uk_fuel", c.id, spaUkMultiply(c.quantity, c.factor));
for (const c of cases.epa_fuel) add("epa_fuel", c.id, spaEpaFuel(c.quantity, c.factor, c.unit));
for (const c of cases.mobile_fuel) add("mobile_fuel", c.id, spaMobileFuel(c.quantity, c.factor, c.input_unit));
for (const c of cases.on_road_gasoline) add("on_road_gasoline", c.id, spaOnRoad(c.distance, c.distance_unit, c.ch4_g_per_mile));
for (const c of cases.on_road_diesel) add("on_road_diesel", c.id, spaOnRoad(c.distance, c.distance_unit, c.ch4_g_per_mile));
for (const c of cases.non_road) add("non_road", c.id, spaNonRoad(c.quantity, c.unit, c.ch4_g_per_gallon));
for (const c of cases.heat_steam) add("heat_steam", c.id, spaHeatSteam(c));
for (const c of cases.waste) add("waste", c.id, spaWaste(c.volume, c.factor));
for (const c of cases.uk_passenger) add("uk_passenger", c.id, spaUkMultiply(c.distance, c.factor));
for (const c of cases.uk_delivery) add("uk_delivery", c.id, spaUkMultiply(c.distance, c.factor));
for (const c of cases.uk_refrigerant) add("uk_refrigerant", c.id, spaUkMultiply(c.quantity, c.factor));
for (const c of cases.electricity) add("electricity", c.id, spaElectricity(c));
for (const c of cases.epa_refrigerant) {
  const got = spaEpaRefrigerant(c);
  if (!got) results.push({ suite: "epa_refrigerant", id: c.id, emissions_kg: null, error: "null" });
  else add("epa_refrigerant", c.id, got.emissions_kg, { leakage_kg: got.leakage_kg });
}
for (const c of cases.freight) add("freight", c.id, spaFreight(c.distance, c.weight, c.co2_factor));
for (const c of cases.business_travel) add("business_travel", c.id, spaBusinessTravel(c.distance, c.co2_factor, c.unit));
for (const c of cases.employee_commuting) add("employee_commuting", c.id, spaEmployeeCommuting(c.employees, c.distance, c.co2_factor, c.unit));
for (const c of cases.spend_based) add("spend_based", c.id, spaSpendBased(c.amount, c.emission_factor));
for (const c of cases.sold_products_qty) add("sold_products_qty", c.id, spaQtyFactorRound6(c.quantity, c.factor));
for (const c of cases.ipcc_stationary) add("ipcc_stationary", c.id, spaIpccQtyFactor(c.quantity, c.factor));
for (const c of cases.ipcc_flaring) add("ipcc_flaring", c.id, spaIpccFlaring(c));
for (const c of cases.ipcc_venting) add("ipcc_venting", c.id, spaIpccVenting(c));
for (const c of cases.ipcc_vehicular) add("ipcc_vehicular", c.id, spaIpccVehicular(c));
for (const c of cases.ipcc_kitchen) add("ipcc_kitchen", c.id, spaIpccKitchen(c));
for (const c of cases.ipcc_power) add("ipcc_power", c.id, spaIpccPower(c));
for (const c of cases.ipcc_heating) add("ipcc_heating", c.id, spaIpccHeating(c));
for (const c of cases.ipcc_road) add("ipcc_road", c.id, spaIpccQtyFactor(c.quantity, c.factor));
for (const c of cases.ipcc_road_vehicle) add("ipcc_road_vehicle", c.id, spaIpccSelectedGas(c));
for (const c of cases.ipcc_usa_vehicles) add("ipcc_usa_vehicles", c.id, spaIpccQtyFactor(c.quantity, c.factor));
for (const c of cases.ipcc_alt_fuel) add("ipcc_alt_fuel", c.id, spaIpccSelectedGas(c));
for (const c of cases.ipcc_industry) add("ipcc_industry", c.id, spaIpccIndustry(c));

const out = {
  side: "frontend_spaMath",
  generated_at: new Date().toISOString(),
  case_count: results.length,
  results,
};
writeFileSync(join(__dirname, "frontend_results.json"), JSON.stringify(out, null, 2));
console.log(`Wrote ${results.length} frontend results`);
for (const r of results) {
  console.log(`${r.suite}\t${r.id}\t${r.emissions_kg}${r.extra ? " " + JSON.stringify(r.extra) : ""}`);
}

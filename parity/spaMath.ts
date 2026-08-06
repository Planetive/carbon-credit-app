/**
 * SPA-side formula mirrors for parity testing.
 * These match browser calculator math (FuelEmissions, MobileFuel, OnRoad, etc.).
 * Do not "improve" rounding or conversions — parity depends on byte-identical behavior.
 */

export function round6(n: number): number {
  return Number(n.toFixed(6));
}

/** UK fuel / passenger / delivery / refrigerant: qty × factor, round6 */
export function spaUkMultiply(quantity: number, factor: number): number {
  return round6(quantity * factor);
}

/**
 * EPA stationary fuel: qty × factor; if unit starts with CH4 or N2O → /1000; then round6.
 * Matches FuelEmissions.tsx EPA branch.
 */
export function spaEpaFuel(quantity: number, factor: number, unit: string): number {
  let raw = quantity * factor;
  const u = String(unit || "");
  if (u.startsWith("CH4") || u.startsWith("N2O")) {
    raw = raw / 1000;
  }
  return round6(raw);
}

/** Mobile fuel: liters → gallons / 3.78541 when input_unit is liter; then qty × factor round6 */
export function spaMobileFuel(
  quantity: number,
  factor: number,
  inputUnit: string = "gallon"
): number {
  const qty =
    String(inputUnit).toLowerCase().startsWith("liter") ||
    String(inputUnit).toLowerCase().startsWith("litre")
      ? quantity / 3.78541
      : quantity;
  return round6(qty * factor);
}

/** On-road: (g_per_mile × miles) / 1000; km → mi × 0.621371 */
export function spaOnRoad(
  distance: number,
  distanceUnit: string,
  gPerMile: number
): number {
  const miles =
    String(distanceUnit).toLowerCase().startsWith("km")
      ? distance * 0.621371
      : distance;
  return (gPerMile * miles) / 1000;
}

/** Non-road: liter → gallon; (g_per_gallon × gallons) / 1000 */
export function spaNonRoad(
  quantity: number,
  unit: string,
  gPerGallon: number
): number {
  const gallons =
    String(unit).toLowerCase().startsWith("liter") ||
    String(unit).toLowerCase().startsWith("litre")
      ? quantity / 3.78541
      : quantity;
  return (gPerGallon * gallons) / 1000;
}

/**
 * Heat/steam: CO2 = qty×factor; CH4/N2O = (qty×factor)/1000.
 * MMSCF quantity converts × 1037 to mmBtu base before multiply.
 */
export function spaHeatSteam(opts: {
  quantity: number;
  gas: string;
  quantity_unit?: string;
  co2_factor?: number;
  ch4_factor?: number;
  n2o_factor?: number;
}): number {
  let qty = opts.quantity;
  if (String(opts.quantity_unit || "").toLowerCase() === "mmscf") {
    qty = qty * 1037;
  }
  const gas = String(opts.gas || "co2").toLowerCase();
  if (gas === "ch4") {
    return (qty * (opts.ch4_factor ?? 0)) / 1000;
  }
  if (gas === "n2o") {
    return (qty * (opts.n2o_factor ?? 0)) / 1000;
  }
  return qty * (opts.co2_factor ?? 0);
}

/** Waste: volume × disposal_factor — no round6 in SPA */
export function spaWaste(volume: number, factor: number): number {
  return volume * factor;
}

/**
 * Scope 2 electricity (ElectricityEmissions.tsx):
 * grid = (gridPct/100)×totalKwh×gridFactor
 * other = (otherPct/100)×totalKwh×sumOtherRowEmissions
 * renewable = 0
 * total = round6(grid + other)
 */
export function spaElectricity(opts: {
  total_kwh: number;
  grid_pct?: number;
  grid_factor?: number;
  other_pct?: number;
  other_row_emissions_sum?: number;
}): number {
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
}

/**
 * EPA refrigerant (epaRefrigerantGwp.ts):
 * leakage = recorded OR charge×(rate/100)
 * emissionsKg = round6(leakage × gwp)
 */
export function spaEpaRefrigerant(opts: {
  method: "leakage_record" | "estimated_leakage";
  gwp: number;
  leakage_kg?: number;
  charge_kg?: number;
  leakage_rate_percent?: number;
}): { leakage_kg: number; emissions_kg: number } | null {
  if (!Number.isFinite(opts.gwp) || opts.gwp <= 0) return null;
  let leakageKg = 0;
  if (opts.method === "leakage_record") {
    if (typeof opts.leakage_kg !== "number" || opts.leakage_kg < 0) return null;
    leakageKg = opts.leakage_kg;
  } else {
    if (
      typeof opts.charge_kg !== "number" ||
      opts.charge_kg < 0 ||
      typeof opts.leakage_rate_percent !== "number" ||
      opts.leakage_rate_percent < 0
    ) {
      return null;
    }
    leakageKg = opts.charge_kg * (opts.leakage_rate_percent / 100);
  }
  return {
    leakage_kg: Number(leakageKg.toFixed(6)),
    emissions_kg: Number((leakageKg * opts.gwp).toFixed(6)),
  };
}

/** Freight: co2_factor × distance × weight */
export function spaFreight(
  distance: number,
  weight: number,
  co2Factor: number
): number {
  return co2Factor * distance * weight;
}

/** Business travel: distance × factor; mile units → factor / 1.60934 */
export function spaBusinessTravel(
  distance: number,
  co2Factor: number,
  unit?: string
): number {
  let factor = co2Factor;
  if (unit && String(unit).toLowerCase().includes("mile")) {
    factor = co2Factor / 1.60934;
  }
  return distance * factor;
}

/** Employee commuting: employees × distance × factor (mile → /1.60934) */
export function spaEmployeeCommuting(
  employees: number,
  distance: number,
  co2Factor: number,
  unit?: string
): number {
  let factor = co2Factor;
  if (unit && String(unit).toLowerCase().includes("mile")) {
    factor = co2Factor / 1.60934;
  }
  return employees * distance * factor;
}

/** Spend-based: amount × emission_factor */
export function spaSpendBased(amount: number, emissionFactor: number): number {
  return amount * emissionFactor;
}

/** Sold products / leased qty×factor with round6 */
export function spaQtyFactorRound6(quantity: number, factor: number): number {
  return round6(quantity * factor);
}

/** IPCC stationary / road / usa: quantity × factor (no round6) */
export function spaIpccQtyFactor(quantity: number, factor: number): number {
  return quantity * factor;
}

/** IPCC vehicular: diesel×df + petrol×pf (kg, not MeT) */
export function spaIpccVehicular(opts: {
  diesel_liters?: number;
  petrol_liters?: number;
  diesel_factor?: number;
  petrol_factor?: number;
}): number {
  return (
    (opts.diesel_liters ?? 0) * (opts.diesel_factor ?? 0) +
    (opts.petrol_liters ?? 0) * (opts.petrol_factor ?? 0)
  );
}

/** IPCC kitchen: lpg×lf + ng×ghv×ngf */
export function spaIpccKitchen(opts: {
  lpg_kg?: number;
  ng_mmscf?: number;
  ghv?: number;
  lpg_factor?: number;
  natural_gas_co2?: number;
}): number {
  return (
    (opts.lpg_kg ?? 0) * (opts.lpg_factor ?? 0) +
    (opts.ng_mmscf ?? 0) * (opts.ghv ?? 0) * (opts.natural_gas_co2 ?? 0)
  );
}

/** IPCC power: diesel×df + ng×ghv×ngf */
export function spaIpccPower(opts: {
  diesel_liters?: number;
  ng_mmscf?: number;
  ghv?: number;
  diesel_factor?: number;
  natural_gas_co2?: number;
}): number {
  return (
    (opts.diesel_liters ?? 0) * (opts.diesel_factor ?? 0) +
    (opts.ng_mmscf ?? 0) * (opts.ghv ?? 0) * (opts.natural_gas_co2 ?? 0)
  );
}

/** IPCC heating: ng×ghv×ngf */
export function spaIpccHeating(opts: {
  ng_mmscf?: number;
  ghv?: number;
  natural_gas_co2?: number;
}): number {
  return (
    (opts.ng_mmscf ?? 0) * (opts.ghv ?? 0) * (opts.natural_gas_co2 ?? 0)
  );
}

/** IPCC road-vehicle / alt-fuel: pick CH4 or N2O/NO2 factor × qty */
export function spaIpccSelectedGas(opts: {
  quantity: number;
  ch4_factor?: number;
  n2o_factor?: number;
  selected_factor?: string;
}): number {
  const sel = String(opts.selected_factor || "CH4").toUpperCase();
  const factor =
    sel === "N2O" || sel === "NO2" ? opts.n2o_factor ?? 0 : opts.ch4_factor ?? 0;
  return opts.quantity * factor;
}

/** IPCC industry: CO2/CH4/N2O selected × qty */
export function spaIpccIndustry(opts: {
  quantity: number;
  ef_co2?: number;
  ef_ch4?: number;
  ef_n2o?: number;
  selected_factor?: string;
}): number {
  const sel = String(opts.selected_factor || "CO2").toUpperCase();
  let factor = opts.ef_co2 ?? 0;
  if (sel === "CH4") factor = opts.ef_ch4 ?? 0;
  else if (sel === "N2O" || sel === "NO2") factor = opts.ef_n2o ?? 0;
  return opts.quantity * factor;
}

/** Constants mirrored from EmissionCalculatorIPCC.tsx */
const M3_PER_MMSCF = 28316.8466;
const IDEAL_GAS_VOLUME_DIVISOR = 22.414;
const FLARING_TEMPERATURE_CORRECTION = 273.15 / 288.71;
const VENTING_TEMPERATURE_CORRECTION = 273.15 / 288.71;

const FLARING_PRECISE_COMPONENT_FACTORS: Record<
  string,
  { molarMass: number; multiplier: number }
> = {
  CO2: { molarMass: 44.01, multiplier: 1 },
  CH4: { molarMass: 16.04, multiplier: 28 },
  C2H6: { molarMass: 30.07, multiplier: 5.5 },
  C3H8: { molarMass: 44.1, multiplier: 3 },
  C4H10: { molarMass: 58.12, multiplier: 4 },
  C5H12: { molarMass: 72.15, multiplier: 4 },
  C6H14: { molarMass: 86.18, multiplier: 4 },
};

const VENTING_GWP: Record<string, number> = {
  N2: 0,
  CO2: 1,
  CH4: 28,
  C2H6: 5.5,
  C3H8: 3,
  C4H10: 4,
  C5H12: 4,
  C6H14: 4,
};

const VENTING_MOLAR_MASS: Record<string, number> = {
  N2: 28.014,
  CO2: 44.01,
  CH4: 16.04,
  C2H6: 30.07,
  C3H8: 44.1,
  C4H10: 58.12,
  C5H12: 72.15,
  C6H14: 86.18,
};

/**
 * IPCC flaring → CO2_kg
 * volume_m3 = MMSCF ? volume * 28316.8466 : volume
 * total_moles = (volume_m3 / 22.414) * (273.15/288.71)
 * CO2_kg = total_moles * Σ(fraction * molarMass * multiplier)
 * Unknown formulas contribute 0 (molarMass/multiplier default 0).
 */
export function spaIpccFlaring(opts: {
  volume: number;
  unit?: string;
  composition: Array<{ formula: string; percentage: number }>;
}): number {
  const volume = opts.volume;
  if (!Number.isFinite(volume) || volume <= 0) {
    throw new Error("Flare gas volume must be greater than 0.");
  }
  const percentages = opts.composition.map((c) => c.percentage);
  if (percentages.some((p) => !Number.isFinite(p) || p < 0)) {
    throw new Error("All gas composition values must be valid numbers >= 0.");
  }
  const percentageTotal = percentages.reduce((s, v) => s + v, 0);
  if (Math.abs(percentageTotal - 100) > 0.001) {
    throw new Error(
      `Gas composition must sum to 100%. Current total: ${percentageTotal.toFixed(2)}%.`
    );
  }

  const unit = String(opts.unit || "m3");
  const volumeM3 =
    unit.toUpperCase() === "MMSCF" ? volume * M3_PER_MMSCF : volume;
  const totalMoles =
    (volumeM3 / IDEAL_GAS_VOLUME_DIVISOR) * FLARING_TEMPERATURE_CORRECTION;

  let weightedFactorTotal = 0;
  for (const item of opts.composition) {
    const formula = String(item.formula || "").trim().toUpperCase();
    if (!formula) throw new Error("Each gas row must include a chemical formula.");
    const fraction = item.percentage / 100;
    const factorDef = FLARING_PRECISE_COMPONENT_FACTORS[formula];
    const molarMass = factorDef?.molarMass ?? 0;
    const multiplier = factorDef?.multiplier ?? 0;
    weightedFactorTotal += fraction * molarMass * multiplier;
  }
  return totalMoles * weightedFactorTotal;
}

/**
 * IPCC venting → totalCO2e_kg
 * per gas: moles × molarMass × GWP; sum.
 */
export function spaIpccVenting(opts: {
  volume: number;
  unit?: string;
  composition: Array<{ gas: string; percentage: number }>;
}): number {
  const volume = opts.volume;
  if (!Number.isFinite(volume) || volume <= 0) {
    throw new Error("Vent gas volume must be greater than 0.");
  }
  if (!Array.isArray(opts.composition) || opts.composition.length === 0) {
    throw new Error("Please add at least one vent gas component.");
  }
  const percentages = opts.composition.map((c) => c.percentage);
  if (percentages.some((p) => !Number.isFinite(p) || p < 0)) {
    throw new Error("All vent gas composition values must be valid numbers >= 0.");
  }
  const percentageTotal = percentages.reduce((s, v) => s + v, 0);
  if (Math.abs(percentageTotal - 100) > 0.001) {
    throw new Error(
      `Gas composition must sum to 100%. Current total: ${percentageTotal.toFixed(2)}%.`
    );
  }

  const unit = String(opts.unit || "m3");
  const volumeM3 =
    unit.toUpperCase() === "MMSCF" ? volume * M3_PER_MMSCF : volume;
  const totalMoles =
    (volumeM3 / IDEAL_GAS_VOLUME_DIVISOR) * VENTING_TEMPERATURE_CORRECTION;

  const percentageByGas: Record<string, number> = {
    N2: 0,
    CO2: 0,
    CH4: 0,
    C2H6: 0,
    C3H8: 0,
    C4H10: 0,
    C5H12: 0,
    C6H14: 0,
  };
  for (const item of opts.composition) {
    const gas = String(item.gas || "").toUpperCase();
    if (!(gas in VENTING_GWP)) {
      throw new Error("Each vent gas row must include a valid gas.");
    }
    percentageByGas[gas] += item.percentage;
  }

  let totalCo2eKg = 0;
  for (const gas of Object.keys(percentageByGas)) {
    const pct = percentageByGas[gas];
    if (pct <= 0) continue;
    const gasMoles = totalMoles * (pct / 100);
    const gasMassKg = gasMoles * VENTING_MOLAR_MASS[gas];
    totalCo2eKg += gasMassKg * VENTING_GWP[gas];
  }
  return totalCo2eKg;
}

export function approxEqual(a: number, b: number, abs = 1e-9): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= abs || Math.abs(a - b) <= Math.abs(b) * 1e-9;
}

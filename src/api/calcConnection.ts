/**
 * Connection helpers: keep SPA local math for instant UI; when JWT auth is on,
 * confirm/replace with /api/v1/calc/* (fallback to local on any API error).
 * Optional persist writes emission_activities under a draft assessment_id.
 * Does not change formulas.
 */

import { USE_JWT_AUTH } from "./config";
import {
  calcBusinessTravel,
  calcElectricity,
  calcEpaFuel,
  calcEpaMobileFuel,
  calcEpaNonRoad,
  calcEpaOnRoadDiesel,
  calcEpaOnRoadGasoline,
  calcEpaRefrigerant,
  calcFreight,
  calcHeatSteam,
  calcEmployeeCommuting,
  calcIpccAltFuel,
  calcIpccFlaring,
  calcIpccHeating,
  calcIpccIndustry,
  calcIpccKitchen,
  calcIpccPower,
  calcIpccRoad,
  calcIpccRoadVehicle,
  calcIpccStationary,
  calcIpccUsaVehicles,
  calcIpccVehicular,
  calcIpccVenting,
  calcLeasedElectricity,
  calcLeasedRefrigerant,
  calcLeasedTotal,
  calcLeasedTransport,
  calcSoldProductsElectricity,
  calcSoldProductsQtyFactor,
  calcSpendBased,
  calcUkDelivery,
  calcUkFuel,
  calcUkPassenger,
  calcUkRefrigerant,
  calcWaste,
  type CalcResult,
} from "./calc";
import { getOrCreateDraftAssessment } from "./ghg";

export type CalcFramework = "uk" | "epa" | "ipcc" | "mixed";

/** Opt-in persist into app.emission_activities (JWT / backend only). */
export type CalcPersistOpts = {
  persist?: boolean;
  assessment_id?: string;
  framework?: CalcFramework;
};

const assessmentIdCache = new Map<CalcFramework, Promise<string>>();

async function draftAssessmentId(
  framework: CalcFramework = "mixed",
  explicit?: string
): Promise<string | undefined> {
  if (explicit) return explicit;
  if (!assessmentIdCache.has(framework)) {
    assessmentIdCache.set(
      framework,
      getOrCreateDraftAssessment(framework).then((a) => a.id)
    );
  }
  return assessmentIdCache.get(framework);
}

function kgFrom(res: CalcResult, fallback: number): number {
  const kg = res.emissions_kg ?? res.emissions;
  return typeof kg === "number" && Number.isFinite(kg) ? kg : fallback;
}

/**
 * @param call receives persist flags to merge into the calc POST body.
 * Pass `persist: true` (and optional assessment_id / framework) via meta to
 * create an emission_activity on the backend.
 */
async function withApi(
  label: string,
  local: number,
  call: (persistBody: {
    persist: boolean;
    assessment_id?: string;
  }) => Promise<CalcResult>,
  meta: CalcPersistOpts = {}
): Promise<number> {
  if (!USE_JWT_AUTH) return local;
  try {
    const persist = Boolean(meta.persist);
    let assessment_id = meta.assessment_id;
    if (persist) {
      assessment_id = await draftAssessmentId(
        meta.framework ?? "mixed",
        assessment_id
      );
    }
    return kgFrom(
      await call({
        persist,
        assessment_id: persist ? assessment_id : undefined,
      }),
      local
    );
  } catch (err) {
    console.warn(`[calcConnection] ${label} API failed; using local math`, err);
    return local;
  }
}

/** Clear cached draft assessment ids (e.g. after org switch). */
export function clearCalcAssessmentCache() {
  assessmentIdCache.clear();
}

function persistMeta(
  opts: CalcPersistOpts,
  defaultFramework: CalcFramework = "mixed"
): CalcPersistOpts {
  return {
    persist: opts.persist,
    assessment_id: opts.assessment_id,
    framework: opts.framework ?? defaultFramework,
  };
}

export function localRound6Multiply(a: number, b: number): number {
  return Number((a * b).toFixed(6));
}

export function localUkFuelEmissionsKg(quantity: number, factor: number): number {
  return localRound6Multiply(quantity, factor);
}

export function localEpaFuelEmissionsKg(
  quantity: number,
  factor: number,
  unit: string
): number {
  const raw = quantity * factor;
  const isGPerUnit =
    typeof unit === "string" &&
    (unit.startsWith("CH4") || unit.startsWith("N2O"));
  return Number((isGPerUnit ? raw / 1000 : raw).toFixed(6));
}

export function localMobileFuelEmissionsKg(
  quantity: number,
  factor: number,
  inputUnit: string = "gallon"
): number {
  const qty =
    String(inputUnit).toLowerCase().startsWith("liter") ||
    String(inputUnit).toLowerCase().startsWith("litre")
      ? quantity / 3.78541
      : quantity;
  return localRound6Multiply(qty, factor);
}

export function localOnRoadEmissionsKg(
  distance: number,
  distanceUnit: string,
  gPerMile: number
): number {
  const miles = String(distanceUnit).toLowerCase().startsWith("km")
    ? distance * 0.621371
    : distance;
  return (gPerMile * miles) / 1000;
}

export function localElectricityEmissionsKg(opts: {
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
  return Number((gridPart + otherPart).toFixed(6));
}

export async function resolveUkFuelEmissionsKg(opts: {
  quantity: number;
  factor: number;
  activity?: string;
  fuel?: string;
  unit?: string;
  uk_factor_basis?: "total" | "co2" | "ch4" | "n2o";
} & CalcPersistOpts): Promise<number> {
  const local = localUkFuelEmissionsKg(opts.quantity, opts.factor);
  return withApi("UK fuel", local, (p) => calcUkFuel({
      quantity: opts.quantity,
      factor: opts.factor,
      activity: opts.activity,
      fuel: opts.fuel,
      unit: opts.unit,
      uk_factor_basis: opts.uk_factor_basis ?? "total", ...p}), persistMeta(opts, "uk"));
}

export async function resolveEpaFuelEmissionsKg(opts: {
  quantity: number;
  factor: number;
  unit: string;
  category?: string;
  fuel?: string;
} & CalcPersistOpts): Promise<number> {
  const local = localEpaFuelEmissionsKg(opts.quantity, opts.factor, opts.unit);
  return withApi("EPA fuel", local, (p) => calcEpaFuel({
      quantity: opts.quantity,
      factor: opts.factor,
      unit: opts.unit,
      category: opts.category,
      fuel: opts.fuel, ...p}), persistMeta(opts, "epa"));
}

export async function resolveUkPassengerEmissionsKg(opts: {
  distance: number;
  factor: number;
  activity?: string;
  vehicle_type?: string;
  unit?: string;
  fuel_type?: string;
  uk_factor_basis?: string;
} & CalcPersistOpts): Promise<number> {
  const local = localRound6Multiply(opts.distance, opts.factor);
  return withApi("UK passenger", local, (p) => calcUkPassenger({
      distance: opts.distance,
      factor: opts.factor,
      activity: opts.activity,
      vehicle_type: opts.vehicle_type,
      unit: opts.unit,
      fuel_type: opts.fuel_type,
      uk_factor_basis: opts.uk_factor_basis, ...p}), persistMeta(opts, "uk"));
}

export async function resolveUkDeliveryEmissionsKg(opts: {
  distance: number;
  factor: number;
  activity?: string;
  vehicle_type?: string;
  unit?: string;
  fuel_type?: string;
  laden_level?: string;
  uk_factor_basis?: string;
} & CalcPersistOpts): Promise<number> {
  const local = localRound6Multiply(opts.distance, opts.factor);
  return withApi("UK delivery", local, (p) => calcUkDelivery({
      distance: opts.distance,
      factor: opts.factor,
      activity: opts.activity,
      vehicle_type: opts.vehicle_type,
      unit: opts.unit,
      fuel_type: opts.fuel_type,
      laden_level: opts.laden_level,
      uk_factor_basis: opts.uk_factor_basis, ...p}), persistMeta(opts, "uk"));
}

export async function resolveUkRefrigerantEmissionsKg(opts: {
  quantity: number;
  factor: number;
} & CalcPersistOpts): Promise<number> {
  const local = localRound6Multiply(opts.quantity, opts.factor);
  return withApi("UK refrigerant", local, (p) => calcUkRefrigerant({ quantity: opts.quantity, factor: opts.factor , ...p}), persistMeta(opts, "uk"));
}

export async function resolveEpaMobileFuelEmissionsKg(opts: {
  quantity: number;
  factor: number;
  input_unit?: string;
  fuel_type?: string;
  unit?: string;
} & CalcPersistOpts): Promise<number> {
  const local = localMobileFuelEmissionsKg(
    opts.quantity,
    opts.factor,
    opts.input_unit ?? "gallon"
  );
  return withApi("EPA mobile fuel", local, (p) => calcEpaMobileFuel({
      quantity: opts.quantity,
      factor: opts.factor,
      input_unit: opts.input_unit,
      fuel_type: opts.fuel_type,
      unit: opts.unit, ...p}), persistMeta(opts, "epa"));
}

export async function resolveEpaOnRoadGasolineEmissionsKg(opts: {
  distance: number;
  distance_unit?: string;
  ch4_g_per_mile?: number;
  n2o_g_per_mile?: number;
  emission_selection?: string;
  vehicle_type?: string;
  model_year?: string;
} & CalcPersistOpts): Promise<number> {
  const gPerMile =
    String(opts.emission_selection || "").includes("n2o")
      ? opts.n2o_g_per_mile ?? 0
      : opts.ch4_g_per_mile ?? 0;
  const local = localOnRoadEmissionsKg(
    opts.distance,
    opts.distance_unit || "mile",
    gPerMile
  );
  return withApi("EPA on-road gasoline", local, (p) => calcEpaOnRoadGasoline({
      distance: opts.distance,
      distance_unit: opts.distance_unit,
      ch4_g_per_mile: opts.ch4_g_per_mile,
      n2o_g_per_mile: opts.n2o_g_per_mile,
      emission_selection: opts.emission_selection,
      vehicle_type: opts.vehicle_type,
      model_year: opts.model_year, ...p}), persistMeta(opts, "epa"));
}

export async function resolveEpaOnRoadDieselEmissionsKg(opts: {
  distance: number;
  distance_unit?: string;
  ch4_g_per_mile?: number;
  n2o_g_per_mile?: number;
  emission_selection?: string;
  vehicle_type?: string;
  fuel_type?: string;
  model_year?: string;
} & CalcPersistOpts): Promise<number> {
  const sel = String(opts.emission_selection || "ch4");
  const gPerMile = sel.includes("n2o")
    ? opts.n2o_g_per_mile ?? 0
    : opts.ch4_g_per_mile ?? 0;
  const local = localOnRoadEmissionsKg(
    opts.distance,
    opts.distance_unit || "mile",
    gPerMile
  );
  return withApi("EPA on-road diesel", local, (p) => calcEpaOnRoadDiesel({
      distance: opts.distance,
      distance_unit: opts.distance_unit,
      ch4_g_per_mile: opts.ch4_g_per_mile,
      n2o_g_per_mile: opts.n2o_g_per_mile,
      emission_selection: opts.emission_selection,
      vehicle_type: opts.vehicle_type,
      fuel_type: opts.fuel_type,
      model_year: opts.model_year, ...p}), persistMeta(opts, "epa"));
}

export async function resolveElectricityEmissionsKg(opts: {
  total_kwh: number;
  grid_pct?: number;
  grid_factor?: number;
  other_pct?: number;
  other_row_emissions_sum?: number;
  renewable_pct?: number;
} & CalcPersistOpts): Promise<number> {
  const local = localElectricityEmissionsKg(opts);
  return withApi("electricity", local, (p) => calcElectricity({ ...opts, ...p }), persistMeta(opts, "uk"));
}

export async function resolveEpaRefrigerantEmissionsKg(opts: {
  method: string;
  gwp: number;
  leakage_kg?: number;
  charge_kg?: number;
  leakage_rate_percent?: number;
} & CalcPersistOpts): Promise<number> {
  let leakage = 0;
  if (opts.method === "leakage_record") {
    leakage = opts.leakage_kg ?? 0;
  } else {
    leakage =
      (opts.charge_kg ?? 0) * ((opts.leakage_rate_percent ?? 0) / 100);
  }
  const local = Number((leakage * opts.gwp).toFixed(6));
  return withApi("EPA refrigerant", local, (p) => calcEpaRefrigerant({ ...opts, ...p }), persistMeta(opts, "epa"));
}

export async function resolveWasteEmissionsKg(opts: {
  volume: number;
  disposal_method: string;
  factor: number;
  material?: string;
} & CalcPersistOpts): Promise<number> {
  const local = opts.volume * opts.factor;
  return withApi("waste", local, (p) => calcWaste({ ...opts, ...p }), persistMeta(opts, "uk"));
}

export async function resolveFreightEmissionsKg(opts: {
  distance: number;
  weight: number;
  co2_factor: number;
} & CalcPersistOpts): Promise<number> {
  const local = opts.distance * opts.weight * opts.co2_factor;
  return withApi("freight", local, (p) => calcFreight({ ...opts, ...p }), persistMeta(opts, "uk"));
}

export async function resolveEpaNonRoadEmissionsKg(opts: {
  quantity: number;
  unit?: string;
  ch4_g_per_gallon?: number;
  n2o_g_per_gallon?: number;
  emission_selection?: string;
  vehicle_type?: string;
  fuel_type?: string;
} & CalcPersistOpts): Promise<number> {
  const unit = opts.unit || "gallon";
  const gallons =
    String(unit).toLowerCase().startsWith("liter") ||
    String(unit).toLowerCase().startsWith("litre")
      ? opts.quantity / 3.78541
      : opts.quantity;
  const sel = String(opts.emission_selection || "ch4");
  const gPerGal = sel.includes("n2o")
    ? opts.n2o_g_per_gallon ?? 0
    : opts.ch4_g_per_gallon ?? 0;
  const local = (gPerGal * gallons) / 1000;
  return withApi("EPA non-road", local, (p) => calcEpaNonRoad({ ...opts, ...p }), persistMeta(opts, "epa"));
}

export async function resolveHeatSteamEmissionsKg(opts: {
  quantity: number;
  gas?: string;
  quantity_unit?: string;
  entry_type?: string;
  unit?: string;
  co2_factor?: number;
  ch4_factor?: number;
  n2o_factor?: number;
  standard?: "uk" | "ebt";
} & CalcPersistOpts): Promise<number> {
  let qty = opts.quantity;
  if (String(opts.quantity_unit || "").toLowerCase() === "mmscf") {
    qty = qty * 1037;
  }
  const gas = String(opts.gas || "co2").toLowerCase();
  let local: number;
  if (gas === "ch4") {
    local = Number(((qty * (opts.ch4_factor ?? 0)) / 1000).toFixed(6));
  } else if (gas === "n2o") {
    local = Number(((qty * (opts.n2o_factor ?? 0)) / 1000).toFixed(6));
  } else {
    local = Number((qty * (opts.co2_factor ?? 0)).toFixed(6));
  }
  return withApi("heat-steam", local, (p) => calcHeatSteam({ ...opts, ...p }), persistMeta(opts, "uk"));
}

export async function resolveEmployeeCommutingEmissionsKg(opts: {
  employees: number;
  distance: number;
  co2_factor: number;
  unit?: string;
} & CalcPersistOpts): Promise<number> {
  let factor = opts.co2_factor;
  if (opts.unit && String(opts.unit).toLowerCase().includes("mile")) {
    factor = opts.co2_factor / 1.60934;
  }
  const local = opts.employees * opts.distance * factor;
  return withApi("employee commuting", local, (p) => calcEmployeeCommuting({ ...opts, ...p }), persistMeta(opts, "uk"));
}

export async function resolveBusinessTravelEmissionsKg(opts: {
  distance: number;
  co2_factor: number;
  unit?: string;
} & CalcPersistOpts): Promise<number> {
  let factor = opts.co2_factor;
  if (opts.unit && String(opts.unit).toLowerCase().includes("mile")) {
    factor = opts.co2_factor / 1.60934;
  }
  const local = opts.distance * factor;
  return withApi("business travel", local, (p) => calcBusinessTravel({ ...opts, ...p }), persistMeta(opts, "uk"));
}

export async function resolveSpendBasedEmissionsKg(opts: {
  amount: number;
  emission_factor: number;
  category?: string;
} & CalcPersistOpts): Promise<number> {
  const local = opts.amount * opts.emission_factor;
  return withApi("spend-based", local, (p) => calcSpendBased({ ...opts, ...p }), persistMeta(opts, "uk"));
}

export async function resolveSoldProductsQtyFactorKg(opts: {
  quantity: number;
  factor: number;
} & CalcPersistOpts): Promise<number> {
  const local = Number((opts.quantity * opts.factor).toFixed(6));
  return withApi("sold-products qty-factor", local, (p) => calcSoldProductsQtyFactor({ ...opts, ...p }), persistMeta(opts, "uk"));
}

export async function resolveSoldProductsElectricityKg(opts: {
  total_kwh: number;
  grid_pct?: number;
  grid_factor?: number;
  other_pct?: number;
  other_row_emissions_sum?: number;
} & CalcPersistOpts): Promise<number> {
  const grid =
    ((opts.grid_pct ?? 0) / 100) *
    opts.total_kwh *
    (opts.grid_factor ?? 0);
  const other =
    ((opts.other_pct ?? 0) / 100) *
    opts.total_kwh *
    (opts.other_row_emissions_sum ?? 0);
  const local = Number((grid + other).toFixed(6));
  return withApi("sold-products electricity", local, (p) => calcSoldProductsElectricity({ ...opts, ...p }), persistMeta(opts, "uk"));
}

export async function resolveLeasedElectricityKg(opts: {
  total_kwh: number;
  grid_pct?: number;
  grid_factor?: number;
  other_pct?: number;
  other_row_emissions_sum?: number;
  renewable_pct?: number;
} & CalcPersistOpts): Promise<number> {
  return withApi("leased electricity", localElectricityEmissionsKg(opts), (p) => calcLeasedElectricity({ ...opts, ...p }), persistMeta(opts, "uk"));
}

export async function resolveLeasedTransportKg(opts: {
  quantity: number;
  factor: number;
} & CalcPersistOpts): Promise<number> {
  const local = Number((opts.quantity * opts.factor).toFixed(6));
  return withApi("leased transport", local, (p) => calcLeasedTransport({ ...opts, ...p }), persistMeta(opts, "uk"));
}

export async function resolveLeasedRefrigerantKg(opts: {
  quantity: number;
  factor: number;
} & CalcPersistOpts): Promise<number> {
  const local = Number((opts.quantity * opts.factor).toFixed(6));
  return withApi("leased refrigerant", local, (p) => calcLeasedRefrigerant({ ...opts, ...p }), persistMeta(opts, "uk"));
}

export async function resolveLeasedTotalKg(opts: {
  category: string;
  electricity_kg?: number;
  transport_rows_kg?: number[];
  refrigerant_kg?: number;
} & CalcPersistOpts): Promise<number> {
  const elec = opts.electricity_kg ?? 0;
  const transport = (opts.transport_rows_kg ?? []).reduce((s, x) => s + x, 0);
  const refrig = opts.refrigerant_kg ?? 0;
  const cat = String(opts.category || "").toLowerCase();
  let total = elec + transport + refrig;
  if (cat === "buildings" || cat === "building") total = elec;
  else if (cat === "transport") total = transport;
  else if (cat === "equipment") total = elec + transport;
  else if (cat === "infrastructure") total = elec + refrig;
  const local =
    cat === "transport" ? total : Number(total.toFixed(6));
  return withApi("leased total", local, (p) => calcLeasedTotal({ ...opts, ...p }), persistMeta(opts, "uk"));
}

export async function resolveIpccStationaryKg(opts: {
  quantity: number;
  factor: number;
} & CalcPersistOpts): Promise<number> {
  const local = opts.quantity * opts.factor;
  return withApi("IPCC stationary", local, (p) => calcIpccStationary({ ...opts, ...p }), persistMeta(opts, "ipcc"));
}

export async function resolveIpccFlaringKg(
  opts: {
    volume: number;
    unit?: string;
    composition: Record<string, unknown>[];
  } & CalcPersistOpts,
  localKg: number
): Promise<number> {
  return withApi(
    "IPCC flaring",
    localKg,
    (p) => calcIpccFlaring({ ...opts, ...p }),
    persistMeta(opts, "ipcc")
  );
}

export async function resolveIpccVentingKg(
  opts: {
    volume: number;
    unit?: string;
    composition: Record<string, unknown>[];
  } & CalcPersistOpts,
  localKg: number
): Promise<number> {
  return withApi(
    "IPCC venting",
    localKg,
    (p) => calcIpccVenting({ ...opts, ...p }),
    persistMeta(opts, "ipcc")
  );
}

/** Returns emissions_kg (not MeT). */
export async function resolveIpccVehicularKg(opts: {
  diesel_liters?: number;
  petrol_liters?: number;
  diesel_factor?: number;
  petrol_factor?: number;
} & CalcPersistOpts): Promise<number> {
  const local =
    (opts.diesel_liters ?? 0) * (opts.diesel_factor ?? 0) +
    (opts.petrol_liters ?? 0) * (opts.petrol_factor ?? 0);
  return withApi("IPCC vehicular", local, (p) => calcIpccVehicular({ ...opts, ...p }), persistMeta(opts, "ipcc"));
}

export async function resolveIpccKitchenKg(opts: {
  lpg_kg?: number;
  ng_mmscf?: number;
  ghv?: number;
  lpg_factor?: number;
  natural_gas_co2?: number;
} & CalcPersistOpts): Promise<number> {
  const local =
    (opts.lpg_kg ?? 0) * (opts.lpg_factor ?? 0) +
    (opts.ng_mmscf ?? 0) * (opts.ghv ?? 0) * (opts.natural_gas_co2 ?? 0);
  return withApi("IPCC kitchen", local, (p) => calcIpccKitchen({ ...opts, ...p }), persistMeta(opts, "ipcc"));
}

export async function resolveIpccPowerKg(opts: {
  diesel_liters?: number;
  ng_mmscf?: number;
  ghv?: number;
  diesel_factor?: number;
  natural_gas_co2?: number;
} & CalcPersistOpts): Promise<number> {
  const local =
    (opts.diesel_liters ?? 0) * (opts.diesel_factor ?? 0) +
    (opts.ng_mmscf ?? 0) * (opts.ghv ?? 0) * (opts.natural_gas_co2 ?? 0);
  return withApi("IPCC power", local, (p) => calcIpccPower({ ...opts, ...p }), persistMeta(opts, "ipcc"));
}

export async function resolveIpccHeatingKg(opts: {
  ng_mmscf?: number;
  ghv?: number;
  natural_gas_co2?: number;
} & CalcPersistOpts): Promise<number> {
  const local =
    (opts.ng_mmscf ?? 0) * (opts.ghv ?? 0) * (opts.natural_gas_co2 ?? 0);
  return withApi("IPCC heating", local, (p) => calcIpccHeating({ ...opts, ...p }), persistMeta(opts, "ipcc"));
}

export async function resolveIpccRoadKg(opts: {
  quantity: number;
  factor: number;
} & CalcPersistOpts): Promise<number> {
  const local = opts.quantity * opts.factor;
  return withApi("IPCC road", local, (p) => calcIpccRoad({ ...opts, ...p }), persistMeta(opts, "ipcc"));
}

export async function resolveIpccRoadVehicleKg(opts: {
  quantity: number;
  ch4_factor?: number;
  n2o_factor?: number;
  selected_factor?: string;
} & CalcPersistOpts): Promise<number> {
  const sel = String(opts.selected_factor || "CH4").toUpperCase();
  const factor =
    sel === "N2O" || sel === "NO2" ? opts.n2o_factor ?? 0 : opts.ch4_factor ?? 0;
  const local = opts.quantity * factor;
  return withApi("IPCC road-vehicle", local, (p) => calcIpccRoadVehicle({ ...opts, ...p }), persistMeta(opts, "ipcc"));
}

export async function resolveIpccUsaVehiclesKg(opts: {
  quantity: number;
  factor: number;
} & CalcPersistOpts): Promise<number> {
  const local = opts.quantity * opts.factor;
  return withApi("IPCC usa-vehicles", local, (p) => calcIpccUsaVehicles({ ...opts, ...p }), persistMeta(opts, "ipcc"));
}

export async function resolveIpccAltFuelKg(opts: {
  quantity: number;
  ch4_factor?: number;
  n2o_factor?: number;
  selected_factor?: string;
} & CalcPersistOpts): Promise<number> {
  const sel = String(opts.selected_factor || "CH4").toUpperCase();
  const factor =
    sel === "N2O" || sel === "NO2" ? opts.n2o_factor ?? 0 : opts.ch4_factor ?? 0;
  const local = opts.quantity * factor;
  return withApi("IPCC alt-fuel", local, (p) => calcIpccAltFuel({ ...opts, ...p }), persistMeta(opts, "ipcc"));
}

export async function resolveIpccIndustryKg(opts: {
  quantity: number;
  ef_co2?: number;
  ef_ch4?: number;
  ef_n2o?: number;
  selected_factor?: string;
} & CalcPersistOpts): Promise<number> {
  const sel = String(opts.selected_factor || "CO2").toUpperCase();
  let factor = opts.ef_co2 ?? 0;
  if (sel === "CH4") factor = opts.ef_ch4 ?? 0;
  else if (sel === "N2O" || sel === "NO2") factor = opts.ef_n2o ?? 0;
  const local = opts.quantity * factor;
  return withApi("IPCC industry", local, (p) => calcIpccIndustry({ ...opts, ...p }), persistMeta(opts, "ipcc"));
}

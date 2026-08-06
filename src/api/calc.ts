import { apiFetch } from "./client";

export type CalcResult = {
  success: boolean;
  emissions?: number;
  emissions_kg?: number;
  emissions_tco2e?: number;
  factor?: number;
  quantity?: number;
  activity_id?: string;
  error?: string;
  [key: string]: unknown;
};

type PersistOpts = {
  assessment_id?: string;
  persist?: boolean;
};

export function calcUkFuel(
  body: {
    quantity: number;
    activity?: string;
    fuel?: string;
    unit?: string;
    uk_factor_basis?: "total" | "co2" | "ch4" | "n2o";
    factor?: number;
    factor_row_id?: string;
    category?: string;
  } & PersistOpts
) {
  return apiFetch<CalcResult>("/api/v1/calc/uk/fuel", { method: "POST", body });
}

export function calcEpaFuel(
  body: {
    quantity: number;
    unit: string;
    category?: string;
    fuel?: string;
    factor?: number;
    factor_row_id?: string;
  } & PersistOpts
) {
  return apiFetch<CalcResult>("/api/v1/calc/epa/fuel", { method: "POST", body });
}

export function calcUkPassenger(
  body: {
    distance: number;
    activity?: string;
    vehicle_type?: string;
    unit?: string;
    fuel_type?: string;
    uk_factor_basis?: string;
    factor?: number;
    category?: string;
  } & PersistOpts
) {
  return apiFetch<CalcResult>("/api/v1/calc/uk/passenger", {
    method: "POST",
    body,
  });
}

export function calcUkDelivery(
  body: {
    distance: number;
    activity?: string;
    vehicle_type?: string;
    unit?: string;
    fuel_type?: string;
    laden_level?: string;
    uk_factor_basis?: string;
    factor?: number;
    category?: string;
  } & PersistOpts
) {
  return apiFetch<CalcResult>("/api/v1/calc/uk/delivery", {
    method: "POST",
    body,
  });
}

export function calcUkRefrigerant(
  body: {
    quantity: number;
    factor: number;
    category?: string;
    meta?: Record<string, unknown>;
  } & PersistOpts
) {
  return apiFetch<CalcResult>("/api/v1/calc/uk/refrigerant", {
    method: "POST",
    body,
  });
}

export function calcEpaMobileFuel(
  body: {
    quantity: number;
    fuel_type?: string;
    unit?: string;
    input_unit?: string;
    factor?: number;
  } & PersistOpts
) {
  return apiFetch<CalcResult>("/api/v1/calc/epa/mobile-fuel", {
    method: "POST",
    body,
  });
}

export function calcEpaOnRoadGasoline(
  body: {
    distance: number;
    distance_unit?: string;
    vehicle_type?: string;
    model_year?: string;
    emission_selection?: string;
    ch4_g_per_mile?: number;
    n2o_g_per_mile?: number;
  } & PersistOpts
) {
  return apiFetch<CalcResult>("/api/v1/calc/epa/on-road-gasoline", {
    method: "POST",
    body,
  });
}

export function calcEpaOnRoadDiesel(
  body: {
    distance: number;
    distance_unit?: string;
    vehicle_type?: string;
    fuel_type?: string;
    model_year?: string;
    emission_selection?: string;
    ch4_g_per_mile?: number;
    n2o_g_per_mile?: number;
  } & PersistOpts
) {
  return apiFetch<CalcResult>("/api/v1/calc/epa/on-road-diesel", {
    method: "POST",
    body,
  });
}

export function calcEpaNonRoad(
  body: {
    quantity: number;
    unit?: string;
    vehicle_type?: string;
    fuel_type?: string;
    emission_selection?: string;
    ch4_g_per_gallon?: number;
    n2o_g_per_gallon?: number;
  } & PersistOpts
) {
  return apiFetch<CalcResult>("/api/v1/calc/epa/non-road", {
    method: "POST",
    body,
  });
}

export function calcHeatSteam(
  body: {
    quantity: number;
    gas?: string;
    quantity_unit?: string;
    entry_type?: string;
    unit?: string;
    co2_factor?: number;
    ch4_factor?: number;
    n2o_factor?: number;
    standard?: "uk" | "ebt";
  } & PersistOpts
) {
  return apiFetch<CalcResult>("/api/v1/calc/heat-steam", {
    method: "POST",
    body,
  });
}

export function calcWaste(
  body: {
    volume: number;
    disposal_method: string;
    material?: string;
    factor?: number;
  } & PersistOpts
) {
  return apiFetch<CalcResult>("/api/v1/calc/waste", { method: "POST", body });
}

/* ---- Batch 1–3 extended routes (UI not wired yet) ---- */

export function calcElectricity(
  body: {
    total_kwh: number;
    grid_pct?: number;
    grid_factor?: number;
    other_pct?: number;
    other_row_emissions_sum?: number;
    renewable_pct?: number;
  } & PersistOpts
) {
  return apiFetch<CalcResult>("/api/v1/calc/electricity", { method: "POST", body });
}

export function calcEpaRefrigerant(
  body: {
    method: "leakage_record" | "estimated_leakage" | string;
    gwp: number;
    leakage_kg?: number;
    charge_kg?: number;
    leakage_rate_percent?: number;
  } & PersistOpts
) {
  return apiFetch<CalcResult>("/api/v1/calc/epa/refrigerant", {
    method: "POST",
    body,
  });
}

export function calcFreight(
  body: { distance: number; weight: number; co2_factor: number } & PersistOpts
) {
  return apiFetch<CalcResult>("/api/v1/calc/freight", { method: "POST", body });
}

export function calcBusinessTravel(
  body: { distance: number; co2_factor: number; unit?: string } & PersistOpts
) {
  return apiFetch<CalcResult>("/api/v1/calc/business-travel", {
    method: "POST",
    body,
  });
}

export function calcEmployeeCommuting(
  body: {
    employees: number;
    distance: number;
    co2_factor: number;
    unit?: string;
  } & PersistOpts
) {
  return apiFetch<CalcResult>("/api/v1/calc/employee-commuting", {
    method: "POST",
    body,
  });
}

export function calcSpendBased(
  body: {
    amount: number;
    emission_factor: number;
    category?: string;
  } & PersistOpts
) {
  return apiFetch<CalcResult>("/api/v1/calc/spend-based", {
    method: "POST",
    body,
  });
}

export function calcSoldProductsQtyFactor(
  body: { quantity: number; factor: number } & PersistOpts
) {
  return apiFetch<CalcResult>("/api/v1/calc/sold-products/qty-factor", {
    method: "POST",
    body,
  });
}

export function calcSoldProductsElectricity(
  body: {
    total_kwh: number;
    grid_pct?: number;
    grid_factor?: number;
    other_pct?: number;
    other_row_emissions_sum?: number;
  } & PersistOpts
) {
  return apiFetch<CalcResult>("/api/v1/calc/sold-products/electricity", {
    method: "POST",
    body,
  });
}

export function calcLeasedElectricity(
  body: {
    total_kwh: number;
    grid_pct?: number;
    grid_factor?: number;
    other_pct?: number;
    other_row_emissions_sum?: number;
    renewable_pct?: number;
  } & PersistOpts
) {
  return apiFetch<CalcResult>("/api/v1/calc/leased/electricity", {
    method: "POST",
    body,
  });
}

export function calcLeasedTransport(
  body: {
    /** Backend QtyFactorRequest: quantity = distance */
    quantity: number;
    factor: number;
  } & PersistOpts
) {
  return apiFetch<CalcResult>("/api/v1/calc/leased/transport", {
    method: "POST",
    body,
  });
}

export function calcLeasedRefrigerant(
  body: { quantity: number; factor: number } & PersistOpts
) {
  return apiFetch<CalcResult>("/api/v1/calc/leased/refrigerant", {
    method: "POST",
    body,
  });
}

export function calcLeasedTotal(
  body: {
    category: string;
    electricity_kg?: number;
    transport_rows_kg?: number[];
    refrigerant_kg?: number;
  } & PersistOpts
) {
  return apiFetch<CalcResult>("/api/v1/calc/leased/total", {
    method: "POST",
    body,
  });
}

export function calcIpccStationary(
  body: { quantity: number; factor: number } & PersistOpts
) {
  return apiFetch<CalcResult>("/api/v1/calc/ipcc/stationary", {
    method: "POST",
    body,
  });
}

export function calcIpccFlaring(
  body: {
    volume: number;
    unit?: string;
    composition: Record<string, unknown>[];
  } & PersistOpts
) {
  return apiFetch<CalcResult>("/api/v1/calc/ipcc/flaring", {
    method: "POST",
    body,
  });
}

export function calcIpccVenting(
  body: {
    volume: number;
    unit?: string;
    composition: Record<string, unknown>[];
  } & PersistOpts
) {
  return apiFetch<CalcResult>("/api/v1/calc/ipcc/venting", {
    method: "POST",
    body,
  });
}

export function calcIpccVehicular(
  body: {
    diesel_liters?: number;
    petrol_liters?: number;
    diesel_factor?: number;
    petrol_factor?: number;
  } & PersistOpts
) {
  return apiFetch<CalcResult>("/api/v1/calc/ipcc/vehicular", {
    method: "POST",
    body,
  });
}

export function calcIpccKitchen(
  body: {
    lpg_kg?: number;
    ng_mmscf?: number;
    ghv?: number;
    lpg_factor?: number;
    natural_gas_co2?: number;
  } & PersistOpts
) {
  return apiFetch<CalcResult>("/api/v1/calc/ipcc/kitchen", {
    method: "POST",
    body,
  });
}

export function calcIpccPower(
  body: {
    diesel_liters?: number;
    ng_mmscf?: number;
    ghv?: number;
    diesel_factor?: number;
    natural_gas_co2?: number;
  } & PersistOpts
) {
  return apiFetch<CalcResult>("/api/v1/calc/ipcc/power", {
    method: "POST",
    body,
  });
}

export function calcIpccHeating(
  body: {
    ng_mmscf?: number;
    ghv?: number;
    natural_gas_co2?: number;
  } & PersistOpts
) {
  return apiFetch<CalcResult>("/api/v1/calc/ipcc/heating", {
    method: "POST",
    body,
  });
}

export function calcIpccRoad(
  body: { quantity: number; factor: number } & PersistOpts
) {
  return apiFetch<CalcResult>("/api/v1/calc/ipcc/road", {
    method: "POST",
    body,
  });
}

export function calcIpccRoadVehicle(
  body: {
    quantity: number;
    ch4_factor?: number;
    n2o_factor?: number;
    selected_factor?: string;
  } & PersistOpts
) {
  return apiFetch<CalcResult>("/api/v1/calc/ipcc/road-vehicle", {
    method: "POST",
    body,
  });
}

export function calcIpccUsaVehicles(
  body: {
    quantity: number;
    factor: number;
  } & PersistOpts
) {
  return apiFetch<CalcResult>("/api/v1/calc/ipcc/usa-vehicles", {
    method: "POST",
    body,
  });
}

export function calcIpccAltFuel(
  body: {
    quantity: number;
    ch4_factor?: number;
    n2o_factor?: number;
    selected_factor?: string;
  } & PersistOpts
) {
  return apiFetch<CalcResult>("/api/v1/calc/ipcc/alt-fuel", {
    method: "POST",
    body,
  });
}

export function calcIpccIndustry(
  body: {
    quantity: number;
    ef_co2?: number;
    ef_ch4?: number;
    ef_n2o?: number;
    selected_factor?: string;
  } & PersistOpts
) {
  return apiFetch<CalcResult>("/api/v1/calc/ipcc/industry", {
    method: "POST",
    body,
  });
}

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

export type StationaryGasResult = {
  mass_kg: string;
  gwp: string;
  co2e_kg: string;
};

export type StationaryCalcResponse = {
  success: boolean;
  fuel: string;
  category: string;
  quantity: string;
  unit: string;
  gases: {
    co2: StationaryGasResult;
    ch4: StationaryGasResult;
    n2o: StationaryGasResult;
  };
  total_kg_co2e: string;
  total_t_co2e: string;
  biogenic_co2_kg?: string | null;
  biogenic_co2_t?: string | null;
  accounting?: {
    version?: string;
    treatment?: string;
    methodology?: string;
    gwp_version?: string;
    biogenic_co2_t?: string;
    scope1_t_co2e?: string;
  };
  factors: Record<string, { value: string; unit: string }>;
  factor_source: {
    publisher?: string | null;
    dataset_code?: string | null;
    dataset_title?: string | null;
    version_label?: string | null;
    effective_from?: string | null;
    effective_to?: string | null;
    source_notes?: string | null;
    gwp_version?: string;
    gwp?: Record<string, string>;
    dataset_id?: string | null;
    factor_row_id?: string | null;
  };
  error?: string;
};

export type StationarySaveBody = {
  fuel: string;
  quantity: string;
  unit: string;
  assessment_id: string;
  equipment_type: string;
  category?: string | null;
  gwp_version?: string;
  counterparty_id?: string | null;
  site?: string | null;
  equipment_id?: string | null;
  period?: string | null;
};

export type StationarySaveResponse = {
  activity_id: string;
  assessment_id: string;
  organization_id: string;
  counterparty_id?: string | null;
  emissions_tco2e: string;
  calculation: StationaryCalcResponse;
  raw: Record<string, unknown>;
};

export type MobileGasResult = {
  mass_kg: string;
  gwp: string;
  co2e_kg: string;
  reporting?: string;
};

export type MobileFactorDetail = {
  value: string;
  unit: string;
  dataset_code?: string | null;
  dataset_id?: string | null;
  factor_row_id?: string | null;
  publisher?: string | null;
  title?: string | null;
  version_label?: string | null;
  attribute_key?: string | null;
};

export type MobileCalcResponse = {
  success: boolean;
  road_class?: string;
  vehicle_type?: string;
  fuel?: string;
  model_year?: string | null;
  fuel_quantity?: string;
  fuel_unit?: string;
  distance?: string | null;
  distance_unit?: string | null;
  gases: {
    co2: MobileGasResult;
    ch4: MobileGasResult;
    n2o: MobileGasResult;
  };
  total_kg_co2e: string;
  total_t_co2e: string;
  biogenic_co2_kg?: string | null;
  biogenic_co2_t?: string | null;
  factors: {
    co2: MobileFactorDetail;
    ch4: MobileFactorDetail;
    n2o: MobileFactorDetail;
  };
  factor_source?: {
    gwp_version?: string;
    gwp?: Record<string, string>;
    datasets?: Array<Record<string, unknown>>;
    publication_year?: number | null;
  };
  accounting?: {
    version?: string;
    treatment?: string;
    methodology?: string;
    gwp_version?: string;
  };
  error?: string;
};

export type MobileSaveBody = {
  road_class: string;
  vehicle_type: string;
  fuel_type: string;
  fuel_quantity: string;
  fuel_unit: string;
  assessment_id: string;
  period: string;
  distance?: string | null;
  distance_unit?: string | null;
  model_year?: number | null;
  gwp_version?: string;
  counterparty_id?: string | null;
  equipment_id?: string | null;
  site?: string | null;
};

export type MobileSaveResponse = {
  activity_id: string;
  assessment_id: string;
  organization_id: string;
  counterparty_id?: string | null;
  emissions_tco2e: string;
  biogenic_co2_t?: string | null;
  calculation: MobileCalcResponse;
  raw: Record<string, unknown>;
};

export function calcEpaMobile(body: {
  road_class: string;
  vehicle_type: string;
  fuel_type: string;
  fuel_quantity: string;
  fuel_unit: string;
  distance?: string | null;
  distance_unit?: string | null;
  model_year?: number | null;
  gwp_version?: string;
}) {
  return apiFetch<MobileCalcResponse>("/api/v1/calc/epa/mobile", { method: "POST", body });
}

export function createEpaMobileRecord(body: MobileSaveBody) {
  return apiFetch<MobileSaveResponse>("/api/v1/calc/epa/mobile/records", {
    method: "POST",
    body,
  });
}

export function updateEpaMobileRecord(activityId: string, body: MobileSaveBody) {
  return apiFetch<MobileSaveResponse>(`/api/v1/calc/epa/mobile/records/${activityId}`, {
    method: "PATCH",
    body,
  });
}

export type RefrigerantLeakageMethod = "leakage_record" | "estimated_leakage";

export type RefrigerantCalcResponse = {
  success: boolean;
  method: RefrigerantLeakageMethod;
  refrigerant: string;
  leakage_kg: string;
  charge_kg?: string | null;
  leakage_rate_percent?: string | null;
  leakage_rate_source?: string | null;
  equipment_type?: string | null;
  gwp: string;
  dataset_id?: string | null;
  factor_row_id?: string | null;
  dataset_code?: string | null;
  version_label?: string | null;
  factor_attribute?: string | null;
  gwp_publication?: string | null;
  gwp_edition?: string | null;
  factor_provenance?: string | null;
  gwp_basis?: string | null;
  table11_reference?: string | null;
  emissions_kg_co2e: string;
  emissions_tco2e: string;
  accounting?: { version?: string; methodology?: string; edition?: string };
  error?: string;
};

export type RefrigerantCalcBody = {
  method: RefrigerantLeakageMethod;
  gas: string;
  leakage_kg?: string | null;
  charge_kg?: string | null;
  leakage_rate_percent?: string | null;
  equipment_type?: string | null;
};

export type RefrigerantSaveBody = RefrigerantCalcBody & {
  assessment_id: string;
  period: string;
  equipment_id?: string | null;
  site?: string | null;
  counterparty_id?: string | null;
};

export type RefrigerantSaveResponse = {
  activity_id: string;
  assessment_id: string;
  organization_id: string;
  counterparty_id?: string | null;
  emissions_kg_co2e: string;
  emissions_tco2e: string;
  calculation: RefrigerantCalcResponse;
  raw: Record<string, unknown>;
};

export function calcEpaRefrigerantLeakage(body: RefrigerantCalcBody) {
  return apiFetch<RefrigerantCalcResponse>("/api/v1/calc/epa/refrigerant-leakage", {
    method: "POST",
    body,
  });
}

export function createEpaRefrigerantLeakageRecord(body: RefrigerantSaveBody) {
  return apiFetch<RefrigerantSaveResponse>("/api/v1/calc/epa/refrigerant-leakage/records", {
    method: "POST",
    body,
  });
}

export function updateEpaRefrigerantLeakageRecord(activityId: string, body: RefrigerantSaveBody) {
  return apiFetch<RefrigerantSaveResponse>(
    `/api/v1/calc/epa/refrigerant-leakage/records/${activityId}`,
    { method: "PATCH", body }
  );
}

export function calcEpaStationary(body: {
  fuel: string;
  quantity: string;
  unit: string;
  category?: string | null;
  gwp_version?: string;
}) {
  return apiFetch<StationaryCalcResponse>("/api/v1/calc/epa/stationary", {
    method: "POST",
    body,
  });
}

export function createEpaStationaryRecord(body: StationarySaveBody) {
  return apiFetch<StationarySaveResponse>("/api/v1/calc/epa/stationary/records", {
    method: "POST",
    body,
  });
}

export function updateEpaStationaryRecord(activityId: string, body: StationarySaveBody) {
  return apiFetch<StationarySaveResponse>(
    `/api/v1/calc/epa/stationary/records/${activityId}`,
    { method: "PATCH", body }
  );
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
    factor_unit?: string;
    mass_unit?: string;
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

export type Scope2ElectricityCalculation = {
  ok: boolean;
  save_allowed?: boolean;
  status?: string;
  error?: string | null;
  total_t_co2e?: string | null;
  total_t_co2?: string | null;
  total_kg_co2e?: string;
  electricity_kwh?: string;
  renewable_kwh?: string | null;
  renewable_applied?: boolean;
  factor?: {
    publisher?: string;
    source_document?: string;
    publication_year?: number;
    reporting_year?: number;
    country?: string;
    grid_region?: string;
    boundary?: string;
    unit?: string;
    value?: string;
    gas_coverage?: string;
    version_label?: string;
  };
  methodology?: string;
};

export function calcScope2Electricity(body: {
  country: string;
  grid_region?: string;
  quantity: string;
  unit: string;
  period: string;
  renewable_kwh?: string | null;
}) {
  return apiFetch<Scope2ElectricityCalculation>("/api/v1/calc/scope2/electricity", {
    method: "POST",
    body,
  });
}

export function createScope2ElectricityRecord(body: Record<string, unknown>) {
  return apiFetch<{ activity_id: string; emissions_tco2e: string; calculation: Scope2ElectricityCalculation }>(
    "/api/v1/calc/scope2/electricity/records",
    { method: "POST", body }
  );
}

export function updateScope2ElectricityRecord(activityId: string, body: Record<string, unknown>) {
  return apiFetch<{ activity_id: string; emissions_tco2e: string; calculation: Scope2ElectricityCalculation }>(
    `/api/v1/calc/scope2/electricity/records/${activityId}`,
    { method: "PATCH", body }
  );
}

export function calcUkScope2Electricity(body: {
  country: string;
  grid_region?: string;
  quantity: string;
  unit: string;
  period: string;
}) {
  return apiFetch<Scope2ElectricityCalculation>("/api/v1/calc/scope2/uk/electricity", {
    method: "POST",
    body,
  });
}

export function createUkScope2ElectricityRecord(body: Record<string, unknown>) {
  return apiFetch<{ activity_id: string; emissions_tco2e: string; calculation: Scope2ElectricityCalculation }>(
    "/api/v1/calc/scope2/uk/electricity/records",
    { method: "POST", body }
  );
}

export function updateUkScope2ElectricityRecord(activityId: string, body: Record<string, unknown>) {
  return apiFetch<{ activity_id: string; emissions_tco2e: string; calculation: Scope2ElectricityCalculation }>(
    `/api/v1/calc/scope2/uk/electricity/records/${activityId}`,
    { method: "PATCH", body }
  );
}

export function calcUkScope2HeatSteam(body: {
  country: string;
  energy_form: string;
  quantity: string;
  unit: string;
  period: string;
  supplier_name?: string;
}) {
  return apiFetch<Scope2HeatSteamCalculation>("/api/v1/calc/scope2/uk/heat-steam", {
    method: "POST",
    body,
  });
}

export function createUkScope2HeatSteamRecord(body: Record<string, unknown>) {
  return apiFetch<{ activity_id: string; emissions_tco2e: string; calculation: Scope2HeatSteamCalculation }>(
    "/api/v1/calc/scope2/uk/heat-steam/records",
    { method: "POST", body }
  );
}

export function updateUkScope2HeatSteamRecord(activityId: string, body: Record<string, unknown>) {
  return apiFetch<{ activity_id: string; emissions_tco2e: string; calculation: Scope2HeatSteamCalculation }>(
    `/api/v1/calc/scope2/uk/heat-steam/records/${activityId}`,
    { method: "PATCH", body }
  );
}

export type Scope2HeatSteamCalculation = {
  ok: boolean;
  save_allowed?: boolean;
  status?: string;
  error?: string | null;
  energy_form?: string;
  total_t_co2e?: string | null;
  total_kg_co2e?: string;
  quantity?: string;
  unit?: string;
  gases?: {
    co2?: { mass_kg?: string };
    ch4?: { mass_kg?: string };
    n2o?: { mass_kg?: string };
  };
  factor?: {
    publisher?: string;
    source_document?: string;
    co2_kg_per_mmbtu?: string;
    ch4_g_per_mmbtu?: string;
    n2o_g_per_mmbtu?: string;
    gwp_version?: string;
    thermal_efficiency?: string;
    production_fuel?: string;
    gas_coverage?: string;
    supplier_specific?: boolean;
  };
  methodology?: string;
};

export function calcScope2HeatSteam(body: {
  energy_form: "purchased_heat" | "purchased_steam";
  quantity: string;
  unit: "mmBtu";
  period: string;
  supplier_name?: string | null;
}) {
  return apiFetch<Scope2HeatSteamCalculation>("/api/v1/calc/scope2/heat-steam", {
    method: "POST",
    body,
  });
}

export function createScope2HeatSteamRecord(body: Record<string, unknown>) {
  return apiFetch<{ activity_id: string; emissions_tco2e: string; calculation: Scope2HeatSteamCalculation }>(
    "/api/v1/calc/scope2/heat-steam/records",
    { method: "POST", body }
  );
}

export function updateScope2HeatSteamRecord(activityId: string, body: Record<string, unknown>) {
  return apiFetch<{ activity_id: string; emissions_tco2e: string; calculation: Scope2HeatSteamCalculation }>(
    `/api/v1/calc/scope2/heat-steam/records/${activityId}`,
    { method: "PATCH", body }
  );
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
  body: {
    distance: number;
    weight: number;
    co2_factor: number;
    factor_unit?: string;
  } & PersistOpts
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
    distance_basis?: string;
    working_days_per_year?: number;
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
    factor_unit?: string;
    activity_currency?: string;
    activity_price_year?: number;
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

import { supabase } from "@/integrations/supabase/client";

export interface EmissionCategoryTotal {
  key: string;
  label: string;
  value: number;
}

export interface EpaIpccResultsData {
  scope1: EmissionCategoryTotal[];
  scope2: EmissionCategoryTotal[];
  scope3: EmissionCategoryTotal[];
  totals: {
    scope1: number;
    scope2: number;
    scope3: number;
    grand: number;
  };
}

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const sumEmissionsField = (rows: any[] | null | undefined): number => {
  return (rows || []).reduce((sum, row) => sum + toNumber(row?.emissions), 0);
};

const sumResultKgField = (rows: any[] | null | undefined): number => {
  return (rows || []).reduce((sum, row) => {
    const result = row?.result;
    if (!result || typeof result !== "object") return sum;

    // Prefer canonical key written by IPCC calculators.
    if ("totalCO2e_kg" in result) {
      return sum + toNumber((result as any).totalCO2e_kg);
    }

    // Fallback for slightly different result shapes.
    const fallbackKey = Object.keys(result as Record<string, unknown>).find((k) =>
      /co2e/i.test(k) && /kg/i.test(k)
    );
    return sum + toNumber(fallbackKey ? (result as any)[fallbackKey] : 0);
  }, 0);
};

const safeSelect = async (table: string, columns: string, userId: string) => {
  const { data, error } = await (supabase as any).from(table).select(columns).eq("user_id", userId);
  if (error) {
    // Gracefully tolerate missing optional tables/migrations.
    return [] as any[];
  }
  return data || [];
};

const calculateScope2ElectricityTotal = async (userId: string): Promise<number> => {
  const { data: mainRow } = await (supabase as any)
    .from("scope2_electricity_main")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!mainRow) return 0;

  const totalKwh = toNumber(mainRow.total_kwh);
  const gridPct = toNumber(mainRow.grid_pct);
  const otherPct = toNumber(mainRow.other_pct);

  const { data: subs } = await (supabase as any)
    .from("scope2_electricity_subanswers")
    .select("*")
    .eq("user_id", userId)
    .eq("main_id", mainRow.id);

  const gridRow = (subs || []).find((r: any) => r.type === "grid");
  const gridFactor = toNumber(gridRow?.grid_emission_factor);
  const gridPart = totalKwh > 0 && gridPct > 0 && gridFactor > 0 ? (gridPct / 100) * totalKwh * gridFactor : 0;

  const otherRows = (subs || []).filter((r: any) => r.type === "other");
  const sumOtherEmissions = otherRows.reduce((s: number, r: any) => s + toNumber(r.other_sources_emissions), 0);
  const otherPart = totalKwh > 0 && otherPct > 0 ? (otherPct / 100) * totalKwh * sumOtherEmissions : 0;

  return Number((gridPart + otherPart).toFixed(6));
};

export const loadEpaIpccResults = async (userId: string): Promise<EpaIpccResultsData> => {
  const [
    scope1FuelRows,
    scope1MobileRows,
    scope1OnRoadGasRows,
    scope1OnRoadDieselRows,
    scope1NonRoadRows,
    scope1HeatSteamRows,
    scope1FlaringRows,
    scope1VentingRows,
    scope1VehicularRows,
    scope1KitchenRows,
    scope1PowerRows,
    scope1HeatingRows,
    scope2HeatSteamRows,
    scope3PurchasedGoodsRows,
    scope3CapitalGoodsRows,
    scope3FuelEnergyRows,
    scope3UpstreamTransportRows,
    scope3WasteGeneratedRows,
    scope3BusinessTravelRows,
    scope3EmployeeCommutingRows,
    scope3InvestmentsRows,
    scope3DownstreamTransportRows,
    scope3EndOfLifeRows,
    scope3ProcessingSoldRows,
    scope3UseOfSoldRows,
  ] = await Promise.all([
    safeSelect("scope1_fuel_entries", "emissions", userId),
    safeSelect("scope1_epa_mobile_fuel_entries", "emissions", userId),
    safeSelect("scope1_epa_on_road_gasoline_entries", "emissions", userId),
    safeSelect("scope1_epa_on_road_diesel_alt_fuel_entries", "emissions", userId),
    safeSelect("scope1_epa_non_road_vehicle_entries", "emissions", userId),
    safeSelect("scope1_heatsteam_entries_epa", "emissions", userId),
    safeSelect("ipcc_scope1_flaring_entries", "result", userId),
    safeSelect("ipcc_scope1_venting_entries", "result", userId),
    safeSelect("ipcc_scope1_vehicular_entries", "result", userId),
    safeSelect("ipcc_scope1_kitchen_entries", "result", userId),
    safeSelect("ipcc_scope1_power_entries", "result", userId),
    safeSelect("ipcc_scope1_heating_entries", "result", userId),
    safeSelect("scope2_heatsteam_entries_epa", "emissions", userId),
    safeSelect("scope3_purchased_goods_services", "emissions", userId),
    safeSelect("scope3_capital_goods", "emissions", userId),
    safeSelect("scope3_fuel_energy_activities", "emissions", userId),
    safeSelect("scope3_upstream_transportation", "emissions", userId),
    safeSelect("scope3_waste_generated", "emissions", userId),
    safeSelect("scope3_business_travel", "emissions", userId),
    safeSelect("scope3_employee_commuting", "emissions", userId),
    safeSelect("scope3_investments", "emissions", userId),
    safeSelect("scope3_downstream_transportation", "emissions", userId),
    safeSelect("scope3_end_of_life_treatment", "emissions", userId),
    safeSelect("scope3_processing_sold_products", "row_data", userId),
    safeSelect("scope3_use_of_sold_products", "row_data", userId),
  ]);

  const scope2Electricity = await calculateScope2ElectricityTotal(userId);

  const scope1: EmissionCategoryTotal[] = [
    { key: "fuel", label: "Fuel", value: sumEmissionsField(scope1FuelRows) },
    { key: "mobile", label: "Mobile Fuel", value: sumEmissionsField(scope1MobileRows) },
    { key: "onroad_gas", label: "On-road Gasoline", value: sumEmissionsField(scope1OnRoadGasRows) },
    { key: "onroad_diesel", label: "On-road Diesel & Alt Fuel", value: sumEmissionsField(scope1OnRoadDieselRows) },
    { key: "nonroad", label: "Non-road Vehicle", value: sumEmissionsField(scope1NonRoadRows) },
    { key: "heatsteam", label: "Heat & Steam (Scope 1)", value: sumEmissionsField(scope1HeatSteamRows) },
    { key: "flaring", label: "Flaring", value: sumResultKgField(scope1FlaringRows) },
    { key: "venting", label: "Venting", value: sumResultKgField(scope1VentingRows) },
    { key: "vehicular", label: "Vehicular Footprints", value: sumResultKgField(scope1VehicularRows) },
    { key: "kitchen", label: "Kitchen Footprints", value: sumResultKgField(scope1KitchenRows) },
    { key: "power", label: "Power Fuel Consumption", value: sumResultKgField(scope1PowerRows) },
    { key: "heating", label: "Heating Footprints", value: sumResultKgField(scope1HeatingRows) },
  ];

  const scope2: EmissionCategoryTotal[] = [
    { key: "electricity", label: "Electricity", value: scope2Electricity },
    { key: "heatsteam", label: "Heat & Steam (Scope 2)", value: sumEmissionsField(scope2HeatSteamRows) },
  ];

  const processingSoldTotal = (scope3ProcessingSoldRows || []).reduce(
    (sum: number, row: any) => sum + toNumber(row?.row_data?.emissions),
    0
  );
  const useOfSoldTotal = (scope3UseOfSoldRows || []).reduce(
    (sum: number, row: any) => sum + toNumber(row?.row_data?.emissions),
    0
  );

  const scope3: EmissionCategoryTotal[] = [
    { key: "purchased_goods", label: "Purchased Goods & Services", value: sumEmissionsField(scope3PurchasedGoodsRows) },
    { key: "capital_goods", label: "Capital Goods", value: sumEmissionsField(scope3CapitalGoodsRows) },
    { key: "fuel_energy", label: "Fuel & Energy Activities", value: sumEmissionsField(scope3FuelEnergyRows) },
    { key: "upstream_transport", label: "Upstream Transportation", value: sumEmissionsField(scope3UpstreamTransportRows) },
    { key: "waste", label: "Waste Generated", value: sumEmissionsField(scope3WasteGeneratedRows) },
    { key: "business_travel", label: "Business Travel", value: sumEmissionsField(scope3BusinessTravelRows) },
    { key: "employee_commuting", label: "Employee Commuting", value: sumEmissionsField(scope3EmployeeCommutingRows) },
    { key: "investments", label: "Investments", value: sumEmissionsField(scope3InvestmentsRows) },
    { key: "downstream_transport", label: "Downstream Transportation", value: sumEmissionsField(scope3DownstreamTransportRows) },
    { key: "end_of_life", label: "End of Life Treatment", value: sumEmissionsField(scope3EndOfLifeRows) },
    { key: "processing_sold", label: "Processing of Sold Products", value: processingSoldTotal },
    { key: "use_of_sold", label: "Use of Sold Products", value: useOfSoldTotal },
  ];

  const scope1Total = scope1.reduce((sum, row) => sum + row.value, 0);
  const scope2Total = scope2.reduce((sum, row) => sum + row.value, 0);
  const scope3Total = scope3.reduce((sum, row) => sum + row.value, 0);

  return {
    scope1,
    scope2,
    scope3,
    totals: {
      scope1: scope1Total,
      scope2: scope2Total,
      scope3: scope3Total,
      grand: scope1Total + scope2Total + scope3Total,
    },
  };
};


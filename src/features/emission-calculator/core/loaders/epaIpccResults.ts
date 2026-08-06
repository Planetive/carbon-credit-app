import {
  calculateLegacyScope2ElectricityTotal,
  listRefrigerantEpaRows,
  safeListLegacyTable,
  sumEmissionsField,
  sumInvestmentAttributed,
  sumResultKgField,
  sumRowDataEmissions,
} from "@/integrations/supabase/ghgEntryAggregates";

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

export const loadEpaIpccResults = async (userId: string): Promise<EpaIpccResultsData> => {
  const [
    scope1FuelRows,
    scope1MobileRows,
    scope1OnRoadGasRows,
    scope1OnRoadDieselRows,
    scope1NonRoadRows,
    scope1HeatSteamRows,
    scope1UkRefrigerantRows,
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
    scope3FacilitatedRows,
    scope3DownstreamTransportRows,
    scope3EndOfLifeRows,
    scope3ProcessingSoldRows,
    scope3UseOfSoldRows,
  ] = await Promise.all([
    safeListLegacyTable("scope1_fuel_entries", userId),
    safeListLegacyTable("scope1_epa_mobile_fuel_entries", userId),
    safeListLegacyTable("scope1_epa_on_road_gasoline_entries", userId),
    safeListLegacyTable("scope1_epa_on_road_diesel_alt_fuel_entries", userId),
    safeListLegacyTable("scope1_epa_non_road_vehicle_entries", userId),
    safeListLegacyTable("scope1_heatsteam_entries_epa", userId),
    listRefrigerantEpaRows(userId),
    safeListLegacyTable("ipcc_scope1_flaring_entries", userId),
    safeListLegacyTable("ipcc_scope1_venting_entries", userId),
    safeListLegacyTable("ipcc_scope1_vehicular_entries", userId),
    safeListLegacyTable("ipcc_scope1_kitchen_entries", userId),
    safeListLegacyTable("ipcc_scope1_power_entries", userId),
    safeListLegacyTable("ipcc_scope1_heating_entries", userId),
    safeListLegacyTable("scope2_heatsteam_entries_epa", userId),
    safeListLegacyTable("scope3_purchased_goods_services", userId),
    safeListLegacyTable("scope3_capital_goods", userId),
    safeListLegacyTable("scope3_fuel_energy_activities", userId),
    safeListLegacyTable("scope3_upstream_transportation", userId),
    safeListLegacyTable("scope3_waste_generated", userId),
    safeListLegacyTable("scope3_business_travel", userId),
    safeListLegacyTable("scope3_employee_commuting", userId),
    safeListLegacyTable("scope3_investments", userId),
    safeListLegacyTable("scope3_facilitated_emissions", userId),
    safeListLegacyTable("scope3_downstream_transportation", userId),
    safeListLegacyTable("scope3_end_of_life_treatment", userId),
    safeListLegacyTable("scope3_processing_sold_products", userId),
    safeListLegacyTable("scope3_use_of_sold_products", userId),
  ]);

  const scope2Electricity = await calculateLegacyScope2ElectricityTotal(userId);

  const scope1: EmissionCategoryTotal[] = [
    { key: "fuel", label: "Fuel", value: sumEmissionsField(scope1FuelRows) },
    { key: "mobile", label: "Mobile Fuel", value: sumEmissionsField(scope1MobileRows) },
    { key: "onroad_gas", label: "On-road Gasoline", value: sumEmissionsField(scope1OnRoadGasRows) },
    { key: "onroad_diesel", label: "On-road Diesel & Alt Fuel", value: sumEmissionsField(scope1OnRoadDieselRows) },
    { key: "nonroad", label: "Non-road Vehicle", value: sumEmissionsField(scope1NonRoadRows) },
    { key: "heatsteam", label: "Heat & Steam (Scope 1)", value: sumEmissionsField(scope1HeatSteamRows) },
    {
      key: "uk_refrigerant",
      label: "Refrigerant",
      value: sumEmissionsField(scope1UkRefrigerantRows),
    },
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

  const scope3: EmissionCategoryTotal[] = [
    { key: "purchased_goods", label: "Purchased Goods & Services", value: sumEmissionsField(scope3PurchasedGoodsRows) },
    { key: "capital_goods", label: "Capital Goods", value: sumEmissionsField(scope3CapitalGoodsRows) },
    { key: "fuel_energy", label: "Fuel & Energy Activities", value: sumEmissionsField(scope3FuelEnergyRows) },
    { key: "upstream_transport", label: "Upstream Transportation", value: sumEmissionsField(scope3UpstreamTransportRows) },
    { key: "waste", label: "Waste Generated", value: sumEmissionsField(scope3WasteGeneratedRows) },
    { key: "business_travel", label: "Business Travel", value: sumEmissionsField(scope3BusinessTravelRows) },
    { key: "employee_commuting", label: "Employee Commuting", value: sumEmissionsField(scope3EmployeeCommutingRows) },
    { key: "investments", label: "Investments", value: sumInvestmentAttributed(scope3InvestmentsRows) },
    { key: "facilitated", label: "Facilitated Emissions", value: sumEmissionsField(scope3FacilitatedRows) },
    { key: "downstream_transport", label: "Downstream Transportation", value: sumEmissionsField(scope3DownstreamTransportRows) },
    { key: "end_of_life", label: "End of Life Treatment", value: sumEmissionsField(scope3EndOfLifeRows) },
    { key: "processing_sold", label: "Processing of Sold Products", value: sumRowDataEmissions(scope3ProcessingSoldRows) },
    { key: "use_of_sold", label: "Use of Sold Products", value: sumRowDataEmissions(scope3UseOfSoldRows) },
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

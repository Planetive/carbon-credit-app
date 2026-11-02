import {
  calculateLegacyScope2ElectricityTotal,
  listRefrigerantEpaRows,
  safeListLegacyTable,
  sumEmissionsField,
  sumInvestmentAttributed,
  sumResultKgField,
  sumRowDataEmissions,
} from "@/integrations/supabase/ghgEntryAggregates";
import { loadFinancedReportingRowsSafe } from "@/utils/portfolioCalculationsForScope3";
import { sumCategory15AttributedSafely } from "@/utils/scope3FinancedImportSafety";
import {
  groupScope1LegacyTotals,
  type GroupedScope1Total,
} from "@/features/emission-calculator/scope1/activity-based/legacyMapping";
import {
  fetchStationaryVerified,
  legacyFuelRowsExcludingVerified,
  type StationaryReadContext,
  type StationaryVerifiedResults,
} from "@/features/emission-calculator/results/stationaryResults";
import {
  fetchMobileVerified,
  type MobileVerifiedResults,
} from "@/features/emission-calculator/results/mobileResults";
import {
  fetchRefrigerantVerified,
  type RefrigerantVerifiedResults,
} from "@/features/emission-calculator/results/refrigerantResults";
import {
  fetchElectricityVerified,
  type ElectricityVerifiedResults,
} from "@/features/emission-calculator/results/electricityResults";
import {
  fetchHeatSteamVerified,
  type HeatSteamVerifiedResults,
} from "@/features/emission-calculator/results/heatSteamResults";
import {
  fetchScope3Verified,
  type Scope3VerifiedResults,
} from "@/features/emission-calculator/results/scope3Results";
import {
  productionAnnualAssignment,
  type AnnualReportingAssignment,
} from "@/features/emission-calculator/results/reportingYear";

export interface EmissionCategoryTotal {
  key: string;
  label: string;
  value: number;
}

export interface EpaIpccResultsData {
  scope1: EmissionCategoryTotal[];
  /** Activity-based rollup of scope1 legacy lines (each legacy key once). */
  scope1ByActivity: GroupedScope1Total[];
  scope2: EmissionCategoryTotal[];
  scope3: EmissionCategoryTotal[];
  /**
   * Backend epa_stationary records. Tonnes live here.
   * totals.scope1 stays in kilograms and does not include this block.
   */
  stationaryVerified?: StationaryVerifiedResults;
  /**
   * Backend epa_mobile_v1 records. Scope 1 tonnes live here.
   * Legacy mobile tables are not copied into this block.
   */
  mobileVerified?: MobileVerifiedResults;
  /**
   * Backend epa_refrigerant_v1 records. Scope 1 tonnes live here.
   * Legacy refrigerant tables are not copied into this block.
   */
  refrigerantVerified?: RefrigerantVerifiedResults;
  /**
   * Location-based purchased electricity in tonnes.
   * Legacy scope2_electricity tables stay in scope2 and are not copied here.
   * Purchased heat, steam, and cooling are not part of this block.
   */
  electricityVerified?: ElectricityVerifiedResults;
  /**
   * Purchased heat and steam in tonnes.
   * Legacy scope2_heatsteam tables stay in scope2 and are not copied here.
   * Purchased cooling is not part of this block.
   */
  heatSteamVerified?: HeatSteamVerifiedResults;
  /**
   * Verified Scope 3 from app.emission_activities (scope3_verified_activity_v1).
   * Legacy scope3_* tables stay in scope3 and are not copied here.
   * inventoryComplete is always false while unsupported categories remain.
   */
  scope3Verified?: Scope3VerifiedResults;
  /**
   * Which stored values belong to the selected reporting year.
   * Shared Scope 2 stays withheld until those tables store a period.
   * Verified Scope 3 uses scope3Verified, not this assignment flag.
   */
  annualReporting?: AnnualReportingAssignment;
  totals: {
    scope1: number;
    scope2: number;
    scope3: number;
    grand: number;
  };
}

export const loadEpaIpccResults = async (
  userId: string,
  context: StationaryReadContext = {}
): Promise<EpaIpccResultsData> => {
  // All table reads in one wave — including Scope 2 electricity (was sequential before).
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
    scope2Electricity,
    stationaryVerified,
    mobileVerified,
    refrigerantVerified,
    electricityVerified,
    heatSteamVerified,
    scope3Verified,
  ] = await Promise.all([
    // EPA-only fuel rows (exclude UK framework — shared table).
    safeListLegacyTable("scope1_fuel_entries", userId, {}, (row) => {
      const fw = row.emission_framework;
      if (fw == null || fw === "") return true; // legacy null treated as EPA
      return String(fw) === "epa";
    }),
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
    calculateLegacyScope2ElectricityTotal(userId),
    fetchStationaryVerified(context),
    fetchMobileVerified(context),
    fetchRefrigerantVerified(context),
    fetchElectricityVerified(context),
    fetchHeatSteamVerified(context),
    fetchScope3Verified(context),
  ]);

  const legacyFuelRows = legacyFuelRowsExcludingVerified(
    scope1FuelRows,
    (stationaryVerified.activities || []).map((activity) => activity.id)
  );

  const keptLegacy = (rows: Record<string, unknown>[]) =>
    rows.filter((row) => row.method !== "epa_mobile_v1" && row.legacy_source !== "epa_mobile_v1");
  const keptRefrigerantLegacy = (rows: Record<string, unknown>[]) =>
    rows.filter(
      (row) => row.method !== "epa_refrigerant_v1" && row.legacy_source !== "epa_refrigerant_v1"
    );

  const scope1: EmissionCategoryTotal[] = [
    {
      key: "fuel",
      label: "Fuel (legacy / stationary)",
      value: sumEmissionsField(legacyFuelRows),
    },
    { key: "mobile", label: "Mobile Fuel (legacy)", value: sumEmissionsField(keptLegacy(scope1MobileRows)) },
    { key: "onroad_gas", label: "On-road Gasoline (legacy)", value: sumEmissionsField(keptLegacy(scope1OnRoadGasRows)) },
    {
      key: "onroad_diesel",
      label: "On-road Diesel & Alt Fuel (legacy)",
      value: sumEmissionsField(keptLegacy(scope1OnRoadDieselRows)),
    },
    { key: "nonroad", label: "Non-road Vehicle (legacy)", value: sumEmissionsField(keptLegacy(scope1NonRoadRows)) },
    {
      key: "heatsteam",
      label: "Heat & Steam Scope 1 (legacy)",
      value: sumEmissionsField(scope1HeatSteamRows),
    },
    {
      key: "uk_refrigerant",
      label: "Refrigerant / leaks",
      value: sumEmissionsField(keptRefrigerantLegacy(scope1UkRefrigerantRows)),
    },
    { key: "flaring", label: "Flaring", value: sumResultKgField(scope1FlaringRows) },
    { key: "venting", label: "Venting", value: sumResultKgField(scope1VentingRows) },
    {
      key: "vehicular",
      label: "Vehicular Footprints (historical)",
      value: sumResultKgField(keptLegacy(scope1VehicularRows)),
    },
    {
      key: "kitchen",
      label: "Kitchen Footprints (historical)",
      value: sumResultKgField(scope1KitchenRows),
    },
    {
      key: "power",
      label: "Power Fuel Consumption (historical)",
      value: sumResultKgField(scope1PowerRows),
    },
    {
      key: "heating",
      label: "Heating Footprints (historical)",
      value: sumResultKgField(scope1HeatingRows),
    },
  ];

  const scope1ByActivity = groupScope1LegacyTotals(scope1);

  const scope2: EmissionCategoryTotal[] = [
    { key: "electricity", label: "Electricity", value: scope2Electricity },
    { key: "heatsteam", label: "Heat & Steam (Scope 2)", value: sumEmissionsField(scope2HeatSteamRows) },
  ];

  const financedReportingRows = await loadFinancedReportingRowsSafe();
  const investmentsValue = financedReportingRows.length
    ? sumCategory15AttributedSafely(scope3InvestmentsRows, financedReportingRows, "finance")
    : sumInvestmentAttributed(scope3InvestmentsRows);
  const facilitatedValue = financedReportingRows.length
    ? sumCategory15AttributedSafely(scope3FacilitatedRows, financedReportingRows, "facilitated")
    : sumEmissionsField(scope3FacilitatedRows);

  const scope3: EmissionCategoryTotal[] = [
    { key: "purchased_goods", label: "Purchased Goods & Services", value: sumEmissionsField(scope3PurchasedGoodsRows) },
    { key: "capital_goods", label: "Capital Goods", value: sumEmissionsField(scope3CapitalGoodsRows) },
    { key: "fuel_energy", label: "Fuel & Energy Activities", value: sumEmissionsField(scope3FuelEnergyRows) },
    { key: "upstream_transport", label: "Upstream Transportation", value: sumEmissionsField(scope3UpstreamTransportRows) },
    { key: "waste", label: "Waste Generated", value: sumEmissionsField(scope3WasteGeneratedRows) },
    { key: "business_travel", label: "Business Travel", value: sumEmissionsField(scope3BusinessTravelRows) },
    { key: "employee_commuting", label: "Employee Commuting", value: sumEmissionsField(scope3EmployeeCommutingRows) },
    { key: "investments", label: "Investments", value: investmentsValue },
    { key: "facilitated", label: "Facilitated Emissions", value: facilitatedValue },
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
    scope1ByActivity,
    scope2,
    scope3,
    stationaryVerified,
    mobileVerified,
    refrigerantVerified,
    electricityVerified,
    heatSteamVerified,
    scope3Verified,
    annualReporting: productionAnnualAssignment(context.reportingYear ?? null),
    totals: {
      scope1: scope1Total,
      scope2: scope2Total,
      scope3: scope3Total,
      grand: scope1Total + scope2Total + scope3Total,
    },
  };
};

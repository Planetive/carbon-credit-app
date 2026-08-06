/**
 * Read-only helpers for results/dashboard screens that load and sum legacy emission rows.
 */
import {
  listLegacyTableEntries,
  type LegacyEntryFilters,
} from "./ghgEntryClient";

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const sumEmissionsField = (rows: Record<string, unknown>[] | null | undefined): number => {
  return (rows || []).reduce((sum, row) => sum + toNumber(row?.emissions), 0);
};

export const sumResultKgField = (rows: Record<string, unknown>[] | null | undefined): number => {
  return (rows || []).reduce((sum, row) => {
    const result = row?.result;
    if (!result || typeof result !== "object") return sum;

    if ("totalCO2e_kg" in result) {
      return sum + toNumber((result as Record<string, unknown>).totalCO2e_kg);
    }

    const fallbackKey = Object.keys(result as Record<string, unknown>).find(
      (k) => /co2e/i.test(k) && /kg/i.test(k)
    );
    return sum + toNumber(fallbackKey ? (result as Record<string, unknown>)[fallbackKey] : 0);
  }, 0);
};

export const sumRowDataEmissions = (rows: Record<string, unknown>[] | null | undefined): number => {
  return (rows || []).reduce((sum, row) => {
    const rowData = row?.row_data;
    if (rowData && typeof rowData === "object" && "emissions" in rowData) {
      return sum + toNumber((rowData as Record<string, unknown>).emissions);
    }
    return sum;
  }, 0);
};

export const sumInvestmentAttributed = (rows: Record<string, unknown>[] | null | undefined): number => {
  return (rows || []).reduce((sum, row) => {
    const calculated = Number(row?.calculated_emissions);
    if (Number.isFinite(calculated)) return sum + calculated;
    const inv = toNumber(row?.emissions);
    const pct = toNumber(row?.ownership_percentage);
    return sum + (inv * pct) / 100;
  }, 0);
};

/** List legacy rows; returns [] on error (tolerates missing tables). */
export async function safeListLegacyTable(
  tableName: string,
  userId: string,
  filters: Omit<LegacyEntryFilters, "user_id"> = {},
  rowFilter?: (row: Record<string, unknown>) => boolean
): Promise<Record<string, unknown>[]> {
  try {
    let rows = await listLegacyTableEntries(tableName, { user_id: userId, ...filters });
    if (rowFilter) rows = rows.filter(rowFilter);
    return rows;
  } catch {
    return [];
  }
}

export async function listRefrigerantEpaRows(userId: string): Promise<Record<string, unknown>[]> {
  return safeListLegacyTable("scope1_refrigerant_entries", userId, {}, (row) => {
    const fw = String(row.emission_framework ?? "");
    return fw === "epa" || fw === "uk_epa";
  });
}

export async function calculateLegacyScope2ElectricityTotal(userId: string): Promise<number> {
  const mains = await safeListLegacyTable("scope2_electricity_main", userId, {
    order: { column: "created_at", ascending: false },
  });
  // Prefer a real main row (has kWh); ignore stray subanswer rows if API filter fails.
  const mainRow =
    mains.find((r) => r.total_kwh != null && r.total_kwh !== "") ||
    mains.find((r) => r.type == null || r.type === "") ||
    mains[0];
  if (!mainRow) return 0;

  const totalKwh = toNumber(mainRow.total_kwh);
  const gridPct = toNumber(mainRow.grid_pct);
  const otherPct = toNumber(mainRow.other_pct);

  const mainLegacyId = String(mainRow.legacy_id || mainRow.id);
  const subs = await safeListLegacyTable("scope2_electricity_subanswers", userId, {}, (row) => {
    const mid = String(row.main_id ?? "");
    return mid === mainLegacyId || mid === String(mainRow.id);
  });

  const gridRow = subs.find((r) => r.type === "grid");
  const gridFactor = toNumber(gridRow?.grid_emission_factor);
  const gridPart =
    totalKwh > 0 && gridPct > 0 && gridFactor > 0 ? (gridPct / 100) * totalKwh * gridFactor : 0;

  const otherRows = subs.filter((r) => r.type === "other");
  const sumOtherEmissions = otherRows.reduce(
    (s, r) => s + toNumber(r.other_sources_emissions),
    0
  );
  const otherPart =
    totalKwh > 0 && otherPct > 0 ? (otherPct / 100) * totalKwh * sumOtherEmissions : 0;

  return Number((gridPart + otherPart).toFixed(6));
}

type DetailConfig = {
  table: string;
  emission_framework?: "uk" | "epa";
  rowFilter?: (row: Record<string, unknown>) => boolean;
};

const UK_DETAIL_TABLE_BY_KEY: Record<string, DetailConfig> = {
  fuel: { table: "scope1_fuel_entries" },
  refrigerant: { table: "scope1_refrigerant_entries" },
  passenger: { table: "scope1_passenger_vehicle_entries" },
  delivery: { table: "scope1_delivery_vehicle_entries" },
  epa_mobile: { table: "scope1_epa_mobile_fuel_entries" },
  epa_on_road_gas: { table: "scope1_epa_on_road_gasoline_entries" },
  epa_on_road_diesel: { table: "scope1_epa_on_road_diesel_alt_fuel_entries" },
  epa_non_road: { table: "scope1_epa_non_road_vehicle_entries" },
  epa_scope1_heat_steam: { table: "scope1_heatsteam_entries_epa" },
  epa_heat_steam: { table: "scope2_heatsteam_entries_epa" },
  scope2_electricity: { table: "scope2_electricity_subanswers" },
  scope2_heatsteam: { table: "scope2_heatsteam_entries" },
  scope3_purchased_goods: { table: "scope3_purchased_goods_services" },
  scope3_capital_goods: { table: "scope3_capital_goods" },
  scope3_fuel_energy: { table: "scope3_fuel_energy_activities" },
  scope3_upstream_transport: { table: "scope3_upstream_transportation" },
  scope3_waste_generated: { table: "scope3_waste_generated" },
  scope3_business_travel: { table: "scope3_business_travel" },
  scope3_employee_commuting: { table: "scope3_employee_commuting" },
  scope3_downstream_transport: { table: "scope3_downstream_transportation" },
  scope3_processing_sold: { table: "scope3_processing_sold_products" },
  scope3_use_of_sold: { table: "scope3_use_of_sold_products" },
  scope3_end_of_life: { table: "scope3_end_of_life_treatment" },
  scope3_investments: { table: "scope3_investments" },
  scope3_facilitated: { table: "scope3_facilitated_emissions" },
};

const EPA_IPCC_DETAIL_TABLE_BY_KEY: Record<string, DetailConfig> = {
  fuel: { table: "scope1_fuel_entries", emission_framework: "epa" },
  mobile: { table: "scope1_epa_mobile_fuel_entries" },
  onroad_gas: { table: "scope1_epa_on_road_gasoline_entries" },
  onroad_diesel: { table: "scope1_epa_on_road_diesel_alt_fuel_entries" },
  nonroad: { table: "scope1_epa_non_road_vehicle_entries" },
  heatsteam: { table: "scope1_heatsteam_entries_epa" },
  uk_refrigerant: {
    table: "scope1_refrigerant_entries",
    rowFilter: (row) => {
      const fw = String(row.emission_framework ?? "");
      return fw === "epa" || fw === "uk_epa";
    },
  },
  flaring: { table: "ipcc_scope1_flaring_entries" },
  venting: { table: "ipcc_scope1_venting_entries" },
  vehicular: { table: "ipcc_scope1_vehicular_entries" },
  kitchen: { table: "ipcc_scope1_kitchen_entries" },
  power: { table: "ipcc_scope1_power_entries" },
  heating: { table: "ipcc_scope1_heating_entries" },
  electricity: { table: "scope2_electricity_subanswers" },
  scope2_heatsteam: { table: "scope2_heatsteam_entries_epa" },
  purchased_goods: { table: "scope3_purchased_goods_services" },
  capital_goods: { table: "scope3_capital_goods" },
  fuel_energy: { table: "scope3_fuel_energy_activities" },
  upstream_transport: { table: "scope3_upstream_transportation" },
  waste: { table: "scope3_waste_generated" },
  business_travel: { table: "scope3_business_travel" },
  employee_commuting: { table: "scope3_employee_commuting" },
  investments: { table: "scope3_investments" },
  facilitated: { table: "scope3_facilitated_emissions" },
  downstream_transport: { table: "scope3_downstream_transportation" },
  end_of_life: { table: "scope3_end_of_life_treatment" },
  processing_sold: { table: "scope3_processing_sold_products" },
  use_of_sold: { table: "scope3_use_of_sold_products" },
};

export async function loadLegacyCategoryDetailRows(
  key: string,
  userId: string,
  options: { variant?: "uk" | "epa_ipcc"; fuelFramework?: "uk" | "epa" } = {}
): Promise<Record<string, unknown>[]> {
  const variant = options.variant ?? "uk";
  const map = variant === "epa_ipcc" ? EPA_IPCC_DETAIL_TABLE_BY_KEY : UK_DETAIL_TABLE_BY_KEY;
  const config = map[key];
  if (!config) return [];

  let emission_framework = config.emission_framework;
  if (!emission_framework && (key === "fuel" || key === "refrigerant") && options.fuelFramework) {
    emission_framework = options.fuelFramework;
  }

  return safeListLegacyTable(
    config.table,
    userId,
    emission_framework ? { emission_framework } : {},
    config.rowFilter
  );
}

import { supabase } from "@/integrations/supabase/client";
import type {
  PersistedProcessingSoldProductsRow,
  ProcessingSoldProductsRow,
} from "../types";

type ScopeParams = {
  userId: string;
  companyContext?: boolean;
  counterpartyId?: string;
};

type SaveProcessingParams = ScopeParams & {
  rows: ProcessingSoldProductsRow[];
  existingRows: PersistedProcessingSoldProductsRow[];
};

function withCounterpartyScope<TQuery>(query: TQuery, companyContext?: boolean, counterpartyId?: string) {
  if (companyContext && counterpartyId) {
    return (query as any).eq("counterparty_id", counterpartyId);
  }

  return (query as any).is("counterparty_id", null);
}

function mapProcessingEntry(entry: any): PersistedProcessingSoldProductsRow {
  const rowData = entry.row_data || {};
  return {
    id: crypto.randomUUID(),
    dbId: entry.id,
    processingActivity: entry.processing_activity || rowData.processingActivity || "",
    factorType: entry.factor_type || rowData.factorType,
    combustionType: entry.combustion_type || rowData.combustionType,
    stationaryMainFuelType:
      entry.stationary_main_fuel_type || rowData.stationaryMainFuelType,
    stationarySubFuelType:
      entry.stationary_sub_fuel_type || rowData.stationarySubFuelType,
    stationaryCo2Factor:
      entry.stationary_co2_factor || rowData.stationaryCo2Factor,
    stationaryUnit: entry.stationary_unit || rowData.stationaryUnit,
    mobileFuelType: entry.mobile_fuel_type || rowData.mobileFuelType,
    mobileKgCo2PerUnit:
      entry.mobile_kg_co2_per_unit || rowData.mobileKgCo2PerUnit,
    mobileUnit: entry.mobile_unit || rowData.mobileUnit,
    heatSteamStandard: entry.heat_steam_standard || rowData.heatSteamStandard,
    heatSteamType: entry.heat_steam_type || rowData.heatSteamType,
    heatSteamKgCo2e: entry.heat_steam_kg_co2e || rowData.heatSteamKgCo2e,
    heatSteamUnit: entry.heat_steam_unit || rowData.heatSteamUnit,
    type: entry.fuel_type || rowData.type,
    fuel: entry.fuel || rowData.fuel,
    unit: entry.fuel_unit || rowData.unit,
    quantity: entry.fuel_quantity || entry.quantity || rowData.quantity,
    factor: entry.fuel_factor || rowData.factor,
    emissions: entry.emissions || rowData.emissions,
    totalKwh: entry.total_kwh || rowData.totalKwh,
    gridPct: entry.grid_pct || rowData.gridPct,
    renewablePct: entry.renewable_pct || rowData.renewablePct,
    otherPct: entry.other_pct || rowData.otherPct,
    gridCountry: entry.grid_country || rowData.gridCountry,
    otherSources: entry.other_sources || rowData.otherSources || [],
  };
}

function toProcessingPayload(
  row: ProcessingSoldProductsRow,
) {
  return {
    processing_activity: row.processingActivity,
    factor_type: row.factorType,
    combustion_type: row.combustionType,
    stationary_main_fuel_type: row.stationaryMainFuelType,
    stationary_sub_fuel_type: row.stationarySubFuelType,
    stationary_co2_factor: row.stationaryCo2Factor,
    stationary_unit: row.stationaryUnit,
    mobile_fuel_type: row.mobileFuelType,
    mobile_kg_co2_per_unit: row.mobileKgCo2PerUnit,
    mobile_unit: row.mobileUnit,
    heat_steam_type: row.heatSteamType,
    heat_steam_kg_co2e: row.heatSteamKgCo2e,
    heat_steam_unit: row.heatSteamUnit,
    fuel_type: row.type,
    fuel: row.fuel,
    fuel_unit: row.unit,
    fuel_quantity: row.quantity,
    fuel_factor: row.factor,
    total_kwh: row.totalKwh,
    grid_pct: row.gridPct,
    renewable_pct: row.renewablePct,
    other_pct: row.otherPct,
    grid_country: row.gridCountry,
    other_sources: row.otherSources || [],
    quantity: row.quantity,
    emissions: row.emissions || 0,
    row_data: row,
  };
}

export async function loadProcessingSoldProductsRows({
  userId,
  companyContext,
  counterpartyId,
}: ScopeParams): Promise<PersistedProcessingSoldProductsRow[]> {
  let query = supabase
    .from("scope3_processing_sold_products" as any)
    .select("*")
    .eq("user_id", userId);

  query = withCounterpartyScope(query, companyContext, counterpartyId);

  const { data, error } = await (query as any).order("created_at", {
    ascending: false,
  });

  if (error) throw error;

  return (data || []).map(mapProcessingEntry);
}

export async function saveProcessingSoldProductsRows({
  userId,
  companyContext,
  counterpartyId,
  rows,
  existingRows,
}: SaveProcessingParams): Promise<{
  insertedRows?: PersistedProcessingSoldProductsRow[];
}> {
  const newEntries = rows.filter(
    (row) => !existingRows.find((existing) => existing.id === row.id),
  );
  const changedExisting = rows.filter((row) => {
    const existing = existingRows.find((candidate) => candidate.id === row.id);
    return (
      existing &&
      existing.dbId &&
      JSON.stringify(existing) !== JSON.stringify(row)
    );
  });
  const deletedIds = existingRows
    .filter((existing) => !rows.find((row) => row.id === existing.id))
    .map((existing) => existing.dbId)
    .filter((id): id is string => !!id);

  if (deletedIds.length > 0) {
    const { error } = await supabase
      .from("scope3_processing_sold_products" as any)
      .delete()
      .in("id", deletedIds);
    if (error) throw error;
  }

  let insertedRows: PersistedProcessingSoldProductsRow[] | undefined;

  if (newEntries.length > 0) {
    const payload = newEntries.map((row) => ({
      user_id: userId,
      counterparty_id: companyContext && counterpartyId ? counterpartyId : null,
      ...toProcessingPayload(row),
    }));

    const { data, error } = await supabase
      .from("scope3_processing_sold_products" as any)
      .insert(payload)
      .select("id");

    if (error) throw error;

    insertedRows = rows.map((row) => {
      const newEntryIndex = newEntries.findIndex(
        (newEntry) => newEntry.id === row.id,
      );
      if (
        newEntryIndex >= 0 &&
        data &&
        data[newEntryIndex] &&
        (data[newEntryIndex] as any).id
      ) {
        return { ...row, dbId: (data[newEntryIndex] as any).id };
      }
      return row;
    }) as PersistedProcessingSoldProductsRow[];
  }

  if (changedExisting.length > 0) {
    const updates = changedExisting.map((row) => {
      const existing = existingRows.find((candidate) => candidate.id === row.id);
      return supabase
        .from("scope3_processing_sold_products" as any)
        .update(toProcessingPayload(row))
        .eq("id", existing!.dbId!);
    });
    const results = await Promise.all(updates);
    const updateError = results.find((result) => (result as any).error)?.error;
    if (updateError) throw updateError;
  }

  return insertedRows ? { insertedRows } : {};
}

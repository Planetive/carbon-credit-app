import {
  companyScopedListFilters,
  deleteLegacyTableEntry,
  insertLegacyTableEntries,
  listLegacyTableEntries,
  updateLegacyTableEntry,
} from "@/integrations/supabase/ghgEntryClient";
import type {
  PersistedProcessingSoldProductsRow,
  ProcessingSoldProductsRow,
} from "../types";

const TABLE = "scope3_processing_sold_products";

type ScopeParams = {
  userId: string;
  companyContext?: boolean;
  counterpartyId?: string;
};

type SaveProcessingParams = ScopeParams & {
  rows: ProcessingSoldProductsRow[];
  existingRows: PersistedProcessingSoldProductsRow[];
};

function mapProcessingEntry(entry: Record<string, unknown>): PersistedProcessingSoldProductsRow {
  const rowData = (entry.row_data || {}) as Record<string, unknown>;
  return {
    id: crypto.randomUUID(),
    dbId: String(entry.id),
    processingActivity: String(entry.processing_activity || rowData.processingActivity || ""),
    factorType: (entry.factor_type || rowData.factorType) as PersistedProcessingSoldProductsRow["factorType"],
    combustionType: (entry.combustion_type || rowData.combustionType) as string | undefined,
    stationaryMainFuelType:
      (entry.stationary_main_fuel_type || rowData.stationaryMainFuelType) as string | undefined,
    stationarySubFuelType:
      (entry.stationary_sub_fuel_type || rowData.stationarySubFuelType) as string | undefined,
    stationaryCo2Factor:
      (entry.stationary_co2_factor || rowData.stationaryCo2Factor) as number | undefined,
    stationaryUnit: (entry.stationary_unit || rowData.stationaryUnit) as string | undefined,
    mobileFuelType: (entry.mobile_fuel_type || rowData.mobileFuelType) as string | undefined,
    mobileKgCo2PerUnit:
      (entry.mobile_kg_co2_per_unit || rowData.mobileKgCo2PerUnit) as number | undefined,
    mobileUnit: (entry.mobile_unit || rowData.mobileUnit) as string | undefined,
    heatSteamStandard: (entry.heat_steam_standard || rowData.heatSteamStandard) as string | undefined,
    heatSteamType: (entry.heat_steam_type || rowData.heatSteamType) as string | undefined,
    heatSteamKgCo2e: (entry.heat_steam_kg_co2e || rowData.heatSteamKgCo2e) as number | undefined,
    heatSteamUnit: (entry.heat_steam_unit || rowData.heatSteamUnit) as string | undefined,
    type: (entry.fuel_type || rowData.type) as string | undefined,
    fuel: (entry.fuel || rowData.fuel) as string | undefined,
    unit: (entry.fuel_unit || rowData.unit) as string | undefined,
    quantity: (entry.fuel_quantity || entry.quantity || rowData.quantity) as number | undefined,
    factor: (entry.fuel_factor || rowData.factor) as number | undefined,
    emissions: (entry.emissions || rowData.emissions) as number | undefined,
    totalKwh: (entry.total_kwh || rowData.totalKwh) as number | undefined,
    gridPct: (entry.grid_pct || rowData.gridPct) as number | undefined,
    renewablePct: (entry.renewable_pct || rowData.renewablePct) as number | undefined,
    otherPct: (entry.other_pct || rowData.otherPct) as number | undefined,
    gridCountry: (entry.grid_country || rowData.gridCountry) as string | undefined,
    otherSources: (entry.other_sources || rowData.otherSources || []) as PersistedProcessingSoldProductsRow["otherSources"],
  };
}

function toProcessingPayload(row: ProcessingSoldProductsRow) {
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
  const data = await listLegacyTableEntries(
    TABLE,
    companyScopedListFilters(userId, !!companyContext, counterpartyId),
  );
  return data.map(mapProcessingEntry);
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
    await Promise.all(deletedIds.map((id) => deleteLegacyTableEntry(TABLE, id)));
  }

  let insertedRows: PersistedProcessingSoldProductsRow[] | undefined;

  if (newEntries.length > 0) {
    const payload = newEntries.map((row) => ({
      user_id: userId,
      counterparty_id: companyContext && counterpartyId ? counterpartyId : null,
      ...toProcessingPayload(row),
    }));

    const created = await insertLegacyTableEntries(TABLE, payload);

    insertedRows = rows.map((row) => {
      const newEntryIndex = newEntries.findIndex((newEntry) => newEntry.id === row.id);
      if (newEntryIndex >= 0 && created[newEntryIndex]?.id) {
        return { ...row, dbId: created[newEntryIndex].id };
      }
      return row;
    }) as PersistedProcessingSoldProductsRow[];
  }

  if (changedExisting.length > 0) {
    await Promise.all(
      changedExisting.map((row) => {
        const existing = existingRows.find((candidate) => candidate.id === row.id);
        return updateLegacyTableEntry(TABLE, existing!.dbId!, toProcessingPayload(row));
      })
    );
  }

  return insertedRows ? { insertedRows } : {};
}

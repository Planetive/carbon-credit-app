import {
  companyScopedListFilters,
  deleteLegacyTableEntry,
  insertLegacyTableEntries,
  listLegacyTableEntries,
  updateLegacyTableEntry,
} from "@/integrations/supabase/ghgEntryClient";
import type {
  PersistedUseOfSoldProductsRow,
  UseOfSoldProductsRow,
} from "../types";

const TABLE = "scope3_use_of_sold_products";

type ScopeParams = {
  userId: string;
  companyContext?: boolean;
  counterpartyId?: string;
};

type SaveUseParams = ScopeParams & {
  rows: UseOfSoldProductsRow[];
  existingRows: PersistedUseOfSoldProductsRow[];
};

function mapUseEntry(entry: Record<string, unknown>): PersistedUseOfSoldProductsRow {
  const rowData = (entry.row_data || {}) as Record<string, unknown>;
  return {
    id: crypto.randomUUID(),
    dbId: String(entry.id),
    processingActivity: String(entry.processing_activity || rowData.processingActivity || ""),
    energyConsumption: String(entry.energy_consumption || rowData.energyConsumption || ""),
    quantity: (entry.quantity || rowData.quantity) as number | undefined,
    emissions: (entry.emissions || rowData.emissions) as number | undefined,
    combustionType: (entry.combustion_type || rowData.combustionType) as string | undefined,
    stationaryMainFuelType:
      (entry.stationary_main_fuel_type || rowData.stationaryMainFuelType) as string | undefined,
    stationarySubFuelType:
      (entry.stationary_sub_fuel_type || rowData.stationarySubFuelType) as string | undefined,
    stationaryCo2Factor:
      (entry.stationary_co2_factor || rowData.stationaryCo2Factor) as number | undefined,
    stationaryUnit: (entry.stationary_unit || rowData.stationaryUnit) as string | undefined,
    stationaryQuantity: (entry.stationary_quantity || rowData.stationaryQuantity) as number | undefined,
    mobileFuelType: (entry.mobile_fuel_type || rowData.mobileFuelType) as string | undefined,
    mobileKgCo2PerUnit:
      (entry.mobile_kg_co2_per_unit || rowData.mobileKgCo2PerUnit) as number | undefined,
    mobileUnit: (entry.mobile_unit || rowData.mobileUnit) as string | undefined,
    mobileQuantity: (entry.mobile_quantity || rowData.mobileQuantity) as number | undefined,
    hybridFuelType: (entry.hybrid_fuel_type || rowData.hybridFuelType) as string | undefined,
    hybridFuel: (entry.hybrid_fuel || rowData.hybridFuel) as string | undefined,
    hybridFuelUnit: (entry.hybrid_fuel_unit || rowData.hybridFuelUnit) as string | undefined,
    hybridFuelQuantity:
      (entry.hybrid_fuel_quantity || rowData.hybridFuelQuantity) as number | undefined,
    hybridFuelFactor: (entry.hybrid_fuel_factor || rowData.hybridFuelFactor) as number | undefined,
    hybridFuelEmissions:
      (entry.hybrid_fuel_emissions || rowData.hybridFuelEmissions) as number | undefined,
    hybridTotalKwh: (entry.hybrid_total_kwh || rowData.hybridTotalKwh) as number | undefined,
    hybridGridPct: (entry.hybrid_grid_pct || rowData.hybridGridPct) as number | undefined,
    hybridRenewablePct:
      (entry.hybrid_renewable_pct || rowData.hybridRenewablePct) as number | undefined,
    hybridOtherPct: (entry.hybrid_other_pct || rowData.hybridOtherPct) as number | undefined,
    hybridGridCountry:
      (entry.hybrid_grid_country || rowData.hybridGridCountry) as string | undefined,
    hybridOtherSources:
      (entry.hybrid_other_sources || rowData.hybridOtherSources || []) as PersistedUseOfSoldProductsRow["hybridOtherSources"],
    electricityTotalKwh:
      (entry.electricity_total_kwh || rowData.electricityTotalKwh) as number | undefined,
    electricityGridPct:
      (entry.electricity_grid_pct || rowData.electricityGridPct) as number | undefined,
    electricityRenewablePct:
      (entry.electricity_renewable_pct || rowData.electricityRenewablePct) as number | undefined,
    electricityOtherPct:
      (entry.electricity_other_pct || rowData.electricityOtherPct) as number | undefined,
    electricityGridCountry:
      (entry.electricity_grid_country || rowData.electricityGridCountry) as string | undefined,
    electricityOtherSources:
      (entry.electricity_other_sources || rowData.electricityOtherSources || []) as PersistedUseOfSoldProductsRow["electricityOtherSources"],
    refrigerantType: (entry.refrigerant_type || rowData.refrigerantType) as string | undefined,
    refrigerantFactor: (entry.refrigerant_factor || rowData.refrigerantFactor) as number | undefined,
    coolingRefrigerantQuantity:
      (entry.cooling_refrigerant_quantity || rowData.coolingRefrigerantQuantity) as number | undefined,
    gasMachineryFuelType:
      (entry.gas_machinery_fuel_type || rowData.gasMachineryFuelType) as string | undefined,
    gasMachineryFuel: (entry.gas_machinery_fuel || rowData.gasMachineryFuel) as string | undefined,
    gasMachineryUnit: (entry.gas_machinery_unit || rowData.gasMachineryUnit) as string | undefined,
    gasMachineryQuantity:
      (entry.gas_machinery_quantity || rowData.gasMachineryQuantity) as number | undefined,
    gasMachineryFactor:
      (entry.gas_machinery_factor || rowData.gasMachineryFactor) as number | undefined,
  };
}

function toUsePayload(row: UseOfSoldProductsRow) {
  return {
    processing_activity: row.processingActivity,
    energy_consumption: row.energyConsumption,
    combustion_type: row.combustionType,
    stationary_main_fuel_type: row.stationaryMainFuelType,
    stationary_sub_fuel_type: row.stationarySubFuelType,
    stationary_co2_factor: row.stationaryCo2Factor,
    stationary_unit: row.stationaryUnit,
    stationary_quantity: row.stationaryQuantity,
    mobile_fuel_type: row.mobileFuelType,
    mobile_kg_co2_per_unit: row.mobileKgCo2PerUnit,
    mobile_unit: row.mobileUnit,
    mobile_quantity: row.mobileQuantity,
    hybrid_fuel_type: row.hybridFuelType,
    hybrid_fuel: row.hybridFuel,
    hybrid_fuel_unit: row.hybridFuelUnit,
    hybrid_fuel_quantity: row.hybridFuelQuantity,
    hybrid_fuel_factor: row.hybridFuelFactor,
    hybrid_fuel_emissions: row.hybridFuelEmissions,
    hybrid_total_kwh: row.hybridTotalKwh,
    hybrid_grid_pct: row.hybridGridPct,
    hybrid_renewable_pct: row.hybridRenewablePct,
    hybrid_other_pct: row.hybridOtherPct,
    hybrid_grid_country: row.hybridGridCountry,
    hybrid_other_sources: row.hybridOtherSources || [],
    electricity_total_kwh: row.electricityTotalKwh,
    electricity_grid_pct: row.electricityGridPct,
    electricity_renewable_pct: row.electricityRenewablePct,
    electricity_other_pct: row.electricityOtherPct,
    electricity_grid_country: row.electricityGridCountry,
    electricity_other_sources: row.electricityOtherSources || [],
    refrigerant_type: row.refrigerantType,
    refrigerant_factor: row.refrigerantFactor,
    cooling_refrigerant_quantity: row.coolingRefrigerantQuantity,
    gas_machinery_fuel_type: row.gasMachineryFuelType,
    gas_machinery_fuel: row.gasMachineryFuel,
    gas_machinery_unit: row.gasMachineryUnit,
    gas_machinery_quantity: row.gasMachineryQuantity,
    gas_machinery_factor: row.gasMachineryFactor,
    quantity: row.quantity,
    emissions: row.emissions || 0,
    row_data: row,
  };
}

export async function loadUseOfSoldProductsRows({
  userId,
  companyContext,
  counterpartyId,
}: ScopeParams): Promise<PersistedUseOfSoldProductsRow[]> {
  const data = await listLegacyTableEntries(
    TABLE,
    companyScopedListFilters(userId, !!companyContext, counterpartyId),
  );
  return data.map(mapUseEntry);
}

export async function saveUseOfSoldProductsRows({
  userId,
  companyContext,
  counterpartyId,
  rows,
  existingRows,
}: SaveUseParams): Promise<{
  insertedRows?: PersistedUseOfSoldProductsRow[];
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

  let insertedRows: PersistedUseOfSoldProductsRow[] | undefined;

  if (newEntries.length > 0) {
    const payload = newEntries.map((row) => ({
      user_id: userId,
      counterparty_id: companyContext && counterpartyId ? counterpartyId : null,
      ...toUsePayload(row),
    }));

    const created = await insertLegacyTableEntries(TABLE, payload);

    insertedRows = rows.map((row) => {
      const newEntryIndex = newEntries.findIndex((newEntry) => newEntry.id === row.id);
      if (newEntryIndex >= 0 && created[newEntryIndex]?.id) {
        return { ...row, dbId: created[newEntryIndex].id };
      }
      return row;
    }) as PersistedUseOfSoldProductsRow[];
  }

  if (changedExisting.length > 0) {
    await Promise.all(
      changedExisting.map((row) => {
        const existing = existingRows.find((candidate) => candidate.id === row.id);
        return updateLegacyTableEntry(TABLE, existing!.dbId!, toUsePayload(row));
      })
    );
  }

  return insertedRows ? { insertedRows } : {};
}

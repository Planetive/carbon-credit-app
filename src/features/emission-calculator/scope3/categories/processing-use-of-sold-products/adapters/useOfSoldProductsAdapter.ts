import { supabase } from "@/integrations/supabase/client";
import type {
  PersistedUseOfSoldProductsRow,
  UseOfSoldProductsRow,
} from "../types";

type ScopeParams = {
  userId: string;
  companyContext?: boolean;
  counterpartyId?: string;
};

type SaveUseParams = ScopeParams & {
  rows: UseOfSoldProductsRow[];
  existingRows: PersistedUseOfSoldProductsRow[];
};

function withCounterpartyScope<TQuery>(query: TQuery, companyContext?: boolean, counterpartyId?: string) {
  if (companyContext && counterpartyId) {
    return (query as any).eq("counterparty_id", counterpartyId);
  }

  return (query as any).is("counterparty_id", null);
}

function mapUseEntry(entry: any): PersistedUseOfSoldProductsRow {
  const rowData = entry.row_data || {};
  return {
    id: crypto.randomUUID(),
    dbId: entry.id,
    processingActivity: entry.processing_activity || rowData.processingActivity || "",
    energyConsumption: entry.energy_consumption || rowData.energyConsumption || "",
    quantity: entry.quantity || rowData.quantity,
    emissions: entry.emissions || rowData.emissions,
    combustionType: entry.combustion_type || rowData.combustionType,
    stationaryMainFuelType:
      entry.stationary_main_fuel_type || rowData.stationaryMainFuelType,
    stationarySubFuelType:
      entry.stationary_sub_fuel_type || rowData.stationarySubFuelType,
    stationaryCo2Factor:
      entry.stationary_co2_factor || rowData.stationaryCo2Factor,
    stationaryUnit: entry.stationary_unit || rowData.stationaryUnit,
    stationaryQuantity: entry.stationary_quantity || rowData.stationaryQuantity,
    mobileFuelType: entry.mobile_fuel_type || rowData.mobileFuelType,
    mobileKgCo2PerUnit:
      entry.mobile_kg_co2_per_unit || rowData.mobileKgCo2PerUnit,
    mobileUnit: entry.mobile_unit || rowData.mobileUnit,
    mobileQuantity: entry.mobile_quantity || rowData.mobileQuantity,
    hybridFuelType: entry.hybrid_fuel_type || rowData.hybridFuelType,
    hybridFuel: entry.hybrid_fuel || rowData.hybridFuel,
    hybridFuelUnit: entry.hybrid_fuel_unit || rowData.hybridFuelUnit,
    hybridFuelQuantity:
      entry.hybrid_fuel_quantity || rowData.hybridFuelQuantity,
    hybridFuelFactor: entry.hybrid_fuel_factor || rowData.hybridFuelFactor,
    hybridFuelEmissions:
      entry.hybrid_fuel_emissions || rowData.hybridFuelEmissions,
    hybridTotalKwh: entry.hybrid_total_kwh || rowData.hybridTotalKwh,
    hybridGridPct: entry.hybrid_grid_pct || rowData.hybridGridPct,
    hybridRenewablePct:
      entry.hybrid_renewable_pct || rowData.hybridRenewablePct,
    hybridOtherPct: entry.hybrid_other_pct || rowData.hybridOtherPct,
    hybridGridCountry:
      entry.hybrid_grid_country || rowData.hybridGridCountry,
    hybridOtherSources:
      entry.hybrid_other_sources || rowData.hybridOtherSources || [],
    electricityTotalKwh:
      entry.electricity_total_kwh || rowData.electricityTotalKwh,
    electricityGridPct:
      entry.electricity_grid_pct || rowData.electricityGridPct,
    electricityRenewablePct:
      entry.electricity_renewable_pct || rowData.electricityRenewablePct,
    electricityOtherPct:
      entry.electricity_other_pct || rowData.electricityOtherPct,
    electricityGridCountry:
      entry.electricity_grid_country || rowData.electricityGridCountry,
    electricityOtherSources:
      entry.electricity_other_sources || rowData.electricityOtherSources || [],
    refrigerantType: entry.refrigerant_type || rowData.refrigerantType,
    refrigerantFactor: entry.refrigerant_factor || rowData.refrigerantFactor,
    coolingRefrigerantQuantity:
      entry.cooling_refrigerant_quantity || rowData.coolingRefrigerantQuantity,
    gasMachineryFuelType:
      entry.gas_machinery_fuel_type || rowData.gasMachineryFuelType,
    gasMachineryFuel: entry.gas_machinery_fuel || rowData.gasMachineryFuel,
    gasMachineryUnit: entry.gas_machinery_unit || rowData.gasMachineryUnit,
    gasMachineryQuantity:
      entry.gas_machinery_quantity || rowData.gasMachineryQuantity,
    gasMachineryFactor:
      entry.gas_machinery_factor || rowData.gasMachineryFactor,
  };
}

function toUsePayload(
  row: UseOfSoldProductsRow,
) {
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
  let query = supabase
    .from("scope3_use_of_sold_products" as any)
    .select("*")
    .eq("user_id", userId);

  query = withCounterpartyScope(query, companyContext, counterpartyId);

  const { data, error } = await (query as any).order("created_at", {
    ascending: false,
  });

  if (error) throw error;

  return (data || []).map(mapUseEntry);
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
    const { error } = await supabase
      .from("scope3_use_of_sold_products" as any)
      .delete()
      .in("id", deletedIds);
    if (error) throw error;
  }

  let insertedRows: PersistedUseOfSoldProductsRow[] | undefined;

  if (newEntries.length > 0) {
    const payload = newEntries.map((row) => ({
      user_id: userId,
      counterparty_id: companyContext && counterpartyId ? counterpartyId : null,
      ...toUsePayload(row),
    }));

    const { data, error } = await supabase
      .from("scope3_use_of_sold_products" as any)
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
    }) as PersistedUseOfSoldProductsRow[];
  }

  if (changedExisting.length > 0) {
    const updates = changedExisting.map((row) => {
      const existing = existingRows.find((candidate) => candidate.id === row.id);
      return supabase
        .from("scope3_use_of_sold_products" as any)
        .update(toUsePayload(row))
        .eq("id", existing!.dbId!);
    });
    const results = await Promise.all(updates);
    const updateError = results.find((result) => (result as any).error)?.error;
    if (updateError) throw updateError;
  }

  return insertedRows ? { insertedRows } : {};
}

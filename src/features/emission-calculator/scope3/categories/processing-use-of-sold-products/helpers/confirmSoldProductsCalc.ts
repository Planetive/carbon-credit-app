import {
  resolveSoldProductsElectricityKg,
  resolveSoldProductsQtyFactorKg,
} from "@/api/calcConnection";
import { SCOPE2_FACTORS } from "@/components/emissions/shared/EmissionFactors";
import type {
  GridCountry,
  OtherSourceRow,
  ProcessingSoldProductsRow,
  UseOfSoldProductsRow,
} from "../types";

const gridFactor = (country?: GridCountry) =>
  country ? SCOPE2_FACTORS.GridCountries?.[country] : undefined;

async function qtyFactorKg(
  quantity?: number,
  factor?: number
): Promise<number | undefined> {
  if (typeof quantity !== "number" || typeof factor !== "number") return undefined;
  return resolveSoldProductsQtyFactorKg({ quantity, factor });
}

async function electricityKg(opts: {
  total_kwh?: number;
  grid_pct?: number;
  grid_factor?: number;
  other_pct?: number;
  other_sources?: OtherSourceRow[];
}): Promise<number | undefined> {
  if (!opts.total_kwh) return undefined;
  const sumOther = (opts.other_sources || []).reduce(
    (s, r) => s + (r.emissions || 0),
    0
  );
  return resolveSoldProductsElectricityKg({
    total_kwh: opts.total_kwh,
    grid_pct: opts.grid_pct,
    grid_factor: opts.grid_factor,
    other_pct: opts.other_pct,
    other_row_emissions_sum: sumOther,
  });
}

/** Confirm processing-of-sold-products row via qty-factor + electricity calc APIs. */
export async function confirmProcessingRowKg(
  row: ProcessingSoldProductsRow
): Promise<number | undefined> {
  let fuelKg: number | undefined;
  if (row.processingActivity === "Heating, melting, smelting") {
    if (row.combustionType === "stationary") {
      fuelKg = await qtyFactorKg(row.quantity, row.stationaryCo2Factor);
    } else if (row.combustionType === "mobile") {
      fuelKg = await qtyFactorKg(row.quantity, row.mobileKgCo2PerUnit);
    }
  } else if (row.processingActivity === "Drying / Curing / Kilns") {
    fuelKg = await qtyFactorKg(row.quantity, row.heatSteamKgCo2e);
  } else {
    fuelKg = await qtyFactorKg(row.quantity, row.factor);
  }

  const elecKg = await electricityKg({
    total_kwh: row.totalKwh,
    grid_pct: row.gridPct,
    grid_factor: gridFactor(row.gridCountry),
    other_pct: row.otherPct,
    other_sources: row.otherSources,
  });

  if (fuelKg === undefined && elecKg === undefined) return undefined;
  return Number(((fuelKg ?? 0) + (elecKg ?? 0)).toFixed(6));
}

/** Confirm use-of-sold-products row via qty-factor + electricity calc APIs. */
export async function confirmUseRowKg(
  row: UseOfSoldProductsRow
): Promise<number | undefined> {
  const activity = row.processingActivity;

  if (
    activity === "Internal combustion engine vehicles (cars, trucks, bikes)"
  ) {
    const stationary = await qtyFactorKg(
      row.stationaryQuantity,
      row.stationaryCo2Factor
    );
    const mobile = await qtyFactorKg(row.mobileQuantity, row.mobileKgCo2PerUnit);
    if (stationary === undefined && mobile === undefined) return undefined;
    return Number(((stationary ?? 0) + (mobile ?? 0)).toFixed(6));
  }

  if (
    activity === "Sold fuels (LPG, petrol, diesel)" ||
    activity === "Boilers, stoves, heaters (gas-based)"
  ) {
    if (row.combustionType === "stationary") {
      return qtyFactorKg(row.quantity, row.stationaryCo2Factor);
    }
    if (row.combustionType === "mobile") {
      return qtyFactorKg(row.quantity, row.mobileKgCo2PerUnit);
    }
    return undefined;
  }

  if (activity === "Hybrid vehicles") {
    const fuelKg = await qtyFactorKg(row.hybridFuelQuantity, row.hybridFuelFactor);
    const elecKg = await electricityKg({
      total_kwh: row.hybridTotalKwh,
      grid_pct: row.hybridGridPct,
      grid_factor: gridFactor(row.hybridGridCountry),
      other_pct: row.hybridOtherPct,
      other_sources: row.hybridOtherSources,
    });
    if (fuelKg === undefined && elecKg === undefined) return undefined;
    return Number(((fuelKg ?? 0) + (elecKg ?? 0)).toFixed(6));
  }

  if (
    activity === "Electronics (laptops, TVs, phones)" ||
    activity === "Electric machinery/equipment" ||
    activity === "Batteries" ||
    activity === "Water-using devices" ||
    activity === "Electric vehicles (cars, 2-wheelers, buses)" ||
    activity === "Home appliances (ACs, fridges, fans, microwaves)"
  ) {
    return electricityKg({
      total_kwh: row.electricityTotalKwh,
      grid_pct: row.electricityGridPct,
      grid_factor: gridFactor(row.electricityGridCountry),
      other_pct: row.electricityOtherPct,
      other_sources: row.electricityOtherSources,
    });
  }

  if (activity === "Refrigerants sold") {
    return qtyFactorKg(row.quantity, row.refrigerantFactor);
  }

  if (activity === "Cooling products (AC, refrigeration)") {
    const elecKg = await electricityKg({
      total_kwh: row.electricityTotalKwh,
      grid_pct: row.electricityGridPct,
      grid_factor: gridFactor(row.electricityGridCountry),
      other_pct: row.electricityOtherPct,
      other_sources: row.electricityOtherSources,
    });
    const refrigKg = await qtyFactorKg(
      row.coolingRefrigerantQuantity,
      row.refrigerantFactor
    );
    if (elecKg === undefined && refrigKg === undefined) return undefined;
    return Number(((elecKg ?? 0) + (refrigKg ?? 0)).toFixed(6));
  }

  if (activity === "Gas-fired industrial machinery sold") {
    return qtyFactorKg(row.gasMachineryQuantity, row.gasMachineryFactor);
  }

  return undefined;
}

export async function confirmOtherSourceKg(
  source: OtherSourceRow
): Promise<number | undefined> {
  return qtyFactorKg(source.quantity, source.factor);
}

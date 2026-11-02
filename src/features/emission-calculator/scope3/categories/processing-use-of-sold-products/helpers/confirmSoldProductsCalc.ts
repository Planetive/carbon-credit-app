import {
  resolveSoldProductsElectricityKg,
  resolveSoldProductsQtyFactorKg,
} from "@/api/calcConnection";
import { isRejectedScope3GridPlaceholder } from "@/lib/emissions/scope3FactorUnits";
import { SCOPE2_FACTORS } from "@/components/emissions/shared/EmissionFactors";
import type {
  GridCountry,
  OtherSourceRow,
  ProcessingSoldProductsRow,
  UseOfSoldProductsRow,
} from "../types";

/** Legacy UAE/Pakistan placeholders — never treat as verified for Scope 3. */
const legacyGridFactor = (country?: GridCountry) =>
  country ? SCOPE2_FACTORS.GridCountries?.[country] : undefined;

function verifiedGridFactor(country?: GridCountry): number | undefined {
  const factor = legacyGridFactor(country);
  if (factor == null || isRejectedScope3GridPlaceholder(factor)) return undefined;
  return factor;
}

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
  // Refuse legacy other×kWh mixing and placeholder/missing grid factors.
  if (opts.other_pct != null && opts.other_pct > 0) return undefined;
  if ((opts.other_sources || []).some((r) => (r.emissions || 0) !== 0)) {
    return undefined;
  }
  if (opts.grid_factor == null || isRejectedScope3GridPlaceholder(opts.grid_factor)) {
    return undefined;
  }
  const kg = await resolveSoldProductsElectricityKg({
    total_kwh: opts.total_kwh,
    grid_pct: opts.grid_pct,
    grid_factor: opts.grid_factor,
    other_pct: undefined,
    other_row_emissions_sum: undefined,
  });
  return kg ?? undefined;
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
    grid_factor: verifiedGridFactor(row.gridCountry),
    other_pct: row.otherPct,
    other_sources: row.otherSources,
  });

  if (fuelKg === undefined && elecKg === undefined) return undefined;
  // If electricity was requested but blocked, do not mix a partial misleading total.
  if (row.totalKwh && row.totalKwh > 0 && elecKg === undefined) {
    if (fuelKg === undefined) return undefined;
    // Fuel-only path still valid when electricity cannot be verified.
    return Number(fuelKg.toFixed(6));
  }
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
      grid_factor: verifiedGridFactor(row.hybridGridCountry),
      other_pct: row.hybridOtherPct,
      other_sources: row.hybridOtherSources,
    });
    if (row.hybridTotalKwh && row.hybridTotalKwh > 0 && elecKg === undefined) {
      return undefined;
    }
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
      grid_factor: verifiedGridFactor(row.electricityGridCountry),
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
      grid_factor: verifiedGridFactor(row.electricityGridCountry),
      other_pct: row.electricityOtherPct,
      other_sources: row.electricityOtherSources,
    });
    const refrigKg = await qtyFactorKg(
      row.coolingRefrigerantQuantity,
      row.refrigerantFactor
    );
    if (row.electricityTotalKwh && row.electricityTotalKwh > 0 && elecKg === undefined) {
      // Electricity blocked — refrigerant-only only if no kWh requested path needed
      return refrigKg;
    }
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

import type { EmissionData } from "@/components/emissions/shared/types";
import type {
  ProcessingSoldProductsRow,
  UseOfSoldProductsRow,
} from "../types";

type Scope3EmissionEntry = EmissionData["scope3"][number];

export function mapProcessingSoldProductsRowToEntry(
  row: ProcessingSoldProductsRow,
): Scope3EmissionEntry | null {
  if (!row.processingActivity) return null;

  const hasCombustion =
    row.processingActivity === "Heating, melting, smelting" &&
    row.combustionType &&
    typeof row.quantity === "number" &&
    row.quantity > 0 &&
    ((row.combustionType === "stationary" &&
      row.stationaryCo2Factor !== undefined) ||
      (row.combustionType === "mobile" &&
        row.mobileKgCo2PerUnit !== undefined));

  const hasHeatSteam =
    row.processingActivity === "Drying / Curing / Kilns" &&
    row.heatSteamType &&
    typeof row.quantity === "number" &&
    row.quantity > 0 &&
    row.heatSteamKgCo2e !== undefined;

  const hasFuel =
    !!row.type &&
    !!row.fuel &&
    !!row.unit &&
    typeof row.quantity === "number" &&
    row.quantity > 0;

  const hasElectricity =
    typeof row.totalKwh === "number" && row.totalKwh > 0;

  if (!hasCombustion && !hasHeatSteam && !hasFuel && !hasElectricity) {
    return null;
  }

  let unit = "entry";
  let quantity = 1;

  if (hasCombustion) {
    if (row.combustionType === "stationary") {
      unit = row.stationaryUnit || "entry";
      quantity = row.quantity || 1;
    } else if (row.combustionType === "mobile") {
      unit = row.mobileUnit || "entry";
      quantity = row.quantity || 1;
    }
  } else if (hasHeatSteam) {
    unit = row.heatSteamUnit || "kWh";
    quantity = row.quantity || 1;
  } else if (hasFuel) {
    unit = row.unit || "entry";
    quantity = row.quantity || 1;
  } else if (hasElectricity) {
    unit = "kWh";
    quantity = row.totalKwh || 1;
  }

  return {
    id: row.id,
    category: "processing_sold_products",
    activity: row.processingActivity,
    unit,
    quantity,
    emissions: row.emissions || 0,
  };
}

export function mapUseOfSoldProductsRowToEntry(
  row: UseOfSoldProductsRow,
): Scope3EmissionEntry | null {
  if (!row.processingActivity) return null;

  const hasCombustion =
    row.processingActivity ===
      "Internal combustion engine vehicles (cars, trucks, bikes)" &&
    ((typeof row.stationaryQuantity === "number" &&
      row.stationaryQuantity > 0 &&
      row.stationaryCo2Factor !== undefined) ||
      (typeof row.mobileQuantity === "number" &&
        row.mobileQuantity > 0 &&
        row.mobileKgCo2PerUnit !== undefined));

  const hasHybridFuel =
    row.processingActivity === "Hybrid vehicles" &&
    row.hybridFuelType &&
    row.hybridFuel &&
    row.hybridFuelUnit &&
    typeof row.hybridFuelQuantity === "number" &&
    row.hybridFuelQuantity > 0 &&
    row.hybridFuelFactor !== undefined;

  const hasHybridElectricity =
    row.processingActivity === "Hybrid vehicles" &&
    typeof row.hybridTotalKwh === "number" &&
    row.hybridTotalKwh > 0;

  const hasOtherData =
    row.energyConsumption && row.energyConsumption.trim() !== "";

  if (!hasCombustion && !hasHybridFuel && !hasHybridElectricity && !hasOtherData) {
    return null;
  }

  let unit = "entry";
  let quantity = 1;

  if (hasCombustion) {
    if (typeof row.stationaryQuantity === "number" && row.stationaryQuantity > 0) {
      unit = row.stationaryUnit || "entry";
      quantity = row.stationaryQuantity || 1;
    } else if (
      typeof row.mobileQuantity === "number" &&
      row.mobileQuantity > 0
    ) {
      unit = row.mobileUnit || "entry";
      quantity = row.mobileQuantity || 1;
    }
  } else if (hasHybridFuel) {
    unit = row.hybridFuelUnit || "entry";
    quantity = row.hybridFuelQuantity || 1;
  } else if (hasHybridElectricity) {
    unit = "kWh";
    quantity = row.hybridTotalKwh || 1;
  } else {
    unit = "entry";
    quantity = row.quantity || 1;
  }

  return {
    id: row.id,
    category: "use_of_sold_products",
    activity: row.processingActivity,
    unit,
    quantity,
    emissions: row.emissions || 0,
  };
}

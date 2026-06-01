import type { FuelType } from "@/components/emissions/shared/types";

export type ProductType = "intermediate" | "final";
export type GridCountry = "UAE" | "Pakistan";

export interface OtherSourceRow {
  id: string;
  type?: FuelType;
  fuel?: string;
  unit?: string;
  quantity?: number;
  factor?: number;
  emissions?: number;
}

export interface ProcessingSoldProductsRow {
  id: string;
  processingActivity: string;
  factorType?: "fuel" | "electricity";
  combustionType?: "stationary" | "mobile";
  stationaryMainFuelType?: string;
  stationarySubFuelType?: string;
  stationaryCo2Factor?: number;
  stationaryUnit?: string;
  mobileFuelType?: string;
  mobileKgCo2PerUnit?: number;
  mobileUnit?: string;
  heatSteamStandard?: "UK" | "EBT";
  heatSteamType?: string;
  heatSteamKgCo2e?: number;
  heatSteamUnit?: string;
  type?: FuelType;
  fuel?: string;
  unit?: string;
  quantity?: number;
  factor?: number;
  emissions?: number;
  totalKwh?: number;
  gridPct?: number;
  renewablePct?: number;
  otherPct?: number;
  gridCountry?: GridCountry;
  otherSources?: OtherSourceRow[];
}

export interface UseOfSoldProductsRow {
  id: string;
  processingActivity: string;
  energyConsumption: string;
  quantity: number | undefined;
  emissions: number | undefined;
  combustionType?: "stationary" | "mobile";
  stationaryMainFuelType?: string;
  stationarySubFuelType?: string;
  stationaryCo2Factor?: number;
  stationaryUnit?: string;
  stationaryQuantity?: number;
  mobileFuelType?: string;
  mobileKgCo2PerUnit?: number;
  mobileUnit?: string;
  mobileQuantity?: number;
  hybridFuelType?: FuelType;
  hybridFuel?: string;
  hybridFuelUnit?: string;
  hybridFuelQuantity?: number;
  hybridFuelFactor?: number;
  hybridFuelEmissions?: number;
  hybridTotalKwh?: number;
  hybridGridPct?: number;
  hybridRenewablePct?: number;
  hybridOtherPct?: number;
  hybridGridCountry?: GridCountry;
  hybridOtherSources?: OtherSourceRow[];
  electricityTotalKwh?: number;
  electricityGridPct?: number;
  electricityRenewablePct?: number;
  electricityOtherPct?: number;
  electricityGridCountry?: GridCountry;
  electricityOtherSources?: OtherSourceRow[];
  refrigerantType?: string;
  refrigerantFactor?: number;
  coolingRefrigerantQuantity?: number;
  gasMachineryFuelType?: FuelType;
  gasMachineryFuel?: string;
  gasMachineryUnit?: string;
  gasMachineryQuantity?: number;
  gasMachineryFactor?: number;
}

export type PersistedProcessingSoldProductsRow = ProcessingSoldProductsRow & {
  dbId?: string;
};

export type PersistedUseOfSoldProductsRow = UseOfSoldProductsRow & {
  dbId?: string;
};

export type StationaryCombustionRow = {
  id: string | number;
  "Main Fuel Type": string;
  "Sub Fuel Type": string;
  "CO2 Factor": number;
  "Units": string;
};

export type MobileCombustionRow = {
  id: string | number;
  FuelType: string;
  "kg CO2 per unit": number;
  Unit: string;
};

export type HeatSteamRow = {
  id: string | number;
  Type: string;
  Unit: string;
  "kg CO₂e": number;
};

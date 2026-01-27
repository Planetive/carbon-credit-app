import { Supplier } from "../types";
import { DisposalMethod } from "../wasteTypes";
import { FuelType } from "../../shared/types";

// Row-based state interfaces for all Scope 3 categories

export interface ProcessingSoldProductsRow {
  id: string;
  processingActivity: string;
  factorType?: 'fuel' | 'electricity';
  // Combustion type for "Heating, melting, smelting" activity
  combustionType?: 'stationary' | 'mobile';
  // Stationary Combustion fields (when combustionType is 'stationary')
  stationaryMainFuelType?: string;
  stationarySubFuelType?: string;
  stationaryCo2Factor?: number;
  stationaryUnit?: string;
  // Mobile Combustion fields (when combustionType is 'mobile')
  mobileFuelType?: string;
  mobileKgCo2PerUnit?: number;
  mobileUnit?: string;
  // Heat and Steam fields (for "Drying / Curing / Kilns" activity)
  heatSteamStandard?: 'UK' | 'EBT'; // Standard selection (UK or EBT)
  heatSteamType?: string; // 'Onsite heat and steam' | 'District heat and steam'
  heatSteamKgCo2e?: number;
  heatSteamUnit?: string;
  // Fuel-related fields (only when factorType is 'fuel' and not using combustion tables)
  type?: FuelType;
  fuel?: string;
  unit?: string;
  quantity?: number;
  factor?: number;
  emissions?: number;
  // Electricity-related fields (only when factorType is 'electricity')
  totalKwh?: number;
  gridPct?: number;
  renewablePct?: number;
  otherPct?: number;
  gridCountry?: 'UAE' | 'Pakistan';
  // Other sources for electricity
  otherSources?: Array<{
    id: string;
    type?: FuelType;
    fuel?: string;
    unit?: string;
    quantity?: number;
    factor?: number;
    emissions?: number;
  }>;
}

export interface UseOfSoldProductsRow {
  id: string;
  processingActivity: string;
  energyConsumption: string;
  quantity: number | undefined;
  emissions: number | undefined;
  // Combustion type for "Internal combustion engine vehicles (cars, trucks, bikes)" activity
  combustionType?: 'stationary' | 'mobile';
  // Stationary Combustion fields (when combustionType is 'stationary')
  stationaryMainFuelType?: string;
  stationarySubFuelType?: string;
  stationaryCo2Factor?: number;
  stationaryUnit?: string;
  stationaryQuantity?: number;
  // Mobile Combustion fields (when combustionType is 'mobile')
  mobileFuelType?: string;
  mobileKgCo2PerUnit?: number;
  mobileUnit?: string;
  mobileQuantity?: number;
  // Fuel fields for "Hybrid vehicles" - Scope 1 style
  hybridFuelType?: FuelType;
  hybridFuel?: string;
  hybridFuelUnit?: string;
  hybridFuelQuantity?: number;
  hybridFuelFactor?: number;
  hybridFuelEmissions?: number;
  // Electricity fields for "Hybrid vehicles" - Scope 2 style
  hybridTotalKwh?: number;
  hybridGridPct?: number;
  hybridRenewablePct?: number;
  hybridOtherPct?: number;
  hybridGridCountry?: 'UAE' | 'Pakistan';
  hybridOtherSources?: Array<{
    id: string;
    type?: FuelType;
    fuel?: string;
    unit?: string;
    quantity?: number;
    factor?: number;
    emissions?: number;
  }>;
  // Electricity fields for "Electronics", "Electric machinery/equipment", "Batteries", "Water-using devices" - Scope 2 style
  electricityTotalKwh?: number;
  electricityGridPct?: number;
  electricityRenewablePct?: number;
  electricityOtherPct?: number;
  electricityGridCountry?: 'UAE' | 'Pakistan';
  electricityOtherSources?: Array<{
    id: string;
    type?: FuelType;
    fuel?: string;
    unit?: string;
    quantity?: number;
    factor?: number;
    emissions?: number;
  }>;
  // Refrigerant fields for "Refrigerants sold" - Scope 1 style
  refrigerantType?: string;
  refrigerantFactor?: number;
  // Refrigerant quantity for "Cooling products (AC, refrigeration)" - separate from electricity
  coolingRefrigerantQuantity?: number;
  // Fuel fields for "Gas-fired industrial machinery sold" - Scope 1 style
  gasMachineryFuelType?: FuelType;
  gasMachineryFuel?: string;
  gasMachineryUnit?: string;
  gasMachineryQuantity?: number;
  gasMachineryFactor?: number;
}

export interface PurchasedGoodsRow {
  id: string;
  dbId?: string;
  isExisting?: boolean;
  supplier: Supplier | null;
  amountSpent: number | undefined;
  emissions: number | undefined;
}

export interface CapitalGoodsRow {
  id: string;
  dbId?: string;
  isExisting?: boolean;
  supplier: Supplier | null;
  amount: number | undefined;
  emissions: number | undefined;
}

export interface UpstreamTransportRow {
  id: string;
  dbId?: string;
  isExisting?: boolean;
  vehicleTypeId: string;
  distance: number | undefined;
  weight: number | undefined;
  emissions: number | undefined;
}

export interface DownstreamTransportRow {
  id: string;
  // Database id can be string (UUID) or number depending on table definition
  dbId?: string | number;
  isExisting?: boolean;
  vehicleTypeId: string;
  distance: number | undefined;
  weight: number | undefined;
  emissions: number | undefined;
}

export interface WasteGeneratedRow {
  id: string;
  dbId?: string | number;
  isExisting?: boolean;
  materialId: string;
  volume: number | undefined;
  disposalMethod: DisposalMethod | "";
  emissions: number | undefined;
}

export interface BusinessTravelRow {
  id: string;
  dbId?: string | number;
  isExisting?: boolean;
  travelTypeId: string;
  distance: number | undefined;
  emissions: number | undefined;
}

export interface EmployeeCommutingRow {
  id: string;
  dbId?: string | number;
  isExisting?: boolean;
  travelTypeId: string;
  distance: number | undefined;
  employees: number | undefined;
  emissions: number | undefined;
}

export interface InvestmentRow {
  id: string;
  dbId?: string;
  isExisting?: boolean;
  companyName: string;
  emissions: number | undefined;
  percentage: number | undefined;
  calculatedEmissions: number | undefined;
}

export interface EndOfLifeRow {
  id: string;
  dbId?: string | number;
  isExisting?: boolean;
  materialId: string;
  volume: number | undefined;
  disposalMethod: DisposalMethod | "";
  recycle: number | undefined;
  composition: string;
  emissions: number | undefined;
}

export interface FuelEnergyRow {
  id: string;
  dbId?: string;
  isExisting?: boolean;
  extraction: string;
  distance: number | undefined;
  refining: string;
}

export interface OtherSourceRow {
  id: string;
  type?: FuelType;
  fuel?: string;
  unit?: string;
  quantity?: number;
  factor?: number;
  emissions?: number;
}

export interface TransportRow {
  id: string;
  activity?: string;
  vehicleTypeName?: string;
  unit?: string;
  distance?: number;
  factor?: number;
  emissions?: number;
}

export interface RefrigerantRow {
  id: string;
  refrigerantType?: string;
  quantity?: number;
  factor?: number;
  emissions?: number;
}


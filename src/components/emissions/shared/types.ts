// Shared types for emission calculations

// FuelType is used for grouping fuels in Scope 1 (and some Scope 2 "other
// sources"). Originally we only had UK-style groups (e.g. "Gaseous fuels"),
// but we now also support EPA-style categories coming from Supabase (e.g.
// "Coal and Coke", "Natural Gas", "Petroleum Products", etc.).
// Keep this as a union of known values for type-safety, but it is OK if the
// backend returns additional categories – the UI will still render them.
export type FuelType =
  | "Gaseous fuels"
  | "Liquid fuels"
  | "Solid fuels"
  | "Biofuel"
  | "Biomass"
  | "Biogas"
  | "Other Fuels - Solid"
  | "Biomass Fuels - Solid"
  // EPA-style groups used in the `Fuel EPA` reference table
  | "Coal and Coke"
  | "Natural Gas"
  | "Other Fuels - Gaseous"
  | "Biomass Fuels - Gaseous"
  | "Petroleum Products"
  | "Biomass Fuels - Liquid"
  | "Biomass Fuels - Kraft Pulping Liquor, by Wood Furnish";

export interface FuelRow {
  id: string;
  type?: FuelType;
  fuel?: string;
  unit?: string;
  quantity?: number;
  factor?: number;
  emissions?: number;
  isExisting?: boolean;
  dbId?: string;
}

export interface RefrigerantRow {
  id: string;
  refrigerantType?: string;
  quantity?: number;
  factor?: number;
  emissions?: number;
  isExisting?: boolean;
  dbId?: string;
}

export interface VehicleRow {
  id: string;
  activity?: string;
  vehicleType?: string;
  unit?: string;
  distance?: number;
  factor?: number;
  emissions?: number;
  isExisting?: boolean;
  dbId?: string;
}

export interface DeliveryVehicleRow {
  id: string;
  activity?: string;
  vehicleType?: string;
  unit?: string;
  distance?: number;
  factor?: number;
  emissions?: number;
  isExisting?: boolean;
  dbId?: string;
}

// Placeholder interfaces for future scopes
export interface Scope2Row {
  id: string;
  category?: string;
  source?: string;
  unit?: string;
  consumption?: number;
  factor?: number;
  emissions?: number;
  isExisting?: boolean;
  dbId?: string;
}

// Scope 2 - Electricity specific structures
export interface Scope2ElectricityMain {
  id?: string;
  totalKwh: number;
  gridPct?: number;
  renewablePct?: number;
  otherPct?: number;
  calculatedEmissionsTco2e?: number;
}

export type Scope2OtherFuelType = FuelType;

export interface Scope2OtherSourceRow {
  id: string;
  dbId?: string; // subanswer id
  type?: Scope2OtherFuelType;
  fuel?: string;
  unit?: string;
  quantity?: number;
  factor?: number;
  emissions?: number;
}

export interface Scope3Row {
  id: string;
  category?: string;
  activity?: string;
  unit?: string;
  quantity?: number;
  factor?: number;
  emissions?: number;
  isExisting?: boolean;
  dbId?: string;
}

export interface EmissionData {
  scope1: {
    fuel: FuelRow[];
    refrigerant: RefrigerantRow[];
    passengerVehicle: VehicleRow[];
    deliveryVehicle: DeliveryVehicleRow[];
  };
  scope2: Scope2Row[];
  scope3: Scope3Row[];
}

export interface ScopeTotals {
  scope1: number;
  scope2: number;
  scope3: number;
  total: number;
}

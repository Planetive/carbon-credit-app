import { Supplier } from "../types";
import { DisposalMethod } from "../wasteTypes";
import { FuelType } from "../../shared/types";

// Row-based state interfaces for all Scope 3 categories

export interface ProcessingSoldProductsRow {
  id: string;
  processingActivity: string;
  factorType?: 'fuel' | 'electricity';
  // Fuel-related fields (only when factorType is 'fuel')
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


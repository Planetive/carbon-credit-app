import type {
  BusinessTravelRow,
  DownstreamTransportRow,
  EmployeeCommutingRow,
  EndOfLifeRow,
  UpstreamTransportRow,
  WasteGeneratedRow,
} from "./types/scope3Types";
export {
  createProcessingRow,
  createUseRow,
} from "@/features/emission-calculator/scope3/categories/processing-use-of-sold-products/rowFactories";

const rowId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random()}`;

export const createUpstreamTransportRow = (): UpstreamTransportRow => ({
  id: rowId("ut"),
  vehicleTypeId: "",
  distance: undefined,
  weight: undefined,
  emissions: undefined,
});

export const createDownstreamTransportRow = (): DownstreamTransportRow => ({
  id: rowId("dt"),
  vehicleTypeId: "",
  distance: undefined,
  weight: undefined,
  emissions: undefined,
});

export const createWasteGeneratedRow = (): WasteGeneratedRow => ({
  id: rowId("wg"),
  materialId: "",
  volume: undefined,
  disposalMethod: "",
  emissions: undefined,
});

export const createBusinessTravelRow = (): BusinessTravelRow => ({
  id: rowId("bt"),
  travelTypeId: "",
  distance: undefined,
  emissions: undefined,
});

export const createEmployeeCommutingRow = (): EmployeeCommutingRow => ({
  id: rowId("ec"),
  travelTypeId: "",
  distance: undefined,
  employees: undefined,
  emissions: undefined,
});

export const createEndOfLifeRow = (): EndOfLifeRow => ({
  id: rowId("eol"),
  materialId: "",
  volume: undefined,
  disposalMethod: "",
  recycle: undefined,
  composition: "",
  emissions: undefined,
});

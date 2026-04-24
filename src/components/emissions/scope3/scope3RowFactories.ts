import type {
  BusinessTravelRow,
  DownstreamTransportRow,
  EmployeeCommutingRow,
  EndOfLifeRow,
  ProcessingSoldProductsRow,
  UpstreamTransportRow,
  UseOfSoldProductsRow,
  WasteGeneratedRow,
} from "./types/scope3Types";

const rowId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random()}`;

export const createProcessingRow = (): ProcessingSoldProductsRow => ({
  id: rowId("psp"),
  processingActivity: "",
  factorType: undefined,
  combustionType: undefined,
  stationaryMainFuelType: undefined,
  stationarySubFuelType: undefined,
  stationaryCo2Factor: undefined,
  stationaryUnit: undefined,
  mobileFuelType: undefined,
  mobileKgCo2PerUnit: undefined,
  mobileUnit: undefined,
  heatSteamStandard: undefined,
  heatSteamType: undefined,
  heatSteamKgCo2e: undefined,
  heatSteamUnit: undefined,
  type: undefined,
  fuel: undefined,
  unit: undefined,
  quantity: undefined,
  factor: undefined,
  emissions: undefined,
  totalKwh: undefined,
  gridPct: undefined,
  renewablePct: undefined,
  otherPct: undefined,
  gridCountry: undefined,
  otherSources: [],
});

export const createUseRow = (): UseOfSoldProductsRow => ({
  id: rowId("usp"),
  processingActivity: "",
  energyConsumption: "",
  quantity: undefined,
  emissions: undefined,
  combustionType: undefined,
  stationaryMainFuelType: undefined,
  stationarySubFuelType: undefined,
  stationaryCo2Factor: undefined,
  stationaryUnit: undefined,
  mobileFuelType: undefined,
  mobileKgCo2PerUnit: undefined,
  mobileUnit: undefined,
  stationaryQuantity: undefined,
  mobileQuantity: undefined,
  hybridFuelType: undefined,
  hybridFuel: undefined,
  hybridFuelUnit: undefined,
  hybridFuelQuantity: undefined,
  hybridFuelFactor: undefined,
  hybridFuelEmissions: undefined,
  hybridTotalKwh: undefined,
  hybridGridPct: undefined,
  hybridRenewablePct: undefined,
  hybridOtherPct: undefined,
  hybridGridCountry: undefined,
  hybridOtherSources: [],
  electricityTotalKwh: undefined,
  electricityGridPct: undefined,
  electricityRenewablePct: undefined,
  electricityOtherPct: undefined,
  electricityGridCountry: undefined,
  electricityOtherSources: [],
  refrigerantType: undefined,
  refrigerantFactor: undefined,
  coolingRefrigerantQuantity: undefined,
  gasMachineryFuelType: undefined,
  gasMachineryFuel: undefined,
  gasMachineryUnit: undefined,
  gasMachineryQuantity: undefined,
  gasMachineryFactor: undefined,
});

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

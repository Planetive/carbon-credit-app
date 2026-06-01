import type { TopicFileMeta } from "../shared/fileMeta";

export const AIR_FUEL_TYPES = ["Natural gas", "Diesel", "HFO", "Propane", "LPG"] as const;
export type AirFuelType = (typeof AIR_FUEL_TYPES)[number];

/** Fixed workbook units only — no free text. */
export const AIR_FUEL_UNITS = ["m3_day", "litres_day", "GJ"] as const;
export type AirFuelConsumptionUnit = (typeof AIR_FUEL_UNITS)[number];

export const AIR_FUEL_UNIT_LABELS: Record<AirFuelConsumptionUnit, string> = {
  m3_day: "m³/day",
  litres_day: "litres/day",
  GJ: "GJ",
};

export type AirPollutantKey = "NOx" | "SOx" | "VOC" | "PM10" | "H2S";

export type AirFuelRow = {
  id: string;
  fuelType: AirFuelType;
  consumption: string;
  unit: AirFuelConsumptionUnit;
  h2sPct: string;
  totalSulfurPct: string;
};

export type AirEquipmentKind = "engine" | "compressor" | "heater";

export type AirEquipmentRow = {
  id: string;
  kind: AirEquipmentKind;
  kW: string;
  count: string;
};

export type AirLdarRow = {
  id: string;
  componentType: string;
  screenPpmv: string;
  leakStatus: string;
};

export type AirStackPollutant = "NOx" | "SOx" | "VOC" | "PM10" | "H2S";

export type AirStackTestRow = {
  id: string;
  pollutant: AirStackPollutant;
  value: string;
  unit: "lb_MMBtu" | "g_kWh";
};

export type AirAnnualMetricsMt = Partial<Record<AirPollutantKey, string>>;

export type AirQualityAssetData = {
  annualMetricsMt: AirAnnualMetricsMt;
  fuelRows: AirFuelRow[];
  equipmentRows: AirEquipmentRow[];
  ldarRows: AirLdarRow[];
  ldarFilesMeta: TopicFileMeta[];
  stackTestRows: AirStackTestRow[];
  stackTestFilesMeta: TopicFileMeta[];
};

export type AirQualityStoreV1 = {
  version: 1;
  periodKey: string;
  byAssetId: Record<string, AirQualityAssetData>;
};

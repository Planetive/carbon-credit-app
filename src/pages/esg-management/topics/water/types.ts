import type { TopicFileMeta } from "../shared/fileMeta";

export type WaterFreshSourceType = "river_lake" | "groundwater" | "municipal" | "recycled";

export const WATER_FRESH_SOURCE_LABELS: Record<WaterFreshSourceType, string> = {
  river_lake: "River / lake",
  groundwater: "Groundwater",
  municipal: "Municipal supply",
  recycled: "Recycled",
};

export type WaterFreshRow = {
  id: string;
  sourceType: WaterFreshSourceType;
  volumeM3PerMonth: string;
};

export type WaterDisposalPct = {
  injected: string;
  recycled: string;
  discharged: string;
  evaporationPond: string;
};

export type WaterSwdRow = {
  id: string;
  wellId: string;
  volumeInjected: string;
  formation: string;
};

export type WaterHfWell = {
  id: string;
  wellId: string;
  disclosureSubmitted: boolean;
  registryLink: string;
};

export type WaterAssetData = {
  freshwaterRows: WaterFreshRow[];
  returnedDischargedM3PerMonth: string;
  producedGenerated: string;
  producedUnit: "m3_month" | "bbl_month";
  disposalPct: WaterDisposalPct;
  swdRows: WaterSwdRow[];
  hfWells: WaterHfWell[];
  waterStressSharePct: string;
  hfSitesDeterioratedWaterQualityPct: string;
  groundwaterFilesMeta: TopicFileMeta[];
};

export type WaterStoreV1 = {
  version: 1;
  periodKey: string;
  byAssetId: Record<string, WaterAssetData>;
};

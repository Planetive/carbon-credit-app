import type { BoundaryDraftV2 } from "../../boundary/boundaryTypes";
import { loadBoundaryDraft } from "../../boundary/storage";
import { periodKeyFromDraft } from "../shared/periodUtils";
import type { AirQualityAssetData, AirQualityStoreV1 } from "./types";

const STORAGE_KEY = "esg_topic_air_quality_v1";

export function defaultAirQualityAssetData(): AirQualityAssetData {
  return {
    annualMetricsMt: {},
    fuelRows: [],
    equipmentRows: [],
    ldarRows: [],
    ldarFilesMeta: [],
    stackTestRows: [],
    stackTestFilesMeta: [],
  };
}

function normalizeStore(raw: unknown, currentKey: string): AirQualityStoreV1 {
  const base: AirQualityStoreV1 = { version: 1, periodKey: currentKey, byAssetId: {} };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<AirQualityStoreV1>;
  if (o.periodKey !== currentKey) return base;
  if (o.version !== 1 || !o.byAssetId || typeof o.byAssetId !== "object") return base;
  const byAssetId: Record<string, AirQualityAssetData> = {};
  for (const [aid, v] of Object.entries(o.byAssetId)) {
    if (!v || typeof v !== "object") continue;
    const d = v as Partial<AirQualityAssetData>;
    byAssetId[aid] = {
      annualMetricsMt: typeof d.annualMetricsMt === "object" && d.annualMetricsMt ? d.annualMetricsMt : {},
      fuelRows: Array.isArray(d.fuelRows) ? d.fuelRows : [],
      equipmentRows: Array.isArray(d.equipmentRows) ? d.equipmentRows : [],
      ldarRows: Array.isArray(d.ldarRows) ? d.ldarRows : [],
      ldarFilesMeta: Array.isArray(d.ldarFilesMeta) ? d.ldarFilesMeta : [],
      stackTestRows: Array.isArray(d.stackTestRows) ? d.stackTestRows : [],
      stackTestFilesMeta: Array.isArray(d.stackTestFilesMeta) ? d.stackTestFilesMeta : [],
    };
  }
  return { version: 1, periodKey: currentKey, byAssetId };
}

export function loadAirQualityStore(draft?: BoundaryDraftV2): AirQualityStoreV1 {
  const d = draft ?? loadBoundaryDraft();
  const key = periodKeyFromDraft(d);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, periodKey: key, byAssetId: {} };
    return normalizeStore(JSON.parse(raw), key);
  } catch {
    return { version: 1, periodKey: key, byAssetId: {} };
  }
}

export function saveAirQualityStore(store: AirQualityStoreV1): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getAirDataForAsset(store: AirQualityStoreV1, assetId: string): AirQualityAssetData {
  return store.byAssetId[assetId] ?? defaultAirQualityAssetData();
}

export function setAirDataForAsset(
  store: AirQualityStoreV1,
  assetId: string,
  data: AirQualityAssetData
): AirQualityStoreV1 {
  return {
    ...store,
    byAssetId: { ...store.byAssetId, [assetId]: data },
  };
}

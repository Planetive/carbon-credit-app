import type { BoundaryDraftV2 } from "../../boundary/boundaryTypes";
import { loadBoundaryDraft } from "../../boundary/storage";
import { periodKeyFromDraft } from "../shared/periodUtils";
import type { WaterAssetData, WaterDisposalPct, WaterStoreV1 } from "./types";

const STORAGE_KEY = "esg_topic_water_management_v1";

export function defaultWaterDisposalPct(): WaterDisposalPct {
  return { injected: "", recycled: "", discharged: "", evaporationPond: "" };
}

export function defaultWaterAssetData(): WaterAssetData {
  return {
    freshwaterRows: [],
    returnedDischargedM3PerMonth: "",
    producedGenerated: "",
    producedUnit: "m3_month",
    disposalPct: defaultWaterDisposalPct(),
    swdRows: [],
    hfWells: [],
    waterStressSharePct: "",
    hfSitesDeterioratedWaterQualityPct: "",
    groundwaterFilesMeta: [],
  };
}

function normalizeStore(raw: unknown, currentKey: string): WaterStoreV1 {
  const base: WaterStoreV1 = { version: 1, periodKey: currentKey, byAssetId: {} };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<WaterStoreV1>;
  if (o.periodKey !== currentKey) return base;
  if (o.version !== 1 || !o.byAssetId || typeof o.byAssetId !== "object") return base;
  const byAssetId: Record<string, WaterAssetData> = {};
  for (const [aid, v] of Object.entries(o.byAssetId)) {
    if (!v || typeof v !== "object") continue;
    const d = v as Partial<WaterAssetData>;
    const dp = d.disposalPct && typeof d.disposalPct === "object" ? d.disposalPct : defaultWaterDisposalPct();
    byAssetId[aid] = {
      freshwaterRows: Array.isArray(d.freshwaterRows) ? d.freshwaterRows : [],
      returnedDischargedM3PerMonth: typeof d.returnedDischargedM3PerMonth === "string" ? d.returnedDischargedM3PerMonth : "",
      producedGenerated: typeof d.producedGenerated === "string" ? d.producedGenerated : "",
      producedUnit: d.producedUnit === "bbl_month" ? "bbl_month" : "m3_month",
      disposalPct: {
        injected: typeof dp.injected === "string" ? dp.injected : "",
        recycled: typeof dp.recycled === "string" ? dp.recycled : "",
        discharged: typeof dp.discharged === "string" ? dp.discharged : "",
        evaporationPond: typeof dp.evaporationPond === "string" ? dp.evaporationPond : "",
      },
      swdRows: Array.isArray(d.swdRows) ? d.swdRows : [],
      hfWells: Array.isArray(d.hfWells) ? d.hfWells : [],
      waterStressSharePct: typeof d.waterStressSharePct === "string" ? d.waterStressSharePct : "",
      hfSitesDeterioratedWaterQualityPct:
        typeof d.hfSitesDeterioratedWaterQualityPct === "string" ? d.hfSitesDeterioratedWaterQualityPct : "",
      groundwaterFilesMeta: Array.isArray(d.groundwaterFilesMeta) ? d.groundwaterFilesMeta : [],
    };
  }
  return { version: 1, periodKey: currentKey, byAssetId };
}

export function loadWaterStore(draft?: BoundaryDraftV2): WaterStoreV1 {
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

export function saveWaterStore(store: WaterStoreV1): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getWaterDataForAsset(store: WaterStoreV1, assetId: string): WaterAssetData {
  return store.byAssetId[assetId] ?? defaultWaterAssetData();
}

export function setWaterDataForAsset(
  store: WaterStoreV1,
  assetId: string,
  data: WaterAssetData
): WaterStoreV1 {
  return {
    ...store,
    byAssetId: { ...store.byAssetId, [assetId]: data },
  };
}

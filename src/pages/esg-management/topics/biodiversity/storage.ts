import type { BoundaryDraftV2 } from "../../boundary/boundaryTypes";
import { loadBoundaryDraft } from "../../boundary/storage";
import { periodKeyFromDraft } from "../shared/periodUtils";
import type { BiodiversityAssetData, BiodiversityStoreV1 } from "./types";

const STORAGE_KEY = "esg_topic_biodiversity_v1";

export function defaultBiodiversityAssetData(): BiodiversityAssetData {
  return {
    incidentCount: "",
    incidentNarrative: "",
    empInPlace: "",
    empFilesMeta: [],
  };
}

function normalizeStore(raw: unknown, currentKey: string): BiodiversityStoreV1 {
  const base: BiodiversityStoreV1 = { version: 1, periodKey: currentKey, byAssetId: {} };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<BiodiversityStoreV1>;
  if (o.periodKey !== currentKey) return base;
  if (o.version !== 1 || !o.byAssetId || typeof o.byAssetId !== "object") return base;
  const byAssetId: Record<string, BiodiversityAssetData> = {};
  for (const [aid, v] of Object.entries(o.byAssetId)) {
    if (!v || typeof v !== "object") continue;
    const d = v as Partial<BiodiversityAssetData>;
    const emp = d.empInPlace === "yes" || d.empInPlace === "no" ? d.empInPlace : "";
    byAssetId[aid] = {
      incidentCount: typeof d.incidentCount === "string" ? d.incidentCount : "",
      incidentNarrative: typeof d.incidentNarrative === "string" ? d.incidentNarrative : "",
      empInPlace: emp,
      empFilesMeta: Array.isArray(d.empFilesMeta) ? d.empFilesMeta : [],
    };
  }
  return { version: 1, periodKey: currentKey, byAssetId };
}

export function loadBiodiversityStore(draft?: BoundaryDraftV2): BiodiversityStoreV1 {
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

export function saveBiodiversityStore(store: BiodiversityStoreV1): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getBiodiversityDataForAsset(store: BiodiversityStoreV1, assetId: string): BiodiversityAssetData {
  return store.byAssetId[assetId] ?? defaultBiodiversityAssetData();
}

export function setBiodiversityDataForAsset(
  store: BiodiversityStoreV1,
  assetId: string,
  data: BiodiversityAssetData
): BiodiversityStoreV1 {
  return {
    ...store,
    byAssetId: { ...store.byAssetId, [assetId]: data },
  };
}

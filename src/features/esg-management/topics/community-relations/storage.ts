import type { BoundaryDraftV2 } from "../../boundary/boundaryTypes";
import { loadBoundaryDraft } from "../../boundary/storage";
import { periodKeyFromDraft } from "../shared/periodUtils";
import type { CommunityRelationsAssetData, CommunityRelationsStoreV1 } from "./types";

const STORAGE_KEY = "esg_topic_community_relations_v1";

export function defaultCommunityRelationsAssetData(): CommunityRelationsAssetData {
  return {
    communityRightsProcessNarrative: "",
    nonTechnicalDelayCount: "0",
    nonTechnicalDelayDays: "0",
    delayCostsNarrative: "",
    delayRootCauseNarrative: "",
    delayCorrectiveActionsNarrative: "",
  };
}

function normalizeNumericString(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v)) return String(Math.max(0, Math.floor(v)));
  if (typeof v === "string") return v;
  return "0";
}

function normalizeAssetData(raw: unknown): CommunityRelationsAssetData {
  const base = defaultCommunityRelationsAssetData();
  if (!raw || typeof raw !== "object") return base;
  const d = raw as Partial<CommunityRelationsAssetData>;
  return {
    communityRightsProcessNarrative:
      typeof d.communityRightsProcessNarrative === "string" ? d.communityRightsProcessNarrative : "",
    nonTechnicalDelayCount: normalizeNumericString(d.nonTechnicalDelayCount),
    nonTechnicalDelayDays: normalizeNumericString(d.nonTechnicalDelayDays),
    delayCostsNarrative: typeof d.delayCostsNarrative === "string" ? d.delayCostsNarrative : "",
    delayRootCauseNarrative: typeof d.delayRootCauseNarrative === "string" ? d.delayRootCauseNarrative : "",
    delayCorrectiveActionsNarrative:
      typeof d.delayCorrectiveActionsNarrative === "string" ? d.delayCorrectiveActionsNarrative : "",
  };
}

function normalizeStore(raw: unknown, currentKey: string): CommunityRelationsStoreV1 {
  const base: CommunityRelationsStoreV1 = { version: 1, periodKey: currentKey, byAssetId: {} };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<CommunityRelationsStoreV1>;
  if (o.periodKey !== currentKey) return base;
  if (o.version !== 1 || !o.byAssetId || typeof o.byAssetId !== "object") return base;
  const byAssetId: Record<string, CommunityRelationsAssetData> = {};
  for (const [aid, v] of Object.entries(o.byAssetId)) {
    byAssetId[aid] = normalizeAssetData(v);
  }
  return { version: 1, periodKey: currentKey, byAssetId };
}

export function loadCommunityRelationsStore(draft?: BoundaryDraftV2): CommunityRelationsStoreV1 {
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

export function saveCommunityRelationsStore(store: CommunityRelationsStoreV1): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getCommunityRelationsDataForAsset(
  store: CommunityRelationsStoreV1,
  assetId: string
): CommunityRelationsAssetData {
  return store.byAssetId[assetId] ?? defaultCommunityRelationsAssetData();
}

export function setCommunityRelationsDataForAsset(
  store: CommunityRelationsStoreV1,
  assetId: string,
  data: CommunityRelationsAssetData
): CommunityRelationsStoreV1 {
  return {
    ...store,
    byAssetId: { ...store.byAssetId, [assetId]: data },
  };
}

import type { BoundaryDraftV2 } from "../../boundary/boundaryTypes";
import { loadBoundaryDraft } from "../../boundary/storage";
import { periodKeyFromDraft } from "../shared/periodUtils";
import { newTopicRowId } from "../shared/newId";
import type {
  BiodiversityAssetData,
  BiodiversityStoreV1,
  ProductTypeSpilled,
  RegulatoryNotificationStatus,
  SpillCause,
  SpillRow,
  WellBarrierStatus,
  WellIntegrityRow,
} from "./types";
import {
  PRODUCT_TYPES_SPILLED,
  REGULATORY_NOTIFICATION_STATUSES,
  SPILL_CAUSES,
  WELL_BARRIER_STATUSES,
} from "./types";

const STORAGE_KEY = "esg_topic_biodiversity_v1";

function normalizeSpillRow(raw: unknown): SpillRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<SpillRow>;
  const productType = PRODUCT_TYPES_SPILLED.includes(r.productTypeSpilled as ProductTypeSpilled)
    ? (r.productTypeSpilled as ProductTypeSpilled)
    : "Other";
  const spillCause = SPILL_CAUSES.includes(r.spillCause as SpillCause) ? (r.spillCause as SpillCause) : "Other";
  const regulatoryNotification = REGULATORY_NOTIFICATION_STATUSES.includes(
    r.regulatoryNotification as RegulatoryNotificationStatus
  )
    ? (r.regulatoryNotification as RegulatoryNotificationStatus)
    : "No";
  return {
    id: typeof r.id === "string" ? r.id : newTopicRowId(),
    spillDate: typeof r.spillDate === "string" ? r.spillDate : "",
    assetLocation: typeof r.assetLocation === "string" ? r.assetLocation : "",
    spillVolumeCubicM: typeof r.spillVolumeCubicM === "number" && Number.isFinite(r.spillVolumeCubicM) ? r.spillVolumeCubicM : 0,
    spillVolumeUnit: r.spillVolumeUnit === "bbl" ? "bbl" : "m³",
    productTypeSpilled: productType,
    spillCause,
    sensitiveAreaFlag: r.sensitiveAreaFlag === true,
    volumeRecoveredCubicM:
      typeof r.volumeRecoveredCubicM === "number" && Number.isFinite(r.volumeRecoveredCubicM) ? r.volumeRecoveredCubicM : 0,
    responseActions: Array.isArray(r.responseActions) ? r.responseActions : [],
    regulatoryNotification,
    regulatorName: typeof r.regulatorName === "string" ? r.regulatorName : "",
    notificationDate: typeof r.notificationDate === "string" ? r.notificationDate : "",
  };
}

function normalizeWellIntegrityRow(raw: unknown): WellIntegrityRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<WellIntegrityRow>;
  const barrierStatus = WELL_BARRIER_STATUSES.includes(r.barrierStatus as WellBarrierStatus)
    ? (r.barrierStatus as WellBarrierStatus)
    : "All barriers intact";
  return {
    id: typeof r.id === "string" ? r.id : newTopicRowId(),
    wellId: typeof r.wellId === "string" ? r.wellId : "",
    inspectionDate: typeof r.inspectionDate === "string" ? r.inspectionDate : "",
    barrierStatus,
  };
}

export function defaultBiodiversityAssetData(): BiodiversityAssetData {
  return {
    incidentCount: "",
    incidentNarrative: "",
    empInPlace: "",
    empFilesMeta: [],
    envManagementPoliciesNarrative: "",
    spillRows: [],
    wellIntegrityRows: [],
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
    const spillRows = Array.isArray(d.spillRows)
      ? d.spillRows.map((r) => normalizeSpillRow(r)).filter((r): r is SpillRow => !!r)
      : [];
    const wellIntegrityRows = Array.isArray(d.wellIntegrityRows)
      ? d.wellIntegrityRows.map((r) => normalizeWellIntegrityRow(r)).filter((r): r is WellIntegrityRow => !!r)
      : [];
    byAssetId[aid] = {
      incidentCount: typeof d.incidentCount === "string" ? d.incidentCount : "",
      incidentNarrative: typeof d.incidentNarrative === "string" ? d.incidentNarrative : "",
      empInPlace: emp,
      empFilesMeta: Array.isArray(d.empFilesMeta) ? d.empFilesMeta : [],
      envManagementPoliciesNarrative:
        typeof d.envManagementPoliciesNarrative === "string" ? d.envManagementPoliciesNarrative : "",
      spillRows,
      wellIntegrityRows,
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

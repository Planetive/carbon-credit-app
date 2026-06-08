import type { BoundaryDraftV2 } from "../../boundary/boundaryTypes";
import { loadBoundaryDraft } from "../../boundary/storage";
import { periodKeyFromDraft } from "../shared/periodUtils";
import { newTopicRowId } from "../shared/newId";
import {
  PRODUCT_TYPES_SPILLED,
  REGULATORY_NOTIFICATION_STATUSES,
  SPILL_CAUSES,
  SPILL_RESPONSE_ACTIONS,
  WELL_BARRIER_STATUSES,
  type EnvironmentalManagementAssetData,
  type EnvironmentalManagementStoreV1,
  type ProductTypeSpilled,
  type RegulatoryNotificationStatus,
  type SpillCause,
  type SpillRow,
  type SpillVolumeUnit,
  type WellBarrierStatus,
  type WellIntegrityRow,
} from "./types";

const STORAGE_KEY = "esg_topic_environmental_management_v1";

export function defaultEnvironmentalManagementAssetData(): EnvironmentalManagementAssetData {
  return {
    spillRows: [],
    wellIntegrityRows: [],
  };
}

function normalizeSpillVolumeUnit(v: unknown): SpillVolumeUnit {
  return v === "bbl" ? "bbl" : "m³";
}

function normalizeProductType(v: unknown): ProductTypeSpilled {
  if (typeof v === "string" && (PRODUCT_TYPES_SPILLED as string[]).includes(v)) {
    return v as ProductTypeSpilled;
  }
  return "Other";
}

function normalizeSpillCause(v: unknown): SpillCause {
  if (typeof v === "string" && (SPILL_CAUSES as string[]).includes(v)) {
    return v as SpillCause;
  }
  return "Other";
}

function normalizeRegulatoryNotification(v: unknown): RegulatoryNotificationStatus {
  if (typeof v === "string" && (REGULATORY_NOTIFICATION_STATUSES as string[]).includes(v)) {
    return v as RegulatoryNotificationStatus;
  }
  return "No";
}

function normalizeResponseActions(raw: unknown): SpillRow["responseActions"] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((a): a is SpillRow["responseActions"][number] =>
    typeof a === "string" && (SPILL_RESPONSE_ACTIONS as string[]).includes(a)
  );
}

function normalizeSpillRow(raw: unknown): SpillRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<SpillRow>;
  if (typeof r.id !== "string" || !r.id) return null;
  return {
    id: r.id,
    spillDate: typeof r.spillDate === "string" ? r.spillDate : "",
    assetLocation: typeof r.assetLocation === "string" ? r.assetLocation : "",
    spillVolumeCubicM:
      typeof r.spillVolumeCubicM === "number" && Number.isFinite(r.spillVolumeCubicM) ? r.spillVolumeCubicM : 0,
    spillVolumeUnit: normalizeSpillVolumeUnit(r.spillVolumeUnit),
    productTypeSpilled: normalizeProductType(r.productTypeSpilled),
    spillCause: normalizeSpillCause(r.spillCause),
    sensitiveAreaFlag: r.sensitiveAreaFlag === true,
    volumeRecoveredCubicM:
      typeof r.volumeRecoveredCubicM === "number" && Number.isFinite(r.volumeRecoveredCubicM)
        ? r.volumeRecoveredCubicM
        : 0,
    responseActions: normalizeResponseActions(r.responseActions),
    regulatoryNotification: normalizeRegulatoryNotification(r.regulatoryNotification),
    regulatorName: typeof r.regulatorName === "string" ? r.regulatorName : "",
    notificationDate: typeof r.notificationDate === "string" ? r.notificationDate : "",
  };
}

function normalizeWellBarrierStatus(v: unknown): WellBarrierStatus {
  if (typeof v === "string" && (WELL_BARRIER_STATUSES as string[]).includes(v)) {
    return v as WellBarrierStatus;
  }
  return "All barriers intact";
}

function normalizeWellIntegrityRow(raw: unknown): WellIntegrityRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<WellIntegrityRow>;
  if (typeof r.id !== "string" || !r.id) return null;
  return {
    id: r.id,
    wellId: typeof r.wellId === "string" ? r.wellId : "",
    inspectionDate: typeof r.inspectionDate === "string" ? r.inspectionDate : "",
    barrierStatus: normalizeWellBarrierStatus(r.barrierStatus),
  };
}

function normalizeAssetData(raw: unknown): EnvironmentalManagementAssetData {
  const base = defaultEnvironmentalManagementAssetData();
  if (!raw || typeof raw !== "object") return base;
  const d = raw as Partial<EnvironmentalManagementAssetData>;

  const spillRows: SpillRow[] = [];
  if (Array.isArray(d.spillRows)) {
    for (const item of d.spillRows) {
      const row = normalizeSpillRow(item);
      if (row) spillRows.push(row);
    }
  }

  const wellIntegrityRows: WellIntegrityRow[] = [];
  if (Array.isArray(d.wellIntegrityRows)) {
    for (const item of d.wellIntegrityRows) {
      const row = normalizeWellIntegrityRow(item);
      if (row) wellIntegrityRows.push(row);
    }
  }

  return { spillRows, wellIntegrityRows };
}

function normalizeStore(raw: unknown, currentKey: string): EnvironmentalManagementStoreV1 {
  const base: EnvironmentalManagementStoreV1 = { version: 1, periodKey: currentKey, byAssetId: {} };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<EnvironmentalManagementStoreV1>;
  if (o.periodKey !== currentKey) return base;
  if (o.version !== 1 || !o.byAssetId || typeof o.byAssetId !== "object") return base;
  const byAssetId: Record<string, EnvironmentalManagementAssetData> = {};
  for (const [aid, v] of Object.entries(o.byAssetId)) {
    byAssetId[aid] = normalizeAssetData(v);
  }
  return { version: 1, periodKey: currentKey, byAssetId };
}

export function loadEnvironmentalManagementStore(draft?: BoundaryDraftV2): EnvironmentalManagementStoreV1 {
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

export function saveEnvironmentalManagementStore(store: EnvironmentalManagementStoreV1): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getEnvironmentalManagementDataForAsset(
  store: EnvironmentalManagementStoreV1,
  assetId: string
): EnvironmentalManagementAssetData {
  return store.byAssetId[assetId] ?? defaultEnvironmentalManagementAssetData();
}

export function setEnvironmentalManagementDataForAsset(
  store: EnvironmentalManagementStoreV1,
  assetId: string,
  data: EnvironmentalManagementAssetData
): EnvironmentalManagementStoreV1 {
  return {
    ...store,
    byAssetId: { ...store.byAssetId, [assetId]: data },
  };
}

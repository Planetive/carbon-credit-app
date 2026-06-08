import type { BoundaryDraftV2 } from "../../boundary/boundaryTypes";
import { loadBoundaryDraft } from "../../boundary/storage";
import { periodKeyFromDraft } from "../shared/periodUtils";
import {
  FPIC_STATUS_OPTIONS,
  GRIEVANCE_TYPE_OPTIONS,
  IFC_PS7_STATUS_OPTIONS,
  PROXIMITY_OPTIONS,
  YES_NO_OPTIONS,
  type FpicStatusType,
  type GrievanceRow,
  type GrievanceType,
  type IfcPs7Status,
  type IndigenousRightsAssetData,
  type IndigenousRightsStoreV1,
  type ProximityToIndigenousLands,
  type YesNoAnswer,
} from "./types";

const STORAGE_KEY = "esg_topic_indigenous_rights_v1";

export function defaultIndigenousRightsAssetData(): IndigenousRightsAssetData {
  return {
    proximityToIndigenousLands: "Unknown",
    fpicStatus: "Not required",
    consultationEventsCount: "0",
    consultationNarrative: "",
    grievanceRows: [],
    fpicPolicyInPlace: "No",
    fpicPolicyNarrative: "",
    ifcPs7Completed: "No",
    ifcPs7AssessmentDate: "",
    fpicProcessNarrative: "",
  };
}

function normalizeProximity(v: unknown): ProximityToIndigenousLands {
  if (typeof v === "string" && (PROXIMITY_OPTIONS as string[]).includes(v)) {
    return v as ProximityToIndigenousLands;
  }
  return "Unknown";
}

function normalizeFpicStatus(v: unknown): FpicStatusType {
  if (typeof v === "string" && (FPIC_STATUS_OPTIONS as string[]).includes(v)) {
    return v as FpicStatusType;
  }
  return "Not required";
}

function normalizeGrievanceType(v: unknown): GrievanceType {
  if (typeof v === "string" && (GRIEVANCE_TYPE_OPTIONS as string[]).includes(v)) {
    return v as GrievanceType;
  }
  return "Other";
}

function normalizeYesNo(v: unknown): YesNoAnswer {
  if (typeof v === "string" && (YES_NO_OPTIONS as string[]).includes(v)) {
    return v as YesNoAnswer;
  }
  return "No";
}

function normalizeIfcPs7(v: unknown): IfcPs7Status {
  if (typeof v === "string" && (IFC_PS7_STATUS_OPTIONS as string[]).includes(v)) {
    return v as IfcPs7Status;
  }
  return "No";
}

function normalizeNumericString(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "string") return v;
  return "0";
}

function normalizeGrievanceRow(raw: unknown): GrievanceRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<GrievanceRow>;
  if (typeof r.id !== "string" || !r.id) return null;
  return {
    id: r.id,
    dateReceived: typeof r.dateReceived === "string" ? r.dateReceived : "",
    grievanceType: normalizeGrievanceType(r.grievanceType),
    description: typeof r.description === "string" ? r.description : "",
    resolved: r.resolved === true,
    resolutionDate: typeof r.resolutionDate === "string" ? r.resolutionDate : "",
  };
}

function normalizeAssetData(raw: unknown): IndigenousRightsAssetData {
  const base = defaultIndigenousRightsAssetData();
  if (!raw || typeof raw !== "object") return base;
  const d = raw as Partial<IndigenousRightsAssetData>;

  const grievanceRows: GrievanceRow[] = [];
  if (Array.isArray(d.grievanceRows)) {
    for (const item of d.grievanceRows) {
      const row = normalizeGrievanceRow(item);
      if (row) grievanceRows.push(row);
    }
  }

  return {
    proximityToIndigenousLands: normalizeProximity(d.proximityToIndigenousLands),
    fpicStatus: normalizeFpicStatus(d.fpicStatus),
    consultationEventsCount: normalizeNumericString(d.consultationEventsCount),
    consultationNarrative: typeof d.consultationNarrative === "string" ? d.consultationNarrative : "",
    grievanceRows,
    fpicPolicyInPlace: normalizeYesNo(d.fpicPolicyInPlace),
    fpicPolicyNarrative: typeof d.fpicPolicyNarrative === "string" ? d.fpicPolicyNarrative : "",
    ifcPs7Completed: normalizeIfcPs7(d.ifcPs7Completed),
    ifcPs7AssessmentDate: typeof d.ifcPs7AssessmentDate === "string" ? d.ifcPs7AssessmentDate : "",
    fpicProcessNarrative: typeof d.fpicProcessNarrative === "string" ? d.fpicProcessNarrative : "",
  };
}

function normalizeStore(raw: unknown, currentKey: string): IndigenousRightsStoreV1 {
  const base: IndigenousRightsStoreV1 = { version: 1, periodKey: currentKey, byAssetId: {} };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<IndigenousRightsStoreV1>;
  if (o.periodKey !== currentKey) return base;
  if (o.version !== 1 || !o.byAssetId || typeof o.byAssetId !== "object") return base;
  const byAssetId: Record<string, IndigenousRightsAssetData> = {};
  for (const [aid, v] of Object.entries(o.byAssetId)) {
    byAssetId[aid] = normalizeAssetData(v);
  }
  return { version: 1, periodKey: currentKey, byAssetId };
}

export function loadIndigenousRightsStore(draft?: BoundaryDraftV2): IndigenousRightsStoreV1 {
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

export function saveIndigenousRightsStore(store: IndigenousRightsStoreV1): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getIndigenousRightsDataForAsset(
  store: IndigenousRightsStoreV1,
  assetId: string
): IndigenousRightsAssetData {
  return store.byAssetId[assetId] ?? defaultIndigenousRightsAssetData();
}

export function setIndigenousRightsDataForAsset(
  store: IndigenousRightsStoreV1,
  assetId: string,
  data: IndigenousRightsAssetData
): IndigenousRightsStoreV1 {
  return {
    ...store,
    byAssetId: { ...store.byAssetId, [assetId]: data },
  };
}

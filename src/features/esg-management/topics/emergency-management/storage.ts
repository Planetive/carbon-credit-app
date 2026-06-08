import type { BoundaryDraftV2 } from "../../boundary/boundaryTypes";
import { loadBoundaryDraft } from "../../boundary/storage";
import { periodKeyFromDraft } from "../shared/periodUtils";
import {
  MUTUAL_AID_OPTIONS,
  PREPAREDNESS_DOMAIN_META,
  WELL_CONTROL_CERTIFICATION_OPTIONS,
  type EmergencyManagementAssetData,
  type EmergencyManagementStoreV1,
  type HydrocarbonReleaseRow,
  type MutualAidInPlace,
  type PreparednessScore,
  type PreparednessScoreKey,
  type WellControlCertificationType,
  type WellControlIncidentRow,
} from "./types";

const STORAGE_KEY = "esg_topic_emergency_management_v1";

export function defaultPreparednessScore(): PreparednessScore {
  return {
    emergencyPlanCoverage: 1,
    drillFrequencyQuality: 1,
    wellControlTraining: 1,
    equipmentReadiness: 1,
    mutualAidAgreements: 1,
  };
}

export function defaultEmergencyManagementAssetData(): EmergencyManagementAssetData {
  return {
    hydrocarbonReleases: [],
    wellControlIncidents: [],
    pctAssetsWithErpCoverage: "0",
    drillsPerAssetPerYear: "0",
    mutualAidInPlace: "No",
    mutualAidCounterparties: "",
    wellControlCertification: "None",
    pctDrillingStaffCertified: "0",
    preparednessScore: defaultPreparednessScore(),
    emergencyManagementNarrative: "",
  };
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(5, Math.max(1, Math.round(n)));
}

function normalizePreparednessScore(raw: unknown): PreparednessScore {
  const base = defaultPreparednessScore();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<PreparednessScore>;
  const out = { ...base };
  for (const { key } of PREPAREDNESS_DOMAIN_META) {
    out[key] = clampScore(Number(o[key]));
  }
  return out;
}

function normalizeHydrocarbonRow(raw: unknown): HydrocarbonReleaseRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<HydrocarbonReleaseRow>;
  if (typeof r.id !== "string" || !r.id) return null;
  return {
    id: r.id,
    date: typeof r.date === "string" ? r.date : "",
    assetLocation: typeof r.assetLocation === "string" ? r.assetLocation : "",
    volumeM3: typeof r.volumeM3 === "string" ? r.volumeM3 : "",
    cause: typeof r.cause === "string" ? r.cause : "",
    responseDescription: typeof r.responseDescription === "string" ? r.responseDescription : "",
  };
}

function normalizeWellControlRow(raw: unknown): WellControlIncidentRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<WellControlIncidentRow>;
  if (typeof r.id !== "string" || !r.id) return null;
  return {
    id: r.id,
    date: typeof r.date === "string" ? r.date : "",
    wellId: typeof r.wellId === "string" ? r.wellId : "",
    isBlowout: r.isBlowout === true,
    description: typeof r.description === "string" ? r.description : "",
  };
}

function normalizeCertification(v: unknown): WellControlCertificationType {
  if (typeof v === "string" && (WELL_CONTROL_CERTIFICATION_OPTIONS as string[]).includes(v)) {
    return v as WellControlCertificationType;
  }
  return "None";
}

function normalizeMutualAid(v: unknown): MutualAidInPlace {
  if (typeof v === "string" && (MUTUAL_AID_OPTIONS as string[]).includes(v)) {
    return v as MutualAidInPlace;
  }
  return "No";
}

function normalizeNumericString(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "string") return v;
  return "0";
}

function normalizeAssetData(raw: unknown): EmergencyManagementAssetData {
  const base = defaultEmergencyManagementAssetData();
  if (!raw || typeof raw !== "object") return base;
  const d = raw as Partial<EmergencyManagementAssetData>;

  const hydrocarbonReleases: HydrocarbonReleaseRow[] = [];
  if (Array.isArray(d.hydrocarbonReleases)) {
    for (const item of d.hydrocarbonReleases) {
      const row = normalizeHydrocarbonRow(item);
      if (row) hydrocarbonReleases.push(row);
    }
  }

  const wellControlIncidents: WellControlIncidentRow[] = [];
  if (Array.isArray(d.wellControlIncidents)) {
    for (const item of d.wellControlIncidents) {
      const row = normalizeWellControlRow(item);
      if (row) wellControlIncidents.push(row);
    }
  }

  return {
    hydrocarbonReleases,
    wellControlIncidents,
    pctAssetsWithErpCoverage: normalizeNumericString(d.pctAssetsWithErpCoverage),
    drillsPerAssetPerYear: normalizeNumericString(d.drillsPerAssetPerYear),
    mutualAidInPlace: normalizeMutualAid(d.mutualAidInPlace),
    mutualAidCounterparties: typeof d.mutualAidCounterparties === "string" ? d.mutualAidCounterparties : "",
    wellControlCertification: normalizeCertification(d.wellControlCertification),
    pctDrillingStaffCertified: normalizeNumericString(d.pctDrillingStaffCertified),
    preparednessScore: normalizePreparednessScore(d.preparednessScore),
    emergencyManagementNarrative:
      typeof d.emergencyManagementNarrative === "string" ? d.emergencyManagementNarrative : "",
  };
}

function normalizeStore(raw: unknown, currentKey: string): EmergencyManagementStoreV1 {
  const base: EmergencyManagementStoreV1 = { version: 1, periodKey: currentKey, byAssetId: {} };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<EmergencyManagementStoreV1>;
  if (o.periodKey !== currentKey) return base;
  if (o.version !== 1 || !o.byAssetId || typeof o.byAssetId !== "object") return base;
  const byAssetId: Record<string, EmergencyManagementAssetData> = {};
  for (const [aid, v] of Object.entries(o.byAssetId)) {
    byAssetId[aid] = normalizeAssetData(v);
  }
  return { version: 1, periodKey: currentKey, byAssetId };
}

export function loadEmergencyManagementStore(draft?: BoundaryDraftV2): EmergencyManagementStoreV1 {
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

export function saveEmergencyManagementStore(store: EmergencyManagementStoreV1): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getEmergencyManagementDataForAsset(
  store: EmergencyManagementStoreV1,
  assetId: string
): EmergencyManagementAssetData {
  return store.byAssetId[assetId] ?? defaultEmergencyManagementAssetData();
}

export function setEmergencyManagementDataForAsset(
  store: EmergencyManagementStoreV1,
  assetId: string,
  data: EmergencyManagementAssetData
): EmergencyManagementStoreV1 {
  return {
    ...store,
    byAssetId: { ...store.byAssetId, [assetId]: data },
  };
}

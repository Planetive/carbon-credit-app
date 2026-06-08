import type { BoundaryDraftV2 } from "../../boundary/boundaryTypes";
import { loadBoundaryDraft } from "../../boundary/storage";
import { periodKeyFromDraft } from "../shared/periodUtils";
import {
  HS_CERTIFICATION_OPTIONS,
  type HsCertificationType,
  type WorkforceHealthSafetyAssetData,
  type WorkforceHealthSafetyStoreV1,
} from "./types";

const STORAGE_KEY = "esg_topic_workforce_hs_v1";

export function defaultWorkforceHealthSafetyAssetData(): WorkforceHealthSafetyAssetData {
  return {
    employeeHoursWorked: "0",
    contractorHoursWorked: "0",
    employeeRecordableIncidents: "0",
    contractorRecordableIncidents: "0",
    employeeLostTimeIncidents: "0",
    contractorLostTimeIncidents: "0",
    employeeFatalities: "0",
    contractorFatalities: "0",
    hsTrainingHoursTotal: "0",
    averageEmployeeHeadcountFte: "0",
    hsCertification: "None",
    hsManagementSystemNarrative: "",
  };
}

function normalizeCertification(v: unknown): HsCertificationType {
  if (typeof v === "string" && (HS_CERTIFICATION_OPTIONS as string[]).includes(v)) {
    return v as HsCertificationType;
  }
  return "None";
}

function normalizeNumericString(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "string") return v;
  return "0";
}

function normalizeAssetData(raw: unknown): WorkforceHealthSafetyAssetData {
  const base = defaultWorkforceHealthSafetyAssetData();
  if (!raw || typeof raw !== "object") return base;
  const d = raw as Partial<WorkforceHealthSafetyAssetData>;
  return {
    employeeHoursWorked: normalizeNumericString(d.employeeHoursWorked),
    contractorHoursWorked: normalizeNumericString(d.contractorHoursWorked),
    employeeRecordableIncidents: normalizeNumericString(d.employeeRecordableIncidents),
    contractorRecordableIncidents: normalizeNumericString(d.contractorRecordableIncidents),
    employeeLostTimeIncidents: normalizeNumericString(d.employeeLostTimeIncidents),
    contractorLostTimeIncidents: normalizeNumericString(d.contractorLostTimeIncidents),
    employeeFatalities: normalizeNumericString(d.employeeFatalities),
    contractorFatalities: normalizeNumericString(d.contractorFatalities),
    hsTrainingHoursTotal: normalizeNumericString(d.hsTrainingHoursTotal),
    averageEmployeeHeadcountFte: normalizeNumericString(d.averageEmployeeHeadcountFte),
    hsCertification: normalizeCertification(d.hsCertification),
    hsManagementSystemNarrative:
      typeof d.hsManagementSystemNarrative === "string" ? d.hsManagementSystemNarrative : "",
  };
}

function normalizeStore(raw: unknown, currentKey: string): WorkforceHealthSafetyStoreV1 {
  const base: WorkforceHealthSafetyStoreV1 = { version: 1, periodKey: currentKey, byAssetId: {} };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<WorkforceHealthSafetyStoreV1>;
  if (o.periodKey !== currentKey) return base;
  if (o.version !== 1 || !o.byAssetId || typeof o.byAssetId !== "object") return base;
  const byAssetId: Record<string, WorkforceHealthSafetyAssetData> = {};
  for (const [aid, v] of Object.entries(o.byAssetId)) {
    byAssetId[aid] = normalizeAssetData(v);
  }
  return { version: 1, periodKey: currentKey, byAssetId };
}

export function loadWorkforceHealthSafetyStore(draft?: BoundaryDraftV2): WorkforceHealthSafetyStoreV1 {
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

export function saveWorkforceHealthSafetyStore(store: WorkforceHealthSafetyStoreV1): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getWorkforceHealthSafetyDataForAsset(
  store: WorkforceHealthSafetyStoreV1,
  assetId: string
): WorkforceHealthSafetyAssetData {
  return store.byAssetId[assetId] ?? defaultWorkforceHealthSafetyAssetData();
}

export function setWorkforceHealthSafetyDataForAsset(
  store: WorkforceHealthSafetyStoreV1,
  assetId: string,
  data: WorkforceHealthSafetyAssetData
): WorkforceHealthSafetyStoreV1 {
  return {
    ...store,
    byAssetId: { ...store.byAssetId, [assetId]: data },
  };
}

import type { BoundaryDraftV2 } from "../../boundary/boundaryTypes";
import { loadBoundaryDraft } from "../../boundary/storage";
import { periodKeyFromDraft } from "../shared/periodUtils";
import {
  PAYMENT_TYPE_OPTIONS,
  YES_NO_OPTIONS,
  type BusinessEthicsAssetData,
  type BusinessEthicsStoreV1,
  type GovernmentPaymentRow,
  type PaymentType,
  type YesNoAnswer,
} from "./types";

const STORAGE_KEY = "esg_topic_business_ethics_v1";

export function defaultBusinessEthicsAssetData(): BusinessEthicsAssetData {
  return {
    provedReservesHighRiskMmboe: "0",
    probableReservesHighRiskMmboe: "0",
    totalProvedReservesMmboe: "0",
    totalProbableReservesMmboe: "0",
    corruptionManagementNarrative: "",
    governmentPaymentRows: [],
    whistleblowerReportsReceived: "0",
    whistleblowerReportsSubstantiated: "0",
    antiCorruptionTrainingPct: "0",
    thirdPartyDueDiligenceInPlace: "No",
    dueDiligenceToolName: "",
    codeOfConductInPlace: "No",
    internalAuditEthicsFindings: "0",
  };
}

function normalizeNumericString(v: unknown): string {
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "string") return v;
  return "0";
}

function normalizeYesNo(v: unknown): YesNoAnswer {
  if (typeof v === "string" && (YES_NO_OPTIONS as string[]).includes(v)) {
    return v as YesNoAnswer;
  }
  return "No";
}

function normalizePaymentType(v: unknown): PaymentType {
  if (typeof v === "string" && (PAYMENT_TYPE_OPTIONS as string[]).includes(v)) {
    return v as PaymentType;
  }
  return "Other";
}

function normalizeGovernmentPaymentRow(raw: unknown): GovernmentPaymentRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<GovernmentPaymentRow>;
  if (typeof r.id !== "string" || !r.id) return null;
  return {
    id: r.id,
    country: typeof r.country === "string" ? r.country : "",
    paymentType: normalizePaymentType(r.paymentType),
    amountUsd: normalizeNumericString(r.amountUsd),
    reportingYear: typeof r.reportingYear === "string" ? r.reportingYear : "",
  };
}

function normalizeAssetData(raw: unknown): BusinessEthicsAssetData {
  const base = defaultBusinessEthicsAssetData();
  if (!raw || typeof raw !== "object") return base;
  const d = raw as Partial<BusinessEthicsAssetData>;

  const governmentPaymentRows: GovernmentPaymentRow[] = [];
  if (Array.isArray(d.governmentPaymentRows)) {
    for (const item of d.governmentPaymentRows) {
      const row = normalizeGovernmentPaymentRow(item);
      if (row) governmentPaymentRows.push(row);
    }
  }

  return {
    provedReservesHighRiskMmboe: normalizeNumericString(d.provedReservesHighRiskMmboe),
    probableReservesHighRiskMmboe: normalizeNumericString(d.probableReservesHighRiskMmboe),
    totalProvedReservesMmboe: normalizeNumericString(d.totalProvedReservesMmboe),
    totalProbableReservesMmboe: normalizeNumericString(d.totalProbableReservesMmboe),
    corruptionManagementNarrative: typeof d.corruptionManagementNarrative === "string" ? d.corruptionManagementNarrative : "",
    governmentPaymentRows,
    whistleblowerReportsReceived: normalizeNumericString(d.whistleblowerReportsReceived),
    whistleblowerReportsSubstantiated: normalizeNumericString(d.whistleblowerReportsSubstantiated),
    antiCorruptionTrainingPct: normalizeNumericString(d.antiCorruptionTrainingPct),
    thirdPartyDueDiligenceInPlace: normalizeYesNo(d.thirdPartyDueDiligenceInPlace),
    dueDiligenceToolName: typeof d.dueDiligenceToolName === "string" ? d.dueDiligenceToolName : "",
    codeOfConductInPlace: normalizeYesNo(d.codeOfConductInPlace),
    internalAuditEthicsFindings: normalizeNumericString(d.internalAuditEthicsFindings),
  };
}

function normalizeStore(raw: unknown, currentKey: string): BusinessEthicsStoreV1 {
  const base: BusinessEthicsStoreV1 = { version: 1, periodKey: currentKey, byAssetId: {} };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<BusinessEthicsStoreV1>;
  if (o.periodKey !== currentKey) return base;
  if (o.version !== 1 || !o.byAssetId || typeof o.byAssetId !== "object") return base;
  const byAssetId: Record<string, BusinessEthicsAssetData> = {};
  for (const [aid, v] of Object.entries(o.byAssetId)) {
    byAssetId[aid] = normalizeAssetData(v);
  }
  return { version: 1, periodKey: currentKey, byAssetId };
}

export function loadBusinessEthicsStore(draft?: BoundaryDraftV2): BusinessEthicsStoreV1 {
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

export function saveBusinessEthicsStore(store: BusinessEthicsStoreV1): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getBusinessEthicsDataForAsset(
  store: BusinessEthicsStoreV1,
  assetId: string
): BusinessEthicsAssetData {
  return store.byAssetId[assetId] ?? defaultBusinessEthicsAssetData();
}

export function setBusinessEthicsDataForAsset(
  store: BusinessEthicsStoreV1,
  assetId: string,
  data: BusinessEthicsAssetData
): BusinessEthicsStoreV1 {
  return {
    ...store,
    byAssetId: { ...store.byAssetId, [assetId]: data },
  };
}

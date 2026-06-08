import type { BoundaryDraftV2 } from "../../boundary/boundaryTypes";
import { loadBoundaryDraft } from "../../boundary/storage";
import { periodKeyFromDraft } from "../shared/periodUtils";
import {
  RESERVES_PRODUCT_TYPES,
  RESERVES_UNITS,
  type ReservesAssetData,
  type ReservesByCountryRow,
  type ReservesProductType,
  type ReservesStoreV1,
  type ReservesUnit,
} from "./types";

const STORAGE_KEY = "esg_topic_reserves_valuation_v1";

export function defaultReservesAssetData(): ReservesAssetData {
  return {
    provedReservesCrudeOilMmbbl: "",
    provedReservesNaturalGasBcf: "",
    provedReservesNglMmbbl: "",
    reservesByCountry: [],
    internalCarbonPricePerTco2: "",
    ieaStepsPricePerTco2: "",
    ieaApsPricePerTco2: "",
    ieaNzePricePerTco2: "",
    pctCapexLowCarbon: "",
    tcfdPhysicalRisks: "",
    tcfdTransitionRisks: "",
    tcfdOpportunities: "",
    tcfdStrategyResilience: "",
  };
}

function normalizeProductType(v: unknown): ReservesProductType {
  if (typeof v === "string" && (RESERVES_PRODUCT_TYPES as string[]).includes(v)) {
    return v as ReservesProductType;
  }
  return "Crude oil";
}

function normalizeUnit(v: unknown): ReservesUnit {
  if (typeof v === "string" && (RESERVES_UNITS as string[]).includes(v)) {
    return v as ReservesUnit;
  }
  return "Mmbbl";
}

function normalizeCountryRow(raw: unknown): ReservesByCountryRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<ReservesByCountryRow>;
  if (typeof r.id !== "string" || !r.id) return null;
  return {
    id: r.id,
    country: typeof r.country === "string" ? r.country : "",
    productType: normalizeProductType(r.productType),
    provedReserves1P: typeof r.provedReserves1P === "string" ? r.provedReserves1P : "",
    unit: normalizeUnit(r.unit),
    carbonRegulated: r.carbonRegulated === true,
  };
}

function normalizeAssetData(raw: unknown): ReservesAssetData {
  const base = defaultReservesAssetData();
  if (!raw || typeof raw !== "object") return base;
  const d = raw as Partial<ReservesAssetData>;
  const rows: ReservesByCountryRow[] = [];
  if (Array.isArray(d.reservesByCountry)) {
    for (const item of d.reservesByCountry) {
      const row = normalizeCountryRow(item);
      if (row) rows.push(row);
    }
  }
  return {
    provedReservesCrudeOilMmbbl:
      typeof d.provedReservesCrudeOilMmbbl === "string" ? d.provedReservesCrudeOilMmbbl : "",
    provedReservesNaturalGasBcf:
      typeof d.provedReservesNaturalGasBcf === "string" ? d.provedReservesNaturalGasBcf : "",
    provedReservesNglMmbbl: typeof d.provedReservesNglMmbbl === "string" ? d.provedReservesNglMmbbl : "",
    reservesByCountry: rows,
    internalCarbonPricePerTco2:
      typeof d.internalCarbonPricePerTco2 === "string" ? d.internalCarbonPricePerTco2 : "",
    ieaStepsPricePerTco2: typeof d.ieaStepsPricePerTco2 === "string" ? d.ieaStepsPricePerTco2 : "",
    ieaApsPricePerTco2: typeof d.ieaApsPricePerTco2 === "string" ? d.ieaApsPricePerTco2 : "",
    ieaNzePricePerTco2: typeof d.ieaNzePricePerTco2 === "string" ? d.ieaNzePricePerTco2 : "",
    pctCapexLowCarbon: typeof d.pctCapexLowCarbon === "string" ? d.pctCapexLowCarbon : "",
    tcfdPhysicalRisks: typeof d.tcfdPhysicalRisks === "string" ? d.tcfdPhysicalRisks : "",
    tcfdTransitionRisks: typeof d.tcfdTransitionRisks === "string" ? d.tcfdTransitionRisks : "",
    tcfdOpportunities: typeof d.tcfdOpportunities === "string" ? d.tcfdOpportunities : "",
    tcfdStrategyResilience:
      typeof d.tcfdStrategyResilience === "string" ? d.tcfdStrategyResilience : "",
  };
}

function normalizeStore(raw: unknown, currentKey: string): ReservesStoreV1 {
  const base: ReservesStoreV1 = { version: 1, periodKey: currentKey, byAssetId: {} };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<ReservesStoreV1>;
  if (o.periodKey !== currentKey) return base;
  if (o.version !== 1 || !o.byAssetId || typeof o.byAssetId !== "object") return base;
  const byAssetId: Record<string, ReservesAssetData> = {};
  for (const [aid, v] of Object.entries(o.byAssetId)) {
    byAssetId[aid] = normalizeAssetData(v);
  }
  return { version: 1, periodKey: currentKey, byAssetId };
}

export function loadReservesStore(draft?: BoundaryDraftV2): ReservesStoreV1 {
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

export function saveReservesStore(store: ReservesStoreV1): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getReservesDataForAsset(store: ReservesStoreV1, assetId: string): ReservesAssetData {
  return store.byAssetId[assetId] ?? defaultReservesAssetData();
}

export function setReservesDataForAsset(
  store: ReservesStoreV1,
  assetId: string,
  data: ReservesAssetData
): ReservesStoreV1 {
  return {
    ...store,
    byAssetId: { ...store.byAssetId, [assetId]: data },
  };
}

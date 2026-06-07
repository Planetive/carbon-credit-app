import type { BoundaryDraftV2 } from "../../boundary/boundaryTypes";
import { loadBoundaryDraft } from "../../boundary/storage";
import { formatPeriodRangeLabel, periodKeyFromDraft } from "../shared/periodUtils";
import { newTopicRowId } from "../shared/newId";
import type {
  WasteDivertedRow,
  WasteDisposalRow,
  WasteGenerationRow,
  WasteManagementData,
  WasteStoreV1,
} from "./types";

const STORAGE_KEY = "esg_topic_waste_management_v1";

const DIVERTED_METHODS = ["Recycling", "Reuse", "Recovery", "Composting", "Other Diversion"] as const;
const DISPOSAL_METHODS = [
  "Landfill",
  "Incineration",
  "Deep Well Injection",
  "Waste Treatment Facility",
  "Other Disposal",
] as const;

function reportingYearFromDraft(draft: BoundaryDraftV2): number {
  if (draft.period_end && /^\d{4}/.test(draft.period_end)) {
    return Number(draft.period_end.slice(0, 4));
  }
  return new Date().getFullYear();
}

function seedGenerationRow(
  wasteType: string,
  category: WasteGenerationRow["category"],
  reportingYear: number
): WasteGenerationRow {
  return {
    id: newTopicRowId(),
    wasteType,
    field: "",
    businessUnit: "",
    month: new Date().getMonth() + 1,
    category,
    quantity: 0,
    unit: "tonnes",
    reportingYear,
  };
}

function seedDivertedRow(
  wasteCategory: string,
  method: WasteDivertedRow["method"],
  reportingYear: number
): WasteDivertedRow {
  return {
    id: newTopicRowId(),
    wasteCategory,
    field: "",
    businessUnit: "",
    month: new Date().getMonth() + 1,
    quantity: 0,
    unit: "tonnes",
    method,
    reportingYear,
  };
}

function seedDisposalRow(
  wasteCategory: string,
  disposalMethod: WasteDisposalRow["disposalMethod"],
  reportingYear: number
): WasteDisposalRow {
  return {
    id: newTopicRowId(),
    wasteCategory,
    field: "",
    businessUnit: "",
    month: new Date().getMonth() + 1,
    quantity: 0,
    unit: "tonnes",
    disposalMethod,
    reportingYear,
  };
}

export function defaultWasteManagementData(draft?: BoundaryDraftV2): WasteManagementData {
  const d = draft ?? loadBoundaryDraft();
  const year = reportingYearFromDraft(d);
  const reportingPeriod = formatPeriodRangeLabel(d.period_start, d.period_end);

  return {
    policy: {},
    generationRows: [
      seedGenerationRow("Hazardous waste generated", "hazardous", year),
      seedGenerationRow("Hazardous waste stored onsite", "hazardous", year),
      seedGenerationRow("Hazardous waste transported offsite", "hazardous", year),
      seedGenerationRow("Non-hazardous waste generated", "non_hazardous", year),
      seedGenerationRow("Non-hazardous waste stored onsite", "non_hazardous", year),
      seedGenerationRow("Non-hazardous waste transported offsite", "non_hazardous", year),
      seedGenerationRow("Drill cuttings generated", "drilling", year),
      seedGenerationRow("Water-based mud waste", "drilling", year),
      seedGenerationRow("Oil-based mud waste", "drilling", year),
      seedGenerationRow("Synthetic mud waste", "drilling", year),
      seedGenerationRow("Produced water sludge", "production", year),
      seedGenerationRow("Tank bottom sludge", "production", year),
      seedGenerationRow("Oily sludge", "production", year),
      seedGenerationRow("Contaminated soil removed", "production", year),
      seedGenerationRow("Scrap metal generated", "maintenance", year),
      seedGenerationRow("Used filters generated", "maintenance", year),
      seedGenerationRow("Used batteries generated", "maintenance", year),
      seedGenerationRow("Chemical containers discarded", "maintenance", year),
    ],
    divertedRows: [
      seedDivertedRow("Hazardous waste recycled", "Recycling", year),
      seedDivertedRow("Non-hazardous waste recycled", "Recycling", year),
      seedDivertedRow("Scrap metal recycled", "Recycling", year),
      seedDivertedRow("Drill cuttings reused", "Reuse", year),
      seedDivertedRow("Drilling mud reused", "Reuse", year),
      seedDivertedRow("Equipment reused", "Reuse", year),
      seedDivertedRow("Waste recovered for energy", "Recovery", year),
      seedDivertedRow("Waste recovered for material use", "Recovery", year),
    ],
    disposalRows: [
      seedDisposalRow("Hazardous waste landfilled", "Landfill", year),
      seedDisposalRow("Non-hazardous waste landfilled", "Landfill", year),
      seedDisposalRow("Hazardous waste incinerated", "Incineration", year),
      seedDisposalRow("Non-hazardous waste incinerated", "Incineration", year),
      seedDisposalRow("Waste injected underground", "Deep Well Injection", year),
      seedDisposalRow("Waste sent to licensed treatment facilities", "Waste Treatment Facility", year),
    ],
    hydrocarbonProduction: null,
    reportingPeriod,
  };
}

function normalizeGenerationRow(raw: unknown, fallbackYear: number): WasteGenerationRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<WasteGenerationRow>;
  const category = r.category;
  if (
    category !== "hazardous" &&
    category !== "non_hazardous" &&
    category !== "drilling" &&
    category !== "production" &&
    category !== "maintenance"
  ) {
    return null;
  }
  return {
    id: typeof r.id === "string" ? r.id : newTopicRowId(),
    wasteType: typeof r.wasteType === "string" ? r.wasteType : "",
    field: typeof r.field === "string" ? r.field : "",
    businessUnit: typeof r.businessUnit === "string" ? r.businessUnit : "",
    month:
      typeof r.month === "number" && Number.isFinite(r.month) && r.month >= 1 && r.month <= 12
        ? r.month
        : new Date().getMonth() + 1,
    category,
    quantity: typeof r.quantity === "number" && Number.isFinite(r.quantity) ? r.quantity : 0,
    unit: "tonnes",
    reportingYear:
      typeof r.reportingYear === "number" && Number.isFinite(r.reportingYear) ? r.reportingYear : fallbackYear,
  };
}

function normalizeDivertedRow(raw: unknown, fallbackYear: number): WasteDivertedRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<WasteDivertedRow>;
  const method = r.method;
  if (!method || !DIVERTED_METHODS.includes(method as (typeof DIVERTED_METHODS)[number])) return null;
  return {
    id: typeof r.id === "string" ? r.id : newTopicRowId(),
    wasteCategory: typeof r.wasteCategory === "string" ? r.wasteCategory : "",
    field: typeof r.field === "string" ? r.field : "",
    businessUnit: typeof r.businessUnit === "string" ? r.businessUnit : "",
    month:
      typeof r.month === "number" && Number.isFinite(r.month) && r.month >= 1 && r.month <= 12
        ? r.month
        : new Date().getMonth() + 1,
    quantity: typeof r.quantity === "number" && Number.isFinite(r.quantity) ? r.quantity : 0,
    unit: "tonnes",
    method: method as WasteDivertedRow["method"],
    reportingYear:
      typeof r.reportingYear === "number" && Number.isFinite(r.reportingYear) ? r.reportingYear : fallbackYear,
  };
}

function normalizeDisposalRow(raw: unknown, fallbackYear: number): WasteDisposalRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<WasteDisposalRow>;
  const disposalMethod = r.disposalMethod;
  if (!disposalMethod || !DISPOSAL_METHODS.includes(disposalMethod as (typeof DISPOSAL_METHODS)[number])) return null;
  return {
    id: typeof r.id === "string" ? r.id : newTopicRowId(),
    wasteCategory: typeof r.wasteCategory === "string" ? r.wasteCategory : "",
    field: typeof r.field === "string" ? r.field : "",
    businessUnit: typeof r.businessUnit === "string" ? r.businessUnit : "",
    month:
      typeof r.month === "number" && Number.isFinite(r.month) && r.month >= 1 && r.month <= 12
        ? r.month
        : new Date().getMonth() + 1,
    quantity: typeof r.quantity === "number" && Number.isFinite(r.quantity) ? r.quantity : 0,
    unit: "tonnes",
    disposalMethod: disposalMethod as WasteDisposalRow["disposalMethod"],
    reportingYear:
      typeof r.reportingYear === "number" && Number.isFinite(r.reportingYear) ? r.reportingYear : fallbackYear,
  };
}

function normalizeData(raw: unknown, draft: BoundaryDraftV2): WasteManagementData {
  const defaults = defaultWasteManagementData(draft);
  const fallbackYear = reportingYearFromDraft(draft);
  if (!raw || typeof raw !== "object") return defaults;
  const o = raw as Partial<WasteManagementData>;

  const generationRows = Array.isArray(o.generationRows)
    ? o.generationRows.map((r) => normalizeGenerationRow(r, fallbackYear)).filter((r): r is WasteGenerationRow => !!r)
    : defaults.generationRows;

  const divertedRows = Array.isArray(o.divertedRows)
    ? o.divertedRows.map((r) => normalizeDivertedRow(r, fallbackYear)).filter((r): r is WasteDivertedRow => !!r)
    : defaults.divertedRows;

  const disposalRows = Array.isArray(o.disposalRows)
    ? o.disposalRows.map((r) => normalizeDisposalRow(r, fallbackYear)).filter((r): r is WasteDisposalRow => !!r)
    : defaults.disposalRows;

  return {
    policy: o.policy && typeof o.policy === "object" ? o.policy : {},
    generationRows: generationRows.length ? generationRows : defaults.generationRows,
    divertedRows: divertedRows.length ? divertedRows : defaults.divertedRows,
    disposalRows: disposalRows.length ? disposalRows : defaults.disposalRows,
    hydrocarbonProduction:
      typeof o.hydrocarbonProduction === "number" && Number.isFinite(o.hydrocarbonProduction)
        ? o.hydrocarbonProduction
        : null,
    reportingPeriod:
      typeof o.reportingPeriod === "string" && o.reportingPeriod.trim()
        ? o.reportingPeriod
        : formatPeriodRangeLabel(draft.period_start, draft.period_end),
  };
}

function normalizeStore(raw: unknown, currentKey: string, draft: BoundaryDraftV2): WasteStoreV1 {
  const base: WasteStoreV1 = { version: 1, periodKey: currentKey, byAssetId: {} };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<WasteStoreV1>;
  if (o.periodKey !== currentKey) return base;
  if (o.version !== 1 || !o.byAssetId || typeof o.byAssetId !== "object") return base;
  const byAssetId: Record<string, WasteManagementData> = {};
  for (const [aid, v] of Object.entries(o.byAssetId)) {
    byAssetId[aid] = normalizeData(v, draft);
  }
  return { version: 1, periodKey: currentKey, byAssetId };
}

export function loadWasteStore(draft?: BoundaryDraftV2): WasteStoreV1 {
  const d = draft ?? loadBoundaryDraft();
  const key = periodKeyFromDraft(d);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, periodKey: key, byAssetId: {} };
    return normalizeStore(JSON.parse(raw), key, d);
  } catch {
    return { version: 1, periodKey: key, byAssetId: {} };
  }
}

export function saveWasteStore(store: WasteStoreV1): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getWasteDataForAsset(store: WasteStoreV1, assetId: string, draft?: BoundaryDraftV2): WasteManagementData {
  const d = draft ?? loadBoundaryDraft();
  return store.byAssetId[assetId] ?? defaultWasteManagementData(d);
}

export function setWasteDataForAsset(
  store: WasteStoreV1,
  assetId: string,
  data: WasteManagementData
): WasteStoreV1 {
  return {
    ...store,
    byAssetId: { ...store.byAssetId, [assetId]: data },
  };
}

import { defaultCoverageRows } from "./sourceCategories";
import type { AssetSnapshotRow, BoundaryDraftV2 } from "./boundaryTypes";
import type { OrgBoundaryMethod } from "./orgBoundaryMethod";

const STORAGE_KEY_V2 = "esg_boundary_settings_ui_v2";
const STORAGE_KEY_V1 = "esg_boundary_settings_ui_v1";

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addOneYear(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setFullYear(dt.getFullYear() + 1);
  return toIsoDate(dt);
}

export function defaultDraftV2(): BoundaryDraftV2 {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today.getFullYear(), 0, 1);
  const startIso = toIsoDate(start);
  return {
    version: 2,
    period_start: startIso,
    period_end: addOneYear(startIso),
    reporting_setup_notes: "",
    sector: null,
    business_segment: null,
    org_boundary_method: "",
    equity_share_confirmed: false,
    assets: [],
    sourceCoverageByAssetId: {},
    ghg_inventory_locked: false,
  };
}

interface LegacyV1 {
  sector?: string | null;
  org_boundary_method?: OrgBoundaryMethod;
  equity_share_confirmed?: boolean;
  period_start?: string;
  period_end?: string;
  method_locked?: boolean;
  focus_topic_ids?: string[];
}

function newAssetId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `asset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyAsset(): AssetSnapshotRow {
  return {
    id: newAssetId(),
    asset_name: "",
    asset_type: "",
    country: "",
    region: "",
    lat: "",
    lng: "",
    ownership_type: "",
    ownership_percentage: "",
    operation_start_in_period: "",
    production_type: "",
    asset_status: "",
    oil_prod_bbl: "",
    gas_prod: "",
    notes: "",
    is_operator: false,
    operator_name: "",
    has_financial_control: false,
  };
}

function migrateFromV1(raw: LegacyV1): BoundaryDraftV2 {
  const base = defaultDraftV2();
  return {
    ...base,
    sector: raw.sector ?? null,
    org_boundary_method: (raw.org_boundary_method as OrgBoundaryMethod) ?? "",
    equity_share_confirmed: raw.equity_share_confirmed ?? false,
    period_start: raw.period_start || base.period_start,
    period_end: raw.period_end || base.period_end,
    ghg_inventory_locked: raw.method_locked ?? false,
  };
}

function normalizeV2(raw: Partial<BoundaryDraftV2>): BoundaryDraftV2 {
  const base = defaultDraftV2();
  const assets = Array.isArray(raw.assets) ? raw.assets : [];
  const cov: Record<string, ReturnType<typeof defaultCoverageRows>> = {};
  for (const a of assets) {
    if (!a.id) continue;
    const existing = raw.sourceCoverageByAssetId?.[a.id];
    cov[a.id] =
      Array.isArray(existing) && existing.length === 6 ? existing : defaultCoverageRows();
  }
  return {
    version: 2,
    period_start: raw.period_start || base.period_start,
    period_end: raw.period_end || base.period_end,
    reporting_setup_notes: typeof raw.reporting_setup_notes === "string" ? raw.reporting_setup_notes : "",
    sector: raw.sector ?? null,
    business_segment: raw.business_segment ?? null,
    org_boundary_method: (raw.org_boundary_method as OrgBoundaryMethod) ?? "",
    equity_share_confirmed: raw.equity_share_confirmed ?? false,
    assets,
    sourceCoverageByAssetId: cov,
    ghg_inventory_locked:
      (raw as { ghg_inventory_locked?: boolean }).ghg_inventory_locked ??
      (raw as { inventory_locked?: boolean }).inventory_locked ??
      false,
  };
}

export function loadBoundaryDraft(): BoundaryDraftV2 {
  try {
    const v2raw = localStorage.getItem(STORAGE_KEY_V2);
    if (v2raw) {
      return normalizeV2(JSON.parse(v2raw) as Partial<BoundaryDraftV2>);
    }
    const v1raw = localStorage.getItem(STORAGE_KEY_V1);
    if (v1raw) {
      return migrateFromV1(JSON.parse(v1raw) as LegacyV1);
    }
  } catch {
    /* ignore */
  }
  return defaultDraftV2();
}

/** Ensure every asset has six S2 coverage rows (for in-memory updates before save). */
export function ensureCoverageMap(draft: BoundaryDraftV2): BoundaryDraftV2 {
  const cov = { ...draft.sourceCoverageByAssetId };
  for (const a of draft.assets) {
    if (!cov[a.id] || cov[a.id].length !== 6) {
      cov[a.id] = defaultCoverageRows();
    }
  }
  return { ...draft, sourceCoverageByAssetId: cov };
}

export function saveBoundaryDraft(draft: BoundaryDraftV2): void {
  const normalized = normalizeV2(ensureCoverageMap(draft));
  localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(normalized));
}

export { STORAGE_KEY_V2, STORAGE_KEY_V1, newAssetId };

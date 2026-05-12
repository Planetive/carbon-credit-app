import type { OrgBoundaryMethod } from "./orgBoundaryMethod";

export type { OrgBoundaryMethod } from "./orgBoundaryMethod";

/** Top-level ESG Management boundary wizard (ends at asset register). */
export type WizardStep =
  | "reportingSetup"
  | "sectorSegment"
  | "organisationalBoundary"
  | "assetRegister";

export type BusinessSegment = "upstream" | "midstream" | "downstream";

/** S2 category ids (structural foundation). */
export type SourceCategoryId = "A" | "B" | "C" | "D" | "E" | "F";

export type SourceCoverageStatus = "included" | "excluded" | "not_applicable";

export type DataQualityMode = "measured" | "estimated" | "pending_operator_data";

/** Per-asset, per-category coverage row (boundary wizard — not full S2 quantities). */
export interface SourceCoverageRow {
  categoryId: SourceCategoryId;
  /** Is this source category present / applicable for this asset? */
  categoryPresent: boolean;
  coverage: SourceCoverageStatus;
  exclusionReason: string;
  dataAvailability: string;
  dataQualityMode: DataQualityMode;
}

/** Phase-1 snapshot row: S1 Part B + mandatory attribution fields (separate from ownership_type). */
export interface AssetSnapshotRow {
  id: string;
  asset_name: string;
  asset_type: string;
  country: string;
  region: string;
  lat: string;
  lng: string;
  ownership_type: string;
  ownership_percentage: string;
  operation_start_in_period: string;
  production_type: string;
  asset_status: string;
  oil_prod_bbl: string;
  gas_prod: string;
  notes: string;
  is_operator: boolean;
  operator_name: string;
  has_financial_control: boolean;
}

export interface BoundaryDraftV2 {
  version: 2;
  period_start: string;
  period_end: string;
  reporting_setup_notes: string;
  sector: string | null;
  business_segment: BusinessSegment | null;
  org_boundary_method: OrgBoundaryMethod;
  equity_share_confirmed: boolean;
  assets: AssetSnapshotRow[];
  /** Parallel to assets: keyed by asset id — used by GHG inventory boundary flow only. */
  sourceCoverageByAssetId: Record<string, SourceCoverageRow[]>;
  /** GHG-specific: locks operational boundary + review for this device snapshot (not global ESG setup). */
  ghg_inventory_locked: boolean;
}

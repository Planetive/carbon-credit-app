import { apiFetch } from "./client";

/**
 * Phase 5B draft contract for PCAF 2025 §5.7 Use of Proceeds.
 *
 * Persists questionnaire/structure/holding/asset snapshots to
 * /api/v1/uop/drafts. Calculation is POST /api/v1/uop/calculate.
 * Neither path writes app.financed_emissions. Reportable Save stays
 * disabled until Phase 5D.
 *
 * Identity is financing_instance_id. formula_id is methodology only.
 */

export type UopDraftSnapshot = Record<string, unknown>;

export type UopInvestmentRecord = {
  id: string;
  organization_id: string;
  user_id: string;
  structure_id: string;
  counterparty_id?: string | null;
  exposure_id?: string | null;
  financing_instance_id: string;
  instance_key?: string | null;
  investment_type?: string | null;
  outstanding_amount?: string | number | null;
  formula_id?: string | null;
  formula_name?: string | null;
  status: string;
  is_reportable: boolean;
  include_in_portfolio: boolean;
  draft_snapshot: UopDraftSnapshot;
  created_at?: string | null;
  updated_at?: string | null;
};

export type UopStructureRecord = {
  id: string;
  organization_id: string;
  classification?: string | null;
  name: string;
  issuer_name: string;
  structure_kind: string;
  reporting_year?: string | null;
  methodology_version: string;
  currency: string;
  status: string;
};

export type UopUnderlyingAssetRecord = {
  id: string;
  structure_id: string;
  underlying_asset_id: string;
  name: string;
  asset_class: string;
  sort_order: number;
};

export type UopAssetCalculationRecord = {
  id: string;
  asset_id: string;
  investment_id?: string | null;
  reporting_year?: string | null;
  methodology_version: string;
  formula_id?: string | null;
  status: string;
  is_reportable: boolean;
  include_in_portfolio: boolean;
  financed_emissions?: string | number | null;
};

export type UopDraftRecord = {
  investment: UopInvestmentRecord;
  structure: UopStructureRecord;
  assets: UopUnderlyingAssetRecord[];
  calculations: UopAssetCalculationRecord[];
  draft: UopDraftSnapshot;
  created: boolean;
  sibling_count?: number;
  holding_count?: number;
  shared_write_applied?: boolean;
};

export type UopDraftConflict = {
  code: "shared_structure_conflict" | "stale_structure" | "stale_investment" | string;
  message: string;
  changed_fields?: string[];
  structure_id?: string;
  structure_updated_at?: string | null;
  sibling_count?: number;
  sibling_financing_instance_ids?: string[];
  investment_id?: string;
  investment_updated_at?: string | null;
};

export type UopDraftUpsertBody = {
  financing_instance_id: string;
  instance_key?: string | null;
  counterparty_id?: string | null;
  exposure_id?: string | null;
  structure_id?: string | null;
  formula_id?: string | null;
  formula_name?: string | null;
  update_shared?: boolean;
  expected_structure_updated_at?: string | null;
  expected_investment_updated_at?: string | null;
  draft: UopDraftSnapshot;
};

export function listUopDrafts(params?: {
  counterparty_id?: string;
  structure_id?: string;
  financing_instance_id?: string;
}) {
  const search = new URLSearchParams();
  if (params?.counterparty_id) search.set("counterparty_id", params.counterparty_id);
  if (params?.structure_id) search.set("structure_id", params.structure_id);
  if (params?.financing_instance_id) {
    search.set("financing_instance_id", params.financing_instance_id);
  }
  const q = search.toString() ? `?${search}` : "";
  return apiFetch<UopDraftRecord[]>(`/api/v1/uop/drafts${q}`, { method: "GET" });
}

export function upsertUopDraft(body: UopDraftUpsertBody) {
  return apiFetch<UopDraftRecord>("/api/v1/uop/drafts", {
    method: "PUT",
    body,
  });
}

export function getUopDraft(investmentId: string) {
  return apiFetch<UopDraftRecord>(`/api/v1/uop/drafts/${investmentId}`, {
    method: "GET",
  });
}

export function getUopDraftByInstance(
  financingInstanceId: string,
  counterpartyId?: string | null
) {
  const search = new URLSearchParams();
  if (counterpartyId) search.set("counterparty_id", counterpartyId);
  const q = search.toString() ? `?${search}` : "";
  return apiFetch<UopDraftRecord>(
    `/api/v1/uop/drafts/by-instance/${encodeURIComponent(financingInstanceId)}${q}`,
    { method: "GET" }
  );
}

export function patchUopDraft(
  investmentId: string,
  body: Partial<UopDraftUpsertBody>
) {
  return apiFetch<UopDraftRecord>(`/api/v1/uop/drafts/${investmentId}`, {
    method: "PATCH",
    body,
  });
}

export function deleteUopDraft(investmentId: string) {
  return apiFetch<{ status?: string }>(`/api/v1/uop/drafts/${investmentId}`, {
    method: "DELETE",
  });
}

export type UopCalculateBody = {
  financing_instance_id?: string | null;
  structure_id?: string | null;
  investment_id?: string | null;
  counterparty_id?: string | null;
  persist?: boolean;
  persist_reportable?: boolean;
  expected_fingerprint?: string | null;
  expected_structure_updated_at?: string | null;
  expected_investment_updated_at?: string | null;
  draft?: UopDraftSnapshot | null;
  issuer_level?: Record<string, unknown> | null;
};

export type UopCalculateResponse = {
  status: string;
  code?: string | null;
  message?: string | null;
  classification?: string | null;
  emissions_path?: string | null;
  formula_id?: string | null;
  formula_name?: string | null;
  methodology_version: string;
  emissions_unit?: string;
  pcaf_ref?: string | null;
  eligibility?: Record<string, unknown>;
  investor_attribution?: Record<string, unknown>;
  financed_emissions?: number | null;
  allocated_financed_emissions?: number | null;
  unallocated_financed_emissions?: number | null;
  data_quality_score?: number | null;
  assets?: Array<Record<string, unknown>>;
  allocation?: Record<string, unknown> | null;
  scope_breakdown?: Record<string, unknown> | null;
  issuer_report?: Record<string, unknown> | null;
  notes?: string[];
  warnings?: string[];
  is_reportable?: boolean;
  include_in_portfolio?: boolean;
  double_count_guard?: string | null;
  persisted?: boolean;
  persisted_reportable?: boolean;
  reportable_record_id?: string | null;
  calculation_fingerprint?: string | null;
  reporting_year?: string | null;
  overlap?: Record<string, unknown> | null;
  financing_instance_id?: string | null;
  structure_id?: string | null;
  investment_id?: string | null;
  structure_updated_at?: string | null;
  investment_updated_at?: string | null;
};

export function calculateUop(body: UopCalculateBody) {
  return apiFetch<UopCalculateResponse>("/api/v1/uop/calculate", {
    method: "POST",
    body,
  });
}

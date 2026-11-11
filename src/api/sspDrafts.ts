import { apiFetch } from "./client";

/**
 * Phase 6B draft contract for PCAF 2025 §5.8 Securitization & Structured Products.
 *
 * Persists deal/holding/hierarchy snapshots to /api/v1/ssp/drafts.
 * No calculation or reportable Save is exposed here (Phase 6C+).
 *
 * Identity is financing_instance_id. formula_id is methodology only.
 */

export type SspDraftSnapshot = Record<string, unknown>;

export type SspHoldingRecord = {
  id: string;
  organization_id?: string;
  user_id?: string;
  deal_id: string;
  counterparty_id?: string | null;
  exposure_id?: string | null;
  financing_instance_id: string;
  instance_key?: string | null;
  tranche_id?: string | null;
  bank_outstanding_investment?: string | number | null;
  formula_id?: string | null;
  formula_name?: string | null;
  status?: string;
  is_reportable?: boolean;
  include_in_portfolio?: boolean;
  draft_snapshot?: SspDraftSnapshot;
  created_at?: string | null;
  updated_at?: string | null;
};

export type SspDealRecord = {
  id: string;
  organization_id?: string;
  name?: string;
  deal_identifier?: string | null;
  structure_type?: string | null;
  reporting_year?: string | null;
  currency?: string | null;
  status?: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type SspCollateralRecord = Record<string, unknown> & { id?: string };
export type SspLoanRecord = Record<string, unknown> & { id?: string };
export type SspPoolRecord = Record<string, unknown> & { id?: string };
export type SspTrancheRecord = Record<string, unknown> & { id?: string };
export type SspCalculationRecord = Record<string, unknown> & { id?: string };

export type SspDraftRecord = {
  holding: SspHoldingRecord;
  deal: SspDealRecord;
  collateral: SspCollateralRecord[];
  loans: SspLoanRecord[];
  pools: SspPoolRecord[];
  tranches: SspTrancheRecord[];
  calculations: SspCalculationRecord[];
  draft: SspDraftSnapshot;
  created: boolean;
  sibling_count?: number;
  shared_write_applied?: boolean;
  holding_count?: number;
};

export type SspDraftConflict = {
  code: "shared_deal_conflict" | "stale_deal" | "stale_holding" | string;
  message: string;
  changed_fields?: string[];
  deal_id?: string;
  deal_updated_at?: string | null;
  sibling_count?: number;
  sibling_financing_instance_ids?: string[];
  holding_id?: string;
  holding_updated_at?: string | null;
};

export type SspDraftUpsertBody = {
  financing_instance_id: string;
  instance_key?: string | null;
  counterparty_id?: string | null;
  exposure_id?: string | null;
  deal_id?: string | null;
  formula_id?: string | null;
  formula_name?: string | null;
  update_shared?: boolean;
  expected_deal_updated_at?: string | null;
  expected_holding_updated_at?: string | null;
  draft: SspDraftSnapshot;
};

const BASE = "/api/v1/ssp/drafts";

export function listSspDrafts(params?: {
  counterparty_id?: string;
  deal_id?: string;
  financing_instance_id?: string;
}) {
  const search = new URLSearchParams();
  if (params?.counterparty_id) search.set("counterparty_id", params.counterparty_id);
  if (params?.deal_id) search.set("deal_id", params.deal_id);
  if (params?.financing_instance_id) {
    search.set("financing_instance_id", params.financing_instance_id);
  }
  const q = search.toString() ? `?${search}` : "";
  return apiFetch<SspDraftRecord[]>(`${BASE}${q}`, { method: "GET" });
}

export function upsertSspDraft(body: SspDraftUpsertBody) {
  return apiFetch<SspDraftRecord>(BASE, {
    method: "PUT",
    body,
  });
}

export function getSspDraft(holdingId: string) {
  return apiFetch<SspDraftRecord>(`${BASE}/${holdingId}`, {
    method: "GET",
  });
}

export function getSspDraftByInstance(
  financingInstanceId: string,
  counterpartyId?: string | null
) {
  const search = new URLSearchParams();
  if (counterpartyId) search.set("counterparty_id", counterpartyId);
  const q = search.toString() ? `?${search}` : "";
  return apiFetch<SspDraftRecord>(
    `${BASE}/by-instance/${encodeURIComponent(financingInstanceId)}${q}`,
    { method: "GET" }
  );
}

export function patchSspDraft(
  holdingId: string,
  body: Partial<SspDraftUpsertBody>
) {
  return apiFetch<SspDraftRecord>(`${BASE}/${holdingId}`, {
    method: "PATCH",
    body,
  });
}

export function deleteSspDraft(holdingId: string) {
  return apiFetch<{ status?: string }>(`${BASE}/${holdingId}`, {
    method: "DELETE",
  });
}

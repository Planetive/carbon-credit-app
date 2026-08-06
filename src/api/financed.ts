import { apiFetch } from "./client";

export type FinancedEmission = {
  id: string;
  organization_id: string;
  user_id: string;
  counterparty_id?: string | null;
  exposure_id?: string | null;
  questionnaire_id?: string | null;
  calc_kind: "finance" | "facilitated" | string;
  company_type?: string | null;
  formula_id?: string | null;
  formula_name?: string | null;
  inputs?: Record<string, unknown>;
  results?: Record<string, unknown>;
  financed_emissions?: number | null;
  attribution_factor?: number | null;
  data_quality_score?: number | null;
  status: string;
  legacy_source?: string | null;
  legacy_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export function listFinancedEmissions(params?: {
  calc_kind?: string;
  counterparty_id?: string;
  status?: string;
}) {
  const search = new URLSearchParams();
  if (params?.calc_kind) search.set("calc_kind", params.calc_kind);
  if (params?.counterparty_id) search.set("counterparty_id", params.counterparty_id);
  if (params?.status) search.set("status", params.status);
  const q = search.toString() ? `?${search}` : "";
  return apiFetch<FinancedEmission[]>(`/api/v1/financed-emissions${q}`, {
    method: "GET",
  });
}

export function createFinancedEmission(body: {
  calc_kind?: string;
  company_type?: string | null;
  formula_id?: string | null;
  formula_name?: string | null;
  inputs?: Record<string, unknown>;
  results?: Record<string, unknown>;
  financed_emissions?: number | null;
  attribution_factor?: number | null;
  data_quality_score?: number | null;
  counterparty_id?: string | null;
  exposure_id?: string | null;
  questionnaire_id?: string | null;
  status?: string;
}) {
  return apiFetch<FinancedEmission>("/api/v1/financed-emissions", {
    method: "POST",
    body,
  });
}

export function patchFinancedEmission(
  id: string,
  body: Partial<{
    calc_kind: string;
    company_type: string | null;
    formula_id: string | null;
    formula_name: string | null;
    inputs: Record<string, unknown>;
    results: Record<string, unknown>;
    financed_emissions: number | null;
    attribution_factor: number | null;
    data_quality_score: number | null;
    counterparty_id: string | null;
    exposure_id: string | null;
    questionnaire_id: string | null;
    status: string;
  }>
) {
  return apiFetch<FinancedEmission>(`/api/v1/financed-emissions/${id}`, {
    method: "PATCH",
    body,
  });
}

export function deleteFinancedEmission(id: string) {
  return apiFetch<{ status?: string }>(`/api/v1/financed-emissions/${id}`, {
    method: "DELETE",
  });
}

export function calculateFinancedEmission(body: {
  calc_kind?: string;
  formula_id: string;
  company_type: string;
  inputs: Record<string, unknown>;
  counterparty_id?: string | null;
  exposure_id?: string | null;
  /** Default false (preview). Pass true only to persist via calculate. */
  persist?: boolean;
}) {
  return apiFetch<{
    success: boolean;
    result: Record<string, unknown>;
    record?: FinancedEmission | null;
  }>("/api/v1/financed-emissions/calculate", {
    method: "POST",
    body: { persist: false, ...body },
  });
}

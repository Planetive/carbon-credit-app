import { apiFetch } from "./client";

export type FactorDataset = {
  id: string;
  code?: string | null;
  publisher?: string | null;
  title?: string | null;
  version_label?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  is_active?: boolean | null;
  source_notes?: string | null;
  created_at?: string | null;
};

export type FactorRow = {
  id: string;
  dataset_id: string;
  category?: string | null;
  label?: string | null;
  attributes?: Record<string, unknown>;
  unit?: string | null;
  kg_co2e?: number | null;
  kg_co2?: number | null;
  kg_ch4?: number | null;
  kg_n2o?: number | null;
  meta?: Record<string, unknown> | null;
  created_at?: string | null;
  dataset?: Partial<FactorDataset>;
};

export function listFactorDatasets(params?: {
  methodology?: string;
  name?: string;
  source?: string;
  active_only?: boolean;
  limit?: number;
  offset?: number;
}) {
  const search = new URLSearchParams();
  if (params?.methodology) search.set("methodology", params.methodology);
  if (params?.name) search.set("name", params.name);
  if (params?.source) search.set("source", params.source);
  if (params?.active_only != null) search.set("active_only", String(params.active_only));
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.offset != null) search.set("offset", String(params.offset));
  const q = search.toString() ? `?${search}` : "";
  return apiFetch<FactorDataset[]>(`/api/v1/factors/datasets${q}`, { method: "GET" });
}

export function getFactorDataset(id: string) {
  return apiFetch<FactorDataset>(`/api/v1/factors/datasets/${id}`, { method: "GET" });
}

export function listFactorRows(params: {
  dataset_id?: string;
  q?: string;
  category?: string;
  limit?: number;
  offset?: number;
}) {
  const search = new URLSearchParams();
  if (params.dataset_id) search.set("dataset_id", params.dataset_id);
  if (params.q) search.set("q", params.q);
  if (params.category) search.set("category", params.category);
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.offset != null) search.set("offset", String(params.offset));
  const q = search.toString() ? `?${search}` : "";
  return apiFetch<FactorRow[]>(`/api/v1/factors/rows${q}`, { method: "GET" });
}

export function getFactorRow(id: string) {
  return apiFetch<FactorRow>(`/api/v1/factors/rows/${id}`, { method: "GET" });
}

/** Full sheet as legacy-shaped dicts (attributes jsonb flattened). */
export function getFactorSheet(code: string) {
  return apiFetch<Record<string, unknown>[]>(
    `/api/v1/factors/sheets/${encodeURIComponent(code)}`,
    { method: "GET" }
  );
}

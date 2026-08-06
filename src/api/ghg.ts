import { apiFetch } from "./client";

export type EmissionAssessment = {
  id: string;
  organization_id: string;
  user_id: string;
  framework: string;
  reporting_period?: string | null;
  status: string;
  totals?: Record<string, unknown>;
  legacy_note?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type EmissionActivity = {
  id: string;
  assessment_id: string;
  organization_id: string;
  user_id: string;
  scope: number;
  category: string;
  method: string;
  counterparty_id?: string | null;
  quantity?: number | null;
  unit?: string | null;
  factor_dataset_id?: string | null;
  factor_row_id?: string | null;
  emissions_tco2e?: number | null;
  raw?: Record<string, unknown>;
  legacy_source: string;
  legacy_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export function listEmissionAssessments(params?: {
  status?: string;
  framework?: string;
}) {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.framework) search.set("framework", params.framework);
  const q = search.toString() ? `?${search}` : "";
  return apiFetch<EmissionAssessment[]>(`/api/v1/emission-assessments${q}`, {
    method: "GET",
  });
}

export function createEmissionAssessment(body: {
  framework?: string;
  reporting_period?: string | null;
  status?: string;
  totals?: Record<string, unknown>;
  legacy_note?: string | null;
}) {
  return apiFetch<EmissionAssessment>("/api/v1/emission-assessments", {
    method: "POST",
    body,
  });
}

export function patchEmissionAssessment(
  id: string,
  body: Partial<{
    framework: string;
    reporting_period: string | null;
    status: string;
    totals: Record<string, unknown>;
    legacy_note: string | null;
  }>
) {
  return apiFetch<EmissionAssessment>(`/api/v1/emission-assessments/${id}`, {
    method: "PATCH",
    body,
  });
}

export function deleteEmissionAssessment(id: string) {
  return apiFetch<{ status?: string }>(`/api/v1/emission-assessments/${id}`, {
    method: "DELETE",
  });
}

export function listEmissionActivities(params?: {
  assessment_id?: string;
  scope?: number;
  category?: string;
  legacy_source?: string;
}) {
  const search = new URLSearchParams();
  if (params?.assessment_id) search.set("assessment_id", params.assessment_id);
  if (params?.scope != null) search.set("scope", String(params.scope));
  if (params?.category) search.set("category", params.category);
  if (params?.legacy_source) search.set("legacy_source", params.legacy_source);
  const q = search.toString() ? `?${search}` : "";
  return apiFetch<EmissionActivity[]>(`/api/v1/emission-activities${q}`, {
    method: "GET",
  });
}

export function createEmissionActivity(body: {
  assessment_id: string;
  scope: number;
  category: string;
  method?: string;
  counterparty_id?: string | null;
  quantity?: number | null;
  unit?: string | null;
  emissions_tco2e?: number | null;
  raw?: Record<string, unknown>;
  legacy_source?: string;
  legacy_id?: string | null;
}) {
  return apiFetch<EmissionActivity>("/api/v1/emission-activities", {
    method: "POST",
    body,
  });
}

export function patchEmissionActivity(
  id: string,
  body: Partial<{
    scope: number;
    category: string;
    method: string;
    counterparty_id: string | null;
    quantity: number | null;
    unit: string | null;
    emissions_tco2e: number | null;
    raw: Record<string, unknown>;
  }>
) {
  return apiFetch<EmissionActivity>(`/api/v1/emission-activities/${id}`, {
    method: "PATCH",
    body,
  });
}

export function deleteEmissionActivity(id: string) {
  return apiFetch<{ status?: string }>(`/api/v1/emission-activities/${id}`, {
    method: "DELETE",
  });
}

/** Ensure one draft assessment exists for the org/framework; reuse latest if present. */
export async function getOrCreateDraftAssessment(
  framework: "uk" | "epa" | "ipcc" | "mixed" = "mixed",
  reportingPeriod?: string
): Promise<EmissionAssessment> {
  const existing = await listEmissionAssessments({
    framework,
    status: "draft",
  });
  if (existing.length > 0) return existing[0];
  return createEmissionAssessment({
    framework,
    reporting_period: reportingPeriod ?? null,
    status: "draft",
  });
}

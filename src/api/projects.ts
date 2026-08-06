import { apiFetch } from "./client";

/** User project wizard / drafts row (`public.project_inputs`). */
export type ProjectInput = {
  id: string;
  user_id: string;
  organization_id?: string | null;
  created_at?: string | null;
  current_industry?: string | null;
  industry_size?: string | null;
  has_emissions_knowledge?: string | null;
  ghg_types?: string | null;
  ghg_sources?: string | null;
  ghg_annual?: number | null;
  waste_volume?: number | null;
  waste_pollutants?: string | null;
  waste_treatment?: string | null;
  waste_destination?: string | null;
  other_type?: string | null;
  other_volume?: number | null;
  other_disposal?: string | null;
  project_name?: string | null;
  country?: string | null;
  area_of_interest?: string | null;
  /** Form field; may map to subcategory in DB. */
  type?: string | null;
  subcategory?: string | null;
  goal?: string | null;
  register_for_credits?: boolean | null;
  development_strategy?: string | null;
  additional_info?: string | null;
};

export type ProjectInputCreate = Omit<
  ProjectInput,
  "id" | "user_id" | "organization_id" | "created_at"
>;

export type ProjectReport = {
  id: string;
  project_id?: string | null;
  user_id: string;
  report_type?: string | null;
  report_title?: string | null;
  report_format?: string | null;
  report_data?: Record<string, unknown> | null;
  file_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
};

export function listMyProjectInputs() {
  return apiFetch<ProjectInput[]>("/api/v1/me/project-inputs", { method: "GET" });
}

export function getMyProjectInput(id: string) {
  return apiFetch<ProjectInput>(`/api/v1/me/project-inputs/${id}`, { method: "GET" });
}

export function createMyProjectInput(body: ProjectInputCreate) {
  return apiFetch<ProjectInput>("/api/v1/me/project-inputs", {
    method: "POST",
    body,
  });
}

export function deleteMyProjectInput(id: string) {
  return apiFetch<{ status?: string }>(`/api/v1/me/project-inputs/${id}`, {
    method: "DELETE",
  });
}

export function listMyProjectReports() {
  return apiFetch<ProjectReport[]>("/api/v1/me/project-reports", { method: "GET" });
}

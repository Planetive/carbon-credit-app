import { apiFetch } from "./client";
import { BACKEND_URL, USE_JWT_AUTH } from "./config";

export type EsgAssessment = {
  id: string;
  user_id: string;
  assessment_type: string;
  status: "draft" | "submitted" | string;
  readiness_answers?: Record<string, unknown> | null;
  total_completion?: number | null;
  readiness_version?: number | null;
  submitted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type EsgScore = {
  id: string;
  user_id: string;
  assessment_id: string;
  readiness_overall_score?: number | null;
  readiness_maturity_band?: string | null;
  readiness_completion_pct?: number | null;
  readiness_results?: unknown;
  scored_by?: string | null;
  scored_at?: string | null;
};

export type EsgAssessmentUpsert = {
  assessment_type: string;
  status: "draft" | "submitted";
  readiness_answers: Record<string, unknown>;
  total_completion?: number | null;
  readiness_version?: number | null;
  submitted_at?: string | null;
};

export type EsgScoreUpsert = {
  assessment_id: string;
  readiness_overall_score?: number | null;
  readiness_maturity_band?: string | null;
  readiness_completion_pct?: number | null;
  readiness_results?: unknown;
  scored_by?: string | null;
};

export type AdminEsgAssessmentListItem = {
  id: string;
  user_id: string;
  status: string;
  total_completion?: number | null;
  assessment_type: string;
  created_at?: string | null;
  submitted_at?: string | null;
  updated_at?: string | null;
  user_display_name?: string | null;
  organization_name?: string | null;
  scored_at?: string | null;
  has_score: boolean;
};

export type AdminEsgAssessmentDetail = {
  id: string;
  user_id: string;
  status: string;
  assessment_type: string;
  readiness_answers?: Record<string, unknown> | null;
  total_completion?: number | null;
  readiness_version?: number | null;
  submitted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  organization_id?: string | null;
  user_display_name?: string | null;
  organization_name?: string | null;
  score?: EsgScore | null;
};

export function getLatestEsgAssessment(
  assessmentType: string,
  opts?: { status?: "draft" | "submitted" }
) {
  const q = new URLSearchParams({ assessment_type: assessmentType });
  if (opts?.status) q.set("status", opts.status);
  return apiFetch<EsgAssessment | null>(
    `/api/v1/esg/assessments/latest?${q}`,
    { method: "GET" }
  );
}

export function createEsgAssessment(body: EsgAssessmentUpsert) {
  return apiFetch<EsgAssessment>("/api/v1/esg/assessments", {
    method: "POST",
    body,
  });
}

export function updateEsgAssessment(id: string, body: EsgAssessmentUpsert) {
  return apiFetch<EsgAssessment>(`/api/v1/esg/assessments/${id}`, {
    method: "PATCH",
    body,
  });
}

export function getEsgScoreByAssessment(assessmentId: string) {
  return apiFetch<EsgScore | null>(
    `/api/v1/esg/scores/by-assessment/${assessmentId}`,
    { method: "GET" }
  );
}

export function upsertEsgScore(body: EsgScoreUpsert) {
  return apiFetch<EsgScore>("/api/v1/esg/scores", {
    method: "PUT",
    body,
  });
}

export function isEsgApiEnabled() {
  return USE_JWT_AUTH;
}

/** Platform admin key for cross-user ESG admin routes. */
export function getAdminApiKey(): string {
  return String(
    import.meta.env.VITE_ADMIN_API_KEY ||
      import.meta.env.VITE_ADMIN_PASSWORD ||
      ""
  ).trim();
}

/** Admin ESG API when JWT migration is on and an admin key is configured. */
export function isAdminEsgApiEnabled() {
  return Boolean(USE_JWT_AUTH && BACKEND_URL && getAdminApiKey());
}

function adminHeaders(): HeadersInit {
  return { "X-Admin-Key": getAdminApiKey() };
}

export function listAdminEsgAssessments(
  assessmentType = "issb_readiness_v1",
  limit = 200
) {
  const q = new URLSearchParams({
    assessment_type: assessmentType,
    limit: String(limit),
  });
  return apiFetch<AdminEsgAssessmentListItem[]>(
    `/api/v1/esg/admin/assessments?${q}`,
    { method: "GET", auth: false, headers: adminHeaders() }
  );
}

export function getAdminEsgAssessment(assessmentId: string) {
  return apiFetch<AdminEsgAssessmentDetail>(
    `/api/v1/esg/admin/assessments/${assessmentId}`,
    { method: "GET", auth: false, headers: adminHeaders() }
  );
}

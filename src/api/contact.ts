import { apiFetch } from "./client";
import { BACKEND_URL, USE_JWT_AUTH } from "./config";

export type ContactSubmission = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  subject: string;
  message: string;
  status: "new" | "in_progress" | "completed" | "spam" | string;
  created_at: string;
  updated_at: string;
};

export type ContactSubmissionCreate = {
  name: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  subject: string;
  message: string;
  status?: string;
};

export function getAdminApiKey(): string {
  return String(
    import.meta.env.VITE_ADMIN_API_KEY ||
      import.meta.env.VITE_ADMIN_PASSWORD ||
      ""
  ).trim();
}

export function isContactApiEnabled() {
  return Boolean(USE_JWT_AUTH && BACKEND_URL);
}

export function isAdminContactApiEnabled() {
  return Boolean(USE_JWT_AUTH && BACKEND_URL && getAdminApiKey());
}

function adminHeaders(): HeadersInit {
  return { "X-Admin-Key": getAdminApiKey() };
}

/** Public contact form submit (no JWT required). */
export function createContactSubmission(body: ContactSubmissionCreate) {
  return apiFetch<ContactSubmission>("/api/v1/contact-submissions", {
    method: "POST",
    body: { status: "new", ...body },
    auth: false,
  });
}

export function listAdminContactSubmissions() {
  return apiFetch<ContactSubmission[]>("/api/v1/admin/contact-submissions", {
    method: "GET",
    auth: false,
    headers: adminHeaders(),
  });
}

export function patchAdminContactSubmission(
  id: string,
  body: Partial<{ status: string }>
) {
  return apiFetch<ContactSubmission>(`/api/v1/admin/contact-submissions/${id}`, {
    method: "PATCH",
    body,
    auth: false,
    headers: adminHeaders(),
  });
}

export function deleteAdminContactSubmission(id: string) {
  return apiFetch<{ status?: string }>(`/api/v1/admin/contact-submissions/${id}`, {
    method: "DELETE",
    auth: false,
    headers: adminHeaders(),
  });
}

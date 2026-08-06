import { apiFetch } from "./client";

export type OrganizationOut = {
  id: string;
  name: string;
  description?: string | null;
  parent_organization_id?: string | null;
  is_original?: boolean | null;
  is_active?: boolean | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  role?: string | null;
};

export type OrgRole = "admin" | "user" | "editor" | "viewer";

export type InvitationOut = {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at?: string | null;
  status: string;
  organization_id: string;
  invited_by?: string | null;
  created_at?: string | null;
  permissions?: Record<string, boolean> | null;
};

export type MemberOut = {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  permissions?: Record<string, boolean>;
  status?: string | null;
  joined_at?: string | null;
  invited_by?: string | null;
  invited_at?: string | null;
  email?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
};

export type InvitationPeekOut = {
  id: string;
  email: string;
  organization_id: string;
  organization_name?: string | null;
  role: string;
  expires_at?: string | null;
  status: string;
  invited_by?: string | null;
  inviter_name?: string | null;
};

export type AcceptInvitationOut = {
  success: boolean;
  message: string;
  organization_id?: string | null;
};

export function listOrganizations() {
  return apiFetch<OrganizationOut[]>("/api/v1/organizations", { method: "GET" });
}

export function createOrganizationApi(body: {
  name: string;
  description?: string | null;
  parent_organization_id?: string | null;
  is_original?: boolean;
}) {
  return apiFetch<OrganizationOut>("/api/v1/organizations", {
    method: "POST",
    body,
  });
}

export function getOrganization(id: string) {
  return apiFetch<OrganizationOut>(`/api/v1/organizations/${id}`, { method: "GET" });
}

export function patchOrganization(
  id: string,
  body: { name?: string; description?: string | null; is_active?: boolean }
) {
  return apiFetch<OrganizationOut>(`/api/v1/organizations/${id}`, {
    method: "PATCH",
    body,
  });
}

export function createOrganizationInvitation(
  orgId: string,
  body: {
    email: string;
    role: OrgRole;
    permissions?: Record<string, boolean>;
  }
) {
  return apiFetch<InvitationOut>(
    `/api/v1/organizations/${orgId}/invitations`,
    { method: "POST", body }
  );
}

export function listOrganizationInvitations(
  orgId: string,
  status?: string
) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiFetch<InvitationOut[]>(
    `/api/v1/organizations/${orgId}/invitations${qs}`,
    { method: "GET" }
  );
}

export function listOrganizationMembers(orgId: string) {
  return apiFetch<MemberOut[]>(
    `/api/v1/organizations/${orgId}/members`,
    { method: "GET" }
  );
}

export function peekInvitationByToken(token: string) {
  return apiFetch<InvitationPeekOut>(
    `/api/v1/invitations/by-token/${encodeURIComponent(token)}`,
    { method: "GET", auth: false }
  );
}

export function acceptInvitationApi(token: string) {
  return apiFetch<AcceptInvitationOut>("/api/v1/invitations/accept", {
    method: "POST",
    body: { token },
  });
}

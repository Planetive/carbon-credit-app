import { apiFetch } from "./client";

export type ProfileResponse = {
  id: string;
  user_id: string;
  display_name: string;
  phone?: string | null;
  organization_name?: string | null;
  user_type?: string | null;
  current_organization_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  role?: string | null;
};

export type ProfileUpdate = {
  display_name?: string;
  phone?: string | null;
  organization_name?: string | null;
  user_type?: string | null;
  current_organization_id?: string | null;
};

export function getMyProfile() {
  return apiFetch<ProfileResponse>("/api/v1/me/profile", { method: "GET" });
}

export function patchMyProfile(body: ProfileUpdate) {
  return apiFetch<ProfileResponse>("/api/v1/me/profile", {
    method: "PATCH",
    body,
  });
}

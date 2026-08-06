import { apiFetch } from "./client";

export type TokenResponse = {
  access_token: string;
  token_type: string;
};

export type AuthMeResponse = {
  id: string;
  email: string;
  profile: {
    id: string;
    user_id: string;
    display_name: string;
    created_at?: string | null;
    updated_at?: string | null;
  };
  current_organization_id?: string | null;
  role?: string | null;
};

export function loginWithJwt(email: string, password: string) {
  return apiFetch<TokenResponse>("/auth/login", {
    method: "POST",
    auth: false,
    body: { email, password },
  });
}

export function signupWithJwt(
  email: string,
  password: string,
  display_name: string
) {
  return apiFetch<TokenResponse>("/auth/signup", {
    method: "POST",
    auth: false,
    body: { email, password, display_name },
  });
}

export function fetchMe() {
  return apiFetch<AuthMeResponse>("/auth/me", { method: "GET" });
}

export function logoutJwt() {
  return apiFetch<{ status: string; message: string }>("/auth/logout", {
    method: "POST",
    auth: false,
  });
}

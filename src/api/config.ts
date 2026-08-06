/**
 * Backend API config. Production stays on Supabase until VITE_USE_JWT_AUTH=true.
 */

const trimSlash = (url: string) => url.replace(/\/+$/, "");

export const USE_JWT_AUTH =
  String(import.meta.env.VITE_USE_JWT_AUTH || "").toLowerCase() === "true";

/** Alias used by dual-read helpers. */
export function isJwtAuthEnabled(): boolean {
  return USE_JWT_AUTH;
}

export const BACKEND_URL = trimSlash(
  import.meta.env.VITE_BACKEND_URL ||
    (import.meta.env.PROD ? "" : "http://127.0.0.1:8000")
);

export const ACCESS_TOKEN_KEY = "rc_access_token";

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAccessToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
    else localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    // ignore quota / private mode
  }
}

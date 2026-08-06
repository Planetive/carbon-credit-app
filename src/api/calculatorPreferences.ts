import { apiFetch } from "./client";

export type CalculatorPreferences = {
  user_id: string;
  has_lca_data: boolean | null;
  calculation_mode: "lca" | "manual" | null;
  initial_questionnaire_completed: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CalculatorPreferencesUpsert = {
  has_lca_data: boolean | null;
  calculation_mode: "lca" | "manual";
  initial_questionnaire_completed: boolean;
};

/** Current user's calculator prefs, or null if none saved yet. */
export function getMyCalculatorPreferences() {
  return apiFetch<CalculatorPreferences | null>(
    "/api/v1/me/calculator-preferences",
    { method: "GET" }
  );
}

/** Upsert by authenticated user (one row per user). */
export function upsertMyCalculatorPreferences(body: CalculatorPreferencesUpsert) {
  return apiFetch<CalculatorPreferences>("/api/v1/me/calculator-preferences", {
    method: "PUT",
    body,
  });
}

import { apiFetch } from "./client";
import type { Scope1ScreeningState } from "@/features/emission-calculator/scope1/activity-based/types";

export type CalculatorPreferences = {
  user_id: string;
  has_lca_data: boolean | null;
  calculation_mode: "lca" | "manual" | null;
  initial_questionnaire_completed: boolean;
  /** Activity-based Scope 1 Yes/No screening (AWS EC2 / JWT path). */
  scope1_screening?: Scope1ScreeningState | Record<string, string> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CalculatorPreferencesUpsert = {
  has_lca_data: boolean | null;
  calculation_mode: "lca" | "manual";
  initial_questionnaire_completed: boolean;
  scope1_screening?: Scope1ScreeningState | null;
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

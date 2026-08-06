import { USE_JWT_AUTH } from "@/api/config";
import { ApiError } from "@/api/client";
import {
  getMyCalculatorPreferences,
  upsertMyCalculatorPreferences,
  type CalculatorPreferences,
  type CalculatorPreferencesUpsert,
} from "@/api/calculatorPreferences";
import { supabase } from "./client";

export type { CalculatorPreferences, CalculatorPreferencesUpsert };

/** Load LCA / mode prefs for the signed-in user. Returns null if none. */
export async function loadCalculatorPreferences(
  userId: string
): Promise<CalculatorPreferences | null> {
  if (USE_JWT_AUTH) {
    try {
      return await getMyCalculatorPreferences();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  }

  const { data, error } = await (supabase as any)
    .from("emission_calculator_preferences")
    .select(
      "user_id, has_lca_data, calculation_mode, initial_questionnaire_completed, created_at, updated_at"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return (data as CalculatorPreferences) || null;
}

/** Upsert calculator prefs (one row per user_id). */
export async function saveCalculatorPreferences(
  userId: string,
  prefs: CalculatorPreferencesUpsert
): Promise<CalculatorPreferences> {
  if (USE_JWT_AUTH) {
    return upsertMyCalculatorPreferences(prefs);
  }

  const { data, error } = await (supabase as any)
    .from("emission_calculator_preferences")
    .upsert(
      {
        user_id: userId,
        has_lca_data: prefs.has_lca_data,
        calculation_mode: prefs.calculation_mode,
        initial_questionnaire_completed: prefs.initial_questionnaire_completed,
      },
      { onConflict: "user_id" }
    )
    .select(
      "user_id, has_lca_data, calculation_mode, initial_questionnaire_completed, created_at, updated_at"
    )
    .maybeSingle();

  if (error) throw error;
  return data as CalculatorPreferences;
}

/**
 * Persist Scope 1 activity-group screening answers.
 *
 * AWS / JWT (production path):
 *   → GET/PUT /api/v1/me/calculator-preferences.scope1_screening
 *   → column on public.emission_calculator_preferences (db/migrations/0013_…)
 *
 * Granular entry fields (equipment, site, period, gases):
 *   → stored in app.emission_activities.raw.activity_meta via ghgEntryClient
 *     (do NOT add public.scope1_* columns for the JWT path).
 *
 * Legacy / local:
 *   → localStorage cache; optional direct prefs table write when JWT is off.
 */
import { USE_JWT_AUTH } from "@/api/config";
import { ApiError } from "@/api/client";
import {
  getMyCalculatorPreferences,
  upsertMyCalculatorPreferences,
} from "@/api/calculatorPreferences";
import { supabase } from "./client";
import {
  DEFAULT_SCOPE1_SCREENING,
  type Scope1ScreeningState,
} from "@/features/emission-calculator/scope1/activity-based/types";

function normalizeScreening(
  raw: Scope1ScreeningState | Record<string, string> | null | undefined
): Scope1ScreeningState | null {
  if (!raw || typeof raw !== "object") return null;
  return {
    ...DEFAULT_SCOPE1_SCREENING,
    ...(raw as Partial<Scope1ScreeningState>),
  };
}

function isMissingColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message || "").toLowerCase();
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    msg.includes("scope1_screening") ||
    msg.includes("does not exist")
  );
}

export async function loadScope1ActivityScreeningFromDb(
  userId: string,
  _counterpartyId?: string | null
): Promise<Scope1ScreeningState | null> {
  if (USE_JWT_AUTH) {
    try {
      const prefs = await getMyCalculatorPreferences();
      return normalizeScreening(prefs?.scope1_screening);
    } catch (err: unknown) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 501)) {
        return null;
      }
      throw err;
    }
  }

  const { data, error } = await (supabase as any)
    .from("emission_calculator_preferences")
    .select("scope1_screening")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingColumnError(error)) return null;
    throw error;
  }
  return normalizeScreening(data?.scope1_screening);
}

export async function saveScope1ActivityScreeningToDb(
  userId: string,
  state: Scope1ScreeningState,
  _counterpartyId?: string | null
): Promise<void> {
  if (USE_JWT_AUTH) {
    try {
      const existing = await getMyCalculatorPreferences();
      await upsertMyCalculatorPreferences({
        has_lca_data: existing?.has_lca_data ?? null,
        calculation_mode:
          existing?.calculation_mode === "lca" || existing?.calculation_mode === "manual"
            ? existing.calculation_mode
            : "manual",
        initial_questionnaire_completed:
          existing?.initial_questionnaire_completed ?? true,
        scope1_screening: state,
      });
    } catch (err: unknown) {
      // Backend may not expose scope1_screening yet — keep localStorage as source of truth.
      if (err instanceof ApiError && (err.status === 404 || err.status === 422 || err.status === 501)) {
        console.warn("Scope 1 screening API not ready; using local cache only:", err.status);
        return;
      }
      throw err;
    }
    return;
  }

  const { data: existing, error: findError } = await (supabase as any)
    .from("emission_calculator_preferences")
    .select("user_id, has_lca_data, calculation_mode, initial_questionnaire_completed")
    .eq("user_id", userId)
    .maybeSingle();

  if (findError) {
    if (isMissingColumnError(findError)) return;
    throw findError;
  }

  const payload = {
    user_id: userId,
    has_lca_data: existing?.has_lca_data ?? null,
    calculation_mode: existing?.calculation_mode ?? "manual",
    initial_questionnaire_completed: existing?.initial_questionnaire_completed ?? false,
    scope1_screening: state,
  };

  const { error } = await (supabase as any)
    .from("emission_calculator_preferences")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    if (isMissingColumnError(error)) return;
    throw error;
  }
}

/** Merge helper when local cache and DB disagree — prefer more progressed answers. */
export function mergeScreeningStates(
  a: Scope1ScreeningState,
  b: Scope1ScreeningState
): Scope1ScreeningState {
  const rank: Record<string, number> = {
    not_assessed: 0,
    not_applicable: 1,
    applicable_pending: 2,
    calculated: 3,
  };
  const out = { ...DEFAULT_SCOPE1_SCREENING };
  for (const key of Object.keys(out) as (keyof Scope1ScreeningState)[]) {
    out[key] = rank[a[key]] >= rank[b[key]] ? a[key] : b[key];
  }
  return out;
}

import { USE_JWT_AUTH } from "@/api/config";
import {
  createEmissionAssessment,
  listEmissionAssessments,
  patchEmissionAssessment,
  type EmissionAssessment,
} from "@/api/ghg";
import { supabase } from "./client";

/** Marker on app.emission_assessments.reporting_period for history questionnaire rows. */
export const EMISSION_HISTORY_PERIOD = "emission_history";

export type EmissionHistoryAssessment = {
  id: string;
  user_id: string;
  company_name: string;
  sector: string;
  location: string;
  governance_structure: string;
  is_measuring_emissions: boolean;
  are_emissions_verified: boolean | null;
  scope1_emissions: number | null;
  scope2_emissions: number | null;
  scope3_emissions: number | null;
  wants_to_use_calculator: boolean | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type EmissionHistoryPayload = {
  user_id: string;
  company_name: string;
  sector: string;
  location: string;
  governance_structure: string;
  is_measuring_emissions: boolean;
  are_emissions_verified: boolean | null;
  scope1_emissions: number | null;
  scope2_emissions: number | null;
  scope3_emissions: number | null;
  wants_to_use_calculator: boolean | null;
  status: string;
};

export type HistoryTrendRow = {
  created_at?: string | null;
  scope1_emissions?: number | null;
  scope2_emissions?: number | null;
  scope3_emissions?: number | null;
};

function totalsFromPayload(p: EmissionHistoryPayload): Record<string, unknown> {
  return {
    company_name: p.company_name,
    sector: p.sector,
    location: p.location,
    governance_structure: p.governance_structure,
    is_measuring_emissions: p.is_measuring_emissions,
    are_emissions_verified: p.are_emissions_verified,
    scope1_emissions: p.scope1_emissions,
    scope2_emissions: p.scope2_emissions,
    scope3_emissions: p.scope3_emissions,
    wants_to_use_calculator: p.wants_to_use_calculator,
  };
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function boolOrNull(v: unknown): boolean | null {
  if (v == null) return null;
  if (typeof v === "boolean") return v;
  return null;
}

function isHistoryAssessment(a: EmissionAssessment): boolean {
  if (a.reporting_period === EMISSION_HISTORY_PERIOD) return true;
  if (a.legacy_note === "emission_history_assessments") return true;
  const t = a.totals || {};
  return (
    typeof t.company_name === "string" ||
    t.scope1_emissions != null ||
    t.scope2_emissions != null ||
    t.scope3_emissions != null
  );
}

function fromApiAssessment(a: EmissionAssessment): EmissionHistoryAssessment {
  const t = (a.totals || {}) as Record<string, unknown>;
  return {
    id: a.id,
    user_id: a.user_id,
    company_name: String(t.company_name ?? ""),
    sector: String(t.sector ?? ""),
    location: String(t.location ?? ""),
    governance_structure: String(t.governance_structure ?? ""),
    is_measuring_emissions: Boolean(t.is_measuring_emissions),
    are_emissions_verified: boolOrNull(t.are_emissions_verified),
    scope1_emissions: numOrNull(t.scope1_emissions ?? t.scope1),
    scope2_emissions: numOrNull(t.scope2_emissions ?? t.scope2),
    scope3_emissions: numOrNull(t.scope3_emissions ?? t.scope3),
    wants_to_use_calculator: boolOrNull(t.wants_to_use_calculator),
    status: a.status,
    created_at: a.created_at || "",
    updated_at: a.updated_at || "",
  };
}

function sortNewestFirst<T extends { created_at?: string | null }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const ta = a.created_at ? Date.parse(a.created_at) : 0;
    const tb = b.created_at ? Date.parse(b.created_at) : 0;
    return tb - ta;
  });
}

/** Latest emission-history questionnaire for the current user (or null). */
export async function getLatestEmissionHistoryAssessment(
  userId: string
): Promise<EmissionHistoryAssessment | null> {
  if (USE_JWT_AUTH) {
    const all = await listEmissionAssessments();
    const history = sortNewestFirst(all.filter(isHistoryAssessment));
    if (history.length === 0) return null;
    return fromApiAssessment(history[0]);
  }

  const { data, error } = await (supabase as any)
    .from("emission_history_assessments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as EmissionHistoryAssessment) || null;
}

/** Insert or update a history questionnaire row. */
export async function saveEmissionHistoryAssessment(
  payload: EmissionHistoryPayload,
  existingId?: string | null
): Promise<EmissionHistoryAssessment> {
  if (USE_JWT_AUTH) {
    const totals = totalsFromPayload(payload);
    if (existingId) {
      const updated = await patchEmissionAssessment(existingId, {
        status: payload.status,
        reporting_period: EMISSION_HISTORY_PERIOD,
        totals,
        legacy_note: "emission_history_assessments",
      });
      return fromApiAssessment(updated);
    }
    const created = await createEmissionAssessment({
      framework: "mixed",
      reporting_period: EMISSION_HISTORY_PERIOD,
      status: payload.status,
      totals,
      legacy_note: "emission_history_assessments",
    });
    return fromApiAssessment(created);
  }

  if (existingId) {
    const { data, error } = await (supabase as any)
      .from("emission_history_assessments")
      .update(payload)
      .eq("id", existingId)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data as EmissionHistoryAssessment;
  }

  const { data, error } = await (supabase as any)
    .from("emission_history_assessments")
    .insert(payload)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as EmissionHistoryAssessment;
}

/** Rows for year-over-year PDF / charts (non-draft preferred). */
export async function listEmissionHistoryTrendRows(
  userId: string
): Promise<HistoryTrendRow[]> {
  if (USE_JWT_AUTH) {
    try {
      const all = await listEmissionAssessments();
      return sortNewestFirst(all.filter(isHistoryAssessment))
        .filter((a) => a.status !== "draft")
        .map((a) => {
          const mapped = fromApiAssessment(a);
          return {
            created_at: mapped.created_at,
            scope1_emissions: mapped.scope1_emissions,
            scope2_emissions: mapped.scope2_emissions,
            scope3_emissions: mapped.scope3_emissions,
          };
        });
    } catch {
      return [];
    }
  }

  const { data, error } = await (supabase as any)
    .from("emission_history_assessments")
    .select("created_at, scope1_emissions, scope2_emissions, scope3_emissions")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data || []) as HistoryTrendRow[];
}

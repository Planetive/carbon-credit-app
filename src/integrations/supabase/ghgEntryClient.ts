/**
 * Dual-read emission entry CRUD — legacy Supabase tables ↔ app.emission_activities API.
 * Mirror pattern: portfolioClient.ts
 */
import { supabase } from "./client";
import { USE_JWT_AUTH } from "@/api/config";
import {
  createEmissionActivity,
  deleteEmissionActivity,
  getOrCreateDraftAssessment,
  listEmissionActivities,
  patchEmissionActivity,
  type EmissionActivity,
} from "@/api/ghg";

export type LegacyEntryFilters = {
  user_id?: string;
  counterparty_id?: string | null;
  order?: { column?: string; ascending?: boolean };
  /** Matches Supabase `emission_framework` filter on fuel entries. */
  emission_framework?: "uk" | "epa";
};

type Framework = "uk" | "epa" | "ipcc" | "mixed";

const assessmentIdByFramework = new Map<Framework, Promise<string>>();

function inferLegacyMeta(tableName: string): {
  scope: 1 | 2 | 3;
  category: string;
  framework: Framework;
} {
  let scope: 1 | 2 | 3 = 3;
  if (tableName.startsWith("scope1_") || tableName.startsWith("ipcc_scope1_")) scope = 1;
  else if (tableName.startsWith("scope2_")) scope = 2;

  let category = tableName.replace(/^(scope[123]_|ipcc_scope1_)/, "");
  if (tableName.includes("fuel") && !tableName.includes("fuel_energy")) category = "fuel";
  else if (tableName.includes("refrigerant")) category = "refrigerant";
  else if (tableName.includes("passenger")) category = "passenger_vehicle";
  else if (tableName.includes("delivery")) category = "delivery_vehicle";
  else if (tableName.includes("heatsteam") || tableName.includes("heat_steam"))
    category = "heat_steam";
  else if (tableName.includes("electricity")) category = "electricity";
  else if (tableName.includes("business_travel")) category = "business_travel";
  else if (tableName.includes("employee_commuting")) category = "employee_commuting";
  else if (tableName.includes("capital_goods")) category = "capital_goods";
  else if (tableName.includes("purchased_goods")) category = "purchased_goods_services";
  else if (tableName.includes("upstream_transport")) category = "upstream_transportation";
  else if (tableName.includes("downstream_transport")) category = "downstream_transportation";
  else if (tableName.includes("waste")) category = "waste";
  else if (tableName.includes("investments")) category = "investments";
  else if (tableName.includes("facilitated")) category = "facilitated";
  else if (tableName.includes("lca")) category = "lca";
  else if (tableName.includes("flaring")) category = "flaring";
  else if (tableName.includes("venting")) category = "venting";
  else if (tableName.includes("kitchen")) category = "kitchen";
  else if (tableName.includes("power")) category = "power";
  else if (tableName.includes("heating")) category = "heating";
  else if (
    tableName.includes("vehicular") ||
    tableName.includes("vehicle") ||
    tableName.includes("on_road") ||
    tableName.includes("non_road") ||
    tableName.includes("mobile")
  )
    category = "mobile";
  else if (tableName.includes("end_of_life")) category = "end_of_life";
  else if (tableName.includes("processing_sold")) category = "processing_sold_products";
  else if (tableName.includes("use_of_sold")) category = "use_of_sold_products";
  else if (tableName.includes("fuel_energy")) category = "fuel_energy_activities";

  let framework: Framework = "uk";
  if (tableName.includes("_epa") || tableName.includes("epa_")) framework = "epa";
  else if (tableName.startsWith("ipcc_")) framework = "ipcc";

  return { scope, category, framework };
}

async function assessmentIdForTable(tableName: string): Promise<string> {
  const { framework } = inferLegacyMeta(tableName);
  if (!assessmentIdByFramework.has(framework)) {
    assessmentIdByFramework.set(
      framework,
      getOrCreateDraftAssessment(framework).then((a) => a.id)
    );
  }
  return assessmentIdByFramework.get(framework)!;
}

function numField(row: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const v = row[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) return Number(v);
  }
  return null;
}

function activityToLegacyRow(activity: EmissionActivity): Record<string, unknown> {
  const raw = { ...(activity.raw || {}) } as Record<string, unknown>;
  const legacyRowId =
    activity.legacy_id ||
    (raw.id != null && String(raw.id) !== "" ? String(raw.id) : null);
  return {
    ...raw,
    id: activity.id,
    legacy_id: legacyRowId,
    user_id: activity.user_id,
    counterparty_id: activity.counterparty_id ?? raw.counterparty_id ?? null,
  };
}

function legacyPayloadToActivityFields(
  tableName: string,
  payload: Record<string, unknown>
) {
  const { scope, category } = inferLegacyMeta(tableName);
  const counterpartyRaw = payload.counterparty_id;
  const counterparty_id =
    counterpartyRaw === null || counterpartyRaw === undefined || counterpartyRaw === ""
      ? null
      : String(counterpartyRaw);

  return {
    scope,
    category,
    counterparty_id: counterparty_id as string | null,
    quantity: numField(payload, "quantity", "amount", "distance", "volume"),
    unit: (payload.unit ?? payload.Unit ?? null) as string | null,
    emissions_tco2e: numField(payload, "emissions", "emissions_tco2e", "emissions_output"),
    raw: { ...payload, _legacy_table: tableName },
  };
}

function matchesFilters(row: Record<string, unknown>, filters: LegacyEntryFilters): boolean {
  if (filters.user_id && String(row.user_id) !== String(filters.user_id)) return false;
  if (filters.counterparty_id === null) {
    const cp = row.counterparty_id;
    if (cp !== null && cp !== undefined && cp !== "") return false;
  } else if (
    filters.counterparty_id !== undefined &&
    String(row.counterparty_id ?? "") !== String(filters.counterparty_id)
  ) {
    return false;
  }
  if (filters.emission_framework === "uk") {
    const fw = row.emission_framework;
    if (fw != null && fw !== "" && String(fw) !== "uk") return false;
  } else if (filters.emission_framework === "epa") {
    const fw = row.emission_framework;
    if (fw != null && fw !== "" && String(fw) !== "uk" && String(fw) !== "epa") return false;
    if (String(fw) === "uk") return false;
  }
  return true;
}

function sortRows(
  rows: Record<string, unknown>[],
  order?: LegacyEntryFilters["order"]
): Record<string, unknown>[] {
  const col = order?.column || "created_at";
  const asc = order?.ascending !== false;
  return [...rows].sort((a, b) => {
    const av = a[col];
    const bv = b[col];
    if (av == null && bv == null) return 0;
    if (av == null) return asc ? 1 : -1;
    if (bv == null) return asc ? -1 : 1;
    if (av < bv) return asc ? -1 : 1;
    if (av > bv) return asc ? 1 : -1;
    return 0;
  });
}

export function isGhgEntryApiEnabled() {
  return USE_JWT_AUTH;
}

/** List rows from a legacy scope table (Supabase or emission_activities). */
export async function listLegacyTableEntries(
  tableName: string,
  filters: LegacyEntryFilters = {}
): Promise<Record<string, unknown>[]> {
  if (isGhgEntryApiEnabled()) {
    const { scope, category } = inferLegacyMeta(tableName);
    const activities = await listEmissionActivities({
      scope,
      category,
      legacy_source: tableName,
    });
    // Defense: some API builds ignore legacy_source query filtering.
    const rows = activities
      .filter((a) => !a.legacy_source || a.legacy_source === tableName)
      .map(activityToLegacyRow)
      .filter((row) => matchesFilters(row, filters));
    return sortRows(rows, filters.order);
  }

  let q = (supabase as any).from(tableName).select("*");
  if (filters.user_id) q = q.eq("user_id", filters.user_id);
  if (filters.counterparty_id === null) q = q.is("counterparty_id", null);
  else if (filters.counterparty_id) q = q.eq("counterparty_id", filters.counterparty_id);
  const col = filters.order?.column || "created_at";
  q = q.order(col, { ascending: filters.order?.ascending !== false });
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as Record<string, unknown>[];
}

/** Insert one or more legacy rows; returns inserted ids (activity id when on API). */
export async function insertLegacyTableEntries(
  tableName: string,
  payloads: Record<string, unknown>[]
): Promise<{ id: string }[]> {
  if (payloads.length === 0) return [];

  if (isGhgEntryApiEnabled()) {
    const assessment_id = await assessmentIdForTable(tableName);
    const out: { id: string }[] = [];
    for (const payload of payloads) {
      const fields = legacyPayloadToActivityFields(tableName, payload);
      const created = await createEmissionActivity({
        assessment_id,
        scope: fields.scope,
        category: fields.category,
        counterparty_id: fields.counterparty_id,
        quantity: fields.quantity,
        unit: fields.unit,
        emissions_tco2e: fields.emissions_tco2e,
        raw: fields.raw,
        legacy_source: tableName,
      });
      out.push({ id: created.id });
    }
    return out;
  }

  const { data, error } = await (supabase as any)
    .from(tableName)
    .insert(payloads)
    .select("id");
  if (error) throw error;
  return ((data || []) as { id: string }[]).map((r) => ({ id: r.id }));
}

/** Update a legacy row by id (activity id when on API). */
export async function updateLegacyTableEntry(
  tableName: string,
  id: string,
  payload: Record<string, unknown>
): Promise<void> {
  if (isGhgEntryApiEnabled()) {
    const fields = legacyPayloadToActivityFields(tableName, payload);
    await patchEmissionActivity(id, {
      scope: fields.scope,
      category: fields.category,
      counterparty_id: fields.counterparty_id,
      quantity: fields.quantity,
      unit: fields.unit,
      emissions_tco2e: fields.emissions_tco2e,
      raw: fields.raw,
    });
    return;
  }

  const { error } = await (supabase as any).from(tableName).update(payload).eq("id", id);
  if (error) throw error;
}

/** Delete a legacy row by id (activity id when on API). */
export async function deleteLegacyTableEntry(tableName: string, id: string): Promise<void> {
  if (isGhgEntryApiEnabled()) {
    await deleteEmissionActivity(id);
    return;
  }

  const { error } = await (supabase as any).from(tableName).delete().eq("id", id);
  if (error) throw error;
}

/** List filters for personal vs company-scoped legacy rows. */
export function companyScopedListFilters(
  userId: string,
  companyContext: boolean,
  counterpartyId?: string | null
): LegacyEntryFilters {
  return {
    user_id: userId,
    counterparty_id: companyContext && counterpartyId ? counterpartyId : null,
    order: { column: "created_at", ascending: false },
  };
}

/** Clear cached draft assessment ids (e.g. after org switch). */
export function resetGhgEntryAssessmentCache() {
  assessmentIdByFramework.clear();
}

/** Upsert by matching field values (replaces Supabase onConflict upserts). */
export async function upsertLegacyTableEntry(
  tableName: string,
  userId: string,
  matchFields: Record<string, unknown>,
  payload: Record<string, unknown>
): Promise<void> {
  const rows = await listLegacyTableEntries(tableName, { user_id: userId });
  const existing = rows.find((row) =>
    Object.entries(matchFields).every(([key, value]) => String(row[key]) === String(value))
  );

  const fullPayload = { ...payload, user_id: userId };

  if (existing?.id) {
    await updateLegacyTableEntry(tableName, String(existing.id), fullPayload);
    return;
  }

  await insertLegacyTableEntries(tableName, [fullPayload]);
}

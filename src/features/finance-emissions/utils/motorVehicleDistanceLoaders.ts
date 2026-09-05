/**
 * Motor vehicle statistical distance (annual km) for PCAF Scores 2–5.
 * Dataset: motor_vehicle_distance_stats (ref.factor_rows).
 * Fallback: public.staging_motor_vehicle_distance_stats
 *
 * Lookup: vehicle_use (private / public / commercial) + vehicle_class
 *         + public operation_type (intercity / outercity≈intracity)
 *         + distance_geography (local vs regional).
 */

import { supabase } from "@/integrations/supabase/client";
import { tryLoadFactorSheetViaApi } from "@/api/factorDualRead";

export const DISTANCE_STATS_DATASET_CODE = "motor_vehicle_distance_stats";
export const DISTANCE_STATS_STAGING_TABLE = "staging_motor_vehicle_distance_stats";

export type DistanceUseClass = "private" | "public" | "commercial";
export type DistanceScope = "local" | "regional";
export type PublicRoute = "intercity" | "outercity";

export type VehicleDistanceStat = {
  key: string;
  vehicleUse: DistanceUseClass;
  vehicleClass: string;
  operationType: string;
  geography: string;
  geographyKind: DistanceScope | "other";
  annualKm: number;
  unit: string;
};

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

function parseUse(raw: string): DistanceUseClass | null {
  const n = normalize(raw);
  if (n === "private") return "private";
  if (n === "public") return "public";
  if (n === "commercial") return "commercial";
  return null;
}

function geographyKind(geo: string): DistanceScope | "other" {
  const n = normalize(geo);
  if (n.includes("local")) return "local";
  if (n.includes("regional") || n.includes("national")) return "regional";
  return "other";
}

export function matchesPublicRoute(operationType: string, route: PublicRoute): boolean {
  const n = normalize(operationType);
  if (route === "intercity") return n.includes("intercity");
  // Form "outercity" ≈ sheet Intracity / urban / city
  return n.includes("intracity") || n.includes("urban") || (n.includes("city") && !n.includes("intercity"));
}

function parseRow(row: Record<string, unknown>): VehicleDistanceStat | null {
  const attrs = (row.attributes ?? {}) as Record<string, unknown>;
  const vehicleUseRaw = String(row.category ?? attrs.vehicle_use ?? row.vehicle_use ?? "").trim();
  const vehicleUse = parseUse(vehicleUseRaw);
  if (!vehicleUse) return null;

  const vehicleClass = String(
    row.label ?? attrs.vehicle_class ?? row.vehicle_class ?? attrs.segment_name ?? row.segment_name ?? ""
  ).trim();
  if (!vehicleClass) return null;

  const annualKm =
    num(attrs.annual_km_default) || num(row.annual_km_default) || num(row.annual_km);
  if (annualKm <= 0) return null;

  const geography = String(
    attrs.distance_geography ?? row.distance_geography ?? attrs.geography ?? row.geography ?? ""
  ).trim();
  const operationType = String(attrs.operation_type ?? row.operation_type ?? "").trim();
  const unit = String(row.unit ?? attrs.unit ?? "km").trim() || "km";

  return {
    key: `${vehicleUse}::${vehicleClass}::${operationType}::${geography}`,
    vehicleUse,
    vehicleClass,
    operationType,
    geography,
    geographyKind: geographyKind(geography),
    annualKm,
    unit,
  };
}

function toStats(rows: Record<string, unknown>[] | null | undefined): VehicleDistanceStat[] {
  return (rows ?? [])
    .map((row) => parseRow(row))
    .filter((row): row is VehicleDistanceStat => !!row);
}

async function loadFromRef(): Promise<VehicleDistanceStat[]> {
  let rows = await tryLoadFactorSheetViaApi({
    datasetCodes: [DISTANCE_STATS_DATASET_CODE],
    nameHints: ["distance", "motor vehicle statistical"],
  });

  if (!rows || rows.length === 0) {
    const refClient = (supabase as { schema?: (s: string) => typeof supabase }).schema
      ? (supabase as { schema: (s: string) => typeof supabase }).schema("ref")
      : supabase;
    const { data: dataset } = await refClient
      .from("factor_datasets")
      .select("id")
      .eq("code", DISTANCE_STATS_DATASET_CODE)
      .maybeSingle();
    if (dataset?.id) {
      const { data: fallbackRows } = await refClient
        .from("factor_rows")
        .select("category, label, unit, attributes")
        .eq("dataset_id", dataset.id);
      rows = fallbackRows ?? [];
    }
  }

  return toStats(rows as Record<string, unknown>[]);
}

async function loadFromStaging(): Promise<VehicleDistanceStat[]> {
  const { data, error } = await supabase.from(DISTANCE_STATS_STAGING_TABLE).select("*");
  if (error) {
    console.warn("Distance stats staging load failed:", error.message);
    return [];
  }
  return toStats((data ?? []) as Record<string, unknown>[]);
}

export async function loadVehicleDistanceStats(): Promise<VehicleDistanceStat[]> {
  const fromRef = await loadFromRef();
  if (fromRef.length > 0) return fromRef;
  return loadFromStaging();
}

export function usesForStats(rows: VehicleDistanceStat[]): DistanceUseClass[] {
  const set = new Set(rows.map((r) => r.vehicleUse));
  return (["private", "public", "commercial"] as const).filter((u) => set.has(u));
}

function filterByScope(rows: VehicleDistanceStat[], scope?: DistanceScope | ""): VehicleDistanceStat[] {
  if (!scope) return rows;
  const preferred = rows.filter((r) => r.geographyKind === scope);
  return preferred.length > 0 ? preferred : rows;
}

function filterByRoute(
  rows: VehicleDistanceStat[],
  use: DistanceUseClass | "",
  route?: PublicRoute | ""
): VehicleDistanceStat[] {
  if (use !== "public" || !route) return rows;
  const preferred = rows.filter((r) => matchesPublicRoute(r.operationType, route));
  return preferred.length > 0 ? preferred : rows;
}

export function classesForDistance(
  rows: VehicleDistanceStat[],
  use: DistanceUseClass | "",
  route?: PublicRoute | "",
  scope?: DistanceScope | ""
): string[] {
  if (!use) return [];
  let subset = rows.filter((r) => r.vehicleUse === use);
  subset = filterByScope(subset, scope);
  subset = filterByRoute(subset, use, route);
  return Array.from(new Set(subset.map((r) => r.vehicleClass))).sort((a, b) => a.localeCompare(b));
}

/** Private defaults to passenger car when the sheet has one. */
export function preferredDistanceClass(use: DistanceUseClass | "", classes: string[]): string {
  if (classes.length === 0) return "";
  if (use === "private") {
    const car = classes.find((c) => /passenger car/i.test(c) && !/commercial/i.test(c));
    if (car) return car;
  }
  return classes[0];
}

export function findDistanceStat(
  rows: VehicleDistanceStat[],
  opts: {
    use: DistanceUseClass | "";
    vehicleClass?: string;
    publicRoute?: PublicRoute | "";
    scope?: DistanceScope | "";
  }
): VehicleDistanceStat | null {
  if (!opts.use) return null;
  let subset = rows.filter((r) => r.vehicleUse === opts.use);
  subset = filterByScope(subset, opts.scope);
  subset = filterByRoute(subset, opts.use, opts.publicRoute);
  if (opts.vehicleClass) {
    const exact = subset.filter((r) => r.vehicleClass === opts.vehicleClass);
    if (exact.length > 0) subset = exact;
  }
  return subset[0] ?? null;
}

export function formatDistanceStatHint(row: VehicleDistanceStat): string {
  const bits = [row.vehicleUse, row.vehicleClass];
  if (row.operationType) bits.push(row.operationType);
  if (row.geography) bits.push(row.geography);
  return `${row.annualKm.toLocaleString()} ${row.unit} — ${bits.join(" · ")}`;
}

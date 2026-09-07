/**
 * Motor vehicle efficiency by market vehicle type for PCAF Score 4 (3a).
 * Dataset: motor_vehicle_type_efficiency (ref.factor_rows).
 * Fallback: public.staging_motor_vehicle_type_efficiency
 *
 * Lookup: vehicle_type + fuel_type → efficiency (+ unit → L/km).
 * Geography is stored if present but local/regional use the same efficiency values.
 * Examples: Hatchback / Sedan / SUV × Petrol / CNG / Hybrid / EV.
 * Emission factor remains EPA (Table 2 / 3 / 4 / Non-Road) — not this sheet.
 */

import { supabase } from "@/integrations/supabase/client";
import { tryLoadFactorSheetViaApi } from "@/api/factorDualRead";
import { efficiencyToLPerKm } from "./motorVehicleMakeModelLoaders";
import type { DistanceScope } from "./motorVehicleDistanceLoaders";
import { efficiencyForEpaFuelType, efficiencyForEpaVehicleType } from "./motorVehicleFactorLoaders";

export const TYPE_EFFICIENCY_DATASET_CODE = "motor_vehicle_type_efficiency";
export const TYPE_EFFICIENCY_STAGING_TABLE = "staging_motor_vehicle_type_efficiency";

export type VehicleTypeEfficiencyRow = {
  key: string;
  /** Stored for reference; lookup does not require local ≠ regional. */
  geography: DistanceScope | "";
  vehicleType: string;
  fuelType: string;
  efficiencyLPerKm: number;
  efficiencyRaw: number;
  efficiencyUnit: string;
};

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

function parseNumericLoose(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v ?? "").trim();
  if (!s) return 0;
  if (/not researched|n\/a|\bn\/a\b|unknown|null|—|–/i.test(s) && !/\d/.test(s)) return 0;
  const m = s.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : 0;
}

function parseGeography(raw: string): DistanceScope | null {
  const n = normalize(raw);
  if (n.includes("local") || n.includes("pakistan")) return "local";
  if (n.includes("regional") || n.includes("national")) return "regional";
  return null;
}

/** Soft-match sheet fuel (Petrol, CNG, …) to form/EPA fuel label. */
export function typeFuelsMatch(sheetFuel: string, formFuel: string): boolean {
  const a = normalize(sheetFuel);
  const b = normalize(formFuel);
  if (!a || !b) return false;
  if (a === b) return true;

  const petrol = (s: string) =>
    /petrol|gasoline|motor gasoline|benzin/.test(s) && !/aviation/.test(s);
  const diesel = (s: string) => /\bdiesel\b/.test(s);
  const cng = (s: string) => /\bcng\b|compressed natural/.test(s);
  const lpg = (s: string) => /\blpg\b|liquefied petroleum|autogas/.test(s);
  const hybrid = (s: string) => /hybrid|phev|hev/.test(s);
  const electric = (s: string) =>
    (/electric|ev\b|battery|bev|kwh/.test(s) || s === "ev") && !hybrid(s);

  if (petrol(a) && petrol(b)) return true;
  if (diesel(a) && diesel(b)) return true;
  if (cng(a) && cng(b)) return true;
  if (lpg(a) && lpg(b)) return true;
  if (hybrid(a) && hybrid(b)) return true;
  if (electric(a) && electric(b)) return true;
  return false;
}

function parseRow(row: Record<string, unknown>): VehicleTypeEfficiencyRow | null {
  const attrs = (row.attributes ?? {}) as Record<string, unknown>;
  const geographyRaw = String(
    attrs.geography ?? row.geography ?? row.category ?? ""
  ).trim();
  // Type efficiency is the same for local/regional; default missing geography to local.
  const geo: DistanceScope | "" = parseGeography(geographyRaw) ?? "local";

  let resolvedType = String(attrs.vehicle_type ?? row.vehicle_type ?? "").trim();
  if (!resolvedType) {
    const label = String(row.label ?? "").trim();
    // Promote label may be "Hatchback — Petrol"
    resolvedType = label.split(/\s+[—–-]\s+/)[0]?.trim() || label;
  }
  if (!resolvedType) return null;

  let fuelType = String(attrs.fuel_type ?? row.fuel_type ?? "").trim();
  if (!fuelType) {
    const label = String(row.label ?? "").trim();
    const parts = label.split(/\s+[—–-]\s+/);
    if (parts.length > 1) fuelType = parts.slice(1).join(" — ").trim();
  }
  if (!fuelType) return null;

  const efficiencyRaw = parseNumericLoose(attrs.efficiency ?? row.efficiency);
  if (!(efficiencyRaw > 0)) return null;

  const unitRaw = String(attrs.unit ?? row.unit ?? "km/L").trim() || "km/L";
  const unitForConvert = /km\s*\/\s*kg/i.test(unitRaw) ? "km/L" : unitRaw;
  const efficiencyLPerKm = efficiencyToLPerKm(efficiencyRaw, unitForConvert);
  if (!(efficiencyLPerKm > 0)) return null;

  return {
    key: `${geo}::${resolvedType}::${fuelType}`,
    geography: geo,
    vehicleType: resolvedType,
    fuelType,
    efficiencyLPerKm,
    efficiencyRaw,
    efficiencyUnit: unitRaw,
  };
}

function toRows(rows: Record<string, unknown>[] | null | undefined): VehicleTypeEfficiencyRow[] {
  return (rows ?? [])
    .map((row) => parseRow(row))
    .filter((row): row is VehicleTypeEfficiencyRow => !!row);
}

async function loadFromRef(): Promise<VehicleTypeEfficiencyRow[]> {
  let rows = await tryLoadFactorSheetViaApi({
    datasetCodes: [TYPE_EFFICIENCY_DATASET_CODE],
    nameHints: ["type efficiency", "vehicle type efficiency", "hatchback", "sedan efficiency"],
  });

  if (!rows || rows.length === 0) {
    const refClient = (supabase as { schema?: (s: string) => typeof supabase }).schema
      ? (supabase as { schema: (s: string) => typeof supabase }).schema("ref")
      : supabase;
    const { data: dataset } = await refClient
      .from("factor_datasets")
      .select("id")
      .eq("code", TYPE_EFFICIENCY_DATASET_CODE)
      .maybeSingle();
    if (dataset?.id) {
      const { data: fallbackRows } = await refClient
        .from("factor_rows")
        .select("category, label, unit, attributes")
        .eq("dataset_id", dataset.id);
      rows = fallbackRows ?? [];
    }
  }

  return toRows(rows as Record<string, unknown>[]);
}

async function loadFromStaging(): Promise<VehicleTypeEfficiencyRow[]> {
  const { data, error } = await supabase.from(TYPE_EFFICIENCY_STAGING_TABLE).select("*");
  if (error) {
    console.warn("Type efficiency staging load failed:", error.message);
    return [];
  }
  return toRows((data ?? []) as Record<string, unknown>[]);
}

export async function loadVehicleTypeEfficiencyRows(): Promise<VehicleTypeEfficiencyRow[]> {
  const fromRef = await loadFromRef();
  if (fromRef.length > 0) return fromRef;
  return loadFromStaging();
}

export function vehicleTypesFromSheet(
  rows: VehicleTypeEfficiencyRow[],
  _geography?: DistanceScope | ""
): string[] {
  // Geography ignored — same efficiency for local and regional distance scope.
  return Array.from(new Set(rows.map((r) => r.vehicleType))).sort((a, b) =>
    a.localeCompare(b)
  );
}

export function fuelsForVehicleType(
  rows: VehicleTypeEfficiencyRow[],
  vehicleType: string,
  _geography?: DistanceScope | ""
): string[] {
  if (!vehicleType) return [];
  const pool = rows.filter((r) => normalize(r.vehicleType) === normalize(vehicleType));
  return Array.from(new Set(pool.map((r) => r.fuelType))).sort((a, b) => a.localeCompare(b));
}

export function findTypeEfficiency(
  rows: VehicleTypeEfficiencyRow[],
  opts: {
    geography?: DistanceScope | "";
    vehicleType: string;
    fuelType: string;
  }
): VehicleTypeEfficiencyRow | null {
  if (!opts.vehicleType || !opts.fuelType || rows.length === 0) return null;

  // Prefer exact geography if present, else any row for type+fuel (local ≈ regional).
  const typeMatched = rows.filter((r) => normalize(r.vehicleType) === normalize(opts.vehicleType));
  if (typeMatched.length === 0) return null;

  const scope = opts.geography === "local" || opts.geography === "regional" ? opts.geography : "";
  const scoped = scope ? typeMatched.filter((r) => r.geography === scope) : typeMatched;
  const pool = scoped.length > 0 ? scoped : typeMatched;

  return pool.find((r) => typeFuelsMatch(r.fuelType, opts.fuelType)) ?? null;
}

/** Sheet L/km if found; else provisional EPA type/fuel maps. */
export function efficiencyForScore4Type(
  rows: VehicleTypeEfficiencyRow[],
  opts: {
    geography?: DistanceScope | "";
    marketVehicleType: string;
    fuelType: string;
    epaVehicleType?: string;
  }
): number {
  const hit = findTypeEfficiency(rows, {
    geography: opts.geography,
    vehicleType: opts.marketVehicleType,
    fuelType: opts.fuelType,
  });
  if (hit) return hit.efficiencyLPerKm;
  if (opts.epaVehicleType) return efficiencyForEpaVehicleType(opts.epaVehicleType);
  if (opts.fuelType) return efficiencyForEpaFuelType(opts.fuelType);
  return 0;
}

export function formatTypeEfficiencyHint(row: VehicleTypeEfficiencyRow): string {
  return [
    `${row.efficiencyRaw} ${row.efficiencyUnit}`,
    `→ ${row.efficiencyLPerKm.toFixed(4)} L/km`,
    row.vehicleType,
    row.fuelType,
    row.geography,
  ].join(" · ");
}

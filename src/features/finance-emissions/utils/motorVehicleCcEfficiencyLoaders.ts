/**
 * Motor vehicle efficiency by engine CC band for PCAF Score 5 (3b).
 * Dataset: motor_vehicle_cc_efficiency (ref.factor_rows).
 * Fallback: public.staging_motor_vehicle_cc_efficiency
 *
 * Lookup: geography (local | regional) + engine CC + fuel type → efficiency (+ unit → L/km).
 * Emission factor remains EPA Mobile Fuel (not this sheet).
 */

import { supabase } from "@/integrations/supabase/client";
import { tryLoadFactorSheetViaApi } from "@/api/factorDualRead";
import { efficiencyToLPerKm } from "./motorVehicleMakeModelLoaders";
import type { DistanceScope } from "./motorVehicleDistanceLoaders";
import { efficiencyForEngineCc } from "./motorVehicleFactorLoaders";

export const CC_EFFICIENCY_DATASET_CODE = "motor_vehicle_cc_efficiency";
export const CC_EFFICIENCY_STAGING_TABLE = "staging_motor_vehicle_cc_efficiency";

export type VehicleCcEfficiencyRow = {
  key: string;
  geography: DistanceScope;
  ccBand: string;
  ccMin: number;
  ccMax: number;
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

/** Parse "0-660", "1001–1300", "Under 1000cc", "Above 3000" into inclusive min/max. */
export function parseCcBand(bandRaw: string): { min: number; max: number } | null {
  const band = String(bandRaw ?? "")
    .trim()
    .replace(/[–—―]/g, "-")
    .replace(/\uFFFD/g, "-");
  if (!band) return null;
  const n = normalize(band);

  const range = n.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
  if (range) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }

  const under = n.match(/(?:under|below|<=|≤|up to|upto)\s*(\d+(?:\.\d+)?)/);
  if (under) {
    const max = Number(under[1]);
    return Number.isFinite(max) ? { min: 0, max } : null;
  }

  const over = n.match(/(?:over|above|>=|≥|>)\s*(\d+(?:\.\d+)?)/);
  if (over) {
    const min = Number(over[1]);
    return Number.isFinite(min) ? { min, max: Number.POSITIVE_INFINITY } : null;
  }

  const single = n.match(/(\d+(?:\.\d+)?)\s*cc/);
  if (single) {
    const v = Number(single[1]);
    return Number.isFinite(v) ? { min: v, max: v } : null;
  }

  return null;
}

/** Soft-match sheet fuel (Petrol, CNG, …) to form/EPA fuel label. */
export function ccFuelsMatch(sheetFuel: string, formFuel: string): boolean {
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
  const electric = (s: string) => /electric|ev\b|battery|bev/.test(s) && !hybrid(s);

  if (petrol(a) && petrol(b)) return true;
  if (diesel(a) && diesel(b)) return true;
  if (cng(a) && cng(b)) return true;
  if (lpg(a) && lpg(b)) return true;
  if (hybrid(a) && hybrid(b)) return true;
  if (electric(a) && electric(b)) return true;
  return false;
}

function parseRow(row: Record<string, unknown>): VehicleCcEfficiencyRow | null {
  const attrs = (row.attributes ?? {}) as Record<string, unknown>;
  const geographyRaw = String(
    attrs.geography ?? row.geography ?? row.category ?? ""
  ).trim();
  const geography = parseGeography(geographyRaw);
  if (!geography) return null;

  const ccBand = String(attrs.cc_band ?? row.cc_band ?? "").trim();
  const bounds = parseCcBand(ccBand);
  if (!bounds) return null;

  const fuelType = String(attrs.fuel_type ?? row.fuel_type ?? "").trim();
  if (!fuelType) return null;

  const efficiencyRaw = parseNumericLoose(attrs.efficiency ?? row.efficiency);
  if (!(efficiencyRaw > 0)) return null;

  const unitRaw = String(attrs.unit ?? row.unit ?? "km/L").trim() || "km/L";
  // km/kg (CNG) treated like km/L for intensity: distance × (1/value)
  const unitForConvert = /km\s*\/\s*kg/i.test(unitRaw) ? "km/L" : unitRaw;
  const efficiencyLPerKm = efficiencyToLPerKm(efficiencyRaw, unitForConvert);
  if (!(efficiencyLPerKm > 0)) return null;

  return {
    key: `${geography}::${ccBand}::${fuelType}`,
    geography,
    ccBand,
    ccMin: bounds.min,
    ccMax: bounds.max,
    fuelType,
    efficiencyLPerKm,
    efficiencyRaw,
    efficiencyUnit: unitRaw,
  };
}

function toRows(rows: Record<string, unknown>[] | null | undefined): VehicleCcEfficiencyRow[] {
  return (rows ?? [])
    .map((row) => parseRow(row))
    .filter((row): row is VehicleCcEfficiencyRow => !!row);
}

async function loadFromRef(): Promise<VehicleCcEfficiencyRow[]> {
  let rows = await tryLoadFactorSheetViaApi({
    datasetCodes: [CC_EFFICIENCY_DATASET_CODE],
    nameHints: ["cc efficiency", "engine cc", "motor vehicle cc"],
  });

  if (!rows || rows.length === 0) {
    const refClient = (supabase as { schema?: (s: string) => typeof supabase }).schema
      ? (supabase as { schema: (s: string) => typeof supabase }).schema("ref")
      : supabase;
    const { data: dataset } = await refClient
      .from("factor_datasets")
      .select("id")
      .eq("code", CC_EFFICIENCY_DATASET_CODE)
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

async function loadFromStaging(): Promise<VehicleCcEfficiencyRow[]> {
  const { data, error } = await supabase.from(CC_EFFICIENCY_STAGING_TABLE).select("*");
  if (error) {
    console.warn("CC efficiency staging load failed:", error.message);
    return [];
  }
  return toRows((data ?? []) as Record<string, unknown>[]);
}

export async function loadVehicleCcEfficiencyRows(): Promise<VehicleCcEfficiencyRow[]> {
  const fromRef = await loadFromRef();
  if (fromRef.length > 0) return fromRef;
  return loadFromStaging();
}

/**
 * Find efficiency for Score 5: geography + engine CC + fuel type.
 * Prefers the narrowest CC band that contains the engine size.
 * Falls back to provisional hardcoded bands if sheet has no match.
 */
export function findCcEfficiency(
  rows: VehicleCcEfficiencyRow[],
  opts: {
    geography?: DistanceScope | "";
    engineCc: number;
    fuelType: string;
  }
): VehicleCcEfficiencyRow | null {
  const cc = opts.engineCc;
  if (!(cc > 0) || rows.length === 0) return null;

  const scope = opts.geography === "local" || opts.geography === "regional" ? opts.geography : "";
  let pool = scope ? rows.filter((r) => r.geography === scope) : rows;
  if (pool.length === 0) pool = rows;

  const fuelMatched = pool.filter((r) => ccFuelsMatch(r.fuelType, opts.fuelType));
  const candidates = (fuelMatched.length > 0 ? fuelMatched : pool).filter(
    (r) => cc >= r.ccMin && cc <= r.ccMax
  );
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const wa = a.ccMax - a.ccMin;
    const wb = b.ccMax - b.ccMin;
    if (wa !== wb) return wa - wb;
    return a.ccBand.localeCompare(b.ccBand);
  });
  return candidates[0] ?? null;
}

/** Sheet L/km if found; otherwise provisional efficiencyForEngineCc. */
export function efficiencyForScore5Cc(
  rows: VehicleCcEfficiencyRow[],
  opts: {
    geography?: DistanceScope | "";
    engineCc: number;
    fuelType: string;
  }
): number {
  const hit = findCcEfficiency(rows, opts);
  if (hit) return hit.efficiencyLPerKm;
  return efficiencyForEngineCc(opts.engineCc, opts.fuelType);
}

export function formatCcEfficiencyHint(row: VehicleCcEfficiencyRow): string {
  return [
    `${row.efficiencyRaw} ${row.efficiencyUnit}`,
    `→ ${row.efficiencyLPerKm.toFixed(4)} L/km`,
    row.ccBand,
    row.geography,
    row.fuelType,
  ].join(" · ");
}

/**
 * Motor vehicle make/model efficiency for PCAF Scores 1a / 1b / 2 / 3.
 * Dataset: motor_vehicle_make_model (ref.factor_rows).
 * Fallback: public.staging_motor_vehicle_make_model
 *
 * Lookup: brand → model → year → efficiency_average (+ efficiency_unit → L/km).
 * Emission factor remains EPA Mobile Fuel (not this sheet).
 */

import { supabase } from "@/integrations/supabase/client";
import { tryLoadFactorSheetViaApi } from "@/api/factorDualRead";

export const MAKE_MODEL_DATASET_CODE = "motor_vehicle_make_model";
export const MAKE_MODEL_STAGING_TABLE = "staging_motor_vehicle_make_model";

export type VehicleMakeModelRow = {
  key: string;
  brand: string;
  model: string;
  year: string;
  modelYearLabel: string;
  category: string;
  fuelType: string;
  /** Efficiency converted to L/km (or kWh/km for EV) for the formula */
  efficiencyLPerKm: number;
  efficiencyRaw: number;
  efficiencyUnit: string;
  countryOfOrigin: string;
  source: string;
};

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** Parse numbers from cells that may say "Not researched" or "17.5 kWh/100km …". */
function parseNumericLoose(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v ?? "").trim();
  if (!s) return 0;
  if (/not researched|n\/a|\bn\/a\b|unknown|null|—|–/i.test(s) && !/\d/.test(s)) return 0;
  const m = s.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : 0;
}

function inferUnitFromText(rawText: string, unitRaw: string): string {
  const unit = unitRaw.trim();
  if (unit) return unit;
  const n = normalize(rawText);
  if (n.includes("kwh/100") || n.includes("kwh per 100")) return "kWh/100km";
  if (n.includes("kwh/km") || n.includes("kwh per km")) return "kWh/km";
  if (n.includes("l/100") || n.includes("liter/100") || n.includes("litre/100")) return "L/100km";
  if (n.includes("km/l") || n.includes("km per l")) return "km/L";
  if (n.includes("mpg")) return n.includes("uk") || n.includes("imp") ? "mpg (UK)" : "mpg";
  if (n.includes("l/km") || n.includes("liter/km") || n.includes("litre/km")) return "L/km";
  return "L/km";
}

/** Convert published efficiency into L/km (formula unit). EV → kWh/km treated as same slot. */
export function efficiencyToLPerKm(value: number, unitRaw: string): number {
  if (!(value > 0)) return 0;
  const u = normalize(unitRaw);
  if (!u || u === "l/km" || u === "liter/km" || u === "litre/km" || u === "l per km") {
    return value;
  }
  if (u.includes("kwh") && u.includes("km") && !u.includes("100")) {
    return value;
  }
  if (u.includes("l/100") || u.includes("l per 100") || u.includes("liter/100") || u.includes("litre/100")) {
    return value / 100;
  }
  if (u.includes("km/l") || u.includes("km per l") || u.includes("km/liter") || u.includes("km/litre")) {
    return 1 / value;
  }
  if (u.includes("mpg") && (u.includes("uk") || u.includes("imp"))) {
    return 282.481 / value / 100;
  }
  if (u.includes("mpg") || u.includes("miles per gallon") || u.includes("mi/gal")) {
    return 3.785411784 / (value * 1.609344);
  }
  if (u.includes("kwh") && u.includes("100")) {
    return value / 100;
  }
  return value;
}

function pickEfficiency(attrs: Record<string, unknown>, row: Record<string, unknown>): {
  raw: number;
  unit: string;
  rawText: string;
} {
  const unitCol = String(
    attrs.efficiency_unit ?? row.efficiency_unit ?? attrs.Efficiency_Unit ?? ""
  ).trim();
  const candidates: unknown[] = [
    attrs.efficiency_average ?? row.efficiency_average,
    attrs.efficiency_standard ?? row.efficiency_standard,
    attrs.efficiency_as_published ?? row.efficiency_as_published,
  ];
  for (const c of candidates) {
    const rawText = String(c ?? "").trim();
    const raw = parseNumericLoose(c);
    if (raw > 0) {
      return { raw, unit: inferUnitFromText(rawText, unitCol), rawText };
    }
  }
  return { raw: 0, unit: unitCol || "L/km", rawText: "" };
}

function parseRow(row: Record<string, unknown>): VehicleMakeModelRow | null {
  const attrs = (row.attributes ?? {}) as Record<string, unknown>;
  const brand = String(row.category ?? attrs.brand ?? row.brand ?? "").trim();
  if (!brand) return null;

  const model = String(attrs.model ?? row.model ?? "").trim();
  const year = String(attrs.year ?? row.year ?? "").trim();
  const modelYearLabel = String(
    row.label ??
      attrs.model_year_label ??
      row.model_year_label ??
      [model, year].filter(Boolean).join(" ") ??
      ""
  ).trim();
  if (!model && !modelYearLabel) return null;

  const { raw, unit } = pickEfficiency(attrs, row);
  const efficiencyLPerKm = efficiencyToLPerKm(raw, unit);
  if (!(efficiencyLPerKm > 0)) return null;

  const modelName = model || modelYearLabel;
  const label = modelYearLabel || [modelName, year].filter(Boolean).join(" ");
  return {
    key: `${normalize(brand)}::${normalize(modelName)}::${normalize(year || label)}`,
    brand,
    model: modelName,
    year,
    modelYearLabel: label,
    category: String(attrs.category ?? row.category_sheet ?? "").trim(),
    fuelType: String(attrs.fuel_type ?? row.fuel_type ?? "").trim(),
    efficiencyLPerKm,
    efficiencyRaw: raw,
    efficiencyUnit: unit,
    countryOfOrigin: String(attrs.country_of_origin ?? row.country_of_origin ?? "").trim(),
    source: String(attrs.source ?? row.source ?? "").trim(),
  };
}

function toRows(rows: Record<string, unknown>[] | null | undefined): VehicleMakeModelRow[] {
  return (rows ?? [])
    .map((row) => parseRow(row))
    .filter((row): row is VehicleMakeModelRow => !!row);
}

async function loadFromRef(): Promise<VehicleMakeModelRow[]> {
  let rows = await tryLoadFactorSheetViaApi({
    datasetCodes: [MAKE_MODEL_DATASET_CODE],
    nameHints: ["make model", "motor vehicle make", "manufacturer efficiency"],
  });

  if (!rows || rows.length === 0) {
    const refClient = (supabase as { schema?: (s: string) => typeof supabase }).schema
      ? (supabase as { schema: (s: string) => typeof supabase }).schema("ref")
      : supabase;
    const { data: dataset } = await refClient
      .from("factor_datasets")
      .select("id")
      .eq("code", MAKE_MODEL_DATASET_CODE)
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

async function loadFromStaging(): Promise<VehicleMakeModelRow[]> {
  const { data, error } = await supabase.from(MAKE_MODEL_STAGING_TABLE).select("*");
  if (error) {
    console.warn("Make/model staging load failed:", error.message);
    return [];
  }
  return toRows((data ?? []) as Record<string, unknown>[]);
}

export async function loadVehicleMakeModelRows(): Promise<VehicleMakeModelRow[]> {
  const fromRef = await loadFromRef();
  if (fromRef.length > 0) return fromRef;
  return loadFromStaging();
}

export function brandsFromMakeModel(rows: VehicleMakeModelRow[]): string[] {
  return Array.from(new Set(rows.map((r) => r.brand))).sort((a, b) => a.localeCompare(b));
}

/** Distinct model names for a brand. */
export function modelNamesForBrand(rows: VehicleMakeModelRow[], brand: string): string[] {
  if (!brand) return [];
  const n = normalize(brand);
  return Array.from(new Set(rows.filter((r) => normalize(r.brand) === n).map((r) => r.model))).sort((a, b) =>
    a.localeCompare(b)
  );
}

/** Years available for brand + model. Empty string year becomes "Unknown". */
export function yearsForBrandModel(
  rows: VehicleMakeModelRow[],
  brand: string,
  model: string
): string[] {
  if (!brand || !model) return [];
  const bn = normalize(brand);
  const mn = normalize(model);
  const years = rows
    .filter((r) => normalize(r.brand) === bn && normalize(r.model) === mn)
    .map((r) => r.year || "Unknown");
  return Array.from(new Set(years)).sort((a, b) => a.localeCompare(b));
}

/** @deprecated use modelNamesForBrand — kept for any leftover callers */
export function modelsForBrand(rows: VehicleMakeModelRow[], brand: string): VehicleMakeModelRow[] {
  if (!brand) return [];
  const n = normalize(brand);
  return rows
    .filter((r) => normalize(r.brand) === n)
    .sort((a, b) => a.modelYearLabel.localeCompare(b.modelYearLabel));
}

export function findMakeModelRow(
  rows: VehicleMakeModelRow[],
  brand: string,
  model: string,
  year?: string
): VehicleMakeModelRow | null {
  if (!brand || !model) return null;
  const bn = normalize(brand);
  const mn = normalize(model);
  let subset = rows.filter((r) => normalize(r.brand) === bn && normalize(r.model) === mn);
  if (subset.length === 0) {
    // Legacy: model field stored model_year_label
    subset = rows.filter((r) => normalize(r.brand) === bn && normalize(r.modelYearLabel) === mn);
  }
  if (subset.length === 0) return null;
  if (year && year !== "Unknown") {
    const yn = normalize(year);
    const exact = subset.find((r) => normalize(r.year) === yn);
    if (exact) return exact;
  }
  if (!year || year === "Unknown") {
    const blank = subset.find((r) => !r.year);
    if (blank) return blank;
  }
  return subset[0] ?? null;
}

export function formatMakeModelHint(row: VehicleMakeModelRow): string {
  const bits = [
    `${row.efficiencyRaw} ${row.efficiencyUnit}`,
    `→ ${row.efficiencyLPerKm.toFixed(4)} L/km`,
  ];
  if (row.year) bits.push(`Year ${row.year}`);
  if (row.fuelType) bits.push(row.fuelType);
  if (row.source) bits.push(row.source);
  return bits.join(" · ");
}

/** Soft-match sheet fuel label to an EPA Mobile Fuel name. */
export function matchEpaFuelFromSheet(sheetFuel: string, epaFuels: string[]): string | null {
  if (!sheetFuel || epaFuels.length === 0) return null;
  const n = normalize(sheetFuel);
  const exact = epaFuels.find((f) => normalize(f) === n);
  if (exact) return exact;

  const isPetrol = /petrol|gasoline|motor gasoline|benzin/.test(n);
  const isDiesel = /\bdiesel\b/.test(n);
  const isCng = /\bcng\b|compressed natural/.test(n);
  const isLpg = /\blpg\b|liquefied petroleum|autogas/.test(n);
  const isEv = /electric|ev\b|battery|bev|phev|hybrid/.test(n);

  const pick = (pred: (f: string) => boolean) => epaFuels.find((f) => pred(normalize(f))) ?? null;

  if (isPetrol) {
    return pick((f) => f.includes("motor gasoline") || (f.includes("gasoline") && !f.includes("aviation")));
  }
  if (isDiesel) return pick((f) => f.includes("diesel"));
  if (isCng) return pick((f) => f.includes("cng") || f.includes("compressed natural"));
  if (isLpg) return pick((f) => f.includes("lpg") || f.includes("liquefied petroleum"));
  if (isEv) return pick((f) => f.includes("electric") || f.includes("ev"));
  return null;
}

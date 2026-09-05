/**
 * CBECS Table C4 — building-type energy statistics for CRE / mortgage Score 4 & 5.
 *
 * Preferred source: ref.factor_datasets / ref.factor_rows (code: cbecs_table_c4)
 * Fallback: public.staging_cbecs_table_c4 (pgAdmin CSV import)
 *
 * UI only shows rows where category = "Principal building activity"
 * (Education, Food sales, Office, …) — not floorspace / All buildings / other groups.
 *
 * Conversions:
 *   kBtu/sqft × 0.29307 → kWh/sqft   (Score 4)
 *   MBtu/building × 293.07 → kWh/building (Score 5)
 */

import { supabase } from "@/integrations/supabase/client";
import { tryLoadFactorSheetViaApi } from "@/api/factorDualRead";

export const CBECS_DATASET_CODE = "cbecs_table_c4";
export const CBECS_STAGING_TABLE = "staging_cbecs_table_c4";
export const CBECS_PRINCIPAL_CATEGORY = "Principal building activity";

const KBtu_TO_KWH = 0.29307107;
const MBtu_TO_KWH = 293.07107;

export type CbecsBuildingRow = {
  key: string;
  category: string;
  subcategory: string;
  /** Score 4 — kWh per square foot */
  kwhPerSqft: number;
  /** Score 5 — kWh per building */
  kwhPerBuilding: number;
};

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

function isPrincipalBuildingActivityCategory(category: string): boolean {
  const n = normalize(category);
  return n === "principal building activity" || n === "principal building activities";
}

function parseCbecsRow(row: Record<string, unknown>): CbecsBuildingRow | null {
  const attrs = (row.attributes ?? {}) as Record<string, unknown>;
  const category = String(row.category ?? attrs.category ?? "").trim();
  const subcategory = String(
    row.subcategory ?? row.label ?? attrs.subcategory ?? ""
  ).trim();
  if (!category && !subcategory) return null;

  // Only Principal building activity rows
  if (!isPrincipalBuildingActivityCategory(category)) return null;
  if (!subcategory) return null;

  const kbtuSqft =
    num(attrs.intensity_median_kbtu_sqft) ||
    num(row.intensity_median_kbtu_sqft) ||
    num(attrs.consumption_per_sqft_thousand_btu) ||
    num(row.consumption_per_sqft_thousand_btu);

  const kwhPerSqft =
    num(attrs.energy_intensity_kwh_per_sqft) ||
    num(row.consumption_per_sqft_kwh_score4) ||
    num(attrs.consumption_per_sqft_kwh_score4) ||
    (kbtuSqft > 0 ? kbtuSqft * KBtu_TO_KWH : 0);

  const mbtuBuilding =
    num(attrs.consumption_per_building_million_btu) ||
    num(row.consumption_per_building_million_btu);

  const kwhPerBuilding =
    num(attrs.energy_per_building_kwh_score5) ||
    num(row.consumption_per_building_kwh_score5) ||
    num(attrs.consumption_per_building_kwh_score5) ||
    (mbtuBuilding > 0 ? mbtuBuilding * MBtu_TO_KWH : 0);

  if (kwhPerSqft <= 0 && kwhPerBuilding <= 0) return null;

  return {
    key: `${CBECS_PRINCIPAL_CATEGORY}::${subcategory}`,
    category: CBECS_PRINCIPAL_CATEGORY,
    subcategory,
    kwhPerSqft,
    kwhPerBuilding,
  };
}

function toBuildingRows(rows: Record<string, unknown>[] | null | undefined): CbecsBuildingRow[] {
  const parsed = (rows ?? [])
    .map((row) => parseCbecsRow(row))
    .filter((row): row is CbecsBuildingRow => !!row);

  // Dedupe by subcategory label
  const bySub = new Map<string, CbecsBuildingRow>();
  for (const row of parsed) {
    bySub.set(normalize(row.subcategory), row);
  }
  return Array.from(bySub.values()).sort((a, b) =>
    a.subcategory.localeCompare(b.subcategory)
  );
}

async function loadFromRefFactorRows(): Promise<CbecsBuildingRow[]> {
  let rows = await tryLoadFactorSheetViaApi({
    datasetCodes: [CBECS_DATASET_CODE],
    nameHints: ["CBECS", "cbecs table c4"],
  });

  if (!rows || rows.length === 0) {
    const refClient = (supabase as { schema?: (s: string) => typeof supabase }).schema
      ? (supabase as { schema: (s: string) => typeof supabase }).schema("ref")
      : supabase;
    const { data: dataset } = await refClient
      .from("factor_datasets")
      .select("id")
      .eq("code", CBECS_DATASET_CODE)
      .maybeSingle();
    if (dataset?.id) {
      const { data: fallbackRows } = await refClient
        .from("factor_rows")
        .select("category, label, attributes")
        .eq("dataset_id", dataset.id)
        .order("category", { ascending: true })
        .order("label", { ascending: true });
      rows = fallbackRows ?? [];
    }
  }

  return toBuildingRows((rows ?? []) as Record<string, unknown>[]);
}

/** Fallback when CBECS was imported to staging in pgAdmin but not promoted to ref.factor_rows. */
async function loadFromStagingTable(): Promise<CbecsBuildingRow[]> {
  const { data, error } = await supabase
    .from(CBECS_STAGING_TABLE)
    .select(
      [
        "category",
        "subcategory",
        "consumption_per_building_million_btu",
        "consumption_per_sqft_thousand_btu",
        "intensity_median_kbtu_sqft",
        "consumption_per_sqft_kwh_score4",
        "consumption_per_building_kwh_score5",
      ].join(", ")
    )
    .ilike("category", "Principal building activity%")
    .order("subcategory", { ascending: true });

  if (error) {
    console.warn("CBECS staging load failed:", error.message);
    return [];
  }
  return toBuildingRows((data ?? []) as Record<string, unknown>[]);
}

export async function loadCbecsBuildingTypes(): Promise<CbecsBuildingRow[]> {
  const fromRef = await loadFromRefFactorRows();
  if (fromRef.length > 0) return fromRef;

  const fromStaging = await loadFromStagingTable();
  if (fromStaging.length > 0) return fromStaging;

  return [];
}

export function formatCbecsLabel(row: CbecsBuildingRow): string {
  return row.subcategory || row.category;
}

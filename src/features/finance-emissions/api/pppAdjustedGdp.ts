import { supabase } from "@/integrations/supabase/client";
import { isJwtAuthEnabled } from "@/api/config";
import { listPppAdjustedGdp } from "@/api/catalog";
import type {
  PppAdjustedGdpRow,
  ResolvedPppGdp,
  SovereignCountryOption,
} from "../types/pppAdjustedGdp";
import { cleanCountryName } from "../utils/cleanCountryName";

const PREFERRED_YEAR = 2025;
const FALLBACK_YEAR = 2024;

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeRow(raw: Record<string, unknown>): PppAdjustedGdpRow | null {
  const countryName = cleanCountryName(String(raw.country_name ?? ""));
  if (!countryName) return null;
  return {
    country_name: countryName,
    gdp_2024: num(raw.gdp_2024),
    gdp_2025: num(raw.gdp_2025),
  };
}

/** Prefer 2025; fall back to 2024 when 2025 is missing. */
export function resolvePppGdpForRow(
  row: PppAdjustedGdpRow,
  preferredYear: number = PREFERRED_YEAR
): ResolvedPppGdp | null {
  const g2025 = num(row.gdp_2025);
  const g2024 = num(row.gdp_2024);

  if (preferredYear === PREFERRED_YEAR && g2025 != null) {
    return {
      countryName: row.country_name,
      value: g2025,
      year: PREFERRED_YEAR,
      usedFallback: false,
    };
  }
  if (g2025 != null) {
    return {
      countryName: row.country_name,
      value: g2025,
      year: PREFERRED_YEAR,
      usedFallback: false,
    };
  }
  if (g2024 != null) {
    return {
      countryName: row.country_name,
      value: g2024,
      year: FALLBACK_YEAR,
      usedFallback: preferredYear === PREFERRED_YEAR,
    };
  }
  return null;
}

export function toSovereignCountryOption(row: PppAdjustedGdpRow): SovereignCountryOption | null {
  const resolved = resolvePppGdpForRow(row);
  if (!resolved) return null;
  return {
    countryName: resolved.countryName,
    gdpYear: resolved.year,
    gdpValue: resolved.value,
    usedFallback: resolved.usedFallback,
  };
}

function mergePppRows(rows: PppAdjustedGdpRow[]): PppAdjustedGdpRow[] {
  const byName = new Map<string, PppAdjustedGdpRow>();
  for (const row of rows) {
    const key = row.country_name.toLowerCase();
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, { ...row });
      continue;
    }
    byName.set(key, {
      country_name: existing.country_name,
      gdp_2024: existing.gdp_2024 ?? row.gdp_2024,
      gdp_2025: existing.gdp_2025 ?? row.gdp_2025,
    });
  }
  return Array.from(byName.values());
}

export async function fetchPppAdjustedGdpRows(): Promise<PppAdjustedGdpRow[]> {
  if (isJwtAuthEnabled()) {
    const raw = await listPppAdjustedGdp();
    return mergePppRows(
      raw
        .map((row) => normalizeRow(row))
        .filter((row): row is PppAdjustedGdpRow => row != null)
    );
  }

  const { data, error } = await (supabase as unknown as {
    from: (table: string) => {
      select: (cols: string) => {
        order: (col: string) => Promise<{ data: Record<string, unknown>[] | null; error: Error | null }>;
      };
    };
  })
    .from("ppp_adjusted_gdp")
    .select("country_name, gdp_2024, gdp_2025")
    .order("country_name");

  if (error) throw error;

  return mergePppRows(
    (data || [])
      .map((row) => normalizeRow(row as Record<string, unknown>))
      .filter((row): row is PppAdjustedGdpRow => row != null)
  );
}

/** Countries with at least one usable GDP value (empty rows excluded from the menu). */
export async function fetchSovereignCountryOptions(): Promise<SovereignCountryOption[]> {
  const rows = await fetchPppAdjustedGdpRows();
  const byName = new Map<string, SovereignCountryOption>();
  for (const row of rows) {
    const opt = toSovereignCountryOption(row);
    if (!opt) continue;
    const key = opt.countryName.toLowerCase();
    const existing = byName.get(key);
    // Prefer a 2025 row over a 2024-only fallback when duplicates appear after cleaning.
    if (!existing || (existing.usedFallback && !opt.usedFallback)) {
      byName.set(key, opt);
    }
  }
  return Array.from(byName.values()).sort((a, b) => a.countryName.localeCompare(b.countryName));
}

export async function resolvePppGdpForCountryName(
  countryName: string,
  preferredYear: number = PREFERRED_YEAR
): Promise<ResolvedPppGdp | null> {
  const trimmed = cleanCountryName(countryName);
  if (!trimmed) return null;

  const rows = await fetchPppAdjustedGdpRows();
  const row = rows.find(
    (r) => r.country_name.toLowerCase() === trimmed.toLowerCase()
  );
  if (!row) return null;
  return resolvePppGdpForRow(row, preferredYear);
}

import { isJwtAuthEnabled } from "@/api/config";
import { listCountrySectorIntensity } from "@/api/catalog";
import type {
  CountrySectorIntensityRow,
  SectorOption,
} from "../types/countrySectorIntensity";
import { cleanCountryName } from "../utils/cleanCountryName";
import { cleanSectorDisplayName } from "../utils/cleanSectorDisplayName";

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeRow(raw: Record<string, unknown>): CountrySectorIntensityRow | null {
  const countryName = cleanCountryName(String(raw.country_name ?? ""));
  const sectorCode = String(raw.sector_code ?? "").trim();
  const rawSectorName = String(raw.sector_name ?? "").trim();
  const sectorName = cleanSectorDisplayName(rawSectorName || sectorCode, sectorCode);
  const intensity = num(raw.intensity);
  if (!countryName || (!sectorName && !sectorCode) || intensity == null) return null;
  return {
    country_code: String(raw.country_code ?? "").trim(),
    country_name: countryName,
    sector_code: sectorCode,
    sector_name: sectorName || sectorCode,
    year: Number(raw.year) || 2025,
    unit: String(raw.unit ?? "kgCO2e/PKR"),
    intensity,
  };
}

export function toSectorOption(row: CountrySectorIntensityRow): SectorOption {
  return {
    sectorKey: row.sector_code || row.sector_name,
    sectorCode: row.sector_code,
    sectorName: cleanSectorDisplayName(row.sector_name, row.sector_code),
    year: row.year,
    unit: row.unit,
    intensity: row.intensity,
  };
}

/** Convert sheet intensity to tCO2e per PKR (sheet is typically kgCO2e/PKR). */
export function intensityToTco2ePerCurrency(intensity: number, unit: string): number {
  const u = unit.toLowerCase().replace(/\s/g, "");
  if (u.includes("kgco2") || u.startsWith("kg")) return intensity / 1000;
  return intensity;
}

export async function fetchSectorsForCountry(
  countryName: string
): Promise<SectorOption[]> {
  const cleaned = cleanCountryName(countryName);
  if (!cleaned) return [];

  if (!isJwtAuthEnabled()) {
    throw new Error("Country sector intensity requires the backend API (JWT auth).");
  }

  const toOptions = (raw: Record<string, unknown>[]) =>
    raw
      .map((row) => normalizeRow(row))
      .filter((row): row is CountrySectorIntensityRow => row != null)
      // Match cleaned names so "Pakistan 2024" in DB still maps to "Pakistan".
      .filter((row) => row.country_name.toLowerCase() === cleaned.toLowerCase())
      .map(toSectorOption)
      .sort((a, b) => a.sectorName.localeCompare(b.sectorName));

  const attempts = [cleaned, countryName.trim()].filter(
    (name, index, arr) => name && arr.indexOf(name) === index
  );

  for (const name of attempts) {
    const options = toOptions(
      await listCountrySectorIntensity({
        country_name: name,
        limit: 5000,
      })
    );
    if (options.length > 0) return options;
  }

  // Last resort: backend may only match the year-suffixed DB label.
  return toOptions(await listCountrySectorIntensity({ limit: 5000 }));
}

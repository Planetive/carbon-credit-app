/**
 * Climate TRACE country emissions (v7).
 * Docs: https://api.climatetrace.org/v7/docs/index.html#description/introduction
 *
 * Only Pakistan and UAE are supported for sovereign Option 1a verified emissions.
 */

export const CLIMATE_TRACE_SOURCE_URL =
  "https://api.climatetrace.org/v7/docs/index.html#description/introduction";
export const CLIMATE_TRACE_API_BASE = "https://api.climatetrace.org";
export const CLIMATE_TRACE_EMISSIONS_YEAR = 2025;
export const CLIMATE_TRACE_GAS = "co2e_100yr";

export type ClimateTraceVerifiedEmission = {
  countryCode: string;
  countryName: string;
  emissionsTons: number;
  year: number;
  gas: string;
};

/** Fixed menu — only these countries. */
export const CLIMATE_TRACE_COUNTRIES = [
  { countryCode: "PAK", countryName: "Pakistan" },
  { countryCode: "ARE", countryName: "United Arab Emirates" },
] as const;

type EmissionsResponse = {
  location?: { name?: string; gadmId?: string; country?: string };
  totals?: {
    summaries?: Array<{ gas?: string; emissionsQuantity?: number }>;
  };
};

export function formatEmissionsMillions(tons: number): string {
  const millions = tons / 1_000_000;
  const rounded =
    millions >= 100 ? Math.round(millions) : Math.round(millions * 10) / 10;
  return `${rounded.toLocaleString()} million tCO₂e`;
}

export async function fetchClimateTraceCountryEmissions(
  countryCode: string,
  year: number = CLIMATE_TRACE_EMISSIONS_YEAR,
  gas: string = CLIMATE_TRACE_GAS
): Promise<number> {
  const url = new URL(`${CLIMATE_TRACE_API_BASE}/v7/sources/emissions`);
  url.searchParams.set("gadmId", countryCode);
  url.searchParams.set("year", String(year));
  url.searchParams.set("gas", gas);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Climate TRACE ${countryCode} failed (${res.status})`);
  }

  const data = (await res.json()) as EmissionsResponse;
  const qty = data.totals?.summaries?.[0]?.emissionsQuantity;
  if (qty == null || !Number.isFinite(qty) || qty <= 0) {
    throw new Error(`Climate TRACE returned no emissions for ${countryCode}`);
  }
  return qty;
}

export async function fetchClimateTraceVerifiedMenu(): Promise<
  ClimateTraceVerifiedEmission[]
> {
  const rows = await Promise.all(
    CLIMATE_TRACE_COUNTRIES.map(async (c) => {
      const emissionsTons = await fetchClimateTraceCountryEmissions(c.countryCode);
      return {
        countryCode: c.countryCode,
        countryName: c.countryName,
        emissionsTons,
        year: CLIMATE_TRACE_EMISSIONS_YEAR,
        gas: CLIMATE_TRACE_GAS,
      } satisfies ClimateTraceVerifiedEmission;
    })
  );
  return rows;
}

export function findClimateTraceEmissions(
  countryName: string,
  rows: ClimateTraceVerifiedEmission[]
): ClimateTraceVerifiedEmission | undefined {
  const normalized = countryName.trim().toLowerCase();
  const aliases: Record<string, string> = {
    pakistan: "pakistan",
    uae: "united arab emirates",
    "united arab emirates": "united arab emirates",
    "united arab emirates (the)": "united arab emirates",
  };
  const lookup = aliases[normalized] ?? normalized;
  return rows.find((row) => row.countryName.toLowerCase() === lookup);
}

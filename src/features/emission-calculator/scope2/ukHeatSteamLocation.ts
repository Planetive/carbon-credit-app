import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";

countries.registerLocale(enLocale);

export type HeatSteamLocationSource =
  | "facility_country"
  | "counterparty_geography"
  | "organization_country";

export type HeatSteamLocationHints = {
  facilityCountry?: string | null;
  counterpartyGeography?: string | null;
  organizationCountry?: string | null;
};

export type ResolvedHeatSteamLocation =
  | { status: "resolved"; country: string; source: HeatSteamLocationSource }
  | { status: "unavailable" };

const UNRELIABLE = new Set([
  "",
  "n/a",
  "na",
  "none",
  "unknown",
  "global",
  "worldwide",
  "international",
  "various",
  "multiple",
  "europe",
  "asia",
  "africa",
  "americas",
  "emea",
]);

const CODE_ALIASES: Record<string, string> = {
  uk: "United Kingdom",
  gb: "United Kingdom",
  "u k": "United Kingdom",
  "great britain": "United Kingdom",
  britain: "United Kingdom",
  "united kingdom": "United Kingdom",
  "united kingdom of great britain and northern ireland": "United Kingdom",
  pk: "Pakistan",
  pakistan: "Pakistan",
  ae: "United Arab Emirates",
  uae: "United Arab Emirates",
  "united arab emirates": "United Arab Emirates",
};

function compactCountryKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.]/g, "")
    .replace(/[_/]+/g, " ")
    .replace(/\s+/g, " ");
}

function officialCountryNames(): string[] {
  return Object.values(countries.getNames("en"))
    .filter((name) => typeof name === "string" && name.trim())
    .sort((a, b) => a.localeCompare(b));
}

const OFFICIAL_BY_KEY = new Map(
  officialCountryNames().map((name) => [compactCountryKey(name), name] as const)
);

export function heatSteamCountryOptions(): string[] {
  return officialCountryNames();
}

export function canonicalHeatSteamCountry(value: string | null | undefined): string | null {
  const raw = (value || "").trim();
  if (!raw) return null;
  const key = compactCountryKey(raw);
  if (UNRELIABLE.has(key)) return null;
  if (CODE_ALIASES[key]) return CODE_ALIASES[key];
  const official = OFFICIAL_BY_KEY.get(key);
  if (official) return official;
  const alpha2 = countries.getAlpha2Code(raw, "en");
  if (alpha2) return countries.getName(alpha2, "en") || null;
  if (raw.includes(",")) {
    const parts = raw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    for (const part of [...parts].reverse()) {
      const found = canonicalHeatSteamCountry(part);
      if (found) return found;
    }
  }
  return null;
}

export function resolveHeatSteamLocation(hints: HeatSteamLocationHints): ResolvedHeatSteamLocation {
  const candidates: Array<{ value?: string | null; source: HeatSteamLocationSource }> = [
    { value: hints.facilityCountry, source: "facility_country" },
    { value: hints.counterpartyGeography, source: "counterparty_geography" },
    { value: hints.organizationCountry, source: "organization_country" },
  ];
  for (const candidate of candidates) {
    const country = canonicalHeatSteamCountry(candidate.value);
    if (country) return { status: "resolved", country, source: candidate.source };
  }
  return { status: "unavailable" };
}

export function heatSteamLocationLabel(source: HeatSteamLocationSource): string {
  if (source === "facility_country") return "From the facility location";
  if (source === "organization_country") return "From the organization location";
  return "From the company's geography";
}

export function missingHeatSteamCountryMessage(): string {
  return "Select the country where the heat or steam is supplied. A UK factor is not applied automatically.";
}

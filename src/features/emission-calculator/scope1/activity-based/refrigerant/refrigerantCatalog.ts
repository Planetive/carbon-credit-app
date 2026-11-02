/**
 * Names the refrigerant-leakage API accepts.
 * GWP numbers are not stored here. The backend resolves them.
 */

export const SUPPORTED_BLENDS = [
  "R-404A",
  "R-407A",
  "R-407B",
  "R-407C",
  "R-407D",
  "R-410A",
  "R-410B",
  "R-417A",
  "R-422A",
  "R-422D",
  "R-424A",
  "R-426A",
  "R-428A",
  "R-434A",
  "R-507A",
  "R-508A",
  "R-508B",
] as const;

export const SUPPORTED_PURE_HFCS = [
  "HFC-23",
  "HFC-32",
  "HFC-41",
  "HFC-125",
  "HFC-134",
  "HFC-134a",
  "HFC-143",
  "HFC-143a",
  "HFC-152",
  "HFC-152a",
  "HFC-161",
  "HFC-227ea",
  "HFC-236cb",
  "HFC-236ea",
  "HFC-236fa",
  "HFC-245ca",
  "HFC-245fa",
  "HFC-365mfc",
  "HFC-43-10mee",
] as const;

const ALIASES: Record<string, string> = {
  "r-32": "HFC-32",
  "r-125": "HFC-125",
  "r-134a": "HFC-134a",
  "r-143a": "HFC-143a",
  "r-152a": "HFC-152a",
  "hfc-43-i0mee": "HFC-43-10mee",
};

export type RefrigerantGasGroup = {
  id: string;
  label: string;
  options: readonly string[];
};

export function normalizeRefrigerantName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ");
}

export function canonicalRefrigerant(value: string): string | null {
  const key = normalizeRefrigerantName(value);
  if (!key) return null;
  if (ALIASES[key]) return ALIASES[key];
  const blend = SUPPORTED_BLENDS.find((name) => normalizeRefrigerantName(name) === key);
  if (blend) return blend;
  const pure = SUPPORTED_PURE_HFCS.find((name) => normalizeRefrigerantName(name) === key);
  return pure ?? null;
}

export function isSupportedRefrigerant(value: string): boolean {
  return canonicalRefrigerant(value) != null;
}

export function refrigerantGasGroups(): RefrigerantGasGroup[] {
  return [
    {
      id: "common_ac",
      label: "Common AC refrigerants",
      options: ["R-410A", "R-410B", "R-407A", "R-407B", "R-407C", "R-407D", "HFC-32"],
    },
    {
      id: "blends",
      label: "Other approved blends",
      options: SUPPORTED_BLENDS.filter((name) => !["R-410A", "R-410B", "R-407A", "R-407B", "R-407C", "R-407D"].includes(name)),
    },
    {
      id: "pure",
      label: "Pure HFCs",
      options: SUPPORTED_PURE_HFCS.filter((name) => name !== "HFC-32"),
    },
  ];
}

export function offeredRefrigerants(): string[] {
  return refrigerantGasGroups().flatMap((group) => [...group.options]);
}

function compactRefrigerantToken(value: string): string {
  return normalizeRefrigerantName(value).replace(/-/g, "").replace(/\s+/g, "");
}

function searchTokensFor(name: string): string[] {
  const aliases = Object.entries(ALIASES)
    .filter(([, canonical]) => canonical === name)
    .map(([alias]) => alias);
  return [name, ...aliases].map(compactRefrigerantToken);
}

export function matchesRefrigerantQuery(name: string, query: string): boolean {
  const needle = compactRefrigerantToken(query);
  if (!needle) return true;
  return searchTokensFor(name).some((token) => token.includes(needle));
}

export function filterRefrigerantGroups(query: string): RefrigerantGasGroup[] {
  return refrigerantGasGroups()
    .map((group) => ({
      ...group,
      options: group.options.filter((name) => matchesRefrigerantQuery(name, query)),
    }))
    .filter((group) => group.options.length > 0);
}

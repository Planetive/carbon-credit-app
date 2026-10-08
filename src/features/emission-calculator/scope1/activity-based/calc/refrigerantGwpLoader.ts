import { loadIpccFactorTableRows } from "@/integrations/supabase/ipccFactorLoader";
import { EPA_REFRIGERANT_GWP } from "@/features/emission-calculator/scope1/constants/epaRefrigerantGwp";

export type RefrigerantGwpSource = {
  map: Record<string, number>;
  sourceName: string;
  gwpBasis: string;
  loadedFromDb: boolean;
  warning?: string;
};

function pick(row: Record<string, unknown>, keys: RegExp[]): string | number | undefined {
  for (const [k, v] of Object.entries(row)) {
    if (keys.some((re) => re.test(k))) return v as string | number;
  }
  return undefined;
}

function parseGwp(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (value == null) return undefined;
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * Prefer governed "EPA Refrigerant GWP" sheet. If unavailable/unverified, fall back to
 * the in-code map with explicit disclosure — never silently invent new GWP values.
 */
export async function loadGovernedRefrigerantGwp(): Promise<RefrigerantGwpSource> {
  try {
    const { rows, source } = await loadIpccFactorTableRows([
      "EPA Refrigerant GWP",
      '"EPA Refrigerant GWP"',
      "epa_refrigerant_gwp",
      "EPA_Refrigerant_GWP",
    ]);

    if (rows.length > 0) {
      const map: Record<string, number> = {};
      for (const row of rows) {
        const name = String(
          pick(row, [/^ashrae/i, /^r[- ]?#?/i, /refrigerant/i, /^blend/i, /^name$/i]) ?? ""
        ).trim();
        const gwp = parseGwp(
          pick(row, [/100[- ]?year/i, /\bgwp\b/i, /global warming/i])
        );
        if (name && gwp != null) {
          map[name] = gwp;
          // Also index without spaces for R-410A style keys
          map[name.replace(/\s+/g, "")] = gwp;
        }
      }
      if (Object.keys(map).length > 0) {
        return {
          map: { ...EPA_REFRIGERANT_GWP, ...map },
          sourceName: source || "EPA Refrigerant GWP",
          gwpBasis: "As published in EPA Refrigerant GWP reference (verify AR assessment basis in source table)",
          loadedFromDb: true,
        };
      }
    }
  } catch {
    // fall through to code map with disclosure
  }

  return {
    map: { ...EPA_REFRIGERANT_GWP },
    sourceName: "In-code EPA_REFRIGERANT_GWP / REFRIGERANT_FACTORS",
    gwpBasis: "AR5-style 100-year values embedded in application (not live DB)",
    loadedFromDb: false,
    warning:
      "Governed table \"EPA Refrigerant GWP\" could not be loaded or had no usable rows. Using embedded GWP map with disclosure — verify values before assurance use.",
  };
}

export function snapshotGwp(
  map: Record<string, number>,
  refrigerantType: string,
  customGwp?: number
): { gwp: number; refrigerantType: string } | null {
  if (typeof customGwp === "number" && customGwp > 0) {
    return { gwp: customGwp, refrigerantType };
  }
  const hit = map[refrigerantType];
  if (typeof hit === "number" && hit > 0) return { gwp: hit, refrigerantType };
  return null;
}

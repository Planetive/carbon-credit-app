import { REFRIGERANT_FACTORS } from "@/components/emissions/shared/EmissionFactors";

/** Common R-designation blends and HFC names → GWP (AR5-style, 100-year). */
const R_DESIGNATION_GWP: Record<string, number> = {
  "R-410A": 1924,
  "R-404A": 3922,
  "R-407C": 1774,
  "R-407A": 1923,
  "R-134a": 1300,
  "R-32": 677,
  "R-125": 3170,
  "R-143a": 4800,
  "R-152a": 138,
  "R-22": 1760,
  "R-12": 10200,
  "R-502": 4657,
};

export const EPA_REFRIGERANT_GWP: Record<string, number> = {
  ...REFRIGERANT_FACTORS,
  ...R_DESIGNATION_GWP,
};

export const EPA_REFRIGERANT_TYPE_OPTIONS = Object.keys(EPA_REFRIGERANT_GWP).sort((a, b) =>
  a.localeCompare(b)
);

const EPA_REFRIGERANT_FRIENDLY_NAMES: Record<string, string> = {
  "R-410A": "Puron (common home split AC)",
  "R-32": "Lower-GWP split AC refrigerant",
  "R-134a": "Auto and commercial refrigeration",
  "R-404A": "Commercial/freezer refrigeration blend",
  "R-407C": "HVAC retrofit refrigerant blend",
  "R-22": "Legacy HCFC refrigerant (older AC systems)",
};

export type EpaRefrigerantCalculationMethod = "leakage_record" | "estimated_leakage";

export const EPA_EQUIPMENT_LEAKAGE_ASSUMPTIONS = [
  {
    id: "small_split_ac",
    label: "Small split AC units",
    rateRange: "1–5%",
    suggestedRatePercent: 3,
  },
  {
    id: "commercial_packaged_ac",
    label: "Commercial packaged AC systems",
    rateRange: "5–10%",
    suggestedRatePercent: 7.5,
  },
  {
    id: "large_chillers",
    label: "Large chillers",
    rateRange: "2–15%",
    suggestedRatePercent: 8.5,
  },
  {
    id: "poorly_maintained",
    label: "Poorly maintained systems",
    rateRange: "10–20%+",
    suggestedRatePercent: 15,
  },
] as const;

export type EpaRefrigerantEquipmentType = (typeof EPA_EQUIPMENT_LEAKAGE_ASSUMPTIONS)[number]["id"];

export function resolveRefrigerantGwp(refrigerantType: string, customGwp?: number): number | undefined {
  if (typeof customGwp === "number" && customGwp > 0) return customGwp;
  const hit = EPA_REFRIGERANT_GWP[refrigerantType];
  return typeof hit === "number" ? hit : undefined;
}

export function formatEpaRefrigerantLabel(refrigerantType: string): string {
  const gwp = EPA_REFRIGERANT_GWP[refrigerantType];
  const friendly = EPA_REFRIGERANT_FRIENDLY_NAMES[refrigerantType];
  const typeWithName = friendly ? `${refrigerantType} - ${friendly}` : refrigerantType;
  if (typeof gwp !== "number") return typeWithName;
  return `${typeWithName} (GWP ${gwp.toLocaleString()})`;
}

export function calculateEpaRefrigerantEmissions(input: {
  method: EpaRefrigerantCalculationMethod;
  gwp: number;
  leakageKg?: number;
  chargeKg?: number;
  leakageRatePercent?: number;
}): { leakageKg: number; emissionsKg: number; emissionsTonnes: number } | null {
  const { method, gwp } = input;
  if (!Number.isFinite(gwp) || gwp <= 0) return null;

  let leakageKg = 0;
  if (method === "leakage_record") {
    if (typeof input.leakageKg !== "number" || input.leakageKg < 0) return null;
    leakageKg = input.leakageKg;
  } else {
    if (
      typeof input.chargeKg !== "number" ||
      input.chargeKg < 0 ||
      typeof input.leakageRatePercent !== "number" ||
      input.leakageRatePercent < 0
    ) {
      return null;
    }
    leakageKg = input.chargeKg * (input.leakageRatePercent / 100);
  }

  const emissionsKg = Number((leakageKg * gwp).toFixed(6));
  const emissionsTonnes = Number((emissionsKg / 1000).toFixed(6));
  return {
    leakageKg: Number(leakageKg.toFixed(6)),
    emissionsKg,
    emissionsTonnes,
  };
}

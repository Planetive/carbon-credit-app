import { REFRIGERANT_FACTORS } from "@/components/emissions/shared/EmissionFactors";

/** Common R-designation blends and HFC names → GWP (AR5-style, 100-year). Internal keys only. */
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

export type EpaRefrigerantGasGroup = "ac_hvac" | "refrigeration_vehicle" | "other_fgas";

/** Broad classification for use-case filtering (AC vs other). HFC-32 is excluded from AC UI (duplicate of R-32). */
const EPA_REFRIGERANT_GAS_GROUP: Record<string, EpaRefrigerantGasGroup> = {
  "R-410A": "ac_hvac",
  "R-32": "ac_hvac",
  "R-407C": "ac_hvac",
  "R-407A": "ac_hvac",
  "R-22": "ac_hvac",
  "R-134a": "refrigeration_vehicle",
  "R-404A": "refrigeration_vehicle",
  "R-502": "refrigeration_vehicle",
  "R-12": "refrigeration_vehicle",
  "HFC-134a": "refrigeration_vehicle",
  "HFC-125": "refrigeration_vehicle",
  "HFC-143a": "refrigeration_vehicle",
  "HFC-152a": "refrigeration_vehicle",
};

const GAS_GROUP_ORDER: EpaRefrigerantGasGroup[] = ["ac_hvac", "refrigeration_vehicle", "other_fgas"];

export const EPA_REFRIGERANT_GAS_GROUP_LABELS: Record<EpaRefrigerantGasGroup, string> = {
  ac_hvac: "AC / HVAC",
  refrigeration_vehicle: "Commercial refrigeration & vehicle AC",
  other_fgas: "Other refrigerants & F-gases",
};

export function getEpaRefrigerantGasGroup(refrigerantType: string): EpaRefrigerantGasGroup {
  return EPA_REFRIGERANT_GAS_GROUP[refrigerantType] ?? "other_fgas";
}

/** Flat sorted list (kept for compatibility). Prefer grouped options in UI. */
export const EPA_REFRIGERANT_TYPE_OPTIONS = Object.keys(EPA_REFRIGERANT_GWP).sort((a, b) =>
  a.localeCompare(b)
);

export const EPA_REFRIGERANT_TYPE_GROUPS: {
  group: EpaRefrigerantGasGroup;
  label: string;
  options: string[];
}[] = GAS_GROUP_ORDER.map((group) => ({
  group,
  label: EPA_REFRIGERANT_GAS_GROUP_LABELS[group],
  options: EPA_REFRIGERANT_TYPE_OPTIONS.filter((t) => getEpaRefrigerantGasGroup(t) === group),
})).filter((g) => g.options.length > 0);

/** UI subgroups for the AC path — short lists, plain-language labels. */
export type EpaRefrigerantUiGroupId =
  | "ac_most_common"
  | "ac_retrofit"
  | "ac_legacy"
  | "refrigeration_vehicle"
  | "other_fgas";

export type EpaRefrigerantUiGroup = {
  id: EpaRefrigerantUiGroupId;
  label: string;
  options: string[];
};

const AC_UI_GROUPS: EpaRefrigerantUiGroup[] = [
  {
    id: "ac_most_common",
    label: "Most common AC / heat pumps",
    options: ["R-410A", "R-32"],
  },
  {
    id: "ac_retrofit",
    label: "Other / retrofit HVAC",
    options: ["R-407C", "R-407A"],
  },
  {
    id: "ac_legacy",
    label: "Older / legacy systems",
    options: ["R-22"],
  },
];

/** Plain-language names shown in the UI — never lead with R-/HFC codes. */
const EPA_REFRIGERANT_FRIENDLY_NAMES: Record<string, string> = {
  "R-410A": "Common AC / heat-pump gas (Puron)",
  "R-32": "Lower-impact AC / heat-pump gas",
  "R-407C": "HVAC retrofit gas",
  "R-407A": "Commercial refrigeration / retrofit gas",
  "R-22": "Older AC & refrigeration gas (legacy)",
  "R-134a": "Vehicle AC & commercial refrigeration gas",
  "R-404A": "Commercial freezer refrigeration gas",
  "R-502": "Older commercial refrigeration gas (legacy)",
  "R-12": "Older refrigeration / vehicle AC gas (legacy)",
  "R-125": "Specialty cooling blend component",
  "R-143a": "Specialty cooling blend component",
  "R-152a": "Low-impact specialty cooling gas",
  "HFC-32": "Lower-impact AC / heat-pump gas",
  "HFC-134a": "Vehicle AC & commercial refrigeration gas",
  "HFC-125": "Specialty cooling gas",
  "HFC-143a": "Specialty cooling gas",
  "HFC-152a": "Low-impact specialty cooling gas",
  "HFC-23": "Specialty high-impact cooling gas",
  "HFC-41": "Specialty cooling gas",
  "HFC-134": "Specialty cooling gas",
  "HFC-143": "Specialty cooling gas",
  "HFC-152": "Low-impact specialty cooling gas",
  "HFC-161": "Low-impact specialty cooling gas",
  "HFC-227ea": "Specialty fire-suppressant / cooling gas",
  "HFC-236fa": "Specialty cooling gas",
  "HFC-236cb": "Specialty cooling gas",
  "HFC-236ea": "Specialty cooling gas",
  "HFC-245fa": "Specialty cooling / foam gas",
  "HFC-245ca": "Specialty cooling gas",
  "HFC-365mfc": "Specialty foam / solvent gas",
  "HFC-43-I0mee": "Specialty solvent gas",
  "Carbon dioxide": "Carbon dioxide",
  Methane: "Methane",
  "Nitrous oxide": "Nitrous oxide",
  "Perfluoromethane (PFC-14)": "Industrial process gas",
  "Perfluoroethane (PFC-116)": "Industrial process gas",
  "Perfluoropropane (PFC-218)": "Industrial process gas",
  "Perfluorocyclobutane (PFC-318)": "Industrial process gas",
  "Perfluorobutane (PFC-3-1-10)": "Industrial process gas",
  "Perfluoropentane (PFC-4-1-12)": "Industrial process gas",
  "Perfluorohexane (PFC-5-1-14)": "Industrial process gas",
  "PFC-9-1-18": "Industrial process gas",
  Perfluorocyclopropane: "Industrial process gas",
  "Sulphur hexafluoride (SF6)": "Electrical insulating gas",
  "Nitrogen trifluoride": "Electronics manufacturing gas",
};

export type EpaRefrigerantCalculationMethod = "leakage_record" | "estimated_leakage";

export type EpaRefrigerantEquipmentGroup = "ac_hvac" | "refrigeration_other";

export const EPA_EQUIPMENT_GROUP_LABELS: Record<EpaRefrigerantEquipmentGroup, string> = {
  ac_hvac: "AC / HVAC",
  refrigeration_other: "Refrigeration, vehicles & other systems",
};

export const EPA_EQUIPMENT_LEAKAGE_ASSUMPTIONS = [
  {
    id: "small_split_ac",
    label: "Small split AC / heat-pump units",
    rateRange: "1–5%",
    suggestedRatePercent: 3,
    group: "ac_hvac" as const,
  },
  {
    id: "commercial_packaged_ac",
    label: "Commercial packaged AC / rooftop units",
    rateRange: "5–10%",
    suggestedRatePercent: 7.5,
    group: "ac_hvac" as const,
  },
  {
    id: "large_chillers",
    label: "Large chillers (comfort / process cooling)",
    rateRange: "2–15%",
    suggestedRatePercent: 8.5,
    group: "ac_hvac" as const,
  },
  {
    id: "commercial_cold_room",
    label: "Cold rooms, freezers & refrigerated display",
    rateRange: "10–20%",
    suggestedRatePercent: 15,
    group: "refrigeration_other" as const,
  },
  {
    id: "vehicle_ac",
    label: "Vehicle air conditioning",
    rateRange: "5–15%",
    suggestedRatePercent: 10,
    group: "refrigeration_other" as const,
  },
  {
    id: "industrial_process",
    label: "Industrial process refrigeration",
    rateRange: "5–15%",
    suggestedRatePercent: 10,
    group: "refrigeration_other" as const,
  },
  {
    id: "poorly_maintained",
    label: "Poorly maintained systems (any equipment)",
    rateRange: "10–20%+",
    suggestedRatePercent: 15,
    group: "refrigeration_other" as const,
  },
] as const;

export type EpaRefrigerantEquipmentType = (typeof EPA_EQUIPMENT_LEAKAGE_ASSUMPTIONS)[number]["id"];

export const EPA_EQUIPMENT_TYPE_GROUPS: {
  group: EpaRefrigerantEquipmentGroup;
  label: string;
  options: (typeof EPA_EQUIPMENT_LEAKAGE_ASSUMPTIONS)[number][];
}[] = (["ac_hvac", "refrigeration_other"] as EpaRefrigerantEquipmentGroup[]).map((group) => ({
  group,
  label: EPA_EQUIPMENT_GROUP_LABELS[group],
  options: EPA_EQUIPMENT_LEAKAGE_ASSUMPTIONS.filter((e) => e.group === group),
}));

/** UI path: AC-only keeps a short list; other shows refrigeration / vehicle / F-gases. */
export type EpaRefrigerantUseCase = "ac_hvac" | "other";

export const DEFAULT_AC_REFRIGERANT_TYPE = "R-410A";
export const DEFAULT_AC_EQUIPMENT_TYPE: EpaRefrigerantEquipmentType = "small_split_ac";

export function resolveUseCaseFromEntry(
  refrigerantType?: string,
  equipmentType?: string
): EpaRefrigerantUseCase {
  if (equipmentType) {
    const equipment = EPA_EQUIPMENT_LEAKAGE_ASSUMPTIONS.find((e) => e.id === equipmentType);
    if (equipment?.group === "ac_hvac") return "ac_hvac";
    if (equipment) return "other";
  }
  if (refrigerantType && getEpaRefrigerantGasGroup(refrigerantType) === "ac_hvac") return "ac_hvac";
  if (refrigerantType) return "other";
  return "ac_hvac";
}

/** Dropdown groups for the selected path — AC uses Most common / Retrofit / Legacy. */
export function getGasGroupsForUseCase(useCase: EpaRefrigerantUseCase): EpaRefrigerantUiGroup[] {
  if (useCase === "ac_hvac") return AC_UI_GROUPS;
  return EPA_REFRIGERANT_TYPE_GROUPS.filter((g) => g.group !== "ac_hvac").map((g) => ({
    id: g.group as EpaRefrigerantUiGroupId,
    label: g.label,
    options: g.options,
  }));
}

export function getEquipmentGroupsForUseCase(useCase: EpaRefrigerantUseCase) {
  if (useCase === "ac_hvac") {
    return EPA_EQUIPMENT_TYPE_GROUPS.filter((g) => g.group === "ac_hvac");
  }
  return EPA_EQUIPMENT_TYPE_GROUPS.filter((g) => g.group !== "ac_hvac");
}

export function getDefaultRefrigerantForUseCase(useCase: EpaRefrigerantUseCase): string {
  if (useCase === "ac_hvac") return DEFAULT_AC_REFRIGERANT_TYPE;
  const firstOther = EPA_REFRIGERANT_TYPE_GROUPS.find((g) => g.group !== "ac_hvac")?.options[0];
  return firstOther || DEFAULT_AC_REFRIGERANT_TYPE;
}

export function getDefaultEquipmentForUseCase(
  useCase: EpaRefrigerantUseCase
): EpaRefrigerantEquipmentType | undefined {
  if (useCase === "ac_hvac") return DEFAULT_AC_EQUIPMENT_TYPE;
  return undefined;
}

export function getSuggestedLeakageRate(equipmentType?: EpaRefrigerantEquipmentType): number | undefined {
  if (!equipmentType) return undefined;
  return EPA_EQUIPMENT_LEAKAGE_ASSUMPTIONS.find((e) => e.id === equipmentType)?.suggestedRatePercent;
}

export function isGasAllowedForUseCase(refrigerantType: string, useCase: EpaRefrigerantUseCase): boolean {
  if (useCase === "ac_hvac") {
    return AC_UI_GROUPS.some((g) => g.options.includes(refrigerantType));
  }
  return getEpaRefrigerantGasGroup(refrigerantType) !== "ac_hvac";
}

export function isEquipmentAllowedForUseCase(
  equipmentType: string | undefined,
  useCase: EpaRefrigerantUseCase
): boolean {
  if (!equipmentType) return true;
  const equipment = EPA_EQUIPMENT_LEAKAGE_ASSUMPTIONS.find((e) => e.id === equipmentType);
  if (!equipment) return true;
  return useCase === "ac_hvac" ? equipment.group === "ac_hvac" : equipment.group !== "ac_hvac";
}

export function resolveRefrigerantGwp(refrigerantType: string, customGwp?: number): number | undefined {
  if (typeof customGwp === "number" && customGwp > 0) return customGwp;
  const hit = EPA_REFRIGERANT_GWP[refrigerantType];
  return typeof hit === "number" ? hit : undefined;
}

/** Plain-language label for dropdowns — no R-/HFC codes in the primary text. */
export function formatEpaRefrigerantLabel(refrigerantType: string): string {
  const gwp = EPA_REFRIGERANT_GWP[refrigerantType];
  const friendly =
    EPA_REFRIGERANT_FRIENDLY_NAMES[refrigerantType] ?? "Specialty cooling or F-gas";
  if (typeof gwp !== "number") return friendly;
  return `${friendly} (GWP ${gwp.toLocaleString()})`;
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

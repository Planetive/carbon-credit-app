import type { UopPcafOptionId, UopUnderlyingAssetClass } from "./types";

export type { UopPcafOptionId };

export type UopOptionField =
  | "energy"
  | "production"
  | "revenue"
  | "atr"
  | "sectorShare"
  | "floorArea"
  | "labelIntensity"
  | "statsIntensity"
  | "buildingCount"
  | "fuel"
  | "distance"
  | "efficiency"
  | "processEmissions"
  | "factor";

export type UopPcafOptionDef = {
  id: UopPcafOptionId;
  title: string;
  description: string;
  score: number;
  fields: UopOptionField[];
  method: "physical" | "economic";
  factorLabel: string;
  factorUnitHint: string;
};

const CORPORATE_OPTIONS: UopPcafOptionDef[] = [
  {
    id: "2a",
    title: "Option 2a — energy consumption",
    description: "Energy use × a published energy emission factor. Data quality score 2.",
    score: 2,
    fields: ["energy", "processEmissions", "factor"],
    method: "physical",
    factorLabel: "Published energy emission factor",
    factorUnitHint: "tCO2e per MWh or kWh",
  },
  {
    id: "2b",
    title: "Option 2b — production",
    description: "Physical production × a published production factor. Data quality score 3.",
    score: 3,
    fields: ["production", "factor"],
    method: "physical",
    factorLabel: "Published production emission factor",
    factorUnitHint: "tCO2e per tonne (or stated unit)",
  },
  {
    id: "3a",
    title: "Option 3a — revenue × sector intensity",
    description: "Company or project revenue × published sector GHG intensity. Data quality score 4.",
    score: 4,
    fields: ["revenue", "factor"],
    method: "economic",
    factorLabel: "Published sector intensity",
    factorUnitHint: "kgCO2e or tCO2e per currency of revenue",
  },
  {
    id: "3c",
    title: "Option 3c — outstanding × asset turnover × intensity",
    description: "Outstanding × published sector asset-turnover ratio × sector intensity. Data quality score 5.",
    score: 5,
    fields: ["atr", "factor"],
    method: "economic",
    factorLabel: "Published sector intensity",
    factorUnitHint: "kgCO2e or tCO2e per currency of revenue",
  },
  {
    id: "score5",
    title: "UoP score 5 — outstanding × sector share × intensity",
    description:
      "PCAF §5.7: Outstanding × sector allocation % × published sector factor. Only for listed equity/bonds, business loans/unlisted equity, and project finance.",
    score: 5,
    fields: ["sectorShare", "factor"],
    method: "economic",
    factorLabel: "Published sector factor",
    factorUnitHint: "tCO2e per currency of outstanding",
  },
];

const BUILDING_OPTIONS: UopPcafOptionDef[] = [
  {
    id: "1a",
    title: "Option 1a — actual energy, supplier-specific factor",
    description: "Metered building energy × a supplier-specific factor. Data quality score 1.",
    score: 1,
    fields: ["energy", "factor"],
    method: "physical",
    factorLabel: "Supplier-specific emission factor",
    factorUnitHint: "tCO2e per kWh",
  },
  {
    id: "1b",
    title: "Option 1b — actual energy, average grid factor",
    description: "Metered building energy × an average grid factor. Data quality score 2.",
    score: 2,
    fields: ["energy", "factor"],
    method: "physical",
    factorLabel: "Average grid emission factor",
    factorUnitHint: "tCO2e per kWh",
  },
  {
    id: "2a",
    title: "Option 2a — energy labels × floor area",
    description: "Label energy intensity × floor area financed × average grid factor. Data quality score 3.",
    score: 3,
    fields: ["labelIntensity", "floorArea", "factor"],
    method: "physical",
    factorLabel: "Average grid emission factor",
    factorUnitHint: "tCO2e per kWh",
  },
  {
    id: "2b",
    title: "Option 2b — statistical energy × floor area",
    description: "Statistical energy intensity × floor area × average factor. Data quality score 4.",
    score: 4,
    fields: ["statsIntensity", "floorArea", "factor"],
    method: "physical",
    factorLabel: "Average emission factor",
    factorUnitHint: "tCO2e per kWh",
  },
  {
    id: "3",
    title: "Option 3 — statistical energy × number of buildings",
    description: "Energy per building from statistics × building count × average factor. Data quality score 5.",
    score: 5,
    fields: ["statsIntensity", "buildingCount", "factor"],
    method: "physical",
    factorLabel: "Average emission factor",
    factorUnitHint: "tCO2e per kWh",
  },
];

const MOTOR_OPTIONS: UopPcafOptionDef[] = [
  {
    id: "1a",
    title: "Option 1a — actual fuel consumption",
    description: "Fuel used × a published fuel factor. Data quality score 1.",
    score: 1,
    fields: ["fuel", "factor"],
    method: "physical",
    factorLabel: "Published fuel emission factor",
    factorUnitHint: "tCO2e per litre (or stated fuel unit)",
  },
  {
    id: "1b",
    title: "Option 1b — actual distance × make/model efficiency",
    description: "Measured distance × make/model efficiency × published fuel factor. Data quality score 1.",
    score: 1,
    fields: ["distance", "efficiency", "factor"],
    method: "physical",
    factorLabel: "Published fuel emission factor",
    factorUnitHint: "tCO2e per litre",
  },
  {
    id: "2a",
    title: "Option 2a — local distance statistics × efficiency",
    description: "Local distance statistics × make/model efficiency × published fuel factor. Data quality score 2.",
    score: 2,
    fields: ["distance", "efficiency", "factor"],
    method: "physical",
    factorLabel: "Published fuel emission factor",
    factorUnitHint: "tCO2e per litre",
  },
  {
    id: "2b",
    title: "Option 2b — regional distance statistics × efficiency",
    description: "Regional distance statistics × efficiency × published fuel factor. Data quality score 3.",
    score: 3,
    fields: ["distance", "efficiency", "factor"],
    method: "physical",
    factorLabel: "Published fuel emission factor",
    factorUnitHint: "tCO2e per litre",
  },
  {
    id: "3a",
    title: "Option 3a — vehicle-type statistics",
    description: "Statistical distance × vehicle-type efficiency × published factor. Data quality score 4.",
    score: 4,
    fields: ["distance", "efficiency", "factor"],
    method: "physical",
    factorLabel: "Published fuel emission factor",
    factorUnitHint: "tCO2e per litre",
  },
  {
    id: "3b",
    title: "Option 3b — average vehicle efficiency",
    description: "Distance from vehicle-use stats × average efficiency × published factor. Data quality score 5.",
    score: 5,
    fields: ["distance", "efficiency", "factor"],
    method: "physical",
    factorLabel: "Published fuel emission factor",
    factorUnitHint: "tCO2e per litre",
  },
];

const CORPORATE_CLASSES = new Set<UopUnderlyingAssetClass>([
  "listed-equity",
  "corporate-bond",
  "business-loan",
  "unlisted-equity",
  "project-finance",
]);
const BUILDING_CLASSES = new Set<UopUnderlyingAssetClass>(["mortgage", "commercial-real-estate"]);
const MOTOR_CLASSES = new Set<UopUnderlyingAssetClass>(["motor-vehicle-loan"]);

export function optionsForAssetClass(assetClass: UopUnderlyingAssetClass | ""): UopPcafOptionDef[] {
  if (CORPORATE_CLASSES.has(assetClass as UopUnderlyingAssetClass)) return CORPORATE_OPTIONS;
  if (BUILDING_CLASSES.has(assetClass as UopUnderlyingAssetClass)) return BUILDING_OPTIONS;
  if (MOTOR_CLASSES.has(assetClass as UopUnderlyingAssetClass)) return MOTOR_OPTIONS;
  return [];
}

export function optionDef(
  assetClass: UopUnderlyingAssetClass | "",
  optionId: string
): UopPcafOptionDef | undefined {
  return optionsForAssetClass(assetClass).find((item) => item.id === optionId);
}

export function optionNeedsDenominator(optionId: string): boolean {
  return optionId !== "3c" && optionId !== "score5";
}

export function isUnsupportedUopAssetClass(assetClass: UopUnderlyingAssetClass | ""): boolean {
  return assetClass === "sovereign-debt" || assetClass === "use-of-proceeds";
}

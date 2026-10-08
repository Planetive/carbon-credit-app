/** Activity-based Scope 1 groups (user-facing, not methodology names). */

export type Scope1ActivityGroupId =
  | "stationary"
  | "vehicles_mobile"
  | "leaks_releases"
  | "industrial_other";

/** Source screening status — missing support must not look like zero. */
export type SourceApplicability =
  | "not_assessed"
  | "not_applicable"
  | "applicable_pending"
  | "calculated";

export type Scope1ScreeningState = Record<Scope1ActivityGroupId, SourceApplicability>;

export const DEFAULT_SCOPE1_SCREENING: Scope1ScreeningState = {
  stationary: "not_assessed",
  vehicles_mobile: "not_assessed",
  leaks_releases: "not_assessed",
  industrial_other: "not_assessed",
};

export const SCOPE1_ACTIVITY_GROUPS: {
  id: Scope1ActivityGroupId;
  title: string;
  description: string;
  screeningQuestion: string;
}[] = [
  {
    id: "stationary",
    title: "Stationary Combustion",
    description:
      "Fuel burned in generators, boilers, heaters, furnaces, and cooking equipment.",
    screeningQuestion:
      "Do you burn fuel on site (generators, boilers, heaters, furnaces, kitchens)?",
  },
  {
    id: "vehicles_mobile",
    title: "Vehicles and Mobile Equipment",
    description: "Fuel burned in company vehicles and mobile equipment.",
    screeningQuestion:
      "Do you operate company vehicles or mobile equipment that burn fuel?",
  },
  {
    id: "leaks_releases",
    title: "Leaks and Gas Releases",
    description:
      "Greenhouse gases released from cooling equipment and other gas-containing systems.",
    screeningQuestion:
      "Do you have cooling, refrigeration, fire-suppression, or other gas-containing systems that may leak?",
  },
  {
    id: "industrial_other",
    title: "Industrial and Other Direct Emissions",
    description:
      "Flaring, venting, process emissions, and other direct sources not covered above.",
    screeningQuestion:
      "Do you have flaring, venting, process emissions, or other industrial direct releases?",
  },
];

export type StationaryEquipmentType =
  | "generator"
  | "boiler"
  | "heater"
  | "furnace"
  | "cooking"
  | "other_stationary";

export const STATIONARY_EQUIPMENT_OPTIONS: {
  id: StationaryEquipmentType;
  label: string;
}[] = [
  { id: "generator", label: "Generator / power equipment" },
  { id: "boiler", label: "Boiler" },
  { id: "heater", label: "Heater" },
  { id: "furnace", label: "Furnace" },
  { id: "cooking", label: "Cooking / kitchen equipment" },
  { id: "other_stationary", label: "Other stationary equipment" },
];

/** Road classification is from equipment type, not from which data the user has. */
export type MobileRoadClass = "on_road" | "non_road";

export type MobileEquipmentKind =
  | "passenger_car"
  | "light_truck"
  | "heavy_duty_truck"
  | "bus"
  | "motorcycle"
  | "agricultural"
  | "construction"
  | "industrial_nonroad"
  | "lawn_garden"
  | "other_mobile";

export const MOBILE_EQUIPMENT_OPTIONS: {
  id: MobileEquipmentKind;
  label: string;
  roadClass: MobileRoadClass;
  /** Preferred EPA distance factor sheet when miles are used. */
  distanceSheet: "On-Road Gasoline" | "On-Road Diesel & Alt Fuel" | "Non-Road Vehicle" | null;
}[] = [
  { id: "passenger_car", label: "Passenger car", roadClass: "on_road", distanceSheet: "On-Road Gasoline" },
  { id: "light_truck", label: "Light-duty truck / SUV / van", roadClass: "on_road", distanceSheet: "On-Road Gasoline" },
  { id: "heavy_duty_truck", label: "Heavy-duty truck", roadClass: "on_road", distanceSheet: "On-Road Diesel & Alt Fuel" },
  { id: "bus", label: "Bus", roadClass: "on_road", distanceSheet: "On-Road Diesel & Alt Fuel" },
  { id: "motorcycle", label: "Motorcycle", roadClass: "on_road", distanceSheet: "On-Road Gasoline" },
  { id: "agricultural", label: "Agricultural equipment", roadClass: "non_road", distanceSheet: "Non-Road Vehicle" },
  { id: "construction", label: "Construction equipment", roadClass: "non_road", distanceSheet: "Non-Road Vehicle" },
  { id: "industrial_nonroad", label: "Industrial non-road equipment", roadClass: "non_road", distanceSheet: "Non-Road Vehicle" },
  { id: "lawn_garden", label: "Lawn & garden equipment", roadClass: "non_road", distanceSheet: "Non-Road Vehicle" },
  { id: "other_mobile", label: "Other mobile equipment", roadClass: "non_road", distanceSheet: "Non-Road Vehicle" },
];

export type MobileDataAvailable = "fuel" | "distance" | "both";

export type GasCoverage =
  | "co2_only"
  | "ch4_only"
  | "n2o_only"
  | "ch4_and_n2o"
  | "co2e_combined"
  | "co2_ch4_n2o_assembled"
  | "partial_gases";

export type CalcCompleteness =
  | "complete_co2e"
  | "partial_gases"
  | "estimated"
  | "blocked_missing_data"
  | "pending_method";

export type FactorProvenance = {
  sourceName: string;
  sourceVersion?: string;
  gwpBasis?: string;
  methodVersion: string;
  measuredOrEstimated: "measured" | "estimated" | "mixed" | "unknown";
  /** True when an approved default was used with disclosure. */
  usedApprovedDefault?: boolean;
  defaultDisclosure?: string;
};

export type GasBreakdown = {
  co2Kg?: number;
  ch4Kg?: number;
  n2oKg?: number;
  /** Only when factor is already combined CO2e — do not also add gas components. */
  co2eCombinedKg?: number;
  totalCo2eKg: number;
  coverage: GasCoverage;
  completeness: CalcCompleteness;
  missing?: string[];
  notes?: string[];
};

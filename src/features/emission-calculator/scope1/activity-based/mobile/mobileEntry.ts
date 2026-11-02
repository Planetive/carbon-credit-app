/**
 * Input rules for the EPA mobile form.
 * Emission numbers come only from the backend response.
 */

import type { EmissionActivity } from "@/api/ghg";
import type { MobileCalcResponse, MobileSaveBody } from "@/api/calc";
import { selectDraftAssessment } from "@/features/emission-calculator/results/reportingYear";
import {
  yearMatchesChoice,
  type MobileDistanceUnit,
  type MobileFactorCatalog,
  type MobileFuelUnit,
  type MobileRoadClass,
} from "./mobileFactorCatalog";

export type MobileEntryState = {
  roadClass: MobileRoadClass;
  vehicle: string;
  fuel: string;
  fuelQuantity: string;
  fuelUnit: string;
  distance: string;
  distanceUnit: MobileDistanceUnit;
  modelYear: string;
  activityId: string | null;
  result: MobileCalcResponse | null;
  verifiedKey: string | null;
  error: string | null;
};

export function blankMobileEntry(): MobileEntryState {
  return {
    roadClass: "on_road",
    vehicle: "",
    fuel: "",
    fuelQuantity: "",
    fuelUnit: "",
    distance: "",
    distanceUnit: "mile",
    modelYear: "",
    activityId: null,
    result: null,
    verifiedKey: null,
    error: null,
  };
}

export function validReportingMonth(period: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(period.trim());
}

function quantityOk(value: string): boolean {
  if (!value.trim()) return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0;
}

export function mobileInputKey(state: MobileEntryState): string {
  return [
    state.roadClass,
    state.vehicle.trim(),
    state.fuel.trim(),
    state.fuelQuantity.trim(),
    state.fuelUnit.trim(),
    state.roadClass === "on_road" ? state.distance.trim() : "",
    state.roadClass === "on_road" ? state.distanceUnit : "",
    state.modelYear.trim(),
  ].join("\u0000");
}

export function mobileEntryBlocker(
  state: MobileEntryState,
  catalog: MobileFactorCatalog | null,
  period: string
): string | null {
  if (!catalog) return "Factor tables are not loaded.";
  if (!state.vehicle.trim() || !state.fuel.trim()) return "Select a vehicle and fuel from the factor tables.";
  const choice = catalog.choiceFor(state.roadClass, state.vehicle, state.fuel);
  if (!choice) return "This vehicle, fuel, and road class combination is not in the factor tables.";
  if (!choice.units.includes(state.fuelUnit as MobileFuelUnit)) {
    return `This fuel uses ${choice.factorUnit}. Choose one of: ${choice.units.join(", ")}.`;
  }
  if (!quantityOk(state.fuelQuantity)) return "Enter a fuel quantity.";
  if (state.roadClass === "on_road") {
    if (!quantityOk(state.distance)) return "On-road methane and nitrous oxide need a distance.";
    if (state.distanceUnit !== "mile" && state.distanceUnit !== "km") return "Distance must be in miles or km.";
  }
  const yearError = yearMatchesChoice(state.modelYear, choice);
  if (yearError) return yearError;
  if (!validReportingMonth(period)) return "Enter a reporting month (YYYY-MM).";
  return null;
}

export function canCalculate(state: MobileEntryState, catalog: MobileFactorCatalog | null, period: string): boolean {
  return mobileEntryBlocker(state, catalog, period) == null;
}

export function canSave(state: MobileEntryState, catalog: MobileFactorCatalog | null, period: string): boolean {
  return (
    Boolean(state.result?.success) &&
    state.verifiedKey === mobileInputKey(state) &&
    canCalculate(state, catalog, period)
  );
}

export function saveUsesUpdate(state: MobileEntryState): boolean {
  return Boolean(state.activityId);
}

export function changeMobileInputs(
  state: MobileEntryState,
  patch: Partial<
    Pick<
      MobileEntryState,
      "roadClass" | "vehicle" | "fuel" | "fuelQuantity" | "fuelUnit" | "distance" | "distanceUnit" | "modelYear"
    >
  >
): MobileEntryState {
  const next: MobileEntryState = { ...state, ...patch, error: null };
  if (patch.roadClass != null && patch.roadClass !== state.roadClass) {
    next.vehicle = patch.vehicle ?? "";
    next.fuel = patch.fuel ?? "";
    next.fuelUnit = patch.fuelUnit ?? "";
    next.modelYear = patch.modelYear ?? "";
    if (patch.roadClass === "non_road") {
      next.distance = "";
    }
  } else if (patch.vehicle != null && patch.vehicle !== state.vehicle) {
    next.fuel = patch.fuel ?? "";
    next.fuelUnit = patch.fuelUnit ?? "";
    next.modelYear = patch.modelYear ?? "";
  } else if (patch.fuel != null && patch.fuel !== state.fuel) {
    next.fuelUnit = patch.fuelUnit ?? "";
    next.modelYear = patch.modelYear ?? "";
  }
  if (next.verifiedKey !== mobileInputKey(next)) {
    next.result = null;
    next.verifiedKey = null;
  }
  return next;
}

export function applyCalcSuccess(state: MobileEntryState, result: MobileCalcResponse): MobileEntryState {
  if (!result?.success) return applyCalcFailure(state, result?.error || "The calculation did not succeed.");
  return { ...state, result, verifiedKey: mobileInputKey(state), error: null };
}

export function applyCalcFailure(state: MobileEntryState, message: string): MobileEntryState {
  return { ...state, result: null, verifiedKey: null, error: message };
}

export function applySaveFailure(state: MobileEntryState, message: string): MobileEntryState {
  return { ...state, error: message };
}

export function applySaveSuccess(state: MobileEntryState, response: { activity_id: string; calculation: MobileCalcResponse }): MobileEntryState {
  return {
    ...state,
    activityId: response.activity_id,
    result: response.calculation,
    verifiedKey: mobileInputKey(state),
    error: null,
  };
}

export function buildMobileSaveBody(input: {
  state: MobileEntryState;
  assessmentId: string;
  period: string;
  equipmentId?: string;
  site?: string;
  counterpartyId?: string;
}): MobileSaveBody {
  const { state } = input;
  return {
    road_class: state.roadClass,
    vehicle_type: state.vehicle.trim(),
    fuel_type: state.fuel.trim(),
    fuel_quantity: state.fuelQuantity.trim(),
    fuel_unit: state.fuelUnit.trim(),
    distance: state.roadClass === "on_road" ? state.distance.trim() : null,
    distance_unit: state.roadClass === "on_road" ? state.distanceUnit : null,
    model_year: state.modelYear.trim() ? Number(state.modelYear.trim()) : null,
    gwp_version: "AR5",
    assessment_id: input.assessmentId,
    period: input.period.trim(),
    equipment_id: input.equipmentId?.trim() || null,
    site: input.site?.trim() || null,
    counterparty_id: input.counterpartyId || null,
  };
}

export function draftAssessmentForMobilePeriod<
  T extends { framework: string; status: string; reporting_period?: string | null }
>(rows: T[], period: string): T | null {
  if (!validReportingMonth(period)) return null;
  return selectDraftAssessment(rows, "epa", period);
}

function rawRecord(activity: EmissionActivity): Record<string, unknown> {
  return activity.raw && typeof activity.raw === "object" ? activity.raw : {};
}

export function isEditableMobileActivity(activity: EmissionActivity, organizationId?: string | null): boolean {
  if (!organizationId) return false;
  return (
    activity.organization_id === organizationId &&
    activity.method === "epa_mobile_v1" &&
    activity.legacy_source === "epa_mobile_v1" &&
    activity.category === "mobile_combustion"
  );
}

export type MobileActivityContext = {
  site: string;
  equipmentId: string;
  period: string;
};

export function stateFromMobileActivity(activity: EmissionActivity): {
  entry: MobileEntryState;
  context: MobileActivityContext;
} {
  const raw = rawRecord(activity);
  const inputs = (raw.inputs || {}) as Record<string, unknown>;
  const meta = (raw.activity_meta || {}) as Record<string, unknown>;
  const road = inputs.road_class === "non_road" ? "non_road" : "on_road";
  return {
    entry: {
      roadClass: road,
      vehicle: String(inputs.vehicle_type || meta.vehicle_type || ""),
      fuel: String(inputs.fuel || ""),
      fuelQuantity: String(inputs.fuel_quantity || activity.quantity || ""),
      fuelUnit: String(inputs.fuel_unit || activity.unit || ""),
      distance: inputs.distance == null ? "" : String(inputs.distance),
      distanceUnit: inputs.distance_unit === "km" ? "km" : "mile",
      modelYear: inputs.model_year == null ? "" : String(inputs.model_year),
      activityId: activity.id,
      result: null,
      verifiedKey: null,
      error: null,
    },
    context: {
      site: String(meta.site || ""),
      equipmentId: String(meta.equipment_id || meta.source_id || ""),
      period: String(meta.period || ""),
    },
  };
}

export function biogenicTonnes(result: MobileCalcResponse | null): string | null {
  const value = result?.biogenic_co2_t;
  return typeof value === "string" ? value : null;
}

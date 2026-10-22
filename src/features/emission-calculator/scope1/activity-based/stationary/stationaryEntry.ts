/**
 * Input and result rules for the stationary combustion form.
 * Emissions numbers come only from the backend response.
 */

import type { StationaryCalcResponse, StationarySaveBody, StationarySaveResponse } from "@/api/calc";
import type { EmissionActivity } from "@/api/ghg";

export const PHYSICAL_UNITS = ["mmBtu", "MMSCF", "gallon", "short ton"] as const;
export type PhysicalUnit = (typeof PHYSICAL_UNITS)[number];

const UNIT_MARKERS: { unit: PhysicalUnit; marker: string }[] = [
  { unit: "mmBtu", marker: "/ mmBtu" },
  { unit: "MMSCF", marker: "/ MMSCF" },
  { unit: "gallon", marker: "/ gallon" },
  { unit: "short ton", marker: "/ short ton" },
];

export type StationaryEntryState = {
  category: string;
  fuel: string;
  unit: string;
  quantity: string;
  activityId: string | null;
  result: StationaryCalcResponse | null;
  verifiedKey: string | null;
  error: string | null;
};

export function blankStationaryEntry(): StationaryEntryState {
  return {
    category: "",
    fuel: "",
    unit: "",
    quantity: "",
    activityId: null,
    result: null,
    verifiedKey: null,
    error: null,
  };
}

export function stationaryInputKey(state: Pick<StationaryEntryState, "category" | "fuel" | "unit" | "quantity">): string {
  return [state.category.trim(), state.fuel.trim(), state.unit.trim(), state.quantity.trim()].join("\u0000");
}

export function physicalUnitsForFuel(unitFactors: Record<string, number> | undefined): PhysicalUnit[] {
  if (!unitFactors) return [];
  const keys = Object.keys(unitFactors);
  return UNIT_MARKERS.filter((item) => keys.some((key) => key.includes(item.marker))).map(
    (item) => item.unit
  );
}

export function quantityIsValid(quantity: string): boolean {
  if (!quantity.trim()) return false;
  const value = Number(quantity);
  return Number.isFinite(value) && value >= 0;
}

export function canCalculate(state: StationaryEntryState): boolean {
  return Boolean(state.category.trim() && state.fuel.trim() && state.unit.trim() && quantityIsValid(state.quantity));
}

export function canSave(state: StationaryEntryState): boolean {
  return Boolean(state.result?.success) && state.verifiedKey === stationaryInputKey(state);
}

export function saveUsesUpdate(state: StationaryEntryState): boolean {
  return Boolean(state.activityId);
}

export function changeStationaryInputs(
  state: StationaryEntryState,
  patch: Partial<Pick<StationaryEntryState, "category" | "fuel" | "unit" | "quantity">>
): StationaryEntryState {
  const next: StationaryEntryState = { ...state, ...patch, error: null };
  if (patch.category != null && patch.category !== state.category) {
    next.fuel = patch.fuel ?? "";
    next.unit = patch.unit ?? "";
  } else if (patch.fuel != null && patch.fuel !== state.fuel) {
    next.unit = patch.unit ?? "";
  }
  if (next.verifiedKey !== stationaryInputKey(next)) {
    next.result = null;
    next.verifiedKey = null;
  }
  return next;
}

export function applyCalcSuccess(
  state: StationaryEntryState,
  result: StationaryCalcResponse
): StationaryEntryState {
  if (!result?.success) {
    return applyCalcFailure(state, result?.error || "The calculation did not succeed.");
  }
  return {
    ...state,
    result,
    verifiedKey: stationaryInputKey(state),
    error: null,
  };
}

export function applyCalcFailure(state: StationaryEntryState, message: string): StationaryEntryState {
  return {
    ...state,
    result: null,
    verifiedKey: null,
    error: message,
  };
}

export function applySaveFailure(state: StationaryEntryState, message: string): StationaryEntryState {
  return { ...state, error: message };
}

export function applySaveSuccess(
  state: StationaryEntryState,
  response: StationarySaveResponse
): StationaryEntryState {
  const result = response.calculation;
  return {
    ...state,
    activityId: response.activity_id,
    result,
    verifiedKey: stationaryInputKey(state),
    error: null,
  };
}

export function buildStationarySaveBody(input: {
  state: StationaryEntryState;
  assessmentId: string;
  equipmentType: string;
  site?: string;
  equipmentId?: string;
  period: string;
  counterpartyId?: string;
}): StationarySaveBody {
  const { state } = input;
  return {
    fuel: state.fuel.trim(),
    category: state.category.trim(),
    quantity: state.quantity.trim(),
    unit: state.unit.trim(),
    assessment_id: input.assessmentId,
    equipment_type: input.equipmentType,
    gwp_version: "AR5",
    counterparty_id: input.counterpartyId || null,
    site: input.site?.trim() || null,
    equipment_id: input.equipmentId?.trim() || null,
    period: input.period,
  };
}

function rawRecord(activity: EmissionActivity): Record<string, unknown> {
  return activity.raw && typeof activity.raw === "object" ? activity.raw : {};
}

export function isEpaStationaryActivity(activity: EmissionActivity): boolean {
  return activity.legacy_source === "epa_stationary" && activity.method === "epa_stationary";
}

export type StationaryActivityContext = {
  equipmentType: string;
  site: string;
  equipmentId: string;
  period: string;
};

export function activityContextFromStationaryActivity(
  activity: EmissionActivity
): StationaryActivityContext {
  const raw = rawRecord(activity);
  const meta = (raw.activity_meta || {}) as Record<string, unknown>;
  return {
    equipmentType: String(meta.equipment_type || ""),
    site: String(meta.site || ""),
    equipmentId: String(meta.equipment_id || meta.source_id || ""),
    period: String(meta.period || ""),
  };
}

export function stateFromStationaryActivity(activity: EmissionActivity): StationaryEntryState {
  const raw = rawRecord(activity);
  const inputs = (raw.inputs || {}) as Record<string, unknown>;
  return {
    category: String(inputs.fuel_category || ""),
    fuel: String(inputs.fuel || ""),
    unit: String(inputs.unit || activity.unit || ""),
    quantity: String(inputs.quantity || activity.quantity || ""),
    activityId: activity.id,
    result: null,
    verifiedKey: null,
    error: null,
  };
}

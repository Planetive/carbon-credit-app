/**
 * Form rules for EPA refrigerant leakage.
 * Emission numbers come only from the backend response.
 */

import type { EmissionActivity } from "@/api/ghg";
import type {
  RefrigerantCalcBody,
  RefrigerantCalcResponse,
  RefrigerantLeakageMethod,
  RefrigerantSaveBody,
  RefrigerantSaveResponse,
} from "@/api/calc";
import { selectDraftAssessment } from "@/features/emission-calculator/results/reportingYear";
import { canonicalRefrigerant, isSupportedRefrigerant } from "./refrigerantCatalog";

export type RefrigerantEntryState = {
  method: RefrigerantLeakageMethod;
  gas: string;
  leakageKg: string;
  chargeKg: string;
  leakageRatePercent: string;
  equipmentType: string;
  activityId: string | null;
  result: RefrigerantCalcResponse | null;
  verifiedKey: string | null;
  error: string | null;
};

export function blankRefrigerantEntry(): RefrigerantEntryState {
  return {
    method: "leakage_record",
    gas: "",
    leakageKg: "",
    chargeKg: "",
    leakageRatePercent: "",
    equipmentType: "",
    activityId: null,
    result: null,
    verifiedKey: null,
    error: null,
  };
}

export function validReportingMonth(period: string): boolean {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(period.trim());
  if (!match) return false;
  const year = Number(match[1]);
  return year >= 1990 && year <= 2200;
}

function quantityOk(value: string): boolean {
  if (!value.trim()) return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0;
}

function rateOk(value: string): boolean {
  if (!value.trim()) return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100;
}

export function refrigerantInputKey(state: RefrigerantEntryState): string {
  return [
    state.method,
    canonicalRefrigerant(state.gas) || state.gas.trim(),
    state.method === "leakage_record" ? state.leakageKg.trim() : "",
    state.method === "estimated_leakage" ? state.chargeKg.trim() : "",
    state.method === "estimated_leakage" ? state.leakageRatePercent.trim() : "",
    state.equipmentType.trim(),
  ].join("\u0000");
}

export function refrigerantEntryBlocker(state: RefrigerantEntryState, period: string): string | null {
  if (!state.gas.trim()) return "Select a refrigerant.";
  if (!isSupportedRefrigerant(state.gas)) {
    return `${state.gas.trim()} is not available in this refrigerant-leakage calculator.`;
  }
  if (state.method === "leakage_record") {
    if (!quantityOk(state.leakageKg)) return "Enter the measured leaked quantity in kilograms.";
  } else {
    if (!quantityOk(state.chargeKg)) return "Enter the equipment charge in kilograms.";
    if (!state.leakageRatePercent.trim()) {
      return "Enter the leakage rate you are assuming. A blank rate is not treated as zero.";
    }
    if (!rateOk(state.leakageRatePercent)) return "The leakage rate must be from 0 through 100 percent.";
  }
  if (!validReportingMonth(period)) return "Enter a reporting month (YYYY-MM).";
  return null;
}

export function canCalculate(state: RefrigerantEntryState, period: string): boolean {
  return refrigerantEntryBlocker(state, period) == null;
}

export function canSave(state: RefrigerantEntryState, period: string): boolean {
  return (
    Boolean(state.result?.success) &&
    state.result?.emissions_tco2e != null &&
    state.result.emissions_tco2e !== "" &&
    state.verifiedKey === refrigerantInputKey(state) &&
    canCalculate(state, period)
  );
}

export function saveUsesUpdate(state: RefrigerantEntryState): boolean {
  return Boolean(state.activityId);
}

export function claimSave(lock: { current: boolean }): boolean {
  if (lock.current) return false;
  lock.current = true;
  return true;
}

export function releaseSave(lock: { current: boolean }): void {
  lock.current = false;
}

export function changeRefrigerantInputs(
  state: RefrigerantEntryState,
  patch: Partial<
    Pick<
      RefrigerantEntryState,
      "method" | "gas" | "leakageKg" | "chargeKg" | "leakageRatePercent" | "equipmentType"
    >
  >
): RefrigerantEntryState {
  const next: RefrigerantEntryState = { ...state, ...patch, error: null };
  if (patch.method === "leakage_record" && state.method !== "leakage_record") {
    next.chargeKg = "";
    next.leakageRatePercent = "";
  }
  if (patch.method === "estimated_leakage" && state.method !== "estimated_leakage") {
    next.leakageKg = "";
  }
  if (next.verifiedKey !== refrigerantInputKey(next)) {
    next.result = null;
    next.verifiedKey = null;
  }
  return next;
}

export function applyCalcSuccess(
  state: RefrigerantEntryState,
  result: RefrigerantCalcResponse
): RefrigerantEntryState {
  if (!result?.success || result.emissions_tco2e == null || result.emissions_tco2e === "") {
    return applyCalcFailure(state, result?.error || "The calculation did not succeed.");
  }
  return { ...state, result, verifiedKey: refrigerantInputKey(state), error: null };
}

export function applyCalcFailure(state: RefrigerantEntryState, message: string): RefrigerantEntryState {
  return { ...state, result: null, verifiedKey: null, error: message };
}

export function applySaveFailure(state: RefrigerantEntryState, message: string): RefrigerantEntryState {
  return { ...state, error: message };
}

export function applySaveSuccess(
  state: RefrigerantEntryState,
  response: Pick<RefrigerantSaveResponse, "activity_id" | "calculation">
): RefrigerantEntryState {
  return {
    ...state,
    activityId: response.activity_id,
    result: response.calculation,
    verifiedKey: refrigerantInputKey(state),
    error: null,
  };
}

export function verifiedTonnesText(result: RefrigerantCalcResponse | null): string | null {
  if (!result?.success || result.emissions_tco2e == null || result.emissions_tco2e === "") return null;
  return result.emissions_tco2e;
}

export function buildRefrigerantCalcBody(state: RefrigerantEntryState): RefrigerantCalcBody {
  const gas = canonicalRefrigerant(state.gas) || state.gas.trim();
  const equipment = state.equipmentType.trim() || null;
  if (state.method === "leakage_record") {
    return {
      method: "leakage_record",
      gas,
      leakage_kg: state.leakageKg.trim(),
      equipment_type: equipment,
    };
  }
  return {
    method: "estimated_leakage",
    gas,
    charge_kg: state.chargeKg.trim(),
    leakage_rate_percent: state.leakageRatePercent.trim(),
    equipment_type: equipment,
  };
}

export function buildRefrigerantSaveBody(input: {
  state: RefrigerantEntryState;
  assessmentId: string;
  period: string;
  equipmentId?: string;
  site?: string;
  counterpartyId?: string;
}): RefrigerantSaveBody {
  return {
    ...buildRefrigerantCalcBody(input.state),
    assessment_id: input.assessmentId,
    period: input.period.trim(),
    equipment_id: input.equipmentId?.trim() || null,
    site: input.site?.trim() || null,
    counterparty_id: input.counterpartyId || null,
  };
}

export function draftAssessmentForRefrigerantPeriod<
  T extends { framework: string; status: string; reporting_period?: string | null }
>(rows: T[], period: string): T | null {
  if (!validReportingMonth(period)) return null;
  return selectDraftAssessment(rows, "epa", period);
}

function rawRecord(activity: EmissionActivity): Record<string, unknown> {
  return activity.raw && typeof activity.raw === "object" ? activity.raw : {};
}

export function isEditableRefrigerantActivity(
  activity: EmissionActivity,
  organizationId?: string | null
): boolean {
  if (!organizationId) return false;
  return (
    activity.organization_id === organizationId &&
    activity.method === "epa_refrigerant_v1" &&
    activity.legacy_source === "epa_refrigerant_v1" &&
    activity.category === "refrigerant_leakage"
  );
}

export function matchesSelectedCounterparty(
  activity: Pick<EmissionActivity, "counterparty_id">,
  counterpartyId?: string | null
): boolean {
  if (!counterpartyId) return !activity.counterparty_id;
  return activity.counterparty_id === counterpartyId;
}

export type RefrigerantActivityContext = {
  site: string;
  equipmentId: string;
  period: string;
};

export function stateFromRefrigerantActivity(activity: EmissionActivity): {
  entry: RefrigerantEntryState;
  context: RefrigerantActivityContext;
} {
  const raw = rawRecord(activity);
  const inputs = (raw.inputs || {}) as Record<string, unknown>;
  const meta = (raw.activity_meta || {}) as Record<string, unknown>;
  const method: RefrigerantLeakageMethod =
    inputs.method === "estimated_leakage" ? "estimated_leakage" : "leakage_record";
  const storedGas = String(inputs.refrigerant || "");
  return {
    entry: {
      method,
      gas: canonicalRefrigerant(storedGas) || storedGas,
      leakageKg: method === "leakage_record" ? String(inputs.leakage_kg ?? activity.quantity ?? "") : "",
      chargeKg: inputs.charge_kg == null ? "" : String(inputs.charge_kg),
      leakageRatePercent: inputs.leakage_rate_percent == null ? "" : String(inputs.leakage_rate_percent),
      equipmentType: String(meta.equipment_type || ""),
      activityId: activity.id,
      result: null,
      verifiedKey: null,
      error: null,
    },
    context: {
      site: String(meta.site || ""),
      equipmentId: String(meta.equipment_id || ""),
      period: String(meta.period || ""),
    },
  };
}

export type LegacyRefrigerantKind = "epa" | "uk_epa";

export function legacyRefrigerantKind(row: { emission_framework?: unknown }): LegacyRefrigerantKind | null {
  const framework = String(row.emission_framework || "").trim().toLowerCase();
  if (framework === "epa") return "epa";
  if (framework === "uk_epa") return "uk_epa";
  return null;
}

export function legacyRefrigerantLabel(kind: LegacyRefrigerantKind): string {
  if (kind === "uk_epa") return "UK-EPA refrigerant record — read only";
  return "Legacy EPA refrigerant — read only, excluded from this calculator";
}

/**
 * Read verified EPA mobile combustion records for reporting.
 * emissions_tco2e is Scope 1 metric tonnes. Biogenic CO2 stays outside that total.
 */

import type { EmissionActivity } from "@/api/ghg";
import { listEmissionActivities, listEmissionAssessments } from "@/api/ghg";
import {
  scaledTonnesToKg,
  scaledTonnesToNumber,
  selectEpaAssessmentIds,
  summarizeBiogenicCo2,
  tonnesToScaled,
  type StationaryGasView,
  type StationaryReadContext,
} from "./stationaryResults";
import { reportingYearFromPeriod } from "./reportingYear";

export type MobileResultActivity = {
  id: string;
  assessmentId: string;
  organizationId: string;
  userId: string;
  counterpartyId: string | null;
  roadClass: string;
  vehicleType: string;
  fuel: string;
  fuelQuantity: string;
  fuelUnit: string;
  distance: string;
  distanceUnit: string;
  modelYear: string;
  equipmentId: string;
  site: string;
  period: string;
  co2: StationaryGasView;
  ch4: StationaryGasView;
  n2o: StationaryGasView;
  totalKgCo2e: string;
  totalTco2e: string;
  biogenicCo2Tonnes?: string | null;
  accountingTreatment?: string;
  accountingVersion?: string;
  methodology?: string;
  gwpVersion: string;
  factorSource: string;
  factorVersion: string;
};

export type MobileVerifiedResults = {
  status: "ready" | "empty" | "unavailable";
  error: string | null;
  totalTco2e: number;
  totalKgCo2e: number;
  biogenicCo2Tonnes?: number | null;
  biogenicStatus?: "recorded" | "partial" | "not_recorded";
  activities: MobileResultActivity[];
  unassignedCount?: number;
  unassignedTco2e?: number;
  otherYearCount?: number;
  /** Rows that failed the accounting, gas, or factor checks. They are not in the total. */
  rejectedCount?: number;
};

export function emptyMobileVerified(): MobileVerifiedResults {
  return {
    status: "empty",
    error: null,
    totalTco2e: 0,
    totalKgCo2e: 0,
    biogenicCo2Tonnes: 0,
    biogenicStatus: "recorded",
    activities: [],
    unassignedCount: 0,
    unassignedTco2e: 0,
    otherYearCount: 0,
    rejectedCount: 0,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

function gasView(raw: Record<string, unknown>, key: "co2" | "ch4" | "n2o"): StationaryGasView {
  const gas = asRecord(asRecord(raw.gases)[key]);
  return {
    massKg: text(gas.mass_kg),
    gwp: text(gas.gwp),
    co2eKg: text(gas.co2e_kg),
  };
}

function factorLabel(raw: Record<string, unknown>): { label: string; version: string; gwp: string } {
  const factors = asRecord(raw.factors);
  const co2 = asRecord(factors.co2);
  const ch4 = asRecord(factors.ch4);
  const accounting = asRecord(raw.accounting);
  const source = asRecord(raw.factor_source);
  const datasets = [text(co2.dataset_code), text(ch4.dataset_code)].filter(Boolean).join(" + ");
  const rows = [text(co2.factor_row_id), text(ch4.factor_row_id)].filter(Boolean).join(", ");
  const label = [text(co2.publisher) || "EPA", datasets, rows ? `rows ${rows}` : "", text(co2.version_label)]
    .filter(Boolean)
    .join(" · ");
  return {
    label,
    version: text(co2.version_label),
    gwp: text(accounting.gwp_version) || text(source.gwp_version),
  };
}

export function isEpaMobileActivity(
  activity: Pick<EmissionActivity, "legacy_source" | "method" | "scope" | "category">
): boolean {
  return (
    activity.legacy_source === "epa_mobile_v1" &&
    activity.method === "epa_mobile_v1" &&
    Number(activity.scope) === 1 &&
    activity.category === "mobile_combustion"
  );
}

const MOBILE_ACCOUNTING_VERSION = "epa_mobile_biogenic_v1";
const MOBILE_CH4_DATASETS = new Set(["on_road_gasoline", "on_road_diesel_alt_fuel", "non_road_vehicle"]);

function finiteText(value: string): boolean {
  if (!value) return false;
  return Number.isFinite(Number(value));
}

function gwpIs(value: string, expected: number): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed === expected;
}

function mobileProvenanceOk(raw: Record<string, unknown>, columnScaled: number): boolean {
  const accounting = asRecord(raw.accounting);
  const meta = asRecord(raw.activity_meta);
  const version = text(accounting.version) || text(meta.method_version);
  if (version !== MOBILE_ACCOUNTING_VERSION) return false;
  const gases = [
    [gasView(raw, "co2"), 1],
    [gasView(raw, "ch4"), 28],
    [gasView(raw, "n2o"), 265],
  ] as const;
  if (!gases.every(([gas, gwp]) => finiteText(gas.massKg) && finiteText(gas.co2eKg) && gwpIs(gas.gwp, gwp))) {
    return false;
  }
  const factors = asRecord(raw.factors);
  const co2 = asRecord(factors.co2);
  const ch4 = asRecord(factors.ch4);
  const source = asRecord(raw.factor_source);
  const gwp = text(accounting.gwp_version) || text(source.gwp_version);
  if (gwp.toUpperCase() !== "AR5") return false;
  if (text(co2.dataset_code) !== "mobile_combustion" || !text(co2.factor_row_id)) return false;
  if (!MOBILE_CH4_DATASETS.has(text(ch4.dataset_code)) || !text(ch4.factor_row_id)) return false;
  if (!text(co2.publisher) && !text(source.publisher)) return false;
  return tonnesToScaled(raw.total_t_co2e) === columnScaled;
}

export function toMobileResultActivity(activity: EmissionActivity): MobileResultActivity | null {
  const scaled = tonnesToScaled(activity.emissions_tco2e);
  if (scaled == null) return null;
  const raw = asRecord(activity.raw);
  if (!mobileProvenanceOk(raw, scaled)) return null;
  const inputs = asRecord(raw.inputs);
  const meta = asRecord(raw.activity_meta);
  const accounting = asRecord(raw.accounting);
  const factor = factorLabel(raw);
  const biogenicText = text(accounting.biogenic_co2_t) || text(raw.biogenic_co2_t);
  const tonnes = scaledTonnesToNumber(scaled);
  return {
    id: activity.id,
    assessmentId: activity.assessment_id,
    organizationId: activity.organization_id,
    userId: activity.user_id,
    counterpartyId: activity.counterparty_id ?? null,
    roadClass: text(inputs.road_class) || text(meta.road_class),
    vehicleType: text(inputs.vehicle_type) || text(meta.vehicle_type),
    fuel: text(inputs.fuel),
    fuelQuantity: text(inputs.fuel_quantity) || (activity.quantity != null ? String(activity.quantity) : ""),
    fuelUnit: text(inputs.fuel_unit) || text(activity.unit),
    distance: text(inputs.distance),
    distanceUnit: text(inputs.distance_unit),
    modelYear: text(inputs.model_year) || text(meta.model_year),
    equipmentId: text(meta.equipment_id || meta.source_id),
    site: text(meta.site),
    period: text(meta.period),
    co2: gasView(raw, "co2"),
    ch4: gasView(raw, "ch4"),
    n2o: gasView(raw, "n2o"),
    totalKgCo2e: text(raw.total_kg_co2e) || String(scaledTonnesToKg(scaled)),
    totalTco2e: typeof activity.emissions_tco2e === "string" ? activity.emissions_tco2e.trim() : String(tonnes),
    biogenicCo2Tonnes: biogenicText || null,
    accountingTreatment: text(accounting.treatment),
    accountingVersion: text(accounting.version),
    methodology: text(accounting.methodology),
    gwpVersion: factor.gwp,
    factorSource: factor.label,
    factorVersion: factor.version,
  };
}

export type MobileYearPartition = {
  included: MobileResultActivity[];
  unassigned: MobileResultActivity[];
  otherYear: MobileResultActivity[];
  rejectedCount: number;
};

export function partitionMobileActivities(
  activities: EmissionActivity[],
  context: StationaryReadContext & { epaAssessmentIds: string[] }
): MobileYearPartition {
  const allowedAssessments = new Set(context.epaAssessmentIds);
  const seen = new Set<string>();
  const included: MobileResultActivity[] = [];
  const unassigned: MobileResultActivity[] = [];
  const otherYear: MobileResultActivity[] = [];
  let rejectedCount = 0;
  for (const activity of activities) {
    if (!isEpaMobileActivity(activity)) continue;
    if (!context.organizationId || activity.organization_id !== context.organizationId) continue;
    if (!allowedAssessments.has(activity.assessment_id)) continue;
    if (context.counterpartyId && activity.counterparty_id !== context.counterpartyId) continue;
    if (seen.has(activity.id)) continue;
    const view = toMobileResultActivity(activity);
    if (!view) {
      rejectedCount += 1;
      continue;
    }
    seen.add(activity.id);
    const year = reportingYearFromPeriod(view.period);
    if (context.reportingYear == null || year == null) {
      if (year == null) unassigned.push(view);
      else otherYear.push(view);
      continue;
    }
    if (year !== context.reportingYear) otherYear.push(view);
    else included.push(view);
  }
  return { included, unassigned, otherYear, rejectedCount };
}

export function summarizeMobileActivities(activities: MobileResultActivity[]): MobileVerifiedResults {
  if (activities.length === 0) return emptyMobileVerified();
  const scaled = activities.reduce((sum, activity) => sum + (tonnesToScaled(activity.totalTco2e) || 0), 0);
  const biogenic = summarizeBiogenicCo2(activities);
  return {
    status: "ready",
    error: null,
    totalTco2e: scaledTonnesToNumber(scaled),
    totalKgCo2e: scaledTonnesToKg(scaled),
    biogenicCo2Tonnes: biogenic.tonnes,
    biogenicStatus: biogenic.status,
    activities,
  };
}

function unavailableMobile(error: string): MobileVerifiedResults {
  return {
    status: "unavailable",
    error,
    totalTco2e: 0,
    totalKgCo2e: 0,
    biogenicCo2Tonnes: null,
    biogenicStatus: "not_recorded",
    activities: [],
    unassignedCount: 0,
    unassignedTco2e: 0,
    otherYearCount: 0,
    rejectedCount: 0,
  };
}

function errorText(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "Verified mobile records could not be loaded.";
}

export async function fetchMobileVerified(
  context: StationaryReadContext,
  deps: {
    listAssessments?: typeof listEmissionAssessments;
    listActivities?: typeof listEmissionActivities;
  } = {}
): Promise<MobileVerifiedResults> {
  if (!context.organizationId) {
    return unavailableMobile("An organization is required before emissions can be shown.");
  }
  if (context.reportingYear == null) {
    return unavailableMobile("A reporting year is required. This is not a zero inventory.");
  }
  const listAssessments = deps.listAssessments || listEmissionAssessments;
  const listActivities = deps.listActivities || listEmissionActivities;
  try {
    const [assessments, activities] = await Promise.all([
      listAssessments({ framework: "epa" }),
      listActivities({
        scope: 1,
        category: "mobile_combustion",
        legacy_source: "epa_mobile_v1",
      }),
    ]);
    const epaAssessmentIds = selectEpaAssessmentIds(assessments || [], context.organizationId);
    const partitioned = partitionMobileActivities(activities || [], { ...context, epaAssessmentIds });
    const summary = summarizeMobileActivities(partitioned.included);
    const unassignedScaled = partitioned.unassigned.reduce(
      (sum, activity) => sum + (tonnesToScaled(activity.totalTco2e) || 0),
      0
    );
    return {
      ...summary,
      unassignedCount: partitioned.unassigned.length,
      unassignedTco2e: scaledTonnesToNumber(unassignedScaled),
      otherYearCount: partitioned.otherYear.length,
      rejectedCount: partitioned.rejectedCount,
    };
  } catch (err) {
    return unavailableMobile(errorText(err));
  }
}

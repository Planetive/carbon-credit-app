/**
 * Read and total backend EPA stationary records for the results screen.
 * emissions_tco2e is metric tonnes. Kilograms are produced only by an explicit × 1000.
 */

import type { EmissionActivity, EmissionAssessment } from "@/api/ghg";
import { listEmissionActivities, listEmissionAssessments } from "@/api/ghg";
import { reportingYearFromPeriod } from "./reportingYear";

export const KG_PER_TONNE = 1000;
const TONNE_SCALE = 100_000_000;

export type StationaryGasView = {
  massKg: string;
  gwp: string;
  co2eKg: string;
};

export type StationaryResultActivity = {
  id: string;
  assessmentId: string;
  organizationId: string;
  counterpartyId: string | null;
  fuel: string;
  fuelCategory: string;
  quantity: string;
  unit: string;
  equipmentType: string;
  site: string;
  equipmentId: string;
  period: string;
  co2: StationaryGasView;
  ch4: StationaryGasView;
  n2o: StationaryGasView;
  totalKgCo2e: string;
  totalTco2e: string;
  /** Tonnes of CO2 reported outside Scope 1. Absent when the saved record has no accounting block. */
  biogenicCo2Tonnes?: string | null;
  accountingTreatment?: string;
  accountingVersion?: string;
  methodology?: string;
  gwpVersion: string;
  factorSource: string;
  factorVersion: string;
};

export type StationaryVerifiedResults = {
  status: "ready" | "empty" | "unavailable";
  error: string | null;
  totalTco2e: number;
  totalKgCo2e: number;
  /** Sum of recorded biogenic CO2. Null when the loaded records do not state it. Not part of totalTco2e. */
  biogenicCo2Tonnes?: number | null;
  biogenicStatus?: "recorded" | "partial" | "not_recorded";
  activities: StationaryResultActivity[];
  /** Stored records with no YYYY or YYYY-MM period. They are not in the annual total. */
  unassignedCount?: number;
  unassignedTco2e?: number;
  /** Stored records whose period year is not the selected reporting year. */
  otherYearCount?: number;
  /** Rows that failed the accounting, gas, or factor checks. They are not in the total. */
  rejectedCount?: number;
};

export type StationaryReadContext = {
  organizationId?: string | null;
  counterpartyId?: string | null;
  reportingYear?: number | null;
};

export function emptyStationaryVerified(): StationaryVerifiedResults {
  return {
    status: "empty",
    error: null,
    totalTco2e: 0,
    totalKgCo2e: 0,
    biogenicCo2Tonnes: 0,
    biogenicStatus: "recorded",
    activities: [],
    rejectedCount: 0,
  };
}

export function tonnesToKg(tonnes: number): number {
  return tonnes * KG_PER_TONNE;
}

/** Adds verified kilograms onto a base. This is not the reportable inventory total. */
export function scope1DisplayKg(
  legacyScope1Kg: number,
  verified: StationaryVerifiedResults | null | undefined
): number {
  if (!verified || verified.status === "unavailable") return legacyScope1Kg;
  return legacyScope1Kg + verified.totalKgCo2e;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

/** Parse a tonne quantity into 1e-8 tonne units. Strings are read exactly; numbers are rounded to 8 places. */
export function tonnesToScaled(value: unknown): number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return Math.round(value * TONNE_SCALE);
  }
  if (typeof value !== "string") return null;
  const textValue = value.trim();
  if (!/^-?\d+(\.\d+)?$/.test(textValue)) return null;
  const negative = textValue.startsWith("-");
  const unsigned = negative ? textValue.slice(1) : textValue;
  const [whole, fraction = ""] = unsigned.split(".");
  const scaled = Number(whole) * TONNE_SCALE + Number(fraction.padEnd(8, "0").slice(0, 8));
  if (!Number.isFinite(scaled)) return null;
  return negative ? -scaled : scaled;
}

export function scaledTonnesToNumber(scaled: number): number {
  return scaled / TONNE_SCALE;
}

export function scaledTonnesToKg(scaled: number): number {
  return scaled / (TONNE_SCALE / KG_PER_TONNE);
}

function gasView(raw: Record<string, unknown>, key: "co2" | "ch4" | "n2o"): StationaryGasView {
  const gas = asRecord(asRecord(raw.gases)[key]);
  return {
    massKg: text(gas.mass_kg),
    gwp: text(gas.gwp),
    co2eKg: text(gas.co2e_kg),
  };
}

function factorSourceLabel(raw: Record<string, unknown>): {
  label: string;
  gwpVersion: string;
  factorVersion: string;
} {
  const source = asRecord(raw.factor_source);
  const label = [source.publisher, source.dataset_title || source.dataset_code, source.version_label]
    .map(text)
    .filter(Boolean)
    .join(" · ");
  return { label, gwpVersion: text(source.gwp_version), factorVersion: text(source.version_label) };
}

export function isEpaStationaryActivity(activity: Pick<EmissionActivity, "legacy_source" | "method" | "scope" | "category">): boolean {
  return (
    activity.legacy_source === "epa_stationary" &&
    activity.method === "epa_stationary" &&
    Number(activity.scope) === 1 &&
    activity.category === "stationary_combustion"
  );
}

export const STATIONARY_ACCOUNTING_VERSION = "epa_stationary_biogenic_v1";
/**
 * Complete stationary records saved before the biogenic accounting label.
 * Kept only when the gas, AR5, factor, and tonne checks also pass.
 * A stored tonne total with no gas breakdown is not this record.
 */
export const STATIONARY_PRIOR_ACCOUNTING_VERSION = "epa_stationary_v1";

function finiteText(value: string): boolean {
  if (!value) return false;
  return Number.isFinite(Number(value));
}

function gwpIs(value: string, expected: number): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed === expected;
}

function stationaryProvenanceOk(raw: Record<string, unknown>, columnScaled: number): boolean {
  const accounting = asRecord(raw.accounting);
  const meta = asRecord(raw.activity_meta);
  const version = text(accounting.version) || text(meta.method_version);
  if (version !== STATIONARY_ACCOUNTING_VERSION && version !== STATIONARY_PRIOR_ACCOUNTING_VERSION) return false;
  const gases = [
    [gasView(raw, "co2"), 1],
    [gasView(raw, "ch4"), 28],
    [gasView(raw, "n2o"), 265],
  ] as const;
  if (!gases.every(([gas, gwp]) => finiteText(gas.massKg) && finiteText(gas.co2eKg) && gwpIs(gas.gwp, gwp))) {
    return false;
  }
  const source = asRecord(raw.factor_source);
  if (!text(source.publisher) || !(text(source.dataset_title) || text(source.dataset_code))) return false;
  if (text(source.gwp_version).toUpperCase() !== "AR5") return false;
  return tonnesToScaled(raw.total_t_co2e) === columnScaled;
}

export function toStationaryResultActivity(activity: EmissionActivity): StationaryResultActivity | null {
  const scaled = tonnesToScaled(activity.emissions_tco2e);
  if (scaled == null) return null;
  const raw = asRecord(activity.raw);
  if (!stationaryProvenanceOk(raw, scaled)) return null;
  const inputs = asRecord(raw.inputs);
  const meta = asRecord(raw.activity_meta);
  const source = factorSourceLabel(raw);
  const tonnes = scaledTonnesToNumber(scaled);
  const storedKg = text(raw.total_kg_co2e);
  const accounting = asRecord(raw.accounting);
  const biogenicText = text(accounting.biogenic_co2_t);
  return {
    id: activity.id,
    assessmentId: activity.assessment_id,
    organizationId: activity.organization_id,
    counterpartyId: activity.counterparty_id ?? null,
    fuel: text(inputs.fuel),
    fuelCategory: text(inputs.fuel_category),
    quantity: text(inputs.quantity) || (activity.quantity != null ? String(activity.quantity) : ""),
    unit: text(inputs.unit) || text(activity.unit),
    equipmentType: text(meta.equipment_type),
    site: text(meta.site),
    equipmentId: text(meta.equipment_id || meta.source_id),
    period: text(meta.period),
    co2: gasView(raw, "co2"),
    ch4: gasView(raw, "ch4"),
    n2o: gasView(raw, "n2o"),
    totalKgCo2e: storedKg || String(scaledTonnesToKg(scaled)),
    totalTco2e: typeof activity.emissions_tco2e === "string" ? activity.emissions_tco2e.trim() : String(tonnes),
    biogenicCo2Tonnes: biogenicText || null,
    accountingTreatment: text(accounting.treatment),
    accountingVersion: text(accounting.version),
    methodology: text(accounting.methodology),
    gwpVersion: source.gwpVersion,
    factorSource: source.label,
    factorVersion: source.factorVersion,
  };
}

export function selectEpaAssessmentIds(
  assessments: EmissionAssessment[],
  organizationId?: string | null
): string[] {
  return assessments
    .filter((assessment) => assessment.framework === "epa")
    .filter((assessment) => !organizationId || assessment.organization_id === organizationId)
    .map((assessment) => assessment.id);
}

export type StationaryYearPartition = {
  included: StationaryResultActivity[];
  unassigned: StationaryResultActivity[];
  otherYear: StationaryResultActivity[];
  rejectedCount: number;
};

export function partitionStationaryActivities(
  activities: EmissionActivity[],
  context: StationaryReadContext & { epaAssessmentIds: string[] }
): StationaryYearPartition {
  const allowedAssessments = new Set(context.epaAssessmentIds);
  const seen = new Set<string>();
  const included: StationaryResultActivity[] = [];
  const unassigned: StationaryResultActivity[] = [];
  const otherYear: StationaryResultActivity[] = [];
  let rejectedCount = 0;
  for (const activity of activities) {
    if (!isEpaStationaryActivity(activity)) continue;
    if (!context.organizationId || activity.organization_id !== context.organizationId) continue;
    if (!allowedAssessments.has(activity.assessment_id)) continue;
    if (context.counterpartyId && activity.counterparty_id !== context.counterpartyId) continue;
    if (seen.has(activity.id)) continue;
    const view = toStationaryResultActivity(activity);
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

export function selectStationaryActivities(
  activities: EmissionActivity[],
  context: StationaryReadContext & { epaAssessmentIds: string[] }
): StationaryResultActivity[] {
  return partitionStationaryActivities(activities, context).included;
}

export function summarizeBiogenicCo2(activities: Array<{ biogenicCo2Tonnes?: string | null }>): {
  tonnes: number | null;
  status: "recorded" | "partial" | "not_recorded";
} {
  const recorded = activities.filter((activity) => activity.biogenicCo2Tonnes != null && activity.biogenicCo2Tonnes !== "");
  if (recorded.length === 0) return { tonnes: null, status: "not_recorded" };
  const scaled = recorded.reduce((sum, activity) => sum + (tonnesToScaled(activity.biogenicCo2Tonnes) || 0), 0);
  return {
    tonnes: scaledTonnesToNumber(scaled),
    status: recorded.length === activities.length ? "recorded" : "partial",
  };
}

export function summarizeStationaryActivities(activities: StationaryResultActivity[]): StationaryVerifiedResults {
  if (activities.length === 0) return emptyStationaryVerified();
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

export function legacyFuelRowsExcludingVerified(
  fuelRows: Record<string, unknown>[],
  verifiedIds: Iterable<string>
): Record<string, unknown>[] {
  const ids = new Set(verifiedIds);
  return fuelRows.filter((row) => {
    const id = text(row.id);
    const source = text(row.legacy_source);
    const method = text(row.method);
    if (source === "epa_stationary" || method === "epa_stationary") return false;
    if (id && ids.has(id)) return false;
    return true;
  });
}

function errorText(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "Verified stationary records could not be loaded.";
}

function unavailableStationary(error: string): StationaryVerifiedResults {
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

export async function fetchStationaryVerified(
  context: StationaryReadContext,
  deps: {
    listAssessments?: typeof listEmissionAssessments;
    listActivities?: typeof listEmissionActivities;
  } = {}
): Promise<StationaryVerifiedResults> {
  if (!context.organizationId) {
    return unavailableStationary("An organization is required before emissions can be shown.");
  }
  if (context.reportingYear == null) {
    return unavailableStationary("A reporting year is required. This is not a zero inventory.");
  }
  const listAssessments = deps.listAssessments || listEmissionAssessments;
  const listActivities = deps.listActivities || listEmissionActivities;
  try {
    const [assessments, activities] = await Promise.all([
      listAssessments({ framework: "epa" }),
      listActivities({
        scope: 1,
        category: "stationary_combustion",
        legacy_source: "epa_stationary",
      }),
    ]);
    const epaAssessmentIds = selectEpaAssessmentIds(assessments || [], context.organizationId);
    const partitioned = partitionStationaryActivities(activities || [], {
      ...context,
      epaAssessmentIds,
    });
    const summary = summarizeStationaryActivities(partitioned.included);
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
    return unavailableStationary(errorText(err));
  }
}

/**
 * Read verified EPA refrigerant leakage records for reporting.
 * emissions_tco2e is Scope 1 metric tonnes. Leaked kilograms are not added to that total.
 */

import type { EmissionActivity } from "@/api/ghg";
import { listEmissionActivities, listEmissionAssessments } from "@/api/ghg";
import {
  scaledTonnesToKg,
  scaledTonnesToNumber,
  selectEpaAssessmentIds,
  tonnesToScaled,
  type StationaryReadContext,
} from "./stationaryResults";
import { reportingYearFromPeriod } from "./reportingYear";

export const REFRIGERANT_ACCOUNTING_VERSION = "epa_refrigerant_v1";

export type RefrigerantResultActivity = {
  id: string;
  assessmentId: string;
  organizationId: string;
  userId: string;
  counterpartyId: string | null;
  method: "leakage_record" | "estimated_leakage";
  refrigerant: string;
  leakageKg: string;
  chargeKg: string;
  leakageRatePercent: string;
  leakageRateSource: string;
  equipmentType: string;
  equipmentId: string;
  site: string;
  period: string;
  gwp: string;
  gwpPublication: string;
  factorProvenance: string;
  methodology: string;
  accountingVersion: string;
  emissionsKgCo2e: string;
  totalTco2e: string;
};

export type RefrigerantVerifiedResults = {
  status: "ready" | "empty" | "unavailable";
  error: string | null;
  totalTco2e: number;
  totalKgCo2e: number;
  activities: RefrigerantResultActivity[];
  unassignedCount?: number;
  otherYearCount?: number;
  rejectedCount?: number;
};

export function emptyRefrigerantVerified(): RefrigerantVerifiedResults {
  return {
    status: "empty",
    error: null,
    totalTco2e: 0,
    totalKgCo2e: 0,
    activities: [],
    unassignedCount: 0,
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

function finiteNonNegative(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0;
  if (typeof value !== "string" || !value.trim()) return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0;
}

export function refrigerantMethodLabel(method: string): string {
  if (method === "estimated_leakage") return "Estimated leakage";
  if (method === "leakage_record") return "Measured leakage";
  return "";
}

export function refrigerantRateDisclosure(
  activity: Pick<RefrigerantResultActivity, "method" | "leakageRatePercent">
): string | null {
  if (activity.method !== "estimated_leakage") return null;
  return `${activity.leakageRatePercent}% user assumption, not an EPA-published leakage rate`;
}

export function isEpaRefrigerantActivity(
  activity: Pick<EmissionActivity, "legacy_source" | "method" | "scope" | "category">
): boolean {
  return (
    activity.legacy_source === REFRIGERANT_ACCOUNTING_VERSION &&
    activity.method === REFRIGERANT_ACCOUNTING_VERSION &&
    Number(activity.scope) === 1 &&
    activity.category === "refrigerant_leakage"
  );
}

export function toRefrigerantResultActivity(activity: EmissionActivity): RefrigerantResultActivity | null {
  const columnScaled = tonnesToScaled(activity.emissions_tco2e);
  if (columnScaled == null || columnScaled < 0) return null;
  const raw = asRecord(activity.raw);
  const inputs = asRecord(raw.inputs);
  const meta = asRecord(raw.activity_meta);
  const accounting = asRecord(raw.accounting);
  const storedScaled = tonnesToScaled(raw.emissions_tco2e);
  const method = text(inputs.method);
  const rateSource = text(inputs.leakage_rate_source);
  const hasTable11 = Boolean(text(raw.table11_reference));
  const hasBlendRow = Boolean(text(raw.dataset_id) && text(raw.factor_row_id) && text(raw.dataset_code));
  const provenanceOk =
    text(raw.calc) === REFRIGERANT_ACCOUNTING_VERSION &&
    text(accounting.version) === REFRIGERANT_ACCOUNTING_VERSION &&
    text(meta.method_version) === REFRIGERANT_ACCOUNTING_VERSION &&
    Boolean(text(accounting.methodology)) &&
    (method === "leakage_record" || method === "estimated_leakage") &&
    Boolean(text(inputs.refrigerant)) &&
    finiteNonNegative(inputs.leakage_kg) &&
    finiteNonNegative(raw.gwp) &&
    Number(raw.gwp) > 0 &&
    Boolean(text(raw.gwp_publication)) &&
    Boolean(text(raw.factor_provenance)) &&
    finiteNonNegative(raw.emissions_kg_co2e) &&
    storedScaled === columnScaled &&
    (hasTable11 || hasBlendRow) &&
    (method === "leakage_record"
      ? rateSource === ""
      : rateSource === "user_assumption" && finiteNonNegative(inputs.leakage_rate_percent));
  if (!provenanceOk) return null;

  const tonnes = scaledTonnesToNumber(columnScaled);
  return {
    id: activity.id,
    assessmentId: activity.assessment_id,
    organizationId: activity.organization_id,
    userId: activity.user_id,
    counterpartyId: activity.counterparty_id ?? null,
    method: method === "estimated_leakage" ? "estimated_leakage" : "leakage_record",
    refrigerant: text(inputs.refrigerant),
    leakageKg: text(inputs.leakage_kg),
    chargeKg: text(inputs.charge_kg),
    leakageRatePercent: text(inputs.leakage_rate_percent),
    leakageRateSource: rateSource,
    equipmentType: text(meta.equipment_type),
    equipmentId: text(meta.equipment_id),
    site: text(meta.site),
    period: text(meta.period),
    gwp: text(raw.gwp),
    gwpPublication: text(raw.gwp_publication),
    factorProvenance: text(raw.factor_provenance),
    methodology: text(accounting.methodology),
    accountingVersion: text(accounting.version),
    emissionsKgCo2e: text(raw.emissions_kg_co2e),
    totalTco2e: typeof activity.emissions_tco2e === "string" ? activity.emissions_tco2e.trim() : String(tonnes),
  };
}

export type RefrigerantYearPartition = {
  included: RefrigerantResultActivity[];
  unassigned: RefrigerantResultActivity[];
  otherYear: RefrigerantResultActivity[];
  rejectedCount: number;
};

export function partitionRefrigerantActivities(
  activities: EmissionActivity[],
  context: StationaryReadContext & { epaAssessmentIds: string[] }
): RefrigerantYearPartition {
  const allowedAssessments = new Set(context.epaAssessmentIds);
  const seen = new Set<string>();
  const included: RefrigerantResultActivity[] = [];
  const unassigned: RefrigerantResultActivity[] = [];
  const otherYear: RefrigerantResultActivity[] = [];
  let rejectedCount = 0;
  for (const activity of activities) {
    if (!isEpaRefrigerantActivity(activity)) continue;
    if (!context.organizationId || activity.organization_id !== context.organizationId) continue;
    if (!allowedAssessments.has(activity.assessment_id)) continue;
    if (context.counterpartyId && activity.counterparty_id !== context.counterpartyId) continue;
    if (seen.has(activity.id)) continue;
    const view = toRefrigerantResultActivity(activity);
    if (!view) {
      rejectedCount += 1;
      seen.add(activity.id);
      continue;
    }
    seen.add(activity.id);
    const year = reportingYearFromPeriod(view.period);
    if (year == null) unassigned.push(view);
    else if (context.reportingYear == null || year !== context.reportingYear) otherYear.push(view);
    else included.push(view);
  }
  return { included, unassigned, otherYear, rejectedCount };
}

export function summarizeRefrigerantActivities(activities: RefrigerantResultActivity[]): RefrigerantVerifiedResults {
  if (activities.length === 0) return emptyRefrigerantVerified();
  const scaled = activities.reduce((sum, activity) => sum + (tonnesToScaled(activity.totalTco2e) || 0), 0);
  return {
    status: "ready",
    error: null,
    totalTco2e: scaledTonnesToNumber(scaled),
    totalKgCo2e: scaledTonnesToKg(scaled),
    activities,
    unassignedCount: 0,
    otherYearCount: 0,
    rejectedCount: 0,
  };
}

function unavailableRefrigerant(error: string): RefrigerantVerifiedResults {
  return {
    status: "unavailable",
    error,
    totalTco2e: 0,
    totalKgCo2e: 0,
    activities: [],
    unassignedCount: 0,
    otherYearCount: 0,
    rejectedCount: 0,
  };
}

function errorText(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "Verified refrigerant records could not be loaded.";
}

export async function fetchRefrigerantVerified(
  context: StationaryReadContext,
  deps: {
    listAssessments?: typeof listEmissionAssessments;
    listActivities?: typeof listEmissionActivities;
  } = {}
): Promise<RefrigerantVerifiedResults> {
  if (!context.organizationId) {
    return unavailableRefrigerant("An organization is required before emissions can be shown.");
  }
  if (context.reportingYear == null) {
    return unavailableRefrigerant("A reporting year is required. This is not a zero inventory.");
  }
  const listAssessments = deps.listAssessments || listEmissionAssessments;
  const listActivities = deps.listActivities || listEmissionActivities;
  try {
    const [assessments, activities] = await Promise.all([
      listAssessments({ framework: "epa" }),
      listActivities({
        scope: 1,
        category: "refrigerant_leakage",
        legacy_source: REFRIGERANT_ACCOUNTING_VERSION,
      }),
    ]);
    const epaAssessmentIds = selectEpaAssessmentIds(assessments || [], context.organizationId);
    const partitioned = partitionRefrigerantActivities(activities || [], { ...context, epaAssessmentIds });
    const summary = summarizeRefrigerantActivities(partitioned.included);
    return {
      ...summary,
      unassignedCount: partitioned.unassigned.length,
      otherYearCount: partitioned.otherYear.length,
      rejectedCount: partitioned.rejectedCount,
    };
  } catch (err) {
    return unavailableRefrigerant(errorText(err));
  }
}

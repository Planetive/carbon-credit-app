/**
 * Verified location-based purchased electricity.
 * emissions_tco2e is tonnes. Legacy Scope 2 tables are not copied into this block.
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
import { matchesVerifiedCounterparty, reportingYearFromPeriod } from "./reportingYear";

export const ELECTRICITY_ACCOUNTING_VERSION = "scope2_location_electricity_v1";

export type ElectricityResultActivity = {
  id: string;
  assessmentId: string;
  organizationId: string;
  counterpartyId: string | null;
  period: string;
  country: string;
  gridRegion: string;
  quantity: string;
  unit: string;
  electricityKwh: string;
  renewableKwh: string;
  factorValue: string;
  factorUnit: string;
  publisher: string;
  sourceDocument: string;
  publicationYear: string;
  gasCoverage: string;
  boundary: string;
  totalTco2e: string;
};

export type ElectricityVerifiedResults = {
  status: "ready" | "empty" | "unavailable";
  error: string | null;
  totalTco2e: number;
  totalKgCo2e: number;
  activities: ElectricityResultActivity[];
  unassignedCount: number;
  otherYearCount: number;
  rejectedCount: number;
};

export function emptyElectricityVerified(): ElectricityVerifiedResults {
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

export function isLocationElectricityActivity(
  activity: Pick<EmissionActivity, "legacy_source" | "method" | "scope" | "category">
): boolean {
  return (
    activity.legacy_source === ELECTRICITY_ACCOUNTING_VERSION &&
    activity.method === "location_based" &&
    Number(activity.scope) === 2 &&
    activity.category === "purchased_electricity"
  );
}

export function toElectricityResultActivity(activity: EmissionActivity): ElectricityResultActivity | null {
  if (!isLocationElectricityActivity(activity)) return null;
  const columnScaled = tonnesToScaled(activity.emissions_tco2e);
  if (columnScaled == null || columnScaled < 0) return null;
  const raw = asRecord(activity.raw);
  const inputs = asRecord(raw.inputs);
  const meta = asRecord(raw.activity_meta);
  const factor = asRecord(raw.factor);
  const accounting = asRecord(raw.accounting);
  const renewable = asRecord(raw.contractual_renewable);
  const storedScaled = tonnesToScaled(raw.total_t_co2e);
  const kwh = Number(inputs.electricity_kwh);
  const factorValue = Number(factor.value);
  const expected =
    Number.isFinite(kwh) && Number.isFinite(factorValue) ? (kwh * factorValue) / 1000 : Number.NaN;
  const expectedScaled = tonnesToScaled(expected);
  if (
    accounting.version !== ELECTRICITY_ACCOUNTING_VERSION ||
    accounting.status !== "verified" ||
    text(meta.method_version) !== ELECTRICITY_ACCOUNTING_VERSION ||
    storedScaled == null ||
    storedScaled !== columnScaled ||
    expectedScaled == null ||
    expectedScaled !== columnScaled ||
    renewable.applied_to_location_total !== false ||
    !text(factor.dataset_id) ||
    !text(factor.factor_row_id) ||
    !text(factor.publisher) ||
    !text(factor.source_document) ||
    !text(factor.publication_year) ||
    !text(factor.gas_coverage) ||
    !text(factor.boundary) ||
    text(factor.boundary).toLowerCase() === "generation" ||
    !text(factor.unit).toLowerCase().includes("co2e") ||
    reportingYearFromPeriod(meta.period) == null
  ) {
    return null;
  }
  return {
    id: activity.id,
    assessmentId: activity.assessment_id,
    organizationId: activity.organization_id,
    counterpartyId: activity.counterparty_id || null,
    period: text(meta.period),
    country: text(factor.country || inputs.country),
    gridRegion: text(factor.grid_region || inputs.grid_region),
    quantity: text(inputs.quantity),
    unit: text(inputs.unit),
    electricityKwh: text(inputs.electricity_kwh),
    renewableKwh: text(inputs.renewable_kwh),
    factorValue: text(factor.value),
    factorUnit: text(factor.unit),
    publisher: text(factor.publisher),
    sourceDocument: text(factor.source_document),
    publicationYear: text(factor.publication_year),
    gasCoverage: text(factor.gas_coverage),
    boundary: text(factor.boundary),
    totalTco2e: text(raw.total_t_co2e),
  };
}

export function partitionElectricityActivities(
  activities: EmissionActivity[],
  context: StationaryReadContext & { epaAssessmentIds?: string[] }
): {
  included: ElectricityResultActivity[];
  unassigned: EmissionActivity[];
  otherYear: EmissionActivity[];
  rejectedCount: number;
} {
  const included: ElectricityResultActivity[] = [];
  const unassigned: EmissionActivity[] = [];
  const otherYear: EmissionActivity[] = [];
  const seen = new Set<string>();
  const allowed = context.epaAssessmentIds ? new Set(context.epaAssessmentIds) : null;
  let rejectedCount = 0;
  for (const activity of activities) {
    if (!isLocationElectricityActivity(activity)) continue;
    if (allowed && !allowed.has(activity.assessment_id)) continue;
    if (context.organizationId && activity.organization_id !== context.organizationId) continue;
    if (!matchesVerifiedCounterparty(activity.counterparty_id, context.counterpartyId)) continue;
    if (seen.has(activity.id)) continue;
    seen.add(activity.id);
    const raw = asRecord(activity.raw);
    const period = asRecord(raw.activity_meta).period;
    const year = reportingYearFromPeriod(period);
    if (year == null) {
      unassigned.push(activity);
      continue;
    }
    if (context.reportingYear != null && year !== context.reportingYear) {
      otherYear.push(activity);
      continue;
    }
    const view = toElectricityResultActivity(activity);
    if (!view) rejectedCount += 1;
    else included.push(view);
  }
  return { included, unassigned, otherYear, rejectedCount };
}

export function summarizeElectricityActivities(activities: ElectricityResultActivity[]): ElectricityVerifiedResults {
  if (activities.length === 0) return emptyElectricityVerified();
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

function unavailable(error: string): ElectricityVerifiedResults {
  return { ...emptyElectricityVerified(), status: "unavailable", error, totalTco2e: 0, totalKgCo2e: 0 };
}

export async function fetchElectricityVerified(
  context: StationaryReadContext,
  deps: {
    listAssessments?: typeof listEmissionAssessments;
    listActivities?: typeof listEmissionActivities;
  } = {}
): Promise<ElectricityVerifiedResults> {
  if (!context.organizationId) return unavailable("An organization is required before emissions can be shown.");
  if (context.reportingYear == null) return unavailable("A reporting year is required. This is not a zero inventory.");
  const listAssessments = deps.listAssessments || listEmissionAssessments;
  const listActivities = deps.listActivities || listEmissionActivities;
  try {
    const [assessments, activities] = await Promise.all([
      listAssessments({ framework: "epa" }),
      listActivities({
        scope: 2,
        category: "purchased_electricity",
        legacy_source: ELECTRICITY_ACCOUNTING_VERSION,
      }),
    ]);
    const epaAssessmentIds = selectEpaAssessmentIds(assessments || [], context.organizationId);
    const partitioned = partitionElectricityActivities(activities || [], { ...context, epaAssessmentIds });
    const summary = summarizeElectricityActivities(partitioned.included);
    return {
      ...summary,
      unassignedCount: partitioned.unassigned.length,
      otherYearCount: partitioned.otherYear.length,
      rejectedCount: partitioned.rejectedCount,
    };
  } catch (err) {
    const message = err instanceof Error && err.message ? err.message : "Verified electricity records could not be loaded.";
    return unavailable(message);
  }
}

export type Scope2ElectricitySaveBody = {
  country: string;
  grid_region: string;
  quantity: string;
  unit: "kWh" | "MWh";
  period: string;
  assessment_id: string;
  counterparty_id?: string | null;
  renewable_kwh?: string | null;
};

export function buildScope2ElectricitySaveBody(input: Scope2ElectricitySaveBody): Scope2ElectricitySaveBody {
  return {
    country: input.country.trim(),
    grid_region: input.grid_region.trim() || "national",
    quantity: input.quantity,
    unit: input.unit,
    period: input.period,
    assessment_id: input.assessment_id,
    counterparty_id: input.counterparty_id ?? null,
    renewable_kwh: input.renewable_kwh ?? null,
  };
}

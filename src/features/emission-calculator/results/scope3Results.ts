/**
 * Verified Scope 3 annual aggregation from app.emission_activities.
 * Tonnes are summed with scaled integers; kilograms are derived only for reporting UIs.
 * Legacy scope3_* tables are never included.
 */

import type { EmissionActivity, EmissionAssessment } from "@/api/ghg";
import { listEmissionActivities, listEmissionAssessments } from "@/api/ghg";
import {
  scaledTonnesToKg,
  scaledTonnesToNumber,
  tonnesToScaled,
  type StationaryReadContext,
} from "./stationaryResults";
import { matchesVerifiedCounterparty, reportingYearFromPeriod } from "./reportingYear";
import {
  NOT_CALCULATED_SCOPE3_CATEGORIES,
  type Scope3CategoryCompleteness,
} from "./scope3Reporting";

/** Must match backend ACCOUNTING_VERSION in scope3_verified_calc.py */
export const SCOPE3_ACCOUNTING_VERSION = "scope3_verified_activity_v1";

/** Categories Stage 5 can persist when factors/metadata allow. */
export const SUPPORTED_VERIFIED_SCOPE3_CATEGORIES = [
  { key: "purchased_goods", label: "Purchased goods and services", ghgNumber: 1 },
  { key: "capital_goods", label: "Capital goods", ghgNumber: 2 },
  { key: "upstream_transportation", label: "Upstream transportation and distribution", ghgNumber: 4 },
  { key: "waste_generated", label: "Waste generated in operations", ghgNumber: 5 },
  { key: "business_travel", label: "Business travel", ghgNumber: 6 },
  { key: "employee_commuting", label: "Employee commuting", ghgNumber: 7 },
  { key: "downstream_transportation", label: "Downstream transportation and distribution", ghgNumber: 9 },
  { key: "end_of_life", label: "End-of-life treatment of sold products", ghgNumber: 12 },
] as const;

/** GHG Protocol categories not yet eligible for verified annual totals. */
export const UNSUPPORTED_VERIFIED_SCOPE3_CATEGORIES = [
  { key: "fuel_energy_activities", label: "Fuel- and energy-related activities", ghgNumber: 3, reason: "awaiting_factors" as const },
  { key: "upstream_leased_assets", label: "Upstream leased assets", ghgNumber: 8, reason: "unsupported" as const },
  { key: "processing_sold_products", label: "Processing of sold products", ghgNumber: 10, reason: "unsupported" as const },
  { key: "use_of_sold_products", label: "Use of sold products", ghgNumber: 11, reason: "unsupported" as const },
  { key: "downstream_leased_assets", label: "Downstream leased assets", ghgNumber: 13, reason: "unsupported" as const },
  { key: "franchises", label: "Franchises", ghgNumber: 14, reason: "unsupported" as const },
  { key: "investments", label: "Investments", ghgNumber: 15, reason: "unsupported" as const },
] as const;

export const GHG_PROTOCOL_SCOPE3_CATEGORY_COUNT = 15;

export type Scope3ResultActivity = {
  id: string;
  assessmentId: string;
  organizationId: string;
  counterpartyId: string | null;
  period: string;
  category: string;
  method: string;
  quantity: string;
  unit: string;
  totalTco2e: string;
};

export type Scope3VerifiedResults = {
  status: "ready" | "empty" | "unavailable";
  error: string | null;
  totalTco2e: number;
  totalKgCo2e: number;
  activities: Scope3ResultActivity[];
  byCategory: Scope3CategoryCompleteness[];
  /** Always false until all 15 GHG categories are supported and reported. */
  inventoryComplete: false;
  categoriesWithActivity: number;
  supportedCategoryCount: number;
  unassignedCount: number;
  otherYearCount: number;
  rejectedCount: number;
};

export function emptyScope3Verified(): Scope3VerifiedResults {
  return {
    status: "empty",
    error: null,
    totalTco2e: 0,
    totalKgCo2e: 0,
    activities: [],
    byCategory: buildCompleteness([], 0),
    inventoryComplete: false,
    categoriesWithActivity: 0,
    supportedCategoryCount: SUPPORTED_VERIFIED_SCOPE3_CATEGORIES.length,
    unassignedCount: 0,
    otherYearCount: 0,
    rejectedCount: 0,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

const SUPPORTED_KEYS = new Set<string>(SUPPORTED_VERIFIED_SCOPE3_CATEGORIES.map((row) => row.key));

export function isVerifiedScope3Activity(
  activity: Pick<EmissionActivity, "legacy_source" | "scope" | "category">,
): boolean {
  return (
    activity.legacy_source === SCOPE3_ACCOUNTING_VERSION &&
    Number(activity.scope) === 3 &&
    SUPPORTED_KEYS.has(activity.category)
  );
}

export function selectOrgAssessmentIds(
  assessments: EmissionAssessment[],
  organizationId?: string | null,
): string[] {
  return assessments
    .filter((row) => !organizationId || row.organization_id === organizationId)
    .map((row) => row.id);
}

export function toScope3ResultActivity(activity: EmissionActivity): Scope3ResultActivity | null {
  if (!isVerifiedScope3Activity(activity)) return null;
  const columnScaled = tonnesToScaled(activity.emissions_tco2e);
  if (columnScaled == null || columnScaled < 0) return null;
  const raw = asRecord(activity.raw);
  const meta = asRecord(raw.activity_meta);
  const accounting = asRecord(raw.accounting);
  const storedScaled = tonnesToScaled(raw.total_t_co2e ?? activity.emissions_tco2e);
  const period = text(meta.period);
  const versionOk =
    text(raw.calc) === SCOPE3_ACCOUNTING_VERSION ||
    text(accounting.version) === SCOPE3_ACCOUNTING_VERSION;
  if (!versionOk || storedScaled == null || storedScaled !== columnScaled || reportingYearFromPeriod(period) == null) {
    return null;
  }
  return {
    id: activity.id,
    assessmentId: activity.assessment_id,
    organizationId: activity.organization_id,
    counterpartyId: activity.counterparty_id || null,
    period,
    category: activity.category,
    method: activity.method,
    quantity: text(activity.quantity),
    unit: text(activity.unit),
    totalTco2e: text(activity.emissions_tco2e),
  };
}

export function buildCompleteness(
  activities: Scope3ResultActivity[],
  legacyExcludedKg: number,
): Scope3CategoryCompleteness[] {
  const kgByCategory = new Map<string, number>();
  const seen = new Set<string>();
  for (const activity of activities) {
    if (seen.has(activity.id)) continue;
    seen.add(activity.id);
    const scaled = tonnesToScaled(activity.totalTco2e) || 0;
    kgByCategory.set(activity.category, (kgByCategory.get(activity.category) || 0) + scaledTonnesToKg(scaled));
  }
  const rows: Scope3CategoryCompleteness[] = [];
  for (const cat of SUPPORTED_VERIFIED_SCOPE3_CATEGORIES) {
    if (kgByCategory.has(cat.key)) {
      rows.push({
        key: cat.key,
        label: cat.label,
        ghgNumber: cat.ghgNumber,
        status: "verified",
        kgCo2e: kgByCategory.get(cat.key) || 0,
      });
    } else {
      rows.push({
        key: cat.key,
        label: cat.label,
        ghgNumber: cat.ghgNumber,
        status: "no_activity",
        kgCo2e: null,
      });
    }
  }
  for (const cat of UNSUPPORTED_VERIFIED_SCOPE3_CATEGORIES) {
    rows.push({
      key: cat.key,
      label: cat.label,
      ghgNumber: cat.ghgNumber,
      status: cat.reason,
      kgCo2e: null,
    });
  }
  if (legacyExcludedKg > 0) {
    rows.push({
      key: "legacy_excluded",
      label: "Legacy Scope 3 records (excluded)",
      ghgNumber: null,
      status: "legacy_excluded",
      kgCo2e: legacyExcludedKg,
    });
  }
  // Keep note of Stage 1 not-calculated aliases for UI parity
  void NOT_CALCULATED_SCOPE3_CATEGORIES;
  return rows.sort((a, b) => (a.ghgNumber ?? 99) - (b.ghgNumber ?? 99));
}

export function partitionScope3Activities(
  activities: EmissionActivity[],
  context: StationaryReadContext & { assessmentIds?: string[] },
): {
  included: Scope3ResultActivity[];
  unassigned: EmissionActivity[];
  otherYear: EmissionActivity[];
  rejectedCount: number;
} {
  const included: Scope3ResultActivity[] = [];
  const unassigned: EmissionActivity[] = [];
  const otherYear: EmissionActivity[] = [];
  const seen = new Set<string>();
  const allowed = context.assessmentIds ? new Set(context.assessmentIds) : null;
  let rejectedCount = 0;
  for (const activity of activities) {
    if (!isVerifiedScope3Activity(activity)) continue;
    if (allowed && !allowed.has(activity.assessment_id)) continue;
    if (context.organizationId && activity.organization_id !== context.organizationId) continue;
    if (!matchesVerifiedCounterparty(activity.counterparty_id, context.counterpartyId)) continue;
    if (seen.has(activity.id)) continue;
    seen.add(activity.id);
    const period = asRecord(asRecord(activity.raw).activity_meta).period;
    const year = reportingYearFromPeriod(period);
    if (year == null) {
      unassigned.push(activity);
      continue;
    }
    if (context.reportingYear != null && year !== context.reportingYear) {
      otherYear.push(activity);
      continue;
    }
    const view = toScope3ResultActivity(activity);
    if (!view) rejectedCount += 1;
    else included.push(view);
  }
  return { included, unassigned, otherYear, rejectedCount };
}

export function summarizeScope3Activities(
  activities: Scope3ResultActivity[],
  legacyExcludedKg = 0,
): Scope3VerifiedResults {
  const byCategory = buildCompleteness(activities, legacyExcludedKg);
  const categoriesWithActivity = byCategory.filter((row) => row.status === "verified").length;
  if (activities.length === 0) {
    return {
      ...emptyScope3Verified(),
      byCategory,
      categoriesWithActivity: 0,
    };
  }
  const seen = new Set<string>();
  let scaled = 0;
  for (const activity of activities) {
    if (seen.has(activity.id)) continue;
    seen.add(activity.id);
    scaled += tonnesToScaled(activity.totalTco2e) || 0;
  }
  return {
    status: "ready",
    error: null,
    totalTco2e: scaledTonnesToNumber(scaled),
    totalKgCo2e: scaledTonnesToKg(scaled),
    activities,
    byCategory,
    inventoryComplete: false,
    categoriesWithActivity,
    supportedCategoryCount: SUPPORTED_VERIFIED_SCOPE3_CATEGORIES.length,
    unassignedCount: 0,
    otherYearCount: 0,
    rejectedCount: 0,
  };
}

function unavailable(error: string): Scope3VerifiedResults {
  return { ...emptyScope3Verified(), status: "unavailable", error };
}

/**
 * Load verified Scope 3 for one reporting year.
 * Includes EPA and UK assessments for the organization (Stage 5 saves use either).
 */
export async function fetchScope3Verified(
  context: StationaryReadContext,
  deps: {
    listAssessments?: typeof listEmissionAssessments;
    listActivities?: typeof listEmissionActivities;
    legacyExcludedKg?: number;
  } = {},
): Promise<Scope3VerifiedResults> {
  if (!context.organizationId) return unavailable("An organization is required before emissions can be shown.");
  if (context.reportingYear == null) return unavailable("A reporting year is required. This is not a zero inventory.");
  const listAssessments = deps.listAssessments || listEmissionAssessments;
  const listActivities = deps.listActivities || listEmissionActivities;
  try {
    const [epaAssessments, ukAssessments, activities] = await Promise.all([
      listAssessments({ framework: "epa" }),
      listAssessments({ framework: "uk" }),
      listActivities({
        scope: 3,
        legacy_source: SCOPE3_ACCOUNTING_VERSION,
      }),
    ]);
    const assessmentIds = selectOrgAssessmentIds(
      [...(epaAssessments || []), ...(ukAssessments || [])],
      context.organizationId,
    );
    const partitioned = partitionScope3Activities(activities || [], { ...context, assessmentIds });
    const summary = summarizeScope3Activities(partitioned.included, deps.legacyExcludedKg ?? 0);
    return {
      ...summary,
      unassignedCount: partitioned.unassigned.length,
      otherYearCount: partitioned.otherYear.length,
      rejectedCount: partitioned.rejectedCount,
    };
  } catch (err) {
    const message =
      err instanceof Error && err.message ? err.message : "Verified Scope 3 records could not be loaded.";
    return unavailable(message);
  }
}

/** Pure helper used by verifiedScope3AnnualKg and UK/EPA parity tests. */
export function verifiedScope3AnnualKgFromBlock(
  reportingYear: number | null,
  block: Scope3VerifiedResults | null | undefined,
): number | null {
  if (reportingYear == null || reportingYear < 1990 || reportingYear > 2200) return null;
  if (!block || block.status === "unavailable") return null;
  if (block.status === "empty") return 0;
  return block.totalKgCo2e;
}

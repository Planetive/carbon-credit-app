/**
 * Verified purchased heat and steam.
 * emissions_tco2e is tonnes. Legacy heat tables are not copied into this block.
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

export const HEAT_STEAM_ACCOUNTING_VERSION = "scope2_purchased_heat_steam_v1";

const CO2_KG = "66.33000000";
const CH4_G = "1.25000000";
const N2O_G = "0.12500000";
const CO2E_PER_MMBTU_MICRO = 66398125n;
const CO2E_DIVISOR = 1000000000n;

export type HeatSteamResultActivity = {
  id: string;
  assessmentId: string;
  organizationId: string;
  counterpartyId: string | null;
  period: string;
  energyForm: string;
  quantity: string;
  unit: string;
  supplierName: string;
  publisher: string;
  sourceDocument: string;
  totalTco2e: string;
};

export type HeatSteamVerifiedResults = {
  status: "ready" | "empty" | "unavailable";
  error: string | null;
  totalTco2e: number;
  totalKgCo2e: number;
  activities: HeatSteamResultActivity[];
  unassignedCount: number;
  otherYearCount: number;
  rejectedCount: number;
};

export function emptyHeatSteamVerified(): HeatSteamVerifiedResults {
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

export function co2eTonnesFromMmBtu(quantity: string): string | null {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(quantity.trim());
  if (!match) return null;
  const fraction = match[2] || "";
  if (fraction.length > 12) return null;
  const scale = 10n ** BigInt(fraction.length);
  const qty = BigInt(match[1]) * scale + BigInt(fraction || "0");
  const numer = qty * CO2E_PER_MMBTU_MICRO * 100000000n;
  const denom = scale * CO2E_DIVISOR;
  const scaled = (numer + denom / 2n) / denom;
  const negative = false;
  const whole = scaled / 100000000n;
  const frac = (scaled % 100000000n).toString().padStart(8, "0");
  return `${negative ? "-" : ""}${whole.toString()}.${frac}`;
}

export function isPurchasedHeatSteamActivity(
  activity: Pick<EmissionActivity, "legacy_source" | "method" | "scope" | "category">
): boolean {
  return (
    activity.legacy_source === HEAT_STEAM_ACCOUNTING_VERSION &&
    activity.method === "purchased_energy" &&
    Number(activity.scope) === 2 &&
    activity.category === "purchased_heat_steam"
  );
}

export function toHeatSteamResultActivity(activity: EmissionActivity): HeatSteamResultActivity | null {
  if (!isPurchasedHeatSteamActivity(activity)) return null;
  const columnScaled = tonnesToScaled(activity.emissions_tco2e);
  if (columnScaled == null || columnScaled < 0) return null;
  const raw = asRecord(activity.raw);
  const inputs = asRecord(raw.inputs);
  const meta = asRecord(raw.activity_meta);
  const factor = asRecord(raw.factor);
  const gases = asRecord(raw.gases);
  const onsite = asRecord(raw.on_site_combustion);
  const accounting = asRecord(raw.accounting);
  const storedScaled = tonnesToScaled(raw.total_t_co2e);
  const quantity = text(inputs.quantity);
  const expected = co2eTonnesFromMmBtu(quantity);
  const expectedScaled = tonnesToScaled(expected);
  const energyForm = text(inputs.energy_form || meta.energy_form);
  if (
    accounting.version !== HEAT_STEAM_ACCOUNTING_VERSION ||
    accounting.status !== "verified" ||
    text(meta.method_version) !== HEAT_STEAM_ACCOUNTING_VERSION ||
    storedScaled == null ||
    storedScaled !== columnScaled ||
    expectedScaled == null ||
    expectedScaled !== columnScaled ||
    onsite.included !== false ||
    (energyForm !== "purchased_heat" && energyForm !== "purchased_steam") ||
    text(inputs.unit) !== "mmBtu" ||
    text(factor.publisher) !== "US EPA" ||
    !text(factor.source_document).includes("Table 7") ||
    text(factor.boundary) !== "purchased_energy" ||
    factor.supplier_specific !== false ||
    text(factor.co2_kg_per_mmbtu) !== CO2_KG ||
    text(factor.ch4_g_per_mmbtu) !== CH4_G ||
    text(factor.n2o_g_per_mmbtu) !== N2O_G ||
    factor.gwp_ch4 !== 28 ||
    factor.gwp_n2o !== 265 ||
    text(factor.gwp_version) !== "AR5" ||
    !text(asRecord(gases.co2).mass_kg) ||
    !text(asRecord(gases.ch4).mass_kg) ||
    !text(asRecord(gases.n2o).mass_kg) ||
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
    energyForm,
    quantity,
    unit: "mmBtu",
    supplierName: text(inputs.supplier_name),
    publisher: text(factor.publisher),
    sourceDocument: text(factor.source_document),
    totalTco2e: text(raw.total_t_co2e),
  };
}

export function partitionHeatSteamActivities(
  activities: EmissionActivity[],
  context: StationaryReadContext & { epaAssessmentIds?: string[] }
): {
  included: HeatSteamResultActivity[];
  unassigned: EmissionActivity[];
  otherYear: EmissionActivity[];
  rejectedCount: number;
} {
  const included: HeatSteamResultActivity[] = [];
  const unassigned: EmissionActivity[] = [];
  const otherYear: EmissionActivity[] = [];
  const seen = new Set<string>();
  const allowed = context.epaAssessmentIds ? new Set(context.epaAssessmentIds) : null;
  let rejectedCount = 0;
  for (const activity of activities) {
    if (!isPurchasedHeatSteamActivity(activity)) continue;
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
    const view = toHeatSteamResultActivity(activity);
    if (!view) rejectedCount += 1;
    else included.push(view);
  }
  return { included, unassigned, otherYear, rejectedCount };
}

export function summarizeHeatSteamActivities(activities: HeatSteamResultActivity[]): HeatSteamVerifiedResults {
  if (activities.length === 0) return emptyHeatSteamVerified();
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

function unavailable(error: string): HeatSteamVerifiedResults {
  return { ...emptyHeatSteamVerified(), status: "unavailable", error, totalTco2e: 0, totalKgCo2e: 0 };
}

export async function fetchHeatSteamVerified(
  context: StationaryReadContext,
  deps: {
    listAssessments?: typeof listEmissionAssessments;
    listActivities?: typeof listEmissionActivities;
  } = {}
): Promise<HeatSteamVerifiedResults> {
  if (!context.organizationId) return unavailable("An organization is required before emissions can be shown.");
  if (context.reportingYear == null) return unavailable("A reporting year is required. This is not a zero inventory.");
  const listAssessments = deps.listAssessments || listEmissionAssessments;
  const listActivities = deps.listActivities || listEmissionActivities;
  try {
    const [assessments, activities] = await Promise.all([
      listAssessments({ framework: "epa" }),
      listActivities({
        scope: 2,
        category: "purchased_heat_steam",
        legacy_source: HEAT_STEAM_ACCOUNTING_VERSION,
      }),
    ]);
    const epaAssessmentIds = selectEpaAssessmentIds(assessments || [], context.organizationId);
    const partitioned = partitionHeatSteamActivities(activities || [], { ...context, epaAssessmentIds });
    const summary = summarizeHeatSteamActivities(partitioned.included);
    return {
      ...summary,
      unassignedCount: partitioned.unassigned.length,
      otherYearCount: partitioned.otherYear.length,
      rejectedCount: partitioned.rejectedCount,
    };
  } catch (err) {
    const message = err instanceof Error && err.message ? err.message : "Verified heat and steam records could not be loaded.";
    return unavailable(message);
  }
}

export type Scope2HeatSteamSaveBody = {
  energy_form: "purchased_heat" | "purchased_steam";
  quantity: string;
  unit: "mmBtu";
  period: string;
  assessment_id: string;
  counterparty_id?: string | null;
  supplier_name?: string | null;
};

export function buildScope2HeatSteamSaveBody(input: Scope2HeatSteamSaveBody): Scope2HeatSteamSaveBody {
  return {
    energy_form: input.energy_form,
    quantity: input.quantity,
    unit: "mmBtu",
    period: input.period,
    assessment_id: input.assessment_id,
    counterparty_id: input.counterparty_id ?? null,
    supplier_name: input.supplier_name?.trim() || null,
  };
}

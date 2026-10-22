/**
 * Read and total backend EPA stationary records for the results screen.
 * emissions_tco2e is metric tonnes. Kilograms are produced only by an explicit × 1000.
 */

import type { EmissionActivity, EmissionAssessment } from "@/api/ghg";
import { listEmissionActivities, listEmissionAssessments } from "@/api/ghg";

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
  gwpVersion: string;
  factorSource: string;
  factorVersion: string;
};

export type StationaryVerifiedResults = {
  status: "ready" | "empty" | "unavailable";
  error: string | null;
  totalTco2e: number;
  totalKgCo2e: number;
  activities: StationaryResultActivity[];
};

export type StationaryReadContext = {
  organizationId?: string | null;
  counterpartyId?: string | null;
};

export function emptyStationaryVerified(): StationaryVerifiedResults {
  return { status: "empty", error: null, totalTco2e: 0, totalKgCo2e: 0, activities: [] };
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

export function toStationaryResultActivity(activity: EmissionActivity): StationaryResultActivity | null {
  const scaled = tonnesToScaled(activity.emissions_tco2e);
  if (scaled == null) return null;
  const raw = asRecord(activity.raw);
  const inputs = asRecord(raw.inputs);
  const meta = asRecord(raw.activity_meta);
  const source = factorSourceLabel(raw);
  const tonnes = scaledTonnesToNumber(scaled);
  const storedKg = text(raw.total_kg_co2e);
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

export function selectStationaryActivities(
  activities: EmissionActivity[],
  context: StationaryReadContext & { epaAssessmentIds: string[] }
): StationaryResultActivity[] {
  const allowedAssessments = new Set(context.epaAssessmentIds);
  const seen = new Set<string>();
  const selected: StationaryResultActivity[] = [];
  for (const activity of activities) {
    if (!isEpaStationaryActivity(activity)) continue;
    if (context.organizationId && activity.organization_id !== context.organizationId) continue;
    if (!allowedAssessments.has(activity.assessment_id)) continue;
    if (context.counterpartyId && activity.counterparty_id !== context.counterpartyId) continue;
    if (seen.has(activity.id)) continue;
    const view = toStationaryResultActivity(activity);
    if (!view) continue;
    seen.add(activity.id);
    selected.push(view);
  }
  return selected;
}

export function summarizeStationaryActivities(activities: StationaryResultActivity[]): StationaryVerifiedResults {
  if (activities.length === 0) return emptyStationaryVerified();
  const scaled = activities.reduce((sum, activity) => sum + (tonnesToScaled(activity.totalTco2e) || 0), 0);
  return {
    status: "ready",
    error: null,
    totalTco2e: scaledTonnesToNumber(scaled),
    totalKgCo2e: scaledTonnesToKg(scaled),
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

export async function fetchStationaryVerified(
  context: StationaryReadContext,
  deps: {
    listAssessments?: typeof listEmissionAssessments;
    listActivities?: typeof listEmissionActivities;
  } = {}
): Promise<StationaryVerifiedResults> {
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
    const selected = selectStationaryActivities(activities || [], {
      ...context,
      epaAssessmentIds,
    });
    return summarizeStationaryActivities(selected);
  } catch (err) {
    return {
      status: "unavailable",
      error: errorText(err),
      totalTco2e: 0,
      totalKgCo2e: 0,
      activities: [],
    };
  }
}

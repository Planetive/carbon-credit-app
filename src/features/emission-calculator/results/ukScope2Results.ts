/**
 * Annual UK Scope 2 uses verified purchased electricity and heat only.
 * Undated legacy tables stay out of that total.
 */

import type { EmissionActivity, EmissionAssessment } from "@/api/ghg";
import { listEmissionActivities, listEmissionAssessments } from "@/api/ghg";
import {
  scaledTonnesToKg,
  tonnesToScaled,
} from "./stationaryResults";
import { activityMatchesReportingYear, matchesVerifiedCounterparty } from "./reportingYear";

export const UK_ELECTRICITY_ACCOUNTING_VERSION = "scope2_uk_location_electricity_v1";
export const UK_HEAT_ACCOUNTING_VERSION = "scope2_uk_purchased_heat_steam_v1";

export function ukAnnualScope2Kg(electricityTonnes: string[], heatTonnes: string[]): number {
  const scaled = [...electricityTonnes, ...heatTonnes].reduce((sum, value) => sum + (tonnesToScaled(value) ?? 0), 0);
  return scaledTonnesToKg(scaled);
}

function text(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

/** One stored activity id contributes its tonnes once, even if the list repeats it. */
export function collectVerifiedTonnes<T extends { id: string }>(
  rows: readonly T[],
  read: (row: T) => string | null,
): string[] {
  const seen = new Set<string>();
  const tonnes: string[] = [];
  for (const row of rows) {
    if (!row.id || seen.has(row.id)) continue;
    seen.add(row.id);
    const value = read(row);
    if (value != null) tonnes.push(value);
  }
  return tonnes;
}

export function ukStoredTonnes(activity: EmissionActivity, version: string, category: string): string | null {
  if (activity.legacy_source !== version || activity.category !== category || Number(activity.scope) !== 2) return null;
  const raw = asRecord(activity.raw);
  const accounting = asRecord(raw.accounting);
  if (text(accounting.version) !== version) return null;
  const renewable = asRecord(raw.contractual_renewable);
  if (renewable.applied_to_location_total === true) return null;
  const onSite = asRecord(raw.on_site_generation);
  const combustion = asRecord(raw.on_site_combustion);
  if (onSite.included === true || combustion.included === true) return null;
  const stored = text(activity.emissions_tco2e);
  return tonnesToScaled(stored) == null ? null : stored;
}

export async function fetchUkAnnualScope2(input: {
  organizationId?: string | null;
  reportingYear?: number | null;
  counterpartyId?: string | null;
}): Promise<{ scope2Kg: number | null; electricityKg: number; heatKg: number; error: string | null }> {
  if (!input.organizationId || input.reportingYear == null) {
    return { scope2Kg: null, electricityKg: 0, heatKg: 0, error: "A reporting year and organization are required." };
  }
  try {
    const [assessments, electricity, heat] = await Promise.all([
      listEmissionAssessments({ framework: "uk" }),
      listEmissionActivities({ scope: 2, category: "purchased_electricity", legacy_source: UK_ELECTRICITY_ACCOUNTING_VERSION }),
      listEmissionActivities({ scope: 2, category: "purchased_heat_steam", legacy_source: UK_HEAT_ACCOUNTING_VERSION }),
    ]);
    const assessmentIds = new Set(
      (assessments || [])
        .filter((row: EmissionAssessment) => row.organization_id === input.organizationId && row.framework === "uk")
        .map((row) => row.id)
    );
    const keep = (activity: EmissionActivity, version: string, category: string) => {
      if (!assessmentIds.has(activity.assessment_id)) return null;
      if (activity.organization_id !== input.organizationId) return null;
      if (!matchesVerifiedCounterparty(activity.counterparty_id, input.counterpartyId)) return null;
      const meta = asRecord(asRecord(activity.raw).activity_meta);
      if (!activityMatchesReportingYear(meta.period, input.reportingYear)) return null;
      return ukStoredTonnes(activity, version, category);
    };
    const electricityTonnes = collectVerifiedTonnes(electricity || [], (row) =>
      keep(row, UK_ELECTRICITY_ACCOUNTING_VERSION, "purchased_electricity"),
    );
    const heatTonnes = collectVerifiedTonnes(heat || [], (row) =>
      keep(row, UK_HEAT_ACCOUNTING_VERSION, "purchased_heat_steam"),
    );
    return {
      scope2Kg: ukAnnualScope2Kg(electricityTonnes, heatTonnes),
      electricityKg: ukAnnualScope2Kg(electricityTonnes, []),
      heatKg: ukAnnualScope2Kg([], heatTonnes),
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error && err.message ? err.message : "Verified Scope 2 records could not be loaded.";
    return { scope2Kg: null, electricityKg: 0, heatKg: 0, error: message };
  }
}

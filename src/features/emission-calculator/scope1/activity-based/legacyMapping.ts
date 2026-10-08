import type { EmissionCategoryTotal } from "@/features/emission-calculator/core/loaders/epaIpccResults";
import type { Scope1ActivityGroupId } from "./types";

/**
 * Map legacy category keys (from loadEpaIpccResults) into activity-based display groups.
 * Historical kg values are kept as stored — not recalculated with current factors.
 */
export const LEGACY_KEY_TO_ACTIVITY_GROUP: Record<string, Scope1ActivityGroupId> = {
  fuel: "stationary",
  heatsteam: "stationary",
  kitchen: "stationary",
  power: "stationary",
  heating: "stationary",
  mobile: "vehicles_mobile",
  onroad_gas: "vehicles_mobile",
  onroad_diesel: "vehicles_mobile",
  nonroad: "vehicles_mobile",
  vehicular: "vehicles_mobile",
  uk_refrigerant: "leaks_releases",
  flaring: "industrial_other",
  venting: "industrial_other",
};

export const ACTIVITY_GROUP_LABELS: Record<Scope1ActivityGroupId, string> = {
  stationary: "Stationary Combustion",
  vehicles_mobile: "Vehicles and Mobile Equipment",
  leaks_releases: "Leaks and Gas Releases",
  industrial_other: "Industrial and Other Direct Emissions",
};

export type GroupedScope1Total = {
  groupId: Scope1ActivityGroupId;
  label: string;
  valueKg: number;
  legacyParts: EmissionCategoryTotal[];
  provenanceNotes: string[];
};

/**
 * Collapse legacy line items into four activity groups without double-counting.
 * Each legacy key is mapped to exactly one group.
 */
export function groupScope1LegacyTotals(
  scope1: EmissionCategoryTotal[]
): GroupedScope1Total[] {
  const buckets: Record<Scope1ActivityGroupId, GroupedScope1Total> = {
    stationary: {
      groupId: "stationary",
      label: ACTIVITY_GROUP_LABELS.stationary,
      valueKg: 0,
      legacyParts: [],
      provenanceNotes: [],
    },
    vehicles_mobile: {
      groupId: "vehicles_mobile",
      label: ACTIVITY_GROUP_LABELS.vehicles_mobile,
      valueKg: 0,
      legacyParts: [],
      provenanceNotes: [],
    },
    leaks_releases: {
      groupId: "leaks_releases",
      label: ACTIVITY_GROUP_LABELS.leaks_releases,
      valueKg: 0,
      legacyParts: [],
      provenanceNotes: [],
    },
    industrial_other: {
      groupId: "industrial_other",
      label: ACTIVITY_GROUP_LABELS.industrial_other,
      valueKg: 0,
      legacyParts: [],
      provenanceNotes: [],
    },
  };

  for (const row of scope1) {
    const groupId = LEGACY_KEY_TO_ACTIVITY_GROUP[row.key];
    if (!groupId) continue;
    const bucket = buckets[groupId];
    bucket.valueKg += row.value || 0;
    bucket.legacyParts.push(row);
  }

  for (const bucket of Object.values(buckets)) {
    if (bucket.legacyParts.some((p) => ["kitchen", "power", "heating", "vehicular"].includes(p.key))) {
      bucket.provenanceNotes.push(
        "Includes historical IPCC-labelled entries preserved at their original calculated values."
      );
    }
    if (bucket.legacyParts.some((p) => ["onroad_gas", "onroad_diesel", "nonroad"].includes(p.key))) {
      bucket.provenanceNotes.push(
        "On-road/non-road historical rows may be CH4/N2O-only; do not assume they are complete CO2e."
      );
    }
  }

  return Object.values(buckets);
}

/** Simple duplicate warning key: site|equipment|period */
export function activityIdentityKey(parts: {
  site?: string;
  equipmentId?: string;
  period?: string;
}): string {
  return [parts.site || "", parts.equipmentId || "", parts.period || ""]
    .map((s) => s.trim().toLowerCase())
    .join("|");
}

export function findDuplicateIdentityKeys(
  rows: Array<{ site?: string; equipmentId?: string; period?: string; id: string }>
): string[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const key = activityIdentityKey(r);
    if (!key.replace(/\|/g, "")) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].filter(([, n]) => n > 1).map(([k]) => k);
}

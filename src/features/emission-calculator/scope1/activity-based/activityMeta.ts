import type { Scope1ActivityGroupId } from "./types";

/**
 * Granular fields for each Scope 1 activity entry.
 *
 * AWS / JWT path (current architecture):
 *   Written via ghgEntryClient → app.emission_activities.raw.activity_meta
 *   Do not add public.scope1_* columns for this — raw jsonb is the store.
 *
 * Legacy direct-table path:
 *   May also appear as a column if present; otherwise ignored by PostgREST.
 */
export type Scope1ActivityMeta = {
  activity_group: Scope1ActivityGroupId;
  equipment_type?: string;
  site?: string;
  source_id?: string;
  period?: string;
  method_version: string;
  data_available?: "fuel" | "distance" | "both";
  road_class?: "on_road" | "non_road";
  completeness?: string;
  coverage?: string;
  measured_or_estimated?: "measured" | "estimated" | "mixed" | "unknown";
  gases?: {
    co2_kg?: number;
    ch4_kg?: number;
    n2o_kg?: number;
    total_co2e_kg?: number;
  };
  notes?: string[];
};

export function buildStationaryActivityMeta(input: {
  equipmentType: string;
  site?: string;
  sourceId?: string;
  period?: string;
}): Scope1ActivityMeta {
  return {
    activity_group: "stationary",
    equipment_type: input.equipmentType,
    site: input.site?.trim() || undefined,
    source_id: input.sourceId?.trim() || undefined,
    period: input.period || undefined,
    method_version: "activity_stationary_v1",
  };
}

export function buildMobileActivityMeta(input: {
  equipment: string;
  site?: string;
  sourceId?: string;
  period?: string;
  dataAvailable?: "fuel" | "distance" | "both";
  roadClass?: "on_road" | "non_road";
  completeness?: string;
  coverage?: string;
  co2Kg?: number;
  ch4Kg?: number;
  n2oKg?: number;
  totalCo2eKg?: number;
}): Scope1ActivityMeta {
  return {
    activity_group: "vehicles_mobile",
    equipment_type: input.equipment,
    site: input.site?.trim() || undefined,
    source_id: input.sourceId?.trim() || undefined,
    period: input.period || undefined,
    method_version: "activity_mobile_v1",
    data_available: input.dataAvailable,
    road_class: input.roadClass,
    completeness: input.completeness,
    coverage: input.coverage,
    gases: {
      co2_kg: input.co2Kg,
      ch4_kg: input.ch4Kg,
      n2o_kg: input.n2oKg,
      total_co2e_kg: input.totalCo2eKg,
    },
  };
}

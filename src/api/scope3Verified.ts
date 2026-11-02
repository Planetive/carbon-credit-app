/**
 * Verified Scope 3 calc/persist — server-authoritative.
 * Failures must surface to the UI; do not fall back to local emissions for save.
 */

import { apiFetch } from "./client";

export type Scope3VerifiedCalculation = {
  ok: boolean;
  save_allowed: boolean;
  period: string;
  reporting_year: number;
  scope: 3;
  category: string;
  method: string;
  quantity: number;
  unit: string;
  emissions_kg: number;
  total_kg_co2e: string;
  total_t_co2e: string;
  emissions_tco2e: string;
  factor: Record<string, unknown>;
  inputs: Record<string, unknown>;
  error?: string;
};

export type Scope3VerifiedSaveResult = {
  activity_id: string;
  assessment_id: string;
  organization_id: string;
  counterparty_id: string | null;
  emissions_tco2e: string;
  calculation: Scope3VerifiedCalculation;
  raw: Record<string, unknown>;
  idempotent_replay?: boolean;
};

/** Only pass through verified emission_activities UUIDs (not legacy scope3_* ids). */
export function verifiedActivityId(dbId: string | null | undefined): string | undefined {
  if (!dbId) return undefined;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(dbId)
    ? dbId
    : undefined;
}

export function calcScope3Freight(body: {
  vehicle_type: string;
  distance_km: number;
  weight_kg?: number;
  period: string;
}) {
  return apiFetch<Scope3VerifiedCalculation>("/api/v1/calc/scope3/freight", {
    method: "POST",
    body,
  });
}

export function saveScope3Freight(body: {
  vehicle_type: string;
  distance_km: number;
  weight_kg?: number;
  period: string;
  assessment_id: string;
  counterparty_id?: string | null;
  activity_id?: string | null;
  client_entry_id?: string | null;
  category?: "upstream_transportation" | "downstream_transportation";
}) {
  return apiFetch<Scope3VerifiedSaveResult>("/api/v1/calc/scope3/freight/records", {
    method: "POST",
    body,
  });
}

export function calcScope3BusinessTravel(body: {
  vehicle_type: string;
  distance_km: number;
  period: string;
}) {
  return apiFetch<Scope3VerifiedCalculation>("/api/v1/calc/scope3/business-travel", {
    method: "POST",
    body,
  });
}

export function saveScope3BusinessTravel(body: {
  vehicle_type: string;
  distance_km: number;
  period: string;
  assessment_id: string;
  counterparty_id?: string | null;
  activity_id?: string | null;
  client_entry_id?: string | null;
}) {
  return apiFetch<Scope3VerifiedSaveResult>(
    "/api/v1/calc/scope3/business-travel/records",
    { method: "POST", body },
  );
}

export function calcScope3EmployeeCommuting(body: {
  vehicle_type: string;
  distance_km: number;
  employees: number;
  period: string;
  distance_basis?: string;
  working_days_per_year?: number;
}) {
  return apiFetch<Scope3VerifiedCalculation>(
    "/api/v1/calc/scope3/employee-commuting",
    { method: "POST", body },
  );
}

export function saveScope3EmployeeCommuting(body: {
  vehicle_type: string;
  distance_km: number;
  employees: number;
  period: string;
  assessment_id: string;
  counterparty_id?: string | null;
  activity_id?: string | null;
  client_entry_id?: string | null;
  distance_basis?: string;
  working_days_per_year?: number;
}) {
  return apiFetch<Scope3VerifiedSaveResult>(
    "/api/v1/calc/scope3/employee-commuting/records",
    { method: "POST", body },
  );
}

export function calcScope3Waste(body: {
  material: string;
  disposal_method: string;
  mass_kg: number;
  period: string;
}) {
  return apiFetch<Scope3VerifiedCalculation>("/api/v1/calc/scope3/waste", {
    method: "POST",
    body,
  });
}

export function saveScope3Waste(body: {
  material: string;
  disposal_method: string;
  mass_kg: number;
  period: string;
  assessment_id: string;
  counterparty_id?: string | null;
  activity_id?: string | null;
  client_entry_id?: string | null;
  category?: "waste_generated" | "end_of_life";
}) {
  return apiFetch<Scope3VerifiedSaveResult>("/api/v1/calc/scope3/waste/records", {
    method: "POST",
    body,
  });
}

export function calcScope3Spend(body: {
  amount: number;
  period: string;
  supplier_id?: string;
  supplier_code?: string;
  activity_currency?: string;
  activity_price_year?: number;
  category?: "purchased_goods" | "capital_goods";
}) {
  return apiFetch<Scope3VerifiedCalculation>("/api/v1/calc/scope3/spend", {
    method: "POST",
    body,
  });
}

export function saveScope3Spend(body: {
  amount: number;
  period: string;
  assessment_id: string;
  counterparty_id?: string | null;
  activity_id?: string | null;
  client_entry_id?: string | null;
  supplier_id?: string;
  supplier_code?: string;
  activity_currency?: string;
  activity_price_year?: number;
  category?: "purchased_goods" | "capital_goods";
}) {
  return apiFetch<Scope3VerifiedSaveResult>("/api/v1/calc/scope3/spend/records", {
    method: "POST",
    body,
  });
}

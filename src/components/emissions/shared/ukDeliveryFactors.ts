import { supabase } from "@/integrations/supabase/client";
import type { UkFactorBasis } from "./types";
import type { UkPassengerFactorCell } from "./ukPassengerFactors";
import {
  availableUkPassengerBasises,
  passengerUkFactorBasisFromDb,
  ukEmissionFactorCellFromRow,
  ukPassengerBasisValue,
} from "./ukPassengerFactors";

/** Re-use passenger cell shape: total / co2 / ch4 / n2o per activity unit. */
export type UkDeliveryFactorCell = UkPassengerFactorCell;

/** activity → type → unit → fuel_type → laden_lev → factor cell */
export type UkDeliveryFactorsMap = Record<
  string,
  Record<string, Record<string, Record<string, Record<string, UkDeliveryFactorCell>>>>
>;

export { availableUkPassengerBasises as availableUkDeliveryBasises };
export { ukPassengerBasisValue as ukDeliveryBasisValue };

function normCell(v: unknown): string {
  return String(v ?? "").trim();
}

export function buildUkDeliveryData(rows: Record<string, unknown>[]): UkDeliveryFactorsMap {
  const map: UkDeliveryFactorsMap = {};

  for (const row of rows) {
    const activity = normCell(row.activity ?? row.Activity);
    const type = normCell(row.type ?? row.Type ?? row.vehicle_type ?? row.vehicleType);
    const unit = normCell(row.unit ?? row.Unit);
    const fuel = normCell(row.fuel_type ?? row.fuelType ?? row["Fuel type"] ?? row["Fuel Type"]);
    const ladenRaw =
      row.laden_lev ??
      row.ladenLev ??
      row.laden_level ??
      row["laden_level"] ??
      row["laden lev"] ??
      row["Laden lev"] ??
      row["Laden level"] ??
      row["laden level"];
    const laden = normCell(ladenRaw);
    const ladenKey = laden;

    if (!activity || !type || !unit || !fuel) continue;

    const parts = ukEmissionFactorCellFromRow(row);
    if (availableUkPassengerBasises(parts).length === 0) continue;

    if (!map[activity]) map[activity] = {};
    if (!map[activity][type]) map[activity][type] = {};
    if (!map[activity][type][unit]) map[activity][type][unit] = {};
    if (!map[activity][type][unit][fuel]) map[activity][type][unit][fuel] = {};
    const prev = map[activity][type][unit][fuel][ladenKey] || {};
    map[activity][type][unit][fuel][ladenKey] = {
      ...prev,
      ...(parts.total !== undefined ? { total: parts.total } : {}),
      ...(parts.co2 !== undefined ? { co2: parts.co2 } : {}),
      ...(parts.ch4 !== undefined ? { ch4: parts.ch4 } : {}),
      ...(parts.n2o !== undefined ? { n2o: parts.n2o } : {}),
    };
  }

  return map;
}

export function getUkDeliveryFactorCell(
  map: UkDeliveryFactorsMap,
  activity?: string,
  vehicleType?: string,
  unit?: string,
  fuelType?: string,
  ladenLevel?: string
): UkDeliveryFactorCell | undefined {
  if (!activity || !vehicleType || !unit || !fuelType) return undefined;
  const ladenKey = normCell(ladenLevel ?? "");
  return map[activity]?.[vehicleType]?.[unit]?.[fuelType]?.[ladenKey];
}

export function lookupUkDeliveryFactor(
  map: UkDeliveryFactorsMap,
  activity?: string,
  vehicleType?: string,
  unit?: string,
  fuelType?: string,
  ladenLevel?: string,
  basis: UkFactorBasis = "total"
): number | undefined {
  const cell = getUkDeliveryFactorCell(map, activity, vehicleType, unit, fuelType, ladenLevel);
  return ukPassengerBasisValue(cell, basis);
}

/** DB → row field (same values as passenger). */
export function deliveryUkFactorBasisFromDb(raw: unknown): UkFactorBasis | undefined {
  return passengerUkFactorBasisFromDb(raw);
}

/**
 * Prefer `uk_delivery_factors` first: PostgREST often mis-resolves `UK_delivery-factors` to
 * `UK_delivery_factors` (underscore), which does not exist. Migration `20260418140000` adds a
 * view `uk_delivery_factors` → `"UK_delivery-factors"` when needed.
 */
const TABLE_CANDIDATES = [
  "uk_delivery_factors",
  "UK_delivery-factors",
  "uk_delivery-factors",
  "UK_delivery_factors",
] as const;

export async function fetchUkDeliveryFactorsMap(): Promise<{
  map: UkDeliveryFactorsMap;
  error: string | null;
}> {
  let lastErr: string | null = null;
  let sawEmptyOk = false;

  for (const table of TABLE_CANDIDATES) {
    const { data, error } = await (supabase as any).from(table).select("*");
    if (error) {
      lastErr = error.message ?? lastErr;
      continue;
    }
    if (!Array.isArray(data)) continue;

    const raw = data as Record<string, unknown>[];
    if (raw.length === 0) {
      sawEmptyOk = true;
      console.warn(
        `[UK delivery factors] "${table}" returned 0 rows. If the table has data in the Dashboard, add RLS: SELECT for role authenticated.`
      );
      continue;
    }

    const map = buildUkDeliveryData(raw);
    if (Object.keys(map).length === 0) {
      return {
        map: {},
        error:
          "Rows were returned from UK_delivery-factors but none could be used. Check that activity, type, unit, and fuel_type are filled, laden_level/laden_lev is present (or empty string), and kg_co2e or the per-gas columns contain numbers.",
      };
    }

    return { map, error: null };
  }

  return {
    map: {},
    error:
      lastErr ??
      (sawEmptyOk
        ? "UK_delivery-factors returned no rows to the app. Add an RLS policy: FOR SELECT TO authenticated USING (true), or disable RLS for this reference table."
        : "Could not read UK_delivery-factors. Confirm the table exists and add a SELECT policy for role authenticated (or run project migrations)."),
  };
}

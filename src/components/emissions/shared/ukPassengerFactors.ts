import { supabase } from "@/integrations/supabase/client";
import type { UkFactorBasis } from "./types";

/** Per reference row: total kg CO2e and/or gas components (all per activity unit), same shape as UK fuel factors. */
export type UkPassengerFactorCell = {
  total?: number;
  co2?: number;
  ch4?: number;
  n2o?: number;
};

/** activity → type → unit → fuel_type → factor cell */
export type UkPassengerFactorsMap = Record<
  string,
  Record<string, Record<string, Record<string, UkPassengerFactorCell>>>
>;

/** Hover text: activity → vehicle type → description */
export type UkPassengerTypeDescriptions = Record<string, Record<string, string>>;

export const UK_PASSENGER_BASIS_ORDER: UkFactorBasis[] = ["total", "co2", "ch4", "n2o"];

export const UK_PASSENGER_BASIS_LABEL: Record<UkFactorBasis, string> = {
  total: "kg CO2e",
  co2: "kg CO2e of CO2 per unit",
  ch4: "kg CO2e of CH4 per unit",
  n2o: "kg CO2e of N2O per unit",
};

export function ukPassengerBasisValue(
  cell: UkPassengerFactorCell | undefined,
  basis: UkFactorBasis
): number | undefined {
  if (!cell) return undefined;
  const v =
    basis === "total" ? cell.total : basis === "co2" ? cell.co2 : basis === "ch4" ? cell.ch4 : cell.n2o;
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

export function availableUkPassengerBasises(cell: UkPassengerFactorCell | undefined): UkFactorBasis[] {
  if (!cell) return [];
  return UK_PASSENGER_BASIS_ORDER.filter((b) => ukPassengerBasisValue(cell, b) !== undefined);
}

export function passengerUkFactorBasisFromDb(raw: unknown): UkFactorBasis | undefined {
  if (raw === "total" || raw === "co2" || raw === "ch4" || raw === "n2o") return raw;
  return undefined;
}

/**
 * Tooltip copy when `UK_Passenger_factors` has no `type_description` for that type.
 */
export const UK_PASSENGER_VEHICLE_TYPE_TOOLTIP_FALLBACKS: Record<string, string> = {
  Mini: "This is the smallest category of car sometimes referred to as a city car. Examples include: Citroën C1, Fiat/Alfa Romeo 500 and Panda, Peugeot 107, Volkswagen up!, Renault TWINGO, Toyota AYGO, smart fortwo and Hyundai i 10.",
  Supermini:
    "This is a car that is larger than a city car, but smaller than a small family car. Examples include: Ford Fiesta, Renault CLIO, Volkswagen Polo, Citroën C2 and C3, Opel Corsa, Peugeot 208, and Toyota Yaris.",
  "Lower medium":
    "This is a small, compact family car. Examples include: Volkswagen Golf, Ford Focus, Opel Astra, Audi A3, BMW 1 Series, Renault Mégane and Toyota Auris.",
  "Upper medium":
    "This is classed as a large family car. Examples include: BMW 3 Series, ŠKODA Octavia, Volkswagen Passat, Audi A4, Mercedes Benz C Class and Peugeot 508.",
  Executive:
    "These are large cars. Examples include: BMW 5 Series, Audi A5 and A6, Mercedes Benz E Class and Skoda Superb.",
  Luxury:
    "This is a luxury car which is niche in the European market. Examples include: Jaguar XF, Mercedes-Benz S-Class, .BMW 7 series, Audi A8, Porsche Panamera and Lexus LS.",
  Sports:
    "Sport cars are a small, usually two seater with two doors and designed for speed, high acceleration, and manoeuvrability. Examples include: Mercedes-Benz SLK, Audi TT, Porsche 911 and Boxster, and Peugeot RCZ.",
  "Dual purpose 4X4":
    "These are sport utility vehicles (SUVs) which have off-road capabilities and four-wheel drive. Examples include: Suzuki Jimny, Land Rover Discovery and Defender, Toyota Land Cruiser, and Nissan Pathfinder.",
  MPV: "These are multipurpose cars. Examples include: Ford C-Max, Renault Scenic, Volkswagen Touran, Opel Zafira, Ford B-Max, and Citroën C3 Picasso and C4 Picasso.",
  "Small car":
    "Petrol/LPG/CNG - up to a 1.4-litre engine, Diesel - up to a 1.7-litre engine, Others - vehicles models of a similar size (i.e. market segment A or B)",
  "Medium car":
    "Petrol/LPG/CNG - from 1.4-litre to 2.0-litre engine, Diesel - from 1.7-litre to 2.0-litre engine, Others - vehicles models of a similar size (i.e. generally market segment C)",
  "Large car":
    "Petrol/LPG/CNG - 2.0-litre engine + Diesel - 2.0-litre engine + Others - vehicles models of a similar size (i.e. generally market segment D and above)",
  "Average car": "Unknown engine size",
  Small: "Mopeds/scooters up to 125cc.",
  Medium: "Mopeds/scooters 125cc to 500cc.",
  Large: "Mopeds/scooters 500cc +.",
  Average: "Unknown engine size",
};

function normCell(v: unknown): string {
  return String(v ?? "").trim();
}

function parseNumber(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/** Same column names as `UK_Fuel_Factors` / DEFRA-style tables (shared with UK delivery factors). */
export function ukEmissionFactorCellFromRow(row: Record<string, unknown>): UkPassengerFactorCell {
  let total = parseNumber(
    row["kg CO2e"] ??
      row.kg_co2e ??
      row.kgCO2e ??
      row["Kg CO2e"] ??
      row["kg co2e"] ??
      row["KG CO2E"]
  );
  let co2 = parseNumber(
    row["kg CO2e of CO2 per unit"] ??
      row.kg_co2e_of_co2_per_unit ??
      row["kg_co2e_of_co2_per_unit"]
  );
  let ch4 = parseNumber(
    row["kg CO2e of CH4 per unit"] ??
      row.kg_co2e_of_ch4_per_unit ??
      row["kg_co2e_of_ch4_per_unit"]
  );
  let n2o = parseNumber(
    row["kg CO2e of N2O per unit"] ??
      row.kg_co2e_of_n2o_per_unit ??
      row["kg_co2e_of_n2o_per_unit"]
  );

  // Fallback: infer from column names if headers differ slightly (e.g. abbreviated exports).
  if (total === undefined || co2 === undefined || ch4 === undefined || n2o === undefined) {
    for (const [k, v] of Object.entries(row)) {
      const lk = k.toLowerCase().replace(/\s+/g, "_");
      const n = parseNumber(v);
      if (n === undefined) continue;
      if (
        total === undefined &&
        (lk === "kg_co2e" || lk === "kgco2e") &&
        !lk.includes("per_unit") &&
        !lk.includes("ch4") &&
        !lk.includes("n2o") &&
        !lk.includes("co2_per")
      ) {
        total = n;
        continue;
      }
      if (
        co2 === undefined &&
        lk.includes("co2") &&
        lk.includes("per") &&
        !lk.includes("ch4") &&
        !lk.includes("n2o") &&
        lk !== "kg_co2e"
      ) {
        co2 = n;
        continue;
      }
      if (ch4 === undefined && lk.includes("ch4")) {
        ch4 = n;
        continue;
      }
      if (n2o === undefined && lk.includes("n2o")) {
        n2o = n;
      }
    }
  }

  return { total, co2, ch4, n2o };
}

/** Optional hover text columns — first non-empty wins per activity+type. */
function pickTypeDescription(row: Record<string, unknown>): string | null {
  const candidates: unknown[] = [
    row.type_description,
    row.type_tooltip,
    row.description,
    row.tooltip,
    row.hover_text,
    row.notes,
    row["Type description"],
    row["Description"],
  ];
  for (const c of candidates) {
    const s = normCell(c);
    if (s) return s;
  }
  return null;
}

export function buildUkPassengerData(rows: Record<string, unknown>[]): {
  map: UkPassengerFactorsMap;
  typeDescriptions: UkPassengerTypeDescriptions;
} {
  const map: UkPassengerFactorsMap = {};
  const typeDescriptions: UkPassengerTypeDescriptions = {};

  for (const row of rows) {
    const activity = normCell(row.activity ?? row.Activity);
    const type = normCell(row.type ?? row.Type ?? row.vehicle_type ?? row.vehicleType);
    if (activity && type) {
      const desc = pickTypeDescription(row);
      if (desc && !typeDescriptions[activity]?.[type]) {
        if (!typeDescriptions[activity]) typeDescriptions[activity] = {};
        typeDescriptions[activity][type] = desc;
      }
    }

    const unit = normCell(row.unit ?? row.Unit);
    const fuel = normCell(row.fuel_type ?? row.fuelType ?? row["Fuel type"] ?? row["Fuel Type"]);
    if (!activity || !type || !unit || !fuel) continue;

    const parts = ukEmissionFactorCellFromRow(row);
    if (availableUkPassengerBasises(parts).length === 0) continue;

    if (!map[activity]) map[activity] = {};
    if (!map[activity][type]) map[activity][type] = {};
    if (!map[activity][type][unit]) map[activity][type][unit] = {};
    const prev = map[activity][type][unit][fuel] || {};
    map[activity][type][unit][fuel] = {
      ...prev,
      ...(parts.total !== undefined ? { total: parts.total } : {}),
      ...(parts.co2 !== undefined ? { co2: parts.co2 } : {}),
      ...(parts.ch4 !== undefined ? { ch4: parts.ch4 } : {}),
      ...(parts.n2o !== undefined ? { n2o: parts.n2o } : {}),
    };
  }

  return { map, typeDescriptions };
}

export function getUkPassengerFactorCell(
  map: UkPassengerFactorsMap,
  activity?: string,
  vehicleType?: string,
  unit?: string,
  fuelType?: string
): UkPassengerFactorCell | undefined {
  if (!activity || !vehicleType || !unit || !fuelType) return undefined;
  return map[activity]?.[vehicleType]?.[unit]?.[fuelType];
}

export function lookupUkPassengerFactor(
  map: UkPassengerFactorsMap,
  activity?: string,
  vehicleType?: string,
  unit?: string,
  fuelType?: string,
  basis: UkFactorBasis = "total"
): number | undefined {
  const cell = getUkPassengerFactorCell(map, activity, vehicleType, unit, fuelType);
  return ukPassengerBasisValue(cell, basis);
}

const TABLE_CANDIDATES = ["UK_Passenger_factors", "uk_passenger_factors"] as const;

export async function fetchUkPassengerFactorsMap(): Promise<{
  map: UkPassengerFactorsMap;
  typeDescriptions: UkPassengerTypeDescriptions;
  error: string | null;
}> {
  let lastErr: string | null = null;
  for (const table of TABLE_CANDIDATES) {
    const { data, error } = await (supabase as any).from(table).select("*");
    if (!error && Array.isArray(data)) {
      const { map, typeDescriptions } = buildUkPassengerData(data as Record<string, unknown>[]);
      return { map, typeDescriptions, error: null };
    }
    lastErr = error?.message ?? lastErr;
  }
  return { map: {}, typeDescriptions: {}, error: lastErr };
}

export function passengerTypeTooltipText(
  typeDescriptions: UkPassengerTypeDescriptions,
  activity: string | undefined,
  vehicleType: string
): string {
  const fromDb = activity ? typeDescriptions[activity]?.[vehicleType] : undefined;
  if (fromDb) return fromDb;
  return UK_PASSENGER_VEHICLE_TYPE_TOOLTIP_FALLBACKS[vehicleType] || "Vehicle type information";
}

/**
 * EPA + DEFRA factor loaders for motor vehicle loan finance emissions.
 * Score 1 (1a): EPA Mobile Fuel / DEFRA Scope 1 Fuel.
 * Options 2a–3b: EPA on-road/mobile/non-road; DEFRA passenger + delivery.
 */

import { loadIpccFactorTableRows } from "@/integrations/supabase/ipccFactorLoader";
import {
  fetchUkPassengerFactorsMap,
  type UkPassengerFactorsMap,
  type UkPassengerTypeDescriptions,
} from "@/components/emissions/shared/ukPassengerFactors";
import { fetchUkDeliveryFactorsMap, type UkDeliveryFactorsMap } from "@/components/emissions/shared/ukDeliveryFactors";
import { normalizeEpaModelYear } from "@/components/emissions/shared/epaModelYear";
import {
  loadUkFuelFactors,
  ukFactorsToNumericMap,
  type NestedFactorMap,
} from "./pcafFactorLoaders";

export type EpaVehicleSource =
  | "mobile_combustion"
  | "on_road_gasoline"
  | "on_road_diesel"
  | "non_road"
  | "vehicular_footprint";

export type DefraVehicleSource = "passenger" | "delivery" | "fuel";

export type VehicleSource = EpaVehicleSource | DefraVehicleSource;

export const EPA_SOURCE_LABELS: Record<EpaVehicleSource, string> = {
  mobile_combustion: "Mobile Fuel",
  on_road_gasoline: "On-Road Gasoline",
  on_road_diesel: "On-Road Diesel & Alt Fuel",
  non_road: "Non-Road Vehicle",
  vehicular_footprint: "Vehicular Carbon Footprints",
};

export const DEFRA_SOURCE_LABELS: Record<DefraVehicleSource, string> = {
  passenger: "Passenger Vehicle",
  delivery: "Delivery Vehicle",
  fuel: "Scope 1 Fuel",
};

export type EpaMobileFuelOption = { fuelType: string; unit: string; factorKg: number };

export type OnRoadGasolineFactor = {
  id: string | number;
  vehicleType: string;
  modelYear: string;
  co2e_g_per_mile?: number;
  co2_g_per_mile?: number;
  ch4_g_per_mile?: number;
  n2o_g_per_mile?: number;
};

export type OnRoadDieselFactor = {
  id: string | number;
  vehicleType: string;
  fuelType: string;
  modelYear?: string;
  co2e_g_per_mile?: number;
  co2_g_per_mile?: number;
  ch4_g_per_mile?: number;
  n2o_g_per_mile?: number;
};

export type NonRoadFactor = {
  id: string | number;
  vehicleType: string;
  fuelType: string;
  co2e_g_per_gallon?: number;
  co2_g_per_gallon?: number;
  ch4_g_per_gallon?: number;
  n2o_g_per_gallon?: number;
};

export type VehicularFootprintFactors = {
  dieselKgPerL: number;
  petrolKgPerL: number;
};

export type MotorVehicleFactorLibraries = {
  mobileFuels: EpaMobileFuelOption[];
  onRoadGasoline: OnRoadGasolineFactor[];
  onRoadDiesel: OnRoadDieselFactor[];
  nonRoad: NonRoadFactor[];
  vehicularFootprint: VehicularFootprintFactors;
  passengerMap: UkPassengerFactorsMap;
  passengerTypeDescriptions: UkPassengerTypeDescriptions;
  deliveryMap: UkDeliveryFactorsMap;
  ukFuelMap: NestedFactorMap;
};

const DEFAULT_VEHICULAR: VehicularFootprintFactors = { dieselKgPerL: 2.7, petrolKgPerL: 2.32 };

const parseNum = (v: unknown): number | undefined => {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (v == null) return undefined;
  const n = parseFloat(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : undefined;
};

const pickFirstKey = (row: Record<string, unknown>, patterns: RegExp[]): unknown => {
  const keys = Object.keys(row || {});
  for (const p of patterns) {
    const k = keys.find((kk) => p.test(kk));
    if (k) return row[k];
  }
  return undefined;
};

const pickNumber = (row: Record<string, unknown>, patterns: RegExp[]) =>
  parseNum(pickFirstKey(row, patterns));

const fuelLabel = (row: Record<string, unknown>) =>
  String(
    pickFirstKey(row, [/fuel\s*type/i, /fuel/i, /description/i, /category/i]) ?? ""
  ).toLowerCase();

const toFactorPerLiter = (row: Record<string, unknown>): number | null => {
  const gallon = parseNum(
    pickFirstKey(row, [
      /kg\s*co2\s*per\s*unit/i,
      /kg\s*co2\s*\/\s*gallon/i,
      /emission factor.*gallon/i,
    ])
  );
  if (gallon != null && gallon > 0) return gallon / 3.785411784;
  const liter = parseNum(pickFirstKey(row, [/kg\s*co2\s*\/\s*l/i, /per\s*liter/i, /per\s*litre/i]));
  return liter != null && liter > 0 ? liter : null;
};

export function epaSourcesForPcafOption(optionCode: string | undefined, fuelPath: boolean): EpaVehicleSource[] {
  if (fuelPath || optionCode === "1a") {
    return ["mobile_combustion"];
  }
  return ["on_road_gasoline", "on_road_diesel", "mobile_combustion", "non_road"];
}

export function defraSourcesForPcafOption(optionCode: string | undefined, fuelPath: boolean): DefraVehicleSource[] {
  if (fuelPath || optionCode === "1a") {
    return ["fuel"];
  }
  return ["passenger", "delivery"];
}

export function defraSources(): DefraVehicleSource[] {
  return ["passenger", "delivery"];
}

/** Score 1 (Option 1a) Mobile Fuel — CNG, LPG, LNG, and diesel only. */
export function isScore1aMobileFuel(fuelType: string): boolean {
  const t = fuelType.toLowerCase();
  if (t.includes("biodiesel")) return false;
  return (
    /\bcng\b/.test(t) ||
    t.includes("compressed natural") ||
    /\blpg\b/.test(t) ||
    t.includes("liquefied petroleum") ||
    /\blng\b/.test(t) ||
    t.includes("liquefied natural") ||
    /\bdiesel\b/.test(t)
  );
}

/** Score 1 DEFRA Scope 1 Fuel — mineral petrol, mineral diesel, CNG, LPG only. */
export function isScore1aDefraFuel(fuel: string): boolean {
  const t = fuel.trim().toLowerCase().replace(/\s+/g, " ");
  if (t === "petrol (100% mineral petrol)" || (t.includes("100%") && t.includes("mineral petrol"))) {
    return true;
  }
  if (t === "diesel (100% mineral diesel)" || (t.includes("100%") && t.includes("mineral diesel"))) {
    return true;
  }
  return t === "cng" || t === "lpg";
}

export async function loadMotorVehicleFactorLibraries(
  factorLibrary: "EPA" | "DEFRA"
): Promise<{ libs: MotorVehicleFactorLibraries; error: string | null }> {
  const empty: MotorVehicleFactorLibraries = {
    mobileFuels: [],
    onRoadGasoline: [],
    onRoadDiesel: [],
    nonRoad: [],
    vehicularFootprint: DEFAULT_VEHICULAR,
    passengerMap: {},
    passengerTypeDescriptions: {},
    deliveryMap: {},
    ukFuelMap: {},
  };

  if (factorLibrary === "DEFRA") {
    const [passenger, delivery, ukFuel] = await Promise.all([
      fetchUkPassengerFactorsMap(),
      fetchUkDeliveryFactorsMap(),
      loadUkFuelFactors(),
    ]);
    const ukFuelMap = ukFactorsToNumericMap(ukFuel);
    const error =
      passenger.error ||
      delivery.error ||
      (Object.keys(passenger.map).length === 0 &&
      Object.keys(delivery.map).length === 0 &&
      Object.keys(ukFuelMap).length === 0
        ? "Could not load DEFRA passenger, delivery, or Scope 1 Fuel factors."
        : null);
    return {
      libs: {
        ...empty,
        passengerMap: passenger.map,
        passengerTypeDescriptions: passenger.typeDescriptions,
        deliveryMap: delivery.map,
        ukFuelMap,
      },
      error,
    };
  }

  const [mobileLoaded, gasolineLoaded, dieselLoaded, nonRoadLoaded] = await Promise.all([
    loadIpccFactorTableRows(["Mobile Combustion", "mobile_combustion", "MobileCombustion"]),
    loadIpccFactorTableRows(["On-Road Gasoline", "on_road_gasoline"]),
    loadIpccFactorTableRows(["On-Road Diesel & Alt Fuel", "on_road_diesel_alt_fuel"]),
    loadIpccFactorTableRows(["Non-Road Vehicle", "non_road_vehicle"]),
  ]);

  const mobileFuels: EpaMobileFuelOption[] = mobileLoaded.rows
    .map((row) => {
      const r = row as Record<string, unknown>;
      const fuelType = String(
        r["Fuel Type"] ?? r.FuelType ?? r.fuel_type ?? r.fuelType ?? ""
      ).trim();
      const unit = String(r.Unit ?? r.unit ?? "gallon").trim() || "gallon";
      const raw = r["kg CO2 per unit"] ?? r.kg_co2_per_unit ?? r.kgCo2PerUnit;
      const factorKg = typeof raw === "number" ? raw : parseFloat(String(raw ?? ""));
      if (!fuelType || !Number.isFinite(factorKg)) return null;
      return { fuelType, unit, factorKg };
    })
    .filter((x): x is EpaMobileFuelOption => !!x);

  const onRoadGasoline: OnRoadGasolineFactor[] = gasolineLoaded.rows
    .map((row) => {
      const r = row as Record<string, unknown>;
      const vehicleType = String(
        pickFirstKey(r, [/^Vehicle\s*Type$/i, /vehicle[_\s]*type/i]) ?? ""
      ).trim();
      const modelYear = normalizeEpaModelYear(
        pickFirstKey(r, [/^Model\s*Year$/i, /model[_\s]*year/i, /^year$/i]) ?? ""
      );
      if (!vehicleType || !modelYear) return null;
      return {
        id: (r.id ?? r.ID ?? r.Id ?? `${vehicleType}-${modelYear}`) as string | number,
        vehicleType,
        modelYear,
        co2e_g_per_mile: pickNumber(r, [/co2e\s*factor/i, /co2[_\s]*equivalent/i, /ghg\s*factor/i]),
        co2_g_per_mile: pickNumber(r, [/^CO2\s*Factor/i, /co2[_\s]*factor/i]),
        ch4_g_per_mile: pickNumber(r, [/^CH4\s*Factor/i, /ch4[_\s]*factor/i]),
        n2o_g_per_mile: pickNumber(r, [/^N2O\s*Factor/i, /n2o[_\s]*factor/i]),
      };
    })
    .filter((x) => x != null) as OnRoadGasolineFactor[];

  const onRoadDiesel: OnRoadDieselFactor[] = dieselLoaded.rows
    .map((row) => {
      const r = row as Record<string, unknown>;
      const vehicleType = String(
        pickFirstKey(r, [/^Vehicle\s*Type$/i, /vehicle[_\s]*type/i]) ?? ""
      ).trim();
      const fuelType = String(
        pickFirstKey(r, [/^Fuel\s*Type$/i, /fuel[_\s]*type/i]) ?? ""
      ).trim();
      const modelYear = normalizeEpaModelYear(
        pickFirstKey(r, [/^Model\s*Year$/i, /model[_\s]*year/i, /^year$/i]) ?? ""
      );
      if (!vehicleType || !fuelType) return null;
      return {
        id: (r.id ?? r.ID ?? r.Id ?? `${vehicleType}-${fuelType}`) as string | number,
        vehicleType,
        fuelType,
        modelYear: modelYear || undefined,
        co2e_g_per_mile: pickNumber(r, [/co2e\s*factor/i, /co2[_\s]*equivalent/i, /ghg\s*factor/i]),
        co2_g_per_mile: pickNumber(r, [/^CO2\s*Factor/i, /co2[_\s]*factor/i]),
        ch4_g_per_mile: pickNumber(r, [/^CH4\s*Factor/i, /ch4[_\s]*factor/i]),
        n2o_g_per_mile: pickNumber(r, [/^N2O\s*Factor/i, /n2o[_\s]*factor/i]),
      };
    })
    .filter((x) => x != null) as OnRoadDieselFactor[];

  const nonRoad: NonRoadFactor[] = nonRoadLoaded.rows
    .map((row) => {
      const r = row as Record<string, unknown>;
      const vehicleType = String(
        pickFirstKey(r, [/^Vehicle\s*Type$/i, /vehicle[_\s]*type/i]) ?? ""
      ).trim();
      const fuelType = String(
        pickFirstKey(r, [/^Fuel\s*Type$/i, /fuel[_\s]*type/i]) ?? ""
      ).trim();
      if (!vehicleType || !fuelType) return null;
      return {
        id: (r.id ?? r.ID ?? r.Id ?? `${vehicleType}-${fuelType}`) as string | number,
        vehicleType,
        fuelType,
        co2e_g_per_gallon: pickNumber(r, [/co2e\s*factor/i, /co2[_\s]*equivalent/i, /ghg\s*factor/i]),
        co2_g_per_gallon: pickNumber(r, [/^CO2\s*Factor/i, /co2[_\s]*factor/i, /g\s*co2/i]),
        ch4_g_per_gallon: pickNumber(r, [/^CH4\s*Factor/i, /ch4[_\s]*factor/i, /g\s*ch4/i]),
        n2o_g_per_gallon: pickNumber(r, [/^N2O\s*Factor/i, /n2o[_\s]*factor/i, /g\s*n2o/i]),
      };
    })
    .filter((x) => x != null) as NonRoadFactor[];

  let vehicularFootprint = DEFAULT_VEHICULAR;
  if (mobileLoaded.rows.length > 0) {
    const dieselRow = mobileLoaded.rows.find((row) =>
      fuelLabel(row as Record<string, unknown>).includes("diesel")
    ) as Record<string, unknown> | undefined;
    const petrolRow = mobileLoaded.rows.find((row) => {
      const label = fuelLabel(row as Record<string, unknown>);
      return label.includes("motor gasoline") || label.includes("gasoline") || label.includes("petrol");
    }) as Record<string, unknown> | undefined;
    const diesel = dieselRow ? toFactorPerLiter(dieselRow) : null;
    const petrol = petrolRow ? toFactorPerLiter(petrolRow) : null;
    vehicularFootprint = {
      dieselKgPerL: diesel ?? DEFAULT_VEHICULAR.dieselKgPerL,
      petrolKgPerL: petrol ?? DEFAULT_VEHICULAR.petrolKgPerL,
    };
  }

  const errors = [
    mobileLoaded.attemptErrors[0],
    gasolineLoaded.attemptErrors[0],
    dieselLoaded.attemptErrors[0],
    nonRoadLoaded.attemptErrors[0],
  ].filter(Boolean);

  const error =
    mobileFuels.length === 0 &&
    onRoadGasoline.length === 0 &&
    onRoadDiesel.length === 0 &&
    nonRoad.length === 0
      ? errors[0] || "Could not load EPA mobile / vehicle factor tables."
      : null;

  return {
    libs: {
      mobileFuels,
      onRoadGasoline,
      onRoadDiesel,
      nonRoad,
      vehicularFootprint,
      passengerMap: {},
      passengerTypeDescriptions: {},
      deliveryMap: {},
      ukFuelMap: {},
    },
    error,
  };
}

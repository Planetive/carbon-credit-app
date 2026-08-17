import { localMobileFuelEmissionsKg, localOnRoadEmissionsKg, localUkFuelEmissionsKg } from "@/api/calcConnection";
import {
  getUkDeliveryFactorCell,
  ukDeliveryBasisValue,
} from "@/components/emissions/shared/ukDeliveryFactors";
import {
  getUkPassengerFactorCell,
  ukPassengerBasisValue,
} from "@/components/emissions/shared/ukPassengerFactors";
import type { UkFactorBasis } from "@/components/emissions/shared/types";
import type {
  DefraVehicleSource,
  EpaVehicleSource,
  MotorVehicleFactorLibraries,
  OnRoadDieselFactor,
  OnRoadGasolineFactor,
  NonRoadFactor,
} from "./motorVehicleFactorLoaders";

const LITERS_PER_GALLON = 3.785411784;
const AVERAGE_VEHICLE_EFFICIENCY = 0.08;
const ELECTRIC_KWH_PER_KM = 0.16;

const TYPE_EFFICIENCY_L_PER_KM: Record<string, Record<string, number>> = {
  "Cars (by market segment)": {
    Mini: 0.05,
    Supermini: 0.055,
    "Lower medium": 0.065,
    "Upper medium": 0.075,
    Executive: 0.085,
    Luxury: 0.1,
    Sports: 0.095,
    "Dual purpose 4X4": 0.1,
    MPV: 0.085,
  },
  "Cars (by size)": {
    "Small car": 0.06,
    "Medium car": 0.08,
    "Large car": 0.1,
    "Average car": 0.08,
  },
  Motorbike: { Small: 0.03, Medium: 0.04, Large: 0.055, Average: 0.04 },
};

export type OnRoadEmissionSelection = "co2e" | "ch4_only" | "n2o_only" | "ch4" | "n2o";
export type DistanceUnit = "mile" | "km";
export type NonRoadUnit = "gallon" | "liter";

export type MotorVehicleEntryInput = {
  vehicleSource: EpaVehicleSource | DefraVehicleSource;
  activity: string;
  vehicleType: string;
  unit: string;
  fuelType: string;
  modelYear?: string;
  ladenLevel?: string;
  ukFactorBasis?: UkFactorBasis;
  emissionSelection?: OnRoadEmissionSelection;
  distanceUnit?: DistanceUnit;
  nonRoadUnit?: NonRoadUnit;
  /** User-entered unit when the EPA table factor is per gallon. */
  inputUnit?: "gallon" | "liter";
  distance: number;
  fuelConsumption: number;
  dieselLitres: number;
  petrolLitres: number;
  efficiency: number;
};

export type MotorVehicleEntryDerived = {
  emissions: number;
  factorKg: number;
  factor: number;
  efficiency: number;
  unit: string;
  formulaHint: string;
};

function isGallonUnit(unit: string) {
  return unit.toLowerCase().includes("gallon");
}

function onRoadGPerMile(
  row: OnRoadGasolineFactor | OnRoadDieselFactor,
  selection: OnRoadEmissionSelection = "co2e"
): number {
  if (row.co2e_g_per_mile && row.co2e_g_per_mile > 0) return row.co2e_g_per_mile;
  if (row.co2_g_per_mile && row.co2_g_per_mile > 0) return row.co2_g_per_mile;
  if (selection === "n2o_only" || selection === "n2o") return row.n2o_g_per_mile ?? 0;
  return row.ch4_g_per_mile ?? 0;
}

function nonRoadGPerGallon(row: NonRoadFactor, selection: OnRoadEmissionSelection = "co2e"): number {
  if (row.co2e_g_per_gallon && row.co2e_g_per_gallon > 0) return row.co2e_g_per_gallon;
  if (row.co2_g_per_gallon && row.co2_g_per_gallon > 0) return row.co2_g_per_gallon;
  if (selection === "n2o_only" || selection === "n2o") return row.n2o_g_per_gallon ?? 0;
  return row.ch4_g_per_gallon ?? 0;
}

function typeEfficiency(activity: string, vehicleType: string, fuelType: string) {
  if (/electric|ev\b/i.test(fuelType)) return ELECTRIC_KWH_PER_KM;
  return TYPE_EFFICIENCY_L_PER_KM[activity]?.[vehicleType] ?? AVERAGE_VEHICLE_EFFICIENCY;
}

export function computeMotorVehicleEntryEmissions(
  entry: MotorVehicleEntryInput,
  libs: MotorVehicleFactorLibraries,
  ctx: {
    fuelPath: boolean;
    typeEfficiencyPath: boolean;
    averageEfficiencyPath: boolean;
  }
): MotorVehicleEntryDerived {
  const source = entry.vehicleSource;

  if (source === "fuel") {
    const factorKg = libs.ukFuelMap[entry.activity]?.[entry.fuelType]?.[entry.unit] ?? 0;
    const kg = localUkFuelEmissionsKg(entry.fuelConsumption, factorKg);
    return {
      emissions: kg / 1000,
      factorKg,
      factor: factorKg / 1000,
      efficiency: entry.efficiency,
      unit: entry.unit,
      formulaHint: `${entry.fuelConsumption} ${entry.unit || "unit"} × ${factorKg.toFixed(6)} kg/${entry.unit || "unit"} ÷ 1000`,
    };
  }

  if (source === "passenger" || source === "delivery") {
    const basis = entry.ukFactorBasis ?? "total";
    const cell =
      source === "passenger"
        ? getUkPassengerFactorCell(
            libs.passengerMap,
            entry.activity,
            entry.vehicleType,
            entry.unit,
            entry.fuelType
          )
        : getUkDeliveryFactorCell(
            libs.deliveryMap,
            entry.activity,
            entry.vehicleType,
            entry.unit,
            entry.fuelType,
            entry.ladenLevel
          );
    const factorKg =
      source === "passenger"
        ? ukPassengerBasisValue(cell, basis) ?? 0
        : ukDeliveryBasisValue(cell, basis) ?? 0;
    const emissions = (entry.distance * factorKg) / 1000;
    return {
      emissions,
      factorKg,
      factor: factorKg / 1000,
      efficiency: entry.efficiency,
      unit: entry.unit || "km",
      formulaHint: `${entry.distance} × ${factorKg.toFixed(6)} kg/${entry.unit || "km"} ÷ 1000`,
    };
  }

  if (source === "vehicular_footprint") {
    const dieselKg = entry.dieselLitres * libs.vehicularFootprint.dieselKgPerL;
    const petrolKg = entry.petrolLitres * libs.vehicularFootprint.petrolKgPerL;
    const totalKg = dieselKg + petrolKg;
    const emissions = totalKg / 1000;
    return {
      emissions,
      factorKg: 0,
      factor: 0,
      efficiency: entry.efficiency,
      unit: "L",
      formulaHint: `${entry.dieselLitres} L diesel × ${libs.vehicularFootprint.dieselKgPerL} + ${entry.petrolLitres} L petrol × ${libs.vehicularFootprint.petrolKgPerL} ÷ 1000`,
    };
  }

  if (source === "on_road_gasoline") {
    const row = libs.onRoadGasoline.find(
      (f) => f.vehicleType === entry.vehicleType && f.modelYear === entry.modelYear
    );
    const gPerMile = row ? onRoadGPerMile(row, entry.emissionSelection) : 0;
    const kg = localOnRoadEmissionsKg(
      entry.distance,
      entry.distanceUnit || "mile",
      gPerMile
    );
    return {
      emissions: kg / 1000,
      factorKg: gPerMile,
      factor: gPerMile / 1000,
      efficiency: entry.efficiency,
      unit: entry.distanceUnit || "mile",
      formulaHint: row
        ? `${entry.distance} ${entry.distanceUnit || "mile"} × ${gPerMile.toFixed(6)} g/mile ÷ 1000`
        : "Select vehicle type and model year",
    };
  }

  if (source === "on_road_diesel") {
    const row = libs.onRoadDiesel.find(
      (f) =>
        f.vehicleType === entry.vehicleType &&
        f.fuelType === entry.fuelType &&
        (!entry.modelYear || !f.modelYear || f.modelYear === entry.modelYear)
    );
    const gPerMile = row ? onRoadGPerMile(row, entry.emissionSelection) : 0;
    const kg = localOnRoadEmissionsKg(
      entry.distance,
      entry.distanceUnit || "mile",
      gPerMile
    );
    return {
      emissions: kg / 1000,
      factorKg: gPerMile,
      factor: gPerMile / 1000,
      efficiency: entry.efficiency,
      unit: entry.distanceUnit || "mile",
      formulaHint: row
        ? `${entry.distance} ${entry.distanceUnit || "mile"} × ${gPerMile.toFixed(6)} g/mile ÷ 1000`
        : "Select vehicle type, fuel, and model year",
    };
  }

  if (source === "non_road") {
    const row = libs.nonRoad.find(
      (f) => f.vehicleType === entry.vehicleType && f.fuelType === entry.fuelType
    );
    const gPerGallon = row ? nonRoadGPerGallon(row, entry.emissionSelection) : 0;
    let qty = entry.fuelConsumption;
    if (entry.nonRoadUnit === "liter") qty = qty / LITERS_PER_GALLON;
    const kg = (qty * gPerGallon) / 1000;
    return {
      emissions: kg / 1000,
      factorKg: gPerGallon,
      factor: gPerGallon / 1000,
      efficiency: entry.efficiency,
      unit: entry.nonRoadUnit || "gallon",
      formulaHint: `${entry.fuelConsumption} ${entry.nonRoadUnit || "gallon"} × ${gPerGallon.toFixed(6)} g/gal ÷ 1000`,
    };
  }

  // mobile_combustion
  const mobile = libs.mobileFuels.find((f) => f.fuelType === entry.fuelType);
  const factorKg = mobile?.factorKg ?? 0;
  const unit = mobile?.unit || entry.unit || "gallon";

  if (ctx.fuelPath) {
    const inputUnit = isGallonUnit(unit) ? entry.inputUnit || "gallon" : unit;
    const kg = isGallonUnit(unit)
      ? localMobileFuelEmissionsKg(entry.fuelConsumption, factorKg, inputUnit)
      : entry.fuelConsumption * factorKg;
    const emissions = kg / 1000;
    const qtyHint =
      isGallonUnit(unit) && inputUnit === "liter"
        ? `${entry.fuelConsumption} L ÷ 3.78541 gal`
        : `${entry.fuelConsumption} ${inputUnit || unit}`;
    return {
      emissions,
      factorKg,
      factor: factorKg / 1000,
      efficiency: entry.efficiency,
      unit,
      formulaHint: `${qtyHint} × ${factorKg.toFixed(6)} kg/${unit} ÷ 1000`,
    };
  }

  let efficiency = entry.efficiency;
  if (ctx.averageEfficiencyPath) {
    efficiency = /electric|ev\b/i.test(entry.fuelType) ? ELECTRIC_KWH_PER_KM : AVERAGE_VEHICLE_EFFICIENCY;
  } else if (ctx.typeEfficiencyPath) {
    efficiency = typeEfficiency(entry.activity, entry.vehicleType, entry.fuelType);
  }

  let fuelUsed = entry.distance * efficiency;
  if (isGallonUnit(unit)) fuelUsed = fuelUsed / LITERS_PER_GALLON;
  const emissions = (fuelUsed * factorKg) / 1000;
  return {
    emissions,
    factorKg,
    factor: factorKg / 1000,
    efficiency,
    unit,
    formulaHint: `${entry.distance} × ${efficiency} × ${factorKg.toFixed(6)} kg ÷ 1000`,
  };
}

import type {
  GasBreakdown,
  MobileDataAvailable,
  MobileEquipmentKind,
  MobileRoadClass,
} from "../types";
import { MOBILE_EQUIPMENT_OPTIONS } from "../types";
import { AR5_GWP100, round6, toGallons, toMiles } from "./units";

export type MobileFactorSheets = {
  /** Mobile Combustion — typically kg CO2 per gallon (combined CO2 factor, not full inventory). */
  mobileCombustionCo2KgPerGallon?: number;
  /** On-road / non-road CH4 factor in g per mile or g per gallon. */
  ch4GPerActivity?: number;
  /** On-road / non-road N2O factor in g per mile or g per gallon. */
  n2oGPerActivity?: number;
  activityBasis: "per_mile" | "per_gallon";
  distanceSheetName?: string;
  fuelSheetName?: string;
};

export function resolveMobileEquipment(kind: MobileEquipmentKind) {
  const hit = MOBILE_EQUIPMENT_OPTIONS.find((o) => o.id === kind);
  if (!hit) {
    throw new Error(`Unknown mobile equipment kind: ${kind}`);
  }
  return hit;
}

export function roadClassForEquipment(kind: MobileEquipmentKind): MobileRoadClass {
  return resolveMobileEquipment(kind).roadClass;
}

/**
 * Route which sheets/methods apply.
 * Road class comes from equipment — never from whether litres are available.
 */
export function planMobileCalculation(input: {
  equipment: MobileEquipmentKind;
  dataAvailable: MobileDataAvailable;
  fuelLabel?: string;
}): {
  roadClass: MobileRoadClass;
  useFuelSheet: boolean;
  useDistanceSheet: boolean;
  distanceSheet: string | null;
  fuelSheet: string;
  notes: string[];
} {
  const eq = resolveMobileEquipment(input.equipment);
  const notes: string[] = [];
  const wantFuel = input.dataAvailable === "fuel" || input.dataAvailable === "both";
  const wantDistance = input.dataAvailable === "distance" || input.dataAvailable === "both";

  if (wantDistance && !eq.distanceSheet) {
    notes.push("No distance-based factor sheet is configured for this equipment type.");
  }

  // Prefer gasoline on-road sheet for gasoline-like fuels; diesel sheet for diesel/alt.
  let distanceSheet = eq.distanceSheet;
  if (eq.roadClass === "on_road" && wantDistance && input.fuelLabel) {
    const f = input.fuelLabel.toLowerCase();
    if (f.includes("diesel") || f.includes("biodiesel") || f.includes("cng") || f.includes("lng")) {
      distanceSheet = "On-Road Diesel & Alt Fuel";
    } else if (f.includes("gasoline") || f.includes("petrol") || f.includes("gasohol") || f.includes("ethanol")) {
      distanceSheet = "On-Road Gasoline";
    }
  }

  return {
    roadClass: eq.roadClass,
    useFuelSheet: wantFuel,
    useDistanceSheet: wantDistance && !!distanceSheet,
    distanceSheet: distanceSheet,
    fuelSheet: "Mobile Combustion",
    notes,
  };
}

/**
 * Assemble one activity result.
 * - Mobile Combustion CO2 factor is treated as CO2-only mass (kg CO2 / gallon), not a full CO2e inventory.
 * - On-road/non-road CH4/N2O are supplementary gases; never add them onto a factor already labeled combined CO2e.
 * - If only distance data exists, CO2 is missing unless fuel is estimated with documented efficiency.
 */
export function assembleMobileActivityResult(input: {
  dataAvailable: MobileDataAvailable;
  fuelQuantity?: number;
  fuelUnit?: string;
  distance?: number;
  distanceUnit?: string;
  /** Documented fuel efficiency: distance per fuel unit (e.g. miles per gallon). */
  fuelEfficiency?: number;
  fuelEfficiencyUnit?: string;
  fuelEfficiencySource?: string;
  factors: MobileFactorSheets;
  /** If true, treat mobile combustion factor as already-combined CO2e (rare). Default false. */
  fuelFactorIsCombinedCo2e?: boolean;
}): GasBreakdown {
  const missing: string[] = [];
  const notes: string[] = [...(input.factors.fuelSheetName ? [`Fuel sheet: ${input.factors.fuelSheetName}`] : [])];
  if (input.factors.distanceSheetName) {
    notes.push(`Distance/supplementary sheet: ${input.factors.distanceSheetName}`);
  }

  let co2Kg: number | undefined;
  let ch4Kg: number | undefined;
  let n2oKg: number | undefined;
  let co2eCombinedKg: number | undefined;
  let estimated = false;

  const wantFuel = input.dataAvailable === "fuel" || input.dataAvailable === "both";
  const wantDistance = input.dataAvailable === "distance" || input.dataAvailable === "both";

  // Resolve fuel quantity (measured or estimated from distance).
  let gallons: number | undefined;
  if (wantFuel) {
    if (typeof input.fuelQuantity === "number" && input.fuelQuantity >= 0 && input.fuelUnit) {
      gallons = toGallons(input.fuelQuantity, input.fuelUnit);
    } else {
      missing.push("Fuel consumption quantity and unit");
    }
  } else if (wantDistance && typeof input.distance === "number") {
    // Estimating fuel from distance requires documented efficiency — never invent MPG.
    if (
      typeof input.fuelEfficiency === "number" &&
      input.fuelEfficiency > 0 &&
      input.fuelEfficiencySource &&
      input.fuelEfficiencySource.trim()
    ) {
      const miles = toMiles(input.distance, input.distanceUnit || "miles");
      // Assume efficiency is miles per gallon unless unit says otherwise.
      const effUnit = String(input.fuelEfficiencyUnit || "mpg").toLowerCase();
      if (effUnit.includes("km") && effUnit.includes("l")) {
        // km/L → miles/gallon ≈ (km/L) * 2.35215
        gallons = miles / (input.fuelEfficiency * 2.35215);
      } else {
        gallons = miles / input.fuelEfficiency;
      }
      estimated = true;
      notes.push(
        `Fuel estimated from distance using documented efficiency (${input.fuelEfficiency} ${input.fuelEfficiencyUnit || "mpg"}; source: ${input.fuelEfficiencySource}).`
      );
    } else if (wantDistance && !wantFuel) {
      missing.push(
        "Documented fuel efficiency (value, units, and source) to estimate fuel from distance — CO2 cannot be completed from CH4/N2O tables alone"
      );
    }
  }

  // CO2 from Mobile Combustion fuel factor.
  if (typeof gallons === "number") {
    if (typeof input.factors.mobileCombustionCo2KgPerGallon !== "number") {
      missing.push("Mobile Combustion CO2 factor (kg CO2 per gallon) for the selected fuel");
    } else if (input.fuelFactorIsCombinedCo2e) {
      co2eCombinedKg = round6(gallons * input.factors.mobileCombustionCo2KgPerGallon);
      notes.push("Fuel factor treated as combined CO2e — CH4/N2O not added on top.");
    } else {
      co2Kg = round6(gallons * input.factors.mobileCombustionCo2KgPerGallon);
    }
  }

  // CH4 / N2O from distance or fuel activity factors (complementary, not interchangeable totals).
  if (wantDistance || wantFuel) {
    const basis = input.factors.activityBasis;
    if (basis === "per_mile") {
      if (typeof input.distance !== "number") {
        if (wantDistance) missing.push("Distance travelled");
      } else {
        const miles = toMiles(input.distance, input.distanceUnit || "miles");
        if (typeof input.factors.ch4GPerActivity === "number") {
          ch4Kg = (input.factors.ch4GPerActivity * miles) / 1000;
        } else if (wantDistance) {
          missing.push("CH4 factor (g/mile) from the on-road / non-road sheet");
        }
        if (typeof input.factors.n2oGPerActivity === "number") {
          n2oKg = (input.factors.n2oGPerActivity * miles) / 1000;
        } else if (wantDistance) {
          missing.push("N2O factor (g/mile) from the on-road / non-road sheet");
        }
      }
    } else if (basis === "per_gallon" && typeof gallons === "number") {
      if (typeof input.factors.ch4GPerActivity === "number") {
        ch4Kg = (input.factors.ch4GPerActivity * gallons) / 1000;
      }
      if (typeof input.factors.n2oGPerActivity === "number") {
        n2oKg = (input.factors.n2oGPerActivity * gallons) / 1000;
      }
    }
  }

  // Block if we cannot produce a meaningful result.
  const uniqueMissing = [...new Set(missing)];
  if (co2eCombinedKg != null) {
    return {
      co2eCombinedKg,
      totalCo2eKg: co2eCombinedKg,
      coverage: "co2e_combined",
      completeness: estimated ? "estimated" : "complete_co2e",
      missing: uniqueMissing.length ? uniqueMissing : undefined,
      notes,
    };
  }

  const hasCo2 = typeof co2Kg === "number";
  const hasCh4 = typeof ch4Kg === "number";
  const hasN2o = typeof n2oKg === "number";

  if (!hasCo2 && !hasCh4 && !hasN2o) {
    return {
      totalCo2eKg: 0,
      coverage: "partial_gases",
      completeness: "blocked_missing_data",
      missing: uniqueMissing.length
        ? uniqueMissing
        : ["No calculable gas components for the selected data"],
      notes,
    };
  }

  // Assemble CO2e from components; never double-count combined factors.
  let total = 0;
  if (hasCo2) total += co2Kg!;
  if (hasCh4) total += ch4Kg! * AR5_GWP100.CH4;
  if (hasN2o) total += n2oKg! * AR5_GWP100.N2O;
  total = round6(total);

  if (hasCh4 || hasN2o) {
    notes.push(
      `CH4/N2O converted to CO2e using AR5 100-year GWP (CH4=${AR5_GWP100.CH4}, N2O=${AR5_GWP100.N2O}).`
    );
  }

  const coverage: GasBreakdown["coverage"] =
    hasCo2 && hasCh4 && hasN2o
      ? "co2_ch4_n2o_assembled"
      : hasCo2 && !hasCh4 && !hasN2o
        ? "co2_only"
        : hasCh4 && hasN2o && !hasCo2
          ? "ch4_and_n2o"
          : hasCh4 && !hasN2o
            ? "ch4_only"
            : hasN2o && !hasCh4
              ? "n2o_only"
              : "partial_gases";

  const completeness: GasBreakdown["completeness"] = uniqueMissing.length
    ? "partial_gases"
    : estimated
      ? "estimated"
      : hasCo2 && hasCh4 && hasN2o
        ? "complete_co2e"
        : "partial_gases";

  if (!hasCo2 && (hasCh4 || hasN2o)) {
    notes.push(
      "Result includes only CH4/N2O (and their CO2e). CO2 from fuel combustion is not included — do not treat this as a complete mobile total."
    );
  }

  return {
    co2Kg,
    ch4Kg,
    n2oKg,
    totalCo2eKg: total,
    coverage,
    completeness,
    missing: uniqueMissing.length ? uniqueMissing : undefined,
    notes,
  };
}

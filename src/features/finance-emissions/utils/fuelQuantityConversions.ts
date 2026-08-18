/**
 * Fuel quantity conversions for motor vehicle Score 1 (actual consumption).
 * Converts user input (gallon, liter, scf, cubic metre) to the factor table base unit.
 */

export type FuelQuantityUnit = "gallon" | "liter" | "scf" | "cubic_metre";

export type FactorBaseKind = FuelQuantityUnit | "other";

export const LITERS_PER_GALLON = 3.785411784;
export const SCF_PER_CUBIC_METRE = 35.314666721;

/** EPA gasoline-gallon equivalents (scf per gallon). */
const SCF_PER_GALLON_CNG = 119.31;
const SCF_PER_GALLON_LNG = 82.58;

export const FUEL_INPUT_UNIT_LABELS: Record<FuelQuantityUnit, string> = {
  gallon: "gallon",
  liter: "liter",
  scf: "scf",
  cubic_metre: "cubic metre",
};

const normalize = (unit: string) => unit.trim().toLowerCase().replace(/\s+/g, " ");

export function factorBaseKind(unit: string): FactorBaseKind {
  const u = normalize(unit);
  if (u.includes("gallon")) return "gallon";
  if (u.includes("litre") || u.includes("liter")) return "liter";
  if (u.includes("scf") || u.includes("standard cubic")) return "scf";
  if (u.includes("cubic met")) return "cubic_metre";
  return "other";
}

export function isGaseousMotorFuel(fuelType: string): boolean {
  const t = fuelType.toLowerCase();
  return (
    /\bcng\b/.test(t) ||
    t.includes("compressed natural") ||
    /\blng\b/.test(t) ||
    t.includes("liquefied natural")
  );
}

function scfPerGallon(fuelType: string): number {
  const t = fuelType.toLowerCase();
  if (/\blng\b/.test(t) || t.includes("liquefied natural")) return SCF_PER_GALLON_LNG;
  return SCF_PER_GALLON_CNG;
}

export function defaultInputUnit(base: FactorBaseKind): FuelQuantityUnit {
  if (base === "other") return "gallon";
  return base;
}

/** Input units offered when the factor row uses `baseUnit`. */
export function allowedInputUnits(baseUnit: string, fuelType = ""): FuelQuantityUnit[] {
  const base = factorBaseKind(baseUnit);
  const gaseous = isGaseousMotorFuel(fuelType);

  switch (base) {
    case "gallon":
      return gaseous ? ["gallon", "liter", "scf"] : ["gallon", "liter"];
    case "liter":
      return ["liter", "gallon"];
    case "scf":
      return gaseous ? ["scf", "gallon", "liter"] : ["scf"];
    case "cubic_metre":
      return gaseous ? ["cubic_metre", "scf"] : ["cubic_metre"];
    default:
      return [];
  }
}

export function supportsInputUnitConversion(baseUnit: string, fuelType = ""): boolean {
  return allowedInputUnits(baseUnit, fuelType).length > 1;
}

function gallonsFrom(input: FuelQuantityUnit, quantity: number, fuelType: string): number {
  switch (input) {
    case "gallon":
      return quantity;
    case "liter":
      return quantity / LITERS_PER_GALLON;
    case "scf":
      return quantity / scfPerGallon(fuelType);
    default:
      return quantity;
  }
}

function scfFrom(input: FuelQuantityUnit, quantity: number, fuelType: string): number {
  switch (input) {
    case "scf":
      return quantity;
    case "gallon":
      return quantity * scfPerGallon(fuelType);
    case "liter":
      return gallonsFrom("liter", quantity, fuelType) * scfPerGallon(fuelType);
    case "cubic_metre":
      return quantity * SCF_PER_CUBIC_METRE;
    default:
      return quantity;
  }
}

/** Convert `quantity` from `inputUnit` into the factor table `baseUnit`. */
export function convertQuantityToBase(
  quantity: number,
  inputUnit: FuelQuantityUnit,
  baseUnit: string,
  fuelType = ""
): { baseQuantity: number; hint: string } {
  const base = factorBaseKind(baseUnit);
  if (base === "other" || inputUnit === base) {
    return {
      baseQuantity: quantity,
      hint: `${quantity} ${FUEL_INPUT_UNIT_LABELS[inputUnit] ?? inputUnit}`,
    };
  }

  let baseQuantity = quantity;
  let hint = `${quantity} ${FUEL_INPUT_UNIT_LABELS[inputUnit]}`;

  if (base === "gallon") {
    baseQuantity = gallonsFrom(inputUnit, quantity, fuelType);
    if (inputUnit === "liter") {
      hint = `${quantity} L ÷ ${LITERS_PER_GALLON.toFixed(5)} gal`;
    } else if (inputUnit === "scf") {
      hint = `${quantity} scf ÷ ${scfPerGallon(fuelType)} scf/gal`;
    }
  } else if (base === "liter") {
    if (inputUnit === "gallon") {
      baseQuantity = quantity * LITERS_PER_GALLON;
      hint = `${quantity} gal × ${LITERS_PER_GALLON.toFixed(5)} L`;
    } else {
      baseQuantity = quantity;
    }
  } else if (base === "scf") {
    baseQuantity = scfFrom(inputUnit, quantity, fuelType);
    if (inputUnit === "gallon") {
      hint = `${quantity} gal × ${scfPerGallon(fuelType)} scf/gal`;
    } else if (inputUnit === "liter") {
      const gal = quantity / LITERS_PER_GALLON;
      hint = `${quantity} L → ${gal.toFixed(4)} gal × ${scfPerGallon(fuelType)} scf/gal`;
    } else if (inputUnit === "cubic_metre") {
      hint = `${quantity} m³ × ${SCF_PER_CUBIC_METRE.toFixed(5)} scf/m³`;
    }
  } else if (base === "cubic_metre") {
    if (inputUnit === "scf") {
      baseQuantity = quantity / SCF_PER_CUBIC_METRE;
      hint = `${quantity} scf ÷ ${SCF_PER_CUBIC_METRE.toFixed(5)} m³`;
    }
  }

  return { baseQuantity, hint };
}

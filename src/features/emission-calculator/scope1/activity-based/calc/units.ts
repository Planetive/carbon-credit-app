/** Unit conversions used by Scope 1 activity calculators. */

export const LITERS_PER_GALLON = 3.78541;
export const KM_TO_MILES = 0.621371;

export function toGallons(quantity: number, unit: string): number {
  const u = String(unit || "").toLowerCase();
  if (u.startsWith("liter") || u.startsWith("litre") || u === "l") {
    return quantity / LITERS_PER_GALLON;
  }
  return quantity;
}

export function toMiles(distance: number, unit: string): number {
  const u = String(unit || "").toLowerCase();
  if (u.startsWith("km")) return distance * KM_TO_MILES;
  return distance;
}

export function round6(n: number): number {
  return Number(n.toFixed(6));
}

/** AR5 100-year GWP used only when assembling CH4/N2O kg into CO2e (documented). */
export const AR5_GWP100 = {
  CH4: 28,
  N2O: 265,
} as const;

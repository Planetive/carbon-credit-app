import { round6 } from "./units";
import type { GasBreakdown } from "../types";

/**
 * Stationary combustion: quantity × per-gas factors from Fuel EPA sheets.
 * Does NOT use Mobile Combustion factors for stationary equipment.
 *
 * CO2 factors are typically kg CO2 / unit.
 * CH4 / N2O factors may be g / unit (caller must pass already-normalized kg, or set gasUnit).
 */
export function calculateStationaryCombustion(input: {
  quantity: number;
  /** Selected factor unit label from Fuel EPA (e.g. "CO2 (kg CO2 / mmBtu)"). */
  unitLabel: string;
  co2KgPerUnit?: number;
  ch4KgPerUnit?: number;
  n2oKgPerUnit?: number;
  /** When selecting a single gas factor row (legacy Fuel UI). */
  selectedGas?: "co2" | "ch4" | "n2o";
  selectedFactor?: number;
}): GasBreakdown {
  const missing: string[] = [];
  const notes: string[] = [
    "Stationary combustion uses Fuel EPA 1/2/3 factors only — not Mobile Combustion sheets.",
  ];

  if (!(typeof input.quantity === "number") || input.quantity < 0) {
    return {
      totalCo2eKg: 0,
      coverage: "partial_gases",
      completeness: "blocked_missing_data",
      missing: ["Fuel quantity"],
      notes,
    };
  }

  // Legacy single-row path (current FuelEmissions UX picks one gas column).
  if (input.selectedGas && typeof input.selectedFactor === "number") {
    const unit = input.unitLabel || "";
    const isG =
      unit.startsWith("CH4") ||
      unit.startsWith("N2O") ||
      /\bg\s/i.test(unit) ||
      /\(g\b/i.test(unit);
    let kg = input.quantity * input.selectedFactor;
    if (isG || input.selectedGas === "ch4" || input.selectedGas === "n2o") {
      // Existing app convention: CH4/N2O unit labels starting with CH4/N2O → divide by 1000
      if (unit.startsWith("CH4") || unit.startsWith("N2O") || isG) {
        kg = kg / 1000;
      }
    }
    kg = round6(kg);
    if (input.selectedGas === "co2") {
      return {
        co2Kg: kg,
        totalCo2eKg: kg,
        coverage: "co2_only",
        completeness: "partial_gases",
        notes: [
          ...notes,
          "Single-gas CO2 factor selected. CH4/N2O not included unless entered as separate rows.",
        ],
      };
    }
    if (input.selectedGas === "ch4") {
      return {
        ch4Kg: kg,
        totalCo2eKg: round6(kg * 28),
        coverage: "ch4_only",
        completeness: "partial_gases",
        notes: [
          ...notes,
          "CH4-only row. Not a complete stationary CO2e total. AR5 GWP CH4=28 applied for CO2e display.",
        ],
      };
    }
    return {
      n2oKg: kg,
      totalCo2eKg: round6(kg * 265),
      coverage: "n2o_only",
      completeness: "partial_gases",
      notes: [
        ...notes,
        "N2O-only row. Not a complete stationary CO2e total. AR5 GWP N2O=265 applied for CO2e display.",
      ],
    };
  }

  const co2 = input.co2KgPerUnit;
  const ch4 = input.ch4KgPerUnit;
  const n2o = input.n2oKgPerUnit;
  if (co2 == null && ch4 == null && n2o == null) {
    missing.push("Stationary fuel emission factors (Fuel EPA)");
    return {
      totalCo2eKg: 0,
      coverage: "partial_gases",
      completeness: "blocked_missing_data",
      missing,
      notes,
    };
  }

  const co2Kg = co2 != null ? round6(input.quantity * co2) : undefined;
  const ch4Kg = ch4 != null ? round6(input.quantity * ch4) : undefined;
  const n2oKg = n2o != null ? round6(input.quantity * n2o) : undefined;
  let total = 0;
  if (co2Kg != null) total += co2Kg;
  if (ch4Kg != null) total += ch4Kg * 28;
  if (n2oKg != null) total += n2oKg * 265;

  return {
    co2Kg,
    ch4Kg,
    n2oKg,
    totalCo2eKg: round6(total),
    coverage:
      co2Kg != null && ch4Kg != null && n2oKg != null
        ? "co2_ch4_n2o_assembled"
        : co2Kg != null
          ? "co2_only"
          : "partial_gases",
    completeness:
      co2Kg != null && ch4Kg != null && n2oKg != null ? "complete_co2e" : "partial_gases",
    notes,
  };
}

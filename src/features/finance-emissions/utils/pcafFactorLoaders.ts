import { supabase } from "@/integrations/supabase/client";
import { tryLoadFactorSheetViaApi, tryLoadFactorSheetsViaApi } from "@/api/factorDualRead";
import { FACTORS, SCOPE2_FACTORS } from "@/components/emissions/shared/EmissionFactors";

export type EpaFuelFactorsMap = Record<string, Record<string, Record<string, number>>>;
export type UkFactorCell = { total?: number; co2?: number; ch4?: number; n2o?: number };
export type UkFactorsMap = Record<string, Record<string, Record<string, UkFactorCell>>>;

let epaFuelFactorsCache: EpaFuelFactorsMap | null = null;
let epaFuelFactorsInflight: Promise<EpaFuelFactorsMap | null> | null = null;
let ukFuelFactorsCache: UkFactorsMap | null = null;
let ukFuelFactorsInflight: Promise<UkFactorsMap | null> | null = null;

function parseFactorNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (value == null) return undefined;
  const cleaned = String(value).replace(/,/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

function buildEpaFuelFactorsMap(allRows: Record<string, unknown>[]): EpaFuelFactorsMap {
  const map: EpaFuelFactorsMap = {};

  for (const row of allRows) {
    const category = String(
      row.Category ?? row.category ?? row["Fuel Category"] ?? row.fuel_category ?? ""
    ).trim();
    const fuel = String(
      row["Fuel Type"] ?? row.Fuel ?? row.fuel_type ?? row.fuel ?? ""
    ).trim();
    if (!category || !fuel) continue;

    const hhv = parseFactorNumber(
      row["Heat Content (HHV)"] ??
        row["Heat Content"] ??
        row.HeatContent ??
        row.heat_content_hhv ??
        row.hhv
    );
    const hhvUnitRaw =
      row["HHV Unit"] ?? row["HIV Unit"] ?? row.hhv_unit ?? row.hiv_unit ?? row.heat_content_unit;
    const hhvUnit = typeof hhvUnitRaw === "string" ? hhvUnitRaw.toLowerCase() : "";
    const isScfBasedHHV = hhv != null && hhvUnit.includes("scf");

    const co2Unit = String(row["CO2 Unit"] ?? "").toLowerCase();
    const ch4Unit = String(row["CH4 Unit"] ?? "").toLowerCase();
    const n2oUnitFirst = String(row["N20 Unit"] ?? row["N2O Unit"] ?? "").toLowerCase();
    const useFirstSetMmbtu = co2Unit.includes("mmbtu");

    const co2PerMmbtu = useFirstSetMmbtu ? parseFactorNumber(row["CO2 Factor"]) : undefined;
    const ch4PerMmbtu = ch4Unit.includes("mmbtu") ? parseFactorNumber(row["CH4 Factor"]) : undefined;
    const n2oPerMmbtu = n2oUnitFirst.includes("mmbtu") ? parseFactorNumber(row["N2O Factor"]) : undefined;

    const co2Unit1 = String(row["CO2 Unit_1"] ?? "").toLowerCase();
    const ch4Unit1 = String(row["CH4 Unit_1"] ?? "").toLowerCase();
    const n2oUnit1 = String(row["N2O Unit_1"] ?? row["N2O Unit"] ?? "").toLowerCase();
    const co2Factor1 = parseFactorNumber(row["CO2 Factor_1"]);
    const ch4Factor1 = parseFactorNumber(row["CH4 Factor_1"]);
    const n2oFactor1 = parseFactorNumber(row["N2O Factor_1"]);

    if (!map[category]) map[category] = {};
    if (!map[category][fuel]) map[category][fuel] = {};
    const fuelMap = map[category][fuel];

    if (co2PerMmbtu !== undefined) {
      fuelMap["CO2 (kg CO2 / mmBtu)"] = co2PerMmbtu;
      if (isScfBasedHHV) fuelMap["CO2 (kg CO2 / MMSCF)"] = co2PerMmbtu * hhv! * 1_000_000;
    }
    if (ch4PerMmbtu !== undefined) {
      fuelMap["CH4 (g CH4 / mmBtu)"] = ch4PerMmbtu;
      if (isScfBasedHHV) fuelMap["CH4 (g CH4 / MMSCF)"] = ch4PerMmbtu * hhv! * 1_000_000;
    }
    if (n2oPerMmbtu !== undefined) {
      fuelMap["N2O (g N2O / mmBtu)"] = n2oPerMmbtu;
      if (isScfBasedHHV) fuelMap["N2O (g N2O / MMSCF)"] = n2oPerMmbtu * hhv! * 1_000_000;
    }

    if (co2Unit1.includes("short ton") && co2Factor1 !== undefined) {
      fuelMap["CO2 (kg CO2 / short ton)"] = co2Factor1;
    }
    if (ch4Unit1.includes("short ton") && ch4Factor1 !== undefined) {
      fuelMap["CH4 (g CH4 / short ton)"] = ch4Factor1;
    }
    if (n2oUnit1.includes("short ton") && n2oFactor1 !== undefined) {
      fuelMap["N2O (g N2O / short ton)"] = n2oFactor1;
    }

    if (co2Unit1.includes("scf") && co2Factor1 !== undefined && fuelMap["CO2 (kg CO2 / MMSCF)"] == null) {
      fuelMap["CO2 (kg CO2 / MMSCF)"] = co2Factor1 * 1_000_000;
    }
    if (ch4Unit1.includes("scf") && ch4Factor1 !== undefined && fuelMap["CH4 (g CH4 / MMSCF)"] == null) {
      fuelMap["CH4 (g CH4 / MMSCF)"] = ch4Factor1 * 1_000_000;
    }
    if (n2oUnit1.includes("scf") && n2oFactor1 !== undefined && fuelMap["N2O (g N2O / MMSCF)"] == null) {
      fuelMap["N2O (g N2O / MMSCF)"] = n2oFactor1 * 1_000_000;
    }

    if (co2Unit1.includes("gallon") && co2Factor1 !== undefined) {
      fuelMap["CO2 (kg CO2 / gallon)"] = co2Factor1;
    }
    if (ch4Unit1.includes("gallon") && ch4Factor1 !== undefined) {
      fuelMap["CH4 (g CH4 / gallon)"] = ch4Factor1;
    }
    if (n2oUnit1.includes("gallon") && n2oFactor1 !== undefined) {
      fuelMap["N2O (g N2O / gallon)"] = n2oFactor1;
    }
  }

  return map;
}

/** Load Fuel EPA 1/2/3 (API dual-read → Supabase fallback), cached for the session. */
export async function loadEpaFuelFactors(): Promise<EpaFuelFactorsMap | null> {
  if (epaFuelFactorsCache) return epaFuelFactorsCache;
  if (epaFuelFactorsInflight) return epaFuelFactorsInflight;

  epaFuelFactorsInflight = (async () => {
    try {
      let allRows: Record<string, unknown>[] = [];
      const apiRows = await tryLoadFactorSheetsViaApi([
        { datasetCodes: ["fuel_epa_1", "fuel_epa1"], nameHints: ["Fuel EPA 1", "Fuel EPA"] },
        { datasetCodes: ["fuel_epa_2", "fuel_epa2"], nameHints: ["Fuel EPA 2"] },
        { datasetCodes: ["fuel_epa_3", "fuel_epa3"], nameHints: ["Fuel EPA 3"] },
      ]);
      if (apiRows && apiRows.length > 0) {
        allRows = apiRows;
      } else {
        for (const table of ["Fuel EPA 1", "Fuel EPA 2", "Fuel EPA 3"]) {
          const { data, error } = await supabase.from(table as any).select("*");
          if (error) {
            console.error(`Error loading ${table} factors:`, error);
            continue;
          }
          if (data?.length) {
            allRows.push(...(Array.isArray(data) ? (data as any[]) : []));
          }
        }
      }
      if (allRows.length === 0) return null;
      const map = buildEpaFuelFactorsMap(allRows);
      if (Object.keys(map).length === 0) return null;
      epaFuelFactorsCache = map;
      return map;
    } finally {
      epaFuelFactorsInflight = null;
    }
  })();

  return epaFuelFactorsInflight;
}

/** Load DEFRA/UK fuel factors (API dual-read → Supabase fallback), cached for the session. */
export async function loadUkFuelFactors(): Promise<UkFactorsMap | null> {
  if (ukFuelFactorsCache && Object.keys(ukFuelFactorsCache).length > 0) {
    return ukFuelFactorsCache;
  }
  if (ukFuelFactorsInflight) return ukFuelFactorsInflight;

  ukFuelFactorsInflight = (async () => {
    try {
      let data: any[] | null = null;
      let error: any = null;

      const apiRows = await tryLoadFactorSheetViaApi({
        datasetCodes: ["uk_fuel_factors"],
        nameHints: ["UK_Fuel", "uk fuel"],
      });
      if (apiRows && apiRows.length > 0) {
        data = apiRows;
      } else {
        const primary = await (supabase as any).from("UK_Fuel_Factors").select("*");
        if (!primary.error && primary.data?.length) {
          data = primary.data;
        } else {
          const fallback = await (supabase as any).from("uk_fuel_factors").select("*");
          if (!fallback.error && fallback.data?.length) {
            data = fallback.data;
          } else {
            error = primary.error || fallback.error;
          }
        }
      }
      if (error) throw error;

      const map: UkFactorsMap = {};
      for (const row of (data ?? []) as any[]) {
        const activity = String(row.Activity ?? row.activity ?? "").trim();
        const fuel = String(row.Fuel ?? row.fuel ?? "").trim();
        const unit = String(row.Unit ?? row.unit ?? "").trim();
        if (!activity || !fuel || !unit) continue;

        const total = parseFactorNumber(
          row["kg CO2e"] ?? row.kg_co2e ?? row.kgCO2e ?? row["Kg CO2e"]
        );
        const co2 = parseFactorNumber(
          row["kg CO2e of CO2 per unit"] ??
            row.kg_co2e_of_co2_per_unit ??
            row["kg_co2e_of_co2_per_unit"]
        );
        const ch4 = parseFactorNumber(
          row["kg CO2e of CH4 per unit"] ??
            row.kg_co2e_of_ch4_per_unit ??
            row["kg_co2e_of_ch4_per_unit"]
        );
        const n2o = parseFactorNumber(
          row["kg CO2e of N2O per unit"] ??
            row.kg_co2e_of_n2o_per_unit ??
            row["kg_co2e_of_n2o_per_unit"]
        );

        if (!map[activity]) map[activity] = {};
        if (!map[activity][fuel]) map[activity][fuel] = {};
        const prev = map[activity][fuel][unit] || {};
        map[activity][fuel][unit] = {
          ...prev,
          ...(total !== undefined ? { total } : {}),
          ...(co2 !== undefined ? { co2 } : {}),
          ...(ch4 !== undefined ? { ch4 } : {}),
          ...(n2o !== undefined ? { n2o } : {}),
        };
      }

      ukFuelFactorsCache = map;
      return Object.keys(map).length > 0 ? map : null;
    } finally {
      ukFuelFactorsInflight = null;
    }
  })();

  return ukFuelFactorsInflight;
}

/** Grid countries available for electricity (kg CO2e / kWh). */
export function getElectricityGridCountries(): string[] {
  return Object.keys(SCOPE2_FACTORS.GridCountries || {});
}

export function getElectricityGridFactorKgPerKwh(country: string): number | undefined {
  const v = SCOPE2_FACTORS.GridCountries?.[country];
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/** Other on-site generation fuel factors (DEFRA-style maps also used for EPA electricity “other”). */
export function getElectricityOtherFuelMap(): typeof FACTORS {
  return FACTORS;
}

export type NestedFactorMap = Record<string, Record<string, Record<string, number>>>;

/** Flatten UK/DEFRA fuel cells to kg CO2e per unit (same total column as the DEFRA fuel screen). */
export function ukFactorsToNumericMap(map: UkFactorsMap | null): NestedFactorMap {
  const out: NestedFactorMap = {};
  if (!map) return out;
  for (const [activity, fuels] of Object.entries(map)) {
    for (const [fuel, units] of Object.entries(fuels || {})) {
      for (const [unit, cell] of Object.entries(units || {})) {
        const v = cell?.total ?? cell?.co2;
        if (typeof v !== "number" || !Number.isFinite(v)) continue;
        if (!out[activity]) out[activity] = {};
        if (!out[activity][fuel]) out[activity][fuel] = {};
        out[activity][fuel][unit] = v;
      }
    }
  }
  return out;
}

/**
 * Convert a raw factor (typically kg or g per activity unit) into tCO2e per activity unit
 * so PCAF formulas can do energy_consumption × emission_factor = tCO2e.
 */
export function factorToTco2ePerUnit(rawFactor: number, unitLabel: string): number {
  const u = unitLabel.toLowerCase();
  if (u.includes("(g ") || u.startsWith("ch4 (g") || u.startsWith("n2o (g") || /\bg\s/.test(u)) {
    return rawFactor / 1_000_000;
  }
  // Default: kg CO2 / kg CO2e per unit → tCO2e
  return rawFactor / 1000;
}

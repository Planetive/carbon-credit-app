import { FACTORS, SCOPE2_FACTORS } from "@/components/emissions/shared/EmissionFactors";
import { createOtherSourceRow } from "../rowFactories";
import type {
  GridCountry,
  OtherSourceRow,
  ProcessingSoldProductsRow,
} from "../types";

const getGridFactor = (country?: GridCountry) =>
  country ? SCOPE2_FACTORS.GridCountries?.[country] : undefined;

export function updateProcessingRows(
  rows: ProcessingSoldProductsRow[],
  id: string,
  patch: Partial<ProcessingSoldProductsRow>,
) {
  return rows.map((row) => {
    if (row.id !== id) return row;
    const next: ProcessingSoldProductsRow = { ...row, ...patch };

    let fuelEmissions: number | undefined;

    if (next.processingActivity === "Heating, melting, smelting") {
      if (next.combustionType === "stationary") {
        next.stationaryCo2Factor = next.stationaryCo2Factor || undefined;
        if (
          typeof next.quantity === "number" &&
          typeof next.stationaryCo2Factor === "number"
        ) {
          fuelEmissions = next.quantity * next.stationaryCo2Factor;
        }
      } else if (next.combustionType === "mobile") {
        next.mobileKgCo2PerUnit = next.mobileKgCo2PerUnit || undefined;
        if (
          typeof next.quantity === "number" &&
          typeof next.mobileKgCo2PerUnit === "number"
        ) {
          fuelEmissions = next.quantity * next.mobileKgCo2PerUnit;
        }
      }
    } else if (next.processingActivity === "Drying / Curing / Kilns") {
      next.heatSteamKgCo2e = next.heatSteamKgCo2e || undefined;
      if (
        typeof next.quantity === "number" &&
        typeof next.heatSteamKgCo2e === "number"
      ) {
        fuelEmissions = next.quantity * next.heatSteamKgCo2e;
      }
    } else {
      if (next.type && next.fuel && next.unit) {
        const factor = FACTORS[next.type]?.[next.fuel]?.[next.unit];
        next.factor = typeof factor === "number" ? factor : undefined;
      } else {
        next.factor = undefined;
      }

      if (typeof next.quantity === "number" && typeof next.factor === "number") {
        fuelEmissions = next.quantity * next.factor;
      }
    }

    let electricityEmissions: number | undefined;
    if (next.totalKwh) {
      const gridFactor = getGridFactor(next.gridCountry);
      const gridPart =
        next.gridPct && gridFactor
          ? (next.gridPct / 100) * next.totalKwh * gridFactor
          : 0;
      const renewablePart = 0;
      const otherEmissions = (next.otherSources || []).reduce(
        (sum, source) => sum + (source.emissions || 0),
        0,
      );
      const otherPart =
        next.otherPct && next.otherPct > 0
          ? (next.otherPct / 100) *
            next.totalKwh *
            (otherEmissions / (next.totalKwh || 1))
          : 0;
      electricityEmissions = gridPart + renewablePart + otherPart;
    }

    const totalEmissions =
      (typeof fuelEmissions === "number" ? fuelEmissions : 0) +
      (typeof electricityEmissions === "number" ? electricityEmissions : 0);

    next.emissions =
      typeof fuelEmissions === "number" ||
      typeof electricityEmissions === "number"
        ? Number(totalEmissions.toFixed(6))
        : undefined;

    return next;
  });
}

export function updateProcessingOtherSourceRows(
  rows: ProcessingSoldProductsRow[],
  rowId: string,
  sourceId: string,
  patch: Partial<OtherSourceRow>,
) {
  return rows.map((row) => {
    if (row.id !== rowId) return row;

    const otherSources = (row.otherSources || []).map((source) => {
      if (source.id !== sourceId) return source;
      const next = { ...source, ...patch };
      if (next.type && next.fuel && next.unit) {
        const factor = FACTORS[next.type]?.[next.fuel]?.[next.unit];
        next.factor = typeof factor === "number" ? factor : undefined;
      }
      if (typeof next.quantity === "number" && typeof next.factor === "number") {
        next.emissions = Number((next.quantity * next.factor).toFixed(6));
      }
      return next;
    });

    const updated = { ...row, otherSources };
    if (updated.totalKwh) {
      const gridFactor = getGridFactor(updated.gridCountry);
      const gridPart =
        updated.gridPct && gridFactor
          ? (updated.gridPct / 100) * updated.totalKwh * gridFactor
          : 0;
      const renewablePart = 0;
      const otherEmissions = otherSources.reduce(
        (sum, source) => sum + (source.emissions || 0),
        0,
      );
      const otherPart =
        updated.otherPct && updated.otherPct > 0
          ? (updated.otherPct / 100) *
            updated.totalKwh *
            (otherEmissions / (updated.totalKwh || 1))
          : 0;
      const electricityEmissions = gridPart + renewablePart + otherPart;
      const fuelEmissions =
        typeof updated.quantity === "number" && typeof updated.factor === "number"
          ? updated.quantity * updated.factor
          : 0;
      updated.emissions = Number((fuelEmissions + electricityEmissions).toFixed(6));
    }

    return updated;
  });
}

export function addProcessingOtherSourceRow(
  rows: ProcessingSoldProductsRow[],
  rowId: string,
) {
  return rows.map((row) => {
    if (row.id !== rowId) return row;
    return {
      ...row,
      otherSources: [...(row.otherSources || []), createOtherSourceRow()],
    };
  });
}

export function removeProcessingOtherSourceRow(
  rows: ProcessingSoldProductsRow[],
  rowId: string,
  sourceId: string,
) {
  return rows.map((row) => {
    if (row.id !== rowId) return row;
    return {
      ...row,
      otherSources: (row.otherSources || []).filter((source) => source.id !== sourceId),
    };
  });
}

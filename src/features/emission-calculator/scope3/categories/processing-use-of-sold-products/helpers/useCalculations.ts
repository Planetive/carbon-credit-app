import {
  FACTORS,
  REFRIGERANT_FACTORS,
  SCOPE2_FACTORS,
} from "@/components/emissions/shared/EmissionFactors";
import { createOtherSourceRow } from "../rowFactories";
import type {
  GridCountry,
  OtherSourceRow,
  UseOfSoldProductsRow,
} from "../types";

const getGridFactor = (country?: GridCountry) =>
  country ? SCOPE2_FACTORS.GridCountries?.[country] : undefined;

export function updateUseRows(
  rows: UseOfSoldProductsRow[],
  id: string,
  patch: Partial<UseOfSoldProductsRow>,
) {
  return rows.map((row) => {
    if (row.id !== id) return row;
    const next: UseOfSoldProductsRow = { ...row, ...patch };

    let emissions: number | undefined;

    if (
      next.processingActivity ===
        "Internal combustion engine vehicles (cars, trucks, bikes)" ||
      next.processingActivity === "Sold fuels (LPG, petrol, diesel)" ||
      next.processingActivity === "Boilers, stoves, heaters (gas-based)"
    ) {
      if (
        next.processingActivity ===
        "Internal combustion engine vehicles (cars, trucks, bikes)"
      ) {
        let stationaryEmissions: number | undefined;
        if (
          typeof next.stationaryQuantity === "number" &&
          typeof next.stationaryCo2Factor === "number"
        ) {
          stationaryEmissions =
            next.stationaryQuantity * next.stationaryCo2Factor;
        }

        let mobileEmissions: number | undefined;
        if (
          typeof next.mobileQuantity === "number" &&
          typeof next.mobileKgCo2PerUnit === "number"
        ) {
          mobileEmissions = next.mobileQuantity * next.mobileKgCo2PerUnit;
        }

        const totalEmissions =
          (typeof stationaryEmissions === "number" ? stationaryEmissions : 0) +
          (typeof mobileEmissions === "number" ? mobileEmissions : 0);

        emissions =
          typeof stationaryEmissions === "number" ||
          typeof mobileEmissions === "number"
            ? Number(totalEmissions.toFixed(6))
            : undefined;
      } else {
        if (next.combustionType === "stationary") {
          next.stationaryCo2Factor = next.stationaryCo2Factor || undefined;
          if (
            typeof next.quantity === "number" &&
            typeof next.stationaryCo2Factor === "number"
          ) {
            emissions = next.quantity * next.stationaryCo2Factor;
          }
        } else if (next.combustionType === "mobile") {
          next.mobileKgCo2PerUnit = next.mobileKgCo2PerUnit || undefined;
          if (
            typeof next.quantity === "number" &&
            typeof next.mobileKgCo2PerUnit === "number"
          ) {
            emissions = next.quantity * next.mobileKgCo2PerUnit;
          }
        }
      }
    } else if (next.processingActivity === "Hybrid vehicles") {
      let fuelEmissions: number | undefined;
      if (next.hybridFuelType && next.hybridFuel && next.hybridFuelUnit) {
        const factor =
          FACTORS[next.hybridFuelType]?.[next.hybridFuel]?.[next.hybridFuelUnit];
        next.hybridFuelFactor = typeof factor === "number" ? factor : undefined;
      } else {
        next.hybridFuelFactor = undefined;
      }

      if (
        typeof next.hybridFuelQuantity === "number" &&
        typeof next.hybridFuelFactor === "number"
      ) {
        fuelEmissions = next.hybridFuelQuantity * next.hybridFuelFactor;
        next.hybridFuelEmissions = Number(fuelEmissions.toFixed(6));
      } else {
        next.hybridFuelEmissions = undefined;
      }

      let electricityEmissions: number | undefined;
      if (next.hybridTotalKwh) {
        const gridFactor = getGridFactor(next.hybridGridCountry);
        const gridPart =
          next.hybridGridPct && gridFactor
            ? (next.hybridGridPct / 100) * next.hybridTotalKwh * gridFactor
            : 0;
        const renewablePart = 0;
        const otherEmissions = (next.hybridOtherSources || []).reduce(
          (sum, source) => sum + (source.emissions || 0),
          0,
        );
        const otherPart =
          next.hybridOtherPct && next.hybridOtherPct > 0
            ? (next.hybridOtherPct / 100) *
              next.hybridTotalKwh *
              (otherEmissions / (next.hybridTotalKwh || 1))
            : 0;
        electricityEmissions = gridPart + renewablePart + otherPart;
      }

      const totalEmissions =
        (typeof fuelEmissions === "number" ? fuelEmissions : 0) +
        (typeof electricityEmissions === "number" ? electricityEmissions : 0);

      emissions =
        typeof fuelEmissions === "number" ||
        typeof electricityEmissions === "number"
          ? Number(totalEmissions.toFixed(6))
          : undefined;
    } else if (
      next.processingActivity === "Electronics (laptops, TVs, phones)" ||
      next.processingActivity === "Electric machinery/equipment" ||
      next.processingActivity === "Batteries" ||
      next.processingActivity === "Water-using devices" ||
      next.processingActivity ===
        "Electric vehicles (cars, 2-wheelers, buses)" ||
      next.processingActivity ===
        "Home appliances (ACs, fridges, fans, microwaves)"
    ) {
      let electricityEmissions: number | undefined;
      if (next.electricityTotalKwh) {
        const gridFactor = getGridFactor(next.electricityGridCountry);
        const gridPart =
          next.electricityGridPct && gridFactor
            ? (next.electricityGridPct / 100) *
              next.electricityTotalKwh *
              gridFactor
            : 0;
        const renewablePart = 0;
        let otherPart = 0;
        if (
          next.electricityOtherPct &&
          next.electricityOtherPct > 0 &&
          (next.electricityOtherSources || []).length > 0
        ) {
          const sumOtherEmissions = (next.electricityOtherSources || []).reduce(
            (sum, source) => sum + (source.emissions || 0),
            0,
          );
          otherPart =
            (next.electricityOtherPct / 100) *
            next.electricityTotalKwh *
            sumOtherEmissions;
        }
        electricityEmissions = gridPart + renewablePart + otherPart;
      }
      emissions =
        electricityEmissions !== undefined
          ? Number(electricityEmissions.toFixed(6))
          : undefined;
    } else if (next.processingActivity === "Refrigerants sold") {
      if (next.refrigerantType) {
        const factor = REFRIGERANT_FACTORS[next.refrigerantType];
        next.refrigerantFactor = typeof factor === "number" ? factor : undefined;
      } else {
        next.refrigerantFactor = undefined;
      }
      if (
        typeof next.quantity === "number" &&
        typeof next.refrigerantFactor === "number"
      ) {
        emissions = Number((next.quantity * next.refrigerantFactor).toFixed(6));
      } else {
        emissions = undefined;
      }
    } else if (
      next.processingActivity === "Cooling products (AC, refrigeration)"
    ) {
      let electricityEmissions: number | undefined;
      if (next.electricityTotalKwh) {
        const gridFactor = getGridFactor(next.electricityGridCountry);
        const gridPart =
          next.electricityGridPct && gridFactor
            ? (next.electricityGridPct / 100) *
              next.electricityTotalKwh *
              gridFactor
            : 0;
        const renewablePart = 0;
        let otherPart = 0;
        if (
          next.electricityOtherPct &&
          next.electricityOtherPct > 0 &&
          (next.electricityOtherSources || []).length > 0
        ) {
          const sumOtherEmissions = (next.electricityOtherSources || []).reduce(
            (sum, source) => sum + (source.emissions || 0),
            0,
          );
          otherPart =
            (next.electricityOtherPct / 100) *
            next.electricityTotalKwh *
            sumOtherEmissions;
        }
        electricityEmissions = gridPart + renewablePart + otherPart;
      }

      let refrigerantEmissions: number | undefined;
      if (next.refrigerantType) {
        const factor = REFRIGERANT_FACTORS[next.refrigerantType];
        next.refrigerantFactor = typeof factor === "number" ? factor : undefined;
      } else {
        next.refrigerantFactor = undefined;
      }
      if (
        typeof next.coolingRefrigerantQuantity === "number" &&
        typeof next.refrigerantFactor === "number"
      ) {
        refrigerantEmissions = Number(
          (next.coolingRefrigerantQuantity * next.refrigerantFactor).toFixed(6),
        );
      } else {
        refrigerantEmissions = undefined;
      }

      const totalEmissions =
        (typeof electricityEmissions === "number" ? electricityEmissions : 0) +
        (typeof refrigerantEmissions === "number" ? refrigerantEmissions : 0);

      emissions =
        typeof electricityEmissions === "number" ||
        typeof refrigerantEmissions === "number"
          ? Number(totalEmissions.toFixed(6))
          : undefined;
    } else if (
      next.processingActivity === "Gas-fired industrial machinery sold"
    ) {
      if (
        next.gasMachineryFuelType &&
        next.gasMachineryFuel &&
        next.gasMachineryUnit
      ) {
        const factor =
          FACTORS[next.gasMachineryFuelType]?.[next.gasMachineryFuel]?.[
            next.gasMachineryUnit
          ];
        next.gasMachineryFactor = typeof factor === "number" ? factor : undefined;
      } else {
        next.gasMachineryFactor = undefined;
      }
      if (
        typeof next.gasMachineryQuantity === "number" &&
        typeof next.gasMachineryFactor === "number"
      ) {
        emissions = Number(
          (next.gasMachineryQuantity * next.gasMachineryFactor).toFixed(6),
        );
      } else {
        emissions = undefined;
      }
    }

    next.emissions =
      emissions !== undefined ? Number(emissions.toFixed(6)) : undefined;

    return next;
  });
}

export function updateHybridOtherSourceRows(
  rows: UseOfSoldProductsRow[],
  rowId: string,
  sourceId: string,
  patch: Partial<OtherSourceRow>,
) {
  return rows.map((row) => {
    if (row.id !== rowId) return row;

    const otherSources = (row.hybridOtherSources || []).map((source) => {
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

    const updated = { ...row, hybridOtherSources: otherSources };
    if (updated.hybridTotalKwh) {
      const gridFactor = getGridFactor(updated.hybridGridCountry);
      const gridPart =
        updated.hybridGridPct && gridFactor
          ? (updated.hybridGridPct / 100) * updated.hybridTotalKwh * gridFactor
          : 0;
      const renewablePart = 0;
      const otherEmissions = otherSources.reduce(
        (sum, source) => sum + (source.emissions || 0),
        0,
      );
      const otherPart =
        updated.hybridOtherPct && updated.hybridOtherPct > 0
          ? (updated.hybridOtherPct / 100) *
            updated.hybridTotalKwh *
            (otherEmissions / (updated.hybridTotalKwh || 1))
          : 0;
      const electricityEmissions = gridPart + renewablePart + otherPart;
      const fuelEmissions =
        typeof updated.hybridFuelQuantity === "number" &&
        typeof updated.hybridFuelFactor === "number"
          ? updated.hybridFuelQuantity * updated.hybridFuelFactor
          : 0;
      updated.emissions = Number((fuelEmissions + electricityEmissions).toFixed(6));
    }

    return updated;
  });
}

export function addHybridOtherSourceRow(
  rows: UseOfSoldProductsRow[],
  rowId: string,
) {
  return rows.map((row) => {
    if (row.id !== rowId) return row;
    return {
      ...row,
      hybridOtherSources: [...(row.hybridOtherSources || []), createOtherSourceRow()],
    };
  });
}

export function removeHybridOtherSourceRow(
  rows: UseOfSoldProductsRow[],
  rowId: string,
  sourceId: string,
) {
  return rows.map((row) => {
    if (row.id !== rowId) return row;
    return {
      ...row,
      hybridOtherSources: (row.hybridOtherSources || []).filter(
        (source) => source.id !== sourceId,
      ),
    };
  });
}

export function updateElectricityOtherSourceRows(
  rows: UseOfSoldProductsRow[],
  rowId: string,
  sourceId: string,
  patch: Partial<OtherSourceRow>,
) {
  return rows.map((row) => {
    if (row.id !== rowId) return row;

    const otherSources = (row.electricityOtherSources || []).map((source) => {
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

    const updated = { ...row, electricityOtherSources: otherSources };
    if (updated.electricityTotalKwh) {
      const gridFactor = getGridFactor(updated.electricityGridCountry);
      const gridPart =
        updated.electricityGridPct && gridFactor
          ? (updated.electricityGridPct / 100) *
            updated.electricityTotalKwh *
            gridFactor
          : 0;
      const renewablePart = 0;
      let otherPart = 0;
      if (
        updated.electricityOtherPct &&
        updated.electricityOtherPct > 0 &&
        otherSources.length > 0
      ) {
        const sumOtherEmissions = otherSources.reduce(
          (sum, source) => sum + (source.emissions || 0),
          0,
        );
        otherPart =
          (updated.electricityOtherPct / 100) *
          updated.electricityTotalKwh *
          sumOtherEmissions;
      }
      const electricityEmissions = gridPart + renewablePart + otherPart;

      if (updated.processingActivity === "Cooling products (AC, refrigeration)") {
        let refrigerantEmissions = 0;
        if (
          typeof updated.coolingRefrigerantQuantity === "number" &&
          typeof updated.refrigerantFactor === "number"
        ) {
          refrigerantEmissions =
            updated.coolingRefrigerantQuantity * updated.refrigerantFactor;
        }
        updated.emissions = Number(
          (electricityEmissions + refrigerantEmissions).toFixed(6),
        );
      } else {
        updated.emissions = Number(electricityEmissions.toFixed(6));
      }
    }

    return updated;
  });
}

export function addElectricityOtherSourceRow(
  rows: UseOfSoldProductsRow[],
  rowId: string,
) {
  return rows.map((row) => {
    if (row.id !== rowId) return row;
    return {
      ...row,
      electricityOtherSources: [
        ...(row.electricityOtherSources || []),
        createOtherSourceRow(),
      ],
    };
  });
}

export function removeElectricityOtherSourceRow(
  rows: UseOfSoldProductsRow[],
  rowId: string,
  sourceId: string,
) {
  return rows.map((row) => {
    if (row.id !== rowId) return row;
    return {
      ...row,
      electricityOtherSources: (row.electricityOtherSources || []).filter(
        (source) => source.id !== sourceId,
      ),
    };
  });
}

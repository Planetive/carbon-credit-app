// Utility functions for emission calculations

import { FuelRow, RefrigerantRow, VehicleRow, DeliveryVehicleRow, Scope2Row, Scope3Row } from './types';
import { SCOPE2_FACTORS } from './EmissionFactors';

// Row creation helpers
export const newFuelRow = (): FuelRow => ({ id: crypto.randomUUID() });
export const newRefrigerantRow = (): RefrigerantRow => ({ id: crypto.randomUUID() });
export const newVehicleRow = (): VehicleRow => ({ id: crypto.randomUUID() });
export const newDeliveryVehicleRow = (): DeliveryVehicleRow => ({ id: crypto.randomUUID() });
export const newScope2Row = (): Scope2Row => ({ id: crypto.randomUUID() });
export const newScope3Row = (): Scope3Row => ({ id: crypto.randomUUID() });

// Change detection helpers
export const fuelRowChanged = (row: FuelRow, existingEntries: FuelRow[]) => {
  const original = existingEntries.find(e => e.id === row.id);
  if (!original) return false;
  return (
    original.type !== row.type ||
    original.fuel !== row.fuel ||
    original.unit !== row.unit ||
    original.quantity !== row.quantity ||
    original.factor !== row.factor ||
    original.emissions !== row.emissions
  );
};

export const refrigerantRowChanged = (row: RefrigerantRow, existingEntries: RefrigerantRow[]) => {
  const original = existingEntries.find(e => e.id === row.id);
  if (!original) return false;
  return (
    original.refrigerantType !== row.refrigerantType ||
    original.quantity !== row.quantity ||
    original.factor !== row.factor ||
    original.emissions !== row.emissions
  );
};

export const vehicleRowChanged = (row: VehicleRow, existingEntries: VehicleRow[]) => {
  const original = existingEntries.find(e => e.id === row.id);
  if (!original) return false;
  return (
    original.activity !== row.activity ||
    original.vehicleType !== row.vehicleType ||
    original.unit !== row.unit ||
    original.distance !== row.distance ||
    original.factor !== row.factor ||
    original.emissions !== row.emissions
  );
};

export const deliveryVehicleRowChanged = (row: DeliveryVehicleRow, existingEntries: DeliveryVehicleRow[]) => {
  const original = existingEntries.find(e => e.id === row.id);
  if (!original) return false;
  return (
    original.activity !== row.activity ||
    original.vehicleType !== row.vehicleType ||
    original.unit !== row.unit ||
    original.distance !== row.distance ||
    original.factor !== row.factor ||
    original.emissions !== row.emissions
  );
};

export const scope2RowChanged = (row: Scope2Row, existingEntries: Scope2Row[]) => {
  const original = existingEntries.find(e => e.id === row.id);
  if (!original) return false;
  return (
    original.category !== row.category ||
    original.source !== row.source ||
    original.unit !== row.unit ||
    original.consumption !== row.consumption ||
    original.factor !== row.factor ||
    original.emissions !== row.emissions
  );
};

export const scope3RowChanged = (row: Scope3Row, existingEntries: Scope3Row[]) => {
  const original = existingEntries.find(e => e.id === row.id);
  if (!original) return false;
  return (
    original.category !== row.category ||
    original.activity !== row.activity ||
    original.unit !== row.unit ||
    original.quantity !== row.quantity ||
    original.factor !== row.factor ||
    original.emissions !== row.emissions
  );
};

// Calculation helpers
export const calculateEmissions = (quantity: number, factor: number): number => {
  return Number((quantity * factor).toFixed(6));
};

// Format helpers
export const formatEmissions = (value: number): string => {
  return value.toFixed(6);
};

export const formatEmissionsWithUnit = (value: number): string => {
  return `${value.toFixed(6)} kg CO2e`;
};

// Scope 2 helpers
export const getGridCountryFactor = (country?: string): number | undefined => {
  if (!country) return undefined;
  return SCOPE2_FACTORS.GridCountries?.[country];
};

export const computeScope2Electricity = (params: {
  totalKwh?: number;
  gridPct?: number;
  renewablePct?: number;
  otherPct?: number;
  gridCountry?: 'UAE' | 'Pakistan';
  otherEmissions?: number; // sum of individual other-source emissions
}): number => {
  const { totalKwh, gridPct, renewablePct, otherPct, gridCountry, otherEmissions } = params;
  if (!totalKwh) return 0;
  const gridFactor = getGridCountryFactor(gridCountry);
  const gridPart = gridPct && gridFactor ? (gridPct / 100) * totalKwh * gridFactor : 0;
  const renewablePart = renewablePct ? 0 : 0;
  const otherPart = otherPct ? (otherEmissions || 0) : 0;
  return Number((gridPart + renewablePart + otherPart).toFixed(6));
};

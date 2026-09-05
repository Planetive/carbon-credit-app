/**
 * PCAF Table 10.1-6 — motor vehicle loans (multi-vehicle).
 * Financed emissions = Σ_v (Outstanding_v / Value_v) × Emissions_v
 */

export type MotorVehiclePcafEntry = {
  id: string;
  name: string;
  value_at_origination: number;
  emissions_tco2e: number;
  /** When set, uses this outstanding for the vehicle; otherwise allocated from the loan total. */
  outstanding_amount?: number;
  fuel_consumption?: number;
  distance_traveled?: number;
  efficiency?: number;
  emission_factor?: number;
  fuel_type?: string;
  activity?: string;
  vehicle_type?: string;
  make?: string;
  model?: string;
};

export type MotorVehiclePcafVehicleResult = {
  id: string;
  name: string;
  valueAtOrigination: number;
  outstandingAllocated: number;
  attributionFactor: number;
  vehicleEmissions: number;
  financedEmissions: number;
  formula: string;
};

export type MotorVehiclePcafResult = {
  totalFinancedEmissions: number;
  totalVehicleEmissions: number;
  totalValueAtOrigination: number;
  /** totalFinanced / totalEmissions — portfolio-level display only */
  displayAttributionFactor: number;
  vehicleResults: MotorVehiclePcafVehicleResult[];
};

const num = (v: unknown) => Number(v) || 0;

/** Allocate loan outstanding across vehicles (explicit per row, then proportional remainder). */
export function allocateOutstandingPerVehicle(
  outstandingTotal: number,
  vehicles: MotorVehiclePcafEntry[]
): number[] {
  if (vehicles.length === 0) return [];

  const explicit = vehicles.map((v) => {
    const o = num(v.outstanding_amount);
    return o > 0 ? o : 0;
  });
  const explicitSum = explicit.reduce((s, o) => s + o, 0);
  const remaining = Math.max(0, outstandingTotal - explicitSum);

  const implicitIndices = vehicles
    .map((v, i) => ((num(v.outstanding_amount) > 0 ? -1 : i) as number))
    .filter((i) => i >= 0);
  const implicitValueTotal = implicitIndices.reduce(
    (s, i) => s + num(vehicles[i].value_at_origination),
    0
  );

  return vehicles.map((v, i) => {
    if (num(v.outstanding_amount) > 0) return num(v.outstanding_amount);
    if (implicitValueTotal <= 0) return 0;
    const value = num(v.value_at_origination);
    return remaining * (value / implicitValueTotal);
  });
}

export function computeMotorVehiclePcafFinanced(
  outstandingTotal: number,
  vehicles: MotorVehiclePcafEntry[]
): MotorVehiclePcafResult {
  if (vehicles.length === 0) {
    return {
      totalFinancedEmissions: 0,
      totalVehicleEmissions: 0,
      totalValueAtOrigination: 0,
      displayAttributionFactor: 0,
      vehicleResults: [],
    };
  }

  const allocations = allocateOutstandingPerVehicle(outstandingTotal, vehicles);
  const vehicleResults: MotorVehiclePcafVehicleResult[] = [];
  let totalFinanced = 0;
  let totalEmissions = 0;
  let totalValue = 0;

  vehicles.forEach((v, i) => {
    const value = num(v.value_at_origination);
    const emissions = num(v.emissions_tco2e);
    const outstandingV = allocations[i] ?? 0;
    totalValue += value;
    totalEmissions += emissions;

    if (value <= 0) {
      vehicleResults.push({
        id: v.id,
        name: v.name,
        valueAtOrigination: value,
        outstandingAllocated: outstandingV,
        attributionFactor: 0,
        vehicleEmissions: emissions,
        financedEmissions: 0,
        formula: `${v.name}: value at origination must be > 0`,
      });
      return;
    }

    const attr = outstandingV / value;
    const financed = attr * emissions;
    totalFinanced += financed;

    vehicleResults.push({
      id: v.id,
      name: v.name,
      valueAtOrigination: value,
      outstandingAllocated: outstandingV,
      attributionFactor: attr,
      vehicleEmissions: emissions,
      financedEmissions: financed,
      formula: `(${outstandingV.toFixed(2)} / ${value.toFixed(2)}) × ${emissions.toFixed(6)} = ${financed.toFixed(6)} tCO2e`,
    });
  });

  return {
    totalFinancedEmissions: totalFinanced,
    totalVehicleEmissions: totalEmissions,
    totalValueAtOrigination: totalValue,
    displayAttributionFactor: totalEmissions > 0 ? totalFinanced / totalEmissions : 0,
    vehicleResults,
  };
}

export function parseMotorVehicleEntries(raw: unknown): MotorVehiclePcafEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const id = String(r.id ?? "");
      const name = String(r.name ?? "Vehicle");
      const value_at_origination = num(r.value_at_origination ?? r.totalValueAtOrigination);
      const emissions_tco2e = num(r.emissions_tco2e ?? r.emissions);
      if (!id && value_at_origination <= 0 && emissions_tco2e <= 0) return null;
      return {
        id: id || `vehicle-${Math.random().toString(36).slice(2, 9)}`,
        name,
        value_at_origination,
        emissions_tco2e,
        outstanding_amount: num(r.outstanding_amount) || undefined,
        fuel_consumption: num(r.fuel_consumption) || undefined,
        distance_traveled: num(r.distance_traveled ?? r.distance) || undefined,
        efficiency: num(r.efficiency) || undefined,
        emission_factor: num(r.emission_factor ?? r.emission_factor_tco2e) || undefined,
        fuel_type: r.fuel_type ? String(r.fuel_type) : undefined,
        activity: r.activity ? String(r.activity) : undefined,
        vehicle_type: r.vehicle_type ? String(r.vehicle_type) : undefined,
        make: r.make ? String(r.make) : undefined,
        model: r.model ? String(r.model) : undefined,
      } satisfies MotorVehiclePcafEntry;
    })
    .filter((v): v is MotorVehiclePcafEntry => v != null);
}

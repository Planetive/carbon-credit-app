import type { Property } from "../../forms/MortgageForm";
import type { CommercialRealEstateProperty } from "../../forms/CommercialRealEstatePropertiesForm";
import type { FinanceFormData } from "../../types/contracts";

/** Canonical SSP collateral.classInputs envelope (Phase 6B.2). */
export type SspClassInputsV1 = {
  schemaVersion: 1;
  /** Method branching answers (business / bond / equity). */
  methodSelection: {
    hasEmissions: string;
    verificationStatus: string;
    /** listed | unlisted — required for bond / business / equity classes. */
    corporateStructure: string;
    /** Optional PCAF option card when multiple remain (e.g. 2a / 2b / 3a). */
    calculationMethod: string;
  };
  /** Flat calculator formData (units, factors, vehicle_entries, energy fields, etc.). */
  formData: FinanceFormData & Record<string, unknown>;
  /** Mortgage multi-property rows. */
  properties: Property[];
  /** CRE multi-property rows (value at origination only). */
  commercialProperties: CommercialRealEstateProperty[];
};

export const EMPTY_METHOD_SELECTION: SspClassInputsV1["methodSelection"] = {
  hasEmissions: "",
  verificationStatus: "",
  corporateStructure: "",
  calculationMethod: "",
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function emptyProperty(id: string): Property {
  return {
    id,
    name: "",
    propertyValueAtOrigination: 0,
    actualEnergyConsumption: 0,
    actualEnergyConsumptionUnit: "kWh",
    supplierSpecificEmissionFactor: 0,
    supplierSpecificEmissionFactorUnit: "kgCO2e/kWh",
    averageEmissionFactor: 0,
    averageEmissionFactorUnit: "kgCO2e/kWh",
    estimatedEnergyConsumptionFromLabels: 0,
    estimatedEnergyConsumptionFromLabelsUnit: "kWh/m2",
    estimatedEnergyConsumptionFromStatistics: 0,
    estimatedEnergyConsumptionFromStatisticsUnit: "kWh/m2",
    floorArea: 0,
  };
}

function emptyCommercialProperty(id: string): CommercialRealEstateProperty {
  return { id, name: "", propertyValueAtOrigination: 0 };
}

/**
 * Normalize legacy flat classInputs (Phase 6A/6B.1 subset) and v1 envelopes.
 * Never drops unknown nested keys from formData.
 */
export function normalizeClassInputs(
  raw: Record<string, unknown> | null | undefined,
  opts?: { defaultPropertyId?: string; defaultCommercialId?: string }
): SspClassInputsV1 {
  const source = asRecord(raw);
  const alreadyV1 = source.schemaVersion === 1 || source.formData != null || source.properties != null;

  if (alreadyV1) {
    const method = asRecord(source.methodSelection);
    const formData = {
      ...asRecord(source.formData),
    } as SspClassInputsV1["formData"];
    // Preserve any top-level legacy keys that accidentally sat beside the envelope.
    for (const [key, value] of Object.entries(source)) {
      if (
        key === "schemaVersion" ||
        key === "methodSelection" ||
        key === "formData" ||
        key === "properties" ||
        key === "commercialProperties"
      ) {
        continue;
      }
      if (formData[key] === undefined) formData[key] = value as never;
    }
    const properties = asArray<Property>(source.properties);
    const commercialProperties = asArray<CommercialRealEstateProperty>(source.commercialProperties);
    return {
      schemaVersion: 1,
      methodSelection: {
        hasEmissions: String(method.hasEmissions ?? ""),
        verificationStatus: String(method.verificationStatus ?? ""),
        corporateStructure: String(method.corporateStructure ?? ""),
        calculationMethod: String(method.calculationMethod ?? ""),
      },
      formData,
      properties,
      commercialProperties,
    };
  }

  // Legacy flat field subset → migrate into formData + one property row when values exist.
  const {
    propertyValueAtOrigination,
    floorArea,
    actualEnergyConsumption,
    supplierSpecificEmissionFactor,
    averageEmissionFactor,
    estimatedEnergyConsumptionFromLabels,
    estimatedEnergyConsumptionFromStatistics,
    numberOfBuildings,
    totalValueAtOrigination,
    outstandingAmount,
    vehicleType,
    fuelType,
    fuelConsumption,
    distance,
    efficiency,
    scope1Emissions,
    scope2Emissions,
    scope3Emissions,
    verificationStatus,
    totalEquityPlusDebt,
    evic,
    assetValue,
    ...rest
  } = source;

  const formData: SspClassInputsV1["formData"] = {
    ...rest,
    floorArea: floorArea as never,
    actual_energy_consumption: actualEnergyConsumption as never,
    supplier_specific_emission_factor: supplierSpecificEmissionFactor as never,
    average_emission_factor: averageEmissionFactor as never,
    estimated_energy_consumption_from_labels: estimatedEnergyConsumptionFromLabels as never,
    estimated_energy_consumption_from_statistics: estimatedEnergyConsumptionFromStatistics as never,
    number_of_buildings: numberOfBuildings as never,
    total_value_at_origination: totalValueAtOrigination as never,
    outstandingLoan: outstandingAmount as never,
    vehicle_type: vehicleType as never,
    fuel_type: fuelType as never,
    fuel_consumption: fuelConsumption as never,
    distance_traveled: distance as never,
    efficiency: efficiency as never,
    scope1Emissions: scope1Emissions as never,
    scope2Emissions: scope2Emissions as never,
    scope3Emissions: scope3Emissions as never,
    totalEquityPlusDebt: totalEquityPlusDebt as never,
    evic: evic as never,
    assetValue: assetValue as never,
    property_value_at_origination: propertyValueAtOrigination as never,
  };

  const propId = opts?.defaultPropertyId || cryptoRandomId("prop");
  const property: Property = {
    ...emptyProperty(propId),
    propertyValueAtOrigination: Number(propertyValueAtOrigination) || 0,
    floorArea: Number(floorArea) || 0,
    actualEnergyConsumption: Number(actualEnergyConsumption) || 0,
    supplierSpecificEmissionFactor: Number(supplierSpecificEmissionFactor) || 0,
    averageEmissionFactor: Number(averageEmissionFactor) || 0,
    estimatedEnergyConsumptionFromLabels: Number(estimatedEnergyConsumptionFromLabels) || 0,
    estimatedEnergyConsumptionFromStatistics: Number(estimatedEnergyConsumptionFromStatistics) || 0,
  };

  const creId = opts?.defaultCommercialId || cryptoRandomId("cre");
  const commercial: CommercialRealEstateProperty = {
    ...emptyCommercialProperty(creId),
    propertyValueAtOrigination: Number(propertyValueAtOrigination) || 0,
  };

  return {
    schemaVersion: 1,
    methodSelection: {
      ...EMPTY_METHOD_SELECTION,
      verificationStatus: String(verificationStatus ?? ""),
    },
    formData,
    properties: [property],
    commercialProperties: [commercial],
  };
}

export function serializeClassInputs(inputs: SspClassInputsV1): Record<string, unknown> {
  return {
    schemaVersion: 1 as const,
    methodSelection: { ...inputs.methodSelection },
    formData: { ...inputs.formData },
    properties: inputs.properties.map((p) => ({ ...p })),
    commercialProperties: inputs.commercialProperties.map((p) => ({ ...p })),
  };
}

function cryptoRandomId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyProperty(): Property {
  return emptyProperty(cryptoRandomId("prop"));
}

export function createEmptyCommercialProperty(): CommercialRealEstateProperty {
  return emptyCommercialProperty(cryptoRandomId("cre"));
}

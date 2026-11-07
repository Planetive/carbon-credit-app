import type { ApprovedLibraryFactor, FactorLibraryClass } from "@/api/factorLibrary";
import type { UopEstimationInputs, UopUnderlyingAssetClass } from "./types";
import type { UopPcafOptionDef } from "./underlyingOptions";

export const NO_VERIFIED_FACTOR_MESSAGE = "No verified factor available";

export const LIBRARY_COUNTRIES = [
  "United Kingdom",
  "United States",
  "Pakistan",
  "United Arab Emirates",
] as const;

export function libraryClassFor(
  assetClass: UopUnderlyingAssetClass | "",
  option?: UopPcafOptionDef
): FactorLibraryClass {
  if (assetClass === "mortgage" || assetClass === "commercial-real-estate") return "building";
  if (assetClass === "motor-vehicle-loan") return "vehicle";
  if (option?.method === "economic") return "economic";
  return "physical";
}

export function activityKeyFor(option?: UopPcafOptionDef, sectorKey = ""): string {
  if (option?.method === "economic") return sectorKey.trim() || "sector-intensity";
  if (option?.id === "2b" && option.fields.includes("production")) return "production";
  if (option?.fields.includes("fuel") || option?.fields.includes("distance")) return "vehicle-fuel";
  if (option?.fields.includes("energy") || option?.fields.includes("floorArea")) return "electricity";
  return "electricity";
}

export function applyConfirmedFactor(
  current: UopEstimationInputs,
  factor: ApprovedLibraryFactor
): UopEstimationInputs {
  return {
    ...current,
    libraryEntryId: factor.id,
    libraryPublicationId: factor.publication_id,
    libraryFactorValue: factor.factor_value,
    libraryFactorUnit: factor.unit,
    libraryGeography: factor.geography,
    libraryApplicableYear: String(factor.applicable_year),
    libraryDatasetVersion: factor.dataset_version,
    libraryCurrencyCode: factor.currency_code || "",
    libraryPriceYear: factor.price_year == null ? "" : String(factor.price_year),
    factorConfirmed: true,
    factorLibrary: factor.source_organization.toLowerCase().includes("desnz") ? "DEFRA" : current.factorLibrary,
    factorDatasetCode: factor.dataset_code,
    factorSource: factor.source_organization,
    factorGeography: factor.geography,
    factorYear: String(factor.applicable_year),
    factorUnit: factor.unit,
    emissionFactor: factor.factor_value,
    activityCurrency: factor.currency_code || current.activityCurrency,
    priceYear: factor.price_year == null ? current.priceYear : String(factor.price_year),
  };
}

export function clearLibrarySelection(current: UopEstimationInputs): UopEstimationInputs {
  return {
    ...current,
    libraryEntryId: "",
    libraryPublicationId: "",
    libraryFactorValue: null,
    libraryFactorUnit: "",
    libraryGeography: "",
    libraryApplicableYear: "",
    libraryDatasetVersion: "",
    libraryCurrencyCode: "",
    libraryPriceYear: "",
    factorConfirmed: false,
  };
}

/** Test helper: stamp an approved library snapshot onto a typed estimation. */
export function bindApprovedFactorForTest(
  current: UopEstimationInputs,
  overrides: Partial<UopEstimationInputs> = {}
): UopEstimationInputs {
  return {
    ...current,
    libraryEntryId: overrides.libraryEntryId || "11111111-1111-1111-1111-111111111111",
    libraryPublicationId: overrides.libraryPublicationId || "22222222-2222-2222-2222-222222222222",
    libraryFactorValue: current.emissionFactor,
    libraryFactorUnit: current.factorUnit,
    libraryGeography: current.factorGeography,
    libraryApplicableYear: current.factorYear,
    libraryCurrencyCode: overrides.libraryCurrencyCode || current.libraryCurrencyCode || current.activityCurrency || "PKR",
    libraryPriceYear: overrides.libraryPriceYear || current.libraryPriceYear || current.priceYear || current.factorYear,
    activityCurrency: overrides.activityCurrency || current.activityCurrency || current.libraryCurrencyCode || "PKR",
    priceYear: overrides.priceYear || current.priceYear || current.factorYear || "2024",
    factorConfirmed: true,
    ...overrides,
  };
}

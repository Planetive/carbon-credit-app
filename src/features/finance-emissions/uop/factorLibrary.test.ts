import { describe, expect, it } from "vitest";
import { applyConfirmedFactor, bindApprovedFactorForTest, libraryClassFor, activityKeyFor, NO_VERIFIED_FACTOR_MESSAGE } from "./factorLibrary";
import { emptyEstimation } from "./state";
import { optionDef } from "./underlyingOptions";
import { UOP_REPORTABLE_SAVE_AVAILABLE } from "./reportableGuard";
import type { ApprovedLibraryFactor } from "@/api/factorLibrary";

const ukElectricity: ApprovedLibraryFactor = {
  id: "11111111-1111-1111-1111-111111111111",
  publication_id: "22222222-2222-2222-2222-222222222222",
  dataset_code: "desnz_ghg_conversion_factors_2026",
  dataset_version: "2026",
  category: "purchased_electricity",
  library_class: "physical",
  geography: "United Kingdom",
  country_code: "GB",
  sector_or_activity: "electricity",
  activity_key: "electricity",
  factor_value: 0.13096,
  unit: "kg CO2e/kWh",
  numerator_unit: "kg CO2e",
  denominator_unit: "kWh",
  applicable_year: 2026,
  publication_year: 2026,
  gas: "CO2e",
  source_organization: "UK DESNZ",
  source_document: "GHG conversion factors 2026",
  source_url: "",
  provenance: "verified catalog row",
  license_name: "UK government conversion factors",
  permitted_use: "catalog_verified",
  currency_code: "",
  price_year: null,
  status: "approved",
};

describe("UoP approved factor picker helpers", () => {
  it("maps building and vehicle options to the matching library class", () => {
    expect(libraryClassFor("commercial-real-estate", optionDef("commercial-real-estate", "2a"))).toBe("building");
    expect(libraryClassFor("motor-vehicle-loan", optionDef("motor-vehicle-loan", "1a"))).toBe("vehicle");
    expect(libraryClassFor("business-loan", optionDef("business-loan", "3a"))).toBe("economic");
    expect(libraryClassFor("business-loan", optionDef("business-loan", "2a"))).toBe("physical");
  });

  it("does not treat Pakistan/UAE as a UK electricity substitute", () => {
    const applied = applyConfirmedFactor(emptyEstimation(), ukElectricity);
    expect(applied.factorGeography).toBe("United Kingdom");
    expect(applied.factorYear).toBe("2026");
    expect(applied.libraryEntryId).toBe(ukElectricity.id);
    expect(applied.factorConfirmed).toBe(true);
    expect(applied.emissionFactor).toBe(0.13096);
    expect(NO_VERIFIED_FACTOR_MESSAGE).toBe("No verified factor available");
  });

  it("keeps economic activity keys on the sector, not electricity", () => {
    expect(activityKeyFor(optionDef("listed-equity", "3a"), "manufacturing")).toBe("manufacturing");
  });

  it("does not enable production UoP Save", () => {
    expect(UOP_REPORTABLE_SAVE_AVAILABLE).toBe(false);
  });

  it("does not treat a typed factor as verified until a library id is bound", () => {
    const typed = bindApprovedFactorForTest({
      ...emptyEstimation(),
      emissionFactor: 0.5,
      factorGeography: "Pakistan",
      factorYear: "2024",
      factorUnit: "tCO2e/kWh",
    });
    expect(typed.libraryEntryId).toBeTruthy();
    expect(typed.factorConfirmed).toBe(true);
    expect(typed.libraryFactorValue).toBe(0.5);
  });
});

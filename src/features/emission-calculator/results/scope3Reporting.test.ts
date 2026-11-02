import { describe, expect, it } from "vitest";
import {
  category15VerifiedReferenceKg,
  duplicatePcafFacilitatedKg,
  isManualEquityInvestment,
  manualEquityIsVerified,
  notesOnlyCategoryIsComplete,
  NOT_CALCULATED_SCOPE3_CATEGORIES,
  scope3CompletionPercent,
  verifiedAnnualGrandKg,
  verifiedScope3AnnualKg,
} from "./scope3Reporting";

describe("Scope 3 reporting integrity", () => {
  it("keeps undated legacy Scope 3 out of the annual total at the year boundaries", () => {
    expect(verifiedScope3AnnualKg(1989)).toBeNull();
    expect(verifiedScope3AnnualKg(1990)).toBeNull();
    expect(verifiedScope3AnnualKg(2026)).toBeNull();
    expect(verifiedScope3AnnualKg(2200)).toBeNull();
    expect(verifiedScope3AnnualKg(2201)).toBeNull();
    expect(verifiedScope3AnnualKg(null)).toBeNull();

    const legacyScope3Kg = 15000;
    const grand = verifiedAnnualGrandKg({
      reportingYear: 2026,
      scope1Kg: 5311.45,
      scope2Kg: 177,
      legacyScope3Kg,
    });
    expect(grand).toBeCloseTo(5311.45 + 177, 6);
    expect(grand).not.toBeCloseTo(5311.45 + 177 + legacyScope3Kg, 1);
    expect(
      verifiedAnnualGrandKg({
        reportingYear: 1990,
        scope1Kg: 1,
        scope2Kg: 2,
        legacyScope3Kg: 999,
      }),
    ).toBe(3);
    expect(
      verifiedAnnualGrandKg({
        reportingYear: 2200,
        scope1Kg: 1,
        scope2Kg: 2,
        legacyScope3Kg: 999,
      }),
    ).toBe(3);
    expect(
      verifiedAnnualGrandKg({
        reportingYear: 1989,
        scope1Kg: 1,
        scope2Kg: 2,
        legacyScope3Kg: 0,
      }),
    ).toBeNull();
  });

  it("does not mix a legacy Scope 3 figure into verified Scope 2 kilograms", () => {
    const verifiedScope2Kg = 177;
    const legacySpendProduct = 350;
    const grand = verifiedAnnualGrandKg({
      reportingYear: 2026,
      scope1Kg: 0,
      scope2Kg: verifiedScope2Kg,
      legacyScope3Kg: legacySpendProduct,
    });
    expect(grand).toBe(verifiedScope2Kg);
    expect(grand).not.toBe(verifiedScope2Kg + legacySpendProduct);
  });

  it("does not mark Scope 3 complete because legacy records exist", () => {
    expect(scope3CompletionPercent(1200, null)).toBe(0);
    expect(scope3CompletionPercent(0, null)).toBe(0);
    expect(scope3CompletionPercent(0, 500, 3)).toBe(20);
    expect(scope3CompletionPercent(0, 500, 15)).toBeLessThan(100);
  });

  it("adds verified Scope 3 kilograms into the annual grand helper without legacy", () => {
    expect(
      verifiedAnnualGrandKg({
        reportingYear: 2026,
        scope1Kg: 100,
        scope2Kg: 50,
        legacyScope3Kg: 9000,
        verifiedScope3Kg: 25,
      }),
    ).toBe(175);
    expect(verifiedScope3AnnualKg(2026, 25)).toBe(25);
    expect(verifiedScope3AnnualKg(2026, 0)).toBe(0);
  });

  it("counts one PCAF calculation once when Category 15 and facilitated emissions share it", () => {
    const investments = [
      { line_type: "equity", emissions: 40, calculated_emissions: 10, ownership_percentage: 25 },
      {
        line_type: "financed",
        linked_finance_emission_calculation_id: "pcaf-1",
        emissions: 80,
        calculated_emissions: 80,
      },
    ];
    const facilitated = [
      { linked_finance_emission_calculation_id: "pcaf-1", emissions: 80 },
      { linked_emission_calculation_id: "other-portfolio", emissions: 15 },
    ];
    expect(duplicatePcafFacilitatedKg(investments, facilitated)).toBe(80);
    const legacyRollup = 10 + 80 + 15 + 80;
    const presentedOnce = legacyRollup - duplicatePcafFacilitatedKg(investments, facilitated);
    expect(presentedOnce).toBe(10 + 80 + 15);
    expect(presentedOnce).not.toBe(legacyRollup);
  });

  it("lists Cat 3, franchises and leased assets as not calculated", () => {
    expect(NOT_CALCULATED_SCOPE3_CATEGORIES.map((row) => row.key)).toEqual([
      "fuel_energy_activities",
      "franchises",
      "upstream_leased_assets",
      "downstream_leased_assets",
    ]);
    expect(NOT_CALCULATED_SCOPE3_CATEGORIES.some((row) => row.key === "franchises")).toBe(true);
    expect(notesOnlyCategoryIsComplete(true)).toBe(false);
  });

  it("keeps manual equity unverified and PCAF Cat 15 as reference-only", () => {
    const equity = { line_type: "equity", emissions: 40, calculated_emissions: 10 };
    const financed = {
      line_type: "financed",
      linked_finance_emission_calculation_id: "pcaf-1",
      emissions: 80,
      calculated_emissions: 80,
    };
    expect(isManualEquityInvestment(equity)).toBe(true);
    expect(manualEquityIsVerified(equity)).toBe(false);
    expect(category15VerifiedReferenceKg([equity, financed])).toBe(80);
    expect(category15VerifiedReferenceKg([equity])).toBe(0);
  });
});
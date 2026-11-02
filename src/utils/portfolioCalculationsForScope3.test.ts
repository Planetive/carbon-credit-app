import { describe, expect, it } from "vitest";
import {
  mapPortfolioCalculationsForScope3,
  scope3ImportLinkPayload,
} from "./portfolioCalculationsForScope3";
import type { FinancedCalculationRow } from "./financedEmissionsReporting";

function row(
  overrides: Partial<FinancedCalculationRow> & { id: string },
): FinancedCalculationRow {
  return {
    counterpartyId: "cp-1",
    calcKind: "finance",
    formulaId: "mortgage",
    formulaName: "Mortgage",
    financedEmissions: 0,
    status: "completed",
    updatedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    source: "emission_calculations",
    ...overrides,
  };
}

describe("Scope 3 Category 15 import candidates", () => {
  const names = new Map([["cp-1", "Acme Bank"]]);

  it("10. does not offer summary and detail together", () => {
    const listed = mapPortfolioCalculationsForScope3(
      [
        row({ id: "c1", formulaId: "mortgage", financedEmissions: 60, source: "finance_emission_calculations" }),
        row({
          id: "c2",
          formulaId: "business-loan",
          formulaName: "Business Loan",
          financedEmissions: 40,
          source: "finance_emission_calculations",
        }),
        row({
          id: "agg",
          formulaId: "aggregate",
          formulaName: "Aggregate",
          financedEmissions: 100,
          updatedAt: "2026-06-01T00:00:00.000Z",
          createdAt: "2026-06-01T00:00:00.000Z",
        }),
      ],
      "finance",
      names,
    );
    expect(listed.map((item) => item.id)).toEqual(["agg"]);
    expect(listed[0]?.financedEmissions).toBe(100);
    expect(listed[0]?.counterpartyName).toBe("Acme Bank");
  });

  it("offers each component when no aggregate exists", () => {
    const listed = mapPortfolioCalculationsForScope3(
      [
        row({ id: "loan-a", formulaId: "business-loan", financedEmissions: 60 }),
        row({
          id: "loan-b",
          formulaId: "project-finance",
          formulaName: "Project Finance",
          financedEmissions: 40,
        }),
      ],
      "finance",
      names,
    );
    expect(listed.map((item) => item.id).sort()).toEqual(["loan-a", "loan-b"]);
    expect(listed.reduce((sum, item) => sum + item.financedEmissions, 0)).toBe(100);
  });

  it("keeps finance and facilitated imports separate", () => {
    const listed = mapPortfolioCalculationsForScope3(
      [
        row({ id: "fin-agg", formulaId: "aggregate", financedEmissions: 100 }),
        row({
          id: "fac-agg",
          calcKind: "facilitated",
          formulaId: "aggregate",
          financedEmissions: 25,
        }),
      ],
      "facilitated",
      names,
    );
    expect(listed.map((item) => item.id)).toEqual(["fac-agg"]);
  });

  it("maps JWT rows without using legacy foreign keys", () => {
    const listed = mapPortfolioCalculationsForScope3(
      [
        row({
          id: "jwt-agg",
          formulaId: "aggregate",
          financedEmissions: 20,
          source: "jwt",
        }),
        row({
          id: "jwt-m",
          formulaId: "mortgage",
          financedEmissions: 12,
          source: "jwt",
        }),
      ],
      "finance",
      names,
    );
    expect(listed).toHaveLength(1);
    expect(listed[0]?.source).toBe("jwt");
    expect(scope3ImportLinkPayload(listed[0]!)).toEqual({
      linked_financed_emissions_id: "jwt-agg",
    });
  });

  it("uses legacy FKs for emission_calculations and finance_emission_calculations", () => {
    expect(
      scope3ImportLinkPayload({ id: "ec-1", source: "emission_calculations" }),
    ).toEqual({ linked_emission_calculation_id: "ec-1" });
    expect(
      scope3ImportLinkPayload({ id: "fec-1", source: "finance_emission_calculations" }),
    ).toEqual({ linked_finance_emission_calculation_id: "fec-1" });
  });
});

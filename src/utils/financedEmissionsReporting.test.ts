import { describe, expect, it } from "vitest";
import {
  selectCompanyDisplayRow,
  selectFinancedGroup,
  selectImportableFinancedRows,
  summarizeFinancedPortfolio,
  type FinancedCalculationRow,
  type FinancedRowSource,
} from "./financedEmissionsReporting";

function row(overrides: Partial<FinancedCalculationRow> & { id: string }): FinancedCalculationRow {
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

function ids(rows: FinancedCalculationRow[]): string[] {
  return rows.map((item) => item.id).sort();
}

describe("financed emissions reporting contract", () => {
  it("1. one loan with one calculation uses the component total", () => {
    const group = selectFinancedGroup([
      row({ id: "loan-1", formulaId: "business-loan", financedEmissions: 42 }),
    ]);
    expect(group.reason).toBe("components-sum");
    expect(group.total).toBe(42);
    expect(ids(group.selectedRows)).toEqual(["loan-1"]);
  });

  it("2b. two legitimate same-class loans are both included when only components exist", () => {
    const group = selectFinancedGroup([
      row({ id: "mortgage-a", formulaId: "mortgage", financedEmissions: 30 }),
      row({ id: "mortgage-b", formulaId: "mortgage", financedEmissions: 45 }),
    ]);
    expect(group.reason).toBe("components-sum");
    expect(group.total).toBe(75);
    expect(ids(group.selectedRows)).toEqual(["mortgage-a", "mortgage-b"]);
  });

  it("2. two legitimate loans under one counterparty are both included when only components exist", () => {
    const group = selectFinancedGroup([
      row({ id: "loan-a", formulaId: "business-loan", financedEmissions: 60 }),
      row({
        id: "loan-b",
        formulaId: "project-finance",
        formulaName: "Project Finance",
        financedEmissions: 40,
      }),
    ]);
    expect(group.reason).toBe("components-sum");
    expect(group.total).toBe(100);
    expect(ids(group.selectedRows)).toEqual(["loan-a", "loan-b"]);
  });

  it("3. two asset classes under one counterparty are not dropped", () => {
    const summary = summarizeFinancedPortfolio([
      row({ id: "bond", formulaId: "corporate-bond", financedEmissions: 25 }),
      row({ id: "vehicle", formulaId: "motor-vehicle-loan", financedEmissions: 15 }),
    ]);
    expect(summary.financeTotal).toBe(40);
    expect(summary.financeCounterparties).toBe(1);
  });

  it("4. individual calculations plus an aggregate are not added together", () => {
    const group = selectFinancedGroup([
      row({ id: "c1", formulaId: "mortgage", financedEmissions: 60 }),
      row({ id: "c2", formulaId: "business-loan", financedEmissions: 40 }),
      row({
        id: "agg",
        formulaId: "aggregate",
        formulaName: "Aggregate",
        financedEmissions: 100,
        updatedAt: "2026-02-01T00:00:00.000Z",
      }),
    ]);
    expect(group.reason).toBe("aggregate");
    expect(group.total).toBe(100);
    expect(ids(group.selectedRows)).toEqual(["agg"]);
    expect(ids(group.discardedRows).sort()).toEqual(["c1", "c2"]);
  });

  it("5. aggregate-only legacy records remain reportable", () => {
    const group = selectFinancedGroup([
      row({
        id: "legacy-agg",
        formulaId: "aggregate",
        financedEmissions: 77.5,
        source: "emission_calculations",
      }),
    ]);
    expect(group.reason).toBe("aggregate");
    expect(group.total).toBe(77.5);
  });

  it("6. recalculated aggregates replace superseded totals", () => {
    const group = selectFinancedGroup([
      row({
        id: "old-agg",
        formulaId: "aggregate",
        financedEmissions: 80,
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
      row({
        id: "new-agg",
        formulaId: "aggregate",
        financedEmissions: 55,
        updatedAt: "2026-03-01T00:00:00.000Z",
      }),
      row({ id: "stale-component", formulaId: "mortgage", financedEmissions: 80 }),
    ]);
    expect(group.selectedRows[0]?.id).toBe("new-agg");
    expect(group.total).toBe(55);
  });

  it("7. JWT-only records use the JWT aggregate and ignore missing legacy tables", () => {
    const jwt: FinancedRowSource = "jwt";
    const group = selectFinancedGroup([
      row({ id: "jwt-m", formulaId: "mortgage", financedEmissions: 12, source: jwt }),
      row({ id: "jwt-b", formulaId: "business-loan", financedEmissions: 8, source: jwt }),
      row({
        id: "jwt-agg",
        formulaId: "aggregate",
        financedEmissions: 20,
        source: jwt,
        updatedAt: "2026-04-01T00:00:00.000Z",
      }),
    ]);
    expect(group.reason).toBe("aggregate");
    expect(group.total).toBe(20);
    expect(group.selectedRows[0]?.source).toBe("jwt");
  });

  it("8. mixed legacy/JWT rows for the same exposure use JWT only", () => {
    const group = selectFinancedGroup([
      row({
        id: "jwt-agg",
        formulaId: "aggregate",
        financedEmissions: 100,
        source: "jwt",
        updatedAt: "2026-05-01T00:00:00.000Z",
      }),
      row({
        id: "ec-agg",
        formulaId: "aggregate",
        financedEmissions: 100,
        source: "emission_calculations",
      }),
      row({
        id: "fec-1",
        formulaId: "mortgage",
        financedEmissions: 60,
        source: "finance_emission_calculations",
      }),
      row({
        id: "fec-2",
        formulaId: "business-loan",
        financedEmissions: 40,
        source: "finance_emission_calculations",
      }),
    ]);
    expect(group.total).toBe(100);
    expect(group.selectedRows).toHaveLength(1);
    expect(group.selectedRows[0]?.id).toBe("jwt-agg");
  });

  it("9. missing provenance and ineligible rows are excluded", () => {
    const group = selectFinancedGroup([
      row({
        id: "failed",
        formulaId: "mortgage",
        financedEmissions: 999,
        status: "failed",
      }),
      row({
        id: "draft",
        formulaId: "mortgage",
        financedEmissions: 50,
        status: "draft",
      }),
      row({
        id: "orphan",
        counterpartyId: null,
        formulaId: null,
        financedEmissions: 11,
      }),
    ]);
    expect(group.reason).toBe("components-sum");
    expect(group.total).toBe(11);
    expect(group.selectedRows[0]?.id).toBe("orphan");
  });

  it("9b. mixed legacy tables without an aggregate do not sum EC and FEC together", () => {
    const group = selectFinancedGroup([
      row({
        id: "ec-m",
        formulaId: "mortgage",
        financedEmissions: 60,
        source: "emission_calculations",
      }),
      row({
        id: "fec-m",
        formulaId: "mortgage",
        financedEmissions: 60,
        source: "finance_emission_calculations",
      }),
    ]);
    expect(group.total).toBe(60);
    expect(group.selectedRows[0]?.id).toBe("fec-m");
  });

  it("10. Scope 3 import does not offer summary and detail together", () => {
    const importable = selectImportableFinancedRows(
      [
        row({ id: "c1", formulaId: "mortgage", financedEmissions: 60 }),
        row({ id: "c2", formulaId: "business-loan", financedEmissions: 40 }),
        row({
          id: "agg",
          formulaId: "aggregate",
          financedEmissions: 100,
          updatedAt: "2026-06-01T00:00:00.000Z",
        }),
        row({
          id: "fac-agg",
          calcKind: "facilitated",
          formulaId: "aggregate",
          financedEmissions: 33,
        }),
      ],
      "finance",
    );
    expect(ids(importable)).toEqual(["agg"]);
    expect(importable.every((item) => item.calcKind === "finance")).toBe(true);
  });

  it("10b. Scope 3 import falls back to components when no aggregate exists", () => {
    const importable = selectImportableFinancedRows(
      [
        row({ id: "c1", formulaId: "mortgage", financedEmissions: 60 }),
        row({ id: "c2", formulaId: "business-loan", financedEmissions: 40 }),
      ],
      "finance",
    );
    expect(ids(importable)).toEqual(["c1", "c2"]);
  });

  it("keeps finance and facilitated totals separate", () => {
    const summary = summarizeFinancedPortfolio([
      row({
        id: "fin-agg",
        formulaId: "aggregate",
        financedEmissions: 100,
      }),
      row({
        id: "fac-agg",
        calcKind: "facilitated",
        formulaId: "aggregate",
        financedEmissions: 25,
      }),
    ]);
    expect(summary.financeTotal).toBe(100);
    expect(summary.facilitatedTotal).toBe(25);
  });

  it("uses the latest aggregate as the company display total", () => {
    const display = selectCompanyDisplayRow(
      [
        row({ id: "c1", formulaId: "mortgage", financedEmissions: 60 }),
        row({
          id: "agg",
          formulaId: "aggregate",
          financedEmissions: 100,
          results: { allResults: [{ type: "mortgage", financedEmissions: 60 }] },
          updatedAt: "2026-07-01T00:00:00.000Z",
        }),
      ],
      "finance",
    );
    expect(display?.id).toBe("agg");
    expect(display?.financedEmissions).toBe(100);
  });

  it("does not count leftover unlinked formula rows after instanced loans exist", () => {
    const group = selectFinancedGroup([
      row({
        id: "legacy",
        formulaId: "mortgage",
        financedEmissions: 99,
        financingInstanceId: null,
      }),
      row({
        id: "m1",
        formulaId: "mortgage",
        financedEmissions: 10,
        financingInstanceId: "mort-1",
      }),
      row({
        id: "m2",
        formulaId: "mortgage",
        financedEmissions: 12,
        financingInstanceId: "mort-2",
      }),
    ]);
    expect(group.total).toBe(22);
    expect(ids(group.selectedRows)).toEqual(["m1", "m2"]);
  });

  it("does not treat incomplete non-finite emissions as reportable", () => {
    const group = selectFinancedGroup([
      row({ id: "nan", formulaId: "mortgage", financedEmissions: Number.NaN }),
      row({ id: "ok", formulaId: "business-loan", financedEmissions: 9 }),
    ]);
    expect(group.total).toBe(9);
  });

  it("includes a UoP parent once and never its underlying look-through", () => {
    const group = selectFinancedGroup([
      row({
        id: "uop-parent",
        formulaId: "uop-separate-lookthrough",
        formulaName: "PCAF §5.7 separate look-through",
        financedEmissions: 46,
        dataQualityScore: 1.4,
        financingInstanceId: "uop-a",
        source: "jwt",
        results: { reporting_role: "uop_parent", include_underlying_independently: false },
      }),
      row({
        id: "uop-underlying",
        formulaId: "mortgage",
        financedEmissions: 36,
        source: "jwt",
        results: { reporting_role: "uop_underlying" },
      }),
    ]);
    expect(group.total).toBe(46);
    expect(ids(group.selectedRows)).toEqual(["uop-parent"]);
  });

  it("keeps two holdings in the same fund independent", () => {
    const group = selectFinancedGroup([
      row({
        id: "hold-a",
        formulaId: "uop-separate-lookthrough",
        financedEmissions: 46,
        financingInstanceId: "uop-a",
        source: "jwt",
      }),
      row({
        id: "hold-b",
        formulaId: "uop-separate-lookthrough",
        financedEmissions: 18.4,
        financingInstanceId: "uop-b",
        source: "jwt",
      }),
    ]);
    expect(group.total).toBeCloseTo(64.4);
    expect(ids(group.selectedRows)).toEqual(["hold-a", "hold-b"]);
  });

  it("adds a UoP parent beside a general-purpose aggregate without double-counting components", () => {
    const jwt: FinancedRowSource = "jwt";
    const group = selectFinancedGroup([
      row({ id: "c1", formulaId: "mortgage", financedEmissions: 60, source: jwt }),
      row({
        id: "agg",
        formulaId: "aggregate",
        financedEmissions: 100,
        source: jwt,
        updatedAt: "2026-02-01T00:00:00.000Z",
      }),
      row({
        id: "uop-parent",
        formulaId: "uop-issuer-reported",
        financedEmissions: 20,
        financingInstanceId: "uop-a",
        source: jwt,
        results: { reporting_role: "uop_parent" },
      }),
    ]);
    expect(group.total).toBe(120);
    expect(ids(group.selectedRows)).toEqual(["agg", "uop-parent"]);
    const importable = selectImportableFinancedRows(
      [
        row({ id: "c1", formulaId: "mortgage", financedEmissions: 60, source: jwt }),
        row({
          id: "agg",
          formulaId: "aggregate",
          financedEmissions: 100,
          source: jwt,
          updatedAt: "2026-02-01T00:00:00.000Z",
        }),
        row({
          id: "uop-parent",
          formulaId: "uop-issuer-reported",
          financedEmissions: 20,
          financingInstanceId: "uop-a",
          source: jwt,
        }),
      ],
      "finance",
    );
    expect(ids(importable)).toEqual(["agg", "uop-parent"]);
  });

  it("counts the same financing instance once across reporting years unless a year is selected", () => {
    const jwt: FinancedRowSource = "jwt";
    const rows = [
      row({
        id: "uop-2025",
        formulaId: "uop-separate-lookthrough",
        financedEmissions: 40,
        financingInstanceId: "uop-a",
        source: jwt,
        updatedAt: "2025-12-31T00:00:00.000Z",
        inputs: { reporting_year: "2025" },
        results: { reporting_role: "uop_parent", reporting_year: "2025" },
      }),
      row({
        id: "uop-2026",
        formulaId: "uop-separate-lookthrough",
        financedEmissions: 46,
        financingInstanceId: "uop-a",
        source: jwt,
        updatedAt: "2026-12-31T00:00:00.000Z",
        inputs: { reporting_year: "2026" },
        results: { reporting_role: "uop_parent", reporting_year: "2026" },
      }),
    ];
    const latest = selectFinancedGroup(rows);
    expect(latest.total).toBe(46);
    expect(ids(latest.selectedRows)).toEqual(["uop-2026"]);
    const year2025 = selectFinancedGroup(rows, { reportingYear: "2025" });
    expect(year2025.total).toBe(40);
    expect(ids(year2025.selectedRows)).toEqual(["uop-2025"]);
    const importable = selectImportableFinancedRows(rows, "finance");
    expect(ids(importable)).toEqual(["uop-2026"]);
  });

  it("excludes unresolved UoP / general-purpose overlap from Category 15", () => {
    const importable = selectImportableFinancedRows(
      [
        row({
          id: "gp",
          formulaId: "mortgage",
          financedEmissions: 12,
          financingInstanceId: "gp-1",
          source: "jwt",
        }),
        row({
          id: "uop-overlap",
          formulaId: "uop-separate-lookthrough",
          financedEmissions: 46,
          status: "review_required",
          financingInstanceId: "uop-a",
          source: "jwt",
          results: { overlap: { status: "review_required" } },
        }),
      ],
      "finance",
    );
    expect(ids(importable)).toEqual(["gp"]);
  });
});

import { describe, expect, it } from "vitest";
import type { FinancedCalculationRow } from "./financedEmissionsReporting";
import {
  assessScope3FinancedImport,
  assessScope3FinancedImportBatch,
  importedActivityFromRecord,
  selectCategory15ReportableActivities,
  sumCategory15AttributedSafely,
  type Scope3ImportedActivity,
} from "./scope3FinancedImportSafety";

function calc(
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

function activity(
  overrides: Partial<Scope3ImportedActivity> & { id: string },
): Scope3ImportedActivity {
  return {
    label: "Acme",
    lineType: "financed",
    ...overrides,
  };
}

const reporting = [
  calc({
    id: "c1",
    formulaId: "mortgage",
    financedEmissions: 60,
    source: "finance_emission_calculations",
  }),
  calc({
    id: "c2",
    formulaId: "business-loan",
    formulaName: "Business Loan",
    financedEmissions: 40,
    source: "finance_emission_calculations",
  }),
  calc({
    id: "agg",
    formulaId: "aggregate",
    financedEmissions: 100,
    source: "emission_calculations",
    updatedAt: "2026-06-01T00:00:00.000Z",
  }),
];

describe("Category 15 financed import safety", () => {
  it("blocks an aggregate when component activities already exist", () => {
    const existing = [
      activity({
        id: "inv-c1",
        label: "Acme mortgage",
        attributedEmissions: 60,
        linkedFinanceEmissionCalculationId: "c1",
      }),
      activity({
        id: "inv-c2",
        label: "Acme business loan",
        attributedEmissions: 40,
        linkedFinanceEmissionCalculationId: "c2",
      }),
    ];
    const result = assessScope3FinancedImport({
      candidate: {
        id: "agg",
        source: "emission_calculations",
        formulaId: "aggregate",
        counterpartyId: "cp-1",
        counterpartyName: "Acme",
      },
      existing,
      reportingRows: reporting,
      calcKind: "finance",
    });
    expect(result.status).toBe("overlap");
    expect(result.blocked).toBe(true);
    expect(result.conflictingActivities.map((item) => item.id).sort()).toEqual([
      "inv-c1",
      "inv-c2",
    ]);
    expect(result.message).toContain("detailed financed calculations");
  });

  it("blocks a component when an aggregate activity already exists", () => {
    const result = assessScope3FinancedImport({
      candidate: {
        id: "c1",
        source: "finance_emission_calculations",
        formulaId: "mortgage",
        counterpartyId: "cp-1",
        counterpartyName: "Acme",
      },
      existing: [
        activity({
          id: "inv-agg",
          label: "Acme total",
          attributedEmissions: 100,
          linkedEmissionCalculationId: "agg",
        }),
      ],
      reportingRows: reporting,
      calcKind: "finance",
    });
    expect(result.status).toBe("overlap");
    expect(result.blocked).toBe(true);
    expect(result.conflictingActivities.map((item) => item.id)).toEqual(["inv-agg"]);
  });

  it("blocks auto-sync of an overlapping aggregate and still allows a different counterparty", () => {
    const batch = assessScope3FinancedImportBatch({
      candidates: [
        {
          id: "agg",
          source: "emission_calculations",
          formulaId: "aggregate",
          counterpartyId: "cp-1",
          counterpartyName: "Acme",
        },
        {
          id: "other-loan",
          source: "finance_emission_calculations",
          formulaId: "project-finance",
          counterpartyId: "cp-2",
          counterpartyName: "Beta",
        },
      ],
      existing: [
        activity({
          id: "inv-c1",
          label: "Acme mortgage",
          linkedFinanceEmissionCalculationId: "c1",
        }),
      ],
      reportingRows: [
        ...reporting,
        calc({
          id: "other-loan",
          counterpartyId: "cp-2",
          formulaId: "project-finance",
          financedEmissions: 15,
          source: "finance_emission_calculations",
        }),
      ],
      calcKind: "finance",
    });
    expect(batch.blocked.map((item) => item.candidate.id)).toEqual(["agg"]);
    expect(batch.allowed.map((item) => item.id)).toEqual(["other-loan"]);
  });

  it("allows two legitimate same-class exposures when no aggregate is imported", () => {
    const rows = [
      calc({ id: "mortgage-a", formulaId: "mortgage", financedEmissions: 30 }),
      calc({ id: "mortgage-b", formulaId: "mortgage", financedEmissions: 45 }),
    ];
    const first = assessScope3FinancedImport({
      candidate: {
        id: "mortgage-a",
        source: "emission_calculations",
        formulaId: "mortgage",
        counterpartyId: "cp-1",
        counterpartyName: "Acme",
      },
      existing: [],
      reportingRows: rows,
      calcKind: "finance",
    });
    expect(first.status).toBe("allow");
    const second = assessScope3FinancedImport({
      candidate: {
        id: "mortgage-b",
        source: "emission_calculations",
        formulaId: "mortgage",
        counterpartyId: "cp-1",
        counterpartyName: "Acme",
      },
      existing: [
        activity({
          id: "inv-a",
          label: "Acme mortgage A",
          linkedEmissionCalculationId: "mortgage-a",
        }),
      ],
      reportingRows: rows,
      calcKind: "finance",
    });
    expect(second.status).toBe("allow");
    expect(second.blocked).toBe(false);
  });

  it("treats JWT and legacy identifiers for the same exposure as already imported", () => {
    const result = assessScope3FinancedImport({
      candidate: {
        id: "jwt-agg",
        source: "jwt",
        formulaId: "aggregate",
        counterpartyId: "cp-1",
        counterpartyName: "Acme",
        legacySource: "emission_calculations",
        legacyId: "agg",
      },
      existing: [
        activity({
          id: "inv-legacy",
          label: "Acme total",
          linkedEmissionCalculationId: "agg",
        }),
      ],
      reportingRows: [
        calc({
          id: "jwt-agg",
          formulaId: "aggregate",
          source: "jwt",
          financedEmissions: 100,
          legacySource: "emission_calculations",
          legacyId: "agg",
        }),
        calc({
          id: "jwt-m",
          formulaId: "mortgage",
          source: "jwt",
          financedEmissions: 60,
          legacySource: "finance_emission_calculations",
          legacyId: "c1",
        }),
      ],
      calcKind: "finance",
    });
    expect(result.status).toBe("already-imported");
    expect(result.blocked).toBe(false);
  });

  it("blocks unresolved JWT/legacy overlap when source identifiers cannot be matched", () => {
    const result = assessScope3FinancedImport({
      candidate: {
        id: "jwt-agg",
        source: "jwt",
        formulaId: "aggregate",
        counterpartyId: "cp-1",
        counterpartyName: "Acme",
      },
      existing: [
        activity({
          id: "inv-orphan",
          label: "Acme",
          linkedFinanceEmissionCalculationId: "old-fec-component",
        }),
      ],
      reportingRows: [
        calc({
          id: "jwt-agg",
          formulaId: "aggregate",
          source: "jwt",
          financedEmissions: 100,
        }),
      ],
      calcKind: "finance",
    });
    expect(result.status).toBe("unresolved");
    expect(result.blocked).toBe(true);
    expect(result.conflictingActivities.map((item) => item.id)).toEqual(["inv-orphan"]);
  });

  it("blocks a candidate with missing source identifiers", () => {
    const result = assessScope3FinancedImport({
      candidate: {
        id: "",
        source: "emission_calculations",
        formulaId: "aggregate",
      },
      existing: [],
      reportingRows: reporting,
      calcKind: "finance",
    });
    expect(result.status).toBe("unresolved");
    expect(result.blocked).toBe(true);
  });

  it("reads JWT link ids from activity raw metadata", () => {
    const activityRow = importedActivityFromRecord({
      id: "act-1",
      company_name: "Acme",
      line_type: "financed",
      raw: { linked_financed_emissions_id: "jwt-agg" },
    });
    expect(activityRow.linkedFinancedEmissionsId).toBe("jwt-agg");
  });

  it("does not add overlapping historical aggregate and components in a reportable total", () => {
    const rows = [
      {
        id: "inv-c1",
        company_name: "Acme mortgage",
        line_type: "financed",
        calculated_emissions: 60,
        linked_finance_emission_calculation_id: "c1",
      },
      {
        id: "inv-agg",
        company_name: "Acme total",
        line_type: "financed",
        calculated_emissions: 100,
        linked_emission_calculation_id: "agg",
      },
      {
        id: "equity",
        company_name: "Other co",
        line_type: "equity",
        calculated_emissions: 10,
      },
    ];
    expect(sumCategory15AttributedSafely(rows, reporting, "finance")).toBe(110);
    const selection = selectCategory15ReportableActivities(
      rows.map(importedActivityFromRecord),
      reporting,
      "finance",
    );
    expect(selection.overlapping.map((item) => item.id).sort()).toEqual([
      "inv-agg",
      "inv-c1",
    ]);
  });
});

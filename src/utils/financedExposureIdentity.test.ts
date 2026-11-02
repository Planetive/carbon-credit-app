import { describe, expect, it } from "vitest";
import {
  clonePropertyList,
  countResultsForFormula,
  ensureFinancingInstanceId,
  extractFinancingInstanceId,
  loanInstanceKey,
  loanTypeQuantitiesFromCalculations,
  loanTypeQuantitiesFromSavedRecords,
  matchFinancedRecordForSave,
  withFinancingIdentitySteps,
} from "./financedExposureIdentity";
import {
  selectFinancedGroup,
  selectImportableFinancedRows,
  summarizeFinancedPortfolio,
  type FinancedCalculationRow,
} from "./financedEmissionsReporting";
import {
  assessScope3FinancedImport,
  selectCategory15ReportableActivities,
} from "./scope3FinancedImportSafety";

function row(overrides: Partial<FinancedCalculationRow>): FinancedCalculationRow {
  return {
    id: "id",
    counterpartyId: "co-1",
    calcKind: "finance",
    formulaId: "business-loan",
    formulaName: "Business Loan",
    financedEmissions: 10,
    status: "completed",
    updatedAt: "2026-01-01T00:00:00Z",
    createdAt: "2026-01-01T00:00:00Z",
    source: "jwt",
    ...overrides,
  };
}

describe("financed exposure identity", () => {
  it("extracts instance id from inputs, pcafInputs, and calculation_steps", () => {
    expect(extractFinancingInstanceId({ financing_instance_id: "a" })).toBe("a");
    expect(extractFinancingInstanceId({ inputs: { financing_instance_id: "b" } })).toBe("b");
    expect(extractFinancingInstanceId({
      calculation_steps: [{ step: "__financing_identity__", financing_instance_id: "c" }],
    })).toBe("c");
  });

  it("keeps instance keys per asset class and instance number", () => {
    expect(loanInstanceKey("mortgage", 1)).toBe("mortgage#1");
    expect(loanInstanceKey("mortgage", 2)).toBe("mortgage#2");
  });

  it("reuses a stored instance id instead of minting a new one", () => {
    const first = ensureFinancingInstanceId({}, "mortgage#1");
    const second = ensureFinancingInstanceId(first.map, "mortgage#1");
    expect(second.id).toBe(first.id);
    expect(second.map["mortgage#1"]).toBe(first.id);
  });

  it("matches two loans with the same formula by different instance ids", () => {
    const existing = [
      { id: "row-a", formulaId: "business-loan", financingInstanceId: "loan-a" },
      { id: "row-b", formulaId: "business-loan", financingInstanceId: "loan-b" },
    ];
    expect(matchFinancedRecordForSave({
      existing,
      formulaId: "business-loan",
      financingInstanceId: "loan-a",
      currentCountForFormula: 2,
    })?.id).toBe("row-a");
    expect(matchFinancedRecordForSave({
      existing,
      formulaId: "business-loan",
      financingInstanceId: "loan-b",
      currentCountForFormula: 2,
    })?.id).toBe("row-b");
  });

  it("does not treat formula_id as identity when a second instance appears", () => {
    const existing = [
      { id: "legacy", formulaId: "business-loan", financingInstanceId: null },
    ];
    expect(matchFinancedRecordForSave({
      existing,
      formulaId: "business-loan",
      financingInstanceId: "new-1",
      currentCountForFormula: 2,
    })).toBeNull();
    expect(matchFinancedRecordForSave({
      existing,
      formulaId: "business-loan",
      financingInstanceId: "new-2",
      currentCountForFormula: 2,
    })).toBeNull();
  });

  it("links a single new instance onto the one unlinked legacy row of that class", () => {
    expect(matchFinancedRecordForSave({
      existing: [{ id: "legacy", formulaId: "business-loan", financingInstanceId: null }],
      formulaId: "business-loan",
      financingInstanceId: "loan-a",
      currentCountForFormula: 1,
    })?.id).toBe("legacy");
  });

  it("updates a single unlinked legacy row only when the session has one loan of that class", () => {
    const existing = [
      { id: "legacy", formulaId: "mortgage", financingInstanceId: null },
    ];
    expect(matchFinancedRecordForSave({
      existing,
      formulaId: "mortgage",
      financingInstanceId: null,
      currentCountForFormula: 1,
    })?.id).toBe("legacy");
    expect(matchFinancedRecordForSave({
      existing,
      formulaId: "mortgage",
      financingInstanceId: null,
      currentCountForFormula: 2,
    })).toBeNull();
  });

  it("recalculating the same exposure updates that row, not a sibling", () => {
    const existing = [
      { id: "m1", formulaId: "mortgage", financingInstanceId: "mort-1" },
      { id: "m2", formulaId: "mortgage", financingInstanceId: "mort-2" },
    ];
    expect(matchFinancedRecordForSave({
      existing,
      formulaId: "mortgage",
      financingInstanceId: "mort-1",
      currentCountForFormula: 2,
    })?.id).toBe("m1");
  });

  it("keeps different asset classes under one counterparty independent", () => {
    const existing = [
      { id: "loan", formulaId: "business-loan", financingInstanceId: "a" },
      { id: "mort", formulaId: "mortgage", financingInstanceId: "b" },
    ];
    expect(matchFinancedRecordForSave({
      existing,
      formulaId: "business-loan",
      financingInstanceId: "a",
      currentCountForFormula: 1,
    })?.id).toBe("loan");
    expect(matchFinancedRecordForSave({
      existing,
      formulaId: "mortgage",
      financingInstanceId: "b",
      currentCountForFormula: 1,
    })?.id).toBe("mort");
  });

  it("reloads previously saved instance counts without treating formula_id as a unique loan", () => {
    expect(loanTypeQuantitiesFromSavedRecords([
      { formulaId: "mortgage", financingInstanceId: "m1" },
      { formulaId: "mortgage", financingInstanceId: "m2" },
      { formulaId: "business-loan", financingInstanceId: "b1" },
      { formulaId: "aggregate", financingInstanceId: null },
    ])).toEqual([
      { type: "mortgage", quantity: 2 },
      { type: "business-loan", quantity: 1 },
    ]);
  });

  it("reloads a single unlinked legacy formula as one exposure and ignores guessed ids", () => {
    expect(loanTypeQuantitiesFromSavedRecords([
      { formulaId: "mortgage", financingInstanceId: null },
    ])).toEqual([{ type: "mortgage", quantity: 1 }]);
    expect(loanTypeQuantitiesFromSavedRecords([
      { formulaId: "mortgage", financingInstanceId: "m1" },
      { formulaId: "mortgage", financingInstanceId: "m2" },
      { formulaId: "mortgage", financingInstanceId: null },
    ])).toEqual([{ type: "mortgage", quantity: 2 }]);
  });

  it("keeps mortgage property arrays independent per instance", () => {
    const fallback = [{ id: "p0", value: 1 }];
    const m1 = clonePropertyList([{ id: "house-a", value: 100 }], fallback);
    const m2 = clonePropertyList([{ id: "house-b", value: 200 }], fallback);
    m1[0].value = 999;
    expect(m2[0]).toEqual({ id: "house-b", value: 200 });
    expect(clonePropertyList(undefined, fallback)[0].id).toBe("p0");
  });

  it("keeps CRE property arrays independent per instance", () => {
    const fallback = [{ id: "c0", building: "office" }];
    const a = clonePropertyList([{ id: "cre-a", building: "warehouse" }], fallback);
    const b = clonePropertyList([{ id: "cre-b", building: "retail" }], fallback);
    a[0].building = "changed";
    expect(b[0].building).toBe("retail");
  });

  it("reloads saved records from instance ids, not from formula_id uniqueness", () => {
    expect(loanTypeQuantitiesFromCalculations([
      {
        formula_id: "mortgage",
        inputs: { financing_instance_id: "m1" },
      },
      {
        formula_id: "mortgage",
        calculation_steps: [{ step: "__financing_identity__", financing_instance_id: "m2" }],
      },
      {
        formula_id: "aggregate",
        inputs: { loanTypes: ["mortgage", "mortgage"] },
      },
    ])).toEqual([{ type: "mortgage", quantity: 2 }]);
  });

  it("JWT and legacy persistence update the intended exposure instead of overwriting by formula_id", () => {
    const store: Array<{
      id: string;
      formulaId: string;
      financingInstanceId: string | null;
      value: number;
    }> = [];
    const save = (formulaId: string, instanceId: string, value: number, count: number) => {
      const match = matchFinancedRecordForSave({
        existing: store,
        formulaId,
        financingInstanceId: instanceId,
        currentCountForFormula: count,
      });
      if (match) {
        match.financingInstanceId = instanceId;
        const row = store.find((item) => item.id === match.id);
        if (row) row.value = value;
        return "update";
      }
      store.push({
        id: `row-${store.length + 1}`,
        formulaId,
        financingInstanceId: instanceId,
        value,
      });
      return "insert";
    };

    expect(save("business-loan", "loan-a", 10, 2)).toBe("insert");
    expect(save("business-loan", "loan-b", 15, 2)).toBe("insert");
    expect(store).toHaveLength(2);
    expect(save("business-loan", "loan-a", 12, 2)).toBe("update");
    expect(store.find((item) => item.financingInstanceId === "loan-a")?.value).toBe(12);
    expect(store.find((item) => item.financingInstanceId === "loan-b")?.value).toBe(15);
    expect(countResultsForFormula(
      [{ type: "business-loan" }, { type: "business-loan" }],
      "business-loan",
    )).toBe(2);
  });

  it("embeds instance identity in calculation_steps without dropping real steps", () => {
    const steps = withFinancingIdentitySteps(
      [{ step: "attribution", value: 0.4, formula: "x" }],
      "inst-1",
      "mortgage#1",
    ) as Array<Record<string, unknown>>;
    expect(steps[0].financing_instance_id).toBe("inst-1");
    expect(steps[1].step).toBe("attribution");
    expect(extractFinancingInstanceId({ calculation_steps: steps })).toBe("inst-1");
  });
});

describe("reporting and Category 15 with multiple exposures", () => {
  it("sums two same-class loans without duplicate counting when no aggregate exists", () => {
    const rows = [
      row({ id: "a", formulaId: "business-loan", financedEmissions: 10, financingInstanceId: "loan-a" }),
      row({ id: "b", formulaId: "business-loan", financedEmissions: 15, financingInstanceId: "loan-b" }),
    ];
    const selected = selectFinancedGroup(rows);
    expect(selected.reason).toBe("components-sum");
    expect(selected.total).toBe(25);
    expect(selected.selectedRows).toHaveLength(2);
  });

  it("uses one aggregate for dashboard totals even when two mortgages also exist", () => {
    const rows = [
      row({ id: "agg", formulaId: "aggregate", financedEmissions: 40 }),
      row({ id: "m1", formulaId: "mortgage", financedEmissions: 18, financingInstanceId: "mort-1" }),
      row({ id: "m2", formulaId: "mortgage", financedEmissions: 22, financingInstanceId: "mort-2" }),
    ];
    const summary = summarizeFinancedPortfolio(rows);
    expect(summary.financeTotal).toBe(40);
    expect(selectImportableFinancedRows(rows, "finance")).toHaveLength(1);
  });

  it("excludes leftover unlinked formula rows once instanced rows exist for that class", () => {
    const rows = [
      row({
        id: "legacy",
        formulaId: "mortgage",
        financedEmissions: 99,
        financingInstanceId: null,
        updatedAt: "2025-01-01T00:00:00Z",
      }),
      row({
        id: "m1",
        formulaId: "mortgage",
        financedEmissions: 10,
        financingInstanceId: "mort-1",
        updatedAt: "2026-01-01T00:00:00Z",
      }),
      row({
        id: "m2",
        formulaId: "mortgage",
        financedEmissions: 12,
        financingInstanceId: "mort-2",
        updatedAt: "2026-01-01T00:00:00Z",
      }),
    ];
    const selected = selectFinancedGroup(rows);
    expect(selected.total).toBe(22);
    expect(selected.selectedRows.map((item) => item.id).sort()).toEqual(["m1", "m2"]);
  });

  it("keeps Category 15 import on the aggregate once, not per mortgage", () => {
    const rows = [
      row({ id: "agg", formulaId: "aggregate", financedEmissions: 40 }),
      row({ id: "m1", formulaId: "mortgage", financedEmissions: 18, financingInstanceId: "mort-1" }),
      row({ id: "m2", formulaId: "mortgage", financedEmissions: 22, financingInstanceId: "mort-2" }),
    ];
    const importable = selectImportableFinancedRows(rows, "finance");
    expect(importable).toHaveLength(1);
    expect(importable[0].id).toBe("agg");

    const allowed = assessScope3FinancedImport({
      candidate: {
        id: "agg",
        source: "jwt",
        formulaId: "aggregate",
        counterpartyId: "co-1",
        counterpartyName: "Acme",
      },
      existing: [],
      reportingRows: rows,
      calcKind: "finance",
    });
    expect(allowed.status).toBe("allow");

    const alreadyStored = selectCategory15ReportableActivities(
      [
        {
          id: "act-agg",
          label: "Acme total",
          attributedEmissions: 40,
          linkedFinancedEmissionsId: "agg",
        },
        {
          id: "act-m1",
          label: "Acme mortgage 1",
          attributedEmissions: 18,
          linkedFinancedEmissionsId: "m1",
        },
      ],
      rows,
      "finance",
    );
    expect(alreadyStored.reportableIds.has("act-agg")).toBe(true);
    expect(alreadyStored.overlapping.map((item) => item.id).sort()).toEqual(["act-agg", "act-m1"]);
  });
});

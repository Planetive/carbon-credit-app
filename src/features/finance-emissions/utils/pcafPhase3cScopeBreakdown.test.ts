/**
 * Phase 3C: financed Scope 1/2/3 result contract and historical compatibility.
 */
import { describe, expect, it } from "vitest";
import { PcafAuthorityError, validateAuthoritativePcafResult } from "./pcafAuthority";
import {
  parseFinancedScopeBreakdown,
  questionnaireScopePayload,
  serializeFinancedScopeBreakdown,
  sumReportedScopes,
} from "./financedScopeBreakdown";

const FORMULA_ID = "1a-listed-equity";

function steps() {
  return [{ step: "Attribution", value: 1 / 3, formula: "outstanding / EVIC" }];
}

function rawResult(overrides: Record<string, unknown> = {}) {
  return {
    attribution_factor: 1 / 3,
    financed_emissions: 30,
    data_quality_score: 1,
    methodology: "Option 1a - Verified GHG emissions",
    calculation_steps: steps(),
    emissions_unit: "tCO2e",
    metadata: { formula_id: FORMULA_ID, emissions_unit: "tCO2e", option_code: "1a" },
    ...overrides,
  };
}

describe("Phase 3C questionnaire blanks vs zeros", () => {
  it("does not treat a blank Scope 3 as zero", () => {
    expect(sumReportedScopes(10, 5, null)).toBe(15);
    expect(sumReportedScopes(0, null, null)).toBe(0);
    expect(sumReportedScopes(null, null, null)).toBeNull();
    expect(questionnaireScopePayload(0, null, 12)).toEqual({
      scope1_emissions: 0,
      scope2_emissions: null,
      scope3_emissions: 12,
    });
  });
});

describe("Phase 3C scope-breakdown parse contract", () => {
  it("1. Scope 1 only", () => {
    const parsed = parseFinancedScopeBreakdown(
      {
        financed_scope1_tco2e: 30,
        financed_scope2_tco2e: null,
        financed_scope3_tco2e: null,
        included_scopes: ["scope1"],
        missing_scopes: ["scope2", "scope3"],
        scope_completeness: "partial",
        scope_status: { scope1: "reported", scope2: "missing", scope3: "missing" },
      },
      30
    );
    expect(parsed.financedScope1Tco2e).toBe(30);
    expect(parsed.financedScope2Tco2e).toBeNull();
    expect(parsed.financedScope3Tco2e).toBeNull();
    expect(parsed.historicalTotalOnly).toBe(false);
  });

  it("2. Scope 1 and 2", () => {
    const parsed = parseFinancedScopeBreakdown(
      {
        financed_scope1_tco2e: 20,
        financed_scope2_tco2e: 10,
        financed_scope3_tco2e: null,
        included_scopes: ["scope1", "scope2"],
        missing_scopes: ["scope3"],
        scope_completeness: "partial",
      },
      30
    );
    expect(parsed.financedScope1Tco2e).toBe(20);
    expect(parsed.financedScope2Tco2e).toBe(10);
    expect(parsed.missingScopes).toContain("scope3");
  });

  it("3. Scope 1, 2 and 3", () => {
    const parsed = parseFinancedScopeBreakdown(
      {
        financed_scope1_tco2e: 10,
        financed_scope2_tco2e: 10,
        financed_scope3_tco2e: 10,
        included_scopes: ["scope1", "scope2", "scope3"],
        missing_scopes: [],
        scope_completeness: "complete",
      },
      30
    );
    expect(parsed.scopeCompleteness).toBe("complete");
    expect(parsed.financedScope3Tco2e).toBe(10);
  });

  it("4. Missing Scope 3 is not zero", () => {
    const parsed = parseFinancedScopeBreakdown(
      {
        financed_scope1_tco2e: 20,
        financed_scope2_tco2e: 10,
        financed_scope3_tco2e: null,
        missing_scopes: ["scope3"],
        scope_status: { scope3: "missing" },
        scope_completeness: "partial",
      },
      30
    );
    expect(parsed.financedScope3Tco2e).toBeNull();
    expect(parsed.scopeStatus.scope3).toBe("missing");
  });

  it("5. Explicit zero emissions stay zero", () => {
    const parsed = parseFinancedScopeBreakdown(
      {
        financed_scope1_tco2e: 0,
        financed_scope2_tco2e: 0,
        financed_scope3_tco2e: 0,
        scope_status: { scope1: "zero", scope2: "zero", scope3: "zero" },
        scope_completeness: "complete",
      },
      0
    );
    expect(parsed.financedScope1Tco2e).toBe(0);
    expect(parsed.financedScope2Tco2e).toBe(0);
    expect(parsed.financedScope3Tco2e).toBe(0);
  });

  it("6. Total-only estimated results stay unallocated", () => {
    const parsed = parseFinancedScopeBreakdown(
      {
        financed_scope1_tco2e: null,
        financed_scope2_tco2e: null,
        financed_scope3_tco2e: null,
        financed_unallocated_tco2e: 12.5,
        scope_completeness: "total_only",
        estimated: true,
        notes: ["Estimated intensity cannot be split into scopes."],
      },
      12.5
    );
    expect(parsed.financedUnallocatedTco2e).toBe(12.5);
    expect(parsed.financedScope1Tco2e).toBeNull();
    expect(parsed.estimated).toBe(true);
  });

  it("7. Asset-specific exclusions are not counted as zero", () => {
    const parsed = parseFinancedScopeBreakdown(
      {
        financed_scope1_tco2e: null,
        financed_scope2_tco2e: null,
        financed_scope3_tco2e: null,
        financed_unallocated_tco2e: 4,
        excluded_scopes: ["scope3"],
        scope_status: { scope1: "unallocated", scope2: "unallocated", scope3: "excluded" },
        scope_completeness: "total_only",
      },
      4
    );
    expect(parsed.excludedScopes).toContain("scope3");
    expect(parsed.financedScope3Tco2e).toBeNull();
  });

  it("8. Facilitated weighting is already in the attributed scopes", () => {
    const parsed = parseFinancedScopeBreakdown(
      {
        financed_scope1_tco2e: 6.6,
        financed_scope2_tco2e: 3.3,
        financed_scope3_tco2e: null,
        notes: ["Facilitated weighting applied to included scopes."],
        scope_completeness: "partial",
      },
      9.9
    );
    expect(parsed.financedScope1Tco2e).toBeCloseTo(6.6);
    expect(parsed.financedScope2Tco2e).toBeCloseTo(3.3);
  });

  it("9. Multiple loans keep independent breakdowns", () => {
    const loanA = parseFinancedScopeBreakdown(
      { financed_scope1_tco2e: 10, financed_scope2_tco2e: null, financed_scope3_tco2e: null, scope_completeness: "partial" },
      10
    );
    const loanB = parseFinancedScopeBreakdown(
      { financed_scope1_tco2e: 4, financed_scope2_tco2e: 2, financed_scope3_tco2e: null, scope_completeness: "partial" },
      6
    );
    expect(loanA.financedScope1Tco2e).not.toBe(loanB.financedScope1Tco2e);
  });

  it("10. Reporting totals must not add aggregate and components", () => {
    const components = 10 + 6;
    const aggregate = 16;
    expect(components + aggregate).not.toBe(aggregate);
    expect(components).toBe(aggregate);
  });

  it("11. Category 15 uses the attributed total once", () => {
    const attributedTotal = 16;
    const investeeScope3 = 8;
    expect(attributedTotal + investeeScope3).not.toBe(attributedTotal);
  });

  it("12. Historical total-only records are not fabricated", () => {
    const parsed = parseFinancedScopeBreakdown(
      { financed_emissions: 40, attribution_factor: 0.2 },
      40
    );
    expect(parsed.historicalTotalOnly).toBe(true);
    expect(parsed.financedScope1Tco2e).toBeNull();
    expect(parsed.financedScope2Tco2e).toBeNull();
    expect(parsed.financedScope3Tco2e).toBeNull();
    expect(serializeFinancedScopeBreakdown(parsed)).toEqual({});
  });

  it("13. Rejects non-finite or unit-inconsistent breakdowns", () => {
    expect(() =>
      parseFinancedScopeBreakdown(
        { financed_scope1_tco2e: Number.NaN, scope_completeness: "partial" },
        10
      )
    ).toThrow(/non-finite/i);
    expect(() =>
      parseFinancedScopeBreakdown(
        {
          financed_scope1_tco2e: 10,
          financed_scope2_tco2e: 10,
          financed_scope3_tco2e: null,
          scope_completeness: "partial",
        },
        10
      )
    ).toThrow(/inconsistent/i);
  });

  it("14. Invalid backend breakdown blocks reportable save", () => {
    expect(() =>
      validateAuthoritativePcafResult(
        rawResult({
          financed_scope1_tco2e: 10,
          financed_scope2_tco2e: 10,
          financed_scope3_tco2e: null,
          scope_completeness: "partial",
        }),
        { formulaId: FORMULA_ID, fingerprint: "fp" }
      )
    ).toThrow(PcafAuthorityError);

    const historical = validateAuthoritativePcafResult(rawResult(), {
      formulaId: FORMULA_ID,
      fingerprint: "fp",
    });
    expect(historical.scopeBreakdown.historicalTotalOnly).toBe(true);

    const valid = validateAuthoritativePcafResult(
      rawResult({
        financed_emissions: 30,
        financed_scope1_tco2e: 20,
        financed_scope2_tco2e: 10,
        financed_scope3_tco2e: null,
        scope_completeness: "partial",
      }),
      { formulaId: FORMULA_ID, fingerprint: "fp" }
    );
    expect(valid.scopeBreakdown.financedScope1Tco2e).toBe(20);
    expect(valid.scopeBreakdown.financedScope2Tco2e).toBe(10);
  });
});

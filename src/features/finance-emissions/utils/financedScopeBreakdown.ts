/**
 * Financed Scope 1/2/3 result contract (Phase 3C).
 * Missing scopes are null — never coerced to 0.
 */

export const PCAF_METHODOLOGY_VERSION = "PCAF-PartA-2022-2nd";
export const SCOPE_TOTAL_ABS_TOLERANCE = 1e-6;
export const SCOPE_TOTAL_REL_TOLERANCE = 1e-6;

export type FinancedScopeName = "scope1" | "scope2" | "scope3";
export type FinancedScopeStatus =
  | "reported"
  | "zero"
  | "missing"
  | "excluded"
  | "not_applicable"
  | "estimated"
  | "unallocated";
export type ScopeCompleteness = "complete" | "partial" | "total_only";

export type FinancedScopeBreakdown = {
  financedScope1Tco2e: number | null;
  financedScope2Tco2e: number | null;
  financedScope3Tco2e: number | null;
  financedUnallocatedTco2e: number | null;
  includedScopes: FinancedScopeName[];
  missingScopes: FinancedScopeName[];
  excludedScopes: FinancedScopeName[];
  notApplicableScopes: FinancedScopeName[];
  scopeStatus: Partial<Record<FinancedScopeName, FinancedScopeStatus>>;
  scopeCompleteness: ScopeCompleteness;
  calculationMethod?: string;
  methodologyVersion?: string;
  estimated?: boolean;
  notes: string[];
  historicalTotalOnly: boolean;
};

export function optionalScopeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function sumReportedScopes(
  scope1: number | null | undefined,
  scope2: number | null | undefined,
  scope3: number | null | undefined
): number | null {
  const values = [scope1, scope2, scope3].filter(
    (value): value is number => value != null && Number.isFinite(value)
  );
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0);
}

function nullableFinite(value: unknown, label: string): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    throw new Error(`Non-finite ${label} in financed scope breakdown`);
  }
  return n;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

export function scopeTotalsClose(actual: number, expected: number): boolean {
  const scale = Math.max(Math.abs(actual), Math.abs(expected), 1);
  return (
    Math.abs(actual - expected) <=
    Math.max(SCOPE_TOTAL_ABS_TOLERANCE, SCOPE_TOTAL_REL_TOLERANCE * scale)
  );
}

export function parseFinancedScopeBreakdown(
  raw: Record<string, unknown> | null | undefined,
  financedEmissions: number
): FinancedScopeBreakdown {
  const metadata =
    raw?.metadata && typeof raw.metadata === "object"
      ? (raw.metadata as Record<string, unknown>)
      : {};
  const nested =
    metadata.scope_breakdown && typeof metadata.scope_breakdown === "object"
      ? (metadata.scope_breakdown as Record<string, unknown>)
      : {};
  const source = {
    ...nested,
    ...raw,
  };

  const hasBreakdownKeys =
    "financed_scope1_tco2e" in source ||
    "financed_scope2_tco2e" in source ||
    "financed_scope3_tco2e" in source ||
    "financed_unallocated_tco2e" in source ||
    "scope_completeness" in source;

  if (!hasBreakdownKeys) {
    return {
      financedScope1Tco2e: null,
      financedScope2Tco2e: null,
      financedScope3Tco2e: null,
      financedUnallocatedTco2e: null,
      includedScopes: [],
      missingScopes: [],
      excludedScopes: [],
      notApplicableScopes: [],
      scopeStatus: {},
      scopeCompleteness: "total_only",
      notes: ["Historical total-only result. Scope breakdown was not stored."],
      historicalTotalOnly: true,
    };
  }

  const s1 = nullableFinite(source.financed_scope1_tco2e, "financed Scope 1");
  const s2 = nullableFinite(source.financed_scope2_tco2e, "financed Scope 2");
  const s3 = nullableFinite(source.financed_scope3_tco2e, "financed Scope 3");
  const unallocated = nullableFinite(
    source.financed_unallocated_tco2e,
    "unallocated financed emissions"
  );
  const reconstructed = [s1, s2, s3, unallocated].filter(
    (value): value is number => value != null
  );
  if (reconstructed.length > 0) {
    const sum = reconstructed.reduce((total, value) => total + value, 0);
    if (!scopeTotalsClose(sum, financedEmissions)) {
      throw new Error(
        "Financed scope breakdown is inconsistent with the financed-emissions total"
      );
    }
  }

  const completenessRaw = String(source.scope_completeness ?? "total_only");
  const completeness: ScopeCompleteness =
    completenessRaw === "complete" || completenessRaw === "partial"
      ? completenessRaw
      : "total_only";

  return {
    financedScope1Tco2e: s1,
    financedScope2Tco2e: s2,
    financedScope3Tco2e: s3,
    financedUnallocatedTco2e: unallocated,
    includedScopes: stringList(source.included_scopes) as FinancedScopeName[],
    missingScopes: stringList(source.missing_scopes) as FinancedScopeName[],
    excludedScopes: stringList(source.excluded_scopes) as FinancedScopeName[],
    notApplicableScopes: stringList(source.not_applicable_scopes) as FinancedScopeName[],
    scopeStatus: (source.scope_status && typeof source.scope_status === "object"
      ? source.scope_status
      : {}) as Partial<Record<FinancedScopeName, FinancedScopeStatus>>,
    scopeCompleteness: completeness,
    calculationMethod:
      typeof source.calculation_method === "string"
        ? source.calculation_method
        : undefined,
    methodologyVersion:
      typeof source.methodology_version === "string"
        ? source.methodology_version
        : PCAF_METHODOLOGY_VERSION,
    estimated: Boolean(source.estimated),
    notes: stringList(source.notes),
    historicalTotalOnly: completeness === "total_only" && s1 == null && s2 == null && s3 == null,
  };
}

export function formatFinancedScopeValue(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "Not reported";
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })} tCO₂e`;
}

export function scopeStatusLabel(status: FinancedScopeStatus | undefined): string {
  switch (status) {
    case "zero":
      return "Reported as zero";
    case "missing":
      return "Not reported";
    case "excluded":
      return "Excluded by method";
    case "not_applicable":
      return "Not applicable";
    case "estimated":
      return "Estimated (unallocated)";
    case "unallocated":
      return "Included in total only";
    case "reported":
      return "Reported";
    default:
      return "";
  }
}

export function questionnaireScopePayload(
  scope1: number | null | undefined,
  scope2: number | null | undefined,
  scope3: number | null | undefined
): Record<string, number | null> {
  return {
    scope1_emissions: scope1 ?? null,
    scope2_emissions: scope2 ?? null,
    scope3_emissions: scope3 ?? null,
  };
}

export function serializeFinancedScopeBreakdown(
  breakdown: FinancedScopeBreakdown | null | undefined
): Record<string, unknown> {
  if (!breakdown || breakdown.historicalTotalOnly) {
    return {};
  }
  return {
    financed_scope1_tco2e: breakdown.financedScope1Tco2e,
    financed_scope2_tco2e: breakdown.financedScope2Tco2e,
    financed_scope3_tco2e: breakdown.financedScope3Tco2e,
    financed_unallocated_tco2e: breakdown.financedUnallocatedTco2e,
    included_scopes: breakdown.includedScopes,
    missing_scopes: breakdown.missingScopes,
    excluded_scopes: breakdown.excludedScopes,
    not_applicable_scopes: breakdown.notApplicableScopes,
    scope_status: breakdown.scopeStatus,
    scope_completeness: breakdown.scopeCompleteness,
    calculation_method: breakdown.calculationMethod ?? null,
    methodology_version: breakdown.methodologyVersion ?? PCAF_METHODOLOGY_VERSION,
    estimated: Boolean(breakdown.estimated),
    notes: breakdown.notes,
  };
}

export function storedScopeFields(
  results: Record<string, unknown> | null | undefined,
  financedEmissions: number
): Record<string, unknown> {
  try {
    return serializeFinancedScopeBreakdown(
      parseFinancedScopeBreakdown(results, financedEmissions)
    );
  } catch {
    return {};
  }
}

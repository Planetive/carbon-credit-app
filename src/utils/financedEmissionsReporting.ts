import { extractFinancingInstanceId } from "@/utils/financedExposureIdentity";

/**
 * Financed-emissions reporting contract.
 *
 * A (counterparty, finance|facilitated) exposure must contribute to a reportable
 * total exactly once. The wizard persists both per-formula component rows and one
 * `formula_id = "aggregate"` summary. Readers must not add those together.
 *
 * `formula_id` is a loan/asset-class key, not an exposure id. Two mortgages can
 * share `formula_id = "mortgage"`, so summing components can drop legitimate
 * same-class loans. When an aggregate exists, it is the wizard session total.
 *
 * Fallback: if only component rows exist, sum those completed components.
 * Mixed JWT + legacy rows for the same counterparty/kind: use JWT only.
 * Mixed legacy tables without an aggregate: use finance_emission_calculations
 * components, not both tables.
 *
 * This helper never marks rows verified.
 */

export type FinancedCalcKind = "finance" | "facilitated";

export type FinancedRowSource =
  | "jwt"
  | "emission_calculations"
  | "finance_emission_calculations";

export type FinancedSelectionReason =
  | "aggregate"
  | "components-sum"
  | "empty";

export type FinancedCalculationRow = {
  id: string;
  counterpartyId: string | null;
  calcKind: FinancedCalcKind;
  formulaId: string | null;
  formulaName?: string | null;
  financedEmissions: number;
  status: string | null;
  updatedAt: string | null;
  createdAt: string | null;
  source: FinancedRowSource;
  results?: unknown;
  dataQualityScore?: number | null;
  inputs?: Record<string, unknown> | null;
  exposureId?: string | null;
  attributionFactor?: number | null;
  legacySource?: string | null;
  legacyId?: string | null;
  financingInstanceId?: string | null;
};

export type FinancedGroupSelection = {
  counterpartyId: string | null;
  calcKind: FinancedCalcKind;
  total: number;
  reason: FinancedSelectionReason;
  selectedRows: FinancedCalculationRow[];
  discardedRows: FinancedCalculationRow[];
};

export type FinancedPortfolioSummary = {
  financeTotal: number;
  facilitatedTotal: number;
  financeCounterparties: number;
  facilitatedCounterparties: number;
  groups: FinancedGroupSelection[];
};

const AGGREGATE_FORMULA_ID = "aggregate";

export function isAggregateFormulaId(formulaId: string | null | undefined): boolean {
  return String(formulaId ?? "").trim().toLowerCase() === AGGREGATE_FORMULA_ID;
}

export function normalizeFinancedCalcKind(
  value: string | null | undefined,
): FinancedCalcKind | null {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "finance" || raw === "finance_emission") return "finance";
  if (raw === "facilitated" || raw === "facilitated_emission") return "facilitated";
  return null;
}

export function financedEmissionsNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

const STORED_SCOPE_KEYS = [
  "financed_scope1_tco2e",
  "financed_scope2_tco2e",
  "financed_scope3_tco2e",
  "financed_unallocated_tco2e",
  "included_scopes",
  "missing_scopes",
  "excluded_scopes",
  "not_applicable_scopes",
  "scope_status",
  "scope_completeness",
  "calculation_method",
  "methodology_version",
  "estimated",
  "notes",
] as const;

function pickStoredScopeFields(
  results: Record<string, unknown> | null | undefined,
  _financedEmissions?: number,
): Record<string, unknown> {
  if (!results || typeof results !== "object") return {};
  const out: Record<string, unknown> = {};
  for (const key of STORED_SCOPE_KEYS) {
    if (key in results) out[key] = results[key];
  }
  return out;
}

function isReportableStatus(status: string | null | undefined): boolean {
  const s = String(status ?? "completed").trim().toLowerCase();
  return s !== "failed" && s !== "draft" && s !== "review_required" && s !== "void" && s !== "superseded" && s !== "incomplete";
}

export function isUopParentFormulaId(formulaId: string | null | undefined): boolean {
  const key = String(formulaId ?? "").trim().toLowerCase();
  return key.startsWith("uop") || key.includes("use-of-proceeds");
}

function resultsRecord(results: unknown): Record<string, unknown> | null {
  return results && typeof results === "object" ? (results as Record<string, unknown>) : null;
}

export function isUopUnderlyingReportingRow(row: FinancedCalculationRow): boolean {
  const results = resultsRecord(row.results);
  return results?.reporting_role === "uop_underlying" || results?.include_underlying_independently === true;
}

export function hasUnresolvedUopOverlap(row: FinancedCalculationRow): boolean {
  const results = resultsRecord(row.results);
  const overlap = results?.overlap;
  if (overlap && typeof overlap === "object" && (overlap as Record<string, unknown>).status === "review_required") {
    return true;
  }
  return String(row.status ?? "").trim().toLowerCase() === "review_required";
}

export function isEligibleFinancedRow(row: FinancedCalculationRow): boolean {
  if (!isReportableStatus(row.status)) return false;
  if (isUopUnderlyingReportingRow(row)) return false;
  if (hasUnresolvedUopOverlap(row)) return false;
  return Number.isFinite(row.financedEmissions) && row.financedEmissions >= 0;
}

function timestampMs(value: string | null | undefined): number {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

function recency(row: FinancedCalculationRow): number {
  return timestampMs(row.updatedAt) || timestampMs(row.createdAt);
}

function latestRow(rows: FinancedCalculationRow[]): FinancedCalculationRow | null {
  if (rows.length === 0) return null;
  return [...rows].sort((a, b) => {
    const byTime = recency(b) - recency(a);
    if (byTime !== 0) return byTime;
    return String(b.id).localeCompare(String(a.id));
  })[0];
}

function groupKey(row: FinancedCalculationRow): string {
  return `${row.counterpartyId ?? "none"}::${row.calcKind}`;
}

function sumEmissions(rows: FinancedCalculationRow[]): number {
  return rows.reduce((sum, row) => sum + financedEmissionsNumber(row.financedEmissions), 0);
}

/**
 * Choose the canonical rows for one counterparty + calc kind.
 * Never returns both an aggregate and its component rows.
 */
export type FinancedSelectionOptions = {
  reportingYear?: string | null;
};

export function rowReportingYear(row: FinancedCalculationRow): string | null {
  const inputs = row.inputs && typeof row.inputs === "object" ? row.inputs : null;
  const fromInputs = String(inputs?.reporting_year || inputs?.reportingYear || "").trim();
  const results = resultsRecord(row.results);
  const fromResults = String(results?.reporting_year || results?.reportingYear || "").trim();
  return fromInputs || fromResults || null;
}

function yearRank(row: FinancedCalculationRow): number {
  const year = Number(rowReportingYear(row) || 0);
  return Number.isFinite(year) ? year : 0;
}

function collapseSameFinancingInstance(rows: FinancedCalculationRow[]): FinancedCalculationRow[] {
  const uninstanced = rows.filter((row) => !row.financingInstanceId);
  const instanced = rows.filter((row) => Boolean(row.financingInstanceId));
  const best = new Map<string, FinancedCalculationRow>();
  for (const row of instanced) {
    const key = `${row.source}:${row.financingInstanceId}`;
    const previous = best.get(key);
    if (!previous) {
      best.set(key, row);
      continue;
    }
    const byYear = yearRank(row) - yearRank(previous);
    if (byYear > 0 || (byYear === 0 && recency(row) >= recency(previous))) {
      best.set(key, row);
    }
  }
  return [...uninstanced, ...best.values()];
}

export function selectFinancedGroup(
  rows: FinancedCalculationRow[],
  options?: FinancedSelectionOptions,
): FinancedGroupSelection {
  const wantedYear = String(options?.reportingYear || "").trim();
  const eligible = rows.filter((row) => {
    if (!isEligibleFinancedRow(row)) return false;
    if (!wantedYear) return true;
    const year = rowReportingYear(row);
    return !year || year === wantedYear;
  });
  const calcKind = eligible[0]?.calcKind ?? rows[0]?.calcKind ?? "finance";
  const counterpartyId = eligible[0]?.counterpartyId ?? rows[0]?.counterpartyId ?? null;
  const empty = (): FinancedGroupSelection => ({
    counterpartyId,
    calcKind,
    total: 0,
    reason: "empty",
    selectedRows: [],
    discardedRows: rows,
  });

  if (eligible.length === 0) return empty();

  const jwtRows = eligible.filter((row) => row.source === "jwt");
  let working = jwtRows.length > 0 ? jwtRows : eligible;

  if (jwtRows.length === 0) {
    const fec = working.filter((row) => row.source === "finance_emission_calculations");
    const ec = working.filter((row) => row.source === "emission_calculations");
    const aggregates = working.filter((row) => isAggregateFormulaId(row.formulaId));
    if (aggregates.length === 0 && fec.length > 0 && ec.length > 0) {
      working = fec;
    }
  }

  const uopParents = collapseSameFinancingInstance(
    working.filter((row) => isUopParentFormulaId(row.formulaId)),
  );
  const general = working.filter((row) => !isUopParentFormulaId(row.formulaId));
  const aggregates = general.filter((row) => isAggregateFormulaId(row.formulaId));
  const components = general.filter((row) => !isAggregateFormulaId(row.formulaId));
  const selectedIds = new Set<string>();

  const withUopParents = (base: FinancedCalculationRow[], reason: FinancedSelectionReason, total: number): FinancedGroupSelection => {
    const selected = [...base, ...uopParents];
    selected.forEach((row) => selectedIds.add(`${row.source}:${row.id}`));
    return {
      counterpartyId: selected[0]?.counterpartyId ?? counterpartyId,
      calcKind: selected[0]?.calcKind ?? calcKind,
      total: total + sumEmissions(uopParents),
      reason: base.length === 0 && uopParents.length > 0 ? "components-sum" : reason,
      selectedRows: selected,
      discardedRows: rows.filter((row) => !selectedIds.has(`${row.source}:${row.id}`)),
    };
  };

  if (aggregates.length > 0) {
    const aggregate = latestRow(aggregates);
    if (!aggregate) return empty();
    return withUopParents([aggregate], "aggregate", financedEmissionsNumber(aggregate.financedEmissions));
  }

  if (components.length > 0 || uopParents.length > 0) {
    const instanced = components.filter((row) => Boolean(row.financingInstanceId));
    const activeComponents =
      components.length === 0
        ? []
        : instanced.length === 0
          ? components
          : components.filter((row) => {
              if (row.financingInstanceId) return true;
              return !instanced.some((item) => item.formulaId === row.formulaId);
            });
    if (activeComponents.length === 0 && uopParents.length === 0) return empty();
    const collapsedComponents = collapseSameFinancingInstance(activeComponents);
    return withUopParents(collapsedComponents, "components-sum", sumEmissions(collapsedComponents));
  }

  return empty();
}

export function selectFinancedGroups(
  rows: FinancedCalculationRow[],
  calcKind?: FinancedCalcKind,
  options?: FinancedSelectionOptions,
): FinancedGroupSelection[] {
  const filtered = calcKind ? rows.filter((row) => row.calcKind === calcKind) : rows;
  const buckets = new Map<string, FinancedCalculationRow[]>();
  for (const row of filtered) {
    const key = groupKey(row);
    const list = buckets.get(key) || [];
    list.push(row);
    buckets.set(key, list);
  }
  return Array.from(buckets.values()).map((groupRows) => selectFinancedGroup(groupRows, options));
}

export function summarizeFinancedPortfolio(
  rows: FinancedCalculationRow[],
  options?: FinancedSelectionOptions,
): FinancedPortfolioSummary {
  const groups = selectFinancedGroups(rows, undefined, options);
  const financeGroups = groups.filter((g) => g.calcKind === "finance" && g.reason !== "empty");
  const facilitatedGroups = groups.filter((g) => g.calcKind === "facilitated" && g.reason !== "empty");
  const unique = (items: FinancedGroupSelection[]) =>
    new Set(items.map((g) => g.counterpartyId).filter((id): id is string => Boolean(id))).size;

  return {
    financeTotal: financeGroups.reduce((sum, g) => sum + g.total, 0),
    facilitatedTotal: facilitatedGroups.reduce((sum, g) => sum + g.total, 0),
    financeCounterparties: unique(financeGroups),
    facilitatedCounterparties: unique(facilitatedGroups),
    groups,
  };
}

/**
 * Category 15 / facilitated import candidates.
 * One logical total per counterparty: the aggregate when present, otherwise
 * each remaining component. Summary and detail records are never both offered.
 */
export function selectImportableFinancedRows(
  rows: FinancedCalculationRow[],
  calcKind: FinancedCalcKind,
  options?: FinancedSelectionOptions,
): FinancedCalculationRow[] {
  return selectFinancedGroups(rows, calcKind, options)
    .filter((group) => group.reason !== "empty" && group.total > 0)
    .flatMap((group) => group.selectedRows);
}

export function selectCompanyDisplayRow(
  rows: FinancedCalculationRow[],
  calcKind: FinancedCalcKind,
): FinancedCalculationRow | null {
  const group = selectFinancedGroups(rows, calcKind).find(
    (item) => item.calcKind === calcKind && item.reason !== "empty",
  );
  if (!group) return null;
  if (group.reason === "aggregate" && group.selectedRows.length === 1) return group.selectedRows[0] ?? null;
  if (group.selectedRows.length === 1) return group.selectedRows[0] ?? null;

  const first = group.selectedRows[0];
  if (!first) return null;
  return {
    ...first,
    id: `components:${first.counterpartyId ?? "none"}:${calcKind}`,
    formulaId: AGGREGATE_FORMULA_ID,
    formulaName: `${group.selectedRows.length} calculations`,
    financedEmissions: group.total,
    results: {
      allResults: group.selectedRows.map((row) => ({
        type: row.formulaId,
        label: row.formulaName || row.formulaId,
        attributionFactor: row.attributionFactor || 0,
        financedEmissions: row.financedEmissions,
        dataQualityScore: row.dataQualityScore ?? null,
        ...pickStoredScopeFields(row.results, row.financedEmissions),
      })),
      dataQualityScore: first.dataQualityScore ?? null,
    },
  };
}

export function emissionCalculationToReportingRow(
  calc: {
    id: string;
    counterparty_id?: string | null;
    calculation_type?: string | null;
    formula_id?: string | null;
    financed_emissions?: unknown;
    status?: string | null;
    updated_at?: string | null;
    created_at?: string | null;
    results?: unknown;
    data_quality_score?: number | null;
    inputs?: Record<string, unknown> | null;
    exposure_id?: string | null;
    attribution_factor?: number | null;
    formula_name?: string | null;
    calculation_steps?: unknown;
  },
  source: FinancedRowSource,
): FinancedCalculationRow | null {
  const calcKind = normalizeFinancedCalcKind(calc.calculation_type);
  if (!calcKind) return null;
  return {
    id: String(calc.id),
    counterpartyId: calc.counterparty_id ?? null,
    calcKind,
    formulaId: calc.formula_id ?? null,
    formulaName: calc.formula_name ?? null,
    financedEmissions: financedEmissionsNumber(calc.financed_emissions),
    status: calc.status ?? "completed",
    updatedAt: calc.updated_at ?? null,
    createdAt: calc.created_at ?? null,
    source,
    results: calc.results,
    dataQualityScore: calc.data_quality_score ?? null,
    inputs: calc.inputs ?? null,
    exposureId: calc.exposure_id ?? null,
    attributionFactor:
      calc.attribution_factor == null ? null : financedEmissionsNumber(calc.attribution_factor),
    financingInstanceId:
      extractFinancingInstanceId(calc.inputs) ||
      extractFinancingInstanceId(calc) ||
      null,
  };
}

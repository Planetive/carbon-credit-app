/**
 * Category 15 / facilitated import safety.
 *
 * The financed-emissions selector never offers aggregate and component rows
 * together. Historical Scope 3 activities may already contain the other half
 * of that pair. Importing the missing half would double-count.
 *
 * Matching uses calculation identity keys (source + id, plus JWT legacy
 * aliases). It does not treat formula_id, counterparty, or equal tonnes as
 * proof that two rows are the same exposure.
 */

import {
  isAggregateFormulaId,
  type FinancedCalcKind,
  type FinancedCalculationRow,
  type FinancedRowSource,
} from "@/utils/financedEmissionsReporting";

export type Scope3ImportCandidate = {
  id: string;
  source: FinancedRowSource;
  formulaId?: string | null;
  counterpartyId?: string | null;
  counterpartyName?: string | null;
  legacySource?: string | null;
  legacyId?: string | null;
};

export type Scope3ImportedActivity = {
  id: string;
  label: string;
  lineType?: string | null;
  attributedEmissions?: number | null;
  linkedEmissionCalculationId?: string | null;
  linkedFinanceEmissionCalculationId?: string | null;
  linkedFinancedEmissionsId?: string | null;
};

export type Scope3ImportDecisionStatus =
  | "allow"
  | "already-imported"
  | "overlap"
  | "unresolved";

export type Scope3ImportDecision = {
  status: Scope3ImportDecisionStatus;
  blocked: boolean;
  message: string;
  conflictingActivities: Scope3ImportedActivity[];
};

function text(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function normalizeName(value: unknown): string {
  return text(value).toLowerCase().replace(/\s+/g, " ");
}

export function normalizeFinancedLinkSource(
  value: string | null | undefined,
): FinancedRowSource | null {
  const raw = text(value).toLowerCase();
  if (!raw) return null;
  if (
    raw === "jwt" ||
    raw === "app.financed_emissions" ||
    raw === "financed_emissions" ||
    raw === "public.financed_emissions"
  ) {
    return "jwt";
  }
  if (raw.includes("finance_emission_calculation")) return "finance_emission_calculations";
  if (raw.includes("emission_calculation")) return "emission_calculations";
  return null;
}

export function calculationIdentityKeys(row: {
  id?: string | null;
  source?: string | null;
  legacySource?: string | null;
  legacyId?: string | null;
}): string[] {
  const keys = new Set<string>();
  const id = text(row.id);
  const source = normalizeFinancedLinkSource(row.source);
  if (id && source) keys.add(`${source}:${id}`);
  const legacyId = text(row.legacyId);
  const legacySource = normalizeFinancedLinkSource(row.legacySource);
  if (legacyId && legacySource) keys.add(`${legacySource}:${legacyId}`);
  return [...keys];
}

export function importedActivityKeys(activity: Scope3ImportedActivity): string[] {
  const keys = new Set<string>();
  const emission = text(activity.linkedEmissionCalculationId);
  if (emission) keys.add(`emission_calculations:${emission}`);
  const finance = text(activity.linkedFinanceEmissionCalculationId);
  if (finance) keys.add(`finance_emission_calculations:${finance}`);
  const jwt = text(activity.linkedFinancedEmissionsId);
  if (jwt) keys.add(`jwt:${jwt}`);
  return [...keys];
}

export function isLinkedFinancedActivity(activity: Scope3ImportedActivity): boolean {
  if (text(activity.lineType) === "equity") return false;
  return importedActivityKeys(activity).length > 0;
}

export function importedActivityFromRecord(
  row: Record<string, unknown>,
): Scope3ImportedActivity {
  const raw = row.raw && typeof row.raw === "object" ? (row.raw as Record<string, unknown>) : {};
  const jwtId =
    row.linked_financed_emissions_id ??
    raw.linked_financed_emissions_id ??
    null;
  const lineType = text(row.line_type) || null;
  const label =
    text(row.company_name) ||
    text(row.activity_label) ||
    "Imported financed line";
  const attributed = Number(row.calculated_emissions ?? row.emissions);
  return {
    id: text(row.id) || text(row.dbId) || label,
    label,
    lineType,
    attributedEmissions: Number.isFinite(attributed) ? attributed : null,
    linkedEmissionCalculationId:
      (row.linked_emission_calculation_id as string | null | undefined) ??
      (raw.linked_emission_calculation_id as string | null | undefined) ??
      null,
    linkedFinanceEmissionCalculationId:
      (row.linked_finance_emission_calculation_id as string | null | undefined) ??
      (raw.linked_finance_emission_calculation_id as string | null | undefined) ??
      null,
    linkedFinancedEmissionsId: jwtId == null ? null : String(jwtId),
  };
}

function groupRowsForCandidate(
  candidate: Scope3ImportCandidate,
  reportingRows: FinancedCalculationRow[],
  calcKind: FinancedCalcKind,
): FinancedCalculationRow[] {
  const incoming = new Set(calculationIdentityKeys(candidate));
  const scoped = reportingRows.filter((row) => row.calcKind === calcKind);
  const hit = scoped.find((row) =>
    calculationIdentityKeys(row).some((key) => incoming.has(key)),
  );
  const counterpartyId = hit?.counterpartyId ?? candidate.counterpartyId ?? null;
  if (counterpartyId) {
    return scoped.filter((row) => row.counterpartyId === counterpartyId);
  }
  if (hit) return [hit];
  return [];
}

function describeConflicts(activities: Scope3ImportedActivity[]): string {
  return activities
    .map((activity) => {
      const tonnes =
        activity.attributedEmissions != null && Number.isFinite(activity.attributedEmissions)
          ? ` (${activity.attributedEmissions} tCO₂e)`
          : "";
      return `${activity.label}${tonnes}`;
    })
    .join("; ");
}

function decision(
  status: Scope3ImportDecisionStatus,
  message: string,
  conflictingActivities: Scope3ImportedActivity[] = [],
): Scope3ImportDecision {
  return {
    status,
    blocked: status === "overlap" || status === "unresolved",
    message,
    conflictingActivities,
  };
}

/**
 * Decide whether a portfolio result can be copied into Category 15 / facilitated.
 * Never inserts, deletes, or overwrites existing activities.
 */
export function assessScope3FinancedImport(args: {
  candidate: Scope3ImportCandidate;
  existing: readonly Scope3ImportedActivity[];
  reportingRows: readonly FinancedCalculationRow[];
  calcKind: FinancedCalcKind;
}): Scope3ImportDecision {
  const { candidate, existing, reportingRows, calcKind } = args;
  if (!text(candidate.id) || !normalizeFinancedLinkSource(candidate.source)) {
    return decision(
      "unresolved",
      "This result has no source identifier, so it cannot be imported safely.",
    );
  }

  const incomingKeys = new Set(calculationIdentityKeys(candidate));
  if (incomingKeys.size === 0) {
    return decision(
      "unresolved",
      "This result has no source identifier, so it cannot be imported safely.",
    );
  }

  const linkedExisting = existing.filter(isLinkedFinancedActivity);
  const exactHits = linkedExisting.filter((activity) =>
    importedActivityKeys(activity).some((key) => incomingKeys.has(key)),
  );
  if (exactHits.length > 0) {
    return decision(
      "already-imported",
      "This finance result is already in the inventory.",
      exactHits,
    );
  }

  const peers = groupRowsForCandidate(candidate, [...reportingRows], calcKind);
  const reportingKeyIndex = new Set(
    reportingRows.flatMap((row) => calculationIdentityKeys(row)),
  );
  const aggregateKeys = new Set(
    peers.filter((row) => isAggregateFormulaId(row.formulaId)).flatMap(calculationIdentityKeys),
  );
  const componentKeys = new Set(
    peers.filter((row) => !isAggregateFormulaId(row.formulaId)).flatMap(calculationIdentityKeys),
  );

  const existingOnAggregates = linkedExisting.filter((activity) =>
    importedActivityKeys(activity).some((key) => aggregateKeys.has(key)),
  );
  const existingOnComponents = linkedExisting.filter((activity) =>
    importedActivityKeys(activity).some((key) => componentKeys.has(key)),
  );

  const candidateIsAggregate = isAggregateFormulaId(candidate.formulaId);

  if (candidateIsAggregate && existingOnComponents.length > 0) {
    return decision(
      "overlap",
      `Category 15 already includes detailed financed calculations for this counterparty (${describeConflicts(existingOnComponents)}). Adding the portfolio total would count the same emissions twice. Reconcile those lines before importing.`,
      existingOnComponents,
    );
  }

  if (!candidateIsAggregate && existingOnAggregates.length > 0) {
    return decision(
      "overlap",
      `A financed total for this counterparty is already imported (${describeConflicts(existingOnAggregates)}). This line is part of that total and was not added.`,
      existingOnAggregates,
    );
  }

  if (candidateIsAggregate && existingOnAggregates.length > 0) {
    return decision(
      "overlap",
      `A financed total for this counterparty is already imported (${describeConflicts(existingOnAggregates)}). Reconcile the existing line before adding a newer total.`,
      existingOnAggregates,
    );
  }

  const orphans = linkedExisting.filter((activity) => {
    const keys = importedActivityKeys(activity);
    return keys.length > 0 && keys.every((key) => !reportingKeyIndex.has(key));
  });
  const relatedOrphans = orphans.filter((activity) => {
    const activityName = normalizeName(activity.label);
    const candidateName = normalizeName(candidate.counterpartyName);
    if (!activityName || !candidateName) return true;
    return activityName === candidateName;
  });

  if (relatedOrphans.length > 0) {
    return decision(
      "unresolved",
      `Existing Category 15 financed lines could not be matched to the current portfolio records (${describeConflicts(relatedOrphans)}). Import is blocked so the same emissions are not counted twice.`,
      relatedOrphans,
    );
  }

  if (peers.length === 0) {
    return decision(
      "unresolved",
      "This result could not be matched to a financed-emissions group, so it cannot be imported safely.",
    );
  }

  return decision("allow", "This result can be imported.");
}

export function assessScope3FinancedImportBatch(args: {
  candidates: readonly Scope3ImportCandidate[];
  existing: readonly Scope3ImportedActivity[];
  reportingRows: readonly FinancedCalculationRow[];
  calcKind: FinancedCalcKind;
}): {
  allowed: Scope3ImportCandidate[];
  blocked: Array<{ candidate: Scope3ImportCandidate; decision: Scope3ImportDecision }>;
} {
  const allowed: Scope3ImportCandidate[] = [];
  const blocked: Array<{ candidate: Scope3ImportCandidate; decision: Scope3ImportDecision }> = [];
  const importedSoFar = [...args.existing];

  for (const candidate of args.candidates) {
    const result = assessScope3FinancedImport({
      candidate,
      existing: importedSoFar,
      reportingRows: args.reportingRows,
      calcKind: args.calcKind,
    });
    if (result.status === "allow") {
      allowed.push(candidate);
      importedSoFar.push({
        id: `pending:${candidate.source}:${candidate.id}`,
        label: candidate.counterpartyName || candidate.id,
        lineType: "financed",
        linkedEmissionCalculationId:
          candidate.source === "emission_calculations" ? candidate.id : null,
        linkedFinanceEmissionCalculationId:
          candidate.source === "finance_emission_calculations" ? candidate.id : null,
        linkedFinancedEmissionsId: candidate.source === "jwt" ? candidate.id : null,
      });
    } else if (result.blocked || result.status === "already-imported") {
      if (result.blocked) blocked.push({ candidate, decision: result });
    }
  }

  return { allowed, blocked };
}

export type Category15ReportSelection = {
  reportableIds: Set<string>;
  overlapping: Scope3ImportedActivity[];
  unresolved: Scope3ImportedActivity[];
};

/**
 * Choose which already-stored Category 15 / facilitated lines may be added
 * into a reportable total. Overlapping aggregate + component lines stay in
 * the inventory; only the aggregate contributes to the total.
 */
export function selectCategory15ReportableActivities(
  activities: readonly Scope3ImportedActivity[],
  reportingRows: readonly FinancedCalculationRow[],
  calcKind: FinancedCalcKind,
): Category15ReportSelection {
  const reportableIds = new Set<string>();
  const overlapping: Scope3ImportedActivity[] = [];
  const unresolved: Scope3ImportedActivity[] = [];
  const reportingKeyIndex = new Set(
    reportingRows.flatMap((row) => calculationIdentityKeys(row)),
  );

  const buckets = new Map<string, FinancedCalculationRow[]>();
  for (const row of reportingRows.filter((item) => item.calcKind === calcKind)) {
    const key = `${row.counterpartyId ?? "none"}::${row.calcKind}`;
    const list = buckets.get(key) || [];
    list.push(row);
    buckets.set(key, list);
  }

  const claimed = new Set<string>();
  for (const peers of buckets.values()) {
    const aggregateKeys = new Set(
      peers.filter((row) => isAggregateFormulaId(row.formulaId)).flatMap(calculationIdentityKeys),
    );
    const componentKeys = new Set(
      peers.filter((row) => !isAggregateFormulaId(row.formulaId)).flatMap(calculationIdentityKeys),
    );
    const onAggregates = activities.filter((activity) =>
      importedActivityKeys(activity).some((key) => aggregateKeys.has(key)),
    );
    const onComponents = activities.filter((activity) =>
      importedActivityKeys(activity).some((key) => componentKeys.has(key)),
    );
    onAggregates.forEach((activity) => claimed.add(activity.id));
    onComponents.forEach((activity) => claimed.add(activity.id));

    if (onAggregates.length > 0 && onComponents.length > 0) {
      overlapping.push(...onAggregates, ...onComponents);
      onAggregates.forEach((activity) => reportableIds.add(activity.id));
      continue;
    }
    [...onAggregates, ...onComponents].forEach((activity) => reportableIds.add(activity.id));
  }

  for (const activity of activities) {
    if (claimed.has(activity.id)) continue;
    if (!isLinkedFinancedActivity(activity)) {
      reportableIds.add(activity.id);
      continue;
    }
    const keys = importedActivityKeys(activity);
    const resolvable = keys.some((key) => reportingKeyIndex.has(key));
    if (!resolvable) {
      unresolved.push(activity);
      reportableIds.add(activity.id);
      continue;
    }
    reportableIds.add(activity.id);
  }

  return { reportableIds, overlapping, unresolved };
}

export function sumCategory15AttributedSafely(
  rows: readonly Record<string, unknown>[],
  reportingRows: readonly FinancedCalculationRow[],
  calcKind: FinancedCalcKind,
): number {
  const activities = rows.map(importedActivityFromRecord);
  const { reportableIds, overlapping } = selectCategory15ReportableActivities(
    activities,
    reportingRows,
    calcKind,
  );
  const excluded = new Set(
    overlapping
      .filter((activity) => !reportableIds.has(activity.id))
      .map((activity) => activity.id),
  );
  return rows.reduce((sum, row, index) => {
    const activity = activities[index];
    if (excluded.has(activity.id)) return sum;
    if (!reportableIds.has(activity.id) && isLinkedFinancedActivity(activity)) return sum;
    const calculated = Number(row.calculated_emissions);
    if (Number.isFinite(calculated)) return sum + calculated;
    const emissions = Number(row.emissions);
    const pct = Number(row.ownership_percentage);
    if (Number.isFinite(emissions) && Number.isFinite(pct) && pct > 0) {
      return sum + (emissions * pct) / 100;
    }
    return sum + (Number.isFinite(emissions) ? emissions : 0);
  }, 0);
}

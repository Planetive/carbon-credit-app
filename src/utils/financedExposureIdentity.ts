/**
 * Financing-instance identity.
 *
 * formula_id is an asset-class / PCAF methodology key (mortgage, business-loan).
 * It is not a unique loan. Each distinct loan keeps a stable financing_instance_id
 * generated once in the calculator and stored in JSON (inputs / calculation_steps).
 *
 * Historical rows without an instance id are left unlinked. They are never
 * assigned a guessed id. A single legacy row may be updated in place only when
 * the current session has exactly one loan of that asset class.
 *
 * Portfolio exposures.id is a credit-facility UUID and is not used as the
 * calculator instance id (app.financed_emissions.exposure_id FKs that table).
 */

export const FINANCING_INSTANCE_FIELD = "financing_instance_id";
export const FINANCING_IDENTITY_STEP = "__financing_identity__";

export function createFinancingInstanceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `fin-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function loanInstanceKey(assetClass: string, instance: number): string {
  return `${String(assetClass)}#${instance}`;
}

function text(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function fromRecord(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const direct = text(record[FINANCING_INSTANCE_FIELD]);
  if (direct) return direct;
  return null;
}

export function extractFinancingInstanceId(source: unknown): string | null {
  const direct = fromRecord(source);
  if (direct) return direct;
  if (!source || typeof source !== "object") return null;
  const record = source as Record<string, unknown>;
  const nestedKeys = ["inputs", "pcafInputs", "pcaf_inputs", "results"];
  for (const key of nestedKeys) {
    const nested = fromRecord(record[key]);
    if (nested) return nested;
  }
  const steps = record.calculation_steps ?? record.calculationSteps;
  if (Array.isArray(steps)) {
    for (const step of steps) {
      const nested = fromRecord(step);
      if (nested) return nested;
    }
  }
  if (steps && typeof steps === "object") {
    const nested = fromRecord(steps);
    if (nested) return nested;
  }
  return null;
}

export function financingIdentityStep(instanceId: string, instanceKey?: string | null) {
  return {
    step: FINANCING_IDENTITY_STEP,
    financing_instance_id: instanceId,
    instance_key: instanceKey || null,
    value: 0,
    formula: "",
  };
}

export function withFinancingIdentitySteps(
  steps: unknown,
  instanceId: string | null | undefined,
  instanceKey?: string | null,
): unknown {
  const list = Array.isArray(steps) ? [...steps] : [];
  const without = list.filter(
    (step) => !(step && typeof step === "object" && (step as { step?: string }).step === FINANCING_IDENTITY_STEP),
  );
  if (!instanceId) return without;
  return [financingIdentityStep(instanceId, instanceKey), ...without];
}

export type ExistingFinancedRecord = {
  id: string;
  formulaId: string | null;
  financingInstanceId?: string | null;
};

/**
 * Choose the persisted row to update for this save.
 * Returns null when the caller must insert a new row.
 */
export function matchFinancedRecordForSave(args: {
  existing: readonly ExistingFinancedRecord[];
  formulaId: string;
  financingInstanceId?: string | null;
  currentCountForFormula: number;
}): ExistingFinancedRecord | null {
  const formulaId = text(args.formulaId);
  if (!formulaId) return null;
  const sameFormula = args.existing.filter((row) => text(row.formulaId) === formulaId);
  const instanceId = text(args.financingInstanceId);
  if (instanceId) {
    const instanced = sameFormula.find((row) => text(row.financingInstanceId) === instanceId);
    if (instanced) return instanced;
  }
  if (args.currentCountForFormula !== 1) return null;
  const unlinked = sameFormula.filter((row) => !text(row.financingInstanceId));
  return unlinked.length === 1 ? unlinked[0] : null;
}

export function loanTypeQuantitiesFromSavedRecords(
  records: readonly { formulaId?: string | null; financingInstanceId?: string | null }[],
): Array<{ type: string; quantity: number }> {
  const byFormula = new Map<string, { instanced: Set<string>; unlinked: number }>();
  for (const record of records) {
    const formulaId = text(record.formulaId);
    if (!formulaId || formulaId.toLowerCase() === "aggregate") continue;
    const bucket = byFormula.get(formulaId) || { instanced: new Set<string>(), unlinked: 0 };
    const instanceId = text(record.financingInstanceId);
    if (instanceId) bucket.instanced.add(instanceId);
    else bucket.unlinked += 1;
    byFormula.set(formulaId, bucket);
  }
  return [...byFormula.entries()].map(([type, bucket]) => ({
    type,
    quantity: bucket.instanced.size > 0 ? bucket.instanced.size : bucket.unlinked > 0 ? 1 : 0,
  })).filter((item) => item.quantity > 0);
}

export function ensureFinancingInstanceId(
  existingByKey: Record<string, string>,
  key: string,
): { id: string; map: Record<string, string> } {
  const current = text(existingByKey[key]);
  if (current) return { id: current, map: existingByKey };
  const id = createFinancingInstanceId();
  return { id, map: { ...existingByKey, [key]: id } };
}

export function clonePropertyList<T extends object>(items: readonly T[] | null | undefined, fallback: T[]): T[] {
  if (!items || items.length === 0) return fallback.map((item) => ({ ...item }));
  return items.map((item) => ({ ...item }));
}

export function countResultsForFormula(
  results: readonly { type?: string | null }[],
  formulaId: string,
): number {
  const target = text(formulaId);
  return results.filter((row) => text(row.type) === target).length;
}

const ENGINE_EXCLUDED_IDENTITY_KEYS = [
  FINANCING_INSTANCE_FIELD,
  "instance_key",
  "asset_class",
  "properties",
  "commercialProperties",
] as const;

export function engineInputsWithoutIdentity(
  inputs: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const next = { ...(inputs || {}) };
  for (const key of ENGINE_EXCLUDED_IDENTITY_KEYS) {
    delete next[key];
  }
  return next;
}

export function identityFieldsForSave(
  instanceId: string | null | undefined,
  instanceKey?: string | null,
  assetClass?: string | null,
): Record<string, unknown> {
  const id = text(instanceId);
  if (!id) return {};
  return {
    [FINANCING_INSTANCE_FIELD]: id,
    instance_key: instanceKey || null,
    asset_class: assetClass || null,
  };
}

export function loanTypeQuantitiesFromCalculations(
  calcs: readonly {
    formula_id?: string | null;
    formulaId?: string | null;
    inputs?: unknown;
    calculation_steps?: unknown;
    calculationSteps?: unknown;
  }[],
): Array<{ type: string; quantity: number }> {
  const records = calcs.map((calc) => ({
    formulaId: calc.formulaId ?? calc.formula_id ?? null,
    financingInstanceId: extractFinancingInstanceId(calc),
  }));
  const fromIds = loanTypeQuantitiesFromSavedRecords(records);
  if (fromIds.length > 0) return fromIds;

  const counts = new Map<string, number>();
  for (const calc of calcs) {
    const inputs =
      calc.inputs && typeof calc.inputs === "object"
        ? (calc.inputs as Record<string, unknown>)
        : null;
    const list = inputs?.loanTypes;
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      const type = text(item);
      if (!type || type.toLowerCase() === "aggregate") continue;
      counts.set(type, (counts.get(type) || 0) + 1);
    }
  }
  return [...counts.entries()].map(([type, quantity]) => ({ type, quantity }));
}

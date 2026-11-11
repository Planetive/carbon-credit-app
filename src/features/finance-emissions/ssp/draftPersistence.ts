import { ApiError } from "@/api/client";
import type {
  SspDraftConflict,
  SspDraftRecord,
  SspDraftSnapshot,
  SspDraftUpsertBody,
} from "@/api/sspDrafts";
import { emptyEligibility } from "./eligibility";
import {
  createCollateral,
  createHolding,
  createLoan,
  createPool,
  createPoolOfPools,
  createSspDraft,
  createTranche,
  emptyDeal,
  emptyEvidence,
} from "./state";
import type {
  SspCollateral,
  SspDealInfo,
  SspDraft,
  SspEligibilityAnswers,
  SspEvidence,
  SspHolding,
  SspLoan,
  SspPool,
  SspPoolOfPools,
  SspTranche,
  SspYesNo,
} from "./types";

export type SspDraftSaveStatus =
  | "idle"
  | "saving"
  | "saved"
  | "unsaved"
  | "failed"
  | "conflict";

/** Full questionnaire fields persisted per holding. */
const DRAFT_KEYS: Array<keyof SspDraft> = [
  "eligibility",
  "deal",
  "emissionsPath",
  "collateral",
  "loans",
  "pools",
  "poolOfPools",
  "tranches",
  "holdings",
];

/** Deal-level hierarchy shared across sibling holdings (holdings stay per investment). */
const SHARED_KEYS: Array<keyof SspDraft> = [
  "eligibility",
  "deal",
  "emissionsPath",
  "collateral",
  "loans",
  "pools",
  "poolOfPools",
  "tranches",
];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  return String(value);
}

function asNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function pick(raw: Record<string, unknown>, camel: string, snake: string): unknown {
  return raw[camel] ?? raw[snake];
}

function asEvidence(value: unknown): SspEvidence {
  const raw = asRecord(value);
  return {
    ...emptyEvidence(),
    source: asString(raw.source),
    notes: asString(raw.notes),
    documentReference: asString(pick(raw, "documentReference", "document_reference")),
  };
}

function asEligibility(value: unknown): SspEligibilityAnswers {
  const raw = asRecord(value);
  const base = emptyEligibility();
  (Object.keys(base) as Array<keyof SspEligibilityAnswers>).forEach((key) => {
    if (raw[key] != null) {
      base[key] = asString(raw[key]) as never;
    }
  });
  return base;
}

function asDeal(value: unknown): SspDealInfo {
  const raw = asRecord(value);
  const base = emptyDeal();
  return {
    dealName: asString(pick(raw, "dealName", "deal_name"), base.dealName),
    dealIdentifier: asString(pick(raw, "dealIdentifier", "deal_identifier"), base.dealIdentifier),
    issuerName: asString(pick(raw, "issuerName", "issuer_name"), base.issuerName),
    originatorName: asString(pick(raw, "originatorName", "originator_name"), base.originatorName),
    spvName: asString(pick(raw, "spvName", "spv_name"), base.spvName),
    structureType: asString(
      pick(raw, "structureType", "structure_type"),
      base.structureType
    ) as SspDealInfo["structureType"],
    reportingYear: asString(pick(raw, "reportingYear", "reporting_year"), base.reportingYear),
    currency: asString(raw.currency, base.currency),
    documentationSource: asString(
      pick(raw, "documentationSource", "documentation_source"),
      base.documentationSource
    ),
    hasTranches: asString(pick(raw, "hasTranches", "has_tranches")) as SspYesNo,
    hasPoolOfPools: asString(pick(raw, "hasPoolOfPools", "has_pool_of_pools")) as SspYesNo,
    collateralRemainsWithOriginator: asString(
      pick(raw, "collateralRemainsWithOriginator", "collateral_remains_with_originator")
    ) as SspYesNo,
    poolsLinkedToSpecificTranches: asString(
      pick(raw, "poolsLinkedToSpecificTranches", "pools_linked_to_specific_tranches")
    ) as SspYesNo,
  };
}

function asCollateral(value: unknown): SspCollateral {
  const raw = asRecord(value);
  return createCollateral({
    collateralId: asString(pick(raw, "collateralId", "collateral_id")) || undefined,
    name: asString(raw.name),
    collateralType: asString(
      pick(raw, "collateralType", "collateral_type")
    ) as SspCollateral["collateralType"],
    attributionDenominator: asNumber(pick(raw, "attributionDenominator", "attribution_denominator")),
    denominatorLabel: asString(pick(raw, "denominatorLabel", "denominator_label")),
    currentOutstandingAmount: asNumber(
      pick(raw, "currentOutstandingAmount", "current_outstanding_amount")
    ),
    originalOutstandingAmount: asNumber(
      pick(raw, "originalOutstandingAmount", "original_outstanding_amount")
    ),
    assetValueAtOrigination: asNumber(
      pick(raw, "assetValueAtOrigination", "asset_value_at_origination")
    ),
    updatedAssetValue: asNumber(pick(raw, "updatedAssetValue", "updated_asset_value")),
    pcafMethodOption: asString(pick(raw, "pcafMethodOption", "pcaf_method_option")),
    emissionsPath: asString(
      pick(raw, "emissionsPath", "emissions_path")
    ) as SspCollateral["emissionsPath"],
    scope1Emissions: asNumber(pick(raw, "scope1Emissions", "scope1_emissions")),
    scope2Emissions: asNumber(pick(raw, "scope2Emissions", "scope2_emissions")),
    scope3Emissions: asNumber(pick(raw, "scope3Emissions", "scope3_emissions")),
    dataQualityScore: asNumber(pick(raw, "dataQualityScore", "data_quality_score")),
    factorLibraryEntryId: asString(pick(raw, "factorLibraryEntryId", "factor_library_entry_id")),
    classInputs: { ...asRecord(pick(raw, "classInputs", "class_inputs")) },
    evidence: asEvidence(raw.evidence),
  });
}

function asLoan(value: unknown): SspLoan {
  const raw = asRecord(value);
  return createLoan({
    loanId: asString(pick(raw, "loanId", "loan_id")) || undefined,
    name: asString(raw.name),
    collateralIds: asStringArray(pick(raw, "collateralIds", "collateral_ids")),
    currentOutstandingAmount: asNumber(
      pick(raw, "currentOutstandingAmount", "current_outstanding_amount")
    ),
    originalOutstandingAmount: asNumber(
      pick(raw, "originalOutstandingAmount", "original_outstanding_amount")
    ),
    notes: asString(raw.notes),
    evidence: asEvidence(raw.evidence),
  });
}

function asPool(value: unknown): SspPool {
  const raw = asRecord(value);
  return createPool({
    poolId: asString(pick(raw, "poolId", "pool_id")) || undefined,
    name: asString(raw.name),
    loanIds: asStringArray(pick(raw, "loanIds", "loan_ids")),
    poolCurrentOutstandingAmount: asNumber(
      pick(raw, "poolCurrentOutstandingAmount", "pool_current_outstanding_amount")
    ),
    reportedEmissionsTotal: asNumber(pick(raw, "reportedEmissionsTotal", "reported_emissions_total")),
    reportedEmissionsPeriod: asString(
      pick(raw, "reportedEmissionsPeriod", "reported_emissions_period")
    ),
    reportedScopeCoverage: asString(pick(raw, "reportedScopeCoverage", "reported_scope_coverage")),
    reportedVerification: asString(
      pick(raw, "reportedVerification", "reported_verification")
    ) as SspPool["reportedVerification"],
    reportedSource: asString(pick(raw, "reportedSource", "reported_source")),
    evidence: asEvidence(raw.evidence),
  });
}

function asPoolOfPools(value: unknown): SspPoolOfPools | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = asRecord(value);
  return createPoolOfPools({
    poolOfPoolsId: asString(pick(raw, "poolOfPoolsId", "pool_of_pools_id")) || undefined,
    name: asString(raw.name) || undefined,
    poolIds: asStringArray(pick(raw, "poolIds", "pool_ids")),
    currentOutstandingAmount: asNumber(
      pick(raw, "currentOutstandingAmount", "current_outstanding_amount")
    ),
    evidence: asEvidence(raw.evidence),
  });
}

function asTranche(value: unknown): SspTranche {
  const raw = asRecord(value);
  return createTranche({
    trancheId: asString(pick(raw, "trancheId", "tranche_id")) || undefined,
    name: asString(raw.name),
    seniorityLabel: asString(pick(raw, "seniorityLabel", "seniority_label")),
    currentOutstandingAmount: asNumber(
      pick(raw, "currentOutstandingAmount", "current_outstanding_amount")
    ),
    linkedPoolIds: asStringArray(pick(raw, "linkedPoolIds", "linked_pool_ids")),
    isGreenTranche: asString(pick(raw, "isGreenTranche", "is_green_tranche")) as SspYesNo,
    evidence: asEvidence(raw.evidence),
  });
}

function asHolding(value: unknown): SspHolding {
  const raw = asRecord(value);
  return createHolding({
    holdingId: asString(pick(raw, "holdingId", "holding_id")) || undefined,
    name: asString(raw.name),
    trancheId: asString(pick(raw, "trancheId", "tranche_id")),
    bankOutstandingInvestment: asNumber(
      pick(raw, "bankOutstandingInvestment", "bank_outstanding_investment")
    ),
    currency: asString(raw.currency) || undefined,
    evidence: asEvidence(raw.evidence),
  });
}

function asList<T>(value: unknown, map: (row: unknown) => T): T[] {
  return Array.isArray(value) ? value.map(map) : [];
}

export function snapshotToSspDraft(
  instanceKey: string,
  snapshot: SspDraftSnapshot,
  fallbackId?: string
): SspDraft {
  const raw = asRecord(snapshot);
  const draft = createSspDraft(
    asString(pick(raw, "instanceKey", "instance_key"), instanceKey),
    asString(pick(raw, "financingInstanceId", "financing_instance_id"), fallbackId || "") || undefined
  );
  draft.dealId = asString(pick(raw, "dealId", "deal_id")) || null;
  draft.holdingId = asString(pick(raw, "holdingId", "holding_id")) || null;
  draft.dealUpdatedAt = asString(pick(raw, "dealUpdatedAt", "deal_updated_at")) || null;
  draft.holdingUpdatedAt = asString(pick(raw, "holdingUpdatedAt", "holding_updated_at")) || null;
  draft.siblingCount = Number(pick(raw, "siblingCount", "sibling_count") ?? 0) || 0;
  draft.eligibility = asEligibility(raw.eligibility);
  draft.deal = asDeal(raw.deal);
  draft.emissionsPath = asString(
    pick(raw, "emissionsPath", "emissions_path")
  ) as SspDraft["emissionsPath"];
  draft.collateral = asList(raw.collateral, asCollateral);
  draft.loans = asList(raw.loans, asLoan);
  draft.pools = asList(raw.pools, asPool);
  draft.poolOfPools = asPoolOfPools(pick(raw, "poolOfPools", "pool_of_pools"));
  draft.tranches = asList(raw.tranches, asTranche);
  draft.holdings = asList(raw.holdings, asHolding);
  return draft;
}

export function hydrateSspDraftFromRecord(current: SspDraft, record: SspDraftRecord): SspDraft {
  const hydrated = snapshotToSspDraft(
    current.instanceKey,
    record.draft || {},
    record.holding.financing_instance_id || current.financingInstanceId
  );
  hydrated.instanceKey = record.holding.instance_key || current.instanceKey;
  hydrated.financingInstanceId =
    record.holding.financing_instance_id || current.financingInstanceId;
  hydrated.dealId = record.deal.id;
  hydrated.holdingId = record.holding.id;
  hydrated.dealUpdatedAt = record.deal.updated_at || hydrated.dealUpdatedAt;
  hydrated.holdingUpdatedAt = record.holding.updated_at || hydrated.holdingUpdatedAt;
  hydrated.siblingCount = record.sibling_count ?? hydrated.siblingCount ?? 0;
  return hydrated;
}

export function questionnairePayload(draft: SspDraft): SspDraftSnapshot {
  const payload: SspDraftSnapshot = {
    financingInstanceId: draft.financingInstanceId,
    instanceKey: draft.instanceKey,
  };
  for (const key of DRAFT_KEYS) {
    payload[key] = draft[key];
  }
  return payload;
}

export function toSspDraftUpsertBody(
  draft: SspDraft,
  options: {
    counterpartyId?: string | null;
    updateShared?: boolean;
  } = {}
): SspDraftUpsertBody {
  return {
    financing_instance_id: draft.financingInstanceId,
    instance_key: draft.instanceKey,
    counterparty_id: options.counterpartyId || null,
    deal_id: draft.dealId || null,
    update_shared: Boolean(options.updateShared),
    expected_deal_updated_at: draft.dealUpdatedAt || null,
    expected_holding_updated_at: draft.holdingUpdatedAt || null,
    draft: questionnairePayload(draft),
  };
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    Object.keys(value as Record<string, unknown>)
      .sort()
      .forEach((key) => {
        out[key] = stable((value as Record<string, unknown>)[key]);
      });
    return out;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 1e6) / 1e6;
  }
  return value ?? null;
}

export function draftFingerprint(draft: SspDraft): string {
  return JSON.stringify(
    stable({
      financingInstanceId: draft.financingInstanceId,
      instanceKey: draft.instanceKey,
      dealId: draft.dealId || null,
      ...Object.fromEntries(DRAFT_KEYS.map((key) => [key, draft[key]])),
    })
  );
}

export function sharedFingerprint(draft: SspDraft): string {
  return JSON.stringify(stable(Object.fromEntries(SHARED_KEYS.map((key) => [key, draft[key]]))));
}

export function sharedDealChanged(local: SspDraft, saved: SspDraft | null | undefined): boolean {
  if (!saved) return false;
  return sharedFingerprint(local) !== sharedFingerprint(saved);
}

export function shouldConfirmSharedWrite(local: SspDraft, saved: SspDraft | null | undefined): boolean {
  return (local.siblingCount || 0) > 0 && sharedDealChanged(local, saved);
}

export function parseSspConflict(error: unknown): SspDraftConflict | null {
  if (!(error instanceof ApiError) || error.status !== 409) return null;
  const data = error.detail;
  const detail =
    data && typeof data === "object" && "detail" in data
      ? (data as { detail: unknown }).detail
      : data;
  if (!detail || typeof detail !== "object") return null;
  const row = detail as Record<string, unknown>;
  const code = asString(row.code);
  if (!code) return null;
  return {
    code,
    message: asString(row.message, error.message),
    changed_fields: Array.isArray(row.changed_fields) ? row.changed_fields.map(String) : [],
    deal_id: row.deal_id ? String(row.deal_id) : undefined,
    deal_updated_at: row.deal_updated_at ? String(row.deal_updated_at) : null,
    sibling_count: typeof row.sibling_count === "number" ? row.sibling_count : undefined,
    sibling_financing_instance_ids: Array.isArray(row.sibling_financing_instance_ids)
      ? row.sibling_financing_instance_ids.map(String)
      : [],
    holding_id: row.holding_id ? String(row.holding_id) : undefined,
    holding_updated_at: row.holding_updated_at ? String(row.holding_updated_at) : null,
  };
}

export function isStaleSaveResponse(requestSeq: number, latestSeq: number): boolean {
  return requestSeq !== latestSeq;
}

export function nextSaveSeq(current: number): number {
  return current + 1;
}

export function mergeResumedDrafts(
  local: Record<string, SspDraft>,
  records: SspDraftRecord[]
): Record<string, SspDraft> {
  const next = { ...local };
  const byKey = new Map<string, SspDraftRecord>();
  for (const record of records) {
    const key = record.holding.instance_key || "";
    if (key) byKey.set(key, record);
  }
  for (const key of Object.keys(next)) {
    const record = byKey.get(key);
    if (record) next[key] = hydrateSspDraftFromRecord(next[key], record);
  }
  return next;
}

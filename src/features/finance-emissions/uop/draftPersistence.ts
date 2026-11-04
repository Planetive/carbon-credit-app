import { ApiError } from "@/api/client";
import type {
  UopDraftConflict,
  UopDraftRecord,
  UopDraftSnapshot,
  UopDraftUpsertBody,
} from "@/api/uopDrafts";
import { createUnderlyingAsset, createUopDraft, emptyEligibility, emptyEstimation } from "./state";
import type { UopDraft, UopEligibilityAnswers, UopUnderlyingAsset } from "./types";

export type UopDraftSaveStatus =
  | "idle"
  | "saving"
  | "saved"
  | "unsaved"
  | "failed"
  | "conflict";

const DRAFT_KEYS: Array<keyof UopDraft> = [
  "eligibility",
  "structureName",
  "issuerName",
  "structureKind",
  "investmentType",
  "outstandingInvestment",
  "totalStructureDebt",
  "totalStructureEquity",
  "reportingYear",
  "currency",
  "evidenceSource",
  "evidenceNotes",
  "emissionsPath",
  "issuerLevelReason",
  "issuerReportedFinancedEmissions",
  "issuerReportYear",
  "issuerReportVerification",
  "issuerReportSource",
  "allocationStatus",
  "allocatedProceeds",
  "unallocatedProceeds",
  "expectedAllocationEvidence",
  "unallocatedUsesAssetLevelEstimate",
  "totalStructureAssets",
  "issuerCompanyType",
  "issuerEvic",
  "issuerEquityPlusDebt",
  "issuerScope1Emissions",
  "issuerScope2Emissions",
  "issuerScope3Emissions",
  "issuerVerificationStatus",
  "assets",
];

const SHARED_KEYS: Array<keyof UopDraft> = [
  "eligibility",
  "structureName",
  "issuerName",
  "structureKind",
  "totalStructureDebt",
  "totalStructureEquity",
  "reportingYear",
  "currency",
  "evidenceSource",
  "evidenceNotes",
  "emissionsPath",
  "issuerLevelReason",
  "issuerReportedFinancedEmissions",
  "issuerReportYear",
  "issuerReportVerification",
  "issuerReportSource",
  "allocationStatus",
  "allocatedProceeds",
  "unallocatedProceeds",
  "expectedAllocationEvidence",
  "unallocatedUsesAssetLevelEstimate",
  "totalStructureAssets",
  "issuerCompanyType",
  "issuerEvic",
  "issuerEquityPlusDebt",
  "issuerScope1Emissions",
  "issuerScope2Emissions",
  "issuerScope3Emissions",
  "issuerVerificationStatus",
  "assets",
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

function asEligibility(value: unknown): UopEligibilityAnswers {
  const raw = asRecord(value);
  const base = emptyEligibility();
  (Object.keys(base) as Array<keyof UopEligibilityAnswers>).forEach((key) => {
    if (raw[key] != null) {
      base[key] = asString(raw[key]) as never;
    }
  });
  return base;
}

function asAsset(value: unknown): UopUnderlyingAsset {
  const raw = asRecord(value);
  return createUnderlyingAsset({
    underlyingAssetId: asString(raw.underlyingAssetId || raw.underlying_asset_id),
    name: asString(raw.name),
    assetClass: asString(raw.assetClass || raw.asset_class) as UopUnderlyingAsset["assetClass"],
    allocatedOutstanding: asNumber(raw.allocatedOutstanding ?? raw.allocated_outstanding),
    totalAssetValue: asNumber(raw.totalAssetValue ?? raw.total_asset_value),
    hasReportedEmissions: asString(raw.hasReportedEmissions || raw.has_reported_emissions) as UopUnderlyingAsset["hasReportedEmissions"],
    verificationStatus: asString(raw.verificationStatus || raw.verification_status) as UopUnderlyingAsset["verificationStatus"],
    verifierName: asString(raw.verifierName || raw.verifier_name),
    scope1Emissions: asNumber(raw.scope1Emissions ?? raw.scope1_emissions),
    scope2Emissions: asNumber(raw.scope2Emissions ?? raw.scope2_emissions),
    scope3Emissions: asNumber(raw.scope3Emissions ?? raw.scope3_emissions),
    dataSource: asString(raw.dataSource || raw.data_source),
    evidenceNotes: asString(raw.evidenceNotes || raw.evidence_notes),
    estimation: asEstimation(raw.estimation),
  });
}

function asEstimation(value: unknown): UopUnderlyingAsset["estimation"] {
  const raw = asRecord(value);
  return {
    ...emptyEstimation(),
    method: asString(raw.method) as UopUnderlyingAsset["estimation"]["method"],
    pcafOption: asString(raw.pcafOption || raw.pcaf_option) as UopUnderlyingAsset["estimation"]["pcafOption"],
    physicalActivityAmount: asNumber(raw.physicalActivityAmount ?? raw.physical_activity_amount),
    physicalActivityUnit: asString(raw.physicalActivityUnit || raw.physical_activity_unit),
    energyConsumption: asNumber(raw.energyConsumption ?? raw.energy_consumption),
    processEmissions: asNumber(raw.processEmissions ?? raw.process_emissions),
    productionAmount: asNumber(raw.productionAmount ?? raw.production_amount ?? raw.production),
    companyRevenue: asNumber(raw.companyRevenue ?? raw.company_revenue),
    assetTurnoverRatio: asNumber(raw.assetTurnoverRatio ?? raw.asset_turnover_ratio),
    floorArea: asNumber(raw.floorArea ?? raw.floor_area),
    labelEnergyIntensity: asNumber(
      raw.labelEnergyIntensity ?? raw.label_energy_intensity ?? raw.estimated_energy_consumption_from_labels
    ),
    statsEnergyIntensity: asNumber(
      raw.statsEnergyIntensity ?? raw.stats_energy_intensity ?? raw.estimated_energy_consumption_from_statistics
    ),
    numberOfBuildings: asNumber(raw.numberOfBuildings ?? raw.number_of_buildings),
    fuelConsumption: asNumber(raw.fuelConsumption ?? raw.fuel_consumption),
    distanceTraveled: asNumber(raw.distanceTraveled ?? raw.distance_traveled),
    efficiency: asNumber(raw.efficiency),
    sectorKey: asString(raw.sectorKey || raw.sector_key),
    sectorName: asString(raw.sectorName || raw.sector_name),
    sectorAllocationPercent: asNumber(raw.sectorAllocationPercent ?? raw.sector_allocation_percent),
    factorLibrary: asString(raw.factorLibrary || raw.factor_library) as UopUnderlyingAsset["estimation"]["factorLibrary"],
    factorDatasetCode: asString(raw.factorDatasetCode || raw.factor_dataset_code),
    factorSource: asString(raw.factorSource || raw.factor_source),
    factorGeography: asString(raw.factorGeography || raw.factor_geography),
    factorYear: asString(raw.factorYear || raw.factor_year),
    factorUnit: asString(raw.factorUnit || raw.factor_unit),
    emissionFactor: asNumber(raw.emissionFactor ?? raw.emission_factor),
  };
}

export function snapshotToUopDraft(instanceKey: string, snapshot: UopDraftSnapshot, fallbackId?: string): UopDraft {
  const raw = asRecord(snapshot);
  const draft = createUopDraft(
    asString(raw.instanceKey || raw.instance_key, instanceKey),
    asString(raw.financingInstanceId || raw.financing_instance_id, fallbackId || "")
  );
  draft.structureId = asString(raw.structureId || raw.structure_id) || null;
  draft.investmentId = asString(raw.investmentId || raw.investment_id) || null;
  draft.structureUpdatedAt = asString(raw.structureUpdatedAt || raw.structure_updated_at) || null;
  draft.investmentUpdatedAt = asString(raw.investmentUpdatedAt || raw.investment_updated_at) || null;
  draft.siblingCount = Number(raw.siblingCount ?? raw.sibling_count ?? 0) || 0;
  draft.eligibility = asEligibility(raw.eligibility);
  draft.structureName = asString(raw.structureName || raw.structure_name);
  draft.issuerName = asString(raw.issuerName || raw.issuer_name);
  draft.structureKind = asString(raw.structureKind || raw.structure_kind) as UopDraft["structureKind"];
  draft.investmentType = asString(raw.investmentType || raw.investment_type) as UopDraft["investmentType"];
  draft.outstandingInvestment = asNumber(raw.outstandingInvestment ?? raw.outstanding_amount);
  draft.totalStructureDebt = asNumber(raw.totalStructureDebt ?? raw.total_structure_debt);
  draft.totalStructureEquity = asNumber(raw.totalStructureEquity ?? raw.total_structure_equity);
  draft.reportingYear = asString(raw.reportingYear || raw.reporting_year, draft.reportingYear);
  draft.currency = asString(raw.currency, draft.currency);
  draft.evidenceSource = asString(raw.evidenceSource || raw.evidence_source);
  draft.evidenceNotes = asString(raw.evidenceNotes || raw.evidence_notes);
  draft.emissionsPath = asString(raw.emissionsPath || raw.emissions_path) as UopDraft["emissionsPath"];
  draft.issuerLevelReason = asString(raw.issuerLevelReason || raw.issuer_level_reason) as UopDraft["issuerLevelReason"];
  draft.issuerReportedFinancedEmissions = asNumber(
    raw.issuerReportedFinancedEmissions ?? raw.issuer_reported_financed_emissions
  );
  draft.issuerReportYear = asString(raw.issuerReportYear || raw.issuer_report_year);
  draft.issuerReportVerification = asString(
    raw.issuerReportVerification || raw.issuer_report_verification
  ) as UopDraft["issuerReportVerification"];
  draft.issuerReportSource = asString(raw.issuerReportSource || raw.issuer_report_source);
  draft.allocationStatus = asString(raw.allocationStatus || raw.allocation_status) as UopDraft["allocationStatus"];
  draft.allocatedProceeds = asNumber(raw.allocatedProceeds ?? raw.allocated_proceeds);
  draft.unallocatedProceeds = asNumber(raw.unallocatedProceeds ?? raw.unallocated_proceeds);
  draft.expectedAllocationEvidence = asString(
    raw.expectedAllocationEvidence || raw.expected_allocation_evidence
  );
  draft.unallocatedUsesAssetLevelEstimate = asString(
    raw.unallocatedUsesAssetLevelEstimate || raw.unallocated_uses_asset_level_estimate
  ) as UopDraft["unallocatedUsesAssetLevelEstimate"];
  draft.totalStructureAssets = asNumber(raw.totalStructureAssets ?? raw.total_structure_assets);
  draft.issuerCompanyType = asString(raw.issuerCompanyType || raw.issuer_company_type) as UopDraft["issuerCompanyType"];
  draft.issuerEvic = asNumber(raw.issuerEvic ?? raw.issuer_evic);
  draft.issuerEquityPlusDebt = asNumber(raw.issuerEquityPlusDebt ?? raw.issuer_equity_plus_debt);
  draft.issuerScope1Emissions = asNumber(raw.issuerScope1Emissions ?? raw.issuer_scope1_emissions);
  draft.issuerScope2Emissions = asNumber(raw.issuerScope2Emissions ?? raw.issuer_scope2_emissions);
  draft.issuerScope3Emissions = asNumber(raw.issuerScope3Emissions ?? raw.issuer_scope3_emissions);
  draft.issuerVerificationStatus = asString(
    raw.issuerVerificationStatus || raw.issuer_verification_status
  ) as UopDraft["issuerVerificationStatus"];
  const lastCalc = raw.lastCalculation || raw.last_calculation;
  draft.lastCalculation =
    lastCalc && typeof lastCalc === "object" ? (lastCalc as UopDraft["lastCalculation"]) : null;
  const assets = raw.assets;
  draft.assets = Array.isArray(assets) ? assets.map(asAsset) : [];
  return draft;
}

export function hydrateUopDraftFromRecord(current: UopDraft, record: UopDraftRecord): UopDraft {
  const hydrated = snapshotToUopDraft(
    current.instanceKey,
    record.draft || {},
    record.investment.financing_instance_id || current.financingInstanceId
  );
  hydrated.instanceKey = record.investment.instance_key || current.instanceKey;
  hydrated.financingInstanceId =
    record.investment.financing_instance_id || current.financingInstanceId;
  hydrated.structureId = record.structure.id;
  hydrated.investmentId = record.investment.id;
  hydrated.structureUpdatedAt = record.structure.updated_at || hydrated.structureUpdatedAt;
  hydrated.investmentUpdatedAt = record.investment.updated_at || hydrated.investmentUpdatedAt;
  hydrated.siblingCount = record.sibling_count ?? hydrated.siblingCount ?? 0;
  if (!hydrated.assets.length && record.assets?.length) {
    hydrated.assets = record.assets.map((asset) =>
      createUnderlyingAsset({
        underlyingAssetId: asset.underlying_asset_id,
        name: asset.name,
        assetClass: asset.asset_class as UopUnderlyingAsset["assetClass"],
      })
    );
  }
  return hydrated;
}

export function questionnairePayload(draft: UopDraft): UopDraftSnapshot {
  const payload: UopDraftSnapshot = {
    financingInstanceId: draft.financingInstanceId,
    instanceKey: draft.instanceKey,
  };
  for (const key of DRAFT_KEYS) {
    payload[key] = draft[key];
  }
  return payload;
}

export function toUopDraftUpsertBody(
  draft: UopDraft,
  options: {
    counterpartyId?: string | null;
    updateShared?: boolean;
  } = {}
): UopDraftUpsertBody {
  return {
    financing_instance_id: draft.financingInstanceId,
    instance_key: draft.instanceKey,
    counterparty_id: options.counterpartyId || null,
    structure_id: draft.structureId || null,
    update_shared: Boolean(options.updateShared),
    expected_structure_updated_at: draft.structureUpdatedAt || null,
    expected_investment_updated_at: draft.investmentUpdatedAt || null,
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

export function draftFingerprint(draft: UopDraft): string {
  return JSON.stringify(
    stable({
      financingInstanceId: draft.financingInstanceId,
      instanceKey: draft.instanceKey,
      structureId: draft.structureId || null,
      ...Object.fromEntries(DRAFT_KEYS.map((key) => [key, draft[key]])),
    })
  );
}

export function sharedFingerprint(draft: UopDraft): string {
  return JSON.stringify(stable(Object.fromEntries(SHARED_KEYS.map((key) => [key, draft[key]]))));
}

export function sharedStructureChanged(local: UopDraft, saved: UopDraft | null | undefined): boolean {
  if (!saved) return false;
  return sharedFingerprint(local) !== sharedFingerprint(saved);
}

export function shouldConfirmSharedWrite(local: UopDraft, saved: UopDraft | null | undefined): boolean {
  return (local.siblingCount || 0) > 0 && sharedStructureChanged(local, saved);
}

export function parseUopConflict(error: unknown): UopDraftConflict | null {
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
    structure_id: row.structure_id ? String(row.structure_id) : undefined,
    structure_updated_at: row.structure_updated_at ? String(row.structure_updated_at) : null,
    sibling_count: typeof row.sibling_count === "number" ? row.sibling_count : undefined,
    sibling_financing_instance_ids: Array.isArray(row.sibling_financing_instance_ids)
      ? row.sibling_financing_instance_ids.map(String)
      : [],
    investment_id: row.investment_id ? String(row.investment_id) : undefined,
    investment_updated_at: row.investment_updated_at ? String(row.investment_updated_at) : null,
  };
}

export function isStaleSaveResponse(requestSeq: number, latestSeq: number): boolean {
  return requestSeq !== latestSeq;
}

export function nextSaveSeq(current: number): number {
  return current + 1;
}

export function mergeResumedDrafts(
  local: Record<string, UopDraft>,
  records: UopDraftRecord[]
): Record<string, UopDraft> {
  const next = { ...local };
  const byKey = new Map<string, UopDraftRecord>();
  for (const record of records) {
    const key = record.investment.instance_key || "";
    if (key) byKey.set(key, record);
  }
  for (const key of Object.keys(next)) {
    const record = byKey.get(key);
    if (record) next[key] = hydrateUopDraftFromRecord(next[key], record);
  }
  return next;
}

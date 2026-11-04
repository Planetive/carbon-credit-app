import { UOP_LOAN_TYPE } from "../config/loanTypeOptions";
import { createFinancingInstanceId, loanInstanceKey } from "@/utils/financedExposureIdentity";
import { resolveUopAccounting } from "./eligibility";
import type {
  UopByInstance,
  UopDraft,
  UopEligibilityAnswers,
  UopEstimationInputs,
  UopUnderlyingAsset,
} from "./types";

export const UOP_CURRENCIES = ["PKR", "USD", "EUR", "GBP"] as const;

export const emptyEligibility = (): UopEligibilityAnswers => ({
  proceedsAllocatedToSpecificAssets: "",
  isSecuritized: "",
  structureHasControl: "",
  structureListing: "",
  controlOneFullyAllocatedAsset: "",
  controlAssetIsProject: "",
  debtBasedWithOneFullyAllocatedAsset: "",
  singleAssetClass: "",
  assetsOnIssuerBalanceSheet: "",
});

export const emptyEstimation = (): UopEstimationInputs => ({
  method: "",
  pcafOption: "",
  physicalActivityAmount: null,
  physicalActivityUnit: "",
  energyConsumption: null,
  processEmissions: null,
  productionAmount: null,
  companyRevenue: null,
  assetTurnoverRatio: null,
  floorArea: null,
  labelEnergyIntensity: null,
  statsEnergyIntensity: null,
  numberOfBuildings: null,
  fuelConsumption: null,
  distanceTraveled: null,
  efficiency: null,
  sectorKey: "",
  sectorName: "",
  sectorAllocationPercent: null,
  factorLibrary: "",
  factorDatasetCode: "",
  factorSource: "",
  factorGeography: "",
  factorYear: "",
  factorUnit: "",
  emissionFactor: null,
});

export function createUnderlyingAssetId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `uop-asset-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createUnderlyingAsset(partial?: Partial<UopUnderlyingAsset>): UopUnderlyingAsset {
  return {
    underlyingAssetId: partial?.underlyingAssetId || createUnderlyingAssetId(),
    name: partial?.name || "",
    assetClass: partial?.assetClass || "",
    allocatedOutstanding: partial?.allocatedOutstanding ?? null,
    totalAssetValue: partial?.totalAssetValue ?? null,
    hasReportedEmissions: partial?.hasReportedEmissions || "",
    verificationStatus: partial?.verificationStatus || "",
    verifierName: partial?.verifierName || "",
    scope1Emissions: partial?.scope1Emissions ?? null,
    scope2Emissions: partial?.scope2Emissions ?? null,
    scope3Emissions: partial?.scope3Emissions ?? null,
    dataSource: partial?.dataSource || "",
    evidenceNotes: partial?.evidenceNotes || "",
    estimation: { ...emptyEstimation(), ...(partial?.estimation || {}) },
  };
}

export function createUopDraft(instanceKey: string, financingInstanceId?: string): UopDraft {
  return {
    financingInstanceId: financingInstanceId || createFinancingInstanceId(),
    instanceKey,
    structureId: null,
    investmentId: null,
    structureUpdatedAt: null,
    investmentUpdatedAt: null,
    siblingCount: 0,
    eligibility: emptyEligibility(),
    structureName: "",
    issuerName: "",
    structureKind: "",
    investmentType: "",
    outstandingInvestment: null,
    totalStructureDebt: null,
    totalStructureEquity: null,
    reportingYear: String(new Date().getFullYear()),
    currency: "PKR",
    evidenceSource: "",
    evidenceNotes: "",
    emissionsPath: "",
    issuerLevelReason: "",
    issuerReportedFinancedEmissions: null,
    issuerReportYear: "",
    issuerReportVerification: "",
    issuerReportSource: "",
    allocationStatus: "",
    allocatedProceeds: null,
    unallocatedProceeds: null,
    expectedAllocationEvidence: "",
    unallocatedUsesAssetLevelEstimate: "",
    totalStructureAssets: null,
    issuerCompanyType: "",
    issuerEvic: null,
    issuerEquityPlusDebt: null,
    issuerScope1Emissions: null,
    issuerScope2Emissions: null,
    issuerScope3Emissions: null,
    issuerVerificationStatus: "",
    lastCalculation: null,
    assets: [],
  };
}

export function uopInstanceKey(instance: number): string {
  return loanInstanceKey(UOP_LOAN_TYPE, instance);
}

export function ensureUopInstances(
  current: UopByInstance | undefined,
  quantity: number
): UopByInstance {
  const qty = Math.max(0, Number(quantity) || 0);
  const next: UopByInstance = {};
  for (let i = 1; i <= qty; i += 1) {
    const key = uopInstanceKey(i);
    next[key] = current?.[key] ? { ...current[key], instanceKey: key } : createUopDraft(key);
  }
  return next;
}

export function patchUopDraft(draft: UopDraft, patch: Partial<UopDraft>): UopDraft {
  return { ...draft, ...patch, instanceKey: draft.instanceKey, financingInstanceId: draft.financingInstanceId };
}

export function patchUopEligibility(draft: UopDraft, patch: Partial<UopEligibilityAnswers>): UopDraft {
  return patchUopDraft(draft, { eligibility: { ...draft.eligibility, ...patch } });
}

export function addUnderlyingAsset(draft: UopDraft, asset?: Partial<UopUnderlyingAsset>): UopDraft {
  return patchUopDraft(draft, { assets: [...draft.assets, createUnderlyingAsset(asset)] });
}

export function updateUnderlyingAsset(
  draft: UopDraft,
  assetId: string,
  patch: Partial<UopUnderlyingAsset>
): UopDraft {
  return patchUopDraft(draft, {
    assets: draft.assets.map((asset) =>
      asset.underlyingAssetId === assetId
        ? {
            ...asset,
            ...patch,
            underlyingAssetId: asset.underlyingAssetId,
            estimation: { ...asset.estimation, ...(patch.estimation || {}) },
          }
        : asset
    ),
  });
}

export function removeUnderlyingAsset(draft: UopDraft, assetId: string): UopDraft {
  return patchUopDraft(draft, {
    assets: draft.assets.filter((asset) => asset.underlyingAssetId !== assetId),
  });
}

export function draftOutcome(draft: UopDraft) {
  return resolveUopAccounting(draft.eligibility);
}

export function cloneUopDraft(draft: UopDraft): UopDraft {
  return {
    ...draft,
    eligibility: { ...draft.eligibility },
    assets: draft.assets.map((asset) => ({
      ...asset,
      estimation: { ...asset.estimation },
    })),
  };
}

const SHARED_STRUCTURE_KEYS: Array<keyof UopDraft> = [
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

export function copySharedStructure(from: UopDraft, to: UopDraft): UopDraft {
  const next = cloneUopDraft(to);
  for (const key of SHARED_STRUCTURE_KEYS) {
    if (key === "eligibility") {
      next.eligibility = { ...from.eligibility };
    } else if (key === "assets") {
      next.assets = from.assets.map((asset) => ({
        ...asset,
        estimation: { ...asset.estimation },
      }));
    } else {
      (next as unknown as Record<string, unknown>)[key] = from[key] as never;
    }
  }
  next.structureId = from.structureId || to.structureId;
  next.structureUpdatedAt = from.structureUpdatedAt || to.structureUpdatedAt;
  next.siblingCount = Math.max(from.siblingCount || 0, to.siblingCount || 0);
  return next;
}

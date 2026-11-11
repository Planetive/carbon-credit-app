import { createFinancingInstanceId, loanInstanceKey } from "@/utils/financedExposureIdentity";
import { SSP_LOAN_TYPE } from "../config/loanTypeOptions";
import { emptyEligibility, resolveSspAccounting } from "./eligibility";
import type {
  SspByInstance,
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
} from "./types";

export const SSP_CURRENCIES = ["PKR", "USD", "EUR", "GBP"] as const;

export function createSspId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function emptyEvidence(): SspEvidence {
  return { source: "", notes: "", documentReference: "" };
}

export function emptyDeal(): SspDealInfo {
  return {
    dealName: "",
    dealIdentifier: "",
    issuerName: "",
    originatorName: "",
    spvName: "",
    structureType: "",
    reportingYear: String(new Date().getFullYear()),
    currency: "PKR",
    documentationSource: "",
    hasTranches: "",
    hasPoolOfPools: "",
    collateralRemainsWithOriginator: "",
    poolsLinkedToSpecificTranches: "",
  };
}

export function createCollateral(partial?: Partial<SspCollateral>): SspCollateral {
  return {
    collateralId: partial?.collateralId || createSspId("col"),
    name: partial?.name || "",
    collateralType: partial?.collateralType || "",
    attributionDenominator: partial?.attributionDenominator ?? null,
    denominatorLabel: partial?.denominatorLabel || "",
    currentOutstandingAmount: partial?.currentOutstandingAmount ?? null,
    originalOutstandingAmount: partial?.originalOutstandingAmount ?? null,
    assetValueAtOrigination: partial?.assetValueAtOrigination ?? null,
    updatedAssetValue: partial?.updatedAssetValue ?? null,
    pcafMethodOption: partial?.pcafMethodOption || "",
    emissionsPath: partial?.emissionsPath || "",
    scope1Emissions: partial?.scope1Emissions ?? null,
    scope2Emissions: partial?.scope2Emissions ?? null,
    scope3Emissions: partial?.scope3Emissions ?? null,
    dataQualityScore: partial?.dataQualityScore ?? null,
    factorLibraryEntryId: partial?.factorLibraryEntryId || "",
    classInputs: partial?.classInputs ? { ...partial.classInputs } : {},
    evidence: { ...emptyEvidence(), ...(partial?.evidence || {}) },
  };
}

export function createLoan(partial?: Partial<SspLoan>): SspLoan {
  return {
    loanId: partial?.loanId || createSspId("loan"),
    name: partial?.name || "",
    collateralIds: partial?.collateralIds ? [...partial.collateralIds] : [],
    currentOutstandingAmount: partial?.currentOutstandingAmount ?? null,
    originalOutstandingAmount: partial?.originalOutstandingAmount ?? null,
    notes: partial?.notes || "",
    evidence: { ...emptyEvidence(), ...(partial?.evidence || {}) },
  };
}

export function createPool(partial?: Partial<SspPool>): SspPool {
  return {
    poolId: partial?.poolId || createSspId("pool"),
    name: partial?.name || "",
    loanIds: partial?.loanIds ? [...partial.loanIds] : [],
    poolCurrentOutstandingAmount: partial?.poolCurrentOutstandingAmount ?? null,
    reportedEmissionsTotal: partial?.reportedEmissionsTotal ?? null,
    reportedEmissionsPeriod: partial?.reportedEmissionsPeriod || "",
    reportedScopeCoverage: partial?.reportedScopeCoverage || "",
    reportedVerification: partial?.reportedVerification || "",
    reportedSource: partial?.reportedSource || "",
    evidence: { ...emptyEvidence(), ...(partial?.evidence || {}) },
  };
}

export function createPoolOfPools(partial?: Partial<SspPoolOfPools>): SspPoolOfPools {
  return {
    poolOfPoolsId: partial?.poolOfPoolsId || createSspId("pop"),
    name: partial?.name || "Pool of pools",
    poolIds: partial?.poolIds ? [...partial.poolIds] : [],
    currentOutstandingAmount: partial?.currentOutstandingAmount ?? null,
    evidence: { ...emptyEvidence(), ...(partial?.evidence || {}) },
  };
}

export function createTranche(partial?: Partial<SspTranche>): SspTranche {
  return {
    trancheId: partial?.trancheId || createSspId("tr"),
    name: partial?.name || "",
    seniorityLabel: partial?.seniorityLabel || "",
    currentOutstandingAmount: partial?.currentOutstandingAmount ?? null,
    linkedPoolIds: partial?.linkedPoolIds ? [...partial.linkedPoolIds] : [],
    isGreenTranche: partial?.isGreenTranche || "",
    evidence: { ...emptyEvidence(), ...(partial?.evidence || {}) },
  };
}

export function createHolding(partial?: Partial<SspHolding>): SspHolding {
  return {
    holdingId: partial?.holdingId || createSspId("hold"),
    name: partial?.name || "",
    trancheId: partial?.trancheId || "",
    bankOutstandingInvestment: partial?.bankOutstandingInvestment ?? null,
    currency: partial?.currency || "PKR",
    evidence: { ...emptyEvidence(), ...(partial?.evidence || {}) },
  };
}

export function createSspDraft(instanceKey: string, financingInstanceId?: string): SspDraft {
  return {
    financingInstanceId: financingInstanceId || createFinancingInstanceId(),
    instanceKey,
    dealId: null,
    holdingId: null,
    dealUpdatedAt: null,
    holdingUpdatedAt: null,
    siblingCount: 0,
    eligibility: emptyEligibility(),
    deal: emptyDeal(),
    emissionsPath: "",
    collateral: [],
    loans: [],
    pools: [],
    poolOfPools: null,
    tranches: [],
    holdings: [],
    lastPreviewNote:
      "Preview Calculate uses the backend §5.8 engine. Reportable Save and portfolio inclusion stay off.",
  };
}

/** Shared deal hierarchy fields — holding outstanding stays per investment. */
export function copySharedDeal(from: SspDraft, onto: SspDraft): SspDraft {
  return patchSspDraft(onto, {
    eligibility: { ...from.eligibility },
    deal: { ...from.deal },
    emissionsPath: from.emissionsPath,
    collateral: from.collateral.map((row) => ({
      ...row,
      classInputs: { ...row.classInputs },
      evidence: { ...row.evidence },
    })),
    loans: from.loans.map((row) => ({
      ...row,
      collateralIds: [...row.collateralIds],
      evidence: { ...row.evidence },
    })),
    pools: from.pools.map((row) => ({
      ...row,
      loanIds: [...row.loanIds],
      evidence: { ...row.evidence },
    })),
    poolOfPools: from.poolOfPools
      ? {
          ...from.poolOfPools,
          poolIds: [...from.poolOfPools.poolIds],
          evidence: { ...from.poolOfPools.evidence },
        }
      : null,
    tranches: from.tranches.map((row) => ({
      ...row,
      linkedPoolIds: [...row.linkedPoolIds],
      evidence: { ...row.evidence },
    })),
  });
}

export function sspInstanceKey(instance: number): string {
  return loanInstanceKey(SSP_LOAN_TYPE, instance);
}

export function ensureSspInstances(
  current: SspByInstance | undefined,
  quantity: number
): SspByInstance {
  const qty = Math.max(0, Number(quantity) || 0);
  const next: SspByInstance = {};
  for (let i = 1; i <= qty; i += 1) {
    const key = sspInstanceKey(i);
    next[key] = current?.[key] ? { ...current[key], instanceKey: key } : createSspDraft(key);
  }
  return next;
}

export function patchSspDraft(draft: SspDraft, patch: Partial<SspDraft>): SspDraft {
  return {
    ...draft,
    ...patch,
    instanceKey: draft.instanceKey,
    financingInstanceId: draft.financingInstanceId,
  };
}

export function patchSspEligibility(draft: SspDraft, patch: Partial<SspEligibilityAnswers>): SspDraft {
  const eligibility = { ...draft.eligibility, ...patch };
  const outcome = resolveSspAccounting(eligibility);
  const deal = { ...draft.deal };
  if (outcome?.kind === "ssp") {
    if (outcome.structureHint) deal.structureType = outcome.structureHint;
    deal.hasTranches = eligibility.hasTranches;
    deal.hasPoolOfPools = eligibility.hasPoolOfPools;
    deal.collateralRemainsWithOriginator = eligibility.collateralRemainsWithOriginator;
    deal.poolsLinkedToSpecificTranches = eligibility.poolsLinkedToSpecificTranches;
  }
  return patchSspDraft(draft, { eligibility, deal });
}

export function draftOutcome(draft: SspDraft) {
  return resolveSspAccounting(draft.eligibility);
}

export function sumLoanCoaInPool(draft: SspDraft, pool: SspPool): number | null {
  let total = 0;
  let any = false;
  for (const loanId of pool.loanIds) {
    const loan = draft.loans.find((row) => row.loanId === loanId);
    if (loan?.currentOutstandingAmount != null && Number.isFinite(loan.currentOutstandingAmount)) {
      total += loan.currentOutstandingAmount;
      any = true;
    }
  }
  return any ? total : null;
}

import { resolveSspAccounting, sspQualifiesForMethod } from "./eligibility";
import { sumLoanCoaInPool } from "./state";
import type { SspDraft } from "./types";

export type SspFieldErrors = Record<string, string>;

function missingNumber(value: number | null | undefined): boolean {
  return value == null || !Number.isFinite(value);
}

function requireText(value: string | null | undefined): boolean {
  return !String(value || "").trim();
}

export function validateSspEligibility(draft: SspDraft): SspFieldErrors {
  const errors: SspFieldErrors = {};
  const outcome = resolveSspAccounting(draft.eligibility);
  if (!outcome) {
    errors.eligibility = "Please finish the remaining screening questions.";
  }
  return errors;
}

export function validateSspDeal(draft: SspDraft): SspFieldErrors {
  const errors: SspFieldErrors = {};
  const outcome = resolveSspAccounting(draft.eligibility);
  if (!sspQualifiesForMethod(outcome)) return errors;
  if (requireText(draft.deal.dealName)) errors["deal.dealName"] = "Please name this deal.";
  if (requireText(draft.deal.reportingYear)) errors["deal.reportingYear"] = "Please enter the reporting year.";
  if (requireText(draft.deal.currency)) errors["deal.currency"] = "Please choose a currency.";
  if (requireText(draft.deal.documentationSource)) {
    errors["deal.documentationSource"] = "Please record where the deal figures came from.";
  }
  if (!draft.deal.structureType) errors["deal.structureType"] = "Please confirm the structure type.";
  if (draft.eligibility.structureFamily === "true-sale" && requireText(draft.deal.spvName)) {
    // SPV optional label — do not hard-require if unknown; only hint.
  }
  if (
    (draft.eligibility.structureFamily === "covered-bond" || draft.eligibility.structureFamily === "synthetic") &&
    draft.eligibility.collateralRemainsWithOriginator === "no"
  ) {
    errors["deal.collateralRemainsWithOriginator"] =
      "Covered bonds and synthetics usually keep collateral with the originator. Check this answer or change the structure type.";
  }
  return errors;
}

export function validateSspHierarchy(draft: SspDraft): SspFieldErrors {
  const errors: SspFieldErrors = {};
  const outcome = resolveSspAccounting(draft.eligibility);
  if (!sspQualifiesForMethod(outcome)) return errors;

  const collateralIds = new Set<string>();
  for (const row of draft.collateral) {
    if (collateralIds.has(row.collateralId)) {
      errors[`collateral.${row.collateralId}.duplicate`] = "Duplicate collateral id.";
    }
    collateralIds.add(row.collateralId);
    if (requireText(row.name)) errors[`collateral.${row.collateralId}.name`] = "Please name each collateral item.";
    if (!row.collateralType) {
      errors[`collateral.${row.collateralId}.collateralType`] = "Please choose the underlying PCAF collateral class.";
    }
    if (missingNumber(row.attributionDenominator) || (row.attributionDenominator || 0) <= 0) {
      errors[`collateral.${row.collateralId}.attributionDenominator`] =
        "Enter the asset value used for attribution (for example property or vehicle value at origination). Do not use the pool or tranche total.";
    }
  }

  const loanIds = new Set<string>();
  for (const loan of draft.loans) {
    if (loanIds.has(loan.loanId)) errors[`loans.${loan.loanId}.duplicate`] = "Duplicate loan id.";
    loanIds.add(loan.loanId);
    if (requireText(loan.name)) errors[`loans.${loan.loanId}.name`] = "Please name each loan.";
    if (!loan.collateralIds.length) {
      errors[`loans.${loan.loanId}.collateralIds`] = "Link at least one collateral record to this loan.";
    }
    for (const cid of loan.collateralIds) {
      if (!collateralIds.has(cid)) {
        errors[`loans.${loan.loanId}.collateralIds`] = "Loan references a missing collateral record.";
      }
    }
    if (missingNumber(loan.currentOutstandingAmount) || (loan.currentOutstandingAmount || 0) < 0) {
      errors[`loans.${loan.loanId}.currentOutstandingAmount`] =
        "Enter the loan’s current outstanding amount (COA). Do not use the pool or tranche balance here.";
    }
  }

  if (!draft.loans.length) errors.loans = "Add at least one underlying loan.";
  if (!draft.collateral.length) errors.collateral = "Add at least one collateral record.";
  if (!draft.pools.length) errors.pools = "Add at least one collateral pool.";

  const poolIds = new Set<string>();
  for (const pool of draft.pools) {
    if (poolIds.has(pool.poolId)) errors[`pools.${pool.poolId}.duplicate`] = "Duplicate pool id.";
    poolIds.add(pool.poolId);
    if (requireText(pool.name)) errors[`pools.${pool.poolId}.name`] = "Please name each pool.";
    if (!pool.loanIds.length) errors[`pools.${pool.poolId}.loanIds`] = "Add loans to this pool.";
    for (const lid of pool.loanIds) {
      if (!loanIds.has(lid)) errors[`pools.${pool.poolId}.loanIds`] = "Pool references a missing loan.";
    }
    // Pool COA vs sum of loan COAs is informational only (Table 5.8-3).
    // Do not block the wizard when published pool totals differ from loan sums.
    if (draft.emissionsPath === "reported_pool") {
      if (missingNumber(pool.reportedEmissionsTotal)) {
        errors[`pools.${pool.poolId}.reportedEmissionsTotal`] =
          "Enter the reported pool emissions total, or switch to look-through.";
      }
      if (requireText(pool.reportedSource)) {
        errors[`pools.${pool.poolId}.reportedSource`] = "Record the source of reported pool emissions.";
      }
      if (requireText(pool.reportedEmissionsPeriod)) {
        errors[`pools.${pool.poolId}.reportedEmissionsPeriod`] = "Enter the reporting period for pool emissions.";
      }
    }
  }

  if (draft.deal.hasPoolOfPools === "yes" || draft.eligibility.hasPoolOfPools === "yes") {
    if (!draft.poolOfPools || !draft.poolOfPools.poolIds.length) {
      errors.poolOfPools = "Add a pool-of-pools and link member pools, or set pool-of-pools to No.";
    } else {
      for (const pid of draft.poolOfPools.poolIds) {
        if (!poolIds.has(pid)) errors.poolOfPools = "Pool-of-pools references a missing pool.";
      }
    }
  }

  const needsTranches = draft.deal.hasTranches === "yes" || draft.eligibility.hasTranches === "yes";
  if (needsTranches) {
    if (!draft.tranches.length) errors.tranches = "Add at least one tranche, or mark the deal as untranched.";
    const trancheIds = new Set<string>();
    for (const tranche of draft.tranches) {
      if (trancheIds.has(tranche.trancheId)) {
        errors[`tranches.${tranche.trancheId}.duplicate`] = "Duplicate tranche id.";
      }
      trancheIds.add(tranche.trancheId);
      if (requireText(tranche.name)) errors[`tranches.${tranche.trancheId}.name`] = "Please name each tranche.";
      if (missingNumber(tranche.currentOutstandingAmount) || (tranche.currentOutstandingAmount || 0) < 0) {
        errors[`tranches.${tranche.trancheId}.currentOutstandingAmount`] =
          "Enter each tranche’s current outstanding amount (COA).";
      }
      if (draft.deal.poolsLinkedToSpecificTranches === "yes" && !tranche.linkedPoolIds.length) {
        errors[`tranches.${tranche.trancheId}.linkedPoolIds`] =
          "Link the pools that attach to this tranche, or turn off tranche-specific pool linking.";
      }
      for (const pid of tranche.linkedPoolIds) {
        if (!poolIds.has(pid)) {
          errors[`tranches.${tranche.trancheId}.linkedPoolIds`] = "Tranche references a missing pool.";
        }
      }
    }
    if (!draft.holdings.length) {
      errors.holdings = "Add your bank’s holding in at least one tranche.";
    }
    for (const holding of draft.holdings) {
      if (!holding.trancheId || !trancheIds.has(holding.trancheId)) {
        errors[`holdings.${holding.holdingId}.trancheId`] = "Link each holding to a tranche.";
      }
      if (missingNumber(holding.bankOutstandingInvestment) || (holding.bankOutstandingInvestment || 0) < 0) {
        errors[`holdings.${holding.holdingId}.bankOutstandingInvestment`] =
          "Enter the bank’s outstanding investment in this tranche.";
      }
      const tranche = draft.tranches.find((row) => row.trancheId === holding.trancheId);
      if (
        tranche &&
        holding.bankOutstandingInvestment != null &&
        tranche.currentOutstandingAmount != null &&
        holding.bankOutstandingInvestment > tranche.currentOutstandingAmount + 1e-9
      ) {
        errors[`holdings.${holding.holdingId}.bankOutstandingInvestment`] =
          "Bank investment cannot exceed the tranche’s outstanding amount. Totals are not auto-corrected.";
      }
    }
  } else {
    // Untranched: still need a holding at deal level (trancheId may be blank sentinel).
    if (!draft.holdings.length) {
      errors.holdings = "Add your bank’s outstanding investment in this untranched deal.";
    }
    for (const holding of draft.holdings) {
      if (missingNumber(holding.bankOutstandingInvestment) || (holding.bankOutstandingInvestment || 0) < 0) {
        errors[`holdings.${holding.holdingId}.bankOutstandingInvestment`] =
          "Enter the bank’s outstanding investment.";
      }
    }
  }

  if (!draft.emissionsPath) {
    errors.emissionsPath = "Choose look-through or reported pool emissions.";
  }
  if (draft.emissionsPath === "lookthrough" && draft.emissionsPath === "reported_pool") {
    // unreachable — kept for clarity that both paths must not be combined silently
  }
  if (draft.emissionsPath === "reported_pool") {
    const anyReported = draft.pools.some((pool) => pool.reportedEmissionsTotal != null);
    if (anyReported && draft.collateral.some((row) => row.emissionsPath === "asset-class-estimate")) {
      errors.emissionsPath =
        "Do not combine a reported pool total with look-through child calculations for the same pool. Choose one path.";
    }
  }

  return errors;
}

export function validateSspStep(draft: SspDraft, stepId: string): SspFieldErrors {
  if (stepId === "ssp-eligibility") return validateSspEligibility(draft);
  if (stepId === "ssp-deal") return validateSspDeal(draft);
  if (stepId === "ssp-structure" || stepId === "ssp-review") {
    return { ...validateSspDeal(draft), ...validateSspHierarchy(draft) };
  }
  return {};
}

export function sspStepIsComplete(draft: SspDraft, stepId: string): boolean {
  return Object.keys(validateSspStep(draft, stepId)).length === 0;
}

export function sspQuestionnaireComplete(draft: SspDraft): boolean {
  const outcome = resolveSspAccounting(draft.eligibility);
  if (!sspQualifiesForMethod(outcome)) return false;
  return (
    sspStepIsComplete(draft, "ssp-deal") &&
    sspStepIsComplete(draft, "ssp-structure") &&
    Boolean(draft.emissionsPath)
  );
}

/** Soft consistency notes — never fabricated and never block Save/Next alone. */
export function sspHierarchyWarnings(draft: SspDraft): string[] {
  const warnings: string[] = [];
  for (const pool of draft.pools) {
    const summed = sumLoanCoaInPool(draft, pool);
    if (
      pool.poolCurrentOutstandingAmount != null &&
      summed != null &&
      Math.abs(pool.poolCurrentOutstandingAmount - summed) > 0.000001
    ) {
      warnings.push(
        `Pool “${pool.name || pool.poolId}”: entered pool COA (${pool.poolCurrentOutstandingAmount}) differs from linked loan COA sum (${summed}). Totals are not auto-balanced.`
      );
    }
  }
  return warnings;
}

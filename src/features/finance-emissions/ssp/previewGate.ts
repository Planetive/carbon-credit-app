/**
 * Phase 6C.3 — frontend gates for preview Calculate.
 * Mirrors backend support: multi-pool, tranche-specific pools, and PoP (literal Table 5.8-3).
 * The backend remains authoritative; this only avoids calling unsupported paths.
 */

import { canCalculateSsp } from "./reportableGuard";
import { sspQuestionnaireComplete } from "./validation";
import type { SspDraft } from "./types";

export const SSP_SUPPORTED_STRUCTURE_TYPES = new Set([
  "rmbs",
  "cmbs",
  "auto-abs",
  "clo-cdo",
  "true-sale-abs",
  "untranched",
  "mortgage-covered-bond",
  "cre-covered-bond",
  "private-abs",
  "synthetic",
  "warehouse",
  "",
]);

export const SSP_BLOCKED_STRUCTURE_TYPES = new Set(["master-trust", "whole-loan"]);

export function sspPreviewCalculateBlockers(draft: SspDraft): string[] {
  const blockers: string[] = [];
  if (!canCalculateSsp()) {
    blockers.push("SSP preview Calculate is not enabled in this build.");
    return blockers;
  }
  if (!sspQuestionnaireComplete(draft)) {
    blockers.push("Finish eligibility, deal, structure, and emissions path before calculating.");
  }
  const structure = String(draft.deal.structureType || "").trim();
  if (SSP_BLOCKED_STRUCTURE_TYPES.has(structure)) {
    blockers.push(`Structure “${structure}” is deferred and cannot be calculated yet.`);
  } else if (structure && !SSP_SUPPORTED_STRUCTURE_TYPES.has(structure)) {
    blockers.push(`Structure “${structure}” is not in the supported preview set.`);
  }
  if (draft.deal.hasPoolOfPools === "yes" || draft.eligibility.hasPoolOfPools === "yes") {
    if (!draft.poolOfPools || draft.poolOfPools.poolIds.length < 1) {
      blockers.push("Create a pool-of-pools and link member pools before calculating.");
    } else if (
      draft.poolOfPools.currentOutstandingAmount == null ||
      !(draft.poolOfPools.currentOutstandingAmount > 0)
    ) {
      blockers.push("Enter a positive pool-of-pools current outstanding amount (PoP deal COA).");
    } else if (draft.poolOfPools.poolIds.length > 1) {
      const allocs = draft.poolOfPools.poolAllocations || [];
      const missing = draft.poolOfPools.poolIds.some((pid) => {
        const row = allocs.find((a) => a.poolId === pid);
        return !row || row.amountInPop == null || !(row.amountInPop >= 0);
      });
      if (missing) {
        blockers.push("Enter amount-in-PoP for each member pool when more than one pool is included.");
      }
    }
  }
  if (draft.pools.length < 1) {
    blockers.push("Add at least one collateral pool before calculating.");
  }
  if (!draft.emissionsPath) {
    blockers.push("Choose look-through or reported pool emissions.");
  }
  return blockers;
}

export function canPreviewCalculateSsp(draft: SspDraft): boolean {
  return sspPreviewCalculateBlockers(draft).length === 0;
}

/**
 * Phase 6C.2 — frontend gates for preview Calculate.
 * Mirrors backend first-release support: single-pool, no PoP, known structure types.
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
    blockers.push("Pool-of-pools structures are not supported for preview yet.");
  }
  if (draft.pools.length !== 1) {
    blockers.push("Preview calculation supports exactly one pool (single-pool first release).");
  }
  if (!draft.emissionsPath) {
    blockers.push("Choose look-through or reported pool emissions.");
  }
  return blockers;
}

export function canPreviewCalculateSsp(draft: SspDraft): boolean {
  return sspPreviewCalculateBlockers(draft).length === 0;
}

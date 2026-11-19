import { describe, expect, it } from "vitest";
import type { SspDraftConflict, SspDraftRecord } from "@/api/sspDrafts";
import {
  draftFingerprint,
  isStaleSaveResponse,
  nextSaveSeq,
  shouldConfirmSharedWrite,
  sspConflictUx,
  tokensFromConflict,
  tokensFromRecord,
  withVersionTokens,
} from "./draftPersistence";
import { createHolding, createSspDraft, copySharedDeal, patchSspDraft } from "./state";
import { canSaveReportableSsp, SSP_REPORTABLE_BLOCKED_MESSAGE } from "./reportableGuard";

function minimalRecord(
  dealAt = "2026-01-01T00:00:00.000Z",
  holdingAt = "2026-01-01T00:00:00.000Z"
): SspDraftRecord {
  return {
    deal: { id: "deal-1", updated_at: dealAt },
    holding: {
      id: "hold-1",
      financing_instance_id: "fi-1",
      instance_key: "ssp-1",
      updated_at: holdingAt,
      deal_id: "deal-1",
    },
    collateral: [],
    loans: [],
    pools: [],
    tranches: [],
    calculations: [],
    draft: {},
    created: false,
    sibling_count: 0,
  };
}

describe("SSP draft conflict UX copy", () => {
  it("uses a clear title for every conflict code", () => {
    for (const code of ["shared_deal_conflict", "stale_deal", "stale_holding", "other"] as const) {
      const ux = sspConflictUx({ code, message: "raw technical" });
      expect(ux.title).toBe("A newer version of this calculation is available.");
      expect(ux.showLoadLatest).toBe(true);
      expect(ux.showReviewMine).toBe(true);
    }
  });

  it("offers overwrite only for shared/stale deal conflicts", () => {
    expect(sspConflictUx({ code: "shared_deal_conflict", message: "" }).showOverwriteShared).toBe(true);
    expect(sspConflictUx({ code: "stale_deal", message: "" }).showOverwriteShared).toBe(true);
    expect(sspConflictUx({ code: "stale_holding", message: "" }).showOverwriteShared).toBe(false);
  });

  it("does not surface Shared deal needs a decision", () => {
    const ux = sspConflictUx({
      code: "stale_holding",
      message: "This holding was saved more recently. Refresh before overwriting your outstanding investment or tranche link.",
    });
    expect(ux.title).not.toMatch(/Shared deal needs a decision/i);
    expect(ux.explanation).not.toMatch(/Phase 6D|feature flag|§5\.8 engine/i);
  });
});

describe("SSP version token adoption (overlapping save race)", () => {
  it("detects stale in-flight responses by sequence", () => {
    expect(isStaleSaveResponse(1, 2)).toBe(true);
    expect(isStaleSaveResponse(2, 2)).toBe(false);
    expect(nextSaveSeq(2)).toBe(3);
  });

  it("adopts server tokens without changing questionnaire fingerprint", () => {
    const draft = createSspDraft("ssp-1", "fi-1");
    draft.deal.dealName = "Alpha";
    draft.dealId = "deal-1";
    draft.holdingId = "hold-1";
    draft.dealUpdatedAt = "2026-01-01T00:00:00.000Z";
    draft.holdingUpdatedAt = "2026-01-01T00:00:00.000Z";
    const before = draftFingerprint(draft);

    const record = minimalRecord("2026-01-01T00:00:05.000Z", "2026-01-01T00:00:05.000Z");
    const tokens = tokensFromRecord(record);
    const patched = withVersionTokens(draft, tokens);

    expect(patched.dealUpdatedAt).toBe("2026-01-01T00:00:05.000Z");
    expect(patched.holdingUpdatedAt).toBe("2026-01-01T00:00:05.000Z");
    expect(draftFingerprint(patched)).toBe(before);
  });

  it("reads holding tokens from stale_holding conflict payloads", () => {
    const conflict: SspDraftConflict = {
      code: "stale_holding",
      message: "newer",
      holding_id: "hold-1",
      holding_updated_at: "2026-01-01T00:01:00.000Z",
    };
    expect(tokensFromConflict(conflict)).toEqual({
      dealUpdatedAt: null,
      holdingUpdatedAt: "2026-01-01T00:01:00.000Z",
      dealId: null,
      holdingId: "hold-1",
      siblingCount: undefined,
    });
  });

  it("simulates discarded older save then newer save with refreshed tokens", () => {
    // Seq 1 completes on server (T1) but client discards content apply.
    // Seq 2 must send T1, not T0 — otherwise 409 stale_holding.
    let serverHoldingAt = "2026-01-01T00:00:00.000Z";
    let clientTokens = {
      dealUpdatedAt: serverHoldingAt,
      holdingUpdatedAt: serverHoldingAt,
      dealId: "deal-1",
      holdingId: "hold-1",
    };

    const seq1 = 1;
    const seq2 = 2;
    let latestSeq = seq2;

    // Older response arrives after newer seq was issued.
    const olderResponseAt = "2026-01-01T00:00:05.000Z";
    serverHoldingAt = olderResponseAt;
    if (isStaleSaveResponse(seq1, latestSeq)) {
      clientTokens = {
        ...clientTokens,
        dealUpdatedAt: olderResponseAt,
        holdingUpdatedAt: olderResponseAt,
      };
    }

    expect(clientTokens.holdingUpdatedAt).toBe(olderResponseAt);
    expect(clientTokens.holdingUpdatedAt).toBe(serverHoldingAt);
  });
});

describe("SSP shared-deal confirm gate", () => {
  it("requires confirm only when siblings exist and shared fields changed", () => {
    const base = createSspDraft("ssp-1", "fi-1");
    base.siblingCount = 1;
    base.deal.dealName = "Deal A";
    const saved = structuredClone(base);
    const local = patchSspDraft(base, { deal: { ...base.deal, dealName: "Deal B" } });
    expect(shouldConfirmSharedWrite(local, saved)).toBe(true);

    const solo = patchSspDraft(local, { siblingCount: 0 });
    expect(shouldConfirmSharedWrite(solo, saved)).toBe(false);

    const holdingOnly = copySharedDeal(
      saved,
      patchSspDraft(local, {
        siblingCount: 1,
        holdings: [createHolding({ bankOutstandingInvestment: 100 })],
      })
    );
    expect(shouldConfirmSharedWrite(holdingOnly, saved)).toBe(false);
  });
});

describe("SSP preview-only user copy", () => {
  it("keeps reportable Save off by default with portfolio-safe wording", () => {
    expect(canSaveReportableSsp()).toBe(false);
    expect(SSP_REPORTABLE_BLOCKED_MESSAGE).toBe(
      "Calculation preview only. Results have not been added to your portfolio."
    );
    expect(SSP_REPORTABLE_BLOCKED_MESSAGE).not.toMatch(/Phase 6D|feature flag|§5\.8 engine/i);
  });
});

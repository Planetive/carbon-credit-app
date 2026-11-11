import { describe, expect, it } from "vitest";
import {
  SSP_CALCULATE_AVAILABLE,
  SSP_DRAFT_API_AVAILABLE,
  SSP_REPORTABLE_SAVE_AVAILABLE,
  canCalculateSsp,
  canSaveReportableSsp,
  createCollateral,
  createHolding,
  createLoan,
  createPool,
  createSspDraft,
  createTranche,
  hydrateSspDraftFromRecord,
  patchSspDraft,
  patchSspEligibility,
  rejectSspReportableResults,
  snapshotToSspDraft,
  sspInstanceKey,
  toSspDraftUpsertBody,
  SSP_LOAN_TYPE,
} from "./index";
import { questionnairePayload } from "./draftPersistence";
import type { SspDraftRecord } from "@/api/sspDrafts";
import type { SspEligibilityAnswers } from "./types";

function qualifyingAnswers(): SspEligibilityAnswers {
  return {
    isStructuredProduct: "yes",
    underlyingIdentifiable: "yes",
    structureFamily: "true-sale",
    collateralFamily: "residential-real-estate",
    hasAssetLevelEmissionsForOtherHard: "",
    isGssCollateralBond: "no",
    isGssStandardBondForOriginatorProjects: "no",
    collateralRemainsWithOriginator: "no",
    hasTranches: "yes",
    hasPoolOfPools: "no",
    poolsLinkedToSpecificTranches: "no",
  };
}

describe("Phase 6B.1 — safety gates", () => {
  it("keeps Calculate and reportable Save disabled while drafts API is available", () => {
    expect(SSP_DRAFT_API_AVAILABLE).toBe(true);
    expect(SSP_CALCULATE_AVAILABLE).toBe(false);
    expect(SSP_REPORTABLE_SAVE_AVAILABLE).toBe(false);
    expect(canCalculateSsp()).toBe(false);
    expect(canSaveReportableSsp()).toBe(false);
    expect(() => rejectSspReportableResults([{ type: SSP_LOAN_TYPE }])).toThrow();
  });
});

describe("Phase 6B.1 — draft snapshot survives serialize/hydrate (refresh proxy)", () => {
  it("preserves hierarchy, eligibility and classInputs through upsert payload round-trip", () => {
    let draft = createSspDraft(sspInstanceKey(1));
    draft = patchSspEligibility(draft, qualifyingAnswers());
    const c1 = createCollateral({
      name: "House A",
      collateralType: "mortgage",
      attributionDenominator: 100,
      classInputs: { floorArea: 120, propertyValueAtOrigination: 100 },
    });
    const c2 = createCollateral({
      name: "House B",
      collateralType: "mortgage",
      attributionDenominator: 200,
      classInputs: { floorArea: 90, propertyValueAtOrigination: 200 },
    });
    const loan1 = createLoan({ name: "L1", collateralIds: [c1.collateralId], currentOutstandingAmount: 50 });
    const loan2 = createLoan({ name: "L2", collateralIds: [c2.collateralId], currentOutstandingAmount: 75 });
    const pool = createPool({ name: "Pool", loanIds: [loan1.loanId, loan2.loanId], poolCurrentOutstandingAmount: 125 });
    const tranche = createTranche({ name: "Senior", currentOutstandingAmount: 100 });
    const holding = createHolding({
      name: "Note",
      trancheId: tranche.trancheId,
      bankOutstandingInvestment: 40,
    });
    draft = patchSspDraft(draft, {
      deal: {
        ...draft.deal,
        dealName: "RMBS Roundtrip",
        documentationSource: "Trustee",
        structureType: "rmbs",
        reportingYear: "2024",
      },
      emissionsPath: "lookthrough",
      collateral: [c1, c2],
      loans: [loan1, loan2],
      pools: [pool],
      tranches: [tranche],
      holdings: [holding],
    });

    const body = toSspDraftUpsertBody(draft, { counterpartyId: "cp-1", updateShared: true });
    expect(body.financing_instance_id).toBe(draft.financingInstanceId);
    expect(body.draft).toMatchObject(questionnairePayload(draft));

    const restored = snapshotToSspDraft(draft.instanceKey, body.draft, draft.financingInstanceId);
    expect(restored.eligibility.isStructuredProduct).toBe("yes");
    expect(restored.deal.dealName).toBe("RMBS Roundtrip");
    expect(restored.collateral).toHaveLength(2);
    expect(restored.collateral[0].collateralId).toBe(c1.collateralId);
    expect(restored.collateral[0].classInputs.floorArea).toBe(120);
    expect(restored.loans[0].collateralIds).toEqual([c1.collateralId]);
    expect(restored.pools[0].loanIds.sort()).toEqual([loan1.loanId, loan2.loanId].sort());
    expect(restored.tranches[0].trancheId).toBe(tranche.trancheId);
    expect(restored.holdings[0].bankOutstandingInvestment).toBe(40);
    expect(restored.emissionsPath).toBe("lookthrough");

    const record = {
      created: false,
      sibling_count: 1,
      shared_write_applied: true,
      holding_count: 2,
      draft: body.draft,
      holding: {
        id: "hold-db",
        organization_id: "org",
        user_id: "user",
        deal_id: "deal-db",
        financing_instance_id: draft.financingInstanceId,
        instance_key: draft.instanceKey,
        holding_name: "Note",
        currency: "PKR",
        status: "draft",
        is_reportable: false,
        include_in_portfolio: false,
        draft_snapshot: body.draft,
        updated_at: "2026-01-01T00:00:00Z",
      },
      deal: {
        id: "deal-db",
        organization_id: "org",
        user_id: "user",
        deal_name: "RMBS Roundtrip",
        deal_identifier: "",
        issuer_name: "",
        originator_name: "",
        spv_name: "",
        structure_type: "rmbs",
        reporting_year: "2024",
        methodology_version: "PCAF-2025-PartA-5.8",
        currency: "PKR",
        documentation_source: "Trustee",
        eligibility: qualifyingAnswers(),
        shared_snapshot: {},
        status: "draft",
        updated_at: "2026-01-01T00:00:00Z",
      },
      collateral: [],
      loans: [],
      pools: [],
      tranches: [],
      calculations: [],
    } as unknown as SspDraftRecord;

    const hydrated = hydrateSspDraftFromRecord(draft, record);
    expect(hydrated.dealId).toBe("deal-db");
    expect(hydrated.holdingId).toBe("hold-db");
    expect(hydrated.siblingCount).toBe(1);
    expect(hydrated.deal.dealName).toBe("RMBS Roundtrip");
    expect(hydrated.collateral.map((row) => row.collateralId).sort()).toEqual(
      [c1.collateralId, c2.collateralId].sort()
    );
  });
});

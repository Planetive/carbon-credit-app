import { describe, expect, it } from "vitest";
import { ApiError } from "@/api/client";
import type { UopDraftRecord } from "@/api/uopDrafts";
import {
  draftFingerprint,
  hydrateUopDraftFromRecord,
  isStaleSaveResponse,
  mergeResumedDrafts,
  nextSaveSeq,
  parseUopConflict,
  questionnairePayload,
  sharedStructureChanged,
  shouldConfirmSharedWrite,
  snapshotToUopDraft,
  toUopDraftUpsertBody,
} from "./draftPersistence";
import {
  UOP_BACKEND_AVAILABLE,
  UOP_CALCULATE_AVAILABLE,
  UOP_DRAFT_API_AVAILABLE,
  UOP_REPORTABLE_SAVE_AVAILABLE,
  canCalculateOrSaveUop,
  canCalculateUop,
  canSaveReportableUop,
  rejectUopReportableResults,
} from "./reportableGuard";
import { copySharedStructure, createUopDraft, createUnderlyingAsset, uopInstanceKey } from "./state";
import { UOP_LOAN_TYPE } from "../config/loanTypeOptions";

function recordFor(draftId: string, instanceKey: string): UopDraftRecord {
  return {
    created: true,
    sibling_count: 1,
    holding_count: 2,
    shared_write_applied: false,
    investment: {
      id: "inv-1",
      organization_id: "org",
      user_id: "user",
      structure_id: "struct-1",
      financing_instance_id: draftId,
      instance_key: instanceKey,
      investment_type: "debt",
      outstanding_amount: "500000",
      status: "draft",
      is_reportable: false,
      include_in_portfolio: false,
      draft_snapshot: {},
      updated_at: "2026-01-02T00:00:00Z",
    },
    structure: {
      id: "struct-1",
      organization_id: "org",
      name: "Green Bond 2026",
      issuer_name: "City Issuer",
      structure_kind: "labeled-bond",
      classification: "separate",
      reporting_year: "2026",
      methodology_version: "PCAF-2025-PartA-5.7",
      currency: "PKR",
      status: "draft",
      updated_at: "2026-01-01T00:00:00Z",
    },
    assets: [
      {
        id: "row-1",
        structure_id: "struct-1",
        underlying_asset_id: "asset-mortgage-a",
        name: "Pool A",
        asset_class: "mortgage",
        sort_order: 0,
      },
      {
        id: "row-2",
        structure_id: "struct-1",
        underlying_asset_id: "asset-mortgage-b",
        name: "Pool B",
        asset_class: "mortgage",
        sort_order: 1,
      },
    ],
    calculations: [
      {
        id: "calc-1",
        asset_id: "row-1",
        investment_id: "inv-1",
        reporting_year: "2026",
        methodology_version: "PCAF-2025-PartA-5.7",
        status: "draft",
        is_reportable: false,
        include_in_portfolio: false,
      },
    ],
    draft: {
      financingInstanceId: draftId,
      instanceKey,
      structureName: "Green Bond 2026",
      issuerName: "City Issuer",
      structureKind: "labeled-bond",
      investmentType: "debt",
      outstandingInvestment: 500000,
      eligibility: { proceedsAllocatedToSpecificAssets: "yes" },
      assets: [
        {
          underlyingAssetId: "asset-mortgage-a",
          name: "Pool A",
          assetClass: "mortgage",
        },
        {
          underlyingAssetId: "asset-mortgage-b",
          name: "Pool B",
          assetClass: "mortgage",
        },
      ],
    },
  };
}

describe("Phase 5B.2 UoP draft persistence", () => {
  it("creates an upsert body for first-time draft saving without reportable flags", () => {
    const draft = createUopDraft(uopInstanceKey(1), "fin-uop-1");
    draft.structureName = "Green Bond 2026";
    draft.outstandingInvestment = 1000000;
    const body = toUopDraftUpsertBody(draft, { counterpartyId: "cp-1" });
    expect(body.financing_instance_id).toBe("fin-uop-1");
    expect(body.instance_key).toBe("use-of-proceeds#1");
    expect(body.update_shared).toBe(false);
    expect(body.draft.outstandingInvestment).toBe(1000000);
    expect(body.draft).not.toHaveProperty("is_reportable");
    expect(body.draft).not.toHaveProperty("include_in_portfolio");
    expect(questionnairePayload(draft).financingInstanceId).toBe("fin-uop-1");
  });

  it("hydrates a saved draft after reload and keeps financing_instance_id plus same-class assets", () => {
    const local = createUopDraft(uopInstanceKey(1), "local-new-id");
    const hydrated = hydrateUopDraftFromRecord(local, recordFor("fin-uop-1", uopInstanceKey(1)));
    expect(hydrated.financingInstanceId).toBe("fin-uop-1");
    expect(hydrated.structureId).toBe("struct-1");
    expect(hydrated.investmentId).toBe("inv-1");
    expect(hydrated.structureName).toBe("Green Bond 2026");
    expect(hydrated.outstandingInvestment).toBe(500000);
    expect(hydrated.assets.map((asset) => asset.underlyingAssetId)).toEqual([
      "asset-mortgage-a",
      "asset-mortgage-b",
    ]);
    expect(hydrated.assets.map((asset) => asset.assetClass)).toEqual(["mortgage", "mortgage"]);
    expect(hydrated.siblingCount).toBe(1);
  });

  it("resumes listed drafts onto matching instance keys without inventing a new holding", () => {
    const local = {
      [uopInstanceKey(1)]: createUopDraft(uopInstanceKey(1), "temp-1"),
      [uopInstanceKey(2)]: createUopDraft(uopInstanceKey(2), "temp-2"),
    };
    const merged = mergeResumedDrafts(local, [recordFor("fin-uop-1", uopInstanceKey(1))]);
    expect(merged[uopInstanceKey(1)].financingInstanceId).toBe("fin-uop-1");
    expect(merged[uopInstanceKey(2)].financingInstanceId).toBe("temp-2");
  });

  it("copies shared fund data onto a second holding without merging outstanding amounts", () => {
    const fund = createUopDraft(uopInstanceKey(1), "fin-a");
    fund.structureId = "struct-1";
    fund.structureName = "Shared fund";
    fund.outstandingInvestment = 1000000;
    fund.investmentType = "debt";
    fund.assets = [
      createUnderlyingAsset({ underlyingAssetId: "asset-1", name: "A", assetClass: "mortgage" }),
      createUnderlyingAsset({ underlyingAssetId: "asset-2", name: "B", assetClass: "mortgage" }),
    ];
    const holding = createUopDraft(uopInstanceKey(2), "fin-b");
    holding.outstandingInvestment = 250000;
    holding.investmentType = "equity";
    const linked = copySharedStructure(fund, holding);
    expect(linked.financingInstanceId).toBe("fin-b");
    expect(linked.outstandingInvestment).toBe(250000);
    expect(linked.investmentType).toBe("equity");
    expect(linked.structureName).toBe("Shared fund");
    expect(linked.structureId).toBe("struct-1");
    expect(linked.assets.map((asset) => asset.underlyingAssetId)).toEqual(["asset-1", "asset-2"]);
  });

  it("detects shared fund edits that need an explicit apply", () => {
    const saved = snapshotToUopDraft(uopInstanceKey(1), {
      structureName: "Green Bond 2026",
      outstandingInvestment: 1000000,
      siblingCount: 1,
    });
    saved.siblingCount = 1;
    const local = { ...saved, structureName: "Renamed", outstandingInvestment: 750000 };
    expect(sharedStructureChanged(local, saved)).toBe(true);
    expect(shouldConfirmSharedWrite(local, saved)).toBe(true);
    expect(shouldConfirmSharedWrite({ ...saved, outstandingInvestment: 750000 }, saved)).toBe(false);
  });

  it("parses a shared-structure conflict instead of treating it as a successful save", () => {
    const error = new ApiError("conflict", 409, {
      detail: {
        code: "shared_structure_conflict",
        message: "This save would change shared fund or asset data used by other holdings.",
        changed_fields: ["name"],
        structure_id: "struct-1",
      },
    });
    const parsed = parseUopConflict(error);
    expect(parsed?.code).toBe("shared_structure_conflict");
    expect(parsed?.changed_fields).toEqual(["name"]);
    expect(parseUopConflict(new ApiError("down", 0))).toBeNull();
  });

  it("ignores stale save responses", () => {
    expect(nextSaveSeq(3)).toBe(4);
    expect(isStaleSaveResponse(3, 4)).toBe(true);
    expect(isStaleSaveResponse(4, 4)).toBe(false);
  });

  it("stable fingerprints do not treat equivalent numbers as unsaved edits", () => {
    const a = createUopDraft(uopInstanceKey(1), "fin-1");
    a.outstandingInvestment = 1000000;
    const b = { ...a, outstandingInvestment: 1000000.0 };
    expect(draftFingerprint(a)).toBe(draftFingerprint(b));
  });

  it("keeps reportable Save disabled after Calculate is enabled", () => {
    expect(UOP_CALCULATE_AVAILABLE).toBe(true);
    expect(canCalculateUop()).toBe(true);
    expect(UOP_REPORTABLE_SAVE_AVAILABLE).toBe(false);
    expect(canSaveReportableUop()).toBe(false);
    expect(UOP_BACKEND_AVAILABLE).toBe(false);
    expect(UOP_DRAFT_API_AVAILABLE).toBe(true);
    expect(canCalculateOrSaveUop()).toBe(false);
    expect(() => rejectUopReportableResults([{ type: UOP_LOAN_TYPE }])).toThrow();
  });
});

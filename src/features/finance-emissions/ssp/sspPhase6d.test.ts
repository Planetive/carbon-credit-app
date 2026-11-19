import { describe, expect, it } from "vitest";
import {
  SSP_REPORTABLE_SAVE_AVAILABLE,
  canSaveReportableSsp,
  canSubmitReportableSspSave,
  sspReportableSaveBlockers,
} from "./reportableGuard";

describe("Phase 6D SSP reportable Save guards", () => {
  it("keeps the SPA release flag off by default", () => {
    expect(SSP_REPORTABLE_SAVE_AVAILABLE).toBe(false);
    expect(canSaveReportableSsp()).toBe(false);
    expect(canSubmitReportableSspSave(null, null)).toBe(false);
  });

  it("lists feature_flag and missing_calculation without a result", () => {
    const blockers = sspReportableSaveBlockers(null, null);
    expect(blockers).toContain("feature_flag");
    expect(blockers).toContain("missing_draft");
  });

  it("blocks pool-of-pools even when a complete fingerprint is present", () => {
    const blockers = sspReportableSaveBlockers(
      {
        deal: { hasPoolOfPools: "yes", structureType: "rmbs" },
        poolOfPools: { poolOfPoolsId: "pop1" },
      } as never,
      {
        status: "complete",
        formula_id: "ssp-lookthrough",
        financed_emissions: 1,
        iaf: 0.25,
        calculation_fingerprint: "abc",
        pool_of_pools: { financed_emissions_tco2e: 1 },
      },
    );
    expect(blockers).toContain("feature_flag");
    expect(blockers).toContain("pool_of_pools");
  });
});

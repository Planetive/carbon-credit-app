import { describe, expect, it } from "vitest";
import { createUopDraft, createUnderlyingAsset } from "./state";
import { optionsForAssetClass, optionDef, isUnsupportedUopAssetClass } from "./underlyingOptions";
import { bindApprovedFactorForTest } from "./factorLibrary";
import { validateUopAssets } from "./validation";
import { UOP_REPORTABLE_SAVE_AVAILABLE } from "./reportableGuard";
import type { UopDraft } from "./types";

function draftWithAsset(asset: ReturnType<typeof createUnderlyingAsset>): UopDraft {
  const draft = createUopDraft("use-of-proceeds#1", "fin-uop-5c2");
  draft.eligibility = {
    proceedsAllocatedToSpecificAssets: "yes",
    isSecuritized: "no",
    structureHasControl: "no",
    structureListing: "",
    controlOneFullyAllocatedAsset: "",
    controlAssetIsProject: "",
    debtBasedWithOneFullyAllocatedAsset: "no",
    singleAssetClass: "",
    assetsOnIssuerBalanceSheet: "no",
  };
  draft.structureName = "Fund";
  draft.issuerName = "Issuer";
  draft.structureKind = "debt-fund";
  draft.investmentType = "debt";
  draft.outstandingInvestment = 10;
  draft.totalStructureDebt = 20;
  draft.totalStructureEquity = 0;
  draft.reportingYear = "2026";
  draft.currency = "PKR";
  draft.evidenceSource = "prospectus";
  draft.emissionsPath = "underlying_assets";
  draft.allocationStatus = "known";
  draft.allocatedProceeds = 10;
  draft.assets = [asset];
  return draft;
}

describe("Phase 5C.2 underlying PCAF option coverage", () => {
  it("maps each eligible class to the validated options and scores", () => {
    expect(optionsForAssetClass("listed-equity").map((item) => [item.id, item.score])).toEqual([
      ["2a", 2],
      ["2b", 3],
      ["3a", 4],
      ["3c", 5],
      ["score5", 5],
    ]);
    expect(optionsForAssetClass("mortgage").map((item) => [item.id, item.score])).toEqual([
      ["1a", 1],
      ["1b", 2],
      ["2a", 3],
      ["2b", 4],
      ["3", 5],
    ]);
    expect(optionsForAssetClass("motor-vehicle-loan").map((item) => item.id)).toEqual([
      "1a",
      "1b",
      "2a",
      "2b",
      "3a",
      "3b",
    ]);
    expect(optionDef("mortgage", "score5")).toBeUndefined();
    expect(optionDef("business-loan", "3")).toBeUndefined();
    expect(isUnsupportedUopAssetClass("sovereign-debt")).toBe(false);
    expect(isUnsupportedUopAssetClass("use-of-proceeds")).toBe(false);
    expect(isUnsupportedUopAssetClass("sub-sovereign-debt" as never)).toBe(false);
    expect(optionsForAssetClass("sovereign-debt").map((item) => item.id)).toEqual([
      "1a",
      "1b",
      "2a",
      "3a",
      "3b",
    ]);
  });

  it("requires option-specific inputs and a sourced factor, not a typed score", () => {
    const asset = createUnderlyingAsset({
      underlyingAssetId: "asset-3a",
      name: "Listed company",
      assetClass: "listed-equity",
      allocatedOutstanding: 1_000_000,
      totalAssetValue: 3_000_000,
      hasReportedEmissions: "no",
      dataSource: "financials",
    });
    const draft = draftWithAsset(asset);
    expect(validateUopAssets(draft)["assets.asset-3a.estimation.pcafOption"]).toBeTruthy();
    asset.estimation.pcafOption = "3a";
    asset.estimation.method = "economic";
    expect(validateUopAssets(draft)["assets.asset-3a.estimation.companyRevenue"]).toBeTruthy();
    asset.estimation.companyRevenue = 8_000_000;
    asset.estimation.emissionFactor = 0.5;
    asset.estimation.factorSource = "sector table";
    asset.estimation.factorGeography = "PK";
    asset.estimation.factorYear = "2024";
    asset.estimation.factorUnit = "kgCO2e/PKR";
    expect(validateUopAssets(draft)["assets.asset-3a.estimation.libraryEntryId"]).toBeTruthy();
    asset.estimation = bindApprovedFactorForTest(asset.estimation);
    expect(validateUopAssets(draft)).toEqual({});
  });

  it("keeps two same-class assets independent, including different options", () => {
    const first = createUnderlyingAsset({
      underlyingAssetId: "home-1",
      name: "Home 1",
      assetClass: "mortgage",
      allocatedOutstanding: 5,
      totalAssetValue: 10,
      hasReportedEmissions: "no",
      dataSource: "EPC",
      estimation: {
        ...createUnderlyingAsset().estimation,
        pcafOption: "2a",
        method: "physical",
        labelEnergyIntensity: 20,
        floorArea: 100,
        emissionFactor: 0.001,
        factorSource: "grid",
        factorGeography: "PK",
        factorYear: "2024",
        factorUnit: "tCO2e/kWh",
        libraryEntryId: "11111111-1111-1111-1111-111111111111",
        factorConfirmed: true,
      },
    });
    const second = createUnderlyingAsset({
      underlyingAssetId: "home-2",
      name: "Home 2",
      assetClass: "mortgage",
      allocatedOutstanding: 2,
      totalAssetValue: 8,
      hasReportedEmissions: "no",
      dataSource: "stats",
      estimation: {
        ...createUnderlyingAsset().estimation,
        pcafOption: "3",
        method: "physical",
        statsEnergyIntensity: 1000,
        numberOfBuildings: 2,
        emissionFactor: 0.001,
        factorSource: "stats table",
        factorGeography: "PK",
        factorYear: "2024",
        factorUnit: "tCO2e/kWh",
        libraryEntryId: "22222222-2222-2222-2222-222222222222",
        factorConfirmed: true,
      },
    });
    const draft = draftWithAsset(first);
    draft.assets = [first, second];
    expect(validateUopAssets(draft)).toEqual({});
    expect(draft.assets[0].estimation.pcafOption).toBe("2a");
    expect(draft.assets[1].estimation.pcafOption).toBe("3");
    expect(draft.assets[0].allocatedOutstanding).toBe(5);
    expect(draft.assets[1].allocatedOutstanding).toBe(2);
  });

  it("does not enable reportable Save", () => {
    expect(UOP_REPORTABLE_SAVE_AVAILABLE).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  createNestedChildAsset,
  createUopDraft,
  createUnderlyingAsset,
  createVehicleRow,
} from "./state";
import { isUnsupportedUopAssetClass, optionsForAssetClass } from "./underlyingOptions";
import { validateUopAssets } from "./validation";
import { snapshotToUopDraft, questionnairePayload } from "./draftPersistence";
import { UOP_LOAN_TYPE } from "../config/loanTypeOptions";
import { canSaveReportableUop } from "./reportableGuard";

function baseDraft() {
  const draft = createUopDraft("uop-1");
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
  draft.outstandingInvestment = 50;
  draft.totalStructureDebt = 100;
  draft.totalStructureEquity = 0;
  draft.reportingYear = "2026";
  draft.currency = "PKR";
  draft.evidenceSource = "prospectus";
  draft.emissionsPath = "underlying_assets";
  draft.allocationStatus = "known";
  draft.allocatedProceeds = 50;
  return draft;
}

describe("UoP Phase 5E frontend", () => {
  it("exposes sovereign, nested, and sub-sovereign options", () => {
    expect(isUnsupportedUopAssetClass("sovereign-debt")).toBe(false);
    expect(isUnsupportedUopAssetClass(UOP_LOAN_TYPE)).toBe(false);
    expect(isUnsupportedUopAssetClass("sub-sovereign-debt")).toBe(false);
    expect(optionsForAssetClass("sovereign-debt").map((o) => o.id)).toEqual([
      "1a",
      "1b",
      "2a",
      "3a",
      "3b",
    ]);
  });

  it("requires country + PPP GDP for sovereign inventory options", () => {
    const draft = baseDraft();
    draft.assets = [
      createUnderlyingAsset({
        underlyingAssetId: "sov-1",
        name: "Gilt sleeve",
        assetClass: "sovereign-debt",
        allocatedOutstanding: 10,
        hasReportedEmissions: "no",
        dataSource: "UNFCCC",
        estimation: {
          ...createUnderlyingAsset().estimation,
          pcafOption: "1a",
          method: "physical",
        },
      }),
    ];
    const errors = validateUopAssets(draft);
    expect(errors["assets.sov-1.estimation.sovereignCountryName"]).toBeTruthy();
    expect(errors["assets.sov-1.estimation.ppAdjustedGdp"]).toBeTruthy();
    draft.assets[0].estimation.sovereignCountryName = "United Kingdom";
    draft.assets[0].estimation.ppAdjustedGdp = 1000;
    draft.assets[0].estimation.pppGdpYear = "2025";
    draft.assets[0].estimation.pppGdpSource = "ref.ppp_adjusted_gdp";
    draft.assets[0].estimation.verifiedCountryEmissions = 200;
    draft.assets[0].estimation.emissionFactor = 200;
    draft.assets[0].estimation.factorSource = "UNFCCC";
    draft.assets[0].estimation.factorUnit = "tCO2e";
    expect(validateUopAssets(draft)).toEqual({});
  });

  it("requires nested child assets and capital, not a collapsed total", () => {
    const draft = baseDraft();
    draft.assets = [
      createUnderlyingAsset({
        underlyingAssetId: "nest-1",
        name: "Child fund sleeve",
        assetClass: UOP_LOAN_TYPE,
        allocatedOutstanding: 20,
        hasReportedEmissions: "no",
        dataSource: "child LP report",
      }),
    ];
    expect(validateUopAssets(draft)["assets.nest-1.estimation.childAssets"]).toBeTruthy();
    draft.assets[0].estimation.childTotalCapital = 100;
    draft.assets[0].estimation.childAssets = [
      createNestedChildAsset({
        name: "Solar SPV",
        assetClass: "project-finance",
        allocatedOutstanding: 40,
        hasReportedEmissions: "yes",
        scope1Emissions: 10,
        verificationStatus: "verified",
        dataSource: "SPV inventory",
      }),
    ];
    expect(validateUopAssets(draft)).toEqual({});
  });

  it("rejects gallon fuel units on multi-vehicle rows", () => {
    const draft = baseDraft();
    draft.assets = [
      createUnderlyingAsset({
        underlyingAssetId: "mv-1",
        name: "Fleet sleeve",
        assetClass: "motor-vehicle-loan",
        allocatedOutstanding: 5,
        totalAssetValue: 10,
        hasReportedEmissions: "no",
        dataSource: "fleet log",
        estimation: {
          ...createUnderlyingAsset().estimation,
          pcafOption: "2a",
          method: "physical",
          emissionFactor: 0.002,
          factorSource: "DESNZ",
          factorGeography: "UK",
          factorYear: "2024",
          factorUnit: "kgCO2e/litre",
          libraryEntryId: "11111111-1111-1111-1111-111111111111",
          factorConfirmed: true,
          vehicles: [
            createVehicleRow({
              name: "Van 1",
              fuelConsumption: 100,
              distanceTraveled: 1000,
              efficiency: 0.1,
              fuelUnit: "gallon",
            }),
          ],
        },
      }),
    ];
    const errors = validateUopAssets(draft);
    expect(Object.values(errors).some((msg) => /gallon/i.test(msg))).toBe(true);
  });

  it("rejects electricity units for economic estimation", () => {
    const draft = baseDraft();
    draft.assets = [
      createUnderlyingAsset({
        underlyingAssetId: "econ-1",
        name: "Corp sleeve",
        assetClass: "listed-equity",
        allocatedOutstanding: 1,
        totalAssetValue: 3,
        hasReportedEmissions: "no",
        dataSource: "filings",
        estimation: {
          ...createUnderlyingAsset().estimation,
          pcafOption: "3a",
          method: "economic",
          companyRevenue: 10,
          activityCurrency: "PKR",
          priceYear: "2024",
          emissionFactor: 0.5,
          factorSource: "EEIO",
          factorGeography: "PK",
          factorYear: "2024",
          factorUnit: "kgCO2e/kWh",
          libraryEntryId: "11111111-1111-1111-1111-111111111111",
          factorConfirmed: true,
        },
      }),
    ];
    expect(validateUopAssets(draft)["assets.econ-1.estimation.factorUnit"]).toMatch(/sector intensity/i);
  });

  it("round-trips Phase 5E estimation fields through draft snapshots", () => {
    const draft = baseDraft();
    draft.assets = [
      createUnderlyingAsset({
        underlyingAssetId: "sov-2",
        name: "Sovereign",
        assetClass: "sovereign-debt",
        allocatedOutstanding: 1,
        hasReportedEmissions: "no",
        dataSource: "UNFCCC",
        estimation: {
          ...createUnderlyingAsset().estimation,
          pcafOption: "1a",
          method: "physical",
          sovereignCountryName: "Pakistan",
          ppAdjustedGdp: 1200,
          pppGdpYear: "2025",
          pppGdpSource: "ref.ppp_adjusted_gdp",
          verifiedCountryEmissions: 50,
          emissionFactor: 50,
          factorSource: "UNFCCC",
          factorUnit: "tCO2e",
          vehicles: [createVehicleRow({ name: "ignored-for-sov" })],
          childAssets: [],
        },
      }),
    ];
    const snap = questionnairePayload(draft);
    const restored = snapshotToUopDraft(draft.instanceKey, snap, draft.financingInstanceId);
    expect(restored.assets[0].estimation.sovereignCountryName).toBe("Pakistan");
    expect(restored.assets[0].estimation.ppAdjustedGdp).toBe(1200);
    expect(restored.assets[0].estimation.pppGdpSource).toBe("ref.ppp_adjusted_gdp");
    expect(restored.assets[0].estimation.vehicles[0].name).toBe("ignored-for-sov");
  });

  it("keeps reportable Save disabled", () => {
    expect(canSaveReportableUop()).toBe(false);
  });
});

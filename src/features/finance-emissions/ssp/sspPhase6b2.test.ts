import { describe, expect, it } from "vitest";
import {
  SSP_CALCULATE_AVAILABLE,
  SSP_REPORTABLE_SAVE_AVAILABLE,
  createCollateral,
  createHolding,
  createLoan,
  createPool,
  createSspDraft,
  createTranche,
  formulasForCollateral,
  normalizeClassInputs,
  patchSspDraft,
  serializeClassInputs,
  snapshotToSspDraft,
  sspInstanceKey,
  toSspDraftUpsertBody,
} from "./index";
import { questionnairePayload } from "./draftPersistence";
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

describe("Phase 6B.2 — safety gates still hold", () => {
  it("keeps Calculate and reportable Save disabled", () => {
    expect(SSP_CALCULATE_AVAILABLE).toBe(false);
    expect(SSP_REPORTABLE_SAVE_AVAILABLE).toBe(false);
  });
});

describe("Phase 6B.2 — classInputs envelope", () => {
  it("migrates legacy flat fields without dropping values", () => {
    const normalized = normalizeClassInputs({
      floorArea: 120,
      propertyValueAtOrigination: 250,
      supplierSpecificEmissionFactor: 0.4,
    });
    expect(normalized.schemaVersion).toBe(1);
    expect(normalized.formData.floorArea).toBe(120);
    expect(normalized.properties[0].floorArea).toBe(120);
    expect(normalized.properties[0].propertyValueAtOrigination).toBe(250);
    const serialized = serializeClassInputs(normalized);
    expect(serialized.schemaVersion).toBe(1);
    expect((serialized.formData as Record<string, unknown>).floorArea).toBe(120);
  });

  it("preserves nested vehicle_entries and property rows through draft round-trip", () => {
    let draft = createSspDraft(sspInstanceKey(1));
    const mortgage = createCollateral({
      name: "House",
      collateralType: "mortgage",
      pcafMethodOption: "1a-mortgage",
      attributionDenominator: 100,
      classInputs: serializeClassInputs(
        normalizeClassInputs({
          schemaVersion: 1,
          methodSelection: {
            hasEmissions: "",
            verificationStatus: "",
            corporateStructure: "",
            calculationMethod: "1a",
          },
          formData: {
            energy_consumption: 900,
            supplier_specific_emission_factor: 0.35,
            average_emission_factor: 0.3,
            factor_grid_country: "Pakistan",
          },
          properties: [
            {
              id: "prop-1",
              name: "A",
              propertyValueAtOrigination: 60,
              actualEnergyConsumption: 400,
              actualEnergyConsumptionUnit: "kWh",
              supplierSpecificEmissionFactor: 0.35,
              supplierSpecificEmissionFactorUnit: "kgCO2e/kWh",
              averageEmissionFactor: 0,
              averageEmissionFactorUnit: "kgCO2e/kWh",
              estimatedEnergyConsumptionFromLabels: 0,
              estimatedEnergyConsumptionFromLabelsUnit: "kWh/m2",
              estimatedEnergyConsumptionFromStatistics: 0,
              estimatedEnergyConsumptionFromStatisticsUnit: "kWh/m2",
              floorArea: 80,
            },
            {
              id: "prop-2",
              name: "B",
              propertyValueAtOrigination: 40,
              actualEnergyConsumption: 500,
              actualEnergyConsumptionUnit: "kWh",
              supplierSpecificEmissionFactor: 0.35,
              supplierSpecificEmissionFactorUnit: "kgCO2e/kWh",
              averageEmissionFactor: 0,
              averageEmissionFactorUnit: "kgCO2e/kWh",
              estimatedEnergyConsumptionFromLabels: 0,
              estimatedEnergyConsumptionFromLabelsUnit: "kWh/m2",
              estimatedEnergyConsumptionFromStatistics: 0,
              estimatedEnergyConsumptionFromStatisticsUnit: "kWh/m2",
              floorArea: 70,
            },
          ],
          commercialProperties: [],
        })
      ),
    });
    const motor = createCollateral({
      name: "Fleet",
      collateralType: "motor-vehicle-loan",
      pcafMethodOption: "1a-motor-vehicle-loan",
      attributionDenominator: 50,
      factorLibraryEntryId: "epa|sedan|2020",
      classInputs: serializeClassInputs(
        normalizeClassInputs({
          schemaVersion: 1,
          methodSelection: {
            hasEmissions: "",
            verificationStatus: "",
            corporateStructure: "",
            calculationMethod: "1a",
          },
          formData: {
            total_value_at_origination: 50,
            factor_library: "EPA",
            vehicle_entries: [
              { id: "veh-1", fuelType: "gasoline", distance: 12000, distanceUnit: "km" },
              { id: "veh-2", fuelType: "diesel", distance: 8000, distanceUnit: "km" },
            ],
          },
          properties: [],
          commercialProperties: [],
        })
      ),
    });
    const bond = createCollateral({
      name: "Corp note collateral",
      collateralType: "corporate-bond",
      pcafMethodOption: "1a-listed-equity",
      attributionDenominator: 1000,
      classInputs: serializeClassInputs(
        normalizeClassInputs({
          schemaVersion: 1,
          methodSelection: {
            hasEmissions: "yes",
            verificationStatus: "verified",
            corporateStructure: "listed",
            calculationMethod: "1a",
          },
          formData: {
            sharePrice: 10,
            outstandingShares: 100,
            totalDebt: 0,
            minorityInterest: 0,
            preferredStock: 0,
            scope1Emissions: 12,
            scope2Emissions: 3,
            scope3Emissions: 1,
          },
          properties: [],
          commercialProperties: [],
        })
      ),
    });

    const loan1 = createLoan({
      name: "L1",
      collateralIds: [mortgage.collateralId],
      currentOutstandingAmount: 40,
    });
    const loan2 = createLoan({
      name: "L2",
      collateralIds: [motor.collateralId, bond.collateralId],
      currentOutstandingAmount: 30,
    });
    const pool = createPool({
      name: "Pool",
      loanIds: [loan1.loanId, loan2.loanId],
      poolCurrentOutstandingAmount: 70,
    });
    const tranche = createTranche({ name: "Senior", currentOutstandingAmount: 70 });
    const holding = createHolding({
      name: "Note",
      trancheId: tranche.trancheId,
      bankOutstandingInvestment: 25,
    });

    draft = patchSspDraft(draft, {
      eligibility: qualifyingAnswers(),
      emissionsPath: "lookthrough",
      deal: { ...draft.deal, dealName: "Multi-class ABS", structureType: "true-sale-abs", reportingYear: "2024" },
      collateral: [mortgage, motor, bond],
      loans: [loan1, loan2],
      pools: [pool],
      tranches: [tranche],
      holdings: [holding],
    });

    const body = toSspDraftUpsertBody(draft, { counterpartyId: "cp-1", updateShared: true });
    expect(body.draft).toMatchObject(questionnairePayload(draft));

    const restored = snapshotToSspDraft(draft.instanceKey, body.draft, draft.financingInstanceId);
    expect(restored.collateral.map((c) => c.collateralId)).toEqual([
      mortgage.collateralId,
      motor.collateralId,
      bond.collateralId,
    ]);

    const house = normalizeClassInputs(restored.collateral[0].classInputs);
    expect(house.properties).toHaveLength(2);
    expect(house.properties[1].name).toBe("B");
    expect(house.formData.factor_grid_country).toBe("Pakistan");
    expect(house.formData.supplier_specific_emission_factor).toBe(0.35);

    const fleet = normalizeClassInputs(restored.collateral[1].classInputs);
    expect(Array.isArray(fleet.formData.vehicle_entries)).toBe(true);
    expect((fleet.formData.vehicle_entries as unknown[]).length).toBe(2);
    expect(restored.collateral[1].factorLibraryEntryId).toBe("epa|sedan|2020");

    const corp = normalizeClassInputs(restored.collateral[2].classInputs);
    expect(corp.methodSelection.corporateStructure).toBe("listed");
    expect(corp.formData.scope1Emissions).toBe(12);
    expect(corp.formData.sharePrice).toBe(10);

    // Edit → save preserves hierarchy ids
    const editedProps = [...house.properties, { ...house.properties[0], id: "prop-3", name: "C", floorArea: 55 }];
    restored.collateral[0].classInputs = serializeClassInputs({ ...house, properties: editedProps });
    const again = snapshotToSspDraft(
      draft.instanceKey,
      toSspDraftUpsertBody(restored, { counterpartyId: "cp-1", updateShared: true }).draft,
      draft.financingInstanceId
    );
    expect(again.collateral[0].collateralId).toBe(mortgage.collateralId);
    expect(normalizeClassInputs(again.collateral[0].classInputs).properties).toHaveLength(3);
    expect(again.loans[0].loanId).toBe(loan1.loanId);
    expect(again.pools[0].poolId).toBe(pool.poolId);
  });
});

describe("Phase 6B.2 — method applicability", () => {
  it("supports mortgage / CRE / motor / company classes and flags other-hard-asset", () => {
    expect(formulasForCollateral("mortgage", {
      hasEmissions: "",
      verificationStatus: "",
      corporateStructure: "",
      calculationMethod: "1a",
    }).status).toBe("supported");

    expect(formulasForCollateral("motor-vehicle-loan", {
      hasEmissions: "",
      verificationStatus: "",
      corporateStructure: "",
      calculationMethod: "",
    }).status).toBe("supported");

    const company = formulasForCollateral("business-loan", {
      hasEmissions: "yes",
      verificationStatus: "verified",
      corporateStructure: "unlisted",
      calculationMethod: "",
    });
    expect(company.status).toBe("supported");
    if (company.status !== "unsupported") {
      expect(company.formulas[0]?.id).toBe("1a-unlisted-equity");
    }

    expect(formulasForCollateral("other-hard-asset", {
      hasEmissions: "",
      verificationStatus: "",
      corporateStructure: "",
      calculationMethod: "",
    }).status).toBe("unsupported");
  });
});

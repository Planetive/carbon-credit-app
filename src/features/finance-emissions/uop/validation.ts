import { allowedUopEmissionsPaths, issuerLevelPathAllowed, resolveUopAccounting, uopQualifiesForMethod } from "./eligibility";
import {
  isUnsupportedUopAssetClass,
  optionDef,
  optionNeedsDenominator,
  optionsForAssetClass,
} from "./underlyingOptions";
import type { UopDraft, UopUnderlyingAsset } from "./types";

export type UopFieldErrors = Record<string, string>;

function missingNumber(value: number | null | undefined): boolean {
  return value == null || !Number.isFinite(value);
}

function requireText(value: string | null | undefined): boolean {
  return !String(value || "").trim();
}

export function validateUopEligibility(draft: UopDraft): UopFieldErrors {
  const errors: UopFieldErrors = {};
  const outcome = resolveUopAccounting(draft.eligibility);
  if (!outcome) {
    errors.eligibility = "Please finish the remaining yes/no question so we can classify this financing.";
  }
  return errors;
}

export function validateUopStructure(draft: UopDraft): UopFieldErrors {
  const errors: UopFieldErrors = {};
  const outcome = resolveUopAccounting(draft.eligibility);
  if (!uopQualifiesForMethod(outcome)) return errors;
  if (requireText(draft.structureName)) errors.structureName = "Please enter the name of this bond, loan, or fund.";
  if (requireText(draft.issuerName)) errors.issuerName = "Please enter who issued or manages this financing.";
  if (!draft.structureKind) errors.structureKind = "Please choose the type of financing.";
  if (!draft.investmentType) errors.investmentType = "Please say whether your bank holds a loan/bond or shares.";
  if (outcome.classification === "integrated" && draft.investmentType === "equity") {
    errors.investmentType =
      "Please choose loan or bond (debt). Shares are not allowed for this type of Use of Proceeds financing.";
  }
  if (missingNumber(draft.outstandingInvestment) || (draft.outstandingInvestment || 0) <= 0) {
    errors.outstandingInvestment = "Please enter your bank’s outstanding amount. It must be greater than zero.";
  }
  if (missingNumber(draft.totalStructureDebt) || (draft.totalStructureDebt || 0) < 0) {
    errors.totalStructureDebt = "Please enter total loans and bonds in the vehicle. Zero is allowed.";
  }
  if (missingNumber(draft.totalStructureEquity)) {
    errors.totalStructureEquity = "Please enter total shares in the vehicle. Zero is allowed if it is debt-only. Negative equity is allowed (PCAF footnote 164).";
  }
  const equityUsed = Math.max(0, draft.totalStructureEquity || 0);
  const denom = (draft.totalStructureDebt || 0) + equityUsed;
  if (denom <= 0) {
    if (missingNumber(draft.totalStructureAssets) || (draft.totalStructureAssets || 0) <= 0) {
      errors.totalStructureDebt =
        "After setting negative equity to 0, total loans/bonds plus shares must be greater than zero, or enter total assets as the PCAF footnote 166 fallback.";
    }
  }
  if (requireText(draft.reportingYear)) errors.reportingYear = "Please enter the reporting year (YYYY).";
  if (requireText(draft.currency)) errors.currency = "Please choose a currency.";
  if (requireText(draft.evidenceSource)) {
    errors.evidenceSource = "Please name the contract, prospectus, or allocation report that shows the money is earmarked.";
  }
  return errors;
}

export function validateUopEmissionsPath(draft: UopDraft): UopFieldErrors {
  const errors: UopFieldErrors = {};
  const outcome = resolveUopAccounting(draft.eligibility);
  if (!uopQualifiesForMethod(outcome)) return errors;
  const allowed = allowedUopEmissionsPaths(outcome);
  if (!draft.emissionsPath || !allowed.includes(draft.emissionsPath)) {
    errors.emissionsPath = "Please choose where the emissions figure will come from.";
    return errors;
  }
  if (draft.emissionsPath === "issuer_reported") {
    if (missingNumber(draft.issuerReportedFinancedEmissions)) {
      errors.issuerReportedFinancedEmissions = "Please enter the issuer’s published emissions figure in tCO2e.";
    }
    if (requireText(draft.issuerReportYear)) errors.issuerReportYear = "Please enter the year of that report.";
    if (requireText(draft.issuerReportSource)) {
      errors.issuerReportSource = "Please name the allocation and impact report.";
    }
  }
  if (
    draft.emissionsPath === "issuer_reported" &&
    outcome.classification === "integrated" &&
    !draft.issuerLevelReason
  ) {
    // Issuer-reported UoP financed emissions is the structure report, not issuer-level corporate data.
    // No extra reason required.
  }
  if (draft.emissionsPath === "estimation" && outcome.classification === "integrated" && !draft.issuerLevelReason) {
    errors.issuerLevelReason =
      "Please say why you cannot use asset-level emissions: they cannot be separated, the data is not available, or the difference would be too small to matter.";
  }
  if (draft.emissionsPath === "underlying_assets" && outcome.classification === "integrated" && issuerLevelPathAllowed(outcome)) {
    // Asset-level is the preferred path; no extra reason.
  }
  return errors;
}

export function validateUopHoldings(draft: UopDraft): UopFieldErrors {
  const errors: UopFieldErrors = {};
  const outcome = resolveUopAccounting(draft.eligibility);
  if (!uopQualifiesForMethod(outcome)) return errors;

  if (outcome.classification === "separate") {
    if (!draft.allocationStatus) {
      errors.allocationStatus = "Please say whether the money has been assigned to assets yet.";
    }
    if (draft.allocationStatus === "known") {
      if (missingNumber(draft.allocatedProceeds) || (draft.allocatedProceeds || 0) < 0) {
        errors.allocatedProceeds = "Please enter how much has already been assigned.";
      }
    }
    if (draft.allocationStatus === "unknown") {
      errors.allocationUnknown =
        "If you do not know the split, you also need an estimate for leftover (unallocated) money on the assets step.";
    }
  }

  if (outcome.classification === "integrated") {
    if (missingNumber(draft.allocatedProceeds) || (draft.allocatedProceeds || 0) < 0) {
      errors.allocatedProceeds = "Please enter how much has already been assigned.";
    }
    if (missingNumber(draft.unallocatedProceeds) || (draft.unallocatedProceeds || 0) < 0) {
      errors.unallocatedProceeds = "Please enter leftover (unallocated) proceeds. Do not leave this blank.";
    }
    if (
      (draft.unallocatedProceeds || 0) > 0 &&
      draft.unallocatedUsesAssetLevelEstimate === "yes" &&
      requireText(draft.expectedAllocationEvidence)
    ) {
      errors.expectedAllocationEvidence =
        "Please point to a document that shows where leftover funds are expected to go.";
    }
    if ((draft.unallocatedProceeds || 0) > 0 && draft.unallocatedUsesAssetLevelEstimate !== "yes") {
      if (!draft.issuerCompanyType) {
        errors.issuerCompanyType = "Please say whether the issuer is listed or private, so leftover funds can use Figure 5-1 Step 3a.";
      }
      if (draft.issuerCompanyType === "listed" && (missingNumber(draft.issuerEvic) || (draft.issuerEvic || 0) <= 0)) {
        errors.issuerEvic = "Issuer EVIC is required for leftover issuer-level attribution.";
      }
      if (
        draft.issuerCompanyType === "unlisted" &&
        (missingNumber(draft.issuerEquityPlusDebt) || (draft.issuerEquityPlusDebt || 0) <= 0)
      ) {
        errors.issuerEquityPlusDebt = "Issuer total equity + debt is required for leftover issuer-level attribution.";
      }
      const anyIssuerScope = [draft.issuerScope1Emissions, draft.issuerScope2Emissions, draft.issuerScope3Emissions].some(
        (value) => value != null && Number.isFinite(value)
      );
      if (!anyIssuerScope) {
        errors.issuerEmissions =
          "Enter at least one issuer scope for leftover funds. Do not use the issuer corporate inventory as a substitute for issuer-reported UoP structure emissions.";
      }
    }
  }
  return errors;
}

function validateOneAsset(asset: UopUnderlyingAsset, index: number): UopFieldErrors {
  const prefix = `assets.${asset.underlyingAssetId}`;
  const errors: UopFieldErrors = {};
  const label = asset.name.trim() || `Underlying asset ${index + 1}`;
  if (requireText(asset.name)) errors[`${prefix}.name`] = `Please name ${label}.`;
  if (!asset.assetClass) errors[`${prefix}.assetClass`] = `Please choose the asset type for ${label}.`;
  if (missingNumber(asset.allocatedOutstanding) || (asset.allocatedOutstanding || 0) < 0) {
    errors[`${prefix}.allocatedOutstanding`] = `Please enter how much money sits on ${label}.`;
  }
  if (asset.hasReportedEmissions === "yes") {
    const anyScope = [asset.scope1Emissions, asset.scope2Emissions, asset.scope3Emissions].some(
      (value) => value != null && Number.isFinite(value)
    );
    if (!anyScope) {
      errors[`${prefix}.emissions`] = `Please enter at least one reported scope for ${label}. Leave blank if not reported; use 0 only when reported as zero.`;
    }
    if (!asset.verificationStatus) {
      errors[`${prefix}.verificationStatus`] = `Please say whether ${label} was verified.`;
    }
  } else if (asset.hasReportedEmissions === "no") {
    if (isUnsupportedUopAssetClass(asset.assetClass)) {
      errors[`${prefix}.assetClass`] =
        `${label} cannot be estimated here. Nested Use of Proceeds and sovereign assets stay unavailable.`;
    }
    const options = optionsForAssetClass(asset.assetClass);
    const selected = optionDef(asset.assetClass, asset.estimation.pcafOption);
    if (options.length > 0 && !selected) {
      errors[`${prefix}.estimation.pcafOption`] =
        `Please choose the PCAF option for ${label}. The data-quality score comes from that option.`;
    }
    if (selected && optionNeedsDenominator(selected.id) && (missingNumber(asset.totalAssetValue) || (asset.totalAssetValue || 0) <= 0)) {
      errors[`${prefix}.totalAssetValue`] = `Please enter the attribution value for ${label} (EVIC, equity+debt, property value, or vehicle value).`;
    }
    if (selected?.fields.includes("energy") && missingNumber(asset.estimation.energyConsumption ?? asset.estimation.physicalActivityAmount)) {
      errors[`${prefix}.estimation.energyConsumption`] = `Please enter actual energy consumption for ${label}.`;
    }
    if (selected?.fields.includes("production") && missingNumber(asset.estimation.productionAmount ?? asset.estimation.physicalActivityAmount)) {
      errors[`${prefix}.estimation.productionAmount`] = `Please enter production for ${label}.`;
    }
    if (selected?.fields.includes("revenue") && missingNumber(asset.estimation.companyRevenue)) {
      errors[`${prefix}.estimation.companyRevenue`] = `Please enter revenue for ${label}.`;
    }
    if (selected?.fields.includes("atr") && missingNumber(asset.estimation.assetTurnoverRatio)) {
      errors[`${prefix}.estimation.assetTurnoverRatio`] = `Please enter the published asset-turnover ratio for ${label}.`;
    }
    if (selected?.fields.includes("sectorShare")) {
      if (requireText(asset.estimation.sectorName) && requireText(asset.estimation.sectorKey)) {
        errors[`${prefix}.estimation.sector`] = `Please enter the sector for ${label}.`;
      }
      if (missingNumber(asset.estimation.sectorAllocationPercent)) {
        errors[`${prefix}.estimation.sectorAllocationPercent`] = `Please enter the sector share (%) for ${label}.`;
      }
    }
    if (selected?.fields.includes("floorArea") && missingNumber(asset.estimation.floorArea)) {
      errors[`${prefix}.estimation.floorArea`] = `Please enter floor area for ${label}.`;
    }
    if (selected?.fields.includes("labelIntensity") && missingNumber(asset.estimation.labelEnergyIntensity)) {
      errors[`${prefix}.estimation.labelEnergyIntensity`] = `Please enter the label energy intensity for ${label}.`;
    }
    if (selected?.fields.includes("statsIntensity") && missingNumber(asset.estimation.statsEnergyIntensity)) {
      errors[`${prefix}.estimation.statsEnergyIntensity`] = `Please enter the statistical energy intensity for ${label}.`;
    }
    if (selected?.fields.includes("buildingCount") && missingNumber(asset.estimation.numberOfBuildings)) {
      errors[`${prefix}.estimation.numberOfBuildings`] = `Please enter the number of buildings for ${label}.`;
    }
    if (selected?.fields.includes("fuel") && missingNumber(asset.estimation.fuelConsumption ?? asset.estimation.physicalActivityAmount)) {
      errors[`${prefix}.estimation.fuelConsumption`] = `Please enter fuel consumption for ${label}.`;
    }
    if (selected?.fields.includes("distance") && missingNumber(asset.estimation.distanceTraveled ?? asset.estimation.physicalActivityAmount)) {
      errors[`${prefix}.estimation.distanceTraveled`] = `Please enter distance for ${label}.`;
    }
    if (selected?.fields.includes("efficiency") && missingNumber(asset.estimation.efficiency)) {
      errors[`${prefix}.estimation.efficiency`] = `Please enter fuel efficiency for ${label}.`;
    }
    if (!selected) {
      if (!asset.estimation.method) {
        errors[`${prefix}.estimation.method`] = `Please choose how to estimate emissions for ${label}.`;
      }
      if (asset.estimation.method === "physical" && missingNumber(asset.estimation.physicalActivityAmount)) {
        errors[`${prefix}.estimation.physicalActivityAmount`] = `Please enter the activity amount for ${label}.`;
      }
      if (asset.estimation.method === "economic") {
        if (requireText(asset.estimation.sectorName) && requireText(asset.estimation.sectorKey)) {
          errors[`${prefix}.estimation.sector`] = `Please enter the sector for ${label}.`;
        }
        if (missingNumber(asset.estimation.sectorAllocationPercent)) {
          errors[`${prefix}.estimation.sectorAllocationPercent`] = `Please enter the sector share (%) for ${label}.`;
        }
      }
    }
    if (requireText(asset.estimation.factorSource) && requireText(asset.estimation.factorDatasetCode)) {
      errors[`${prefix}.estimation.factorSource`] = `Please record the published factor source for ${label}. Do not invent a factor.`;
    }
    if (missingNumber(asset.estimation.emissionFactor)) {
      errors[`${prefix}.estimation.emissionFactor`] =
        `Please enter the published numeric factor for ${label}. This calculator will not invent a factor or substitute EPA/DESNZ values.`;
    }
    if (requireText(asset.estimation.factorGeography)) {
      errors[`${prefix}.estimation.factorGeography`] = `Please enter the geography of the published factor for ${label}.`;
    }
    if (requireText(asset.estimation.factorYear)) {
      errors[`${prefix}.estimation.factorYear`] = `Please enter the year of the published factor for ${label}.`;
    }
    if (requireText(asset.estimation.factorUnit)) {
      errors[`${prefix}.estimation.factorUnit`] = `Please enter the units of the published factor for ${label}.`;
    }
  } else {
    errors[`${prefix}.hasReportedEmissions`] = `Please say whether ${label} already has reported emissions.`;
  }
  if (requireText(asset.dataSource)) errors[`${prefix}.dataSource`] = `Please say where the figures for ${label} came from.`;
  return errors;
}

export function assetsRequired(draft: UopDraft): boolean {
  const outcome = resolveUopAccounting(draft.eligibility);
  if (!uopQualifiesForMethod(outcome)) return false;
  if (draft.emissionsPath === "underlying_assets") return true;
  if (draft.emissionsPath === "estimation") return true;
  if (outcome.classification === "separate" && draft.allocationStatus === "unknown") return true;
  if (
    outcome.classification === "integrated" &&
    (draft.unallocatedProceeds || 0) > 0 &&
    draft.unallocatedUsesAssetLevelEstimate === "yes"
  ) {
    return true;
  }
  return false;
}

export function validateUopAssets(draft: UopDraft): UopFieldErrors {
  if (!assetsRequired(draft)) return {};
  if (draft.assets.length === 0) {
    return { assets: "Please add at least one asset that received this money." };
  }
  return draft.assets.reduce((errors, asset, index) => ({ ...errors, ...validateOneAsset(asset, index) }), {} as UopFieldErrors);
}

export function validateUopStep(stepId: string, draft: UopDraft): UopFieldErrors {
  switch (stepId) {
    case "uop-eligibility":
      return validateUopEligibility(draft);
    case "uop-structure":
      return validateUopStructure(draft);
    case "uop-emissions-path":
      return validateUopEmissionsPath(draft);
    case "uop-holdings":
      return validateUopHoldings(draft);
    case "uop-assets":
      return validateUopAssets(draft);
    default:
      return {};
  }
}

export function uopStepIsComplete(stepId: string, draft: UopDraft): boolean {
  return Object.keys(validateUopStep(stepId, draft)).length === 0;
}

export function uopQuestionnaireComplete(draft: UopDraft): boolean {
  const outcome = resolveUopAccounting(draft.eligibility);
  if (!uopQualifiesForMethod(outcome)) return false;
  const steps = ["uop-eligibility", "uop-structure", "uop-emissions-path", "uop-holdings"];
  if (assetsRequired(draft)) steps.push("uop-assets");
  return steps.every((stepId) => uopStepIsComplete(stepId, draft));
}

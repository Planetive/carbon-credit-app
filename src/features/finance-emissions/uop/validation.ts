import { allowedUopEmissionsPaths, issuerLevelPathAllowed, resolveUopAccounting, uopQualifiesForMethod } from "./eligibility";
import {
  isUnsupportedUopAssetClass,
  optionDef,
  optionNeedsDenominator,
  optionsForAssetClass,
} from "./underlyingOptions";
import type { UopClassification, UopDraft, UopStructureKind, UopUnderlyingAsset } from "./types";

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

const SEPARATE_STRUCTURE_KINDS = new Set<UopStructureKind>([
  "equity-fund",
  "debt-fund",
  "holding-spv-without-control",
]);
const INTEGRATED_STRUCTURE_KINDS = new Set<UopStructureKind>([
  "labeled-bond",
  "labeled-loan",
  "multi-asset-loan",
]);

export function structureKindsForClassification(classification: UopClassification | null | undefined): UopStructureKind[] {
  if (classification === "integrated") {
    return ["labeled-bond", "labeled-loan", "multi-asset-loan", "other"];
  }
  if (classification === "separate") {
    return ["equity-fund", "debt-fund", "holding-spv-without-control", "other"];
  }
  return ["equity-fund", "debt-fund", "holding-spv-without-control", "labeled-bond", "labeled-loan", "multi-asset-loan", "other"];
}

export function structureKindFitsClassification(
  kind: UopStructureKind | "",
  classification: UopClassification | null | undefined
): boolean {
  if (!kind || kind === "other" || !classification) return true;
  if (classification === "integrated") return !SEPARATE_STRUCTURE_KINDS.has(kind);
  if (classification === "separate") return !INTEGRATED_STRUCTURE_KINDS.has(kind);
  return true;
}

export function validateUopStructure(draft: UopDraft): UopFieldErrors {
  const errors: UopFieldErrors = {};
  const outcome = resolveUopAccounting(draft.eligibility);
  if (!uopQualifiesForMethod(outcome)) return errors;
  if (requireText(draft.structureName)) errors.structureName = "Please enter the name of this bond, loan, or fund.";
  if (requireText(draft.issuerName)) errors.issuerName = "Please enter who issued or manages this financing.";
  if (!draft.structureKind) errors.structureKind = "Please choose the type of financing.";
  if (draft.structureKind && !structureKindFitsClassification(draft.structureKind, outcome.classification)) {
    errors.structureKind =
      outcome.classification === "integrated"
        ? "A separate fund or SPV does not match assets sitting on the borrower’s books. Choose a labeled bond, labeled loan, or earmarked loan — or go back if the assets sit in a fund."
        : "A labeled bond or earmarked loan usually sits on the borrower’s books. That does not match a separate fund. Choose a fund or SPV — or go back if the assets sit on the borrower’s books.";
  }
  if (!draft.investmentType) errors.investmentType = "Please say whether your bank holds a loan/bond or shares.";
  if (outcome.classification === "integrated" && draft.investmentType === "equity") {
    errors.investmentType =
      "Please choose loan or bond (debt). Shares are not allowed for this type of Use of Proceeds financing.";
  }
  if (draft.structureKind === "equity-fund" && draft.investmentType === "debt") {
    errors.investmentType =
      "An equity fund holds shares. Choose shares, or change the financing type if this is a debt fund.";
  }
  if (draft.structureKind === "debt-fund" && draft.investmentType === "equity") {
    errors.investmentType =
      "A debt fund holds loans or bonds. Choose loan or bond, or change the financing type if this is an equity fund.";
  }
  if (missingNumber(draft.outstandingInvestment) || (draft.outstandingInvestment || 0) <= 0) {
    errors.outstandingInvestment = "Please enter your bank’s outstanding amount. It must be greater than zero.";
  }
  if (missingNumber(draft.totalStructureDebt) || (draft.totalStructureDebt || 0) < 0) {
    errors.totalStructureDebt = "Please enter total loans and bonds in the vehicle. Zero is allowed.";
  }
  if (missingNumber(draft.totalStructureEquity)) {
    errors.totalStructureEquity = "Please enter total shares in the vehicle. Zero is allowed if it is debt-only. A negative figure is allowed.";
  }
  const equityUsed = Math.max(0, draft.totalStructureEquity || 0);
  const denom = (draft.totalStructureDebt || 0) + equityUsed;
  if (denom <= 0) {
    if (missingNumber(draft.totalStructureAssets) || (draft.totalStructureAssets || 0) <= 0) {
      errors.totalStructureDebt =
        "After setting negative equity to 0, total loans/bonds plus shares must be greater than zero, or enter total assets as a fallback.";
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
        errors.issuerCompanyType = "Please say whether the issuer is listed or private, so leftover funds can use the issuer’s company figures.";
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
    if (asset.assetClass === "sub-sovereign-debt") {
      if (asset.estimation.subSovereignIssuerKind === "corporate-like") {
        errors[`${prefix}.estimation.subSovereignIssuerKind`] =
          `${label}: corporate-like sub-sovereign issuers use business-loan methods (PCAF §5.10 Table 5.10-2).`;
      }
      if (requireText(asset.estimation.regionName)) {
        errors[`${prefix}.estimation.regionName`] = `Please enter the region for ${label}.`;
      }
      if (requireText(asset.estimation.sovereignCountryName)) {
        errors[`${prefix}.estimation.sovereignCountryName`] = `Please enter the country for ${label}.`;
      }
      const hasDirect = !missingNumber(asset.estimation.regionalPppAdjustedGdp) && (asset.estimation.regionalPppAdjustedGdp || 0) > 0;
      const hasAnnex =
        !missingNumber(asset.estimation.regionalNominalGdp) &&
        (asset.estimation.regionalNominalGdp || 0) > 0 &&
        !missingNumber(asset.estimation.countryPppAdjustmentFactor) &&
        (asset.estimation.countryPppAdjustmentFactor || 0) > 0;
      if (!hasDirect && !hasAnnex) {
        errors[`${prefix}.estimation.regionalPppAdjustedGdp`] =
          `Please enter regional PPP-adjusted GDP (or regional nominal GDP × country PPP factor) for ${label}. National catalog GDP is not accepted.`;
      }
      if (requireText(asset.estimation.regionalGdpCurrency)) {
        errors[`${prefix}.estimation.regionalGdpCurrency`] = `Please enter the regional GDP currency for ${label}.`;
      }
      if (requireText(asset.estimation.regionalGdpSource)) {
        errors[`${prefix}.estimation.regionalGdpSource`] = `Please enter the regional GDP source for ${label}.`;
      } else if (/national\s+catalog/i.test(asset.estimation.regionalGdpSource)) {
        errors[`${prefix}.estimation.regionalGdpSource`] =
          `National catalog GDP cannot be used as regional GDP for ${label}.`;
      }
      if (requireText(asset.estimation.regionalEmissionsSource)) {
        errors[`${prefix}.estimation.regionalEmissionsSource`] = `Please enter the regional emissions source for ${label}.`;
      }
    }
    if (asset.assetClass === "use-of-proceeds") {
      if (!asset.estimation.childAssets?.length) {
        errors[`${prefix}.estimation.childAssets`] =
          `Please add the child fund’s underlying assets for ${label}. Nested Use of Proceeds needs look-through, not a single collapsed total.`;
      }
      if (missingNumber(asset.estimation.childTotalCapital) || (asset.estimation.childTotalCapital || 0) <= 0) {
        errors[`${prefix}.estimation.childTotalCapital`] =
          `Please enter the child fund’s total capital for ${label}.`;
      }
      for (const child of asset.estimation.childAssets || []) {
        const cPrefix = `${prefix}.estimation.childAssets.${child.underlyingAssetId}`;
        if (requireText(child.name)) errors[`${cPrefix}.name`] = `Please name each child asset under ${label}.`;
        if (!child.assetClass) errors[`${cPrefix}.assetClass`] = `Please choose a type for each child asset under ${label}.`;
        if (missingNumber(child.allocatedOutstanding) || (child.allocatedOutstanding || 0) < 0) {
          errors[`${cPrefix}.allocatedOutstanding`] = `Please enter the amount on each child asset under ${label}.`;
        }
        if (child.assetClass === "sub-sovereign-debt") {
          errors[`${cPrefix}.assetClass`] = `Child asset under ${label} cannot use unsupported sub-sovereign methods.`;
        }
      }
    } else {
    const options = optionsForAssetClass(asset.assetClass);
    const selected = optionDef(asset.assetClass, asset.estimation.pcafOption);
    if (options.length > 0 && !selected) {
      errors[`${prefix}.estimation.pcafOption`] =
        `Please choose the data option for ${label}. The data-quality score comes from that option.`;
    }
    const sovereignInventoryOption =
      (asset.assetClass === "sovereign-debt" && selected && ["1a", "1b", "3b"].includes(selected.id)) ||
      (asset.assetClass === "sub-sovereign-debt" && selected && ["1a", "1b", "4a", "4b"].includes(selected.id));
    if (
      asset.assetClass === "sovereign-debt" &&
      String(asset.estimation.pppGdpYear) === "2024" &&
      String(asset.estimation.preferredPppGdpYear || "2025") === "2025" &&
      !asset.estimation.allowPppGdpFallback
    ) {
      errors[`${prefix}.estimation.allowPppGdpFallback`] =
        `Confirm the 2024 PPP-GDP fallback for ${label}. 2024 data is never used silently for 2025.`;
    }
    if (asset.assetClass === "sovereign-debt") {
      if (requireText(asset.estimation.sovereignCountryName)) {
        errors[`${prefix}.estimation.sovereignCountryName`] =
          `Please select the country for ${label} so PPP-adjusted GDP can load from the catalog.`;
      }
      if (missingNumber(asset.estimation.ppAdjustedGdp) || (asset.estimation.ppAdjustedGdp || 0) <= 0) {
        errors[`${prefix}.estimation.ppAdjustedGdp`] =
          `No PPP-adjusted GDP is available for ${label}. A sovereign calculator without a catalog row is not enough.`;
      }
      if (selected?.id === "1a" && missingNumber(asset.estimation.verifiedCountryEmissions)) {
        errors[`${prefix}.estimation.verifiedCountryEmissions`] =
          `Please enter verified country emissions for ${label}.`;
      }
      if (selected?.id === "1b" && missingNumber(asset.estimation.unverifiedCountryEmissions)) {
        errors[`${prefix}.estimation.unverifiedCountryEmissions`] =
          `Please enter unverified country emissions for ${label}.`;
      }
    }
    if (
      selected &&
      optionNeedsDenominator(selected.id) &&
      asset.assetClass !== "sovereign-debt" &&
      asset.assetClass !== "sub-sovereign-debt" &&
      (missingNumber(asset.totalAssetValue) || (asset.totalAssetValue || 0) <= 0)
    ) {
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
    const multiVehicle =
      asset.assetClass === "motor-vehicle-loan" && (asset.estimation.vehicles?.length || 0) > 0;
    if (multiVehicle) {
      for (const vehicle of asset.estimation.vehicles) {
        const vPrefix = `${prefix}.estimation.vehicles.${vehicle.id}`;
        if (String(vehicle.fuelUnit || "").toLowerCase().includes("gallon")) {
          errors[vPrefix] = `Gallons are not supported for ${label}. Use litres.`;
        }
        if (selected?.fields.includes("fuel") && missingNumber(vehicle.fuelConsumption)) {
          errors[vPrefix] = `Please enter fuel for each vehicle under ${label}.`;
        }
        if (selected?.fields.includes("distance") && missingNumber(vehicle.distanceTraveled)) {
          errors[vPrefix] = `Please enter distance for each vehicle under ${label}.`;
        }
        if (selected?.fields.includes("efficiency") && missingNumber(vehicle.efficiency)) {
          errors[vPrefix] = `Please enter efficiency for each vehicle under ${label}.`;
        }
      }
    } else {
      if (selected?.fields.includes("fuel") && missingNumber(asset.estimation.fuelConsumption ?? asset.estimation.physicalActivityAmount)) {
        errors[`${prefix}.estimation.fuelConsumption`] = `Please enter fuel consumption for ${label}.`;
      }
      if (selected?.fields.includes("distance") && missingNumber(asset.estimation.distanceTraveled ?? asset.estimation.physicalActivityAmount)) {
        errors[`${prefix}.estimation.distanceTraveled`] = `Please enter distance for ${label}.`;
      }
      if (selected?.fields.includes("efficiency") && missingNumber(asset.estimation.efficiency)) {
        errors[`${prefix}.estimation.efficiency`] = `Please enter fuel efficiency for ${label}.`;
      }
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
    if (selected?.method === "economic") {
      if (requireText(asset.estimation.activityCurrency)) {
        errors[`${prefix}.estimation.activityCurrency`] =
          `Please enter the activity currency for ${label}. Economic intensities are currency-specific.`;
      }
      if (requireText(asset.estimation.priceYear)) {
        errors[`${prefix}.estimation.priceYear`] =
          `Please enter the price year for ${label}.`;
      }
      const unit = String(asset.estimation.factorUnit || asset.estimation.libraryFactorUnit || "").toLowerCase();
      if (unit.includes("kwh") || unit.includes("litre") || unit.includes("gallon") || unit.includes("/mwh")) {
        errors[`${prefix}.estimation.factorUnit`] =
          `Economic estimation for ${label} needs a sector intensity (tCO₂e per currency), not an electricity or fuel factor.`;
      }
    }
    if (!sovereignInventoryOption) {
      if (requireText(asset.estimation.factorSource) && requireText(asset.estimation.factorDatasetCode)) {
        errors[`${prefix}.estimation.factorSource`] = `Please record the published factor source for ${label}. Do not invent a factor.`;
      }
      if (requireText(asset.estimation.libraryEntryId)) {
        errors[`${prefix}.estimation.libraryEntryId`] =
          `No verified factor available for ${label}. Confirm an approved library factor. A typed number is not used.`;
      } else if (!asset.estimation.factorConfirmed) {
        errors[`${prefix}.estimation.factorConfirmed`] = `Please confirm the approved factor for ${label} before calculating.`;
      }
      if (missingNumber(asset.estimation.emissionFactor)) {
        errors[`${prefix}.estimation.emissionFactor`] =
          `Please confirm the approved numeric factor for ${label}. This calculator will not invent a factor or substitute EPA/DESNZ values.`;
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
      if (requireText(asset.estimation.factorSource)) {
        errors[`${prefix}.estimation.factorSource`] = `Please record the emissions source for ${label}.`;
      }
      if (missingNumber(asset.estimation.emissionFactor)) {
        errors[`${prefix}.estimation.emissionFactor`] = `Please confirm country emissions for ${label}.`;
      }
    }
    } // end non-nested estimation branch
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

function validateOneAssetIdentity(asset: UopUnderlyingAsset, index: number): UopFieldErrors {
  const prefix = `assets.${asset.underlyingAssetId}`;
  const errors: UopFieldErrors = {};
  const label = asset.name.trim() || `Underlying asset ${index + 1}`;
  if (requireText(asset.name)) errors[`${prefix}.name`] = `Please name ${label}.`;
  if (!asset.assetClass) errors[`${prefix}.assetClass`] = `Please choose the asset type for ${label}.`;
  if (missingNumber(asset.allocatedOutstanding) || (asset.allocatedOutstanding || 0) < 0) {
    errors[`${prefix}.allocatedOutstanding`] = `Please enter how much money sits on ${label}.`;
  }
  return errors;
}

export function validateUopAssetIdentity(draft: UopDraft): UopFieldErrors {
  if (draft.assets.length === 0) return {};
  return draft.assets.reduce(
    (errors, asset, index) => ({ ...errors, ...validateOneAssetIdentity(asset, index) }),
    {} as UopFieldErrors
  );
}

export function validateUopAllocation(draft: UopDraft): UopFieldErrors {
  const errors: UopFieldErrors = { ...validateUopHoldings(draft) };
  const needAssets =
    assetsRequired(draft) &&
    (draft.emissionsPath !== "issuer_reported" || draft.allocationStatus === "unknown");
  if (needAssets && draft.assets.length === 0) {
    errors.assets = "Please add at least one asset that received this money.";
  }
  return { ...errors, ...validateUopAssetIdentity(draft) };
}

export function validateUopAssets(draft: UopDraft): UopFieldErrors {
  if (!assetsRequired(draft)) return {};
  if (draft.assets.length === 0) {
    return { assets: "Please add at least one asset that received this money." };
  }
  return draft.assets.reduce((errors, asset, index) => ({ ...errors, ...validateOneAsset(asset, index) }), {} as UopFieldErrors);
}

export function validateUopEmissions(draft: UopDraft): UopFieldErrors {
  return { ...validateUopEmissionsPath(draft), ...validateUopAssets(draft) };
}

export function validateUopReview(draft: UopDraft): UopFieldErrors {
  if (uopQuestionnaireComplete(draft)) return {};
  return { review: "Please finish the earlier steps before calculating." };
}

export function validateUopStep(stepId: string, draft: UopDraft): UopFieldErrors {
  switch (stepId) {
    case "uop-eligibility":
      return validateUopEligibility(draft);
    case "uop-structure":
      return validateUopStructure(draft);
    case "uop-allocation":
      return validateUopAllocation(draft);
    case "uop-emissions":
      return validateUopEmissions(draft);
    case "uop-review":
      return validateUopReview(draft);
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
  const steps = ["uop-eligibility", "uop-structure", "uop-allocation", "uop-emissions"];
  return steps.every((stepId) => Object.keys(validateUopStep(stepId, draft)).length === 0);
}

import type { ExistingFinanceLoanType } from "../config/loanTypeOptions";

export type UopYesNo = "yes" | "no" | "";
export type UopListing = "listed" | "unlisted" | "";
export type UopInvestmentType = "debt" | "equity" | "";
export type UopClassification = "separate" | "integrated";
export type UopEmissionsPath = "issuer_reported" | "underlying_assets" | "estimation" | "";
export type UopAllocationStatus = "known" | "unknown" | "none_yet" | "";
export type UopIssuerLevelReason =
  | "theoretically_impossible"
  | "practically_not_feasible"
  | "not_material"
  | "";

export type UopSingleAssetClass =
  | "mortgage"
  | "commercial-real-estate"
  | "motor-vehicle-loan"
  | "project-finance"
  | "other"
  | "";

export type UopStructureKind =
  | "equity-fund"
  | "debt-fund"
  | "holding-spv-without-control"
  | "labeled-bond"
  | "labeled-loan"
  | "multi-asset-loan"
  | "other"
  | "";

export type UopUnderlyingAssetClass =
  | ExistingFinanceLoanType
  | "listed-equity"
  | "unlisted-equity"
  | "use-of-proceeds"
  | "sub-sovereign-debt";

export type UopVehicleRow = {
  id: string;
  name: string;
  valueAtOrigination: number | null;
  outstandingAmount: number | null;
  fuelConsumption: number | null;
  distanceTraveled: number | null;
  efficiency: number | null;
  fuelUnit: string;
  distanceUnit: string;
};

export type UopNestedChildAsset = {
  underlyingAssetId: string;
  name: string;
  assetClass: UopUnderlyingAssetClass | "";
  allocatedOutstanding: number | null;
  totalAssetValue: number | null;
  hasReportedEmissions: UopYesNo;
  verificationStatus: "verified" | "unverified" | "";
  scope1Emissions: number | null;
  scope2Emissions: number | null;
  scope3Emissions: number | null;
  dataSource: string;
};

export type UopOtherMethod =
  | "customer-segment"
  | "listed-equity-corporate-bonds"
  | "business-loans-unlisted-equity"
  | "project-finance"
  | "mortgages"
  | "commercial-real-estate"
  | "motor-vehicle-loans"
  | "securitization-structured-products"
  | "figure-5-1-step-6";

export type UopAccountingOutcome =
  | {
      kind: "not-uop";
      method: UopOtherMethod;
      title: string;
      guidance: string;
      pcafRef: string;
    }
  | {
      kind: "other-method";
      method: UopOtherMethod;
      title: string;
      guidance: string;
      pcafRef: string;
    }
  | {
      kind: "uop";
      classification: UopClassification;
      title: string;
      guidance: string;
      pcafRef: string;
    };

export type UopEligibilityAnswers = {
  proceedsAllocatedToSpecificAssets: UopYesNo;
  isSecuritized: UopYesNo;
  structureHasControl: UopYesNo;
  structureListing: UopListing;
  controlOneFullyAllocatedAsset: UopYesNo;
  controlAssetIsProject: UopYesNo;
  debtBasedWithOneFullyAllocatedAsset: UopYesNo;
  singleAssetClass: UopSingleAssetClass;
  assetsOnIssuerBalanceSheet: UopYesNo;
};

export type UopPcafOptionId = "1a" | "1b" | "2a" | "2b" | "3" | "3a" | "3b" | "3c" | "score5" | "";

export type UopEstimationInputs = {
  method: "physical" | "economic" | "";
  /** PCAF option for this asset class. Data-quality score is derived from this, never typed in. */
  pcafOption: UopPcafOptionId;
  physicalActivityAmount: number | null;
  physicalActivityUnit: string;
  energyConsumption: number | null;
  processEmissions: number | null;
  productionAmount: number | null;
  companyRevenue: number | null;
  assetTurnoverRatio: number | null;
  floorArea: number | null;
  labelEnergyIntensity: number | null;
  statsEnergyIntensity: number | null;
  numberOfBuildings: number | null;
  fuelConsumption: number | null;
  distanceTraveled: number | null;
  efficiency: number | null;
  sectorKey: string;
  sectorName: string;
  sectorAllocationPercent: number | null;
  factorLibrary: "EPA" | "DEFRA" | "";
  factorDatasetCode: string;
  factorSource: string;
  factorGeography: string;
  factorYear: string;
  factorUnit: string;
  /** Published numeric factor. Never invented or silently substituted. */
  emissionFactor: number | null;
  libraryEntryId: string;
  libraryPublicationId: string;
  libraryFactorValue: number | null;
  libraryFactorUnit: string;
  libraryGeography: string;
  libraryApplicableYear: string;
  libraryDatasetVersion: string;
  libraryCurrencyCode: string;
  libraryPriceYear: string;
  factorConfirmed: boolean;
  activityCurrency: string;
  priceYear: string;
  manualFactorRationale: string;
  /** Sovereign reuse (§5.9) — country name drives PPP GDP catalog lookup. */
  sovereignCountryName: string;
  ppAdjustedGdp: number | null;
  pppGdpYear: string;
  pppGdpSource: string;
  preferredPppGdpYear: string;
  allowPppGdpFallback: boolean;
  verifiedCountryEmissions: number | null;
  unverifiedCountryEmissions: number | null;
  /** Sub-sovereign §5.10 — employee-provided regional inputs only. */
  regionName: string;
  regionalPppAdjustedGdp: number | null;
  regionalNominalGdp: number | null;
  countryPppAdjustmentFactor: number | null;
  regionalGdpCurrency: string;
  regionalGdpYear: string;
  regionalGdpSource: string;
  verifiedRegionalEmissions: number | null;
  unverifiedRegionalEmissions: number | null;
  proxyRegionalEmissions: number | null;
  regionalEmissionsSource: string;
  regionalEmissionsYear: string;
  regionalEmissionsUnit: string;
  subSovereignIssuerKind: "sovereign-like" | "corporate-like" | "";
  /** Nested UoP look-through (§5.7). */
  childStructureId: string;
  childTotalCapital: number | null;
  childAssets: UopNestedChildAsset[];
  /** Multi-vehicle rows for motor-vehicle loans (§5.6). */
  vehicles: UopVehicleRow[];
};

export type UopIssuerCompanyType = "listed" | "unlisted" | "";

export type UopCalculationResult = {
  status: string;
  code?: string | null;
  message?: string | null;
  classification?: string | null;
  emissions_path?: string | null;
  formula_id?: string | null;
  formula_name?: string | null;
  methodology_version?: string;
  emissions_unit?: string;
  pcaf_ref?: string | null;
  eligibility?: Record<string, unknown>;
  investor_attribution?: Record<string, unknown>;
  financed_emissions?: number | null;
  allocated_financed_emissions?: number | null;
  unallocated_financed_emissions?: number | null;
  data_quality_score?: number | null;
  assets?: Array<Record<string, unknown>>;
  allocation?: Record<string, unknown> | null;
  scope_breakdown?: Record<string, unknown> | null;
  issuer_report?: Record<string, unknown> | null;
  notes?: string[];
  warnings?: string[];
  is_reportable?: boolean;
  include_in_portfolio?: boolean;
  double_count_guard?: string | null;
  persisted?: boolean;
  persisted_reportable?: boolean;
  reportable_record_id?: string | null;
  calculation_fingerprint?: string | null;
  reporting_year?: string | null;
  overlap?: Record<string, unknown> | null;
  financing_instance_id?: string | null;
  structure_id?: string | null;
  investment_id?: string | null;
  structure_updated_at?: string | null;
  investment_updated_at?: string | null;
  calculated_at?: string | null;
};

export type UopUnderlyingAsset = {
  /** Stable frontend identity. Never formula_id. */
  underlyingAssetId: string;
  name: string;
  assetClass: UopUnderlyingAssetClass | "";
  allocatedOutstanding: number | null;
  totalAssetValue: number | null;
  hasReportedEmissions: UopYesNo;
  verificationStatus: "verified" | "unverified" | "";
  verifierName: string;
  scope1Emissions: number | null;
  scope2Emissions: number | null;
  scope3Emissions: number | null;
  dataSource: string;
  evidenceNotes: string;
  estimation: UopEstimationInputs;
};

export type UopDraft = {
  financingInstanceId: string;
  instanceKey: string;
  /** Server UoP structure id. Shared by every holding in the same fund. */
  structureId?: string | null;
  /** Server UoP investment/holding id. Unique to this financing_instance_id. */
  investmentId?: string | null;
  structureUpdatedAt?: string | null;
  investmentUpdatedAt?: string | null;
  siblingCount?: number;
  eligibility: UopEligibilityAnswers;
  structureName: string;
  issuerName: string;
  structureKind: UopStructureKind;
  investmentType: UopInvestmentType;
  outstandingInvestment: number | null;
  totalStructureDebt: number | null;
  totalStructureEquity: number | null;
  reportingYear: string;
  currency: string;
  evidenceSource: string;
  evidenceNotes: string;
  emissionsPath: UopEmissionsPath;
  issuerLevelReason: UopIssuerLevelReason;
  issuerReportedFinancedEmissions: number | null;
  issuerReportYear: string;
  issuerReportVerification: "verified" | "unverified" | "";
  issuerReportSource: string;
  allocationStatus: UopAllocationStatus;
  allocatedProceeds: number | null;
  unallocatedProceeds: number | null;
  expectedAllocationEvidence: string;
  unallocatedUsesAssetLevelEstimate: UopYesNo;
  totalStructureAssets: number | null;
  issuerCompanyType: UopIssuerCompanyType;
  issuerEvic: number | null;
  issuerEquityPlusDebt: number | null;
  issuerScope1Emissions: number | null;
  issuerScope2Emissions: number | null;
  issuerScope3Emissions: number | null;
  issuerVerificationStatus: "verified" | "unverified" | "";
  lastCalculation?: UopCalculationResult | null;
  assets: UopUnderlyingAsset[];
};

export type UopByInstance = Record<string, UopDraft>;

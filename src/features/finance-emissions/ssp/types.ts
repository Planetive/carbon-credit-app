import type { ExistingFinanceLoanType } from "../config/loanTypeOptions";

export type SspYesNo = "yes" | "no" | "";
export type SspEmissionsPath = "lookthrough" | "reported_pool" | "";

/** PCAF §5.8 Table 5.8-1 / Figure 5.8-2 structure families. */
export type SspStructureType =
  | "true-sale-abs"
  | "rmbs"
  | "cmbs"
  | "clo-cdo"
  | "auto-abs"
  | "mortgage-covered-bond"
  | "cre-covered-bond"
  | "synthetic"
  | "warehouse"
  | "master-trust"
  | "private-abs"
  | "untranched"
  | "whole-loan"
  | "other-in-scope"
  | "";

export type SspCollateralFamily =
  | "residential-real-estate"
  | "commercial-real-estate"
  | "business-loans"
  | "corporate-bonds"
  | "auto-loans"
  | "other-hard-assets"
  | "consumer-receivables"
  | "public-sector"
  | "unknown"
  | "";

export type SspCollateralPcafClass =
  | ExistingFinanceLoanType
  | "listed-equity"
  | "unlisted-equity"
  | "other-hard-asset"
  | "";

export type SspAccountingOutcome =
  | {
      kind: "ssp";
      title: string;
      guidance: string;
      pcafRef: string;
      structureHint?: SspStructureType;
      collateralFamily?: SspCollateralFamily;
    }
  | {
      kind: "reroute";
      method: ExistingFinanceLoanType | "use-of-proceeds";
      title: string;
      guidance: string;
      pcafRef: string;
    }
  | {
      /** Not SSP — return to asset-class selection without forcing a substitute class. */
      kind: "choose-class";
      title: string;
      guidance: string;
      pcafRef: string;
    }
  | {
      kind: "exclude";
      title: string;
      guidance: string;
      pcafRef: string;
      reasonCode: string;
    }
  | {
      kind: "needs-info";
      title: string;
      guidance: string;
      pcafRef: string;
    };

export type SspEligibilityAnswers = {
  isStructuredProduct: SspYesNo;
  underlyingIdentifiable: SspYesNo;
  structureFamily:
    | "true-sale"
    | "covered-bond"
    | "synthetic"
    | "warehouse"
    | "private-abs"
    | "whole-loan"
    | "tba-repo"
    | "unknown"
    | "";
  collateralFamily: SspCollateralFamily;
  hasAssetLevelEmissionsForOtherHard: SspYesNo;
  isGssCollateralBond: SspYesNo;
  isGssStandardBondForOriginatorProjects: SspYesNo;
  collateralRemainsWithOriginator: SspYesNo;
  hasTranches: SspYesNo;
  hasPoolOfPools: SspYesNo;
  poolsLinkedToSpecificTranches: SspYesNo;
};

export type SspEvidence = {
  source: string;
  notes: string;
  documentReference: string;
};

export type SspCollateral = {
  collateralId: string;
  name: string;
  collateralType: SspCollateralPcafClass;
  /** Collateral attribution denominator (e.g. property value at origination, vehicle value). */
  attributionDenominator: number | null;
  denominatorLabel: string;
  currentOutstandingAmount: number | null;
  originalOutstandingAmount: number | null;
  assetValueAtOrigination: number | null;
  updatedAssetValue: number | null;
  pcafMethodOption: string;
  emissionsPath: "asset-class-estimate" | "reported" | "";
  scope1Emissions: number | null;
  scope2Emissions: number | null;
  scope3Emissions: number | null;
  dataQualityScore: number | null;
  factorLibraryEntryId: string;
  /** Full PCAF-class inputs (mortgage/CRE/vehicle/etc.) — no local FE formula. */
  classInputs: Record<string, unknown>;
  evidence: SspEvidence;
};

export type SspLoan = {
  loanId: string;
  name: string;
  collateralIds: string[];
  /** Current outstanding amount of the underlying loan (COA). */
  currentOutstandingAmount: number | null;
  originalOutstandingAmount: number | null;
  /** Portion of this loan included in a given pool — set per pool membership, not here. */
  notes: string;
  evidence: SspEvidence;
};

export type SspPool = {
  poolId: string;
  name: string;
  loanIds: string[];
  /** Optional override when pool COA is published separately from sum of loan COAs. */
  poolCurrentOutstandingAmount: number | null;
  reportedEmissionsTotal: number | null;
  reportedEmissionsPeriod: string;
  reportedScopeCoverage: string;
  reportedVerification: "verified" | "unverified" | "";
  reportedSource: string;
  evidence: SspEvidence;
};

export type SspPoolOfPools = {
  poolOfPoolsId: string;
  name: string;
  poolIds: string[];
  currentOutstandingAmount: number | null;
  evidence: SspEvidence;
};

export type SspTranche = {
  trancheId: string;
  name: string;
  seniorityLabel: string;
  /** Current outstanding amount of the tranche (COA). */
  currentOutstandingAmount: number | null;
  /** Pools specifically attached to this tranche (when required). Empty = share deal pools. */
  linkedPoolIds: string[];
  isGreenTranche: SspYesNo;
  evidence: SspEvidence;
};

export type SspHolding = {
  holdingId: string;
  name: string;
  trancheId: string;
  /** Bank's outstanding investment in this tranche (or deal if untranched). */
  bankOutstandingInvestment: number | null;
  currency: string;
  evidence: SspEvidence;
};

export type SspDealInfo = {
  dealName: string;
  dealIdentifier: string;
  issuerName: string;
  originatorName: string;
  spvName: string;
  structureType: SspStructureType;
  reportingYear: string;
  currency: string;
  documentationSource: string;
  hasTranches: SspYesNo;
  hasPoolOfPools: SspYesNo;
  collateralRemainsWithOriginator: SspYesNo;
  poolsLinkedToSpecificTranches: SspYesNo;
};

export type SspDraft = {
  financingInstanceId: string;
  instanceKey: string;
  dealId: string | null;
  holdingId: string | null;
  dealUpdatedAt: string | null;
  holdingUpdatedAt: string | null;
  siblingCount: number;
  eligibility: SspEligibilityAnswers;
  deal: SspDealInfo;
  emissionsPath: SspEmissionsPath;
  collateral: SspCollateral[];
  loans: SspLoan[];
  pools: SspPool[];
  poolOfPools: SspPoolOfPools | null;
  tranches: SspTranche[];
  holdings: SspHolding[];
  /** Frontend never fabricates results. Placeholder until Phase 6C calculate. */
  lastPreviewNote: string;
};

export type SspByInstance = Record<string, SspDraft>;

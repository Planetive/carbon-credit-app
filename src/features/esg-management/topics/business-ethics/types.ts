export type PaymentType = "Tax" | "Royalty" | "Bonus" | "Fee" | "Dividend" | "Other";

export const PAYMENT_TYPE_OPTIONS: PaymentType[] = [
  "Tax",
  "Royalty",
  "Bonus",
  "Fee",
  "Dividend",
  "Other",
];

export type YesNoAnswer = "Yes" | "No";

export const YES_NO_OPTIONS: YesNoAnswer[] = ["Yes", "No"];

export type GovernmentPaymentRow = {
  id: string;
  country: string;
  paymentType: PaymentType;
  amountUsd: string;
  reportingYear: string;
};

export type BusinessEthicsAssetData = {
  /** EM-EP-510a.1 — Proved reserves in high-risk countries (Mmboe) */
  provedReservesHighRiskMmboe: string;
  /** EM-EP-510a.1 — Probable reserves in high-risk countries (Mmboe) */
  probableReservesHighRiskMmboe: string;
  /** EM-EP-510a.1 — Total proved reserves (Mmboe) */
  totalProvedReservesMmboe: string;
  /** EM-EP-510a.1 — Total probable reserves (Mmboe) */
  totalProbableReservesMmboe: string;
  /** EM-EP-510a.2 — Corruption management narrative */
  corruptionManagementNarrative: string;
  /** ETH-01 — Government payment rows */
  governmentPaymentRows: GovernmentPaymentRow[];
  /** ETH-03 — Whistleblower reports received */
  whistleblowerReportsReceived: string;
  /** ETH-04 — Whistleblower reports substantiated */
  whistleblowerReportsSubstantiated: string;
  /** ETH-05 — % employees anti-corruption trained */
  antiCorruptionTrainingPct: string;
  /** ETH-06 — Third-party due diligence in place */
  thirdPartyDueDiligenceInPlace: YesNoAnswer;
  /** ETH-06 — Due diligence tool name */
  dueDiligenceToolName: string;
  /** ETH-07 — Code of conduct in place */
  codeOfConductInPlace: YesNoAnswer;
  /** ETH-08 — Internal audit ethics findings */
  internalAuditEthicsFindings: string;
};

export type BusinessEthicsStoreV1 = {
  version: 1;
  periodKey: string;
  byAssetId: Record<string, BusinessEthicsAssetData>;
};

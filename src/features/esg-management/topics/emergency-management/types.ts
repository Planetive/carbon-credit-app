export type HydrocarbonReleaseRow = {
  id: string;
  date: string;
  assetLocation: string;
  volumeM3: string;
  cause: string;
  responseDescription: string;
};

export type WellControlIncidentRow = {
  id: string;
  date: string;
  wellId: string;
  isBlowout: boolean;
  description: string;
};

export type WellControlCertificationType = "IWCF" | "OPITO" | "Both" | "None";

export const WELL_CONTROL_CERTIFICATION_OPTIONS: WellControlCertificationType[] = [
  "IWCF",
  "OPITO",
  "Both",
  "None",
];

export type MutualAidInPlace = "Yes" | "No";

export const MUTUAL_AID_OPTIONS: MutualAidInPlace[] = ["Yes", "No"];

export type PreparednessScoreKey =
  | "emergencyPlanCoverage"
  | "drillFrequencyQuality"
  | "wellControlTraining"
  | "equipmentReadiness"
  | "mutualAidAgreements";

export type PreparednessScore = Record<PreparednessScoreKey, number>;

export const PREPAREDNESS_DOMAIN_META: { key: PreparednessScoreKey; label: string }[] = [
  { key: "emergencyPlanCoverage", label: "Emergency Plan Coverage" },
  { key: "drillFrequencyQuality", label: "Drill Frequency & Quality" },
  { key: "wellControlTraining", label: "Well Control Training" },
  { key: "equipmentReadiness", label: "Equipment Readiness" },
  { key: "mutualAidAgreements", label: "Mutual Aid Agreements" },
];

export type EmergencyManagementAssetData = {
  /** EM-01 — Hydrocarbon release incidents */
  hydrocarbonReleases: HydrocarbonReleaseRow[];
  /** EM-02, EM-03 — Well control incidents */
  wellControlIncidents: WellControlIncidentRow[];
  /** EM-04 — % assets covered by ERP */
  pctAssetsWithErpCoverage: string;
  /** EM-05 — Drills per asset per year */
  drillsPerAssetPerYear: string;
  /** EM-06 — Mutual aid in place */
  mutualAidInPlace: MutualAidInPlace;
  /** EM-06 — Mutual aid counterparties */
  mutualAidCounterparties: string;
  /** EM-07 — Well control certification */
  wellControlCertification: WellControlCertificationType;
  /** EM-07 — % drilling staff certified */
  pctDrillingStaffCertified: string;
  /** EM-08 — Preparedness self-assessment */
  preparednessScore: PreparednessScore;
  /** EM-EP-540a.3 — Emergency management narrative */
  emergencyManagementNarrative: string;
};

export type EmergencyManagementStoreV1 = {
  version: 1;
  periodKey: string;
  byAssetId: Record<string, EmergencyManagementAssetData>;
};

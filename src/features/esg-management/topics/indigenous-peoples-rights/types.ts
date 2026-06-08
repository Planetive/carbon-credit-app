export type ProximityToIndigenousLands = "Yes" | "No" | "Unknown";

export const PROXIMITY_OPTIONS: ProximityToIndigenousLands[] = ["Yes", "No", "Unknown"];

export type FpicStatusType =
  | "Not required"
  | "Initiated"
  | "In progress"
  | "Obtained"
  | "Denied"
  | "Under review";

export const FPIC_STATUS_OPTIONS: FpicStatusType[] = [
  "Not required",
  "Initiated",
  "In progress",
  "Obtained",
  "Denied",
  "Under review",
];

export type GrievanceType =
  | "Land access"
  | "Noise"
  | "Water"
  | "Employment"
  | "Cultural"
  | "Other";

export const GRIEVANCE_TYPE_OPTIONS: GrievanceType[] = [
  "Land access",
  "Noise",
  "Water",
  "Employment",
  "Cultural",
  "Other",
];

export type YesNoAnswer = "Yes" | "No";

export const YES_NO_OPTIONS: YesNoAnswer[] = ["Yes", "No"];

export type IfcPs7Status = "Yes" | "No" | "In progress";

export const IFC_PS7_STATUS_OPTIONS: IfcPs7Status[] = ["Yes", "No", "In progress"];

export type GrievanceRow = {
  id: string;
  dateReceived: string;
  grievanceType: GrievanceType;
  description: string;
  resolved: boolean;
  resolutionDate: string;
};

export type IndigenousRightsAssetData = {
  /** IND-01 — Proximity to indigenous lands */
  proximityToIndigenousLands: ProximityToIndigenousLands;
  /** IND-02 — FPIC status */
  fpicStatus: FpicStatusType;
  /** IND-03 — Consultation events count */
  consultationEventsCount: string;
  /** IND-03 — Consultation narrative */
  consultationNarrative: string;
  /** IND-04, IND-05 — Grievance register */
  grievanceRows: GrievanceRow[];
  /** IND-06 — FPIC policy in place */
  fpicPolicyInPlace: YesNoAnswer;
  /** IND-06 — FPIC policy narrative */
  fpicPolicyNarrative: string;
  /** IND-07 — IFC PS7 completed */
  ifcPs7Completed: IfcPs7Status;
  /** IND-07 — IFC PS7 assessment date */
  ifcPs7AssessmentDate: string;
  /** EM-EP-210a.2 — FPIC process narrative */
  fpicProcessNarrative: string;
};

export type IndigenousRightsStoreV1 = {
  version: 1;
  periodKey: string;
  byAssetId: Record<string, IndigenousRightsAssetData>;
};

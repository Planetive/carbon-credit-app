import type { TopicFileMeta } from "../shared/fileMeta";

export type ProductTypeSpilled =
  | "Crude oil"
  | "Condensate"
  | "Produced water"
  | "Chemicals"
  | "Other";

export type SpillCause =
  | "Corrosion"
  | "Mechanical failure"
  | "Operational error"
  | "Third-party damage"
  | "Weather"
  | "Other";

export type SpillResponseAction =
  | "Containment boom"
  | "Vacuum truck"
  | "Excavation"
  | "Bioremediation"
  | "Other";

export type RegulatoryNotificationStatus = "Yes" | "No" | "Pending";

export type WellBarrierStatus =
  | "All barriers intact"
  | "Defect in secondary"
  | "Defect in primary"
  | "Loss of containment";

export interface SpillRow {
  id: string;
  spillDate: string;
  assetLocation: string;
  spillVolumeCubicM: number;
  spillVolumeUnit: "m³" | "bbl";
  productTypeSpilled: ProductTypeSpilled;
  spillCause: SpillCause;
  sensitiveAreaFlag: boolean;
  volumeRecoveredCubicM: number;
  responseActions: SpillResponseAction[];
  regulatoryNotification: RegulatoryNotificationStatus;
  regulatorName: string;
  notificationDate: string;
}

export interface WellIntegrityRow {
  id: string;
  wellId: string;
  inspectionDate: string;
  barrierStatus: WellBarrierStatus;
}

export type BiodiversityAssetData = {
  incidentCount: string;
  incidentNarrative: string;
  empInPlace: "" | "yes" | "no";
  empFilesMeta: TopicFileMeta[];
  envManagementPoliciesNarrative: string;
  spillRows: SpillRow[];
  wellIntegrityRows: WellIntegrityRow[];
};

export type BiodiversityStoreV1 = {
  version: 1;
  periodKey: string;
  byAssetId: Record<string, BiodiversityAssetData>;
};

export const PROXIMITY_PLACEHOLDER_ROWS = [
  { key: "iucn", label: "Protected areas (IUCN)" },
  { key: "unesco", label: "UNESCO World Heritage Sites" },
  { key: "ramsar", label: "Ramsar wetlands" },
  { key: "kba", label: "Key Biodiversity Areas" },
  { key: "indigenous", label: "Indigenous or community land" },
] as const;

export const PRODUCT_TYPES_SPILLED: ProductTypeSpilled[] = [
  "Crude oil",
  "Condensate",
  "Produced water",
  "Chemicals",
  "Other",
];

export const SPILL_CAUSES: SpillCause[] = [
  "Corrosion",
  "Mechanical failure",
  "Operational error",
  "Third-party damage",
  "Weather",
  "Other",
];

export const REGULATORY_NOTIFICATION_STATUSES: RegulatoryNotificationStatus[] = ["Yes", "No", "Pending"];

export const WELL_BARRIER_STATUSES: WellBarrierStatus[] = [
  "All barriers intact",
  "Defect in secondary",
  "Defect in primary",
  "Loss of containment",
];

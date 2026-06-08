export type ProductTypeSpilled =
  | "Crude oil"
  | "Condensate"
  | "Produced water"
  | "Chemicals"
  | "Other";

export const PRODUCT_TYPES_SPILLED: ProductTypeSpilled[] = [
  "Crude oil",
  "Condensate",
  "Produced water",
  "Chemicals",
  "Other",
];

export type SpillCause =
  | "Corrosion"
  | "Mechanical failure"
  | "Operational error"
  | "Third-party damage"
  | "Weather"
  | "Other";

export const SPILL_CAUSES: SpillCause[] = [
  "Corrosion",
  "Mechanical failure",
  "Operational error",
  "Third-party damage",
  "Weather",
  "Other",
];

export type SpillResponseAction =
  | "Containment boom"
  | "Vacuum truck"
  | "Excavation"
  | "Bioremediation"
  | "Other";

export const SPILL_RESPONSE_ACTIONS: SpillResponseAction[] = [
  "Containment boom",
  "Vacuum truck",
  "Excavation",
  "Bioremediation",
  "Other",
];

export type RegulatoryNotificationStatus = "Yes" | "No" | "Pending";

export const REGULATORY_NOTIFICATION_STATUSES: RegulatoryNotificationStatus[] = ["Yes", "No", "Pending"];

export type SpillVolumeUnit = "m³" | "bbl";

export const SPILL_VOLUME_UNITS: SpillVolumeUnit[] = ["m³", "bbl"];

export type WellBarrierStatus =
  | "All barriers intact"
  | "Defect in secondary"
  | "Defect in primary"
  | "Loss of containment";

export const WELL_BARRIER_STATUSES: WellBarrierStatus[] = [
  "All barriers intact",
  "Defect in secondary",
  "Defect in primary",
  "Loss of containment",
];

export type SpillRow = {
  id: string;
  /** SPI-01 */
  spillDate: string;
  /** SPI-02 */
  assetLocation: string;
  /** SPI-03 */
  spillVolumeCubicM: number;
  /** SPI-03 */
  spillVolumeUnit: SpillVolumeUnit;
  /** SPI-04 */
  productTypeSpilled: ProductTypeSpilled;
  /** SPI-05 */
  spillCause: SpillCause;
  /** SPI-06 */
  sensitiveAreaFlag: boolean;
  /** SPI-07 */
  volumeRecoveredCubicM: number;
  /** SPI-08 */
  responseActions: SpillResponseAction[];
  /** SPI-09 */
  regulatoryNotification: RegulatoryNotificationStatus;
  /** SPI-09 */
  regulatorName: string;
  /** SPI-09 */
  notificationDate: string;
};

export type WellIntegrityRow = {
  id: string;
  /** SPI-10 */
  wellId: string;
  /** SPI-10 */
  inspectionDate: string;
  /** SPI-11 */
  barrierStatus: WellBarrierStatus;
};

export type EnvironmentalManagementAssetData = {
  spillRows: SpillRow[];
  wellIntegrityRows: WellIntegrityRow[];
};

export type EnvironmentalManagementStoreV1 = {
  version: 1;
  periodKey: string;
  byAssetId: Record<string, EnvironmentalManagementAssetData>;
};

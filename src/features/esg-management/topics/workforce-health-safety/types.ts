export type HsCertificationType = "ISO 45001" | "OHSAS 18001" | "Internal only" | "None";

export const HS_CERTIFICATION_OPTIONS: HsCertificationType[] = [
  "ISO 45001",
  "OHSAS 18001",
  "Internal only",
  "None",
];

export type WorkforceHealthSafetyAssetData = {
  /** HSE-01 — Employee hours worked */
  employeeHoursWorked: string;
  /** HSE-02 — Contractor hours worked */
  contractorHoursWorked: string;
  /** HSE-03 — Recordable incidents (employees) */
  employeeRecordableIncidents: string;
  /** HSE-04 — Recordable incidents (contractors) */
  contractorRecordableIncidents: string;
  /** HSE-05 — Lost time incidents (employees) */
  employeeLostTimeIncidents: string;
  /** HSE-06 — Lost time incidents (contractors) */
  contractorLostTimeIncidents: string;
  /** HSE-07 — Fatalities (employees) */
  employeeFatalities: string;
  /** HSE-07 — Fatalities (contractors) */
  contractorFatalities: string;
  /** HSE-08 — H&S training hours total */
  hsTrainingHoursTotal: string;
  /** HSE-09 — Average employee headcount (FTE) */
  averageEmployeeHeadcountFte: string;
  /** HSE-10 — H&S certification */
  hsCertification: HsCertificationType;
  /** EM-EP-320a.2 — H&S management system narrative */
  hsManagementSystemNarrative: string;
};

export type WorkforceHealthSafetyStoreV1 = {
  version: 1;
  periodKey: string;
  byAssetId: Record<string, WorkforceHealthSafetyAssetData>;
};

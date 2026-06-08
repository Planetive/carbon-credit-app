import type { WorkforceHealthSafetyAssetData } from "./types";

const TRIR_LTIR_MULTIPLIER = 200_000;
const OFFICE_HOURS_PER_YEAR = 2_000;
const FIELD_HOURS_PER_YEAR = 2_080;

/** Parses user numeric fields; non-finite input is treated as 0. */
export function parseHsNumericInput(s: string): number {
  const n = Number(String(s).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

/**
 * TRIR: (Recordable Incidents × 200,000) ÷ Hours Worked.
 * Returns 0 if hours worked is 0.
 */
export function calcTrir(recordableIncidents: number, hoursWorked: number): number {
  if (hoursWorked <= 0) return 0;
  return (recordableIncidents * TRIR_LTIR_MULTIPLIER) / hoursWorked;
}

/**
 * LTIR: (Lost Time Incidents × 200,000) ÷ Hours Worked.
 * Returns 0 if hours worked is 0.
 */
export function calcLtir(lostTimeIncidents: number, hoursWorked: number): number {
  if (hoursWorked <= 0) return 0;
  return (lostTimeIncidents * TRIR_LTIR_MULTIPLIER) / hoursWorked;
}

export function calcEmployeeTrir(data: WorkforceHealthSafetyAssetData): number {
  return calcTrir(
    parseHsNumericInput(data.employeeRecordableIncidents),
    parseHsNumericInput(data.employeeHoursWorked)
  );
}

export function calcContractorTrir(data: WorkforceHealthSafetyAssetData): number {
  return calcTrir(
    parseHsNumericInput(data.contractorRecordableIncidents),
    parseHsNumericInput(data.contractorHoursWorked)
  );
}

export function calcEmployeeLtir(data: WorkforceHealthSafetyAssetData): number {
  return calcLtir(
    parseHsNumericInput(data.employeeLostTimeIncidents),
    parseHsNumericInput(data.employeeHoursWorked)
  );
}

export function calcContractorLtir(data: WorkforceHealthSafetyAssetData): number {
  return calcLtir(
    parseHsNumericInput(data.contractorLostTimeIncidents),
    parseHsNumericInput(data.contractorHoursWorked)
  );
}

export function calcTotalFatalities(data: WorkforceHealthSafetyAssetData): number {
  return parseHsNumericInput(data.employeeFatalities) + parseHsNumericInput(data.contractorFatalities);
}

export function calcAvgHsTrainingHoursPerEmployee(data: WorkforceHealthSafetyAssetData): number {
  const headcount = parseHsNumericInput(data.averageEmployeeHeadcountFte);
  if (headcount <= 0) return 0;
  return parseHsNumericInput(data.hsTrainingHoursTotal) / headcount;
}

/** Helper only — estimate annual hours from headcount (office standard). */
export function estimateOfficeHoursFromHeadcount(headcount: number): number {
  return headcount * OFFICE_HOURS_PER_YEAR;
}

/** Helper only — estimate annual hours from headcount (field standard). */
export function estimateFieldHoursFromHeadcount(headcount: number): number {
  return headcount * FIELD_HOURS_PER_YEAR;
}

export function formatHsNum(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-GB", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

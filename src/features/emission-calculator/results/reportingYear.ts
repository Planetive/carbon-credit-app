/**
 * Reporting year for the EPA calculator.
 * A year is taken only from an explicit stored period: "YYYY" or "YYYY-MM".
 * created_at, the current date, and a blank period are not a reporting year.
 */

export type SharedScopeCoverage = "assigned" | "withheld";

export type AnnualReportingAssignment = {
  reportingYear: number | null;
  /** Legacy Scope 1 category keys that themselves store this reporting year. */
  scope1Keys: string[];
  scope2: SharedScopeCoverage;
  scope3: SharedScopeCoverage;
  withheldReason: string | null;
};

export const SHARED_SCOPE_WITHHELD_REASON =
  "Shared Scope 2 and Scope 3 tables do not store a reporting period. Those records are unassigned and are not included in the annual total. Legacy Scope 1 tables also have no reporting period.";

const SESSION_KEY = "epaReportingYear";

export function reportingYearFromPeriod(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})(?:-(0[1-9]|1[0-2]))?$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  if (year < 1990 || year > 2200) return null;
  return year;
}

/** Verified saved-entry lists follow the annual headline when no counterparty is selected. */
export function matchesVerifiedCounterparty(
  counterpartyId: string | null | undefined,
  selectedCounterpartyId?: string | null
): boolean {
  if (!selectedCounterpartyId) return true;
  return (counterpartyId || null) === selectedCounterpartyId;
}

export function activityMatchesReportingYear(period: unknown, reportingYear?: number | null): boolean {
  if (reportingYear == null) return false;
  return reportingYearFromPeriod(period) === reportingYear;
}

export function productionAnnualAssignment(reportingYear: number | null): AnnualReportingAssignment {
  return {
    reportingYear,
    scope1Keys: [],
    scope2: "withheld",
    scope3: "withheld",
    withheldReason: SHARED_SCOPE_WITHHELD_REASON,
  };
}

export function currentCalendarYear(): number {
  return new Date().getFullYear();
}

export function readSelectedReportingYear(): number {
  if (typeof sessionStorage === "undefined") return currentCalendarYear();
  return reportingYearFromPeriod(sessionStorage.getItem(SESSION_KEY) || "") ?? currentCalendarYear();
}

export function writeSelectedReportingYear(year: number): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(SESSION_KEY, String(year));
}

export function reportingYearChoices(selected: number): number[] {
  const start = currentCalendarYear();
  const years = new Set<number>([selected]);
  for (let year = start + 1; year >= start - 5; year -= 1) years.add(year);
  return [...years].sort((a, b) => b - a);
}

export function selectDraftAssessment<
  T extends { framework: string; status: string; reporting_period?: string | null }
>(rows: T[], framework: string, reportingPeriod?: string | null): T | null {
  const matched = rows.filter((row) => row.framework === framework && row.status === "draft");
  if (!reportingPeriod) return matched[0] ?? null;
  const year = reportingYearFromPeriod(reportingPeriod);
  if (year == null) return null;
  return matched.find((row) => reportingYearFromPeriod(row.reporting_period || "") === year) ?? null;
}

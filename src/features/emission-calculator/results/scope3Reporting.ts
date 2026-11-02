/**
 * Scope 3 annual reporting helpers.
 * Legacy scope3_* rows have no reporting period and stay out of the verified annual total.
 * Verified kilograms come only from app.emission_activities (scope3_verified_activity_v1).
 */

export const LEGACY_SCOPE3_EXCLUDED_LABEL = "Legacy excluded from verified annual total";

export const SCOPE3_NOT_CALCULATED = "Not calculated";

export const SCOPE3_PARTIAL_INVENTORY_LABEL =
  "Verified Scope 3 subtotal is partial. Unsupported and empty categories are incomplete.";

/**
 * Categories that must not present stored zeros or notes as verified results.
 * Cat 3 awaits WTT/T&D datasets; Cat 14 franchises are notes-only; leased await verified grid factors.
 */
export const NOT_CALCULATED_SCOPE3_CATEGORIES = [
  { key: "fuel_energy_activities", label: "Fuel- and energy-related activities" },
  { key: "franchises", label: "Franchises" },
  { key: "upstream_leased_assets", label: "Upstream leased assets" },
  { key: "downstream_leased_assets", label: "Downstream leased assets" },
] as const;

/** Facilitated emissions are outside the GHG Protocol Scope 3 15 categories. */
export const FACILITATED_OUTSIDE_GHG_SCOPE3_LABEL =
  "Facilitated emissions (outside GHG Protocol Scope 3 Categories 1–15)";

const YEAR_MIN = 1990;
const YEAR_MAX = 2200;

const GHG_CATEGORY_COUNT = 15;

export type Scope3CategoryCompletenessStatus =
  | "verified"
  | "no_activity"
  | "unsupported"
  | "awaiting_factors"
  | "legacy_excluded";

export type Scope3CategoryCompleteness = {
  key: string;
  label: string;
  ghgNumber: number | null;
  status: Scope3CategoryCompletenessStatus;
  kgCo2e: number | null;
};

export type PcafLinkedRow = {
  linked_emission_calculation_id?: string | null;
  linked_finance_emission_calculation_id?: string | null;
  linked_financed_emissions_id?: string | null;
  emissions?: unknown;
  calculated_emissions?: unknown;
  line_type?: string | null;
};

function text(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function kg(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

/** Portfolio calculation identity. Equity rows without a link are not PCAF copies. */
export function pcafLinkKey(row: PcafLinkedRow): string | null {
  const jwt = text(row.linked_financed_emissions_id);
  if (jwt) return `jwt:${jwt}`;
  const emission = text(row.linked_emission_calculation_id);
  if (emission) return `emission:${emission}`;
  const finance = text(row.linked_finance_emission_calculation_id);
  if (finance) return `finance:${finance}`;
  return null;
}

/**
 * Facilitated kilograms that repeat a financed Category 15 row for the same PCAF calculation.
 * The Category 15 copy is kept. The facilitated copy is not added again.
 */
export function duplicatePcafFacilitatedKg(
  investments: readonly PcafLinkedRow[],
  facilitated: readonly PcafLinkedRow[],
): number {
  const financedKeys = new Set<string>();
  for (const row of investments) {
    if (text(row.line_type) !== "financed") continue;
    const key = pcafLinkKey(row);
    if (key) financedKeys.add(key);
  }
  const seen = new Set<string>();
  let duplicate = 0;
  for (const row of facilitated) {
    const key = pcafLinkKey(row);
    if (!key || !financedKeys.has(key) || seen.has(key)) continue;
    seen.add(key);
    duplicate += kg(row.emissions ?? row.calculated_emissions);
  }
  return duplicate;
}

/** Manual equity: ownership % applied to typed investee emissions — not verified. */
export function isManualEquityInvestment(row: PcafLinkedRow): boolean {
  return text(row.line_type) === "equity" && pcafLinkKey(row) == null;
}

/**
 * Financed Category 15 rows reference Finance/PCAF results; they must not be
 * independently recalculated here. Still not a complete verified Scope 3 inventory.
 */
export function isPcafReferencedInvestment(row: PcafLinkedRow): boolean {
  return text(row.line_type) === "financed" && pcafLinkKey(row) != null;
}

/** Manual equity is never marked verified without source and ownership evidence. */
export function manualEquityIsVerified(_row: PcafLinkedRow): boolean {
  return false;
}

/**
 * Category 15 attributed kg eligible for presentation as a PCAF reference
 * (not a recalculation). Manual equity returns 0 for verified attribution.
 * Never added into verifiedScope3AnnualKg.
 */
export function category15VerifiedReferenceKg(
  investments: readonly PcafLinkedRow[],
): number {
  let total = 0;
  for (const row of investments) {
    if (isManualEquityInvestment(row)) continue;
    if (!isPcafReferencedInvestment(row)) continue;
    total += kg(row.calculated_emissions ?? row.emissions);
  }
  return total;
}

/**
 * Verified annual Scope 3 kilograms for a reporting year.
 * Pass `verifiedKg` from fetchScope3Verified / summarizeScope3Activities.
 * Without a verified block, returns null (legacy never fills this).
 */
export function verifiedScope3AnnualKg(
  reportingYear: number | null,
  verifiedKg?: number | null,
): number | null {
  if (reportingYear == null || reportingYear < YEAR_MIN || reportingYear > YEAR_MAX) return null;
  if (verifiedKg === undefined) return null;
  if (verifiedKg === null) return null;
  if (!Number.isFinite(verifiedKg) || verifiedKg < 0) return null;
  return verifiedKg;
}

/**
 * Annual inventory kilograms including verified Scope 3 when available.
 * Legacy Scope 3 is never added. Missing verified Scope 3 keeps Scope 1+2 only.
 */
export function verifiedAnnualGrandKg(input: {
  reportingYear: number | null;
  scope1Kg: number;
  scope2Kg: number | null;
  legacyScope3Kg: number;
  verifiedScope3Kg?: number | null;
}): number | null {
  void input.legacyScope3Kg;
  if (input.reportingYear == null || input.reportingYear < YEAR_MIN || input.reportingYear > YEAR_MAX) {
    return null;
  }
  if (input.scope2Kg == null) return null;
  const scope3Part =
    input.verifiedScope3Kg !== undefined
      ? verifiedScope3AnnualKg(input.reportingYear, input.verifiedScope3Kg)
      : verifiedScope3AnnualKg(input.reportingYear);
  const scope3Kg = scope3Part == null ? 0 : scope3Part;
  return input.scope1Kg + input.scope2Kg + scope3Kg;
}

/**
 * Share of the 15 GHG Protocol categories that have verified activity.
 * Legacy kilograms do not increase completion. Never returns 100 while
 * unsupported categories remain.
 */
export function scope3CompletionPercent(
  legacyKg: number,
  verifiedKg: number | null,
  categoriesWithVerifiedActivity = 0,
): number {
  void legacyKg;
  if (verifiedKg == null) return 0;
  const capped = Math.max(0, Math.min(categoriesWithVerifiedActivity, GHG_CATEGORY_COUNT));
  if (capped >= GHG_CATEGORY_COUNT) {
    // All 15 would need verified support; until then never claim 100%.
    return Math.min(99, Math.round((capped / GHG_CATEGORY_COUNT) * 100));
  }
  return Math.round((capped / GHG_CATEGORY_COUNT) * 100);
}

/** Franchise notes / Cat 3 notes never imply category completion. */
export function notesOnlyCategoryIsComplete(_hasNotes: boolean): boolean {
  return false;
}

/** True only if every GHG Protocol category is verified — not reachable while safeguards remain. */
export function isScope3InventoryComplete(
  byCategory: readonly Scope3CategoryCompleteness[],
): boolean {
  if (byCategory.length === 0) return false;
  const ghg = byCategory.filter((row) => row.ghgNumber != null);
  if (ghg.length < GHG_CATEGORY_COUNT) return false;
  return ghg.every((row) => row.status === "verified" || row.status === "no_activity") &&
    ghg.every((row) => row.status === "verified"); // empty categories still incomplete for inventory claim
}

export function scope3CompletenessNote(byCategory: readonly Scope3CategoryCompleteness[]): string {
  const verified = byCategory.filter((row) => row.status === "verified").length;
  const unsupported = byCategory.filter(
    (row) => row.status === "unsupported" || row.status === "awaiting_factors",
  ).length;
  const empty = byCategory.filter((row) => row.status === "no_activity").length;
  return [
    SCOPE3_PARTIAL_INVENTORY_LABEL,
    `${verified} categor${verified === 1 ? "y" : "ies"} with verified activity.`,
    empty > 0 ? `${empty} supported categor${empty === 1 ? "y has" : "ies have"} no activity for this year.` : "",
    unsupported > 0 ? `${unsupported} categor${unsupported === 1 ? "y is" : "ies are"} unsupported or awaiting factors.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

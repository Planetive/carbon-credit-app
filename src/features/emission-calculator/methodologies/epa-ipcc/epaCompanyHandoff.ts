/**
 * Temporary guard. EPA calculator session totals are kilograms and are not a
 * complete company inventory. They must not be stored as company_emissions or
 * copied into questionnaire / financed-emissions fields.
 * Dividing by 1,000 is not a substitute for that inventory.
 */

export const EPA_COMPANY_INVENTORY_UNAVAILABLE = "unavailable" as const;

export const EPA_COMPANY_INVENTORY_MESSAGE =
  "Company-level emissions consolidation is not yet available. These calculator totals were not saved as company emissions and were not copied into finance or questionnaire records. Saved stationary activities are unchanged. You can keep editing this calculator.";

const SESSION_SCOPE_KEYS = [
  "scope1Emissions",
  "scope2Emissions",
  "scope3Emissions",
  "totalEmissions",
  "verified_emissions",
  "unverified_emissions",
] as const;

/**
 * Automatic calculator totals are applied only when this whole contract is present.
 * A unit string, a source name, or a partial marker is not enough.
 * No current calculator writes this contract.
 */
export const APPROVED_EMISSIONS_HANDOFF = {
  provenance: "rethink-carbon.emissions-handoff",
  contract: "wizard-scope-totals",
  contractVersion: 1,
  unit: "tCO2e",
} as const;

export const IGNORED_AUTOMATIC_EMISSIONS_NOTICE =
  "Automatic emissions copied from an earlier calculator session were ignored. They had no trusted provenance, no tCO2e unit contract, or an unapproved source. Review or re-enter those values with a supported method. Saved questionnaire answers were not replaced with zero.";

export type EpaCompanyHandoffDecision = {
  saveCompanySnapshot: false;
  wroteZero: false;
  navigateAway: false;
  message: string;
};

export function blockEpaCompanySnapshot(): EpaCompanyHandoffDecision {
  return {
    saveCompanySnapshot: false,
    wroteZero: false,
    navigateAway: false,
    message: EPA_COMPANY_INVENTORY_MESSAGE,
  };
}

export function isEpaCompanyInventoryBlocked(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  return (payload as Record<string, unknown>).epaCompanyInventory === EPA_COMPANY_INVENTORY_UNAVAILABLE;
}

/** Drop EPA session scope totals. Keep the rest of the wizard draft, including typed questionnaire fields. */
export function blockEpaWizardHandoff(state: unknown): Record<string, unknown> {
  const base =
    state && typeof state === "object" ? { ...(state as Record<string, unknown>) } : {};
  for (const key of SESSION_SCOPE_KEYS) {
    delete base[key];
  }
  base.epaCompanyInventory = EPA_COMPANY_INVENTORY_UNAVAILABLE;
  return base;
}

function payloadRecord(payload: unknown): Record<string, unknown> {
  return payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
}

/** True only for the exact approved provenance, contract, version, and tCO2e unit. */
export function hasTrustedEmissionsHandoff(payload: unknown): boolean {
  if (isEpaCompanyInventoryBlocked(payload)) return false;
  const handoff = payloadRecord(payload).emissionsHandoff;
  if (!handoff || typeof handoff !== "object") return false;
  const row = handoff as Record<string, unknown>;
  return (
    row.provenance === APPROVED_EMISSIONS_HANDOFF.provenance &&
    row.contract === APPROVED_EMISSIONS_HANDOFF.contract &&
    row.contractVersion === APPROVED_EMISSIONS_HANDOFF.contractVersion &&
    row.unit === APPROVED_EMISSIONS_HANDOFF.unit
  );
}

export function hasAutomaticScopeValues(payload: unknown): boolean {
  const row = payloadRecord(payload);
  return SESSION_SCOPE_KEYS.some((key) => typeof row[key] === "number");
}

export function hasUntrustedAutomaticEmissions(payload: unknown): boolean {
  return hasAutomaticScopeValues(payload) && !hasTrustedEmissionsHandoff(payload);
}

export function wizardShouldApplyResumeScopes(payload: unknown): boolean {
  if (!hasTrustedEmissionsHandoff(payload)) return false;
  const row = payloadRecord(payload);
  if (row.resumeAtCalculation !== true) return false;
  return hasAutomaticScopeValues(payload);
}

/** Remove untrusted automatic totals. Keep manual form fields and wizard navigation state. */
export function sanitizeUntrustedWizardSession(state: unknown): {
  state: Record<string, unknown>;
  ignoredAutomatic: boolean;
} {
  const base = payloadRecord(state);
  const copy = { ...base };
  if (!hasUntrustedAutomaticEmissions(copy)) {
    return { state: copy, ignoredAutomatic: false };
  }
  for (const key of SESSION_SCOPE_KEYS) {
    delete copy[key];
  }
  return { state: copy, ignoredAutomatic: true };
}

/** Saved questionnaire numbers stay as stored. Rejection does not turn them into zero. */
export function questionnaireScopeAfterHandoff(
  saved: number | null | undefined,
  payload: unknown
): number | null {
  if (hasUntrustedAutomaticEmissions(payload) || isEpaCompanyInventoryBlocked(payload)) {
    return typeof saved === "number" && Number.isFinite(saved) ? saved : null;
  }
  return typeof saved === "number" && Number.isFinite(saved) ? saved : null;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export type WizardScopeCarry = {
  scope1Emissions: number;
  scope2Emissions: number;
  scope3Emissions: number;
  verified_emissions: number;
  unverified_emissions: number;
};

/**
 * Choose scope fields when the finance wizard restores a session.
 * Untrusted automatic totals are ignored. Manual form values and the previous
 * draft are kept, and missing values are not replaced with zero.
 */
export function wizardScopesAfterResume(
  payload: unknown,
  formData: unknown,
  previous: WizardScopeCarry
): WizardScopeCarry & { blocked: boolean; ignoredAutomatic: boolean } {
  const form = formData && typeof formData === "object" ? (formData as Record<string, unknown>) : {};
  const row = payloadRecord(payload);
  const trusted = hasTrustedEmissionsHandoff(payload);
  if (!trusted) {
    return {
      blocked: isEpaCompanyInventoryBlocked(payload) || hasUntrustedAutomaticEmissions(payload),
      ignoredAutomatic: hasUntrustedAutomaticEmissions(payload),
      scope1Emissions: asNumber(form.scope1Emissions) ?? previous.scope1Emissions,
      scope2Emissions: asNumber(form.scope2Emissions) ?? previous.scope2Emissions,
      scope3Emissions: asNumber(form.scope3Emissions) ?? previous.scope3Emissions,
      verified_emissions: asNumber(form.verified_emissions) ?? previous.verified_emissions,
      unverified_emissions: asNumber(form.unverified_emissions) ?? previous.unverified_emissions,
    };
  }
  return {
    blocked: false,
    ignoredAutomatic: false,
    scope1Emissions: asNumber(row.scope1Emissions) ?? asNumber(form.scope1Emissions) ?? previous.scope1Emissions,
    scope2Emissions: asNumber(row.scope2Emissions) ?? asNumber(form.scope2Emissions) ?? previous.scope2Emissions,
    scope3Emissions: asNumber(row.scope3Emissions) ?? asNumber(form.scope3Emissions) ?? previous.scope3Emissions,
    verified_emissions:
      asNumber(row.verified_emissions) ?? asNumber(form.verified_emissions) ?? previous.verified_emissions,
    unverified_emissions:
      asNumber(row.unverified_emissions) ?? asNumber(form.unverified_emissions) ?? previous.unverified_emissions,
  };
}

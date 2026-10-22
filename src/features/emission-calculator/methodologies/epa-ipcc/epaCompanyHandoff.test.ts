import { describe, expect, it } from "vitest";
import {
  APPROVED_EMISSIONS_HANDOFF,
  blockEpaCompanySnapshot,
  blockEpaWizardHandoff,
  hasTrustedEmissionsHandoff,
  questionnaireScopeAfterHandoff,
  sanitizeUntrustedWizardSession,
  wizardScopesAfterResume,
  wizardShouldApplyResumeScopes,
} from "./epaCompanyHandoff";

const previous = {
  scope1Emissions: 12,
  scope2Emissions: 3,
  scope3Emissions: 1,
  verified_emissions: 16,
  unverified_emissions: 0,
};

describe("EPA company inventory handoff guard", () => {
  it("does not let kilogram session totals become questionnaire scope fields", () => {
    const handedOff = blockEpaWizardHandoff({
      mode: "finance",
      resumeAtCalculation: true,
      counterpartyId: "company-1",
      scope1Emissions: 5311.45,
      scope2Emissions: 400,
      scope3Emissions: 80,
      totalEmissions: 5791.45,
      verified_emissions: 5791.45,
      unverified_emissions: 0,
      formData: {
        counterpartyId: "company-1",
        scope1Emissions: 12,
        verifierName: "Kept",
      },
    });

    expect(handedOff.scope1Emissions).toBeUndefined();
    expect(handedOff.scope2Emissions).toBeUndefined();
    expect(handedOff.scope3Emissions).toBeUndefined();
    expect(handedOff.totalEmissions).toBeUndefined();
    expect(handedOff.verified_emissions).toBeUndefined();
    expect(handedOff.unverified_emissions).toBeUndefined();
    expect(wizardShouldApplyResumeScopes(handedOff)).toBe(false);
    expect(handedOff.formData).toMatchObject({ scope1Emissions: 12, verifierName: "Kept" });

    const restored = wizardScopesAfterResume(handedOff, handedOff.formData, previous);
    expect(restored.blocked).toBe(true);
    expect(restored.scope1Emissions).toBe(12);
    expect(restored.scope1Emissions).not.toBe(5311.45);
  });

  it("does not save an EPA session as a company snapshot or write zero", () => {
    const decision = blockEpaCompanySnapshot();
    expect(decision.saveCompanySnapshot).toBe(false);
    expect(decision.wroteZero).toBe(false);
    expect(decision.navigateAway).toBe(false);
    expect(decision).not.toHaveProperty("scope1Emissions");
    expect(JSON.stringify(decision)).not.toContain("5311.45");
    expect(decision.message).toMatch(/not yet available/i);
    expect(decision.message).toMatch(/not saved/i);
  });

  it("keeps a typed questionnaire value when the EPA payload has no replacement", () => {
    const restored = wizardScopesAfterResume(
      { epaCompanyInventory: "unavailable", resumeAtCalculation: true, scope1Emissions: 5311.45 },
      { scope1Emissions: 4.5 },
      previous
    );
    expect(restored.scope1Emissions).toBe(4.5);
    expect(restored.scope2Emissions).toBe(previous.scope2Emissions);
  });

  it("does not fill a blocked resume with zero when questionnaire fields are absent", () => {
    const restored = wizardScopesAfterResume(
      { epaCompanyInventory: "unavailable", scope1Emissions: 0, verified_emissions: 0 },
      {},
      previous
    );
    expect(restored.scope1Emissions).toBe(12);
    expect(restored.verified_emissions).toBe(16);
    expect(restored.scope1Emissions).not.toBe(0);
  });

  it("rejects an old automatic payload that has numbers but no approved contract", () => {
    const payload = {
      resumeAtCalculation: true,
      mode: "finance",
      counterpartyId: "company-1",
      scope1Emissions: 8,
      scope2Emissions: 2,
      scope3Emissions: 1,
      formData: { scope1Emissions: 99, counterpartyId: "company-1" },
    };
    expect(wizardShouldApplyResumeScopes(payload)).toBe(false);
    const restored = wizardScopesAfterResume(payload, payload.formData, previous);
    expect(restored.ignoredAutomatic).toBe(true);
    expect(restored.scope1Emissions).toBe(99);
    expect(restored.scope2Emissions).toBe(previous.scope2Emissions);
    expect(restored.scope1Emissions).not.toBe(8);
  });

  it("rejects an old EPA payload without a block flag", () => {
    const payload = {
      resumeAtCalculation: true,
      mode: "finance",
      counterpartyId: "company-1",
      scope1Emissions: 5311.45,
      scope2Emissions: 400,
      totalEmissions: 5711.45,
      verified_emissions: 5711.45,
      formData: { scope1Emissions: 12, verifierName: "Kept", counterpartyId: "company-1" },
    };
    expect(hasTrustedEmissionsHandoff(payload)).toBe(false);
    const restored = wizardScopesAfterResume(payload, payload.formData, previous);
    expect(restored.scope1Emissions).toBe(12);
    expect(restored.verified_emissions).toBe(previous.verified_emissions);
    expect(questionnaireScopeAfterHandoff(12, payload)).toBe(12);
    expect(questionnaireScopeAfterHandoff(12, payload)).not.toBe(0);
  });

  it("rejects kilogram emissions and a unit string without the approved contract", () => {
    const kilograms = {
      resumeAtCalculation: true,
      emissionsUnit: "kg",
      scope1Emissions: 5311.45,
      formData: { scope1Emissions: 4.5 },
    };
    const unitOnly = {
      resumeAtCalculation: true,
      source: "uk-calculator",
      emissionsUnit: "tCO2e",
      scope1Emissions: 8,
      formData: { scope1Emissions: 4.5 },
    };
    expect(wizardShouldApplyResumeScopes(kilograms)).toBe(false);
    expect(wizardShouldApplyResumeScopes(unitOnly)).toBe(false);
    expect(wizardScopesAfterResume(kilograms, kilograms.formData, previous).scope1Emissions).toBe(4.5);
    expect(wizardScopesAfterResume(unitOnly, unitOnly.formData, previous).scope1Emissions).toBe(4.5);
  });

  it("rejects a forged or incomplete provenance marker", () => {
    const incomplete = {
      resumeAtCalculation: true,
      emissionsHandoff: {
        provenance: APPROVED_EMISSIONS_HANDOFF.provenance,
        unit: "tCO2e",
      },
      scope1Emissions: 5311.45,
      formData: { scope1Emissions: 12 },
    };
    const wrongVersion = {
      resumeAtCalculation: true,
      emissionsHandoff: {
        ...APPROVED_EMISSIONS_HANDOFF,
        contractVersion: "1",
      },
      scope1Emissions: 5311.45,
    };
    const wrongUnit = {
      resumeAtCalculation: true,
      emissionsHandoff: { ...APPROVED_EMISSIONS_HANDOFF, unit: "kg" },
      scope1Emissions: 5311.45,
    };
    expect(hasTrustedEmissionsHandoff(incomplete)).toBe(false);
    expect(hasTrustedEmissionsHandoff(wrongVersion)).toBe(false);
    expect(hasTrustedEmissionsHandoff(wrongUnit)).toBe(false);
    expect(wizardScopesAfterResume(incomplete, incomplete.formData, previous).scope1Emissions).toBe(12);
    expect(wizardScopesAfterResume(wrongVersion, {}, previous).scope1Emissions).toBe(previous.scope1Emissions);
  });

  it("does not restore rejected values on a second read", () => {
    const oldPayload = {
      resumeAtCalculation: true,
      mode: "facilitated",
      counterpartyId: "company-1",
      scope1Emissions: 5311.45,
      verified_emissions: 0,
      formData: { corporateStructure: "listed", counterpartyId: "company-1" },
    };
    const first = sanitizeUntrustedWizardSession(oldPayload);
    const second = sanitizeUntrustedWizardSession(first.state);
    expect(first.ignoredAutomatic).toBe(true);
    expect(first.state.scope1Emissions).toBeUndefined();
    expect(first.state.verified_emissions).toBeUndefined();
    expect(first.state.counterpartyId).toBe("company-1");
    expect(first.state.formData).toMatchObject({ corporateStructure: "listed" });
    expect(second.ignoredAutomatic).toBe(false);
    expect(wizardShouldApplyResumeScopes(second.state)).toBe(false);
    expect(wizardScopesAfterResume(second.state, second.state.formData, previous).scope1Emissions).toBe(12);
  });

  it("keeps the EPA block even if a contract object is attached", () => {
    const payload = {
      epaCompanyInventory: "unavailable",
      resumeAtCalculation: true,
      emissionsHandoff: { ...APPROVED_EMISSIONS_HANDOFF },
      scope1Emissions: 5311.45,
      formData: { scope1Emissions: 4.5 },
    };
    expect(hasTrustedEmissionsHandoff(payload)).toBe(false);
    expect(wizardShouldApplyResumeScopes(payload)).toBe(false);
    expect(wizardScopesAfterResume(payload, payload.formData, previous).scope1Emissions).toBe(4.5);
  });
});

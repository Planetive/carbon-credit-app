/**
 * Phase 3B: FastAPI is the only authoritative PCAF calculator for reportable saves.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/client";
import { FACILITATED_EMISSION_FORMULAS } from "../config/facilitatedEmissionFormulaConfigs";

const runtime = vi.hoisted(() => ({
  jwt: true,
  url: "http://127.0.0.1:8000",
}));

const calculateFinancedEmission = vi.hoisted(() => vi.fn());

vi.mock("@/api/config", () => ({
  get USE_JWT_AUTH() {
    return runtime.jwt;
  },
  get BACKEND_URL() {
    return runtime.url;
  },
  isJwtAuthEnabled() {
    return runtime.jwt;
  },
  ACCESS_TOKEN_KEY: "rc_access_token",
  getAccessToken() {
    return null;
  },
  setAccessToken() {
    return undefined;
  },
}));

vi.mock("@/api/financed", () => ({
  calculateFinancedEmission,
}));

import { resolveFinancedCalculation } from "@/api/financedConnection";
import {
  FASTAPI_CONFIG_MESSAGE,
  PCAF_EMISSIONS_UNIT,
  PcafAuthorityError,
  assertCurrentFingerprint,
  assertReportableResults,
  financeWizardInputSignature,
  fingerprintPcafInputs,
  isBackendCalculationAvailable,
  isReportablePcafResult,
  pcafCompanyTypeFromStructure,
  requestAuthoritativePcafCalculation,
  validateAuthoritativePcafResult,
} from "./pcafAuthority";

const FORMULA_ID = "1a-listed-equity";

function steps() {
  return [{ step: "Attribution", value: 0.5, formula: "outstanding / EVIC" }];
}

function rawResult(overrides: Record<string, unknown> = {}) {
  return {
    attribution_factor: 0.5,
    financed_emissions: 100,
    data_quality_score: 1,
    methodology: "Option 1a - Verified GHG emissions",
    calculation_steps: steps(),
    emissions_unit: "tCO2e",
    metadata: { formula_id: FORMULA_ID, emissions_unit: "tCO2e", option_code: "1a" },
    ...overrides,
  };
}

function apiOk(resultOverrides: Record<string, unknown> = {}) {
  return { success: true, result: rawResult(resultOverrides) };
}

describe("Phase 3B API response validation", () => {
  it("accepts finite backend values, tCO2e, methodology, and matching formula identity", () => {
    const validated = validateAuthoritativePcafResult(rawResult(), {
      formulaId: FORMULA_ID,
      fingerprint: "fp-1",
    });
    expect(validated.authority).toBe("backend");
    expect(validated.emissionsUnit).toBe(PCAF_EMISSIONS_UNIT);
    expect(validated.financedEmissions).toBe(100);
    expect(validated.formulaId).toBe(FORMULA_ID);
  });

  it("accepts a valid zero-emissions result", () => {
    const validated = validateAuthoritativePcafResult(rawResult({ financed_emissions: 0 }), {
      formulaId: FORMULA_ID,
      fingerprint: "fp-zero",
    });
    expect(validated.financedEmissions).toBe(0);
    expect(isReportablePcafResult(validated)).toBe(true);
  });

  it("rejects HTTP-shaped success that is missing required fields", () => {
    expect(() =>
      validateAuthoritativePcafResult(
        { financed_emissions: 1, metadata: { formula_id: FORMULA_ID } },
        { formulaId: FORMULA_ID, fingerprint: "fp" }
      )
    ).toThrow(PcafAuthorityError);
  });

  it("rejects a formula_id mismatch", () => {
    expect(() =>
      validateAuthoritativePcafResult(rawResult(), {
        formulaId: "2a-listed-equity",
        fingerprint: "fp",
      })
    ).toThrow(/does not match formula/i);
  });

  it("rejects non-tCO2e units", () => {
    expect(() =>
      validateAuthoritativePcafResult(rawResult({ emissions_unit: "kgCO2e" }), {
        formulaId: FORMULA_ID,
        fingerprint: "fp",
      })
    ).toThrow(/kgCO2e/i);
  });

  it("rejects non-finite financed emissions instead of converting them to zero", () => {
    expect(() =>
      validateAuthoritativePcafResult(rawResult({ financed_emissions: Number.NaN }), {
        formulaId: FORMULA_ID,
        fingerprint: "fp",
      })
    ).toThrow(/non-finite financed emissions/i);
  });

  it("rejects an out-of-range data-quality score", () => {
    expect(() =>
      validateAuthoritativePcafResult(rawResult({ data_quality_score: 6 }), {
        formulaId: FORMULA_ID,
        fingerprint: "fp",
      })
    ).toThrow(/data-quality score/i);
  });
});

describe("Phase 3B authoritative request workflows", () => {
  beforeEach(() => {
    runtime.jwt = true;
    runtime.url = "http://127.0.0.1:8000";
    calculateFinancedEmission.mockReset();
  });

  it("1. uses a validated backend payload when the API succeeds", async () => {
    calculateFinancedEmission.mockResolvedValue(apiOk());
    const result = await requestAuthoritativePcafCalculation({
      formula_id: FORMULA_ID,
      company_type: "listed",
      inputs: { outstanding_amount: 1_000_000, verified_emissions: 200 },
    });
    expect(result.authority).toBe("backend");
    expect(result.financedEmissions).toBe(100);
    expect(calculateFinancedEmission).toHaveBeenCalledTimes(1);
  });

  it("2. maps a backend validation error without falling back locally", async () => {
    calculateFinancedEmission.mockRejectedValue(
      new ApiError("EVIC denominator must be greater than 0.", 400)
    );
    await expect(
      requestAuthoritativePcafCalculation({
        formula_id: FORMULA_ID,
        company_type: "listed",
        inputs: { outstanding_amount: 1 },
      })
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("3. maps an unavailable API without substituting local math", async () => {
    calculateFinancedEmission.mockRejectedValue(new ApiError("Failed to fetch", 0));
    await expect(
      requestAuthoritativePcafCalculation({
        formula_id: FORMULA_ID,
        company_type: "listed",
        inputs: { outstanding_amount: 1 },
      })
    ).rejects.toMatchObject({ code: "UNAVAILABLE" });
  });

  it("4. rejects an unsupported formula option with a clear message", async () => {
    calculateFinancedEmission.mockRejectedValue(
      new ApiError("Formula '3b-listed-equity' not found", 400)
    );
    await expect(
      requestAuthoritativePcafCalculation({
        formula_id: "3b-listed-equity",
        company_type: "listed",
        inputs: {},
      })
    ).rejects.toMatchObject({
      code: "UNSUPPORTED",
      message: expect.stringMatching(/not found/i),
    });
  });

  it("5. maps a missing or zero denominator as validation, not zero emissions", async () => {
    calculateFinancedEmission.mockRejectedValue(
      new ApiError("Denominator must be greater than zero.", 400)
    );
    const err = await requestAuthoritativePcafCalculation({
      formula_id: FORMULA_ID,
      company_type: "listed",
      inputs: { outstanding_amount: 100, verified_emissions: 10 },
    }).catch((error) => error);
    expect(err).toBeInstanceOf(PcafAuthorityError);
    expect(err.code).toBe("VALIDATION");
    expect(err.message).not.toMatch(/^0$/);
  });

  it("6. maps a missing emission factor", async () => {
    calculateFinancedEmission.mockRejectedValue(
      new ApiError("Emission factor is required for Option 2a.", 400)
    );
    await expect(
      requestAuthoritativePcafCalculation({
        formula_id: "2a-listed-equity",
        company_type: "listed",
        inputs: { energy_consumption: 10 },
      })
    ).rejects.toMatchObject({ code: "MISSING_FACTOR" });
  });

  it("7. keeps a successful zero-emissions backend result reportable", async () => {
    calculateFinancedEmission.mockResolvedValue(apiOk({ financed_emissions: 0 }));
    const result = await requestAuthoritativePcafCalculation({
      formula_id: FORMULA_ID,
      company_type: "listed",
      inputs: { outstanding_amount: 1_000_000, verified_emissions: 0 },
    });
    expect(result.financedEmissions).toBe(0);
    expect(isReportablePcafResult(result)).toBe(true);
  });

  it("8. matches frontend and backend Option 2a facilitated process-emission math", async () => {
    const formula = FACILITATED_EMISSION_FORMULAS.find(
      (item) => item.id === "2a-facilitated-energy-listed"
    );
    expect(formula).toBeDefined();
    const inputs = {
      facilitated_amount: 500_000,
      weighting_factor: 0.33,
      energy_consumption: 1_000,
      emission_factor: 0.4,
      process_emissions: 25,
      sharePrice: 10,
      outstandingShares: 100_000,
      totalDebt: 2_000_000,
      minorityInterest: 0,
      preferredStock: 0,
    };
    const local = formula!.calculate(inputs, "listed");
    const expected = (1 / 6) * 0.33 * (1_000 * 0.4 + 25);
    expect(local.financedEmissions).toBeCloseTo(expected, 8);
    calculateFinancedEmission.mockResolvedValue(
      apiOk({
        attribution_factor: local.attributionFactor,
        financed_emissions: local.financedEmissions,
        data_quality_score: 2,
        methodology: local.methodology,
        metadata: {
          formula_id: "2a-facilitated-energy-listed",
          emissions_unit: "tCO2e",
        },
      })
    );
    const backend = await requestAuthoritativePcafCalculation({
      calc_kind: "facilitated",
      formula_id: "2a-facilitated-energy-listed",
      company_type: "listed",
      inputs,
    });
    expect(backend.financedEmissions).toBeCloseTo(local.financedEmissions, 8);
    expect(backend.financedEmissions).not.toBeCloseTo(
      (1 / 6) * 0.33 * (1_000 * 0.4) + 25,
      8
    );
  });

  it("9. treats two loans with the same formula as independently reportable", async () => {
    calculateFinancedEmission
      .mockResolvedValueOnce(apiOk({ financed_emissions: 10 }))
      .mockResolvedValueOnce(apiOk({ financed_emissions: 20 }));
    const first = await requestAuthoritativePcafCalculation({
      formula_id: FORMULA_ID,
      company_type: "listed",
      inputs: { outstanding_amount: 100, verified_emissions: 50, financing_instance_id: "loan-a" },
    });
    const second = await requestAuthoritativePcafCalculation({
      formula_id: FORMULA_ID,
      company_type: "listed",
      inputs: { outstanding_amount: 200, verified_emissions: 50, financing_instance_id: "loan-b" },
    });
    expect(first.inputFingerprint).not.toBe(second.inputFingerprint);
    expect(() => assertReportableResults([first, second])).not.toThrow();
  });

  it("10. blocks save after a calculation failure, including preview rows", async () => {
    expect(() => assertReportableResults([])).toThrow(PcafAuthorityError);
    expect(() =>
      assertReportableResults([{ authority: "preview", financedEmissions: 99 }])
    ).toThrow(/FastAPI-validated/i);
    expect(isReportablePcafResult({ authority: "preview" })).toBe(false);
  });

  it("11. recovers after a failed request when the next backend response is valid", async () => {
    calculateFinancedEmission
      .mockRejectedValueOnce(new ApiError("Failed to fetch", 0))
      .mockResolvedValueOnce(apiOk({ financed_emissions: 44 }));
    await expect(
      requestAuthoritativePcafCalculation({
        formula_id: FORMULA_ID,
        company_type: "listed",
        inputs: { outstanding_amount: 1 },
      })
    ).rejects.toMatchObject({ code: "UNAVAILABLE" });
    const recovered = await requestAuthoritativePcafCalculation({
      formula_id: FORMULA_ID,
      company_type: "listed",
      inputs: { outstanding_amount: 1 },
    });
    expect(recovered.financedEmissions).toBe(44);
  });

  it("maps questionnaire corporate structure onto PCAF company_type", () => {
    expect(pcafCompanyTypeFromStructure("listed")).toBe("listed");
    expect(pcafCompanyTypeFromStructure("unlisted")).toBe("private");
    expect(pcafCompanyTypeFromStructure("private")).toBe("private");
    expect(pcafCompanyTypeFromStructure("")).toBe("private");
    expect(pcafCompanyTypeFromStructure(undefined)).toBe("private");
  });

  it("treats cloned calculator state as the same input snapshot", () => {
    const formData = {
      outstandingLoan: 100_000_000,
      totalEquity: 200_000_000,
      totalDebt: 300_000_000,
    };
    const properties = [{ id: "1", propertyValueAtOrigination: 0 }];
    const snapshot = {
      formData,
      selectedFormula: "1a-unlisted-equity",
      currentLoanIndex: 0,
      properties,
      commercialProperties: [],
      sharedCompanyData: { totalDebt: 0 },
      perLoanFormData: {},
      companyType: "private",
    };
    expect(financeWizardInputSignature(snapshot)).toBe(
      financeWizardInputSignature({
        ...snapshot,
        formData: { ...formData },
        properties: properties.map((row) => ({ ...row })),
        commercialProperties: [],
        sharedCompanyData: { totalDebt: 0 },
        perLoanFormData: {},
      })
    );
    expect(financeWizardInputSignature(snapshot)).not.toBe(
      financeWizardInputSignature({
        ...snapshot,
        formData: { ...formData, outstandingLoan: 1 },
      })
    );
  });

  it("12. rejects a stale calculation fingerprint after inputs change", async () => {
    const inputs = { outstanding_amount: 100, verified_emissions: 10 };
    const original = fingerprintPcafInputs(FORMULA_ID, inputs);
    expect(() =>
      assertCurrentFingerprint(original, fingerprintPcafInputs(FORMULA_ID, { ...inputs, verified_emissions: 99 }))
    ).toThrow(/Inputs changed/i);
    calculateFinancedEmission.mockResolvedValue(apiOk());
    await expect(
      requestAuthoritativePcafCalculation({
        formula_id: FORMULA_ID,
        company_type: "listed",
        inputs,
        currentFingerprint: fingerprintPcafInputs(FORMULA_ID, { ...inputs, verified_emissions: 99 }),
      })
    ).rejects.toMatchObject({ code: "STALE" });
  });

  it("13. requires matching formula identity and tCO2e even on HTTP 200", async () => {
    calculateFinancedEmission.mockResolvedValue({
      success: true,
      result: rawResult({ emissions_unit: "kgCO2e", metadata: { formula_id: FORMULA_ID } }),
    });
    await expect(
      requestAuthoritativePcafCalculation({
        formula_id: FORMULA_ID,
        company_type: "listed",
        inputs: { outstanding_amount: 1 },
      })
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });

    calculateFinancedEmission.mockResolvedValue({ success: false, result: rawResult() });
    await expect(
      requestAuthoritativePcafCalculation({
        formula_id: FORMULA_ID,
        company_type: "listed",
        inputs: { outstanding_amount: 1 },
      })
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("14. explains JWT + FastAPI configuration instead of restoring a local fallback", async () => {
    runtime.jwt = false;
    expect(isBackendCalculationAvailable()).toBe(false);
    await expect(
      requestAuthoritativePcafCalculation({
        formula_id: FORMULA_ID,
        company_type: "listed",
        inputs: { outstanding_amount: 1 },
      })
    ).rejects.toMatchObject({
      code: "CONFIG",
      message: FASTAPI_CONFIG_MESSAGE,
    });

    runtime.jwt = true;
    runtime.url = "";
    expect(isBackendCalculationAvailable()).toBe(false);
    await expect(
      resolveFinancedCalculation({
        formula_id: FORMULA_ID,
        company_type: "listed",
        inputs: { outstanding_amount: 1 },
        local: {
          attributionFactor: 9,
          financedEmissions: 9,
          dataQualityScore: 1,
          methodology: "local",
        },
      })
    ).rejects.toMatchObject({ code: "CONFIG" });
  });

  it("never applies a local fallback payload when FastAPI is available", async () => {
    calculateFinancedEmission.mockResolvedValue(apiOk({ financed_emissions: 12 }));
    const confirmed = await resolveFinancedCalculation({
      formula_id: FORMULA_ID,
      company_type: "listed",
      inputs: { outstanding_amount: 1 },
      local: {
        attributionFactor: 0.1,
        financedEmissions: 9999,
        dataQualityScore: 5,
        methodology: "local preview",
      },
    });
    expect(confirmed.authority).toBe("backend");
    expect(confirmed.financedEmissions).toBe(12);
  });

  it("resolveFinancedCalculation requests finance calculations with persist false", async () => {
    calculateFinancedEmission.mockResolvedValue(apiOk({ financed_emissions: 7 }));
    const result = await resolveFinancedCalculation({
      calc_kind: "finance",
      formula_id: FORMULA_ID,
      company_type: "listed",
      inputs: { outstanding_amount: 1, verified_emissions: 2 },
    });
    expect(result.authority).toBe("backend");
    expect(result.financedEmissions).toBe(7);
    expect(calculateFinancedEmission).toHaveBeenCalledWith(
      expect.objectContaining({
        calc_kind: "finance",
        formula_id: FORMULA_ID,
        persist: false,
      })
    );
  });
});

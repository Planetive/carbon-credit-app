/**
 * Phase 3A documented sample inputs — keep identical to
 * carbon-credit-backend/tests/fixtures/pcaf_phase3a_parity.json
 *
 * Expected values are independently computed from PCAF 2nd edition (Dec 2022).
 * Matching backend output is not treated as proof of PCAF compliance.
 */
import { describe, expect, it } from "vitest";
import { CalculationEngine } from "../engines/CalculationEngine";
import { LISTED_EQUITY_FORMULAS } from "./corporateBondAndBusinessLoanFormulaConfigs";
import { PROJECT_FINANCE_FORMULAS } from "./projectFinanceFormulaConfigs";
import { FACILITATED_EMISSION_FORMULAS } from "./facilitatedEmissionFormulaConfigs";
import { MORTGAGE_FORMULAS } from "./mortgageFormulaConfigs";
import { COMMERCIAL_REAL_ESTATE_FORMULAS } from "./commercialRealEstateFormulaConfigs";
import { MOTOR_VEHICLE_LOAN_FORMULAS } from "./motorVehicleLoanFormulaConfigs";
import { SOVEREIGN_DEBT_FORMULAS } from "./sovereignDebtFormulaConfigs";

const SAMPLE: Record<string, number | string> = {
  outstanding_amount: 1_000_000,
  outstandingLoan: 1_000_000,
  sharePrice: 10,
  share_price: 10,
  outstandingShares: 100_000,
  outstanding_shares: 100_000,
  totalDebt: 2_000_000,
  total_debt: 2_000_000,
  totalEquity: 3_000_000,
  total_equity: 3_000_000,
  minorityInterest: 0,
  minority_interest: 0,
  preferredStock: 0,
  preferred_stock: 0,
  totalProjectEquity: 4_000_000,
  total_project_equity: 4_000_000,
  totalProjectDebt: 6_000_000,
  total_project_debt: 6_000_000,
  total_assets: 10_000_000,
  totalAssets: 10_000_000,
  verified_emissions: 50_000,
  unverified_emissions: 60_000,
  energy_consumption: 1_000,
  emission_factor: 0.4,
  production_emission_factor: 0.4,
  process_emissions: 10,
  production: 500,
  company_revenue: 8_000_000,
  companyRevenue: 8_000_000,
  sector_intensity: 0.5,
  sectorIntensity: 0.5,
  sector_intensity_unit: "kgCO2e/PKR",
  sectorIntensityUnit: "kgCO2e/PKR",
  asset_turnover_ratio: 0.8,
  assetTurnoverRatio: 0.8,
  facilitated_amount: 500_000,
  facilitatedAmount: 500_000,
  weighting_factor: 0.33,
  weightingFactor: 0.33,
  evic: 3_000_000,
  total_equity_plus_debt: 5_000_000,
  totalEquityPlusDebt: 5_000_000,
  total_project_equity_plus_debt: 10_000_000,
  totalProjectEquityPlusDebt: 10_000_000,
};

const EQUITY_PROJECT_CASES: Array<{
  id: string;
  companyType: "listed" | "private";
  attr: number;
  emissions: number;
  score: number;
  process: boolean;
}> = [
  { id: "1a-listed-equity", companyType: "listed", attr: 1 / 3, emissions: 50_000 / 3, score: 1, process: false },
  { id: "1b-listed-equity", companyType: "listed", attr: 1 / 3, emissions: 20_000, score: 2, process: false },
  { id: "2a-listed-equity", companyType: "listed", attr: 1 / 3, emissions: 410 / 3, score: 2, process: true },
  { id: "2b-listed-equity", companyType: "listed", attr: 1 / 3, emissions: 200 / 3, score: 3, process: false },
  { id: "3a-listed-equity", companyType: "listed", attr: 1 / 3, emissions: 4_000 / 3, score: 4, process: false },
  { id: "3c-listed-equity", companyType: "listed", attr: 1, emissions: 400, score: 5, process: false },
  { id: "1a-unlisted-equity", companyType: "private", attr: 0.2, emissions: 10_000, score: 1, process: false },
  { id: "1b-unlisted-equity", companyType: "private", attr: 0.2, emissions: 12_000, score: 2, process: false },
  { id: "2a-unlisted-equity", companyType: "private", attr: 0.2, emissions: 82, score: 2, process: true },
  { id: "2b-unlisted-equity", companyType: "private", attr: 0.2, emissions: 40, score: 3, process: false },
  { id: "3a-unlisted-equity", companyType: "private", attr: 0.2, emissions: 800, score: 4, process: false },
  { id: "3c-unlisted-equity", companyType: "private", attr: 1, emissions: 400, score: 5, process: false },
  { id: "1a-project-finance", companyType: "private", attr: 0.1, emissions: 5_000, score: 1, process: false },
  { id: "1b-project-finance", companyType: "private", attr: 0.1, emissions: 6_000, score: 2, process: false },
  { id: "2a-project-finance", companyType: "private", attr: 0.1, emissions: 41, score: 2, process: true },
  { id: "2b-project-finance", companyType: "private", attr: 0.1, emissions: 20, score: 3, process: false },
  { id: "3a-project-finance", companyType: "private", attr: 0.1, emissions: 400, score: 4, process: false },
  { id: "3c-project-finance", companyType: "private", attr: 1, emissions: 400, score: 5, process: false },
];

const FACILITATED_CASES: Array<{
  id: string;
  companyType: "listed" | "private";
  attr: number;
  emissions: number;
  score: number;
}> = [
  { id: "1a-facilitated-verified-listed", companyType: "listed", attr: 1 / 6, emissions: 2_750, score: 1 },
  { id: "1a-facilitated-verified-unlisted", companyType: "private", attr: 0.1, emissions: 1_650, score: 1 },
  { id: "1b-facilitated-unverified-listed", companyType: "listed", attr: 1 / 6, emissions: 3_300, score: 2 },
  { id: "1b-facilitated-unverified-unlisted", companyType: "private", attr: 0.1, emissions: 1_980, score: 2 },
  { id: "2a-facilitated-energy-listed", companyType: "listed", attr: 1 / 6, emissions: 22, score: 2 },
  { id: "2a-facilitated-energy-unlisted", companyType: "private", attr: 0.1, emissions: 13.2, score: 2 },
  { id: "2b-facilitated-production-listed", companyType: "listed", attr: 1 / 6, emissions: 11, score: 3 },
  { id: "2b-facilitated-production-unlisted", companyType: "private", attr: 0.1, emissions: 6.6, score: 3 },
  { id: "3a-facilitated-revenue-listed", companyType: "listed", attr: 1 / 6, emissions: 220, score: 4 },
  { id: "3a-facilitated-revenue-unlisted", companyType: "private", attr: 0.1, emissions: 132, score: 4 },
  { id: "3c-facilitated-atr-listed", companyType: "listed", attr: 1, emissions: 66, score: 5 },
  { id: "3c-facilitated-atr-unlisted", companyType: "private", attr: 1, emissions: 66, score: 5 },
];

const ALL_FORMULAS = [
  ...LISTED_EQUITY_FORMULAS,
  ...PROJECT_FINANCE_FORMULAS,
  ...FACILITATED_EMISSION_FORMULAS,
  ...MORTGAGE_FORMULAS,
  ...COMMERCIAL_REAL_ESTATE_FORMULAS,
  ...MOTOR_VEHICLE_LOAN_FORMULAS,
  ...SOVEREIGN_DEBT_FORMULAS,
];

function inputsFor(process: boolean): Record<string, unknown> {
  return { ...SAMPLE, process_emissions: process ? 10 : 0 };
}

function formulaById(id: string) {
  return ALL_FORMULAS.find((f) => f.id === id);
}

describe("Phase 3A PCAF formula inventory", () => {
  it("registers every existing asset-class option with PCAF data-quality scores", () => {
    const scores: Record<string, Record<string, number>> = {};
    for (const formula of ALL_FORMULAS) {
      scores[formula.category] ??= {};
      scores[formula.category][formula.optionCode] = formula.dataQualityScore;
    }
    expect(scores.listed_equity).toEqual({ "1a": 1, "1b": 2, "2a": 2, "2b": 3, "3a": 4, "3c": 5 });
    expect(scores.project_finance).toEqual({ "1a": 1, "1b": 2, "2a": 2, "2b": 3, "3a": 4, "3c": 5 });
    expect(scores.facilitated_emission).toEqual({ "1a": 1, "1b": 2, "2a": 2, "2b": 3, "3a": 4, "3c": 5 });
    expect(scores.mortgage).toEqual({ "1a": 1, "1b": 2, "2a": 3, "2b": 4, "3": 5 });
    expect(scores.commercial_real_estate).toEqual({ "1a": 1, "1b": 2, "2a": 3, "2b": 4, "3": 5 });
    expect(scores.motor_vehicle_loan).toEqual({ "1a": 1, "1b": 1, "2a": 2, "2b": 3, "3a": 4, "3b": 5 });
    expect(scores["sovereign-debt"]).toEqual({ "1a": 1, "1b": 2, "2a": 3, "3a": 4, "3b": 5 });
  });

  it("does not implement Option 3b for equity, project finance, or facilitated", () => {
    expect(ALL_FORMULAS.filter((f) => f.optionCode === "3b").map((f) => f.category).sort()).toEqual([
      "motor_vehicle_loan",
      "sovereign-debt",
    ]);
  });
});

describe("Phase 3A equity / project finance formula parity", () => {
  it.each(EQUITY_PROJECT_CASES)("$id", ({ id, companyType, attr, emissions, score, process }) => {
    const formula = formulaById(id);
    expect(formula).toBeDefined();
    const result = formula!.calculate(inputsFor(process), companyType);
    expect(result.attributionFactor).toBeCloseTo(attr, 8);
    expect(result.financedEmissions).toBeCloseTo(emissions, 8);
    expect(result.dataQualityScore).toBe(score);
  });
});

describe("Phase 3A facilitated formula parity", () => {
  it.each(FACILITATED_CASES)("$id", ({ id, companyType, attr, emissions, score }) => {
    const formula = formulaById(id);
    expect(formula).toBeDefined();
    const result = formula!.calculate(inputsFor(false), companyType);
    expect(result.attributionFactor).toBeCloseTo(attr, 8);
    expect(result.financedEmissions).toBeCloseTo(emissions, 8);
    expect(result.dataQualityScore).toBe(score);
  });
});

describe("Phase 3A validation and units", () => {
  const engine = new CalculationEngine();

  it("converts kgCO2e sector intensity to tCO2e", () => {
    const kg = formulaById("3a-listed-equity")!.calculate(inputsFor(false), "listed");
    const tonnes = formulaById("3a-listed-equity")!.calculate(
      { ...inputsFor(false), sector_intensity: 0.0005, sector_intensity_unit: "tCO2e/PKR" },
      "listed"
    );
    expect(kg.financedEmissions).toBeCloseTo(tonnes.financedEmissions, 8);
    expect(kg.financedEmissions).toBeCloseTo(4_000 / 3, 8);
  });

  it("returns zero financed emissions when verified emissions are zero", () => {
    const result = formulaById("1a-listed-equity")!.calculate(
      { ...inputsFor(false), verified_emissions: 0 },
      "listed"
    );
    expect(result.financedEmissions).toBe(0);
    expect(result.attributionFactor).toBeCloseTo(1 / 3, 8);
  });

  it("returns zero on a missing EVIC denominator (frontend fallback; backend rejects)", () => {
    const result = formulaById("1a-listed-equity")!.calculate(
      {
        outstanding_amount: 1000,
        verified_emissions: 50,
        sharePrice: 0,
        outstandingShares: 0,
        totalDebt: 0,
        minorityInterest: 0,
        preferredStock: 0,
      },
      "listed"
    );
    expect(result.financedEmissions).toBe(0);
    expect(result.attributionFactor).toBe(0);
  });

  it("rejects unsupported option codes", () => {
    expect(() => engine.calculate("3b-listed-equity", SAMPLE, "listed")).toThrow(/not found/i);
  });

  it("rejects invalid negative outstanding amount", () => {
    expect(() =>
      engine.calculate("1a-listed-equity", { ...inputsFor(false), outstanding_amount: -1 }, "listed")
    ).toThrow(/Validation failed/i);
  });
});

describe("Phase 3B facilitated Option 2a process emissions", () => {
  it("attributes energy plus process emissions, then applies the weighting factor", () => {
    const formula = formulaById("2a-facilitated-energy-listed");
    expect(formula).toBeDefined();
    const result = formula!.calculate(inputsFor(true), "listed");
    const attribution = 1 / 6;
    const weighting = 0.33;
    const energyPlusProcess = 1_000 * 0.4 + 10;
    expect(result.attributionFactor).toBeCloseTo(attribution, 8);
    expect(result.financedEmissions).toBeCloseTo(
      attribution * weighting * energyPlusProcess,
      8
    );
    expect(result.financedEmissions).not.toBeCloseTo(
      attribution * weighting * (1_000 * 0.4) + 10,
      8
    );
  });

  it("attributes unlisted Option 2a process emissions the same way", () => {
    const formula = formulaById("2a-facilitated-energy-unlisted");
    expect(formula).toBeDefined();
    const result = formula!.calculate(inputsFor(true), "private");
    expect(result.financedEmissions).toBeCloseTo(0.1 * 0.33 * 410, 8);
  });
});

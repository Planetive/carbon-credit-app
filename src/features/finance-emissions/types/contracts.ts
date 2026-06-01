export type FinanceMode = "finance" | "facilitated";

export type EmissionResultRow = {
  type: string;
  label: string;
  attributionFactor: number;
  financedEmissions: number;
  denominatorLabel: string;
  denominatorValue: number;
  dataQualityScore?: number;
};

export type CalculationStepDto = {
  step: string;
  value: number;
  formula: string;
};

export type FacilitatedCalculationResult = {
  attributionFactor: number;
  facilitatedEmission: number;
  evic?: number;
  totalEquityPlusDebt?: number;
  dataQualityScore?: number;
  methodology?: string;
  calculationSteps?: CalculationStepDto[];
};

export type WizardLocationState = {
  mode?: FinanceMode;
  counterpartyId?: string;
  counterparty?: string;
  id?: string;
  startFresh?: boolean;
  returnUrl?: string;
  company?: unknown;
  [key: string]: unknown;
};

export type WizardResumePayload = {
  mode?: FinanceMode;
  resumeAtCalculation?: boolean;
  counterpartyId?: string;
  scope1Emissions?: number;
  scope2Emissions?: number;
  scope3Emissions?: number;
  formData?: Record<string, unknown>;
};

export type FinanceFormValue = string | number | boolean | null | undefined;
export type FinanceFormData = Record<string, FinanceFormValue>;

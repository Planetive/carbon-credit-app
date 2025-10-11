// Core types for PCAF formula system
export interface FormulaInput {
  name: string;
  label: string;
  type: 'number' | 'text' | 'select';
  required: boolean;
  unit?: string;
  description?: string;
  options?: { value: string; label: string }[];
  unitOptions?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface FormulaConfig {
  id: string;
  name: string;
  description: string;
  category: 'listed_equity' | 'business_loans' | 'project_finance' | 'mortgage' | 'sovereign-debt' | 'motor_vehicle_loan' | 'commercial_real_estate' | 'facilitated_emission';
  optionCode: string; // '1a', '1b', '2a', etc.
  dataQualityScore: number; // 1-5, where 1 is best
  inputs: FormulaInput[];
  calculate: (inputs: Record<string, any>, companyType: 'listed' | 'private') => CalculationResult;
  applicableScopes?: ('scope1' | 'scope2' | 'scope3')[];
  notes?: string[];
  metadata?: {
    companyType?: string;
    optionCode?: string;
    category?: string;
    formula?: string;
    [key: string]: any;
  };
}

export interface CalculationResult {
  attributionFactor: number;
  emissionFactor: number;
  financedEmissions: number;
  dataQualityScore: number;
  methodology: string;
  calculationSteps: {
    step: string;
    value: number;
    formula: string;
  }[];
  metadata?: Record<string, any>;
}

export interface CompanyData {
  type: 'listed' | 'private';
  outstandingAmount: number;
  evic?: number; // For listed companies
  totalEquity?: number; // For private companies
  totalDebt?: number; // For private companies
  revenue?: number;
  assets?: number;
  assetTurnoverRatio?: number;
  sector?: string;
}

export interface FormulaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingInputs: string[];
}

export type EmissionCalculationDetails = {
  id: string;
  calculation_type?: unknown;
  company_type?: unknown;
  formula_id?: unknown;
  financed_emissions?: unknown;
  attribution_factor?: unknown;
  data_quality_score?: unknown;
  evic?: unknown;
  total_equity_plus_debt?: unknown;
  status?: unknown;
  created_at?: string | null;
  inputs?: Record<string, unknown> | null;
};

export type FinanceCalculationDetails = {
  id: string;
  calculation_type?: unknown;
  formula_name?: unknown;
  formula_id?: unknown;
  company_type?: unknown;
  outstanding_amount?: unknown;
  financed_emissions?: unknown;
  attribution_factor?: unknown;
  data_quality_score?: unknown;
  total_assets?: unknown;
  evic?: unknown;
  total_equity_plus_debt?: unknown;
  share_price?: unknown;
  outstanding_shares?: unknown;
  total_debt?: unknown;
  total_equity?: unknown;
  minority_interest?: unknown;
  preferred_stock?: unknown;
  status?: unknown;
  created_at?: string | null;
};

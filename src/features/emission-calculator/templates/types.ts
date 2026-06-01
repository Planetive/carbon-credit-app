/** Product line for calculator / dashboard composition (not wired to UI yet). */
export type EmissionCalculatorProductLine = "corporate" | "financial_institution";

/** Supported reporting methodologies for shared calculator shells. */
export type EmissionCalculatorMethodology = "uk" | "epa-ipcc";

export type EmissionScopeId = "scope1" | "scope2" | "scope3";

/**
 * Lightweight sector template config — enables categories and copy without duplicating forms.
 * Future: oil-gas, technology, agriculture, etc.
 */
export interface EmissionCalculatorTemplate {
  id: string;
  productLine: EmissionCalculatorProductLine;
  methodology: EmissionCalculatorMethodology;
  enabledScopes: EmissionScopeId[];
  scope1?: { categories: string[] };
  scope2?: { categories: string[] };
  scope3?: { categories: string[] };
  dashboardWidgetIds?: string[];
  guidance?: Record<string, string>;
}

export interface ResolveTemplateInput {
  sectorId?: string | null;
  productLine?: EmissionCalculatorProductLine;
  methodology?: EmissionCalculatorMethodology;
}

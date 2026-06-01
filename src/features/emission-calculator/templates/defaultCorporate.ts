import type { EmissionCalculatorTemplate } from "./types";

/**
 * Placeholder default template for corporate users.
 * Not connected to calculator UI yet — used by registry scaffolding only.
 */
export const defaultCorporateTemplate: EmissionCalculatorTemplate = {
  id: "default-corporate",
  productLine: "corporate",
  methodology: "epa-ipcc",
  enabledScopes: ["scope1", "scope2", "scope3"],
  scope1: {
    categories: [],
  },
  scope2: {
    categories: ["electricity", "heat-steam"],
  },
  scope3: {
    categories: [],
  },
  dashboardWidgetIds: [],
  guidance: {},
};

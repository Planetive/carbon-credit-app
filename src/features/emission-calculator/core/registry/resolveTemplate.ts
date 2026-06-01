import { defaultCorporateTemplate } from "@/features/emission-calculator/templates/defaultCorporate";
import type {
  EmissionCalculatorTemplate,
  ResolveTemplateInput,
} from "@/features/emission-calculator/templates/types";

/**
 * Resolves which sector/methodology template applies.
 * Placeholder: always returns default corporate template until sector wiring is implemented.
 */
export function resolveTemplate(_input?: ResolveTemplateInput): EmissionCalculatorTemplate {
  return defaultCorporateTemplate;
}

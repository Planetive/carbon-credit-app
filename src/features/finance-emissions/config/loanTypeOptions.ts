/**
 * Financed-emissions loan / asset-class catalog shown in ESGWizard.
 * Use of Proceeds is PCAF 2025 Part A §5.7 — questionnaire only in Phase 5A.
 */

export const UOP_LOAN_TYPE = "use-of-proceeds" as const;

export const EXISTING_FINANCE_LOAN_TYPES = [
  "corporate-bond",
  "business-loan",
  "project-finance",
  "mortgage",
  "sovereign-debt",
  "motor-vehicle-loan",
  "commercial-real-estate",
] as const;

export type ExistingFinanceLoanType = (typeof EXISTING_FINANCE_LOAN_TYPES)[number];
export type FinanceLoanType = ExistingFinanceLoanType | typeof UOP_LOAN_TYPE;

export type FinanceLoanTypeDef = {
  value: FinanceLoanType;
  label: string;
  description: string;
};

export const FINANCE_LOAN_TYPE_DEFS: readonly FinanceLoanTypeDef[] = [
  { value: "corporate-bond", label: "Corporate Bond", description: "Debt securities issued by corporations" },
  { value: "business-loan", label: "Business Loan", description: "Loans to businesses for operations" },
  { value: "project-finance", label: "Project Finance", description: "Financing for a specific project" },
  { value: "mortgage", label: "Mortgage", description: "Loans secured by residential property" },
  { value: "sovereign-debt", label: "Sovereign Debt", description: "Bonds or loans issued by governments" },
  { value: "motor-vehicle-loan", label: "Motor Vehicle Loan", description: "Loans for cars, trucks, and other vehicles" },
  {
    value: "commercial-real-estate",
    label: "Commercial Real Estate",
    description: "Loans for offices, retail, and industrial buildings",
  },
  {
    value: UOP_LOAN_TYPE,
    label: "Use of Proceeds Structures",
    description: "Green bonds, social loans, and funds where the money is earmarked for named assets",
  },
];

export function isUopLoanType(type: string | null | undefined): boolean {
  return type === UOP_LOAN_TYPE;
}

export function isExistingFinanceLoanType(type: string | null | undefined): boolean {
  return (EXISTING_FINANCE_LOAN_TYPES as readonly string[]).includes(String(type || ""));
}

export function filterNonUopLoanTypes<T extends { type: string }>(items: readonly T[] | null | undefined): T[] {
  return (items || []).filter((item) => !isUopLoanType(item.type));
}

export function financeLoanTypeLabel(type: string): string {
  return FINANCE_LOAN_TYPE_DEFS.find((item) => item.value === type)?.label || type;
}

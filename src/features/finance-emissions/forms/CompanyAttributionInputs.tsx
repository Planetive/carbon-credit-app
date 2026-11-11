import React from "react";
import { FormattedNumberInput } from "@/components/shared/finance/FormattedNumberInput";
import { ComputedBox, FIELD_INPUT, FieldGrid, FormField, InputSection } from "./InputLayout";
import type { FinanceFormData, FinanceFormValue } from "../types/contracts";

export type CompanyListing = "listed" | "unlisted";

type Props = {
  listing: CompanyListing;
  formData: FinanceFormData;
  onUpdateFormData: (field: string, value: FinanceFormValue) => void;
  /** Outstanding amount belongs at the SSP loan layer — omit here by default. */
  showOutstanding?: boolean;
  title?: string;
  description?: string;
};

/**
 * Shared EVIC / total equity+debt attribution denominator inputs used by
 * Corporate Bonds, Business Loans, Listed Equity and Unlisted Equity.
 * Does not compute financed emissions.
 */
export const CompanyAttributionInputs: React.FC<Props> = ({
  listing,
  formData,
  onUpdateFormData,
  showOutstanding = false,
  title = "Company value",
  description,
}) => {
  const num = (key: string) => Number(formData[key]) || 0;
  const setNum = (field: string) => (value: number) => onUpdateFormData(field, value);

  const evic =
    num("sharePrice") * num("outstandingShares") +
    num("totalDebt") +
    num("minorityInterest") +
    num("preferredStock");
  const equityPlusDebt = num("totalEquity") + num("totalDebt");

  return (
    <InputSection
      title={title}
      description={
        description ||
        (listing === "listed"
          ? "EVIC components used as the attribution denominator"
          : "Total equity + debt used as the attribution denominator")
      }
    >
      {showOutstanding ? (
        <FieldGrid>
          <FormField label="Outstanding amount" unit="PKR" tooltip="How much is currently owed">
            <FormattedNumberInput
              id="company-outstanding"
              placeholder="0"
              value={num("outstandingLoan")}
              onChange={setNum("outstandingLoan")}
              className={FIELD_INPUT}
            />
          </FormField>
        </FieldGrid>
      ) : null}

      {listing === "listed" ? (
        <>
          <FieldGrid>
            <FormField label="Share price" unit="PKR" tooltip="Current price of one company share">
              <FormattedNumberInput
                id="share-price"
                placeholder="0"
                value={num("sharePrice")}
                onChange={setNum("sharePrice")}
                className={FIELD_INPUT}
              />
            </FormField>
            <FormField label="Outstanding shares" tooltip="Total number of company shares">
              <FormattedNumberInput
                id="outstanding-shares"
                placeholder="0"
                value={num("outstandingShares")}
                onChange={setNum("outstandingShares")}
                className={FIELD_INPUT}
              />
            </FormField>
            <FormField label="Total debt" unit="PKR" tooltip="Total amount the company owes">
              <FormattedNumberInput
                id="total-debt"
                placeholder="0"
                value={num("totalDebt")}
                onChange={setNum("totalDebt")}
                className={FIELD_INPUT}
              />
            </FormField>
            <FormField label="Minority interest" tooltip="Ownership in subsidiaries held by outside investors">
              <FormattedNumberInput
                id="minority-interest"
                placeholder="0"
                value={num("minorityInterest")}
                onChange={setNum("minorityInterest")}
                className={FIELD_INPUT}
              />
            </FormField>
            <FormField label="Preferred stock" tooltip="Preferred equity included in EVIC">
              <FormattedNumberInput
                id="preferred-stock"
                placeholder="0"
                value={num("preferredStock")}
                onChange={setNum("preferredStock")}
                className={FIELD_INPUT}
              />
            </FormField>
          </FieldGrid>
          <ComputedBox
            label="Calculated EVIC"
            value={evic.toLocaleString()}
            hint="Share price × shares + debt + minority interest + preferred stock"
          />
        </>
      ) : (
        <>
          <FieldGrid>
            <FormField label="Total equity" unit="PKR" tooltip="Total value of company ownership">
              <FormattedNumberInput
                id="total-equity"
                placeholder="0"
                value={num("totalEquity")}
                onChange={setNum("totalEquity")}
                className={FIELD_INPUT}
              />
            </FormField>
            <FormField label="Total debt" unit="PKR" tooltip="Total amount the company owes">
              <FormattedNumberInput
                id="total-debt-unlisted"
                placeholder="0"
                value={num("totalDebt")}
                onChange={setNum("totalDebt")}
                className={FIELD_INPUT}
              />
            </FormField>
          </FieldGrid>
          <ComputedBox label="Total equity + debt" value={equityPlusDebt.toLocaleString()} />
        </>
      )}
    </InputSection>
  );
};

export function computeCompanyDenominator(
  listing: CompanyListing,
  formData: FinanceFormData
): number {
  const num = (key: string) => Number(formData[key]) || 0;
  if (listing === "listed") {
    return (
      num("sharePrice") * num("outstandingShares") +
      num("totalDebt") +
      num("minorityInterest") +
      num("preferredStock")
    );
  }
  return num("totalEquity") + num("totalDebt");
}

import React from 'react';
import { FormattedNumberInput } from "@/components/shared/finance/FormattedNumberInput";
import { FIELD_INPUT, FieldGrid, FormField, InputSection } from "./InputLayout";

interface MortgageFinancialFormProps {
  outstandingLoan: number;
  onUpdateOutstandingLoan: (value: number) => void;
}

export const MortgageFinancialForm: React.FC<MortgageFinancialFormProps> = ({
  outstandingLoan,
  onUpdateOutstandingLoan
}) => {
  return (
    <InputSection title="Loan" description="Outstanding amount used in the attribution factor">
      <FieldGrid>
        <FormField
          label="Outstanding amount"
          unit="PKR"
          tooltip="How much is currently owed on the mortgage"
        >
          <FormattedNumberInput
            id="outstanding-loan"
            placeholder="0"
            value={outstandingLoan || 0}
            onChange={onUpdateOutstandingLoan}
            className={FIELD_INPUT}
          />
        </FormField>
      </FieldGrid>
    </InputSection>
  );
};

import React from "react";
import { FormattedNumberInput } from "@/components/shared/finance/FormattedNumberInput";
import { FIELD_INPUT, FieldGrid, FormField, InputSection } from "./InputLayout";
import type { FinanceFormData, FinanceFormValue } from "../types/contracts";

type Props = {
  formData: FinanceFormData;
  onUpdateFormData: (field: string, value: FinanceFormValue) => void;
  verified: boolean;
};

/** Scope 1/2/3 company GHG inputs for Options 1a / 1b (no financed-emissions math). */
export const CompanyReportedEmissionsInputs: React.FC<Props> = ({
  formData,
  onUpdateFormData,
  verified,
}) => {
  const num = (key: string) => {
    const v = formData[key];
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  return (
    <InputSection
      title={verified ? "Verified company emissions" : "Unverified company emissions"}
      description="Reported GHG totals used by Options 1a / 1b. Attribution stays at the SSP loan / holding layers."
    >
      <FieldGrid>
        <FormField label="Scope 1" unit="tCO₂e" required>
          <FormattedNumberInput
            id="scope1-emissions"
            placeholder="0"
            value={num("scope1Emissions")}
            onChange={(v) => onUpdateFormData("scope1Emissions", v)}
            onClear={() => onUpdateFormData("scope1Emissions", null)}
            className={FIELD_INPUT}
          />
        </FormField>
        <FormField label="Scope 2" unit="tCO₂e" required>
          <FormattedNumberInput
            id="scope2-emissions"
            placeholder="0"
            value={num("scope2Emissions")}
            onChange={(v) => onUpdateFormData("scope2Emissions", v)}
            onClear={() => onUpdateFormData("scope2Emissions", null)}
            className={FIELD_INPUT}
          />
        </FormField>
        <FormField label="Scope 3" unit="tCO₂e">
          <FormattedNumberInput
            id="scope3-emissions"
            placeholder="0"
            value={num("scope3Emissions")}
            onChange={(v) => onUpdateFormData("scope3Emissions", v)}
            onClear={() => onUpdateFormData("scope3Emissions", null)}
            className={FIELD_INPUT}
          />
        </FormField>
      </FieldGrid>
    </InputSection>
  );
};

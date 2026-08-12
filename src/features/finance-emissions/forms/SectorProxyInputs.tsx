import React from "react";
import { Input } from "@/components/ui/input";
import { FIELD_INPUT, FieldGrid, FormField, InputSection } from "./InputLayout";

type Props = {
  optionCode: string;
  formData: Record<string, unknown>;
  onUpdateFormData: (field: string, value: unknown) => void;
  revenueLabel?: string;
};

const SectorProxyInputs: React.FC<Props> = ({
  optionCode,
  formData,
  onUpdateFormData,
  revenueLabel = "Company revenue",
}) => {
  const num = (key: string) => Number(formData[key]) || 0;
  const setNum = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onUpdateFormData(field, parseFloat(e.target.value) || 0);

  return (
    <InputSection title="Sector proxy" description="Financial and intensity inputs for this PCAF option">
      <FieldGrid>
        {optionCode === "3a" && (
          <>
            <FormField label={revenueLabel} required>
              <Input type="number" min={0} step="any" value={num("companyRevenue") || ""} onChange={setNum("companyRevenue")} className={FIELD_INPUT} />
            </FormField>
            <FormField label="Sector GHG" unit="tCO₂e" required>
              <Input type="number" min={0} step="any" value={num("sectorEmissions") || ""} onChange={setNum("sectorEmissions")} className={FIELD_INPUT} />
            </FormField>
            <FormField label="Sector revenue" required>
              <Input type="number" min={0} step="any" value={num("sectorRevenue") || ""} onChange={setNum("sectorRevenue")} className={FIELD_INPUT} />
            </FormField>
          </>
        )}

        {optionCode === "3c" && (
          <>
            <FormField label="Asset turnover ratio" required>
              <Input type="number" min={0} step="any" value={num("assetTurnoverRatio") || ""} onChange={setNum("assetTurnoverRatio")} className={FIELD_INPUT} />
            </FormField>
            <FormField label="Sector GHG" unit="tCO₂e" required>
              <Input type="number" min={0} step="any" value={num("sectorEmissions") || ""} onChange={setNum("sectorEmissions")} className={FIELD_INPUT} />
            </FormField>
            <FormField label="Sector revenue" required>
              <Input type="number" min={0} step="any" value={num("sectorRevenue") || ""} onChange={setNum("sectorRevenue")} className={FIELD_INPUT} />
            </FormField>
          </>
        )}
      </FieldGrid>
    </InputSection>
  );
};

export default SectorProxyInputs;

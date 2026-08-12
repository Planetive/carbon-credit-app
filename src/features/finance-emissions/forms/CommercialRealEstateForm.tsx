import React, { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SCOPE2_FACTORS } from "@/components/emissions/shared/EmissionFactors";
import type { FormulaConfig } from "../types/formula";
import type { FinanceFormData, FinanceFormValue } from "../types/contracts";
import { FIELD_INPUT, FieldGrid, FormField, InputSection } from "./InputLayout";

type FactorLibrary = "EPA" | "DEFRA";

interface CommercialRealEstateFormProps {
  selectedFormula: FormulaConfig | null;
  formData: FinanceFormData;
  onUpdateFormData: (field: string, value: FinanceFormValue) => void;
}

export const CommercialRealEstateForm: React.FC<CommercialRealEstateFormProps> = ({
  selectedFormula,
  formData,
  onUpdateFormData,
}) => {
  const onUpdateRef = useRef(onUpdateFormData);
  onUpdateRef.current = onUpdateFormData;

  const option = selectedFormula?.optionCode || "";
  const factorLibrary = (formData.factor_library as FactorLibrary) || "EPA";
  const gridCountry = String(formData.factor_grid_country || "");
  const gridKg = gridCountry ? SCOPE2_FACTORS.GridCountries?.[gridCountry] : undefined;
  const factorTco2ePerKwh =
    typeof gridKg === "number" && Number.isFinite(gridKg) ? gridKg / 1000 : 0;

  useEffect(() => {
    if (option !== "2a" && option !== "2b" && option !== "3") return;
    if (factorTco2ePerKwh <= 0) return;
    if (Number(formData.average_emission_factor) === factorTco2ePerKwh) return;
    onUpdateRef.current("average_emission_factor", factorTco2ePerKwh);
    onUpdateRef.current("average_emission_factor_unit", "tCO2e/kWh");
    onUpdateRef.current("factor_dataset", "scope2_electricity");
  }, [option, factorTco2ePerKwh, formData.average_emission_factor]);

  if (option !== "2a" && option !== "2b" && option !== "3") return null;

  const setLibrary = (lib: FactorLibrary) => {
    onUpdateRef.current("factor_library", lib);
    onUpdateRef.current("factor_dataset", "scope2_electricity");
  };

  const num = (key: string) => Number(formData[key]) || 0;
  const setNum = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onUpdateFormData(field, parseFloat(e.target.value) || 0);

  return (
    <InputSection
      title="Building energy"
      description="Activity data for this PCAF option. Factor comes from the selected grid country."
      action={
        <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-white p-0.5">
          {(["EPA", "DEFRA"] as const).map((lib) => (
            <button
              key={lib}
              type="button"
              className={`px-2.5 py-1 text-xs rounded-md ${factorLibrary === lib ? "bg-[#0F6E56] text-white" : "text-[#64748B]"}`}
              onClick={() => setLibrary(lib)}
            >
              {lib}
            </button>
          ))}
        </div>
      }
    >
      <FieldGrid>
        <FormField
          label="Electricity provider country"
          required
          tooltip="Uses the same SCOPE2 grid factors as the emission calculator."
        >
          <Select
            value={gridCountry || undefined}
            onValueChange={(v) => onUpdateFormData("factor_grid_country", v)}
          >
            <SelectTrigger className={FIELD_INPUT}>
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UAE">UAE</SelectItem>
              <SelectItem value="Pakistan">Pakistan</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Average emission factor" unit="tCO₂e/kWh">
          <Input value={factorTco2ePerKwh || ""} readOnly placeholder="Select country" className={FIELD_INPUT} />
        </FormField>

        {option === "2a" && (
          <>
            <FormField label="Energy from labels" unit="kWh/m²" required>
              <Input type="number" min={0} step="any" value={num("estimated_energy_consumption_from_labels") || ""} onChange={setNum("estimated_energy_consumption_from_labels")} className={FIELD_INPUT} />
            </FormField>
            <FormField label="Floor area" unit="m²" required>
              <Input type="number" min={0} step="any" value={num("floor_area") || ""} onChange={setNum("floor_area")} className={FIELD_INPUT} />
            </FormField>
          </>
        )}

        {option === "2b" && (
          <>
            <FormField label="Energy from statistics" unit="kWh/m²" required>
              <Input type="number" min={0} step="any" value={num("estimated_energy_consumption_from_statistics") || ""} onChange={setNum("estimated_energy_consumption_from_statistics")} className={FIELD_INPUT} />
            </FormField>
            <FormField label="Floor area" unit="m²" required>
              <Input type="number" min={0} step="any" value={num("floor_area") || ""} onChange={setNum("floor_area")} className={FIELD_INPUT} />
            </FormField>
          </>
        )}

        {option === "3" && (
          <>
            <FormField label="Energy from statistics" unit="kWh/building" required>
              <Input type="number" min={0} step="any" value={num("estimated_energy_consumption_from_statistics") || ""} onChange={setNum("estimated_energy_consumption_from_statistics")} className={FIELD_INPUT} />
            </FormField>
            <FormField label="Number of buildings" required>
              <Input type="number" min={0} step="any" value={num("number_of_buildings") || ""} onChange={setNum("number_of_buildings")} className={FIELD_INPUT} />
            </FormField>
          </>
        )}
      </FieldGrid>
    </InputSection>
  );
};

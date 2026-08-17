import React, { useRef } from "react";
import { Input } from "@/components/ui/input";
import ElectricityEmissions from "@/features/emission-calculator/scope2/components/ElectricityEmissions";
import type { FormulaConfig } from "../types/formula";
import type { FinanceFormData, FinanceFormValue } from "../types/contracts";
import { ComputedBox, FIELD_INPUT, FieldGrid, FormField, InputSection } from "./InputLayout";

type FactorLibrary = "EPA" | "DEFRA";

type ElectricityDetail = {
  totalKwh?: number;
  gridPct?: number;
  renewablePct?: number;
  otherPct?: number;
  gridCountry?: string;
  gridFactor?: number;
  otherRows: Array<{
    type?: string;
    fuel?: string;
    unit?: string;
    quantity?: number;
    factor?: number;
    emissions?: number;
  }>;
};

interface CommercialRealEstateFormProps {
  selectedFormula: FormulaConfig | null;
  formData: FinanceFormData;
  onUpdateFormData: (field: string, value: FinanceFormValue) => void;
}

/**
 * CRE / mortgage Options 2a, 2b, 3 — building energy uses the same detailed
 * EPA/DEFRA Scope 2 electricity form as finance Option 2a / CRE 1a–1b.
 * Intensity / floor-area / building-count fields stay for the PCAF option.
 */
export const CommercialRealEstateForm: React.FC<CommercialRealEstateFormProps> = ({
  selectedFormula,
  formData,
  onUpdateFormData,
}) => {
  const onUpdateRef = useRef(onUpdateFormData);
  onUpdateRef.current = onUpdateFormData;

  const option = selectedFormula?.optionCode || "";
  const factorLibrary = (formData.factor_library as FactorLibrary) || "EPA";
  const averageFactor = Number(formData.average_emission_factor) || 0;

  const lastKgRef = useRef<number | null>(null);
  const lastDetailRef = useRef<ElectricityDetail | null>(null);

  if (option !== "2a" && option !== "2b" && option !== "3") return null;

  const setLibrary = (lib: FactorLibrary) => {
    lastKgRef.current = null;
    onUpdateRef.current("factor_library", lib);
    onUpdateRef.current("energy_type", "electricity");
    onUpdateRef.current(
      "factor_dataset",
      lib === "DEFRA" ? "uk_fuel_factors" : "fuel_epa"
    );
  };

  const applyAverageFactor = (kg: number, detail: ElectricityDetail | null) => {
    const totalKwh = Number(detail?.totalKwh) || 0;
    const gridFactorKg = Number(detail?.gridFactor) || 0;
    let factorTco2ePerKwh = 0;
    if (totalKwh > 0 && Number.isFinite(kg) && kg > 0) {
      factorTco2ePerKwh = kg / 1000 / totalKwh;
    } else if (gridFactorKg > 0) {
      factorTco2ePerKwh = gridFactorKg / 1000;
    }
    if (factorTco2ePerKwh > 0) {
      onUpdateRef.current("average_emission_factor", factorTco2ePerKwh);
      onUpdateRef.current("average_emission_factor_unit", "tCO2e/kWh");
    }
  };

  const handleElectricityKg = (kg: number) => {
    if (!Number.isFinite(kg)) return;
    if (lastKgRef.current === kg) return;
    lastKgRef.current = kg;
    applyAverageFactor(kg, lastDetailRef.current);
  };

  const handleDetailChange = (detail: ElectricityDetail) => {
    lastDetailRef.current = detail;
    const firstOther = detail.otherRows.find((r) => r.type && r.fuel && r.unit);
    onUpdateRef.current("electricity_total_kwh", detail.totalKwh ?? 0);
    onUpdateRef.current("electricity_grid_pct", detail.gridPct ?? 0);
    onUpdateRef.current("electricity_renewable_pct", detail.renewablePct ?? 0);
    onUpdateRef.current("electricity_other_pct", detail.otherPct ?? 0);
    onUpdateRef.current("factor_grid_country", detail.gridCountry || "");
    onUpdateRef.current("electricity_grid_factor", detail.gridFactor ?? 0);
    onUpdateRef.current("electricity_other_sources", detail.otherRows as unknown as FinanceFormValue);
    onUpdateRef.current("factor_activity", firstOther?.type || "");
    onUpdateRef.current("factor_fuel", firstOther?.fuel || "");
    onUpdateRef.current("factor_unit", firstOther?.unit || "");
    onUpdateRef.current("electricity_mode", (detail.otherPct || 0) > 0 ? "mixed" : "grid");
    onUpdateRef.current(
      "factor_dataset",
      factorLibrary === "DEFRA" ? "uk_fuel_factors" : "fuel_epa"
    );
    if (lastKgRef.current != null) {
      applyAverageFactor(lastKgRef.current, detail);
    } else if ((detail.gridFactor || 0) > 0) {
      applyAverageFactor(0, detail);
    }
  };

  const num = (key: string) => Number(formData[key]) || 0;
  const setNum = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onUpdateFormData(field, parseFloat(e.target.value) || 0);

  return (
    <InputSection
      title="Building energy"
      description="Same Scope 2 EPA/DEFRA electricity form as the emission calculator. Average factor is derived for this PCAF option."
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
      <ElectricityEmissions
        key={factorLibrary}
        embedded
        factorLibrary={factorLibrary}
        onTotalChange={handleElectricityKg}
        onDetailChange={handleDetailChange}
      />

      <div className="mt-4 space-y-4">
        <FieldGrid>
          <ComputedBox
            label="Average emission factor"
            value={averageFactor > 0 ? averageFactor.toExponential(4) : "—"}
            unit="tCO₂e/kWh"
            hint="From EPA/DEFRA electricity (total emissions ÷ kWh)"
          />
        </FieldGrid>

        <FieldGrid>
          {option === "2a" && (
            <>
              <FormField label="Energy from labels" unit="kWh/m²" required>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={num("estimated_energy_consumption_from_labels") || ""}
                  onChange={setNum("estimated_energy_consumption_from_labels")}
                  className={FIELD_INPUT}
                />
              </FormField>
              <FormField label="Floor area" unit="m²" required>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={num("floor_area") || ""}
                  onChange={setNum("floor_area")}
                  className={FIELD_INPUT}
                />
              </FormField>
            </>
          )}

          {option === "2b" && (
            <>
              <FormField label="Energy from statistics" unit="kWh/m²" required>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={num("estimated_energy_consumption_from_statistics") || ""}
                  onChange={setNum("estimated_energy_consumption_from_statistics")}
                  className={FIELD_INPUT}
                />
              </FormField>
              <FormField label="Floor area" unit="m²" required>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={num("floor_area") || ""}
                  onChange={setNum("floor_area")}
                  className={FIELD_INPUT}
                />
              </FormField>
            </>
          )}

          {option === "3" && (
            <>
              <FormField label="Energy from statistics" unit="kWh/building" required>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={num("estimated_energy_consumption_from_statistics") || ""}
                  onChange={setNum("estimated_energy_consumption_from_statistics")}
                  className={FIELD_INPUT}
                />
              </FormField>
              <FormField label="Number of buildings" required>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={num("number_of_buildings") || ""}
                  onChange={setNum("number_of_buildings")}
                  className={FIELD_INPUT}
                />
              </FormField>
            </>
          )}
        </FieldGrid>
      </div>
    </InputSection>
  );
};

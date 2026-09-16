import React, { useRef } from "react";
import { Input } from "@/components/ui/input";
import ElectricityEmissions from "@/features/emission-calculator/scope2/components/ElectricityEmissions";
import { ComputedBox, FIELD_INPUT, FieldGrid, FormField, InputSection } from "./InputLayout";

type FactorLibrary = "EPA" | "DEFRA";

type Props = {
  formData: Record<string, unknown>;
  onUpdateFormData: (field: string, value: unknown) => void;
};

/**
 * Corporate Bond / Project Finance Option 2a energy block.
 * Uses the same Scope 2 electricity form as the emission calculator
 * (kWh, grid / renewable / other split, country factor).
 */
const EnergyEmissionInputs: React.FC<Props> = ({ formData, onUpdateFormData }) => {
  const onUpdateRef = useRef(onUpdateFormData);
  onUpdateRef.current = onUpdateFormData;

  const factorLibrary = (formData.factor_library as FactorLibrary) || "EPA";
  const processEmissions = Number(formData.process_emissions) || 0;
  const energyConsumption = Number(formData.energy_consumption) || 0;
  const lastKgRef = useRef<number | null>(null);

  const setLibrary = (lib: FactorLibrary) => {
    lastKgRef.current = null;
    onUpdateRef.current("factor_library", lib);
    onUpdateRef.current("energy_type", "electricity");
    onUpdateRef.current(
      "factor_dataset",
      lib === "DEFRA" ? "uk_fuel_factors" : "fuel_epa"
    );
  };

  const handleElectricityKg = (kg: number) => {
    if (!Number.isFinite(kg)) return;
    if (lastKgRef.current === kg) return;
    lastKgRef.current = kg;
    const tco2e = kg / 1000;
    onUpdateRef.current("energy_type", "electricity");
    onUpdateRef.current("energy_consumption", tco2e);
    onUpdateRef.current("emission_factor", 1);
    onUpdateRef.current("energy_consumption_unit", "tCO2e");
    onUpdateRef.current(
      "factor_dataset",
      factorLibrary === "DEFRA" ? "uk_fuel_factors" : "fuel_epa"
    );
  };

  const previewTco2e = energyConsumption + processEmissions;

  return (
    <InputSection
      title="Electricity"
      description="Enter electricity use. We convert it to emissions using the country grid or fuel factors."
      action={
        <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-white p-0.5">
          {(["EPA", "DEFRA"] as const).map((lib) => (
            <button
              key={lib}
              type="button"
              className={`px-2.5 py-1 text-xs rounded-md ${factorLibrary === lib ? "bg-[#0F6E56] text-white" : "text-[#64748B]"}`}
              onClick={() => setLibrary(lib)}
            >
              {lib === "EPA" ? "Standard" : "UK"}
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
        onDetailChange={(detail) => {
          const firstOther = detail.otherRows.find((r) => r.type && r.fuel && r.unit);
          onUpdateRef.current("electricity_total_kwh", detail.totalKwh ?? 0);
          onUpdateRef.current("electricity_grid_pct", detail.gridPct ?? 0);
          onUpdateRef.current("electricity_renewable_pct", detail.renewablePct ?? 0);
          onUpdateRef.current("electricity_other_pct", detail.otherPct ?? 0);
          onUpdateRef.current("factor_grid_country", detail.gridCountry || "");
          onUpdateRef.current("electricity_grid_factor", detail.gridFactor ?? 0);
          onUpdateRef.current("electricity_other_sources", detail.otherRows);
          onUpdateRef.current("factor_activity", firstOther?.type || "");
          onUpdateRef.current("factor_fuel", firstOther?.fuel || "");
          onUpdateRef.current("factor_unit", firstOther?.unit || "");
          onUpdateRef.current("electricity_mode", (detail.otherPct || 0) > 0 ? "mixed" : "grid");
        }}
      />

      <div className="mt-4">
        <FieldGrid>
          <FormField label="Process emissions" unit="tCO₂e" tooltip="Optional process emissions added to electricity">
            <Input
              type="number"
              min={0}
              step="any"
              value={processEmissions || ""}
              onChange={(e) => onUpdateRef.current("process_emissions", parseFloat(e.target.value) || 0)}
              placeholder="0"
              className={FIELD_INPUT}
            />
          </FormField>
          <ComputedBox
            label="Electricity emissions"
            value={`${previewTco2e.toFixed(6)} tCO₂e`}
          />
        </FieldGrid>
      </div>
    </InputSection>
  );
};

export default EnergyEmissionInputs;

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FormulaConfig } from "../types/formula";
import type { FinanceFormData, FinanceFormValue } from "../types/contracts";
import { ComputedBox, FIELD_INPUT, FieldGrid, FormField, InputSection } from "./InputLayout";
import {
  getElectricityGridCountries,
  getElectricityGridFactorKgPerKwh,
} from "../utils/pcafFactorLoaders";
import {
  formatCbecsLabel,
  loadCbecsBuildingTypes,
  type CbecsBuildingRow,
} from "../utils/cbecsFactorLoaders";

interface CommercialRealEstateFormProps {
  selectedFormula: FormulaConfig | null;
  formData: FinanceFormData;
  onUpdateFormData: (field: string, value: FinanceFormValue) => void;
}

/**
 * CRE / mortgage PCAF options:
 * - 1a / 1b (Score 1–2): user enters energy + emission factor (no grid lookup)
 * - 2a (Score 3): floor area + energy per floor area + grid EF
 * - 2b (Score 4): CBECS PBA + kWh/sqft + floor area (sqft) + grid EF
 * - 3  (Score 5): CBECS PBA + kWh/building + building count + grid EF
 */
export const CommercialRealEstateForm: React.FC<CommercialRealEstateFormProps> = ({
  selectedFormula,
  formData,
  onUpdateFormData,
}) => {
  const onUpdateRef = useRef(onUpdateFormData);
  onUpdateRef.current = onUpdateFormData;

  const option = selectedFormula?.optionCode || "";
  const isUserEfPath = option === "1a" || option === "1b";
  const isLabelsPath = option === "2a";
  const isStatisticsPath = option === "2b" || option === "3";

  const averageFactor = Number(formData.average_emission_factor) || 0;

  const [cbecsRows, setCbecsRows] = useState<CbecsBuildingRow[]>([]);
  const [loadingCbecs, setLoadingCbecs] = useState(false);
  const [cbecsError, setCbecsError] = useState<string | null>(null);

  useEffect(() => {
    if (!isStatisticsPath) return;
    let cancelled = false;
    setLoadingCbecs(true);
    setCbecsError(null);
    void loadCbecsBuildingTypes()
      .then((rows) => {
        if (cancelled) return;
        setCbecsRows(rows);
        if (rows.length === 0) {
          setCbecsError(
            "No CBECS Principal building activity rows found. In pgAdmin, confirm staging_cbecs_table_c4 has category = 'Principal building activity', then promote those rows into ref.factor_rows (dataset code cbecs_table_c4)."
          );
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setCbecsError(err instanceof Error ? err.message : "Failed to load CBECS data.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCbecs(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isStatisticsPath]);

  const cbecsCategory = String(formData.cbecs_category || "");
  const selectedCbecsRow = useMemo(
    () => cbecsRows.find((r) => r.subcategory === cbecsCategory || r.category === cbecsCategory) ?? null,
    [cbecsRows, cbecsCategory]
  );

  const gridCountries = useMemo(() => getElectricityGridCountries(), []);

  if (!isUserEfPath && !isLabelsPath && !isStatisticsPath) return null;

  const applyGridFactorFromCountry = (country: string) => {
    const kg = getElectricityGridFactorKgPerKwh(country);
    if (kg && kg > 0) {
      onUpdateRef.current("factor_grid_country", country);
      onUpdateRef.current("electricity_grid_factor", kg);
      onUpdateRef.current("average_emission_factor", kg / 1000);
      onUpdateRef.current("average_emission_factor_unit", "tCO2e/kWh");
    }
  };

  const applyCbecsRow = (row: CbecsBuildingRow) => {
    onUpdateRef.current("cbecs_category", row.subcategory);
    onUpdateRef.current("cbecs_subcategory", row.subcategory);
    onUpdateRef.current("cbecs_building_type", formatCbecsLabel(row));
    onUpdateRef.current("factor_dataset", "cbecs_table_c4");
    if (option === "2b" && row.kwhPerSqft > 0) {
      onUpdateRef.current("estimated_energy_consumption_from_statistics", row.kwhPerSqft);
      onUpdateRef.current("estimated_energy_consumption_from_statistics_unit", "kWh/sqft");
    }
    if (option === "3" && row.kwhPerBuilding > 0) {
      onUpdateRef.current("estimated_energy_consumption_from_statistics", row.kwhPerBuilding);
      onUpdateRef.current("estimated_energy_consumption_from_statistics_unit", "kWh/building");
    }
  };

  const num = (key: string) => Number(formData[key]) || 0;
  const setNum = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onUpdateFormData(field, parseFloat(e.target.value) || 0);

  const energyIntensity = num("estimated_energy_consumption_from_statistics");
  const labelsIntensity = num("estimated_energy_consumption_from_labels");
  const floorArea = num("floor_area");
  const buildingCount = num("number_of_buildings");

  const totalEnergyKwh =
    option === "2a"
      ? labelsIntensity * floorArea
      : option === "2b"
        ? energyIntensity * floorArea
        : option === "3"
          ? energyIntensity * buildingCount
          : 0;

  const estimatedEmissionsTco2e =
    totalEnergyKwh > 0 && averageFactor > 0 ? totalEnergyKwh * averageFactor : 0;

  const sectionTitle = isUserEfPath
    ? "Actual building energy"
    : isLabelsPath
      ? "Energy labels & grid factor"
      : option === "2b"
        ? "Building type, floor area & grid factor"
        : "Building type, buildings & grid factor";

  const sectionDescription = isUserEfPath
    ? "Enter actual building energy consumption and the emission factor. No grid lookup — both values come from the user."
    : isLabelsPath
      ? "Enter energy consumption per floor area and floor area. Grid emission factor uses the same EPA Scope 2 countries as the emission calculator."
      : option === "2b"
        ? "Pick a CBECS principal building activity for kWh/sqft, enter floor area (sqft), and select an EPA grid country (same list as the emission calculator)."
        : "Pick a CBECS principal building activity for kWh/building, enter building count, and select an EPA grid country (same list as the emission calculator).";

  if (isUserEfPath) {
    const energy = num("energy_consumption");
    const ef = num("emission_factor");
    const product = energy > 0 && ef > 0 ? energy * ef : 0;

    return (
      <InputSection title={sectionTitle} description={sectionDescription}>
        <FieldGrid>
          <FormField
            label="Actual building energy consumption"
            unit="kWh"
            required
            tooltip="Primary data on actual building energy use"
          >
            <Input
              type="number"
              min={0}
              step="any"
              value={energy || ""}
              onChange={setNum("energy_consumption")}
              className={FIELD_INPUT}
            />
          </FormField>
          <FormField
            label="Emission factor"
            unit="tCO₂e/kWh"
            required
            tooltip="User-supplied emission factor (supplier-specific for Score 1, average for Score 2)"
          >
            <Input
              type="number"
              min={0}
              step="any"
              value={ef || ""}
              onChange={(e) => {
                const v = parseFloat(e.target.value) || 0;
                onUpdateFormData("emission_factor", v);
                onUpdateFormData("emission_factor_unit", "tCO2e/kWh");
              }}
              className={FIELD_INPUT}
            />
          </FormField>
          <ComputedBox
            label="Building energy emissions"
            value={
              product > 0
                ? product.toLocaleString(undefined, { maximumFractionDigits: 4 })
                : "—"
            }
            unit="tCO₂e"
            hint="Energy × emission factor (before loan attribution)"
          />
        </FieldGrid>
      </InputSection>
    );
  }

  const gridCountryField = (
    <FormField
      label="Electricity provider country"
      required
      tooltip="Same EPA Scope 2 grid countries as the emission calculator (kgCO₂e/kWh)"
    >
      <Select
        value={String(formData.factor_grid_country || "")}
        onValueChange={applyGridFactorFromCountry}
      >
        <SelectTrigger className={FIELD_INPUT}>
          <SelectValue placeholder="Select country" />
        </SelectTrigger>
        <SelectContent>
          {gridCountries.map((country) => (
            <SelectItem key={country} value={country}>
              {country}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );

  const gridFactorKg = Number(formData.electricity_grid_factor) || 0;

  const gridEfBox = (
    <ComputedBox
      label="Grid emission factor"
      value={gridFactorKg > 0 ? gridFactorKg.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "—"}
      unit="kgCO₂e/kWh"
      hint="Same EPA Scope 2 grid factors as the emission calculator"
    />
  );

  if (isLabelsPath) {
    return (
      <InputSection title={sectionTitle} description={sectionDescription}>
        <FieldGrid>
          <FormField
            label="Energy consumption per floor area"
            unit="kWh/m²"
            required
            tooltip="Building energy intensity from energy labels"
          >
            <Input
              type="number"
              min={0}
              step="any"
              value={labelsIntensity || ""}
              onChange={setNum("estimated_energy_consumption_from_labels")}
              className={FIELD_INPUT}
            />
          </FormField>
          <FormField label="Floor area" unit="m²" required>
            <Input
              type="number"
              min={0}
              step="any"
              value={floorArea || ""}
              onChange={setNum("floor_area")}
              className={FIELD_INPUT}
            />
          </FormField>
          {gridCountryField}
        </FieldGrid>

        <div className="mt-4">
          <FieldGrid>
            <ComputedBox
              label="Total energy"
              value={
                totalEnergyKwh > 0
                  ? totalEnergyKwh.toLocaleString(undefined, { maximumFractionDigits: 0 })
                  : "—"
              }
              unit="kWh"
              hint="kWh/m² × m²"
            />
            {gridEfBox}
            <ComputedBox
              label="Estimated building emissions"
              value={
                estimatedEmissionsTco2e > 0
                  ? estimatedEmissionsTco2e.toLocaleString(undefined, { maximumFractionDigits: 2 })
                  : "—"
              }
              unit="tCO₂e"
              hint="Total kWh × grid EF (before loan attribution)"
            />
          </FieldGrid>
        </div>
      </InputSection>
    );
  }

  // Score 4 (2b) / Score 5 (3)
  return (
    <InputSection title={sectionTitle} description={sectionDescription}>
      <div className="space-y-4">
        {cbecsError && <p className="text-sm text-amber-700">{cbecsError}</p>}

        <FieldGrid>
          <FormField
            label="Principal building activity"
            required
            tooltip="CBECS Table C4 principal building activity (Education, Food sales, Office, …)"
          >
            <Select
              value={cbecsCategory}
              onValueChange={(value) => {
                const row = cbecsRows.find((r) => r.subcategory === value || r.category === value);
                if (row) applyCbecsRow(row);
              }}
            >
              <SelectTrigger className={FIELD_INPUT}>
                <SelectValue
                  placeholder={loadingCbecs ? "Loading CBECS…" : "Select building type"}
                />
              </SelectTrigger>
              <SelectContent>
                {cbecsRows.map((row) => (
                  <SelectItem key={row.key} value={row.subcategory}>
                    {row.subcategory}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {gridCountryField}
        </FieldGrid>

        <FieldGrid>
          <ComputedBox
            label={option === "2b" ? "Energy intensity (CBECS)" : "Energy per building (CBECS)"}
            value={
              energyIntensity > 0
                ? energyIntensity.toLocaleString(undefined, { maximumFractionDigits: 4 })
                : "—"
            }
            unit={option === "2b" ? "kWh/sqft" : "kWh/building"}
            hint={selectedCbecsRow ? formatCbecsLabel(selectedCbecsRow) : "Select a building type"}
          />
          {gridEfBox}
        </FieldGrid>

        <FieldGrid>
          {option === "2b" && (
            <>
              <FormField label="Floor area financed" unit="sqft" required>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={floorArea || ""}
                  onChange={setNum("floor_area")}
                  className={FIELD_INPUT}
                />
              </FormField>
              <ComputedBox
                label="Total statistical energy"
                value={
                  totalEnergyKwh > 0
                    ? totalEnergyKwh.toLocaleString(undefined, { maximumFractionDigits: 0 })
                    : "—"
                }
                unit="kWh"
                hint="kWh/sqft × sqft"
              />
            </>
          )}

          {option === "3" && (
            <>
              <FormField label="Number of buildings financed" required>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={buildingCount || ""}
                  onChange={setNum("number_of_buildings")}
                  className={FIELD_INPUT}
                />
              </FormField>
              <ComputedBox
                label="Total statistical energy"
                value={
                  totalEnergyKwh > 0
                    ? totalEnergyKwh.toLocaleString(undefined, { maximumFractionDigits: 0 })
                    : "—"
                }
                unit="kWh"
                hint="kWh/building × buildings"
              />
            </>
          )}

          <ComputedBox
            label="Estimated building emissions"
            value={
              estimatedEmissionsTco2e > 0
                ? estimatedEmissionsTco2e.toLocaleString(undefined, { maximumFractionDigits: 2 })
                : "—"
            }
            unit="tCO₂e"
            hint="Total kWh × grid EF (before loan attribution)"
          />
        </FieldGrid>
      </div>
    </InputSection>
  );
};

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FIELD_INPUT, FieldGrid, FormField, InputSection } from "./InputLayout";
import { useSovereignPppGdp } from "../hooks/useSovereignPppGdp";
import { useCountrySectorIntensity } from "../hooks/useCountrySectorIntensity";
import { SovereignCountrySelect } from "./SovereignCountrySelect";
import { SovereignSectorSelect } from "./SovereignSectorSelect";
import type { SectorOption } from "../types/countrySectorIntensity";
import { cleanCountryName } from "../utils/cleanCountryName";

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

  const needsFetchedIntensity = optionCode === "3a" || optionCode === "3c";
  const countryName = String(formData.intensity_country_name || "");
  const { countries, loading: countriesLoading, error: countriesError, reload: reloadCountries } =
    useSovereignPppGdp();
  const {
    sectors,
    loading: sectorsLoading,
    error: sectorsError,
    reload: reloadSectors,
  } = useCountrySectorIntensity(countryName, needsFetchedIntensity);

  const clearSector = () => {
    onUpdateFormData("sector_key", "");
    onUpdateFormData("sector_code", "");
    onUpdateFormData("sector_name", "");
    onUpdateFormData("sector_intensity", 0);
    onUpdateFormData("sector_intensity_unit", "");
  };

  return (
    <InputSection
      title="Sector proxy"
      description={
        needsFetchedIntensity
          ? "Company revenue or asset turnover, plus sector intensity from our reference table"
          : "Financial and intensity inputs for this method"
      }
    >
      <FieldGrid>
        {needsFetchedIntensity && (
          <>
            <FormField
              label="Country"
              required
              tooltip="Country used to look up sector emissions intensity"
            >
              <div className="space-y-2">
                {countriesError && (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-red-700">{countriesError}</p>
                    <Button type="button" variant="outline" size="sm" onClick={() => void reloadCountries()}>
                      Retry
                    </Button>
                  </div>
                )}
                <SovereignCountrySelect
                  value={countryName}
                  countries={countries}
                  loading={countriesLoading}
                  disabled={!!countriesError}
                  placeholder="Choose country for sector intensity"
                  onSelect={(name) => {
                    onUpdateFormData("intensity_country_name", cleanCountryName(name));
                    clearSector();
                  }}
                />
              </div>
            </FormField>

            <FormField
              label="Sector"
              required
              tooltip="Sector intensity replaces manual GHG ÷ revenue. Empty intensities are not listed."
            >
              <div className="space-y-2">
                {sectorsError && (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-red-700">{sectorsError}</p>
                    <Button type="button" variant="outline" size="sm" onClick={() => void reloadSectors()}>
                      Retry
                    </Button>
                  </div>
                )}
                <SovereignSectorSelect
                  value={String(formData.sector_key || "")}
                  intensity={num("sector_intensity")}
                  unit={String(formData.sector_intensity_unit || "kgCO2e/PKR")}
                  sectors={sectors}
                  loading={sectorsLoading}
                  disabled={!countryName || !!sectorsError}
                  onSelect={(sector: SectorOption) => {
                    onUpdateFormData("sector_key", sector.sectorKey);
                    onUpdateFormData("sector_code", sector.sectorCode);
                    onUpdateFormData("sector_name", sector.sectorName);
                    onUpdateFormData("sector_intensity", sector.intensity);
                    onUpdateFormData("sector_intensity_unit", sector.unit);
                  }}
                />
              </div>
            </FormField>
          </>
        )}

        {optionCode === "3a" && (
          <FormField label={revenueLabel} required>
            <Input
              type="number"
              min={0}
              step="any"
              value={num("companyRevenue") || ""}
              onChange={setNum("companyRevenue")}
              className={FIELD_INPUT}
            />
          </FormField>
        )}

        {optionCode === "3c" && (
          <FormField label="Asset turnover ratio" required>
            <Input
              type="number"
              min={0}
              step="any"
              value={num("assetTurnoverRatio") || ""}
              onChange={setNum("assetTurnoverRatio")}
              className={FIELD_INPUT}
            />
          </FormField>
        )}
      </FieldGrid>
    </InputSection>
  );
};

export default SectorProxyInputs;

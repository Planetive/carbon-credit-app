import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FormulaConfig } from '../types/formula';
import type { FinanceFormData, FinanceFormValue } from "../types/contracts";
import { useSovereignPppGdp } from '../hooks/useSovereignPppGdp';
import { useCountrySectorIntensity } from '../hooks/useCountrySectorIntensity';
import { SovereignCountrySelect } from './SovereignCountrySelect';
import { SovereignSectorSelect } from './SovereignSectorSelect';
import { SovereignVerifiedEmissionSelect } from './SovereignVerifiedEmissionSelect';
import { useClimateTraceVerifiedEmissions } from '../hooks/useClimateTraceVerifiedEmissions';
import type { SectorOption } from '../types/countrySectorIntensity';
import { FIELD_INPUT, FieldGrid, FormField, InputSection } from "./InputLayout";

interface SovereignDebtFormProps {
  selectedFormula: FormulaConfig | null;
  formData: FinanceFormData;
  onUpdateFormData: (field: string, value: FinanceFormValue) => void;
}

export const SovereignDebtForm: React.FC<SovereignDebtFormProps> = ({
  selectedFormula,
  formData,
  onUpdateFormData,
}) => {
  const option = selectedFormula?.optionCode || '';
  const num = (key: string) => Number(formData[key]) || 0;
  const { countries, loading, error, reload, applyCountrySelection } = useSovereignPppGdp();
  const countryName = String(formData.sovereign_country_name || '');
  const {
    sectors,
    loading: sectorsLoading,
    error: sectorsError,
    reload: reloadSectors,
  } = useCountrySectorIntensity(countryName, option === '3a');
  const {
    rows: climateTraceRows,
    loading: climateTraceLoading,
    error: climateTraceError,
    reload: reloadClimateTrace,
  } = useClimateTraceVerifiedEmissions(option === '1a');

  const pickersDisabled = loading || !!error;

  const clearSector = () => {
    onUpdateFormData('sector_code', '');
    onUpdateFormData('sector_name', '');
    onUpdateFormData('sector_key', '');
    onUpdateFormData('sector_intensity', 0);
    onUpdateFormData('sector_intensity_unit', '');
  };

  /** Option 1a: one country pick drives both verified emissions and PPP-GDP. */
  const handleVerifiedCountrySelect = async (row: {
    countryName: string;
    emissionsTons: number;
  }) => {
    onUpdateFormData('verified_emissions_country_name', row.countryName);
    onUpdateFormData('verified_country_emissions', row.emissionsTons);

    const resolved = await applyCountrySelection(row.countryName);
    if (!resolved) return;
    onUpdateFormData('sovereign_country_name', resolved.sovereign_country_name);
    onUpdateFormData('pp_adjusted_gdp', resolved.pp_adjusted_gdp);
    onUpdateFormData('ppp_gdp_year', resolved.ppp_gdp_year);
    onUpdateFormData('ppp_gdp_used_fallback', resolved.ppp_gdp_used_fallback);
  };

  const handleCountrySelect = async (selectedName: string, prefix: 'sovereign' | 'proxy_sovereign') => {
    const resolved = await applyCountrySelection(selectedName);
    if (!resolved) return;

    if (prefix === 'sovereign') {
      onUpdateFormData('sovereign_country_name', resolved.sovereign_country_name);
      onUpdateFormData('pp_adjusted_gdp', resolved.pp_adjusted_gdp);
      onUpdateFormData('ppp_gdp_year', resolved.ppp_gdp_year);
      onUpdateFormData('ppp_gdp_used_fallback', resolved.ppp_gdp_used_fallback);
      clearSector();
      return;
    }

    onUpdateFormData('proxy_sovereign_country_name', resolved.sovereign_country_name);
    onUpdateFormData('proxy_pp_adjusted_gdp', resolved.pp_adjusted_gdp);
    onUpdateFormData('proxy_ppp_gdp_year', resolved.ppp_gdp_year);
    onUpdateFormData('proxy_ppp_gdp_used_fallback', resolved.ppp_gdp_used_fallback);
  };

  return (
    <InputSection
      title="Country data"
      description={
        option === '3a'
          ? 'Pick the country and sector, enter revenue for that sector, and we apply sector intensity (GHG per revenue) from our table.'
          : option === '1a'
            ? 'Pick Pakistan or UAE for verified country emissions.'
            : undefined
      }
    >
      {error && (
        <div className="mb-4 flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-red-800">{error}</p>
          <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => void reload()}>
            Retry
          </Button>
        </div>
      )}

      <FieldGrid>
        {/* Option 1a: Pakistan/UAE only — one picker sets emissions + PPP-GDP */}
        {option === '1a' ? (
          <FormField
            label="Verified country emissions"
            unit="tCO₂e"
            required
            tooltip="Pick Pakistan or UAE. We load verified country emissions and that country’s PPP-adjusted GDP for attribution."
          >
            <div className="space-y-1.5">
              <SovereignVerifiedEmissionSelect
                value={String(formData.verified_emissions_country_name || '')}
                emissionsTons={num('verified_country_emissions')}
                rows={climateTraceRows}
                loading={climateTraceLoading}
                disabled={pickersDisabled}
                error={climateTraceError}
                onRetry={() => void reloadClimateTrace()}
                onSelect={(row) => void handleVerifiedCountrySelect(row)}
              />
              {num('pp_adjusted_gdp') > 0 && (
                <p className="text-xs text-[#64748B]">
                  PPP-adjusted GDP: {num('pp_adjusted_gdp').toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  {num('ppp_gdp_year') > 0 ? ` · year ${num('ppp_gdp_year')}` : ''}
                  {formData.ppp_gdp_used_fallback ? ' (fallback year)' : ''}
                </p>
              )}
            </div>
          </FormField>
        ) : (
          <FormField
            label="Country"
            required
            tooltip="Sovereign country for PPP-adjusted GDP (2025 preferred, 2024 if missing)"
          >
            <SovereignCountrySelect
              value={String(formData.sovereign_country_name || '')}
              gdpValue={num('pp_adjusted_gdp')}
              gdpYear={num('ppp_gdp_year')}
              usedFallback={Boolean(formData.ppp_gdp_used_fallback)}
              countries={countries}
              loading={loading}
              disabled={pickersDisabled}
              onSelect={(name) => void handleCountrySelect(name, 'sovereign')}
            />
          </FormField>
        )}

        {option === '1b' && (
          <FormField
            label="Unverified country emissions"
            unit="tCO₂e"
            required
            tooltip="Unverified country GHG emissions"
          >
            <Input
              id="unverified_country_emissions"
              type="number"
              min={0}
              step="any"
              placeholder="0"
              value={num('unverified_country_emissions') || ''}
              onChange={(e) => onUpdateFormData('unverified_country_emissions', parseFloat(e.target.value) || 0)}
              className={FIELD_INPUT}
            />
          </FormField>
        )}

        {option === '3a' && (
          <>
            <FormField
              label="Revenue per sector"
              unit="PKR"
              required
              tooltip="Total revenue for the selected country sector"
            >
              <Input
                id="sector_revenue"
                type="number"
                min={0}
                step="any"
                placeholder="0"
                value={num('sectorRevenue') || ''}
                onChange={(e) => onUpdateFormData('sectorRevenue', parseFloat(e.target.value) || 0)}
                className={FIELD_INPUT}
              />
            </FormField>
            <FormField
              label="Sector"
              required
              tooltip="Sector intensity (GHG per revenue) comes from our reference table for the country and sector you pick"
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
                  value={String(formData.sector_key || '')}
                  intensity={num('sector_intensity')}
                  unit={String(formData.sector_intensity_unit || 'kgCO2e/PKR')}
                  sectors={sectors}
                  loading={sectorsLoading}
                  disabled={!countryName || !!sectorsError}
                  onSelect={(sector: SectorOption) => {
                    onUpdateFormData('sector_key', sector.sectorKey);
                    onUpdateFormData('sector_code', sector.sectorCode);
                    onUpdateFormData('sector_name', sector.sectorName);
                    onUpdateFormData('sector_intensity', sector.intensity);
                    onUpdateFormData('sector_intensity_unit', sector.unit);
                  }}
                />
              </div>
            </FormField>
          </>
        )}

        {option === '3b' && (
          <>
            <FormField
              label="Proxy country GHG"
              unit="tCO₂e"
              required
              tooltip="GHG emissions of the proxy country"
            >
              <Input
                id="proxy_country_emissions"
                type="number"
                min={0}
                step="any"
                placeholder="0"
                value={num('proxy_country_emissions') || ''}
                onChange={(e) => onUpdateFormData('proxy_country_emissions', parseFloat(e.target.value) || 0)}
                className={FIELD_INPUT}
              />
            </FormField>
            <FormField
              label="Proxy country"
              required
              tooltip="Proxy country for PPP-adjusted GDP"
            >
              <SovereignCountrySelect
                value={String(formData.proxy_sovereign_country_name || '')}
                gdpValue={num('proxy_pp_adjusted_gdp')}
                gdpYear={num('proxy_ppp_gdp_year')}
                usedFallback={Boolean(formData.proxy_ppp_gdp_used_fallback)}
                countries={countries}
                loading={loading}
                disabled={pickersDisabled}
                placeholder="Choose proxy country"
                onSelect={(name) => void handleCountrySelect(name, 'proxy_sovereign')}
              />
            </FormField>
          </>
        )}
      </FieldGrid>
    </InputSection>
  );
};

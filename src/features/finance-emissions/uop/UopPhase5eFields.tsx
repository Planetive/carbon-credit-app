import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormattedNumberInput } from "@/components/shared/finance/FormattedNumberInput";
import { FIELD_INPUT, FieldGrid, FormField } from "../forms/InputLayout";
import { SovereignCountrySelect } from "../forms/SovereignCountrySelect";
import { useSovereignPppGdp } from "../hooks/useSovereignPppGdp";
import { createNestedChildAsset, createVehicleRow } from "./state";
import type {
  UopEstimationInputs,
  UopNestedChildAsset,
  UopUnderlyingAssetClass,
  UopVehicleRow,
  UopYesNo,
} from "./types";
import { UOP_LOAN_TYPE } from "../config/loanTypeOptions";

export { createNestedChildAsset, createVehicleRow };

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600 mt-1">{message}</p>;
}

function MoneyInput({
  value,
  onChange,
  onBlur,
  placeholder = "",
}: {
  value: number | null;
  onChange: (next: number | null) => void;
  onBlur?: () => void;
  placeholder?: string;
}) {
  return (
    <FormattedNumberInput
      value={value}
      placeholder={placeholder}
      onChange={onChange}
      onClear={() => onChange(null)}
      onBlur={onBlur}
    />
  );
}

/** Sovereign §5.9 — country drives PPP GDP catalog; emissions entered or confirmed by employee. */
export function SovereignEstimationExtras({
  value,
  onChange,
  errors,
  prefix,
  onTouch,
  reportingYear,
}: {
  value: UopEstimationInputs;
  onChange: (patch: Partial<UopEstimationInputs>) => void;
  errors: Record<string, string>;
  prefix: string;
  onTouch: (key: string) => void;
  reportingYear?: string;
}) {
  const { countries, loading, error, reload, applyCountrySelection } = useSovereignPppGdp();
  const option = value.pcafOption;
  const preferredYear = value.preferredPppGdpYear || reportingYear || "2025";
  const needsFallbackConfirm =
    Boolean(value.ppAdjustedGdp) &&
    String(value.pppGdpYear) === "2024" &&
    String(preferredYear) === "2025";

  const onCountry = async (countryName: string) => {
    const resolved = await applyCountrySelection(countryName);
    if (!resolved) {
      onChange({
        sovereignCountryName: countryName,
        ppAdjustedGdp: null,
        pppGdpYear: "",
        pppGdpSource: "",
        allowPppGdpFallback: false,
        preferredPppGdpYear: preferredYear,
      });
      return;
    }
    const year = String(resolved.ppp_gdp_year);
    const fallback = Boolean(resolved.ppp_gdp_used_fallback) || year === "2024";
    onChange({
      sovereignCountryName: resolved.sovereign_country_name,
      ppAdjustedGdp: resolved.pp_adjusted_gdp,
      pppGdpYear: year,
      pppGdpSource: "ref.ppp_adjusted_gdp",
      preferredPppGdpYear: preferredYear,
      allowPppGdpFallback: fallback ? value.allowPppGdpFallback : false,
      factorGeography: resolved.sovereign_country_name,
    });
  };

  return (
    <div className="space-y-3 rounded-xl border border-[#E8EEF0] bg-[#F8FAFC] p-3">
      <p className="text-sm text-[#334155]">
        Government debt reuses the existing sovereign calculator (PCAF §5.9): outstanding ÷ PPP-adjusted GDP × country emissions.
        National GDP is never used for a region.
      </p>
      {error && (
        <div className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-red-800">{error}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void reload()}>
            Retry
          </Button>
        </div>
      )}
      <FieldGrid>
        <FormField label="Country" required tooltip="Loads PPP-adjusted GDP from the catalog. Prefer reporting-year 2025 when present." span>
          <SovereignCountrySelect
            value={value.sovereignCountryName}
            gdpValue={value.ppAdjustedGdp || 0}
            gdpYear={Number(value.pppGdpYear) || 0}
            countries={countries}
            loading={loading}
            disabled={loading || !!error}
            onSelect={(name) => {
              void onCountry(name);
              onTouch(`${prefix}.estimation.sovereignCountryName`);
            }}
          />
          <ErrorText message={errors[`${prefix}.estimation.sovereignCountryName`]} />
        </FormField>
        <FormField label="PPP-adjusted GDP" unit="currency (PPP)" tooltip="From ref.ppp_adjusted_gdp. Not typed.">
          <Input
            className={FIELD_INPUT}
            readOnly
            value={
              value.ppAdjustedGdp != null
                ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value.ppAdjustedGdp)
                : ""
            }
            placeholder={loading ? "Loading…" : "Select a country"}
          />
          {value.pppGdpSource ? (
            <p className="text-xs text-[#64748B] mt-1">
              Source: {value.pppGdpSource}
              {value.pppGdpYear ? ` · year ${value.pppGdpYear}` : ""}
              {needsFallbackConfirm ? " · 2024 fallback — confirmation required" : ""}
            </p>
          ) : (
            <p className="text-xs text-amber-700 mt-1">No catalog GDP yet — calculation stays incomplete without it.</p>
          )}
        </FormField>
        {needsFallbackConfirm && (
          <FormField
            label="Confirm 2024 PPP-GDP fallback"
            required
            span
            tooltip="2024 catalog GDP is never used silently when 2025 is preferred. Confirm only with source evidence."
          >
            <label className="flex items-start gap-2 text-sm text-[#334155]">
              <input
                type="checkbox"
                className="mt-1"
                checked={value.allowPppGdpFallback}
                onChange={(e) => onChange({ allowPppGdpFallback: e.target.checked, preferredPppGdpYear: preferredYear })}
              />
              <span>
                I confirm using catalog year {value.pppGdpYear} because preferred year {preferredYear} is unavailable
                for this country (source: {value.pppGdpSource || "ref.ppp_adjusted_gdp"}).
              </span>
            </label>
            <ErrorText message={errors[`${prefix}.estimation.allowPppGdpFallback`]} />
          </FormField>
        )}
        {(option === "1a" || !option) && (
          <FormField label="Verified country emissions" required unit="tCO₂e" tooltip="Territorial emissions for the same country and year.">
            <MoneyInput
              value={value.verifiedCountryEmissions}
              onChange={(verifiedCountryEmissions) =>
                onChange({
                  verifiedCountryEmissions,
                  emissionFactor: verifiedCountryEmissions,
                  factorUnit: "tCO2e",
                  factorSource: value.factorSource || "UNFCCC / verified inventory",
                  factorConfirmed: verifiedCountryEmissions != null,
                })
              }
              onBlur={() => onTouch(`${prefix}.estimation.verifiedCountryEmissions`)}
            />
            <ErrorText message={errors[`${prefix}.estimation.verifiedCountryEmissions`]} />
          </FormField>
        )}
        {option === "1b" && (
          <FormField label="Unverified country emissions" required unit="tCO₂e">
            <MoneyInput
              value={value.unverifiedCountryEmissions}
              onChange={(unverifiedCountryEmissions) =>
                onChange({
                  unverifiedCountryEmissions,
                  emissionFactor: unverifiedCountryEmissions,
                  factorUnit: "tCO2e",
                  factorSource: value.factorSource || "Unverified country inventory",
                  factorConfirmed: unverifiedCountryEmissions != null,
                })
              }
              onBlur={() => onTouch(`${prefix}.estimation.unverifiedCountryEmissions`)}
            />
            <ErrorText message={errors[`${prefix}.estimation.unverifiedCountryEmissions`]} />
          </FormField>
        )}
      </FieldGrid>
    </div>
  );
}

/** Sub-sovereign §5.10 — user-provided regional GDP and territorial emissions only. */
export function SubSovereignEstimationFields({
  value,
  onChange,
  errors,
  prefix,
  onTouch,
  currency,
  reportingYear,
}: {
  value: UopEstimationInputs;
  onChange: (patch: Partial<UopEstimationInputs>) => void;
  errors: Record<string, string>;
  prefix: string;
  onTouch: (key: string) => void;
  currency: string;
  reportingYear: string;
}) {
  const option = value.pcafOption;
  return (
    <div className="space-y-3 rounded-xl border border-[#E8EEF0] bg-[#F8FAFC] p-3">
      <p className="text-sm text-[#334155]">
        Sub-sovereign debt (PCAF §5.10): outstanding ÷ regional PPP-adjusted GDP × regional territorial emissions
        (attribution capped at 1). Enter regional figures with sources. National catalog GDP or national emissions are
        never used as if they were regional.
      </p>
      <FieldGrid>
        <FormField label="Issuer kind" required>
          <select
            className={FIELD_INPUT}
            value={value.subSovereignIssuerKind}
            onChange={(e) =>
              onChange({
                subSovereignIssuerKind: e.target.value as UopEstimationInputs["subSovereignIssuerKind"],
              })
            }
          >
            <option value="">Choose…</option>
            <option value="sovereign-like">Sovereign-like territory (state / province / city)</option>
            <option value="corporate-like">Corporate-like (use business loan methods instead)</option>
          </select>
          <ErrorText message={errors[`${prefix}.estimation.subSovereignIssuerKind`]} />
        </FormField>
        <FormField label="Region / territory" required>
          <Input
            className={FIELD_INPUT}
            value={value.regionName}
            onChange={(e) => onChange({ regionName: e.target.value })}
            onBlur={() => onTouch(`${prefix}.estimation.regionName`)}
          />
          <ErrorText message={errors[`${prefix}.estimation.regionName`]} />
        </FormField>
        <FormField label="Country" required>
          <Input
            className={FIELD_INPUT}
            value={value.sovereignCountryName}
            onChange={(e) => onChange({ sovereignCountryName: e.target.value })}
            onBlur={() => onTouch(`${prefix}.estimation.sovereignCountryName`)}
          />
          <ErrorText message={errors[`${prefix}.estimation.sovereignCountryName`]} />
        </FormField>
        <FormField label="Reporting year" required>
          <Input
            className={FIELD_INPUT}
            value={value.regionalGdpYear || reportingYear}
            onChange={(e) => onChange({ regionalGdpYear: e.target.value, regionalEmissionsYear: e.target.value })}
          />
        </FormField>
        <FormField label="Regional PPP-adjusted GDP" required unit={value.regionalGdpCurrency || currency}>
          <MoneyInput
            value={value.regionalPppAdjustedGdp}
            onChange={(regionalPppAdjustedGdp) => onChange({ regionalPppAdjustedGdp, ppAdjustedGdp: regionalPppAdjustedGdp })}
          />
          <ErrorText message={errors[`${prefix}.estimation.regionalPppAdjustedGdp`]} />
        </FormField>
        <FormField label="GDP currency" required>
          <Input
            className={FIELD_INPUT}
            value={value.regionalGdpCurrency || currency}
            onChange={(e) => onChange({ regionalGdpCurrency: e.target.value.toUpperCase() })}
          />
        </FormField>
        <FormField label="GDP source" required span tooltip="Must identify the regional source. Do not cite the national PPP catalog as regional GDP.">
          <Input
            className={FIELD_INPUT}
            value={value.regionalGdpSource}
            onChange={(e) => onChange({ regionalGdpSource: e.target.value, pppGdpSource: e.target.value })}
          />
          <ErrorText message={errors[`${prefix}.estimation.regionalGdpSource`]} />
        </FormField>
        <FormField
          label="Or: regional nominal GDP"
          unit={value.regionalGdpCurrency || currency}
          tooltip="Annex 10.3: multiply by the country PPP adjustment factor when regional PPP-GDP is unavailable."
        >
          <MoneyInput value={value.regionalNominalGdp} onChange={(regionalNominalGdp) => onChange({ regionalNominalGdp })} />
        </FormField>
        <FormField label="Country PPP adjustment factor" tooltip="country PPP-GDP ÷ country nominal GDP">
          <MoneyInput
            value={value.countryPppAdjustmentFactor}
            onChange={(countryPppAdjustmentFactor) => onChange({ countryPppAdjustmentFactor })}
          />
        </FormField>
        {(option === "1a" || !option) && (
          <FormField label="Verified regional emissions" required unit="tCO₂e">
            <MoneyInput
              value={value.verifiedRegionalEmissions}
              onChange={(verifiedRegionalEmissions) =>
                onChange({
                  verifiedRegionalEmissions,
                  emissionFactor: verifiedRegionalEmissions,
                  factorUnit: "tCO2e",
                  factorConfirmed: verifiedRegionalEmissions != null,
                })
              }
            />
          </FormField>
        )}
        {option === "1b" && (
          <FormField label="Unverified regional emissions" required unit="tCO₂e">
            <MoneyInput
              value={value.unverifiedRegionalEmissions}
              onChange={(unverifiedRegionalEmissions) =>
                onChange({
                  unverifiedRegionalEmissions,
                  emissionFactor: unverifiedRegionalEmissions,
                  factorUnit: "tCO2e",
                  factorConfirmed: unverifiedRegionalEmissions != null,
                })
              }
            />
          </FormField>
        )}
        {(option === "4a" || option === "4b") && (
          <FormField label="Proxy higher-admin emissions" required unit="tCO₂e" tooltip="Explicit proxy only — not a silent national substitution.">
            <MoneyInput
              value={value.proxyRegionalEmissions}
              onChange={(proxyRegionalEmissions) =>
                onChange({
                  proxyRegionalEmissions,
                  emissionFactor: proxyRegionalEmissions,
                  factorUnit: "tCO2e",
                  factorConfirmed: proxyRegionalEmissions != null,
                })
              }
            />
          </FormField>
        )}
        <FormField label="Emissions source" required span>
          <Input
            className={FIELD_INPUT}
            value={value.regionalEmissionsSource}
            onChange={(e) => onChange({ regionalEmissionsSource: e.target.value, factorSource: e.target.value })}
          />
          <ErrorText message={errors[`${prefix}.estimation.regionalEmissionsSource`]} />
        </FormField>
        <FormField label="Emissions year" required>
          <Input
            className={FIELD_INPUT}
            value={value.regionalEmissionsYear || reportingYear}
            onChange={(e) => onChange({ regionalEmissionsYear: e.target.value, factorYear: e.target.value })}
          />
        </FormField>
        <FormField label="Emissions unit">
          <Input
            className={FIELD_INPUT}
            value={value.regionalEmissionsUnit || "tCO2e"}
            onChange={(e) => onChange({ regionalEmissionsUnit: e.target.value, factorUnit: e.target.value })}
          />
        </FormField>
      </FieldGrid>
    </div>
  );
}

/** Nested UoP §5.7 look-through — child assets + child capital; no invented recursive formula. */
export function NestedEstimationFields({
  value,
  onChange,
  errors,
  prefix,
  onTouch,
  currency,
}: {
  value: UopEstimationInputs;
  onChange: (patch: Partial<UopEstimationInputs>) => void;
  errors: Record<string, string>;
  prefix: string;
  onTouch: (key: string) => void;
  currency: string;
}) {
  const children = value.childAssets || [];
  const setChild = (id: string, patch: Partial<UopNestedChildAsset>) => {
    onChange({
      childAssets: children.map((row) => (row.underlyingAssetId === id ? { ...row, ...patch } : row)),
    });
  };
  const removeChild = (id: string) => {
    onChange({ childAssets: children.filter((row) => row.underlyingAssetId !== id) });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#334155]">
        When this fund holds another Use of Proceeds vehicle, enter the child fund’s assets and total capital.
        Each attribution factor is applied once. Do not nest a structure into itself.
      </p>
      <FieldGrid>
        <FormField label="Child structure id (optional)" tooltip="Used to block circular nesting.">
          <Input
            className={FIELD_INPUT}
            value={value.childStructureId}
            onChange={(e) => onChange({ childStructureId: e.target.value })}
            onBlur={() => onTouch(`${prefix}.estimation.childStructureId`)}
            placeholder="Stable id of the child UoP structure"
          />
        </FormField>
        <FormField label="Child total capital" required unit={currency || "deal currency"} tooltip="Debt + equity of the child vehicle (denominator for your allocation into the child).">
          <MoneyInput
            value={value.childTotalCapital}
            onChange={(childTotalCapital) => onChange({ childTotalCapital })}
            onBlur={() => onTouch(`${prefix}.estimation.childTotalCapital`)}
          />
          <ErrorText message={errors[`${prefix}.estimation.childTotalCapital`]} />
        </FormField>
      </FieldGrid>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[#0F172A]">Child underlying assets</p>
          <Button
            type="button"
            variant="outline"
            className="h-8"
            onClick={() => onChange({ childAssets: [...children, createNestedChildAsset()] })}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add child asset
          </Button>
        </div>
        <ErrorText message={errors[`${prefix}.estimation.childAssets`]} />
        {children.length === 0 && (
          <p className="text-sm text-amber-700">Add at least one child asset. A single collapsed nested total is not accepted.</p>
        )}
        {children.map((child, index) => {
          const cPrefix = `${prefix}.estimation.childAssets.${child.underlyingAssetId}`;
          return (
            <div key={child.underlyingAssetId} className="rounded-xl border border-[#E8EEF0] bg-white p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-[#0F172A]">Child asset {index + 1}</p>
                <Button type="button" variant="ghost" className="h-8 text-red-700" onClick={() => removeChild(child.underlyingAssetId)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <FieldGrid>
                <FormField label="Name" required>
                  <Input
                    className={FIELD_INPUT}
                    value={child.name}
                    onChange={(e) => setChild(child.underlyingAssetId, { name: e.target.value })}
                    onBlur={() => onTouch(`${cPrefix}.name`)}
                  />
                  <ErrorText message={errors[`${cPrefix}.name`]} />
                </FormField>
                <FormField label="Type" required>
                  <select
                    className={FIELD_INPUT}
                    value={child.assetClass}
                    onChange={(e) =>
                      setChild(child.underlyingAssetId, {
                        assetClass: e.target.value as UopUnderlyingAssetClass | "",
                      })
                    }
                  >
                    <option value="">Choose…</option>
                    <option value="listed-equity">Listed shares</option>
                    <option value="corporate-bond">Corporate bond</option>
                    <option value="business-loan">Business loan</option>
                    <option value="project-finance">Project finance</option>
                    <option value="mortgage">Mortgage</option>
                    <option value="commercial-real-estate">Commercial property</option>
                    <option value="motor-vehicle-loan">Vehicle loan</option>
                    <option value="sovereign-debt">Government bond</option>
                    <option value={UOP_LOAN_TYPE}>Another nested UoP (deeper nest)</option>
                  </select>
                  <ErrorText message={errors[`${cPrefix}.assetClass`]} />
                </FormField>
                <FormField label="Amount in child" required unit={currency}>
                  <MoneyInput
                    value={child.allocatedOutstanding}
                    onChange={(allocatedOutstanding) => setChild(child.underlyingAssetId, { allocatedOutstanding })}
                  />
                  <ErrorText message={errors[`${cPrefix}.allocatedOutstanding`]} />
                </FormField>
                <FormField label="Child asset value (EVIC / equity+debt / property)" unit={currency}>
                  <MoneyInput
                    value={child.totalAssetValue}
                    onChange={(totalAssetValue) => setChild(child.underlyingAssetId, { totalAssetValue })}
                  />
                </FormField>
                <FormField label="Has reported emissions?" required>
                  <select
                    className={FIELD_INPUT}
                    value={child.hasReportedEmissions}
                    onChange={(e) =>
                      setChild(child.underlyingAssetId, {
                        hasReportedEmissions: e.target.value as UopYesNo,
                      })
                    }
                  >
                    <option value="">Choose…</option>
                    <option value="yes">Yes</option>
                    <option value="no">No — estimate separately if supported</option>
                  </select>
                </FormField>
                {child.hasReportedEmissions === "yes" && (
                  <>
                    <FormField label="Scope 1" unit="tCO₂e">
                      <MoneyInput
                        value={child.scope1Emissions}
                        onChange={(scope1Emissions) => setChild(child.underlyingAssetId, { scope1Emissions })}
                      />
                    </FormField>
                    <FormField label="Scope 2" unit="tCO₂e">
                      <MoneyInput
                        value={child.scope2Emissions}
                        onChange={(scope2Emissions) => setChild(child.underlyingAssetId, { scope2Emissions })}
                      />
                    </FormField>
                    <FormField label="Scope 3" unit="tCO₂e">
                      <MoneyInput
                        value={child.scope3Emissions}
                        onChange={(scope3Emissions) => setChild(child.underlyingAssetId, { scope3Emissions })}
                      />
                    </FormField>
                    <FormField label="Verification">
                      <select
                        className={FIELD_INPUT}
                        value={child.verificationStatus}
                        onChange={(e) =>
                          setChild(child.underlyingAssetId, {
                            verificationStatus: e.target.value as UopNestedChildAsset["verificationStatus"],
                          })
                        }
                      >
                        <option value="">Choose…</option>
                        <option value="verified">Verified</option>
                        <option value="unverified">Unverified</option>
                      </select>
                    </FormField>
                  </>
                )}
                <FormField label="Data source" span>
                  <Input
                    className={FIELD_INPUT}
                    value={child.dataSource}
                    onChange={(e) => setChild(child.underlyingAssetId, { dataSource: e.target.value })}
                  />
                </FormField>
              </FieldGrid>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Multi-vehicle motor rows — preserves independent vehicle IDs. */
export function VehicleRowsEditor({
  value,
  onChange,
  errors,
  prefix,
  currency,
  optionFields,
}: {
  value: UopEstimationInputs;
  onChange: (patch: Partial<UopEstimationInputs>) => void;
  errors: Record<string, string>;
  prefix: string;
  currency: string;
  optionFields: Set<string>;
}) {
  const vehicles = value.vehicles || [];
  const setRow = (id: string, patch: Partial<UopVehicleRow>) => {
    onChange({ vehicles: vehicles.map((row) => (row.id === id ? { ...row, ...patch } : row)) });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-[#334155]">
          Add one row per vehicle when the sleeve finances several cars. Gallons are not supported — use litres.
        </p>
        <Button
          type="button"
          variant="outline"
          className="h-8 shrink-0"
          onClick={() => onChange({ vehicles: [...vehicles, createVehicleRow()] })}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add vehicle
        </Button>
      </div>
      {vehicles.map((row, index) => (
        <div key={row.id} className="rounded-xl border border-[#E8EEF0] bg-white p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Vehicle {index + 1}</p>
            <Button
              type="button"
              variant="ghost"
              className="h-8 text-red-700"
              onClick={() => onChange({ vehicles: vehicles.filter((item) => item.id !== row.id) })}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <FieldGrid>
            <FormField label="Vehicle name / id">
              <Input className={FIELD_INPUT} value={row.name} onChange={(e) => setRow(row.id, { name: e.target.value })} />
            </FormField>
            <FormField label="Outstanding" unit={currency}>
              <MoneyInput value={row.outstandingAmount} onChange={(outstandingAmount) => setRow(row.id, { outstandingAmount })} />
            </FormField>
            <FormField label="Value at origination" unit={currency}>
              <MoneyInput value={row.valueAtOrigination} onChange={(valueAtOrigination) => setRow(row.id, { valueAtOrigination })} />
            </FormField>
            {optionFields.has("fuel") && (
              <FormField label="Fuel" unit={row.fuelUnit || "litre"}>
                <MoneyInput value={row.fuelConsumption} onChange={(fuelConsumption) => setRow(row.id, { fuelConsumption })} />
              </FormField>
            )}
            {optionFields.has("distance") && (
              <FormField label="Distance" unit={row.distanceUnit || "km"}>
                <MoneyInput value={row.distanceTraveled} onChange={(distanceTraveled) => setRow(row.id, { distanceTraveled })} />
              </FormField>
            )}
            {optionFields.has("efficiency") && (
              <FormField label="Efficiency" unit="L/km">
                <MoneyInput value={row.efficiency} onChange={(efficiency) => setRow(row.id, { efficiency })} />
              </FormField>
            )}
            <FormField label="Fuel unit">
              <select
                className={FIELD_INPUT}
                value={row.fuelUnit}
                onChange={(e) => setRow(row.id, { fuelUnit: e.target.value })}
              >
                <option value="litre">litre</option>
                <option value="kWh">kWh (EV)</option>
              </select>
            </FormField>
          </FieldGrid>
          <ErrorText message={errors[`${prefix}.estimation.vehicles.${row.id}`]} />
        </div>
      ))}
    </div>
  );
}

/** Economic intensity — currency + price year; never EPA/DESNZ electricity as EEIO. */
export function EconomicBasisFields({
  value,
  onChange,
  errors,
  prefix,
  onTouch,
  dealCurrency,
}: {
  value: UopEstimationInputs;
  onChange: (patch: Partial<UopEstimationInputs>) => void;
  errors: Record<string, string>;
  prefix: string;
  onTouch: (key: string) => void;
  dealCurrency: string;
}) {
  return (
    <FieldGrid>
      <FormField
        label="Activity currency"
        required
        tooltip="Must match the approved economic intensity factor currency. Do not use electricity or fuel factors here."
      >
        <Input
          className={FIELD_INPUT}
          value={value.activityCurrency || dealCurrency}
          onChange={(e) => onChange({ activityCurrency: e.target.value.toUpperCase() })}
          onBlur={() => onTouch(`${prefix}.estimation.activityCurrency`)}
          placeholder={dealCurrency || "USD"}
        />
        <ErrorText message={errors[`${prefix}.estimation.activityCurrency`]} />
      </FormField>
      <FormField label="Price year" required tooltip="Price year of revenue or the intensity table.">
        <Input
          className={FIELD_INPUT}
          value={value.priceYear}
          onChange={(e) => onChange({ priceYear: e.target.value })}
          onBlur={() => onTouch(`${prefix}.estimation.priceYear`)}
          placeholder="e.g. 2024"
        />
        <ErrorText message={errors[`${prefix}.estimation.priceYear`]} />
      </FormField>
      {(value.libraryCurrencyCode || value.libraryPriceYear) && (
        <p className="text-xs text-[#64748B] sm:col-span-2">
          Approved factor: {value.libraryCurrencyCode || "currency n/a"}
          {value.libraryPriceYear ? ` · price year ${value.libraryPriceYear}` : ""}
          {value.libraryFactorUnit ? ` · ${value.libraryFactorUnit}` : ""}
        </p>
      )}
    </FieldGrid>
  );
}

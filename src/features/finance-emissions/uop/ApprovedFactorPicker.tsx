import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FIELD_INPUT, FormField } from "../forms/InputLayout";
import { matchApprovedFactors, submitManualFactor, type ApprovedLibraryFactor } from "@/api/factorLibrary";
import { ApiError } from "@/api/client";
import {
  LIBRARY_COUNTRIES,
  NO_VERIFIED_FACTOR_MESSAGE,
  activityKeyFor,
  applyConfirmedFactor,
  clearLibrarySelection,
  libraryClassFor,
} from "./factorLibrary";
import type { UopEstimationInputs, UopUnderlyingAssetClass } from "./types";
import type { UopPcafOptionDef } from "./underlyingOptions";

const UNSUPPORTED_GEOGRAPHIES = new Set(["Pakistan", "United Arab Emirates"]);

export function ApprovedFactorPicker({
  value,
  option,
  assetClass,
  reportingYear,
  currency,
  onChange,
}: {
  value: UopEstimationInputs;
  option?: UopPcafOptionDef;
  assetClass: UopUnderlyingAssetClass | "";
  reportingYear: string;
  currency: string;
  onChange: (patch: Partial<UopEstimationInputs>) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [matches, setMatches] = useState<ApprovedLibraryFactor[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const libraryClass = libraryClassFor(assetClass, option);
  const defaultActivity = activityKeyFor(option, value.sectorKey);
  const country = value.factorGeography || "";
  const year = Number(reportingYear || value.factorYear || 0);
  const activity = value.sectorKey || defaultActivity;
  const economicUnavailable = libraryClass === "economic";
  const geoUnavailable = UNSUPPORTED_GEOGRAPHIES.has(country);
  const productionUnavailable = option?.id === "2b" && option.fields.includes("production");

  const search = async () => {
    if (economicUnavailable || geoUnavailable || productionUnavailable) {
      setMatches([]);
      setManualOpen(true);
      setMessage(NO_VERIFIED_FACTOR_MESSAGE);
      onChange(clearLibrarySelection(value));
      return;
    }
    setBusy(true);
    setMessage("");
    setMatches([]);
    try {
      const result = await matchApprovedFactors({
        library_class: libraryClass,
        geography: country,
        activity_key: activity,
        reporting_year: year,
        unit: value.factorUnit || option?.factorUnitHint || "",
        currency_code: libraryClass === "economic" ? value.activityCurrency || currency : "",
        price_year: libraryClass === "economic" && value.priceYear ? Number(value.priceYear) : null,
      });
      setMatches(result.factors || []);
      if (!result.factors?.length) {
        setMessage(NO_VERIFIED_FACTOR_MESSAGE);
        setManualOpen(true);
        onChange(clearLibrarySelection(value));
      } else if (result.factors.length === 1) {
        setMessage("One approved factor matches. Confirm it before calculating.");
      } else {
        setMessage("More than one approved factor matches. Choose the source that applies.");
      }
    } catch (error) {
      const text = error instanceof ApiError ? error.message : NO_VERIFIED_FACTOR_MESSAGE;
      setMessage(text.includes("not available") ? NO_VERIFIED_FACTOR_MESSAGE : text);
      setManualOpen(true);
    } finally {
      setBusy(false);
    }
  };

  const confirm = (factor: ApprovedLibraryFactor) => {
    onChange(applyConfirmedFactor(value, factor));
    setMessage(`Confirmed ${factor.source_organization} ${factor.applicable_year} ${factor.unit}.`);
  };

  const submitManual = async () => {
    if (!value.manualFactorRationale.trim() || value.emissionFactor == null) return;
    setBusy(true);
    try {
      await submitManualFactor({
        library_class: libraryClass,
        geography: country,
        sector_or_activity: activity,
        activity_key: activity,
        factor_value: value.emissionFactor,
        unit: value.factorUnit,
        applicable_year: year,
        publication_year: Number(value.factorYear || year),
        source_organization: value.factorSource,
        source_document: value.factorDatasetCode,
        rationale: value.manualFactorRationale,
        currency_code: value.activityCurrency || currency,
        price_year: value.priceYear ? Number(value.priceYear) : null,
      });
      setMessage("Submitted for review. It is not used until an administrator approves it.");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Manual factor could not be submitted.");
    } finally {
      setBusy(false);
    }
  };

  if (value.factorConfirmed && value.libraryEntryId) {
    return (
      <div className="rounded-xl border border-[#BFE3D3] bg-[#EAF7F1] p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#0F6E56]">Approved factor</p>
        <p className="text-lg font-semibold text-[#0F172A]">
          {value.emissionFactor} {value.factorUnit}
        </p>
        <p className="text-sm text-[#334155]">
          {value.factorSource || "Approved library"}
          {value.factorYear ? ` · ${value.factorYear}` : ""}
          {value.factorGeography ? ` · ${value.factorGeography}` : ""}
        </p>
        {value.factorDatasetCode ? (
          <p className="text-xs text-[#64748B]">{value.factorDatasetCode}{value.libraryDatasetVersion ? ` ${value.libraryDatasetVersion}` : ""}</p>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          className="h-8 px-0 text-[#0F6E56]"
          onClick={() => {
            onChange(clearLibrarySelection(value));
            setMatches([]);
            setMessage("");
          }}
        >
          Change factor
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-[#E8EEF0] bg-[#F8FAFC] p-4">
      <div>
        <p className="text-sm font-semibold text-[#0F172A]">Approved emission factor</p>
        <p className="text-xs text-[#64748B] mt-0.5">
          Look up a factor already in the library. A typed number is not used.
        </p>
      </div>
      {economicUnavailable && (
        <p className="text-sm text-[#64748B]">
          Economic (sector-intensity) factors are not available in this library. Choose a physical method, or submit a published factor for review.
        </p>
      )}
      {productionUnavailable && (
        <p className="text-sm text-[#64748B]">Production emission factors are not available in this library yet.</p>
      )}
      {geoUnavailable && (
        <p className="text-sm text-[#64748B]">
          No approved grid or fuel factor is available for {country}. The calculator will not substitute another country’s factor.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Country" required>
          <select
            className={`${FIELD_INPUT} w-full rounded-md border px-3`}
            value={country}
            onChange={(e) => onChange({ factorGeography: e.target.value, factorConfirmed: false })}
          >
            <option value="">Select country</option>
            {LIBRARY_COUNTRIES.map((item) => (
              <option key={item} value={item}>
                {UNSUPPORTED_GEOGRAPHIES.has(item) ? `${item} (no approved factor)` : item}
              </option>
            ))}
            {country && !LIBRARY_COUNTRIES.includes(country as (typeof LIBRARY_COUNTRIES)[number]) ? (
              <option value={country}>{country}</option>
            ) : null}
          </select>
        </FormField>
        <FormField label="Activity" required>
          <Input
            className={FIELD_INPUT}
            value={activity}
            onChange={(e) => onChange({ sectorKey: e.target.value, factorConfirmed: false })}
            placeholder={defaultActivity}
          />
        </FormField>
      </div>
      <Button
        type="button"
        variant="outline"
        className="h-9"
        disabled={busy || !country || !year || economicUnavailable || geoUnavailable || productionUnavailable}
        onClick={() => void search()}
      >
        {busy ? "Looking up…" : "Find approved factor"}
      </Button>
      {message ? <p className="text-sm text-[#334155]">{message}</p> : null}
      {matches.map((factor) => (
        <div key={factor.id} className="rounded-xl border border-[#CBD5E1] bg-white p-4 space-y-1">
          <p className="text-base font-semibold text-[#0F172A]">
            {factor.factor_value} {factor.unit}
          </p>
          <p className="text-sm text-[#334155]">{factor.source_organization}</p>
          <p className="text-xs text-[#64748B]">
            Year {factor.applicable_year}
            {" · "}
            {factor.geography}
            {factor.dataset_code ? ` · ${factor.dataset_code}` : ""}
            {factor.dataset_version ? ` ${factor.dataset_version}` : ""}
          </p>
          <p className="text-xs text-[#94A3B8]">Units: {factor.unit}</p>
          <Button type="button" className="mt-2 h-8 bg-[#0F6E56] hover:bg-[#0C5A47]" onClick={() => confirm(factor)}>
            Use this factor
          </Button>
        </div>
      ))}
      {(manualOpen || message === NO_VERIFIED_FACTOR_MESSAGE) && (
        <div className="space-y-2 pt-1">
          <p className="text-sm font-medium text-[#334155]">{NO_VERIFIED_FACTOR_MESSAGE}</p>
          <p className="text-xs text-[#64748B]">
            You can send a published factor for administrator review. It is not used in the calculation until it is approved.
          </p>
          <FormField label="Why this published factor should be reviewed">
            <Input
              className={FIELD_INPUT}
              value={value.manualFactorRationale}
              onChange={(e) => onChange({ manualFactorRationale: e.target.value })}
              placeholder="Source, geography, year, and units"
            />
          </FormField>
          <Button type="button" variant="outline" className="h-9" disabled={busy} onClick={() => void submitManual()}>
            Submit for review
          </Button>
        </div>
      )}
    </div>
  );
}

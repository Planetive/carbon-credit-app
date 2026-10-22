import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/api/client";
import {
  calcEpaStationary,
  createEpaStationaryRecord,
  updateEpaStationaryRecord,
  type StationaryCalcResponse,
} from "@/api/calc";
import { getOrCreateDraftAssessment, listEmissionActivities, type EmissionActivity } from "@/api/ghg";
import {
  ensureEpaFuelFactors,
  type EpaFuelFactorsMap,
} from "@/features/emission-calculator/scope1/components/FuelEmissions";
import {
  applyCalcFailure,
  applyCalcSuccess,
  applySaveFailure,
  applySaveSuccess,
  blankStationaryEntry,
  buildStationarySaveBody,
  canCalculate,
  canSave,
  changeStationaryInputs,
  activityContextFromStationaryActivity,
  isEpaStationaryActivity,
  physicalUnitsForFuel,
  saveUsesUpdate,
  stateFromStationaryActivity,
  type StationaryActivityContext,
  type StationaryEntryState,
} from "./stationaryEntry";

type Props = {
  equipmentType: string;
  site: string;
  equipmentId: string;
  period: string;
  counterpartyId?: string;
  onVerifiedKgChange?: (kg: number | null) => void;
  onEditActivity?: (context: StationaryActivityContext) => void;
};

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 404) {
      return "This API does not have the stationary calculation endpoint yet. Deploy the updated FastAPI service, then retry. Nothing was calculated locally.";
    }
    return err.message || fallback;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function GasLine({
  label,
  gas,
}: {
  label: string;
  gas: StationaryCalcResponse["gases"]["co2"];
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="text-sm text-gray-900">{gas.mass_kg} kg</p>
      <p className="text-xs text-gray-500">{gas.co2e_kg} kg CO2e</p>
    </div>
  );
}

export function StationaryEntryForm({
  equipmentType,
  site,
  equipmentId,
  period,
  counterpartyId,
  onVerifiedKgChange,
  onEditActivity,
}: Props) {
  const { toast } = useToast();
  const onVerifiedRef = useRef(onVerifiedKgChange);
  onVerifiedRef.current = onVerifiedKgChange;
  const [factors, setFactors] = useState<EpaFuelFactorsMap | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [entry, setEntry] = useState<StationaryEntryState>(blankStationaryEntry);
  const [records, setRecords] = useState<EmissionActivity[]>([]);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);

  const categories = useMemo(() => Object.keys(factors || {}), [factors]);
  const fuels = useMemo(
    () => (entry.category && factors ? Object.keys(factors[entry.category] || {}) : []),
    [factors, entry.category]
  );
  const units = useMemo(
    () => physicalUnitsForFuel(factors?.[entry.category]?.[entry.fuel]),
    [factors, entry.category, entry.fuel]
  );

  const loadCatalog = () => {
    setCatalogLoading(true);
    setCatalogError(null);
    ensureEpaFuelFactors()
      .then((map) => {
        if (!map) {
          setFactors(null);
          setCatalogError("EPA fuel factors could not be loaded. Calculations stay unavailable until they load.");
          return;
        }
        setFactors(map);
      })
      .catch((err) => {
        setFactors(null);
        setCatalogError(errorMessage(err, "EPA fuel factors could not be loaded."));
      })
      .finally(() => setCatalogLoading(false));
  };

  const loadRecords = () => {
    setRecordsError(null);
    listEmissionActivities({
      scope: 1,
      category: "stationary_combustion",
      legacy_source: "epa_stationary",
    })
      .then((rows) => setRecords((rows || []).filter(isEpaStationaryActivity)))
      .catch((err) => {
        setRecords([]);
        setRecordsError(errorMessage(err, "Saved stationary entries could not be loaded."));
      });
  };

  useEffect(() => {
    loadCatalog();
    loadRecords();
  }, []);

  useEffect(() => {
    const kg = canSave(entry) && entry.result ? Number(entry.result.total_kg_co2e) : null;
    onVerifiedRef.current?.(kg != null && Number.isFinite(kg) ? kg : null);
  }, [entry]);

  const calculate = async () => {
    if (!canCalculate(entry)) return;
    const snapshot = entry;
    setCalculating(true);
    setEntry((current) => ({ ...current, error: null, result: null, verifiedKey: null }));
    try {
      const result = await calcEpaStationary({
        fuel: snapshot.fuel.trim(),
        category: snapshot.category.trim(),
        quantity: snapshot.quantity.trim(),
        unit: snapshot.unit.trim(),
        gwp_version: "AR5",
      });
      setEntry((current) => {
        if (
          current.category !== snapshot.category ||
          current.fuel !== snapshot.fuel ||
          current.unit !== snapshot.unit ||
          current.quantity !== snapshot.quantity
        ) {
          return current;
        }
        return applyCalcSuccess(current, result);
      });
    } catch (err) {
      const message = errorMessage(err, "The calculation service is unavailable. Nothing was calculated locally.");
      setEntry((current) => {
        if (
          current.category !== snapshot.category ||
          current.fuel !== snapshot.fuel ||
          current.unit !== snapshot.unit ||
          current.quantity !== snapshot.quantity
        ) {
          return current;
        }
        return applyCalcFailure(current, message);
      });
    } finally {
      setCalculating(false);
    }
  };

  const save = async () => {
    if (!canSave(entry) || !period) return;
    setSaving(true);
    try {
      const assessment = await getOrCreateDraftAssessment("epa", period);
      const body = buildStationarySaveBody({
        state: entry,
        assessmentId: assessment.id,
        equipmentType,
        site,
        equipmentId,
        period,
        counterpartyId,
      });
      const saved = saveUsesUpdate(entry)
        ? await updateEpaStationaryRecord(entry.activityId as string, body)
        : await createEpaStationaryRecord(body);
      setEntry((current) => applySaveSuccess(current, saved));
      loadRecords();
      toast({
        title: saveUsesUpdate(entry) ? "Entry updated" : "Entry saved",
        description: `${saved.calculation.total_t_co2e} t CO2e`,
      });
    } catch (err) {
      const message = errorMessage(err, "The entry could not be saved. Your inputs are still here.");
      setEntry((current) => applySaveFailure(current, message));
    } finally {
      setSaving(false);
    }
  };

  const result = canSave(entry) ? entry.result : null;

  return (
    <div className="space-y-4">
      {recordsError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p>{recordsError}</p>
          <Button type="button" variant="outline" className="mt-2 h-8 rounded-lg" onClick={loadRecords}>
            Retry loading entries
          </Button>
        </div>
      )}

      {records.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
          <p className="text-xs font-medium text-gray-600">Saved stationary entries</p>
          <ul className="mt-2 space-y-1">
            {records.map((record) => (
              <li key={record.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-gray-800">
                  {String((record.raw?.inputs as { fuel?: string } | undefined)?.fuel || record.unit || "Entry")}
                  {record.emissions_tco2e != null ? ` · ${record.emissions_tco2e} t CO2e` : ""}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 rounded-lg text-xs"
                  onClick={() => {
                    onEditActivity?.(activityContextFromStationaryActivity(record));
                    setEntry(stateFromStationaryActivity(record));
                  }}
                >
                  Edit
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {catalogError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p>{catalogError}</p>
          <Button type="button" variant="outline" className="mt-2 h-8 rounded-lg" onClick={loadCatalog}>
            Retry loading fuels
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-gray-600 text-xs">Fuel category</Label>
          <Select
            value={entry.category}
            onValueChange={(category) => setEntry((current) => changeStationaryInputs(current, { category }))}
            disabled={catalogLoading || !factors}
          >
            <SelectTrigger className="mt-1.5 rounded-xl border-gray-200">
              <SelectValue placeholder={catalogLoading ? "Loading fuels…" : "Select category"} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-gray-600 text-xs">Fuel type</Label>
          <Select
            value={entry.fuel}
            onValueChange={(fuel) => setEntry((current) => changeStationaryInputs(current, { fuel }))}
            disabled={!entry.category}
          >
            <SelectTrigger className="mt-1.5 rounded-xl border-gray-200">
              <SelectValue placeholder="Select fuel" />
            </SelectTrigger>
            <SelectContent>
              {fuels.map((fuel) => (
                <SelectItem key={fuel} value={fuel}>
                  {fuel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-gray-600 text-xs">Consumption unit</Label>
          <Select
            value={entry.unit}
            onValueChange={(unit) => setEntry((current) => changeStationaryInputs(current, { unit }))}
            disabled={!entry.fuel}
          >
            <SelectTrigger className="mt-1.5 rounded-xl border-gray-200">
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              {units.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-gray-600 text-xs">Quantity</Label>
          <Input
            type="number"
            min={0}
            value={entry.quantity}
            onChange={(event) =>
              setEntry((current) => changeStationaryInputs(current, { quantity: event.target.value }))
            }
            className="mt-1.5 rounded-xl border-gray-200"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => void calculate()}
          disabled={!canCalculate(entry) || calculating || !factors}
          className="rounded-xl bg-[#1D9E75] text-white hover:bg-[#22B87E]"
        >
          {calculating ? "Calculating…" : entry.error ? "Retry calculation" : "Calculate"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void save()}
          disabled={!canSave(entry) || saving || !period}
          className="rounded-xl"
        >
          {saving ? "Saving…" : saveUsesUpdate(entry) ? "Update entry" : "Save entry"}
        </Button>
        {entry.activityId && (
          <Button
            type="button"
            variant="ghost"
            className="rounded-xl"
            onClick={() => setEntry(blankStationaryEntry())}
          >
            New entry
          </Button>
        )}
      </div>

      {entry.error && (
        <p className="text-sm text-red-700" role="alert">
          {entry.error}
        </p>
      )}

      {result && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <GasLine label="CO2" gas={result.gases.co2} />
            <GasLine label="CH4" gas={result.gases.ch4} />
            <GasLine label="N2O" gas={result.gases.n2o} />
          </div>
          <div className="text-sm text-gray-800">
            <p>Total {result.total_kg_co2e} kg CO2e</p>
            <p>Total {result.total_t_co2e} t CO2e</p>
            <p className="text-xs text-gray-500 mt-1">
              GWP {result.factor_source.gwp_version || "AR5"}
              {result.factor_source.dataset_title
                ? ` · ${result.factor_source.dataset_title}`
                : ""}
              {result.factor_source.version_label
                ? ` · ${result.factor_source.version_label}`
                : ""}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { Car, ChevronDown, Save } from "lucide-react";
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
  calcEpaMobile,
  createEpaMobileRecord,
  updateEpaMobileRecord,
  type MobileCalcResponse,
} from "@/api/calc";
import { getFactorSheet } from "@/api/factors";
import { getOrCreateDraftAssessment, listEmissionActivities, type EmissionActivity } from "@/api/ghg";
import { useOrganization } from "@/contexts/OrganizationContext";
import { activityMatchesReportingYear, matchesVerifiedCounterparty } from "@/features/emission-calculator/results/reportingYear";
import { MOBILE_DATASET_CODES, buildMobileFactorCatalog, formatYearBands, type MobileFactorCatalog } from "../mobile/mobileFactorCatalog";
import {
  applyCalcFailure,
  applyCalcSuccess,
  applySaveFailure,
  applySaveSuccess,
  biogenicTonnes,
  blankMobileEntry,
  buildMobileSaveBody,
  canCalculate,
  canSave,
  changeMobileInputs,
  isEditableMobileActivity,
  mobileEntryBlocker,
  saveUsesUpdate,
  stateFromMobileActivity,
  validReportingMonth,
  type MobileEntryState,
} from "../mobile/mobileEntry";
import { ActivitySectionShell, ChoiceCard, FormStep } from "./ActivitySectionShell";
import { LegacySavedInventory } from "./LegacySavedInventory";

type Props = {
  onDataChange?: (totalKg: number) => void;
  onSaveAndNext?: () => void;
  onInventoryChanged?: () => void;
  counterpartyId?: string;
  reportingYear?: number;
};

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message || fallback;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function GasLine({ label, gas }: { label: string; gas: MobileCalcResponse["gases"]["co2"] }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-2">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="text-sm text-gray-900">{gas.mass_kg} kg</p>
    </div>
  );
}

export function VehiclesMobileSection({
  onDataChange,
  onSaveAndNext,
  onInventoryChanged,
  counterpartyId,
  reportingYear,
}: Props) {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id || null;
  const onDataChangeRef = useRef(onDataChange);
  onDataChangeRef.current = onDataChange;
  const reportedKg = useRef(false);
  const [catalog, setCatalog] = useState<MobileFactorCatalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [entry, setEntry] = useState<MobileEntryState>(blankMobileEntry);
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [site, setSite] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  const [records, setRecords] = useState<EmissionActivity[]>([]);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);

  const vehicles = catalog?.vehicles[entry.roadClass] || [];
  const fuels = useMemo(
    () => (catalog ? catalog.fuelsFor(entry.roadClass, entry.vehicle) : []),
    [catalog, entry.roadClass, entry.vehicle]
  );
  const fuelChoice = catalog?.choiceFor(entry.roadClass, entry.vehicle, entry.fuel) || null;
  const blocker = mobileEntryBlocker(entry, catalog, period);

  const loadCatalog = () => {
    setCatalogLoading(true);
    setCatalogError(null);
    Promise.all(
      MOBILE_DATASET_CODES.map(async (code) => ({
        dataset_code: code,
        rows: await getFactorSheet(code),
      }))
    )
      .then((sheets) => setCatalog(buildMobileFactorCatalog(sheets)))
      .catch((err) => {
        setCatalog(null);
        setCatalogError(errorMessage(err, "EPA mobile factor tables could not be loaded."));
      })
      .finally(() => setCatalogLoading(false));
  };

  const loadRecords = () => {
    setRecordsError(null);
    listEmissionActivities({
      scope: 1,
      category: "mobile_combustion",
      legacy_source: "epa_mobile_v1",
    })
      .then((rows) =>
        setRecords(
          (rows || []).filter((row) => {
            if (!isEditableMobileActivity(row, organizationId)) return false;
            const meta = (row.raw?.activity_meta || {}) as Record<string, unknown>;
            return (
              activityMatchesReportingYear(meta.period, reportingYear) &&
              matchesVerifiedCounterparty(row.counterparty_id, counterpartyId)
            );
          })
        )
      )
      .catch((err) => {
        setRecords([]);
        setRecordsError(errorMessage(err, "Saved mobile entries could not be loaded."));
      });
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  useEffect(() => {
    loadRecords();
  }, [organizationId, reportingYear, counterpartyId]);

  useEffect(() => {
    if (!reportingYear) return;
    setPeriod((current) => {
      const month = /^(0[1-9]|1[0-2])$/.test(current.slice(5, 7)) ? current.slice(5, 7) : "01";
      return `${reportingYear}-${month}`;
    });
  }, [reportingYear]);

  useEffect(() => {
    const kg = canSave(entry, catalog, period) && entry.result ? Number(entry.result.total_kg_co2e) : null;
    if (kg == null || !Number.isFinite(kg)) {
      if (reportedKg.current) {
        reportedKg.current = false;
        onDataChangeRef.current?.(0);
      }
      return;
    }
    reportedKg.current = true;
    onDataChangeRef.current?.(kg);
  }, [entry, catalog, period]);

  const calculate = async () => {
    if (!canCalculate(entry, catalog, period)) return;
    const snapshot = entry;
    setCalculating(true);
    setEntry((current) => ({ ...current, error: null, result: null, verifiedKey: null }));
    try {
      const result = await calcEpaMobile({
        road_class: snapshot.roadClass,
        vehicle_type: snapshot.vehicle.trim(),
        fuel_type: snapshot.fuel.trim(),
        fuel_quantity: snapshot.fuelQuantity.trim(),
        fuel_unit: snapshot.fuelUnit.trim(),
        distance: snapshot.roadClass === "on_road" ? snapshot.distance.trim() : null,
        distance_unit: snapshot.roadClass === "on_road" ? snapshot.distanceUnit : null,
        model_year: snapshot.modelYear.trim() ? Number(snapshot.modelYear.trim()) : null,
        gwp_version: "AR5",
      });
      setEntry((current) => {
        if (
          current.roadClass !== snapshot.roadClass ||
          current.vehicle !== snapshot.vehicle ||
          current.fuel !== snapshot.fuel ||
          current.fuelQuantity !== snapshot.fuelQuantity ||
          current.fuelUnit !== snapshot.fuelUnit ||
          current.distance !== snapshot.distance ||
          current.modelYear !== snapshot.modelYear
        ) {
          return current;
        }
        return applyCalcSuccess(current, result);
      });
    } catch (err) {
      const message = errorMessage(err, "The calculation service is unavailable. Nothing was calculated locally.");
      setEntry((current) => {
        if (
          current.vehicle !== snapshot.vehicle ||
          current.fuel !== snapshot.fuel ||
          current.fuelQuantity !== snapshot.fuelQuantity
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
    if (!canSave(entry, catalog, period) || !validReportingMonth(period)) return;
    setSaving(true);
    const updating = saveUsesUpdate(entry);
    try {
      const assessment = await getOrCreateDraftAssessment("epa", period);
      const body = buildMobileSaveBody({
        state: entry,
        assessmentId: assessment.id,
        period,
        equipmentId,
        site,
        counterpartyId,
      });
      const saved = updating
        ? await updateEpaMobileRecord(entry.activityId as string, body)
        : await createEpaMobileRecord(body);
      setEntry((current) => applySaveSuccess(current, saved));
      loadRecords();
      onInventoryChanged?.();
      toast({
        title: updating ? "Entry updated" : "Entry saved",
        description: `Scope 1 ${saved.emissions_tco2e} tCO2e`,
      });
    } catch (err) {
      setEntry((current) =>
        applySaveFailure(current, errorMessage(err, "The entry could not be saved. Your inputs are still here."))
      );
    } finally {
      setSaving(false);
    }
  };

  const result = canSave(entry, catalog, period) ? entry.result : null;
  const biogenic = biogenicTonnes(result);

  return (
    <ActivitySectionShell
      icon={Car}
      title="Vehicles and Mobile Equipment"
      subtitle="Company vehicles and mobile equipment that burn fuel."
      details={
        <p>
          Choose on-road or non-road, then the exact vehicle and fuel from the EPA factor tables.
          The calculation runs on the server. Biogenic CO2 is shown separately and is not added to Scope 1.
        </p>
      }
    >
      <LegacySavedInventory
        groupId="vehicles_mobile"
        readOnly
        editableNote="Legacy mobile rows stay read-only. New calculations are listed below and are not copied into this list."
        onChanged={onInventoryChanged}
      />

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
          <p className="text-xs font-medium text-gray-600">Saved mobile entries</p>
          <ul className="mt-2 space-y-1">
            {records.map((record) => {
              const inputs = (record.raw?.inputs || {}) as Record<string, unknown>;
              const label = String(inputs.vehicle_type || inputs.fuel || "Entry");
              return (
                <li key={record.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-gray-800">
                    {label}
                    {record.emissions_tco2e != null ? ` · Scope 1 ${record.emissions_tco2e} tCO2e` : ""}
                    {typeof record.raw?.biogenic_co2_t === "string"
                      ? ` · Biogenic ${record.raw.biogenic_co2_t} t CO2`
                      : ""}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 rounded-lg text-xs"
                    onClick={() => {
                      const loaded = stateFromMobileActivity(record);
                      setSite(loaded.context.site);
                      setEquipmentId(loaded.context.equipmentId);
                      if (loaded.context.period) setPeriod(loaded.context.period);
                      if (loaded.context.site || loaded.context.equipmentId) setShowOptional(true);
                      setEntry(loaded.entry);
                    }}
                  >
                    Edit
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <FormStep step={1} label="Vehicle / equipment">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <ChoiceCard
            selected={entry.roadClass === "on_road"}
            onSelect={() => setEntry((current) => changeMobileInputs(current, { roadClass: "on_road" }))}
            title="On-road"
            description="Cars, trucks, and other road vehicles"
          />
          <ChoiceCard
            selected={entry.roadClass === "non_road"}
            onSelect={() => setEntry((current) => changeMobileInputs(current, { roadClass: "non_road" }))}
            title="Non-road"
            description="Equipment that does not travel on public roads"
          />
        </div>

        <div className="mt-3">
          <Label className="text-gray-600 text-xs">EPA vehicle or equipment</Label>
          <Select
            value={entry.vehicle}
            onValueChange={(vehicle) => setEntry((current) => changeMobileInputs(current, { vehicle }))}
            disabled={catalogLoading || !catalog || vehicles.length === 0}
          >
            <SelectTrigger className="mt-1.5 rounded-xl border-gray-200">
              <SelectValue placeholder={catalogLoading ? "Loading factor tables…" : "Select from factor tables"} />
            </SelectTrigger>
            <SelectContent>
              {(vehicles.includes(entry.vehicle) ? vehicles : entry.vehicle ? [entry.vehicle, ...vehicles] : vehicles).map(
                (vehicle) => (
                  <SelectItem key={vehicle} value={vehicle}>
                    {vehicle}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-3">
          <Label className="text-gray-600 text-xs">Reporting month</Label>
          <Input
            type="month"
            required
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="mt-1.5 max-w-xs rounded-xl border-gray-200"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowOptional((open) => !open)}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
        >
          Optional details
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showOptional ? "rotate-180" : ""}`} />
        </button>
        {showOptional && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-gray-100 bg-gray-50/40 p-3">
            <div>
              <Label className="text-gray-600 text-xs">Site</Label>
              <Input
                className="mt-1.5 rounded-xl border-gray-200 bg-white"
                value={site}
                onChange={(event) => setSite(event.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <Label className="text-gray-600 text-xs">Vehicle ID</Label>
              <Input
                className="mt-1.5 rounded-xl border-gray-200 bg-white"
                value={equipmentId}
                onChange={(event) => setEquipmentId(event.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
        )}
      </FormStep>

      <FormStep step={2} label="Fuel and distance">
        {catalogError && (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <p>{catalogError}</p>
            <Button type="button" variant="outline" className="mt-2 h-8 rounded-lg" onClick={loadCatalog}>
              Retry loading factors
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-gray-600 text-xs">Fuel</Label>
            <Select
              value={entry.fuel}
              onValueChange={(fuel) => {
                const choice = catalog?.choiceFor(entry.roadClass, entry.vehicle, fuel);
                setEntry((current) =>
                  changeMobileInputs(current, { fuel, fuelUnit: choice?.factorUnit || "" })
                );
              }}
              disabled={!entry.vehicle || fuels.length === 0}
            >
              <SelectTrigger className="mt-1.5 rounded-xl border-gray-200">
                <SelectValue placeholder="Select fuel" />
              </SelectTrigger>
              <SelectContent>
                {(fuels.some((fuel) => fuel.fuel === entry.fuel) ? fuels : entry.fuel ? [{ fuel: entry.fuel, units: [], factorUnit: "gallon" as const, yearMode: "none" as const, yearBands: [] }, ...fuels] : fuels).map(
                  (fuel) => (
                    <SelectItem key={fuel.fuel} value={fuel.fuel}>
                      {fuel.fuel}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-gray-600 text-xs">Quantity</Label>
            <Input
              type="number"
              min="0"
              className="mt-1.5 rounded-xl border-gray-200"
              value={entry.fuelQuantity}
              onChange={(event) =>
                setEntry((current) => changeMobileInputs(current, { fuelQuantity: event.target.value }))
              }
            />
          </div>
          <div>
            <Label className="text-gray-600 text-xs">Unit</Label>
            <Select
              value={entry.fuelUnit}
              onValueChange={(fuelUnit) => setEntry((current) => changeMobileInputs(current, { fuelUnit }))}
              disabled={!fuelChoice}
            >
              <SelectTrigger className="mt-1.5 rounded-xl border-gray-200">
                <SelectValue placeholder="Unit" />
              </SelectTrigger>
              <SelectContent>
                {(fuelChoice?.units || []).map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {entry.roadClass === "on_road" && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-gray-600 text-xs">Distance</Label>
              <Input
                type="number"
                min="0"
                className="mt-1.5 rounded-xl border-gray-200"
                value={entry.distance}
                onChange={(event) =>
                  setEntry((current) => changeMobileInputs(current, { distance: event.target.value }))
                }
              />
            </div>
            <div>
              <Label className="text-gray-600 text-xs">Distance unit</Label>
              <Select
                value={entry.distanceUnit}
                onValueChange={(distanceUnit) =>
                  setEntry((current) =>
                    changeMobileInputs(current, { distanceUnit: distanceUnit === "km" ? "km" : "mile" })
                  )
                }
              >
                <SelectTrigger className="mt-1.5 rounded-xl border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mile">miles</SelectItem>
                  <SelectItem value="km">km</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {fuelChoice?.yearMode === "required" && (
          <div className="mt-3 max-w-xs">
            <Label className="text-gray-600 text-xs">Model year</Label>
            <Input
              type="number"
              className="mt-1.5 rounded-xl border-gray-200"
              value={entry.modelYear}
              onChange={(event) =>
                setEntry((current) => changeMobileInputs(current, { modelYear: event.target.value }))
              }
            />
            <p className="mt-1 text-xs text-gray-500">Factor rows: {formatYearBands(fuelChoice)}</p>
          </div>
        )}

        {blocker && entry.vehicle && !catalogLoading && (
          <p className="mt-3 text-sm text-amber-900 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
            {blocker}
          </p>
        )}
        {entry.error && (
          <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {entry.error}
          </p>
        )}
      </FormStep>

      <div className="rounded-2xl border border-[#BFE3D3]/80 bg-gradient-to-br from-[#EAF7F1]/80 to-white p-4 sm:p-5">
        <p className="text-sm font-semibold text-[#0F6E56]">Result</p>
        {result ? (
          <>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-gray-900 tracking-tight">
              {result.total_t_co2e} <span className="text-base font-medium text-gray-500">tCO2e Scope 1</span>
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Biogenic CO2 {biogenic ?? "—"} t CO2, reported outside Scope 1
            </p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <GasLine label="CO2" gas={result.gases.co2} />
              <GasLine label="CH4" gas={result.gases.ch4} />
              <GasLine label="N2O" gas={result.gases.n2o} />
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Factors: {result.factors.co2.dataset_code || "mobile_combustion"} ({result.factors.co2.unit}) and{" "}
              {result.factors.ch4.dataset_code} ({result.factors.ch4.unit}). GWP {result.accounting?.gwp_version || "AR5"}.
            </p>
            {result.accounting?.methodology && (
              <p className="mt-1 text-xs text-gray-500">{result.accounting.methodology}</p>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-gray-500">Calculate to see the server result. Nothing is estimated in the browser.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          disabled={!canCalculate(entry, catalog, period) || calculating}
          onClick={() => void calculate()}
        >
          {calculating ? "Calculating…" : "Calculate"}
        </Button>
        <Button
          type="button"
          disabled={!canSave(entry, catalog, period) || saving}
          className="bg-[#1D9E75] hover:bg-[#22B87E] text-white rounded-xl"
          onClick={() => void save()}
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving…" : saveUsesUpdate(entry) ? "Update" : "Save"}
        </Button>
        {onSaveAndNext && (
          <Button type="button" variant="outline" className="rounded-xl" onClick={onSaveAndNext}>
            Skip for now
          </Button>
        )}
      </div>
    </ActivitySectionShell>
  );
}

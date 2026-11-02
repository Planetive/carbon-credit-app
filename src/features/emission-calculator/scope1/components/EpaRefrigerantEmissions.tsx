import { useEffect, useRef, useState } from "react";
import { ChevronRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/api/client";
import {
  calcEpaRefrigerantLeakage,
  createEpaRefrigerantLeakageRecord,
  updateEpaRefrigerantLeakageRecord,
  type RefrigerantCalcResponse,
} from "@/api/calc";
import { getOrCreateDraftAssessment, listEmissionActivities, type EmissionActivity } from "@/api/ghg";
import { listLegacyTableEntries } from "@/integrations/supabase/ghgEntryClient";
import { useOrganization } from "@/contexts/OrganizationContext";
import { activityMatchesReportingYear, matchesVerifiedCounterparty } from "@/features/emission-calculator/results/reportingYear";
import { refrigerantGasGroups } from "@/features/emission-calculator/scope1/activity-based/refrigerant/refrigerantCatalog";
import {
  applyCalcFailure,
  applyCalcSuccess,
  applySaveFailure,
  applySaveSuccess,
  blankRefrigerantEntry,
  buildRefrigerantCalcBody,
  buildRefrigerantSaveBody,
  canCalculate,
  canSave,
  changeRefrigerantInputs,
  claimSave,
  isEditableRefrigerantActivity,
  legacyRefrigerantKind,
  legacyRefrigerantLabel,
  matchesSelectedCounterparty,
  refrigerantEntryBlocker,
  refrigerantInputKey,
  releaseSave,
  saveUsesUpdate,
  stateFromRefrigerantActivity,
  verifiedTonnesText,
  type RefrigerantEntryState,
} from "@/features/emission-calculator/scope1/activity-based/refrigerant/refrigerantEntry";

interface EpaRefrigerantEmissionsProps {
  onDataChange: (rows: Array<{ emissions?: number }>) => void;
  onSaveAndNext?: () => void;
  onInventoryChanged?: () => void;
  counterpartyId?: string;
  reportingYear?: number;
}

type LegacyRow = {
  id: string;
  gas: string;
  kindLabel: string;
  stored: string;
};

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message || fallback;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function methodLabel(method: string): string {
  return method === "estimated_leakage" ? "Estimated leakage" : "Measured leakage";
}

const EpaRefrigerantEmissions: React.FC<EpaRefrigerantEmissionsProps> = ({
  onDataChange,
  onSaveAndNext,
  onInventoryChanged,
  counterpartyId,
  reportingYear,
}) => {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id || null;
  const onDataChangeRef = useRef(onDataChange);
  onDataChangeRef.current = onDataChange;
  const saveLock = useRef(false);
  const [entry, setEntry] = useState<RefrigerantEntryState>(blankRefrigerantEntry);
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [site, setSite] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [records, setRecords] = useState<EmissionActivity[]>([]);
  const [legacyRows, setLegacyRows] = useState<LegacyRow[]>([]);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);

  const blocker = refrigerantEntryBlocker(entry, period);
  const result = canSave(entry, period) ? entry.result : null;
  const tonnes = verifiedTonnesText(result);

  useEffect(() => {
    if (!reportingYear) return;
    setPeriod((current) => {
      const month = /^(0[1-9]|1[0-2])$/.test(current.slice(5, 7)) ? current.slice(5, 7) : "01";
      return `${reportingYear}-${month}`;
    });
  }, [reportingYear]);

  const loadRecords = () => {
    setRecordsError(null);
    Promise.all([
      listEmissionActivities({
        scope: 1,
        category: "refrigerant_leakage",
        legacy_source: "epa_refrigerant_v1",
      }),
      listLegacyTableEntries("scope1_refrigerant_entries", {
        order: { column: "created_at", ascending: false },
      }),
    ])
      .then(([activities, legacy]) => {
        setRecords(
          (activities || []).filter((row) => {
            const meta = (row.raw?.activity_meta || {}) as Record<string, unknown>;
            return (
              activityMatchesReportingYear(meta.period, reportingYear) &&
              isEditableRefrigerantActivity(row, organizationId) &&
              matchesVerifiedCounterparty(row.counterparty_id, counterpartyId)
            );
          })
        );
        setLegacyRows(
          (legacy || []).flatMap((row) => {
            const counterparty =
              row.counterparty_id == null || row.counterparty_id === ""
                ? null
                : String(row.counterparty_id);
            if (!matchesSelectedCounterparty({ counterparty_id: counterparty }, counterpartyId)) return [];
            const kind = legacyRefrigerantKind(row);
            if (!kind) return [];
            const gas = String(row.refrigerant_type || "Unnamed refrigerant");
            const stored = row.emissions == null ? "No stored total" : `${row.emissions} kg CO2e in the legacy table`;
            return [{ id: String(row.id), gas, kindLabel: legacyRefrigerantLabel(kind), stored }];
          })
        );
      })
      .catch((err) => {
        setRecords([]);
        setLegacyRows([]);
        setRecordsError(errorMessage(err, "Saved refrigerant entries could not be loaded."));
      });
  };

  useEffect(() => {
    loadRecords();
  }, [organizationId, counterpartyId, reportingYear]);

  useEffect(() => {
    const kg = tonnes && result?.emissions_kg_co2e ? Number(result.emissions_kg_co2e) : null;
    onDataChangeRef.current?.(kg != null && Number.isFinite(kg) ? [{ emissions: kg }] : []);
  }, [tonnes, result]);

  const update = (patch: Parameters<typeof changeRefrigerantInputs>[1]) => {
    setEntry((current) => changeRefrigerantInputs(current, patch));
  };

  const calculate = async () => {
    if (!canCalculate(entry, period)) return;
    const snapshot = entry;
    const snapshotKey = refrigerantInputKey(snapshot);
    setCalculating(true);
    setEntry((current) => ({ ...current, error: null, result: null, verifiedKey: null }));
    try {
      const calculated = await calcEpaRefrigerantLeakage(buildRefrigerantCalcBody(snapshot));
      setEntry((current) => {
        if (refrigerantInputKey(current) !== snapshotKey) return current;
        return calculated.success
          ? applyCalcSuccess(current, calculated)
          : applyCalcFailure(current, calculated.error || "The calculation did not succeed.");
      });
    } catch (err) {
      const message = errorMessage(err, "The calculation service is unavailable. Nothing was calculated in the browser.");
      setEntry((current) => {
        if (refrigerantInputKey(current) !== snapshotKey) return current;
        return applyCalcFailure(current, message);
      });
    } finally {
      setCalculating(false);
    }
  };

  const save = async () => {
    if (!claimSave(saveLock)) return;
    if (!canSave(entry, period)) {
      releaseSave(saveLock);
      return;
    }
    setSaving(true);
    const updating = saveUsesUpdate(entry);
    try {
      const assessment = await getOrCreateDraftAssessment("epa", period);
      const body = buildRefrigerantSaveBody({
        state: entry,
        assessmentId: assessment.id,
        period,
        equipmentId,
        site,
        counterpartyId,
      });
      const saved = updating && entry.activityId
        ? await updateEpaRefrigerantLeakageRecord(entry.activityId, body)
        : await createEpaRefrigerantLeakageRecord(body);
      setEntry((current) => applySaveSuccess(current, saved));
      toast({
        title: updating ? "Updated" : "Saved",
        description: `${saved.calculation.refrigerant}: ${saved.emissions_tco2e} tCO2e`,
      });
      loadRecords();
      onInventoryChanged?.();
    } catch (err) {
      const message = errorMessage(err, "The refrigerant entry was not saved.");
      setEntry((current) => applySaveFailure(current, message));
      toast({ title: "Not saved", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
      releaseSave(saveLock);
    }
  };

  const alignPeriod = (value: string) => {
    if (!reportingYear) return value;
    const month = /^(0[1-9]|1[0-2])$/.test(value.slice(5, 7)) ? value.slice(5, 7) : "01";
    return `${reportingYear}-${month}`;
  };

  const editRecord = (row: EmissionActivity) => {
    const loaded = stateFromRefrigerantActivity(row);
    setEntry(loaded.entry);
    setSite(loaded.context.site);
    setEquipmentId(loaded.context.equipmentId);
    if (loaded.context.period) setPeriod(alignPeriod(loaded.context.period));
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Enter a measured leak or an estimate. The warming factor and tonnes are calculated by the server.
      </p>

      <Card className="border-gray-200">
        <CardContent className="p-5 space-y-4">
          <RadioGroup
            value={entry.method}
            onValueChange={(value) => update({ method: value === "estimated_leakage" ? "estimated_leakage" : "leakage_record" })}
            className="flex flex-col sm:flex-row gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="leakage_record" id="refrigerant-measured" />
              <Label htmlFor="refrigerant-measured" className="font-normal cursor-pointer">
                I know how much gas leaked
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="estimated_leakage" id="refrigerant-estimated" />
              <Label htmlFor="refrigerant-estimated" className="font-normal cursor-pointer">
                I do not have a measured leak
              </Label>
            </div>
          </RadioGroup>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label className="text-gray-600">Refrigerant</Label>
              <Select value={entry.gas || undefined} onValueChange={(gas) => update({ gas })}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a supported refrigerant" />
                </SelectTrigger>
                <SelectContent>
                  {refrigerantGasGroups().map((group) => (
                    <SelectGroup key={group.id}>
                      <SelectLabel>{group.label}</SelectLabel>
                      {group.options.map((gas) => (
                        <SelectItem key={gas} value={gas}>
                          {gas}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {entry.method === "leakage_record" ? (
              <div>
                <Label className="text-gray-600">Measured leaked gas (kg)</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={entry.leakageKg}
                  onChange={(event) => update({ leakageKg: event.target.value })}
                  placeholder="e.g. 2"
                />
              </div>
            ) : (
              <>
                <div>
                  <Label className="text-gray-600">Equipment charge (kg)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={entry.chargeKg}
                    onChange={(event) => update({ chargeKg: event.target.value })}
                    placeholder="e.g. 10"
                  />
                </div>
                <div>
                  <Label className="text-gray-600">Your assumed annual leakage rate (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={entry.leakageRatePercent}
                    onChange={(event) => update({ leakageRatePercent: event.target.value })}
                    placeholder="Enter a rate. A blank is not zero."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    This rate is your assumption. It is not an EPA-published default, and equipment type does not fill it in.
                  </p>
                </div>
              </>
            )}

            <div>
              <Label className="text-gray-600">Equipment type (optional)</Label>
              <Input
                value={entry.equipmentType}
                onChange={(event) => update({ equipmentType: event.target.value })}
                placeholder="Description only"
              />
            </div>
            <div>
              <Label className="text-gray-600">Reporting month</Label>
              <Input type="month" required value={period} onChange={(event) => setPeriod(alignPeriod(event.target.value))} />
            </div>
            <div>
              <Label className="text-gray-600">Equipment ID (optional)</Label>
              <Input value={equipmentId} onChange={(event) => setEquipmentId(event.target.value)} />
            </div>
            <div>
              <Label className="text-gray-600">Site (optional)</Label>
              <Input value={site} onChange={(event) => setSite(event.target.value)} />
            </div>
          </div>

          {blocker && !entry.error && <p className="text-sm text-gray-600">{blocker}</p>}
          {entry.error && (
            <p className="text-sm text-red-700" role="alert">
              {entry.error}
            </p>
          )}

          {result && tonnes && <ResultPanel result={result} period={period} site={site} equipmentId={equipmentId} tonnes={tonnes} />}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => void calculate()}
          disabled={!canCalculate(entry, period) || calculating || saving}
          className="border-[#1D9E75] text-[#1D9E75]"
        >
          {calculating ? "Calculating…" : "Calculate"}
        </Button>
        <Button
          type="button"
          onClick={() => void save()}
          disabled={!canSave(entry, period) || saving || calculating}
          className="bg-[#1D9E75] hover:bg-[#22B87E] text-white"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving…" : saveUsesUpdate(entry) ? "Update" : "Save"}
        </Button>
        {onSaveAndNext && (
          <Button type="button" variant="outline" onClick={onSaveAndNext} className="border-[#1D9E75] text-[#1D9E75]">
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-800">Verified refrigerant leakage</h3>
        {recordsError && <p className="text-sm text-red-700">{recordsError}</p>}
        {records.length === 0 ? (
          <p className="text-sm text-gray-500">No verified entries for this organization and company yet.</p>
        ) : (
          <ul className="space-y-2">
            {records.map((row) => {
              const inputs = (row.raw?.inputs || {}) as Record<string, unknown>;
              const meta = (row.raw?.activity_meta || {}) as Record<string, unknown>;
              return (
                <li key={row.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2">
                  <div className="text-sm text-gray-700">
                    <span className="font-medium text-gray-900">{String(inputs.refrigerant || "Refrigerant")}</span>
                    {" · "}
                    {methodLabel(String(inputs.method || ""))}
                    {" · "}
                    {String(meta.period || "No month")}
                    {" · "}
                    {row.emissions_tco2e ?? "—"} tCO2e
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={() => editRecord(row)}>
                    Edit
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-800">Legacy refrigerant records</h3>
        <p className="text-xs text-gray-500">
          These older rows stay as they were. They are not edited here and are not verified tonnes.
        </p>
        {legacyRows.length === 0 ? (
          <p className="text-sm text-gray-500">No legacy EPA or UK-EPA refrigerant rows.</p>
        ) : (
          <ul className="space-y-2">
            {legacyRows.map((row) => (
              <li key={row.id} className="rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2 text-sm text-amber-950">
                <p className="font-medium">{row.kindLabel}</p>
                <p>
                  {row.gas} · {row.stored}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

function ResultPanel({
  result,
  period,
  site,
  equipmentId,
  tonnes,
}: {
  result: RefrigerantCalcResponse;
  period: string;
  site: string;
  equipmentId: string;
  tonnes: string;
}) {
  return (
    <div className="rounded-lg border border-[#BFE3D3] bg-[#EAF7F1]/60 px-4 py-3 text-sm text-[#0A4D3E] space-y-1">
      <p className="font-medium">Server calculation</p>
      <p>
        {result.refrigerant} · {methodLabel(result.method)}
      </p>
      <p>Leaked refrigerant: {result.leakage_kg} kg</p>
      {result.method === "estimated_leakage" && (
        <p>
          Charge {result.charge_kg} kg × {result.leakage_rate_percent}% user assumption. This rate is not an EPA factor.
        </p>
      )}
      <p>GWP {result.gwp}</p>
      {result.gwp_publication && <p>{result.gwp_publication}</p>}
      {result.gwp_edition && <p>{result.gwp_edition}</p>}
      {result.factor_provenance && <p>{result.factor_provenance}</p>}
      {result.table11_reference && <p>{result.table11_reference}</p>}
      <p>
        {result.emissions_kg_co2e} kg CO2e = {tonnes} tCO2e
      </p>
      <p>Reporting month: {period}</p>
      {(result.equipment_type || equipmentId || site) && (
        <p>
          {[result.equipment_type, equipmentId, site].filter(Boolean).join(" · ")}
        </p>
      )}
    </div>
  );
}

export default EpaRefrigerantEmissions;

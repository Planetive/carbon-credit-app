import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import { RefrigerantGasSelect } from "@/features/emission-calculator/scope1/activity-based/refrigerant/RefrigerantGasSelect";
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
  return method === "estimated_leakage" ? "Estimated leak" : "Measured leak";
}

function formatNumber(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function formatQty(value: string | null | undefined, unit: string): string {
  const formatted = formatNumber(value);
  return formatted === "—" ? "—" : `${formatted} ${unit}`;
}

function formatReportingMonth(period: string): string {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(period);
  if (!match) return period;
  return new Date(Number(match[1]), Number(match[2]) - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function gwpBasisLabel(result: RefrigerantCalcResponse): string | null {
  const haystack = `${result.gwp_edition || ""} ${result.gwp_publication || ""} ${result.gwp_basis || ""}`;
  if (/AR6/i.test(haystack)) return "IPCC AR6";
  if (/AR5/i.test(haystack)) return "IPCC AR5";
  if (/AR4/i.test(haystack)) return "IPCC AR4";
  const basis = result.gwp_basis?.trim();
  return basis || null;
}

function uniqueFactorNotes(result: RefrigerantCalcResponse): string[] {
  const seen = new Set<string>();
  const notes: string[] = [];
  for (const raw of [result.gwp_publication, result.gwp_edition, result.factor_provenance, result.table11_reference]) {
    const text = (raw || "").trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    notes.push(text);
  }
  return notes;
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
              <RefrigerantGasSelect value={entry.gas} onChange={(gas) => update({ gas })} />
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
              const periodLabel = meta.period ? formatReportingMonth(String(meta.period)) : "No month";
              return (
                <li key={row.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{String(inputs.refrigerant || "Refrigerant")}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {methodLabel(String(inputs.method || ""))} · {periodLabel}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <p className="text-sm font-semibold tabular-nums text-gray-900">
                      {row.emissions_tco2e ?? "—"} <span className="text-xs font-medium text-gray-500">tCO₂e</span>
                    </p>
                    <Button type="button" size="sm" variant="outline" onClick={() => editRecord(row)}>
                      Edit
                    </Button>
                  </div>
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
  const basis = gwpBasisLabel(result);
  const notes = uniqueFactorNotes(result);
  const sourceLine = result.gwp_publication?.trim() || notes[0] || null;
  const extraNotes = notes.filter((note) => note !== sourceLine);
  const location = [result.equipment_type, equipmentId, site].filter(Boolean).join(" · ");

  const facts = [
    { label: "Refrigerant", value: result.refrigerant },
    { label: "Method", value: methodLabel(result.method) },
    { label: "Gas leaked", value: formatQty(result.leakage_kg, "kg") },
    ...(result.method === "estimated_leakage"
      ? [
          { label: "Charge", value: formatQty(result.charge_kg ?? null, "kg") },
          {
            label: "Leakage rate",
            value: result.leakage_rate_percent ? `${result.leakage_rate_percent}% (your assumption)` : "—",
          },
        ]
      : []),
    { label: "GWP", value: basis ? `${formatNumber(result.gwp)} · ${basis}` : formatNumber(result.gwp) },
    { label: "Period", value: formatReportingMonth(period) },
    ...(location ? [{ label: "Location", value: location }] : []),
  ];

  return (
    <div className="rounded-xl border border-[#BFE3D3] bg-[#EAF7F1]/70 overflow-hidden">
      <div className="px-4 py-4 sm:px-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[#0F6E56]">Calculated emissions</p>
          <p className="mt-1 text-[28px] leading-none font-semibold tracking-[-0.03em] tabular-nums text-[#0A4D3E]">
            {tonnes}
            <span className="ml-1.5 text-sm font-medium text-[#0F6E56]">tCO₂e</span>
          </p>
          <p className="mt-1.5 text-xs text-[#3F6F5E]">{formatQty(result.emissions_kg_co2e, "kg CO₂e")}</p>
        </div>
      </div>
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-[#BFE3D3]/70 border-t border-[#BFE3D3]">
        {facts.map((fact) => (
          <div key={fact.label} className="bg-[#F6FBF8] px-4 py-3">
            <dt className="text-[11px] font-medium uppercase tracking-wide text-[#5B7C6E]">{fact.label}</dt>
            <dd className="mt-0.5 text-sm font-medium text-[#0A4D3E]">{fact.value}</dd>
          </div>
        ))}
      </dl>
      {sourceLine ? (
        <p className="px-4 py-3 text-xs text-[#3F6F5E] border-t border-[#BFE3D3]">{sourceLine}</p>
      ) : null}
      {extraNotes.length > 0 ? (
        <Collapsible>
          <CollapsibleTrigger className="group flex w-full items-center justify-between px-4 py-2.5 text-xs font-medium text-[#0F6E56] border-t border-[#BFE3D3] hover:bg-[#EAF7F1]">
            Factor details
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-2 px-4 pb-3 text-xs leading-relaxed text-[#3F6F5E]">
              {extraNotes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  );
}

export default EpaRefrigerantEmissions;

import React, { useEffect, useMemo, useState } from "react";
import { ChevronRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/contexts/OrganizationContext";
import { getOrCreateDraftAssessment, listEmissionActivities, type EmissionActivity } from "@/api/ghg";
import {
  calcScope2HeatSteam,
  createScope2HeatSteamRecord,
  updateScope2HeatSteamRecord,
  type Scope2HeatSteamCalculation,
} from "@/api/calc";
import { ApiError } from "@/api/client";
import {
  activityMatchesReportingYear,
  matchesVerifiedCounterparty,
} from "@/features/emission-calculator/results/reportingYear";
import {
  buildScope2HeatSteamSaveBody,
  toHeatSteamResultActivity,
} from "@/features/emission-calculator/results/heatSteamResults";

type EnergyForm = "purchased_heat" | "purchased_steam";

const MONTHS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

function messageOf(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return "The purchased heat or steam calculation could not be completed.";
}

function labelOf(form: string): string {
  return form === "purchased_steam" ? "Purchased steam" : "Purchased heat";
}

export function PurchasedHeatSteam({
  reportingYear,
  counterpartyId,
  onTotalChange,
  onSaveAndNext,
  onInventoryChanged,
}: {
  reportingYear?: number;
  counterpartyId?: string;
  onTotalChange?: (totalKg: number) => void;
  onSaveAndNext?: () => void;
  onInventoryChanged?: () => void;
}) {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const [month, setMonth] = useState("01");
  const [energyForm, setEnergyForm] = useState<EnergyForm>("purchased_steam");
  const [quantity, setQuantity] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [result, setResult] = useState<Scope2HeatSteamCalculation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activityId, setActivityId] = useState<string | null>(null);
  const [records, setRecords] = useState<EmissionActivity[]>([]);
  const [busy, setBusy] = useState(false);

  const period = reportingYear ? `${reportingYear}-${month}` : "";

  const loadRecords = async () => {
    if (!currentOrganization?.id || !reportingYear) {
      setRecords([]);
      return;
    }
    const rows = await listEmissionActivities({
      scope: 2,
      category: "purchased_heat_steam",
      legacy_source: "scope2_purchased_heat_steam_v1",
    });
    setRecords(
      (rows || []).filter((row) => {
        const meta = (row.raw?.activity_meta || {}) as { period?: string };
        return (
          row.organization_id === currentOrganization.id &&
          matchesVerifiedCounterparty(row.counterparty_id, counterpartyId) &&
          activityMatchesReportingYear(meta.period, reportingYear) &&
          toHeatSteamResultActivity(row)
        );
      })
    );
  };

  useEffect(() => {
    void loadRecords().catch(() => setRecords([]));
    // The list follows the selected organization, counterparty, and year.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrganization?.id, counterpartyId, reportingYear]);

  const verifiedKg = useMemo(() => {
    return records.reduce((sum, row) => sum + Number(row.emissions_tco2e || 0) * 1000, 0);
  }, [records]);

  useEffect(() => {
    onTotalChange?.(verifiedKg);
  }, [onTotalChange, verifiedKg]);

  const calculate = async () => {
    setError(null);
    setResult(null);
    if (!period) {
      setError("Choose a reporting year before calculating purchased heat or steam.");
      return;
    }
    setBusy(true);
    try {
      const calculated = await calcScope2HeatSteam({
        energy_form: energyForm,
        quantity,
        unit: "mmBtu",
        period,
        supplier_name: supplierName.trim() || null,
      });
      setResult(calculated);
      if (!calculated.save_allowed) {
        setError(calculated.error || "This result cannot be saved as verified tCO2e.");
      }
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!result?.save_allowed || !period) return;
    setBusy(true);
    setError(null);
    try {
      const assessment = await getOrCreateDraftAssessment("epa", period);
      const body = buildScope2HeatSteamSaveBody({
        energy_form: energyForm,
        quantity,
        unit: "mmBtu",
        period,
        assessment_id: assessment.id,
        counterparty_id: counterpartyId ?? null,
        supplier_name: supplierName.trim() || null,
      });
      const saved = activityId
        ? await updateScope2HeatSteamRecord(activityId, body)
        : await createScope2HeatSteamRecord(body);
      setActivityId(saved.activity_id);
      setResult(saved.calculation);
      await loadRecords();
      onInventoryChanged?.();
      toast({ title: "Purchased heat or steam saved", description: `${saved.emissions_tco2e} tCO2e` });
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  const factor = result?.factor;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Purchased heat and steam</h3>
        <p className="mt-1 text-sm text-slate-600">
          Enter energy bought from an external supplier, in mmBtu. The calculation uses US EPA Table 7
          steam and heat factors and AR5 global warming potentials. Those factors assume the supplier
          produced the energy from natural gas at 80 percent thermal efficiency. A supplier-specific
          factor is not applied. Fuel burned by this organization belongs in Scope 1 stationary combustion.
        </p>
      </div>

      {!reportingYear ? (
        <p className="text-sm text-amber-800">Select a reporting year before entering purchased heat or steam.</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Reporting month</Label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((item) => (
                <SelectItem key={item} value={item}>{reportingYear ? `${reportingYear}-${item}` : item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Purchased energy</Label>
          <Select value={energyForm} onValueChange={(value) => setEnergyForm(value as EnergyForm)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="purchased_steam">Purchased steam</SelectItem>
              <SelectItem value="purchased_heat">Purchased heat</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Quantity (mmBtu)</Label>
          <Input value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode="decimal" />
        </div>
        <div>
          <Label>Supplier name (optional, does not change the factor)</Label>
          <Input value={supplierName} onChange={(event) => setSupplierName(event.target.value)} placeholder="External supplier" />
        </div>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {factor ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p><span className="font-medium">Source:</span> {factor.publisher} — {factor.source_document}</p>
          <p>
            <span className="font-medium">CO2:</span> {factor.co2_kg_per_mmbtu} kg/mmBtu.
            <span className="font-medium"> CH4:</span> {factor.ch4_g_per_mmbtu} g/mmBtu.
            <span className="font-medium"> N2O:</span> {factor.n2o_g_per_mmbtu} g/mmBtu.
          </p>
          <p>
            <span className="font-medium">GWP:</span> {factor.gwp_version}. Production assumption: {factor.production_fuel} at {factor.thermal_efficiency} thermal efficiency.
            This is not a supplier-specific factor.
          </p>
          {result?.save_allowed && result.total_t_co2e ? (
            <p className="mt-2 font-medium text-slate-900">
              {labelOf(result.energy_form || energyForm)}: {result.total_t_co2e} tCO2e
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => void calculate()} disabled={busy || !reportingYear}>
          Calculate
        </Button>
        <Button type="button" onClick={() => void save()} disabled={busy || !result?.save_allowed} className="bg-[#1D9E75] text-white hover:bg-[#188764]">
          <Save className="mr-2 h-4 w-4" />
          {activityId ? "Update verified record" : "Save verified record"}
        </Button>
        {onSaveAndNext ? (
          <Button type="button" variant="outline" onClick={onSaveAndNext}>
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <div>
        <h4 className="text-sm font-medium text-slate-800">Verified records for {reportingYear || "the selected year"}</h4>
        {records.length === 0 ? (
          <p className="mt-1 text-sm text-slate-500">No verified purchased heat or steam records for this year.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {records.map((row) => {
              const view = toHeatSteamResultActivity(row);
              if (!view) return null;
              return (
                <li key={row.id} className="rounded-lg border border-slate-200 px-3 py-2">
                  {view.period}: {labelOf(view.energyForm)} · {view.quantity} {view.unit} · {view.totalTco2e} tCO2e
                  <span className="block text-xs text-slate-500">{view.publisher}, {view.sourceDocument}</span>
                  <button
                    type="button"
                    className="mt-1 text-xs text-[#1D9E75]"
                    onClick={() => {
                      setActivityId(row.id);
                      setEnergyForm(view.energyForm === "purchased_heat" ? "purchased_heat" : "purchased_steam");
                      setQuantity(view.quantity);
                      setSupplierName(view.supplierName);
                      const monthPart = view.period.slice(5, 7);
                      if (MONTHS.includes(monthPart)) setMonth(monthPart);
                    }}
                  >
                    Edit this record
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

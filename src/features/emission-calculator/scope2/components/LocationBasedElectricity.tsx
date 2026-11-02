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
  calcScope2Electricity,
  createScope2ElectricityRecord,
  updateScope2ElectricityRecord,
  type Scope2ElectricityCalculation,
} from "@/api/calc";
import { ApiError } from "@/api/client";
import {
  activityMatchesReportingYear,
  matchesVerifiedCounterparty,
} from "@/features/emission-calculator/results/reportingYear";
import {
  buildScope2ElectricitySaveBody,
  toElectricityResultActivity,
} from "@/features/emission-calculator/results/electricityResults";

type Unit = "kWh" | "MWh";

const MONTHS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

function messageOf(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return "The electricity calculation could not be completed.";
}

export function LocationBasedElectricity({
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
  const [country, setCountry] = useState("");
  const [gridRegion, setGridRegion] = useState("national");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<Unit>("kWh");
  const [renewableKwh, setRenewableKwh] = useState("");
  const [result, setResult] = useState<Scope2ElectricityCalculation | null>(null);
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
      category: "purchased_electricity",
      legacy_source: "scope2_location_electricity_v1",
    });
    setRecords(
      (rows || []).filter((row) => {
        const meta = (row.raw?.activity_meta || {}) as { period?: string };
        return (
          row.organization_id === currentOrganization.id &&
          matchesVerifiedCounterparty(row.counterparty_id, counterpartyId) &&
          activityMatchesReportingYear(meta.period, reportingYear) &&
          toElectricityResultActivity(row)
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
      setError("Choose a reporting year before calculating purchased electricity.");
      return;
    }
    if (!country.trim()) {
      setError("Enter the electricity grid country. No default factor is applied.");
      return;
    }
    setBusy(true);
    try {
      const calculated = await calcScope2Electricity({
        country: country.trim(),
        grid_region: gridRegion.trim() || "national",
        quantity,
        unit,
        period,
        renewable_kwh: renewableKwh.trim() || null,
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
      const body = buildScope2ElectricitySaveBody({
        country,
        grid_region: gridRegion,
        quantity,
        unit,
        period,
        assessment_id: assessment.id,
        counterparty_id: counterpartyId ?? null,
        renewable_kwh: renewableKwh.trim() || null,
      });
      const saved = activityId
        ? await updateScope2ElectricityRecord(activityId, body)
        : await createScope2ElectricityRecord(body);
      setActivityId(saved.activity_id);
      setResult(saved.calculation);
      await loadRecords();
      onInventoryChanged?.();
      toast({ title: "Purchased electricity saved", description: `${saved.emissions_tco2e} tCO2e` });
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
        <h3 className="text-lg font-semibold text-slate-900">Purchased electricity</h3>
        <p className="mt-1 text-sm text-slate-600">
          Location-based emissions use the verified grid-average factor stored for the reporting year.
          A renewable percentage does not reduce this total. On-site generation is not part of this calculation.
          Contractual renewable electricity is recorded separately and is not deducted.
        </p>
      </div>

      {!reportingYear ? (
        <p className="text-sm text-amber-800">Select a reporting year before entering purchased electricity.</p>
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
          <Label>Grid country</Label>
          <Input value={country} onChange={(event) => setCountry(event.target.value)} placeholder="Country of the electricity grid" />
        </div>
        <div>
          <Label>Grid region</Label>
          <Input value={gridRegion} onChange={(event) => setGridRegion(event.target.value)} />
        </div>
        <div>
          <Label>Purchased electricity</Label>
          <div className="flex gap-2">
            <Input value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode="decimal" />
            <Select value={unit} onValueChange={(value) => setUnit(value as Unit)}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="kWh">kWh</SelectItem>
                <SelectItem value="MWh">MWh</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="sm:col-span-2">
          <Label>Contractual renewable electricity (kWh, not deducted)</Label>
          <Input value={renewableKwh} onChange={(event) => setRenewableKwh(event.target.value)} inputMode="decimal" placeholder="Optional evidence. Leave blank if none." />
        </div>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {factor ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p><span className="font-medium">Source:</span> {factor.publisher} — {factor.source_document}</p>
          <p><span className="font-medium">Publication year:</span> {factor.publication_year} · <span className="font-medium">Reporting year:</span> {factor.reporting_year}</p>
          <p><span className="font-medium">Factor:</span> {factor.value} {factor.unit}</p>
          <p><span className="font-medium">Coverage:</span> {factor.gas_coverage}. Boundary: {factor.boundary}. Grid: {factor.country}, {factor.grid_region}.</p>
          {result?.save_allowed && result.total_t_co2e ? (
            <p className="mt-2 font-medium text-slate-900">Location-based result: {result.total_t_co2e} tCO2e</p>
          ) : result?.total_t_co2 ? (
            <p className="mt-2 font-medium text-slate-900">Disclosed CO2 mass: {result.total_t_co2} t CO2. This is not tCO2e and cannot be saved as verified.</p>
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
          <p className="mt-1 text-sm text-slate-500">No verified purchased-electricity records for this year.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {records.map((row) => {
              const view = toElectricityResultActivity(row);
              if (!view) return null;
              return (
                <li key={row.id} className="rounded-lg border border-slate-200 px-3 py-2">
                  {view.period}: {view.quantity} {view.unit} · {view.country}, {view.gridRegion} · {view.totalTco2e} tCO2e
                  <span className="block text-xs text-slate-500">{view.publisher}, {view.sourceDocument} ({view.publicationYear})</span>
                  <button type="button" className="mt-1 text-xs text-[#1D9E75]" onClick={() => setActivityId(row.id)}>
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

import { useState } from "react";
import { ChevronRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getOrCreateDraftAssessment } from "@/api/ghg";
import {
  calcUkScope2Electricity,
  createUkScope2ElectricityRecord,
  updateUkScope2ElectricityRecord,
  type Scope2ElectricityCalculation,
} from "@/api/calc";
import { ApiError } from "@/api/client";
import {
  readSelectedReportingYear,
  reportingYearChoices,
  writeSelectedReportingYear,
} from "@/features/emission-calculator/results/reportingYear";

const MONTHS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const UK_GRID_COUNTRY = "United Kingdom";
const UK_GRID_REGION = "national";

function messageOf(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return "Purchased electricity could not be calculated.";
}

export function UkPurchasedElectricity({
  counterpartyId,
  onTotalChange,
  onSaveAndNext,
}: {
  counterpartyId?: string;
  onTotalChange?: (totalKg: number) => void;
  onSaveAndNext?: () => void;
}) {
  const { toast } = useToast();
  const [year, setYear] = useState(readSelectedReportingYear);
  const [month, setMonth] = useState("01");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<"kWh" | "MWh">("kWh");
  const [result, setResult] = useState<Scope2ElectricityCalculation | null>(null);
  const [activityId, setActivityId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const period = `${year}-${month}`;

  const calculate = async () => {
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const calculated = await calcUkScope2Electricity({
        country: UK_GRID_COUNTRY,
        grid_region: UK_GRID_REGION,
        quantity,
        unit,
        period,
      });
      setResult(calculated);
      const kg = Number(calculated.total_kg_co2e);
      if (Number.isFinite(kg)) onTotalChange?.(kg);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!result?.save_allowed) return;
    setBusy(true);
    setError(null);
    try {
      const assessment = await getOrCreateDraftAssessment("uk", period);
      const body = {
        country: UK_GRID_COUNTRY,
        grid_region: UK_GRID_REGION,
        quantity,
        unit,
        period,
        assessment_id: assessment.id,
        counterparty_id: counterpartyId ?? null,
      };
      const saved = activityId
        ? await updateUkScope2ElectricityRecord(activityId, body)
        : await createUkScope2ElectricityRecord(body);
      setActivityId(saved.activity_id);
      setResult(saved.calculation);
      toast({ title: "Purchased electricity saved", description: `${saved.emissions_tco2e} tCO2e` });
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-lg font-semibold text-gray-900">Purchased electricity</h4>
        <p className="text-sm text-gray-600">
          Location-based emissions use the verified generation-only factor for the selected grid and reporting year.
          A renewable percentage does not reduce this total. Fuel burned by the organisation belongs in Scope 1.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Reporting year</Label>
          <Select
            value={String(year)}
            onValueChange={(value) => {
              const next = Number(value);
              setYear(next);
              writeSelectedReportingYear(next);
            }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {reportingYearChoices(year).map((choice) => (
                <SelectItem key={choice} value={String(choice)}>{choice}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Month</Label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label>Grid</Label>
          <Select value={UK_GRID_REGION}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={UK_GRID_REGION}>United Kingdom — National Grid</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Purchased electricity</Label>
          <Input value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode="decimal" />
        </div>
        <div>
          <Label>Unit</Label>
          <Select value={unit} onValueChange={(value) => setUnit(value as "kWh" | "MWh")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="kWh">kWh</SelectItem>
              <SelectItem value="MWh">MWh</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {result?.factor && (
        <p className="text-sm text-gray-700">
          {result.factor.publisher}, {result.factor.publication_year}: {result.factor.value} {result.factor.unit}.{" "}
          {result.factor.country}, {result.factor.grid_region}. Boundary: {result.factor.boundary}.{" "}
          {result.total_t_co2e} tCO2e.
        </p>
      )}
      <div className="flex gap-2">
        <Button type="button" onClick={calculate} disabled={busy} className="bg-[#1D9E75] hover:bg-[#22B87E] text-white">
          Calculate
        </Button>
        <Button type="button" onClick={save} disabled={busy || !result?.save_allowed} variant="outline">
          <Save className="mr-2 h-4 w-4" /> Save
        </Button>
        {onSaveAndNext && (
          <Button type="button" variant="outline" onClick={onSaveAndNext}>
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { ChevronRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getOrCreateDraftAssessment } from "@/api/ghg";
import {
  calcUkScope2HeatSteam,
  createUkScope2HeatSteamRecord,
  updateUkScope2HeatSteamRecord,
  type Scope2HeatSteamCalculation,
} from "@/api/calc";
import { ApiError } from "@/api/client";
import {
  readSelectedReportingYear,
  reportingYearChoices,
  writeSelectedReportingYear,
} from "@/features/emission-calculator/results/reportingYear";

const MONTHS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

function messageOf(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return "Purchased heat or steam could not be calculated.";
}

export function UkPurchasedHeatSteam({
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
  const [country, setCountry] = useState("");
  const [energyForm, setEnergyForm] = useState("purchased_heat");
  const [supplierName, setSupplierName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<"kWh" | "MWh">("kWh");
  const [result, setResult] = useState<Scope2HeatSteamCalculation | null>(null);
  const [activityId, setActivityId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const period = `${year}-${month}`;

  const calculate = async () => {
    setError(null);
    setResult(null);
    if (!country.trim()) {
      setError("Enter the country of the heat supplier. A UK factor is not applied to another country.");
      return;
    }
    setBusy(true);
    try {
      const calculated = await calcUkScope2HeatSteam({
        country: country.trim(),
        energy_form: energyForm,
        quantity,
        unit,
        period,
        supplier_name: supplierName.trim(),
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
        country: country.trim(),
        energy_form: energyForm,
        quantity,
        unit,
        period,
        supplier_name: supplierName.trim(),
        assessment_id: assessment.id,
        counterparty_id: counterpartyId ?? null,
      };
      const saved = activityId
        ? await updateUkScope2HeatSteamRecord(activityId, body)
        : await createUkScope2HeatSteamRecord(body);
      setActivityId(saved.activity_id);
      setResult(saved.calculation);
      toast({ title: "Purchased heat and steam saved", description: `${saved.emissions_tco2e} tCO2e` });
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-lg font-semibold text-gray-900">Purchased heat and steam</h4>
        <p className="text-sm text-gray-600">
          The factor is a complete kg CO2e value for purchased heat or steam. It is not split into separate gases.
          On-site fuel combustion stays in Scope 1.
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
        <div>
          <Label>Purchased energy</Label>
          <Select value={energyForm} onValueChange={setEnergyForm}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="purchased_heat">Purchased heat</SelectItem>
              <SelectItem value="purchased_steam">Purchased steam</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Supplier country</Label>
          <Input value={country} onChange={(event) => setCountry(event.target.value)} placeholder="Country where the heat was supplied" />
        </div>
        <div>
          <Label>Supplier name</Label>
          <Input value={supplierName} onChange={(event) => setSupplierName(event.target.value)} />
        </div>
        <div>
          <Label>Quantity</Label>
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
      {result?.total_t_co2e && (
        <p className="text-sm text-gray-700">
          {result.total_kg_co2e} kg CO2e ({result.total_t_co2e} tCO2e). The factor was applied as a complete CO2e value.
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

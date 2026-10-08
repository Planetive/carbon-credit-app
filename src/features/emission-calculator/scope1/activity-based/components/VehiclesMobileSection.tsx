import { useEffect, useMemo, useState } from "react";
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
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { loadIpccFactorTableRows } from "@/integrations/supabase/ipccFactorLoader";
import { insertLegacyTableEntries } from "@/integrations/supabase/ghgEntryClient";
import {
  assembleMobileActivityResult,
  planMobileCalculation,
} from "../calc/mobileRouting";
import {
  MOBILE_EQUIPMENT_OPTIONS,
  type MobileDataAvailable,
  type MobileEquipmentKind,
} from "../types";
import {
  ActivitySectionShell,
  ChoiceCard,
  FormStep,
} from "./ActivitySectionShell";

type Props = {
  onDataChange?: (totalKg: number) => void;
  onSaveAndNext?: () => void;
};

function pick(row: Record<string, unknown>, patterns: RegExp[]): unknown {
  for (const [k, v] of Object.entries(row)) {
    if (patterns.some((re) => re.test(k))) return v;
  }
  return undefined;
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v == null || v === "") return undefined;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

export function VehiclesMobileSection({ onDataChange, onSaveAndNext }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [equipment, setEquipment] = useState<MobileEquipmentKind>("passenger_car");
  const [dataAvailable, setDataAvailable] = useState<MobileDataAvailable>("fuel");
  const [fuelType, setFuelType] = useState("");
  const [fuelQuantity, setFuelQuantity] = useState<number | undefined>();
  const [fuelUnit, setFuelUnit] = useState("gallon");
  const [distance, setDistance] = useState<number | undefined>();
  const [distanceUnit, setDistanceUnit] = useState("miles");
  const [efficiency, setEfficiency] = useState<number | undefined>();
  const [efficiencyUnit, setEfficiencyUnit] = useState("mpg");
  const [efficiencySource, setEfficiencySource] = useState("");
  const [site, setSite] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [fuelOptions, setFuelOptions] = useState<Array<{ label: string; factor: number }>>([]);
  const [ch4G, setCh4G] = useState<number | undefined>();
  const [n2oG, setN2oG] = useState<number | undefined>();
  const [activityBasis, setActivityBasis] = useState<"per_mile" | "per_gallon">("per_mile");
  const [distanceSheetName, setDistanceSheetName] = useState<string | undefined>();
  const [loadingFactors, setLoadingFactors] = useState(false);
  const [factorError, setFactorError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const plan = useMemo(
    () => planMobileCalculation({ equipment, dataAvailable, fuelLabel: fuelType }),
    [equipment, dataAvailable, fuelType]
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingFactors(true);
      setFactorError(null);
      try {
        const fuelSheet = await loadIpccFactorTableRows(["Mobile Combustion", "mobile_combustion"]);
        if (cancelled) return;
        if (!fuelSheet.rows.length) {
          setFactorError(
            'Mobile Combustion factor sheet returned no rows. Fuel-based CO2 cannot be calculated until the sheet is available.'
          );
          setFuelOptions([]);
        } else {
          const opts: Array<{ label: string; factor: number }> = [];
          for (const row of fuelSheet.rows) {
            const label = String(
              pick(row, [/fuel\s*type/i, /^fuel$/i, /description/i]) ?? ""
            ).trim();
            const factor = num(
              pick(row, [/kg\s*co2/i, /co2.*unit/i, /emission\s*factor/i, /factor/i])
            );
            if (label && factor != null) opts.push({ label, factor });
          }
          setFuelOptions(opts);
          if (!fuelType && opts[0]) setFuelType(opts[0].label);
        }

        if (plan.useDistanceSheet && plan.distanceSheet) {
          const dist = await loadIpccFactorTableRows([plan.distanceSheet]);
          if (cancelled) return;
          setDistanceSheetName(dist.source || plan.distanceSheet);
          if (!dist.rows.length) {
            setCh4G(undefined);
            setN2oG(undefined);
            setFactorError(
              (prev) =>
                prev ||
                `"${plan.distanceSheet}" returned no rows. CH4/N2O supplementary factors unavailable.`
            );
          } else {
            const first = dist.rows[0];
            setCh4G(num(pick(first, [/^ch4/i, /ch4\s*factor/i])));
            setN2oG(num(pick(first, [/^n2o/i, /n2o\s*factor/i])));
            setActivityBasis(plan.roadClass === "non_road" ? "per_gallon" : "per_mile");
          }
        } else {
          setCh4G(undefined);
          setN2oG(undefined);
          setDistanceSheetName(undefined);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setFactorError(
            e instanceof Error ? e.message : "Failed to load mobile factor sheets"
          );
        }
      } finally {
        if (!cancelled) setLoadingFactors(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [plan.useDistanceSheet, plan.distanceSheet, plan.roadClass]);

  const selectedFuelFactor = fuelOptions.find((f) => f.label === fuelType)?.factor;

  const result = useMemo(
    () =>
      assembleMobileActivityResult({
        dataAvailable,
        fuelQuantity,
        fuelUnit,
        distance,
        distanceUnit,
        fuelEfficiency: efficiency,
        fuelEfficiencyUnit: efficiencyUnit,
        fuelEfficiencySource: efficiencySource,
        factors: {
          mobileCombustionCo2KgPerGallon: selectedFuelFactor,
          ch4GPerActivity: ch4G,
          n2oGPerActivity: n2oG,
          activityBasis,
          distanceSheetName,
          fuelSheetName: "Mobile Combustion",
        },
        fuelFactorIsCombinedCo2e: false,
      }),
    [
      dataAvailable,
      fuelQuantity,
      fuelUnit,
      distance,
      distanceUnit,
      efficiency,
      efficiencyUnit,
      efficiencySource,
      selectedFuelFactor,
      ch4G,
      n2oG,
      activityBasis,
      distanceSheetName,
    ]
  );

  useEffect(() => {
    const hasInput =
      (typeof fuelQuantity === "number" && fuelQuantity > 0) ||
      (typeof distance === "number" && distance > 0);
    // Do not wipe hydrated sidebar totals when the form is empty on open.
    if (!hasInput) return;
    onDataChange?.(result.completeness === "blocked_missing_data" ? 0 : result.totalCo2eKg);
  }, [result, onDataChange, fuelQuantity, distance]);

  const save = async () => {
    if (!user) {
      toast({ title: "Sign in required", variant: "destructive" });
      return;
    }
    if (result.completeness === "blocked_missing_data") {
      toast({
        title: "Cannot save incomplete calculation",
        description: (result.missing || []).join("; "),
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Split persistence so aggregation can sum once: CO2 (or full total) on mobile fuel;
      // CH4/N2O as CO2e on distance tables — never store the same assembled total in both.
      const ch4Co2e = (result.ch4Kg ?? 0) * 28;
      const n2oCo2e = (result.n2oKg ?? 0) * 265;
      const supplementaryCo2e = ch4Co2e + n2oCo2e;
      const savingSupplementary =
        plan.useDistanceSheet &&
        typeof distance === "number" &&
        (ch4G != null || n2oG != null) &&
        supplementaryCo2e > 0;

      const hasEstimatedFuel = result.completeness === "estimated" && result.co2Kg != null;
      if (
        (typeof fuelQuantity === "number" || hasEstimatedFuel) &&
        selectedFuelFactor != null &&
        (result.co2Kg != null || (!savingSupplementary && result.totalCo2eKg > 0))
      ) {
        const fuelEmissions = savingSupplementary
          ? result.co2Kg ?? 0
          : result.totalCo2eKg;
        await insertLegacyTableEntries("scope1_epa_mobile_fuel_entries", [
          {
            user_id: user.id,
            fuel_type: [
              fuelType,
              `[${equipment}]`,
              site ? `site:${site}` : null,
              sourceId ? `id:${sourceId}` : null,
              period ? `period:${period}` : null,
              `method:activity_mobile_v1`,
              `coverage:${result.coverage}`,
              result.completeness === "estimated" ? "estimated" : null,
            ]
              .filter(Boolean)
              .join(" "),
            unit: fuelUnit,
            quantity: fuelQuantity ?? 0,
            factor: selectedFuelFactor,
            emissions: fuelEmissions,
            emissions_output: result.totalCo2eKg,
            emissions_output_unit: "kg",
          },
        ]);
      }

      if (savingSupplementary) {
        const table =
          plan.distanceSheet === "On-Road Gasoline"
            ? "scope1_epa_on_road_gasoline_entries"
            : plan.distanceSheet === "On-Road Diesel & Alt Fuel"
              ? "scope1_epa_on_road_diesel_alt_fuel_entries"
              : "scope1_epa_non_road_vehicle_entries";

        if (table === "scope1_epa_on_road_gasoline_entries") {
          await insertLegacyTableEntries(table, [
            {
              user_id: user.id,
              vehicle_type: equipment,
              model_year: "aggregate",
              emission_selection: "ch4_n2o_co2e",
              miles: distanceUnit.startsWith("km") ? distance * 0.621371 : distance,
              emissions: supplementaryCo2e,
            },
          ]);
        } else if (table === "scope1_epa_on_road_diesel_alt_fuel_entries") {
          await insertLegacyTableEntries(table, [
            {
              user_id: user.id,
              vehicle_type: equipment,
              fuel_type: fuelType || "diesel",
              emission_selection: "ch4_n2o_co2e",
              miles: distanceUnit.startsWith("km") ? distance * 0.621371 : distance,
              emissions: supplementaryCo2e,
            },
          ]);
        } else {
          await insertLegacyTableEntries(table, [
            {
              user_id: user.id,
              vehicle_type: equipment,
              fuel_type: fuelType || "diesel",
              unit: fuelUnit,
              emission_selection: "ch4_n2o_co2e",
              gallons: fuelQuantity,
              emissions: supplementaryCo2e,
            },
          ]);
        }
      }

      toast({
        title: "Saved",
        description: `Activity saved (${result.completeness}). Site/source context: ${site || "—"} / ${sourceId || "—"} / ${period}.`,
      });
      onSaveAndNext?.();
    } catch (e: unknown) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "Could not save activity",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const roadLabel = plan.roadClass === "on_road" ? "On-road" : "Non-road";
  const completenessLabel: Record<string, string> = {
    complete_co2e: "Complete",
    partial_gases: "Partial",
    estimated: "Estimated",
    blocked_missing_data: "Need more data",
    pending_method: "Pending",
  };

  return (
    <ActivitySectionShell
      icon={Car}
      title="Vehicles and Mobile Equipment"
      subtitle="Company vehicles and mobile equipment that burn fuel."
      details={
        <p>
          On-road vs non-road follows the equipment you pick. Fuel and distance can contribute
          different gases — we assemble one result and tell you if anything is missing.
        </p>
      }
    >
      <FormStep step={1} label="Vehicle details">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <Label className="text-gray-600 text-xs">Site</Label>
            <Input
              className="mt-1.5 rounded-xl border-gray-200"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div>
            <Label className="text-gray-600 text-xs">Vehicle ID</Label>
            <Input
              className="mt-1.5 rounded-xl border-gray-200"
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div>
            <Label className="text-gray-600 text-xs">Period</Label>
            <Input
              type="month"
              className="mt-1.5 rounded-xl border-gray-200"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label className="text-gray-600 text-xs">Equipment type</Label>
          <Select value={equipment} onValueChange={(v) => setEquipment(v as MobileEquipmentKind)}>
            <SelectTrigger className="mt-1.5 rounded-xl border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MOBILE_EQUIPMENT_OPTIONS.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1.5 text-xs text-gray-400">
            Treated as <span className="font-medium text-gray-600">{roadLabel}</span>
          </p>
        </div>
      </FormStep>

      <FormStep step={2} label="What data do you have?">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <ChoiceCard
            selected={dataAvailable === "fuel"}
            onSelect={() => setDataAvailable("fuel")}
            title="Fuel used"
            description="Litres or gallons"
          />
          <ChoiceCard
            selected={dataAvailable === "distance"}
            onSelect={() => setDataAvailable("distance")}
            title="Distance"
            description="Miles or km"
          />
          <ChoiceCard
            selected={dataAvailable === "both"}
            onSelect={() => setDataAvailable("both")}
            title="Both"
            description="Best coverage"
          />
        </div>
      </FormStep>

      <FormStep step={3} label="Enter amounts">
        {(dataAvailable === "fuel" || dataAvailable === "both") && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div className="sm:col-span-1">
              <Label className="text-gray-600 text-xs">Fuel type</Label>
              <Select value={fuelType} onValueChange={setFuelType}>
                <SelectTrigger className="mt-1.5 rounded-xl border-gray-200">
                  <SelectValue placeholder={loadingFactors ? "Loading…" : "Select"} />
                </SelectTrigger>
                <SelectContent>
                  {fuelOptions.map((f) => (
                    <SelectItem key={f.label} value={f.label}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-600 text-xs">Quantity</Label>
              <Input
                type="number"
                min="0"
                className="mt-1.5 rounded-xl border-gray-200"
                value={fuelQuantity ?? ""}
                onChange={(e) =>
                  setFuelQuantity(e.target.value === "" ? undefined : Number(e.target.value))
                }
              />
            </div>
            <div>
              <Label className="text-gray-600 text-xs">Unit</Label>
              <Select value={fuelUnit} onValueChange={setFuelUnit}>
                <SelectTrigger className="mt-1.5 rounded-xl border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gallon">gallon</SelectItem>
                  <SelectItem value="liter">liter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {(dataAvailable === "distance" || dataAvailable === "both") && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <Label className="text-gray-600 text-xs">Distance</Label>
              <Input
                type="number"
                min="0"
                className="mt-1.5 rounded-xl border-gray-200"
                value={distance ?? ""}
                onChange={(e) =>
                  setDistance(e.target.value === "" ? undefined : Number(e.target.value))
                }
              />
            </div>
            <div>
              <Label className="text-gray-600 text-xs">Unit</Label>
              <Select value={distanceUnit} onValueChange={setDistanceUnit}>
                <SelectTrigger className="mt-1.5 rounded-xl border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="miles">miles</SelectItem>
                  <SelectItem value="km">km</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {dataAvailable === "distance" && (
          <details className="group rounded-xl border border-amber-100 bg-amber-50/40 open:bg-amber-50/60">
            <summary className="cursor-pointer list-none flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm text-amber-950 font-medium">
              <span>Need CO₂ from distance? Add fuel efficiency</span>
              <ChevronDown className="h-4 w-4 text-amber-700 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="px-3.5 pb-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <p className="sm:col-span-3 text-xs text-amber-900/80">
                Documented value, units, and source required — we don’t invent defaults.
              </p>
              <div>
                <Label className="text-amber-900/80 text-xs">Efficiency</Label>
                <Input
                  type="number"
                  min="0"
                  className="mt-1.5 rounded-xl border-amber-200 bg-white"
                  value={efficiency ?? ""}
                  onChange={(e) =>
                    setEfficiency(e.target.value === "" ? undefined : Number(e.target.value))
                  }
                />
              </div>
              <div>
                <Label className="text-amber-900/80 text-xs">Unit</Label>
                <Select value={efficiencyUnit} onValueChange={setEfficiencyUnit}>
                  <SelectTrigger className="mt-1.5 rounded-xl border-amber-200 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mpg">mpg</SelectItem>
                    <SelectItem value="km_per_l">km/L</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-amber-900/80 text-xs">Source</Label>
                <Input
                  className="mt-1.5 rounded-xl border-amber-200 bg-white"
                  placeholder="e.g. OEM sheet"
                  value={efficiencySource}
                  onChange={(e) => setEfficiencySource(e.target.value)}
                />
              </div>
            </div>
          </details>
        )}

        {factorError && (
          <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {factorError}
          </p>
        )}
      </FormStep>

      <div className="rounded-2xl border border-[#BFE3D3]/80 bg-gradient-to-br from-[#EAF7F1]/80 to-white p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <p className="text-sm font-semibold text-[#0F6E56]">Result</p>
          <span className="text-[11px] font-medium uppercase tracking-wide rounded-full bg-white/80 border border-[#BFE3D3] px-2.5 py-0.5 text-[#0F6E56]">
            {completenessLabel[result.completeness] || result.completeness}
          </span>
        </div>
        <p className="text-2xl font-semibold tabular-nums text-gray-900 tracking-tight">
          {result.totalCo2eKg.toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
          <span className="text-base font-medium text-gray-500">kg CO₂e</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          {result.co2Kg != null && <span>CO₂ {result.co2Kg.toLocaleString()} kg</span>}
          {result.ch4Kg != null && <span>CH₄ {result.ch4Kg.toLocaleString()} kg</span>}
          {result.n2oKg != null && <span>N₂O {result.n2oKg.toLocaleString()} kg</span>}
        </div>
        {result.missing?.length ? (
          <details className="mt-3 text-xs text-amber-900">
            <summary className="cursor-pointer font-medium">
              {result.missing.length} item{result.missing.length > 1 ? "s" : ""} still needed
            </summary>
            <ul className="mt-1.5 list-disc ml-4 space-y-0.5">
              {result.missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={saving || result.completeness === "blocked_missing_data"}
          className="bg-[#1D9E75] hover:bg-[#22B87E] text-white rounded-xl"
          onClick={save}
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving…" : "Save"}
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

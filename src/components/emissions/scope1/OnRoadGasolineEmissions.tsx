import React, { useEffect, useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const TABLE_NAME = "scope1_epa_on_road_gasoline_entries";

/**
 * Scope 1 - On-Road Gasoline
 * Reference data source: Supabase table "On-Road Gasoline" (or on_road_gasoline)
 *
 * Expected columns (match your Supabase schema; parsing is flexible):
 * - "Vehicle Type" (text)
 * - "Model Year" (text)
 * - "CH4 Factor (g CH4 / vehicle-mile)" (float8)
 * - "N2O Factor (g N2O / vehicle-mile)" (float8)
 * - "CO2 Factor (g CO2 / vehicle-mile)" (float8, optional – if present, total CO2e includes CO2 + CH4 + N2O)
 */

interface OnRoadFactorRow {
  id: string | number;
  vehicleType: string;
  modelYear: string;
  co2e_g_per_mile?: number;
  co2_g_per_mile?: number;
  ch4_g_per_mile?: number;
  n2o_g_per_mile?: number;
}

// Only CH4 or N2O — your "On-Road Gasoline" table has those factor columns
export type EmissionSelection = "ch4_only" | "n2o_only";
type DistanceUnit = "mile" | "km";
type OutputUnit = "kg" | "tonnes" | "g" | "short_ton";

interface OnRoadRow {
  id: string;
  dbId?: string;
  isExisting?: boolean;
  vehicleType?: string;
  modelYear?: string;
  emissionSelection?: EmissionSelection;
   distanceUnit?: DistanceUnit;
  miles?: number;
  emissions?: number; // kg CH4 or kg N2O
}

interface Props {
  onDataChange: (rows: OnRoadRow[]) => void;
  onSaveAndNext?: () => void;
  companyContext?: boolean;
  counterpartyId?: string;
}

const newRow = (): OnRoadRow => ({
  id: crypto.randomUUID(),
  emissionSelection: "ch4_only",
  distanceUnit: "mile",
});

const parseNum = (v: any): number | undefined => {
  if (typeof v === "number") return isFinite(v) ? v : undefined;
  if (v == null) return undefined;
  const cleaned = String(v).replace(/,/g, "");
  const n = parseFloat(cleaned);
  return isFinite(n) ? n : undefined;
};

const pickFirstKey = (row: any, patterns: RegExp[]): any => {
  const keys = Object.keys(row || {});
  for (const p of patterns) {
    const k = keys.find((kk) => p.test(kk));
    if (k) return row[k];
  }
  return undefined;
};

const pickNumber = (row: any, patterns: RegExp[]): number | undefined => {
  const v = pickFirstKey(row, patterns);
  return parseNum(v);
};

function toEmissionSelection(value: unknown): EmissionSelection {
  if (value === "ch4_only" || value === "n2o_only") return value;
  return "ch4_only";
}

const EMISSION_SELECTION_OPTIONS: { value: EmissionSelection; label: string }[] = [
  { value: "ch4_only", label: "CH4" },
  { value: "n2o_only", label: "N2O" },
];

const computeEmissions = (
  factorRow: OnRoadFactorRow | undefined,
  miles: number | undefined,
  selection: EmissionSelection
): number | undefined => {
  if (typeof miles !== "number" || !factorRow) return undefined;
  // When user selects CH4, result is kg CH4. When N2O, result is kg N2O.
  if (selection === "ch4_only") {
    return ((factorRow.ch4_g_per_mile || 0) * miles) / 1000;
  }
  return ((factorRow.n2o_g_per_mile || 0) * miles) / 1000;
};

const OnRoadGasolineEmissions: React.FC<Props> = ({ onDataChange, onSaveAndNext, companyContext = false, counterpartyId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [factors, setFactors] = useState<OnRoadFactorRow[]>([]);
  const [rows, setRows] = useState<OnRoadRow[]>([]);
  const [existingEntries, setExistingEntries] = useState<OnRoadRow[]>([]);
  const [outputUnit, setOutputUnit] = useState<OutputUnit>("kg");

  const convertEmission = (value?: number): string => {
    if (value == null) return "";
    switch (outputUnit) {
      case "kg":
        return value.toFixed(6);
      case "tonnes":
        return (value / 1000).toFixed(6);
      case "g":
        return (value * 1000).toFixed(6);
      case "short_ton":
        return (value / 907.18474).toFixed(6);
      default:
        return value.toFixed(6);
    }
  };

  // Load saved entries from Supabase
  useEffect(() => {
    const loadEntries = async () => {
      if (!user) return;
      if (companyContext && !counterpartyId) {
        setRows([]);
        setExistingEntries([]);
        onDataChange([]);
        setIsInitialLoad(false);
        return;
      }
      try {
        let q = supabase.from(TABLE_NAME as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false });
        if (companyContext && counterpartyId) q = q.eq("counterparty_id", counterpartyId);
        else q = q.is("counterparty_id", null);
        const { data, error } = await q;
        if (error) throw error;
        const mapped: OnRoadRow[] = (data || []).map((entry: any) => ({
          id: crypto.randomUUID(),
          dbId: entry.id,
          isExisting: true,
          vehicleType: entry.vehicle_type,
          modelYear: entry.model_year,
          emissionSelection: toEmissionSelection(entry.emission_selection),
          distanceUnit: "mile",
          miles: entry.miles,
          emissions: entry.emissions,
        }));
        setExistingEntries(mapped);
        setRows(mapped.length > 0 ? mapped : []);
        if (mapped.length > 0) onDataChange(mapped);
      } catch (err: any) {
        console.error("Error loading scope1_epa_on_road_gasoline_entries:", err);
        toast({ title: "Error", description: err?.message || "Failed to load saved entries", variant: "destructive" });
      } finally {
        setIsInitialLoad(false);
      }
    };
    loadEntries();
  }, [user, companyContext, counterpartyId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let result = await supabase.from("On-Road Gasoline" as any).select("*");
        if (result.error) {
          // try underscore variant if needed
          result = await supabase.from("on_road_gasoline" as any).select("*");
        }
        if (result.error) {
          console.error('Error loading "On-Road Gasoline":', result.error);
          toast({
            title: "Error",
            description: result.error.message || 'Failed to load "On-Road Gasoline" reference data.',
            variant: "destructive",
          });
          return;
        }

        const data = result.data || [];
        const mapped: OnRoadFactorRow[] = data
          .map((r: any) => {
            const vehicleType =
              pickFirstKey(r, [/^Vehicle\s*Type$/i, /vehicle[_\s]*type/i]) ??
              r["VehicleType"] ??
              r.vehicle_type ??
              r.vehicleType;
            const modelYear =
              pickFirstKey(r, [/^Model\s*Year$/i, /model[_\s]*year/i, /year/i]) ??
              r["ModelYear"] ??
              r.model_year ??
              r.modelYear;

            // Prefer a direct CO2e factor if the table has one
            const co2e = pickNumber(r, [/co2e\s*factor/i, /co2[_\s]*equivalent/i, /ghg\s*factor/i]);
            const co2 = pickNumber(r, [/^CO2\s*Factor/i, /co2[_\s]*factor/i]);
            const ch4 = pickNumber(r, [/^CH4\s*Factor/i, /ch4[_\s]*factor/i]);
            const n2o = pickNumber(r, [/^N2O\s*Factor/i, /n2o[_\s]*factor/i]);

            if (!vehicleType || !modelYear) return null;

            return {
              id: r.id || r.ID || r.Id,
              vehicleType: String(vehicleType),
              modelYear: String(modelYear),
              co2e_g_per_mile: co2e,
              co2_g_per_mile: co2,
              ch4_g_per_mile: ch4,
              n2o_g_per_mile: n2o,
            };
          })
          .filter((x): x is OnRoadFactorRow => !!x);

        setFactors(mapped);
        if (mapped.length === 0) {
          toast({
            title: "No data",
            description: 'No usable rows found in "On-Road Gasoline". Please verify the table has data and readable columns.',
          });
        }
      } catch (e: any) {
        console.error("Unexpected error loading On-Road Gasoline:", e);
        toast({
          title: "Error",
          description: e?.message || 'Unexpected error loading "On-Road Gasoline".',
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [toast]);

  useEffect(() => {
    if (!isInitialLoad) onDataChange(rows);
  }, [rows, isInitialLoad, onDataChange]);

  const vehicleTypes = useMemo(
    () => Array.from(new Set(factors.map((f) => f.vehicleType))).sort((a, b) => a.localeCompare(b)),
    [factors],
  );

  const modelYearsFor = (vehicleType?: string) =>
    Array.from(
      new Set(factors.filter((f) => f.vehicleType === vehicleType).map((f) => f.modelYear)),
    ).sort((a, b) => a.localeCompare(b));

  const addRow = () => setRows((prev) => [...prev, newRow()]);
  const removeRow = async (id: string) => {
    const row = rows.find((r) => r.id === id);
    if (row?.dbId && user) {
      try {
        const { error } = await supabase.from(TABLE_NAME as any).delete().eq("id", row.dbId);
        if (error) throw error;
      } catch (e: any) {
        toast({ title: "Error", description: e?.message || "Failed to delete entry", variant: "destructive" });
        return;
      }
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRow = (id: string, patch: Partial<OnRoadRow>) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next: OnRoadRow = { ...r, ...patch };
        const factorRow =
          next.vehicleType && next.modelYear
            ? factors.find((f) => f.vehicleType === next.vehicleType && f.modelYear === next.modelYear)
            : undefined;
        next.emissions = computeEmissions(factorRow, next.miles, next.emissionSelection ?? "ch4_only");
        return next;
      }),
    );
  };


  const totalEmissions = rows.reduce((sum, r) => sum + (r.emissions || 0), 0);

  const rowChanged = (r: OnRoadRow, existing: OnRoadRow[]): boolean => {
    const ex = existing.find((e) => e.dbId === r.dbId);
    if (!ex) return false;
    return (
      r.vehicleType !== ex.vehicleType ||
      r.modelYear !== ex.modelYear ||
      r.emissionSelection !== ex.emissionSelection ||
      Number(r.miles) !== Number(ex.miles) ||
      Number(r.emissions) !== Number(ex.emissions)
    );
  };

  const handleSaveAndNext = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please log in to save.", variant: "destructive" });
      return;
    }
    const newEntries = rows.filter(
      (r) =>
        r.vehicleType &&
        r.modelYear &&
        typeof r.miles === "number" &&
        typeof r.emissions === "number" &&
        !r.isExisting
    );
    const changedExisting = rows.filter((r) => r.isExisting && r.dbId && rowChanged(r, existingEntries));
    if (newEntries.length === 0 && changedExisting.length === 0) {
      toast({ title: "Nothing to save", description: "No new or changed on-road gasoline entries." });
      onSaveAndNext?.();
      return;
    }
    setSaving(true);
    try {
      if (newEntries.length > 0) {
        const payload = newEntries.map((v) => ({
          user_id: user.id,
          counterparty_id: companyContext ? counterpartyId ?? null : null,
          vehicle_type: v.vehicleType!,
          model_year: v.modelYear!,
          emission_selection: v.emissionSelection ?? "ch4_only",
          miles: v.miles!,
          emissions: v.emissions!,
        }));
        const { error } = await supabase.from(TABLE_NAME as any).insert(payload);
        if (error) throw error;
      }
      if (changedExisting.length > 0) {
        const results = await Promise.all(
          changedExisting.map((v) =>
            supabase
              .from(TABLE_NAME as any)
              .update({
                vehicle_type: v.vehicleType!,
                model_year: v.modelYear!,
                emission_selection: v.emissionSelection ?? "ch4_only",
                miles: v.miles!,
                emissions: v.emissions!,
              })
              .eq("id", v.dbId!)
          )
        );
        const updateError = results.find((r: { error?: unknown }) => r.error)?.error;
        if (updateError) throw updateError;
      }
      toast({
        title: "Saved",
        description: `Saved ${newEntries.length} new and updated ${changedExisting.length} on-road gasoline entries.`,
      });
      onSaveAndNext?.();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">On-Road Gasoline (Scope 1)</h4>
          <p className="text-sm text-gray-600">
            Factors loaded from <span className="font-medium">On-Road Gasoline</span>.
          </p>
        </div>
        <Button onClick={addRow} className="bg-teal-600 hover:bg-teal-700 text-white" disabled={loading}>
          <Plus className="h-4 w-4 mr-2" /> Add Row
        </Button>
      </div>

      {loading && <div className="text-sm text-gray-600">Loading on-road gasoline reference data...</div>}

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Label className="md:col-span-1 text-gray-500">Vehicle type</Label>
        <Label className="md:col-span-1 text-gray-500">Model year</Label>
        <Label className="md:col-span-1 text-gray-500">Emission type</Label>
        <Label className="md:col-span-1 text-gray-500">Distance unit</Label>
        <Label className="md:col-span-1 text-gray-500">Distance</Label>
        <Label className="md:col-span-1 text-gray-500">Emissions ({outputUnit})</Label>
      </div>

      <div className="space-y-3">
        {rows.map((r) => {
          const unit: DistanceUnit = r.distanceUnit ?? "mile";
          const distanceDisplay =
            r.miles != null ? (unit === "mile" ? r.miles : r.miles * 1.60934) : "";

          return (
          <div key={r.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center p-3 rounded-lg bg-gray-50">
            <Select
              value={r.vehicleType}
              onValueChange={(v) => updateRow(r.id, { vehicleType: v, modelYear: undefined })}
              disabled={vehicleTypes.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select vehicle type" />
              </SelectTrigger>
              <SelectContent>
                {vehicleTypes.map((vt) => (
                  <SelectItem key={vt} value={vt}>
                    {vt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={r.modelYear}
              onValueChange={(v) => updateRow(r.id, { modelYear: v })}
              disabled={!r.vehicleType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select model year" />
              </SelectTrigger>
              <SelectContent>
                {modelYearsFor(r.vehicleType).map((my) => (
                  <SelectItem key={my} value={my}>
                    {my}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={r.emissionSelection ?? "ch4_only"}
              onValueChange={(v) => updateRow(r.id, { emissionSelection: v as EmissionSelection })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select emission" />
              </SelectTrigger>
              <SelectContent>
                {EMISSION_SELECTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={unit}
              onValueChange={(v) => updateRow(r.id, { distanceUnit: v as DistanceUnit })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mile">mile</SelectItem>
                <SelectItem value="km">km</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="number"
              step="any"
              min="0"
              max="999999999999.999999"
              value={distanceDisplay}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") {
                  updateRow(r.id, { miles: undefined });
                } else {
                  const num = Number(v);
                  if (num >= 0 && num <= 999999999999.999999) {
                    const miles = unit === "mile" ? num : num * 0.621371;
                    updateRow(r.id, { miles });
                  }
                }
              }}
              placeholder="Enter distance"
            />

            <div className="flex items-center gap-2 md:col-span-1">
              <Input readOnly value={convertEmission(r.emissions)} placeholder="Auto" />
              <Button variant="ghost" className="text-red-600" onClick={() => removeRow(r.id)} aria-label="Remove row">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )})}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-gray-700 font-medium">
          Total On-Road Gasoline Emissions:{" "}
          <span className="font-semibold">
            {convertEmission(totalEmissions)} {outputUnit}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Output unit</span>
            <Select value={outputUnit} onValueChange={(v) => setOutputUnit(v as OutputUnit)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kg">kg</SelectItem>
                <SelectItem value="tonnes">tonnes</SelectItem>
                <SelectItem value="g">g</SelectItem>
                <SelectItem value="short_ton">short ton</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSaveAndNext} className="bg-teal-600 hover:bg-teal-700 text-white" disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> Save and Next
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OnRoadGasolineEmissions;


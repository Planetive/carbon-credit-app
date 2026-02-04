import React, { useEffect, useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const TABLE_NAME = "scope1_epa_non_road_vehicle_entries";

// Defaults match other on-road components
const GWP_CH4 = 28;
const GWP_N2O = 265;

interface FactorRow {
  id: string | number;
  vehicleType: string;
  fuelType: string;
  // Most likely units in this table are per gallon (per your screenshot)
  co2e_g_per_gallon?: number;
  co2_g_per_gallon?: number;
  ch4_g_per_gallon?: number;
  n2o_g_per_gallon?: number;
}

type NonRoadUnit = "gallon" | "liter";
type EmissionSelection = "ch4" | "n2o";
type OutputUnit = "kg" | "tonnes" | "g" | "short_ton";

interface EntryRow {
  id: string;
  dbId?: string;
  isExisting?: boolean;
  vehicleType?: string;
  fuelType?: string;
  unit?: NonRoadUnit;
  emissionSelection?: EmissionSelection;
  gallons?: number;
  emissions?: number; // kg CO2e
}

interface Props {
  onDataChange: (rows: EntryRow[]) => void;
  onSaveAndNext?: () => void;
  companyContext?: boolean;
  counterpartyId?: string;
}

const newRow = (): EntryRow => ({ id: crypto.randomUUID(), unit: "gallon", emissionSelection: "ch4" });

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

const NonRoadVehicleEmissions: React.FC<Props> = ({ onDataChange, onSaveAndNext, companyContext = false, counterpartyId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [factors, setFactors] = useState<FactorRow[]>([]);
  const [rows, setRows] = useState<EntryRow[]>([]);
  const [existingEntries, setExistingEntries] = useState<EntryRow[]>([]);
  const [outputUnit, setOutputUnit] = useState<OutputUnit>("kg");

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
        const mapped: EntryRow[] = (data || []).map((entry: any) => ({
          id: crypto.randomUUID(),
          dbId: entry.id,
          isExisting: true,
          vehicleType: entry.vehicle_type,
          fuelType: entry.fuel_type,
          unit: (entry.unit as NonRoadUnit) ?? "gallon",
          emissionSelection: (entry.emission_selection as EmissionSelection) ?? "ch4",
          gallons: entry.gallons,
          emissions: entry.emissions,
        }));
        setExistingEntries(mapped);
        setRows(mapped.length > 0 ? mapped : []);
        if (mapped.length > 0) onDataChange(mapped);
      } catch (err: any) {
        console.error("Error loading scope1_epa_non_road_vehicle_entries:", err);
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
        let result = await supabase.from("Non-Road Vehicle" as any).select("*");
        if (result.error) {
          result = await supabase.from("non_road_vehicle" as any).select("*");
        }
        if (result.error) {
          console.error('Error loading "Non-Road Vehicle":', result.error);
          toast({
            title: "Error",
            description: result.error.message || 'Failed to load "Non-Road Vehicle" reference data.',
            variant: "destructive",
          });
          return;
        }

        const data = result.data || [];
        const mapped: FactorRow[] = data
          .map((r: any) => {
            const vehicleType =
              pickFirstKey(r, [/^Vehicle\s*Type$/i, /vehicle[_\s]*type/i]) ??
              r.vehicle_type ??
              r.vehicleType;
            const fuelType =
              pickFirstKey(r, [/^Fuel\s*Type$/i, /fuel[_\s]*type/i]) ??
              r.fuel_type ??
              r.fuelType;

            // Prefer direct CO2e if present
            const co2e = pickNumber(r, [/co2e\s*factor/i, /co2[_\s]*equivalent/i, /ghg\s*factor/i]);

            // Per gallon factors (match screenshot: "g CH4 / gallon")
            const co2 = pickNumber(r, [/^CO2\s*Factor/i, /co2[_\s]*factor/i, /g\s*co2/i]);
            const ch4 = pickNumber(r, [/^CH4\s*Factor/i, /ch4[_\s]*factor/i, /g\s*ch4/i]);
            const n2o = pickNumber(r, [/^N2O\s*Factor/i, /n2o[_\s]*factor/i, /g\s*n2o/i]);

            if (!vehicleType || !fuelType) return null;

            return {
              id: r.id || r.ID || r.Id,
              vehicleType: String(vehicleType),
              fuelType: String(fuelType),
              co2e_g_per_gallon: co2e,
              co2_g_per_gallon: co2,
              ch4_g_per_gallon: ch4,
              n2o_g_per_gallon: n2o,
            };
          })
          .filter((x): x is FactorRow => !!x);

        setFactors(mapped);
        if (mapped.length === 0) {
          toast({
            title: "No data",
            description:
              'No usable rows found in "Non-Road Vehicle". Please verify the table has data and readable columns.',
          });
        }
      } catch (e: any) {
        console.error("Unexpected error loading Non-Road Vehicle:", e);
        toast({
          title: "Error",
          description: e?.message || 'Unexpected error loading "Non-Road Vehicle".',
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

  const fuelTypesFor = (vehicleType?: string) =>
    Array.from(new Set(factors.filter((f) => f.vehicleType === vehicleType).map((f) => f.fuelType))).sort((a, b) =>
      a.localeCompare(b),
    );

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

  const updateRow = (id: string, patch: Partial<EntryRow>) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next: EntryRow = { ...r, ...patch };

        let factorRow: FactorRow | undefined;
        if (next.vehicleType && next.fuelType) {
          const matches = factors.filter((f) => f.vehicleType === next.vehicleType && f.fuelType === next.fuelType);
          factorRow = matches[0];
        }

        if (typeof next.gallons === "number" && factorRow) {
          const quantity = next.gallons;
          const unit: NonRoadUnit = next.unit ?? "gallon";
          const gallons = unit === "gallon" ? quantity : quantity / 3.78541; // convert liters -> gallons

          // When user selects CH4, result is in kg CH4.
          // When user selects N2O, result is in kg N2O.
          const selection: EmissionSelection = next.emissionSelection ?? "ch4";
          if (selection === "ch4") {
            next.emissions = ((factorRow.ch4_g_per_gallon || 0) * gallons) / 1000;
          } else {
            next.emissions = ((factorRow.n2o_g_per_gallon || 0) * gallons) / 1000;
          }

          // If everything is still 0, warn (usually means factor columns weren't read)
          if (next.gallons > 0 && next.emissions === 0) {
            const hasAnyFactor =
              typeof factorRow.co2e_g_per_gallon === "number" ||
              typeof factorRow.co2_g_per_gallon === "number" ||
              typeof factorRow.ch4_g_per_gallon === "number" ||
              typeof factorRow.n2o_g_per_gallon === "number";

            if (!hasAnyFactor) {
              toast({
                title: "No factors found",
                description:
                  'Could not read factor columns from "Non-Road Vehicle" for this selection. Check column names (e.g., "CH4 Factor (g CH4 / gallon)").',
                variant: "destructive",
              });
            }
          }
        } else {
          next.emissions = undefined;
        }

        return next;
      }),
    );
  };

  const totalEmissions = rows.reduce((sum, r) => sum + (r.emissions || 0), 0);

  const formatEmission = (raw: number): string => {
    if (!isFinite(raw)) return "";
    return raw.toLocaleString(undefined, {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
  };

  const convertEmission = (value?: number): string => {
    if (value == null) return "";
    let converted = value;
    switch (outputUnit) {
      case "kg":
        converted = value;
        break;
      case "tonnes":
        converted = value / 1000;
        break;
      case "g":
        converted = value * 1000;
        break;
      case "short_ton":
        converted = value / 907.18474;
        break;
      default:
        converted = value;
    }
    return formatEmission(converted);
  };

  const rowChanged = (r: EntryRow, existing: EntryRow[]): boolean => {
    const ex = existing.find((e) => e.dbId === r.dbId);
    if (!ex) return false;
    return (
      r.vehicleType !== ex.vehicleType ||
      r.fuelType !== ex.fuelType ||
      (r.unit ?? "gallon") !== (ex.unit ?? "gallon") ||
      (r.emissionSelection ?? "ch4") !== (ex.emissionSelection ?? "ch4") ||
      Number(r.gallons) !== Number(ex.gallons) ||
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
        r.fuelType &&
        typeof r.gallons === "number" &&
        typeof r.emissions === "number" &&
        !r.isExisting
    );
    const changedExisting = rows.filter((r) => r.isExisting && r.dbId && rowChanged(r, existingEntries));
    if (newEntries.length === 0 && changedExisting.length === 0) {
      toast({ title: "Nothing to save", description: "No new or changed non-road vehicle entries." });
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
          fuel_type: v.fuelType!,
          unit: v.unit ?? "gallon",
          emission_selection: v.emissionSelection ?? "ch4",
          gallons: v.gallons!,
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
                fuel_type: v.fuelType!,
                unit: v.unit ?? "gallon",
                emission_selection: v.emissionSelection ?? "ch4",
                gallons: v.gallons!,
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
        description: `Saved ${newEntries.length} new and updated ${changedExisting.length} non-road vehicle entries.`,
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
          <h4 className="text-lg font-semibold text-gray-900">Non-Road Vehicle (Scope 1)</h4>
          <p className="text-sm text-gray-600">
            Factors loaded from <span className="font-medium">Non-Road Vehicle</span>. Enter fuel use in gallons.
          </p>
        </div>
        <Button onClick={addRow} className="bg-teal-600 hover:bg-teal-700 text-white" disabled={loading}>
          <Plus className="h-4 w-4 mr-2" /> Add Row
        </Button>
      </div>

      {loading && <div className="text-sm text-gray-600">Loading reference data...</div>}

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Label className="md:col-span-1 text-gray-500">Vehicle type</Label>
        <Label className="md:col-span-1 text-gray-500">Fuel type</Label>
        <Label className="md:col-span-1 text-gray-500">Fuel amount</Label>
        <Label className="md:col-span-1 text-gray-500">Unit</Label>
        <Label className="md:col-span-1 text-gray-500">Emission type</Label>
        <Label className="md:col-span-1 text-gray-500">Emissions ({outputUnit})</Label>
      </div>

      <div className="space-y-3">
        {rows.map((r) => (
          <div
          key={r.id}
          className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center p-3 rounded-lg bg-gray-50"
          >
              <Select
                value={r.vehicleType}
                onValueChange={(v) => updateRow(r.id, { vehicleType: v, fuelType: undefined })}
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
                value={r.fuelType}
                onValueChange={(v) => updateRow(r.id, { fuelType: v })}
                disabled={!r.vehicleType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fuel type" />
                </SelectTrigger>
                <SelectContent>
                  {fuelTypesFor(r.vehicleType).map((ft) => (
                    <SelectItem key={ft} value={ft}>
                      {ft}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="number"
                step="any"
                min="0"
                max="999999999999.999999"
                value={r.gallons ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") {
                    updateRow(r.id, { gallons: undefined });
                  } else {
                    const num = Number(v);
                    if (num >= 0 && num <= 999999999999.999999) {
                      updateRow(r.id, { gallons: num });
                    }
                  }
                }}
                placeholder="Enter fuel amount"
              />

              <Select
                value={r.unit ?? "gallon"}
                onValueChange={(v) => updateRow(r.id, { unit: v as NonRoadUnit })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gallon">gallon</SelectItem>
                  <SelectItem value="liter">liter</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={r.emissionSelection ?? "ch4"}
                onValueChange={(v) => updateRow(r.id, { emissionSelection: v as EmissionSelection })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ch4">CH4 (g CH4 / gallon)</SelectItem>
                  <SelectItem value="n2o">N2O (g N2O / gallon)</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Input readOnly value={convertEmission(r.emissions)} placeholder="Auto" />
                <Button variant="ghost" className="text-red-600" onClick={() => removeRow(r.id)} aria-label="Remove row">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-gray-700 font-medium">
          Total Non-Road Vehicle Emissions:{" "}
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

export default NonRoadVehicleEmissions;


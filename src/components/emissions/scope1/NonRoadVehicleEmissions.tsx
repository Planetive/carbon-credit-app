import React, { useEffect, useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

interface EntryRow {
  id: string;
  vehicleType?: string;
  fuelType?: string;
  gallons?: number;
  emissions?: number; // kg CO2e
}

interface Props {
  onDataChange: (rows: EntryRow[]) => void;
  onSaveAndNext?: () => void;
}

const newRow = (): EntryRow => ({ id: crypto.randomUUID() });

const parseNum = (v: any): number | undefined => {
  if (typeof v === "number") return isFinite(v) ? v : undefined;
  if (v == null) return undefined;
  const n = parseFloat(String(v).replaceAll(",", ""));
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

const NonRoadVehicleEmissions: React.FC<Props> = ({ onDataChange, onSaveAndNext }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [factors, setFactors] = useState<FactorRow[]>([]);
  const [rows, setRows] = useState<EntryRow[]>([]);

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
    onDataChange(rows);
  }, [rows, onDataChange]);

  const vehicleTypes = useMemo(
    () => Array.from(new Set(factors.map((f) => f.vehicleType))).sort((a, b) => a.localeCompare(b)),
    [factors],
  );

  const fuelTypesFor = (vehicleType?: string) =>
    Array.from(new Set(factors.filter((f) => f.vehicleType === vehicleType).map((f) => f.fuelType))).sort((a, b) =>
      a.localeCompare(b),
    );

  const addRow = () => setRows((prev) => [...prev, newRow()]);
  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

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
          const gallons = next.gallons;
          if (typeof factorRow.co2e_g_per_gallon === "number") {
            next.emissions = (factorRow.co2e_g_per_gallon * gallons) / 1000;
          } else {
            const co2_kg = ((factorRow.co2_g_per_gallon || 0) * gallons) / 1000;
            const ch4_kgco2e = (((factorRow.ch4_g_per_gallon || 0) * gallons) / 1000) * GWP_CH4;
            const n2o_kgco2e = (((factorRow.n2o_g_per_gallon || 0) * gallons) / 1000) * GWP_N2O;
            next.emissions = co2_kg + ch4_kgco2e + n2o_kgco2e;
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

  const handleSaveAndNext = () => {
    toast({
      title: "Saved (local)",
      description: "Non-road vehicle emissions are included in Scope 1 total for the EPA calculator.",
    });
    onSaveAndNext?.();
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Label className="md:col-span-1 text-gray-500">Vehicle type</Label>
        <Label className="md:col-span-1 text-gray-500">Fuel type</Label>
        <Label className="md:col-span-1 text-gray-500">Fuel used (gallons)</Label>
        <Label className="md:col-span-1 text-gray-500">Emissions (kg CO2e)</Label>
      </div>

      <div className="space-y-3">
        {rows.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-3 rounded-lg bg-gray-50"
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
                placeholder="Enter gallons"
              />

              <div className="flex items-center gap-2">
                <Input readOnly value={r.emissions != null ? r.emissions.toFixed(6) : ""} placeholder="Auto" />
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
          <span className="font-semibold">{totalEmissions.toFixed(6)} kg CO2e</span>
        </div>
        <Button onClick={handleSaveAndNext} className="bg-teal-600 hover:bg-teal-700 text-white">
          <Save className="h-4 w-4 mr-2" /> Save and Next
        </Button>
      </div>
    </div>
  );
};

export default NonRoadVehicleEmissions;


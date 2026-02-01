import React, { useEffect, useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const TABLE_NAME = "scope1_epa_on_road_diesel_alt_fuel_entries";

// Same defaults as On-Road Gasoline component
const GWP_CH4 = 28;
const GWP_N2O = 265;

interface FactorRow {
  id: string | number;
  vehicleType: string;
  fuelType: string;
  modelYear?: string; // optional in this table
  co2e_g_per_mile?: number;
  co2_g_per_mile?: number;
  ch4_g_per_mile?: number;
  n2o_g_per_mile?: number;
}

interface EntryRow {
  id: string;
  dbId?: string;
  isExisting?: boolean;
  vehicleType?: string;
  fuelType?: string;
  modelYear?: string;
  miles?: number;
  emissions?: number; // kg CO2e
}

interface Props {
  onDataChange: (rows: EntryRow[]) => void;
  onSaveAndNext?: () => void;
  companyContext?: boolean;
  counterpartyId?: string;
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

const normalizeYear = (v: any): string | undefined => {
  const s = v == null ? "" : String(v).trim();
  return s.length > 0 ? s : undefined;
};

const OnRoadDieselAltFuelEmissions: React.FC<Props> = ({ onDataChange, onSaveAndNext, companyContext = false, counterpartyId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [factors, setFactors] = useState<FactorRow[]>([]);
  const [rows, setRows] = useState<EntryRow[]>([]);
  const [existingEntries, setExistingEntries] = useState<EntryRow[]>([]);

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
          modelYear: entry.model_year ?? undefined,
          miles: entry.miles,
          emissions: entry.emissions,
        }));
        setExistingEntries(mapped);
        setRows(mapped.length > 0 ? mapped : []);
        if (mapped.length > 0) onDataChange(mapped);
      } catch (err: any) {
        console.error("Error loading scope1_epa_on_road_diesel_alt_fuel_entries:", err);
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
        let result = await supabase.from("On-Road Diesel & Alt Fuel" as any).select("*");
        if (result.error) {
          // fallback variants
          result = await supabase.from("on_road_diesel_alt_fuel" as any).select("*");
        }
        if (result.error) {
          console.error('Error loading "On-Road Diesel & Alt Fuel":', result.error);
          toast({
            title: "Error",
            description: result.error.message || 'Failed to load "On-Road Diesel & Alt Fuel" reference data.',
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
            const modelYear =
              normalizeYear(pickFirstKey(r, [/^Model\s*Year$/i, /model[_\s]*year/i])) ??
              normalizeYear(r.model_year) ??
              normalizeYear(r.modelYear);

            const co2e = pickNumber(r, [/co2e\s*factor/i, /co2[_\s]*equivalent/i, /ghg\s*factor/i]);
            const co2 = pickNumber(r, [/^CO2\s*Factor/i, /co2[_\s]*factor/i]);
            const ch4 = pickNumber(r, [/^CH4\s*Factor/i, /ch4[_\s]*factor/i]);
            const n2o = pickNumber(r, [/^N2O\s*Factor/i, /n2o[_\s]*factor/i]);

            if (!vehicleType || !fuelType) return null;

            return {
              id: r.id || r.ID || r.Id,
              vehicleType: String(vehicleType),
              fuelType: String(fuelType),
              modelYear,
              co2e_g_per_mile: co2e,
              co2_g_per_mile: co2,
              ch4_g_per_mile: ch4,
              n2o_g_per_mile: n2o,
            };
          })
          .filter((x): x is FactorRow => !!x);

        setFactors(mapped);
        if (mapped.length === 0) {
          toast({
            title: "No data",
            description:
              'No usable rows found in "On-Road Diesel & Alt Fuel". Please verify the table has data and readable columns.',
          });
        }
      } catch (e: any) {
        console.error("Unexpected error loading On-Road Diesel & Alt Fuel:", e);
        toast({
          title: "Error",
          description: e?.message || 'Unexpected error loading "On-Road Diesel & Alt Fuel".',
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

  const modelYearsFor = (vehicleType?: string, fuelType?: string) =>
    Array.from(
      new Set(
        factors
          .filter((f) => f.vehicleType === vehicleType && f.fuelType === fuelType)
          .map((f) => f.modelYear)
          .filter((v): v is string => !!v),
      ),
    ).sort((a, b) => a.localeCompare(b));

  const needsModelYear = (vehicleType?: string, fuelType?: string) => {
    if (!vehicleType || !fuelType) return false;
    return factors.some((f) => f.vehicleType === vehicleType && f.fuelType === fuelType && !!f.modelYear);
  };

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

        // If vehicle or fuel changes, clear modelYear if it isn't required
        const requireYear = needsModelYear(next.vehicleType, next.fuelType);
        if (!requireYear) {
          next.modelYear = undefined;
        }

        // Pick factor row:
        // - If modelYear is required, match exact year
        // - Else, match the row with empty/undefined modelYear (fallback to first match)
        let factorRow: FactorRow | undefined;
        if (next.vehicleType && next.fuelType) {
          const matches = factors.filter((f) => f.vehicleType === next.vehicleType && f.fuelType === next.fuelType);
          if (requireYear) {
            if (next.modelYear) {
              factorRow = matches.find((m) => m.modelYear === next.modelYear) || undefined;
            }
          } else {
            factorRow = matches.find((m) => !m.modelYear) || matches[0];
          }
        }

        if (typeof next.miles === "number" && factorRow) {
          const miles = next.miles;
          if (typeof factorRow.co2e_g_per_mile === "number") {
            next.emissions = (factorRow.co2e_g_per_mile * miles) / 1000;
          } else {
            const co2_kg = ((factorRow.co2_g_per_mile || 0) * miles) / 1000;
            const ch4_kgco2e = (((factorRow.ch4_g_per_mile || 0) * miles) / 1000) * GWP_CH4;
            const n2o_kgco2e = (((factorRow.n2o_g_per_mile || 0) * miles) / 1000) * GWP_N2O;
            next.emissions = co2_kg + ch4_kgco2e + n2o_kgco2e;
          }
        } else {
          next.emissions = undefined;
        }

        return next;
      }),
    );
  };

  const totalEmissions = rows.reduce((sum, r) => sum + (r.emissions || 0), 0);

  const rowChanged = (r: EntryRow, existing: EntryRow[]): boolean => {
    const ex = existing.find((e) => e.dbId === r.dbId);
    if (!ex) return false;
    return (
      r.vehicleType !== ex.vehicleType ||
      r.fuelType !== ex.fuelType ||
      (r.modelYear ?? "") !== (ex.modelYear ?? "") ||
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
        r.fuelType &&
        typeof r.miles === "number" &&
        typeof r.emissions === "number" &&
        !r.isExisting
    );
    const changedExisting = rows.filter((r) => r.isExisting && r.dbId && rowChanged(r, existingEntries));
    if (newEntries.length === 0 && changedExisting.length === 0) {
      toast({ title: "Nothing to save", description: "No new or changed on-road diesel & alt fuel entries." });
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
          model_year: v.modelYear ?? null,
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
                fuel_type: v.fuelType!,
                model_year: v.modelYear ?? null,
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
        description: `Saved ${newEntries.length} new and updated ${changedExisting.length} on-road diesel & alt fuel entries.`,
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
          <h4 className="text-lg font-semibold text-gray-900">On-Road Diesel & Alt Fuel (Scope 1)</h4>
          <p className="text-sm text-gray-600">
            Factors loaded from <span className="font-medium">On-Road Diesel & Alt Fuel</span>.
          </p>
        </div>
        <Button onClick={addRow} className="bg-teal-600 hover:bg-teal-700 text-white" disabled={loading}>
          <Plus className="h-4 w-4 mr-2" /> Add Row
        </Button>
      </div>

      {loading && <div className="text-sm text-gray-600">Loading reference data...</div>}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Label className="md:col-span-1 text-gray-500">Vehicle type</Label>
        <Label className="md:col-span-1 text-gray-500">Fuel type</Label>
        <Label className="md:col-span-1 text-gray-500">Model year</Label>
        <Label className="md:col-span-1 text-gray-500">Vehicle miles</Label>
        <Label className="md:col-span-1 text-gray-500">Emissions (kg CO2e)</Label>
      </div>

      <div className="space-y-3">
        {rows.map((r) => {
          const showYear = needsModelYear(r.vehicleType, r.fuelType);
          const years = showYear ? modelYearsFor(r.vehicleType, r.fuelType) : [];

          return (
            <div
              key={r.id}
              className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center p-3 rounded-lg bg-gray-50"
            >
              <Select
                value={r.vehicleType}
                onValueChange={(v) => updateRow(r.id, { vehicleType: v, fuelType: undefined, modelYear: undefined })}
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
                onValueChange={(v) => updateRow(r.id, { fuelType: v, modelYear: undefined })}
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

              {showYear ? (
                <Select
                  value={r.modelYear}
                  onValueChange={(v) => updateRow(r.id, { modelYear: v })}
                  disabled={!r.vehicleType || !r.fuelType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select model year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input readOnly value="" placeholder="N/A" />
              )}

              <Input
                type="number"
                step="any"
                min="0"
                max="999999999999.999999"
                value={r.miles ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") {
                    updateRow(r.id, { miles: undefined });
                  } else {
                    const num = Number(v);
                    if (num >= 0 && num <= 999999999999.999999) {
                      updateRow(r.id, { miles: num });
                    }
                  }
                }}
                placeholder="Enter miles"
              />

              <div className="flex items-center gap-2">
                <Input readOnly value={r.emissions != null ? r.emissions.toFixed(6) : ""} placeholder="Auto" />
                <Button variant="ghost" className="text-red-600" onClick={() => removeRow(r.id)} aria-label="Remove row">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-gray-700 font-medium">
          Total On-Road Diesel & Alt Fuel Emissions:{" "}
          <span className="font-semibold">{totalEmissions.toFixed(6)} kg CO2e</span>
        </div>
        <Button onClick={handleSaveAndNext} className="bg-teal-600 hover:bg-teal-700 text-white" disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> Save and Next
        </Button>
      </div>
    </div>
  );
};

export default OnRoadDieselAltFuelEmissions;


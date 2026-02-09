import React, { useEffect, useMemo, useState, useRef } from "react";
import { Plus, Save, Trash2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const TABLE_NAME = "scope1_epa_on_road_diesel_alt_fuel_entries";

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

type DistanceUnit = "mile" | "km";

interface EntryRow {
  id: string;
  dbId?: string;
  isExisting?: boolean;
  vehicleType?: string;
  fuelType?: string;
  modelYear?: string;
  emissionSelection?: EmissionSelection;
  distanceUnit?: DistanceUnit;
  miles?: number;
  emissions?: number; // kg CH4 or kg N2O
}

interface Props {
  onDataChange: (rows: EntryRow[]) => void;
  onSaveAndNext?: () => void;
  companyContext?: boolean;
  counterpartyId?: string;
}

type EmissionSelection = "ch4" | "n2o";
type OutputUnit = "kg" | "tonnes" | "g" | "short_ton";

const newRow = (): EntryRow =>
  ({
    id: crypto.randomUUID(),
    emissionSelection: "ch4",
    distanceUnit: "mile",
  } as EntryRow);

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

const normalizeYear = (v: any): string | undefined => {
  const s = v == null ? "" : String(v).trim();
  return s.length > 0 ? s : undefined;
};

const OnRoadDieselAltFuelEmissions: React.FC<Props> = ({ onDataChange, onSaveAndNext, companyContext = false, counterpartyId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const userId = user?.id || null;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [factors, setFactors] = useState<FactorRow[]>([]);
  const [rows, setRows] = useState<EntryRow[]>([]);
  const [existingEntries, setExistingEntries] = useState<EntryRow[]>([]);
  const [outputUnit, setOutputUnit] = useState<OutputUnit>("kg");
  const [initialOutputUnit, setInitialOutputUnit] = useState<OutputUnit>("kg");
  const hasRestoredDraftRef = useRef(false);

  const getDraftKey = () => {
    if (companyContext && counterpartyId && userId) {
      return `epaOnRoadDieselAltDraft:company:${counterpartyId}:${userId}`;
    }
    if (userId) {
      return `epaOnRoadDieselAltDraft:user:${userId}`;
    }
    return "epaOnRoadDieselAltDraft:anon";
  };

  useEffect(() => {
    const loadEntries = async () => {
      if (!userId) return;
      if (companyContext && !counterpartyId) {
        setRows([]);
        setExistingEntries([]);
        onDataChange([]);
        setIsInitialLoad(false);
        return;
      }
      try {
        let q = supabase.from(TABLE_NAME as any).select("*").eq("user_id", userId).order("created_at", { ascending: false });
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
          emissionSelection: (entry.emission_selection as EmissionSelection) ?? "ch4",
          distanceUnit: "mile",
          miles: entry.miles,
          emissions: entry.emissions,
        }));
        setExistingEntries(mapped);
        setRows(mapped.length > 0 ? mapped : []);
        if (mapped.length > 0 && (data?.[0] as any)?.emissions_output_unit) {
          const u = String((data![0] as any).emissions_output_unit) as OutputUnit;
          if (u === "kg" || u === "tonnes" || u === "g" || u === "short_ton") {
            setOutputUnit(u);
            setInitialOutputUnit(u);
          }
        }
        if (mapped.length > 0) onDataChange(mapped);
      } catch (err: any) {
        console.error("Error loading scope1_epa_on_road_diesel_alt_fuel_entries:", err);
        toast({ title: "Error", description: err?.message || "Failed to load saved entries", variant: "destructive" });
      } finally {
        setIsInitialLoad(false);
      }
    };
    loadEntries();
  }, [userId, companyContext, counterpartyId]);

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
        const raw: Array<FactorRow | null> = data.map((r: any): FactorRow | null => {
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
          });

        const mapped: FactorRow[] = raw.filter(
          (x): x is FactorRow => x !== null
        );

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

  // Restore draft after initial load
  useEffect(() => {
    if (isInitialLoad || hasRestoredDraftRef.current) return;

    try {
      const key = getDraftKey();
      const raw = sessionStorage.getItem(key);
      if (!raw) {
        hasRestoredDraftRef.current = true;
        return;
      }

      const parsed = JSON.parse(raw);
      const recentEnough =
        typeof parsed?.ts === "number" ? Date.now() - parsed.ts < 1000 * 60 * 60 * 24 : true;

      if (!recentEnough) {
        sessionStorage.removeItem(key);
        hasRestoredDraftRef.current = true;
        return;
      }

      const draftRows = Array.isArray(parsed.rows) ? parsed.rows : [];
      if (draftRows.length > 0) {
        setRows((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const mergedDraft = draftRows
            .filter((r: any) => r && r.id && !existingIds.has(r.id))
            .map((r: any) => ({
              ...r,
              isExisting: false,
            }));
          return mergedDraft.length > 0 ? [...prev, ...mergedDraft] : prev;
        });
      }
    } catch (e) {
      console.warn("Failed to restore OnRoadDieselAltFuelEmissions draft from sessionStorage:", e);
    } finally {
      hasRestoredDraftRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialLoad, companyContext, counterpartyId, userId]);

  // Persist draft rows
  useEffect(() => {
    if (isInitialLoad || !hasRestoredDraftRef.current) return;

    try {
      const key = getDraftKey();
      const draftRows = rows.filter((r) => !r.isExisting);
      if (draftRows.length === 0) {
        sessionStorage.removeItem(key);
        return;
      }

      const payload = {
        rows: draftRows,
        outputUnit,
        ts: Date.now(),
      };
      sessionStorage.setItem(key, JSON.stringify(payload));
    } catch (e) {
      console.warn("Failed to persist OnRoadDieselAltFuelEmissions draft to sessionStorage:", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, outputUnit, isInitialLoad, companyContext, counterpartyId, userId]);

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
          const unit: DistanceUnit = next.distanceUnit ?? "mile";
          const miles = unit === "mile" ? next.miles : next.miles * 0.621371; // convert km → miles
          // Output in selected gas only (kg CH4 or kg N2O); no CO2e conversion.
          const selection: EmissionSelection = next.emissionSelection ?? "ch4";
          if (selection === "ch4") {
            next.emissions = ((factorRow.ch4_g_per_mile || 0) * miles) / 1000;
          } else {
            next.emissions = ((factorRow.n2o_g_per_mile || 0) * miles) / 1000;
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

  const convertEmissionNumeric = (value: number | undefined, unit: OutputUnit): number | undefined => {
    if (value == null || !isFinite(value)) return undefined;
    let converted = value;
    switch (unit) {
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
    return Number(converted.toFixed(6));
  };

  const rowChanged = (r: EntryRow, existing: EntryRow[]): boolean => {
    const ex = existing.find((e) => e.dbId === r.dbId);
    if (!ex) return false;
    return (
      r.vehicleType !== ex.vehicleType ||
      r.fuelType !== ex.fuelType ||
      (r.modelYear ?? "") !== (ex.modelYear ?? "") ||
      (r.emissionSelection ?? "ch4") !== (ex.emissionSelection ?? "ch4") ||
      Number(r.miles) !== Number(ex.miles) ||
      Number(r.emissions) !== Number(ex.emissions)
    );
  };

  const handleSave = async () => {
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
    const unitChanged = outputUnit !== initialOutputUnit;
    if (!unitChanged && newEntries.length === 0 && changedExisting.length === 0) {
      toast({ title: "Nothing to save", description: "No new or changed on-road diesel & alt fuel entries." });
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
          emission_selection: v.emissionSelection ?? "ch4",
          miles: v.miles!,
          emissions: v.emissions!,
          emissions_output: convertEmissionNumeric(v.emissions, outputUnit),
          emissions_output_unit: outputUnit,
        }));
        const { error } = await supabase.from(TABLE_NAME as any).insert(payload);
        if (error) throw error;
      }
      const rowsToUpdate = unitChanged
        ? rows.filter((r) => r.isExisting && r.dbId && typeof r.emissions === "number")
        : changedExisting;
      if (rowsToUpdate.length > 0) {
        const results = await Promise.all(
          rowsToUpdate.map((v) =>
            supabase
              .from(TABLE_NAME as any)
              .update({
                vehicle_type: v.vehicleType!,
                fuel_type: v.fuelType!,
                model_year: v.modelYear ?? null,
                emission_selection: v.emissionSelection ?? "ch4",
                miles: v.miles!,
                emissions: v.emissions!,
                emissions_output: convertEmissionNumeric(v.emissions, outputUnit),
                emissions_output_unit: outputUnit,
              })
              .eq("id", v.dbId!)
          )
        );
        const updateError = results.find((r: { error?: unknown }) => r.error)?.error;
        if (updateError) throw updateError;
      }
      toast({
        title: "Saved",
        description:
          unitChanged && newEntries.length === 0 && changedExisting.length === 0
            ? "Updated output unit for existing on-road diesel & alt fuel entries."
            : `Saved ${newEntries.length} new and updated ${changedExisting.length} on-road diesel & alt fuel entries.`,
      });
      if (unitChanged) setInitialOutputUnit(outputUnit);
      try {
        const key = getDraftKey();
        sessionStorage.removeItem(key);
      } catch {}
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h4 className="text-lg sm:text-xl font-semibold text-gray-900">
            On-Road Diesel & Alt Fuel (Scope 1)
          </h4>
          <p className="text-xs sm:text-sm text-gray-600">
            Factors loaded from <span className="font-medium">On-Road Diesel & Alt Fuel</span>.
          </p>
        </div>
        <Button
          onClick={addRow}
          className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
          disabled={loading}
        >
          <Plus className="h-4 w-4 mr-2" /> Add Row
        </Button>
      </div>

      {loading && <div className="text-sm text-gray-600">Loading reference data...</div>}

      <div className="hidden md:grid md:grid-cols-7 gap-4 text-xs font-medium text-gray-500 tracking-wide">
        <Label className="md:col-span-1 text-gray-500">Vehicle type</Label>
        <Label className="md:col-span-1 text-gray-500">Fuel type</Label>
        <Label className="md:col-span-1 text-gray-500">Model year</Label>
        <Label className="md:col-span-1 text-gray-500">Emission type</Label>
        <Label className="md:col-span-1 text-gray-500">Distance unit</Label>
        <Label className="md:col-span-1 text-gray-500">Vehicle distance</Label>
        <Label className="md:col-span-1 text-gray-500">Emissions ({outputUnit})</Label>
      </div>

      <div className="space-y-3">
        {rows.map((r) => {
          const showYear = needsModelYear(r.vehicleType, r.fuelType);
          const years = showYear ? modelYearsFor(r.vehicleType, r.fuelType) : [];
          const unit: DistanceUnit = r.distanceUnit ?? "mile";
          const distanceDisplay =
            r.miles != null ? (unit === "mile" ? r.miles : r.miles * 1.60934) : "";

          return (
            <div
              key={r.id}
              className="grid grid-cols-1 md:grid-cols-7 gap-3 md:gap-4 items-start p-4 rounded-2xl bg-white shadow-sm border border-gray-100"
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

              <Select
                value={r.emissionSelection ?? "ch4"}
                onValueChange={(v) => updateRow(r.id, { emissionSelection: v as EmissionSelection })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ch4">CH4</SelectItem>
                  <SelectItem value="n2o">N2O</SelectItem>
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
                      const miles = unit === "mile" ? num : num * 0.621371; // km → miles
                      updateRow(r.id, { miles });
                    }
                  }
                }}
                placeholder="Enter distance"
              />

              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={convertEmission(r.emissions)}
                  placeholder="Auto"
                  className="bg-gray-50"
                />
                <Button
                  variant="ghost"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => removeRow(r.id)}
                  aria-label="Remove row"
                >
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
          <div className="flex items-center gap-2">
            <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700 text-white" disabled={saving}>
              <Save className="h-4 w-4 mr-2" /> {saving ? "Saving..." : "Save"}
            </Button>
            {onSaveAndNext && (
              <Button variant="outline" onClick={onSaveAndNext} className="border-teal-600 text-teal-600 hover:bg-teal-50">
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnRoadDieselAltFuelEmissions;


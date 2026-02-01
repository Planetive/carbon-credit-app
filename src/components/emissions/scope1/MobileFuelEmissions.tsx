import React, { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MobileFuelRow {
  id: string;
  dbId?: string;
  isExisting?: boolean;
  fuelType?: string;
  unit?: string;
  quantity?: number;
  factor?: number;
  emissions?: number;
}

interface MobileFuelEmissionsProps {
  onDataChange: (rows: MobileFuelRow[]) => void;
  onSaveAndNext?: () => void;
  companyContext?: boolean;
  counterpartyId?: string;
}

interface MobileCombustionOption {
  id: string | number;
  fuelType: string;
  unit: string;
  factor: number;
}

const newRow = (): MobileFuelRow => ({
  id: crypto.randomUUID(),
});

const tableName = "scope1_epa_mobile_fuel_entries";

const MobileFuelEmissions: React.FC<MobileFuelEmissionsProps> = ({
  onDataChange,
  onSaveAndNext,
  companyContext = false,
  counterpartyId,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [options, setOptions] = useState<MobileCombustionOption[]>([]);
  const [rows, setRows] = useState<MobileFuelRow[]>([]);
  const [existingEntries, setExistingEntries] = useState<MobileFuelRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Load existing entries from Supabase
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
        let q = supabase
          .from(tableName as any)
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (companyContext && counterpartyId) {
          q = q.eq("counterparty_id", counterpartyId);
        } else {
          q = q.is("counterparty_id", null);
        }
        const { data, error } = await q;
        if (error) throw error;
        const mapped: MobileFuelRow[] = (data || []).map((entry: any) => ({
          id: crypto.randomUUID(),
          dbId: entry.id,
          isExisting: true,
          fuelType: entry.fuel_type,
          unit: entry.unit,
          quantity: entry.quantity,
          factor: entry.factor,
          emissions: entry.emissions,
        }));
        setExistingEntries(mapped);
        setRows(mapped.length > 0 ? mapped : []);
        if (mapped.length > 0) onDataChange(mapped);
      } catch (err: any) {
        console.error("Error loading scope1_epa_mobile_fuel_entries:", err);
        toast({ title: "Error", description: err?.message || "Failed to load saved entries", variant: "destructive" });
      } finally {
        setIsInitialLoad(false);
      }
    };
    loadEntries();
  }, [user, companyContext, counterpartyId]);

  // Load reference data from "Mobile Combustion" table
  useEffect(() => {
    const loadMobileCombustion = async () => {
      setLoading(true);
      try {
        let result = await supabase.from("Mobile Combustion" as any).select("*");

        if (result.error) {
          // Try a few common variants if the first name fails
          result = await supabase.from("mobile_combustion" as any).select("*");
        }

        if (result.error) {
          console.error("Error loading Mobile Combustion data:", result.error);
          toast({
            title: "Error",
            description:
              result.error.message || "Failed to load Mobile Combustion reference data.",
            variant: "destructive",
          });
          return;
        }

        const data = result.data || [];
        const mapped: MobileCombustionOption[] = data
          .map((row: any) => {
            const fuelType =
              row["Fuel Type"] ||
              row["FuelType"] ||
              row.fuel_type ||
              row["fuel_type"] ||
              row.fuelType ||
              row["fuelType"];
            const kgCo2PerUnit =
              row["kg CO2 per unit"] ||
              row["kg co2 per unit"] ||
              row.kg_co2_per_unit ||
              row["kg_co2_per_unit"] ||
              row.kgCo2PerUnit;
            const unit =
              row["Unit"] || row.unit || row["unit"] || row.Unit || "unit";

            const factor =
              typeof kgCo2PerUnit === "number"
                ? kgCo2PerUnit
                : kgCo2PerUnit != null
                  ? parseFloat(String(kgCo2PerUnit))
                  : NaN;

            if (!fuelType || !isFinite(factor)) {
              return null;
            }

            return {
              id: row.id || row.ID || row.Id,
              fuelType: String(fuelType),
              unit: String(unit),
              factor: factor,
            };
          })
          .filter((opt): opt is MobileCombustionOption => !!opt);

        setOptions(mapped);

        if (mapped.length === 0) {
          toast({
            title: "No mobile combustion data",
            description:
              'The "Mobile Combustion" table has no usable rows. Please add at least one row in Supabase.',
          });
        }
      } catch (error: any) {
        console.error("Unexpected error loading Mobile Combustion:", error);
        toast({
          title: "Error",
          description:
            error?.message || "Unexpected error loading Mobile Combustion data.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadMobileCombustion();
  }, [toast]);

  useEffect(() => {
    if (!isInitialLoad) onDataChange(rows);
  }, [rows, isInitialLoad, onDataChange]);

  const addRow = () => setRows((prev) => [...prev, newRow()]);

  const removeRow = async (id: string) => {
    const row = rows.find((r) => r.id === id);
    if (row?.dbId && user) {
      try {
        const { error } = await supabase.from(tableName as any).delete().eq("id", row.dbId);
        if (error) throw error;
      } catch (e: any) {
        toast({ title: "Error", description: e?.message || "Failed to delete entry", variant: "destructive" });
        return;
      }
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRow = (id: string, patch: Partial<MobileFuelRow>) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next: MobileFuelRow = { ...r, ...patch };

        // If fuel type changed, refresh unit/factor from options
        if (patch.fuelType) {
          const opt = options.find((o) => o.fuelType === patch.fuelType);
          if (opt) {
            next.unit = opt.unit;
            next.factor = opt.factor;
          }
        }

        if (typeof next.quantity === "number" && typeof next.factor === "number") {
          next.emissions = Number((next.quantity * next.factor).toFixed(6));
        } else {
          next.emissions = undefined;
        }

        return next;
      }),
    );
  };

  const totalEmissions = rows.reduce((sum, r) => sum + (r.emissions || 0), 0);

  const rowChanged = (r: MobileFuelRow, existing: MobileFuelRow[]): boolean => {
    const ex = existing.find((e) => e.dbId === r.dbId);
    if (!ex) return false;
    return (
      r.fuelType !== ex.fuelType ||
      r.unit !== ex.unit ||
      Number(r.quantity) !== Number(ex.quantity) ||
      Number(r.factor) !== Number(ex.factor) ||
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
        r.fuelType &&
        r.unit != null &&
        typeof r.quantity === "number" &&
        typeof r.factor === "number" &&
        typeof r.emissions === "number" &&
        !r.isExisting
    );
    const changedExisting = rows.filter((r) => r.isExisting && r.dbId && rowChanged(r, existingEntries));
    if (newEntries.length === 0 && changedExisting.length === 0) {
      toast({ title: "Nothing to save", description: "No new or changed mobile fuel entries." });
      onSaveAndNext?.();
      return;
    }
    setSaving(true);
    try {
      if (newEntries.length > 0) {
        const payload = newEntries.map((v) => ({
          user_id: user.id,
          counterparty_id: companyContext ? counterpartyId ?? null : null,
          fuel_type: v.fuelType!,
          unit: v.unit!,
          quantity: v.quantity!,
          factor: v.factor!,
          emissions: v.emissions!,
        }));
        const { error } = await supabase.from(tableName as any).insert(payload);
        if (error) throw error;
      }
      if (changedExisting.length > 0) {
        const results = await Promise.all(
          changedExisting.map((v) =>
            supabase
              .from(tableName as any)
              .update({
                fuel_type: v.fuelType!,
                unit: v.unit!,
                quantity: v.quantity!,
                factor: v.factor!,
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
        description: `Saved ${newEntries.length} new and updated ${changedExisting.length} mobile fuel entries.`,
      });
      onSaveAndNext?.();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const uniqueFuelTypes = Array.from(
    new Set(options.map((o) => o.fuelType)),
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">
            Mobile Fuel (Scope 1 - EPA)
          </h4>
          <p className="text-sm text-gray-600">
            Use mobile combustion emission factors from the{" "}
            <span className="font-medium">Mobile Combustion</span> reference table.
          </p>
        </div>
        <Button
          onClick={addRow}
          className="bg-teal-600 hover:bg-teal-700 text-white"
          disabled={loading}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Mobile Fuel Row
        </Button>
      </div>

      {loading && (
        <p className="text-sm text-gray-500">
          Loading Mobile Combustion reference data...
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Label className="md:col-span-1 text-gray-500">Fuel type</Label>
        <Label className="md:col-span-1 text-gray-500">Unit</Label>
        <Label className="md:col-span-1 text-gray-500">Quantity</Label>
        <Label className="md:col-span-1 text-gray-500">Emissions</Label>
      </div>

      <div className="space-y-3">
        {rows.map((r) => {
          const currentOption =
            r.fuelType && options.find((o) => o.fuelType === r.fuelType);

          return (
            <div
              key={r.id}
              className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-3 rounded-lg bg-gray-50"
            >
              <Select
                value={r.fuelType}
                onValueChange={(v) => updateRow(r.id, { fuelType: v })}
                disabled={options.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fuel type" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueFuelTypes.map((ft) => (
                    <SelectItem key={ft} value={ft}>
                      {ft}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                value={currentOption?.unit || r.unit || ""}
                readOnly
                placeholder="Unit"
              />

              <Input
                type="number"
                step="any"
                min="0"
                max="999999999999.999999"
                value={r.quantity ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "") {
                    updateRow(r.id, { quantity: undefined });
                  } else {
                    const numValue = Number(value);
                    if (numValue >= 0 && numValue <= 999999999999.999999) {
                      updateRow(r.id, { quantity: numValue });
                    }
                  }
                }}
                placeholder="Enter quantity"
              />

              <div className="flex items-center gap-2">
                <Input
                  value={r.emissions ?? ""}
                  readOnly
                  placeholder="Auto"
                />
                <Button
                  variant="ghost"
                  className="text-red-600"
                  onClick={() => removeRow(r.id)}
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
          Total Mobile Fuel Emissions:{" "}
          <span className="font-semibold">
            {totalEmissions.toFixed(6)} kg CO2e
          </span>
        </div>
        <Button
          onClick={handleSaveAndNext}
          className="bg-teal-600 hover:bg-teal-700 text-white"
          disabled={saving}
        >
          <Save className="h-4 w-4 mr-2" />
          Save and Next
        </Button>
      </div>
    </div>
  );
};

export default MobileFuelEmissions;


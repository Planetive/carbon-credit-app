import { useEffect, useMemo, useState } from "react";
import { Plus, Save, Trash2, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  calculateEpaRefrigerantEmissions,
  EPA_EQUIPMENT_LEAKAGE_ASSUMPTIONS,
  EPA_REFRIGERANT_GWP,
  EPA_REFRIGERANT_TYPE_OPTIONS,
  formatEpaRefrigerantLabel,
  resolveRefrigerantGwp,
  type EpaRefrigerantCalculationMethod,
  type EpaRefrigerantEquipmentType,
} from "@/features/emission-calculator/scope1/constants/epaRefrigerantGwp";

export interface EpaRefrigerantRow {
  id: string;
  dbId?: string;
  isExisting?: boolean;
  method: EpaRefrigerantCalculationMethod;
  refrigerantType: string;
  customGwp?: number;
  leakageKg?: number;
  chargeKg?: number;
  leakageRatePercent?: number;
  equipmentType?: EpaRefrigerantEquipmentType;
  gwp?: number;
  emissionsKg?: number;
  emissionsTonnes?: number;
}

interface EpaRefrigerantEmissionsProps {
  onDataChange: (rows: Array<{ emissions?: number }>) => void;
  onSaveAndNext?: () => void;
}

const newRow = (): EpaRefrigerantRow => ({
  id: crypto.randomUUID(),
  method: "leakage_record",
  refrigerantType: "R-410A",
});

const mapDbRow = (entry: any): EpaRefrigerantRow => ({
  id: crypto.randomUUID(),
  dbId: String(entry.id),
  isExisting: true,
  method: (entry.calculation_method as EpaRefrigerantCalculationMethod) || "leakage_record",
  refrigerantType: entry.refrigerant_type || "",
  customGwp: undefined,
  leakageKg:
    entry.leakage_kg != null
      ? Number(entry.leakage_kg)
      : entry.calculation_method === "leakage_record"
        ? Number(entry.quantity)
        : undefined,
  chargeKg: entry.charge_kg != null ? Number(entry.charge_kg) : undefined,
  leakageRatePercent:
    entry.leakage_rate_percent != null ? Number(entry.leakage_rate_percent) : undefined,
  equipmentType: entry.equipment_type || undefined,
  gwp: entry.gwp != null ? Number(entry.gwp) : Number(entry.emission_factor),
  emissionsKg: Number(entry.emissions),
  emissionsTonnes: Number(entry.emissions) / 1000,
});

const computeRow = (row: EpaRefrigerantRow): EpaRefrigerantRow => {
  const gwp = resolveRefrigerantGwp(row.refrigerantType, row.customGwp);
  if (gwp == null) return { ...row, gwp: undefined, emissionsKg: undefined, emissionsTonnes: undefined };

  const result = calculateEpaRefrigerantEmissions({
    method: row.method,
    gwp,
    leakageKg: row.leakageKg,
    chargeKg: row.chargeKg,
    leakageRatePercent: row.leakageRatePercent,
  });

  if (!result) return { ...row, gwp, emissionsKg: undefined, emissionsTonnes: undefined };

  return {
    ...row,
    gwp,
    leakageKg: result.leakageKg,
    emissionsKg: result.emissionsKg,
    emissionsTonnes: result.emissionsTonnes,
  };
};

const EpaRefrigerantEmissions: React.FC<EpaRefrigerantEmissionsProps> = ({
  onDataChange,
  onSaveAndNext,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<EpaRefrigerantRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await (supabase as any)
          .from("scope1_refrigerant_entries")
          .select("*")
          .eq("user_id", user.id)
          .eq("emission_framework", "epa")
          .order("created_at", { ascending: false });

        if (error) throw error;
        const mapped = (data || []).map(mapDbRow);
        setRows(mapped);
        onDataChange(mapped.map((r) => ({ emissions: r.emissionsKg })));
      } catch (e: any) {
        console.error(e);
        toast({
          title: "Error",
          description: e?.message || "Failed to load refrigerant entries",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onDataChange is stable from parent
  }, [user?.id, toast]);

  const updateRow = (id: string, patch: Partial<EpaRefrigerantRow>) => {
    setRows((prev) => {
      const next = prev.map((r) => (r.id === id ? computeRow({ ...r, ...patch }) : r));
      onDataChange(next.map((r) => ({ emissions: r.emissionsKg })));
      return next;
    });
  };

  const addRow = () => setRows((prev) => [...prev, computeRow(newRow())]);

  const removeRow = (id: string) => {
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      onDataChange(next.map((r) => ({ emissions: r.emissionsKg })));
      return next;
    });
  };

  const deleteExistingRow = async (id: string) => {
    const row = rows.find((r) => r.id === id);
    if (!row?.dbId) return;
    if (!confirm("Delete this refrigerant entry?")) return;

    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      const { data: deleted, error } = await (supabase as any)
        .from("scope1_refrigerant_entries")
        .delete()
        .eq("id", row.dbId)
        .eq("user_id", user!.id)
        .select("id");
      if (error) throw error;
      if (!deleted?.length) throw new Error("Entry was not removed from the database.");

      removeRow(id);
      toast({ title: "Deleted", description: "Refrigerant entry removed." });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to delete entry", variant: "destructive" });
    } finally {
      setDeletingIds((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    }
  };

  const pendingNew = rows.filter((r) => !r.isExisting && r.emissionsKg != null);

  const saveEntries = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please log in to save.", variant: "destructive" });
      return;
    }

    const toSave = rows.filter((r) => !r.isExisting && r.emissionsKg != null && r.gwp != null && r.refrigerantType);
    if (toSave.length === 0) {
      toast({ title: "Nothing to save", description: "Add a complete refrigerant entry first." });
      return;
    }

    setSaving(true);
    try {
      const payload = toSave.map((r) => ({
        user_id: user.id,
        emission_framework: "epa",
        refrigerant_type: r.refrigerantType,
        emission_factor: r.gwp!,
        quantity: r.leakageKg!,
        emissions: r.emissionsKg!,
        calculation_method: r.method,
        charge_kg: r.method === "estimated_leakage" ? r.chargeKg ?? null : null,
        leakage_rate_percent: r.method === "estimated_leakage" ? r.leakageRatePercent ?? null : null,
        leakage_kg: r.leakageKg ?? null,
        gwp: r.gwp ?? null,
        equipment_type: r.equipmentType ?? null,
      }));

      const { error } = await (supabase as any).from("scope1_refrigerant_entries").insert(payload);
      if (error) throw error;

      const { data: reloaded } = await (supabase as any)
        .from("scope1_refrigerant_entries")
        .select("*")
        .eq("user_id", user.id)
        .eq("emission_framework", "epa")
        .order("created_at", { ascending: false });

      const mapped = (reloaded || []).map(mapDbRow);
      setRows(mapped);
      onDataChange(mapped.map((r) => ({ emissions: r.emissionsKg })));
      toast({ title: "Saved", description: `Saved ${toSave.length} refrigerant entr${toSave.length === 1 ? "y" : "ies"}.` });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const totalKg = useMemo(
    () => rows.reduce((sum, r) => sum + (r.emissionsKg || 0), 0),
    [rows]
  );

  if (loading) {
    return <div className="text-sm text-gray-600">Loading refrigerant entries…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">Refrigerant</h4>
          <p className="text-sm text-gray-600 mt-1">
            Enter leaked refrigerant gas and the calculator will estimate emissions automatically.
          </p>
        </div>
        <Button onClick={addRow} className="bg-teal-600 hover:bg-teal-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add entry
        </Button>
      </div>

      <Card className="border-amber-100 bg-amber-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-900">
            <Info className="h-4 w-4" />
            Typical annual leakage rate assumptions
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-amber-200/80">
                  <th className="py-2 pr-4 font-medium text-amber-950">Equipment type</th>
                  <th className="py-2 font-medium text-amber-950">Typical annual leakage rate</th>
                </tr>
              </thead>
              <tbody>
                {EPA_EQUIPMENT_LEAKAGE_ASSUMPTIONS.map((row) => (
                  <tr key={row.id} className="border-b border-amber-100 last:border-0">
                    <td className="py-2 pr-4 text-amber-900">{row.label}</td>
                    <td className="py-2 text-amber-800">{row.rateRange}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">No refrigerant entries yet. Click Add entry to begin.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const gwp = row.gwp ?? resolveRefrigerantGwp(row.refrigerantType, row.customGwp);
            const isDeleting = deletingIds.has(row.id);

            return (
              <Card key={row.id} className="border-gray-200">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <RadioGroup
                      value={row.method}
                      onValueChange={(v) =>
                        updateRow(row.id, {
                          method: v as EpaRefrigerantCalculationMethod,
                          leakageKg: undefined,
                          chargeKg: undefined,
                          leakageRatePercent: undefined,
                        })
                      }
                      className="flex flex-col sm:flex-row gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="leakage_record" id={`${row.id}-leakage-record`} />
                        <Label htmlFor={`${row.id}-leakage-record`} className="font-normal cursor-pointer">
                          I know how much gas leaked
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="estimated_leakage" id={`${row.id}-estimated`} />
                        <Label htmlFor={`${row.id}-estimated`} className="font-normal cursor-pointer">
                          I do not have leakage records (estimate leakage)
                        </Label>
                      </div>
                    </RadioGroup>
                    {row.isExisting ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 shrink-0"
                        disabled={isDeleting}
                        onClick={() => deleteExistingRow(row.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 shrink-0"
                        onClick={() => removeRow(row.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-gray-600">Refrigerant gas type</Label>
                      <Select
                        value={row.refrigerantType}
                        onValueChange={(v) => updateRow(row.id, { refrigerantType: v, customGwp: undefined })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose refrigerant gas" />
                        </SelectTrigger>
                        <SelectContent>
                          {EPA_REFRIGERANT_TYPE_OPTIONS.map((t) => (
                            <SelectItem key={t} value={t}>
                              {formatEpaRefrigerantLabel(t)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-gray-600">GWP value (optional)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        placeholder={gwp != null ? String(gwp) : "Auto-filled from refrigerant type"}
                        value={row.customGwp ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          updateRow(row.id, {
                            customGwp: raw === "" ? undefined : Number(raw),
                          });
                        }}
                      />
                    </div>

                    {row.method === "leakage_record" ? (
                      <div>
                        <Label className="text-gray-600">Leaked gas amount (kg)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          value={row.leakageKg ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            updateRow(row.id, { leakageKg: raw === "" ? undefined : Number(raw) });
                          }}
                          placeholder="e.g. 5"
                        />
                      </div>
                    ) : (
                      <>
                        <div>
                          <Label className="text-gray-600">Equipment type (optional guidance)</Label>
                          <Select
                            value={row.equipmentType ?? ""}
                            onValueChange={(v) => {
                              const equipment = EPA_EQUIPMENT_LEAKAGE_ASSUMPTIONS.find((e) => e.id === v);
                              updateRow(row.id, {
                                equipmentType: v as EpaRefrigerantEquipmentType,
                                leakageRatePercent: equipment?.suggestedRatePercent,
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choose equipment type" />
                            </SelectTrigger>
                            <SelectContent>
                              {EPA_EQUIPMENT_LEAKAGE_ASSUMPTIONS.map((e) => (
                                <SelectItem key={e.id} value={e.id}>
                                  {e.label} ({e.rateRange})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-gray-600">Total refrigerant charge in equipment (kg)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            value={row.chargeKg ?? ""}
                            onChange={(e) => {
                              const raw = e.target.value;
                              updateRow(row.id, { chargeKg: raw === "" ? undefined : Number(raw) });
                            }}
                            placeholder="e.g. 20"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-600">Expected annual leakage rate (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            value={row.leakageRatePercent ?? ""}
                            onChange={(e) => {
                              const raw = e.target.value;
                              updateRow(row.id, {
                                leakageRatePercent: raw === "" ? undefined : Number(raw),
                              });
                            }}
                            placeholder="e.g. 10"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {gwp != null && row.leakageKg != null && row.emissionsKg != null && (
                    <div className="rounded-lg border border-teal-200 bg-teal-50/60 px-4 py-3 text-sm text-teal-900 space-y-1">
                      <p className="font-medium">How this was calculated</p>
                      {row.method === "estimated_leakage" && row.chargeKg != null && row.leakageRatePercent != null && (
                        <p>
                          Estimated leakage: {row.chargeKg} × {row.leakageRatePercent}% = {row.leakageKg} kg
                        </p>
                      )}
                      <p>
                        {row.leakageKg} × {gwp.toLocaleString()} = {row.emissionsKg.toLocaleString()} kg CO₂e
                      </p>
                      <p>
                        {row.emissionsKg.toLocaleString()} / 1000 = {row.emissionsTonnes?.toFixed(3)} tCO₂e
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t">
        <div className="text-gray-700 font-medium">
          Total refrigerant emissions:{" "}
          <span className="font-semibold">
            {totalKg.toLocaleString(undefined, { maximumFractionDigits: 3 })} kg CO₂e
            {totalKg > 0 && ` (${(totalKg / 1000).toFixed(3)} tCO₂e)`}
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={saveEntries}
            disabled={saving || pendingNew.length === 0}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving…" : `Save (${pendingNew.length})`}
          </Button>
          {onSaveAndNext && (
            <Button variant="outline" onClick={onSaveAndNext} className="border-teal-600 text-teal-600">
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EpaRefrigerantEmissions;

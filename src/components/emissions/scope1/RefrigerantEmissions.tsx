import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { Plus, Trash2, Save, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RefrigerantRow, UkRefrigerantBasis } from "../shared/types";
import { newRefrigerantRow, refrigerantRowChanged } from "../shared/utils";

interface RefrigerantEmissionsProps {
  onDataChange: (data: RefrigerantRow[]) => void;
  companyContext?: boolean;
  onSaveAndNext?: () => void;
}

type UkRefrigCell = { kyoto?: number; nonKyoto?: number; total?: number };
type UkRefrigMap = Record<string, Record<string, Record<string, UkRefrigCell>>>;

const UK_REFRIG_BASIS_ORDER: UkRefrigerantBasis[] = ["kyoto", "non_kyoto", "total"];

const UK_REFRIG_BASIS_LABEL: Record<UkRefrigerantBasis, string> = {
  kyoto: "Emissions including only Kyoto products",
  non_kyoto: "Emissions including only non-Kyoto products",
  total: "Total emissions including non-Kyoto products",
};

function parseNumber(value: any): number | undefined {
  if (typeof value === "number") return isFinite(value) ? value : undefined;
  if (value == null) return undefined;
  const cleaned = String(value).replace(/,/g, "");
  const n = parseFloat(cleaned);
  return isFinite(n) ? n : undefined;
}

function ukRefrigBasisValue(cell: UkRefrigCell | undefined, basis: UkRefrigerantBasis): number | undefined {
  if (!cell) return undefined;
  const v = basis === "kyoto" ? cell.kyoto : basis === "non_kyoto" ? cell.nonKyoto : cell.total;
  return typeof v === "number" && isFinite(v) ? v : undefined;
}

function availableUkRefrigBasises(cell: UkRefrigCell | undefined): UkRefrigerantBasis[] {
  if (!cell) return [];
  return UK_REFRIG_BASIS_ORDER.filter((b) => ukRefrigBasisValue(cell, b) !== undefined);
}

function ukRefrigerantBasisFromDb(raw: unknown): UkRefrigerantBasis | undefined {
  if (raw === "kyoto" || raw === "non_kyoto" || raw === "total") return raw;
  return undefined;
}

const RefrigerantEmissions: React.FC<RefrigerantEmissionsProps> = ({
  onDataChange,
  companyContext = false,
  onSaveAndNext,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const userId = user?.id || null;
  const [rows, setRows] = useState<RefrigerantRow[]>([]);
  const [existingEntries, setExistingEntries] = useState<RefrigerantRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingRows, setDeletingRows] = useState<Set<string>>(new Set());
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [ukFactorsMap, setUkFactorsMap] = useState<UkRefrigMap>({});
  const [ukReferenceReady, setUkReferenceReady] = useState(false);
  const hasRestoredDraftRef = useRef(false);

  const isUkActive = Object.keys(ukFactorsMap).length > 0;
  /** After the UK_refrigerant_factors fetch finishes (success or empty). */
  const ukInputsLocked = !ukReferenceReady;

  const getDraftKey = () => {
    if (userId) return `refrigerantDraft:uk:user:${userId}`;
    return `refrigerantDraft:uk:anon`;
  };

  const activities = useMemo(() => {
    if (isUkActive) return Object.keys(ukFactorsMap).sort((a, b) => a.localeCompare(b));
    return [];
  }, [isUkActive, ukFactorsMap]);

  const emissionsFor = (activity?: string) => {
    if (!activity || !isUkActive) return [];
    return Object.keys(ukFactorsMap[activity] || {}).sort((a, b) => a.localeCompare(b));
  };

  const unitsFor = (activity?: string, emission?: string) => {
    if (!activity || !emission || !isUkActive) return [];
    return Object.keys(ukFactorsMap[activity]?.[emission] || {}).sort((a, b) => a.localeCompare(b));
  };

  const ukRowIdentityKey = useMemo(
    () =>
      rows
        .map(
          (r) =>
            `${r.id}|${r.activity ?? ""}|${r.refrigerantType ?? ""}|${r.quantityUnit ?? ""}|${r.ukRefrigerantBasis ?? ""}`
        )
        .join(";"),
    [rows]
  );

  useLayoutEffect(() => {
    if (!isUkActive) return;
    setRows((prev) => {
      let changed = false;
      const next = prev.map((r) => {
        if (!r.activity || !r.refrigerantType || !r.quantityUnit) return r;
        const cell = ukFactorsMap[r.activity]?.[r.refrigerantType]?.[r.quantityUnit];
        if (!cell) return r;
        const avail = availableUkRefrigBasises(cell);
        if (avail.length === 0) return r;
        const preferred = r.ukRefrigerantBasis || "total";
        const basis = avail.includes(preferred) ? preferred : avail[0];
        if (basis !== (r.ukRefrigerantBasis || "total")) {
          changed = true;
          const factor = ukRefrigBasisValue(cell, basis);
          const emissions =
            typeof r.quantity === "number" && factor !== undefined
              ? Number((r.quantity * factor).toFixed(6))
              : undefined;
          return { ...r, ukRefrigerantBasis: basis, factor, emissions };
        }
        return r;
      });
      return changed ? next : prev;
    });
  }, [isUkActive, ukFactorsMap, ukRowIdentityKey]);

  useEffect(() => {
    setUkReferenceReady(false);
    const loadUk = async () => {
      try {
        let data: any[] | null = null;
        let error: any = null;
        const primary = await (supabase as any).from("UK_refrigerant_factors").select("*");
        if (!primary.error && primary.data?.length) {
          data = primary.data;
        } else {
          const fallback = await (supabase as any).from("uk_refrigerant_factors").select("*");
          if (!fallback.error && fallback.data?.length) {
            data = fallback.data;
          } else {
            error = primary.error || fallback.error;
          }
        }
        if (error) {
          console.error("UK_refrigerant_factors:", error);
          toast({
            title: "UK refrigerant factors",
            description: error.message || "Could not load UK_refrigerant_factors.",
            variant: "destructive",
          });
          setUkFactorsMap({});
          return;
        }
        const tableRows = data ?? [];
        if (tableRows.length === 0) {
          console.warn("UK_refrigerant_factors returned no rows");
          setUkFactorsMap({});
          return;
        }

        const map: UkRefrigMap = {};
        for (const row of tableRows as any[]) {
          const activity = String(row.Activity ?? row.activity ?? "").trim();
          const emission = String(row.Emission ?? row.emission ?? "").trim();
          const unit = String(row.Unit ?? row.unit ?? "").trim();
          if (!activity || !emission || !unit) continue;

          const kyoto = parseNumber(row["kg CO2e"] ?? row.kg_co2e ?? row["Kg CO2e"]);
          const nonKyoto = parseNumber(row["kg CO2e_1"] ?? row.kg_co2e_1 ?? row["kg CO2e_1"]);
          const total = parseNumber(row["kg CO2e_2"] ?? row.kg_co2e_2 ?? row["kg CO2e_2"]);

          if (!map[activity]) map[activity] = {};
          if (!map[activity][emission]) map[activity][emission] = {};
          const prev = map[activity][emission][unit] || {};
          map[activity][emission][unit] = {
            ...prev,
            ...(kyoto !== undefined ? { kyoto } : {}),
            ...(nonKyoto !== undefined ? { nonKyoto } : {}),
            ...(total !== undefined ? { total } : {}),
          };
        }

        if (Object.keys(map).length === 0) {
          setUkFactorsMap({});
          return;
        }
        setUkFactorsMap(map);
      } catch (err) {
        console.error("UK_refrigerant_factors load error:", err);
        setUkFactorsMap({});
      } finally {
        setUkReferenceReady(true);
      }
    };
    void loadUk();
  }, [toast]);

  useEffect(() => {
    const loadExistingEntries = async () => {
      if (!userId) return;

      if (companyContext) {
        setRows([]);
        setExistingEntries([]);
        onDataChange([]);
        setIsInitialLoad(false);
        return;
      }

      try {
        const { data: refrigerantData, error: refrigerantError } = await supabase
          .from("scope1_refrigerant_entries")
          .select("*")
          .eq("user_id", userId)
          .eq("emission_framework", "uk")
          .order("created_at", { ascending: false });

        if (refrigerantError) throw refrigerantError;

        const existingRefrigerantRows = (refrigerantData || []).map((entry: any) => ({
          id: crypto.randomUUID(),
          dbId: entry.id,
          activity: entry.activity ?? undefined,
          quantityUnit: entry.quantity_unit ?? undefined,
          ukRefrigerantBasis: ukRefrigerantBasisFromDb(entry.uk_refrigerant_basis),
          refrigerantType: entry.refrigerant_type,
          quantity: entry.quantity,
          factor: entry.emission_factor,
          emissions: entry.emissions,
          isExisting: true,
        }));

        setExistingEntries(existingRefrigerantRows);
        setRows(existingRefrigerantRows.length > 0 ? existingRefrigerantRows : []);
        setIsInitialLoad(false);
      } catch (error: any) {
        console.error("Error loading existing entries:", error);
        toast({
          title: "Error",
          description: "Failed to load existing entries",
          variant: "destructive",
        });
      }
    };

    loadExistingEntries();
  }, [userId, toast, companyContext]);

  useEffect(() => {
    if (!isInitialLoad) {
      onDataChange(rows);
    }
  }, [rows, isInitialLoad, onDataChange]);

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
      console.warn("Failed to restore RefrigerantEmissions draft from sessionStorage:", e);
    } finally {
      hasRestoredDraftRef.current = true;
    }
  }, [isInitialLoad, userId]);

  useEffect(() => {
    if (isInitialLoad || !hasRestoredDraftRef.current) return;

    try {
      const key = getDraftKey();
      const draftRows = rows.filter((r) => !r.isExisting);
      if (draftRows.length === 0) {
        sessionStorage.removeItem(key);
        return;
      }

      sessionStorage.setItem(
        key,
        JSON.stringify({
          rows: draftRows,
          ts: Date.now(),
        })
      );
    } catch (e) {
      console.warn("Failed to persist RefrigerantEmissions draft to sessionStorage:", e);
    }
  }, [rows, isInitialLoad, userId]);

  const addRow = () => setRows((prev) => [...prev, newRefrigerantRow()]);
  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  const updateRow = (id: string, patch: Partial<RefrigerantRow>) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next: RefrigerantRow = { ...r, ...patch };
        let factor: number | undefined;

        if (isUkActive && next.activity && next.refrigerantType && next.quantityUnit) {
          const cell = ukFactorsMap[next.activity]?.[next.refrigerantType]?.[next.quantityUnit];
          if (cell) {
            const avail = availableUkRefrigBasises(cell);
            let basis: UkRefrigerantBasis = next.ukRefrigerantBasis || "total";
            if (avail.length > 0 && !avail.includes(basis)) {
              basis = avail[0];
              next.ukRefrigerantBasis = basis;
            }
            factor = ukRefrigBasisValue(cell, basis);
          }
        } else {
          factor = undefined;
        }

        next.factor = factor;
        if (typeof next.quantity === "number" && typeof next.factor === "number") {
          next.emissions = Number((next.quantity * next.factor).toFixed(6));
        } else {
          next.emissions = undefined;
        }
        return next;
      })
    );
  };

  const deleteExistingRow = async (id: string) => {
    const row = rows.find((r) => r.id === id);
    if (!row || !row.dbId) return;

    if (!confirm("Are you sure you want to delete this entry? This action cannot be undone.")) {
      return;
    }

    setDeletingRows((prev) => new Set(prev).add(id));
    try {
      const { error } = await supabase.from("scope1_refrigerant_entries").delete().eq("id", row.dbId);

      if (error) throw error;

      toast({ title: "Deleted", description: "Entry deleted successfully." });

      setRows((prev) => prev.filter((r) => r.id !== id));
      setExistingEntries((prev) => prev.filter((r) => r.id !== id));
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete entry", variant: "destructive" });
    } finally {
      setDeletingRows((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const mapEntryFromDb = (entry: any): RefrigerantRow => ({
    id: crypto.randomUUID(),
    dbId: String(entry.id),
    activity: entry.activity ?? undefined,
    quantityUnit: entry.quantity_unit ?? undefined,
    ukRefrigerantBasis: ukRefrigerantBasisFromDb(entry.uk_refrigerant_basis),
    refrigerantType: entry.refrigerant_type,
    quantity: entry.quantity,
    factor: entry.emission_factor,
    emissions: entry.emissions,
    isExisting: true,
  });

  const saveRefrigerantEntries = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please log in to save.", variant: "destructive" });
      return;
    }

    const newEntries = rows.filter((r) => {
      if (!r.refrigerantType || typeof r.quantity !== "number" || typeof r.factor !== "number" || r.isExisting) {
        return false;
      }
      return !!(r.activity && r.quantityUnit);
    });

    const changedExisting = rows.filter((r) => r.isExisting && r.dbId && refrigerantRowChanged(r, existingEntries));

    if (newEntries.length === 0 && changedExisting.length === 0) {
      toast({ title: "Nothing to save", description: "No new or changed refrigerant entries." });
      return;
    }

    setSaving(true);
    try {
      const payload = newEntries.map((v) => ({
        user_id: user.id,
        emission_framework: "uk",
        refrigerant_type: v.refrigerantType!,
        quantity: v.quantity!,
        emission_factor: v.factor!,
        emissions: v.emissions!,
        activity: v.activity!,
        quantity_unit: v.quantityUnit!,
        uk_refrigerant_basis: v.ukRefrigerantBasis || "total",
      }));

      if (payload.length > 0) {
        const { error } = await (supabase as any).from("scope1_refrigerant_entries").insert(payload);
        if (error) throw error;
      }

      if (changedExisting.length > 0) {
        const updates = changedExisting.map((v) =>
          (supabase as any)
            .from("scope1_refrigerant_entries")
            .update({
              emission_framework: "uk",
              refrigerant_type: v.refrigerantType!,
              quantity: v.quantity!,
              emission_factor: v.factor!,
              emissions: v.emissions!,
              activity: v.activity!,
              quantity_unit: v.quantityUnit!,
              uk_refrigerant_basis: v.ukRefrigerantBasis || "total",
            })
            .eq("id", v.dbId!)
        );
        const results = await Promise.all(updates);
        const updateError = results.find((r) => (r as any).error)?.error;
        if (updateError) throw updateError;
      }

      toast({
        title: "Saved",
        description: `Saved ${newEntries.length} new and updated ${changedExisting.length} entries.`,
      });

      try {
        sessionStorage.removeItem(getDraftKey());
      } catch {}

      const { data: newData } = await supabase
        .from("scope1_refrigerant_entries")
        .select("*")
        .eq("user_id", user.id)
        .eq("emission_framework", "uk")
        .order("created_at", { ascending: false });

      if (newData) {
        const updatedExistingRows = newData.map(mapEntryFromDb);
        setExistingEntries(updatedExistingRows);
        setRows(updatedExistingRows);
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const totalEmissions = rows.reduce((sum, r) => sum + (r.emissions || 0), 0);
  const gridColsUk = "md:grid-cols-6";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">Refrigerant Entries</h4>
          {ukInputsLocked && <p className="text-sm text-teal-700 mt-1">Loading UK refrigerant factors…</p>}
          {ukReferenceReady && !isUkActive && (
            <p className="text-sm text-amber-700 mt-2">
              No rows found in UK_refrigerant_factors (or columns did not match). Check the table, RLS, and column
              names: Activity, Emission, Unit, kg CO2e, kg CO2e_1, kg CO2e_2.
            </p>
          )}
        </div>
        <Button
          onClick={addRow}
          className="bg-teal-600 hover:bg-teal-700 text-white"
          disabled={ukInputsLocked || (ukReferenceReady && !isUkActive)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Entry
        </Button>
      </div>

      <div className={`grid grid-cols-1 ${gridColsUk} gap-4`}>
        <Label className="text-gray-500">Activity</Label>
        <Label className="text-gray-500">Emission</Label>
        <Label className="text-gray-500">Unit</Label>
        <Label className="text-gray-500">Emission factor</Label>
        <Label className="text-gray-500">Quantity</Label>
        <div />
      </div>

      <div className="space-y-3">
        {rows.map((r) => {
          const isDeleting = deletingRows.has(r.id);

          const cell =
            isUkActive && r.activity && r.refrigerantType && r.quantityUnit
              ? ukFactorsMap[r.activity]?.[r.refrigerantType]?.[r.quantityUnit]
              : undefined;
          const avail = availableUkRefrigBasises(cell);
          const selectValue =
            avail.length > 0
              ? avail.includes(r.ukRefrigerantBasis || "total")
                ? (r.ukRefrigerantBasis as UkRefrigerantBasis)
                : avail[0]
              : undefined;

          return (
            <div
              key={r.id}
              className={`grid grid-cols-1 ${gridColsUk} gap-4 items-center p-3 rounded-lg bg-gray-50`}
            >
              <Select
                value={r.activity}
                onValueChange={(v) =>
                  updateRow(r.id, {
                    activity: v,
                    refrigerantType: undefined,
                    quantityUnit: undefined,
                    ukRefrigerantBasis: undefined,
                  })
                }
                disabled={ukInputsLocked || !isUkActive}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select activity" />
                </SelectTrigger>
                <SelectContent>
                  {activities.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={r.refrigerantType}
                onValueChange={(v) =>
                  updateRow(r.id, { refrigerantType: v, quantityUnit: undefined, ukRefrigerantBasis: undefined })
                }
                disabled={ukInputsLocked || !isUkActive || !r.activity}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select emission" />
                </SelectTrigger>
                <SelectContent>
                  {emissionsFor(r.activity).map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={r.quantityUnit}
                onValueChange={(v) => updateRow(r.id, { quantityUnit: v })}
                disabled={ukInputsLocked || !isUkActive || !r.activity || !r.refrigerantType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {unitsFor(r.activity, r.refrigerantType).map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {!r.activity || !r.refrigerantType || !r.quantityUnit ? (
                <div className="h-10 rounded-md border border-dashed border-gray-200 bg-white/50" />
              ) : avail.length === 0 ? (
                <p className="text-xs text-amber-700 leading-tight px-1">
                  No factors for this row; check UK_refrigerant_factors.
                </p>
              ) : (
                <Select
                  value={selectValue!}
                  onValueChange={(v) => updateRow(r.id, { ukRefrigerantBasis: v as UkRefrigerantBasis })}
                  disabled={ukInputsLocked || !isUkActive}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select factor column" />
                  </SelectTrigger>
                  <SelectContent>
                    {avail.map((b) => (
                      <SelectItem key={b} value={b}>
                        {UK_REFRIG_BASIS_LABEL[b]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="flex items-center gap-2">
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
                  placeholder="Quantity"
                  disabled={ukInputsLocked || !isUkActive}
                />
                {r.isExisting ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteExistingRow(r.id)}
                    disabled={isDeleting}
                    className="text-red-600 hover:text-red-700"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button variant="ghost" className="text-red-600" onClick={() => removeRow(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div />
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-gray-700 font-medium">
          Total Refrigerant Emissions:{" "}
          <span className="font-semibold">{totalEmissions.toFixed(6)} kg CO2e</span>
        </div>
        {(() => {
          const pendingNew = rows.filter((r) => !r.isExisting).length;
          const pendingUpdates = rows.filter(
            (r) => r.isExisting && r.dbId && refrigerantRowChanged(r, existingEntries)
          ).length;
          const totalPending = pendingNew + pendingUpdates;
          return (
            <div className="flex items-center gap-2">
              <Button
                onClick={saveRefrigerantEntries}
                disabled={saving || totalPending === 0 || ukInputsLocked}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : `Save (${totalPending})`}
              </Button>
              {onSaveAndNext && (
                <Button
                  variant="outline"
                  onClick={onSaveAndNext}
                  className="border-teal-600 text-teal-600 hover:bg-teal-50"
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default RefrigerantEmissions;

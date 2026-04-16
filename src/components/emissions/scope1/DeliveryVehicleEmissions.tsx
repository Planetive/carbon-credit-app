import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, Save, Info, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DeliveryVehicleRow, UkFactorBasis } from "../shared/types";
import {
  availableUkDeliveryBasises,
  deliveryUkFactorBasisFromDb,
  fetchUkDeliveryFactorsMap,
  getUkDeliveryFactorCell,
  ukDeliveryBasisValue,
  type UkDeliveryFactorsMap,
} from "../shared/ukDeliveryFactors";
import { UK_PASSENGER_BASIS_LABEL } from "../shared/ukPassengerFactors";
import {
  newDeliveryVehicleRow,
  deliveryVehicleRowChanged,
  formatEmissions,
} from "../shared/utils";

interface DeliveryVehicleEmissionsProps {
  onDataChange: (data: DeliveryVehicleRow[]) => void;
  companyContext?: boolean;
  onSaveAndNext?: () => void;
}

const DeliveryVehicleEmissions: React.FC<DeliveryVehicleEmissionsProps> = ({
  onDataChange,
  onSaveAndNext,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const userId = user?.id || null;
  const [rows, setRows] = useState<DeliveryVehicleRow[]>([]);
  const [existingEntries, setExistingEntries] = useState<DeliveryVehicleRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingRows, setDeletingRows] = useState<Set<string>>(new Set());
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hoveredInfo, setHoveredInfo] = useState<{
    value: string;
    description: string;
    position: { x: number; y: number };
    side: "left" | "right";
  } | null>(null);
  const hasRestoredDraftRef = useRef(false);

  const [ukDeliveryMap, setUkDeliveryMap] = useState<UkDeliveryFactorsMap>({});
  const [ukDeliveryReady, setUkDeliveryReady] = useState(false);

  const getDraftKey = () => {
    if (userId) return `deliveryVehicleDraft:user:${userId}`;
    return "deliveryVehicleDraft:anon";
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { map, error } = await fetchUkDeliveryFactorsMap();
      if (cancelled) return;
      if (error) {
        console.error("UK_delivery-factors:", error);
        toast({
          title: "Could not load delivery factors",
          description: error,
          variant: "destructive",
        });
      }
      setUkDeliveryMap(map);
      setUkDeliveryReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const deliveryActivities = Object.keys(ukDeliveryMap).sort((a, b) => a.localeCompare(b));
  const deliveryTypesFor = (activity?: string) =>
    activity ? Object.keys(ukDeliveryMap[activity] || {}).sort((a, b) => a.localeCompare(b)) : [];
  const deliveryUnitsFor = (activity?: string, vehicleType?: string) =>
    activity && vehicleType
      ? Object.keys(ukDeliveryMap[activity]?.[vehicleType] || {}).sort((a, b) => a.localeCompare(b))
      : [];
  const deliveryFuelsFor = (activity?: string, vehicleType?: string, unit?: string) =>
    activity && vehicleType && unit
      ? Object.keys(ukDeliveryMap[activity]?.[vehicleType]?.[unit] || {}).sort((a, b) => a.localeCompare(b))
      : [];
  const deliveryLadenFor = (activity?: string, vehicleType?: string, unit?: string, fuelType?: string) =>
    activity && vehicleType && unit && fuelType
      ? Object.keys(ukDeliveryMap[activity]?.[vehicleType]?.[unit]?.[fuelType] || {}).sort((a, b) =>
          a.localeCompare(b)
        )
      : [];

  const ukInputsLocked = !ukDeliveryReady || Object.keys(ukDeliveryMap).length === 0;

  const deliveryActivityDescriptions: Record<string, string> = {
    Vans: "Large goods vehicles (vans up to 3.5 tonnes).",
    "HGV (all diesel)": "Heavy Goods Vehicles for long-distance freight transport",
    "HGVs refrigerated (all diesel)":
      "Refrigerated road vehicles with maximum weight exceeding 3.5 tonnes.",
  };

  useEffect(() => {
    const handleClickOutside = () => setHoveredInfo(null);
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHoveredInfo(null);
    };

    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    const loadExistingEntries = async () => {
      if (!userId) return;

      try {
        const { data: delData, error: delError } = await supabase
          .from("scope1_delivery_vehicle_entries")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (delError) throw delError;

        const existingDelRows = (delData || []).map((entry) => ({
          id: crypto.randomUUID(),
          dbId: entry.id,
          activity: entry.activity,
          vehicleType: entry.vehicle_type,
          unit: entry.unit,
          fuelType: (entry as { fuel_type?: string }).fuel_type ?? undefined,
          ladenLevel:
            (entry as { laden_level?: string }).laden_level !== undefined &&
            (entry as { laden_level?: string }).laden_level !== null
              ? String((entry as { laden_level?: string }).laden_level)
              : undefined,
          ukFactorBasis:
            deliveryUkFactorBasisFromDb((entry as { uk_factor_basis?: string }).uk_factor_basis) ??
            "total",
          distance: entry.distance,
          factor: entry.emission_factor,
          emissions: entry.emissions,
          isExisting: true,
        }));

        setExistingEntries(existingDelRows);
        setRows(existingDelRows.length > 0 ? existingDelRows : []);

        setIsInitialLoad(false);
      } catch (error: unknown) {
        console.error("Error loading existing entries:", error);
        toast({
          title: "Error",
          description: "Failed to load existing entries",
          variant: "destructive",
        });
      }
    };

    loadExistingEntries();
  }, [userId, toast]);

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
            .filter((r: { id?: string }) => r && r.id && !existingIds.has(r.id))
            .map((r: DeliveryVehicleRow) => ({
              ...r,
              isExisting: false,
            }));
          return mergedDraft.length > 0 ? [...prev, ...mergedDraft] : prev;
        });
      }
    } catch (e) {
      console.warn("Failed to restore DeliveryVehicleEmissions draft from sessionStorage:", e);
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

      const payload = {
        rows: draftRows,
        ts: Date.now(),
      };
      sessionStorage.setItem(key, JSON.stringify(payload));
    } catch (e) {
      console.warn("Failed to persist DeliveryVehicleEmissions draft to sessionStorage:", e);
    }
  }, [rows, isInitialLoad, userId]);

  const addRow = () => setRows((prev) => [...prev, newDeliveryVehicleRow()]);
  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  const updateRow = (id: string, patch: Partial<DeliveryVehicleRow>) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next: DeliveryVehicleRow = { ...r, ...patch };
        if (next.activity && next.vehicleType && next.unit && next.fuelType) {
          const ladenOpts = deliveryLadenFor(next.activity, next.vehicleType, next.unit, next.fuelType);
          let laden = next.ladenLevel;
          if (ladenOpts.length > 0 && (laden === undefined || !ladenOpts.includes(laden))) {
            laden = ladenOpts[0];
            next.ladenLevel = laden;
          }
          const cell = getUkDeliveryFactorCell(
            ukDeliveryMap,
            next.activity,
            next.vehicleType,
            next.unit,
            next.fuelType,
            laden
          );
          if (cell) {
            const avail = availableUkDeliveryBasises(cell);
            let basis: UkFactorBasis = next.ukFactorBasis || "total";
            if (avail.length > 0 && !avail.includes(basis)) {
              basis = avail[0];
              next.ukFactorBasis = basis;
            }
            const factor = avail.length > 0 ? ukDeliveryBasisValue(cell, basis) : undefined;
            next.factor = typeof factor === "number" ? factor : undefined;
          } else {
            next.factor = undefined;
          }
        } else {
          next.factor = undefined;
        }
        if (typeof next.distance === "number" && typeof next.factor === "number") {
          next.emissions = Number((next.distance * next.factor).toFixed(6));
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
      const { error } = await supabase.from("scope1_delivery_vehicle_entries").delete().eq("id", row.dbId);

      if (error) throw error;

      toast({ title: "Deleted", description: "Entry deleted successfully." });

      setRows((prev) => prev.filter((r) => r.id !== id));
      setExistingEntries((prev) => prev.filter((r) => r.id !== id));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to delete entry";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setDeletingRows((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const saveDeliveryEntries = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please log in to save.", variant: "destructive" });
      return;
    }

    const newEntries = rows.filter(
      (r) =>
        r.activity &&
        r.vehicleType &&
        r.unit &&
        r.fuelType &&
        r.ladenLevel !== undefined &&
        typeof r.distance === "number" &&
        typeof r.factor === "number" &&
        !r.isExisting
    );
    const changedExisting = rows.filter(
      (r) => r.isExisting && r.dbId && deliveryVehicleRowChanged(r, existingEntries)
    );

    if (newEntries.length === 0 && changedExisting.length === 0) {
      toast({ title: "Nothing to save", description: "No new or changed delivery vehicle entries." });
      return;
    }

    setSaving(true);
    try {
      const payload = newEntries.map((v) => ({
        user_id: user.id,
        activity: v.activity!,
        vehicle_type: v.vehicleType!,
        unit: v.unit!,
        fuel_type: v.fuelType!,
        laden_level: v.ladenLevel ?? "",
        uk_factor_basis: v.ukFactorBasis || "total",
        distance: v.distance!,
        emission_factor: v.factor!,
        emissions: v.emissions!,
      }));

      if (payload.length > 0) {
        const { error } = await supabase.from("scope1_delivery_vehicle_entries").insert(payload);
        if (error) throw error;
      }

      if (changedExisting.length > 0) {
        const updates = changedExisting.map((v) =>
          supabase
            .from("scope1_delivery_vehicle_entries")
            .update({
              activity: v.activity!,
              vehicle_type: v.vehicleType!,
              unit: v.unit!,
              fuel_type: v.fuelType!,
              laden_level: v.ladenLevel ?? "",
              uk_factor_basis: v.ukFactorBasis || "total",
              distance: v.distance!,
              emission_factor: v.factor!,
              emissions: v.emissions!,
            })
            .eq("id", v.dbId!)
        );
        const results = await Promise.all(updates);
        const updateError = results.find((r) => (r as { error?: unknown }).error)?.error;
        if (updateError) throw updateError;
      }

      toast({
        title: "Saved",
        description: `Saved ${newEntries.length} new and updated ${changedExisting.length} entries.`,
      });

      const { data: newData } = await supabase
        .from("scope1_delivery_vehicle_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (newData) {
        const updatedExistingRows = newData.map((entry) => ({
          id: crypto.randomUUID(),
          dbId: entry.id,
          activity: entry.activity,
          vehicleType: entry.vehicle_type,
          unit: entry.unit,
          fuelType: (entry as { fuel_type?: string }).fuel_type ?? undefined,
          ladenLevel:
            (entry as { laden_level?: string }).laden_level !== undefined &&
            (entry as { laden_level?: string }).laden_level !== null
              ? String((entry as { laden_level?: string }).laden_level)
              : undefined,
          ukFactorBasis:
            deliveryUkFactorBasisFromDb((entry as { uk_factor_basis?: string }).uk_factor_basis) ??
            "total",
          distance: entry.distance,
          factor: entry.emission_factor,
          emissions: entry.emissions,
          isExisting: true,
        }));
        setExistingEntries(updatedExistingRows);
        setRows(updatedExistingRows);
      }
      try {
        const key = getDraftKey();
        sessionStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const totalEmissions = rows.reduce((sum, r) => sum + (r.emissions || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">Delivery Vehicle Entries</h4>
          <p className="text-sm text-gray-600">Add your organization&apos;s delivery vehicle usage data</p>
        </div>
        <Button onClick={addRow} disabled={ukInputsLocked} className="bg-teal-600 hover:bg-teal-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add New Entry
        </Button>
      </div>

      {ukDeliveryReady && Object.keys(ukDeliveryMap).length === 0 && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
          No usable reference rows loaded. Ensure the{" "}
          <span className="font-mono">UK_delivery-factors</span> table exists (run migrations), then add data in
          Supabase with at least: <span className="font-mono">activity</span>, <span className="font-mono">type</span>,{" "}
          <span className="font-mono">unit</span>, <span className="font-mono">fuel_type</span>,{" "}
          <span className="font-mono">laden_level</span> / <span className="font-mono">laden_lev</span> (use an empty
          string if not applicable), and{" "}
          <span className="font-mono">kg_co2e</span> and/or the per-gas columns. Refresh the page after importing.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        <Label className="md:col-span-1 text-gray-500">Activity</Label>
        <Label className="md:col-span-1 text-gray-500">Type</Label>
        <Label className="md:col-span-1 text-gray-500">Unit</Label>
        <Label className="md:col-span-1 text-gray-500">Fuel</Label>
        <Label className="md:col-span-1 text-gray-500">Laden</Label>
        <Label className="md:col-span-1 text-gray-500">Factor</Label>
        <Label className="md:col-span-1 text-gray-500">Distance</Label>
      </div>

      <div className="space-y-3">
        {rows.map((r) => {
          const isDeleting = deletingRows.has(r.id);

          return (
            <div key={r.id} className={`grid grid-cols-1 md:grid-cols-7 gap-4 items-center p-3 rounded-lg bg-gray-50`}>
              <Select
                value={r.activity}
                onValueChange={(v) => {
                  setHoveredInfo(null);
                  updateRow(r.id, {
                    activity: v,
                    vehicleType: undefined,
                    unit: undefined,
                    fuelType: undefined,
                    ladenLevel: undefined,
                    ukFactorBasis: undefined,
                  });
                }}
                disabled={ukInputsLocked}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select activity" />
                </SelectTrigger>
                <SelectContent>
                  {deliveryActivities.map((activity) => (
                    <SelectItem
                      key={activity}
                      value={activity}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const tooltipWidth = 320;
                        const spacing = 10;
                        const viewportWidth = window.innerWidth;

                        let x = rect.right + spacing;
                        let side: "left" | "right" = "right";

                        const maxX = viewportWidth * 0.7;
                        if (x > maxX) {
                          x = maxX;
                        }

                        if (x + tooltipWidth > viewportWidth - 10) {
                          x = rect.left - tooltipWidth - spacing;
                          side = "left";
                          if (x < 10) {
                            x = 10;
                          }
                        }

                        setHoveredInfo({
                          value: activity,
                          description: deliveryActivityDescriptions[activity] || "Activity information",
                          position: { x, y: rect.top },
                          side,
                        });
                      }}
                      onMouseLeave={() => setHoveredInfo(null)}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{activity}</span>
                        <Info className="h-4 w-4 text-gray-400 ml-2" />
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={r.vehicleType}
                onValueChange={(v) =>
                  updateRow(r.id, {
                    vehicleType: v,
                    unit: undefined,
                    fuelType: undefined,
                    ladenLevel: undefined,
                    ukFactorBasis: undefined,
                  })
                }
                disabled={ukInputsLocked || !r.activity}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {deliveryTypesFor(r.activity).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={r.unit}
                onValueChange={(v) =>
                  updateRow(r.id, {
                    unit: v,
                    fuelType: undefined,
                    ladenLevel: undefined,
                    ukFactorBasis: undefined,
                  })
                }
                disabled={ukInputsLocked || !r.activity || !r.vehicleType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {deliveryUnitsFor(r.activity, r.vehicleType).map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={r.fuelType}
                onValueChange={(v) =>
                  updateRow(r.id, { fuelType: v, ladenLevel: undefined, ukFactorBasis: undefined })
                }
                disabled={ukInputsLocked || !r.activity || !r.vehicleType || !r.unit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fuel" />
                </SelectTrigger>
                <SelectContent>
                  {deliveryFuelsFor(r.activity, r.vehicleType, r.unit).map((fuel) => (
                    <SelectItem key={fuel} value={fuel}>
                      {fuel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={
                  r.ladenLevel === undefined
                    ? undefined
                    : r.ladenLevel === ""
                      ? "__empty_laden__"
                      : r.ladenLevel
                }
                onValueChange={(v) =>
                  updateRow(r.id, {
                    ladenLevel: v === "__empty_laden__" ? "" : v,
                    ukFactorBasis: undefined,
                  })
                }
                disabled={
                  ukInputsLocked ||
                  !r.activity ||
                  !r.vehicleType ||
                  !r.unit ||
                  !r.fuelType ||
                  deliveryLadenFor(r.activity, r.vehicleType, r.unit, r.fuelType).length === 0
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Laden level" />
                </SelectTrigger>
                <SelectContent>
                  {deliveryLadenFor(r.activity, r.vehicleType, r.unit, r.fuelType).map((lv) => (
                    <SelectItem
                      key={lv || "__empty_key__"}
                      value={lv === "" ? "__empty_laden__" : lv}
                    >
                      {lv === "" ? "(none)" : lv}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(() => {
                const cell = getUkDeliveryFactorCell(
                  ukDeliveryMap,
                  r.activity,
                  r.vehicleType,
                  r.unit,
                  r.fuelType,
                  r.ladenLevel
                );
                const avail = availableUkDeliveryBasises(cell);
                if (!r.activity || !r.vehicleType || !r.unit || !r.fuelType) {
                  return <div className="h-10 rounded-md border border-dashed border-gray-200 bg-white/50" />;
                }
                if (r.ladenLevel === undefined) {
                  return <div className="h-10 rounded-md border border-dashed border-gray-200 bg-white/50" />;
                }
                if (avail.length === 0) {
                  return (
                    <p className="text-xs text-amber-700 leading-tight px-1">
                      No factor columns for this row in UK_delivery-factors.
                    </p>
                  );
                }
                const selectValue = avail.includes(r.ukFactorBasis || "total")
                  ? (r.ukFactorBasis || "total")
                  : avail[0];
                return (
                  <Select
                    value={selectValue}
                    onValueChange={(v) => updateRow(r.id, { ukFactorBasis: v as UkFactorBasis })}
                    disabled={ukInputsLocked}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select factor column" />
                    </SelectTrigger>
                    <SelectContent>
                      {avail.map((b) => (
                        <SelectItem key={b} value={b}>
                          {UK_PASSENGER_BASIS_LABEL[b]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              })()}

              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="any"
                  min="0"
                  max="999999999999.999999"
                  value={r.distance ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "") {
                      updateRow(r.id, { distance: undefined });
                    } else {
                      const numValue = Number(value);
                      if (numValue >= 0 && numValue <= 999999999999.999999) {
                        updateRow(r.id, { distance: numValue });
                      }
                    }
                  }}
                  placeholder="Enter distance"
                  disabled={false}
                  className="flex-1"
                />
                {r.isExisting ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteExistingRow(r.id)}
                    disabled={isDeleting}
                    className="text-red-600 hover:text-red-700 ml-2"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button variant="ghost" className="text-red-600 ml-2" onClick={() => removeRow(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {hoveredInfo &&
        createPortal(
          <div
            className="fixed z-[100] pointer-events-none animate-in fade-in-0 zoom-in-95 duration-200"
            style={{
              left: `${hoveredInfo.position.x}px`,
              top: `${hoveredInfo.position.y}px`,
            }}
          >
            <div className="bg-white border border-gray-200 rounded-xl shadow-2xl p-4 max-w-sm transform -translate-y-2">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 rounded-full p-2 flex-shrink-0">
                  <Info className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 text-sm mb-2">{hoveredInfo.value}</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{hoveredInfo.description}</p>
                </div>
              </div>
              {hoveredInfo.side === "right" ? (
                <>
                  <div className="absolute -left-2 top-4 w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent border-r-white"></div>
                  <div className="absolute -left-3 top-4 w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent border-r-gray-200"></div>
                </>
              ) : (
                <>
                  <div className="absolute -right-2 top-4 w-0 h-0 border-t-8 border-b-8 border-l-8 border-transparent border-l-white"></div>
                  <div className="absolute -right-3 top-4 w-0 h-0 border-t-8 border-b-8 border-l-8 border-transparent border-l-gray-200"></div>
                </>
              )}
            </div>
          </div>,
          document.body
        )}

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-gray-700 font-medium">
          Total Delivery Vehicle Emissions:{" "}
          <span className="font-semibold">{formatEmissions(totalEmissions)} kg CO2e</span>
        </div>
        {(() => {
          const pendingNew = rows.filter((r) => !r.isExisting).length;
          const pendingUpdates = rows.filter(
            (r) => r.isExisting && deliveryVehicleRowChanged(r, existingEntries)
          ).length;
          const totalPending = pendingNew + pendingUpdates;
          return (
            <div className="flex items-center gap-2">
              <Button
                onClick={saveDeliveryEntries}
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

export default DeliveryVehicleEmissions;

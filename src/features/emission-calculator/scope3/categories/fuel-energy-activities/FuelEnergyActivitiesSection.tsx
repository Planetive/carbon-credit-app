import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Save, Trash2, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  deleteScope3CategoryEntry,
  fetchScope3CategoryEntries,
  insertScope3CategoryEntries,
  updateScope3CategoryEntry,
} from "@/features/scope3/adapters/scope3SupabaseAdapter";
import type { EmissionData } from "@/components/emissions/shared/types";
import type { FuelEnergyRow } from "@/components/emissions/scope3/types/scope3Types";
import { useEmissionSync } from "@/components/emissions/scope3/hooks/useEmissionSync";

interface FuelEnergyActivitiesSectionProps {
  user: { id: string } | null;
  companyContext?: boolean;
  counterpartyId?: string;
  emissionData: EmissionData;
  setEmissionData: React.Dispatch<React.SetStateAction<EmissionData>>;
  onSaveAndNext?: () => void;
}

export const FuelEnergyActivitiesSection: React.FC<FuelEnergyActivitiesSectionProps> = ({
  user,
  companyContext,
  counterpartyId,
  emissionData,
  setEmissionData,
  onSaveAndNext,
}) => {
  const { toast } = useToast();

  const [fuelEnergyRows, setFuelEnergyRows] = useState<FuelEnergyRow[]>([]);
  const [existingFuelEnergy, setExistingFuelEnergy] = useState<FuelEnergyRow[]>([]);
  const [savingFuelEnergy, setSavingFuelEnergy] = useState(false);
  const [deletingFuelEnergy, setDeletingFuelEnergy] = useState<Set<string>>(new Set());
  const [isInitialLoadFuelEnergy, setIsInitialLoadFuelEnergy] = useState(true);

  const newFuelEnergyRow = (): FuelEnergyRow => ({
    id: `fera-${Date.now()}-${Math.random()}`,
    extraction: "",
    distance: undefined,
    refining: "",
    emissions: undefined,
  });

  const addFuelEnergyRow = () =>
    setFuelEnergyRows((prev) => [...prev, newFuelEnergyRow()]);

  const removeFuelEnergyRow = (id: string) =>
    setFuelEnergyRows((prev) => prev.filter((r) => r.id !== id));

  const updateFuelEnergyRow = (id: string, patch: Partial<FuelEnergyRow>) => {
    setFuelEnergyRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  };

  // Load existing Fuel & Energy Activities entries
  useEffect(() => {
    const loadFuelEnergy = async () => {
      if (!user) return;

      if (companyContext && !counterpartyId) {
        setFuelEnergyRows([]);
        setExistingFuelEnergy([]);
        setIsInitialLoadFuelEnergy(false);
        return;
      }

      try {
        const data = await fetchScope3CategoryEntries(
          "scope3_fuel_energy_activities",
          user.id,
          !!companyContext,
          counterpartyId,
        );

        const loadedRows: FuelEnergyRow[] = (data || []).map((entry) => ({
          id: crypto.randomUUID(),
          dbId: String(entry.id),
          isExisting: true,
          extraction: entry.extraction || "",
          distance: entry.distance || undefined,
          refining: entry.refining || "",
          emissions: entry.emissions || undefined,
        }));

        setExistingFuelEnergy(loadedRows);
        setFuelEnergyRows(loadedRows.length > 0 ? loadedRows : []);
      } catch (error: unknown) {
        const err = error as { message?: string };
        console.error("Error loading fuel energy activities:", error);
        toast({
          title: "Error",
          description: err.message || "Failed to load fuel energy activities",
          variant: "destructive",
        });
      } finally {
        setIsInitialLoadFuelEnergy(false);
      }
    };

    loadFuelEnergy();
  }, [user, companyContext, counterpartyId, toast]);

  // Sync to emissionData
  useEmissionSync({
    category: "fuel_energy_activities",
    rows: fuelEnergyRows,
    isInitialLoad: isInitialLoadFuelEnergy,
    mapRowToEntry: (r) =>
      r.extraction &&
      r.refining &&
      typeof r.distance === "number" &&
      r.distance >= 0 &&
      typeof r.emissions === "number" &&
      r.emissions >= 0
        ? {
            id: r.id,
            category: "fuel_energy_activities",
            activity: r.extraction,
            unit: "km",
            quantity: r.distance,
            emissions: r.emissions,
          }
        : null,
    setEmissionData,
  });

  const saveFuelEnergy = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please log in to save.",
        variant: "destructive",
      });
      return;
    }

    const newEntries = fuelEnergyRows.filter(
      (r) =>
        (r.extraction || r.refining || typeof r.distance === "number") &&
        !r.isExisting,
    );

    const changedExisting = fuelEnergyRows.filter((r) => {
      if (!r.isExisting || !r.dbId) return false;
      const existing = existingFuelEnergy.find((e) => e.dbId === r.dbId);
      if (!existing) return false;
      return (
        existing.extraction !== r.extraction ||
        existing.distance !== r.distance ||
        existing.refining !== r.refining ||
        existing.emissions !== r.emissions
      );
    });

    if (newEntries.length === 0 && changedExisting.length === 0) {
      toast({
        title: "Nothing to save",
        description: "No new or changed fuel & energy activities.",
      });
      return;
    }

    setSavingFuelEnergy(true);
    try {
      if (newEntries.length > 0) {
        const payload = newEntries.map((r) => ({
          user_id: user.id,
          counterparty_id: companyContext && counterpartyId ? counterpartyId : null,
          extraction: r.extraction,
          distance: r.distance!,
          refining: r.refining,
          emissions: r.emissions || 0,
        }));

        await insertScope3CategoryEntries("scope3_fuel_energy_activities", payload);
      }

      if (changedExisting.length > 0) {
        await Promise.all(
          changedExisting.map((r) =>
            updateScope3CategoryEntry("scope3_fuel_energy_activities", r.dbId!, {
              extraction: r.extraction,
              distance: r.distance!,
              refining: r.refining,
              emissions: r.emissions || 0,
            })
          )
        );
      }

      toast({
        title: "Saved",
        description: `Saved ${newEntries.length} new and updated ${changedExisting.length} entries.`,
      });

      const newData = await fetchScope3CategoryEntries(
        "scope3_fuel_energy_activities",
        user.id,
        !!companyContext,
        counterpartyId,
      );

      if (newData) {
        const updatedRows: FuelEnergyRow[] = newData.map((entry) => ({
          id: crypto.randomUUID(),
          dbId: String(entry.id),
          isExisting: true,
          extraction: entry.extraction || "",
          distance: entry.distance || undefined,
          refining: entry.refining || "",
          emissions: entry.emissions || undefined,
        }));
        setExistingFuelEnergy(updatedRows);
        setFuelEnergyRows(updatedRows);
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast({
        title: "Error",
        description: err.message || "Failed to save",
        variant: "destructive",
      });
    } finally {
      setSavingFuelEnergy(false);
    }
  };

  const deleteFuelEnergyRow = async (id: string) => {
    const row = fuelEnergyRows.find((r) => r.id === id);
    if (!row || !row.dbId) {
      removeFuelEnergyRow(id);
      return;
    }

    if (
      !confirm(
        "Are you sure you want to delete this entry? This action cannot be undone.",
      )
    ) {
      return;
    }

    setDeletingFuelEnergy((prev) => new Set(prev).add(id));
    try {
      await deleteScope3CategoryEntry("scope3_fuel_energy_activities", row.dbId);

      toast({ title: "Deleted", description: "Entry deleted successfully." });

      setFuelEnergyRows((prev) => prev.filter((r) => r.id !== id));
      setExistingFuelEnergy((prev) => prev.filter((r) => r.id !== id));
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({
        title: "Error",
        description: err.message || "Failed to delete entry",
        variant: "destructive",
      });
    } finally {
      setDeletingFuelEnergy((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const totalDistance = fuelEnergyRows.reduce(
    (sum, r) => sum + (r.distance || 0),
    0,
  );
  const totalEmissions = fuelEnergyRows.reduce(
    (sum, r) => sum + (r.emissions || 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">
            Fuel &amp; Energy Related Activities
          </h4>
          <p className="text-sm text-gray-600">
            Capture upstream fuel and energy details
          </p>
        </div>
        <Button
          onClick={addFuelEnergyRow}
          className="bg-[#1D9E75] hover:bg-[#22B87E] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Entry
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center mb-4">
        <Label className="text-gray-500 font-medium">Extraction</Label>
        <Label className="text-gray-500 font-medium">Distance (km)</Label>
        <Label className="text-gray-500 font-medium">Refining</Label>
        <Label className="text-gray-500 font-medium">Emissions (kg CO2e)</Label>
        <Label className="text-gray-500 font-medium">Actions</Label>
      </div>

      <div className="space-y-4">
        {fuelEnergyRows.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center p-4 rounded-lg bg-gray-50 border border-gray-200"
          >
            <div className="w-full">
              <Input
                value={r.extraction}
                onChange={(e) =>
                  updateFuelEnergyRow(r.id, { extraction: e.target.value })
                }
                placeholder="e.g., drilling, mining"
                className="w-full"
              />
            </div>
            <div className="w-full">
              <Input
                type="number"
                step="any"
                min="0"
                value={r.distance ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "") {
                    updateFuelEnergyRow(r.id, { distance: undefined });
                  } else {
                    const numValue = Number(value);
                    if (numValue >= 0) {
                      updateFuelEnergyRow(r.id, { distance: numValue });
                    }
                  }
                }}
                placeholder="Enter distance"
                className="w-full"
              />
            </div>
            <div className="w-full">
              <Input
                value={r.refining}
                onChange={(e) =>
                  updateFuelEnergyRow(r.id, { refining: e.target.value })
                }
                placeholder="Refining processes"
                className="w-full"
              />
            </div>
            <div className="w-full">
              <Input
                type="number"
                step="any"
                min="0"
                value={r.emissions ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "") {
                    updateFuelEnergyRow(r.id, { emissions: undefined });
                  } else {
                    const numValue = Number(value);
                    if (numValue >= 0) {
                      updateFuelEnergyRow(r.id, { emissions: numValue });
                    }
                  }
                }}
                placeholder="Enter emissions"
                className="w-full"
              />
            </div>
            {r.isExisting ? (
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => deleteFuelEnergyRow(r.id)}
                disabled={deletingFuelEnergy.has(r.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => removeFuelEnergyRow(r.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-gray-700 font-medium">
          Total Distance:{" "}
          <span className="font-semibold">
            {totalDistance.toFixed(1)} km
          </span>
          {" "}·{" "}
          Total Emissions:{" "}
          <span className="font-semibold">
            {totalEmissions.toFixed(3)} kg CO2e
          </span>
        </div>
        {(() => {
          const pendingNew = fuelEnergyRows.filter(
            (r) =>
              !r.isExisting &&
              (r.extraction || r.refining || r.distance !== undefined),
          ).length;
          const pendingUpdates = fuelEnergyRows.filter((r) => {
            if (!r.isExisting || !r.dbId) return false;
            const existing = existingFuelEnergy.find((e) => e.dbId === r.dbId);
            if (!existing) return false;
            return (
              existing.extraction !== r.extraction ||
              existing.distance !== r.distance ||
              existing.refining !== r.refining ||
              existing.emissions !== r.emissions
            );
          }).length;
          const totalPending = pendingNew + pendingUpdates;
          return (
            <div className="flex items-center gap-2">
              <Button
                onClick={saveFuelEnergy}
                disabled={savingFuelEnergy || totalPending === 0}
                className="bg-[#1D9E75] hover:bg-[#22B87E] text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {savingFuelEnergy ? "Saving..." : `Save (${totalPending})`}
              </Button>
              {onSaveAndNext && (
                <Button variant="outline" onClick={onSaveAndNext} className="border-[#1D9E75] text-[#1D9E75] hover:bg-[#EAF7F1]">
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



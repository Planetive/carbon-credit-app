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
import type { CapitalGoodsRow } from "@/components/emissions/scope3/types/scope3Types";
import { SupplierAutocomplete } from "@/components/emissions/scope3/SupplierAutocomplete";
import type { Supplier } from "@/components/emissions/scope3/types";
import { useEmissionSync } from "@/components/emissions/scope3/hooks/useEmissionSync";
import { USE_JWT_AUTH } from "@/api/config";
import { resolveSpendBasedEmissionsKg } from "@/api/calcConnection";

interface CapitalGoodsSectionProps {
  user: { id: string } | null;
  companyContext?: boolean;
  counterpartyId?: string;
  setEmissionData: React.Dispatch<React.SetStateAction<EmissionData>>;
  onSaveAndNext?: () => void;
}

export const CapitalGoodsSection: React.FC<CapitalGoodsSectionProps> = ({
  user,
  companyContext,
  counterpartyId,
  setEmissionData,
  onSaveAndNext,
}) => {
  const { toast } = useToast();

  const [capitalGoodsRows, setCapitalGoodsRows] = useState<CapitalGoodsRow[]>([]);
  const [existingCapitalGoods, setExistingCapitalGoods] = useState<CapitalGoodsRow[]>([]);
  const [savingCapitalGoods, setSavingCapitalGoods] = useState(false);
  const [deletingCapitalGoods, setDeletingCapitalGoods] = useState<Set<string>>(new Set());
  const [isInitialLoadCapitalGoods, setIsInitialLoadCapitalGoods] = useState(true);

  const newCapitalGoodsRow = (): CapitalGoodsRow => ({
    id: `capg-${Date.now()}-${Math.random()}`,
    supplier: null,
    amount: undefined,
    emissions: undefined,
  });

  const addCapitalGoodsRow = () =>
    setCapitalGoodsRows((prev) => [...prev, newCapitalGoodsRow()]);

  const removeCapitalGoodsRow = (id: string) =>
    setCapitalGoodsRows((prev) => prev.filter((r) => r.id !== id));

  const updateCapitalGoodsRow = (id: string, patch: Partial<CapitalGoodsRow>) => {
    let snapshot: CapitalGoodsRow | null = null;
    let factor = 0;
    setCapitalGoodsRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated: CapitalGoodsRow = { ...r, ...patch };
        const supplier: Supplier | null | undefined = updated.supplier;
        if (supplier && typeof updated.amount === "number" && updated.amount > 0) {
          factor = supplier.emission_factor;
          updated.emissions = updated.amount * supplier.emission_factor;
        } else {
          updated.emissions = undefined;
        }
        snapshot = updated;
        return updated;
      }),
    );

    if (
      USE_JWT_AUTH &&
      snapshot &&
      typeof snapshot.amount === "number" &&
      snapshot.emissions != null
    ) {
      const snap = snapshot;
      void (async () => {
        const kg = await resolveSpendBasedEmissionsKg({
          amount: snap.amount!,
          emission_factor: factor,
          category: "capital_goods",
        });
        setCapitalGoodsRows((prev) =>
          prev.map((r) => {
            if (r.id !== id) return r;
            if (r.amount !== snap.amount) return r;
            if (r.emissions === kg) return r;
            return { ...r, emissions: kg };
          }),
        );
      })();
    }
  };

  // Load existing Capital Goods entries
  useEffect(() => {
    const loadCapitalGoods = async () => {
      if (!user) return;

      if (companyContext && !counterpartyId) {
        setCapitalGoodsRows([]);
        setExistingCapitalGoods([]);
        setIsInitialLoadCapitalGoods(false);
        return;
      }

      try {
        const data = await fetchScope3CategoryEntries(
          "scope3_capital_goods",
          user.id,
          !!companyContext,
          counterpartyId,
        );

        const loadedRows: CapitalGoodsRow[] = (data || []).map((raw) => {
          const supplier: Supplier | null =
            raw.supplier_id != null
              ? {
                  id: raw.supplier_id,
                  supplier_name: raw.supplier_name || "",
                  code: raw.supplier_code || "",
                  unit: "PKR",
                  emission_factor: raw.emission_factor,
                }
              : null;

          return {
            id: crypto.randomUUID(),
            dbId: String(raw.id),
            isExisting: true,
            supplier,
            amount: raw.amount,
            emissions: raw.emissions,
          };
        });

        setExistingCapitalGoods(loadedRows);
        setCapitalGoodsRows(loadedRows.length > 0 ? loadedRows : []);
      } catch (error: unknown) {
        const err = error as { message?: string };
        console.error("Error loading capital goods:", error);
        toast({
          title: "Error",
          description: err.message || "Failed to load capital goods entries",
          variant: "destructive",
        });
      } finally {
        setIsInitialLoadCapitalGoods(false);
      }
    };

    loadCapitalGoods();
  }, [user, companyContext, counterpartyId, toast]);

  // Sync to emissionData
  useEmissionSync({
    category: "capital_goods",
    rows: capitalGoodsRows,
    isInitialLoad: isInitialLoadCapitalGoods,
    mapRowToEntry: (r) =>
      r.supplier && typeof r.amount === "number" && r.amount > 0
        ? {
            id: r.id,
            category: "capital_goods",
            activity: `${r.supplier.supplier_name} (${r.supplier.code})`,
            unit: "PKR",
            quantity: r.amount,
            emissions: r.emissions || 0,
          }
        : null,
    setEmissionData,
  });

  const saveCapitalGoods = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please log in to save.",
        variant: "destructive",
      });
      return;
    }

    const newEntries = capitalGoodsRows.filter(
      (r) =>
        r.supplier &&
        typeof r.amount === "number" &&
        r.amount > 0 &&
        !r.isExisting,
    );

    const changedExisting = capitalGoodsRows.filter((r) => {
      if (!r.isExisting || !r.dbId) return false;
      const existing = existingCapitalGoods.find((e) => e.dbId === r.dbId);
      if (!existing) return false;
      return (
        existing.supplier?.id !== r.supplier?.id ||
        existing.amount !== r.amount ||
        Math.abs((existing.emissions || 0) - (r.emissions || 0)) > 0.01
      );
    });

    if (newEntries.length === 0 && changedExisting.length === 0) {
      toast({
        title: "Nothing to save",
        description: "No new or changed capital goods entries.",
      });
      return;
    }

    setSavingCapitalGoods(true);
    try {
      if (newEntries.length > 0) {
        const payload = newEntries.map((r) => ({
          user_id: user.id,
          counterparty_id: companyContext && counterpartyId ? counterpartyId : null,
          supplier_id: r.supplier!.id,
          supplier_name: r.supplier!.supplier_name,
          supplier_code: r.supplier!.code,
          amount: r.amount!,
          emission_factor: r.supplier!.emission_factor,
          emissions: r.emissions!,
        }));

        await insertScope3CategoryEntries("scope3_capital_goods", payload);
      }

      if (changedExisting.length > 0) {
        await Promise.all(
          changedExisting.map((r) =>
            updateScope3CategoryEntry("scope3_capital_goods", r.dbId!, {
              supplier_id: r.supplier!.id,
              supplier_name: r.supplier!.supplier_name,
              supplier_code: r.supplier!.code,
              amount: r.amount!,
              emission_factor: r.supplier!.emission_factor,
              emissions: r.emissions!,
            })
          )
        );
      }

      toast({
        title: "Saved",
        description: `Saved ${newEntries.length} new and updated ${changedExisting.length} entries.`,
      });

      const newData = await fetchScope3CategoryEntries(
        "scope3_capital_goods",
        user.id,
        !!companyContext,
        counterpartyId,
      );

      if (newData) {
        const updatedRows: CapitalGoodsRow[] = newData.map((raw) => ({
          id: crypto.randomUUID(),
          dbId: String(raw.id),
          isExisting: true,
          supplier: raw.supplier_id
            ? {
                id: raw.supplier_id,
                supplier_name: raw.supplier_name || "",
                code: raw.supplier_code || "",
                unit: "PKR",
                emission_factor: raw.emission_factor,
              }
            : null,
          amount: raw.amount,
          emissions: raw.emissions,
        }));
        setExistingCapitalGoods(updatedRows);
        setCapitalGoodsRows(updatedRows);
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast({
        title: "Error",
        description: err.message || "Failed to save",
        variant: "destructive",
      });
    } finally {
      setSavingCapitalGoods(false);
    }
  };

  const deleteCapitalGoodsRow = async (id: string) => {
    const row = capitalGoodsRows.find((r) => r.id === id);
    if (!row || !row.dbId) {
      removeCapitalGoodsRow(id);
      return;
    }

    if (
      !confirm(
        "Are you sure you want to delete this entry? This action cannot be undone.",
      )
    ) {
      return;
    }

    setDeletingCapitalGoods((prev) => new Set(prev).add(id));
    try {
      await deleteScope3CategoryEntry("scope3_capital_goods", row.dbId);

      toast({ title: "Deleted", description: "Entry deleted successfully." });

      setCapitalGoodsRows((prev) => prev.filter((r) => r.id !== id));
      setExistingCapitalGoods((prev) => prev.filter((r) => r.id !== id));
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({
        title: "Error",
        description: err.message || "Failed to delete entry",
        variant: "destructive",
      });
    } finally {
      setDeletingCapitalGoods((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const totalEmissions = capitalGoodsRows.reduce(
    (sum, r) => sum + (r.emissions || 0),
    0,
  );
  const totalAmount = capitalGoodsRows.reduce(
    (sum, r) => sum + (r.amount || 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">Capital Goods</h4>
          <p className="text-sm text-gray-600">
            Record details for purchased capital goods
          </p>
        </div>
        <Button
          onClick={addCapitalGoodsRow}
          className="bg-[#1D9E75] hover:bg-[#22B87E] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Entry
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center mb-4">
        <Label className="text-gray-500 font-medium">Equipment</Label>
        <Label className="text-gray-500 font-medium">Amount (PKR)</Label>
        <Label className="text-gray-500 font-medium">Emissions</Label>
      </div>

      <div className="space-y-4">
        {capitalGoodsRows.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 rounded-lg bg-gray-50 border border-gray-200"
          >
            <div className="w-full">
              <SupplierAutocomplete
                value={r.supplier}
                onSelect={(supplier) =>
                  updateCapitalGoodsRow(r.id, { supplier })
                }
                placeholder="Search equipment/supplier..."
              />
            </div>
            <div className="w-full">
              <Input
                type="number"
                step="any"
                min="0"
                value={r.amount ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "") {
                    updateCapitalGoodsRow(r.id, { amount: undefined });
                  } else {
                    const numValue = Number(value);
                    if (numValue >= 0) {
                      updateCapitalGoodsRow(r.id, { amount: numValue });
                    }
                  }
                }}
                placeholder="Enter amount"
                className="w-full"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-700 font-medium flex-1">
                {r.emissions !== undefined
                  ? `${r.emissions.toFixed(2)} kg CO2e`
                  : "-"}
              </div>
              {r.isExisting ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => deleteCapitalGoodsRow(r.id)}
                  disabled={deletingCapitalGoods.has(r.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => removeCapitalGoodsRow(r.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-gray-700 font-medium">
          Total Amount:{" "}
          <span className="font-semibold">
            PKR{" "}
            {totalAmount.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>{" "}
          | Total Emissions:{" "}
          <span className="font-semibold">
            {totalEmissions.toFixed(2)} kg CO2e
          </span>
        </div>
        {(() => {
          const pendingNew = capitalGoodsRows.filter(
            (r) =>
              !r.isExisting &&
              r.supplier &&
              typeof r.amount === "number" &&
              r.amount > 0,
          ).length;
          const pendingUpdates = capitalGoodsRows.filter((r) => {
            if (!r.isExisting || !r.dbId) return false;
            const existing = existingCapitalGoods.find(
              (e) => e.dbId === r.dbId,
            );
            if (!existing) return false;
            return (
              existing.supplier?.id !== r.supplier?.id ||
              existing.amount !== r.amount ||
              Math.abs((existing.emissions || 0) - (r.emissions || 0)) > 0.01
            );
          }).length;
          const totalPending = pendingNew + pendingUpdates;
          return (
            <div className="flex items-center gap-2">
              <Button
                onClick={saveCapitalGoods}
                disabled={savingCapitalGoods || totalPending === 0}
                className="bg-[#1D9E75] hover:bg-[#22B87E] text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {savingCapitalGoods ? "Saving..." : `Save (${totalPending})`}
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



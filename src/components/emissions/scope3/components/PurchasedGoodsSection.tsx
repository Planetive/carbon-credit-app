import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Save, Trash2, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SupplierAutocomplete } from "../SupplierAutocomplete";
import type { Supplier } from "../types";
import type { EmissionData } from "@/components/emissions/shared/types";
import type { PurchasedGoodsRow } from "../types/scope3Types";
import { useEmissionSync } from "../hooks/useEmissionSync";

interface PurchasedGoodsSectionProps {
  user: { id: string } | null;
  companyContext?: boolean;
  counterpartyId?: string;
  setEmissionData: React.Dispatch<React.SetStateAction<EmissionData>>;
  onSaveAndNext?: () => void;
}

export const PurchasedGoodsSection: React.FC<PurchasedGoodsSectionProps> = ({
  user,
  companyContext,
  counterpartyId,
  setEmissionData,
  onSaveAndNext,
}) => {
  const { toast } = useToast();

  // Row-based state for Purchased Goods & Services
  const [purchasedGoodsRows, setPurchasedGoodsRows] = useState<PurchasedGoodsRow[]>([]);
  const [existingPurchasedGoods, setExistingPurchasedGoods] = useState<PurchasedGoodsRow[]>([]);
  const [savingPurchasedGoods, setSavingPurchasedGoods] = useState(false);
  const [deletingPurchasedGoods, setDeletingPurchasedGoods] = useState<Set<string>>(new Set());
  const [isInitialLoadPurchasedGoods, setIsInitialLoadPurchasedGoods] = useState(true);

  const newPurchasedGoodsRow = (): PurchasedGoodsRow => ({
    id: `pg-${Date.now()}-${Math.random()}`,
    supplier: null,
    amountSpent: undefined,
    emissions: undefined,
  });

  const addPurchasedGoodsRow = () =>
    setPurchasedGoodsRows((prev) => [...prev, newPurchasedGoodsRow()]);

  const removePurchasedGoodsRow = (id: string) =>
    setPurchasedGoodsRows((prev) => prev.filter((r) => r.id !== id));

  const updatePurchasedGoodsRow = (id: string, patch: Partial<PurchasedGoodsRow>) => {
    setPurchasedGoodsRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated: PurchasedGoodsRow = { ...r, ...patch };
        const supplier: Supplier | null | undefined = updated.supplier;
        if (supplier && typeof updated.amountSpent === "number" && updated.amountSpent > 0) {
          updated.emissions = updated.amountSpent * supplier.emission_factor;
        } else {
          updated.emissions = undefined;
        }
        return updated;
      }),
    );
  };

  // Load existing Purchased Goods entries
  useEffect(() => {
    const loadPurchasedGoods = async () => {
      if (!user) return;

      if (companyContext && !counterpartyId) {
        setPurchasedGoodsRows([]);
        setExistingPurchasedGoods([]);
        setIsInitialLoadPurchasedGoods(false);
        return;
      }

      try {
        let query = supabase
          .from("scope3_purchased_goods_services")
          .select("*")
          .eq("user_id", user.id);

        if (companyContext && counterpartyId) {
          query = query.eq("counterparty_id", counterpartyId);
        } else {
          query = query.is("counterparty_id", null);
        }

        const { data, error } = await query.order("created_at", { ascending: false });

        if (error) throw error;

        const loadedRows: PurchasedGoodsRow[] = (data || []).map((entry) => {
          const supplier: Supplier | null =
            entry.supplier_id != null
              ? {
                  id: entry.supplier_id,
                  supplier_name: entry.supplier_name || "",
                  code: entry.supplier_code || "",
                  unit: "PKR",
                  emission_factor: entry.emission_factor,
                }
              : null;

          return {
            id: crypto.randomUUID(),
            dbId: entry.id,
            isExisting: true,
            supplier,
            amountSpent: entry.amount_spent,
            emissions: entry.emissions,
          };
        });

        setExistingPurchasedGoods(loadedRows);
        setPurchasedGoodsRows(loadedRows.length > 0 ? loadedRows : []);
      } catch (error: any) {
        console.error("Error loading purchased goods:", error);
        toast({
          title: "Error",
          description: "Failed to load purchased goods entries",
          variant: "destructive",
        });
      } finally {
        setIsInitialLoadPurchasedGoods(false);
      }
    };

    loadPurchasedGoods();
  }, [user, companyContext, counterpartyId, toast]);

  // Sync purchased goods rows to emissionData
  useEmissionSync({
    category: "purchased_goods_services",
    rows: purchasedGoodsRows,
    isInitialLoad: isInitialLoadPurchasedGoods,
    mapRowToEntry: (r) =>
      r.supplier && typeof r.amountSpent === "number" && r.amountSpent > 0
        ? {
            id: r.id,
            category: "purchased_goods_services",
            activity: `${r.supplier.supplier_name} (${r.supplier.code})`,
            unit: "PKR",
            quantity: r.amountSpent,
            emissions: r.emissions || 0,
          }
        : null,
    setEmissionData,
  });

  // Save Purchased Goods & Services
  const savePurchasedGoods = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please log in to save.",
        variant: "destructive",
      });
      return;
    }

    const newEntries = purchasedGoodsRows.filter(
      (r) =>
        r.supplier &&
        typeof r.amountSpent === "number" &&
        r.amountSpent > 0 &&
        !r.isExisting,
    );

    const changedExisting = purchasedGoodsRows.filter((r) => {
      if (!r.isExisting || !r.dbId) return false;
      const existing = existingPurchasedGoods.find((e) => e.dbId === r.dbId);
      if (!existing) return false;
      return (
        existing.supplier?.id !== r.supplier?.id ||
        existing.amountSpent !== r.amountSpent ||
        existing.emissions !== r.emissions
      );
    });

    if (newEntries.length === 0 && changedExisting.length === 0) {
      toast({
        title: "Nothing to save",
        description: "No new or changed purchased goods entries.",
      });
      return;
    }

    setSavingPurchasedGoods(true);
    try {
      // Insert new entries
      if (newEntries.length > 0) {
        const payload = newEntries.map((r) => ({
          user_id: user.id,
          counterparty_id: companyContext && counterpartyId ? counterpartyId : null,
          supplier_id: r.supplier!.id,
          supplier_name: r.supplier!.supplier_name,
          supplier_code: r.supplier!.code,
          amount_spent: r.amountSpent!,
          emission_factor: r.supplier!.emission_factor,
          emissions: r.emissions!,
        }));

        const { error } = await supabase
          .from("scope3_purchased_goods_services")
          .insert(payload);
        if (error) throw error;
      }

      // Update changed entries
      if (changedExisting.length > 0) {
        const updates = changedExisting.map((r) =>
          supabase
            .from("scope3_purchased_goods_services")
            .update({
              supplier_id: r.supplier!.id,
              supplier_name: r.supplier!.supplier_name,
              supplier_code: r.supplier!.code,
              amount_spent: r.amountSpent!,
              emission_factor: r.supplier!.emission_factor,
              emissions: r.emissions!,
            })
            .eq("id", r.dbId!),
        );
        const results = await Promise.all(updates);
        const updateError = (results as any[]).find((r) => r.error)?.error;
        if (updateError) throw updateError;
      }

      toast({
        title: "Saved",
        description: `Saved ${newEntries.length} new and updated ${changedExisting.length} entries.`,
      });

      // Reload data
      const { data: newData } = await supabase
        .from("scope3_purchased_goods_services")
        .select("*")
        .eq("user_id", user.id)
        .is("counterparty_id", companyContext && counterpartyId ? counterpartyId : null)
        .order("created_at", { ascending: false });

      if (newData) {
        const updatedRows: PurchasedGoodsRow[] = newData.map((entry) => ({
          id: crypto.randomUUID(),
          dbId: entry.id,
          isExisting: true,
          supplier: entry.supplier_id
            ? {
                id: entry.supplier_id,
                supplier_name: entry.supplier_name || "",
                code: entry.supplier_code || "",
                unit: "PKR",
                emission_factor: entry.emission_factor,
              }
            : null,
          amountSpent: entry.amount_spent,
          emissions: entry.emissions,
        }));
        setExistingPurchasedGoods(updatedRows);
        setPurchasedGoodsRows(updatedRows);
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to save",
        variant: "destructive",
      });
    } finally {
      setSavingPurchasedGoods(false);
    }
  };

  // Delete Purchased Goods entry
  const deletePurchasedGoodsRow = async (id: string) => {
    const row = purchasedGoodsRows.find((r) => r.id === id);
    if (!row || !row.dbId) {
      removePurchasedGoodsRow(id);
      return;
    }

    if (!confirm("Are you sure you want to delete this entry? This action cannot be undone.")) {
      return;
    }

    setDeletingPurchasedGoods((prev) => new Set(prev).add(id));
    try {
      const { error } = await supabase
        .from("scope3_purchased_goods_services")
        .delete()
        .eq("id", row.dbId);

      if (error) throw error;

      toast({ title: "Deleted", description: "Entry deleted successfully." });

      setPurchasedGoodsRows((prev) => prev.filter((r) => r.id !== id));
      setExistingPurchasedGoods((prev) => prev.filter((r) => r.id !== id));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete entry",
        variant: "destructive",
      });
    } finally {
      setDeletingPurchasedGoods((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const totalEmissions = purchasedGoodsRows.reduce(
    (sum, r) => sum + (r.emissions || 0),
    0,
  );
  const totalAmount = purchasedGoodsRows.reduce(
    (sum, r) => sum + (r.amountSpent || 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">Purchased Goods &amp; Services</h4>
          <p className="text-sm text-gray-600">
            Add your organization's purchased goods data
          </p>
        </div>
        <Button
          onClick={addPurchasedGoodsRow}
          className="bg-teal-600 hover:bg-teal-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Entry
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center mb-4">
        <Label className="text-gray-500 font-medium">Supplier</Label>
        <Label className="text-gray-500 font-medium">Amount Spent (PKR)</Label>
        <Label className="text-gray-500 font-medium">Emissions</Label>
      </div>

      <div className="space-y-4">
        {purchasedGoodsRows.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center p-4 rounded-lg bg-gray-50 border border-gray-200"
          >
            <div className="w-full">
              <SupplierAutocomplete
                value={r.supplier}
                onSelect={(supplier) => updatePurchasedGoodsRow(r.id, { supplier })}
                placeholder="Search supplier..."
              />
            </div>
            <div className="w-full">
              <Input
                type="number"
                step="any"
                min="0"
                value={r.amountSpent ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "") {
                    updatePurchasedGoodsRow(r.id, { amountSpent: undefined });
                  } else {
                    const numValue = Number(value);
                    if (numValue >= 0) {
                      updatePurchasedGoodsRow(r.id, { amountSpent: numValue });
                    }
                  }
                }}
                placeholder="Enter amount spent"
                className="w-full"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-700 font-medium flex-1">
                {r.emissions !== undefined ? `${r.emissions.toFixed(2)} tCO₂e` : "-"}
              </div>
              {r.isExisting ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => deletePurchasedGoodsRow(r.id)}
                  disabled={deletingPurchasedGoods.has(r.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => removePurchasedGoodsRow(r.id)}
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
          Total Amount Spent:{" "}
          <span className="font-semibold">
            {totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} PKR
          </span>
        </div>
        <div className="text-gray-700 font-medium">
          Total Emissions:{" "}
          <span className="font-semibold">{totalEmissions.toFixed(2)} tCO₂e</span>
        </div>
        {(() => {
          const pendingNew = purchasedGoodsRows.filter(
            (r) =>
              !r.isExisting &&
              r.supplier &&
              typeof r.amountSpent === "number" &&
              r.amountSpent > 0,
          ).length;
          const pendingUpdates = purchasedGoodsRows.filter((r) => {
            if (!r.isExisting || !r.dbId) return false;
            const existing = existingPurchasedGoods.find((e) => e.dbId === r.dbId);
            if (!existing) return false;
            return (
              existing.supplier?.id !== r.supplier?.id ||
              existing.amountSpent !== r.amountSpent ||
              existing.emissions !== r.emissions
            );
          }).length;
          const totalPending = pendingNew + pendingUpdates;
          return (
            <div className="flex items-center gap-2">
              <Button
                onClick={savePurchasedGoods}
                disabled={savingPurchasedGoods || totalPending === 0}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {savingPurchasedGoods ? "Saving..." : `Save (${totalPending})`}
              </Button>
              {onSaveAndNext && (
                <Button variant="outline" onClick={onSaveAndNext} className="border-teal-600 text-teal-600 hover:bg-teal-50">
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



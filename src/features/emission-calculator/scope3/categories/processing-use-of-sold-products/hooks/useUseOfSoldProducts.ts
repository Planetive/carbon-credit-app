import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  loadUseOfSoldProductsRows,
  saveUseOfSoldProductsRows,
} from "../adapters/useOfSoldProductsAdapter";
import {
  addElectricityOtherSourceRow,
  addHybridOtherSourceRow,
  removeElectricityOtherSourceRow,
  removeHybridOtherSourceRow,
  updateElectricityOtherSourceRows,
  updateHybridOtherSourceRows,
  updateUseRows,
} from "../helpers/useCalculations";
import { createUseRow } from "../rowFactories";
import type {
  OtherSourceRow,
  PersistedUseOfSoldProductsRow,
  UseOfSoldProductsRow,
} from "../types";

type UseUseOfSoldProductsOptions = {
  enabled: boolean;
  companyContext?: boolean;
  counterpartyId?: string;
};

export function useUseOfSoldProducts({
  enabled,
  companyContext,
  counterpartyId,
}: UseUseOfSoldProductsOptions) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<UseOfSoldProductsRow[]>([]);
  const [existingRows, setExistingRows] = useState<PersistedUseOfSoldProductsRow[]>(
    [],
  );
  const [saving, setSaving] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    const loadUse = async () => {
      if (!enabled || !user) {
        setIsInitialLoad(false);
        return;
      }

      setIsInitialLoad(true);
      try {
        const loadedRows = await loadUseOfSoldProductsRows({
          userId: user.id,
          companyContext,
          counterpartyId,
        });
        setExistingRows(loadedRows);
        setRows(loadedRows.length > 0 ? loadedRows : []);
      } catch (error: any) {
        console.error("Error loading use of sold products:", error);
        toast({
          title: "Error",
          description: "Failed to load use entries",
          variant: "destructive",
        });
      } finally {
        setIsInitialLoad(false);
      }
    };

    loadUse();
  }, [user, enabled, companyContext, counterpartyId, toast]);

  const save = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save entries",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { insertedRows } = await saveUseOfSoldProductsRows({
        userId: user.id,
        companyContext,
        counterpartyId,
        rows,
        existingRows,
      });

      if (insertedRows) {
        setExistingRows(insertedRows);
      }

      toast({
        title: "Saved",
        description: "Use of sold products saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const totalEmissions = useMemo(
    () => rows.reduce((sum, row) => sum + (row.emissions || 0), 0),
    [rows],
  );

  return {
    rows,
    existingRows,
    saving,
    isInitialLoad,
    totalEmissions,
    addRow: () => setRows((prev) => [...prev, createUseRow()]),
    removeRow: (id: string) =>
      setRows((prev) => prev.filter((row) => row.id !== id)),
    updateRow: (id: string, patch: Partial<UseOfSoldProductsRow>) =>
      setRows((prev) => updateUseRows(prev, id, patch)),
    updateHybridOtherSourceRow: (
      rowId: string,
      sourceId: string,
      patch: Partial<OtherSourceRow>,
    ) =>
      setRows((prev) =>
        updateHybridOtherSourceRows(prev, rowId, sourceId, patch),
      ),
    addHybridOtherSourceRow: (rowId: string) =>
      setRows((prev) => addHybridOtherSourceRow(prev, rowId)),
    removeHybridOtherSourceRow: (rowId: string, sourceId: string) =>
      setRows((prev) => removeHybridOtherSourceRow(prev, rowId, sourceId)),
    updateElectricityOtherSourceRow: (
      rowId: string,
      sourceId: string,
      patch: Partial<OtherSourceRow>,
    ) =>
      setRows((prev) =>
        updateElectricityOtherSourceRows(prev, rowId, sourceId, patch),
      ),
    addElectricityOtherSourceRow: (rowId: string) =>
      setRows((prev) => addElectricityOtherSourceRow(prev, rowId)),
    removeElectricityOtherSourceRow: (rowId: string, sourceId: string) =>
      setRows((prev) => removeElectricityOtherSourceRow(prev, rowId, sourceId)),
    save,
  };
}

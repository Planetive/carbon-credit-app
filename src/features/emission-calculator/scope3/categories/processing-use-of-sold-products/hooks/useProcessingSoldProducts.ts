import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  loadProcessingSoldProductsRows,
  saveProcessingSoldProductsRows,
} from "../adapters/processingSoldProductsAdapter";
import {
  addProcessingOtherSourceRow,
  removeProcessingOtherSourceRow,
  updateProcessingOtherSourceRows,
  updateProcessingRows,
} from "../helpers/processingCalculations";
import { createProcessingRow } from "../rowFactories";
import type {
  OtherSourceRow,
  PersistedProcessingSoldProductsRow,
  ProcessingSoldProductsRow,
} from "../types";

type UseProcessingSoldProductsOptions = {
  enabled: boolean;
  companyContext?: boolean;
  counterpartyId?: string;
};

export function useProcessingSoldProducts({
  enabled,
  companyContext,
  counterpartyId,
}: UseProcessingSoldProductsOptions) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<ProcessingSoldProductsRow[]>([]);
  const [existingRows, setExistingRows] = useState<
    PersistedProcessingSoldProductsRow[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    const loadProcessing = async () => {
      if (!enabled || !user) {
        setIsInitialLoad(false);
        return;
      }

      setIsInitialLoad(true);
      try {
        const loadedRows = await loadProcessingSoldProductsRows({
          userId: user.id,
          companyContext,
          counterpartyId,
        });
        setExistingRows(loadedRows);
        setRows(loadedRows.length > 0 ? loadedRows : []);
      } catch (error: any) {
        console.error("Error loading processing of sold products:", error);
        toast({
          title: "Error",
          description: "Failed to load processing entries",
          variant: "destructive",
        });
      } finally {
        setIsInitialLoad(false);
      }
    };

    loadProcessing();
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
      const { insertedRows } = await saveProcessingSoldProductsRows({
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
        description: "Processing of sold products saved successfully.",
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
    addRow: () => setRows((prev) => [...prev, createProcessingRow()]),
    removeRow: (id: string) =>
      setRows((prev) => prev.filter((row) => row.id !== id)),
    updateRow: (id: string, patch: Partial<ProcessingSoldProductsRow>) =>
      setRows((prev) => updateProcessingRows(prev, id, patch)),
    updateOtherSourceRow: (
      rowId: string,
      sourceId: string,
      patch: Partial<OtherSourceRow>,
    ) =>
      setRows((prev) =>
        updateProcessingOtherSourceRows(prev, rowId, sourceId, patch),
      ),
    addOtherSourceRow: (rowId: string) =>
      setRows((prev) => addProcessingOtherSourceRow(prev, rowId)),
    removeOtherSourceRow: (rowId: string, sourceId: string) =>
      setRows((prev) => removeProcessingOtherSourceRow(prev, rowId, sourceId)),
    save,
  };
}

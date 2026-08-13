import { useCallback, useEffect, useState } from "react";
import {
  fetchClimateTraceVerifiedMenu,
  type ClimateTraceVerifiedEmission,
} from "../api/climateTraceCountryEmissions";

export function useClimateTraceVerifiedEmissions(enabled: boolean) {
  const [rows, setRows] = useState<ClimateTraceVerifiedEmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) {
      setRows([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchClimateTraceVerifiedMenu();
      setRows(data);
    } catch (err) {
      console.error("[useClimateTraceVerifiedEmissions] failed", err);
      setError(
        err instanceof Error
          ? err.message
          : "Could not load Climate TRACE country emissions."
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { rows, loading, error, reload };
}

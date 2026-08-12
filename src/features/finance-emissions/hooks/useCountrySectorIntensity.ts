import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/api/client";
import { fetchSectorsForCountry } from "../api/countrySectorIntensity";
import type { SectorOption } from "../types/countrySectorIntensity";

function formatLoadError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 404) {
      return "Sector list not found on the API. Deploy the country-sector-intensity catalog route.";
    }
    if (err.status === 401) {
      return "Session expired — sign in again to load sectors.";
    }
    return err.message || "Could not load sectors.";
  }
  return err instanceof Error ? err.message : "Could not load sectors.";
}

export function useCountrySectorIntensity(countryName: string, enabled: boolean) {
  const [sectors, setSectors] = useState<SectorOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled || !countryName.trim()) {
      setSectors([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchSectorsForCountry(countryName);
      setSectors(rows);
      if (rows.length === 0) {
        setError("No sector intensities for this country.");
      }
    } catch (err) {
      console.error("[useCountrySectorIntensity] failed", err);
      setError(formatLoadError(err));
      setSectors([]);
    } finally {
      setLoading(false);
    }
  }, [countryName, enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { sectors, loading, error, reload };
}

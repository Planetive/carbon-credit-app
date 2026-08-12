import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "@/api/client";
import { BACKEND_URL } from "@/api/config";
import {
  fetchSovereignCountryOptions,
  resolvePppGdpForCountryName,
} from "../api/pppAdjustedGdp";
import type { SovereignCountryOption } from "../types/pppAdjustedGdp";

function formatLoadError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 404) {
      return "Country list not found on the API. Deploy the latest backend or use local :8000.";
    }
    if (err.status === 401) {
      return "Session expired — sign in again to load countries.";
    }
    if (err.status === 0) {
      return `Cannot reach API at ${BACKEND_URL}. Check that the backend is running.`;
    }
    return err.message || "Could not load country list.";
  }
  return "Could not load country list.";
}

export function useSovereignPppGdp() {
  const [countries, setCountries] = useState<SovereignCountryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchSovereignCountryOptions();
      setCountries(rows);
      if (rows.length === 0) {
        setError("No countries with PPP-GDP data were returned.");
      }
    } catch (err) {
      console.error("[useSovereignPppGdp] failed to load countries", err);
      setError(formatLoadError(err));
      setCountries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const countryMap = useMemo(
    () => new Map(countries.map((c) => [c.countryName, c])),
    [countries]
  );

  const applyCountrySelection = useCallback(
    async (countryName: string) => {
      const cached = countryMap.get(countryName);
      if (cached) {
        return {
          sovereign_country_name: cached.countryName,
          pp_adjusted_gdp: cached.gdpValue,
          ppp_gdp_year: cached.gdpYear,
          ppp_gdp_used_fallback: cached.usedFallback,
        };
      }
      const resolved = await resolvePppGdpForCountryName(countryName);
      if (!resolved) return null;
      return {
        sovereign_country_name: resolved.countryName,
        pp_adjusted_gdp: resolved.value,
        ppp_gdp_year: resolved.year,
        ppp_gdp_used_fallback: resolved.usedFallback,
      };
    },
    [countryMap]
  );

  return {
    countries,
    loading,
    error,
    reload,
    applyCountrySelection,
  };
}

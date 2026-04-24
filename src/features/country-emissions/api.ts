import { supabase } from "@/integrations/supabase/client";
import type { CountryEmissionRecord } from "./types";

export async function fetchAllCountryEmissions(pageSize = 1000): Promise<CountryEmissionRecord[]> {
  let from = 0;
  const allRows: CountryEmissionRecord[] = [];

  while (true) {
    const { data, error } = await supabase.from("country_emissions" as any).select("*").range(from, from + pageSize - 1);
    if (error) {
      throw error;
    }

    const chunk = (data || []) as CountryEmissionRecord[];
    allRows.push(...chunk);

    if (chunk.length < pageSize) break;
    from += pageSize;
  }

  return allRows;
}

import { supabase } from "@/integrations/supabase/client";
import { isJwtAuthEnabled } from "@/api/config";
import { listCountryEmissions } from "@/api/catalog";
import type { CountryEmissionRecord } from "./types";

export async function fetchAllCountryEmissions(pageSize = 1000): Promise<CountryEmissionRecord[]> {
  if (isJwtAuthEnabled()) {
    const allRows: CountryEmissionRecord[] = [];
    let offset = 0;
    const maxPages = 200;
    for (let page = 0; page < maxPages; page += 1) {
      const chunk = (await listCountryEmissions({
        limit: pageSize,
        offset,
      })) as CountryEmissionRecord[];
      if (!chunk.length) break;
      allRows.push(...chunk);
      if (chunk.length < pageSize) break;
      offset += pageSize;
    }
    return allRows;
  }

  let from = 0;
  const allRows: CountryEmissionRecord[] = [];
  let previousPageSignature = "";
  const maxPages = 200;
  let pageCount = 0;

  while (true) {
    const { data, error } = await supabase
      .from("country_emissions")
      .select("*")
      .range(from, from + pageSize - 1);
    if (error) {
      throw error;
    }

    const chunk = (data || []) as CountryEmissionRecord[];
    if (chunk.length === 0) break;

    const first = chunk[0];
    const last = chunk[chunk.length - 1];
    const signature = `${JSON.stringify(first)}|${JSON.stringify(last)}|${chunk.length}`;
    if (signature === previousPageSignature) {
      // Defensive stop in case backend keeps returning the same page window.
      break;
    }
    previousPageSignature = signature;

    allRows.push(...chunk);

    if (chunk.length < pageSize) break;
    from += pageSize;
    pageCount += 1;
    if (pageCount >= maxPages) break;
  }

  return allRows;
}

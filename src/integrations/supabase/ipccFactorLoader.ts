import { tryLoadFactorSheetViaApi } from "@/api/factorDualRead";
import { supabase } from "./client";

export type IpccFactorLoadResult = {
  rows: Record<string, unknown>[];
  source: string;
  attemptErrors: string[];
};

export function tableNameToDatasetCode(tableName: string): string {
  return tableName
    .replace(/^"+|"+$/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Load IPCC / combustion factor sheets via FastAPI factor sheets, with Supabase fallback. */
export async function loadIpccFactorTableRows(
  tableCandidates: readonly string[]
): Promise<IpccFactorLoadResult> {
  const cleanNames = tableCandidates.map((t) => t.replace(/^"+|"+$/g, ""));
  const datasetCodes = [...new Set(cleanNames.map(tableNameToDatasetCode))];

  const apiRows = await tryLoadFactorSheetViaApi({
    datasetCodes,
    nameHints: cleanNames,
  });
  if (apiRows && apiRows.length > 0) {
    return { rows: apiRows, source: `api:${datasetCodes[0]}`, attemptErrors: [] };
  }

  let data: Record<string, unknown>[] | null = null;
  let successfulTable = "";
  const attemptErrors: string[] = [];

  for (const tableName of tableCandidates) {
    const { data: attemptData, error: attemptError } = await supabase
      .from(tableName as never)
      .select("*")
      .limit(1000);

    if (attemptError) {
      attemptErrors.push(`${tableName}: ${attemptError.message}`);
      continue;
    }

    if ((attemptData || []).length > 0) {
      data = (attemptData || []) as Record<string, unknown>[];
      successfulTable = tableName;
      break;
    }

    if (data === null) {
      data = (attemptData || []) as Record<string, unknown>[];
      successfulTable = tableName;
    }
  }

  return {
    rows: data ?? [],
    source: successfulTable,
    attemptErrors,
  };
}

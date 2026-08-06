import { USE_JWT_AUTH } from "./config";
import { getFactorSheet, listFactorDatasets, type FactorDataset } from "./factors";

async function resolveDatasetCode(
  codes: string[],
  nameHints: string[] = []
): Promise<string | null> {
  let datasets: FactorDataset[] = [];
  try {
    datasets = await listFactorDatasets({ active_only: true, limit: 500 });
  } catch {
    return null;
  }

  const byCode = new Map(
    datasets.map((d) => [String(d.code || "").toLowerCase(), d])
  );

  for (const code of codes) {
    const hit = byCode.get(code.toLowerCase());
    if (hit?.code) return hit.code;
  }

  for (const hint of nameHints) {
    const h = hint.toLowerCase();
    const hit = datasets.find(
      (d) =>
        String(d.code || "").toLowerCase().includes(h) ||
        String(d.title || "").toLowerCase().includes(h)
    );
    if (hit?.code) return hit.code;
  }
  return null;
}

/**
 * When JWT auth is on, load a factor sheet via GET /api/v1/factors/sheets/{code}.
 * Returns null when JWT is off, no dataset matched, or the sheet has no rows
 * (so callers can fall back to Supabase).
 */
export async function tryLoadFactorSheetViaApi(opts: {
  datasetCodes: string[];
  nameHints?: string[];
}): Promise<Record<string, unknown>[] | null> {
  if (!USE_JWT_AUTH) return null;

  try {
    const code = await resolveDatasetCode(opts.datasetCodes, opts.nameHints ?? []);
    if (!code) return null;
    const rows = await getFactorSheet(code);
    return rows.length > 0 ? rows : null;
  } catch (err) {
    console.warn("[factorDualRead] API factor load failed; falling back to Supabase", err);
    return null;
  }
}

/**
 * Load and concatenate several datasets (e.g. Fuel EPA 1/2/3).
 * Returns null when JWT is off or no sheet returned rows.
 */
export async function tryLoadFactorSheetsViaApi(
  sheets: { datasetCodes: string[]; nameHints?: string[] }[]
): Promise<Record<string, unknown>[] | null> {
  if (!USE_JWT_AUTH) return null;

  try {
    const all: Record<string, unknown>[] = [];
    for (const sheet of sheets) {
      const code = await resolveDatasetCode(sheet.datasetCodes, sheet.nameHints ?? []);
      if (!code) continue;
      const rows = await getFactorSheet(code);
      if (rows.length > 0) all.push(...rows);
    }
    return all.length > 0 ? all : null;
  } catch (err) {
    console.warn("[factorDualRead] API multi-sheet load failed; falling back to Supabase", err);
    return null;
  }
}

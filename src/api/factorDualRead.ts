import { USE_JWT_AUTH } from "./config";
import { getFactorSheet, listFactorDatasets, type FactorDataset } from "./factors";

let datasetsCache: FactorDataset[] | null = null;
let datasetsInflight: Promise<FactorDataset[]> | null = null;
const sheetCache = new Map<string, Record<string, unknown>[]>();
const sheetInflight = new Map<string, Promise<Record<string, unknown>[]>>();

async function getDatasetsCached(): Promise<FactorDataset[]> {
  if (datasetsCache) return datasetsCache;
  if (!datasetsInflight) {
    datasetsInflight = listFactorDatasets({ active_only: true, limit: 500 })
      .then((datasets) => {
        datasetsCache = datasets;
        return datasets;
      })
      .finally(() => {
        datasetsInflight = null;
      });
  }
  return datasetsInflight;
}

async function getFactorSheetCached(code: string): Promise<Record<string, unknown>[]> {
  const hit = sheetCache.get(code);
  if (hit) return hit;
  const existing = sheetInflight.get(code);
  if (existing) return existing;
  const promise = getFactorSheet(code)
    .then((rows) => {
      sheetCache.set(code, rows);
      return rows;
    })
    .finally(() => {
      sheetInflight.delete(code);
    });
  sheetInflight.set(code, promise);
  return promise;
}

async function resolveDatasetCode(
  codes: string[],
  nameHints: string[] = []
): Promise<string | null> {
  let datasets: FactorDataset[] = [];
  try {
    datasets = await getDatasetsCached();
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
    const rows = await getFactorSheetCached(code);
    return rows.length > 0 ? rows : null;
  } catch (err) {
    console.warn("[factorDualRead] API factor load failed; falling back to Supabase", err);
    return null;
  }
}

/**
 * Load and concatenate several datasets (e.g. Fuel EPA 1/2/3).
 * Returns null when JWT is off or no sheet returned rows.
 * Sheets resolve in parallel and reuse dataset/sheet caches.
 */
export async function tryLoadFactorSheetsViaApi(
  sheets: { datasetCodes: string[]; nameHints?: string[] }[]
): Promise<Record<string, unknown>[] | null> {
  if (!USE_JWT_AUTH) return null;

  try {
    // Warm dataset list once, then fetch all sheets concurrently.
    await getDatasetsCached();
    const parts = await Promise.all(
      sheets.map(async (sheet) => {
        const code = await resolveDatasetCode(sheet.datasetCodes, sheet.nameHints ?? []);
        if (!code) return [] as Record<string, unknown>[];
        return getFactorSheetCached(code);
      })
    );
    const all = parts.flat().filter((row) => row && Object.keys(row).length > 0);
    return all.length > 0 ? all : null;
  } catch (err) {
    console.warn("[factorDualRead] API multi-sheet load failed; falling back to Supabase", err);
    return null;
  }
}

import { USE_JWT_AUTH } from "./config";
import {
  listBess,
  listCarbonCreditMarkets,
  listComplianceMechanisms,
  listCcusManagementStrategies,
  listCcusPolicies,
  listCcusProjects,
  listGlobalProjects,
  listSuppliers,
} from "./catalog";

const PAGE = 500;

async function fetchAllPages(
  fetcher: (params: { limit: number; offset: number }) => Promise<Record<string, unknown>[]>
): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  let offset = 0;
  for (;;) {
    const chunk = await fetcher({ limit: PAGE, offset });
    if (!chunk.length) break;
    all.push(...chunk);
    if (chunk.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

/** Returns null when JWT is off so callers keep Supabase. */
export async function tryLoadCatalogViaApi(
  kind:
    | "bess"
    | "compliance"
    | "markets"
    | "ccus"
    | "global-projects"
    | "ccus-policies"
    | "ccus-management-strategies"
    | "suppliers",
  opts?: { q?: string; limit?: number }
): Promise<Record<string, unknown>[] | null> {
  if (!USE_JWT_AUTH) return null;
  try {
    switch (kind) {
      case "bess":
        return await fetchAllPages(listBess);
      case "compliance":
        return await fetchAllPages(listComplianceMechanisms);
      case "markets":
        return await fetchAllPages(listCarbonCreditMarkets);
      case "ccus":
        return await fetchAllPages(listCcusProjects);
      case "global-projects":
        return await fetchAllPages(listGlobalProjects);
      case "ccus-policies":
        return await fetchAllPages(listCcusPolicies);
      case "ccus-management-strategies":
        return await fetchAllPages(listCcusManagementStrategies);
      case "suppliers":
        return await listSuppliers({
          q: opts?.q,
          limit: opts?.limit ?? 50,
          offset: 0,
        });
      default:
        return null;
    }
  } catch (err) {
    console.warn(`[catalogDualRead] ${kind} API load failed; falling back to Supabase`, err);
    return null;
  }
}

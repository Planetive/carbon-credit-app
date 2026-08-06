import { apiFetch } from "./client";

function withPaging(path: string, params?: { limit?: number; offset?: number }) {
  const search = new URLSearchParams();
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.offset != null) search.set("offset", String(params.offset));
  const q = search.toString() ? `?${search}` : "";
  return `${path}${q}`;
}

export type CatalogTableInfo = {
  route: string;
  schema: string;
  table: string;
  exists: boolean;
};

export function listCatalogTables() {
  return apiFetch<CatalogTableInfo[]>("/api/v1/catalog/tables", { method: "GET" });
}

/** Read-only catalog — rows as raw dicts (schemas vary). */
export function listCountryEmissions(params?: { limit?: number; offset?: number }) {
  return apiFetch<Record<string, unknown>[]>(
    withPaging("/api/v1/catalog/country-emissions", params),
    { method: "GET" }
  );
}

export function listGlobalProjects(params?: { limit?: number; offset?: number }) {
  return apiFetch<Record<string, unknown>[]>(
    withPaging("/api/v1/catalog/global-projects", params),
    { method: "GET" }
  );
}

export function listCcusProjects(params?: { limit?: number; offset?: number }) {
  return apiFetch<Record<string, unknown>[]>(
    withPaging("/api/v1/catalog/ccus-projects", params),
    { method: "GET" }
  );
}

export function listBess(params?: { limit?: number; offset?: number }) {
  return apiFetch<Record<string, unknown>[]>(
    withPaging("/api/v1/catalog/bess", params),
    { method: "GET" }
  );
}

export function listCarbonCreditMarkets(params?: { limit?: number; offset?: number }) {
  return apiFetch<Record<string, unknown>[]>(
    withPaging("/api/v1/catalog/carbon-credit-markets", params),
    { method: "GET" }
  );
}

export function listComplianceMechanisms(params?: { limit?: number; offset?: number }) {
  return apiFetch<Record<string, unknown>[]>(
    withPaging("/api/v1/catalog/compliance-mechanisms", params),
    { method: "GET" }
  );
}

export function listCcusPolicies(params?: { limit?: number; offset?: number }) {
  return apiFetch<Record<string, unknown>[]>(
    withPaging("/api/v1/catalog/ccus-policies", params),
    { method: "GET" }
  );
}

export function listCcusManagementStrategies(params?: {
  limit?: number;
  offset?: number;
}) {
  return apiFetch<Record<string, unknown>[]>(
    withPaging("/api/v1/catalog/ccus-management-strategies", params),
    { method: "GET" }
  );
}

/** KEEP table `suppliers` — search by name. */
export function listSuppliers(params?: {
  q?: string;
  limit?: number;
  offset?: number;
}) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.offset != null) search.set("offset", String(params.offset));
  const q = search.toString() ? `?${search}` : "";
  return apiFetch<Record<string, unknown>[]>(`/api/v1/catalog/suppliers${q}`, {
    method: "GET",
  });
}

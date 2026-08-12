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

/** ref.ppp_adjusted_gdp — sovereign PPP-adjusted GDP by country/year column. */
export function listPppAdjustedGdp(params?: { limit?: number; offset?: number }) {
  return apiFetch<Record<string, unknown>[]>(
    withPaging("/api/v1/catalog/ppp-adjusted-gdp", params),
    { method: "GET" }
  );
}

/** ref.country_sector_intensity — kgCO2e per PKR by country and sector. */
export function listCountrySectorIntensity(params?: {
  country_name?: string;
  country_code?: string;
  limit?: number;
  offset?: number;
}) {
  const search = new URLSearchParams();
  if (params?.country_name) search.set("country_name", params.country_name);
  if (params?.country_code) search.set("country_code", params.country_code);
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.offset != null) search.set("offset", String(params.offset));
  const q = search.toString() ? `?${search}` : "";
  return apiFetch<Record<string, unknown>[]>(
    `/api/v1/catalog/country-sector-intensity${q}`,
    { method: "GET" }
  );
}

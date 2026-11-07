import { apiFetch } from "./client";

export type FactorLibraryClass = "physical" | "economic" | "building" | "vehicle";

export type ApprovedLibraryFactor = {
  id: string;
  publication_id: string;
  dataset_code: string;
  dataset_version: string;
  category: string;
  library_class: FactorLibraryClass;
  geography: string;
  country_code: string;
  sector_or_activity: string;
  activity_key: string;
  factor_value: number;
  unit: string;
  numerator_unit: string;
  denominator_unit: string;
  applicable_year: number;
  publication_year: number;
  gas: string;
  source_organization: string;
  source_document: string;
  source_url: string;
  provenance: string;
  license_name: string;
  permitted_use: string;
  currency_code: string;
  price_year: number | null;
  status: string;
};

export type FactorMatchResponse = {
  status: string;
  message: string;
  factors: ApprovedLibraryFactor[];
  silent_substitution: boolean;
};

export const NO_VERIFIED_FACTOR = "No verified factor available";

export function matchApprovedFactors(params: {
  library_class: FactorLibraryClass;
  geography: string;
  activity_key: string;
  reporting_year: number;
  unit?: string;
  currency_code?: string;
  price_year?: number | null;
}) {
  const search = new URLSearchParams();
  search.set("library_class", params.library_class);
  search.set("geography", params.geography);
  search.set("activity_key", params.activity_key);
  search.set("reporting_year", String(params.reporting_year));
  if (params.unit) search.set("unit", params.unit);
  if (params.currency_code) search.set("currency_code", params.currency_code);
  if (params.price_year != null) search.set("price_year", String(params.price_year));
  return apiFetch<FactorMatchResponse>(`/api/v1/factor-library/match?${search}`, { method: "GET" });
}

export function submitManualFactor(body: Record<string, unknown>) {
  return apiFetch<{ status: string; entry: ApprovedLibraryFactor }>(
    "/api/v1/factor-library/manual-submissions",
    { method: "POST", body }
  );
}

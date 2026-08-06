import { apiFetch } from "./client";

export type CounterpartyOut = {
  id: string;
  user_id: string;
  organization_id?: string | null;
  name: string;
  sector: string;
  geography: string;
  counterparty_type: string;
  created_at: string;
  updated_at: string;
};

export type ExposureOut = {
  id: string;
  user_id: string;
  organization_id?: string | null;
  counterparty_id: string;
  exposure_id: string;
  amount_pkr: number;
  probability_of_default: number;
  loss_given_default: number;
  tenor_months: number;
  created_at: string;
  updated_at: string;
};

export type CompanyEmissionOut = {
  id: string;
  user_id: string;
  counterparty_id: string | null;
  is_bank_emissions: boolean;
  scope1_emissions: number;
  scope2_emissions: number;
  scope3_emissions: number;
  total_emissions: number;
  calculation_source?: string | null;
  calculation_date?: string | null;
  status: string;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type QuestionnaireOut = {
  id: string;
  user_id: string;
  counterparty_id: string;
  corporate_structure?: string | null;
  has_emissions?: boolean | null;
  scope1_emissions?: number | null;
  scope2_emissions?: number | null;
  scope3_emissions?: number | null;
  verification_status?: string | null;
  verifier_name?: string | null;
  evic?: number | null;
  total_equity_plus_debt?: number | null;
  share_price?: number | null;
  outstanding_shares?: number | null;
  total_debt?: number | null;
  minority_interest?: number | null;
  preferred_stock?: number | null;
  total_equity?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type QuestionnaireWriteBody = {
  corporate_structure?: string | null;
  has_emissions?: boolean | string | null;
  scope1_emissions?: number | null;
  scope2_emissions?: number | null;
  scope3_emissions?: number | null;
  verification_status?: string | null;
  verifier_name?: string | null;
  evic?: number | null;
  total_equity_plus_debt?: number | null;
  share_price?: number | null;
  outstanding_shares?: number | null;
  total_debt?: number | null;
  minority_interest?: number | null;
  preferred_stock?: number | null;
  total_equity?: number | null;
  /** Ignored by backend identity; path param wins */
  counterparty_id?: string;
};

export function listCounterparties() {
  return apiFetch<CounterpartyOut[]>("/api/v1/counterparties", { method: "GET" });
}

export function createCounterpartyApi(body: {
  name: string;
  sector: string;
  geography: string;
  counterparty_type?: string;
  exposure?: {
    exposure_id: string;
    amount_pkr?: number;
    probability_of_default: number;
    loss_given_default: number;
    tenor_months: number;
  };
}) {
  return apiFetch<CounterpartyOut>("/api/v1/counterparties", {
    method: "POST",
    body,
  });
}

export function getCounterpartyApi(id: string) {
  return apiFetch<CounterpartyOut>(`/api/v1/counterparties/${id}`, { method: "GET" });
}

export function patchCounterpartyApi(
  id: string,
  body: Partial<Pick<CounterpartyOut, "name" | "sector" | "geography" | "counterparty_type">>
) {
  return apiFetch<CounterpartyOut>(`/api/v1/counterparties/${id}`, {
    method: "PATCH",
    body,
  });
}

export function deleteCounterpartyApi(id: string) {
  return apiFetch<{ status?: string; message?: string }>(`/api/v1/counterparties/${id}`, {
    method: "DELETE",
  });
}

export function listExposures(counterpartyId?: string) {
  const q = counterpartyId
    ? `?counterparty_id=${encodeURIComponent(counterpartyId)}`
    : "";
  return apiFetch<ExposureOut[]>(`/api/v1/exposures${q}`, { method: "GET" });
}

export function createExposureApi(body: {
  counterparty_id: string;
  exposure_id: string;
  amount_pkr?: number;
  probability_of_default: number;
  loss_given_default: number;
  tenor_months: number;
}) {
  return apiFetch<ExposureOut>("/api/v1/exposures", { method: "POST", body });
}

export function patchExposureApi(
  id: string,
  body: Partial<{
    exposure_id: string;
    amount_pkr: number;
    probability_of_default: number;
    loss_given_default: number;
    tenor_months: number;
  }>
) {
  return apiFetch<ExposureOut>(`/api/v1/exposures/${id}`, {
    method: "PATCH",
    body,
  });
}

export function deleteExposureApi(id: string) {
  return apiFetch<{ status?: string; message?: string }>(`/api/v1/exposures/${id}`, {
    method: "DELETE",
  });
}

export function listCompanyEmissions(params?: {
  counterparty_id?: string;
  status?: string;
}) {
  const search = new URLSearchParams();
  if (params?.counterparty_id) search.set("counterparty_id", params.counterparty_id);
  if (params?.status) search.set("status", params.status);
  const q = search.toString() ? `?${search.toString()}` : "";
  return apiFetch<CompanyEmissionOut[]>(`/api/v1/company-emissions${q}`, {
    method: "GET",
  });
}

export function patchCompanyEmissionApi(
  id: string,
  body: Partial<{
    scope1_emissions: number;
    scope2_emissions: number;
    scope3_emissions: number;
    total_emissions: number;
    status: string;
    notes: string | null;
  }>
) {
  return apiFetch<CompanyEmissionOut>(`/api/v1/company-emissions/${id}`, {
    method: "PATCH",
    body,
  });
}

export function getCounterpartyQuestionnaireApi(counterpartyId: string) {
  return apiFetch<QuestionnaireOut | null>(
    `/api/v1/counterparties/${counterpartyId}/questionnaire`,
    { method: "GET" }
  );
}

export function upsertCounterpartyQuestionnaireApi(
  counterpartyId: string,
  body: QuestionnaireWriteBody
) {
  return apiFetch<QuestionnaireOut>(
    `/api/v1/counterparties/${counterpartyId}/questionnaire`,
    { method: "PUT", body }
  );
}

export function listQuestionnairesApi(counterpartyId?: string) {
  const q = counterpartyId
    ? `?counterparty_id=${encodeURIComponent(counterpartyId)}`
    : "";
  return apiFetch<QuestionnaireOut[]>(`/api/v1/questionnaires${q}`, {
    method: "GET",
  });
}

export function patchQuestionnaireApi(
  id: string,
  body: QuestionnaireWriteBody
) {
  return apiFetch<QuestionnaireOut>(`/api/v1/questionnaires/${id}`, {
    method: "PATCH",
    body,
  });
}

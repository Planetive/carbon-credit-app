import { apiFetch } from "@/api/client";

export type UopOverlapReview = {
  id: string;
  uop_financing_instance_id: string;
  general_purpose_financing_instance_id?: string | null;
  reporting_year: string;
  status: "pending_review" | "approved" | "rejected" | "cancelled";
  documented_allocation_notes?: string | null;
  evidence_reference?: string | null;
  evidence_is_verified?: boolean;
  uop_outstanding_adjustment?: number | null;
  general_purpose_outstanding_adjustment?: number | null;
  adjustment_basis?: string | null;
  review_notes?: string | null;
};

export async function fetchOverlapCandidates(params: {
  uop_financing_instance_id: string;
  reporting_year: string;
  counterparty_id?: string;
  issuer_name?: string;
}) {
  const query = new URLSearchParams({
    uop_financing_instance_id: params.uop_financing_instance_id,
    reporting_year: params.reporting_year,
  });
  if (params.counterparty_id) query.set("counterparty_id", params.counterparty_id);
  if (params.issuer_name) query.set("issuer_name", params.issuer_name);
  return apiFetch<{ items: Array<Record<string, unknown>>; reviews: UopOverlapReview[] }>(
    `/api/v1/uop/overlap-reviews/candidates?${query.toString()}`
  );
}

export async function createOverlapReview(body: {
  uop_financing_instance_id: string;
  reporting_year: string;
  general_purpose_financing_instance_id?: string;
  counterparty_id?: string;
  issuer_name?: string;
  documented_allocation_notes?: string;
  evidence_reference?: string;
  uop_outstanding_adjustment?: number | null;
  general_purpose_outstanding_adjustment?: number | null;
  adjustment_basis?: string;
}) {
  return apiFetch<UopOverlapReview>("/api/v1/uop/overlap-reviews", {
    method: "POST",
    body,
  });
}

export async function decideOverlapReview(
  reviewId: string,
  decision: "approved" | "rejected" | "cancelled",
  review_notes?: string
) {
  return apiFetch<UopOverlapReview>(`/api/v1/uop/overlap-reviews/${reviewId}/decision`, {
    method: "POST",
    body: { decision, review_notes },
  });
}

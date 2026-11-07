import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormattedNumberInput } from "@/components/shared/finance/FormattedNumberInput";
import { FIELD_INPUT, FormField, InputSection } from "../forms/InputLayout";
import {
  createOverlapReview,
  decideOverlapReview,
  type UopOverlapReview,
} from "@/api/uopOverlapReviews";
import { ApiError } from "@/api/client";
import type { UopDraft } from "./types";

/**
 * PCAF §5.7 pp.107–108 overlap review UI.
 * Documents evidenced splits. Does not silently subtract emissions.
 */
export function OverlapReviewPanel({
  draft,
  overlap,
  counterpartyId,
}: {
  draft: UopDraft;
  overlap: Record<string, unknown> | null | undefined;
  counterpartyId?: string | null;
}) {
  const detected = Boolean(overlap?.detected);
  const items = Array.isArray(overlap?.items) ? (overlap?.items as Array<Record<string, unknown>>) : [];
  const reviews = Array.isArray(overlap?.reviews) ? (overlap?.reviews as UopOverlapReview[]) : [];
  const [notes, setNotes] = useState("");
  const [evidence, setEvidence] = useState("");
  const [uopAdj, setUopAdj] = useState<number | null>(null);
  const [gpAdj, setGpAdj] = useState<number | null>(null);
  const [basis, setBasis] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  if (!detected && reviews.length === 0) return null;

  const submit = async () => {
    if (!draft.financingInstanceId || !draft.reportingYear) return;
    setBusy(true);
    setMessage("");
    try {
      const gpId = String(items[0]?.financing_instance_id || "");
      await createOverlapReview({
        uop_financing_instance_id: draft.financingInstanceId,
        reporting_year: draft.reportingYear,
        general_purpose_financing_instance_id: gpId || undefined,
        counterparty_id: counterpartyId || undefined,
        issuer_name: draft.issuerName || undefined,
        documented_allocation_notes: notes,
        evidence_reference: evidence,
        uop_outstanding_adjustment: uopAdj,
        general_purpose_outstanding_adjustment: gpAdj,
        adjustment_basis: basis,
      });
      setMessage("Review saved as pending. Emissions are not changed automatically.");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Could not save overlap review.");
    } finally {
      setBusy(false);
    }
  };

  const decide = async (reviewId: string, decision: "approved" | "rejected") => {
    setBusy(true);
    setMessage("");
    try {
      await decideOverlapReview(reviewId, decision);
      setMessage(decision === "approved" ? "Review approved. No automatic subtraction was applied." : "Review rejected.");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Could not update review.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <InputSection
      title="Same-issuer overlap review"
      description="When Use of Proceeds and ordinary financing exist for the same issuer in the same year, document the evidenced split. This does not invent or silently subtract emissions."
      tooltip="PCAF 2025 Part A §5.7 pages 107–108"
    >
      {items.length > 0 && (
        <ul className="text-sm text-[#334155] space-y-1 mb-3">
          {items.map((item, index) => (
            <li key={String(item.financing_instance_id || index)}>
              General-purpose financing {String(item.financing_instance_id || "unknown")}
              {item.financed_emissions != null ? ` · ${String(item.financed_emissions)} tCO₂e` : ""}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-[#64748B] mb-3">
        {String(overlap?.impact_note || "Approved reviews document an evidenced split. Reported emissions are not silently redistributed.")}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Documented allocation notes" span>
          <Input className={FIELD_INPUT} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>
        <FormField label="Evidence reference" tooltip="Reference only — entering a name does not verify the document." span>
          <Input className={FIELD_INPUT} value={evidence} onChange={(e) => setEvidence(e.target.value)} />
          <p className="text-xs text-[#94A3B8]">Reference only — not verified</p>
        </FormField>
        <FormField label="UoP outstanding adjustment" unit={draft.currency}>
          <FormattedNumberInput value={uopAdj} placeholder="" onChange={setUopAdj} onClear={() => setUopAdj(null)} />
        </FormField>
        <FormField label="General-purpose outstanding adjustment" unit={draft.currency}>
          <FormattedNumberInput value={gpAdj} placeholder="" onChange={setGpAdj} onClear={() => setGpAdj(null)} />
        </FormField>
        <FormField label="Adjustment basis" span>
          <Input className={FIELD_INPUT} value={basis} onChange={(e) => setBasis(e.target.value)} placeholder="How the evidenced split was derived" />
        </FormField>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="h-9" disabled={busy} onClick={() => void submit()}>
          Save pending review
        </Button>
      </div>
      {reviews.length > 0 && (
        <div className="mt-4 space-y-2">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-lg border border-[#E8EEF0] bg-white px-3 py-2 text-sm">
              <p className="font-medium text-[#0F172A]">{review.status.replace("_", " ")}</p>
              <p className="text-xs text-[#64748B]">{review.evidence_reference || review.documented_allocation_notes || "No evidence text"}</p>
              {review.status === "pending_review" && (
                <div className="mt-2 flex gap-2">
                  <Button type="button" className="h-8 bg-[#0F6E56] hover:bg-[#0C5A47]" disabled={busy} onClick={() => void decide(review.id, "approved")}>
                    Approve
                  </Button>
                  <Button type="button" variant="outline" className="h-8" disabled={busy} onClick={() => void decide(review.id, "rejected")}>
                    Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {message ? <p className="mt-2 text-sm text-[#334155]">{message}</p> : null}
    </InputSection>
  );
}

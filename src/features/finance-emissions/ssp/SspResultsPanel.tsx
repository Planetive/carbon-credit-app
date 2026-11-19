import { useState } from "react";
import { AlertCircle, Calculator, ChevronDown, ChevronRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/api/client";
import { calculateSsp, type SspCalculateResponse } from "@/api/sspDrafts";
import { questionnairePayload } from "./draftPersistence";
import { mapSspPreviewResponse, type SspPreviewLayerRow, type SspPreviewViewModel } from "./mapSspPreviewResponse";
import { canPreviewCalculateSsp, sspPreviewCalculateBlockers } from "./previewGate";
import {
  SSP_REPORTABLE_BLOCKED_MESSAGE,
  canCalculateSsp,
  canSaveReportableSsp,
  canSubmitReportableSspSave,
  sspReportableSaveBlockers,
  type SspCalculationResult,
} from "./reportableGuard";
import { sumLoanCoaInPool } from "./state";
import { STRUCTURE_TYPE_LABELS } from "./copy";
import type { SspDraft } from "./types";

function formatMaybe(value: number | null | undefined, digits = 4): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
}

const PREVIEW_ONLY_NOTICE =
  "Calculation preview only. Results have not been added to your portfolio.";

/** Shown beside calculation results when reportable Save is disabled. */
export function SspPreviewNotice({ compact = false }: { compact?: boolean }) {
  if (!canCalculateSsp()) {
    return (
      <p className={compact ? "text-[11px] text-slate-500" : "text-xs text-slate-500"}>
        Finish the questionnaire to calculate financed emissions.
      </p>
    );
  }
  if (canSaveReportableSsp()) return null;
  return (
    <p
      className={compact ? "text-[11px] text-slate-500" : "text-xs text-slate-500"}
      data-testid="ssp-preview-only-notice"
    >
      {PREVIEW_ONLY_NOTICE}
    </p>
  );
}

/** @deprecated Kept for import compatibility — no longer shows internal banners. */
export function SspBackendUnavailableBanner() {
  return null;
}

function LayerTable({ title, factorLabel, rows }: { title: string; factorLabel?: string; rows: SspPreviewLayerRow[] }) {
  if (!rows.length) return null;
  return (
    <div className="rounded-lg border border-[#E8EEF0] overflow-hidden">
      <div className="px-3 py-2 bg-[#F8FAFC] text-xs font-medium text-[#64748B] uppercase tracking-wide">{title}</div>
      <div className="divide-y divide-[#E8EEF0]">
        {rows.map((row) => (
          <div key={row.id} className="px-3 py-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <div className="min-w-0">
              <p className="font-medium text-[#0F172A]">{row.label}</p>
              {row.detail ? <p className="text-xs text-[#94A3B8]">{row.detail}</p> : null}
            </div>
            <div className="text-right text-[#0F172A]">
              <p>{formatMaybe(row.financedEmissions)} tCO₂e</p>
              {factorLabel && row.factor != null ? (
                <p className="text-xs text-[#64748B]">
                  {factorLabel} {formatMaybe(row.factor, 6)}
                </p>
              ) : null}
              {row.dataQualityScore != null ? (
                <p className="text-xs text-[#64748B]">DQ {formatMaybe(row.dataQualityScore, 2)}</p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SspResultsPanel({
  draft,
  counterpartyId,
}: {
  draft: SspDraft;
  counterpartyId?: string | null;
}) {
  const [openHow, setOpenHow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<SspPreviewViewModel | null>(null);
  const [rawResult, setRawResult] = useState<SspCalculationResult | null>(null);
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);

  const blockers = sspPreviewCalculateBlockers(draft);
  const calculateOk = canPreviewCalculateSsp(draft);
  const saveReady = canSubmitReportableSspSave(draft, rawResult);
  const saveOk = canSaveReportableSsp() && saveReady;

  const bankInvestment = draft.holdings.reduce((sum, row) => {
    return sum + (row.bankOutstandingInvestment != null ? row.bankOutstandingInvestment : 0);
  }, 0);

  const run = async (persistReportable: boolean) => {
    if (!calculateOk || busy) {
      setError(blockers[0] || "Calculate is not available for this deal.");
      return;
    }
    if (persistReportable && !saveReady) {
      setError(sspReportableSaveBlockers(draft, rawResult).join(", ") || SSP_REPORTABLE_BLOCKED_MESSAGE);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response: SspCalculateResponse = await calculateSsp({
        financing_instance_id: draft.financingInstanceId || undefined,
        deal_id: draft.dealId || undefined,
        holding_id: draft.holdingId || undefined,
        counterparty_id: counterpartyId || undefined,
        persist_preview: false,
        persist_reportable: persistReportable,
        expected_fingerprint: persistReportable ? rawResult?.calculation_fingerprint : undefined,
        holding_client_id: draft.holdings[0]?.holdingId || undefined,
        draft: questionnairePayload(draft),
      });
      if (
        !persistReportable &&
        (response?.is_reportable === true || response?.include_in_portfolio === true)
      ) {
        setError("Server returned a reportable/portfolio flag; preview results were discarded.");
        setPreview(null);
        setRawResult(null);
        return;
      }
      setRawResult(response);
      setPreview(mapSspPreviewResponse(response));
      if (response.persisted_reportable && response.reportable_record_id) {
        setSavedRecordId(String(response.reportable_record_id));
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : persistReportable
              ? "The securitization result could not be saved as reportable."
              : "The securitization preview calculation could not be completed.";
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4" data-testid="ssp-results-panel">
      <div className="rounded-xl border border-[#DCEAE2] bg-white px-5 py-4 space-y-3">
        <SspPreviewNotice />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-[#64748B]">Deal</p>
            <p className="text-lg font-semibold text-[#0F172A]">{draft.deal.dealName || "Unnamed deal"}</p>
            <p className="text-sm text-[#64748B]">
              {STRUCTURE_TYPE_LABELS[draft.deal.structureType] || draft.deal.structureType || "Structure pending"} ·{" "}
              {draft.deal.reportingYear || "—"} · {draft.deal.currency || "—"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-[#64748B]">Bank investment</p>
            <p className="text-lg font-semibold text-[#0F172A]">
              {formatMaybe(bankInvestment || null)} {draft.deal.currency}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="rounded-lg bg-[#F8FAFC] px-3 py-2" data-testid="ssp-preview-total">
            <p className="text-xs text-[#64748B]">Total financed emissions</p>
            <p className="font-semibold text-[#0F172A]">
              {preview ? `${formatMaybe(preview.financedEmissions)} tCO₂e` : "—"}
            </p>
          </div>
          <div className="rounded-lg bg-[#F8FAFC] px-3 py-2" data-testid="ssp-preview-dq">
            <p className="text-xs text-[#64748B]">Data-quality score</p>
            <p className="font-semibold text-[#0F172A]">
              {preview ? formatMaybe(preview.dataQualityScore, 2) : "—"}
            </p>
          </div>
          <div className="rounded-lg bg-[#F8FAFC] px-3 py-2">
            <p className="text-xs text-[#64748B]">IAF · TAF</p>
            <p className="font-semibold text-[#0F172A]">
              {preview
                ? `${formatMaybe(preview.iaf, 6)} · ${formatMaybe(preview.taf, 6)}`
                : "—"}
            </p>
          </div>
        </div>

        {preview?.status === "complete" && !preview.missingOrBlocked ? (
          <div className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#475569]" data-testid="ssp-preview-scopes">
            <p className="font-medium text-[#0F172A] mb-1">Scope breakdown (where available)</p>
            <p>
              Scope 1: {formatMaybe(preview.scopeBreakdown.scope1)} · Scope 2:{" "}
              {formatMaybe(preview.scopeBreakdown.scope2)} · Scope 3:{" "}
              {formatMaybe(preview.scopeBreakdown.scope3)} tCO₂e
            </p>
            <p className="text-xs text-[#94A3B8] mt-1">
              Pool financed emissions {formatMaybe(preview.poolFinancedEmissions)} tCO₂e before investment
              attribution.
            </p>
          </div>
        ) : preview ? (
          <div
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
            data-testid="ssp-preview-blocked"
          >
            <p className="font-semibold">
              {preview.status === "unsupported" ? "Unsupported structure" : "Incomplete calculation"}
            </p>
            <p className="mt-1">
              {preview.message || preview.code || "The backend could not complete this preview."}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[#E2E8F0] px-3 py-2 text-sm text-[#64748B]">
            Scope breakdown and attribution factors appear here after you run Calculate preview.
          </div>
        )}

        {preview?.status === "complete" ? (
          <div className="space-y-2" data-testid="ssp-preview-layers">
            <LayerTable title="Collateral (absolute × CAF)" factorLabel="CAF" rows={preview.layers.collateral} />
            <LayerTable title="Loans" rows={preview.layers.loans} />
            <LayerTable title="Pools (× LAF)" factorLabel="LAF" rows={preview.layers.pools} />
            {preview.layers.poolOfPools.length ? (
              <>
                <LayerTable title="Pool of pools (experimental)" rows={preview.layers.poolOfPools} />
                <p className="text-xs text-amber-800 px-1">
                  Pool-of-pools preview uses composition weights from PCAF Table 5.8-3 and is not yet
                  available for portfolio Save.
                </p>
              </>
            ) : null}
            <LayerTable title="Tranches (× TAF)" factorLabel="TAF" rows={preview.layers.tranches} />
            <LayerTable title="Holdings (× IAF)" factorLabel="IAF" rows={preview.layers.holdings} />
          </div>
        ) : null}

        {preview?.factorProvenance ? (
          <div className="rounded-lg bg-[#F8FAFC] px-3 py-2 text-xs text-[#64748B] space-y-1" data-testid="ssp-preview-provenance">
            <p>
              Methodology: {preview.factorProvenance.methodologyVersion || "—"} ·{" "}
              {preview.factorProvenance.pcafRef || "PCAF §5.8"}
            </p>
            <p>
              Path: {preview.factorProvenance.emissionsPath || draft.emissionsPath || "—"}
              {preview.factorProvenance.collateralMethods.length
                ? ` · Methods: ${preview.factorProvenance.collateralMethods.join(", ")}`
                : ""}
            </p>
            {preview.factorProvenance.warnings.map((w) => (
              <p key={w} className="text-amber-800">
                {w}
              </p>
            ))}
            {preview.factorProvenance.notes.map((n) => (
              <p key={n}>{n}</p>
            ))}
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-[#E8EEF0] bg-white">
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-3 text-left"
          onClick={() => setOpenHow((v) => !v)}
        >
          <span className="font-medium text-[#0F172A]">How was this calculated?</span>
          {openHow ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        {openHow && (
          <div className="border-t border-[#E8EEF0] px-4 py-3 space-y-3 text-sm text-[#475569]">
            <p>
              Attribution path (PCAF Table 5.8-3): collateral → loan → pool
              {draft.deal.hasPoolOfPools === "yes" ? " → pool of pools" : ""}
              {draft.deal.hasTranches === "yes" ? " → tranche" : ""} → bank investment.
            </p>
            <p>
              Emissions path selected:{" "}
              <span className="font-medium text-[#0F172A]">
                {draft.emissionsPath === "lookthrough"
                  ? "Look-through using underlying PCAF asset-class methods"
                  : draft.emissionsPath === "reported_pool"
                    ? "Reported pool emissions (evidenced)"
                    : "Not chosen"}
              </span>
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Collateral records: {draft.collateral.length} · Loans: {draft.loans.length} · Pools: {draft.pools.length}
              </li>
              <li>Tranches: {draft.tranches.length || (draft.deal.hasTranches === "no" ? "untranched" : 0)}</li>
              <li>Holdings: {draft.holdings.length}</li>
              {draft.pools.map((pool) => (
                <li key={pool.poolId}>
                  Pool “{pool.name || pool.poolId}”: loan COA sum {formatMaybe(sumLoanCoaInPool(draft, pool))}
                  {pool.poolCurrentOutstandingAmount != null
                    ? ` · entered pool COA ${formatMaybe(pool.poolCurrentOutstandingAmount)}`
                    : ""}
                </li>
              ))}
            </ul>
            <p className="text-xs text-[#94A3B8]">
              Methodology reference: PCAF Part A 2025 §5.8 (Tables 5.8-1, 5.8-2, 5.8-3). Evidence:{" "}
              {draft.deal.documentationSource || "not recorded"}.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          className="h-10 bg-[#0F6E56] hover:bg-[#0C5A47] text-white disabled:opacity-40"
          disabled={!calculateOk || busy}
          onClick={() => void run(false)}
          data-testid="ssp-calculate-preview"
        >
          <Calculator className="h-4 w-4 mr-2" />
          {busy ? "Calculating…" : preview ? "Recalculate" : "Calculate preview"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 disabled:opacity-40"
          disabled={!saveOk || busy}
          onClick={() => void run(true)}
          data-testid="ssp-save-reportable"
        >
          <Save className="h-4 w-4 mr-2" />
          {savedRecordId || rawResult?.persisted_reportable ? "Saved" : "Save reportable"}
        </Button>
        {!calculateOk && (
          <p className="text-sm text-[#64748B]" data-testid="ssp-calculate-blockers">
            {blockers[0] || "Finish the structure questions before calculation can be enabled."}
            {blockers.length > 1 ? ` (+${blockers.length - 1} more)` : ""}
          </p>
        )}
        {canSaveReportableSsp() && rawResult && !saveReady && (
          <p className="text-sm text-[#64748B]" data-testid="ssp-save-blockers">
            Reportable Save blocked: {sspReportableSaveBlockers(draft, rawResult).join(", ")}.
          </p>
        )}
      </div>

      {savedRecordId && (
        <div
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950"
          data-testid="ssp-save-confirmation"
        >
          <p className="font-semibold">Saved as the reportable holding total</p>
          <p className="mt-1">
            Company Overview, My Portfolio, Category 15 and exports use this holding parent (
            <span data-testid="ssp-reportable-record-id">{savedRecordId}</span>). Intermediate layers stay
            non-reportable.
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-amber-800 flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

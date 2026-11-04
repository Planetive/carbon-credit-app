import { useState } from "react";
import { AlertCircle, Calculator, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/api/client";
import { calculateUop, type UopCalculateResponse } from "@/api/uopDrafts";
import { FinancedScopeBreakdownPanel } from "../components/FinancedScopeBreakdownPanel";
import type { FinancedScopeBreakdown } from "../utils/financedScopeBreakdown";
import { questionnairePayload } from "./draftPersistence";
import {
  UOP_REPORTABLE_BLOCKED_MESSAGE,
  canCalculateUop,
  canSaveReportableUop,
  canSubmitReportableUopSave,
  uopReportableSaveBlockers,
} from "./reportableGuard";
import { uopQuestionnaireComplete } from "./validation";
import type { UopCalculationResult, UopDraft } from "./types";

function asNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatNumber(value: unknown, digits = 4): string {
  const n = asNumber(value);
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(n);
}

function toScopeBreakdown(raw: Record<string, unknown> | null | undefined): FinancedScopeBreakdown | null {
  if (!raw) return null;
  const status = (raw.scope_status || raw.scopeStatus || {}) as Record<string, string>;
  return {
    financedScope1Tco2e: asNumber(raw.financed_scope1_tco2e ?? raw.financedScope1Tco2e),
    financedScope2Tco2e: asNumber(raw.financed_scope2_tco2e ?? raw.financedScope2Tco2e),
    financedScope3Tco2e: asNumber(raw.financed_scope3_tco2e ?? raw.financedScope3Tco2e),
    financedUnallocatedTco2e: asNumber(raw.financed_unallocated_tco2e ?? raw.financedUnallocatedTco2e),
    includedScopes: Array.isArray(raw.included_scopes) ? (raw.included_scopes as FinancedScopeBreakdown["includedScopes"]) : [],
    missingScopes: Array.isArray(raw.missing_scopes) ? (raw.missing_scopes as FinancedScopeBreakdown["missingScopes"]) : [],
    excludedScopes: Array.isArray(raw.excluded_scopes) ? (raw.excluded_scopes as FinancedScopeBreakdown["excludedScopes"]) : [],
    notApplicableScopes: Array.isArray(raw.not_applicable_scopes)
      ? (raw.not_applicable_scopes as FinancedScopeBreakdown["notApplicableScopes"])
      : [],
    scopeStatus: {
      scope1: status.scope1 as FinancedScopeBreakdown["scopeStatus"]["scope1"],
      scope2: status.scope2 as FinancedScopeBreakdown["scopeStatus"]["scope2"],
      scope3: status.scope3 as FinancedScopeBreakdown["scopeStatus"]["scope3"],
    },
    scopeCompleteness: (raw.scope_completeness || raw.scopeCompleteness || "partial") as FinancedScopeBreakdown["scopeCompleteness"],
    calculationMethod: String(raw.calculation_method || raw.calculationMethod || ""),
    methodologyVersion: String(raw.methodology_version || raw.methodologyVersion || ""),
    estimated: Boolean(raw.estimated),
    notes: Array.isArray(raw.notes) ? raw.notes.map(String) : [],
    historicalTotalOnly: false,
  };
}

function issuerLevelFromDraft(draft: UopDraft): Record<string, unknown> | undefined {
  if (!draft.issuerCompanyType) return undefined;
  return {
    companyType: draft.issuerCompanyType,
    evic: draft.issuerEvic,
    totalEquityPlusDebt: draft.issuerEquityPlusDebt,
    scope1Emissions: draft.issuerScope1Emissions,
    scope2Emissions: draft.issuerScope2Emissions,
    scope3Emissions: draft.issuerScope3Emissions,
    verificationStatus: draft.issuerVerificationStatus,
  };
}

export function UopResultsPanel({
  draft,
  counterpartyId,
  onResult,
}: {
  draft: UopDraft;
  counterpartyId?: string | null;
  onResult?: (result: UopCalculationResult) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<UopCalculationResult | null>(draft.lastCalculation || null);
  const ready = canCalculateUop() && uopQuestionnaireComplete(draft);
  const attribution = (result?.investor_attribution || {}) as Record<string, unknown>;
  const breakdown = toScopeBreakdown(result?.scope_breakdown || undefined);
  const assets = Array.isArray(result?.assets) ? result.assets : [];

  const saveReady = canSubmitReportableUopSave(draft, result);
  const overlap = (result?.overlap || null) as { detected?: boolean; guidance?: string; items?: unknown[] } | null;

  const run = async (persistReportable: boolean) => {
    if (!ready) return;
    if (persistReportable && !saveReady) return;
    setBusy(true);
    setError("");
    try {
      const response: UopCalculateResponse = await calculateUop({
        financing_instance_id: draft.financingInstanceId || undefined,
        structure_id: draft.structureId || undefined,
        investment_id: draft.investmentId || undefined,
        counterparty_id: counterpartyId || undefined,
        persist: Boolean(draft.financingInstanceId),
        persist_reportable: persistReportable,
        expected_fingerprint: persistReportable ? result?.calculation_fingerprint : undefined,
        expected_structure_updated_at: draft.structureUpdatedAt || undefined,
        expected_investment_updated_at: draft.investmentUpdatedAt || undefined,
        draft: questionnairePayload(draft),
        issuer_level: issuerLevelFromDraft(draft),
      });
      setResult(response);
      onResult?.(response);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : persistReportable
              ? "The Use of Proceeds result could not be saved as reportable."
              : "The Use of Proceeds calculation could not be completed.";
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[14px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-semibold">Preview calculation only</p>
        <p className="mt-1 leading-relaxed">{UOP_REPORTABLE_BLOCKED_MESSAGE}</p>
        {canSaveReportableUop() ? null : (
          <p className="mt-2 text-amber-900/80">Final reportable Save and portfolio inclusion stay disabled.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          className="h-10 bg-[#0F6E56] hover:bg-[#0C5A47] text-white disabled:opacity-40"
          disabled={!ready || busy}
          onClick={() => void run(false)}
        >
          <Calculator className="h-4 w-4 mr-2" />
          {busy ? "Calculating…" : result ? "Recalculate" : "Calculate"}
        </Button>
        {canSaveReportableUop() && (
          <Button
            type="button"
            variant="outline"
            className="h-10 disabled:opacity-40"
            disabled={!saveReady || busy}
            onClick={() => void run(true)}
          >
            <Save className="h-4 w-4 mr-2" />
            {result?.persisted_reportable ? "Saved" : "Save reportable result"}
          </Button>
        )}
        {!ready && (
          <p className="text-sm text-[#64748B]">Finish the Use of Proceeds questions before calculating. Totals are not computed in the browser.</p>
        )}
        {canSaveReportableUop() && result && !saveReady && (
          <p className="text-sm text-[#64748B]">
            Reportable Save stays blocked: {uopReportableSaveBlockers(draft, result).join(", ")}.
          </p>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-700 flex items-start gap-1.5">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-4">
          {result.status !== "complete" && (
            <div className="rounded-[14px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-semibold">{result.status === "unsupported" ? "Unsupported method" : "Missing data"}</p>
              <p className="mt-1 leading-relaxed">{result.message || "This path cannot be completed with the information provided."}</p>
            </div>
          )}
          {overlap?.detected && (
            <div className="rounded-[14px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-semibold">General-purpose overlap needs review</p>
              <p className="mt-1 leading-relaxed">
                PCAF §5.7 pages 107–108: this holding is not added to portfolio totals while general-purpose
                financing to the same issuer remains unresolved. Emissions are not silently subtracted.
              </p>
            </div>
          )}
          {result.persisted_reportable && (
            <div className="rounded-[14px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
              <p className="font-semibold">Saved as the reportable parent total</p>
              <p className="mt-1 leading-relaxed">
                Company Overview, My Portfolio, Category 15 and exports now use this parent. Underlying assets stay non-reportable.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Metric label="Total financed emissions" value={`${formatNumber(result.financed_emissions)} tCO₂e`} hint={result.formula_name || result.formula_id || ""} />
            <Metric
              label="Investor attribution"
              value={formatNumber(asNumber(attribution.attribution_factor) != null ? Number(attribution.attribution_factor) * 100 : null, 4) + "%"}
              hint={String(attribution.equation || "Outstanding / (equity + debt)")}
            />
            <Metric
              label="Data-quality score"
              value={result.data_quality_score == null ? "Undefined" : formatNumber(result.data_quality_score, 4)}
              hint="Weighted by underlying asset outstanding. Not a separate UoP 1a/1b score."
            />
          </div>

          <div className="rounded-[14px] border border-[#E8EEF0] bg-white p-4 text-sm space-y-1">
            <p className="font-semibold text-[#0F172A]">Investor attribution</p>
            <p className="text-[#64748B]">Outstanding {formatNumber(attribution.outstanding_amount, 2)} / denominator {formatNumber(attribution.denominator, 2)} ({String(attribution.denominator_kind || "total equity + debt")})</p>
            <p className="text-[#64748B]">Allocated {formatNumber(result.allocated_financed_emissions)} tCO₂e · Unallocated {formatNumber(result.unallocated_financed_emissions)} tCO₂e</p>
            {result.allocation ? (
              <p className="text-[#64748B]">
                Allocation {formatNumber(asNumber((result.allocation as Record<string, unknown>).allocation_percent) != null ? Number((result.allocation as Record<string, unknown>).allocation_percent) * 100 : null, 2)}%
                {" · "}
                {String((result.allocation as Record<string, unknown>).equation || "")}
              </p>
            ) : null}
          </div>

          {breakdown && (
            <FinancedScopeBreakdownPanel
              breakdown={breakdown}
              totalTco2e={result.financed_emissions ?? 0}
            />
          )}

          {assets.length > 0 && (
            <div className="rounded-[14px] border border-[#E8EEF0] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E8EEF0]">
                <p className="text-sm font-semibold text-[#0F172A]">Underlying assets</p>
                <p className="text-xs text-[#64748B] mt-0.5">Each asset uses its PCAF asset-class denominator. Rows stay non-reportable.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F8FAFC] text-xs uppercase tracking-wide text-[#64748B]">
                      <th className="text-left px-4 py-2">Asset</th>
                      <th className="text-left px-4 py-2">Class</th>
                      <th className="text-right px-4 py-2">Asset AF</th>
                      <th className="text-right px-4 py-2">Investor FE</th>
                      <th className="text-right px-4 py-2">DQ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((asset) => {
                      const row = asset as Record<string, unknown>;
                      return (
                        <tr key={String(row.underlying_asset_id)} className="border-t border-[#F1F5F9]">
                          <td className="px-4 py-2.5 font-medium text-[#0F172A]">{String(row.name || row.underlying_asset_id)}</td>
                          <td className="px-4 py-2.5 text-[#64748B]">{String(row.asset_class || "")}</td>
                          <td className="px-4 py-2.5 text-right">{formatNumber(row.asset_attribution_factor, 6)}</td>
                          <td className="px-4 py-2.5 text-right">{formatNumber(row.investor_financed_emissions)} tCO₂e</td>
                          <td className="px-4 py-2.5 text-right">{formatNumber(row.data_quality_score, 2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(result.notes || []).length > 0 && (
            <ul className="text-xs text-[#64748B] space-y-1 list-disc pl-4">
              {(result.notes || []).map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          )}
          {(result.warnings || []).length > 0 && (
            <ul className="text-xs text-amber-800 space-y-1 list-disc pl-4">
              {(result.warnings || []).map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          )}
          <p className="text-xs text-[#94A3B8]">{result.double_count_guard}</p>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[14px] border border-[#E8EEF0] bg-white px-4 py-3">
      <p className="text-xs font-medium text-[#64748B]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[#0F172A]">{value}</p>
      {hint ? <p className="text-[11px] text-[#94A3B8] mt-1 leading-relaxed">{hint}</p> : null}
    </div>
  );
}

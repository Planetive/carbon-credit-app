import { useState } from "react";
import { AlertCircle, Calculator, ChevronDown, ChevronRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sumLoanCoaInPool } from "./state";
import {
  SSP_CALCULATE_BLOCKED_MESSAGE,
  SSP_REPORTABLE_BLOCKED_MESSAGE,
  canCalculateSsp,
  canSaveReportableSsp,
} from "./reportableGuard";
import { sspQuestionnaireComplete } from "./validation";
import { STRUCTURE_TYPE_LABELS } from "./copy";
import type { SspDraft } from "./types";

function formatMaybe(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(value);
}

export function SspPreviewNotice({ compact = false }: { compact?: boolean }) {
  return (
    <p className={compact ? "text-[11px] text-slate-500" : "text-xs text-slate-500"}>
      Questionnaire and draft save only — financed emissions are not calculated yet (Phase 6C).
    </p>
  );
}

export function SspBackendUnavailableBanner() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
      <SspPreviewNotice />
      <p className="text-xs text-slate-500">
        Drafts can autosave when you are signed in. Results stay out of the portfolio until Calculate is enabled.
      </p>
    </div>
  );
}

export function SspResultsPanel({ draft }: { draft: SspDraft }) {
  const [openHow, setOpenHow] = useState(false);
  const [error, setError] = useState("");
  const ready = sspQuestionnaireComplete(draft);
  const calculateOk = canCalculateSsp() && ready;
  const saveOk = canSaveReportableSsp() && ready;

  const bankInvestment = draft.holdings.reduce((sum, row) => {
    return sum + (row.bankOutstandingInvestment != null ? row.bankOutstandingInvestment : 0);
  }, 0);

  const tryCalculate = () => {
    setError(SSP_CALCULATE_BLOCKED_MESSAGE);
  };

  const trySave = () => {
    setError(SSP_REPORTABLE_BLOCKED_MESSAGE);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
        <SspPreviewNotice />
        <p className="text-xs text-slate-500">Calculate stays disabled until Phase 6C</p>
      </div>

      <div className="rounded-xl border border-[#DCEAE2] bg-white px-5 py-4 space-y-3">
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
          <div className="rounded-lg bg-[#F8FAFC] px-3 py-2">
            <p className="text-xs text-[#64748B]">Total financed emissions</p>
            <p className="font-semibold text-[#0F172A]">—</p>
          </div>
          <div className="rounded-lg bg-[#F8FAFC] px-3 py-2">
            <p className="text-xs text-[#64748B]">Data-quality score</p>
            <p className="font-semibold text-[#0F172A]">—</p>
          </div>
          <div className="rounded-lg bg-[#F8FAFC] px-3 py-2">
            <p className="text-xs text-[#64748B]">Investor attributable share</p>
            <p className="font-semibold text-[#0F172A]">—</p>
          </div>
        </div>

        <div className="rounded-lg border border-dashed border-[#E2E8F0] px-3 py-2 text-sm text-[#64748B]">
          Scope 1 / 2 / 3 breakdown will appear here after the Phase 6C engine returns values. This screen never invents
          numbers.
        </div>
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
              Methodology reference: PCAF Part A 2025 §5.8; Tables 5.8-1, 5.8-2, 5.8-3. Evidence:{" "}
              {draft.deal.documentationSource || "not recorded"}.
            </p>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-2 py-1.5">
              Warnings and completeness checks run on the structure form. No financed-emissions total is shown until the
              backend calculator exists.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          className="h-10 bg-[#0F6E56] hover:bg-[#0C5A47] text-white disabled:opacity-40"
          disabled={!calculateOk}
          onClick={tryCalculate}
        >
          <Calculator className="h-4 w-4 mr-2" />
          Calculate preview
        </Button>
        <Button type="button" variant="outline" className="h-10 disabled:opacity-40" disabled={!saveOk} onClick={trySave}>
          <Save className="h-4 w-4 mr-2" />
          Save reportable
        </Button>
        {!ready && <p className="text-sm text-[#64748B]">Finish the structure questions before calculation can be enabled.</p>}
      </div>

      {error && (
        <p className="text-sm text-amber-800 flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

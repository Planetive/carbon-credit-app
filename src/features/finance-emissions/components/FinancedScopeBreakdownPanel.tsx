import type { FinancedScopeBreakdown } from "../utils/financedScopeBreakdown";
import {
  formatFinancedScopeValue,
  scopeStatusLabel,
} from "../utils/financedScopeBreakdown";

const ROWS: Array<{ key: "financedScope1Tco2e" | "financedScope2Tco2e" | "financedScope3Tco2e"; name: "scope1" | "scope2" | "scope3"; label: string }> = [
  { key: "financedScope1Tco2e", name: "scope1", label: "Financed Scope 1" },
  { key: "financedScope2Tco2e", name: "scope2", label: "Financed Scope 2" },
  { key: "financedScope3Tco2e", name: "scope3", label: "Financed Scope 3" },
];

export function FinancedScopeBreakdownPanel({
  breakdown,
  totalTco2e,
}: {
  breakdown?: FinancedScopeBreakdown | null;
  totalTco2e: number;
}) {
  if (!breakdown) return null;
  const completeness =
    breakdown.historicalTotalOnly || breakdown.scopeCompleteness === "total_only"
      ? "Total only — this result was not stored with a Scope 1/2/3 split."
      : breakdown.scopeCompleteness === "complete"
        ? "All applicable scopes reported."
        : "Scope breakdown is incomplete. Missing scopes are not treated as zero.";

  return (
    <div className="rounded-[14px] border border-[#E8EEF0] bg-white p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-[#0F172A]">Financed emissions by scope</p>
        <p className="text-xs text-[#64748B] mt-0.5">{completeness}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {ROWS.map((row) => (
          <div key={row.name} className="rounded-lg border border-[#F1F5F9] bg-[#F8FAFC] px-3 py-2">
            <p className="text-xs font-medium text-[#64748B]">{row.label}</p>
            <p className="text-sm font-semibold text-[#0F172A] mt-0.5">
              {formatFinancedScopeValue(breakdown[row.key])}
            </p>
            <p className="text-[11px] text-[#94A3B8] mt-0.5">
              {scopeStatusLabel(breakdown.scopeStatus[row.name])}
            </p>
          </div>
        ))}
      </div>
      {breakdown.financedUnallocatedTco2e != null && (
        <p className="text-xs text-[#64748B]">
          Unallocated estimated total: {formatFinancedScopeValue(breakdown.financedUnallocatedTco2e)}
        </p>
      )}
      <p className="text-xs text-[#64748B]">
        Total financed emissions: {formatFinancedScopeValue(totalTco2e)}
      </p>
      {breakdown.notes[0] ? (
        <p className="text-[11px] text-[#94A3B8]">{breakdown.notes[0]}</p>
      ) : null}
    </div>
  );
}

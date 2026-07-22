import { ArrowRight, Flame, Leaf, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

const CARD =
  "rounded-[16px] bg-white border border-[rgba(15,23,42,0.06)] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_22px_rgba(15,23,42,0.025)] h-full min-h-[268px] grid grid-rows-[auto_1fr] px-5 py-[18px]";

export interface EmissionsScopeRow {
  label: string;
  sub: string;
  value: number;
  delta?: string;
  up?: boolean;
}

interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

interface OverviewEmissionsCardProps {
  scopeRows: EmissionsScopeRow[];
  donutData: DonutSlice[];
  totalEmissions: number;
  onViewFullResults: () => void;
}

const scopeIcons = [Flame, Zap, Leaf] as const;

/** Scope colors aligned with Emissions Overview donut (image comp). */
export const OVERVIEW_EMISSIONS_SCOPE_COLORS = [
  { chart: "#1D9E75", chip: "bg-[#EAF7F1] text-[#1D9E75]" },
  { chart: "#E8C89A", chip: "bg-[#FAF0E4] text-[#E8C89A]" },
  { chart: "#4F7FD3", chip: "bg-[#EBF1FA] text-[#4F7FD3]" },
] as const;

const scopeIconBg = OVERVIEW_EMISSIONS_SCOPE_COLORS.map((c) => c.chip);

const rowStartClass = ["row-start-1", "row-start-2", "row-start-3"] as const;

function formatDonutCenterTotal(value: number): string {
  if (value > 100_000) {
    const thousands = value / 1000;
    const rounded = Math.round(thousands * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded}k` : `${rounded.toFixed(1)}k`;
  }
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const OverviewEmissionsCard = ({
  scopeRows,
  donutData,
  totalEmissions,
  onViewFullResults,
}: OverviewEmissionsCardProps) => {
  // Tiny scopes (e.g. 0.25 vs 338k) collapse to 0px without a minAngle,
  // and paddingAngle alone reads as a white cut in the ring.
  const chartSlices = donutData.filter((slice) => slice.value > 0);
  const multiSlice = chartSlices.length > 1;

  return (
    <article className={CARD}>
      <header className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="text-[20px] font-semibold text-slate-900 leading-tight tracking-[-0.02em]">
          Emissions Overview
        </h2>
        <button
          type="button"
          onClick={onViewFullResults}
          className="text-[13px] font-medium text-[#1D9E75] hover:text-[#0F6E56] inline-flex items-center gap-1 shrink-0 group"
        >
          View full emission results
          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </header>

      <div className="grid grid-cols-[minmax(0,28%)_minmax(0,32%)_minmax(0,40%)] grid-rows-3 gap-x-4 min-h-0 items-stretch">
        {scopeRows.map((row, index) => {
          const Icon = scopeIcons[index] ?? Flame;
          const iconBg = scopeIconBg[index] ?? scopeIconBg[0];
          const rowStart = rowStartClass[index] ?? "row-start-1";
          const showDivider = index < scopeRows.length - 1;
          const divider = showDivider ? "border-b border-slate-100" : "";

          return (
            <div key={`${row.label}-label`} className={`col-start-1 ${rowStart} flex items-center gap-2 min-w-0 py-1.5 pr-1 ${divider}`}>
              <div className={`h-7 w-7 rounded-full ring-1 ring-black/[0.025] flex items-center justify-center shrink-0 ${iconBg}`}>
                <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-slate-900 leading-tight">{row.label}</p>
                <p className="text-[12px] font-normal text-slate-500 leading-tight">{row.sub}</p>
              </div>
            </div>
          );
        })}
        {scopeRows.map((row, index) => {
          const rowStart = rowStartClass[index] ?? "row-start-1";
          const showDivider = index < scopeRows.length - 1;
          const divider = showDivider ? "border-b border-slate-100" : "";

          return (
            <div
              key={`${row.label}-metrics`}
              className={`col-start-2 ${rowStart} flex items-center justify-between gap-2 py-1.5 pl-0.5 min-w-0 ${divider}`}
            >
              <p className="text-[13px] font-semibold text-slate-900 tabular-nums leading-tight whitespace-nowrap">
                {row.value.toLocaleString(undefined, {
                  minimumFractionDigits: row.value >= 100 ? 1 : 2,
                  maximumFractionDigits: row.value >= 100 ? 1 : 3,
                })}{" "}
                <span className="font-medium text-slate-500">tCO₂e</span>
              </p>
              <div className="text-right shrink-0">
                {row.delta ? (
                  <>
                    <p
                      className={`text-[12px] font-semibold flex items-center justify-end gap-0.5 tabular-nums whitespace-nowrap ${
                        row.up ? "text-red-500" : "text-[#1D9E75]"
                      }`}
                    >
                      {row.up ? (
                        <TrendingUp className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden />
                      ) : (
                        <TrendingDown className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden />
                      )}
                      {row.delta}
                    </p>
                    <p className="text-[11px] font-normal text-slate-400 leading-tight mt-0.5 whitespace-nowrap">
                      vs last month
                    </p>
                  </>
                ) : (
                  <p className="text-[11px] font-normal text-slate-400 leading-tight whitespace-nowrap">
                    Current inventory
                  </p>
                )}
              </div>
            </div>
          );
        })}

        <div className="col-start-3 row-start-1 row-span-3 flex items-center justify-center min-h-[164px]">
          <div className="relative w-full max-w-[188px] aspect-square">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartSlices.length > 0 ? chartSlices : donutData}
                  innerRadius={68}
                  outerRadius={86}
                  paddingAngle={multiSlice ? 1 : 0}
                  minAngle={multiSlice ? 10 : 0}
                  dataKey="value"
                  stroke="none"
                >
                  {(chartSlices.length > 0 ? chartSlices : donutData).map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-0.5">
              <p className="text-[19px] font-semibold text-slate-900 leading-none tracking-[-0.03em] tabular-nums">
                {formatDonutCenterTotal(totalEmissions)}
              </p>
              <p className="text-[10px] font-normal text-slate-400 mt-1">tCO₂e</p>
              <p className="text-[11px] font-medium text-slate-600 mt-0.5 leading-tight">
                Total Emissions
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

export default OverviewEmissionsCard;

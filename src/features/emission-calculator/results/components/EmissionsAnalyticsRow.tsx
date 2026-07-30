import { ArrowRight, CircleDot, Lightbulb } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { EmissionCategoryTotal } from "@/lib/epaIpccResults";
import { SCOPE_COLORS, formatPct, formatTonnes, pctOfTotal } from "./formatters";

type EmissionsAnalyticsRowProps = {
  scope1Kg: number;
  scope2Kg: number;
  scope3Kg: number;
  grandKg: number;
  categories: Array<EmissionCategoryTotal & { scope: "Scope 1" | "Scope 2" | "Scope 3" }>;
  onViewBreakdown?: () => void;
};

const EmissionsAnalyticsRow = ({
  scope1Kg,
  scope2Kg,
  scope3Kg,
  grandKg,
  categories,
  onViewBreakdown,
}: EmissionsAnalyticsRowProps) => {
  const donutData = [
    { name: "Scope 1", value: scope1Kg, color: SCOPE_COLORS.scope1.solid },
    { name: "Scope 2", value: scope2Kg, color: SCOPE_COLORS.scope2.solid },
    { name: "Scope 3", value: scope3Kg, color: SCOPE_COLORS.scope3.solid },
  ];
  const chartSlices = donutData.filter((s) => s.value > 0);
  const multiSlice = chartSlices.length > 1;

  const topSources = [...categories]
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const maxSource = topSources[0]?.value || 1;

  const insights: string[] = [];
  if (topSources[0]) {
    insights.push(
      `${topSources[0].label} (${topSources[0].scope}) is your largest source at ${formatPct(
        pctOfTotal(topSources[0].value, grandKg)
      )}% of total emissions.`
    );
  }
  const dominant = [...donutData].sort((a, b) => b.value - a.value)[0];
  if (dominant && dominant.value > 0 && grandKg > 0) {
    insights.push(
      `${dominant.name} accounts for ${formatPct(pctOfTotal(dominant.value, grandKg))}% of your footprint.`
    );
  }
  for (const slice of donutData) {
    if (slice.value <= 0) {
      insights.push(`No ${slice.name} emissions were recorded in this assessment.`);
    }
  }
  if (insights.length === 0) {
    insights.push("No emission data available yet. Complete calculator categories to see insights.");
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col">
        <h3 className="text-base font-semibold text-slate-900 mb-3">Emissions by Scope</h3>
        <div className="flex-1 flex flex-col sm:flex-row items-center gap-4 min-h-[200px]">
          <div className="relative w-full max-w-[180px] aspect-square shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartSlices.length > 0 ? chartSlices : donutData}
                  innerRadius={58}
                  outerRadius={78}
                  paddingAngle={multiSlice ? 1 : 0}
                  minAngle={multiSlice ? 8 : 0}
                  dataKey="value"
                  stroke="none"
                >
                  {(chartSlices.length > 0 ? chartSlices : donutData).map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
              <p className="text-lg font-semibold text-slate-900 tabular-nums leading-none">
                {formatTonnes(grandKg)}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">tCO₂e</p>
            </div>
          </div>
          <ul className="w-full space-y-2.5 text-sm">
            {donutData.map((slice) => (
              <li key={slice.name} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-slate-600 min-w-0">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                  {slice.name}
                </span>
                <span className="tabular-nums text-slate-900 font-medium shrink-0">
                  {formatTonnes(slice.value)} · {formatPct(pctOfTotal(slice.value, grandKg))}%
                </span>
              </li>
            ))}
          </ul>
        </div>
        {onViewBreakdown && (
          <button
            type="button"
            onClick={onViewBreakdown}
            className="mt-4 text-sm font-medium text-[#1D9E75] hover:text-[#0F6E56] inline-flex items-center gap-1"
          >
            View full breakdown
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </article>

      <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col">
        <h3 className="text-base font-semibold text-slate-900 mb-4">Top Emission Sources</h3>
        <div className="flex-1 space-y-3">
          {topSources.length === 0 ? (
            <p className="text-sm text-slate-500">No sources with emissions yet.</p>
          ) : (
            topSources.map((source, index) => {
              const widthPct = Math.max(4, (source.value / maxSource) * 100);
              const pct = pctOfTotal(source.value, grandKg);
              return (
                <div key={source.key} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-slate-700 min-w-0 truncate">
                      <span className="font-semibold text-slate-400 mr-1.5">{index + 1}.</span>
                      {source.label}{" "}
                      <span className="text-slate-400">({source.scope})</span>
                    </span>
                    <span className="tabular-nums text-slate-900 font-medium shrink-0 text-xs sm:text-sm">
                      {formatTonnes(source.value)} · {formatPct(pct)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#1D9E75]"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </article>

      <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col">
        <h3 className="text-base font-semibold text-slate-900 mb-4">Key Insights</h3>
        <ul className="flex-1 space-y-3">
          {insights.slice(0, 4).map((text, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-slate-600 leading-relaxed">
              <span className="mt-0.5 shrink-0 text-[#1D9E75]">
                {i === 0 ? <CircleDot className="h-4 w-4" /> : <Lightbulb className="h-4 w-4" />}
              </span>
              {text}
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
};

export default EmissionsAnalyticsRow;

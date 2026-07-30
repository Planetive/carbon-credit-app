import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { EmissionCategoryTotal, EpaIpccResultsData } from "@/lib/epaIpccResults";
import { formatKg, formatPct, formatTonnes, pctOfTotal } from "./formatters";

export type BreakdownRow = EmissionCategoryTotal & {
  scope: "Scope 1" | "Scope 2" | "Scope 3";
};

type ResultsBreakdownTabsProps = {
  results: EpaIpccResultsData;
  detailKey: string | null;
  detailRows: any[];
  detailLoading: boolean;
  detailError: string | null;
  onToggleDetails: (key: string) => void;
  formatDetailValue: (column: string, value: any) => string;
  isNumericDetailColumn: (column: string, rows: any[]) => boolean;
  prettifyColumnLabel: (col: string) => string;
  hiddenDetailColumns: string[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
};

const ResultsBreakdownTabs = ({
  results,
  detailKey,
  detailRows,
  detailLoading,
  detailError,
  onToggleDetails,
  formatDetailValue,
  isNumericDetailColumn,
  prettifyColumnLabel,
  hiddenDetailColumns,
  activeTab,
  onTabChange,
}: ResultsBreakdownTabsProps) => {
  const [search, setSearch] = useState("");
  const [internalTab, setInternalTab] = useState("scope1");
  const tab = activeTab ?? internalTab;
  const setTab = onTabChange ?? setInternalTab;

  const filterRows = (rows: BreakdownRow[]) => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => r.value > 0)
      .filter((r) => !q || r.label.toLowerCase().includes(q) || r.scope.toLowerCase().includes(q));
  };

  const renderTable = (rows: BreakdownRow[], colSpan: number) => {
    const filtered = filterRows(rows);
    const grand = results.totals.grand;

    return (
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Category</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600">kg CO₂e</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600">tCO₂e</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600">% of Total</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600">Details</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-8 text-center text-slate-500">
                  No categories with emissions in this view.
                </td>
              </tr>
            ) : (
              filtered.map((row) => {
                const open = detailKey === row.key;
                const highlight = open;
                return (
                  <Fragment key={row.key}>
                    <tr
                      className={`border-t border-slate-100 hover:bg-slate-50/80 transition-colors ${
                        highlight ? "bg-[#EAF7F1]/50" : "bg-white"
                      }`}
                    >
                      <td className="px-4 py-3 text-slate-800">
                        <div className="font-medium">{row.label}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{row.scope}</div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-800">
                        {formatKg(row.value)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-900 font-medium">
                        {formatTonnes(row.value)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                        {formatPct(pctOfTotal(row.value, grand))}%
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-slate-500"
                          onClick={() => onToggleDetails(row.key)}
                          aria-label={open ? "Hide details" : "View details"}
                        >
                          {open ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </td>
                    </tr>
                    {open && detailLoading && (
                      <tr>
                        <td colSpan={colSpan} className="px-4 pb-4 text-xs text-slate-500">
                          Loading details…
                        </td>
                      </tr>
                    )}
                    {open && detailError && (
                      <tr>
                        <td colSpan={colSpan} className="px-4 pb-4 text-xs text-red-600">
                          {detailError}
                        </td>
                      </tr>
                    )}
                    {open && !detailLoading && !detailError && detailRows.length === 0 && (
                      <tr>
                        <td colSpan={colSpan} className="px-4 pb-4 text-xs text-slate-500">
                          No entry-level rows found for this category.
                        </td>
                      </tr>
                    )}
                    {open && !detailLoading && !detailError && detailRows.length > 0 && (
                      <tr>
                        <td colSpan={colSpan} className="bg-slate-50/80 px-4 pb-4">
                          <div className="mt-2 rounded-xl border border-[#BFE3D3] bg-white p-3 sm:p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="text-sm font-semibold text-slate-800">Entry Details</div>
                              <div className="text-xs text-slate-500 border border-slate-200 rounded-full px-2.5 py-1">
                                {detailRows.length.toLocaleString()} entries · {formatKg(row.value)} kg CO₂e
                              </div>
                            </div>
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                              <table className="min-w-full text-sm">
                                <thead className="bg-slate-100">
                                  {(() => {
                                    const visibleCols = Object.keys(detailRows[0] || {}).filter(
                                      (col) => !hiddenDetailColumns.includes(col)
                                    );
                                    const numericCols = new Set(
                                      visibleCols.filter((col) => isNumericDetailColumn(col, detailRows))
                                    );
                                    return (
                                      <tr>
                                        <th className="px-3 py-2.5 text-center font-semibold uppercase tracking-wide text-[10px] text-slate-500 w-12">
                                          #
                                        </th>
                                        {visibleCols.map((col) => (
                                          <th
                                            key={col}
                                            className={`px-3 py-2.5 font-semibold uppercase tracking-wide text-[10px] text-slate-600 whitespace-nowrap ${
                                              numericCols.has(col) ? "text-right" : "text-left"
                                            }`}
                                          >
                                            {prettifyColumnLabel(col)}
                                          </th>
                                        ))}
                                      </tr>
                                    );
                                  })()}
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {detailRows.map((r: any, idx: number) => (
                                    <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                                      <td className="px-3 py-2.5 text-center text-xs text-slate-500 tabular-nums">
                                        {idx + 1}
                                      </td>
                                      {Object.keys(detailRows[0] || {})
                                        .filter((col) => !hiddenDetailColumns.includes(col))
                                        .map((col) => {
                                          const isNumeric = isNumericDetailColumn(col, detailRows);
                                          return (
                                            <td
                                              key={col}
                                              className={`px-3 py-2.5 text-[12px] text-slate-800 align-top ${
                                                isNumeric ? "text-right tabular-nums" : "text-left"
                                              }`}
                                            >
                                              <div
                                                className="max-w-[260px] break-words leading-relaxed"
                                                title={formatDetailValue(col, r[col])}
                                              >
                                                {formatDetailValue(col, r[col])}
                                              </div>
                                            </td>
                                          );
                                        })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4 sm:p-5">
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
          <TabsList className="h-auto flex-wrap justify-start bg-slate-100 p-1">
            <TabsTrigger value="scope1">Scope 1 Details</TabsTrigger>
            <TabsTrigger value="scope2">Scope 2 Details</TabsTrigger>
            <TabsTrigger value="scope3">Scope 3 Details</TabsTrigger>
          </TabsList>
          <div className="relative w-full lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories…"
              className="pl-9 h-9 border-slate-200"
            />
          </div>
        </div>

        <TabsContent value="scope1" className="mt-0">
          {renderTable(
            results.scope1.map((r) => ({ ...r, scope: "Scope 1" as const })),
            5
          )}
        </TabsContent>
        <TabsContent value="scope2" className="mt-0">
          {renderTable(
            results.scope2.map((r) => ({ ...r, scope: "Scope 2" as const })),
            5
          )}
        </TabsContent>
        <TabsContent value="scope3" className="mt-0">
          {renderTable(
            results.scope3.map((r) => ({ ...r, scope: "Scope 3" as const })),
            5
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
};

export default ResultsBreakdownTabs;

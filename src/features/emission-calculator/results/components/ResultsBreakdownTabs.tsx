import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { EmissionCategoryTotal, EpaIpccResultsData } from "@/lib/epaIpccResults";
import { biogenicReportLabel, buildReportingTotals, isLegacyMobileKey, isLegacyRefrigerantKey, isUnreconciledStationaryKey, verifiedScope1Lines } from "../reportingTotals";
import type { MobileResultActivity, MobileVerifiedResults } from "../mobileResults";
import {
  refrigerantMethodLabel,
  refrigerantRateDisclosure,
  type RefrigerantResultActivity,
  type RefrigerantVerifiedResults,
} from "../refrigerantResults";
import { type StationaryResultActivity, type StationaryVerifiedResults } from "../stationaryResults";
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

function formatExactTonnes(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 8 });
}

function dash(value: string): string {
  return value || "—";
}

function VerifiedStationaryPanel({
  verified,
}: {
  verified: StationaryVerifiedResults | undefined;
}) {
  if (!verified) return null;
  if (verified.status === "unavailable") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        {verified?.error || "Verified stationary records could not be loaded. They are not included in the Scope 1 total."}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#BFE3D3] bg-[#EAF7F1]/40 p-4 space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#0F6E56]">Stationary combustion (verified)</p>
          <p className="text-xs text-slate-600 mt-0.5">
            Calculated by the EPA stationary service. Older fuel entries stay in the legacy list below and are not added to this total.
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums text-slate-900">
            Scope 1 {formatExactTonnes(verified.totalTco2e)} tCO₂e
            <span className="ml-2 text-xs font-medium text-slate-500">
              {formatKg(verified.totalKgCo2e)} kg CO₂e
            </span>
          </p>
          <p className="text-xs text-slate-600">
            {biogenicReportLabel(verified.biogenicCo2Tonnes ?? null, verified.biogenicStatus || "not_recorded")}. GWP AR5.
          </p>
        </div>
      </div>
      {verified.status === "empty" ? (
        <p className="text-sm text-slate-500">No verified stationary combustion records for this view.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {["Fuel", "Consumption", "Equipment", "Site", "Period", "CO₂", "CH₄", "N₂O", "tCO₂e", "GWP", "Factor source"].map(
                  (heading) => (
                    <th key={heading} className="text-left px-3 py-2.5 font-semibold text-slate-600 whitespace-nowrap">
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {verified.activities.map((activity) => (
                <ActivityRow key={activity.id} activity={activity} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function GasCell({ gas }: { gas: StationaryResultActivity["co2"] }) {
  return (
    <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap">
      <div>{dash(gas.massKg)} kg</div>
      <div className="text-slate-500">{dash(gas.co2eKg)} kg CO₂e</div>
    </td>
  );
}

function ActivityRow({ activity }: { activity: StationaryResultActivity }) {
  return (
    <tr className="border-t border-slate-100 align-top">
      <td className="px-3 py-2.5 text-slate-800">
        <div className="font-medium">{dash(activity.fuel)}</div>
        {activity.fuelCategory && <div className="text-xs text-slate-500">{activity.fuelCategory}</div>}
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap text-slate-700">
        {dash(activity.quantity)} {activity.unit}
      </td>
      <td className="px-3 py-2.5 text-slate-700">
        <div>{dash(activity.equipmentType)}</div>
        {activity.equipmentId && <div className="text-xs text-slate-500">{activity.equipmentId}</div>}
      </td>
      <td className="px-3 py-2.5 text-slate-700">{dash(activity.site)}</td>
      <td className="px-3 py-2.5 whitespace-nowrap text-slate-700">{dash(activity.period)}</td>
      <GasCell gas={activity.co2} />
      <GasCell gas={activity.ch4} />
      <GasCell gas={activity.n2o} />
      <td className="px-3 py-2.5 font-medium tabular-nums text-slate-900 whitespace-nowrap">
        <div>{activity.totalTco2e}</div>
        <div className="text-xs font-normal text-slate-500">
          Biogenic {activity.biogenicCo2Tonnes || "not recorded"} t CO2
        </div>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap text-slate-700">{dash(activity.gwpVersion)}</td>
      <td className="px-3 py-2.5 text-xs text-slate-600 max-w-[220px]">{dash(activity.factorSource)}</td>
    </tr>
  );
}

function reportableActivityGroups(results: EpaIpccResultsData) {
  const assigned = new Set(results.annualReporting?.scope1Keys ?? []);
  return (results.scope1ByActivity || [])
    .map((group) => {
      const legacyParts = group.legacyParts.filter(
        (part) =>
          assigned.has(part.key) &&
          !isUnreconciledStationaryKey(part.key) &&
          !isLegacyMobileKey(part.key) &&
          !isLegacyRefrigerantKey(part.key)
      );
      const valueKg = legacyParts.reduce((sum, part) => sum + (part.value || 0), 0);
      return { ...group, legacyParts, valueKg };
    })
    .filter((group) => group.valueKg > 0);
}

function LegacyMobileExcluded({ rows }: { rows: EmissionCategoryTotal[] }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-amber-950">
          Legacy Mobile Combustion — Excluded from Annual Totals
        </p>
        <p className="text-xs text-amber-900 mt-0.5">
          Historical mobile tables stay visible here. They are not migrated, recalculated, or included in Scope 1.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-amber-900">No legacy mobile combustion records in this view.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-amber-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-amber-50">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Source</th>
                <th className="text-right px-4 py-2.5 font-semibold text-slate-600">kg CO₂e</th>
                <th className="text-right px-4 py-2.5 font-semibold text-slate-600">tCO₂e</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-t border-amber-100">
                  <td className="px-4 py-2.5 text-slate-800">{row.label}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatKg(row.value)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatTonnes(row.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LegacyRefrigerantExcluded({ rows }: { rows: EmissionCategoryTotal[] }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-amber-950">
          Legacy Refrigerant Leakage — Excluded from Annual Totals
        </p>
        <p className="text-xs text-amber-900 mt-0.5">
          Historical EPA, UK-EPA, and earlier refrigerant rows stay here as stored kilograms of CO2e. They are not verified tonnes, and they are not recalculated or included in Scope 1.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-amber-900">No legacy refrigerant leakage records in this view.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-amber-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-amber-50">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Source</th>
                <th className="text-right px-4 py-2.5 font-semibold text-slate-600">Stored kg CO2e</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-t border-amber-100">
                  <td className="px-4 py-2.5 text-slate-800">{row.label}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatKg(row.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function VerifiedRefrigerantPanel({ verified }: { verified: RefrigerantVerifiedResults | undefined }) {
  if (!verified) return null;
  if (verified.status === "unavailable") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        {verified.error || "Verified refrigerant records could not be loaded. They are not included in the Scope 1 total."}
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-[#BFE3D3] bg-[#EAF7F1]/40 p-4 space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#0F6E56]">Refrigerant leakage (verified)</p>
          <p className="text-xs text-slate-600 mt-0.5">
            Calculated by the EPA refrigerant service. The total is refrigerant CO2e. Leaked kilograms are not added again.
          </p>
        </div>
        <p className="text-sm font-semibold tabular-nums text-slate-900">
          Scope 1 {formatExactTonnes(verified.totalTco2e)} tCO₂e
          <span className="ml-2 text-xs font-medium text-slate-500">{formatKg(verified.totalKgCo2e)} kg CO₂e</span>
        </p>
      </div>
      {verified.status === "empty" ? (
        <p className="text-sm text-slate-500">No verified refrigerant leakage records for this view.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {["Refrigerant", "Method", "Leaked kg", "Equipment", "Month", "GWP", "Factor source", "tCO₂e"].map((heading) => (
                  <th key={heading} className="text-left px-3 py-2.5 font-semibold text-slate-600 whitespace-nowrap">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {verified.activities.map((activity) => (
                <RefrigerantActivityRow key={activity.id} activity={activity} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RefrigerantActivityRow({ activity }: { activity: RefrigerantResultActivity }) {
  const rate = refrigerantRateDisclosure(activity);
  const equipment = [activity.equipmentType, activity.equipmentId, activity.site].filter(Boolean).join(" · ");
  return (
    <tr className="border-t border-slate-100 align-top">
      <td className="px-3 py-2.5 font-medium text-slate-800">{activity.refrigerant}</td>
      <td className="px-3 py-2.5 text-slate-700">
        <div>{refrigerantMethodLabel(activity.method)}</div>
        {rate && <div className="text-xs text-slate-500">{rate}</div>}
      </td>
      <td className="px-3 py-2.5 tabular-nums text-slate-700">{activity.leakageKg}</td>
      <td className="px-3 py-2.5 text-slate-700">{dash(equipment)}</td>
      <td className="px-3 py-2.5 whitespace-nowrap text-slate-700">{dash(activity.period)}</td>
      <td className="px-3 py-2.5 text-slate-700">
        <div>{activity.gwp}</div>
        <div className="text-xs text-slate-500">{activity.gwpPublication}</div>
      </td>
      <td className="px-3 py-2.5 text-xs text-slate-600 max-w-[220px]">
        <div>{activity.factorProvenance}</div>
        <div className="mt-1">{activity.methodology}</div>
      </td>
      <td className="px-3 py-2.5 font-medium tabular-nums text-slate-900 whitespace-nowrap">{activity.totalTco2e}</td>
    </tr>
  );
}

function VerifiedMobilePanel({ verified }: { verified: MobileVerifiedResults | undefined }) {
  if (!verified) return null;
  if (verified.status === "unavailable") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        {verified.error || "Verified mobile records could not be loaded. They are not included in the Scope 1 total."}
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-[#BFE3D3] bg-[#EAF7F1]/40 p-4 space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#0F6E56]">Mobile combustion (verified)</p>
          <p className="text-xs text-slate-600 mt-0.5">
            Calculated by the EPA mobile service. Older mobile entries stay in the legacy list and are not added to this total.
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums text-slate-900">
            Scope 1 {formatExactTonnes(verified.totalTco2e)} tCO₂e
            <span className="ml-2 text-xs font-medium text-slate-500">{formatKg(verified.totalKgCo2e)} kg CO₂e</span>
          </p>
          <p className="text-xs text-slate-600">
            {biogenicReportLabel(verified.biogenicCo2Tonnes ?? null, verified.biogenicStatus || "not_recorded")}. GWP AR5.
          </p>
        </div>
      </div>
      {verified.status === "empty" ? (
        <p className="text-sm text-slate-500">No verified mobile combustion records for this view.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {["Vehicle or equipment", "Fuel", "Period", "CO₂", "CH₄", "N₂O", "Scope 1 tCO₂e", "Biogenic CO₂", "GWP", "Factor provenance"].map(
                  (heading) => (
                    <th key={heading} className="text-left px-3 py-2.5 font-semibold text-slate-600 whitespace-nowrap">
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {verified.activities.map((activity) => (
                <MobileActivityRow key={activity.id} activity={activity} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MobileActivityRow({ activity }: { activity: MobileResultActivity }) {
  return (
    <tr className="border-t border-slate-100 align-top">
      <td className="px-3 py-2.5 text-slate-800">
        <div className="font-medium">{dash(activity.vehicleType || activity.roadClass)}</div>
        {activity.equipmentId && <div className="text-xs text-slate-500">{activity.equipmentId}</div>}
      </td>
      <td className="px-3 py-2.5 text-slate-700">
        <div>{dash(activity.fuel)}</div>
        <div className="text-xs text-slate-500">
          {dash(activity.fuelQuantity)} {activity.fuelUnit}
        </div>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap text-slate-700">{dash(activity.period)}</td>
      <GasCell gas={activity.co2} />
      <GasCell gas={activity.ch4} />
      <GasCell gas={activity.n2o} />
      <td className="px-3 py-2.5 font-medium tabular-nums text-slate-900 whitespace-nowrap">{activity.totalTco2e}</td>
      <td className="px-3 py-2.5 whitespace-nowrap text-slate-700">{activity.biogenicCo2Tonnes || "not recorded"} t CO2</td>
      <td className="px-3 py-2.5 whitespace-nowrap text-slate-700">{dash(activity.gwpVersion)}</td>
      <td className="px-3 py-2.5 text-xs text-slate-600 max-w-[220px]">{dash(activity.factorSource)}</td>
    </tr>
  );
}

function LegacyStationaryReconciliation({ rows }: { rows: EmissionCategoryTotal[] }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-amber-950">
          Legacy Stationary Combustion — Requires Reconciliation
        </p>
        <p className="text-xs text-amber-900 mt-0.5">
          These historical figures use the earlier calculation method. They stay available here and are excluded from the reportable Scope 1 and grand totals.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-amber-900">No unreconciled legacy stationary records in this view.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-amber-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-amber-50">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Source</th>
                <th className="text-right px-4 py-2.5 font-semibold text-slate-600">kg CO₂e</th>
                <th className="text-right px-4 py-2.5 font-semibold text-slate-600">tCO₂e</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-t border-amber-100">
                  <td className="px-4 py-2.5 text-slate-800">{row.label}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatKg(row.value)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatTonnes(row.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

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

  const verified = results.stationaryVerified;
  const mobile = results.mobileVerified;
  const refrigerant = results.refrigerantVerified;
  const reporting = buildReportingTotals(results);
  const verifiedLines = verifiedScope1Lines(results);
  const grand = reporting.grandKg;

  const filterRows = (rows: BreakdownRow[]) => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => r.value > 0)
      .filter((r) => !q || r.label.toLowerCase().includes(q) || r.scope.toLowerCase().includes(q));
  };

  const renderTable = (rows: BreakdownRow[], colSpan: number) => {
    const filtered = filterRows(rows);
    const pctGrand = grand;

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
                        {row.key === "stationary_verified" && verified
                          ? formatExactTonnes(verified.totalTco2e)
                          : formatTonnes(row.value)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                        {pctGrand == null ? "—" : `${formatPct(pctOfTotal(row.value, pctGrand))}%`}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.key === "stationary_verified" ? null : (
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
                        )}
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

        <TabsContent value="scope1" className="mt-0 space-y-4">
          <VerifiedStationaryPanel verified={verified} />
          <VerifiedMobilePanel verified={mobile} />
          <VerifiedRefrigerantPanel verified={refrigerant} />
          <LegacyStationaryReconciliation rows={reporting.legacyStationary} />
          <LegacyMobileExcluded rows={reporting.legacyMobile} />
          <LegacyRefrigerantExcluded rows={reporting.legacyRefrigerant} />
          {(verifiedLines.length > 0 || reportableActivityGroups(results).length > 0) && (
            <div className="rounded-xl border border-[#BFE3D3] bg-[#EAF7F1]/40 p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-[#0F6E56]">
                  Scope 1 by activity group
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Reportable groups only. Verified stationary, mobile, and refrigerant leakage records are listed here. Legacy refrigerant, legacy mobile, and unreconciled stationary records are listed separately.
                </p>
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Activity</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-slate-600">kg CO₂e</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-slate-600">tCO₂e</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Sources</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verifiedLines.map((line) => (
                      <tr key={line.key} className="border-t border-slate-100">
                        <td className="px-4 py-2.5 font-medium text-slate-800">{line.label}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{formatKg(line.value)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium">{formatTonnes(line.value)}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">Verified EPA record</td>
                      </tr>
                    ))}
                    {reportableActivityGroups(results).map((g) => (
                      <tr key={g.groupId} className="border-t border-slate-100">
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-slate-800">{g.label}</div>
                          {g.provenanceNotes.length > 0 && (
                            <div className="text-xs text-amber-800 mt-1">
                              {g.provenanceNotes.join(" ")}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {formatKg(g.valueKg)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                          {formatTonnes(g.valueKg)}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">
                          {g.legacyParts.filter((p) => p.value > 0).length
                            ? g.legacyParts
                                .filter((p) => p.value > 0)
                                .map((p) => p.label)
                                .join("; ")
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">
              Reportable Scope 1 categories
            </p>
            {renderTable(
              [
                ...verifiedLines.map((row) => ({ ...row, scope: "Scope 1" as const })),
                ...reporting.reportableScope1.map((r) => ({ ...r, scope: "Scope 1" as const })),
              ],
              5
            )}
          </div>
        </TabsContent>
        <TabsContent value="scope2" className="mt-0">
          <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">
            Verified location-based purchased electricity
          </p>
          {renderTable(
            (results.electricityVerified?.activities || []).map((activity) => ({
              key: activity.id,
              label: `${activity.country} ${activity.gridRegion} ${activity.period}`,
              value: Number(activity.totalTco2e) * 1000,
              scope: "Scope 2" as const,
            })),
            5
          )}
          <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">
            Verified purchased heat and steam
          </p>
          {renderTable(
            (results.heatSteamVerified?.activities || []).map((activity) => ({
              key: activity.id,
              label: `${activity.energyForm === "purchased_steam" ? "Purchased steam" : "Purchased heat"} ${activity.period}`,
              value: Number(activity.totalTco2e) * 1000,
              scope: "Scope 2" as const,
            })),
            5
          )}
          <p className="text-xs text-slate-500 mt-3 mb-2">
            {results.heatSteamVerified
              ? "Purchased cooling is not included. Legacy Scope 2 records are excluded from the verified annual total. The heat and steam factor assumes natural-gas production at 80 percent thermal efficiency and is not supplier-specific."
              : "Legacy Scope 2 records are excluded from the verified annual total. Heat, steam, and cooling are not included. Contractual renewable claims are not added to this total."}
          </p>
          {renderTable(
            results.scope2.map((r) => ({ ...r, label: `${r.label} (legacy, excluded)`, scope: "Scope 2" as const })),
            5
          )}
        </TabsContent>
        <TabsContent value="scope3" className="mt-0">
          <p className="text-xs text-slate-500 mb-3">
            Legacy undated Scope 3 records are excluded from the verified annual total. Franchises, upstream leased assets, and downstream leased assets are not calculated. A stored zero is not a verified result.
          </p>
          {renderTable(
            results.scope3.map((r) => ({ ...r, label: `${r.label} (legacy, excluded)`, scope: "Scope 3" as const })),
            5
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
};

export default ResultsBreakdownTabs;

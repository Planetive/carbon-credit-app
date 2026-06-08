import { Link, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { loadBoundaryDraft } from "../../boundary/storage";
import type { BoundaryDraftV2 } from "../../boundary/boundaryTypes";
import { formatPeriodRangeLabel } from "../shared/periodUtils";
import {
  defaultIndigenousRightsAssetData,
  getIndigenousRightsDataForAsset,
  loadIndigenousRightsStore,
} from "./storage";
import {
  calcGrievanceResolutionRatePct,
  calcResolvedGrievances,
  calcTotalGrievances,
  calcUnresolvedGrievances,
  formatIndigenousRightsNum,
} from "./calculations";
import type { IndigenousRightsAssetData } from "./types";

const sectionShell = (accent: string) =>
  `border-2 border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden ${accent}`;

const IndigenousRightsResultsScreen = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [draft, setDraft] = useState<BoundaryDraftV2>(() => loadBoundaryDraft());
  const [store, setStore] = useState(() => loadIndigenousRightsStore(loadBoundaryDraft()));
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const refreshBoundary = useCallback(() => {
    const d = loadBoundaryDraft();
    setDraft(d);
    setStore(loadIndigenousRightsStore(d));
  }, []);

  useEffect(() => {
    refreshBoundary();
  }, [refreshBoundary]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") refreshBoundary();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [refreshBoundary]);

  useEffect(() => {
    setSelectedAssetId((cur) => {
      const fromUrl = searchParams.get("assetId");
      if (fromUrl && draft.assets.some((a) => a.id === fromUrl)) return fromUrl;
      if (cur && draft.assets.some((a) => a.id === cur)) return cur;
      return draft.assets[0]?.id ?? null;
    });
  }, [draft.assets, searchParams]);

  const onAssetChange = (id: string) => {
    setSelectedAssetId(id);
    setSearchParams({ assetId: id }, { replace: true });
  };

  const periodLabel = useMemo(
    () => formatPeriodRangeLabel(draft.period_start, draft.period_end),
    [draft.period_end, draft.period_start]
  );

  const selectedAsset = draft.assets.find((a) => a.id === selectedAssetId) ?? null;
  const data: IndigenousRightsAssetData = selectedAssetId
    ? getIndigenousRightsDataForAsset(store, selectedAssetId)
    : defaultIndigenousRightsAssetData();

  const totalGrievances = calcTotalGrievances(data.grievanceRows);
  const resolvedGrievances = calcResolvedGrievances(data.grievanceRows);
  const unresolvedGrievances = calcUnresolvedGrievances(data.grievanceRows);
  const resolutionRate = calcGrievanceResolutionRatePct(data.grievanceRows);

  const hasRelevantData = useMemo(() => {
    if (!selectedAssetId) return false;
    const d = data;
    return (
      d.proximityToIndigenousLands !== "Unknown" ||
      d.fpicStatus !== "Not required" ||
      d.consultationEventsCount.trim() !== "" && d.consultationEventsCount !== "0" ||
      d.consultationNarrative.trim() !== "" ||
      d.grievanceRows.length > 0 ||
      d.fpicPolicyInPlace === "Yes" ||
      d.fpicProcessNarrative.trim() !== "" ||
      d.ifcPs7Completed !== "No" ||
      d.ifcPs7AssessmentDate.trim() !== ""
    );
  }, [data, selectedAssetId]);

  return (
    <div className="min-w-0 max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <Button variant="ghost" className="px-0 mb-2 h-auto text-slate-600 hover:text-teal-700" asChild>
          <Link to="/esg-management/indigenous-rights" className="inline-flex items-center text-sm font-medium">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to data entry
          </Link>
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Security, Human Rights &amp; Rights of Indigenous Peoples — summary
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl mt-1">
          Read-only summary. Edit data on the previous page.
        </p>
        <p className="text-xs text-slate-500 mt-2">
          Reporting period: <span className="font-medium text-slate-700">{periodLabel}</span>
        </p>
      </div>

      {draft.assets.length === 0 ? (
        <Alert className="border-amber-200 bg-amber-50/50 border-2 rounded-xl">
          <AlertTitle className="text-amber-950">Add assets first</AlertTitle>
          <AlertDescription className="text-sm text-amber-950/90 mt-1">
            Register sites in{" "}
            <Link to="/esg-management/boundary-setting" className="font-medium underline underline-offset-2">
              Boundary setting
            </Link>
            .
          </AlertDescription>
        </Alert>
      ) : (
        <Card className={sectionShell("border-l-4 border-l-slate-400")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-slate-900">Asset</CardTitle>
            <CardDescription className="text-slate-600">Choose which asset this summary reflects.</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedAssetId ?? ""} onValueChange={onAssetChange}>
              <SelectTrigger className="border-2 border-slate-200 max-w-md">
                <SelectValue placeholder="Choose an asset" />
              </SelectTrigger>
              <SelectContent>
                {draft.assets.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.asset_name?.trim() || `Asset ${a.id.slice(0, 8)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      <Card className={sectionShell("border-l-4 border-l-slate-700")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">Results</CardTitle>
          <CardDescription className="text-slate-600">
            Reporting period: <span className="font-medium text-slate-800">{periodLabel}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!draft.assets.length ? (
            <p className="text-sm text-slate-600">Add assets in boundary setting, then return to data entry.</p>
          ) : !hasRelevantData ? (
            <p className="text-sm text-slate-600">
              No data yet — enter proximity, FPIC, grievances, or policy details on the data entry page.
            </p>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Land proximity</h3>
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-3">
                  <p className="text-xs text-slate-600">Operations in or near indigenous peoples&apos; lands</p>
                  <p className="text-lg font-semibold text-slate-900 mt-1">{data.proximityToIndigenousLands}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">FPIC &amp; process</h3>
                <div className="rounded-lg border border-slate-200 overflow-hidden mb-3">
                  <table className="w-full text-sm">
                    <tbody className="text-slate-700">
                      <tr className="border-b border-slate-100">
                        <td className="py-2 px-3 font-medium text-slate-800 bg-slate-50 w-2/5">FPIC status</td>
                        <td className="py-2 px-3">{data.fpicStatus}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2 px-3 font-medium text-slate-800 bg-slate-50">Consultation events</td>
                        <td className="py-2 px-3 tabular-nums">{data.consultationEventsCount.trim() || "0"}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2 px-3 font-medium text-slate-800 bg-slate-50">FPIC policy in place</td>
                        <td className="py-2 px-3">{data.fpicPolicyInPlace}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2 px-3 font-medium text-slate-800 bg-slate-50">IFC PS7</td>
                        <td className="py-2 px-3">
                          {data.ifcPs7Completed}
                          {data.ifcPs7AssessmentDate.trim() ? ` · ${data.ifcPs7AssessmentDate}` : ""}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {data.consultationNarrative.trim() && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-slate-800 mb-1">Consultation summary</p>
                    <p className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-700">
                      {data.consultationNarrative.trim()}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-slate-800 mb-1">FPIC process narrative</p>
                  <p className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-700">
                    {data.fpicProcessNarrative.trim() || "Not entered"}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Community grievances</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-3">
                  <div className="rounded-lg border border-red-200 bg-red-50/40 px-3 py-3">
                    <p className="text-xs text-slate-600">Total</p>
                    <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">{totalGrievances}</p>
                  </div>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 px-3 py-3">
                    <p className="text-xs text-slate-600">Resolved</p>
                    <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">{resolvedGrievances}</p>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-3">
                    <p className="text-xs text-slate-600">Unresolved</p>
                    <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">{unresolvedGrievances}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3">
                    <p className="text-xs text-slate-600">Resolution rate</p>
                    <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">
                      {formatIndigenousRightsNum(resolutionRate)}%
                    </p>
                  </div>
                </div>
                {data.grievanceRows.length > 0 && (
                  <div className="rounded-lg border border-slate-200 overflow-x-auto">
                    <table className="w-full text-sm min-w-[640px]">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="py-2 px-3 text-left font-semibold text-slate-800">Date</th>
                          <th className="py-2 px-3 text-left font-semibold text-slate-800">Type</th>
                          <th className="py-2 px-3 text-left font-semibold text-slate-800">Description</th>
                          <th className="py-2 px-3 text-left font-semibold text-slate-800">Resolved</th>
                          <th className="py-2 px-3 text-left font-semibold text-slate-800">Resolution date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.grievanceRows.map((r) => (
                          <tr key={r.id} className="border-b border-slate-100">
                            <td className="py-2 px-3">{r.dateReceived || "—"}</td>
                            <td className="py-2 px-3">{r.grievanceType}</td>
                            <td className="py-2 px-3">{r.description.trim() || "—"}</td>
                            <td className="py-2 px-3">{r.resolved ? "Yes" : "No"}</td>
                            <td className="py-2 px-3">{r.resolutionDate || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {selectedAsset && (
        <p className="text-xs text-slate-500">
          Summary for:{" "}
          <span className="font-medium text-slate-700">{selectedAsset.asset_name?.trim() || selectedAsset.id.slice(0, 8)}</span>
        </p>
      )}

      <p className="text-sm text-slate-600">
        <Link to="/esg-management/topics" className="font-medium text-teal-700 hover:underline underline-offset-2">
          Back to ESG topics
        </Link>
      </p>
    </div>
  );
};

export default IndigenousRightsResultsScreen;

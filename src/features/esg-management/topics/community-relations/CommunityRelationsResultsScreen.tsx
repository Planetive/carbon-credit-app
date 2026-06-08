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
  defaultCommunityRelationsAssetData,
  getCommunityRelationsDataForAsset,
  loadCommunityRelationsStore,
} from "./storage";
import { calcAvgDaysPerDelay, formatCommunityNum, parseCommunityInteger } from "./calculations";
import type { CommunityRelationsAssetData } from "./types";

const sectionShell = (accent: string) =>
  `border-2 border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden ${accent}`;

const CommunityRelationsResultsScreen = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [draft, setDraft] = useState<BoundaryDraftV2>(() => loadBoundaryDraft());
  const [store, setStore] = useState(() => loadCommunityRelationsStore(loadBoundaryDraft()));
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const refreshBoundary = useCallback(() => {
    const d = loadBoundaryDraft();
    setDraft(d);
    setStore(loadCommunityRelationsStore(d));
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
  const data: CommunityRelationsAssetData = selectedAssetId
    ? getCommunityRelationsDataForAsset(store, selectedAssetId)
    : defaultCommunityRelationsAssetData();

  const delayCount = parseCommunityInteger(data.nonTechnicalDelayCount);
  const delayDays = parseCommunityInteger(data.nonTechnicalDelayDays);
  const avgDaysPerDelay = calcAvgDaysPerDelay(data.nonTechnicalDelayCount, data.nonTechnicalDelayDays);

  const hasRelevantData = useMemo(() => {
    if (!selectedAssetId) return false;
    return (
      data.communityRightsProcessNarrative.trim() !== "" ||
      delayCount > 0 ||
      delayDays > 0 ||
      data.delayCostsNarrative.trim() !== "" ||
      data.delayRootCauseNarrative.trim() !== "" ||
      data.delayCorrectiveActionsNarrative.trim() !== ""
    );
  }, [data, delayCount, delayDays, selectedAssetId]);

  const narrative = (value: string) => (value.trim() ? value : "Not entered");

  return (
    <div className="min-w-0 max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <Button variant="ghost" className="px-0 mb-2 h-auto text-slate-600 hover:text-teal-700" asChild>
          <Link to="/esg-management/community-relations" className="inline-flex items-center text-sm font-medium">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to data entry
          </Link>
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Community Relations — summary</h1>
        <p className="text-sm text-slate-600 max-w-2xl mt-1">
          Read-only SASB EM-EP-210b metrics. Edit data on the previous page.
        </p>
        <p className="text-xs text-slate-500 mt-2">
          Reporting period: <span className="font-medium text-slate-700">{periodLabel}</span>
        </p>
      </div>

      {draft.assets.length === 0 ? (
        <Alert>
          <AlertTitle>No assets</AlertTitle>
          <AlertDescription>Add assets in boundary setting before viewing summaries.</AlertDescription>
        </Alert>
      ) : (
        <Card className={sectionShell("border-l-4 border-l-slate-400")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-slate-900">Asset</CardTitle>
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

      {!hasRelevantData ? (
        <Alert className="border-slate-200">
          <AlertTitle className="text-slate-900">No data yet</AlertTitle>
          <AlertDescription>
            Enter community rights process, delay counts, or narrative disclosures on the data entry page.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border-2 border-slate-200 bg-white p-5">
              <p className="text-xs text-slate-500 font-medium">EM-EP-210b.2 — Delay events</p>
              <p className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">{formatCommunityNum(delayCount)}</p>
            </div>
            <div className="rounded-xl border-2 border-slate-200 bg-white p-5">
              <p className="text-xs text-slate-500 font-medium">EM-EP-210b.3 — Total delay days</p>
              <p className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">{formatCommunityNum(delayDays)}</p>
            </div>
            <div className="rounded-xl border-2 border-slate-200 bg-white p-5">
              <p className="text-xs text-slate-500 font-medium">Avg days per delay</p>
              <p className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">
                {avgDaysPerDelay === null ? "—" : formatCommunityNum(avgDaysPerDelay, 1)}
              </p>
            </div>
          </div>

          <Card className={sectionShell("border-l-4 border-l-violet-500")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-slate-900">EM-EP-210b.1 — Community rights process</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{narrative(data.communityRightsProcessNarrative)}</p>
            </CardContent>
          </Card>

          <Card className={sectionShell("border-l-4 border-l-orange-500")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-slate-900">EM-EP-210b.4 — Delays and costs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{narrative(data.delayCostsNarrative)}</p>
            </CardContent>
          </Card>

          <Card className={sectionShell("border-l-4 border-l-amber-500")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-slate-900">EM-EP-210b.5 — Root causes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{narrative(data.delayRootCauseNarrative)}</p>
            </CardContent>
          </Card>

          <Card className={sectionShell("border-l-4 border-l-teal-500")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-slate-900">EM-EP-210b.6 — Corrective actions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {narrative(data.delayCorrectiveActionsNarrative)}
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {selectedAsset && (
        <p className="text-xs text-slate-500">
          Viewing:{" "}
          <span className="font-medium text-slate-700">
            {selectedAsset.asset_name?.trim() || selectedAsset.id.slice(0, 8)}
          </span>
        </p>
      )}
    </div>
  );
};

export default CommunityRelationsResultsScreen;

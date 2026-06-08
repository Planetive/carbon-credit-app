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
  defaultEnvironmentalManagementAssetData,
  getEnvironmentalManagementDataForAsset,
  loadEnvironmentalManagementStore,
} from "./storage";
import {
  calcPctSpillsInSensitiveAreas,
  calcPctVolumeRecovered,
  calcPctWellsWithIntegrityIssues,
  calcSpillCount,
  calcTotalSpillVolumeCubicM,
  calcWellIntegrityFailures,
  formatEnvMgmtNum,
} from "./calculations";
import type { EnvironmentalManagementAssetData } from "./types";

const sectionShell = (accent: string) =>
  `border-2 border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden ${accent}`;

const EnvironmentalManagementResultsScreen = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [draft, setDraft] = useState<BoundaryDraftV2>(() => loadBoundaryDraft());
  const [store, setStore] = useState(() => loadEnvironmentalManagementStore(loadBoundaryDraft()));
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const refreshBoundary = useCallback(() => {
    const d = loadBoundaryDraft();
    setDraft(d);
    setStore(loadEnvironmentalManagementStore(d));
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
  const data: EnvironmentalManagementAssetData = selectedAssetId
    ? getEnvironmentalManagementDataForAsset(store, selectedAssetId)
    : defaultEnvironmentalManagementAssetData();

  const spillCount = calcSpillCount(data.spillRows);
  const totalSpillVolume = calcTotalSpillVolumeCubicM(data.spillRows);
  const pctSensitive = calcPctSpillsInSensitiveAreas(data.spillRows);
  const pctRecovered = calcPctVolumeRecovered(data.spillRows);
  const wellFailures = calcWellIntegrityFailures(data.wellIntegrityRows);
  const pctWellIssues = calcPctWellsWithIntegrityIssues(data.wellIntegrityRows);
  const hasSpillData = data.spillRows.length > 0;
  const hasWellData = data.wellIntegrityRows.length > 0;

  const hasRelevantData = useMemo(() => hasSpillData || hasWellData, [hasSpillData, hasWellData]);

  return (
    <div className="min-w-0 max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <Button variant="ghost" className="px-0 mb-2 h-auto text-slate-600 hover:text-teal-700" asChild>
          <Link to="/esg-management/environmental-management" className="inline-flex items-center text-sm font-medium">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to data entry
          </Link>
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Environmental Management of E&amp;P Activities — summary
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
              No data yet — add spill or well integrity rows on the data entry page.
            </p>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Hydrocarbon spills</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-lg border border-red-200 bg-red-50/40 px-3 py-3">
                    <p className="text-xs text-slate-600">Total spill count</p>
                    <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">{spillCount}</p>
                  </div>
                  <div className="rounded-lg border border-red-200 bg-red-50/40 px-3 py-3">
                    <p className="text-xs text-slate-600">Total volume released (m³)</p>
                    <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">
                      {formatEnvMgmtNum(totalSpillVolume, 2)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-3">
                    <p className="text-xs text-slate-600">% spills in sensitive areas</p>
                    <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">
                      {hasSpillData ? `${formatEnvMgmtNum(pctSensitive)}%` : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-3">
                    <p className="text-xs text-slate-600">% volume recovered</p>
                    <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">
                      {hasSpillData ? `${formatEnvMgmtNum(pctRecovered)}%` : "—"}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Well integrity</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                  <div className="rounded-lg border border-orange-200 bg-orange-50/40 px-3 py-3">
                    <p className="text-xs text-slate-600">Well integrity failures</p>
                    <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">{wellFailures}</p>
                  </div>
                  <div className="rounded-lg border border-orange-200 bg-orange-50/40 px-3 py-3">
                    <p className="text-xs text-slate-600">% wells with integrity issues</p>
                    <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">
                      {hasWellData ? `${formatEnvMgmtNum(pctWellIssues)}%` : "—"}
                    </p>
                  </div>
                </div>
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

export default EnvironmentalManagementResultsScreen;

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
  defaultEmergencyManagementAssetData,
  getEmergencyManagementDataForAsset,
  loadEmergencyManagementStore,
} from "./storage";
import {
  calcBlowouts,
  calcPreparednessAverageScore,
  calcTotalHydrocarbonReleases,
  calcTotalReleaseVolumeM3,
  calcWellControlIncidents,
  formatEmergencyNum,
  parseEmergencyNumericInput,
} from "./calculations";
import { PREPAREDNESS_DOMAIN_META, type EmergencyManagementAssetData } from "./types";

const sectionShell = (accent: string) =>
  `border-2 border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden ${accent}`;

const EmergencyManagementResultsScreen = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [draft, setDraft] = useState<BoundaryDraftV2>(() => loadBoundaryDraft());
  const [store, setStore] = useState(() => loadEmergencyManagementStore(loadBoundaryDraft()));
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const refreshBoundary = useCallback(() => {
    const d = loadBoundaryDraft();
    setDraft(d);
    setStore(loadEmergencyManagementStore(d));
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
  const data: EmergencyManagementAssetData = selectedAssetId
    ? getEmergencyManagementDataForAsset(store, selectedAssetId)
    : defaultEmergencyManagementAssetData();

  const totalReleases = calcTotalHydrocarbonReleases(data.hydrocarbonReleases);
  const totalVolume = calcTotalReleaseVolumeM3(data.hydrocarbonReleases);
  const wellControlCount = calcWellControlIncidents(data.wellControlIncidents);
  const blowoutCount = calcBlowouts(data.wellControlIncidents);
  const preparednessAvg = calcPreparednessAverageScore(data.preparednessScore);

  const hasRelevantData = useMemo(() => {
    if (!selectedAssetId) return false;
    const d = data;
    return (
      d.hydrocarbonReleases.length > 0 ||
      d.wellControlIncidents.length > 0 ||
      parseEmergencyNumericInput(d.pctAssetsWithErpCoverage) > 0 ||
      parseEmergencyNumericInput(d.drillsPerAssetPerYear) > 0 ||
      d.mutualAidInPlace === "Yes" ||
      d.mutualAidCounterparties.trim() !== "" ||
      d.wellControlCertification !== "None" ||
      parseEmergencyNumericInput(d.pctDrillingStaffCertified) > 0 ||
      d.emergencyManagementNarrative.trim() !== "" ||
      PREPAREDNESS_DOMAIN_META.some(({ key }) => d.preparednessScore[key] !== 1)
    );
  }, [data, selectedAssetId]);

  return (
    <div className="min-w-0 max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <Button variant="ghost" className="px-0 mb-2 h-auto text-slate-600 hover:text-[#0A4D3E]" asChild>
          <Link to="/esg-management/emergency-management" className="inline-flex items-center text-sm font-medium">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to data entry
          </Link>
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Emergency Management — summary</h1>
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
              No data yet — enter releases, well control incidents, preparedness, or narrative on the data entry page.
            </p>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Hydrocarbon releases</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-red-200 bg-red-50/50 px-3 py-3">
                    <p className="text-xs text-slate-600">Total releases (count)</p>
                    <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">{totalReleases}</p>
                  </div>
                  <div className="rounded-lg border border-red-200 bg-red-50/50 px-3 py-3">
                    <p className="text-xs text-slate-600">Total volume released</p>
                    <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">
                      {formatEmergencyNum(totalVolume)} m³
                    </p>
                  </div>
                </div>
                {data.hydrocarbonReleases.length > 0 && (
                  <div className="mt-3 rounded-lg border border-slate-200 overflow-x-auto">
                    <table className="w-full text-sm min-w-[640px]">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="py-2 px-3 text-left font-semibold text-slate-800">Date</th>
                          <th className="py-2 px-3 text-left font-semibold text-slate-800">Location</th>
                          <th className="py-2 px-3 text-left font-semibold text-slate-800">Volume (m³)</th>
                          <th className="py-2 px-3 text-left font-semibold text-slate-800">Cause</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.hydrocarbonReleases.map((r) => (
                          <tr key={r.id} className="border-b border-slate-100">
                            <td className="py-2 px-3">{r.date || "—"}</td>
                            <td className="py-2 px-3">{r.assetLocation.trim() || "—"}</td>
                            <td className="py-2 px-3 tabular-nums">{r.volumeM3.trim() || "—"}</td>
                            <td className="py-2 px-3">{r.cause.trim() || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Well control incidents</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-orange-200 bg-orange-50/50 px-3 py-3">
                    <p className="text-xs text-slate-600">Well control incidents</p>
                    <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">{wellControlCount}</p>
                  </div>
                  <div className="rounded-lg border border-orange-200 bg-orange-50/50 px-3 py-3">
                    <p className="text-xs text-slate-600">Blowouts</p>
                    <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">{blowoutCount}</p>
                  </div>
                </div>
                {data.wellControlIncidents.length > 0 && (
                  <div className="mt-3 rounded-lg border border-slate-200 overflow-x-auto">
                    <table className="w-full text-sm min-w-[480px]">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="py-2 px-3 text-left font-semibold text-slate-800">Date</th>
                          <th className="py-2 px-3 text-left font-semibold text-slate-800">Well ID</th>
                          <th className="py-2 px-3 text-left font-semibold text-slate-800">Blowout</th>
                          <th className="py-2 px-3 text-left font-semibold text-slate-800">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.wellControlIncidents.map((r) => (
                          <tr key={r.id} className="border-b border-slate-100">
                            <td className="py-2 px-3">{r.date || "—"}</td>
                            <td className="py-2 px-3">{r.wellId.trim() || "—"}</td>
                            <td className="py-2 px-3">{r.isBlowout ? "Yes" : "No"}</td>
                            <td className="py-2 px-3">{r.description.trim() || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Preparedness &amp; systems</h3>
                <div className="rounded-lg border border-slate-200 overflow-hidden mb-4">
                  <table className="w-full text-sm">
                    <tbody className="text-slate-700">
                      <tr className="border-b border-slate-100">
                        <td className="py-2 px-3 font-medium text-slate-800 bg-slate-50 w-2/5">% assets with ERP coverage</td>
                        <td className="py-2 px-3 tabular-nums">
                          {formatEmergencyNum(parseEmergencyNumericInput(data.pctAssetsWithErpCoverage), 1)}%
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2 px-3 font-medium text-slate-800 bg-slate-50">Drills per asset per year</td>
                        <td className="py-2 px-3 tabular-nums">
                          {formatEmergencyNum(parseEmergencyNumericInput(data.drillsPerAssetPerYear), 1)}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2 px-3 font-medium text-slate-800 bg-slate-50">Mutual aid in place</td>
                        <td className="py-2 px-3">{data.mutualAidInPlace}</td>
                      </tr>
                      {data.mutualAidInPlace === "Yes" && (
                        <tr className="border-b border-slate-100">
                          <td className="py-2 px-3 font-medium text-slate-800 bg-slate-50">Counterparties</td>
                          <td className="py-2 px-3">{data.mutualAidCounterparties.trim() || "—"}</td>
                        </tr>
                      )}
                      <tr className="border-b border-slate-100">
                        <td className="py-2 px-3 font-medium text-slate-800 bg-slate-50">Well control certification</td>
                        <td className="py-2 px-3">{data.wellControlCertification}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-medium text-slate-800 bg-slate-50">% drilling staff certified</td>
                        <td className="py-2 px-3 tabular-nums">
                          {formatEmergencyNum(parseEmergencyNumericInput(data.pctDrillingStaffCertified), 1)}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="text-sm font-medium text-slate-800 mb-2">Preparedness scores by domain</p>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 overflow-hidden mb-3">
                  <table className="w-full text-sm">
                    <tbody>
                      {PREPAREDNESS_DOMAIN_META.map(({ key, label }) => (
                        <tr key={key} className="border-b border-emerald-100 last:border-0">
                          <td className="py-2 px-3 font-medium text-slate-800">{label}</td>
                          <td className="py-2 px-3 tabular-nums text-right w-20">{data.preparednessScore[key]} / 5</td>
                        </tr>
                      ))}
                      <tr className="bg-emerald-100/50">
                        <td className="py-2 px-3 font-semibold text-slate-900">Average</td>
                        <td className="py-2 px-3 tabular-nums text-right font-semibold text-slate-900">
                          {formatEmergencyNum(preparednessAvg, 1)} / 5
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <p className="font-medium text-slate-800 mb-1 text-sm">Emergency management narrative</p>
                  <p className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-700">
                    {data.emergencyManagementNarrative.trim() || "Not entered"}
                  </p>
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
        <Link to="/esg-management/topics" className="font-medium text-[#0A4D3E] hover:underline underline-offset-2">
          Back to ESG topics
        </Link>
      </p>
    </div>
  );
};

export default EmergencyManagementResultsScreen;

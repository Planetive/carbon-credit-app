import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Info, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { loadBoundaryDraft } from "../../boundary/storage";
import type { BoundaryDraftV2 } from "../../boundary/boundaryTypes";
import { formatPeriodRangeLabel } from "../shared/periodUtils";
import { newTopicRowId } from "../shared/newId";
import {
  MUTUAL_AID_OPTIONS,
  PREPAREDNESS_DOMAIN_META,
  WELL_CONTROL_CERTIFICATION_OPTIONS,
  type EmergencyManagementAssetData,
  type HydrocarbonReleaseRow,
  type MutualAidInPlace,
  type PreparednessScoreKey,
  type WellControlCertificationType,
  type WellControlIncidentRow,
} from "./types";
import {
  defaultEmergencyManagementAssetData,
  getEmergencyManagementDataForAsset,
  loadEmergencyManagementStore,
  saveEmergencyManagementStore,
  setEmergencyManagementDataForAsset,
} from "./storage";
import {
  calcBlowouts,
  calcPreparednessAverageScore,
  calcTotalHydrocarbonReleases,
  calcTotalReleaseVolumeM3,
  calcWellControlIncidents,
  formatEmergencyNum,
} from "./calculations";

const sectionShell = (accent: string) =>
  `border-2 border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden ${accent}`;

const PREPAREDNESS_SCORE_LABELS: Record<number, string> = {
  1: "Minimal",
  2: "Basic",
  3: "Adequate",
  4: "Strong",
  5: "Leading",
};

const EmergencyManagementScreen = () => {
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
    if (draft.assets.length && !selectedAssetId) {
      setSelectedAssetId(draft.assets[0].id);
    }
    if (selectedAssetId && !draft.assets.some((a) => a.id === selectedAssetId)) {
      setSelectedAssetId(draft.assets[0]?.id ?? null);
    }
  }, [draft.assets, selectedAssetId]);

  const periodLabel = useMemo(
    () => formatPeriodRangeLabel(draft.period_start, draft.period_end),
    [draft.period_end, draft.period_start]
  );

  const selectedAsset = draft.assets.find((a) => a.id === selectedAssetId) ?? null;
  const data = selectedAssetId
    ? getEmergencyManagementDataForAsset(store, selectedAssetId)
    : defaultEmergencyManagementAssetData();

  const patchData = (updater: (d: EmergencyManagementAssetData) => EmergencyManagementAssetData) => {
    if (!selectedAssetId) return;
    const cur = getEmergencyManagementDataForAsset(store, selectedAssetId);
    const nextStore = setEmergencyManagementDataForAsset(store, selectedAssetId, updater(cur));
    setStore(nextStore);
    saveEmergencyManagementStore(nextStore);
  };

  const summaryHref =
    selectedAssetId != null
      ? `/esg-management/emergency-management/results?assetId=${encodeURIComponent(selectedAssetId)}`
      : "/esg-management/emergency-management/results";

  const totalReleases = calcTotalHydrocarbonReleases(data.hydrocarbonReleases);
  const totalVolume = calcTotalReleaseVolumeM3(data.hydrocarbonReleases);
  const wellControlCount = calcWellControlIncidents(data.wellControlIncidents);
  const blowoutCount = calcBlowouts(data.wellControlIncidents);
  const preparednessAvg = calcPreparednessAverageScore(data.preparednessScore);

  const addHydrocarbonRow = () => {
    const row: HydrocarbonReleaseRow = {
      id: newTopicRowId(),
      date: "",
      assetLocation: "",
      volumeM3: "",
      cause: "",
      responseDescription: "",
    };
    patchData((d) => ({ ...d, hydrocarbonReleases: [...d.hydrocarbonReleases, row] }));
  };

  const updateHydrocarbonRow = (id: string, patch: Partial<HydrocarbonReleaseRow>) => {
    patchData((d) => ({
      ...d,
      hydrocarbonReleases: d.hydrocarbonReleases.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  const removeHydrocarbonRow = (id: string) => {
    patchData((d) => ({
      ...d,
      hydrocarbonReleases: d.hydrocarbonReleases.filter((r) => r.id !== id),
    }));
  };

  const addWellControlRow = () => {
    const row: WellControlIncidentRow = {
      id: newTopicRowId(),
      date: "",
      wellId: "",
      isBlowout: false,
      description: "",
    };
    patchData((d) => ({ ...d, wellControlIncidents: [...d.wellControlIncidents, row] }));
  };

  const updateWellControlRow = (id: string, patch: Partial<WellControlIncidentRow>) => {
    patchData((d) => ({
      ...d,
      wellControlIncidents: d.wellControlIncidents.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  const removeWellControlRow = (id: string) => {
    patchData((d) => ({
      ...d,
      wellControlIncidents: d.wellControlIncidents.filter((r) => r.id !== id),
    }));
  };

  const setPreparednessScore = (key: PreparednessScoreKey, score: number) => {
    patchData((d) => ({
      ...d,
      preparednessScore: { ...d.preparednessScore, [key]: score },
    }));
  };

  return (
    <div className="min-w-0 max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <Link
          to="/esg-management/topics"
          className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-teal-700 mb-3 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to ESG topics
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Emergency Management</h1>
        <p className="text-sm text-slate-600 max-w-2xl mt-1">
          Hydrocarbon releases, well control incidents, preparedness, and emergency systems.
        </p>
        <p className="text-xs text-slate-500 mt-2">
          Reporting period: <span className="font-medium text-slate-700">{periodLabel}</span>
        </p>
      </div>

      {draft.assets.length === 0 ? (
        <Alert className="border-amber-200 bg-amber-50/50 border-2 rounded-xl">
          <Info className="h-4 w-4 text-amber-800" />
          <AlertTitle className="text-amber-950">Add assets first</AlertTitle>
          <AlertDescription className="text-sm text-amber-950/90 mt-1">
            Register sites in{" "}
            <Link to="/esg-management/boundary-setting" className="font-medium underline underline-offset-2">
              Boundary setting
            </Link>{" "}
            before recording topic data.
          </AlertDescription>
        </Alert>
      ) : (
        <Card className={sectionShell("border-l-4 border-l-slate-400")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-slate-900">Asset</CardTitle>
            <CardDescription className="text-slate-600">Data is saved per asset and reporting period.</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedAssetId ?? ""} onValueChange={setSelectedAssetId}>
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

      <Card className={sectionShell("border-l-4 border-l-red-600")}>
        <CardHeader className="pb-2 flex flex-row flex-wrap items-end justify-between gap-2">
          <div>
            <CardTitle className="text-lg text-slate-900">Significant Hydrocarbon Releases</CardTitle>
            <CardDescription className="text-slate-600">Record significant hydrocarbon release incidents for the reporting period.</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={!selectedAsset} onClick={addHydrocarbonRow}>
            <Plus className="h-4 w-4" />
            Add row
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="py-2 pr-2 font-semibold text-slate-800">Date</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Asset/Location</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Volume (m³)</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Cause</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Response actions</th>
                  <th className="py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {data.hydrocarbonReleases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-slate-500">
                      No hydrocarbon release rows yet.
                    </td>
                  </tr>
                ) : (
                  data.hydrocarbonReleases.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 align-top">
                      <td className="py-2 pr-2">
                        <Input
                          type="date"
                          className="border-2 border-slate-200 h-9"
                          value={r.date}
                          disabled={!selectedAsset}
                          onChange={(e) => updateHydrocarbonRow(r.id, { date: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          className="border-2 border-slate-200 h-9"
                          value={r.assetLocation}
                          disabled={!selectedAsset}
                          onChange={(e) => updateHydrocarbonRow(r.id, { assetLocation: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          className="border-2 border-slate-200 h-9"
                          value={r.volumeM3}
                          disabled={!selectedAsset}
                          onChange={(e) => updateHydrocarbonRow(r.id, { volumeM3: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          className="border-2 border-slate-200 h-9"
                          value={r.cause}
                          disabled={!selectedAsset}
                          onChange={(e) => updateHydrocarbonRow(r.id, { cause: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          className="border-2 border-slate-200 h-9"
                          value={r.responseDescription}
                          disabled={!selectedAsset}
                          onChange={(e) => updateHydrocarbonRow(r.id, { responseDescription: e.target.value })}
                        />
                      </td>
                      <td className="py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-slate-500"
                          disabled={!selectedAsset}
                          onClick={() => removeHydrocarbonRow(r.id)}
                          aria-label="Remove row"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="text-sm text-slate-700 space-y-1">
            <p>
              Total releases: <span className="font-semibold text-slate-900 tabular-nums">{totalReleases}</span>
            </p>
            <p>
              Total volume released:{" "}
              <span className="font-semibold text-slate-900 tabular-nums">{formatEmergencyNum(totalVolume)} m³</span>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-orange-500")}>
        <CardHeader className="pb-2 flex flex-row flex-wrap items-end justify-between gap-2">
          <div>
            <CardTitle className="text-lg text-slate-900">Well Control Incidents</CardTitle>
            <CardDescription className="text-slate-600">Well control events including blowouts.</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={!selectedAsset} onClick={addWellControlRow}>
            <Plus className="h-4 w-4" />
            Add row
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="py-2 pr-2 font-semibold text-slate-800">Date</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Well ID</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Blowout?</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Description</th>
                  <th className="py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {data.wellControlIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-slate-500">
                      No well control rows yet.
                    </td>
                  </tr>
                ) : (
                  data.wellControlIncidents.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 align-top">
                      <td className="py-2 pr-2">
                        <Input
                          type="date"
                          className="border-2 border-slate-200 h-9"
                          value={r.date}
                          disabled={!selectedAsset}
                          onChange={(e) => updateWellControlRow(r.id, { date: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          className="border-2 border-slate-200 h-9"
                          value={r.wellId}
                          disabled={!selectedAsset}
                          onChange={(e) => updateWellControlRow(r.id, { wellId: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-2 h-9">
                          <Checkbox
                            id={`blowout-${r.id}`}
                            checked={r.isBlowout}
                            disabled={!selectedAsset}
                            onCheckedChange={(c) => updateWellControlRow(r.id, { isBlowout: c === true })}
                          />
                          <Label htmlFor={`blowout-${r.id}`} className="text-xs cursor-pointer">
                            Yes
                          </Label>
                        </div>
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          className="border-2 border-slate-200 h-9"
                          value={r.description}
                          disabled={!selectedAsset}
                          onChange={(e) => updateWellControlRow(r.id, { description: e.target.value })}
                        />
                      </td>
                      <td className="py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-slate-500"
                          disabled={!selectedAsset}
                          onClick={() => removeWellControlRow(r.id)}
                          aria-label="Remove row"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="text-sm text-slate-700 space-y-1">
            <p>
              Total well control incidents:{" "}
              <span className="font-semibold text-slate-900 tabular-nums">{wellControlCount}</span>
            </p>
            <p>
              Total blowouts: <span className="font-semibold text-slate-900 tabular-nums">{blowoutCount}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-blue-500")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">Emergency Response Preparedness</CardTitle>
          <CardDescription className="text-slate-600">ERP coverage, drills, and mutual aid arrangements.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-slate-800">% assets with ERP coverage</Label>
              <Input
                className="border-2 border-slate-200"
                value={data.pctAssetsWithErpCoverage}
                disabled={!selectedAsset}
                onChange={(e) => patchData((d) => ({ ...d, pctAssetsWithErpCoverage: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-800">Drills per asset per year</Label>
              <Input
                className="border-2 border-slate-200"
                value={data.drillsPerAssetPerYear}
                disabled={!selectedAsset}
                onChange={(e) => patchData((d) => ({ ...d, drillsPerAssetPerYear: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-800">Mutual aid agreements in place</Label>
              <Select
                value={data.mutualAidInPlace}
                disabled={!selectedAsset}
                onValueChange={(v) => patchData((d) => ({ ...d, mutualAidInPlace: v as MutualAidInPlace }))}
              >
                <SelectTrigger className="border-2 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MUTUAL_AID_OPTIONS.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {data.mutualAidInPlace === "Yes" && (
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-slate-800">Mutual aid counterparties</Label>
                <Input
                  className="border-2 border-slate-200"
                  placeholder="e.g. regional operators, government agencies"
                  value={data.mutualAidCounterparties}
                  disabled={!selectedAsset}
                  onChange={(e) => patchData((d) => ({ ...d, mutualAidCounterparties: e.target.value }))}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-teal-500")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">Well Control Certification (EM-07)</CardTitle>
          <CardDescription className="text-slate-600">Certification scheme and certified drilling staff share.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-slate-800">Certification type</Label>
            <Select
              value={data.wellControlCertification}
              disabled={!selectedAsset}
              onValueChange={(v) =>
                patchData((d) => ({ ...d, wellControlCertification: v as WellControlCertificationType }))
              }
            >
              <SelectTrigger className="border-2 border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WELL_CONTROL_CERTIFICATION_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-800">% drilling staff certified</Label>
            <Input
              className="border-2 border-slate-200"
              value={data.pctDrillingStaffCertified}
              disabled={!selectedAsset}
              onChange={(e) => patchData((d) => ({ ...d, pctDrillingStaffCertified: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-emerald-600")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">Emergency Preparedness Score (EM-08)</CardTitle>
          <CardDescription className="text-slate-600">Self-assessment across five preparedness domains (1 = minimal, 5 = leading).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {PREPAREDNESS_DOMAIN_META.map(({ key, label }) => {
            const selected = data.preparednessScore[key];
            return (
              <div key={key} className="space-y-2 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="text-slate-800">{label}</Label>
                  <span className="text-xs text-slate-500">Score {selected}</span>
                </div>
                <div className="grid grid-cols-5 gap-2 max-w-lg">
                  {([1, 2, 3, 4, 5] as const).map((score) => (
                    <button
                      key={score}
                      type="button"
                      disabled={!selectedAsset}
                      onClick={() => setPreparednessScore(key, score)}
                      className={cn(
                        "rounded-lg border px-2 py-2 text-sm transition-all",
                        selected === score
                          ? "bg-teal-600 border-teal-600 text-white"
                          : "bg-white border-slate-300 text-slate-700 hover:border-slate-500"
                      )}
                    >
                      <div className="font-semibold">{score}</div>
                      <div className="text-[11px]">{PREPAREDNESS_SCORE_LABELS[score]}</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          <p className="text-sm text-slate-700">
            Average preparedness score:{" "}
            <span className="font-semibold text-slate-900 tabular-nums">{formatEmergencyNum(preparednessAvg, 1)}</span> / 5
          </p>
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-violet-500")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">Emergency Management Systems Description</CardTitle>
          <CardDescription className="text-slate-600">Narrative on emergency management systems and preparedness.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            className="border-2 border-slate-200 min-h-[120px]"
            placeholder="Describe emergency plan coverage, drill frequency, mutual aid arrangements, OPITO/IWCF certification, and how your emergency management system is maintained."
            value={data.emergencyManagementNarrative}
            disabled={!selectedAsset}
            onChange={(e) => patchData((d) => ({ ...d, emergencyManagementNarrative: e.target.value }))}
          />
        </CardContent>
      </Card>

      {draft.assets.length > 0 && (
        <Card className={sectionShell("border-l-4 border-l-slate-700")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-slate-900">Summary</CardTitle>
            <CardDescription className="text-slate-600">
              Open a dedicated page for release volumes, well control metrics, and preparedness scores.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md" asChild>
              <Link to={summaryHref}>View summary</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {selectedAsset && (
        <p className="text-xs text-slate-500">
          Editing:{" "}
          <span className="font-medium text-slate-700">{selectedAsset.asset_name?.trim() || selectedAsset.id.slice(0, 8)}</span>
        </p>
      )}
    </div>
  );
};

export default EmergencyManagementScreen;

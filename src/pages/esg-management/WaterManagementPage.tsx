import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Info, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { loadBoundaryDraft } from "./boundary/storage";
import type { BoundaryDraftV2 } from "./boundary/boundaryTypes";
import { formatPeriodRangeLabel, monthsInReportingPeriodIfValid } from "./topics/shared/periodUtils";
import { filesToMetaList } from "./topics/shared/fileMeta";
import { newTopicRowId } from "./topics/shared/newId";
import {
  WATER_FRESH_SOURCE_LABELS,
  type WaterAssetData,
  type WaterFreshRow,
  type WaterFreshSourceType,
  type WaterHfWell,
  type WaterSwdRow,
} from "./topics/water/types";
import {
  defaultWaterAssetData,
  getWaterDataForAsset,
  loadWaterStore,
  saveWaterStore,
  setWaterDataForAsset,
} from "./topics/water/storage";
const sectionShell = (accent: string) =>
  `border-2 border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden ${accent}`;

const FRESH_SOURCE_TYPES: WaterFreshSourceType[] = ["river_lake", "groundwater", "municipal", "recycled"];

const WaterManagementPage = () => {
  const [draft, setDraft] = useState<BoundaryDraftV2>(() => loadBoundaryDraft());
  const [store, setStore] = useState(() => loadWaterStore(loadBoundaryDraft()));
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const refreshBoundary = useCallback(() => {
    const d = loadBoundaryDraft();
    setDraft(d);
    setStore(loadWaterStore(d));
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

  const monthsLabel = useMemo(() => {
    const m = monthsInReportingPeriodIfValid(draft.period_start, draft.period_end);
    return m === null ? "—" : String(m);
  }, [draft.period_end, draft.period_start]);

  const periodLabel = useMemo(
    () => formatPeriodRangeLabel(draft.period_start, draft.period_end),
    [draft.period_end, draft.period_start]
  );

  const selectedAsset = draft.assets.find((a) => a.id === selectedAssetId) ?? null;
  const data = selectedAssetId ? getWaterDataForAsset(store, selectedAssetId) : defaultWaterAssetData();

  const patchData = (updater: (d: WaterAssetData) => WaterAssetData) => {
    if (!selectedAssetId) return;
    const cur = getWaterDataForAsset(store, selectedAssetId);
    const nextStore = setWaterDataForAsset(store, selectedAssetId, updater(cur));
    setStore(nextStore);
    saveWaterStore(nextStore);
  };

  const summaryHref =
    selectedAssetId != null
      ? `/esg-management/water-management/results?assetId=${encodeURIComponent(selectedAssetId)}`
      : "/esg-management/water-management/results";

  const addFreshRow = () => {
    const row: WaterFreshRow = {
      id: newTopicRowId(),
      sourceType: "river_lake",
      volumeM3PerMonth: "",
    };
    patchData((d) => ({ ...d, freshwaterRows: [...d.freshwaterRows, row] }));
  };

  const updateFreshRow = (id: string, patch: Partial<WaterFreshRow>) => {
    patchData((d) => ({
      ...d,
      freshwaterRows: d.freshwaterRows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  const removeFreshRow = (id: string) => {
    patchData((d) => ({ ...d, freshwaterRows: d.freshwaterRows.filter((r) => r.id !== id) }));
  };

  const addSwdRow = () => {
    const row: WaterSwdRow = {
      id: newTopicRowId(),
      wellId: "",
      volumeInjected: "",
      formation: "",
    };
    patchData((d) => ({ ...d, swdRows: [...d.swdRows, row] }));
  };

  const updateSwdRow = (id: string, patch: Partial<WaterSwdRow>) => {
    patchData((d) => ({
      ...d,
      swdRows: d.swdRows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  const removeSwdRow = (id: string) => {
    patchData((d) => ({ ...d, swdRows: d.swdRows.filter((r) => r.id !== id) }));
  };

  const addHfWell = () => {
    const row: WaterHfWell = {
      id: newTopicRowId(),
      wellId: "",
      disclosureSubmitted: false,
      registryLink: "",
    };
    patchData((d) => ({ ...d, hfWells: [...d.hfWells, row] }));
  };

  const updateHfWell = (id: string, patch: Partial<WaterHfWell>) => {
    patchData((d) => ({
      ...d,
      hfWells: d.hfWells.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  const removeHfWell = (id: string) => {
    patchData((d) => ({ ...d, hfWells: d.hfWells.filter((r) => r.id !== id) }));
  };

  const onGroundwaterFiles = (list: FileList | null) => {
    const add = filesToMetaList(list);
    if (!add.length) return;
    patchData((d) => ({ ...d, groundwaterFilesMeta: [...d.groundwaterFilesMeta, ...add] }));
  };

  const removeGroundwaterFile = (idx: number) => {
    patchData((d) => ({
      ...d,
      groundwaterFilesMeta: d.groundwaterFilesMeta.filter((_, i) => i !== idx),
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
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Water management</h1>
        <p className="text-sm text-slate-600 max-w-2xl mt-1">
          Freshwater withdrawals, produced water splits, disposal, and disclosure fields aligned to the workbook structure.
        </p>
        <p className="text-xs text-slate-500 mt-2 space-y-0.5">
          <span>
            Reporting period: <span className="font-medium text-slate-700">{periodLabel}</span>
          </span>
          <span className="mx-2">·</span>
          <span>
            Calendar months in period: <span className="font-medium text-slate-700">{monthsLabel}</span>
          </span>
        </p>
        {monthsLabel === "—" && (
          <p className="text-xs text-amber-800 mt-1 max-w-2xl">
            Reporting period dates are missing or invalid in boundary setting. The summary page will not scale period totals
            until they are valid.
          </p>
        )}
        <p className="text-xs text-slate-600 mt-2 max-w-2xl">
          Totals are calculated from monthly values across the selected reporting period.
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

      <Alert className="border-amber-200 bg-amber-50/50 border-2 rounded-xl">
        <Info className="h-4 w-4 text-amber-800" />
        <AlertTitle className="text-amber-950">Why it matters</AlertTitle>
        <AlertDescription className="text-sm text-amber-950/90 mt-1">
          Water stress, quality, and regulation increasingly affect licence to operate and stakeholder trust.
        </AlertDescription>
      </Alert>

      <Card className={sectionShell("border-l-4 border-l-sky-500")}>
        <CardHeader className="pb-2 flex flex-row flex-wrap items-end justify-between gap-2">
          <div>
            <CardTitle className="text-lg text-slate-900">Freshwater withdrawals</CardTitle>
            <CardDescription className="text-slate-600">Volumes are monthly (m³/month) per source category.</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={!selectedAsset} onClick={addFreshRow}>
            <Plus className="h-4 w-4" />
            Add row
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse min-w-[520px]">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="py-2 pr-2 font-semibold text-slate-800">Source</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Volume (m³/month)</th>
                  <th className="py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {data.freshwaterRows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-slate-500">
                      No freshwater rows yet.
                    </td>
                  </tr>
                ) : (
                  data.freshwaterRows.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 align-top">
                      <td className="py-2 pr-2">
                        <Select
                          value={r.sourceType}
                          onValueChange={(v) => updateFreshRow(r.id, { sourceType: v as WaterFreshSourceType })}
                          disabled={!selectedAsset}
                        >
                          <SelectTrigger className="border-2 border-slate-200 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FRESH_SOURCE_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {WATER_FRESH_SOURCE_LABELS[t]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          className="border-2 border-slate-200 h-9"
                          value={r.volumeM3PerMonth}
                          onChange={(e) => updateFreshRow(r.id, { volumeM3PerMonth: e.target.value })}
                          disabled={!selectedAsset}
                        />
                      </td>
                      <td className="py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-slate-500"
                          disabled={!selectedAsset}
                          onClick={() => removeFreshRow(r.id)}
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-slate-800">Returned / discharged freshwater (m³/month)</Label>
              <Input
                className="border-2 border-slate-200"
                value={data.returnedDischargedM3PerMonth}
                disabled={!selectedAsset}
                onChange={(e) => patchData((d) => ({ ...d, returnedDischargedM3PerMonth: e.target.value }))}
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Freshwater period totals are on the{" "}
            <Link to={summaryHref} className="font-medium text-teal-700 underline underline-offset-2">
              summary page
            </Link>
            .
          </p>
          <div className="space-y-2">
            <Label className="text-slate-800">Groundwater monitoring file references</Label>
            <p className="text-xs text-slate-500">Metadata only — same pattern as other topic uploads.</p>
            <Input
              type="file"
              multiple
              className="text-sm"
              disabled={!selectedAsset}
              onChange={(e) => {
                onGroundwaterFiles(e.target.files);
                e.target.value = "";
              }}
            />
            {data.groundwaterFilesMeta.length > 0 && (
              <ul className="text-sm text-slate-600 space-y-1">
                {data.groundwaterFilesMeta.map((m, i) => (
                  <li key={`${m.name}-${m.lastModified}-${i}`} className="flex items-center justify-between gap-2">
                    <span className="truncate">{m.name}</span>
                    <Button type="button" variant="ghost" size="sm" disabled={!selectedAsset} onClick={() => removeGroundwaterFile(i)}>
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-teal-500")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">Produced water</CardTitle>
          <CardDescription className="text-slate-600">
            Generated volume (monthly) and disposal route percentages. Splits apply to the generated volume for the reporting
            period.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-slate-800">Generated produced water</Label>
              <Input
                className="border-2 border-slate-200"
                value={data.producedGenerated}
                disabled={!selectedAsset}
                onChange={(e) => patchData((d) => ({ ...d, producedGenerated: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-800">Unit</Label>
              <Select
                value={data.producedUnit}
                disabled={!selectedAsset}
                onValueChange={(v) => patchData((d) => ({ ...d, producedUnit: v as WaterAssetData["producedUnit"] }))}
              >
                <SelectTrigger className="border-2 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="m3_month">m³/month</SelectItem>
                  <SelectItem value="bbl_month">bbl/month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-slate-800">Injected (%)</Label>
              <Input
                className="border-2 border-slate-200"
                value={data.disposalPct.injected}
                disabled={!selectedAsset}
                onChange={(e) =>
                  patchData((d) => ({ ...d, disposalPct: { ...d.disposalPct, injected: e.target.value } }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-800">Recycled (%)</Label>
              <Input
                className="border-2 border-slate-200"
                value={data.disposalPct.recycled}
                disabled={!selectedAsset}
                onChange={(e) =>
                  patchData((d) => ({ ...d, disposalPct: { ...d.disposalPct, recycled: e.target.value } }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-800">Discharged (%)</Label>
              <Input
                className="border-2 border-slate-200"
                value={data.disposalPct.discharged}
                disabled={!selectedAsset}
                onChange={(e) =>
                  patchData((d) => ({ ...d, disposalPct: { ...d.disposalPct, discharged: e.target.value } }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-800">Evaporation pond (%)</Label>
              <Input
                className="border-2 border-slate-200"
                value={data.disposalPct.evaporationPond}
                disabled={!selectedAsset}
                onChange={(e) =>
                  patchData((d) => ({ ...d, disposalPct: { ...d.disposalPct, evaporationPond: e.target.value } }))
                }
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Disposal validation and produced-water period volumes are on the{" "}
            <Link to={summaryHref} className="font-medium text-teal-700 underline underline-offset-2">
              summary page
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-violet-500")}>
        <CardHeader className="pb-2 flex flex-row flex-wrap items-end justify-between gap-2">
          <div>
            <CardTitle className="text-lg text-slate-900">Salt water disposal (SWD)</CardTitle>
            <CardDescription className="text-slate-600">Optional well-level disposal records.</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={!selectedAsset} onClick={addSwdRow}>
            <Plus className="h-4 w-4" />
            Add row
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse min-w-[560px]">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="py-2 pr-2 font-semibold text-slate-800">Well ID</th>
                <th className="py-2 pr-2 font-semibold text-slate-800">Volume injected</th>
                <th className="py-2 pr-2 font-semibold text-slate-800">Formation</th>
                <th className="py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {data.swdRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-slate-500">
                    No SWD rows yet.
                  </td>
                </tr>
              ) : (
                data.swdRows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 align-top">
                    <td className="py-2 pr-2">
                      <Input
                        className="border-2 border-slate-200 h-9"
                        value={r.wellId}
                        onChange={(e) => updateSwdRow(r.id, { wellId: e.target.value })}
                        disabled={!selectedAsset}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        className="border-2 border-slate-200 h-9"
                        value={r.volumeInjected}
                        onChange={(e) => updateSwdRow(r.id, { volumeInjected: e.target.value })}
                        disabled={!selectedAsset}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        className="border-2 border-slate-200 h-9"
                        value={r.formation}
                        onChange={(e) => updateSwdRow(r.id, { formation: e.target.value })}
                        disabled={!selectedAsset}
                      />
                    </td>
                    <td className="py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-slate-500"
                        disabled={!selectedAsset}
                        onClick={() => removeSwdRow(r.id)}
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
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-amber-600")}>
        <CardHeader className="pb-2 flex flex-row flex-wrap items-end justify-between gap-2">
          <div>
            <CardTitle className="text-lg text-slate-900">Hydraulic fracturing chemical disclosure</CardTitle>
            <CardDescription className="text-slate-600">
              Per-well disclosure flag and registry link. Aggregate disclosure rate is computed from Yes/No responses.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={!selectedAsset} onClick={addHfWell}>
            <Plus className="h-4 w-4" />
            Add well
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="py-2 pr-2 font-semibold text-slate-800">Well ID</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Disclosure submitted</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Registry link (if Yes)</th>
                  <th className="py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {data.hfWells.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-slate-500">
                      No HF wells listed yet.
                    </td>
                  </tr>
                ) : (
                  data.hfWells.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 align-top">
                      <td className="py-2 pr-2">
                        <Input
                          className="border-2 border-slate-200 h-9"
                          value={r.wellId}
                          onChange={(e) => updateHfWell(r.id, { wellId: e.target.value })}
                          disabled={!selectedAsset}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Select
                          value={r.disclosureSubmitted ? "yes" : "no"}
                          disabled={!selectedAsset}
                          onValueChange={(v) => updateHfWell(r.id, { disclosureSubmitted: v === "yes" })}
                        >
                          <SelectTrigger className="border-2 border-slate-200 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no">No</SelectItem>
                            <SelectItem value="yes">Yes</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          className="border-2 border-slate-200 h-9"
                          value={r.registryLink}
                          placeholder="https://…"
                          onChange={(e) => updateHfWell(r.id, { registryLink: e.target.value })}
                          disabled={!selectedAsset || !r.disclosureSubmitted}
                        />
                      </td>
                      <td className="py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-slate-500"
                          disabled={!selectedAsset}
                          onClick={() => removeHfWell(r.id)}
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
          <p className="text-xs text-slate-500">
            Disclosure rate for the reporting period is on the{" "}
            <Link to={summaryHref} className="font-medium text-teal-700 underline underline-offset-2">
              summary page
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-emerald-600")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">Context metrics (manual)</CardTitle>
          <CardDescription className="text-slate-600">
            Water-stress exposure share and HF sites with deteriorated water quality — manual until integrations are available.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-slate-800">Share of assets in water-stressed basins (%)</Label>
            <Input
              className="border-2 border-slate-200"
              value={data.waterStressSharePct}
              disabled={!selectedAsset}
              onChange={(e) => patchData((d) => ({ ...d, waterStressSharePct: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-800">HF sites with deteriorated ambient water quality (%)</Label>
            <Input
              className="border-2 border-slate-200"
              value={data.hfSitesDeterioratedWaterQualityPct}
              disabled={!selectedAsset}
              onChange={(e) => patchData((d) => ({ ...d, hfSitesDeterioratedWaterQualityPct: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {draft.assets.length > 0 && (
        <Card className={sectionShell("border-l-4 border-l-slate-700")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-slate-900">Summary</CardTitle>
            <CardDescription className="text-slate-600">
              Open a dedicated page for freshwater and produced-water period totals, disposal checks, and disclosure rate.
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
          Editing: <span className="font-medium text-slate-700">{selectedAsset.asset_name?.trim() || selectedAsset.id.slice(0, 8)}</span>
        </p>
      )}
    </div>
  );
};

export default WaterManagementPage;

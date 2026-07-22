import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Info, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { useToast } from "@/hooks/use-toast";
import { loadBoundaryDraft } from "../../boundary/storage";
import type { BoundaryDraftV2 } from "../../boundary/boundaryTypes";
import { formatPeriodRangeLabel } from "../shared/periodUtils";
import { newTopicRowId } from "../shared/newId";
import {
  PRODUCT_TYPES_SPILLED,
  REGULATORY_NOTIFICATION_STATUSES,
  SPILL_CAUSES,
  SPILL_VOLUME_UNITS,
  WELL_BARRIER_STATUSES,
  type EnvironmentalManagementAssetData,
  type SpillRow,
  type WellIntegrityRow,
} from "./types";
import {
  calcPctSpillsInSensitiveAreas,
  calcPctVolumeRecovered,
  calcPctWellsWithIntegrityIssues,
  calcSpillCount,
  calcTotalSpillVolumeCubicM,
  calcTotalWellsAssessed,
  calcWellIntegrityFailures,
  formatEnvMgmtNum,
} from "./calculations";
import {
  defaultEnvironmentalManagementAssetData,
  getEnvironmentalManagementDataForAsset,
  loadEnvironmentalManagementStore,
  saveEnvironmentalManagementStore,
  setEnvironmentalManagementDataForAsset,
} from "./storage";

const sectionShell = (accent: string) =>
  `border-2 border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden ${accent}`;

const EnvironmentalManagementScreen = () => {
  const { toast } = useToast();
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
    ? getEnvironmentalManagementDataForAsset(store, selectedAssetId)
    : defaultEnvironmentalManagementAssetData();

  const patchData = (updater: (d: EnvironmentalManagementAssetData) => EnvironmentalManagementAssetData) => {
    if (!selectedAssetId) return;
    const cur = getEnvironmentalManagementDataForAsset(store, selectedAssetId);
    const nextStore = setEnvironmentalManagementDataForAsset(store, selectedAssetId, updater(cur));
    setStore(nextStore);
    saveEnvironmentalManagementStore(nextStore);
  };

  const summaryHref =
    selectedAssetId != null
      ? `/esg-management/environmental-management/results?assetId=${encodeURIComponent(selectedAssetId)}`
      : "/esg-management/environmental-management/results";

  const spillCount = calcSpillCount(data.spillRows);
  const totalSpillVolume = calcTotalSpillVolumeCubicM(data.spillRows);
  const pctSensitive = calcPctSpillsInSensitiveAreas(data.spillRows);
  const pctRecovered = calcPctVolumeRecovered(data.spillRows);
  const wellsAssessed = calcTotalWellsAssessed(data.wellIntegrityRows);
  const wellFailures = calcWellIntegrityFailures(data.wellIntegrityRows);
  const pctWellIssues = calcPctWellsWithIntegrityIssues(data.wellIntegrityRows);

  const addSpillRow = () => {
    const row: SpillRow = {
      id: newTopicRowId(),
      spillDate: "",
      assetLocation: "",
      spillVolumeCubicM: 0,
      spillVolumeUnit: "m³",
      productTypeSpilled: "Crude oil",
      spillCause: "Other",
      sensitiveAreaFlag: false,
      volumeRecoveredCubicM: 0,
      responseActions: [],
      regulatoryNotification: "No",
      regulatorName: "",
      notificationDate: "",
    };
    patchData((d) => ({ ...d, spillRows: [...d.spillRows, row] }));
  };

  const updateSpillRow = (id: string, patch: Partial<SpillRow>) => {
    patchData((d) => ({
      ...d,
      spillRows: d.spillRows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  const removeSpillRow = (id: string) => {
    patchData((d) => ({ ...d, spillRows: d.spillRows.filter((r) => r.id !== id) }));
  };

  const addWellIntegrityRow = () => {
    const row: WellIntegrityRow = {
      id: newTopicRowId(),
      wellId: "",
      inspectionDate: "",
      barrierStatus: "All barriers intact",
    };
    patchData((d) => ({ ...d, wellIntegrityRows: [...d.wellIntegrityRows, row] }));
  };

  const updateWellIntegrityRow = (id: string, patch: Partial<WellIntegrityRow>) => {
    patchData((d) => ({
      ...d,
      wellIntegrityRows: d.wellIntegrityRows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  const removeWellIntegrityRow = (id: string) => {
    patchData((d) => ({ ...d, wellIntegrityRows: d.wellIntegrityRows.filter((r) => r.id !== id) }));
  };

  return (
    <div className="min-w-0 max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <Link
          to="/esg-management/topics"
          className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-[#0A4D3E] mb-3 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to ESG topics
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Environmental Management of E&amp;P Activities
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl mt-1">Spills &amp; Well Integrity</p>
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
            <CardTitle className="text-lg text-slate-900">Hydrocarbon Spill Register</CardTitle>
            <CardDescription className="text-slate-600">
              Record all spills to land or water — not just reportable spills.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={!selectedAsset} onClick={addSpillRow}>
            <Plus className="h-4 w-4" />
            Add row
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse min-w-[1100px]">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="py-2 pr-2 font-semibold text-slate-800">Date</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Asset/Location</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Volume</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Unit</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Product Type</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Cause</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Sensitive Area?</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Volume Recovered (m³)</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Regulatory Notification</th>
                  <th className="py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {data.spillRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-6 text-slate-500">
                      No spill rows yet.
                    </td>
                  </tr>
                ) : (
                  data.spillRows.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 align-top">
                      <td className="py-2 pr-2">
                        <Input
                          className="border-2 border-slate-200 h-9"
                          type="date"
                          value={r.spillDate}
                          disabled={!selectedAsset}
                          onChange={(e) => updateSpillRow(r.id, { spillDate: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          className="border-2 border-slate-200 h-9"
                          placeholder="Asset name or location"
                          value={r.assetLocation}
                          disabled={!selectedAsset}
                          onChange={(e) => updateSpillRow(r.id, { assetLocation: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          className="border-2 border-slate-200 h-9"
                          type="number"
                          min={0}
                          step="any"
                          value={r.spillVolumeCubicM || ""}
                          disabled={!selectedAsset}
                          onChange={(e) => {
                            const n = e.target.value === "" ? 0 : Number(e.target.value);
                            updateSpillRow(r.id, { spillVolumeCubicM: Number.isFinite(n) ? n : 0 });
                          }}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Select
                          value={r.spillVolumeUnit}
                          disabled={!selectedAsset}
                          onValueChange={(v) => updateSpillRow(r.id, { spillVolumeUnit: v as SpillRow["spillVolumeUnit"] })}
                        >
                          <SelectTrigger className="border-2 border-slate-200 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SPILL_VOLUME_UNITS.map((u) => (
                              <SelectItem key={u} value={u}>
                                {u}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-2 pr-2">
                        <Select
                          value={r.productTypeSpilled}
                          disabled={!selectedAsset}
                          onValueChange={(v) =>
                            updateSpillRow(r.id, { productTypeSpilled: v as SpillRow["productTypeSpilled"] })
                          }
                        >
                          <SelectTrigger className="border-2 border-slate-200 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRODUCT_TYPES_SPILLED.map((p) => (
                              <SelectItem key={p} value={p}>
                                {p}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-2 pr-2">
                        <Select
                          value={r.spillCause}
                          disabled={!selectedAsset}
                          onValueChange={(v) => updateSpillRow(r.id, { spillCause: v as SpillRow["spillCause"] })}
                        >
                          <SelectTrigger className="border-2 border-slate-200 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SPILL_CAUSES.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-2 h-9">
                          <Checkbox
                            id={`sensitive-${r.id}`}
                            checked={r.sensitiveAreaFlag}
                            disabled={!selectedAsset}
                            onCheckedChange={(c) => updateSpillRow(r.id, { sensitiveAreaFlag: c === true })}
                          />
                          <Label htmlFor={`sensitive-${r.id}`} className="text-xs cursor-pointer">
                            Yes
                          </Label>
                        </div>
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          className="border-2 border-slate-200 h-9"
                          type="number"
                          min={0}
                          step="any"
                          value={r.volumeRecoveredCubicM || ""}
                          disabled={!selectedAsset}
                          onChange={(e) => {
                            const n = e.target.value === "" ? 0 : Number(e.target.value);
                            updateSpillRow(r.id, { volumeRecoveredCubicM: Number.isFinite(n) ? n : 0 });
                          }}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Select
                          value={r.regulatoryNotification}
                          disabled={!selectedAsset}
                          onValueChange={(v) =>
                            updateSpillRow(r.id, { regulatoryNotification: v as SpillRow["regulatoryNotification"] })
                          }
                        >
                          <SelectTrigger className="border-2 border-slate-200 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {REGULATORY_NOTIFICATION_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-slate-500"
                          disabled={!selectedAsset}
                          onClick={() => removeSpillRow(r.id)}
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
          <div className="grid gap-2 sm:grid-cols-2 text-sm text-slate-700">
            <p>
              Total spills: <span className="font-semibold text-slate-900 tabular-nums">{spillCount}</span>
            </p>
            <p>
              Total volume released (m³):{" "}
              <span className="font-semibold text-slate-900 tabular-nums">{formatEnvMgmtNum(totalSpillVolume, 2)}</span>
            </p>
            <p>
              % in sensitive areas:{" "}
              <span className="font-semibold text-slate-900 tabular-nums">{formatEnvMgmtNum(pctSensitive)}%</span>
            </p>
            <p>
              % volume recovered:{" "}
              <span className="font-semibold text-slate-900 tabular-nums">{formatEnvMgmtNum(pctRecovered)}%</span>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-orange-500")}>
        <CardHeader className="pb-2 flex flex-row flex-wrap items-end justify-between gap-2">
          <div>
            <CardTitle className="text-lg text-slate-900">Well Integrity Register</CardTitle>
            <CardDescription className="text-slate-600">
              Track well barrier status across all operated wells.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={!selectedAsset} onClick={addWellIntegrityRow}>
            <Plus className="h-4 w-4" />
            Add row
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="py-2 pr-2 font-semibold text-slate-800">Well ID</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Inspection Date</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Barrier Status</th>
                  <th className="py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {data.wellIntegrityRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-slate-500">
                      No well integrity rows yet.
                    </td>
                  </tr>
                ) : (
                  data.wellIntegrityRows.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 align-top">
                      <td className="py-2 pr-2">
                        <Input
                          className="border-2 border-slate-200 h-9"
                          placeholder="Well ID or name"
                          value={r.wellId}
                          disabled={!selectedAsset}
                          onChange={(e) => updateWellIntegrityRow(r.id, { wellId: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          className="border-2 border-slate-200 h-9"
                          type="date"
                          value={r.inspectionDate}
                          disabled={!selectedAsset}
                          onChange={(e) => updateWellIntegrityRow(r.id, { inspectionDate: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Select
                          value={r.barrierStatus}
                          disabled={!selectedAsset}
                          onValueChange={(v) =>
                            updateWellIntegrityRow(r.id, { barrierStatus: v as WellIntegrityRow["barrierStatus"] })
                          }
                        >
                          <SelectTrigger className="border-2 border-slate-200 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WELL_BARRIER_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-slate-500"
                          disabled={!selectedAsset}
                          onClick={() => removeWellIntegrityRow(r.id)}
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
          <div className="grid gap-2 sm:grid-cols-3 text-sm text-slate-700">
            <p>
              Total wells assessed: <span className="font-semibold text-slate-900 tabular-nums">{wellsAssessed}</span>
            </p>
            <p>
              Well integrity failures: <span className="font-semibold text-slate-900 tabular-nums">{wellFailures}</span>
            </p>
            <p>
              % wells with integrity issues:{" "}
              <span className="font-semibold text-slate-900 tabular-nums">{formatEnvMgmtNum(pctWellIssues)}%</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {selectedAsset && (
        <div className="flex justify-end">
          <Button
            type="button"
            className="bg-gradient-to-r from-[#1C7A53] to-[#1D9E75] text-white shadow-md"
            onClick={() => {
              saveEnvironmentalManagementStore(store);
              toast({
                title: "Saved",
                description: "Environmental management data saved for this asset and reporting period.",
              });
            }}
          >
            Save
          </Button>
        </div>
      )}

      {draft.assets.length > 0 && (
        <Card className={sectionShell("border-l-4 border-l-slate-700")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-slate-900">Summary</CardTitle>
            <CardDescription className="text-slate-600">
              Open a dedicated page for spill volumes, recovery rates, and well integrity metrics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" className="bg-gradient-to-r from-[#1C7A53] to-[#1D9E75] text-white shadow-md" asChild>
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

export default EnvironmentalManagementScreen;

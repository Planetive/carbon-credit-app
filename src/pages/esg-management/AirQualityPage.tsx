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
import { formatPeriodRangeLabel } from "./topics/shared/periodUtils";
import { filesToMetaList } from "./topics/shared/fileMeta";
import { newTopicRowId } from "./topics/shared/newId";
import {
  AIR_FUEL_TYPES,
  AIR_FUEL_UNIT_LABELS,
  AIR_FUEL_UNITS,
  type AirEquipmentKind,
  type AirEquipmentRow,
  type AirFuelRow,
  type AirLdarRow,
  type AirPollutantKey,
  type AirQualityAssetData,
  type AirStackPollutant,
  type AirStackTestRow,
  type AirFuelConsumptionUnit,
} from "./topics/air/types";
import {
  defaultAirQualityAssetData,
  getAirDataForAsset,
  loadAirQualityStore,
  saveAirQualityStore,
  setAirDataForAsset,
} from "./topics/air/storage";
import { POLLUTANT_ROWS } from "./topics/air/airPollutantRows";

const sectionShell = (accent: string) =>
  `border-2 border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden ${accent}`;

const EQUIPMENT_KIND_LABELS: Record<AirEquipmentKind, string> = {
  engine: "Engine",
  compressor: "Compressor",
  heater: "Heater",
};

const STACK_POLLUTANTS: AirStackPollutant[] = ["NOx", "SOx", "VOC", "PM10", "H2S"];

const AirQualityPage = () => {
  const [draft, setDraft] = useState<BoundaryDraftV2>(() => loadBoundaryDraft());
  const [store, setStore] = useState(() => loadAirQualityStore(loadBoundaryDraft()));
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const refreshBoundary = useCallback(() => {
    const d = loadBoundaryDraft();
    setDraft(d);
    setStore(loadAirQualityStore(d));
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
  const data = selectedAssetId ? getAirDataForAsset(store, selectedAssetId) : defaultAirQualityAssetData();

  const patchData = (updater: (d: AirQualityAssetData) => AirQualityAssetData) => {
    if (!selectedAssetId) return;
    const cur = getAirDataForAsset(store, selectedAssetId);
    const nextStore = setAirDataForAsset(store, selectedAssetId, updater(cur));
    setStore(nextStore);
    saveAirQualityStore(nextStore);
  };

  const setAnnualMetric = (key: AirPollutantKey, value: string) => {
    patchData((d) => ({
      ...d,
      annualMetricsMt: { ...d.annualMetricsMt, [key]: value },
    }));
  };

  const addFuelRow = () => {
    const row: AirFuelRow = {
      id: newTopicRowId(),
      fuelType: "Natural gas",
      consumption: "",
      unit: "m3_day",
      h2sPct: "",
      totalSulfurPct: "",
    };
    patchData((d) => ({ ...d, fuelRows: [...d.fuelRows, row] }));
  };

  const updateFuelRow = (id: string, patch: Partial<AirFuelRow>) => {
    patchData((d) => ({
      ...d,
      fuelRows: d.fuelRows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  const removeFuelRow = (id: string) => {
    patchData((d) => ({ ...d, fuelRows: d.fuelRows.filter((r) => r.id !== id) }));
  };

  const addEquipmentRow = () => {
    const row: AirEquipmentRow = {
      id: newTopicRowId(),
      kind: "engine",
      kW: "",
      count: "",
    };
    patchData((d) => ({ ...d, equipmentRows: [...d.equipmentRows, row] }));
  };

  const updateEquipmentRow = (id: string, patch: Partial<AirEquipmentRow>) => {
    patchData((d) => ({
      ...d,
      equipmentRows: d.equipmentRows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  const removeEquipmentRow = (id: string) => {
    patchData((d) => ({ ...d, equipmentRows: d.equipmentRows.filter((r) => r.id !== id) }));
  };

  const addLdarRow = () => {
    const row: AirLdarRow = {
      id: newTopicRowId(),
      componentType: "",
      screenPpmv: "",
      leakStatus: "",
    };
    patchData((d) => ({ ...d, ldarRows: [...d.ldarRows, row] }));
  };

  const updateLdarRow = (id: string, patch: Partial<AirLdarRow>) => {
    patchData((d) => ({
      ...d,
      ldarRows: d.ldarRows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  const removeLdarRow = (id: string) => {
    patchData((d) => ({ ...d, ldarRows: d.ldarRows.filter((r) => r.id !== id) }));
  };

  const onLdarFiles = (list: FileList | null) => {
    const add = filesToMetaList(list);
    if (!add.length) return;
    patchData((d) => ({ ...d, ldarFilesMeta: [...d.ldarFilesMeta, ...add] }));
  };

  const removeLdarFileMeta = (idx: number) => {
    patchData((d) => ({
      ...d,
      ldarFilesMeta: d.ldarFilesMeta.filter((_, i) => i !== idx),
    }));
  };

  const addStackRow = () => {
    const row: AirStackTestRow = {
      id: newTopicRowId(),
      pollutant: "NOx",
      value: "",
      unit: "lb_MMBtu",
    };
    patchData((d) => ({ ...d, stackTestRows: [...d.stackTestRows, row] }));
  };

  const updateStackRow = (id: string, patch: Partial<AirStackTestRow>) => {
    patchData((d) => ({
      ...d,
      stackTestRows: d.stackTestRows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  const removeStackRow = (id: string) => {
    patchData((d) => ({ ...d, stackTestRows: d.stackTestRows.filter((r) => r.id !== id) }));
  };

  const onStackFiles = (list: FileList | null) => {
    const add = filesToMetaList(list);
    if (!add.length) return;
    patchData((d) => ({ ...d, stackTestFilesMeta: [...d.stackTestFilesMeta, ...add] }));
  };

  const removeStackFileMeta = (idx: number) => {
    patchData((d) => ({
      ...d,
      stackTestFilesMeta: d.stackTestFilesMeta.filter((_, i) => i !== idx),
    }));
  };

  const summaryHref =
    selectedAssetId != null
      ? `/esg-management/air-quality/results?assetId=${encodeURIComponent(selectedAssetId)}`
      : "/esg-management/air-quality/results";

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
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Air quality</h1>
        <p className="text-sm text-slate-600 max-w-2xl mt-1">
          Capture workbook-aligned air data for each asset. Annual pollutant masses are manual entries only; fuel, equipment,
          LDAR, and stack test sections record operational data alongside those totals.
        </p>
        <p className="text-xs text-slate-500 mt-2">
          Reporting period (from boundary setting): <span className="font-medium text-slate-700">{periodLabel}</span>
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
            <Label className="text-slate-800 sr-only">Selected asset</Label>
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
          Strong air quality management supports compliance, community trust, and safe operations.
        </AlertDescription>
      </Alert>

      <Card className={sectionShell("border-l-4 border-l-blue-500")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">Reported annual masses (manual)</CardTitle>
          <CardDescription className="text-slate-600">
            Enter tonnes per year only where you already have reported masses. This module does not calculate emissions from
            fuel or tests.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {POLLUTANT_ROWS.map((p) => (
              <div key={p.key} className="space-y-1.5">
                <Label className="text-slate-800">
                  {p.label} <span className="text-slate-500 font-normal">({p.hint})</span>
                </Label>
                <Input
                  className="border-2 border-slate-200"
                  placeholder="t/year (if reported)"
                  disabled={!selectedAsset}
                  value={data.annualMetricsMt[p.key] ?? ""}
                  onChange={(e) => setAnnualMetric(p.key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-teal-500")}>
        <CardHeader className="pb-2 flex flex-row flex-wrap items-end justify-between gap-2">
          <div>
            <CardTitle className="text-lg text-slate-900">Fuel use and sulphur</CardTitle>
            <CardDescription className="text-slate-600">
              One row per fuel stream. Consumption unit is fixed to workbook options.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={!selectedAsset} onClick={addFuelRow}>
            <Plus className="h-4 w-4" />
            Add row
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="py-2 pr-2 font-semibold text-slate-800">Fuel</th>
                <th className="py-2 pr-2 font-semibold text-slate-800">Consumption</th>
                <th className="py-2 pr-2 font-semibold text-slate-800">Unit</th>
                <th className="py-2 pr-2 font-semibold text-slate-800">H₂S %</th>
                <th className="py-2 pr-2 font-semibold text-slate-800">Total S %</th>
                <th className="py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {data.fuelRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-slate-500">
                    No fuel rows yet. Use “Add row” to capture each fuel type.
                  </td>
                </tr>
              ) : (
                data.fuelRows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 align-top">
                    <td className="py-2 pr-2">
                      <Select
                        value={r.fuelType}
                        onValueChange={(v) => updateFuelRow(r.id, { fuelType: v as AirFuelRow["fuelType"] })}
                        disabled={!selectedAsset}
                      >
                        <SelectTrigger className="border-2 border-slate-200 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AIR_FUEL_TYPES.map((f) => (
                            <SelectItem key={f} value={f}>
                              {f}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        className="border-2 border-slate-200 h-9"
                        value={r.consumption}
                        onChange={(e) => updateFuelRow(r.id, { consumption: e.target.value })}
                        disabled={!selectedAsset}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Select
                        value={r.unit}
                        onValueChange={(v) => updateFuelRow(r.id, { unit: v as AirFuelConsumptionUnit })}
                        disabled={!selectedAsset}
                      >
                        <SelectTrigger className="border-2 border-slate-200 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AIR_FUEL_UNITS.map((u) => (
                            <SelectItem key={u} value={u}>
                              {AIR_FUEL_UNIT_LABELS[u]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        className="border-2 border-slate-200 h-9"
                        value={r.h2sPct}
                        onChange={(e) => updateFuelRow(r.id, { h2sPct: e.target.value })}
                        disabled={!selectedAsset}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        className="border-2 border-slate-200 h-9"
                        value={r.totalSulfurPct}
                        onChange={(e) => updateFuelRow(r.id, { totalSulfurPct: e.target.value })}
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
                        onClick={() => removeFuelRow(r.id)}
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

      <Card className={sectionShell("border-l-4 border-l-cyan-500")}>
        <CardHeader className="pb-2 flex flex-row flex-wrap items-end justify-between gap-2">
          <div>
            <CardTitle className="text-lg text-slate-900">Major equipment</CardTitle>
            <CardDescription className="text-slate-600">Rated power and installed count (as tracked for air programmes).</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={!selectedAsset} onClick={addEquipmentRow}>
            <Plus className="h-4 w-4" />
            Add row
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse min-w-[520px]">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="py-2 pr-2 font-semibold text-slate-800">Type</th>
                <th className="py-2 pr-2 font-semibold text-slate-800">kW (unit / site total)</th>
                <th className="py-2 pr-2 font-semibold text-slate-800">Count</th>
                <th className="py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {data.equipmentRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-slate-500">
                    No equipment rows yet.
                  </td>
                </tr>
              ) : (
                data.equipmentRows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 align-top">
                    <td className="py-2 pr-2">
                      <Select
                        value={r.kind}
                        onValueChange={(v) => updateEquipmentRow(r.id, { kind: v as AirEquipmentKind })}
                        disabled={!selectedAsset}
                      >
                        <SelectTrigger className="border-2 border-slate-200 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(EQUIPMENT_KIND_LABELS) as AirEquipmentKind[]).map((k) => (
                            <SelectItem key={k} value={k}>
                              {EQUIPMENT_KIND_LABELS[k]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        className="border-2 border-slate-200 h-9"
                        value={r.kW}
                        onChange={(e) => updateEquipmentRow(r.id, { kW: e.target.value })}
                        disabled={!selectedAsset}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        className="border-2 border-slate-200 h-9"
                        value={r.count}
                        onChange={(e) => updateEquipmentRow(r.id, { count: e.target.value })}
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
                        onClick={() => removeEquipmentRow(r.id)}
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

      <Card className={sectionShell("border-l-4 border-l-amber-500")}>
        <CardHeader className="pb-2 flex flex-row flex-wrap items-end justify-between gap-2">
          <div>
            <CardTitle className="text-lg text-slate-900">LDAR screening</CardTitle>
            <CardDescription className="text-slate-600">Component-level screening results; attach campaign files as metadata only.</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={!selectedAsset} onClick={addLdarRow}>
            <Plus className="h-4 w-4" />
            Add row
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="py-2 pr-2 font-semibold text-slate-800">Component</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Screen (ppmv)</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Leak status</th>
                  <th className="py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {data.ldarRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-slate-500">
                      No LDAR rows yet.
                    </td>
                  </tr>
                ) : (
                  data.ldarRows.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 align-top">
                      <td className="py-2 pr-2">
                        <Input
                          className="border-2 border-slate-200 h-9"
                          value={r.componentType}
                          onChange={(e) => updateLdarRow(r.id, { componentType: e.target.value })}
                          disabled={!selectedAsset}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          className="border-2 border-slate-200 h-9"
                          value={r.screenPpmv}
                          onChange={(e) => updateLdarRow(r.id, { screenPpmv: e.target.value })}
                          disabled={!selectedAsset}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          className="border-2 border-slate-200 h-9"
                          value={r.leakStatus}
                          onChange={(e) => updateLdarRow(r.id, { leakStatus: e.target.value })}
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
                          onClick={() => removeLdarRow(r.id)}
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
          <div className="space-y-2">
            <Label className="text-slate-800">LDAR file references</Label>
            <Input
              type="file"
              multiple
              className="text-sm"
              disabled={!selectedAsset}
              onChange={(e) => {
                onLdarFiles(e.target.files);
                e.target.value = "";
              }}
            />
            {data.ldarFilesMeta.length > 0 && (
              <ul className="text-sm text-slate-600 space-y-1">
                {data.ldarFilesMeta.map((m, i) => (
                  <li key={`${m.name}-${m.lastModified}-${i}`} className="flex items-center justify-between gap-2">
                    <span className="truncate">{m.name}</span>
                    <Button type="button" variant="ghost" size="sm" disabled={!selectedAsset} onClick={() => removeLdarFileMeta(i)}>
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-violet-500")}>
        <CardHeader className="pb-2 flex flex-row flex-wrap items-end justify-between gap-2">
          <div>
            <CardTitle className="text-lg text-slate-900">Stack or source tests</CardTitle>
            <CardDescription className="text-slate-600">Test results as reported; file metadata only.</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={!selectedAsset} onClick={addStackRow}>
            <Plus className="h-4 w-4" />
            Add row
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse min-w-[560px]">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="py-2 pr-2 font-semibold text-slate-800">Pollutant</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Value</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Unit</th>
                  <th className="py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {data.stackTestRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-slate-500">
                      No stack test rows yet.
                    </td>
                  </tr>
                ) : (
                  data.stackTestRows.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 align-top">
                      <td className="py-2 pr-2">
                        <Select
                          value={r.pollutant}
                          onValueChange={(v) => updateStackRow(r.id, { pollutant: v as AirStackPollutant })}
                          disabled={!selectedAsset}
                        >
                          <SelectTrigger className="border-2 border-slate-200 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STACK_POLLUTANTS.map((p) => (
                              <SelectItem key={p} value={p}>
                                {p}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          className="border-2 border-slate-200 h-9"
                          value={r.value}
                          onChange={(e) => updateStackRow(r.id, { value: e.target.value })}
                          disabled={!selectedAsset}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Select
                          value={r.unit}
                          onValueChange={(v) => updateStackRow(r.id, { unit: v as AirStackTestRow["unit"] })}
                          disabled={!selectedAsset}
                        >
                          <SelectTrigger className="border-2 border-slate-200 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lb_MMBtu">lb/MMBtu</SelectItem>
                            <SelectItem value="g_kWh">g/kWh</SelectItem>
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
                          onClick={() => removeStackRow(r.id)}
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
          <div className="space-y-2">
            <Label className="text-slate-800">Stack test file references</Label>
            <Input
              type="file"
              multiple
              className="text-sm"
              disabled={!selectedAsset}
              onChange={(e) => {
                onStackFiles(e.target.files);
                e.target.value = "";
              }}
            />
            {data.stackTestFilesMeta.length > 0 && (
              <ul className="text-sm text-slate-600 space-y-1">
                {data.stackTestFilesMeta.map((m, i) => (
                  <li key={`${m.name}-${m.lastModified}-${i}`} className="flex items-center justify-between gap-2">
                    <span className="truncate">{m.name}</span>
                    <Button type="button" variant="ghost" size="sm" disabled={!selectedAsset} onClick={() => removeStackFileMeta(i)}>
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {draft.assets.length > 0 && (
        <Card className={sectionShell("border-l-4 border-l-slate-700")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-slate-900">Summary</CardTitle>
            <CardDescription className="text-slate-600">
              Open a dedicated page for reported annual masses, operational row counts, and calculation readiness.
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

export default AirQualityPage;

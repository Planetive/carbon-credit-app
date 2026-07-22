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
import { loadBoundaryDraft } from "../../boundary/storage";
import type { BoundaryDraftV2 } from "../../boundary/boundaryTypes";
import { formatPeriodRangeLabel } from "../shared/periodUtils";
import { newTopicRowId } from "../shared/newId";
import {
  RESERVES_PRODUCT_TYPES,
  RESERVES_UNITS,
  type ReservesAssetData,
  type ReservesByCountryRow,
  type ReservesProductType,
  type ReservesUnit,
} from "./types";
import {
  defaultReservesAssetData,
  getReservesDataForAsset,
  loadReservesStore,
  saveReservesStore,
  setReservesDataForAsset,
} from "./storage";
import {
  calcEmbeddedCo2MtCo2e,
  calcPctReservesInCarbonRegulatedJurisdictions,
  formatReservesNum,
  getPctCapexLowCarbon,
} from "./calculations";

const sectionShell = (accent: string) =>
  `border-2 border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden ${accent}`;

const ReservesValuationScreen = () => {
  const [draft, setDraft] = useState<BoundaryDraftV2>(() => loadBoundaryDraft());
  const [store, setStore] = useState(() => loadReservesStore(loadBoundaryDraft()));
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const refreshBoundary = useCallback(() => {
    const d = loadBoundaryDraft();
    setDraft(d);
    setStore(loadReservesStore(d));
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
  const data = selectedAssetId ? getReservesDataForAsset(store, selectedAssetId) : defaultReservesAssetData();

  const patchData = (updater: (d: ReservesAssetData) => ReservesAssetData) => {
    if (!selectedAssetId) return;
    const cur = getReservesDataForAsset(store, selectedAssetId);
    const nextStore = setReservesDataForAsset(store, selectedAssetId, updater(cur));
    setStore(nextStore);
    saveReservesStore(nextStore);
  };

  const summaryHref =
    selectedAssetId != null
      ? `/esg-management/reserves-valuation/results?assetId=${encodeURIComponent(selectedAssetId)}`
      : "/esg-management/reserves-valuation/results";

  const embeddedCo2 = calcEmbeddedCo2MtCo2e(data);
  const pctRegulated = calcPctReservesInCarbonRegulatedJurisdictions(data.reservesByCountry);
  const pctCapexLowCarbon = getPctCapexLowCarbon(data);

  const addCountryRow = () => {
    const row: ReservesByCountryRow = {
      id: newTopicRowId(),
      country: "",
      productType: "Crude oil",
      provedReserves1P: "",
      unit: "Mmbbl",
      carbonRegulated: false,
    };
    patchData((d) => ({ ...d, reservesByCountry: [...d.reservesByCountry, row] }));
  };

  const updateCountryRow = (id: string, patch: Partial<ReservesByCountryRow>) => {
    patchData((d) => ({
      ...d,
      reservesByCountry: d.reservesByCountry.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  const removeCountryRow = (id: string) => {
    patchData((d) => ({
      ...d,
      reservesByCountry: d.reservesByCountry.filter((r) => r.id !== id),
    }));
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
          Reserves Valuation &amp; Capital Expenditures
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl mt-1">
          Proved reserves, carbon price assumptions, capital allocation, and TCFD climate risk narratives.
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

      <Card className={sectionShell("border-l-4 border-l-blue-500")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">Proved Reserves (1P)</CardTitle>
          <CardDescription className="text-slate-600">
            Enter proved (1P) reserve volumes used for embedded CO₂ calculations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-slate-800">Crude oil (Mmbbl)</Label>
              <Input
                className="border-2 border-slate-200"
                value={data.provedReservesCrudeOilMmbbl}
                disabled={!selectedAsset}
                onChange={(e) => patchData((d) => ({ ...d, provedReservesCrudeOilMmbbl: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-800">Natural gas (Bcf)</Label>
              <Input
                className="border-2 border-slate-200"
                value={data.provedReservesNaturalGasBcf}
                disabled={!selectedAsset}
                onChange={(e) => patchData((d) => ({ ...d, provedReservesNaturalGasBcf: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-800">NGL (Mmbbl)</Label>
              <Input
                className="border-2 border-slate-200"
                value={data.provedReservesNglMmbbl}
                disabled={!selectedAsset}
                onChange={(e) => patchData((d) => ({ ...d, provedReservesNglMmbbl: e.target.value }))}
              />
            </div>
          </div>
          <p className="text-sm text-slate-700">
            Embedded CO₂:{" "}
            <span className="font-semibold text-slate-900 tabular-nums">{formatReservesNum(embeddedCo2)} MT CO₂e</span>
          </p>
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-slate-500")}>
        <CardHeader className="pb-2 flex flex-row flex-wrap items-end justify-between gap-2">
          <div>
            <CardTitle className="text-lg text-slate-900">Reserves by Country</CardTitle>
            <CardDescription className="text-slate-600">
              Break down proved reserves by jurisdiction and carbon regulation status.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={!selectedAsset} onClick={addCountryRow}>
            <Plus className="h-4 w-4" />
            Add row
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse min-w-[720px]">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="py-2 pr-2 font-semibold text-slate-800">Country</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Product type</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Proved reserves 1P</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Unit</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Carbon regulated?</th>
                  <th className="py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {data.reservesByCountry.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-slate-500">
                      No country rows yet.
                    </td>
                  </tr>
                ) : (
                  data.reservesByCountry.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 align-top">
                      <td className="py-2 pr-2">
                        <Input
                          className="border-2 border-slate-200 h-9"
                          value={r.country}
                          disabled={!selectedAsset}
                          onChange={(e) => updateCountryRow(r.id, { country: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Select
                          value={r.productType}
                          disabled={!selectedAsset}
                          onValueChange={(v) =>
                            updateCountryRow(r.id, { productType: v as ReservesProductType })
                          }
                        >
                          <SelectTrigger className="border-2 border-slate-200 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {RESERVES_PRODUCT_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          className="border-2 border-slate-200 h-9"
                          value={r.provedReserves1P}
                          disabled={!selectedAsset}
                          onChange={(e) => updateCountryRow(r.id, { provedReserves1P: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Select
                          value={r.unit}
                          disabled={!selectedAsset}
                          onValueChange={(v) => updateCountryRow(r.id, { unit: v as ReservesUnit })}
                        >
                          <SelectTrigger className="border-2 border-slate-200 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {RESERVES_UNITS.map((u) => (
                              <SelectItem key={u} value={u}>
                                {u}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-2 h-9">
                          <Checkbox
                            id={`cr-${r.id}`}
                            checked={r.carbonRegulated}
                            disabled={!selectedAsset}
                            onCheckedChange={(c) => updateCountryRow(r.id, { carbonRegulated: c === true })}
                          />
                          <Label htmlFor={`cr-${r.id}`} className="text-xs cursor-pointer">
                            Yes
                          </Label>
                        </div>
                      </td>
                      <td className="py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-slate-500"
                          disabled={!selectedAsset}
                          onClick={() => removeCountryRow(r.id)}
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
          <p className="text-sm text-slate-700">
            % in carbon-regulated jurisdictions:{" "}
            <span className="font-semibold text-slate-900 tabular-nums">{formatReservesNum(pctRegulated, 1)}%</span>
          </p>
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-amber-600")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">Carbon Price Assumptions</CardTitle>
          <CardDescription className="text-slate-600">Internal and IEA scenario carbon prices ($/tCO₂).</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-slate-800">Internal carbon price ($/tCO₂)</Label>
            <Input
              className="border-2 border-slate-200"
              value={data.internalCarbonPricePerTco2}
              disabled={!selectedAsset}
              onChange={(e) => patchData((d) => ({ ...d, internalCarbonPricePerTco2: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-800">IEA STEPS ($/tCO₂)</Label>
            <Input
              className="border-2 border-slate-200"
              value={data.ieaStepsPricePerTco2}
              disabled={!selectedAsset}
              onChange={(e) => patchData((d) => ({ ...d, ieaStepsPricePerTco2: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-800">IEA APS ($/tCO₂)</Label>
            <Input
              className="border-2 border-slate-200"
              value={data.ieaApsPricePerTco2}
              disabled={!selectedAsset}
              onChange={(e) => patchData((d) => ({ ...d, ieaApsPricePerTco2: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-800">IEA NZE ($/tCO₂)</Label>
            <Input
              className="border-2 border-slate-200"
              value={data.ieaNzePricePerTco2}
              disabled={!selectedAsset}
              onChange={(e) => patchData((d) => ({ ...d, ieaNzePricePerTco2: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-emerald-600")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">Capital Allocation</CardTitle>
          <CardDescription className="text-slate-600">
            Share of capital expenditure directed to low-carbon activities.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-xs">
            <Label className="text-slate-800">% capex to low-carbon activities</Label>
            <Input
              className="border-2 border-slate-200"
              value={data.pctCapexLowCarbon}
              disabled={!selectedAsset}
              onChange={(e) => patchData((d) => ({ ...d, pctCapexLowCarbon: e.target.value }))}
            />
          </div>
          <p className="text-sm text-slate-700">
            Low-carbon capex share:{" "}
            <span className="font-semibold text-slate-900 tabular-nums">{formatReservesNum(pctCapexLowCarbon, 1)}%</span>
          </p>
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-violet-500")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">TCFD Climate Risk Disclosure</CardTitle>
          <CardDescription className="text-slate-600">
            Narrative disclosures aligned with TCFD recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-800">Physical risks</Label>
            <Textarea
              className="border-2 border-slate-200 min-h-[100px]"
              placeholder="Describe acute and chronic physical climate risks affecting reserves, operations, and infrastructure (e.g. flooding, heat, storms)."
              value={data.tcfdPhysicalRisks}
              disabled={!selectedAsset}
              onChange={(e) => patchData((d) => ({ ...d, tcfdPhysicalRisks: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-800">Transition risks</Label>
            <Textarea
              className="border-2 border-slate-200 min-h-[100px]"
              placeholder="Describe policy, legal, technology, market, and reputation risks from the transition to a lower-carbon economy."
              value={data.tcfdTransitionRisks}
              disabled={!selectedAsset}
              onChange={(e) => patchData((d) => ({ ...d, tcfdTransitionRisks: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-800">Opportunities</Label>
            <Textarea
              className="border-2 border-slate-200 min-h-[100px]"
              placeholder="Describe climate-related opportunities such as resource efficiency, new products/services, markets, and resilience investments."
              value={data.tcfdOpportunities}
              disabled={!selectedAsset}
              onChange={(e) => patchData((d) => ({ ...d, tcfdOpportunities: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-800">Strategy resilience</Label>
            <Textarea
              className="border-2 border-slate-200 min-h-[100px]"
              placeholder="Explain how your strategy performs under different climate scenarios and how you are building resilience."
              value={data.tcfdStrategyResilience}
              disabled={!selectedAsset}
              onChange={(e) => patchData((d) => ({ ...d, tcfdStrategyResilience: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {draft.assets.length > 0 && (
        <Card className={sectionShell("border-l-4 border-l-slate-700")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-slate-900">Summary</CardTitle>
            <CardDescription className="text-slate-600">
              Open a dedicated page for read-only metrics and TCFD narratives.
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

export default ReservesValuationScreen;

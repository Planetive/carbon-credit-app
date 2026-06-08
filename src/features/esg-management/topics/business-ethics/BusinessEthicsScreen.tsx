import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Info, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { loadBoundaryDraft } from "../../boundary/storage";
import type { BoundaryDraftV2 } from "../../boundary/boundaryTypes";
import { formatPeriodRangeLabel } from "../shared/periodUtils";
import { newTopicRowId } from "../shared/newId";
import {
  PAYMENT_TYPE_OPTIONS,
  YES_NO_OPTIONS,
  type BusinessEthicsAssetData,
  type GovernmentPaymentRow,
  type PaymentType,
  type YesNoAnswer,
} from "./types";
import {
  defaultBusinessEthicsAssetData,
  getBusinessEthicsDataForAsset,
  loadBusinessEthicsStore,
  saveBusinessEthicsStore,
  setBusinessEthicsDataForAsset,
} from "./storage";
import {
  calcProbableReservesHighRiskPct,
  calcProvedReservesHighRiskPct,
  calcTotalGovernmentPaymentsUsd,
  calcWhistleblowerSubstantiationRatePct,
  formatBusinessEthicsNum,
  formatBusinessEthicsUsd,
} from "./calculations";

const sectionShell = (accent: string) =>
  `border-2 border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden ${accent}`;

const BusinessEthicsScreen = () => {
  const { toast } = useToast();
  const [draft, setDraft] = useState<BoundaryDraftV2>(() => loadBoundaryDraft());
  const [store, setStore] = useState(() => loadBusinessEthicsStore(loadBoundaryDraft()));
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const refreshBoundary = useCallback(() => {
    const d = loadBoundaryDraft();
    setDraft(d);
    setStore(loadBusinessEthicsStore(d));
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
    ? getBusinessEthicsDataForAsset(store, selectedAssetId)
    : defaultBusinessEthicsAssetData();

  const patchData = (updater: (d: BusinessEthicsAssetData) => BusinessEthicsAssetData) => {
    if (!selectedAssetId) return;
    const cur = getBusinessEthicsDataForAsset(store, selectedAssetId);
    const nextStore = setBusinessEthicsDataForAsset(store, selectedAssetId, updater(cur));
    setStore(nextStore);
    saveBusinessEthicsStore(nextStore);
  };

  const summaryHref =
    selectedAssetId != null
      ? `/esg-management/business-ethics/results?assetId=${encodeURIComponent(selectedAssetId)}`
      : "/esg-management/business-ethics/results";

  const provedHighRiskPct = calcProvedReservesHighRiskPct(data);
  const probableHighRiskPct = calcProbableReservesHighRiskPct(data);
  const totalPaymentsUsd = calcTotalGovernmentPaymentsUsd(data.governmentPaymentRows);
  const substantiationRate = calcWhistleblowerSubstantiationRatePct(data);

  const showDueDiligenceTool = data.thirdPartyDueDiligenceInPlace === "Yes";

  const addPaymentRow = () => {
    const row: GovernmentPaymentRow = {
      id: newTopicRowId(),
      country: "",
      paymentType: "Tax",
      amountUsd: "",
      reportingYear: "",
    };
    patchData((d) => ({ ...d, governmentPaymentRows: [...d.governmentPaymentRows, row] }));
  };

  const updatePaymentRow = (id: string, patch: Partial<GovernmentPaymentRow>) => {
    patchData((d) => ({
      ...d,
      governmentPaymentRows: d.governmentPaymentRows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  const removePaymentRow = (id: string) => {
    patchData((d) => ({
      ...d,
      governmentPaymentRows: d.governmentPaymentRows.filter((r) => r.id !== id),
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
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Business Ethics &amp; Payments Transparency
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl mt-1">
          SASB EM-EP-510a metrics for reserves in high-risk jurisdictions, government payments, whistleblower programmes, and anti-corruption controls.
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
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">
            Reserves in High-Risk Jurisdictions (EM-EP-510a.1)
          </CardTitle>
          <CardDescription className="text-slate-600">
            Proved and probable reserves located in countries with high corruption risk.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-slate-800">Proved reserves in high-risk countries (Mmboe)</Label>
              <Input
                className="border-2 border-slate-200"
                value={data.provedReservesHighRiskMmboe}
                disabled={!selectedAsset}
                onChange={(e) => patchData((d) => ({ ...d, provedReservesHighRiskMmboe: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-800">Total proved reserves (Mmboe)</Label>
              <Input
                className="border-2 border-slate-200"
                value={data.totalProvedReservesMmboe}
                disabled={!selectedAsset}
                onChange={(e) => patchData((d) => ({ ...d, totalProvedReservesMmboe: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-800">Probable reserves in high-risk countries (Mmboe)</Label>
              <Input
                className="border-2 border-slate-200"
                value={data.probableReservesHighRiskMmboe}
                disabled={!selectedAsset}
                onChange={(e) => patchData((d) => ({ ...d, probableReservesHighRiskMmboe: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-800">Total probable reserves (Mmboe)</Label>
              <Input
                className="border-2 border-slate-200"
                value={data.totalProbableReservesMmboe}
                disabled={!selectedAsset}
                onChange={(e) => patchData((d) => ({ ...d, totalProbableReservesMmboe: e.target.value }))}
              />
            </div>
          </div>
          <div className="text-sm text-slate-700 space-y-1">
            <p>
              % proved in high-risk:{" "}
              <span className="font-semibold text-slate-900 tabular-nums">{formatBusinessEthicsNum(provedHighRiskPct)}%</span>
            </p>
            <p>
              % probable in high-risk:{" "}
              <span className="font-semibold text-slate-900 tabular-nums">{formatBusinessEthicsNum(probableHighRiskPct)}%</span>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-amber-600")}>
        <CardHeader className="pb-2 flex flex-row flex-wrap items-end justify-between gap-2">
          <div>
            <CardTitle className="text-lg text-slate-900">Payments to Governments (ETH-01)</CardTitle>
            <CardDescription className="text-slate-600">Disclose payments made to governments by country and type.</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={!selectedAsset} onClick={addPaymentRow}>
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
                  <th className="py-2 pr-2 font-semibold text-slate-800">Payment type</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Amount (USD)</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Year</th>
                  <th className="py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {data.governmentPaymentRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-slate-500">
                      No payment rows yet.
                    </td>
                  </tr>
                ) : (
                  data.governmentPaymentRows.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 align-top">
                      <td className="py-2 pr-2">
                        <Input
                          className="border-2 border-slate-200 h-9"
                          value={r.country}
                          disabled={!selectedAsset}
                          onChange={(e) => updatePaymentRow(r.id, { country: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Select
                          value={r.paymentType}
                          disabled={!selectedAsset}
                          onValueChange={(v) => updatePaymentRow(r.id, { paymentType: v as PaymentType })}
                        >
                          <SelectTrigger className="border-2 border-slate-200 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_TYPE_OPTIONS.map((t) => (
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
                          value={r.amountUsd}
                          disabled={!selectedAsset}
                          onChange={(e) => updatePaymentRow(r.id, { amountUsd: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          className="border-2 border-slate-200 h-9"
                          value={r.reportingYear}
                          disabled={!selectedAsset}
                          onChange={(e) => updatePaymentRow(r.id, { reportingYear: e.target.value })}
                          placeholder="e.g. 2025"
                        />
                      </td>
                      <td className="py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-slate-500"
                          disabled={!selectedAsset}
                          onClick={() => removePaymentRow(r.id)}
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
            Total payments:{" "}
            <span className="font-semibold text-slate-900 tabular-nums">{formatBusinessEthicsUsd(totalPaymentsUsd)} USD</span>
          </p>
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-orange-500")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">Whistleblower Reports (ETH-03, ETH-04)</CardTitle>
          <CardDescription className="text-slate-600">Reports received and substantiated during the reporting period.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-slate-800">Reports received this year</Label>
              <Input
                className="border-2 border-slate-200"
                value={data.whistleblowerReportsReceived}
                disabled={!selectedAsset}
                onChange={(e) => patchData((d) => ({ ...d, whistleblowerReportsReceived: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-800">Reports substantiated after investigation</Label>
              <Input
                className="border-2 border-slate-200"
                value={data.whistleblowerReportsSubstantiated}
                disabled={!selectedAsset}
                onChange={(e) => patchData((d) => ({ ...d, whistleblowerReportsSubstantiated: e.target.value }))}
              />
            </div>
          </div>
          <p className="text-sm text-slate-700">
            Substantiation rate:{" "}
            <span className="font-semibold text-slate-900 tabular-nums">{formatBusinessEthicsNum(substantiationRate)}%</span>
          </p>
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-blue-500")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">Anti-Corruption Training (ETH-05)</CardTitle>
          <CardDescription className="text-slate-600">Share of employees who completed annual anti-corruption training.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-xs">
            <Label className="text-slate-800">% employees completed annual training</Label>
            <Input
              className="border-2 border-slate-200"
              value={data.antiCorruptionTrainingPct}
              disabled={!selectedAsset}
              onChange={(e) => patchData((d) => ({ ...d, antiCorruptionTrainingPct: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-violet-500")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">Governance Controls (EM-EP-510a.2)</CardTitle>
          <CardDescription className="text-slate-600">Due diligence, code of conduct, audit findings, and corruption management systems.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-slate-800">Third-party due diligence in place?</Label>
              <div className="flex flex-wrap gap-2">
                {YES_NO_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    disabled={!selectedAsset}
                    onClick={() =>
                      patchData((d) => ({
                        ...d,
                        thirdPartyDueDiligenceInPlace: opt as YesNoAnswer,
                        dueDiligenceToolName: opt === "No" ? "" : d.dueDiligenceToolName,
                      }))
                    }
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-medium border-2 transition-all",
                      data.thirdPartyDueDiligenceInPlace === opt
                        ? "bg-teal-600 border-teal-600 text-white"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            {showDueDiligenceTool && (
              <div className="space-y-2">
                <Label className="text-slate-800">Due diligence tool name</Label>
                <Input
                  className="border-2 border-slate-200"
                  value={data.dueDiligenceToolName}
                  disabled={!selectedAsset}
                  onChange={(e) => patchData((d) => ({ ...d, dueDiligenceToolName: e.target.value }))}
                  placeholder="e.g. Refinitiv World-Check"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-slate-800">Code of conduct in place?</Label>
              <div className="flex flex-wrap gap-2">
                {YES_NO_OPTIONS.map((opt) => (
                  <button
                    key={`code-${opt}`}
                    type="button"
                    disabled={!selectedAsset}
                    onClick={() => patchData((d) => ({ ...d, codeOfConductInPlace: opt as YesNoAnswer }))}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-medium border-2 transition-all",
                      data.codeOfConductInPlace === opt
                        ? "bg-teal-600 border-teal-600 text-white"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-800">Internal audit ethics findings (count)</Label>
              <Input
                className="border-2 border-slate-200"
                value={data.internalAuditEthicsFindings}
                disabled={!selectedAsset}
                onChange={(e) => patchData((d) => ({ ...d, internalAuditEthicsFindings: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-800">Corruption management narrative</Label>
            <Textarea
              className="border-2 border-slate-200 min-h-[120px]"
              placeholder="Describe management systems for prevention of corruption and bribery throughout the value chain."
              value={data.corruptionManagementNarrative}
              disabled={!selectedAsset}
              onChange={(e) => patchData((d) => ({ ...d, corruptionManagementNarrative: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {selectedAsset && (
        <div className="flex justify-end">
          <Button
            type="button"
            className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md"
            onClick={() => {
              saveBusinessEthicsStore(store);
              toast({
                title: "Saved",
                description: "Business ethics data saved for this asset and reporting period.",
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
              Open a dedicated page for reserves exposure, payments, whistleblower stats, and governance controls.
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

export default BusinessEthicsScreen;

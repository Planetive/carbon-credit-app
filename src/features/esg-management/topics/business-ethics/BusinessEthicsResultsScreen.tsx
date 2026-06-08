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
  defaultBusinessEthicsAssetData,
  getBusinessEthicsDataForAsset,
  loadBusinessEthicsStore,
} from "./storage";
import {
  calcProbableReservesHighRiskPct,
  calcProvedReservesHighRiskPct,
  calcTotalGovernmentPaymentsUsd,
  calcWhistleblowerSubstantiationRatePct,
  formatBusinessEthicsNum,
  formatBusinessEthicsUsd,
} from "./calculations";
import type { BusinessEthicsAssetData } from "./types";

const sectionShell = (accent: string) =>
  `border-2 border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden ${accent}`;

const BusinessEthicsResultsScreen = () => {
  const [searchParams, setSearchParams] = useSearchParams();
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
  const data: BusinessEthicsAssetData = selectedAssetId
    ? getBusinessEthicsDataForAsset(store, selectedAssetId)
    : defaultBusinessEthicsAssetData();

  const provedHighRiskPct = calcProvedReservesHighRiskPct(data);
  const probableHighRiskPct = calcProbableReservesHighRiskPct(data);
  const totalPaymentsUsd = calcTotalGovernmentPaymentsUsd(data.governmentPaymentRows);
  const substantiationRate = calcWhistleblowerSubstantiationRatePct(data);

  const hasRelevantData = useMemo(() => {
    if (!selectedAssetId) return false;
    const d = data;
    const hasReserves =
      parseFloat(d.provedReservesHighRiskMmboe) > 0 ||
      parseFloat(d.totalProvedReservesMmboe) > 0 ||
      parseFloat(d.probableReservesHighRiskMmboe) > 0 ||
      parseFloat(d.totalProbableReservesMmboe) > 0;
    return (
      hasReserves ||
      d.corruptionManagementNarrative.trim() !== "" ||
      d.governmentPaymentRows.length > 0 ||
      parseFloat(d.whistleblowerReportsReceived) > 0 ||
      parseFloat(d.whistleblowerReportsSubstantiated) > 0 ||
      parseFloat(d.antiCorruptionTrainingPct) > 0 ||
      d.thirdPartyDueDiligenceInPlace === "Yes" ||
      d.codeOfConductInPlace === "Yes" ||
      parseFloat(d.internalAuditEthicsFindings) > 0
    );
  }, [data, selectedAssetId]);

  return (
    <div className="min-w-0 max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <Button variant="ghost" className="px-0 mb-2 h-auto text-slate-600 hover:text-teal-700" asChild>
          <Link to="/esg-management/business-ethics" className="inline-flex items-center text-sm font-medium">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to data entry
          </Link>
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Business Ethics &amp; Payments Transparency — summary
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl mt-1">
          Read-only SASB EM-EP-510a metrics. Edit data on the previous page.
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
              No data yet — enter reserves, payments, whistleblower stats, or governance controls on the data entry page.
            </p>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">EM-EP-510a.1 — Reserves in high-risk countries</h3>
                <div className="grid gap-3 sm:grid-cols-2 mb-3">
                  <div className="rounded-lg border border-red-200 bg-red-50/40 px-3 py-3">
                    <p className="text-xs text-slate-600">% proved reserves in high-risk countries</p>
                    <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">
                      {formatBusinessEthicsNum(provedHighRiskPct)}%
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {data.provedReservesHighRiskMmboe} / {data.totalProvedReservesMmboe} Mmboe
                    </p>
                  </div>
                  <div className="rounded-lg border border-red-200 bg-red-50/40 px-3 py-3">
                    <p className="text-xs text-slate-600">% probable reserves in high-risk countries</p>
                    <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">
                      {formatBusinessEthicsNum(probableHighRiskPct)}%
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {data.probableReservesHighRiskMmboe} / {data.totalProbableReservesMmboe} Mmboe
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">EM-EP-510a.2 — Corruption management</h3>
                <p className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-700">
                  {data.corruptionManagementNarrative.trim() || "Not entered"}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Government payments (ETH-01)</h3>
                <p className="text-sm text-slate-700 mb-3">
                  Total payments:{" "}
                  <span className="font-semibold text-slate-900 tabular-nums">{formatBusinessEthicsUsd(totalPaymentsUsd)} USD</span>
                </p>
                {data.governmentPaymentRows.length > 0 && (
                  <div className="rounded-lg border border-slate-200 overflow-x-auto">
                    <table className="w-full text-sm min-w-[600px]">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="py-2 px-3 text-left font-semibold text-slate-800">Country</th>
                          <th className="py-2 px-3 text-left font-semibold text-slate-800">Type</th>
                          <th className="py-2 px-3 text-left font-semibold text-slate-800">Amount (USD)</th>
                          <th className="py-2 px-3 text-left font-semibold text-slate-800">Year</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.governmentPaymentRows.map((r) => (
                          <tr key={r.id} className="border-b border-slate-100">
                            <td className="py-2 px-3">{r.country.trim() || "—"}</td>
                            <td className="py-2 px-3">{r.paymentType}</td>
                            <td className="py-2 px-3 tabular-nums">{r.amountUsd.trim() || "—"}</td>
                            <td className="py-2 px-3">{r.reportingYear.trim() || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Whistleblower programme (ETH-03, ETH-04)</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-orange-200 bg-orange-50/40 px-3 py-3">
                    <p className="text-xs text-slate-600">Reports received</p>
                    <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">{data.whistleblowerReportsReceived}</p>
                  </div>
                  <div className="rounded-lg border border-orange-200 bg-orange-50/40 px-3 py-3">
                    <p className="text-xs text-slate-600">Substantiated</p>
                    <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">{data.whistleblowerReportsSubstantiated}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3">
                    <p className="text-xs text-slate-600">Substantiation rate</p>
                    <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">
                      {formatBusinessEthicsNum(substantiationRate)}%
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Anti-corruption training (ETH-05)</h3>
                <div className="rounded-lg border border-blue-200 bg-blue-50/40 px-3 py-3 max-w-xs">
                  <p className="text-xs text-slate-600">% employees trained</p>
                  <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">
                    {formatBusinessEthicsNum(parseFloat(data.antiCorruptionTrainingPct) || 0)}%
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Governance controls</h3>
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody className="text-slate-700">
                      <tr className="border-b border-slate-100">
                        <td className="py-2 px-3 font-medium text-slate-800 bg-slate-50 w-2/5">Third-party due diligence (ETH-06)</td>
                        <td className="py-2 px-3">
                          {data.thirdPartyDueDiligenceInPlace}
                          {data.thirdPartyDueDiligenceInPlace === "Yes" && data.dueDiligenceToolName.trim()
                            ? ` · ${data.dueDiligenceToolName.trim()}`
                            : ""}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2 px-3 font-medium text-slate-800 bg-slate-50">Code of conduct (ETH-07)</td>
                        <td className="py-2 px-3">{data.codeOfConductInPlace}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-medium text-slate-800 bg-slate-50">Internal audit ethics findings (ETH-08)</td>
                        <td className="py-2 px-3 tabular-nums">{data.internalAuditEthicsFindings}</td>
                      </tr>
                    </tbody>
                  </table>
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

export default BusinessEthicsResultsScreen;

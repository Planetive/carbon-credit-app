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
  defaultReservesAssetData,
  getReservesDataForAsset,
  loadReservesStore,
} from "./storage";
import {
  calcEmbeddedCo2MtCo2e,
  calcPctReservesInCarbonRegulatedJurisdictions,
  formatReservesNum,
  getPctCapexLowCarbon,
  parseReservesNumericInput,
} from "./calculations";
import type { ReservesAssetData } from "./types";

const sectionShell = (accent: string) =>
  `border-2 border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden ${accent}`;

function displayPrice(s: string): string {
  const t = s.trim();
  if (!t) return "Not entered";
  const n = parseReservesNumericInput(t);
  return `$${formatReservesNum(n)} /tCO₂`;
}

function displayNarrative(s: string): string {
  const t = s.trim();
  return t || "Not entered";
}

const ReservesValuationResultsScreen = () => {
  const [searchParams, setSearchParams] = useSearchParams();
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
  const data: ReservesAssetData = selectedAssetId
    ? getReservesDataForAsset(store, selectedAssetId)
    : defaultReservesAssetData();

  const embeddedCo2 = calcEmbeddedCo2MtCo2e(data);
  const pctRegulated = calcPctReservesInCarbonRegulatedJurisdictions(data.reservesByCountry);
  const pctCapexLowCarbon = getPctCapexLowCarbon(data);

  const hasRelevantData = useMemo(() => {
    if (!selectedAssetId) return false;
    const d = data;
    return (
      d.provedReservesCrudeOilMmbbl.trim() !== "" ||
      d.provedReservesNaturalGasBcf.trim() !== "" ||
      d.provedReservesNglMmbbl.trim() !== "" ||
      d.reservesByCountry.length > 0 ||
      d.internalCarbonPricePerTco2.trim() !== "" ||
      d.ieaStepsPricePerTco2.trim() !== "" ||
      d.ieaApsPricePerTco2.trim() !== "" ||
      d.ieaNzePricePerTco2.trim() !== "" ||
      d.pctCapexLowCarbon.trim() !== "" ||
      d.tcfdPhysicalRisks.trim() !== "" ||
      d.tcfdTransitionRisks.trim() !== "" ||
      d.tcfdOpportunities.trim() !== "" ||
      d.tcfdStrategyResilience.trim() !== ""
    );
  }, [data, selectedAssetId]);

  return (
    <div className="min-w-0 max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <Button variant="ghost" className="px-0 mb-2 h-auto text-slate-600 hover:text-teal-700" asChild>
          <Link to="/esg-management/reserves-valuation" className="inline-flex items-center text-sm font-medium">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to data entry
          </Link>
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Reserves Valuation &amp; Capital Expenditures — summary
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl mt-1">
          Read-only SASB EM-EP-420a metrics and TCFD narratives. Edit data on the previous page.
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
              No data yet — enter reserves, carbon prices, capex, or TCFD narratives on the data entry page.
            </p>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">EM-EP-420a.1 — Carbon price assumptions</h3>
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody className="text-slate-700">
                      <tr className="border-b border-slate-100">
                        <td className="py-2 px-3 font-medium text-slate-800 bg-slate-50 w-2/5">Internal carbon price</td>
                        <td className="py-2 px-3">{displayPrice(data.internalCarbonPricePerTco2)}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2 px-3 font-medium text-slate-800 bg-slate-50">IEA STEPS</td>
                        <td className="py-2 px-3">{displayPrice(data.ieaStepsPricePerTco2)}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2 px-3 font-medium text-slate-800 bg-slate-50">IEA APS</td>
                        <td className="py-2 px-3">{displayPrice(data.ieaApsPricePerTco2)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-medium text-slate-800 bg-slate-50">IEA NZE</td>
                        <td className="py-2 px-3">{displayPrice(data.ieaNzePricePerTco2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">EM-EP-420a.2 — Embedded CO₂ in proved reserves</h3>
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3">
                  <p className="text-xs text-slate-600">Total embedded CO₂ (oil + gas)</p>
                  <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">
                    {formatReservesNum(embeddedCo2)} MT CO₂e
                  </p>
                </div>
                <ul className="text-xs text-slate-500 mt-2 space-y-0.5">
                  <li>
                    Crude oil (1P):{" "}
                    {data.provedReservesCrudeOilMmbbl.trim() === ""
                      ? "Not entered"
                      : `${data.provedReservesCrudeOilMmbbl.trim()} Mmbbl`}
                  </li>
                  <li>
                    Natural gas (1P):{" "}
                    {data.provedReservesNaturalGasBcf.trim() === ""
                      ? "Not entered"
                      : `${data.provedReservesNaturalGasBcf.trim()} Bcf`}
                  </li>
                  <li>
                    NGL (1P):{" "}
                    {data.provedReservesNglMmbbl.trim() === ""
                      ? "Not entered"
                      : `${data.provedReservesNglMmbbl.trim()} Mmbbl`}
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">
                  EM-EP-420a.3 — Reserves in carbon-regulated jurisdictions
                </h3>
                <p className="text-sm text-slate-700">
                  <span className="font-medium text-slate-800 tabular-nums">{formatReservesNum(pctRegulated, 1)}%</span> of
                  proved reserves (by country rows) are in carbon-regulated jurisdictions.
                </p>
                {data.reservesByCountry.length > 0 && (
                  <div className="mt-3 rounded-lg border border-slate-200 overflow-x-auto">
                    <table className="w-full text-sm min-w-[520px]">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="py-2 px-3 text-left font-semibold text-slate-800">Country</th>
                          <th className="py-2 px-3 text-left font-semibold text-slate-800">Product</th>
                          <th className="py-2 px-3 text-left font-semibold text-slate-800">1P</th>
                          <th className="py-2 px-3 text-left font-semibold text-slate-800">Unit</th>
                          <th className="py-2 px-3 text-left font-semibold text-slate-800">Regulated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.reservesByCountry.map((r) => (
                          <tr key={r.id} className="border-b border-slate-100">
                            <td className="py-2 px-3">{r.country.trim() || "—"}</td>
                            <td className="py-2 px-3">{r.productType}</td>
                            <td className="py-2 px-3 tabular-nums">{r.provedReserves1P.trim() || "—"}</td>
                            <td className="py-2 px-3">{r.unit}</td>
                            <td className="py-2 px-3">{r.carbonRegulated ? "Yes" : "No"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">EM-EP-420a.4 — Capital allocation &amp; TCFD</h3>
                <p className="text-sm text-slate-700 mb-3">
                  <span className="font-medium text-slate-800">% capex to low-carbon activities: </span>
                  <span className="tabular-nums">{formatReservesNum(pctCapexLowCarbon, 1)}%</span>
                </p>
                <div className="space-y-3 text-sm text-slate-700">
                  <div>
                    <p className="font-medium text-slate-800 mb-1">Physical risks</p>
                    <p className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
                      {displayNarrative(data.tcfdPhysicalRisks)}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 mb-1">Transition risks</p>
                    <p className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
                      {displayNarrative(data.tcfdTransitionRisks)}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 mb-1">Opportunities</p>
                    <p className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
                      {displayNarrative(data.tcfdOpportunities)}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 mb-1">Strategy resilience</p>
                    <p className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
                      {displayNarrative(data.tcfdStrategyResilience)}
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

export default ReservesValuationResultsScreen;

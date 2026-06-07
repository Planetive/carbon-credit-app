import { Link, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, AlertTriangle } from "lucide-react";
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
import { formatPeriodRangeLabel, monthsInReportingPeriodIfValid } from "../shared/periodUtils";
import {
  defaultWaterAssetData,
  getWaterDataForAsset,
  loadWaterStore,
} from "./storage";
import {
  disposalPctIsValid,
  disposalPctSum,
  freshwaterConsumedM3PerMonth,
  derivedProducedSplitsBblForPeriod,
  derivedProducedSplitsM3ForPeriod,
  hfDisclosurePercent,
  parseWaterNumericInput,
  producedVolumeForPeriod,
  sumFreshwaterWithdrawnM3PerMonth,
  toThousandM3ForPeriod,
  volumeForPeriodM3,
} from "./calculations";
import type { WaterAssetData } from "./types";

const sectionShell = (accent: string) =>
  `border-2 border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden ${accent}`;

function formatNum(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-GB", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

const WaterManagementResultsScreen = () => {
  const [searchParams, setSearchParams] = useSearchParams();
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

  const months = useMemo(
    () => monthsInReportingPeriodIfValid(draft.period_start, draft.period_end),
    [draft.period_end, draft.period_start]
  );
  const canScaleWaterPeriod = months !== null;

  const periodLabel = useMemo(
    () => formatPeriodRangeLabel(draft.period_start, draft.period_end),
    [draft.period_end, draft.period_start]
  );

  const selectedAsset = draft.assets.find((a) => a.id === selectedAssetId) ?? null;
  const data: WaterAssetData = selectedAssetId ? getWaterDataForAsset(store, selectedAssetId) : defaultWaterAssetData();

  const withdrawalMonthly = sumFreshwaterWithdrawnM3PerMonth(data);
  const consumedMonthly = freshwaterConsumedM3PerMonth(data);
  const returnedMonthly = parseWaterNumericInput(data.returnedDischargedM3PerMonth);
  const returnedExceedsWithdrawals = returnedMonthly > withdrawalMonthly;
  const disposalSum = disposalPctSum(data.disposalPct);
  const disposalOk = disposalPctIsValid(data.disposalPct);
  const derivedM3 = canScaleWaterPeriod ? derivedProducedSplitsM3ForPeriod(data, months) : null;
  const derivedBbl = canScaleWaterPeriod ? derivedProducedSplitsBblForPeriod(data, months) : null;
  const hfPct = hfDisclosurePercent(data.hfWells);
  const producedPeriod = canScaleWaterPeriod ? producedVolumeForPeriod(data, months) : null;

  const hasRelevantWaterData = useMemo(() => {
    if (!selectedAssetId) return false;
    const d = data;
    return (
      d.freshwaterRows.length > 0 ||
      d.returnedDischargedM3PerMonth.trim() !== "" ||
      d.producedGenerated.trim() !== "" ||
      Object.values(d.disposalPct).some((v) => v.trim() !== "") ||
      d.hfWells.length > 0 ||
      d.waterStressSharePct.trim() !== "" ||
      d.hfSitesDeterioratedWaterQualityPct.trim() !== ""
    );
  }, [data, selectedAssetId]);

  return (
    <div className="min-w-0 max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <Button variant="ghost" className="px-0 mb-2 h-auto text-slate-600 hover:text-teal-700" asChild>
          <Link to="/esg-management/water-management" className="inline-flex items-center text-sm font-medium">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to data entry
          </Link>
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Water management — summary</h1>
        <p className="text-sm text-slate-600 max-w-2xl mt-1">
          Reporting-period totals from your monthly inputs. Edit data on the previous page.
        </p>
        <p className="text-xs text-slate-500 mt-2 space-y-0.5">
          <span>
            Reporting period: <span className="font-medium text-slate-700">{periodLabel}</span>
          </span>
          <span className="mx-2">·</span>
          <span>
            Calendar months:{" "}
            <span className="font-medium text-slate-700">{canScaleWaterPeriod ? months : "—"}</span>
          </span>
        </p>
        {!canScaleWaterPeriod && (
          <p className="text-xs text-amber-800 mt-1 max-w-2xl">
            Reporting period dates are missing or invalid in boundary setting. Period totals stay hidden until they are fixed.
          </p>
        )}
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
            {canScaleWaterPeriod ? (
              <> ({months} calendar months). Totals scale monthly inputs across this period.</>
            ) : (
              <>. Totals are not calculated until the reporting period is valid in boundary setting.</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!draft.assets.length ? (
            <p className="text-sm text-slate-600">Add assets in boundary setting, then return to data entry.</p>
          ) : !hasRelevantWaterData ? (
            <p className="text-sm text-slate-600">No data yet — enter freshwater, produced water, or related fields on the data entry page.</p>
          ) : (
            <>
              {!canScaleWaterPeriod && (
                <Alert className="border-amber-300 bg-amber-50 border-2 rounded-xl">
                  <AlertTriangle className="h-4 w-4 text-amber-900" />
                  <AlertTitle className="text-amber-950">Reporting period not valid</AlertTitle>
                  <AlertDescription className="text-sm text-amber-950/95 mt-1">
                    Update the reporting period start and end in boundary setting (valid dates, end after start, start not in
                    the future). Period totals stay hidden until then so volumes are not scaled incorrectly.
                  </AlertDescription>
                </Alert>
              )}

              {returnedExceedsWithdrawals && (
                <Alert className="border-amber-300 bg-amber-50 border-2 rounded-xl">
                  <AlertTriangle className="h-4 w-4 text-amber-900" />
                  <AlertTitle className="text-amber-950">Check your freshwater figures</AlertTitle>
                  <AlertDescription className="text-sm text-amber-950/95 mt-1">
                    Returned/discharged water is greater than withdrawals. Please check the entered values. Consumed freshwater
                    is shown as zero in this case.
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Freshwater</h3>
                {canScaleWaterPeriod ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3">
                      <p className="text-xs text-slate-600">Total withdrawn (reporting period)</p>
                      <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">
                        {formatNum(volumeForPeriodM3(withdrawalMonthly, months))} m³
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3">
                      <p className="text-xs text-slate-600">Total consumed (reporting period)</p>
                      <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">
                        {formatNum(volumeForPeriodM3(consumedMonthly, months))} m³
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3 sm:col-span-2">
                      <p className="text-xs text-slate-600">Total withdrawn (thousand m³, reporting period)</p>
                      <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">
                        {formatNum(toThousandM3ForPeriod(withdrawalMonthly, months))} thousand m³
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3 sm:col-span-2">
                      <p className="text-xs text-slate-600">Total consumed (thousand m³, reporting period)</p>
                      <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">
                        {formatNum(toThousandM3ForPeriod(consumedMonthly, months))} thousand m³
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">Period totals for freshwater are unavailable until the reporting period is valid.</p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Produced water</h3>
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody className="text-slate-700">
                      <tr className="border-b border-slate-100">
                        <td className="py-2 px-3 font-medium text-slate-800 bg-slate-50 w-2/5">Generated (reporting period)</td>
                        <td className="py-2 px-3 tabular-nums">
                          {!canScaleWaterPeriod || !producedPeriod
                            ? "—"
                            : data.producedUnit === "bbl_month"
                              ? `${formatNum(producedPeriod.periodBbl)} bbl`
                              : `${formatNum(producedPeriod.periodM3)} m³`}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2 px-3 font-medium text-slate-800 bg-slate-50">Injected (reporting period)</td>
                        <td className="py-2 px-3 tabular-nums">
                          {derivedM3 ? `${formatNum(derivedM3.injected)} m³` : derivedBbl ? `${formatNum(derivedBbl.injected)} bbl` : "—"}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2 px-3 font-medium text-slate-800 bg-slate-50">Recycled (reporting period)</td>
                        <td className="py-2 px-3 tabular-nums">
                          {derivedM3 ? `${formatNum(derivedM3.recycled)} m³` : derivedBbl ? `${formatNum(derivedBbl.recycled)} bbl` : "—"}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2 px-3 font-medium text-slate-800 bg-slate-50">Discharged (reporting period)</td>
                        <td className="py-2 px-3 tabular-nums">
                          {derivedM3 ? `${formatNum(derivedM3.discharged)} m³` : derivedBbl ? `${formatNum(derivedBbl.discharged)} bbl` : "—"}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-medium text-slate-800 bg-slate-50">Evaporation pond (reporting period)</td>
                        <td className="py-2 px-3 tabular-nums">
                          {derivedM3
                            ? `${formatNum(derivedM3.evaporationPond)} m³`
                            : derivedBbl
                              ? `${formatNum(derivedBbl.evaporationPond)} bbl`
                              : "—"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {!disposalOk && (
                  <p className="text-xs text-amber-800 mt-2">
                    Route volumes are not shown until injected, recycled, discharged, and evaporation pond percentages total
                    100% (±0.02). Current total: {formatNum(disposalSum, 2)}%.
                  </p>
                )}
                {canScaleWaterPeriod && disposalOk && !derivedM3 && !derivedBbl && (
                  <p className="text-xs text-slate-600 mt-2">
                    Enter a numeric generated produced-water volume on the data entry page to calculate split volumes.
                  </p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Disposal split validation</h3>
                {disposalOk ? (
                  <p className="text-sm text-emerald-800 font-medium">Valid — disposal routes total 100% (within tolerance).</p>
                ) : (
                  <p className="text-sm text-amber-800 font-medium">
                    Check required — routes total {formatNum(disposalSum, 2)}% (must be 100% ±0.02).
                  </p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">HF fluid disclosure</h3>
                <p className="text-sm text-slate-700">
                  {hfPct === null
                    ? "Add at least one HF well on the data entry page to calculate a disclosure rate."
                    : `Wells with disclosure submitted: ${formatNum(hfPct, 1)}%.`}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Context (manual)</h3>
                <ul className="text-sm text-slate-700 space-y-1">
                  <li>
                    <span className="font-medium text-slate-800">Water-stressed basins (share): </span>
                    {data.waterStressSharePct.trim() === "" ? "Not entered" : data.waterStressSharePct.trim()}
                  </li>
                  <li>
                    <span className="font-medium text-slate-800">HF sites with deteriorated ambient water quality: </span>
                    {data.hfSitesDeterioratedWaterQualityPct.trim() === "" ? "Not entered" : data.hfSitesDeterioratedWaterQualityPct.trim()}
                  </li>
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-slate-600">
        <Link to="/esg-management/topics" className="font-medium text-teal-700 hover:underline underline-offset-2">
          Back to ESG topics
        </Link>
      </p>
    </div>
  );
};

export default WaterManagementResultsScreen;

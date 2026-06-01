import { Link, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
import { POLLUTANT_ROWS, formatAnnualMassDisplay } from "./airPollutantRows";
import {
  defaultAirQualityAssetData,
  getAirDataForAsset,
  loadAirQualityStore,
} from "./storage";

const sectionShell = (accent: string) =>
  `border-2 border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden ${accent}`;

const AirQualityResultsScreen = () => {
  const [searchParams, setSearchParams] = useSearchParams();
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
  const data = selectedAssetId ? getAirDataForAsset(store, selectedAssetId) : defaultAirQualityAssetData();

  const airResults = useMemo(() => {
    const fuelN = data.fuelRows.length;
    const equipN = data.equipmentRows.length;
    const ldarN = data.ldarRows.length;
    const stackN = data.stackTestRows.length;
    const hasAnnual = POLLUTANT_ROWS.some((p) => (data.annualMetricsMt[p.key] ?? "").trim() !== "");
    const hasOperational = fuelN + equipN + ldarN + stackN > 0;
    const isEmpty = !selectedAsset || (!hasAnnual && !hasOperational);
    return { fuelN, equipN, ldarN, stackN, hasAnnual, hasOperational, isEmpty };
  }, [data, selectedAsset]);

  return (
    <div className="min-w-0 max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <Button variant="ghost" className="px-0 mb-2 h-auto text-slate-600 hover:text-teal-700" asChild>
          <Link to="/esg-management/air-quality" className="inline-flex items-center text-sm font-medium">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to data entry
          </Link>
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Air quality — summary</h1>
        <p className="text-sm text-slate-600 max-w-2xl mt-1">
          Read-only snapshot for the selected asset and reporting period. Edit values on the previous page.
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
            <Label className="text-slate-800 sr-only">Selected asset</Label>
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
            Annual masses are exactly what was entered; operational counts reflect saved rows.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!draft.assets.length ? (
            <p className="text-sm text-slate-600">Add assets in boundary setting, then return to data entry.</p>
          ) : airResults.isEmpty ? (
            <p className="text-sm text-slate-600">No data yet — enter annual masses and/or operational rows on the data entry page.</p>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Reported annual masses</h3>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="py-2 px-3 font-semibold text-slate-800">Pollutant</th>
                        <th className="py-2 px-3 font-semibold text-slate-800">Reported mass (t/year)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {POLLUTANT_ROWS.map((p) => (
                        <tr key={p.key} className="border-b border-slate-100 last:border-0">
                          <td className="py-2 px-3 font-medium text-slate-800">{p.label}</td>
                          <td className="py-2 px-3 text-slate-700">{formatAnnualMassDisplay(data.annualMetricsMt[p.key])}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Operational data captured</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Fuel rows", value: airResults.fuelN },
                    { label: "Equipment rows", value: airResults.equipN },
                    { label: "LDAR records", value: airResults.ldarN },
                    { label: "Stack tests", value: airResults.stackN },
                  ].map((tile) => (
                    <div
                      key={tile.label}
                      className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3 text-center"
                    >
                      <p className="text-2xl font-semibold text-slate-900 tabular-nums">{tile.value}</p>
                      <p className="text-xs text-slate-600 mt-1">{tile.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <Alert className="border-slate-300 bg-slate-50 border-2 rounded-xl">
            <Sparkles className="h-4 w-4 text-slate-700" />
            <AlertTitle className="text-slate-900">Automatic mass calculations</AlertTitle>
            <AlertDescription className="text-sm text-slate-700 mt-1">
              Annual tonnes are not estimated from fuel, equipment, LDAR, or stack tests in this release. When emission factors
              and conversion data are configured, those pathways can feed into calculated masses. Until then, use the reported
              annual values above as the source of truth.
            </AlertDescription>
          </Alert>
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

export default AirQualityResultsScreen;

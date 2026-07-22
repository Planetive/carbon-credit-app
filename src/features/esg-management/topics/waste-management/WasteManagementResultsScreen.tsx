import { Link, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  defaultWasteManagementData,
  getWasteDataForAsset,
  loadWasteStore,
} from "./storage";
import type { PolicyAnswer, WasteManagementData } from "./types";
import {
  calcDiversionRate,
  calcHazardousRatio,
  calcRecyclingRate,
  calcTotalHazardousGenerated,
  calcTotalNonHazardousGenerated,
  calcTotalWasteDiverted,
  calcTotalWasteDisposed,
  calcTotalWasteGenerated,
  calcWasteIntensity,
  formatWasteNum,
} from "./calculations";

const sectionShell = (accent: string) =>
  `border-2 border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden ${accent}`;

const RECORD_METADATA_NOTE =
  "Records are tracked by Asset, Field, Business Unit, Month and Year.";

const POLICY_YES_NO_LABELS: { key: "wastePolicyExists" | "wasteProcedureExists" | "wasteContractorsApproved" | "hazardousWasteProcedure" | "wasteImpactAssessmentConducted"; label: string }[] = [
  { key: "wastePolicyExists", label: "Waste management policy exists" },
  { key: "wasteProcedureExists", label: "Waste management procedure exists" },
  { key: "wasteContractorsApproved", label: "Waste contractors approved" },
  { key: "hazardousWasteProcedure", label: "Hazardous waste procedure" },
  { key: "wasteImpactAssessmentConducted", label: "Waste impact assessment conducted" },
];

function PolicyAnswerBadge({ answer }: { answer: PolicyAnswer | undefined }) {
  if (!answer) {
    return <span className="text-slate-500">Not answered</span>;
  }
  return (
    <Badge
      variant="outline"
      className={
        answer === "Yes"
          ? "border-green-600 text-green-700 bg-green-50"
          : "border-slate-300 text-slate-700 bg-slate-50"
      }
    >
      {answer}
    </Badge>
  );
}

const WasteManagementResultsScreen = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [draft, setDraft] = useState<BoundaryDraftV2>(() => loadBoundaryDraft());
  const [store, setStore] = useState(() => loadWasteStore(loadBoundaryDraft()));
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const refreshBoundary = useCallback(() => {
    const d = loadBoundaryDraft();
    setDraft(d);
    setStore(loadWasteStore(d));
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

  const data: WasteManagementData = selectedAssetId
    ? getWasteDataForAsset(store, selectedAssetId, draft)
    : defaultWasteManagementData(draft);

  const totalHazardous = calcTotalHazardousGenerated(data.generationRows);
  const totalNonHazardous = calcTotalNonHazardousGenerated(data.generationRows);
  const totalGenerated = calcTotalWasteGenerated(data.generationRows);
  const totalDiverted = calcTotalWasteDiverted(data.divertedRows);
  const totalDisposed = calcTotalWasteDisposed(data.disposalRows);
  const diversionRate = calcDiversionRate(totalDiverted, totalGenerated);
  const recyclingRate = calcRecyclingRate(data.divertedRows, data.generationRows);
  const hazardousRatio = calcHazardousRatio(totalHazardous, totalGenerated);
  const wasteIntensity = calcWasteIntensity(totalGenerated, data.hydrocarbonProduction);

  const hasRelevantData = useMemo(() => {
    if (!selectedAssetId) return false;
    return (
      Object.keys(data.policy).length > 0 ||
      data.generationRows.some((r) => r.quantity > 0) ||
      data.divertedRows.some((r) => r.quantity > 0) ||
      data.disposalRows.some((r) => r.quantity > 0) ||
      data.hydrocarbonProduction !== null
    );
  }, [data, selectedAssetId]);

  return (
    <div className="min-w-0 max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <Button variant="ghost" className="px-0 mb-2 h-auto text-slate-600 hover:text-[#0A4D3E]" asChild>
          <Link to="/esg-management/waste-management" className="inline-flex items-center text-sm font-medium">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to data entry
          </Link>
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Waste management — summary</h1>
        <p className="text-sm text-slate-600 max-w-2xl mt-1">
          Read-only summary from your saved inputs. Edit data on the previous page.
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
            <p className="text-sm text-slate-600">No data yet — complete policy, generation, diversion, or disposal on the data entry page.</p>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-1">Policy assessment</h3>
                <p className="text-xs text-slate-500 mb-2">{RECORD_METADATA_NOTE}</p>
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody className="text-slate-700">
                      <tr className="border-b border-slate-100">
                        <td className="py-2 px-3 font-medium text-slate-800 bg-slate-50 w-2/3">
                          {POLICY_YES_NO_LABELS[0].label}
                        </td>
                        <td className="py-2 px-3">
                          <PolicyAnswerBadge answer={data.policy.wastePolicyExists} />
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2 px-3 font-medium text-slate-800 bg-slate-50 w-2/3">
                          {POLICY_YES_NO_LABELS[1].label}
                        </td>
                        <td className="py-2 px-3">
                          <PolicyAnswerBadge answer={data.policy.wasteProcedureExists} />
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2 px-3 font-medium text-slate-800 bg-slate-50 w-2/3">Waste reduction targets</td>
                        <td className="py-2 px-3 whitespace-pre-wrap">
                          {data.policy.wasteReductionTargets?.trim() || "—"}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="py-2 px-3 font-medium text-slate-800 bg-slate-50 w-2/3">Waste segregation process</td>
                        <td className="py-2 px-3 whitespace-pre-wrap">
                          {data.policy.wasteSegregationProcess?.trim() || "—"}
                        </td>
                      </tr>
                      {POLICY_YES_NO_LABELS.slice(2).map((q) => (
                        <tr key={q.key} className="border-b border-slate-100 last:border-b-0">
                          <td className="py-2 px-3 font-medium text-slate-800 bg-slate-50 w-2/3">{q.label}</td>
                          <td className="py-2 px-3">
                            <PolicyAnswerBadge answer={data.policy[q.key]} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-1">Waste generated</h3>
                <p className="text-xs text-slate-500 mb-2">{RECORD_METADATA_NOTE}</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3">
                    <p className="text-xs text-slate-600">Total hazardous generated</p>
                    <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">{formatWasteNum(totalHazardous)} tonnes</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3">
                    <p className="text-xs text-slate-600">Total non-hazardous generated</p>
                    <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">{formatWasteNum(totalNonHazardous)} tonnes</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3">
                    <p className="text-xs text-slate-600">Total waste generated</p>
                    <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">{formatWasteNum(totalGenerated)} tonnes</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-1">Diversion and disposal</h3>
                <p className="text-xs text-slate-500 mb-2">{RECORD_METADATA_NOTE}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3">
                    <p className="text-xs text-slate-600">Total waste diverted</p>
                    <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">{formatWasteNum(totalDiverted)} tonnes</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3">
                    <p className="text-xs text-slate-600">Total waste directed to disposal</p>
                    <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">{formatWasteNum(totalDisposed)} tonnes</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-1">Waste KPI summary</h3>
                <p className="text-xs text-slate-500 mb-3">{RECORD_METADATA_NOTE}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { label: "Total Waste Generated", value: `${formatWasteNum(totalGenerated)} tonnes` },
                    { label: "Total Waste Diverted", value: `${formatWasteNum(totalDiverted)} tonnes` },
                    { label: "Total Waste Disposed", value: `${formatWasteNum(totalDisposed)} tonnes` },
                    { label: "Waste Diversion Rate", value: `${formatWasteNum(diversionRate, 1)}%` },
                    { label: "Recycling Rate", value: `${formatWasteNum(recyclingRate, 1)}%` },
                    { label: "Hazardous Waste Ratio", value: `${formatWasteNum(hazardousRatio, 1)}%` },
                    {
                      label: "Waste Intensity",
                      value:
                        wasteIntensity === null
                          ? "—"
                          : `${formatWasteNum(wasteIntensity, 4)} tonnes / BOE`,
                    },
                  ].map((kpi) => (
                    <div key={kpi.label} className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3">
                      <p className="text-xs text-slate-600">{kpi.label}</p>
                      <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">{kpi.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-slate-600">
        <Link to="/esg-management/topics" className="font-medium text-[#0A4D3E] hover:underline underline-offset-2">
          Back to ESG topics
        </Link>
      </p>
    </div>
  );
};

export default WasteManagementResultsScreen;

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
  defaultWorkforceHealthSafetyAssetData,
  getWorkforceHealthSafetyDataForAsset,
  loadWorkforceHealthSafetyStore,
} from "./storage";
import {
  calcAvgHsTrainingHoursPerEmployee,
  calcContractorLtir,
  calcContractorTrir,
  calcEmployeeLtir,
  calcEmployeeTrir,
  calcTotalFatalities,
  formatHsNum,
  parseHsNumericInput,
} from "./calculations";
import type { WorkforceHealthSafetyAssetData } from "./types";

const sectionShell = (accent: string) =>
  `border-2 border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden ${accent}`;

const WorkforceHealthSafetyResultsScreen = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [draft, setDraft] = useState<BoundaryDraftV2>(() => loadBoundaryDraft());
  const [store, setStore] = useState(() => loadWorkforceHealthSafetyStore(loadBoundaryDraft()));
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const refreshBoundary = useCallback(() => {
    const d = loadBoundaryDraft();
    setDraft(d);
    setStore(loadWorkforceHealthSafetyStore(d));
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
  const data: WorkforceHealthSafetyAssetData = selectedAssetId
    ? getWorkforceHealthSafetyDataForAsset(store, selectedAssetId)
    : defaultWorkforceHealthSafetyAssetData();

  const employeeTrir = calcEmployeeTrir(data);
  const employeeLtir = calcEmployeeLtir(data);
  const contractorTrir = calcContractorTrir(data);
  const contractorLtir = calcContractorLtir(data);
  const totalFatalities = calcTotalFatalities(data);
  const avgTrainingHours = calcAvgHsTrainingHoursPerEmployee(data);
  const employeeFatalities = parseHsNumericInput(data.employeeFatalities);
  const contractorFatalities = parseHsNumericInput(data.contractorFatalities);

  const hasRelevantData = useMemo(() => {
    if (!selectedAssetId) return false;
    const d = data;
    return (
      parseHsNumericInput(d.employeeHoursWorked) > 0 ||
      parseHsNumericInput(d.contractorHoursWorked) > 0 ||
      parseHsNumericInput(d.employeeRecordableIncidents) > 0 ||
      parseHsNumericInput(d.contractorRecordableIncidents) > 0 ||
      parseHsNumericInput(d.employeeLostTimeIncidents) > 0 ||
      parseHsNumericInput(d.contractorLostTimeIncidents) > 0 ||
      parseHsNumericInput(d.employeeFatalities) > 0 ||
      parseHsNumericInput(d.contractorFatalities) > 0 ||
      parseHsNumericInput(d.hsTrainingHoursTotal) > 0 ||
      parseHsNumericInput(d.averageEmployeeHeadcountFte) > 0 ||
      d.hsCertification !== "None" ||
      d.hsManagementSystemNarrative.trim() !== ""
    );
  }, [data, selectedAssetId]);

  return (
    <div className="min-w-0 max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <Button variant="ghost" className="px-0 mb-2 h-auto text-slate-600 hover:text-teal-700" asChild>
          <Link to="/esg-management/workforce-health-safety" className="inline-flex items-center text-sm font-medium">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to data entry
          </Link>
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Workforce Health &amp; Safety — summary
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl mt-1">
          Read-only SASB EM-EP-320a metrics. Employees and contractors are reported separately.
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
              No data yet — enter workforce hours, incidents, training, or management system details on the data entry page.
            </p>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">EM-EP-320a.1 — TRIR (per 200,000 hrs)</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-3">
                    <p className="text-xs text-slate-600">Employees</p>
                    <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">{formatHsNum(employeeTrir)}</p>
                  </div>
                  <div className="rounded-lg border border-orange-200 bg-orange-50/50 px-3 py-3">
                    <p className="text-xs text-slate-600">Contractors</p>
                    <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">{formatHsNum(contractorTrir)}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">EM-EP-320a.1 — LTIR (per 200,000 hrs)</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-3">
                    <p className="text-xs text-slate-600">Employees</p>
                    <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">{formatHsNum(employeeLtir)}</p>
                  </div>
                  <div className="rounded-lg border border-orange-200 bg-orange-50/50 px-3 py-3">
                    <p className="text-xs text-slate-600">Contractors</p>
                    <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">{formatHsNum(contractorLtir)}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Fatalities</h3>
                <div className="rounded-lg border-2 border-red-200 bg-red-50/60 px-4 py-4 grid gap-3 sm:grid-cols-3 text-sm">
                  <div>
                    <p className="text-xs text-red-800/80 font-medium">Employees</p>
                    <p className="text-xl font-bold text-red-950 tabular-nums mt-1">{formatHsNum(employeeFatalities, 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-red-800/80 font-medium">Contractors</p>
                    <p className="text-xl font-bold text-red-950 tabular-nums mt-1">{formatHsNum(contractorFatalities, 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-red-800/80 font-medium">Total</p>
                    <p className="text-xl font-bold text-red-950 tabular-nums mt-1">{formatHsNum(totalFatalities, 0)}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">EM-EP-320a.1 — Training</h3>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-3">
                  <p className="text-xs text-slate-600">Average H&amp;S training hours per employee</p>
                  <p className="text-lg font-semibold text-slate-900 tabular-nums mt-1">{formatHsNum(avgTrainingHours)} hrs</p>
                  <p className="text-xs text-slate-500 mt-2">
                    Total training hours: {formatHsNum(parseHsNumericInput(data.hsTrainingHoursTotal), 1)} · Headcount (FTE):{" "}
                    {formatHsNum(parseHsNumericInput(data.averageEmployeeHeadcountFte), 1)}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">EM-EP-320a.2 — Management system</h3>
                <div className="space-y-3 text-sm text-slate-700">
                  <div>
                    <p className="font-medium text-slate-800 mb-1">Certification status</p>
                    <p className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">{data.hsCertification}</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 mb-1">Management system narrative</p>
                    <p className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
                      {data.hsManagementSystemNarrative.trim() || "Not entered"}
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

export default WorkforceHealthSafetyResultsScreen;

import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Info } from "lucide-react";
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
import { loadBoundaryDraft } from "../../boundary/storage";
import type { BoundaryDraftV2 } from "../../boundary/boundaryTypes";
import { formatPeriodRangeLabel } from "../shared/periodUtils";
import { HS_CERTIFICATION_OPTIONS, type HsCertificationType, type WorkforceHealthSafetyAssetData } from "./types";
import {
  defaultWorkforceHealthSafetyAssetData,
  getWorkforceHealthSafetyDataForAsset,
  loadWorkforceHealthSafetyStore,
  saveWorkforceHealthSafetyStore,
  setWorkforceHealthSafetyDataForAsset,
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

const sectionShell = (accent: string) =>
  `border-2 border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden ${accent}`;

const WorkforceHealthSafetyScreen = () => {
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
    ? getWorkforceHealthSafetyDataForAsset(store, selectedAssetId)
    : defaultWorkforceHealthSafetyAssetData();

  const patchData = (updater: (d: WorkforceHealthSafetyAssetData) => WorkforceHealthSafetyAssetData) => {
    if (!selectedAssetId) return;
    const cur = getWorkforceHealthSafetyDataForAsset(store, selectedAssetId);
    const nextStore = setWorkforceHealthSafetyDataForAsset(store, selectedAssetId, updater(cur));
    setStore(nextStore);
    saveWorkforceHealthSafetyStore(nextStore);
  };

  const summaryHref =
    selectedAssetId != null
      ? `/esg-management/workforce-health-safety/results?assetId=${encodeURIComponent(selectedAssetId)}`
      : "/esg-management/workforce-health-safety/results";

  const employeeTrir = calcEmployeeTrir(data);
  const employeeLtir = calcEmployeeLtir(data);
  const contractorTrir = calcContractorTrir(data);
  const contractorLtir = calcContractorLtir(data);
  const totalFatalities = calcTotalFatalities(data);
  const avgTrainingHours = calcAvgHsTrainingHoursPerEmployee(data);
  const employeeFatalities = parseHsNumericInput(data.employeeFatalities);
  const contractorFatalities = parseHsNumericInput(data.contractorFatalities);

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
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Workforce Health &amp; Safety</h1>
        <p className="text-sm text-slate-600 max-w-2xl mt-1">
          SASB EM-EP-320a metrics for recordable and lost-time incident rates, fatalities, training, and management
          systems.
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
          <CardTitle className="text-lg text-slate-900">Employee Workforce Data (EM-EP-320a.1)</CardTitle>
          <CardDescription className="text-slate-600">
            Hours worked and incident counts for direct employees only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-slate-800">Employee hours worked</Label>
              <Input
                className="border-2 border-slate-200 max-w-xs"
                value={data.employeeHoursWorked}
                disabled={!selectedAsset}
                onChange={(e) => patchData((d) => ({ ...d, employeeHoursWorked: e.target.value }))}
              />
              <p className="text-xs text-slate-500">
                No hours data? Estimate: headcount × 2,000 (office) or × 2,080 (field)
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-800">Recordable incidents (employees)</Label>
              <Input
                className="border-2 border-slate-200"
                value={data.employeeRecordableIncidents}
                disabled={!selectedAsset}
                onChange={(e) => patchData((d) => ({ ...d, employeeRecordableIncidents: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-800">Lost time incidents (employees)</Label>
              <Input
                className="border-2 border-slate-200"
                value={data.employeeLostTimeIncidents}
                disabled={!selectedAsset}
                onChange={(e) => patchData((d) => ({ ...d, employeeLostTimeIncidents: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-800">Fatalities (employees)</Label>
              <Input
                className="border-2 border-slate-200"
                value={data.employeeFatalities}
                disabled={!selectedAsset}
                onChange={(e) => patchData((d) => ({ ...d, employeeFatalities: e.target.value }))}
              />
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3 space-y-1 text-sm text-slate-700">
            <p>
              TRIR (employees):{" "}
              <span className="font-semibold text-slate-900 tabular-nums">
                {formatHsNum(employeeTrir)} per 200,000 hrs
              </span>
            </p>
            <p>
              LTIR (employees):{" "}
              <span className="font-semibold text-slate-900 tabular-nums">
                {formatHsNum(employeeLtir)} per 200,000 hrs
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-orange-500")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">Contractor Workforce Data (EM-EP-320a.1)</CardTitle>
          <CardDescription className="text-slate-600">
            Hours worked and incident counts for contractors only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-amber-200 bg-amber-50/80 border-2">
            <AlertTitle className="text-amber-950 text-sm">Separate reporting required</AlertTitle>
            <AlertDescription className="text-sm text-amber-950/90">
              SASB requires employees and contractors reported separately. Do not combine figures.
            </AlertDescription>
          </Alert>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-slate-800">Contractor hours worked</Label>
              <Input
                className="border-2 border-slate-200 max-w-xs"
                value={data.contractorHoursWorked}
                disabled={!selectedAsset}
                onChange={(e) => patchData((d) => ({ ...d, contractorHoursWorked: e.target.value }))}
              />
              <p className="text-xs text-slate-500">
                No hours data? Estimate: headcount × 2,000 (office) or × 2,080 (field)
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-800">Recordable incidents (contractors)</Label>
              <Input
                className="border-2 border-slate-200"
                value={data.contractorRecordableIncidents}
                disabled={!selectedAsset}
                onChange={(e) => patchData((d) => ({ ...d, contractorRecordableIncidents: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-800">Lost time incidents (contractors)</Label>
              <Input
                className="border-2 border-slate-200"
                value={data.contractorLostTimeIncidents}
                disabled={!selectedAsset}
                onChange={(e) => patchData((d) => ({ ...d, contractorLostTimeIncidents: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-800">Fatalities (contractors)</Label>
              <Input
                className="border-2 border-slate-200"
                value={data.contractorFatalities}
                disabled={!selectedAsset}
                onChange={(e) => patchData((d) => ({ ...d, contractorFatalities: e.target.value }))}
              />
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3 space-y-1 text-sm text-slate-700">
            <p>
              TRIR (contractors):{" "}
              <span className="font-semibold text-slate-900 tabular-nums">
                {formatHsNum(contractorTrir)} per 200,000 hrs
              </span>
            </p>
            <p>
              LTIR (contractors):{" "}
              <span className="font-semibold text-slate-900 tabular-nums">
                {formatHsNum(contractorLtir)} per 200,000 hrs
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-red-600")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">Fatalities</CardTitle>
          <CardDescription className="text-slate-600">
            Summary from employee and contractor entries above — read only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border-2 border-red-200 bg-red-50/60 px-4 py-4 grid gap-3 sm:grid-cols-3 text-sm">
            <div>
              <p className="text-xs text-red-800/80 uppercase tracking-wide font-medium">Employees</p>
              <p className="text-2xl font-bold text-red-950 tabular-nums mt-1">{formatHsNum(employeeFatalities, 0)}</p>
            </div>
            <div>
              <p className="text-xs text-red-800/80 uppercase tracking-wide font-medium">Contractors</p>
              <p className="text-2xl font-bold text-red-950 tabular-nums mt-1">{formatHsNum(contractorFatalities, 0)}</p>
            </div>
            <div>
              <p className="text-xs text-red-800/80 uppercase tracking-wide font-medium">Total</p>
              <p className="text-2xl font-bold text-red-950 tabular-nums mt-1">{formatHsNum(totalFatalities, 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-emerald-600")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">Health &amp; Safety Training (EM-EP-320a.1)</CardTitle>
          <CardDescription className="text-slate-600">Total training hours and average headcount for the reporting period.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-slate-800">Total H&amp;S training hours</Label>
              <Input
                className="border-2 border-slate-200"
                value={data.hsTrainingHoursTotal}
                disabled={!selectedAsset}
                onChange={(e) => patchData((d) => ({ ...d, hsTrainingHoursTotal: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-800">Average employee headcount (FTE)</Label>
              <Input
                className="border-2 border-slate-200"
                value={data.averageEmployeeHeadcountFte}
                disabled={!selectedAsset}
                onChange={(e) => patchData((d) => ({ ...d, averageEmployeeHeadcountFte: e.target.value }))}
              />
            </div>
          </div>
          <p className="text-sm text-slate-700">
            Average training hours per employee:{" "}
            <span className="font-semibold text-slate-900 tabular-nums">{formatHsNum(avgTrainingHours)} hrs</span>
          </p>
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-violet-500")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">H&amp;S Management System (EM-EP-320a.2)</CardTitle>
          <CardDescription className="text-slate-600">Certification and narrative on your health and safety management approach.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-md">
            <Label className="text-slate-800">H&amp;S certification</Label>
            <Select
              value={data.hsCertification}
              disabled={!selectedAsset}
              onValueChange={(v) => patchData((d) => ({ ...d, hsCertification: v as HsCertificationType }))}
            >
              <SelectTrigger className="border-2 border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HS_CERTIFICATION_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-800">Management system narrative</Label>
            <Textarea
              className="border-2 border-slate-200 min-h-[120px]"
              placeholder="Describe certifications (ISO 45001, OHSAS 18001), audit frequency, safety culture programs, and how your H&S management system is implemented."
              value={data.hsManagementSystemNarrative}
              disabled={!selectedAsset}
              onChange={(e) => patchData((d) => ({ ...d, hsManagementSystemNarrative: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {draft.assets.length > 0 && (
        <Card className={sectionShell("border-l-4 border-l-slate-700")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-slate-900">Summary</CardTitle>
            <CardDescription className="text-slate-600">
              Open a dedicated page for TRIR, LTIR, fatalities, training, and management system metrics.
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

export default WorkforceHealthSafetyScreen;

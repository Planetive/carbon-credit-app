import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, Info, Plus, Trash2, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { loadBoundaryDraft } from "../../boundary/storage";
import type { BoundaryDraftV2 } from "../../boundary/boundaryTypes";
import { formatPeriodRangeLabel } from "../shared/periodUtils";
import { newTopicRowId } from "../shared/newId";
import type {
  PolicyAnswer,
  WasteDivertedRow,
  WasteDisposalRow,
  WasteGenerationCategory,
  WasteGenerationRow,
  WasteManagementData,
  WastePolicyAssessment,
} from "./types";
import {
  defaultWasteManagementData,
  getWasteDataForAsset,
  loadWasteStore,
  saveWasteStore,
  setWasteDataForAsset,
} from "./storage";
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

const POLICY_ANSWERS: PolicyAnswer[] = ["Yes", "No"];

const POLICY_YES_NO_FIELDS: { key: keyof WastePolicyAssessment; label: string }[] = [
  { key: "wastePolicyExists", label: "Waste management policy exists" },
  { key: "wasteProcedureExists", label: "Waste management procedure exists" },
  { key: "wasteContractorsApproved", label: "Waste contractors approved" },
  { key: "hazardousWasteProcedure", label: "Hazardous waste procedure" },
  { key: "wasteImpactAssessmentConducted", label: "Waste impact assessment conducted" },
];

const GENERATION_CATEGORIES: WasteGenerationCategory[] = [
  "hazardous",
  "non_hazardous",
  "drilling",
  "production",
  "maintenance",
];

const GENERATION_CATEGORY_LABELS: Record<WasteGenerationCategory, string> = {
  hazardous: "Hazardous",
  non_hazardous: "Non-hazardous",
  drilling: "Drilling",
  production: "Production",
  maintenance: "Maintenance",
};

const GENERATION_GROUP_LABELS: Record<WasteGenerationCategory, string> = {
  hazardous: "Hazardous Waste",
  non_hazardous: "Non-Hazardous Waste",
  drilling: "Drilling",
  production: "Production",
  maintenance: "Maintenance",
};

const GENERATION_GROUP_STYLES: Record<WasteGenerationCategory, string> = {
  hazardous: "bg-red-50 border-l-4 border-l-red-400",
  non_hazardous: "bg-slate-50 border-l-4 border-l-slate-400",
  drilling: "bg-amber-50 border-l-4 border-l-amber-400",
  production: "bg-orange-50 border-l-4 border-l-orange-400",
  maintenance: "bg-blue-50 border-l-4 border-l-blue-400",
};

const DIVERTED_METHODS: WasteDivertedRow["method"][] = [
  "Recycling",
  "Reuse",
  "Recovery",
  "Composting",
  "Other Diversion",
];

const DISPOSAL_METHODS: WasteDisposalRow["disposalMethod"][] = [
  "Landfill",
  "Incineration",
  "Deep Well Injection",
  "Waste Treatment Facility",
  "Other Disposal",
];

const MONTHS = [
  { value: 1, label: "Jan" },
  { value: 2, label: "Feb" },
  { value: 3, label: "Mar" },
  { value: 4, label: "Apr" },
  { value: 5, label: "May" },
  { value: 6, label: "Jun" },
  { value: 7, label: "Jul" },
  { value: 8, label: "Aug" },
  { value: 9, label: "Sep" },
  { value: 10, label: "Oct" },
  { value: 11, label: "Nov" },
  { value: 12, label: "Dec" },
];

function reportingYearFromDraft(draft: BoundaryDraftV2): number {
  if (draft.period_end && /^\d{4}/.test(draft.period_end)) {
    return Number(draft.period_end.slice(0, 4));
  }
  return new Date().getFullYear();
}

const WasteManagementScreen = () => {
  const [draft, setDraft] = useState<BoundaryDraftV2>(() => loadBoundaryDraft());
  const [store, setStore] = useState(() => loadWasteStore(loadBoundaryDraft()));
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [generationGroupsOpen, setGenerationGroupsOpen] = useState<Record<WasteGenerationCategory, boolean>>({
    hazardous: true,
    non_hazardous: true,
    drilling: false,
    production: false,
    maintenance: false,
  });
  const [generationRowDetailsOpen, setGenerationRowDetailsOpen] = useState<Record<string, boolean>>({});

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

  const reportingYear = useMemo(() => reportingYearFromDraft(draft), [draft.period_end]);

  const selectedAsset = draft.assets.find((a) => a.id === selectedAssetId) ?? null;
  const data = selectedAssetId
    ? getWasteDataForAsset(store, selectedAssetId, draft)
    : defaultWasteManagementData(draft);

  const patchData = (updater: (d: WasteManagementData) => WasteManagementData) => {
    if (!selectedAssetId) return;
    const cur = getWasteDataForAsset(store, selectedAssetId, draft);
    const next = updater({
      ...cur,
      reportingPeriod: periodLabel,
    });
    const nextStore = setWasteDataForAsset(store, selectedAssetId, next);
    setStore(nextStore);
    saveWasteStore(nextStore);
  };

  const summaryHref =
    selectedAssetId != null
      ? `/esg-management/waste-management/results?assetId=${encodeURIComponent(selectedAssetId)}`
      : "/esg-management/waste-management/results";

  const totalHazardous = calcTotalHazardousGenerated(data.generationRows);
  const totalNonHazardous = calcTotalNonHazardousGenerated(data.generationRows);
  const totalGenerated = calcTotalWasteGenerated(data.generationRows);
  const totalDiverted = calcTotalWasteDiverted(data.divertedRows);
  const totalDisposed = calcTotalWasteDisposed(data.disposalRows);
  const diversionRate = calcDiversionRate(totalDiverted, totalGenerated);
  const recyclingRate = calcRecyclingRate(data.divertedRows, data.generationRows);
  const hazardousRatio = calcHazardousRatio(totalHazardous, totalGenerated);
  const wasteIntensity = calcWasteIntensity(totalGenerated, data.hydrocarbonProduction);

  const setPolicyAnswer = (key: keyof WastePolicyAssessment, answer: PolicyAnswer) => {
    patchData((d) => ({
      ...d,
      policy: { ...d.policy, [key]: answer },
    }));
  };

  const setPolicyText = (key: "wasteReductionTargets" | "wasteSegregationProcess", value: string) => {
    patchData((d) => ({
      ...d,
      policy: { ...d.policy, [key]: value },
    }));
  };

  const addGenerationRowForCategory = (category: WasteGenerationCategory) => {
    const row: WasteGenerationRow = {
      id: newTopicRowId(),
      wasteType: "",
      field: "",
      businessUnit: "",
      month: new Date().getMonth() + 1,
      category,
      quantity: 0,
      unit: "tonnes",
      reportingYear,
    };
    patchData((d) => ({ ...d, generationRows: [...d.generationRows, row] }));
  };

  const updateGenerationRow = (id: string, patch: Partial<WasteGenerationRow>) => {
    patchData((d) => ({
      ...d,
      generationRows: d.generationRows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  const removeGenerationRow = (id: string) => {
    patchData((d) => ({ ...d, generationRows: d.generationRows.filter((r) => r.id !== id) }));
  };

  const updateDivertedRow = (id: string, patch: Partial<WasteDivertedRow>) => {
    patchData((d) => ({
      ...d,
      divertedRows: d.divertedRows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  const updateDisposalRow = (id: string, patch: Partial<WasteDisposalRow>) => {
    patchData((d) => ({
      ...d,
      disposalRows: d.disposalRows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
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
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Waste Management</h1>
          <Badge variant="outline" className="border-green-600 text-green-700 bg-green-50">
            GRI 306
          </Badge>
        </div>
        <p className="text-sm text-slate-600 max-w-2xl mt-1">
          GRI 306 Aligned — Waste Generation, Diversion and Disposal
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

      <Alert className="border-amber-200 bg-amber-50/50 border-2 rounded-xl">
        <Info className="h-4 w-4 text-amber-800" />
        <AlertTitle className="text-amber-950">Why it matters</AlertTitle>
        <AlertDescription className="text-sm text-amber-950/90 mt-1">
          Effective waste management reduces environmental liability, supports circular economy goals, and aligns with GRI
          306 disclosure expectations.
        </AlertDescription>
      </Alert>

      <Card className={sectionShell("border-l-4 border-l-orange-500")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">GRI 306-1 — Waste Management and Waste-Related Impacts</CardTitle>
          <CardDescription className="text-slate-600">Policy and management practice assessment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {POLICY_YES_NO_FIELDS.slice(0, 2).map((q, index) => {
            const selected = data.policy[q.key] as PolicyAnswer | undefined;
            return (
              <div key={q.key} className="rounded-xl border-2 border-slate-200 bg-white p-4 space-y-3">
                <p className="text-sm font-medium text-slate-900">
                  {index + 1}. {q.label}
                </p>
                <div className="grid grid-cols-2 gap-2 max-w-xs">
                  {POLICY_ANSWERS.map((answer) => (
                    <button
                      key={answer}
                      type="button"
                      disabled={!selectedAsset}
                      onClick={() => setPolicyAnswer(q.key, answer)}
                      className={`rounded-lg border px-2 py-2 text-sm transition-all ${
                        selected === answer
                          ? "bg-teal-600 border-teal-600 text-white"
                          : "bg-white border-slate-300 text-slate-700 hover:border-slate-500"
                      }`}
                    >
                      {answer}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="rounded-xl border-2 border-slate-200 bg-white p-4 space-y-3">
            <p className="text-sm font-medium text-slate-900">3. Waste reduction targets</p>
            <Textarea
              className="border-2 border-slate-200 min-h-[88px]"
              placeholder="Describe waste reduction targets..."
              value={data.policy.wasteReductionTargets ?? ""}
              disabled={!selectedAsset}
              onChange={(e) => setPolicyText("wasteReductionTargets", e.target.value)}
            />
          </div>
          <div className="rounded-xl border-2 border-slate-200 bg-white p-4 space-y-3">
            <p className="text-sm font-medium text-slate-900">4. Waste segregation process</p>
            <Textarea
              className="border-2 border-slate-200 min-h-[88px]"
              placeholder="Describe waste segregation process..."
              value={data.policy.wasteSegregationProcess ?? ""}
              disabled={!selectedAsset}
              onChange={(e) => setPolicyText("wasteSegregationProcess", e.target.value)}
            />
          </div>
          {POLICY_YES_NO_FIELDS.slice(2).map((q, index) => {
            const selected = data.policy[q.key] as PolicyAnswer | undefined;
            return (
              <div key={q.key} className="rounded-xl border-2 border-slate-200 bg-white p-4 space-y-3">
                <p className="text-sm font-medium text-slate-900">
                  {index + 5}. {q.label}
                </p>
                <div className="grid grid-cols-2 gap-2 max-w-xs">
                  {POLICY_ANSWERS.map((answer) => (
                    <button
                      key={answer}
                      type="button"
                      disabled={!selectedAsset}
                      onClick={() => setPolicyAnswer(q.key, answer)}
                      className={`rounded-lg border px-2 py-2 text-sm transition-all ${
                        selected === answer
                          ? "bg-teal-600 border-teal-600 text-white"
                          : "bg-white border-slate-300 text-slate-700 hover:border-slate-500"
                      }`}
                    >
                      {answer}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-sky-500")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">GRI 306-3 — Waste Generated</CardTitle>
          <CardDescription className="text-slate-600">
            Pre-seeded waste streams grouped by category — expand a group to edit or add rows.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {GENERATION_CATEGORIES.map((category) => {
            const categoryRows = data.generationRows.filter((r) => r.category === category);
            const categorySubtotal = categoryRows.reduce((sum, r) => sum + (r.quantity || 0), 0);
            const streamLabel = categoryRows.length === 1 ? "1 stream" : `${categoryRows.length} streams`;
            const isOpen = generationGroupsOpen[category];

            return (
              <Collapsible
                key={category}
                open={isOpen}
                onOpenChange={(open) => setGenerationGroupsOpen((prev) => ({ ...prev, [category]: open }))}
              >
                <div className={cn("rounded-lg border border-slate-200 overflow-hidden", GENERATION_GROUP_STYLES[category])}>
                  <div className="flex flex-wrap items-center gap-2 px-3 py-3 sm:px-4">
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex flex-1 min-w-0 items-center gap-3 text-left rounded-md outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900">{GENERATION_GROUP_LABELS[category]}</p>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {streamLabel} · {formatWasteNum(categorySubtotal)} tonnes
                          </p>
                        </div>
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4 shrink-0 text-slate-500" />
                        ) : (
                          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                        )}
                      </button>
                    </CollapsibleTrigger>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 bg-white/80"
                      disabled={!selectedAsset}
                      onClick={() => addGenerationRowForCategory(category)}
                    >
                      <Plus className="h-4 w-4" />
                      Add row
                    </Button>
                  </div>

                  <CollapsibleContent>
                    <div className="border-t border-slate-200/80 bg-white px-3 py-3 sm:px-4">
                      {categoryRows.length === 0 ? (
                        <p className="text-sm text-slate-500 py-2">No rows in this category yet.</p>
                      ) : (
                        <table className="w-full text-sm text-left border-collapse">
                          <thead>
                            <tr className="border-b-2 border-slate-200">
                              <th className="py-2 pr-2 font-semibold text-slate-800">Waste Type</th>
                              <th className="py-2 pr-2 font-semibold text-slate-800">Quantity (tonnes)</th>
                              <th className="py-2 pr-2 font-semibold text-slate-800">Month</th>
                              <th className="py-2 pr-2 font-semibold text-slate-800">Year</th>
                              <th className="py-2 w-10" />
                            </tr>
                          </thead>
                          <tbody>
                            {categoryRows.map((r) => {
                              const detailsOpen = generationRowDetailsOpen[r.id] === true;
                              return (
                                <tr key={r.id} className="border-b border-slate-100 align-top">
                                  <td colSpan={5} className="py-0">
                                    <div className="py-2">
                                      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-start sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.6fr)_minmax(0,0.5fr)_auto]">
                                        <Input
                                          className="border-2 border-slate-200 h-9"
                                          placeholder="Waste type"
                                          value={r.wasteType}
                                          onChange={(e) => updateGenerationRow(r.id, { wasteType: e.target.value })}
                                          disabled={!selectedAsset}
                                        />
                                        <Input
                                          className="border-2 border-slate-200 h-9"
                                          type="number"
                                          min={0}
                                          step="any"
                                          value={r.quantity || ""}
                                          onChange={(e) => {
                                            const n = e.target.value === "" ? 0 : Number(e.target.value);
                                            updateGenerationRow(r.id, { quantity: Number.isFinite(n) ? n : 0 });
                                          }}
                                          disabled={!selectedAsset}
                                        />
                                        <Select
                                          value={String(r.month)}
                                          onValueChange={(v) => updateGenerationRow(r.id, { month: Number(v) })}
                                          disabled={!selectedAsset}
                                        >
                                          <SelectTrigger className="border-2 border-slate-200 h-9">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {MONTHS.map((m) => (
                                              <SelectItem key={m.value} value={String(m.value)}>
                                                {m.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <Input
                                          className="border-2 border-slate-200 h-9"
                                          type="number"
                                          value={r.reportingYear}
                                          onChange={(e) => {
                                            const n = Number(e.target.value);
                                            updateGenerationRow(r.id, {
                                              reportingYear: Number.isFinite(n) ? n : reportingYear,
                                            });
                                          }}
                                          disabled={!selectedAsset}
                                        />
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-9 w-9 text-slate-500"
                                          disabled={!selectedAsset}
                                          onClick={() => removeGenerationRow(r.id)}
                                          aria-label="Remove row"
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                      <Collapsible
                                        open={detailsOpen}
                                        onOpenChange={(open) =>
                                          setGenerationRowDetailsOpen((prev) => ({ ...prev, [r.id]: open }))
                                        }
                                      >
                                        <CollapsibleTrigger asChild>
                                          <button
                                            type="button"
                                            className="mt-2 text-xs font-medium text-slate-600 hover:text-teal-700"
                                          >
                                            Details {detailsOpen ? "▴" : "▾"}
                                          </button>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                          <div className="mt-2 grid gap-2 sm:grid-cols-2 pb-1">
                                            <div className="space-y-1">
                                              <Label className="text-xs text-slate-600">Field name</Label>
                                              <Input
                                                className="border-2 border-slate-200 h-9"
                                                placeholder="Field name"
                                                value={r.field}
                                                onChange={(e) => updateGenerationRow(r.id, { field: e.target.value })}
                                                disabled={!selectedAsset}
                                              />
                                            </div>
                                            <div className="space-y-1">
                                              <Label className="text-xs text-slate-600">Business unit</Label>
                                              <Input
                                                className="border-2 border-slate-200 h-9"
                                                placeholder="Business unit"
                                                value={r.businessUnit}
                                                onChange={(e) =>
                                                  updateGenerationRow(r.id, { businessUnit: e.target.value })
                                                }
                                                disabled={!selectedAsset}
                                              />
                                            </div>
                                          </div>
                                        </CollapsibleContent>
                                      </Collapsible>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}

          <div className="rounded-lg border-2 border-slate-200 bg-slate-50/80 px-4 py-3 grid gap-2 sm:grid-cols-3 text-sm">
            <p className="text-slate-700">
              <span className="font-medium text-slate-900">Total Hazardous Waste Generated: </span>
              {formatWasteNum(totalHazardous)} tonnes
            </p>
            <p className="text-slate-700">
              <span className="font-medium text-slate-900">Total Non-Hazardous Waste Generated: </span>
              {formatWasteNum(totalNonHazardous)} tonnes
            </p>
            <p className="text-slate-700">
              <span className="font-medium text-slate-900">Total Waste Generated: </span>
              {formatWasteNum(totalGenerated)} tonnes
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-teal-500")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">GRI 306-4 — Waste Diverted from Disposal</CardTitle>
          <CardDescription className="text-slate-600">Waste diverted by recovery route.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse min-w-[1100px]">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="py-2 pr-2 font-semibold text-slate-800">Waste Category</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Field</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Business Unit</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Month</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Quantity</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Unit</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Method</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Reporting Year</th>
                </tr>
              </thead>
              <tbody>
                {data.divertedRows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 align-top">
                    <td className="py-2 pr-2">
                      <Input
                        className="border-2 border-slate-200 h-9"
                        value={r.wasteCategory}
                        onChange={(e) => updateDivertedRow(r.id, { wasteCategory: e.target.value })}
                        disabled={!selectedAsset}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        className="border-2 border-slate-200 h-9"
                        placeholder="Field name"
                        value={r.field}
                        onChange={(e) => updateDivertedRow(r.id, { field: e.target.value })}
                        disabled={!selectedAsset}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        className="border-2 border-slate-200 h-9"
                        placeholder="Business unit"
                        value={r.businessUnit}
                        onChange={(e) => updateDivertedRow(r.id, { businessUnit: e.target.value })}
                        disabled={!selectedAsset}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Select
                        value={String(r.month)}
                        onValueChange={(v) => updateDivertedRow(r.id, { month: Number(v) })}
                        disabled={!selectedAsset}
                      >
                        <SelectTrigger className="border-2 border-slate-200 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map((m) => (
                            <SelectItem key={m.value} value={String(m.value)}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        className="border-2 border-slate-200 h-9"
                        type="number"
                        min={0}
                        step="any"
                        value={r.quantity || ""}
                        onChange={(e) => {
                          const n = e.target.value === "" ? 0 : Number(e.target.value);
                          updateDivertedRow(r.id, { quantity: Number.isFinite(n) ? n : 0 });
                        }}
                        disabled={!selectedAsset}
                      />
                    </td>
                    <td className="py-2 pr-2 text-slate-600">tonnes</td>
                    <td className="py-2 pr-2">
                      <Select
                        value={r.method}
                        onValueChange={(v) => updateDivertedRow(r.id, { method: v as WasteDivertedRow["method"] })}
                        disabled={!selectedAsset}
                      >
                        <SelectTrigger className="border-2 border-slate-200 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DIVERTED_METHODS.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        className="border-2 border-slate-200 h-9"
                        type="number"
                        value={r.reportingYear}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          updateDivertedRow(r.id, { reportingYear: Number.isFinite(n) ? n : reportingYear });
                        }}
                        disabled={!selectedAsset}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-slate-700">
            <span className="font-medium text-slate-900">Total Waste Diverted: </span>
            {formatWasteNum(totalDiverted)} tonnes
          </p>
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-violet-500")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">GRI 306-5 — Waste Directed to Disposal</CardTitle>
          <CardDescription className="text-slate-600">Waste sent to disposal routes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse min-w-[1100px]">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="py-2 pr-2 font-semibold text-slate-800">Waste Category</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Field</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Business Unit</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Month</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Quantity</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Unit</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Disposal Method</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Reporting Year</th>
                </tr>
              </thead>
              <tbody>
                {data.disposalRows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 align-top">
                    <td className="py-2 pr-2">
                      <Input
                        className="border-2 border-slate-200 h-9"
                        value={r.wasteCategory}
                        onChange={(e) => updateDisposalRow(r.id, { wasteCategory: e.target.value })}
                        disabled={!selectedAsset}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        className="border-2 border-slate-200 h-9"
                        placeholder="Field name"
                        value={r.field}
                        onChange={(e) => updateDisposalRow(r.id, { field: e.target.value })}
                        disabled={!selectedAsset}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        className="border-2 border-slate-200 h-9"
                        placeholder="Business unit"
                        value={r.businessUnit}
                        onChange={(e) => updateDisposalRow(r.id, { businessUnit: e.target.value })}
                        disabled={!selectedAsset}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Select
                        value={String(r.month)}
                        onValueChange={(v) => updateDisposalRow(r.id, { month: Number(v) })}
                        disabled={!selectedAsset}
                      >
                        <SelectTrigger className="border-2 border-slate-200 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map((m) => (
                            <SelectItem key={m.value} value={String(m.value)}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        className="border-2 border-slate-200 h-9"
                        type="number"
                        min={0}
                        step="any"
                        value={r.quantity || ""}
                        onChange={(e) => {
                          const n = e.target.value === "" ? 0 : Number(e.target.value);
                          updateDisposalRow(r.id, { quantity: Number.isFinite(n) ? n : 0 });
                        }}
                        disabled={!selectedAsset}
                      />
                    </td>
                    <td className="py-2 pr-2 text-slate-600">tonnes</td>
                    <td className="py-2 pr-2">
                      <Select
                        value={r.disposalMethod}
                        onValueChange={(v) =>
                          updateDisposalRow(r.id, { disposalMethod: v as WasteDisposalRow["disposalMethod"] })
                        }
                        disabled={!selectedAsset}
                      >
                        <SelectTrigger className="border-2 border-slate-200 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DISPOSAL_METHODS.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        className="border-2 border-slate-200 h-9"
                        type="number"
                        value={r.reportingYear}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          updateDisposalRow(r.id, { reportingYear: Number.isFinite(n) ? n : reportingYear });
                        }}
                        disabled={!selectedAsset}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-slate-700">
            <span className="font-medium text-slate-900">Total Waste Directed to Disposal: </span>
            {formatWasteNum(totalDisposed)} tonnes
          </p>
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-emerald-600")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">Waste KPI Summary</CardTitle>
          <CardDescription className="text-slate-600">Derived from generation, diversion, and disposal inputs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
                value: wasteIntensity === null ? "—" : `${formatWasteNum(wasteIntensity, 4)} tonnes / BOE`,
              },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-xl border-2 border-slate-200 bg-white p-5 transition-all duration-300"
              >
                <p className="text-xs text-slate-500 font-medium">{kpi.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">{kpi.value}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
            <div className="space-y-2">
              <Label className="text-slate-800">Hydrocarbon Production (BOE)</Label>
              <Input
                className="border-2 border-slate-200"
                type="number"
                min={0}
                step="any"
                value={data.hydrocarbonProduction ?? ""}
                disabled={!selectedAsset}
                onChange={(e) => {
                  const raw = e.target.value;
                  patchData((d) => ({
                    ...d,
                    hydrocarbonProduction: raw === "" ? null : Number.isFinite(Number(raw)) ? Number(raw) : null,
                  }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-800">Waste Intensity</Label>
              <p className="text-lg font-semibold text-slate-900 tabular-nums pt-2">
                {wasteIntensity === null ? "—" : `${formatWasteNum(wasteIntensity, 4)} tonnes / BOE`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {draft.assets.length > 0 && (
        <Card className={sectionShell("border-l-4 border-l-slate-700")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-slate-900">Summary</CardTitle>
            <CardDescription className="text-slate-600">Open a dedicated page for read-only KPI and disclosure summary.</CardDescription>
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

export default WasteManagementScreen;

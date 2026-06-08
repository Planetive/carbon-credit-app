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
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { loadBoundaryDraft } from "../../boundary/storage";
import type { BoundaryDraftV2 } from "../../boundary/boundaryTypes";
import { formatPeriodRangeLabel } from "../shared/periodUtils";
import { newTopicRowId } from "../shared/newId";
import {
  FPIC_STATUS_OPTIONS,
  GRIEVANCE_TYPE_OPTIONS,
  IFC_PS7_STATUS_OPTIONS,
  PROXIMITY_OPTIONS,
  YES_NO_OPTIONS,
  type GrievanceRow,
  type GrievanceType,
  type IfcPs7Status,
  type IndigenousRightsAssetData,
  type ProximityToIndigenousLands,
  type YesNoAnswer,
} from "./types";
import {
  defaultIndigenousRightsAssetData,
  getIndigenousRightsDataForAsset,
  loadIndigenousRightsStore,
  saveIndigenousRightsStore,
  setIndigenousRightsDataForAsset,
} from "./storage";
import {
  calcGrievanceResolutionRatePct,
  calcResolvedGrievances,
  calcTotalGrievances,
  calcUnresolvedGrievances,
  formatIndigenousRightsNum,
} from "./calculations";

const sectionShell = (accent: string) =>
  `border-2 border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden ${accent}`;

const IndigenousRightsScreen = () => {
  const { toast } = useToast();
  const [draft, setDraft] = useState<BoundaryDraftV2>(() => loadBoundaryDraft());
  const [store, setStore] = useState(() => loadIndigenousRightsStore(loadBoundaryDraft()));
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const refreshBoundary = useCallback(() => {
    const d = loadBoundaryDraft();
    setDraft(d);
    setStore(loadIndigenousRightsStore(d));
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
    ? getIndigenousRightsDataForAsset(store, selectedAssetId)
    : defaultIndigenousRightsAssetData();

  const patchData = (updater: (d: IndigenousRightsAssetData) => IndigenousRightsAssetData) => {
    if (!selectedAssetId) return;
    const cur = getIndigenousRightsDataForAsset(store, selectedAssetId);
    const nextStore = setIndigenousRightsDataForAsset(store, selectedAssetId, updater(cur));
    setStore(nextStore);
    saveIndigenousRightsStore(nextStore);
  };

  const summaryHref =
    selectedAssetId != null
      ? `/esg-management/indigenous-rights/results?assetId=${encodeURIComponent(selectedAssetId)}`
      : "/esg-management/indigenous-rights/results";

  const totalGrievances = calcTotalGrievances(data.grievanceRows);
  const resolvedGrievances = calcResolvedGrievances(data.grievanceRows);
  const unresolvedGrievances = calcUnresolvedGrievances(data.grievanceRows);
  const resolutionRate = calcGrievanceResolutionRatePct(data.grievanceRows);

  const showIfcDate = data.ifcPs7Completed === "Yes" || data.ifcPs7Completed === "In progress";

  const addGrievanceRow = () => {
    const row: GrievanceRow = {
      id: newTopicRowId(),
      dateReceived: "",
      grievanceType: "Other",
      description: "",
      resolved: false,
      resolutionDate: "",
    };
    patchData((d) => ({ ...d, grievanceRows: [...d.grievanceRows, row] }));
  };

  const updateGrievanceRow = (id: string, patch: Partial<GrievanceRow>) => {
    patchData((d) => ({
      ...d,
      grievanceRows: d.grievanceRows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  const removeGrievanceRow = (id: string) => {
    patchData((d) => ({
      ...d,
      grievanceRows: d.grievanceRows.filter((r) => r.id !== id),
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
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Indigenous Peoples&apos; Rights</h1>
        <p className="text-sm text-slate-600 max-w-2xl mt-1">
          SASB EM-EP-210a metrics for land proximity, FPIC, community grievances, and indigenous peoples engagement.
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

      <Card className={sectionShell("border-l-4 border-l-amber-600")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">
            Operations &amp; Indigenous Land Proximity (EM-EP-210a.1)
          </CardTitle>
          <CardDescription className="text-slate-600">
            Whether operations are in or near indigenous peoples&apos; lands.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label className="text-slate-800">Proximity to indigenous lands</Label>
          <div className="flex flex-wrap gap-2">
            {PROXIMITY_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                disabled={!selectedAsset}
                onClick={() => patchData((d) => ({ ...d, proximityToIndigenousLands: opt as ProximityToIndigenousLands }))}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium border-2 transition-all",
                  data.proximityToIndigenousLands === opt
                    ? "bg-teal-600 border-teal-600 text-white"
                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                )}
              >
                {opt}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Automatic GIS detection planned. Enter manually based on available land rights mapping.
          </p>
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-teal-500")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">Free, Prior and Informed Consent (FPIC)</CardTitle>
          <CardDescription className="text-slate-600">FPIC status and consultation activity for the reporting period.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-slate-800">FPIC status</Label>
              <Select
                value={data.fpicStatus}
                disabled={!selectedAsset}
                onValueChange={(v) => patchData((d) => ({ ...d, fpicStatus: v as IndigenousRightsAssetData["fpicStatus"] }))}
              >
                <SelectTrigger className="border-2 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FPIC_STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-800">Consultation events this year</Label>
              <Input
                className="border-2 border-slate-200"
                value={data.consultationEventsCount}
                disabled={!selectedAsset}
                onChange={(e) => patchData((d) => ({ ...d, consultationEventsCount: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-800">Consultation summary</Label>
            <Textarea
              className="border-2 border-slate-200 min-h-[100px]"
              value={data.consultationNarrative}
              disabled={!selectedAsset}
              onChange={(e) => patchData((d) => ({ ...d, consultationNarrative: e.target.value }))}
              placeholder="Summarise consultation events, participants, and outcomes."
            />
          </div>
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-red-600")}>
        <CardHeader className="pb-2 flex flex-row flex-wrap items-end justify-between gap-2">
          <div>
            <CardTitle className="text-lg text-slate-900">Community Grievances (EM-EP-210a.3)</CardTitle>
            <CardDescription className="text-slate-600">Register and track community grievances and resolutions.</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={!selectedAsset} onClick={addGrievanceRow}>
            <Plus className="h-4 w-4" />
            Add row
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="py-2 pr-2 font-semibold text-slate-800">Date</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Type</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Description</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Resolved?</th>
                  <th className="py-2 pr-2 font-semibold text-slate-800">Resolution date</th>
                  <th className="py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {data.grievanceRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-slate-500">
                      No grievance rows yet.
                    </td>
                  </tr>
                ) : (
                  data.grievanceRows.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 align-top">
                      <td className="py-2 pr-2">
                        <Input
                          type="date"
                          className="border-2 border-slate-200 h-9"
                          value={r.dateReceived}
                          disabled={!selectedAsset}
                          onChange={(e) => updateGrievanceRow(r.id, { dateReceived: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Select
                          value={r.grievanceType}
                          disabled={!selectedAsset}
                          onValueChange={(v) => updateGrievanceRow(r.id, { grievanceType: v as GrievanceType })}
                        >
                          <SelectTrigger className="border-2 border-slate-200 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {GRIEVANCE_TYPE_OPTIONS.map((t) => (
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
                          value={r.description}
                          disabled={!selectedAsset}
                          onChange={(e) => updateGrievanceRow(r.id, { description: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-2 h-9">
                          <Checkbox
                            id={`resolved-${r.id}`}
                            checked={r.resolved}
                            disabled={!selectedAsset}
                            onCheckedChange={(c) => updateGrievanceRow(r.id, { resolved: c === true })}
                          />
                          <Label htmlFor={`resolved-${r.id}`} className="text-xs cursor-pointer">
                            Yes
                          </Label>
                        </div>
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          type="date"
                          className="border-2 border-slate-200 h-9"
                          value={r.resolutionDate}
                          disabled={!selectedAsset || !r.resolved}
                          onChange={(e) => updateGrievanceRow(r.id, { resolutionDate: e.target.value })}
                        />
                      </td>
                      <td className="py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-slate-500"
                          disabled={!selectedAsset}
                          onClick={() => removeGrievanceRow(r.id)}
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
          <div className="text-sm text-slate-700 space-y-1">
            <p>
              Total grievances: <span className="font-semibold text-slate-900 tabular-nums">{totalGrievances}</span>
            </p>
            <p>
              Resolved: <span className="font-semibold text-slate-900 tabular-nums">{resolvedGrievances}</span>
            </p>
            <p>
              Unresolved: <span className="font-semibold text-slate-900 tabular-nums">{unresolvedGrievances}</span>
            </p>
            <p>
              Resolution rate:{" "}
              <span className="font-semibold text-slate-900 tabular-nums">{formatIndigenousRightsNum(resolutionRate)}%</span>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-violet-500")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">FPIC Policy &amp; Process (EM-EP-210a.2)</CardTitle>
          <CardDescription className="text-slate-600">Policy status and narrative on FPIC processes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-xs">
            <Label className="text-slate-800">FPIC policy in place?</Label>
            <Select
              value={data.fpicPolicyInPlace}
              disabled={!selectedAsset}
              onValueChange={(v) => patchData((d) => ({ ...d, fpicPolicyInPlace: v as YesNoAnswer }))}
            >
              <SelectTrigger className="border-2 border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YES_NO_OPTIONS.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-800">FPIC process narrative</Label>
            <Textarea
              className="border-2 border-slate-200 min-h-[120px]"
              placeholder="Describe FPIC policy, consultation methodology, ILO 169 / UNDRIP alignment, and how consent is obtained and documented."
              value={data.fpicProcessNarrative}
              disabled={!selectedAsset}
              onChange={(e) => patchData((d) => ({ ...d, fpicProcessNarrative: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-blue-500")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">IFC Performance Standard 7 (IND-07)</CardTitle>
          <CardDescription className="text-slate-600">Indigenous peoples assessment under IFC PS7.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-slate-800">IFC PS7 completed</Label>
            <Select
              value={data.ifcPs7Completed}
              disabled={!selectedAsset}
              onValueChange={(v) =>
                patchData((d) => ({
                  ...d,
                  ifcPs7Completed: v as IfcPs7Status,
                  ifcPs7AssessmentDate: v === "No" ? "" : d.ifcPs7AssessmentDate,
                }))
              }
            >
              <SelectTrigger className="border-2 border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IFC_PS7_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {showIfcDate && (
            <div className="space-y-2">
              <Label className="text-slate-800">Assessment date</Label>
              <Input
                type="date"
                className="border-2 border-slate-200"
                value={data.ifcPs7AssessmentDate}
                disabled={!selectedAsset}
                onChange={(e) => patchData((d) => ({ ...d, ifcPs7AssessmentDate: e.target.value }))}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {selectedAsset && (
        <div className="flex justify-end">
          <Button
            type="button"
            className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md"
            onClick={() => {
              saveIndigenousRightsStore(store);
              toast({
                title: "Saved",
                description: "Indigenous peoples' rights data saved for this asset and reporting period.",
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
              Open a dedicated page for proximity, FPIC, and grievance metrics.
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

export default IndigenousRightsScreen;

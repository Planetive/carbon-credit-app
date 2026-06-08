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
import { useToast } from "@/hooks/use-toast";
import { loadBoundaryDraft } from "../../boundary/storage";
import type { BoundaryDraftV2 } from "../../boundary/boundaryTypes";
import { formatPeriodRangeLabel } from "../shared/periodUtils";
import type { CommunityRelationsAssetData } from "./types";
import {
  defaultCommunityRelationsAssetData,
  getCommunityRelationsDataForAsset,
  loadCommunityRelationsStore,
  saveCommunityRelationsStore,
  setCommunityRelationsDataForAsset,
} from "./storage";
import { calcAvgDaysPerDelay, formatCommunityNum, parseCommunityInteger } from "./calculations";

const sectionShell = (accent: string) =>
  `border-2 border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden ${accent}`;

const CommunityRelationsScreen = () => {
  const { toast } = useToast();
  const [draft, setDraft] = useState<BoundaryDraftV2>(() => loadBoundaryDraft());
  const [store, setStore] = useState(() => loadCommunityRelationsStore(loadBoundaryDraft()));
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const refreshBoundary = useCallback(() => {
    const d = loadBoundaryDraft();
    setDraft(d);
    setStore(loadCommunityRelationsStore(d));
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
    ? getCommunityRelationsDataForAsset(store, selectedAssetId)
    : defaultCommunityRelationsAssetData();

  const patchData = (updater: (d: CommunityRelationsAssetData) => CommunityRelationsAssetData) => {
    if (!selectedAssetId) return;
    const cur = getCommunityRelationsDataForAsset(store, selectedAssetId);
    const nextStore = setCommunityRelationsDataForAsset(store, selectedAssetId, updater(cur));
    setStore(nextStore);
    saveCommunityRelationsStore(nextStore);
  };

  const summaryHref =
    selectedAssetId != null
      ? `/esg-management/community-relations/results?assetId=${encodeURIComponent(selectedAssetId)}`
      : "/esg-management/community-relations/results";

  const delayCount = parseCommunityInteger(data.nonTechnicalDelayCount);
  const delayDays = parseCommunityInteger(data.nonTechnicalDelayDays);
  const avgDaysPerDelay = calcAvgDaysPerDelay(data.nonTechnicalDelayCount, data.nonTechnicalDelayDays);

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
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Community Relations</h1>
        <p className="text-sm text-slate-600 max-w-2xl mt-1">
          SASB EM-EP-210b metrics for community rights management and non-technical project delays.
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
          Strong community relations reduce non-technical delays, protect licence to operate, and support transparent
          disclosure of social risks and remediation.
        </AlertDescription>
      </Alert>

      <Card className={sectionShell("border-l-4 border-l-violet-500")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">
            Community Rights &amp; Interests (EM-EP-210b.1)
          </CardTitle>
          <CardDescription className="text-slate-600">
            Discussion of the process to manage risks and opportunities associated with community rights and interests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            className="border-2 border-slate-200 min-h-[120px]"
            placeholder="Describe stakeholder mapping, engagement forums, grievance pathways, impact assessments, and how community rights inform project decisions."
            value={data.communityRightsProcessNarrative}
            disabled={!selectedAsset}
            onChange={(e) => patchData((d) => ({ ...d, communityRightsProcessNarrative: e.target.value }))}
          />
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-amber-500")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">Non-Technical Delays (EM-EP-210b.2–210b.3)</CardTitle>
          <CardDescription className="text-slate-600">
            Count and duration of delays not caused by technical or operational factors.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
            <div className="space-y-2">
              <Label className="text-slate-800">Number of non-technical delays</Label>
              <Input
                className="border-2 border-slate-200"
                type="number"
                min={0}
                step={1}
                value={data.nonTechnicalDelayCount}
                disabled={!selectedAsset}
                onChange={(e) => patchData((d) => ({ ...d, nonTechnicalDelayCount: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-800">Days of non-technical delays</Label>
              <Input
                className="border-2 border-slate-200"
                type="number"
                min={0}
                step={1}
                value={data.nonTechnicalDelayDays}
                disabled={!selectedAsset}
                onChange={(e) => patchData((d) => ({ ...d, nonTechnicalDelayDays: e.target.value }))}
              />
            </div>
          </div>
          <div className="rounded-lg border-2 border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700 grid gap-2 sm:grid-cols-3">
            <p>
              <span className="font-medium text-slate-900">Delay events: </span>
              {formatCommunityNum(delayCount)}
            </p>
            <p>
              <span className="font-medium text-slate-900">Total delay days: </span>
              {formatCommunityNum(delayDays)}
            </p>
            <p>
              <span className="font-medium text-slate-900">Avg days per delay: </span>
              {avgDaysPerDelay === null ? "—" : formatCommunityNum(avgDaysPerDelay, 1)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-orange-500")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">Delay Analysis &amp; Response (EM-EP-210b.4–210b.6)</CardTitle>
          <CardDescription className="text-slate-600">
            Narrative disclosure on specific delays, root causes, costs, and corrective actions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-800">Specific delays and associated costs (210b.4)</Label>
            <Textarea
              className="border-2 border-slate-200 min-h-[100px]"
              placeholder="Discuss specific non-technical delays and estimated or actual costs incurred."
              value={data.delayCostsNarrative}
              disabled={!selectedAsset}
              onChange={(e) => patchData((d) => ({ ...d, delayCostsNarrative: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-800">Root cause discussion (210b.5)</Label>
            <Textarea
              className="border-2 border-slate-200 min-h-[100px]"
              placeholder="Describe root causes of non-technical delays (e.g. community opposition, permitting, land access)."
              value={data.delayRootCauseNarrative}
              disabled={!selectedAsset}
              onChange={(e) => patchData((d) => ({ ...d, delayRootCauseNarrative: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-800">Corrective actions (210b.6)</Label>
            <Textarea
              className="border-2 border-slate-200 min-h-[100px]"
              placeholder="Describe corrective actions taken to prevent recurrence of non-technical delays."
              value={data.delayCorrectiveActionsNarrative}
              disabled={!selectedAsset}
              onChange={(e) => patchData((d) => ({ ...d, delayCorrectiveActionsNarrative: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {draft.assets.length > 0 && (
        <Card className={sectionShell("border-l-4 border-l-slate-700")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-slate-900">Summary</CardTitle>
            <CardDescription className="text-slate-600">Open a dedicated page for read-only SASB disclosure summary.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button type="button" className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md" asChild>
              <Link to={summaryHref}>View summary</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-2 border-slate-200"
              disabled={!selectedAsset}
              onClick={() => {
                saveCommunityRelationsStore(store);
                toast({
                  title: "Saved",
                  description: "Community relations data saved for this asset and reporting period.",
                });
              }}
            >
              Save
            </Button>
          </CardContent>
        </Card>
      )}

      {selectedAsset && (
        <p className="text-xs text-slate-500">
          Editing:{" "}
          <span className="font-medium text-slate-700">
            {selectedAsset.asset_name?.trim() || selectedAsset.id.slice(0, 8)}
          </span>
        </p>
      )}
    </div>
  );
};

export default CommunityRelationsScreen;

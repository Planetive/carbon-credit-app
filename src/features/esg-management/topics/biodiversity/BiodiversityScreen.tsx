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
import { filesToMetaList } from "../shared/fileMeta";
import { PROXIMITY_PLACEHOLDER_ROWS } from "./types";
import type { BiodiversityAssetData } from "./types";
import {
  defaultBiodiversityAssetData,
  getBiodiversityDataForAsset,
  loadBiodiversityStore,
  saveBiodiversityStore,
  setBiodiversityDataForAsset,
} from "./storage";

const sectionShell = (accent: string) =>
  `border-2 border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden ${accent}`;

const BiodiversityScreen = () => {
  const [draft, setDraft] = useState<BoundaryDraftV2>(() => loadBoundaryDraft());
  const [store, setStore] = useState(() => loadBiodiversityStore(loadBoundaryDraft()));
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const refreshBoundary = useCallback(() => {
    const d = loadBoundaryDraft();
    setDraft(d);
    setStore(loadBiodiversityStore(d));
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
  const data = selectedAssetId ? getBiodiversityDataForAsset(store, selectedAssetId) : defaultBiodiversityAssetData();

  const patchData = (updater: (d: BiodiversityAssetData) => BiodiversityAssetData) => {
    if (!selectedAssetId) return;
    const cur = getBiodiversityDataForAsset(store, selectedAssetId);
    const nextStore = setBiodiversityDataForAsset(store, selectedAssetId, updater(cur));
    setStore(nextStore);
    saveBiodiversityStore(nextStore);
  };

  const onEmpFiles = (list: FileList | null) => {
    const add = filesToMetaList(list);
    if (!add.length) return;
    patchData((d) => ({ ...d, empFilesMeta: [...d.empFilesMeta, ...add] }));
  };

  const removeEmpFile = (idx: number) => {
    patchData((d) => ({
      ...d,
      empFilesMeta: d.empFilesMeta.filter((_, i) => i !== idx),
    }));
  };

  const latDisplay = selectedAsset?.lat?.trim() || "—";
  const lngDisplay = selectedAsset?.lng?.trim() || "—";

  const summaryHref =
    selectedAssetId != null
      ? `/esg-management/biodiversity/results?assetId=${encodeURIComponent(selectedAssetId)}`
      : "/esg-management/biodiversity/results";

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
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Biodiversity</h1>
        <p className="text-sm text-slate-600 max-w-2xl mt-1">
          Incidents, environmental management plans, and location context tied to the shared asset register.
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
          Healthy ecosystems matter for access to land, finance, and community relationships.
        </AlertDescription>
      </Alert>

      <Card className={sectionShell("border-l-4 border-l-emerald-500")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">Location (read-only)</CardTitle>
          <CardDescription className="text-slate-600">
            Coordinates come from the asset register. Update them in boundary setting if needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-slate-800">Latitude</Label>
            <Input className="border-2 border-slate-200 bg-slate-50" readOnly value={latDisplay} />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-800">Longitude</Label>
            <Input className="border-2 border-slate-200 bg-slate-50" readOnly value={lngDisplay} />
          </div>
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-teal-500")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">Biodiversity incidents</CardTitle>
          <CardDescription className="text-slate-600">Count and short narrative for the reporting period.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-xs">
            <Label className="text-slate-800">Incident count</Label>
            <Input
              className="border-2 border-slate-200"
              inputMode="numeric"
              disabled={!selectedAsset}
              value={data.incidentCount}
              onChange={(e) => patchData((d) => ({ ...d, incidentCount: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-800">Narrative</Label>
            <Textarea
              className="border-2 border-slate-200 min-h-[100px]"
              disabled={!selectedAsset}
              value={data.incidentNarrative}
              onChange={(e) => patchData((d) => ({ ...d, incidentNarrative: e.target.value }))}
              placeholder="Summarise incidents, response, and status."
            />
          </div>
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-cyan-600")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">Environmental management plan (EMP)</CardTitle>
          <CardDescription className="text-slate-600">Whether an EMP is in place and document references (metadata only).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-xs">
            <Label className="text-slate-800">EMP in place</Label>
            <Select
              value={data.empInPlace === "" ? "unset" : data.empInPlace}
              disabled={!selectedAsset}
              onValueChange={(v) =>
                patchData((d) => ({
                  ...d,
                  empInPlace: v === "unset" ? "" : (v as BiodiversityAssetData["empInPlace"]),
                }))
              }
            >
              <SelectTrigger className="border-2 border-slate-200">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unset">Not specified</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-800">EMP file references</Label>
            <Input
              type="file"
              multiple
              className="text-sm"
              disabled={!selectedAsset}
              onChange={(e) => {
                onEmpFiles(e.target.files);
                e.target.value = "";
              }}
            />
            {data.empFilesMeta.length > 0 && (
              <ul className="text-sm text-slate-600 space-y-1">
                {data.empFilesMeta.map((m, i) => (
                  <li key={`${m.name}-${m.lastModified}-${i}`} className="flex items-center justify-between gap-2">
                    <span className="truncate">{m.name}</span>
                    <Button type="button" variant="ghost" size="sm" disabled={!selectedAsset} onClick={() => removeEmpFile(i)}>
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-slate-800">Environmental Management Policies — Narrative</Label>
            <p className="text-xs text-slate-500">
              Describe EMPs, biodiversity action plans, and restoration commitments for active sites. (EM-EP-160a.3)
            </p>
            <Textarea
              className="border-2 border-slate-200 min-h-[100px]"
              disabled={!selectedAsset}
              value={data.envManagementPoliciesNarrative}
              onChange={(e) => patchData((d) => ({ ...d, envManagementPoliciesNarrative: e.target.value }))}
              placeholder="Describe environmental management policies, biodiversity action plans, and any site restoration commitments..."
            />
          </div>
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-indigo-500")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">Sensitive area proximity</CardTitle>
          <CardDescription className="text-slate-600">
            Planned: distances and overlaps will be auto-generated from spatial data. No manual proximity fields in this release.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse min-w-[480px]">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="py-2 pr-4 font-semibold text-slate-800">Layer</th>
                <th className="py-2 pr-4 font-semibold text-slate-800">Status</th>
              </tr>
            </thead>
            <tbody className="text-slate-600">
              {PROXIMITY_PLACEHOLDER_ROWS.map((row) => (
                <tr key={row.key} className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-medium text-slate-800">{row.label}</td>
                  <td className="py-2">Planned / auto-generated later</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className={sectionShell("border-l-4 border-l-slate-500")}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900">Scope 1 GHG in or near protected areas</CardTitle>
          <CardDescription className="text-slate-600">
            Not available in this module — there is no default manual metric to enter here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            When greenhouse gas inventory and protected-area layers are linked, this indicator can be surfaced from those
            systems. Until then, use the GHG inventory workflow for emissions quantities.
          </p>
        </CardContent>
      </Card>

      {draft.assets.length > 0 && (
        <Card className={sectionShell("border-l-4 border-l-slate-700")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-slate-900">Summary</CardTitle>
            <CardDescription className="text-slate-600">
              Open a dedicated page for incidents, EMP status, and planned proximity checks.
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
          Editing: <span className="font-medium text-slate-700">{selectedAsset.asset_name?.trim() || selectedAsset.id.slice(0, 8)}</span>
        </p>
      )}
    </div>
  );
};

export default BiodiversityScreen;

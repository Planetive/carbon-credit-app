import { Link, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
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
import { loadBoundaryDraft } from "./boundary/storage";
import type { BoundaryDraftV2 } from "./boundary/boundaryTypes";
import { formatPeriodRangeLabel } from "./topics/shared/periodUtils";
import { PROXIMITY_PLACEHOLDER_ROWS } from "./topics/biodiversity/types";
import {
  defaultBiodiversityAssetData,
  getBiodiversityDataForAsset,
  loadBiodiversityStore,
} from "./topics/biodiversity/storage";

const sectionShell = (accent: string) =>
  `border-2 border-slate-200 bg-white shadow-sm rounded-xl overflow-hidden ${accent}`;

const NARRATIVE_PREVIEW_LEN = 220;

const BiodiversityResultsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
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
  const data = selectedAssetId ? getBiodiversityDataForAsset(store, selectedAssetId) : defaultBiodiversityAssetData();

  const latDisplay = selectedAsset?.lat?.trim() || "—";
  const lngDisplay = selectedAsset?.lng?.trim() || "—";

  const coordsStatus =
    selectedAsset?.lat?.trim() && selectedAsset?.lng?.trim()
      ? "Recorded from asset register"
      : "Not set in asset register";

  const narrativePreview = useMemo(() => {
    const raw = data.incidentNarrative.trim();
    if (!raw) return { text: "", truncated: false };
    if (raw.length <= NARRATIVE_PREVIEW_LEN) return { text: raw, truncated: false };
    return { text: `${raw.slice(0, NARRATIVE_PREVIEW_LEN)}…`, truncated: true };
  }, [data.incidentNarrative]);

  const empStatusLabel =
    data.empInPlace === "yes" ? "In place" : data.empInPlace === "no" ? "Not in place" : "Not specified";

  const bioHasEntryData = useMemo(() => {
    return (
      data.incidentCount.trim() !== "" ||
      data.incidentNarrative.trim() !== "" ||
      data.empInPlace !== "" ||
      data.empFilesMeta.length > 0
    );
  }, [data]);

  return (
    <div className="min-w-0 max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <Button variant="ghost" className="px-0 mb-2 h-auto text-slate-600 hover:text-teal-700" asChild>
          <Link to="/esg-management/biodiversity" className="inline-flex items-center text-sm font-medium">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to data entry
          </Link>
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Biodiversity — summary</h1>
        <p className="text-sm text-slate-600 max-w-2xl mt-1">
          Read-only snapshot. Edit details on the previous page.
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
            Sensitive-area checks and Scope 1 indicators are not computed in this release.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!draft.assets.length ? (
            <p className="text-sm text-slate-600">Add assets in boundary setting, then return to data entry.</p>
          ) : (
            <>
              {!bioHasEntryData && (
                <p className="text-sm text-slate-600">No incidents or EMP details yet — add them on the data entry page.</p>
              )}

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Asset and coordinates</h3>
                <ul className="text-sm text-slate-700 space-y-1">
                  <li>
                    <span className="font-medium text-slate-800">Asset: </span>
                    {selectedAsset?.asset_name?.trim() || (selectedAsset ? `Asset ${selectedAsset.id.slice(0, 8)}` : "—")}
                  </li>
                  <li>
                    <span className="font-medium text-slate-800">GPS: </span>
                    {coordsStatus}
                  </li>
                  {coordsStatus.startsWith("Recorded") && (
                    <li className="text-slate-600">
                      Latitude {latDisplay}, longitude {lngDisplay}
                    </li>
                  )}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Incidents</h3>
                <ul className="text-sm text-slate-700 space-y-2">
                  <li>
                    <span className="font-medium text-slate-800">Count: </span>
                    {data.incidentCount.trim() === "" ? "Not entered" : data.incidentCount.trim()}
                  </li>
                  <li>
                    <span className="font-medium text-slate-800">Narrative: </span>
                    {!narrativePreview.text ? (
                      "Not entered"
                    ) : (
                      <span className="block mt-1 whitespace-pre-wrap text-slate-700">{narrativePreview.text}</span>
                    )}
                    {narrativePreview.truncated && (
                      <span className="block text-xs text-slate-500 mt-1">Showing the start of the narrative.</span>
                    )}
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Environmental management plan</h3>
                <p className="text-sm text-slate-700">
                  <span className="font-medium text-slate-800">Status: </span>
                  {empStatusLabel}
                </p>
                {data.empFilesMeta.length > 0 ? (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-slate-800 mb-1">Referenced documents</p>
                    <ul className="text-sm text-slate-600 list-disc list-inside space-y-0.5">
                      {data.empFilesMeta.map((m, i) => (
                        <li key={`${m.name}-${m.lastModified}-${i}`}>{m.name}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 mt-1">No document references saved.</p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Protected and sensitive areas</h3>
                <p className="text-sm text-slate-600 mb-2">
                  Automated proximity checks are planned. No distances are calculated here yet.
                </p>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="py-2 px-3 font-semibold text-slate-800">Check</th>
                        <th className="py-2 px-3 font-semibold text-slate-800">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PROXIMITY_PLACEHOLDER_ROWS.map((row) => (
                        <tr key={row.key} className="border-b border-slate-100 last:border-0">
                          <td className="py-2 px-3 font-medium text-slate-800">{row.label}</td>
                          <td className="py-2 px-3 text-slate-600">Planned automated check</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Scope 1 GHG near protected areas</h3>
                <p className="text-sm text-slate-600">
                  Unavailable until GIS and greenhouse gas data are integrated. This field is not editable here.
                </p>
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

export default BiodiversityResultsPage;

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SourceCoverageRow, BoundaryDraftV2 } from "../../boundary/boundaryTypes";
import type { OrgBoundaryMethod } from "../../boundary/orgBoundaryMethod";
import { computeFinalReportingFactor } from "../../boundary/attribution";
import { SOURCE_CATEGORY_DEFS } from "../../boundary/sourceCategories";
import { ensureCoverageMap, loadBoundaryDraft, saveBoundaryDraft } from "../../boundary/storage";
import { assetFieldValidationMessage } from "../../boundary/assetFieldValidationMessages";

type GhgWizardStep = "operationalBoundary" | "reviewLock";

const STEP_META: { id: GhgWizardStep; label: string }[] = [
  { id: "operationalBoundary", label: "1. Emission sources" },
  { id: "reviewLock", label: "2. Review & lock" },
];

const METHOD_LABELS: Record<Exclude<OrgBoundaryMethod, "">, string> = {
  operational_control: "Operational control",
  financial_control: "Financial control",
  equity_share: "Equity share",
};

function parseIso(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function formatDisplayDate(iso: string): string {
  const dt = parseIso(iso);
  return dt ? dt.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
}

const GhgInventoryBoundaryScreen = () => {
  const { toast } = useToast();
  const [step, setStep] = useState<GhgWizardStep>("operationalBoundary");
  const [draft, setDraft] = useState<BoundaryDraftV2>(() => loadBoundaryDraft());
  const [selectedAssetIdForSources, setSelectedAssetIdForSources] = useState<string | null>(null);

  useEffect(() => {
    setDraft(loadBoundaryDraft());
  }, []);

  const persist = useCallback((next: BoundaryDraftV2) => {
    const merged = ensureCoverageMap(next);
    setDraft(merged);
    saveBoundaryDraft(merged);
  }, []);

  useEffect(() => {
    if (draft.assets.length && !selectedAssetIdForSources) {
      setSelectedAssetIdForSources(draft.assets[0].id);
    }
    if (selectedAssetIdForSources && !draft.assets.some((x) => x.id === selectedAssetIdForSources)) {
      setSelectedAssetIdForSources(draft.assets[0]?.id ?? null);
    }
  }, [draft.assets, selectedAssetIdForSources]);

  const locked = draft.ghg_inventory_locked;

  const goStep = (s: GhgWizardStep) => {
    if (locked && s !== "reviewLock") {
      toast({
        title: "Inventory is locked",
        description: "Open Review & lock to unlock and edit emission sources.",
      });
      return;
    }
    setStep(s);
  };

  const updateCoverageRow = (
    assetId: string,
    categoryId: SourceCoverageRow["categoryId"],
    patch: Partial<SourceCoverageRow>
  ) => {
    const rows = draft.sourceCoverageByAssetId[assetId];
    if (!rows) return;
    persist({
      ...draft,
      sourceCoverageByAssetId: {
        ...draft.sourceCoverageByAssetId,
        [assetId]: rows.map((r) => (r.categoryId === categoryId ? { ...r, ...patch } : r)),
      },
    });
  };

  const assetErrors = draft.assets.map((a) => assetFieldValidationMessage(a, draft.org_boundary_method));
  const canProceedAssets = draft.assets.length > 0 && assetErrors.every((e) => e === null);

  const coverageIssues = useMemo(() => {
    const issues: string[] = [];
    for (const a of draft.assets) {
      const rows = draft.sourceCoverageByAssetId[a.id];
      if (!rows) continue;
      for (const r of rows) {
        if (r.categoryPresent && r.coverage === "excluded" && !r.exclusionReason.trim()) {
          const label = SOURCE_CATEGORY_DEFS.find((d) => d.id === r.categoryId)?.label ?? "This source type";
          issues.push(`“${a.asset_name || a.id.slice(0, 8)}”: ${label} is excluded — add a short reason.`);
        }
      }
    }
    return issues;
  }, [draft.assets, draft.sourceCoverageByAssetId]);

  const canProceedSources = coverageIssues.length === 0;

  const reviewRows = useMemo(() => {
    return draft.assets.map((a) => {
      const f = computeFinalReportingFactor(draft.org_boundary_method, a, draft.period_start, draft.period_end);
      return { asset: a, ...f };
    });
  }, [draft.assets, draft.org_boundary_method, draft.period_start, draft.period_end]);

  return (
    <div className="min-w-0 max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <Link
          to="/esg-management/topics"
          className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-[#0A4D3E] mb-3 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to ESG topics
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-1">GHG: emission sources</h1>
        <p className="text-sm text-slate-600 max-w-2xl">
          Say which types of emission sources apply to each site. Finish{" "}
          <Link to="/esg-management/boundary-setting" className="font-medium text-[#0A4D3E] hover:underline">
            boundary setting
          </Link>{" "}
          first. You will add fuel use and activity data in a later step.
        </p>
      </div>

      {!canProceedAssets && (
        <Alert className="border-amber-200 bg-amber-50/50">
          <AlertTitle className="text-amber-950">Complete sites & assets first</AlertTitle>
          <AlertDescription className="text-sm text-amber-950/90">
            Add and complete your site and asset details in boundary setting before defining emission sources.
            <Link
              to="/esg-management/boundary-setting"
              className="block mt-2 font-medium text-[#0F6E56] underline"
            >
              Go to boundary setting
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-2 text-xs sm:text-sm font-medium">
        {STEP_META.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={locked && s.id !== "reviewLock"}
            onClick={() => goStep(s.id)}
            className={cn(
              "rounded-full px-3 sm:px-4 py-2 border-2 transition-all duration-300",
              step === s.id
                ? "bg-gradient-to-r from-[#1C7A53] to-[#1D9E75] text-white border-transparent shadow-md shadow-[0_10px_24px_-8px_rgba(11,77,61,0.30)]"
                : "bg-white text-slate-600 border-slate-200 hover:border-[#BFE3D3]/90 hover:bg-slate-50/90",
              locked && s.id !== "reviewLock" && "opacity-50 cursor-not-allowed"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {step === "operationalBoundary" && (
        <section className="space-y-4 sm:space-y-5">
          <Button variant="ghost" size="sm" className="px-0" asChild>
            <Link to="/esg-management/topics">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Which sources are in your inventory?</h2>
          <p className="text-sm text-slate-600 max-w-2xl">
            For each site, indicate which emission sources exist and whether they count toward this inventory. Detailed
            activity data comes later.
          </p>
          {draft.assets.length > 0 && (
            <div className="space-y-2 max-w-md">
              <Label>Site or asset</Label>
              <Select
                value={selectedAssetIdForSources ?? undefined}
                onValueChange={setSelectedAssetIdForSources}
                disabled={locked}
              >
                <SelectTrigger className="border-2 border-slate-200">
                  <SelectValue placeholder="Select site or asset" />
                </SelectTrigger>
                <SelectContent>
                  {draft.assets.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.asset_name || a.id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {selectedAssetIdForSources &&
            draft.sourceCoverageByAssetId[selectedAssetIdForSources]?.map((row) => {
              const def = SOURCE_CATEGORY_DEFS.find((d) => d.id === row.categoryId);
              return (
                <Card key={row.categoryId} className="border-2 border-slate-200 rounded-xl">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-semibold">{def?.label ?? "Source type"}</CardTitle>
                    <CardDescription className="text-xs">{def?.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2 pb-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`cp-${selectedAssetIdForSources}-${row.categoryId}`}
                        disabled={locked}
                        checked={row.categoryPresent}
                        onCheckedChange={(c) =>
                          updateCoverageRow(selectedAssetIdForSources, row.categoryId, { categoryPresent: c === true })
                        }
                      />
                      <Label htmlFor={`cp-${selectedAssetIdForSources}-${row.categoryId}`} className="cursor-pointer text-sm">
                        This source type applies to this site
                      </Label>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">In inventory?</Label>
                      <Select
                        disabled={locked}
                        value={row.coverage}
                        onValueChange={(v) =>
                          updateCoverageRow(selectedAssetIdForSources, row.categoryId, {
                            coverage: v as SourceCoverageRow["coverage"],
                          })
                        }
                      >
                        <SelectTrigger className="border-2 border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="included">Included</SelectItem>
                          <SelectItem value="excluded">Excluded</SelectItem>
                          <SelectItem value="not_applicable">Not applicable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-xs">Reason if excluded</Label>
                      <Input
                        disabled={locked}
                        className="border-2 border-slate-200"
                        value={row.exclusionReason}
                        onChange={(e) =>
                          updateCoverageRow(selectedAssetIdForSources, row.categoryId, { exclusionReason: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Data notes (optional)</Label>
                      <Input
                        disabled={locked}
                        className="border-2 border-slate-200"
                        value={row.dataAvailability}
                        onChange={(e) =>
                          updateCoverageRow(selectedAssetIdForSources, row.categoryId, { dataAvailability: e.target.value })
                        }
                        placeholder="e.g. meters installed; awaiting operator"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">How data was obtained</Label>
                      <Select
                        disabled={locked}
                        value={row.dataQualityMode}
                        onValueChange={(v) =>
                          updateCoverageRow(selectedAssetIdForSources, row.categoryId, {
                            dataQualityMode: v as SourceCoverageRow["dataQualityMode"],
                          })
                        }
                      >
                        <SelectTrigger className="border-2 border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="measured">Measured</SelectItem>
                          <SelectItem value="estimated">Estimated</SelectItem>
                          <SelectItem value="pending_operator_data">Awaiting operator data</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          {coverageIssues.length > 0 && (
            <ul className="text-sm text-amber-800 list-disc pl-5">
              {coverageIssues.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          )}
          <Button
            className="bg-gradient-to-r from-[#1C7A53] to-[#1D9E75] text-white shadow-md"
            disabled={!canProceedSources || !canProceedAssets || locked}
            onClick={() => goStep("reviewLock")}
          >
            Continue to review
          </Button>
        </section>
      )}

      {step === "reviewLock" && (
        <section className="space-y-4 sm:space-y-5">
          <Button variant="ghost" size="sm" className="px-0" onClick={() => goStep("operationalBoundary")} disabled={locked}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Review and lock</h2>
          <p className="text-sm text-slate-600">
            These figures combine your organisational boundary choice, how long each site was active in the reporting
            period, and your share of each asset. They help roll site-level data up to a group total.
          </p>
          <Card className="border-2 border-slate-200 rounded-xl overflow-x-auto">
            <CardContent className="pt-6">
              <table className="w-full text-sm text-left min-w-[720px]">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="py-2 pr-3 font-semibold">Site or asset</th>
                    <th className="py-2 pr-3 font-semibold">Boundary share</th>
                    <th className="py-2 pr-3 font-semibold">Time in period</th>
                    <th className="py-2 font-semibold">Combined factor</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewRows.map((r) => (
                    <tr key={r.asset.id} className="border-b border-slate-100">
                      <td className="py-2 pr-3 font-medium">{r.asset.asset_name || r.asset.id.slice(0, 8)}</td>
                      <td className="py-2 pr-3 font-mono">{r.attribution_factor.toFixed(4)}</td>
                      <td className="py-2 pr-3 font-mono">{r.time_factor.toFixed(4)}</td>
                      <td className="py-2 font-mono font-semibold text-[#0F6E56]">{r.final_reporting_factor.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <div className="rounded-xl border-2 border-slate-200 bg-slate-50/50 p-4 text-sm text-slate-600">
            <p>
              <span className="font-medium text-slate-800">Boundary approach:</span>{" "}
              {draft.org_boundary_method ? METHOD_LABELS[draft.org_boundary_method as Exclude<OrgBoundaryMethod, "">] : "—"}
            </p>
            <p className="mt-1">
              <span className="font-medium text-slate-800">Reporting period:</span> {formatDisplayDate(draft.period_start)} –{" "}
              {formatDisplayDate(draft.period_end)}
            </p>
          </div>
          {locked && (
            <Alert className="border-2 border-[#BFE3D3] bg-[#EAF7F1]/50">
              <Lock className="h-4 w-4 text-[#0F6E56]" />
              <AlertTitle>GHG inventory is locked</AlertTitle>
              <AlertDescription className="text-sm">
                Unlock only if your process allows changes to this reporting period.
                <button
                  type="button"
                  className="block mt-2 text-[#0F6E56] font-medium underline"
                  onClick={() => persist({ ...draft, ghg_inventory_locked: false })}
                >
                  Unlock to edit
                </button>
              </AlertDescription>
            </Alert>
          )}
          {!locked && (
            <Button
              className="bg-gradient-to-r from-[#1C7A53] to-[#1D9E75] text-white shadow-md"
              onClick={() => {
                if (!canProceedAssets || !canProceedSources) {
                  toast({
                    title: "Complete required steps",
                    description: "Fix site, asset, and emission source details before locking.",
                  });
                  return;
                }
                persist({ ...draft, ghg_inventory_locked: true });
                toast({
                  title: "GHG inventory locked",
                  description: "This reporting period is locked until you choose to unlock it.",
                });
              }}
            >
              Lock GHG inventory for this period
            </Button>
          )}
        </section>
      )}
    </div>
  );
};

export default GhgInventoryBoundaryScreen;

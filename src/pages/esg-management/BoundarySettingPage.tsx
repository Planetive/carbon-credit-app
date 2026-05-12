import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Activity,
  ArrowLeft,
  Building2,
  Cpu,
  Droplets,
  Factory,
  Info,
  Landmark,
  MoreHorizontal,
  PieChart,
  Ship,
  Sprout,
  Tractor,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WizardStep, AssetSnapshotRow, BoundaryDraftV2 } from "./boundary/boundaryTypes";
import type { OrgBoundaryMethod } from "./boundary/orgBoundaryMethod";
import {
  createEmptyAsset,
  defaultDraftV2,
  ensureCoverageMap,
  loadBoundaryDraft,
  saveBoundaryDraft,
} from "./boundary/storage";
import { assetFieldValidationMessage } from "./boundary/assetFieldValidationMessages";
import {
  getEsgSetupIncompleteReasons,
  isGlobalEsgSetupComplete,
  validateReportingPeriod,
} from "./boundary/isGlobalEsgSetupComplete";
const OIL_GAS_SECTOR_ID = "oil_and_gas";

const SECTORS: { id: string; label: string; description: string; icon: LucideIcon }[] = [
  {
    id: OIL_GAS_SECTOR_ID,
    label: "Oil and gas",
    description:
      "Where your business sits in the oil and gas value chain — not the same as emissions “scopes” in carbon accounting.",
    icon: Droplets,
  },
  { id: "technology", label: "Technology", description: "Software, hardware, cloud, and digital services.", icon: Cpu },
  {
    id: "manufacturing",
    label: "Manufacturing & industrials",
    description: "Industrial production, chemicals, materials, and machinery.",
    icon: Factory,
  },
  {
    id: "financial_services",
    label: "Financial services",
    description: "Banking, insurance, asset management, and related services.",
    icon: Landmark,
  },
  { id: "utilities", label: "Utilities & power", description: "Power, gas, water, and multi-utilities.", icon: Zap },
  {
    id: "real_estate",
    label: "Real estate & construction",
    description: "Development, REITs, construction, and facilities.",
    icon: Building2,
  },
  { id: "agriculture", label: "Agriculture & food", description: "Farming, food production, and agribusiness.", icon: Sprout },
  { id: "other", label: "Other sector", description: "Sectors not covered above.", icon: MoreHorizontal },
];

const BOUNDARY_METHODS: {
  id: Exclude<OrgBoundaryMethod, "">;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    id: "operational_control",
    label: "Operational control",
    description:
      "Include emissions from assets your organisation operates. Assets you do not operate are usually left out.",
    icon: Activity,
  },
  {
    id: "financial_control",
    label: "Financial control",
    description:
      "Include emissions from assets where your organisation has financial control, as you define it for reporting.",
    icon: Landmark,
  },
  {
    id: "equity_share",
    label: "Equity share",
    description: "Include emissions based on your economic interest in each asset (ownership percentage).",
    icon: PieChart,
  },
];

const ASSET_TYPE_OPTIONS = [
  "Onshore well pad",
  "Offshore platform",
  "Gas processing facility",
  "LNG facility",
  "Other",
];

const OWNERSHIP_TYPE_OPTIONS = [
  "Operated & owned",
  "Operated & not owned",
  "Non-operated equity",
  "Other",
];

const ASSET_STATUS_OPTIONS = ["Active", "Shut-in", "Decommissioning", "Other"];

const STEP_META: { id: WizardStep; label: string }[] = [
  { id: "reportingSetup", label: "1. Reporting period" },
  { id: "sectorSegment", label: "2. Industry & segment" },
  { id: "organisationalBoundary", label: "3. Organisational boundary" },
  { id: "assetRegister", label: "4. Sites & assets" },
];

function addOneYear(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setFullYear(dt.getFullYear() + 1);
  const y2 = dt.getFullYear();
  const m2 = String(dt.getMonth() + 1).padStart(2, "0");
  const d2 = String(dt.getDate()).padStart(2, "0");
  return `${y2}-${m2}-${d2}`;
}

const BoundarySettingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<WizardStep>("reportingSetup");
  const [draft, setDraft] = useState<BoundaryDraftV2>(defaultDraftV2);
  const [dateErrors, setDateErrors] = useState<{ start?: string; end?: string }>({});

  useEffect(() => {
    setDraft(loadBoundaryDraft());
  }, []);

  const persist = useCallback((next: BoundaryDraftV2) => {
    const merged = ensureCoverageMap(next);
    setDraft(merged);
    saveBoundaryDraft(merged);
  }, []);

  useEffect(() => {
    setDateErrors(validateReportingPeriod(draft.period_start, draft.period_end));
  }, [draft.period_start, draft.period_end]);

  const sectorLabel = useMemo(() => {
    if (!draft.sector) return null;
    return SECTORS.find((s) => s.id === draft.sector)?.label ?? draft.sector;
  }, [draft.sector]);

  const goStep = (s: WizardStep) => setStep(s);

  const updateAsset = (id: string, patch: Partial<AssetSnapshotRow>) => {
    persist({
      ...draft,
      assets: draft.assets.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    });
  };

  const addAsset = () => {
    const a = createEmptyAsset();
    persist(
      ensureCoverageMap({
        ...draft,
        assets: [...draft.assets, a],
      })
    );
  };

  const removeAsset = (id: string) => {
    const { [id]: _, ...restCov } = draft.sourceCoverageByAssetId;
    persist({
      ...draft,
      assets: draft.assets.filter((a) => a.id !== id),
      sourceCoverageByAssetId: restCov,
    });
  };

  const canProceedReporting = Object.keys(validateReportingPeriod(draft.period_start, draft.period_end)).length === 0;
  const canProceedSector = draft.sector !== null;
  const canProceedOrg =
    draft.org_boundary_method !== "" &&
    (draft.org_boundary_method !== "equity_share" || draft.equity_share_confirmed);
  const assetErrors = draft.assets.map((a) => assetFieldValidationMessage(a, draft.org_boundary_method));
  const canProceedAssets =
    draft.assets.length > 0 && assetErrors.every((e) => e === null);
  const globalSetupComplete = isGlobalEsgSetupComplete(draft);
  const incompleteReasons = useMemo(() => getEsgSetupIncompleteReasons(draft), [draft]);

  return (
    <div className="min-w-0 max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-teal-700 mb-3 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-1">Boundary setting</h1>
          <p className="text-sm text-slate-600 max-w-xl">
            Set your reporting period, industry, how you draw your organisational boundary, and the sites or assets you
            include in ESG reporting. For greenhouse gases, you can refine what counts in your inventory under{" "}
            <strong>GHG</strong>.
          </p>
          <p className="text-sm mt-2">
            <Link
              to="/esg-management/topics"
              className="font-medium text-teal-700 hover:text-teal-800 underline-offset-2 hover:underline"
            >
              ESG topics
            </Link>
            <span className="text-slate-500"> — continue here when this setup is complete.</span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs sm:text-sm font-medium">
        {STEP_META.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => goStep(s.id)}
            className={cn(
              "rounded-full px-3 sm:px-4 py-2 border-2 transition-all duration-300",
              step === s.id
                ? "bg-gradient-to-r from-teal-500 to-cyan-600 text-white border-transparent shadow-md shadow-teal-500/25"
                : "bg-white text-slate-600 border-slate-200 hover:border-teal-300/80 hover:bg-slate-50/90"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* 1. Reporting setup */}
      {step === "reportingSetup" && (
        <section className="space-y-4 sm:space-y-5">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Reporting period</h2>
          <p className="text-sm text-slate-600 max-w-2xl">
            Choose the dates your ESG information should cover. Add any notes your team may need for this reporting
            period.
          </p>
          <Card className="border-2 border-slate-200 rounded-xl shadow-sm">
            <CardContent className="pt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Reporting period start</Label>
                  <Input
                    type="date"
                    className="border-2 border-slate-200 max-w-xs"
                    value={draft.period_start}
                    onChange={(e) => persist({ ...draft, period_start: e.target.value, period_end: addOneYear(e.target.value) })}
                  />
                  {dateErrors.start && <p className="text-xs text-red-600">{dateErrors.start}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Reporting period end</Label>
                  <Input
                    type="date"
                    className="border-2 border-slate-200 max-w-xs"
                    value={draft.period_end}
                    onChange={(e) => persist({ ...draft, period_end: e.target.value })}
                  />
                  {dateErrors.end && <p className="text-xs text-red-600">{dateErrors.end}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Team notes (optional)</Label>
                <Textarea
                  className="border-2 border-slate-200 min-h-[80px]"
                  placeholder="e.g. Annual report 2024"
                  value={draft.reporting_setup_notes}
                  onChange={(e) => persist({ ...draft, reporting_setup_notes: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
          <Button
            className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md"
            disabled={!canProceedReporting}
            onClick={() => goStep("sectorSegment")}
          >
            Continue
          </Button>
        </section>
      )}

      {/* 2. Sector & business segment */}
      {step === "sectorSegment" && (
        <section className="space-y-4 sm:space-y-5">
          <Button variant="ghost" size="sm" className="px-0" onClick={() => goStep("reportingSetup")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Industry & business segment</h2>
          <Alert className="border-slate-200 bg-slate-50/80">
            <Info className="h-4 w-4" />
            <AlertTitle>Different from emissions “scopes”</AlertTitle>
            <AlertDescription className="text-sm">
              Upstream, midstream, and downstream here describe where your <strong>business</strong> operates — not GHG
              Scope 3 categories.
            </AlertDescription>
          </Alert>
          <p className="text-sm text-slate-600">Select the sector that best matches your organisation.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {SECTORS.map((s) => {
              const Icon = s.icon;
              const selected = draft.sector === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => persist({ ...draft, sector: s.id, business_segment: s.id !== OIL_GAS_SECTOR_ID ? null : draft.business_segment })}
                  className={cn(
                    "text-left rounded-xl border-2 p-4 sm:p-5 flex gap-3 transition-all",
                    selected
                      ? "border-teal-500 bg-gradient-to-br from-teal-50 to-cyan-50 shadow-md"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  )}
                >
                  <div className={cn("shrink-0 h-10 w-10 rounded-lg flex items-center justify-center", selected ? "bg-gradient-to-br from-teal-500 to-cyan-500 text-white" : "bg-slate-100 text-slate-600")}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{s.label}</p>
                    <p className="text-sm text-slate-500 mt-1">{s.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {draft.sector === OIL_GAS_SECTOR_ID && (
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-slate-900">Oil & gas business segment</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <button
                  type="button"
                  onClick={() => persist({ ...draft, business_segment: "upstream" })}
                  className={cn(
                    "text-left rounded-xl border-2 p-5 transition-all",
                    draft.business_segment === "upstream"
                      ? "border-teal-500 bg-gradient-to-br from-teal-50 to-cyan-50 ring-1 ring-teal-500/20"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center gap-2 font-semibold text-teal-800">
                    <Tractor className="h-5 w-5" />
                    Upstream
                  </div>
                  <p className="text-sm text-slate-600 mt-2">Exploration and production.</p>
                </button>
                <Card
                  className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/40 cursor-pointer opacity-90"
                  onClick={() => toast({ title: "Coming soon", description: "Midstream options will be added later." })}
                >
                  <CardHeader className="py-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Ship className="h-5 w-5 text-slate-500" />
                      Midstream
                    </CardTitle>
                    <CardDescription>Transportation, storage, processing.</CardDescription>
                  </CardHeader>
                </Card>
                <Card
                  className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/40 cursor-pointer opacity-90"
                  onClick={() => toast({ title: "Coming soon", description: "Downstream options will be added later." })}
                >
                  <CardHeader className="py-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Factory className="h-5 w-5 text-slate-500" />
                      Downstream
                    </CardTitle>
                    <CardDescription>Refining, marketing, retail.</CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </div>
          )}

          <Button
            className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md"
            disabled={!canProceedSector || (draft.sector === OIL_GAS_SECTOR_ID && !draft.business_segment)}
            onClick={() => goStep("organisationalBoundary")}
          >
            Continue
          </Button>
        </section>
      )}

      {/* 3. Organisational boundary */}
      {step === "organisationalBoundary" && (
        <section className="space-y-4 sm:space-y-5">
          <Button variant="ghost" size="sm" className="px-0" onClick={() => goStep("sectorSegment")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Organisational boundary</h2>
          <p className="text-sm text-slate-600 max-w-xl">
            Choose <strong>one</strong> approach for this reporting period. It defines which assets you include and how
            you share responsibility for them.
          </p>
          {sectorLabel && (
            <p className="text-sm text-slate-600">
              Sector: <span className="font-semibold text-slate-800">{sectorLabel}</span>
              {draft.business_segment && (
                <>
                  {" "}
                  · Segment: <span className="font-semibold text-slate-800">{draft.business_segment}</span>
                </>
              )}
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-3">
            {BOUNDARY_METHODS.map((m) => {
              const Icon = m.icon;
              const selected = draft.org_boundary_method === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    persist({
                      ...draft,
                      org_boundary_method: m.id,
                      equity_share_confirmed: m.id !== "equity_share" ? false : draft.equity_share_confirmed,
                    })
                  }
                  className={cn(
                    "text-left rounded-xl border-2 p-5 flex flex-col gap-2 h-full transition-all",
                    selected
                      ? "border-teal-500 bg-gradient-to-br from-teal-50 to-cyan-50 shadow-md ring-1 ring-teal-500/20"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", selected ? "bg-gradient-to-br from-teal-500 to-cyan-500 text-white" : "bg-slate-100 text-slate-600")}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-semibold">{m.label}</span>
                  </div>
                  <p className="text-sm text-slate-600">{m.description}</p>
                </button>
              );
            })}
          </div>
          {draft.org_boundary_method === "equity_share" && (
            <div className="rounded-xl border-2 border-slate-200 p-4 flex gap-3 items-start">
              <Checkbox
                id="org02"
                checked={draft.equity_share_confirmed}
                onCheckedChange={(c) => persist({ ...draft, equity_share_confirmed: c === true })}
              />
              <div>
                <Label htmlFor="org02" className="font-semibold cursor-pointer">
                  Confirm equity-share reporting
                </Label>
                <p className="text-sm text-slate-600 mt-1">
                  You will enter an ownership percentage for each asset. If you do not operate a site, you may need data
                  from the operator later.
                </p>
              </div>
            </div>
          )}
          <Button
            className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md"
            disabled={!canProceedOrg}
            onClick={() => goStep("assetRegister")}
          >
            Continue to sites & assets
          </Button>
        </section>
      )}

      {/* 4. Asset register */}
      {step === "assetRegister" && (
        <section className="space-y-4 sm:space-y-5">
          <Button variant="ghost" size="sm" className="px-0" onClick={() => goStep("organisationalBoundary")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Sites & assets</h2>
          <p className="text-sm text-slate-600 max-w-2xl">Add the sites and assets included in your ESG reporting.</p>
          <Button type="button" variant="outline" className="border-2 border-slate-200" onClick={addAsset}>
            Add site or asset
          </Button>
          <div className="space-y-6">
            {draft.assets.map((a) => (
              <Card key={a.id} className="border-2 border-slate-200 rounded-xl shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">Site or asset</CardTitle>
                  <Button type="button" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => removeAsset(a.id)}>
                    Remove
                  </Button>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Asset name</Label>
                    <Input className="border-2 border-slate-200" value={a.asset_name} onChange={(e) => updateAsset(a.id, { asset_name: e.target.value })} />
                  </div>
                  <details className="sm:col-span-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm">
                    <summary className="cursor-pointer font-medium text-slate-700">Reference ID — assigned automatically</summary>
                    <p className="mt-2 font-mono text-xs text-slate-600 break-all">{a.id}</p>
                  </details>
                  <div className="space-y-2">
                    <Label>Asset type</Label>
                    <Select value={a.asset_type || undefined} onValueChange={(v) => updateAsset(a.id, { asset_type: v })}>
                      <SelectTrigger className="border-2 border-slate-200">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSET_TYPE_OPTIONS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input
                      className="border-2 border-slate-200"
                      value={a.country}
                      onChange={(e) => updateAsset(a.id, { country: e.target.value })}
                      placeholder="e.g. United Kingdom or GB"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Region / state</Label>
                    <Input className="border-2 border-slate-200" value={a.region} onChange={(e) => updateAsset(a.id, { region: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Latitude</Label>
                    <Input className="border-2 border-slate-200" value={a.lat} onChange={(e) => updateAsset(a.id, { lat: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Longitude</Label>
                    <Input className="border-2 border-slate-200" value={a.lng} onChange={(e) => updateAsset(a.id, { lng: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Ownership type</Label>
                    <Select value={a.ownership_type || undefined} onValueChange={(v) => updateAsset(a.id, { ownership_type: v })}>
                      <SelectTrigger className="border-2 border-slate-200">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {OWNERSHIP_TYPE_OPTIONS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Ownership percentage</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      className="border-2 border-slate-200"
                      value={a.ownership_percentage}
                      onChange={(e) => updateAsset(a.id, { ownership_percentage: e.target.value })}
                    />
                    <p className="text-xs text-slate-500">Required when you chose <strong>equity share</strong> as your organisational boundary.</p>
                  </div>
                  <div className="space-y-2 sm:col-span-2 flex flex-wrap gap-6 items-center pt-2">
                    <div className="flex items-center gap-2">
                      <Checkbox id={`op-${a.id}`} checked={a.is_operator} onCheckedChange={(c) => updateAsset(a.id, { is_operator: c === true })} />
                      <Label htmlFor={`op-${a.id}`} className="cursor-pointer font-medium">
                        We operate this asset
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`fc-${a.id}`}
                        checked={a.has_financial_control}
                        onCheckedChange={(c) => updateAsset(a.id, { has_financial_control: c === true })}
                      />
                      <Label htmlFor={`fc-${a.id}`} className="cursor-pointer font-medium">
                        We have financial control
                      </Label>
                    </div>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Operator name</Label>
                    <Input
                      className="border-2 border-slate-200"
                      value={a.operator_name}
                      onChange={(e) => updateAsset(a.id, { operator_name: e.target.value })}
                      placeholder="Legal or field operator name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date operations began during this reporting period</Label>
                    <Input
                      type="date"
                      className="border-2 border-slate-200"
                      value={a.operation_start_in_period}
                      onChange={(e) => updateAsset(a.id, { operation_start_in_period: e.target.value })}
                    />
                    <p className="text-xs text-slate-500">Leave blank if the asset was active for the whole period.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Production type</Label>
                    <Input className="border-2 border-slate-200" value={a.production_type} onChange={(e) => updateAsset(a.id, { production_type: e.target.value })} placeholder="e.g. Oil + gas" />
                  </div>
                  <div className="space-y-2">
                    <Label>Asset status</Label>
                    <Select value={a.asset_status || undefined} onValueChange={(v) => updateAsset(a.id, { asset_status: v })}>
                      <SelectTrigger className="border-2 border-slate-200">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSET_STATUS_OPTIONS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Annual oil production (barrels)</Label>
                    <Input className="border-2 border-slate-200" value={a.oil_prod_bbl} onChange={(e) => updateAsset(a.id, { oil_prod_bbl: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Annual gas production</Label>
                    <Input className="border-2 border-slate-200" value={a.gas_prod} onChange={(e) => updateAsset(a.id, { gas_prod: e.target.value })} placeholder="e.g. MMScf or GJ" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Notes</Label>
                    <Textarea className="border-2 border-slate-200" value={a.notes} onChange={(e) => updateAsset(a.id, { notes: e.target.value })} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {draft.assets.length === 0 && (
            <p className="text-sm text-amber-800">Add at least one site or asset to continue.</p>
          )}
          {assetErrors.some(Boolean) && (
            <ul className="text-sm text-red-600 list-disc pl-5">
              {assetErrors.filter(Boolean).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
          {!globalSetupComplete && (
            <Alert className="border-amber-200 bg-amber-50/80 border-2 rounded-xl">
              <Info className="h-4 w-4 text-amber-900" />
              <AlertTitle className="text-amber-950">Finish earlier steps to open ESG topics</AlertTitle>
              <AlertDescription className="text-sm text-amber-950/95 mt-2">
                <p className="mb-2">
                  Complete reporting period, industry, organisational boundary, and every required site field — or use the
                  step buttons above to go back.
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  {incompleteReasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          <Button
            className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md"
            disabled={!globalSetupComplete}
            onClick={() => {
              if (!isGlobalEsgSetupComplete(draft)) {
                toast({
                  title: "Boundary setup incomplete",
                  description: "Use the checklist above, then try again.",
                });
                return;
              }
              navigate("/esg-management/topics");
            }}
          >
            Continue to ESG topics
          </Button>
        </section>
      )}
    </div>
  );
};

export default BoundarySettingPage;

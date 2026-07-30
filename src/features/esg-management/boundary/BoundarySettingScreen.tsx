import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  ArrowRight,
  Bookmark,
  Building2,
  CalendarDays,
  Cpu,
  Droplets,
  Factory,
  Info,
  Landmark,
  MoreHorizontal,
  PieChart,
  Ship,
  Sprout,
  Timer,
  Tractor,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WizardStep, AssetSnapshotRow, BoundaryDraftV2 } from "./boundaryTypes";
import type { OrgBoundaryMethod } from "./orgBoundaryMethod";
import {
  createEmptyAsset,
  defaultDraftV2,
  ensureCoverageMap,
  loadBoundaryDraft,
  saveBoundaryDraft,
} from "./storage";
import { assetFieldValidationMessage } from "./assetFieldValidationMessages";
import {
  getEsgSetupIncompleteReasons,
  isGlobalEsgSetupComplete,
  validateReportingPeriod,
} from "./isGlobalEsgSetupComplete";
const OIL_GAS_SECTOR_ID = "oil_and_gas";

const SECTORS: { id: string; label: string; description: string; icon: LucideIcon }[] = [
  {
    id: OIL_GAS_SECTOR_ID,
    label: "Oil and gas",
    description:
      "Where your business sits in the oil and gas value chain — not the same as emissions \"scopes\" in carbon accounting.",
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
  { id: "reportingSetup", label: "Reporting Period" },
  { id: "sectorSegment", label: "Industry & Segment" },
  { id: "organisationalBoundary", label: "Organisational Boundary" },
  { id: "assetRegister", label: "Sites & Assets" },
];

const NOTES_MAX = 500;

function addOneYear(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setFullYear(dt.getFullYear() + 1);
  const y2 = dt.getFullYear();
  const m2 = String(dt.getMonth() + 1).padStart(2, "0");
  const d2 = String(dt.getDate()).padStart(2, "0");
  return `${y2}-${m2}-${d2}`;
}

function reportingDuration(start: string, end: string) {
  if (!start || !end) return null;
  const a = new Date(start + "T00:00:00");
  const b = new Date(end + "T00:00:00");
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) return null;
  const days = Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
  const months = Math.max(1, Math.round(days / 30.44));
  const tag =
    days >= 360 && days <= 370 ? "Annual" : days >= 85 && days <= 95 ? "Quarterly" : days >= 28 && days <= 32 ? "Monthly" : null;
  return { days, months, tag };
}

function stepIndexOf(step: WizardStep) {
  return STEP_META.findIndex((s) => s.id === step);
}

const BoundarySettingScreen = () => {
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
  const globalSetupComplete = isGlobalEsgSetupComplete(draft);
  const incompleteReasons = useMemo(() => getEsgSetupIncompleteReasons(draft), [draft]);
  const stepIndex = stepIndexOf(step);
  const stepNumber = stepIndex + 1;
  const progressPct = Math.round((stepNumber / STEP_META.length) * 100);
  const duration = useMemo(
    () => reportingDuration(draft.period_start, draft.period_end),
    [draft.period_start, draft.period_end]
  );
  const notesLen = draft.reporting_setup_notes?.length ?? 0;

  const canContinueCurrent =
    step === "reportingSetup"
      ? canProceedReporting
      : step === "sectorSegment"
        ? canProceedSector && (draft.sector !== OIL_GAS_SECTOR_ID || !!draft.business_segment)
        : step === "organisationalBoundary"
          ? canProceedOrg
          : globalSetupComplete;

  const goBack = () => {
    if (stepIndex <= 0) {
      navigate("/esg-management/topics");
      return;
    }
    goStep(STEP_META[stepIndex - 1].id);
  };

  const goContinue = () => {
    if (step === "reportingSetup") {
      goStep("sectorSegment");
      return;
    }
    if (step === "sectorSegment") {
      goStep("organisationalBoundary");
      return;
    }
    if (step === "organisationalBoundary") {
      goStep("assetRegister");
      return;
    }
    if (!isGlobalEsgSetupComplete(draft)) {
      toast({
        title: "Boundary setup incomplete",
        description: "Use the checklist above, then try again.",
      });
      return;
    }
    navigate("/esg-management/topics");
  };

  const saveDraft = () => {
    persist(draft);
    toast({
      title: "Draft saved",
      description: "Your boundary settings are saved on this device.",
    });
  };

  return (
    <div className="relative min-h-full bg-[#F8FAF8]">
      <div className="mx-auto max-w-[1280px] px-4 pb-28 pt-6 md:px-6 md:pt-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                ESG Management
              </p>
              <span
                className="inline-flex items-center rounded-full bg-[#EAF7F1] px-2.5 py-0.5 text-[11px] font-semibold text-[#0F6E56]"
                title="SSIB-aligned reporting"
              >
                SSIB
              </span>
            </div>
            <h1 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-[#0F172A] sm:text-[32px]">
              Boundary Settings
            </h1>
            <p className="mt-1.5 text-sm text-[#64748B]">
              Define the scope and boundaries for your ESG reporting.
            </p>
          </div>

          <div className="w-full shrink-0 sm:w-[200px]">
            <div className="mb-1.5 flex items-center justify-between text-xs text-[#64748B]">
              <span>
                Step <span className="font-semibold text-[#0F172A]">{stepNumber}</span> of {STEP_META.length}
              </span>
              <span className="font-medium text-[#0F6E56]">{progressPct}% complete</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#E2E8F0]">
              <div
                className="h-full rounded-full bg-[#0F6E56] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </header>

        {/* Circle stepper */}
        <nav aria-label="Boundary setup steps" className="mb-8">
          <ol className="flex items-start justify-between gap-1">
            {STEP_META.map((s, i) => {
              const active = s.id === step;
              const done = i < stepIndex;
              return (
                <li key={s.id} className="relative flex min-w-0 flex-1 flex-col items-center">
                  {i < STEP_META.length - 1 ? (
                    <div
                      className={cn(
                        "absolute left-[calc(50%+18px)] right-[calc(-50%+18px)] top-[15px] h-0.5",
                        done || active ? "bg-[#0F6E56]" : "bg-[#E2E8F0]"
                      )}
                      aria-hidden
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => goStep(s.id)}
                    className="relative z-[1] flex flex-col items-center gap-2"
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                        active || done
                          ? "bg-[#0F6E56] text-white"
                          : "border-2 border-[#E2E8F0] bg-white text-[#94A3B8]"
                      )}
                    >
                      {i + 1}
                    </span>
                    <span
                      className={cn(
                        "max-w-[7.5rem] text-center text-[11px] font-medium leading-snug sm:text-xs",
                        active ? "text-[#0F6E56]" : "text-[#94A3B8]"
                      )}
                    >
                      {s.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Step content card */}
        <div className="rounded-2xl border border-[#E8EEF0] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-7">
          {step === "reportingSetup" && (
            <section className="space-y-6">
              <div>
                <div className="mb-1.5 flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-[#0F6E56]" />
                  <h2 className="text-lg font-semibold text-[#0F172A]">Reporting Period</h2>
                </div>
                <p className="text-sm text-[#64748B]">
                  Select the start and end dates for the period you want to include in your ESG report.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[#334155]">Start date</Label>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                    <Input
                      type="date"
                      className="border-[#E2E8F0] bg-[#F8FAFC] pl-10"
                      value={draft.period_start}
                      onChange={(e) =>
                        persist({
                          ...draft,
                          period_start: e.target.value,
                          period_end: addOneYear(e.target.value),
                        })
                      }
                    />
                  </div>
                  {dateErrors.start && <p className="text-xs text-red-600">{dateErrors.start}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-[#334155]">End date</Label>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                    <Input
                      type="date"
                      className="border-[#E2E8F0] bg-[#F8FAFC] pl-10"
                      value={draft.period_end}
                      onChange={(e) => persist({ ...draft, period_end: e.target.value })}
                    />
                  </div>
                  {dateErrors.end && <p className="text-xs text-red-600">{dateErrors.end}</p>}
                </div>
              </div>

              {duration && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#E8EEF0] bg-[#F8FAFC] px-4 py-3">
                  <Timer className="h-4 w-4 shrink-0 text-[#0F6E56]" />
                  <span className="text-sm text-[#64748B]">Reporting duration</span>
                  <span className="text-sm font-semibold text-[#0F172A]">{duration.days} days</span>
                  <span className="text-slate-300">Â·</span>
                  <span className="text-sm font-semibold text-[#0F172A]">{duration.months} months</span>
                  {duration.tag ? (
                    <span className="ml-auto rounded-full bg-[#EAF7F1] px-2.5 py-0.5 text-[11px] font-semibold text-[#0F6E56]">
                      {duration.tag}
                    </span>
                  ) : null}
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-[#334155]">Team notes (optional)</Label>
                <Textarea
                  className="min-h-[100px] border-[#E2E8F0] bg-[#F8FAFC] resize-none"
                  placeholder="Add any notes or context about this reporting period for your team..."
                  maxLength={NOTES_MAX}
                  value={draft.reporting_setup_notes}
                  onChange={(e) => persist({ ...draft, reporting_setup_notes: e.target.value.slice(0, NOTES_MAX) })}
                />
                <p className="text-right text-xs text-[#94A3B8]">
                  {notesLen} / {NOTES_MAX}
                </p>
              </div>
            </section>
          )}

          {step === "sectorSegment" && (
            <section className="space-y-5">
              <div>
                <div className="mb-1.5 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-[#0F6E56]" />
                  <h2 className="text-lg font-semibold text-[#0F172A]">Industry & Segment</h2>
                </div>
                <p className="text-sm text-[#64748B]">Select the sector that best matches your organisation.</p>
              </div>
              <Alert className="border-[#E8EEF0] bg-[#F8FAFC]">
                <Info className="h-4 w-4" />
                <AlertTitle>Different from emissions "scopes"</AlertTitle>
                <AlertDescription className="text-sm">
                  Upstream, midstream, and downstream here describe where your <strong>business</strong> operates — not
                  GHG Scope 3 categories.
                </AlertDescription>
              </Alert>
              <div className="grid gap-3 sm:grid-cols-2">
                {SECTORS.map((s) => {
                  const Icon = s.icon;
                  const selected = draft.sector === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        persist({
                          ...draft,
                          sector: s.id,
                          business_segment: s.id !== OIL_GAS_SECTOR_ID ? null : draft.business_segment,
                        })
                      }
                      className={cn(
                        "flex gap-3 rounded-xl border p-4 text-left transition-all",
                        selected
                          ? "border-[#0F6E56] bg-[#EAF7F1]/60 shadow-sm"
                          : "border-[#E8EEF0] bg-white hover:border-[#BFE3D3]"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                          selected ? "bg-[#0F6E56] text-white" : "bg-[#F1F5F9] text-[#64748B]"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#0F172A]">{s.label}</p>
                        <p className="mt-1 text-sm text-[#64748B]">{s.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {draft.sector === OIL_GAS_SECTOR_ID && (
                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-[#0F172A]">Oil & gas business segment</h3>
                  <div className="grid gap-3 md:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => persist({ ...draft, business_segment: "upstream" })}
                      className={cn(
                        "rounded-xl border p-4 text-left transition-all",
                        draft.business_segment === "upstream"
                          ? "border-[#0F6E56] bg-[#EAF7F1]/60"
                          : "border-[#E8EEF0] bg-white hover:border-[#BFE3D3]"
                      )}
                    >
                      <div className="flex items-center gap-2 font-semibold text-[#0F6E56]">
                        <Tractor className="h-5 w-5" />
                        Upstream
                      </div>
                      <p className="mt-2 text-sm text-[#64748B]">Exploration and production.</p>
                    </button>
                    <Card
                      className="cursor-pointer rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] opacity-90"
                      onClick={() =>
                        toast({ title: "Coming soon", description: "Midstream options will be added later." })
                      }
                    >
                      <CardHeader className="py-4">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Ship className="h-5 w-5 text-slate-500" />
                          Midstream
                        </CardTitle>
                        <CardDescription>Transportation, storage, processing.</CardDescription>
                      </CardHeader>
                    </Card>
                    <Card
                      className="cursor-pointer rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] opacity-90"
                      onClick={() =>
                        toast({ title: "Coming soon", description: "Downstream options will be added later." })
                      }
                    >
                      <CardHeader className="py-4">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Factory className="h-5 w-5 text-slate-500" />
                          Downstream
                        </CardTitle>
                        <CardDescription>Refining, marketing, retail.</CardDescription>
                      </CardHeader>
                    </Card>
                  </div>
                </div>
              )}
            </section>
          )}

          {step === "organisationalBoundary" && (
            <section className="space-y-5">
              <div>
                <div className="mb-1.5 flex items-center gap-2">
                  <Landmark className="h-5 w-5 text-[#0F6E56]" />
                  <h2 className="text-lg font-semibold text-[#0F172A]">Organisational Boundary</h2>
                </div>
                <p className="text-sm text-[#64748B]">
                  Choose <strong>one</strong> approach for this reporting period. It defines which assets you include and
                  how you share responsibility for them.
                </p>
                {sectorLabel && (
                  <p className="mt-2 text-sm text-[#64748B]">
                    Sector: <span className="font-semibold text-[#0F172A]">{sectorLabel}</span>
                    {draft.business_segment && (
                      <>
                        {" "}
                        Â· Segment:{" "}
                        <span className="font-semibold text-[#0F172A]">{draft.business_segment}</span>
                      </>
                    )}
                  </p>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-3">
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
                        "flex h-full flex-col gap-2 rounded-xl border p-4 text-left transition-all",
                        selected
                          ? "border-[#0F6E56] bg-[#EAF7F1]/60 shadow-sm"
                          : "border-[#E8EEF0] bg-white hover:border-[#BFE3D3]"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                            selected ? "bg-[#0F6E56] text-white" : "bg-[#F1F5F9] text-[#64748B]"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="font-semibold text-[#0F172A]">{m.label}</span>
                      </div>
                      <p className="text-sm text-[#64748B]">{m.description}</p>
                    </button>
                  );
                })}
              </div>
              {draft.org_boundary_method === "equity_share" && (
                <div className="flex items-start gap-3 rounded-xl border border-[#E8EEF0] p-4">
                  <Checkbox
                    id="org02"
                    checked={draft.equity_share_confirmed}
                    onCheckedChange={(c) => persist({ ...draft, equity_share_confirmed: c === true })}
                  />
                  <div>
                    <Label htmlFor="org02" className="cursor-pointer font-semibold">
                      Confirm equity-share reporting
                    </Label>
                    <p className="mt-1 text-sm text-[#64748B]">
                      You will enter an ownership percentage for each asset. If you do not operate a site, you may need
                      data from the operator later.
                    </p>
                  </div>
                </div>
              )}
            </section>
          )}

          {step === "assetRegister" && (
            <section className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="mb-1.5 flex items-center gap-2">
                    <Factory className="h-5 w-5 text-[#0F6E56]" />
                    <h2 className="text-lg font-semibold text-[#0F172A]">Sites & Assets</h2>
                  </div>
                  <p className="text-sm text-[#64748B]">Add the sites and assets included in your ESG reporting.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#0F6E56] text-[#0F6E56] hover:bg-[#EAF7F1]"
                  onClick={addAsset}
                >
                  Add site or asset
                </Button>
              </div>

              <div className="space-y-5">
                {draft.assets.map((a) => (
                  <Card key={a.id} className="rounded-xl border border-[#E8EEF0] shadow-none">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-base">Site or asset</CardTitle>
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => removeAsset(a.id)}
                      >
                        Remove
                      </Button>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Asset name</Label>
                        <Input
                          className="border-[#E2E8F0] bg-[#F8FAFC]"
                          value={a.asset_name}
                          onChange={(e) => updateAsset(a.id, { asset_name: e.target.value })}
                        />
                      </div>
                      <details className="sm:col-span-2 rounded-lg border border-[#E8EEF0] bg-[#F8FAFC] px-3 py-2 text-sm">
                        <summary className="cursor-pointer font-medium text-slate-700">
                          Reference ID — assigned automatically
                        </summary>
                        <p className="mt-2 break-all font-mono text-xs text-slate-600">{a.id}</p>
                      </details>
                      <div className="space-y-2">
                        <Label>Asset type</Label>
                        <Select
                          value={a.asset_type || undefined}
                          onValueChange={(v) => updateAsset(a.id, { asset_type: v })}
                        >
                          <SelectTrigger className="border-[#E2E8F0] bg-[#F8FAFC]">
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
                          className="border-[#E2E8F0] bg-[#F8FAFC]"
                          value={a.country}
                          onChange={(e) => updateAsset(a.id, { country: e.target.value })}
                          placeholder="e.g. United Kingdom or GB"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Region / state</Label>
                        <Input
                          className="border-[#E2E8F0] bg-[#F8FAFC]"
                          value={a.region}
                          onChange={(e) => updateAsset(a.id, { region: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Latitude</Label>
                        <Input
                          className="border-[#E2E8F0] bg-[#F8FAFC]"
                          value={a.lat}
                          onChange={(e) => updateAsset(a.id, { lat: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Longitude</Label>
                        <Input
                          className="border-[#E2E8F0] bg-[#F8FAFC]"
                          value={a.lng}
                          onChange={(e) => updateAsset(a.id, { lng: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Ownership type</Label>
                        <Select
                          value={a.ownership_type || undefined}
                          onValueChange={(v) => updateAsset(a.id, { ownership_type: v })}
                        >
                          <SelectTrigger className="border-[#E2E8F0] bg-[#F8FAFC]">
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
                          className="border-[#E2E8F0] bg-[#F8FAFC]"
                          value={a.ownership_percentage}
                          onChange={(e) => updateAsset(a.id, { ownership_percentage: e.target.value })}
                        />
                        <p className="text-xs text-[#94A3B8]">
                          Required when you chose <strong>equity share</strong> as your organisational boundary.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-6 pt-2 sm:col-span-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`op-${a.id}`}
                            checked={a.is_operator}
                            onCheckedChange={(c) => updateAsset(a.id, { is_operator: c === true })}
                          />
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
                          className="border-[#E2E8F0] bg-[#F8FAFC]"
                          value={a.operator_name}
                          onChange={(e) => updateAsset(a.id, { operator_name: e.target.value })}
                          placeholder="Legal or field operator name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Date operations began during this reporting period</Label>
                        <Input
                          type="date"
                          className="border-[#E2E8F0] bg-[#F8FAFC]"
                          value={a.operation_start_in_period}
                          onChange={(e) => updateAsset(a.id, { operation_start_in_period: e.target.value })}
                        />
                        <p className="text-xs text-[#94A3B8]">Leave blank if the asset was active for the whole period.</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Production type</Label>
                        <Input
                          className="border-[#E2E8F0] bg-[#F8FAFC]"
                          value={a.production_type}
                          onChange={(e) => updateAsset(a.id, { production_type: e.target.value })}
                          placeholder="e.g. Oil + gas"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Asset status</Label>
                        <Select
                          value={a.asset_status || undefined}
                          onValueChange={(v) => updateAsset(a.id, { asset_status: v })}
                        >
                          <SelectTrigger className="border-[#E2E8F0] bg-[#F8FAFC]">
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
                        <Input
                          className="border-[#E2E8F0] bg-[#F8FAFC]"
                          value={a.oil_prod_bbl}
                          onChange={(e) => updateAsset(a.id, { oil_prod_bbl: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Annual gas production</Label>
                        <Input
                          className="border-[#E2E8F0] bg-[#F8FAFC]"
                          value={a.gas_prod}
                          onChange={(e) => updateAsset(a.id, { gas_prod: e.target.value })}
                          placeholder="e.g. MMScf or GJ"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Notes</Label>
                        <Textarea
                          className="border-[#E2E8F0] bg-[#F8FAFC]"
                          value={a.notes}
                          onChange={(e) => updateAsset(a.id, { notes: e.target.value })}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {draft.assets.length === 0 && (
                <p className="text-sm text-amber-800">Add at least one site or asset to continue.</p>
              )}
              {assetErrors.some(Boolean) && (
                <ul className="list-disc pl-5 text-sm text-red-600">
                  {assetErrors.filter(Boolean).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
              {!globalSetupComplete && (
                <Alert className="rounded-xl border-2 border-amber-200 bg-amber-50/80">
                  <Info className="h-4 w-4 text-amber-900" />
                  <AlertTitle className="text-amber-950">Finish earlier steps to open ESG topics</AlertTitle>
                  <AlertDescription className="mt-2 text-sm text-amber-950/95">
                    <p className="mb-2">
                      Complete reporting period, industry, organisational boundary, and every required site field — or
                      use the step buttons above to go back.
                    </p>
                    <ul className="list-disc space-y-1 pl-5">
                      {incompleteReasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </section>
          )}
        </div>
      </div>

      {/* Sticky footer actions */}
      <div className="sticky bottom-0 border-t border-[#E8EEF0] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-4 py-3.5 md:px-6">
          <Button
            type="button"
            variant="outline"
            className="border-[#E2E8F0] text-[#334155]"
            onClick={goBack}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-[#0F6E56] text-[#0F6E56] hover:bg-[#EAF7F1]"
              onClick={saveDraft}
            >
              <Bookmark className="mr-1.5 h-4 w-4" />
              Save as draft
            </Button>
            <Button
              type="button"
              className="bg-[#0F6E56] text-white hover:bg-[#0A4D3E]"
              disabled={!canContinueCurrent}
              onClick={goContinue}
            >
              {step === "assetRegister" ? "Continue to ESG topics" : "Continue"}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoundarySettingScreen;

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Bot, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type AdvisorData = {
  primaryClimateGoal: string;
  targetPeriodStart: string;
  targetPeriodEnd: string;
  isNetZero: boolean;
  investmentCapacity: string;
  specificBudget: string;
  businessGoals: string;
};

type ChoiceOption = { value: string; label: string };

type Step =
  | {
      id: keyof AdvisorData | "netZero";
      prompt: string;
      kind: "choice";
      options: ChoiceOption[];
      optional?: boolean;
    }
  | {
      id: "businessGoals" | "specificBudget";
      prompt: string;
      kind: "text";
      placeholder: string;
      optional?: boolean;
    };

type Suggestion = {
  id: number;
  title: string;
  type: string;
  match: number;
  description: string;
  expectedCredits: string;
  investmentRange: string;
  timeline: string;
  methodology: string;
  coBenefits: string[];
  suitabilityReasons: string[];
};

const STEPS: Step[] = [
  {
    id: "primaryClimateGoal",
    prompt: "What's your primary climate goal?",
    kind: "choice",
    options: [
      { value: "reduce-ghg", label: "Reduce GHG emissions" },
      { value: "carbon-neutral", label: "Achieve carbon neutrality" },
      { value: "offsetting", label: "Carbon offsetting" },
      { value: "net-zero", label: "Net zero commitment" },
      { value: "biodiversity", label: "Biodiversity & co-benefits" },
      { value: "esg", label: "ESG & sustainability goals" },
    ],
  },
  {
    id: "targetPeriodStart",
    prompt: "When does your target period begin?",
    kind: "choice",
    options: ["2025", "2026", "2027", "2028"].map((y) => ({ value: y, label: y })),
  },
  {
    id: "targetPeriodEnd",
    prompt: "And when should it end?",
    kind: "choice",
    options: ["2030", "2035", "2040", "2050"].map((y) => ({ value: y, label: y })),
  },
  {
    id: "netZero",
    prompt: "Is this part of a Net Zero strategy?",
    kind: "choice",
    options: [
      { value: "yes", label: "Yes — Net Zero focused" },
      { value: "no", label: "No — emission reduction focus" },
    ],
  },
  {
    id: "investmentCapacity",
    prompt: "What's your investment capacity?",
    kind: "choice",
    options: [
      { value: "low", label: "Low ($100K – $500K)" },
      { value: "medium", label: "Medium ($500K – $2M)" },
      { value: "high", label: "High ($2M+)" },
      { value: "custom", label: "I have a specific budget" },
    ],
  },
  {
    id: "specificBudget",
    prompt: "What budget range are you working with?",
    kind: "text",
    placeholder: "e.g. $800K – $1.5M",
    optional: true,
  },
  {
    id: "businessGoals",
    prompt: "Any other goals or constraints?",
    kind: "text",
    placeholder: "Geography, timeline, co-benefits, risk appetite…",
    optional: true,
  },
];

function useTypedText(text: string, speed = 26) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  // Reset before paint so options never flash from the previous step.
  useLayoutEffect(() => {
    setDisplayed("");
    setDone(false);
  }, [text]);

  useEffect(() => {
    if (!text) {
      setDisplayed("");
      setDone(false);
      return;
    }

    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        window.clearInterval(id);
        setDone(true);
      }
    }, speed);

    return () => window.clearInterval(id);
  }, [text, speed]);

  const showAnswers = done && displayed === text && text.length > 0;
  return { displayed, done: showAnswers };
}

const AIAdvisor = () => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [advisorData, setAdvisorData] = useState<AdvisorData>({
    primaryClimateGoal: "",
    targetPeriodStart: "",
    targetPeriodEnd: "",
    isNetZero: false,
    investmentCapacity: "",
    specificBudget: "",
    businessGoals: "",
  });

  const [stepIndex, setStepIndex] = useState(0);
  const [textDraft, setTextDraft] = useState("");
  const [phase, setPhase] = useState<"intro" | "questions" | "analyzing" | "results">("intro");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const visibleSteps = useMemo(() => {
    return STEPS.filter((s) => {
      if (s.id === "specificBudget") return advisorData.investmentCapacity === "custom";
      return true;
    });
  }, [advisorData.investmentCapacity]);

  const currentStep = visibleSteps[Math.min(stepIndex, visibleSteps.length - 1)];
  const { displayed, done } = useTypedText(
    phase === "questions" && currentStep ? currentStep.prompt : "",
    24
  );

  useEffect(() => {
    if (phase === "questions" && done && currentStep?.kind === "text") {
      inputRef.current?.focus();
    }
  }, [phase, done, currentStep]);

  const progressPct = phase === "questions"
    ? Math.round(((stepIndex + 1) / visibleSteps.length) * 100)
    : phase === "results"
      ? 100
      : 0;

  const applyAnswerAndAdvance = (value: string) => {
    if (!currentStep) return;

    const nextData = { ...advisorData };
    if (currentStep.id === "netZero") {
      nextData.isNetZero = value === "yes";
    } else if (currentStep.id === "primaryClimateGoal") {
      nextData.primaryClimateGoal = value;
    } else if (currentStep.id === "targetPeriodStart") {
      nextData.targetPeriodStart = value;
    } else if (currentStep.id === "targetPeriodEnd") {
      nextData.targetPeriodEnd = value;
    } else if (currentStep.id === "investmentCapacity") {
      nextData.investmentCapacity = value;
    } else if (currentStep.id === "specificBudget") {
      nextData.specificBudget = value;
    } else if (currentStep.id === "businessGoals") {
      nextData.businessGoals = value;
    }

    setAdvisorData(nextData);
    setTextDraft("");

    const nextVisible = STEPS.filter((s) => {
      if (s.id === "specificBudget") return nextData.investmentCapacity === "custom";
      return true;
    });
    const nextIndex = stepIndex + 1;

    if (nextIndex >= nextVisible.length) {
      runAnalysis(nextData);
      return;
    }
    setStepIndex(nextIndex);
  };

  const runAnalysis = (data: AdvisorData) => {
    setPhase("analyzing");
    window.setTimeout(() => {
      setSuggestions([
        {
          id: 1,
          title: "Forest Conservation & Reforestation",
          type: "Forestry & Land Use",
          match: 95,
          description:
            "Large-scale forest conservation with carbon sequestration and biodiversity co-benefits.",
          expectedCredits: "12,000 tCO2e/year",
          investmentRange: "$800K - $1.2M",
          timeline: "2025-2035",
          methodology: "VCS VM0006 - Afforestation/Reforestation",
          coBenefits: ["Biodiversity Conservation", "Water Quality", "Community Employment"],
          suitabilityReasons: [
            "Aligns with your climate goal",
            "Strong biodiversity co-benefits",
            "Fits your investment capacity",
            "Timeline matches your target period",
          ],
        },
        {
          id: 2,
          title: "Renewable Energy - Solar Farm",
          type: "Renewable Energy",
          match: 88,
          description: "Solar photovoltaic installation for grid-connected renewable energy generation.",
          expectedCredits: "8,500 tCO2e/year",
          investmentRange: "$900K - $1.5M",
          timeline: "2025-2030",
          methodology: "Gold Standard Renewable Energy",
          coBenefits: ["Energy Security", "Air Quality", "Job Creation"],
          suitabilityReasons: [
            "Direct GHG emission reduction",
            "Proven technology with lower risk",
            "Faster credit generation timeline",
            data.isNetZero ? "Supports a Net Zero pathway" : "Strong market demand for renewable credits",
          ],
        },
        {
          id: 3,
          title: "Improved Agricultural Practices",
          type: "Agriculture",
          match: 82,
          description: "Sustainable agriculture with soil carbon enhancement and methane reduction.",
          expectedCredits: "6,200 tCO2e/year",
          investmentRange: "$400K - $700K",
          timeline: "2025-2032",
          methodology: "VCS VM0026 - Improved Agricultural Management",
          coBenefits: ["Soil Health", "Water Conservation", "Food Security"],
          suitabilityReasons: [
            "Lower initial investment requirement",
            "Multiple environmental benefits",
            "Community engagement opportunities",
            "Supports sustainable development goals",
          ],
        },
      ]);
      setPhase("results");
    }, 1800);
  };

  const selectProject = (project: Suggestion, editMode = false) => {
    const detailedProjectData = {
      projectName: project.title,
      projectType: project.type.toLowerCase().replace(/\s+/g, "-"),
      description: project.description,
      projectDeveloper: "AI Suggested Project",
      country: "us",
      region: "California",
      coordinates: "",
      landArea: "1000",
      landUse: "forest",
      methodology: project.methodology,
      technology: project.description,
      certificationStandard: project.methodology.includes("VCS") ? "vcs" : "gold-standard",
      monitoringPlan: "Standard monitoring plan for " + project.type,
      initialInvestment: project.investmentRange.split(" - ")[0].replace(/[$K]/g, "") + "000",
      operationalCosts: "50000",
      creditPrice: "15",
      projectLifetime: "10",
      carbonSequestration: project.expectedCredits.split(" ")[0].replace(/[,]/g, ""),
      biodiversityImpact: project.coBenefits.includes("Biodiversity Conservation")
        ? "Significant positive impact on local biodiversity"
        : "",
      waterImpact: project.coBenefits.includes("Water Quality")
        ? "Improved water quality and conservation"
        : "",
      soilImpact: project.coBenefits.includes("Soil Health")
        ? "Enhanced soil health and carbon storage"
        : "",
      additionalBenefits: project.coBenefits,
      technicalRisks: "Low to moderate technical risks",
      financialRisks: "Market volatility for carbon credits",
      regulatoryRisks: "Changes in carbon credit regulations",
      marketRisks: "Demand fluctuations for carbon credits",
      mitigationStrategies: "Diversified credit buyers and robust monitoring",
      startDate: advisorData.targetPeriodStart,
      firstCreditDate: "2026-01-01",
      majorMilestones: "Project validation, implementation, first verification",
      reportingSchedule: "Annual verification and reporting",
    };

    if (editMode) {
      navigate("/project-wizard", {
        state: { prefillData: detailedProjectData, isAISuggested: true, suggestion: project },
      });
    } else {
      navigate("/project-results", {
        state: { projectData: detailedProjectData, isAISuggested: true, suggestion: project },
      });
    }
  };

  const restart = () => {
    setPhase("intro");
    setStepIndex(0);
    setTextDraft("");
    setSuggestions([]);
    setAdvisorData({
      primaryClimateGoal: "",
      targetPeriodStart: "",
      targetPeriodEnd: "",
      isNetZero: false,
      investmentCapacity: "",
      specificBudget: "",
      businessGoals: "",
    });
  };

  return (
    <div className="relative min-h-full w-full overflow-hidden bg-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.14) 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-70"
        aria-hidden
        style={{
          background:
            "radial-gradient(55% 60% at 50% 0%, rgba(15,118,110,0.10) 0%, rgba(255,255,255,0) 70%)",
        }}
      />

      <div className="relative flex min-h-full w-full flex-col px-6 py-8 md:px-10 lg:px-14">
        {(phase === "questions" || phase === "analyzing") && (
          <div className="pointer-events-none absolute right-6 top-8 z-10 w-32 sm:right-10 sm:w-40 lg:right-14">
            <div className="mb-1 flex justify-between text-[11px] text-[#94A3B8]">
              <span>
                {Math.min(stepIndex + 1, visibleSteps.length)}/{visibleSteps.length}
              </span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-[#E2E8F0]">
              <div
                className="h-full rounded-full bg-[#0F6E56] transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {phase === "intro" && (
          <div className="flex min-h-[calc(100vh-5rem)] flex-1 flex-col items-center justify-center text-center">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#BFE3D3] bg-[#EAF7F1] text-[#0F6E56] shadow-[0_10px_30px_-12px_rgba(15,118,110,0.35)]">
              <Bot className="h-7 w-7" />
            </div>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-[#94A3B8]">
              AI Assistant
            </p>
            <h1 className="max-w-3xl text-[34px] font-bold leading-tight tracking-[-0.03em] text-[#0F172A] sm:text-[42px]">
              Find the right carbon project for your goals
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#64748B]">
              Answer a few focused questions. One at a time. We&apos;ll recommend projects that fit your climate
              ambition and investment range.
            </p>
            <Button
              type="button"
              className="mt-10 h-11 rounded-full bg-[#0F6E56] px-7 text-white hover:bg-[#0A4D3E]"
              onClick={() => setPhase("questions")}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Begin
            </Button>
          </div>
        )}

        {phase === "questions" && currentStep && (
          <div className="flex min-h-[calc(100vh-5rem)] flex-1 flex-col items-center justify-center">
            <div className="w-full max-w-3xl text-center">
              <h2 className="min-h-[3.5rem] text-[28px] font-semibold leading-snug tracking-[-0.02em] text-[#0F172A] sm:min-h-[4rem] sm:text-[34px]">
                {displayed}
                <span
                  className={cn(
                    "ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[3px] bg-[#0F6E56]",
                    done ? "opacity-0" : "animate-pulse"
                  )}
                  aria-hidden
                />
              </h2>

              <div
                key={currentStep.id}
                className={cn(
                  "mt-10 transition-all duration-500",
                  done ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0 pointer-events-none"
                )}
              >
                {!done ? null : currentStep.kind === "choice" ? (
                  <div className="mx-auto grid max-w-3xl gap-2.5 sm:grid-cols-2">
                    {currentStep.options.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => applyAnswerAndAdvance(opt.value)}
                        className="group flex items-center justify-between rounded-2xl border border-[#E8EEF0] bg-white/90 px-4 py-3.5 text-left text-sm font-medium text-[#0F172A] shadow-[0_6px_20px_rgba(15,23,42,0.04)] transition-all hover:border-[#0F6E56]/40 hover:bg-[#F8FAF8] hover:shadow-[0_10px_28px_rgba(15,23,42,0.08)]"
                      >
                        <span>{opt.label}</span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-[#94A3B8] transition-transform group-hover:translate-x-0.5 group-hover:text-[#0F6E56]" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <form
                    className="mx-auto max-w-2xl"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!textDraft.trim() && !currentStep.optional) return;
                      applyAnswerAndAdvance(textDraft.trim());
                    }}
                  >
                    <div className="rounded-2xl border border-[#E8EEF0] bg-white/95 p-2 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                      <Input
                        ref={inputRef}
                        value={textDraft}
                        onChange={(e) => setTextDraft(e.target.value)}
                        placeholder={currentStep.placeholder}
                        className="h-12 border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
                      />
                      <div className="flex items-center justify-between gap-2 px-2 pb-1 pt-1">
                        <p className="text-[11px] text-[#94A3B8]">
                          {currentStep.optional ? "Optional — press Enter to continue" : "Press Enter to continue"}
                        </p>
                        <Button
                          type="submit"
                          size="sm"
                          className="rounded-full bg-[#0F6E56] px-4 text-white hover:bg-[#0A4D3E]"
                          disabled={!textDraft.trim() && !currentStep.optional}
                        >
                          Continue
                          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {currentStep.optional && (
                      <button
                        type="button"
                        className="mt-4 text-sm text-[#64748B] underline-offset-2 hover:text-[#0F6E56] hover:underline"
                        onClick={() => applyAnswerAndAdvance("")}
                      >
                        Skip for now
                      </button>
                    )}
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {phase === "analyzing" && (
          <div className="flex min-h-[calc(100vh-5rem)] flex-1 flex-col items-center justify-center text-center">
            <div className="mb-5 h-10 w-10 animate-spin rounded-full border-2 border-[#0F6E56] border-t-transparent" />
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">
              Analyzing your requirements
            </h2>
            <p className="mt-2 text-sm text-[#64748B]">Matching goals, timeline, and investment capacity…</p>
          </div>
        )}

        {phase === "results" && (
          <div className="mx-auto w-full max-w-6xl flex-1 pb-10">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#EAF7F1] text-[#0F6E56]">
                <Check className="h-5 w-5" />
              </div>
              <h2 className="text-3xl font-bold tracking-[-0.02em] text-[#0F172A]">Recommended projects</h2>
              <p className="mt-2 text-sm text-[#64748B]">
                {suggestions.length} opportunities matched to your answers
              </p>
            </div>

            <div className="space-y-4">
              {suggestions.map((project) => (
                <article
                  key={project.id}
                  className="rounded-2xl border border-[#E8EEF0] bg-white/95 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-[#0F172A]">{project.title}</h3>
                      <p className="mt-1 text-sm text-[#64748B]">{project.description}</p>
                    </div>
                    <span className="rounded-full bg-[#EAF7F1] px-2.5 py-1 text-xs font-semibold text-[#0F6E56]">
                      {project.match}% match
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div>
                      <Label className="text-[11px] uppercase tracking-wide text-[#94A3B8]">Credits</Label>
                      <p className="mt-0.5 text-sm font-medium text-[#0F172A]">{project.expectedCredits}</p>
                    </div>
                    <div>
                      <Label className="text-[11px] uppercase tracking-wide text-[#94A3B8]">Investment</Label>
                      <p className="mt-0.5 text-sm font-medium text-[#0F172A]">{project.investmentRange}</p>
                    </div>
                    <div>
                      <Label className="text-[11px] uppercase tracking-wide text-[#94A3B8]">Timeline</Label>
                      <p className="mt-0.5 text-sm font-medium text-[#0F172A]">{project.timeline}</p>
                    </div>
                  </div>

                  <ul className="mt-4 space-y-1.5">
                    {project.suitabilityReasons.map((reason) => (
                      <li key={reason} className="flex items-start gap-2 text-sm text-[#64748B]">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0F6E56]" />
                        {reason}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {project.coBenefits.map((benefit) => (
                      <span
                        key={benefit}
                        className="rounded-full border border-[#E8EEF0] bg-[#F8FAFC] px-2.5 py-1 text-[11px] font-medium text-[#475569]"
                      >
                        {benefit}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                    <Button
                      className="flex-1 bg-[#0F6E56] text-white hover:bg-[#0A4D3E]"
                      onClick={() => selectProject(project)}
                    >
                      Generate report
                    </Button>
                    <Button variant="outline" className="border-[#E2E8F0]" onClick={() => selectProject(project, true)}>
                      View details & edit
                    </Button>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Button variant="ghost" className="text-[#64748B]" onClick={restart}>
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Start over
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAdvisor;

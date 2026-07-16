import { Button } from "@/components/ui/button";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardList,
  Layers,
  Mail,
  MapPin,
  Send,
  Target,
  Truck,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type SupplyChainIntelligencePageProps = {
  prefersReducedMotion?: boolean;
};

type TierKey = "tier1" | "tier2" | "tier3";

type Hotspot = {
  name: string;
  category: string;
  intensity: string;
  share: number;
};

const tierMeta: Record<
  TierKey,
  {
    label: string;
    suppliers: number;
    share: number;
    coverage: string;
    responseRate: number;
    hotspots: Hotspot[];
  }
> = {
  tier1: {
    label: "Tier 1",
    suppliers: 12,
    share: 34,
    coverage: "Direct suppliers",
    responseRate: 91,
    hotspots: [
      { name: "Transport & distribution", category: "Logistics", intensity: "High", share: 38 },
      { name: "Electronics assembly", category: "Manufacturing", intensity: "Medium", share: 24 },
      { name: "Packaging materials", category: "Materials", intensity: "Medium", share: 18 },
    ],
  },
  tier2: {
    label: "Tier 2",
    suppliers: 48,
    share: 41,
    coverage: "Sub-suppliers & processors",
    responseRate: 76,
    hotspots: [
      { name: "Steel & metals processing", category: "Raw materials", intensity: "High", share: 42 },
      { name: "Textile production", category: "Manufacturing", intensity: "High", share: 31 },
      { name: "Industrial chemicals", category: "Chemicals", intensity: "Medium", share: 15 },
    ],
  },
  tier3: {
    label: "Tier 3",
    suppliers: 126,
    share: 25,
    coverage: "Upstream commodities",
    responseRate: 58,
    hotspots: [
      { name: "Mining & extraction", category: "Commodities", intensity: "High", share: 36 },
      { name: "Agricultural inputs", category: "Agriculture", intensity: "Medium", share: 22 },
      { name: "Energy utilities", category: "Utilities", intensity: "Low", share: 12 },
    ],
  },
};

const pillars = [
  {
    icon: Layers,
    title: "Map your network",
    desc: "Organise suppliers by tier, category and spend so scope 3 has structure from the start.",
  },
  {
    icon: Send,
    title: "Collect with clarity",
    desc: "Send guided questionnaires suppliers can finish — with reminders and status on every request.",
  },
  {
    icon: Target,
    title: "Act on what matters",
    desc: "See which categories carry the most emissions and follow up where the impact is highest.",
  },
];

const compareRows = [
  { without: "Chasing suppliers over email every reporting cycle", with: "Structured requests with completion tracking" },
  { without: "Scope 3 split across spreadsheets and teams", with: "Tier mapping tied to your emissions inventory" },
  { without: "No view of which suppliers drive the footprint", with: "Hotspot ranking by category and tier" },
  { without: "Follow-ups sent to everyone, every time", with: "Scorecards show who still needs a nudge" },
];

const workflow = [
  {
    icon: MapPin,
    title: "Map the supplier network",
    blurb: "Register tiers, categories and spend",
    detail:
      "Organise suppliers by tier and category — transport, materials, packaging and more — so you know which relationships drive the majority of upstream emissions.",
    tags: ["Tier mapping", "Categories", "Spend linkage"],
  },
  {
    icon: Mail,
    title: "Send structured requests",
    blurb: "Clear questionnaires, not blank spreadsheets",
    detail:
      "Standardised data requests with guided fields improve response rates and give procurement teams something suppliers can actually finish.",
    tags: ["Guided forms", "Reminders", "Bulk outreach"],
  },
  {
    icon: ClipboardList,
    title: "Track scorecards",
    blurb: "Engagement and data quality per supplier",
    detail:
      "See who has responded, where data is incomplete, and how each supplier compares — so follow-ups are targeted, not broadcast.",
    tags: ["Engagement", "Data quality", "Benchmarks"],
  },
  {
    icon: Users,
    title: "Collaborate on reduction",
    blurb: "Joint plans with high-impact partners",
    detail:
      "Use hotspot insights to prioritise suppliers for reduction conversations — aligned to your scope 3 targets and reporting cycles.",
    tags: ["Hotspots", "Targets", "Action plans"],
  },
];

const intensityStyles: Record<string, string> = {
  High: "bg-[#FCECEC] text-[#B42318]",
  Medium: "bg-[#FFF6E5] text-[#9A6700]",
  Low: "bg-[#E7F3ED] text-[#0A4D3E]",
};

const SupplyChainIntelligencePage = ({
  prefersReducedMotion: prefersReducedMotionProp,
}: SupplyChainIntelligencePageProps) => {
  const hookReduced = useReducedMotion();
  const prefersReducedMotion = prefersReducedMotionProp ?? !!hookReduced;
  const [tier, setTier] = useState<TierKey>("tier1");
  const [stepIndex, setStepIndex] = useState(0);
  const stepPauseUntil = useRef(0);
  const activeStep = workflow[stepIndex];
  const activeTier = tierMeta[tier];

  const selectStep = (index: number) => {
    setStepIndex(index);
    stepPauseUntil.current = Date.now() + 4500;
  };

  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = window.setInterval(() => {
      if (Date.now() < stepPauseUntil.current) return;
      setStepIndex((prev) => (prev + 1) % workflow.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [prefersReducedMotion]);

  const fadeUp = {
    initial: prefersReducedMotion ? undefined : { opacity: 0, y: 22 },
    whileInView: prefersReducedMotion ? undefined : { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.25 },
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  };

  return (
    <main className="w-full overflow-hidden">
      {/* Hero — cinematic background, same treatment as Carbon Management */}
      <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-[#061512] pt-24 pb-16 text-white sm:pt-28 sm:pb-20">
        <img
          src="/supply-chain-hero.png"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover object-center"
          decoding="async"
          fetchPriority="high"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,21,18,0.28)_0%,rgba(6,21,18,0.68)_52%,rgba(6,21,18,0.9)_100%)]"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#061512] to-transparent"
        />
        {!prefersReducedMotion && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_35%_at_50%_40%,rgba(29,158,117,0.14),transparent_70%)]"
            animate={{ opacity: [0.45, 0.75, 0.45] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        <div className="relative z-10 mx-auto flex w-full max-w-[920px] flex-col items-center px-4 text-center sm:px-6">
          <motion.div
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 14 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="mb-6 inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.22em] text-[#7ECFB8] sm:text-sm"
          >
            <Truck className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            Supply Chain Intelligence
          </motion.div>

          <motion.h1
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-[18ch] text-[2rem] font-semibold leading-[1.15] tracking-tight sm:max-w-none sm:text-[2.5rem] md:text-[3.25rem] lg:text-[3.4rem]"
          >
            Understand scope 3 across your supplier network.
          </motion.h1>

          <motion.p
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 max-w-2xl text-base leading-relaxed text-white/75 sm:mt-6 sm:text-lg md:text-xl"
          >
            Map tiers, collect supplier data in a structured way, and see which categories carry
            the most emissions — so your team knows where to focus.
          </motion.p>
        </div>
      </section>

      {/* Pillars */}
      <section className="border-y border-[#DCEAE2] bg-[#F8FCFA] py-14 sm:py-16">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-10 px-4 sm:grid-cols-3 sm:px-6 lg:gap-0 lg:px-10">
          {pillars.map((item, index) => (
            <motion.div
              key={item.title}
              {...fadeUp}
              transition={{ duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
              className={["lg:px-8", index > 0 ? "lg:border-l lg:border-[#DCEAE2]" : "lg:pl-0"].join(" ")}
            >
              <item.icon className="mb-3 h-5 w-5 text-[#1D9E75]" strokeWidth={1.75} />
              <h3 className="mb-2 text-lg font-semibold tracking-tight text-[#0A4D3E] sm:text-xl">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-[#5B6B63]">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Before / after */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-10">
          <motion.div {...fadeUp} className="mb-12 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#1D9E75]">
              The usual problem
            </p>
            <h2 className="text-[1.85rem] font-semibold tracking-tight text-[#0A4D3E] sm:text-[2.35rem]">
              Scope 3 should not live in inboxes and spreadsheets
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-[#5B6B63] sm:text-lg">
              Most upstream emissions sit outside your direct control. Without structure, procurement
              and sustainability teams end up doing the same manual outreach every year.
            </p>
          </motion.div>

          <motion.div
            {...fadeUp}
            className="grid gap-0 overflow-hidden rounded-[1.5rem] border border-[#DCEAE2] sm:grid-cols-2"
          >
            <div className="bg-[#FAFAFA] p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">Without</p>
              <ul className="mt-5 space-y-4">
                {compareRows.map((row) => (
                  <li key={row.without} className="flex items-start gap-3 text-sm text-[#6B7280]">
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-[#D1D5DB]" strokeWidth={2} />
                    <span>{row.without}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-[#DCEAE2] bg-[#F0FAF6] p-6 sm:border-l sm:border-t-0 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1D9E75]">
                With Supply Chain Intelligence
              </p>
              <ul className="mt-5 space-y-4">
                {compareRows.map((row) => (
                  <li key={row.with} className="flex items-start gap-3 text-sm font-medium text-[#0A4D3E]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#1D9E75]" strokeWidth={2.5} />
                    <span>{row.with}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Tier explorer */}
      <section className="relative overflow-hidden bg-[#F7F4EE] py-16 sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 top-16 h-56 w-56 rounded-full border border-[#1D9E75]/10"
        />
        <div className="relative z-10 mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <motion.div {...fadeUp} className="mx-auto mb-10 max-w-3xl text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#1D9E75]">
              By supplier tier
            </p>
            <h2 className="text-[1.85rem] font-semibold tracking-tight text-[#0A4D3E] sm:text-[2.35rem]">
              See where emissions add up in your network
            </h2>
            <p className="mt-4 text-base text-[#5B6B63] sm:text-lg">
              Switch tiers to explore supplier counts, response rates, and the categories that stand
              out — the same view your team uses after sign-in.
            </p>
          </motion.div>

          {/* Scope 3 share bar */}
          <motion.div
            {...fadeUp}
            className="mb-8 rounded-2xl border border-[#DCEAE2] bg-white p-5 sm:p-6"
          >
            <div className="mb-3 flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-[#0A4D3E]">Scope 3 share by tier</p>
              <p className="text-xs text-[#6B8A7E]">Illustrative network snapshot</p>
            </div>
            <div className="flex h-3 overflow-hidden rounded-full bg-[#E8F0EB]">
              {(Object.keys(tierMeta) as TierKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTier(key)}
                  style={{ width: `${tierMeta[key].share}%` }}
                  className={[
                    "h-full transition-opacity",
                    tier === key ? "bg-[#1D9E75]" : "bg-[#1D9E75]/35 hover:bg-[#1D9E75]/55",
                  ].join(" ")}
                  aria-label={`${tierMeta[key].label}: ${tierMeta[key].share}%`}
                />
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
              {(Object.keys(tierMeta) as TierKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTier(key)}
                  className={[
                    "text-xs font-medium transition",
                    tier === key ? "text-[#0A4D3E]" : "text-[#6B8A7E] hover:text-[#264E44]",
                  ].join(" ")}
                >
                  {tierMeta[key].label} · {tierMeta[key].share}%
                </button>
              ))}
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={tier}
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 12 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden rounded-[1.75rem] border border-[#DCEAE2] bg-white shadow-[0_24px_60px_-36px_rgba(12,77,62,0.28)]"
            >
              <div className="grid gap-0 lg:grid-cols-12">
                <div className="border-b border-[#E8F0EB] bg-[#F8FCFA] p-5 sm:p-6 lg:col-span-4 lg:border-b-0 lg:border-r">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1D9E75]">
                    {activeTier.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-[#0A4D3E]">{activeTier.coverage}</p>
                  <div className="mt-6 space-y-4">
                    {[
                      ["Suppliers", String(activeTier.suppliers)],
                      ["Scope 3 share", `${activeTier.share}%`],
                      ["Response rate", `${activeTier.responseRate}%`],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-[#6B8A7E]">
                          {label}
                        </p>
                        <p className="mt-0.5 text-xl font-semibold text-[#0A4D3E]">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6">
                    <div className="mb-1.5 flex justify-between text-[11px] text-[#6B8A7E]">
                      <span>Data completeness</span>
                      <span>{activeTier.responseRate}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#E8F0EB]">
                      <motion.div
                        initial={prefersReducedMotion ? undefined : { width: 0 }}
                        animate={{ width: `${activeTier.responseRate}%` }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full rounded-full bg-[#1D9E75]"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-5 sm:p-6 lg:col-span-8">
                  <h3 className="mb-5 text-base font-semibold text-[#0A4D3E]">
                    Highest-impact categories
                  </h3>
                  <div className="space-y-4">
                    {activeTier.hotspots.map((row, index) => (
                      <div key={row.name} className="rounded-xl border border-[#E8F0EB] bg-[#F8FCFA] p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1D9E75]/12 text-xs font-semibold text-[#0A4D3E]">
                              {index + 1}
                            </span>
                            <div>
                              <p className="font-medium text-[#0A4D3E]">{row.name}</p>
                              <p className="text-sm text-[#6B8A7E]">{row.category}</p>
                            </div>
                          </div>
                          <span
                            className={`self-start rounded-full px-3 py-1 text-xs font-semibold sm:self-center ${intensityStyles[row.intensity]}`}
                          >
                            {row.intensity} impact
                          </span>
                        </div>
                        <div className="mt-3">
                          <div className="mb-1 flex justify-between text-[11px] text-[#6B8A7E]">
                            <span>Share of tier emissions</span>
                            <span className="font-mono">{row.share}%</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-[#E8F0EB]">
                            <div
                              className="h-full rounded-full bg-[#1D9E75]/80"
                              style={{ width: `${row.share}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* Workflow — horizontal stepper */}
      <section id="how-it-works" className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <motion.div {...fadeUp} className="mx-auto mb-12 max-w-2xl text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#1D9E75]">
              How it works
            </p>
            <h2 className="text-[1.85rem] font-semibold tracking-tight text-[#0A4D3E] sm:text-[2.35rem]">
              From mapping suppliers to acting on the data
            </h2>
          </motion.div>

          <div className="mb-8 hidden sm:grid sm:grid-cols-4 sm:gap-2">
            {workflow.map((step, index) => {
              const StepIcon = step.icon;
              const active = stepIndex === index;
              return (
                <button
                  key={step.title}
                  type="button"
                  onClick={() => selectStep(index)}
                  className="group relative flex flex-col items-center px-2 text-center"
                >
                  {index < workflow.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute left-[calc(50%+20px)] top-5 h-px w-[calc(100%-40px)] bg-[#DCEAE2] group-hover:bg-[#B9DCCD]"
                    />
                  )}
                  <span
                    className={[
                      "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition",
                      active
                        ? "border-[#1D9E75] bg-[#1D9E75] text-white"
                        : "border-[#DCEAE2] bg-white text-[#1D9E75] group-hover:border-[#B9DCCD]",
                    ].join(" ")}
                  >
                    <StepIcon className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <span className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[#1D9E75]">
                    Step {index + 1}
                  </span>
                  <span
                    className={[
                      "mt-1 text-xs font-semibold leading-snug",
                      active ? "text-[#0A4D3E]" : "text-[#6B8A7E] group-hover:text-[#264E44]",
                    ].join(" ")}
                  >
                    {step.title}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mb-6 flex flex-wrap gap-2 sm:hidden">
            {workflow.map((step, index) => (
              <button
                key={step.title}
                type="button"
                onClick={() => selectStep(index)}
                className={[
                  "rounded-full px-3 py-1.5 text-xs font-medium transition",
                  stepIndex === index
                    ? "bg-[#0A4D3E] text-white"
                    : "border border-[#DCEAE2] bg-[#F8FCFA] text-[#264E44]",
                ].join(" ")}
              >
                Step {index + 1}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={stepIndex}
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 14 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-[1.5rem] border border-[#DCEAE2] bg-[#F8FCFA] p-6 sm:p-8"
            >
              <div className="flex items-start gap-4">
                {(() => {
                  const StepIcon = activeStep.icon;
                  return (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1D9E75]/12 text-[#1D9E75]">
                      <StepIcon className="h-5 w-5" strokeWidth={2} />
                    </span>
                  );
                })()}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1D9E75]">
                    {activeStep.blurb}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-[#0A4D3E] sm:text-2xl">
                    {activeStep.title}
                  </h3>
                  <p className="mt-3 text-base leading-relaxed text-[#4E6C63]">{activeStep.detail}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {activeStep.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-[#C5DDD2] bg-white px-3 py-1 text-xs font-medium text-[#264E44]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#DCEAE2] bg-white py-16 sm:py-20">
        <div className="mx-auto grid max-w-[1280px] items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-10">
          <motion.div {...fadeUp}>
            <h2 className="text-2xl font-semibold tracking-tight text-[#0A4D3E] sm:text-3xl md:text-4xl">
              Ready to map your supplier network?
            </h2>
            <p className="mt-4 max-w-md text-base text-[#5B6B63]">
              If you already have an account, open Supply Chain Intelligence from your dashboard.
              Otherwise, get in touch and we can walk you through how it works.
            </p>
            <ul className="mt-6 space-y-2">
              {[
                "Structured supplier questionnaires",
                "Coverage across multiple tiers",
                "Clear view of high-impact categories",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-[#264E44]">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#1D9E75]" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div {...fadeUp} className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <Button
              size="lg"
              className="rounded-full bg-[#1D9E75] px-8 py-6 font-semibold text-[#04342C] hover:bg-[#22B87E]"
              asChild
            >
              <Link to="/login">
                Open your account
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-[#0A4D3E]/25 px-8 py-6 font-semibold text-[#0A4D3E] hover:bg-[#F0FAF6]"
              asChild
            >
              <Link to="/contact">Get in touch</Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </main>
  );
};

export default SupplyChainIntelligencePage;

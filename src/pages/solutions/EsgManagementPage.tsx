import { Button } from "@/components/ui/button";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Activity,
  BarChart3,
  ClipboardCheck,
  Database,
  FileText,
  Target,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type EsgManagementPageProps = {
  prefersReducedMotion?: boolean;
};

const heroSteps = [
  "Company",
  "Industry detected",
  "Materiality assessment",
  "Priority topics",
  "Data collection",
  "AI validation",
  "KPIs",
  "Targets",
  "Dashboards",
  "IFRS report",
  "Board dashboard",
];

const pillars = [
  {
    tag: "01",
    title: "100+ ESG metrics",
    desc: "Automatically calculated across environmental, social and governance indicators.",
  },
  {
    tag: "02",
    title: "Multiple frameworks",
    desc: "One dataset, mapped across every framework you report against.",
    chips: ["IFRS S1", "IFRS S2", "GRI", "SASB", "TCFD"],
  },
  {
    tag: "03",
    title: "Continuous monitoring",
    desc: "Not annual reporting. Performance tracked as it happens.",
  },
  {
    tag: "04",
    title: "Enterprise ready",
    desc: "Built for organisations operating across many entities at once.",
    chips: ["Multi-entity", "Multi-region", "Multi-user"],
  },
];

const capabilities = [
  {
    icon: Target,
    title: "Materiality intelligence",
    desc: "Automatically identifies the sustainability topics most relevant to your industry using SASB and IFRS S1/S2 guidance.",
  },
  {
    icon: Database,
    title: "Data collection",
    desc: "Collect ESG data from ERP systems, utilities, suppliers, IoT devices and manual workflows through one centralised platform.",
  },
  {
    icon: BarChart3,
    title: "ESG performance",
    desc: "Calculate emissions, environmental indicators, social metrics, governance KPIs and climate risks with built-in methodologies.",
  },
  {
    icon: FileText,
    title: "Reporting and disclosure",
    desc: "Generate audit-ready disclosures aligned with IFRS S1, IFRS S2, GRI, SASB, CDP and TCFD.",
  },
  {
    icon: Activity,
    title: "Continuous monitoring",
    desc: "Track targets, monitor performance in real time, and identify emerging sustainability risks before reporting deadlines.",
  },
];

const journeyStages = [
  {
    title: "Assess",
    text: "Select your sector, run an AI materiality assessment, surface priority ESG topics, and map stakeholders so the programme starts from what actually matters.",
  },
  {
    title: "Collect & Validate",
    text: "Gather operational and supplier data in one place, then validate it for gaps, anomalies, and consistency before it enters your metrics and disclosures.",
  },
  {
    title: "Measure & Analyze",
    text: "Turn validated inputs into carbon calculations, ESG metrics, and scenario analysis that show where you stand and how performance could shift.",
  },
  {
    title: "Plan & Improve",
    text: "Set targets, build a decarbonization roadmap, and keep continuous monitoring in place so progress stays visible between reporting cycles.",
  },
  {
    title: "Report & Disclose",
    text: "Disclose against IFRS S2, CSRD, GRI, and CDP, then export audit-ready reports without rebuilding the evidence trail from scratch.",
  },
];

const heroLead = "Built for every stage of your".split(" ");
const heroAccent = ["sustainability", "journey."];

const heroWordContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.18 } },
};

const heroWordReveal = {
  hidden: { opacity: 0, y: 22, filter: "blur(12px)", rotateX: 28 },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    rotateX: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const heroAccentReveal = {
  hidden: { opacity: 0, y: 28, scale: 0.88, filter: "blur(14px)" },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const HeroFlowVisual = ({
  activeIndex,
  prefersReducedMotion,
}: {
  activeIndex: number;
  prefersReducedMotion: boolean;
}) => (
  <div className="relative w-full max-w-[420px] overflow-hidden rounded-[28px] border border-white/12 bg-white/[0.04] p-5 shadow-[0_30px_70px_-34px_rgba(29,158,117,0.45)] backdrop-blur-md sm:p-6">
    <div
      aria-hidden
      className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full border border-white/10"
    />
    <div
      aria-hidden
      className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rotate-45 border border-[#33C08A]/15"
    />
    <div className="relative z-10 mb-4 flex items-center justify-between">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#9FE1CB]">Live ESG flow</p>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#33C08A]/30 bg-[#1D9E75]/15 px-2.5 py-1 text-[10px] font-medium text-[#9FE1CB]">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#33C08A]" />
        Active
      </span>
    </div>
    <div className="relative z-10 flex max-h-[380px] flex-col justify-center overflow-hidden sm:max-h-[420px]">
      {heroSteps.map((step, index) => {
        const active = index === activeIndex;
        const completed = index < activeIndex;
        return (
          <div key={step}>
            <motion.div
              animate={
                prefersReducedMotion
                  ? undefined
                  : {
                      backgroundColor: active ? "rgba(29,158,117,0.18)" : "rgba(255,255,255,0)",
                      scale: active ? 1.01 : 1,
                    }
              }
              transition={{ duration: 0.3 }}
              className={[
                "flex items-center gap-3 rounded-xl px-3 py-2",
                active ? "bg-[#1D9E75]/20" : "",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-2 w-2 shrink-0 items-center justify-center rounded-full transition-all duration-300",
                  active
                    ? "bg-[#33C08A] shadow-[0_0_0_4px_rgba(51,192,138,0.25)]"
                    : completed
                      ? "bg-[#1D9E75]/70"
                      : "bg-white/25",
                ].join(" ")}
              />
              <span
                className={[
                  "text-[12.5px] transition-all duration-300 sm:text-[13px]",
                  active
                    ? "font-semibold text-white"
                    : completed
                      ? "font-medium text-[#9FE1CB]/90"
                      : "font-medium text-white/50",
                ].join(" ")}
              >
                {step}
              </span>
              {active && (
                <motion.span
                  layoutId="esg-flow-tip"
                  className="ml-auto h-1 w-1 rounded-full bg-[#33C08A]"
                />
              )}
            </motion.div>
            {index < heroSteps.length - 1 && (
              <div
                className={[
                  "ml-[15px] h-2 w-px transition-colors duration-300",
                  completed || active ? "bg-[#1D9E75]/45" : "bg-white/15",
                ].join(" ")}
                aria-hidden
              />
            )}
          </div>
        );
      })}
    </div>
  </div>
);

const EsgManagementPage = ({ prefersReducedMotion: prefersReducedMotionProp }: EsgManagementPageProps) => {
  const hookReduced = useReducedMotion();
  const prefersReducedMotion = prefersReducedMotionProp ?? !!hookReduced;
  const [heroFlowIndex, setHeroFlowIndex] = useState(0);
  const [journeyIndex, setJourneyIndex] = useState(0);
  const journeyPauseUntil = useRef(0);

  const activeJourney = journeyStages[journeyIndex];

  const selectJourney = (index: number) => {
    setJourneyIndex(index);
    journeyPauseUntil.current = Date.now() + 4000;
  };

  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = window.setInterval(() => {
      setHeroFlowIndex((prev) => (prev + 1) % heroSteps.length);
    }, 1100);
    return () => window.clearInterval(id);
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = window.setInterval(() => {
      if (Date.now() < journeyPauseUntil.current) return;
      setJourneyIndex((prev) => (prev + 1) % journeyStages.length);
    }, 1400);
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
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0a1a1d] pt-28 pb-16 text-white sm:pt-32 sm:pb-20 lg:min-h-[88vh] lg:flex lg:items-center">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(80%_70%_at_15%_20%,rgba(29,158,117,0.2),transparent_55%),radial-gradient(60%_50%_at_85%_40%,rgba(51,192,138,0.12),transparent_50%)]"
        />
        {!prefersReducedMotion && (
          <>
            <motion.div
              aria-hidden
              className="pointer-events-none absolute left-[6%] top-[28%] h-44 w-44 rounded-full border border-white/10"
              animate={{ y: [0, -16, 0], opacity: [0.2, 0.45, 0.2] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              aria-hidden
              className="pointer-events-none absolute bottom-[16%] right-[8%] h-28 w-28 rotate-45 border border-[#33C08A]/15"
              animate={{ y: [0, 12, 0], opacity: [0.15, 0.35, 0.15] }}
              transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            />
          </>
        )}

        <div className="relative z-10 mx-auto grid w-full max-w-[1280px] items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-10">
          <div>
            <motion.div
              initial={prefersReducedMotion ? undefined : { opacity: 0, x: -18, filter: "blur(8px)" }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#1D9E75]/35 bg-[#1D9E75]/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9FE1CB]"
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
              ESG Management
            </motion.div>

            <motion.h1
              variants={prefersReducedMotion ? undefined : heroWordContainer}
              initial={prefersReducedMotion ? undefined : "hidden"}
              animate={prefersReducedMotion ? undefined : "show"}
              className="max-w-xl text-3xl font-semibold leading-[1.18] tracking-tight sm:text-4xl md:text-5xl lg:text-[3.05rem]"
              style={{ perspective: 800 }}
            >
              {heroLead.map((word, i) => (
                <motion.span
                  key={`lead-${i}`}
                  variants={prefersReducedMotion ? undefined : heroWordReveal}
                  className="mr-[0.28em] inline-block whitespace-pre"
                >
                  {word}
                </motion.span>
              ))}
              {heroAccent.map((word, i) => (
                <motion.span
                  key={`accent-${i}`}
                  variants={prefersReducedMotion ? undefined : heroAccentReveal}
                  className="hero-shimmer mr-[0.28em] inline-block whitespace-pre bg-gradient-to-r from-[#33C08A] via-[#DFFBEF] to-[#33C08A] bg-clip-text pb-[0.12em] text-transparent"
                >
                  {word}
                </motion.span>
              ))}
            </motion.h1>

            <motion.p
              initial={
                prefersReducedMotion
                  ? undefined
                  : { opacity: 0, y: 16, clipPath: "inset(0 0 100% 0)" }
              }
              animate={
                prefersReducedMotion
                  ? undefined
                  : { opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)" }
              }
              transition={{ duration: 0.7, delay: 0.75, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 max-w-lg text-base leading-relaxed text-white/70 sm:text-lg"
            >
              Rethink Carbon helps organisations understand what is financially and environmentally material, automate
              ESG data collection across operations and suppliers, align with IFRS S1, IFRS S2, SASB, GRI and TCFD, and
              generate decision-ready insights, not just reports.
            </motion.p>

            <motion.div
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 18 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.95, ease: [0.22, 1, 0.36, 1] }}
              className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <motion.div
                whileHover={prefersReducedMotion ? undefined : { scale: 1.03, y: -2 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
              >
                <Button
                  size="lg"
                  className="group rounded-full bg-[#1D9E75] px-7 py-6 font-semibold text-[#04342C] shadow-[0_14px_40px_-12px_rgba(29,158,117,0.55)] hover:bg-[#22B87E]"
                  asChild
                >
                  <Link to="/contact">
                    Book a demo
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
              </motion.div>
              <motion.div
                whileHover={prefersReducedMotion ? undefined : { scale: 1.03, y: -2 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
              >
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full border-white/25 bg-transparent px-7 py-6 font-semibold text-white hover:bg-white/10 hover:text-white"
                  asChild
                >
                  <a href="#esg-capabilities">Explore the module</a>
                </Button>
              </motion.div>
            </motion.div>
          </div>

          <motion.div
            initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.92, y: 16 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="flex justify-center lg:justify-end"
          >
            <HeroFlowVisual activeIndex={heroFlowIndex} prefersReducedMotion={prefersReducedMotion} />
          </motion.div>
        </div>
      </section>

      {/* Pillars */}
      <section className="border-y border-[#DCEAE2] bg-[#F8FCFA] py-14 sm:py-16">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-10 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:gap-0 lg:px-10">
          {pillars.map((item, index) => (
            <motion.div
              key={item.tag}
              {...fadeUp}
              transition={{ duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
              className={["lg:px-6", index > 0 ? "lg:border-l lg:border-[#DCEAE2]" : "lg:pl-0"].join(" ")}
            >
              <p className="mb-2.5 font-mono text-[11px] text-[#1D9E75]">{item.tag}</p>
              <h3 className="mb-2 text-base font-semibold tracking-tight text-[#0A4D3E] sm:text-lg">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-[#5B6B63]">{item.desc}</p>
              {item.chips && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.chips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-md border border-[#DCEAE2] bg-white px-2 py-0.5 font-mono text-[10px] text-[#5B6B63]"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Capabilities */}
      <section id="esg-capabilities" className="bg-[#F8FCFA] py-16 sm:py-20">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <motion.div {...fadeUp} className="mx-auto mb-12 max-w-2xl text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#1D9E75]">Capabilities</p>
            <h2 className="text-3xl font-semibold tracking-tight text-[#0A4D3E] sm:text-4xl">
              Sustainability shouldn&apos;t start with spreadsheets.
            </h2>
          </motion.div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {capabilities.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.article
                  key={item.title}
                  {...fadeUp}
                  transition={{ duration: 0.45, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-2xl border border-[#DCEAE2] bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#1D9E75]/40 hover:shadow-[0_18px_40px_-28px_rgba(12,77,62,0.45)]"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#E7F3ED] text-[#1D9E75]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#0A4D3E] sm:text-[15px]">{item.title}</h3>
                  <p className="mt-2.5 text-[13px] leading-relaxed text-[#5B6B63]">{item.desc}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Sustainability journey */}
      <section className="relative overflow-hidden bg-[#0a1a1d] py-16 text-white sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_50%_at_50%_0%,rgba(29,158,117,0.12),transparent_55%)]"
        />
        <div className="relative z-10 mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <motion.div {...fadeUp} className="mx-auto mb-12 max-w-2xl text-center sm:mb-14">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#9FE1CB]">Lifecycle</p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">The sustainability journey</h2>
            <p className="mt-4 text-base text-white/60 sm:text-lg">
              One continuous workflow from assessment to disclosure. Select a stage to see what sits inside it.
            </p>
          </motion.div>

          <div className="relative mb-10 sm:mb-12">
            <div
              aria-hidden
              className="pointer-events-none absolute left-[2%] right-[2%] top-5 hidden h-[2px] rounded-full bg-white/10 xl:block"
            />
            <motion.div
              aria-hidden
              className="pointer-events-none absolute left-[2%] top-5 hidden h-[2px] origin-left rounded-full bg-gradient-to-r from-[#0A4D3E] via-[#1D9E75] to-[#33C08A] xl:block"
              animate={{ width: `${(journeyIndex / (journeyStages.length - 1)) * 96}%` }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              style={{ maxWidth: "96%" }}
            />
            {!prefersReducedMotion && (
              <motion.div
                aria-hidden
                className="pointer-events-none absolute top-[14px] hidden h-3 w-3 -translate-x-1/2 rounded-full bg-[#33C08A] shadow-[0_0_16px_rgba(51,192,138,0.85)] xl:block"
                animate={{
                  left: `calc(2% + ${(journeyIndex / (journeyStages.length - 1)) * 96}%)`,
                }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              />
            )}

            <div className="grid grid-cols-2 gap-x-2 gap-y-6 sm:grid-cols-3 md:grid-cols-5 xl:flex xl:items-start xl:justify-between xl:gap-0">
              {journeyStages.map((stage, index) => {
                const active = index === journeyIndex;
                const completed = index < journeyIndex;
                return (
                  <button
                    key={stage.title}
                    type="button"
                    onClick={() => selectJourney(index)}
                    className="group relative z-[1] flex flex-col items-center bg-transparent text-center xl:w-[18%]"
                  >
                    <span className="relative mb-3 flex h-10 w-10 items-center justify-center">
                      {active && !prefersReducedMotion && (
                        <motion.span
                          aria-hidden
                          className="absolute inset-[-6px] rounded-full border border-[#33C08A]/40"
                          animate={{ scale: [1, 1.25, 1], opacity: [0.55, 0, 0.55] }}
                          transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
                        />
                      )}
                      <span
                        className={[
                          "relative flex h-10 w-10 items-center justify-center rounded-full font-mono text-xs transition-all duration-300",
                          active
                            ? "bg-[#1D9E75] text-white shadow-[0_0_0_6px_rgba(29,158,117,0.18)]"
                            : completed
                              ? "border border-[#33C08A]/45 bg-[#1D9E75]/20 text-[#9FE1CB]"
                              : "border border-white/20 bg-[#0a1a1d] text-white/45 group-hover:border-white/40 group-hover:text-white",
                        ].join(" ")}
                      >
                        {completed && !active ? (
                          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
                            <path
                              d="M3.5 8.2 6.4 11l6.1-6.5"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : (
                          index + 1
                        )}
                      </span>
                    </span>
                    <span
                      className={[
                        "max-w-[7.5rem] text-[11px] leading-snug transition-colors duration-300 sm:max-w-[8.5rem]",
                        active
                          ? "font-semibold text-white"
                          : completed
                            ? "font-medium text-[#9FE1CB]/85"
                            : "font-medium text-white/45 group-hover:text-white/80",
                      ].join(" ")}
                    >
                      {stage.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeJourney.title}
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 12 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="relative overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-transparent p-7 sm:p-8 md:p-9"
            >
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#33C08A] to-transparent"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -right-6 -top-10 font-mono text-[7rem] font-semibold leading-none text-white/[0.04]"
              >
                {String(journeyIndex + 1).padStart(2, "0")}
              </div>
              <div className="relative z-10 grid gap-6 md:grid-cols-[auto_1fr] md:items-start md:gap-8">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#33C08A]/30 bg-[#1D9E75]/15 font-mono text-lg font-semibold text-[#9FE1CB]">
                  {String(journeyIndex + 1).padStart(2, "0")}
                </div>
                <div>
                  <p className="mb-2 font-mono text-[11px] tracking-[0.16em] text-[#33C08A]">
                    STAGE {String(journeyIndex + 1).padStart(2, "0")}
                  </p>
                  <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">{activeJourney.title}</h3>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">
                    {activeJourney.text}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-1.5">
                    {journeyStages.map((_, i) => (
                      <button
                        key={`journey-dot-${i}`}
                        type="button"
                        aria-label={journeyStages[i].title}
                        onClick={() => selectJourney(i)}
                        className={[
                          "h-1.5 rounded-full transition-all duration-300",
                          i === journeyIndex
                            ? "w-7 bg-[#33C08A]"
                            : i < journeyIndex
                              ? "w-3 bg-[#1D9E75]/70 hover:bg-[#33C08A]"
                              : "w-1.5 bg-white/25 hover:bg-white/45",
                        ].join(" ")}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
};

export default EsgManagementPage;

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  CloudLightning,
  FileText,
  LineChart,
} from "lucide-react";
import { useMemo, useState } from "react";

type ClimateRiskPageProps = {
  prefersReducedMotion?: boolean;
};

type RiskLevel = "High" | "Medium" | "Low" | "Minimal";
type ScenarioKey = "nz" | "delayed" | "hothouse";
type HorizonKey = "2030" | "2040" | "2050";

const scenarios: { key: ScenarioKey; label: string }[] = [
  { key: "nz", label: "1.5°C — Net Zero" },
  { key: "delayed", label: "2°C — Delayed" },
  { key: "hothouse", label: "3°C+ — Hot House" },
];

const horizons: HorizonKey[] = ["2030", "2040", "2050"];

const riskRows = [
  { id: "flood", label: "Coastal & river flooding", kind: "Physical risk" as const },
  { id: "heat", label: "Extreme heat & wildfire", kind: "Physical risk" as const },
  { id: "water", label: "Water stress", kind: "Physical risk" as const },
  { id: "carbon", label: "Carbon pricing", kind: "Transition risk" as const },
  { id: "policy", label: "Policy & regulation", kind: "Transition risk" as const },
  { id: "market", label: "Market & reputation", kind: "Transition risk" as const },
] as const;

const AGGREGATE_NOTE =
  "Physical risk rises with warming; transition risk falls as the world decarbonizes faster. Rethink Carbon quantifies both so you can plan under any scenario.";

/** Demo scenario snapshot values mirrored from the product preview. */
const demoMatrix: Record<ScenarioKey, Record<HorizonKey, { levels: RiskLevel[]; exposure: number }>> = {
  nz: {
    "2030": { levels: ["Minimal", "Minimal", "Minimal", "Medium", "Medium", "Low"], exposure: 37 },
    "2040": { levels: ["Low", "Low", "Low", "High", "High", "Medium"], exposure: 52 },
    "2050": { levels: ["Low", "Low", "Low", "Medium", "Medium", "Low"], exposure: 40 },
  },
  delayed: {
    "2030": { levels: ["Low", "Low", "Low", "Low", "Low", "Low"], exposure: 40 },
    "2040": { levels: ["Medium", "Medium", "Medium", "Medium", "Medium", "Medium"], exposure: 57 },
    "2050": { levels: ["Medium", "Medium", "Medium", "Medium", "Medium", "Medium"], exposure: 73 },
  },
  hothouse: {
    "2030": { levels: ["Medium", "Medium", "Low", "Minimal", "Minimal", "Minimal"], exposure: 37 },
    "2040": { levels: ["High", "High", "Medium", "Low", "Low", "Low"], exposure: 52 },
    "2050": { levels: ["High", "High", "Medium", "Low", "Low", "Low"], exposure: 64 },
  },
};

const levelMeta: Record<RiskLevel, { bar: string; pill: string; fill: number }> = {
  High: { bar: "bg-[#E24B4A]", pill: "bg-[#FCECEC] text-[#B42318]", fill: 92 },
  Medium: { bar: "bg-[#E8A317]", pill: "bg-[#FFF6E5] text-[#9A6700]", fill: 58 },
  Low: { bar: "bg-[#33C08A]", pill: "bg-[#E7F3ED] text-[#0A4D3E]", fill: 34 },
  Minimal: { bar: "bg-[#7BC9A8]", pill: "bg-[#EAF7F1] text-[#1D6B55]", fill: 18 },
};

const problems = [
  {
    icon: AlertCircle,
    title: "No Financial Quantification",
    desc: "Risk and disclosure are often treated separately. Technical climate models fail to translate into specific financial impacts on the balance sheet.",
  },
  {
    icon: FileText,
    title: "Generic Templates",
    desc: "Using off-the-shelf scenario templates creates reports that tick the regulatory box but provide zero strategic value to the business.",
  },
  {
    icon: LineChart,
    title: "Too Technical for the Board",
    desc: "Outputs are dense with climate science jargon, leaving executives unable to make confident capital allocation decisions.",
  },
];

const boardCapabilities = [
  {
    icon: CloudLightning,
    title: "Scenario Modelling Engine",
    desc: "Test portfolios against NGFS, IEA, and IPCC pathways. Customise variables to reflect your specific operational realities.",
  },
  {
    icon: LineChart,
    title: "Financial Quantification",
    desc: "Translate temperature pathways directly into value-at-risk (VaR), OPEX shock scenarios, and CAPEX requirements.",
  },
  {
    icon: FileText,
    title: "Integrated Disclosure",
    desc: "Outputs formatted natively for TCFD, CSRD, and ISSB frameworks. Audit-ready methodology trails included.",
  },
  {
    icon: CheckCircle2,
    title: "Executive Narratives",
    desc: "Auto-generate board-level summaries that highlight critical strategic decisions rather than just presenting raw data.",
  },
];

const ClimateRiskPage = ({ prefersReducedMotion: prefersReducedMotionProp }: ClimateRiskPageProps) => {
  const hookReduced = useReducedMotion();
  const prefersReducedMotion = prefersReducedMotionProp ?? !!hookReduced;
  const [scenario, setScenario] = useState<ScenarioKey>("hothouse");
  const [horizon, setHorizon] = useState<HorizonKey>("2050");

  const demo = useMemo(() => demoMatrix[scenario][horizon], [scenario, horizon]);

  const fadeUp = {
    initial: prefersReducedMotion ? undefined : { opacity: 0, y: 22 },
    whileInView: prefersReducedMotion ? undefined : { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.25 },
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  };

  return (
    <main className="w-full overflow-hidden">
      {/* Hero — full-bleed isometric terrain */}
      <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-[#061512] pt-24 pb-16 text-white sm:pt-28 sm:pb-20">
        <img
          src="/climate-risk-hero.png"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover object-center"
          decoding="async"
          fetchPriority="high"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,21,18,0.35)_0%,rgba(6,21,18,0.72)_55%,rgba(6,21,18,0.88)_100%)]"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#061512] to-transparent"
        />

        {!prefersReducedMotion && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_35%_at_72%_28%,rgba(255,184,0,0.12),transparent_70%)]"
            animate={{ opacity: [0.55, 0.9, 0.55] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        <div className="relative z-10 mx-auto flex w-full max-w-[920px] flex-col items-center px-4 text-center sm:px-6">
          <motion.h1
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-[18ch] text-[2rem] font-semibold leading-[1.15] tracking-tight sm:max-w-none sm:text-[2.5rem] md:text-[3.25rem] lg:text-[3.4rem]"
          >
            Physical and transition risk, modelled properly.
          </motion.h1>

          <motion.p
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 max-w-2xl text-base leading-relaxed text-white/75 sm:mt-6 sm:text-lg md:text-xl"
          >
            Scenario analysis your board can actually use for decisions, moving beyond compliance to
            strategic financial resilience.
          </motion.p>

          <motion.div
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 14 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 w-full max-w-3xl sm:mt-12"
          >
            <div className="flex flex-col items-stretch gap-3 rounded-2xl border border-white/15 bg-[#0a1a1d]/55 px-4 py-3.5 backdrop-blur-md sm:flex-row sm:items-center sm:justify-center sm:gap-0 sm:rounded-full sm:px-7 sm:py-3">
              <div className="flex items-center justify-center gap-2 whitespace-nowrap text-[14px] sm:text-[15px]">
                <span className="h-2 w-2 shrink-0 rounded-full bg-[#FFB800]" aria-hidden />
                <span className="text-white/70">Overall Exposure:</span>
                <span className="font-semibold text-[#FFB800]">Elevated</span>
              </div>
              <span aria-hidden className="mx-4 hidden h-4 w-px shrink-0 bg-white/20 sm:block" />
              <div className="flex items-center justify-center gap-1.5 whitespace-nowrap text-[14px] sm:text-[15px]">
                <span className="text-white/70">Physical:</span>
                <span className="font-semibold text-white">Moderate</span>
              </div>
              <span aria-hidden className="mx-4 hidden h-4 w-px shrink-0 bg-white/20 sm:block" />
              <div className="flex items-center justify-center gap-1.5 whitespace-nowrap text-[14px] sm:text-[15px]">
                <span className="text-white/70">Transition:</span>
                <span className="font-semibold text-[#FFB800]">Elevated</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Problem with standard risk reporting */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-10">
          <motion.div {...fadeUp} className="mb-12 text-center sm:mb-14">
            <h2 className="text-[1.85rem] font-semibold tracking-tight text-[#0A4D3E] sm:text-[2.35rem] md:text-[2.75rem]">
              The problem with standard risk reporting
            </h2>
            <div
              aria-hidden
              className="mx-auto mt-4 h-[3px] w-14 rounded-full bg-[#1D9E75]"
            />
          </motion.div>

          <div className="grid gap-10 sm:grid-cols-3 sm:gap-8">
            {problems.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  {...fadeUp}
                  transition={{ duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  className="text-center sm:text-left"
                >
                  <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#FCE8E8] text-[#E24B4A] sm:mx-0">
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <h3 className="text-[17px] font-semibold tracking-tight text-[#0A4D3E] sm:text-lg">
                    {item.title}
                  </h3>
                  <p className="mt-2.5 text-[15px] leading-relaxed text-[#5B6B63] sm:text-base">
                    {item.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Scenario tool */}
      <section className="bg-[#F8FCFA] py-16 sm:py-20">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <motion.div {...fadeUp} className="mx-auto mb-10 max-w-3xl text-center sm:mb-12">
            <h2 className="text-[1.85rem] font-semibold tracking-tight text-[#0A4D3E] sm:text-[2.35rem] md:text-[2.75rem]">
              See how exposure shifts across warming scenarios
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#5B6B63] sm:text-lg">
              Switch between warming pathways and time horizons to watch physical and transition risk
              trade places. This mirrors the scenario analysis regulators now expect under TCFD and
              ISSB.
            </p>
          </motion.div>

          <motion.div
            {...fadeUp}
            className="overflow-hidden rounded-[1.75rem] border border-[#DCEAE2] bg-white p-5 shadow-[0_24px_60px_-36px_rgba(12,77,62,0.35)] sm:p-7 lg:p-8"
          >
            <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Warming pathway">
                {scenarios.map((item) => {
                  const active = item.key === scenario;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setScenario(item.key)}
                      className={[
                        "rounded-full px-3.5 py-2 text-[13px] font-medium transition sm:px-4 sm:text-sm",
                        active
                          ? "bg-[#0a1a1d] text-white"
                          : "bg-[#EEF3F0] text-[#3D5A52] hover:bg-[#E2EBE6]",
                      ].join(" ")}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Time horizon">
                {horizons.map((year) => {
                  const active = year === horizon;
                  return (
                    <button
                      key={year}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setHorizon(year)}
                      className={[
                        "rounded-full px-4 py-2 text-[13px] font-medium transition sm:text-sm",
                        active
                          ? "bg-[#0a1a1d] text-white"
                          : "bg-[#EEF3F0] text-[#3D5A52] hover:bg-[#E2EBE6]",
                      ].join(" ")}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(240px,0.75fr)] lg:gap-8">
              <ul className="divide-y divide-[#E8EEEA]">
                {riskRows.map((row, index) => {
                  const level = demo.levels[index];
                  const styles = levelMeta[level];
                  return (
                    <motion.li
                      key={`${row.id}-${scenario}-${horizon}`}
                      initial={prefersReducedMotion ? undefined : { opacity: 0, x: -8 }}
                      animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.03 }}
                      className="flex items-center justify-between gap-5 py-3.5 first:pt-0 last:pb-0 sm:gap-6 sm:py-4"
                    >
                      <div className="min-w-[11.5rem] shrink-0 text-left sm:min-w-[14rem]">
                        <p className="whitespace-nowrap text-[15px] font-semibold text-[#0A4D3E] sm:text-base">
                          {row.label}
                        </p>
                        <p className="mt-0.5 text-[13px] text-[#7A958B] sm:text-sm">{row.kind}</p>
                      </div>
                      <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
                        <div className="h-1.5 w-full max-w-[7.5rem] overflow-hidden rounded-full bg-[#E8EEEA] sm:max-w-[9rem]">
                          <motion.div
                            className={`h-full rounded-full ${styles.bar}`}
                            initial={prefersReducedMotion ? false : { width: 0 }}
                            animate={{ width: `${styles.fill}%` }}
                            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                          />
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold sm:text-[13px] ${styles.pill}`}
                        >
                          {level}
                        </span>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>

              <AnimatePresence mode="wait">
                <motion.aside
                  key={`${scenario}-${horizon}-panel`}
                  initial={prefersReducedMotion ? undefined : { opacity: 0, y: 10 }}
                  animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.35 }}
                  className="flex flex-col justify-between rounded-[1.35rem] bg-[#0a1a1d] p-6 text-white sm:p-7"
                >
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55 sm:text-xs">
                      Aggregate exposure
                    </p>
                    <p className="mt-3 text-5xl font-semibold tracking-tight sm:text-6xl">
                      {demo.exposure}
                      <span className="text-3xl text-white/50 sm:text-4xl">%</span>
                    </p>
                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        className="h-full rounded-full bg-[#33C08A]"
                        initial={prefersReducedMotion ? false : { width: 0 }}
                        animate={{ width: `${demo.exposure}%` }}
                        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                  </div>
                  <p className="mt-8 text-[14px] leading-relaxed text-white/70 sm:text-[15px]">
                    {AGGREGATE_NOTE}
                  </p>
                </motion.aside>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Board-Ready Capabilities */}
      <section id="risk-capabilities" className="relative bg-[#F8FCFA] pb-16 sm:pb-20">
        <div className="bg-[#0a1a1d] pb-28 pt-16 text-white sm:pb-36 sm:pt-20">
          <motion.div {...fadeUp} className="mx-auto max-w-2xl px-4 text-center sm:px-6">
            <h2 className="text-[1.85rem] font-semibold tracking-tight sm:text-[2.35rem] md:text-[2.75rem]">
              Board-Ready Capabilities
            </h2>
            <p className="mt-3 text-base text-white/70 sm:text-lg">
              Robust modelling translated into financial reality.
            </p>
          </motion.div>
        </div>

        <div className="relative z-10 mx-auto -mt-20 max-w-[1100px] px-4 sm:-mt-24 sm:px-6 lg:px-10">
          <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
            {boardCapabilities.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.article
                  key={item.title}
                  {...fadeUp}
                  transition={{ duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-[1.35rem] border border-[#DCEAE2] bg-white p-6 shadow-[0_20px_50px_-32px_rgba(12,77,62,0.45)] sm:p-7"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#1D9E75] text-white">
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <h3 className="text-[17px] font-semibold tracking-tight text-[#0A4D3E] sm:text-lg">
                    {item.title}
                  </h3>
                  <p className="mt-2.5 text-[15px] leading-relaxed text-[#5B6B63] sm:text-base">
                    {item.desc}
                  </p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
};

export default ClimateRiskPage;

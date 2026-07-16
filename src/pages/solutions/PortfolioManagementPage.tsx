import { Button } from "@/components/ui/button";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, PieChart } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type PortfolioManagementPageProps = {
  prefersReducedMotion?: boolean;
};

const frameworkLogos = [
  { name: "PCAF", src: "/frameworks/PCAF.png" },
  { name: "SASB", src: "/frameworks/SASB.png" },
  { name: "Science Based Targets", src: "/frameworks/Science based targets.png" },
  { name: "TCFD", src: "/frameworks/TCFD.png" },
  { name: "CSRD", src: "/frameworks/CSRD.png" },
  { name: "ISSB", src: "/frameworks/ISSB.png" },
] as const;

const audience = [
  {
    title: "Banks & DFIs",
    desc: "Bring lending-book counterparties, credit exposure and financed emissions into one governed workspace.",
  },
  {
    title: "Asset managers",
    desc: "See portfolio-wide climate impact while keeping every holding traceable to source.",
  },
  {
    title: "Private equity & infrastructure",
    desc: "Monitor outstanding exposure and emissions performance across every investment in the book.",
  },
  {
    title: "Risk, ESG & strategy",
    desc: "Replace fragmented spreadsheets with portfolio intelligence your leadership can act on.",
  },
];

const workflow = [
  {
    title: "Build your counterparty book",
    blurb: "Register companies with sector, geography, type and credit parameters.",
    detail:
      "Add holdings one at a time or upload in bulk via CSV. Each entry captures counterparty type, sector, geography, and exposure fields including PD, LGD and tenor — the foundation for everything downstream.",
    tags: ["Manual entry", "CSV upload", "Credit parameters"],
  },
  {
    title: "Measure financed emissions",
    blurb: "Connect each position to finance and facilitated emission calculations.",
    detail:
      "Outstanding amounts update from your finance emission workflows, so portfolio totals reflect measured impact rather than manually maintained figures.",
    tags: ["Finance emissions", "Facilitated emissions", "PCAF-aligned"],
  },
  {
    title: "Stress-test the portfolio",
    blurb: "Run scenario analysis and surface hotspots by sector or region.",
    detail:
      "Send counterparty data from My Portfolio straight into climate stress testing — physical and transition risk expressed as financial exposure your risk team can use.",
    tags: ["Scenario analysis", "Hotspot mapping", "TCFD-ready"],
  },
  {
    title: "Report and investigate",
    blurb: "Export portfolio summaries and open any company for the full picture.",
    detail:
      "Generate a portfolio PDF from the dashboard, then drill into individual companies for emissions results, exposure detail and the actions that follow.",
    tags: ["PDF export", "Company drill-down", "Audit trail"],
  },
];

const capabilities = [
  {
    title: "Counterparty registry",
    desc: "One register for every name in the book — sector, geography, type and ownership in a single view.",
  },
  {
    title: "Exposure tracking",
    desc: "PD, LGD, tenor and outstanding balances on each position, ready for emissions and risk workflows.",
  },
  {
    title: "Financed & facilitated emissions",
    desc: "Tie portfolio entries to the finance emission engine so climate impact stays linked to real balances.",
  },
  {
    title: "Bulk CSV import",
    desc: "Load large books in one pass instead of rebuilding the portfolio row by row.",
  },
  {
    title: "Portfolio reporting",
    desc: "Produce PDF summaries of holdings, exposures and data quality for internal review or disclosure.",
  },
  {
    title: "Integrated risk analysis",
    desc: "Push portfolio data into climate stress testing without re-keying counterparties elsewhere.",
  },
];

const mockRows = [
  { name: "Northwind Manufacturing", type: "Corporate", sector: "Industrials", geo: "Pakistan", amount: "24.5M" },
  { name: "Gulf Energy Holdings", type: "Corporate", sector: "Energy", geo: "UAE", amount: "18.2M" },
  { name: "Meridian Retail Group", type: "SME", sector: "Consumer", geo: "United Kingdom", amount: "9.1M" },
  { name: "Sovereign Infrastructure Fund", type: "Sovereign", sector: "Infrastructure", geo: "Singapore", amount: "42.0M" },
];

const PortfolioDashboardMock = ({ prefersReducedMotion }: { prefersReducedMotion: boolean }) => (
  <div className="relative mx-auto w-full max-w-[520px]">
    <div className="overflow-hidden rounded-[28px] border border-white/15 bg-[#0a1a1d]/80 shadow-[0_30px_70px_-34px_rgba(29,158,117,0.55)] backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#1D9E75]/10 px-5 py-3.5">
        <div>
          <p className="text-sm font-semibold text-white">My Portfolio</p>
          <p className="text-[11px] text-[#9FE1CB]">4 counterparties · PKR</p>
        </div>
        <span className="rounded-full bg-[#1D9E75]/25 px-2.5 py-1 font-mono text-[10px] text-[#9FE1CB]">Live</span>
      </div>
      <div className="space-y-2 p-4 sm:p-5">
        {mockRows.map((row, i) => (
          <motion.div
            key={row.name}
            initial={prefersReducedMotion ? undefined : { opacity: 0, x: 12 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.15 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-white">{row.name}</p>
                <p className="mt-0.5 text-[11px] text-white/55">
                  {row.sector} · {row.geo}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-[12px] font-semibold text-[#9FE1CB]">{row.amount}</p>
                <span className="mt-0.5 inline-block rounded-md bg-[#1D9E75]/15 px-1.5 py-0.5 text-[10px] text-[#9FE1CB]">
                  {row.type}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-white/10 bg-[#1D9E75]/5 px-4 py-3 sm:px-5">
        {["Portfolio report", "Risk analysis"].map((action) => (
          <span
            key={action}
            className="rounded-lg border border-[#1D9E75]/30 bg-[#1D9E75]/10 px-3 py-2 text-center text-[11px] font-medium text-[#9FE1CB]"
          >
            {action}
          </span>
        ))}
      </div>
    </div>
  </div>
);

const PortfolioManagementPage = ({
  prefersReducedMotion: prefersReducedMotionProp,
}: PortfolioManagementPageProps) => {
  const hookReduced = useReducedMotion();
  const prefersReducedMotion = prefersReducedMotionProp ?? !!hookReduced;
  const [stepIndex, setStepIndex] = useState(0);
  const stepPauseUntil = useRef(0);
  const activeStep = workflow[stepIndex];

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
      {/* Split hero — full viewport */}
      <section className="relative box-border flex min-h-[100svh] items-center overflow-hidden bg-[#061512] pt-24 pb-16 text-white sm:pt-28 sm:pb-20">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(80%_70%_at_15%_20%,rgba(29,158,117,0.28),transparent_55%),radial-gradient(60%_50%_at_85%_40%,rgba(51,192,138,0.16),transparent_50%)]"
        />
        <div className="relative z-10 mx-auto grid w-full max-w-[1280px] items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:px-10">
          <div>
            <motion.div
              initial={prefersReducedMotion ? undefined : { opacity: 0, x: -18, filter: "blur(8px)" }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.55 }}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#1D9E75]/35 bg-[#1D9E75]/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9FE1CB]"
            >
              <PieChart className="h-3.5 w-3.5" />
              Portfolio Management
            </motion.div>

            <motion.h1
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.08 }}
              className="max-w-xl text-3xl font-semibold leading-[1.18] tracking-tight sm:text-4xl md:text-5xl lg:text-[2.85rem]"
            >
              Portfolio-level climate intelligence,{" "}
              <span className="bg-gradient-to-r from-[#33C08A] via-[#DFFBEF] to-[#33C08A] bg-clip-text text-transparent">
                one view
              </span>{" "}
              across your entire book.
            </motion.h1>

            <motion.p
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 max-w-lg text-base leading-relaxed text-white/70 sm:text-lg"
            >
              Track counterparties and exposures, quantify financed and facilitated emissions, and
              run scenario analysis — all from the My Portfolio workspace inside Rethink Carbon.
            </motion.p>

            <motion.div
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 18 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="mt-9 flex flex-col gap-3 sm:flex-row"
            >
              <Button
                size="lg"
                className="group rounded-full bg-[#1D9E75] px-7 py-6 font-semibold text-[#04342C] shadow-[0_14px_40px_-12px_rgba(29,158,117,0.55)] hover:bg-[#22B87E]"
                asChild
              >
                <Link to="/contact">
                  Speak to an expert
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full border-white/25 bg-transparent px-7 py-6 font-semibold text-white hover:bg-white/10 hover:text-white"
                asChild
              >
                <a href="#how-it-works">Explore the module</a>
              </Button>
            </motion.div>
          </div>

          <motion.div
            initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.97, y: 16 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="flex justify-center lg:justify-end"
          >
            <PortfolioDashboardMock prefersReducedMotion={prefersReducedMotion} />
          </motion.div>
        </div>
      </section>

      {/* Framework logos */}
      <section className="overflow-hidden border-b border-gray-200 bg-white py-12">
        <div className="relative">
          <div
            className={prefersReducedMotion ? "flex flex-wrap justify-center gap-4 px-4" : "flex animate-scroll-logos"}
          >
            {(prefersReducedMotion ? frameworkLogos : [...frameworkLogos, ...frameworkLogos]).map(
              (logo, index) => (
                <div
                  key={`${logo.name}-${index}`}
                  className="mx-8 flex h-[120px] w-[200px] flex-shrink-0 items-center justify-center"
                >
                  <img
                    src={logo.src}
                    alt={logo.name}
                    className="max-h-full max-w-full object-contain opacity-70 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
                  />
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="relative overflow-hidden bg-[#F8FCFA] py-16 sm:py-20">
        <div className="relative z-10 mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <motion.div {...fadeUp} className="mx-auto mb-12 max-w-2xl text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#1D9E75]">
              Who it&apos;s for
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-[#0A4D3E] sm:text-4xl">
              Who uses Portfolio Management
            </h2>
            <p className="mt-4 text-base text-[#5B6B63] sm:text-lg">
              For teams that need a defensible picture of climate exposure across lending,
              investment and capital markets — without rebuilding the book in spreadsheets every
              quarter.
            </p>
          </motion.div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {audience.map((item, index) => (
              <motion.article
                key={item.title}
                {...fadeUp}
                transition={{ duration: 0.45, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-2xl border border-[#DCEAE2] bg-white p-6 transition-all duration-300 hover:border-[#1D9E75]/35 hover:shadow-[0_18px_40px_-28px_rgba(12,77,62,0.35)]"
              >
                <h3 className="text-base font-semibold text-[#0A4D3E]">{item.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-[#5B6B63]">{item.desc}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative overflow-hidden bg-[#F7F4EE] py-16 sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 top-10 h-64 w-64 rounded-full border border-[#1D9E75]/10"
        />
        <div className="relative z-10 mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <motion.div {...fadeUp} className="mb-10 max-w-2xl sm:mb-12">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#1D9E75]">
              How it works
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-[#0A4D3E] sm:text-4xl">
              How My Portfolio works
            </h2>
            <p className="mt-4 text-base text-[#4E6C63] sm:text-lg">
              From counterparty intake to emissions, stress testing and reporting — the same flow
              financial institution users follow after sign-in.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
            <div className="flex flex-col gap-1 lg:col-span-5">
              {workflow.map((item, index) => {
                const active = index === stepIndex;
                return (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => selectStep(index)}
                    onMouseEnter={() => {
                      if (!prefersReducedMotion) selectStep(index);
                    }}
                    className={[
                      "group w-full border-l-2 px-4 py-4 text-left transition-all duration-300 sm:px-5",
                      active
                        ? "border-[#1D9E75] bg-white/80"
                        : "border-transparent hover:border-[#D5E5DD] hover:bg-white/50",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "block text-sm font-semibold sm:text-base",
                        active ? "text-[#0A4D3E]" : "text-[#3F5E54]",
                      ].join(" ")}
                    >
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-[#7A958B] sm:text-sm">
                      {item.blurb}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="lg:col-span-7">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep.title}
                  initial={prefersReducedMotion ? undefined : { opacity: 0, y: 14, scale: 0.985 }}
                  animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0, y: -10 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="relative overflow-hidden rounded-[28px] border border-[#2F8F6D]/25 bg-[linear-gradient(145deg,#0A4D3E_0%,#11684E_55%,#1D9E75_100%)] p-7 text-white shadow-[0_24px_60px_-28px_rgba(10,77,62,0.55)] sm:p-9"
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full border border-white/15"
                  />
                  <div className="relative z-10">
                    <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                      {activeStep.title}
                    </h3>
                    <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/75 sm:text-base">
                      {activeStep.detail}
                    </p>
                    <div className="mt-7 flex flex-wrap gap-2">
                      {activeStep.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-[#E6F6EF] backdrop-blur-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section id="capabilities" className="relative overflow-hidden bg-[#F8FCFA] py-16 sm:py-20">
        <div className="relative z-10 mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <motion.div {...fadeUp} className="mx-auto mb-12 max-w-2xl text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#1D9E75]">
              In the product
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-[#0A4D3E] sm:text-4xl">
              Everything in the My Portfolio workspace
            </h2>
            <div aria-hidden className="mx-auto mt-4 h-[3px] w-14 rounded-full bg-[#1D9E75]" />
            <p className="mx-auto mt-4 max-w-xl text-base text-[#5B6B63] sm:text-lg">
              Counterparty management, emissions linkage, reporting and risk analysis — not a
              separate spreadsheet layer on top.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((item, index) => (
              <motion.article
                key={item.title}
                {...fadeUp}
                transition={{ duration: 0.45, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-2xl border border-[#DCEAE2] bg-white p-6 transition-all duration-300 hover:border-[#1D9E75]/35 hover:shadow-[0_18px_40px_-28px_rgba(12,77,62,0.35)]"
              >
                <h3 className="text-base font-semibold tracking-tight text-[#0A4D3E]">{item.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-[#5B6B63]">{item.desc}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#EEF4F1] pb-16 pt-4 sm:pb-20">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <motion.div
            {...fadeUp}
            className="relative overflow-hidden rounded-[30px] border border-[#2F8F6D]/30 bg-[linear-gradient(140deg,#0A4D3E_0%,#11684E_52%,#22B87E_100%)] px-6 py-14 text-center text-white shadow-[0_18px_45px_rgba(10,77,62,0.30)] sm:px-10 md:py-16"
          >
            <h2 className="relative z-10 mb-4 text-2xl font-semibold sm:text-3xl md:text-4xl">
              Ready to manage your book in one place?
            </h2>
            <p className="relative z-10 mx-auto mb-8 max-w-2xl text-base text-[#E6F6EF] sm:text-lg">
              Talk to our team about Portfolio Management, or sign in to open My Portfolio with your
              existing account.
            </p>
            <div className="relative z-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Button
                size="lg"
                className="rounded-full bg-[#124740] px-8 py-6 font-semibold text-white hover:bg-[#0F3B35]"
                asChild
              >
                <Link to="/contact">
                  Book a demo
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full border-white/40 bg-transparent px-8 py-6 font-semibold text-white hover:bg-white/10 hover:text-white"
                asChild
              >
                <Link to="/login">Sign in to My Portfolio</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
};

export default PortfolioManagementPage;

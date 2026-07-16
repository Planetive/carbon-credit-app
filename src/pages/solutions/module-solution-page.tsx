import { Button } from "@/components/ui/button";
import MainHeader from "@/components/layout/MainHeader";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  flowSteps,
  solutionModuleOrder,
  solutionModules,
  type SolutionModuleKey,
} from "./moduleSolutionsData";
import DigitalMrvPage from "./DigitalMrvPage";
import EsgManagementPage from "./EsgManagementPage";
import CarbonAccountingPage from "./CarbonAccountingPage";
import CarbonManagementPage from "./CarbonManagementPage";
import PortfolioManagementPage from "./PortfolioManagementPage";
import AiCarbonConsultantPage from "./AiCarbonConsultantPage";
import CarbonMarketsPage from "./CarbonMarketsPage";
import SupplyChainIntelligencePage from "./SupplyChainIntelligencePage";
import ClimateRiskPage from "./ClimateRiskPage";

const isModuleKey = (value?: string): value is SolutionModuleKey =>
  !!value && solutionModuleOrder.includes(value as SolutionModuleKey);

const ModuleSolutionPage = () => {
  const { moduleKey } = useParams<{ moduleKey: string }>();
  const prefersReducedMotion = useReducedMotion();

  if (!isModuleKey(moduleKey)) {
    return <Navigate to="/solutions/modules/ai" replace />;
  }

  const current = solutionModules[moduleKey];
  const animatedY = prefersReducedMotion ? 0 : 18;

  if (current.key === "esg") {
    return (
      <div
        className="min-h-screen overflow-x-hidden bg-[#F8FCFA] text-[#0B2B24]"
        style={{ fontFamily: "'Manrope', 'Inter', sans-serif" }}
      >
        <MainHeader />
        <EsgManagementPage prefersReducedMotion={!!prefersReducedMotion} />
      </div>
    );
  }

  if (current.key === "mrv") {
    return (
      <div
        className="min-h-screen overflow-x-hidden bg-[#F8FCFA] text-[#0B2B24]"
        style={{ fontFamily: "'Manrope', 'Inter', sans-serif" }}
      >
        <MainHeader />
        <DigitalMrvPage prefersReducedMotion={!!prefersReducedMotion} />
      </div>
    );
  }

  if (current.key === "accounting") {
    return (
      <div
        className="min-h-screen overflow-x-hidden bg-[#F8FCFA] text-[#0B2B24]"
        style={{ fontFamily: "'Manrope', 'Inter', sans-serif" }}
      >
        <MainHeader />
        <CarbonAccountingPage prefersReducedMotion={!!prefersReducedMotion} />
      </div>
    );
  }

  if (current.key === "risk") {
    return (
      <div
        className="min-h-screen overflow-x-hidden bg-[#F8FCFA] text-[#0B2B24]"
        style={{ fontFamily: "'Manrope', 'Inter', sans-serif" }}
      >
        <MainHeader />
        <ClimateRiskPage prefersReducedMotion={!!prefersReducedMotion} />
      </div>
    );
  }

  if (current.key === "management") {
    return (
      <div
        className="min-h-screen overflow-x-hidden bg-[#F8FCFA] text-[#0B2B24]"
        style={{ fontFamily: "'Manrope', 'Inter', sans-serif" }}
      >
        <MainHeader />
        <CarbonManagementPage prefersReducedMotion={!!prefersReducedMotion} />
      </div>
    );
  }

  if (current.key === "portfolio") {
    return (
      <div
        className="min-h-screen overflow-x-hidden bg-[#F8FCFA] text-[#0B2B24]"
        style={{ fontFamily: "'Manrope', 'Inter', sans-serif" }}
      >
        <MainHeader />
        <PortfolioManagementPage prefersReducedMotion={!!prefersReducedMotion} />
      </div>
    );
  }

  if (current.key === "ai") {
    return (
      <div
        className="min-h-screen overflow-x-hidden bg-[#F8FCFA] text-[#0B2B24]"
        style={{ fontFamily: "'Manrope', 'Inter', sans-serif" }}
      >
        <MainHeader />
        <AiCarbonConsultantPage prefersReducedMotion={!!prefersReducedMotion} />
      </div>
    );
  }

  if (current.key === "markets") {
    return (
      <div
        className="min-h-screen overflow-x-hidden bg-[#F8FCFA] text-[#0B2B24]"
        style={{ fontFamily: "'Manrope', 'Inter', sans-serif" }}
      >
        <MainHeader />
        <CarbonMarketsPage prefersReducedMotion={!!prefersReducedMotion} />
      </div>
    );
  }

  if (current.key === "supplychain") {
    return (
      <div
        className="min-h-screen overflow-x-hidden bg-[#F8FCFA] text-[#0B2B24]"
        style={{ fontFamily: "'Manrope', 'Inter', sans-serif" }}
      >
        <MainHeader />
        <SupplyChainIntelligencePage prefersReducedMotion={!!prefersReducedMotion} />
      </div>
    );
  }

  const ModuleIcon = current.icon;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F8FCFA] text-[#0B2B24]">
      <MainHeader />

      <main className="w-full pb-24 pt-24">
        <section className="relative w-full overflow-hidden border-y border-white/20 bg-[radial-gradient(circle_at_25%_20%,rgba(56,189,149,0.20),rgba(8,26,23,0)_45%),linear-gradient(145deg,#0A1F1C_5%,#0B2B24_55%,#103C33_100%)] py-12 text-white shadow-[0_25px_80px_-32px_rgba(8,26,23,0.8)] sm:py-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full border border-white/20"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-12 -left-8 h-36 w-36 rounded-full border border-white/15"
          />

          <div className="relative z-10 mx-auto grid w-full max-w-[1280px] gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:px-10">
            <motion.div
              initial={{ opacity: 0, y: animatedY }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="lg:col-span-7"
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#A8EAD2]">
                <ModuleIcon className="h-3.5 w-3.5" />
                {current.kicker}
              </div>
              <h1 className="max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                {current.headline}
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base">
                {current.subhead}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button className="bg-[#1D9E75] hover:bg-[#168661] text-white shadow-[0_16px_36px_-20px_rgba(29,158,117,0.85)]" asChild>
                  <Link to="/contact">Request demo</Link>
                </Button>
                <Button
                  className="border-white/30 bg-transparent text-white hover:bg-white/10"
                  variant="outline"
                  asChild
                >
                  <Link to="/pricing">Watch product tour</Link>
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: animatedY + 8, scale: prefersReducedMotion ? 1 : 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.75, ease: "easeOut", delay: 0.08 }}
              className="relative lg:col-span-5"
            >
              <div className="rounded-[1.6rem] border border-white/15 bg-[#0D2E28]/80 p-5 backdrop-blur-md">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.16em] text-[#9ADCC6]">Live module preview</p>
                  <Sparkles className="h-4 w-4 text-[#9ADCC6]" />
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-white/60">{current.preview[0]}</div>
                  <div className="mt-1 text-2xl font-semibold">{current.preview[1]}</div>
                  <div className="mt-1 text-sm text-white/70">{current.previewNote}</div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {current.stats.map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <p className="text-[11px] text-white/60">{label}</p>
                      <p className="mt-1 text-lg font-semibold leading-tight">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 h-14 overflow-hidden rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="relative h-full w-full">
                    <motion.div
                      aria-hidden
                      className="absolute inset-y-0 left-0 w-[170%] bg-[linear-gradient(90deg,rgba(29,158,117,0)_0%,rgba(29,158,117,0.65)_35%,rgba(145,236,205,0.75)_65%,rgba(29,158,117,0)_100%)]"
                      animate={prefersReducedMotion ? undefined : { x: ["-40%", "10%"] }}
                      transition={prefersReducedMotion ? undefined : { duration: 3.4, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="mx-auto mt-16 grid w-full max-w-[1280px] gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: animatedY }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="lg:col-span-4 lg:sticky lg:top-28 lg:self-start"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1D9E75]">Business challenge</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">The problem it solves</h2>
            <p className="mt-4 max-w-md text-sm text-[#4E6C63] sm:text-base">
              Executives do not lack data. They need clear priorities, timing, and confidence in the next move.
            </p>
          </motion.div>

          <div className="relative lg:col-span-8">
            <div aria-hidden className="absolute bottom-0 left-[10px] top-0 hidden w-px bg-gradient-to-b from-[#1D9E75]/0 via-[#1D9E75]/35 to-[#1D9E75]/0 sm:block" />
            <div className="space-y-4">
              {current.challenges.map((challenge, index) => (
                <motion.div
                  key={challenge}
                  initial={{ opacity: 0, y: animatedY }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.45, delay: index * 0.05, ease: "easeOut" }}
                  className="group relative rounded-2xl border border-[#DCEAE2] bg-white p-5 shadow-[0_12px_30px_-24px_rgba(12,77,62,0.5)] transition hover:-translate-y-0.5 hover:border-[#B9DCCD]"
                >
                  <span className="absolute left-[7px] top-6 hidden h-2.5 w-2.5 rounded-full bg-[#1D9E75] sm:block" />
                  <p className="text-sm font-medium text-[#264E44] sm:pl-8 sm:text-base">{challenge}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-12 w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <div className="rounded-[1.75rem] border border-[#DCEAE2] bg-white p-6 shadow-[0_12px_36px_-24px_rgba(12,77,62,0.45)] sm:p-8">
            <h2 className="text-2xl font-semibold sm:text-3xl">How Rethink Carbon solves it</h2>
            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {flowSteps.map((step, index) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: animatedY }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 0.4, delay: index * 0.06, ease: "easeOut" }}
                  className="relative rounded-xl border border-[#DDEBE3] bg-[#F1F8F4] p-4"
                >
                  <span className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#1D9E75] text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#165F4B]">{step}</p>
                  {index < flowSteps.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute right-[-8px] top-1/2 hidden h-px w-4 -translate-y-1/2 bg-[#1D9E75]/35 lg:block"
                    />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-12 grid w-full max-w-[1280px] gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: animatedY }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="rounded-[1.5rem] bg-[#0A1A1D] p-6 text-white shadow-[0_18px_40px_-22px_rgba(8,26,23,0.85)]"
          >
            <p className="text-xs text-white/60">Executive summary</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {current.stats.map(([label, value]) => (
                <div key={label} className="rounded-xl bg-white/10 p-4">
                  <p className="text-xs text-white/60">{label}</p>
                  <p className="mt-1 text-2xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: animatedY }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.5, delay: 0.08, ease: "easeOut" }}
            className="rounded-[1.5rem] border border-[#DCEAE2] bg-white p-6 shadow-[0_10px_34px_-22px_rgba(12,77,62,0.5)]"
          >
            <h3 className="text-lg font-semibold">Business outcomes</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {current.outcomes.map((outcome) => (
                <div key={outcome} className="flex items-center gap-2 rounded-lg bg-[#F3F9F5] p-3 text-sm font-medium text-[#264E44]">
                  <CheckCircle2 className="h-4 w-4 text-[#1D9E75]" />
                  <span>{outcome}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        <section className="mx-auto mt-12 w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <h2 className="text-2xl font-semibold sm:text-3xl">Enterprise capabilities</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {current.capabilities.map(([title, body], index) => (
              <motion.article
                key={title}
                initial={{ opacity: 0, y: animatedY }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.45, delay: index * 0.06, ease: "easeOut" }}
                className="rounded-2xl border border-[#DCEAE2] bg-white p-5 shadow-[0_10px_30px_-22px_rgba(12,77,62,0.45)]"
              >
                <h3 className="flex items-center gap-2 text-base font-semibold text-[#1A4A3E]">
                  <Sparkles className="h-4 w-4 text-[#1D9E75]" />
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#4E6C63]">{body}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-12 w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: animatedY }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="rounded-[2rem] bg-[linear-gradient(140deg,#0A4D3E_0%,#11684E_52%,#22B87E_100%)] px-6 py-10 text-center text-white shadow-[0_18px_44px_-24px_rgba(10,77,62,0.55)] sm:px-10"
          >
            <h2 className="text-2xl font-semibold">See how this works with your own sustainability data</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-white/85 sm:text-base">
              We tailor this module to your operating model, reporting requirements, and decision workflows.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button className="bg-[#124740] hover:bg-[#0F3B35] text-white" asChild>
                <Link to="/contact">
                  Book a strategy session <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" className="border-white/45 bg-transparent text-white hover:bg-white/10" asChild>
                <Link to="/contact">
                  Talk to an expert <CheckCircle2 className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
};

export default ModuleSolutionPage;

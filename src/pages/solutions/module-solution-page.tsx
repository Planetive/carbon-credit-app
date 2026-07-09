import { Button } from "@/components/ui/button";
import MainHeader from "@/components/layout/MainHeader";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  flowSteps,
  solutionModuleOrder,
  solutionModules,
  type SolutionModule,
  type SolutionModuleKey,
} from "./moduleSolutionsData";

const isModuleKey = (value?: string): value is SolutionModuleKey =>
  !!value && solutionModuleOrder.includes(value as SolutionModuleKey);

type EsgPageProps = {
  current: SolutionModule;
  animatedY: number;
  prefersReducedMotion: boolean;
};

const ESGManagementRedesignedPage = ({ current, animatedY, prefersReducedMotion }: EsgPageProps) => {
  const ModuleIcon = current.icon;
  const refinedChallenges = [
    "ESG evidence sits in disconnected systems with no shared source of truth.",
    "Reporting remains manually assembled, delaying board and investor decisions.",
    "Leadership lacks a live view of where governance and disclosure are exposed.",
    "Teams cannot clearly benchmark ESG maturity against credible peer baselines.",
  ];
  const refinedCapabilities = [
    ["Maturity intelligence model", "A continuously updated view across governance, strategy, risk, and disclosure depth."],
    ["Peer-position benchmarking", "Contextual comparison against sector norms so leaders can calibrate ambition with confidence."],
    ["Decision-grade gap ranking", "Prioritised recommendations that sequence work by impact, urgency, and implementation effort."],
    ["AI strategy co-pilot", "Generates tailored next actions from your ESG data and explains the rationale for leadership teams."],
  ];
  const refinedOutcomes = [
    "Board packs prepared in days, not reporting cycles.",
    "Higher investor confidence through transparent ESG progress.",
    "A sharper improvement roadmap aligned to material priorities.",
    "Audit readiness strengthened with traceable evidence.",
  ];

  return (
    <main className="w-full overflow-hidden pb-24 pt-20">
      <section className="relative min-h-[92vh] w-full overflow-hidden bg-[#0A1A1D] text-white">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(85%_80%_at_14%_4%,rgba(29,158,117,0.28),rgba(10,26,29,0)_60%),radial-gradient(80%_70%_at_85%_18%,rgba(93,202,165,0.16),rgba(10,26,29,0)_62%),linear-gradient(180deg,#0A1A1D_0%,#0A1A1D_54%,#0B2B24_100%)]"
        />
        <motion.div
          aria-hidden
          className="absolute inset-0 opacity-55"
          animate={prefersReducedMotion ? undefined : { backgroundPosition: ["0% 0%", "100% 100%"] }}
          transition={prefersReducedMotion ? undefined : { duration: 26, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
          style={{
            backgroundImage:
              "linear-gradient(120deg, rgba(29,158,117,0.08) 0%, rgba(29,158,117,0) 45%, rgba(93,202,165,0.09) 100%)",
            backgroundSize: "200% 200%",
          }}
        />
        <motion.div
          aria-hidden
          className="absolute -left-20 top-[35%] h-64 w-64 rounded-full border border-white/10"
          animate={prefersReducedMotion ? undefined : { y: [0, -20, 0], opacity: [0.3, 0.55, 0.3] }}
          transition={prefersReducedMotion ? undefined : { duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="absolute -right-12 top-16 h-72 w-72 rounded-full border border-white/10"
          animate={prefersReducedMotion ? undefined : { y: [0, 16, 0], opacity: [0.22, 0.44, 0.22] }}
          transition={prefersReducedMotion ? undefined : { duration: 8.2, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative z-10 mx-auto grid w-full max-w-[1360px] gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-12 lg:pb-24 lg:pt-20 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: animatedY }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.62, ease: "easeOut" }}
            className="lg:col-span-7"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#96E0C7]">
              <ModuleIcon className="h-3.5 w-3.5" />
              {current.kicker}
            </div>
            <h1 className="mt-6 max-w-5xl text-4xl font-semibold leading-[0.93] tracking-tight sm:text-5xl lg:text-7xl">
              Build ESG confidence the board can act on.
            </h1>
            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base">
              Replace fragmented ESG reporting with a living intelligence layer that shows maturity, prioritises gaps, and guides next decisions with evidence.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button className="bg-[#1D9E75] text-white shadow-[0_20px_40px_-22px_rgba(29,158,117,0.9)] hover:bg-[#168661]" asChild>
                <Link to="/contact">Request demo</Link>
              </Button>
              <Button className="border-white/30 bg-transparent text-white hover:bg-white/10" variant="outline" asChild>
                <Link to="/pricing">Watch product tour</Link>
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: animatedY + 10, scale: prefersReducedMotion ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.05, ease: "easeOut" }}
            className="lg:col-span-5"
          >
            <div className="relative rounded-[1.9rem] border border-white/15 bg-white/5 p-5 shadow-[0_30px_70px_-34px_rgba(93,202,165,0.35)] backdrop-blur-md">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.18em] text-[#9ADCC6]">Executive preview</p>
                <Sparkles className="h-4 w-4 text-[#9ADCC6]" />
              </div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-4">
                <div className="text-xs text-white/60">{current.preview[0]}</div>
                <div className="mt-1 text-3xl font-semibold">{current.preview[1]}</div>
                <div className="mt-1 text-sm text-white/70">{current.previewNote}</div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {current.stats.map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <p className="text-[11px] text-white/55">{label}</p>
                    <p className="mt-1 text-lg font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 h-16 overflow-hidden rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="relative h-full">
                  <motion.div
                    aria-hidden
                    className="absolute inset-y-0 left-[-45%] w-[190%] bg-[linear-gradient(90deg,rgba(29,158,117,0)_0%,rgba(29,158,117,0.65)_35%,rgba(154,220,198,0.8)_55%,rgba(29,158,117,0)_95%)]"
                    animate={prefersReducedMotion ? undefined : { x: ["-25%", "22%"] }}
                    transition={prefersReducedMotion ? undefined : { duration: 4.2, repeat: Infinity, ease: "linear" }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="relative mx-auto mt-16 grid w-full max-w-[1360px] gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:px-10">
        <div aria-hidden className="pointer-events-none absolute -left-14 top-20 h-40 w-40 rounded-full bg-[#1D9E75]/10 blur-3xl" />
        <motion.div
          initial={{ opacity: 0, y: animatedY }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="lg:col-span-4 lg:sticky lg:top-28 lg:self-start"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1D9E75]">Leadership reality</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">The friction behind ESG decisions</h2>
          <p className="mt-4 text-sm text-[#4E6C63] sm:text-base">
            Strategy teams are not short on data. They are short on clarity, sequencing, and confidence in what to tackle first.
          </p>
        </motion.div>
        <div className="relative space-y-4 lg:col-span-8">
          <div aria-hidden className="absolute bottom-1 left-3 top-1 hidden w-px bg-gradient-to-b from-[#1D9E75]/0 via-[#1D9E75]/40 to-[#1D9E75]/0 sm:block" />
          {refinedChallenges.map((challenge, index) => (
            <motion.div
              key={challenge}
              initial={{ opacity: 0, y: animatedY }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.28 }}
              transition={{ duration: 0.45, delay: index * 0.06, ease: "easeOut" }}
              className="relative rounded-2xl border border-[#DCEAE2] bg-white p-5 shadow-[0_18px_34px_-24px_rgba(12,77,62,0.45)] transition-transform duration-300 hover:-translate-y-0.5"
            >
              <span className="absolute left-[10px] top-7 hidden h-2.5 w-2.5 rounded-full bg-[#1D9E75] sm:block" />
              <p className="text-sm font-medium text-[#264E44] sm:pl-8 sm:text-base">{challenge}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="relative mx-auto mt-14 w-full max-w-[1360px] px-4 sm:px-6 lg:px-10">
        <div aria-hidden className="pointer-events-none absolute -right-12 top-8 h-44 w-44 rounded-full bg-[#1D9E75]/10 blur-3xl" />
        <div className="relative rounded-[1.9rem] border border-[#DCEAE2] bg-white p-6 shadow-[0_16px_44px_-28px_rgba(12,77,62,0.44)] sm:p-8">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1D9E75]">Operating model</p>
              <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">How the ESG engine works</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-3">
              {flowSteps.map((step, index) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: animatedY }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 0.4, delay: index * 0.06, ease: "easeOut" }}
                  className="rounded-xl border border-[#DDEBE3] bg-[#F1F8F4] p-4"
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#1D9E75] text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[#165F4B]">{step}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-14 grid w-full max-w-[1360px] gap-6 px-4 sm:px-6 lg:grid-cols-12 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: animatedY }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="rounded-[1.6rem] bg-[#0A1A1D] p-6 text-white shadow-[0_20px_44px_-24px_rgba(8,26,23,0.88)] lg:col-span-4"
        >
          <p className="text-xs uppercase tracking-[0.18em] text-white/55">Executive intelligence</p>
          <div className="mt-4 space-y-3">
            {current.stats.map(([label, value]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/10 p-4">
                <p className="text-xs text-white/60">{label}</p>
                <p className="mt-1 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: animatedY }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, delay: 0.08, ease: "easeOut" }}
          className="rounded-[1.6rem] border border-[#DCEAE2] bg-white p-6 shadow-[0_14px_38px_-24px_rgba(12,77,62,0.5)] lg:col-span-8"
        >
          <h3 className="text-xl font-semibold">Business outcomes</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {refinedOutcomes.map((outcome, index) => (
              <div key={outcome} className="rounded-lg border border-[#DFECE5] bg-[#F7FBF8] p-3.5 text-sm font-medium text-[#264E44]">
                <div className="mb-2 h-px w-8 bg-[#1D9E75]/45" />
                <span>
                  {String(index + 1).padStart(2, "0")}. {outcome}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="mx-auto mt-14 w-full max-w-[1360px] px-4 sm:px-6 lg:px-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
          {refinedCapabilities.map(([title, body], index) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: animatedY }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, delay: index * 0.06, ease: "easeOut" }}
              className={`rounded-2xl border border-[#DCEAE2] bg-white p-6 shadow-[0_14px_32px_-24px_rgba(12,77,62,0.45)] transition-transform duration-300 hover:-translate-y-0.5 ${
                index === 0 ? "sm:col-span-2 lg:col-span-7" : "lg:col-span-5"
              }`}
            >
              <div className="mb-3 h-px w-10 bg-[#1D9E75]/45" />
              <h3 className="text-base font-semibold text-[#1A4A3E]">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#4E6C63]">{body}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-16 w-full max-w-[1360px] px-4 sm:px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: animatedY }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="rounded-[2.1rem] bg-[linear-gradient(140deg,#0A4D3E_0%,#11684E_52%,#22B87E_100%)] px-6 py-11 text-center text-white shadow-[0_18px_44px_-24px_rgba(10,77,62,0.55)] sm:px-10"
        >
          <h2 className="text-2xl font-semibold sm:text-3xl">See how this works with your own sustainability data</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-white/85 sm:text-base">
            Turn ESG from an annual reporting burden into a continuously managed decision system.
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
  );
};

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
      <div className="min-h-screen overflow-x-hidden bg-[#F8FCFA] text-[#0B2B24]">
        <MainHeader />
        <ESGManagementRedesignedPage
          current={current}
          animatedY={animatedY}
          prefersReducedMotion={!!prefersReducedMotion}
        />
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

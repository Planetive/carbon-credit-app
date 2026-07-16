import { Button } from "@/components/ui/button";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type CarbonManagementPageProps = {
  prefersReducedMotion?: boolean;
};

const pillars = [
  {
    title: "Project intake",
    desc: "Capture your organisation, emissions context and project intent in one guided wizard.",
  },
  {
    title: "AI matching",
    desc: "Match against a global project database by geography, type, area of interest and end goal.",
  },
  {
    title: "My Projects",
    desc: "Keep every draft and initiative in one place — continue, review and build your portfolio.",
  },
];

const workflow = [
  {
    title: "Describe your organisation",
    blurb: "Industry, size and what you already know about emissions or waste streams.",
    detail:
      "Start with the basics: sector, scale and whether you have greenhouse-gas or waste data ready. Optional fields capture types, sources and annual volumes so recommendations stay grounded.",
    tags: ["Industry", "Scale", "Emissions context"],
  },
  {
    title: "Define the project",
    blurb: "Name, country, area of interest, project type, goal and credit intent.",
    detail:
      "Set where the project sits, what category it falls into, the end goal you are chasing, whether you want to register for carbon credits, and if you will develop it yourself or with a third party.",
    tags: ["Country", "Type", "Credits"],
  },
  {
    title: "Get matched recommendations",
    blurb: "AI reviews your inputs and surfaces projects that fit your criteria.",
    detail:
      "Your choices are scored against the global projects library — and CCUS records where relevant — so you see opportunities aligned to area of interest, type and end goal, not a generic catalogue.",
    tags: ["Global projects", "CCUS", "Fit"],
  },
  {
    title: "Manage in My Projects",
    blurb: "Open drafts, continue work and keep your carbon project portfolio organised.",
    detail:
      "Every submission lands in My Projects on the dashboard. Reopen a draft, review details, or start another initiative as your programme grows.",
    tags: ["Drafts", "Continue", "Portfolio"],
  },
];

const capabilities = [
  {
    title: "Guided project wizard",
    desc: "A structured intake that collects organisation profile and project details without a blank spreadsheet.",
  },
  {
    title: "Global project library",
    desc: "Recommendations drawn from a curated database of carbon projects filtered by your criteria.",
  },
  {
    title: "Criteria-based matching",
    desc: "Area of interest, type and end goal drive which opportunities surface — including CCUS where it applies.",
  },
  {
    title: "Credit registration intent",
    desc: "Flag whether the project should pursue carbon credit registration as you define the initiative.",
  },
  {
    title: "My Projects workspace",
    desc: "View and manage all your carbon projects from the dashboard after you sign in.",
  },
  {
    title: "AI-assisted analysis",
    desc: "After submit, the platform processes your requirements and prepares personalised next steps.",
  },
];

const CarbonManagementPage = ({
  prefersReducedMotion: prefersReducedMotionProp,
}: CarbonManagementPageProps) => {
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
      {/* Hero — image only, no strip, no CTAs */}
      <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-[#061512] pt-24 pb-16 text-white sm:pt-28 sm:pb-20">
        <img
          src="/management-hero.png"
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
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_35%_at_70%_30%,rgba(29,158,117,0.16),transparent_70%)]"
            animate={{ opacity: [0.45, 0.85, 0.45] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        <div className="relative z-10 mx-auto flex w-full max-w-[920px] flex-col items-center px-4 text-center sm:px-6">
          <motion.h1
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-[18ch] text-[2rem] font-semibold leading-[1.15] tracking-tight sm:max-w-[22ch] sm:text-[2.5rem] md:text-[3.25rem] lg:text-[3.4rem]"
          >
            Build and manage carbon projects that fit your organisation.
          </motion.h1>

          <motion.p
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 max-w-2xl text-base leading-relaxed text-white/75 sm:mt-6 sm:text-lg md:text-xl"
          >
            Capture your context, define the initiative, and get matched to real carbon project
            opportunities — then keep everything organised in My Projects.
          </motion.p>
        </div>
      </section>

      {/* Pillars — product-real */}
      <section className="border-y border-[#DCEAE2] bg-[#F8FCFA] py-14 sm:py-16">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-10 px-4 sm:grid-cols-3 sm:px-6 lg:gap-0 lg:px-10">
          {pillars.map((item, index) => (
            <motion.div
              key={item.title}
              {...fadeUp}
              transition={{ duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
              className={["lg:px-8", index > 0 ? "lg:border-l lg:border-[#DCEAE2]" : "lg:pl-0"].join(
                " "
              )}
            >
              <h3 className="mb-2 text-lg font-semibold tracking-tight text-[#0A4D3E] sm:text-xl">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-[#5B6B63]">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works — mirrors Project Wizard → Matching → My Projects */}
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
              From first draft to matched opportunities.
            </h2>
            <p className="mt-4 text-base text-[#4E6C63] sm:text-lg">
              The same flow your team uses after signup — project wizard, AI analysis, then My
              Projects on the dashboard.
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
      <section id="capabilities" className="bg-[#F8FCFA] py-16 sm:py-20">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <motion.div {...fadeUp} className="mx-auto mb-12 max-w-2xl text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#1D9E75]">
              In the product
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-[#0A4D3E] sm:text-4xl">
              What Carbon Management actually does.
            </h2>
            <div aria-hidden className="mx-auto mt-4 h-[3px] w-14 rounded-full bg-[#1D9E75]" />
            <p className="mt-4 text-base text-[#5B6B63] sm:text-lg">
              Built around My Projects and the project wizard — not a separate pathway or MACC engine.
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
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-8 -left-8 h-36 w-36 rounded-full border border-white/20"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute right-10 top-8 h-20 w-20 rotate-45 border border-white/18"
            />
            <h2 className="relative z-10 mb-4 text-2xl font-semibold sm:text-3xl md:text-4xl">
              Start your first carbon project.
            </h2>
            <p className="relative z-10 mx-auto mb-8 max-w-2xl text-base text-[#E6F6EF] sm:text-lg">
              Sign in to open My Projects, run the wizard, and see matched opportunities from the
              global library.
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
                <Link to="/project-wizard">Open project wizard</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
};

export default CarbonManagementPage;

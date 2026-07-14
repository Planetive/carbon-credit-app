import MainHeader from "@/components/layout/MainHeader";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

type Package = {
  key: string;
  name: string;
  team: string;
  audience: string;
  description: string;
  featured?: boolean;
};

const HEADLINE = "Find the plan that works for you.";

const packages: Package[] = [
  {
    key: "sme",
    name: "SME",
    team: "TEAM 1–50",
    audience: "FOR SMEs",
    description:
      "Launch a structured carbon and ESG baseline with core measurement tools and guided workflows.",
  },
  {
    key: "medium",
    name: "Medium",
    team: "TEAM 50–300",
    audience: "FOR GROWING ORGS",
    description:
      "Stronger portfolio visibility, governance, and reporting for multi-team organisations.",
  },
  {
    key: "modular",
    name: "Modular",
    team: "ANY SIZE",
    audience: "FOR CUSTOM STACKS",
    description:
      "Pick only the modules you need and mix self-serve tools with advisory when required.",
    featured: true,
  },
  {
    key: "enterprise",
    name: "Enterprise",
    team: "TEAM 300+",
    audience: "FOR LARGE ENTERPRISES",
    description:
      "Full-platform partnership with enterprise controls, integrations, and dedicated delivery.",
    featured: true,
  },
];

const faqs = [
  {
    question: "Why are there no fixed prices shown?",
    answer:
      "Every deployment depends on team size, modules selected, reporting depth, and integration scope. We scope each package with you first, then provide a tailored quote.",
  },
  {
    question: "How fast can we start after requesting a quote?",
    answer:
      "Most teams can begin onboarding in 1 to 2 weeks. Complex enterprise setups may require a phased implementation plan agreed during scoping.",
  },
  {
    question: "Can we start small and upgrade later?",
    answer:
      "Yes. Many teams begin with SME or a focused Modular bundle, then expand to additional modules, integrations, and governance support as needs grow.",
  },
  {
    question: "Do you support compliance and audit-ready reporting?",
    answer:
      "Yes. Medium and Enterprise packages include stronger governance workflows and exportable reports aligned with recognized emissions and ESG reporting practices.",
  },
];

const Pricing = () => {
  const prefersReducedMotion = useReducedMotion();
  const [typedText, setTypedText] = useState(prefersReducedMotion ? HEADLINE : "");
  const [typingDone, setTypingDone] = useState(!!prefersReducedMotion);

  useEffect(() => {
    if (prefersReducedMotion) {
      setTypedText(HEADLINE);
      setTypingDone(true);
      return;
    }

    let index = 0;
    setTypedText("");
    setTypingDone(false);

    const interval = window.setInterval(() => {
      index += 1;
      setTypedText(HEADLINE.slice(0, index));
      if (index >= HEADLINE.length) {
        window.clearInterval(interval);
        setTypingDone(true);
      }
    }, 42);

    return () => window.clearInterval(interval);
  }, [prefersReducedMotion]);

  return (
    <div
      className="font-sans relative min-h-screen overflow-hidden bg-[#0a1a1d]"
      style={{ fontFamily: "'Manrope', 'Inter', sans-serif" }}
    >
      {/* Ambient gradients */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(90% 70% at 12% 0%, rgba(29,158,117,0.22) 0%, rgba(10,26,29,0) 55%), radial-gradient(70% 60% at 90% 20%, rgba(51,192,138,0.14) 0%, rgba(10,26,29,0) 50%)",
        }}
      />

      {/* Soft floating orbs */}
      {!prefersReducedMotion && (
        <>
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -left-24 top-32 h-72 w-72 rounded-full bg-[#1D9E75]/15 blur-3xl"
            animate={{ y: [0, 28, 0], opacity: [0.35, 0.55, 0.35] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -right-20 top-56 h-80 w-80 rounded-full bg-[#33C08A]/12 blur-3xl"
            animate={{ y: [0, -24, 0], opacity: [0.25, 0.45, 0.25] }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute bottom-24 left-1/3 h-64 w-64 rounded-full bg-[#1D9E75]/10 blur-3xl"
            animate={{ x: [0, 40, 0], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}

      <MainHeader />

      <section className="relative px-4 pb-16 pt-32 md:pb-20 md:pt-36">
        <div className="container mx-auto max-w-7xl">
          <motion.div
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 14 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="mb-10 md:mb-14"
          >
            <motion.div
              initial={prefersReducedMotion ? undefined : { opacity: 0, x: -10 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="mb-4 flex items-center gap-2.5"
            >
              <motion.span
                className="inline-block h-2.5 w-2.5 rounded-sm bg-[#1D9E75]"
                animate={prefersReducedMotion ? undefined : { scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              />
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">
                Packages
              </span>
            </motion.div>

            <h1
              className="max-w-2xl min-h-[2.6em] text-3xl font-semibold leading-tight tracking-tight text-white sm:min-h-[2.2em] sm:text-4xl md:text-5xl"
              aria-label={HEADLINE}
            >
              <span>{typedText}</span>
              {!prefersReducedMotion && (
                <motion.span
                  aria-hidden
                  className="ml-0.5 inline-block h-[0.85em] w-[3px] translate-y-[0.08em] bg-[#33C08A] align-baseline"
                  animate={{ opacity: typingDone ? [1, 0, 1] : 1 }}
                  transition={
                    typingDone
                      ? { duration: 0.9, repeat: Infinity, ease: "easeInOut" }
                      : { duration: 0.2 }
                  }
                />
              )}
            </h1>
          </motion.div>

          <motion.div
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 24, scale: 0.985 }}
            animate={
              prefersReducedMotion
                ? undefined
                : typingDone
                  ? { opacity: 1, y: 0, scale: 1 }
                  : { opacity: 0.35, y: 18, scale: 0.985 }
            }
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden rounded-none border-y border-white/10 shadow-[0_30px_80px_-40px_rgba(29,158,117,0.45)] md:rounded-2xl md:border"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
              {packages.map((pkg, index) => (
                <motion.article
                  key={pkg.key}
                  initial={prefersReducedMotion ? undefined : { opacity: 0, y: 28 }}
                  animate={
                    prefersReducedMotion
                      ? undefined
                      : typingDone
                        ? { opacity: 1, y: 0 }
                        : { opacity: 0, y: 28 }
                  }
                  transition={{
                    duration: 0.45,
                    delay: prefersReducedMotion || !typingDone ? 0 : 0.12 + index * 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  whileHover={
                    prefersReducedMotion
                      ? undefined
                      : { y: -4, transition: { duration: 0.2 } }
                  }
                  className={[
                    "group relative flex min-h-[380px] flex-col border-white/10 md:border-r last:md:border-r-0",
                    index < packages.length - 1 ? "border-b md:border-b-0" : "",
                    pkg.featured
                      ? "bg-[linear-gradient(155deg,rgba(29,158,117,0.55)_0%,rgba(10,26,29,0.95)_55%,#0a1a1d_100%)]"
                      : "bg-[#0B221F]/90",
                  ].join(" ")}
                >
                  {!prefersReducedMotion && (
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      style={{
                        background:
                          "radial-gradient(80% 60% at 50% 0%, rgba(51,192,138,0.18) 0%, transparent 70%)",
                      }}
                    />
                  )}

                  <div className="relative z-10 flex h-14 shrink-0 items-center justify-between gap-3 bg-[#1D9E75] px-5">
                    <h2 className="truncate text-base font-semibold leading-none text-white sm:text-lg">
                      {pkg.name}
                    </h2>
                    <span className="shrink-0 rounded-full bg-black/25 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/90">
                      {pkg.team}
                    </span>
                  </div>

                  <div className="relative z-10 flex flex-1 flex-col px-5 pb-6 pt-5">
                    <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 transition-colors duration-200 group-hover:bg-white/15">
                      <span className="h-1.5 w-1.5 rounded-[2px] bg-white/80" />
                      <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/85">
                        {pkg.audience}
                      </span>
                    </div>

                    <p className="mb-8 text-sm leading-relaxed text-white/75">{pkg.description}</p>

                    <div className="mt-auto pt-2">
                      {pkg.featured ? (
                        <Button
                          asChild
                          variant="outline"
                          className="w-full border-white/40 bg-transparent text-white transition-all duration-200 hover:border-white/70 hover:bg-white/10 hover:text-white"
                        >
                          <Link to="/contact">
                            Get started
                            <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/15 transition-transform duration-200 group-hover:translate-x-0.5">
                              <ArrowRight className="h-3 w-3" />
                            </span>
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          asChild
                          className="w-full bg-[#1D9E75] text-[#04342C] transition-all duration-200 hover:bg-[#22B87E] hover:shadow-[0_12px_28px_-12px_rgba(29,158,117,0.7)]"
                        >
                          <Link to="/contact">
                            Get started
                            <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#04342C]/15 transition-transform duration-200 group-hover:translate-x-0.5">
                              <ArrowRight className="h-3 w-3 text-[#04342C]" />
                            </span>
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="relative border-t border-white/10 bg-[#0B221F] px-4 py-14 md:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, rgba(29,158,117,0.12) 0%, transparent 70%)",
          }}
        />
        <div className="container relative z-10 mx-auto max-w-5xl">
          <motion.div
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 18 }}
            whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <h2 className="mb-2 text-center text-2xl font-semibold text-white md:text-3xl">
              Pricing FAQs
            </h2>
            <p className="mb-8 text-center text-sm text-white/60 md:text-base">
              Common questions about quotes, onboarding, and package fit.
            </p>
          </motion.div>

          <motion.div
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 22 }}
            whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5, delay: 0.08, ease: "easeOut" }}
          >
            <Accordion
              type="single"
              collapsible
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 backdrop-blur-sm sm:px-6"
            >
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={faq.question}
                  value={`faq-${index}`}
                  className="border-white/10"
                >
                  <AccordionTrigger className="text-left text-white hover:no-underline hover:text-[#9FEED1]">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-white/65">{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      <div className="fixed bottom-4 left-4 right-4 z-40 lg:hidden">
        <Button
          asChild
          size="lg"
          className="w-full bg-[#1D9E75] text-[#04342C] shadow-xl hover:bg-[#22B87E]"
        >
          <Link to="/contact">
            Get a Quote
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default Pricing;

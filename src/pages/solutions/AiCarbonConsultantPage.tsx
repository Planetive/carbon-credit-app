import { Button } from "@/components/ui/button";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Plug, Sparkles, Truck, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type AiCarbonConsultantPageProps = {
  prefersReducedMotion?: boolean;
};

const AI_STRATEGIST_QUERY =
  "How can I reduce emissions by 30% before 2030 while staying under a $5M budget?";

const aiStrategistStats = [
  { label: "Projected reduction", value: "31%" },
  { label: "Estimated investment", value: "$4.7M" },
  { label: "Annual savings", value: "$1.2M" },
  { label: "Payback period", value: "4.3 yrs" },
];

const aiStrategistInitiatives = [
  { icon: Zap, label: "Fleet electrification" },
  { icon: Plug, label: "Renewable PPAs" },
  { icon: Truck, label: "Supplier optimisation" },
];

const recommendations = [
  {
    id: "forest",
    title: "Forest Conservation & Reforestation",
    type: "Forestry & Land Use",
    match: 95,
    credits: "12,000 tCO2e/yr",
    investment: "$800K – $1.2M",
    timeline: "2025–2035",
    methodology: "VCS VM0006",
    coBenefits: ["Biodiversity", "Water quality", "Community jobs"],
    reasons: [
      "Aligns with carbon neutrality goal",
      "Fits medium investment capacity",
      "10-year timeline matches your target period",
      "Strong biodiversity co-benefits",
    ],
  },
  {
    id: "solar",
    title: "Renewable Energy — Solar Farm",
    type: "Renewable Energy",
    match: 88,
    credits: "8,500 tCO2e/yr",
    investment: "$900K – $1.5M",
    timeline: "2025–2030",
    methodology: "Gold Standard RE",
    coBenefits: ["Energy security", "Air quality", "Job creation"],
    reasons: [
      "Direct GHG emission reduction",
      "Proven technology, lower delivery risk",
      "Faster credit generation timeline",
      "Strong market demand for renewable credits",
    ],
  },
  {
    id: "agri",
    title: "Improved Agricultural Practices",
    type: "Agriculture",
    match: 82,
    credits: "6,200 tCO2e/yr",
    investment: "$400K – $700K",
    timeline: "2025–2032",
    methodology: "VCS VM0026",
    coBenefits: ["Soil health", "Water conservation", "Food security"],
    reasons: [
      "Lower initial investment requirement",
      "Multiple environmental benefits",
      "Community engagement opportunities",
      "Supports sustainable development goals",
    ],
  },
];

const featureRows = [
  {
    title: "Structured goal intake",
    desc: "Climate target, timeline, net-zero intent and investment capacity — the same fields as the AI Carbon Project Advisor after sign-in.",
    aside: "Primary goal · Target period · Budget tier · Constraints",
  },
  {
    title: "Criteria-based matching",
    desc: "Geography, project type, area of interest and end goal filter the global projects library — and CCUS where relevant — not a generic shortlist.",
    aside: "Global projects · CCUS · Fit scoring",
  },
  {
    title: "Ranked with reasoning",
    desc: "Every opportunity shows expected tCO2e, investment range, methodology and why it fits — so finance and sustainability can compare before committing.",
    aside: "Match % · Co-benefits · Suitability bullets",
  },
  {
    title: "Report, wizard or My Projects",
    desc: "Generate a project report, open the wizard with a recommendation pre-filled, or continue building your programme from the dashboard.",
    aside: "PDF report · Project wizard · My Projects",
  },
];

const AiCarbonConsultantPage = ({
  prefersReducedMotion: prefersReducedMotionProp,
}: AiCarbonConsultantPageProps) => {
  const hookReduced = useReducedMotion();
  const prefersReducedMotion = prefersReducedMotionProp ?? !!hookReduced;
  const heroCanvasRef = useRef<HTMLCanvasElement>(null);
  const [activeRec, setActiveRec] = useState(0);
  const [typedLen, setTypedLen] = useState(0);
  const [showInits, setShowInits] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showCta, setShowCta] = useState(false);
  const selected = recommendations[activeRec];

  // AI strategist card — typing loop from carbon-management-landing.html
  useEffect(() => {
    if (prefersReducedMotion) {
      setTypedLen(AI_STRATEGIST_QUERY.length);
      setShowInits(true);
      setShowStats(true);
      setShowCta(true);
      return;
    }

    let typeInterval: number | undefined;
    let resetTimeout: number | undefined;
    const timeouts: number[] = [];

    const reset = () => {
      setTypedLen(0);
      setShowInits(false);
      setShowStats(false);
      setShowCta(false);
    };

    const runLoop = () => {
      reset();
      let i = 0;
      typeInterval = window.setInterval(() => {
        i += 1;
        setTypedLen(i);
        if (i >= AI_STRATEGIST_QUERY.length) {
          window.clearInterval(typeInterval);
          timeouts.push(window.setTimeout(() => setShowInits(true), 300));
          timeouts.push(window.setTimeout(() => setShowStats(true), 600));
          timeouts.push(window.setTimeout(() => setShowCta(true), 1800));
          resetTimeout = window.setTimeout(runLoop, 9000);
        }
      }, 28);
    };

    runLoop();

    return () => {
      if (typeInterval) window.clearInterval(typeInterval);
      if (resetTimeout) window.clearTimeout(resetTimeout);
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, [prefersReducedMotion]);

  // Drifting node network — distinct from home page sine-wave curves
  useEffect(() => {
    const canvas = heroCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let frameId = 0;
    let t = 0;

    type Node = { x: number; y: number; vx: number; vy: number; r: number; pulse: number };

    const nodeCount = prefersReducedMotion ? 0 : 22;
    const nodes: Node[] = [];
    const linkDistance = 140;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const seedNodes = () => {
      nodes.length = 0;
      for (let i = 0; i < nodeCount; i++) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
          r: 1.2 + Math.random() * 1.4,
          pulse: Math.random() * Math.PI * 2,
        });
      }
    };

    const drawFrame = () => {
      ctx.clearRect(0, 0, width, height);

      if (nodes.length === 0) return;

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist > linkDistance) continue;
          const alpha = (1 - dist / linkDistance) * 0.14;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(93, 202, 165, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      for (const node of nodes) {
        const glow = 0.45 + Math.sin(t * 1.6 + node.pulse) * 0.25;
        const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.r * 5);
        grad.addColorStop(0, `rgba(159, 225, 203, ${0.35 * glow})`);
        grad.addColorStop(1, "rgba(29, 158, 117, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r * 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(223, 251, 239, ${0.55 * glow})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const tick = () => {
      t += 0.012;
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;
        node.x = Math.max(0, Math.min(width, node.x));
        node.y = Math.max(0, Math.min(height, node.y));
      }
      drawFrame();
      frameId = window.requestAnimationFrame(tick);
    };

    resize();
    seedNodes();
    drawFrame();

    if (!prefersReducedMotion) {
      frameId = window.requestAnimationFrame(tick);
    }

    const onResize = () => {
      resize();
      seedNodes();
      drawFrame();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
    };
  }, [prefersReducedMotion]);

  const fadeUp = {
    initial: prefersReducedMotion ? undefined : { opacity: 0, y: 22 },
    whileInView: prefersReducedMotion ? undefined : { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.2 },
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  };

  return (
    <main className="w-full overflow-hidden">
      {/* Hero — headline only, no CTAs */}
      <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-[#050f0d] pt-24 pb-16 text-white sm:pt-28 sm:pb-20">
        <canvas
          ref={heroCanvasRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_40%,rgba(29,158,117,0.14),transparent_60%)]"
        />
        {!prefersReducedMotion && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_40%_at_50%_45%,rgba(51,192,138,0.1),transparent_70%)]"
            animate={{ opacity: [0.35, 0.65, 0.35] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        <div className="relative z-10 mx-auto max-w-[920px] px-4 text-center sm:px-6">
          <motion.h1
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08 }}
            className="text-[2rem] font-semibold leading-[1.12] tracking-tight sm:text-[2.65rem] md:text-[3.2rem]"
          >
            Your goals in.
            <br />
            <span className="bg-gradient-to-r from-[#33C08A] via-[#DFFBEF] to-[#33C08A] bg-clip-text text-transparent">
              Ranked projects out.
            </span>
          </motion.h1>

          <motion.p
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 14 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18 }}
            className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/70 sm:mt-6 sm:text-lg md:text-xl"
          >
            Decision support from structured intake to scored recommendations — the same advisor and
            project wizard flow inside Rethink Carbon, not a generic chatbot.
          </motion.p>
        </div>
      </section>

      {/* AI Carbon Strategist */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-10">
          <motion.div {...fadeUp} className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-[1.85rem] font-semibold tracking-tight text-[#0A4D3E] sm:text-[2.35rem]">
              Ask a direct question. Get a ranked answer.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#5B6B63] sm:text-lg">
              Share your target, timeline and budget — the strategist surfaces initiatives,
              projected reduction and estimated investment in one view.
            </p>
          </motion.div>

          <motion.div
            {...fadeUp}
            className="mx-auto flex min-h-[460px] max-w-[520px] flex-col rounded-[18px] border border-[#DCEAE2] bg-white p-5 shadow-[0_24px_60px_-36px_rgba(12,77,62,0.28)] sm:p-6"
          >
            <div className="mb-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-[#5B6B63]">
              <Sparkles className="h-3.5 w-3.5 text-[#1D9E75]" strokeWidth={2} />
              AI Carbon Strategist
            </div>

            <div className="mb-4 min-h-[52px] rounded-xl bg-[#F0F1EC] px-4 py-3 text-[13px] font-medium leading-relaxed text-[#0A4D3E]">
              {AI_STRATEGIST_QUERY.slice(0, typedLen)}
              {!prefersReducedMotion && typedLen < AI_STRATEGIST_QUERY.length && (
                <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-[#1D9E75] align-middle" />
              )}
            </div>

            <ul
              className={[
                "mb-4 space-y-1 transition-all duration-300",
                showInits ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
              ].join(" ")}
            >
              {aiStrategistInitiatives.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2 py-1.5 text-[12.5px] text-[#5B6B63]">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-[#1D9E75]" strokeWidth={2} />
                  {label}
                </li>
              ))}
            </ul>

            <div className="mb-4 grid grid-cols-2 gap-2.5">
              {aiStrategistStats.map((stat, idx) => (
                <div
                  key={stat.label}
                  className={[
                    "rounded-[10px] bg-[#E7F3ED] px-3.5 py-3 transition-all duration-300",
                    showStats ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
                  ].join(" ")}
                  style={{ transitionDelay: showStats ? `${idx * 100}ms` : "0ms" }}
                >
                  <p className="font-mono text-[10px] uppercase tracking-wide text-[#0A4D3E]">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-base font-bold text-[#0A4D3E]">{stat.value}</p>
                </div>
              ))}
            </div>

            <div
              className={[
                "mt-auto transition-opacity duration-300",
                showCta ? "opacity-100" : "opacity-0",
              ].join(" ")}
            >
              <Button
                size="sm"
                className="rounded-full bg-[#0A4D3E] px-5 py-2 text-sm font-semibold text-white hover:bg-[#11684E]"
                asChild
              >
                <Link to="/login">
                  Create action plan
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Interactive match explorer — not step list + green panel */}
      <section id="explore-matches" className="bg-[#F8FCFA] py-16 sm:py-20">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <motion.div {...fadeUp} className="mx-auto mb-10 max-w-3xl text-center">
            <h2 className="text-[1.85rem] font-semibold tracking-tight text-[#0A4D3E] sm:text-[2.35rem]">
              Compare ranked opportunities
            </h2>
            <p className="mt-4 text-base text-[#5B6B63] sm:text-lg">
              Switch between matches to see credits, investment, methodology and why each one fits —
              the same detail users get from the AI Carbon Project Advisor.
            </p>
          </motion.div>

          <motion.div
            {...fadeUp}
            className="overflow-hidden rounded-[1.75rem] border border-[#DCEAE2] bg-white shadow-[0_24px_60px_-36px_rgba(12,77,62,0.3)]"
          >
            <div className="flex flex-wrap gap-2 border-b border-[#E8EEEA] p-4 sm:p-5" role="tablist">
              {recommendations.map((rec, index) => {
                const active = index === activeRec;
                return (
                  <button
                    key={rec.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveRec(index)}
                    className={[
                      "flex items-center gap-2 rounded-full px-4 py-2.5 text-left text-sm font-medium transition",
                      active
                        ? "bg-[#0a1a1d] text-white"
                        : "bg-[#EEF3F0] text-[#3D5A52] hover:bg-[#E2EBE6]",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "font-mono text-xs",
                        active ? "text-[#9FE1CB]" : "text-[#7A958B]",
                      ].join(" ")}
                    >
                      {rec.match}%
                    </span>
                    <span className="max-w-[140px] truncate sm:max-w-none">{rec.title}</span>
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={selected.id}
                initial={prefersReducedMotion ? undefined : { opacity: 0, y: 10 }}
                animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[1fr_280px]"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1D9E75]">
                    {selected.type}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#0A4D3E] sm:text-3xl">
                    {selected.title}
                  </h3>
                  <div className="mt-6 grid gap-4 sm:grid-cols-3">
                    {[
                      ["Expected credits", selected.credits],
                      ["Investment", selected.investment],
                      ["Timeline", selected.timeline],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl bg-[#F3F9F6] px-4 py-3">
                        <p className="text-[11px] uppercase tracking-wide text-[#7A958B]">{label}</p>
                        <p className="mt-1 text-sm font-semibold text-[#0A4D3E]">{value}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-6 text-sm font-medium text-[#0A4D3E]">Why this fits your goals</p>
                  <ul className="mt-3 space-y-2">
                    {selected.reasons.map((reason) => (
                      <li key={reason} className="flex items-start gap-2 text-sm text-[#5B6B63]">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1D9E75]" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-[#DCEAE2] bg-[#F8FCFA] p-6">
                    <div
                      className="relative flex h-24 w-24 items-center justify-center rounded-full"
                      style={{
                        background: `conic-gradient(#1D9E75 ${selected.match * 3.6}deg, #E8EEEA 0deg)`,
                      }}
                    >
                      <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-white">
                        <span className="text-2xl font-bold text-[#0A4D3E]">{selected.match}%</span>
                      </div>
                    </div>
                    <p className="mt-3 text-xs font-medium text-[#7A958B]">Match score</p>
                  </div>
                  <div className="rounded-2xl border border-[#DCEAE2] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7A958B]">
                      Methodology
                    </p>
                    <p className="mt-1 text-sm font-medium text-[#0A4D3E]">{selected.methodology}</p>
                    <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-[#7A958B]">
                      Co-benefits
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selected.coBenefits.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md border border-[#D5E5DD] bg-white px-2 py-0.5 text-[11px] text-[#3F5E54]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* Alternating feature rows — not capability grid */}
      <section className="bg-[#F7F4EE] py-16 sm:py-20">
        <div className="mx-auto max-w-[900px] px-4 sm:px-6 lg:px-10">
          <motion.div {...fadeUp} className="mb-14 text-center">
            <h2 className="text-[1.85rem] font-semibold tracking-tight text-[#0A4D3E] sm:text-[2.35rem]">
              Built into the product
            </h2>
          </motion.div>

          <div className="space-y-0 divide-y divide-[#DCEAE2]">
            {featureRows.map((row, index) => (
              <motion.div
                key={row.title}
                {...fadeUp}
                transition={{ duration: 0.45, delay: index * 0.04 }}
                className={[
                  "grid gap-6 py-10 first:pt-0 last:pb-0 sm:grid-cols-2 sm:items-center sm:gap-10",
                  index % 2 === 1 ? "sm:[&>*:first-child]:order-2" : "",
                ].join(" ")}
              >
                <div>
                  <h3 className="text-xl font-semibold text-[#0A4D3E]">{row.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#5B6B63] sm:text-base">{row.desc}</p>
                </div>
                <div className="rounded-xl border border-[#DCEAE2] bg-white px-4 py-3.5 font-mono text-[11px] leading-relaxed text-[#3F5E54] sm:text-xs">
                  {row.aside}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Asymmetric CTA — not centered gradient box */}
      <section className="border-t border-[#DCEAE2] bg-white py-16 sm:py-20">
        <div className="mx-auto grid max-w-[1280px] items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-10">
          <motion.div {...fadeUp}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1D9E75]">Get started</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#0A4D3E] sm:text-3xl md:text-4xl">
              See matched projects for your organisation
            </h2>
            <p className="mt-4 max-w-md text-base text-[#5B6B63]">
              Sign in to run the AI Carbon Project Advisor, or talk to our team about rolling it out
              across your sustainability workflow.
            </p>
          </motion.div>
          <motion.div {...fadeUp} className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <Button
              size="lg"
              className="rounded-full bg-[#1D9E75] px-8 py-6 font-semibold text-[#04342C] hover:bg-[#22B87E]"
              asChild
            >
              <Link to="/login">
                Open AI advisor
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-[#0A4D3E]/25 px-8 py-6 font-semibold text-[#0A4D3E] hover:bg-[#F0FAF6]"
              asChild
            >
              <Link to="/contact">Talk to sales</Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </main>
  );
};

export default AiCarbonConsultantPage;

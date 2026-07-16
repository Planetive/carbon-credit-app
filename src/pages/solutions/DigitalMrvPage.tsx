import { Button } from "@/components/ui/button";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  Factory,
  Leaf,
  Coins,
  Satellite,
  Activity,
  ShieldCheck,
  FileCheck2,
  TreePine,
  Waves,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

type DigitalMrvPageProps = {
  prefersReducedMotion?: boolean;
};

const pillars = [
  {
    tag: "01",
    title: "Continuous data capture",
    desc: "IoT, satellite, ERP and manual field evidence, all captured in one stream.",
  },
  {
    tag: "02",
    title: "Immutable audit trail",
    desc: "Every change is tracked, timestamped and independently verifiable.",
  },
  {
    tag: "03",
    title: "Registry ready",
    desc: "Built for ISO, Verra, Gold Standard and Article 6 requirements.",
  },
  {
    tag: "04",
    title: "Multi-source verification",
    desc: "Cross-checked across every evidence source, not just one.",
    chips: ["Satellite", "IoT", "Drones", "ERP", "Lab data"],
  },
];

const workflows = [
  {
    icon: Leaf,
    title: "Nature-based projects",
    blurb: "Monitor biomass, canopy change, and blue-carbon growth with continuous evidence capture.",
    tags: ["Forestry", "Mangroves", "Blue carbon"],
  },
  {
    icon: Factory,
    title: "Industrial MRV",
    blurb: "Track CCUS, methane, and hydrogen projects with sensor-backed performance data.",
    tags: ["CCUS", "Methane", "Hydrogen"],
  },
  {
    icon: Building2,
    title: "Corporate MRV",
    blurb: "Unify Scope 1–3 claims with a verification trail your auditor can follow.",
    tags: ["Scope 1", "Scope 2", "Scope 3"],
  },
  {
    icon: Coins,
    title: "Carbon markets",
    blurb: "Move from monitoring to credit issuance, registry submission, and Article 6 readiness.",
    tags: ["Credits", "Registries", "Article 6"],
  },
];

const stages = [
  {
    title: "Project design",
    tag: "STAGE 01",
    text: "Define project boundaries, methodology and monitoring plan before a single data point is collected.",
  },
  {
    title: "Baseline & data collection",
    tag: "STAGE 02",
    text: "Establish the counterfactual scenario every measurement is checked against, while continuously capturing evidence from IoT, satellite, ERP and field sources.",
  },
  {
    title: "Monitoring",
    tag: "STAGE 03",
    text: "Ongoing tracking of project performance against the approved methodology.",
  },
  {
    title: "Verification",
    tag: "STAGE 04",
    text: "Independent, evidence-backed review against ISO, Verra, Gold Standard and Article 6 criteria.",
  },
  {
    title: "Credit issuance",
    tag: "STAGE 05",
    text: "Verified reductions are converted into registry-issued carbon credits.",
  },
  {
    title: "Trading",
    tag: "STAGE 06",
    text: "Credits move through markets with full chain-of-custody intact.",
  },
  {
    title: "Retirement",
    tag: "STAGE 07",
    text: "Credits are retired against a claim, permanently removed from circulation.",
  },
];

const heroLead = "Digital MRV that transforms climate data into".split(" ");
const heroAccent = ["trusted", "evidence"];
const heroTrail =
  "for carbon markets, carbon credits, CCUS, nature-based projects, and corporate decarbonization.".split(" ");

const heroWordContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.045, delayChildren: 0.18 },
  },
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

const twinNodes = [
  { label: "Projects", icon: TreePine, angle: -20, radius: 42 },
  { label: "IoT sensors", icon: Activity, angle: 40, radius: 42 },
  { label: "Verification", icon: ShieldCheck, angle: 100, radius: 42 },
  { label: "Audit trail", icon: FileCheck2, angle: 160, radius: 42 },
  { label: "Carbon credits", icon: Coins, angle: 220, radius: 42 },
  { label: "Live monitoring", icon: Satellite, angle: 280, radius: 42 },
];

const OrbitRing = ({
  size,
  duration,
  reverse,
  prefersReducedMotion,
  children,
}: {
  size: number;
  duration: number;
  reverse?: boolean;
  prefersReducedMotion: boolean;
  children?: ReactNode;
}) => (
  <motion.div
    aria-hidden
    className="absolute left-1/2 top-1/2 rounded-full border border-dashed border-[#33C08A]/20"
    style={{
      width: size,
      height: size,
      marginLeft: -size / 2,
      marginTop: -size / 2,
    }}
    animate={prefersReducedMotion ? undefined : { rotate: reverse ? -360 : 360 }}
    transition={prefersReducedMotion ? undefined : { duration, repeat: Infinity, ease: "linear" }}
  >
    {children}
  </motion.div>
);

const DigitalTwinVisual = ({ prefersReducedMotion }: { prefersReducedMotion: boolean }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const springX = useSpring(mx, { stiffness: 120, damping: 18, mass: 0.4 });
  const springY = useSpring(my, { stiffness: 120, damping: 18, mass: 0.4 });
  const rotateX = useTransform(springY, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-12, 12]);
  const glowX = useTransform(springX, [-0.5, 0.5], ["35%", "65%"]);
  const glowY = useTransform(springY, [-0.5, 0.5], ["35%", "65%"]);
  const glowBackground = useTransform(
    [glowX, glowY],
    ([x, y]) =>
      `radial-gradient(circle at ${x} ${y}, rgba(29,158,117,0.38) 0%, rgba(29,158,117,0.1) 40%, transparent 70%)`
  );

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mx.set((event.clientX - rect.left) / rect.width - 0.5);
    my.set((event.clientY - rect.top) / rect.height - 0.5);
  };

  const handlePointerLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <motion.div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={prefersReducedMotion ? undefined : { rotateX, rotateY, transformPerspective: 900 }}
      className="relative mx-auto aspect-square w-full max-w-[480px] cursor-grab active:cursor-grabbing"
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-[6%] rounded-full blur-md"
        style={{ background: glowBackground }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-[18%] rounded-full bg-[#1D9E75]/10"
        animate={prefersReducedMotion ? undefined : { scale: [1, 1.08, 1], opacity: [0.35, 0.55, 0.35] }}
        transition={prefersReducedMotion ? undefined : { duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      <OrbitRing size={420} duration={42} prefersReducedMotion={prefersReducedMotion}>
        <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#33C08A] shadow-[0_0_12px_rgba(51,192,138,0.9)]" />
        <span className="absolute bottom-[18%] left-[6%] h-1.5 w-1.5 rounded-full bg-[#9FE1CB]/80" />
      </OrbitRing>

      <OrbitRing size={310} duration={28} reverse prefersReducedMotion={prefersReducedMotion}>
        <span className="absolute right-[12%] top-[18%] h-2.5 w-2.5 rounded-full bg-[#1D9E75] shadow-[0_0_14px_rgba(29,158,117,0.85)]" />
        <span className="absolute bottom-[10%] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white/50" />
      </OrbitRing>

      <OrbitRing size={210} duration={18} prefersReducedMotion={prefersReducedMotion}>
        <span className="absolute left-[8%] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[#66D5A8] shadow-[0_0_10px_rgba(102,213,168,0.8)]" />
      </OrbitRing>

      <motion.div className="absolute left-1/2 top-1/2 z-10 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center sm:h-32 sm:w-32">
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle at 32% 28%, #3d7a64, #0B2B24 58%, #071a16 100%)",
            boxShadow:
              "inset -16px -18px 36px rgba(0,0,0,0.4), 0 0 0 1px rgba(51,192,138,0.35), 0 0 60px rgba(29,158,117,0.35)",
          }}
          animate={
            prefersReducedMotion
              ? undefined
              : {
                  boxShadow: [
                    "inset -16px -18px 36px rgba(0,0,0,0.4), 0 0 0 1px rgba(51,192,138,0.35), 0 0 40px rgba(29,158,117,0.25)",
                    "inset -16px -18px 36px rgba(0,0,0,0.4), 0 0 0 1px rgba(51,192,138,0.55), 0 0 70px rgba(29,158,117,0.45)",
                    "inset -16px -18px 36px rgba(0,0,0,0.4), 0 0 0 1px rgba(51,192,138,0.35), 0 0 40px rgba(29,158,117,0.25)",
                  ],
                }
          }
          transition={prefersReducedMotion ? undefined : { duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <div
          aria-hidden
          className="absolute inset-0 rounded-full opacity-40 mix-blend-overlay"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, transparent, transparent 14px, rgba(255,255,255,0.07) 15px)",
          }}
        />
        <div className="relative z-[1] text-center">
          <Waves className="mx-auto mb-1 h-5 w-5 text-[#9FE1CB]" />
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/85 sm:text-[10px]">
            MRV Twin
          </p>
        </div>
      </motion.div>

      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[5] h-full w-full opacity-40"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
      >
        {twinNodes.map((node) => {
          const rad = (node.angle * Math.PI) / 180;
          return (
            <line
              key={`line-${node.label}`}
              x1="50"
              y1="50"
              x2={50 + node.radius * Math.cos(rad)}
              y2={50 + node.radius * Math.sin(rad)}
              stroke="#33C08A"
              strokeWidth="0.15"
              strokeDasharray="0.8 0.8"
              opacity="0.55"
            />
          );
        })}
      </svg>

      {twinNodes.map((node, index) => {
        const Icon = node.icon;
        const rad = (node.angle * Math.PI) / 180;
        return (
          <motion.div
            key={node.label}
            className="absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
            style={{
              left: `${50 + node.radius * Math.cos(rad)}%`,
              top: `${50 + node.radius * Math.sin(rad)}%`,
            }}
            animate={prefersReducedMotion ? undefined : { y: [0, -5, 0] }}
            transition={
              prefersReducedMotion
                ? undefined
                : { duration: 4.2 + index * 0.25, repeat: Infinity, ease: "easeInOut", delay: index * 0.3 }
            }
            whileHover={prefersReducedMotion ? undefined : { scale: 1.12 }}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#33C08A]/35 bg-[#0a1a1d]/80 text-[#9FE1CB] shadow-[0_0_24px_rgba(29,158,117,0.25)] backdrop-blur-md transition-colors hover:border-[#33C08A]/70 hover:bg-[#1D9E75]/25 sm:h-10 sm:w-10">
              <Icon className="h-4 w-4" />
            </span>
            <span className="whitespace-nowrap text-[10px] font-medium tracking-wide text-[#C8EDE0]/90 sm:text-[11px]">
              {node.label}
            </span>
          </motion.div>
        );
      })}
    </motion.div>
  );
};

const DigitalMrvPage = ({ prefersReducedMotion: prefersReducedMotionProp }: DigitalMrvPageProps) => {
  const hookReduced = useReducedMotion();
  const prefersReducedMotion = prefersReducedMotionProp ?? !!hookReduced;
  const [lifecycleIndex, setLifecycleIndex] = useState(0);
  const [workflowIndex, setWorkflowIndex] = useState(0);
  const workflowPauseUntil = useRef(0);
  const lifecyclePauseUntil = useRef(0);
  const activeStage = stages[lifecycleIndex];
  const activeWorkflow = workflows[workflowIndex];
  const ActiveWorkflowIcon = activeWorkflow.icon;

  const selectWorkflow = (index: number) => {
    setWorkflowIndex(index);
    workflowPauseUntil.current = Date.now() + 8000;
  };

  const selectLifecycle = (index: number) => {
    setLifecycleIndex(index);
    lifecyclePauseUntil.current = Date.now() + 4000;
  };

  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = window.setInterval(() => {
      if (Date.now() < workflowPauseUntil.current) return;
      setWorkflowIndex((prev) => (prev + 1) % workflows.length);
    }, 4200);
    return () => window.clearInterval(id);
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = window.setInterval(() => {
      if (Date.now() < lifecyclePauseUntil.current) return;
      setLifecycleIndex((prev) => (prev + 1) % stages.length);
    }, 1300);
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
              {heroTrail.map((word, i) => (
                <motion.span
                  key={`trail-${i}`}
                  variants={prefersReducedMotion ? undefined : heroWordReveal}
                  className="mr-[0.28em] inline-block whitespace-pre"
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
              transition={{ duration: 0.7, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 max-w-lg text-base leading-relaxed text-white/70 sm:text-lg"
            >
              Rethink Carbon's Digital MRV continuously captures, validates and secures climate data across every stage of
              the project lifecycle, creating an immutable evidence trail trusted by auditors, investors and carbon market
              registries.
            </motion.p>

            <motion.div
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 18 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.05, ease: [0.22, 1, 0.36, 1] }}
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
                initial={prefersReducedMotion ? undefined : { opacity: 0, x: -8 }}
                animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
                transition={{ duration: 0.45, delay: 1.18 }}
                whileHover={prefersReducedMotion ? undefined : { scale: 1.03, y: -2 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
              >
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full border-white/25 bg-transparent px-7 py-6 font-semibold text-white hover:bg-white/10 hover:text-white"
                  asChild
                >
                  <a href="#mrv-workflows">Explore the module</a>
                </Button>
              </motion.div>
            </motion.div>
          </div>

          <motion.div
            initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.92, rotate: -3 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="flex justify-center lg:justify-end"
          >
            <DigitalTwinVisual prefersReducedMotion={prefersReducedMotion} />
          </motion.div>
        </div>
      </section>

      <section className="border-y border-[#DCEAE2] bg-[#F8FCFA] py-14 sm:py-16">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-10 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:gap-0 lg:px-10">
          {pillars.map((item, index) => (
            <motion.div
              key={item.tag}
              {...fadeUp}
              transition={{ duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
              className={["lg:px-6", index > 0 ? "lg:border-l lg:border-[#DCEAE2]" : "lg:pl-0"].join(" ")}
            >
              <p className="mb-3 font-mono text-[11px] tracking-[0.14em] text-[#1D9E75]">{item.tag}</p>
              <h3 className="mb-2 text-base font-semibold tracking-tight text-[#0A4D3E] sm:text-lg">{item.title}</h3>
              <p className="text-sm leading-relaxed text-[#4E6C63]">{item.desc}</p>
              {item.chips && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.chips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-md border border-[#D5E5DD] bg-white px-2 py-0.5 font-mono text-[10px] text-[#5B6B63]"
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

      <section id="mrv-workflows" className="relative overflow-hidden bg-[#F7F4EE] py-16 sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 top-10 h-64 w-64 rounded-full border border-[#1D9E75]/10"
        />
        <div className="relative z-10 mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <motion.div {...fadeUp} className="mb-10 max-w-2xl sm:mb-12">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#1D9E75]">Workflows</p>
            <h2 className="text-3xl font-semibold tracking-tight text-[#0A4D3E] sm:text-4xl">
              One platform.
              <br />
              Multiple MRV workflows.
            </h2>
            <p className="mt-4 text-base text-[#4E6C63] sm:text-lg">
              The same verification engine, applied to every kind of climate claim. Select a workflow to explore it.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
            <div className="flex flex-col gap-2 lg:col-span-5">
              {workflows.map((item, index) => {
                const Icon = item.icon;
                const active = index === workflowIndex;
                return (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => selectWorkflow(index)}
                    onMouseEnter={() => {
                      if (!prefersReducedMotion) selectWorkflow(index);
                    }}
                    className={[
                      "group flex w-full items-center gap-4 rounded-2xl border px-4 py-4 text-left transition-all duration-300 sm:px-5",
                      active
                        ? "border-[#1D9E75]/35 bg-white shadow-[0_18px_40px_-28px_rgba(12,77,62,0.45)]"
                        : "border-transparent bg-transparent hover:border-[#DCEAE2] hover:bg-white/70",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors duration-300",
                        active
                          ? "bg-[#1D9E75] text-white"
                          : "bg-[#EAF3ED] text-[#1D9E75] group-hover:bg-[#1D9E75]/15",
                      ].join(" ")}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={[
                          "block text-sm font-semibold sm:text-base",
                          active ? "text-[#0A4D3E]" : "text-[#3F5E54]",
                        ].join(" ")}
                      >
                        {item.title}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-[#7A958B] sm:text-sm">
                        {item.tags.join(" · ")}
                      </span>
                    </span>
                    <span
                      className={[
                        "h-1.5 w-1.5 shrink-0 rounded-full transition-all duration-300",
                        active ? "scale-125 bg-[#1D9E75]" : "bg-[#C5D7CE]",
                      ].join(" ")}
                    />
                  </button>
                );
              })}
            </div>

            <div className="lg:col-span-7">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeWorkflow.title}
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
                  <div
                    aria-hidden
                    className="pointer-events-none absolute bottom-8 right-10 h-16 w-16 rotate-45 border border-white/10"
                  />
                  {!prefersReducedMotion && (
                    <motion.div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 opacity-40"
                      animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
                      transition={{ duration: 10, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
                      style={{
                        backgroundImage:
                          "radial-gradient(40% 50% at 80% 20%, rgba(255,255,255,0.18), transparent 60%)",
                        backgroundSize: "160% 160%",
                      }}
                    />
                  )}

                  <div className="relative z-10">
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm">
                      <ActiveWorkflowIcon className="h-7 w-7 text-[#DFFBEF]" />
                    </div>
                    <p className="mb-2 font-mono text-[11px] tracking-[0.16em] text-[#9FE1CB]">
                      WORKFLOW 0{workflowIndex + 1}
                    </p>
                    <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">{activeWorkflow.title}</h3>
                    <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/75 sm:text-base">
                      {activeWorkflow.blurb}
                    </p>
                    <div className="mt-7 flex flex-wrap gap-2">
                      {activeWorkflow.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-[#E6F6EF] backdrop-blur-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="mt-8 flex items-center gap-2">
                      {workflows.map((_, i) => (
                        <button
                          key={`wf-dot-${i}`}
                          type="button"
                          aria-label={`Show ${workflows[i].title}`}
                          onClick={() => selectWorkflow(i)}
                          className={[
                            "h-1.5 rounded-full transition-all duration-300",
                            i === workflowIndex ? "w-8 bg-white" : "w-1.5 bg-white/35 hover:bg-white/55",
                          ].join(" ")}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#0a1a1d] py-16 text-white sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_50%_at_50%_0%,rgba(29,158,117,0.12),transparent_55%)]"
        />
        <div className="relative z-10 mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <motion.div {...fadeUp} className="mx-auto mb-12 max-w-2xl text-center sm:mb-14">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#9FE1CB]">Verification</p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">The verification lifecycle</h2>
            <p className="mt-4 text-base text-white/60 sm:text-lg">
              Every project moves through the same eight stages. Select one to see how it works.
            </p>
          </motion.div>

          <div className="relative mb-10 sm:mb-12">
            {/* Base track */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-[6%] right-[6%] top-5 hidden h-[2px] rounded-full bg-white/10 lg:block"
            />
            {/* Progress fill */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute left-[6%] top-5 hidden h-[2px] origin-left rounded-full bg-gradient-to-r from-[#0A4D3E] via-[#1D9E75] to-[#33C08A] lg:block"
              animate={{
                width: `${(lifecycleIndex / (stages.length - 1)) * 88}%`,
              }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              style={{ maxWidth: "88%" }}
            />
            {!prefersReducedMotion && (
              <motion.div
                aria-hidden
                className="pointer-events-none absolute top-[14px] hidden h-3 w-3 -translate-x-1/2 rounded-full bg-[#33C08A] shadow-[0_0_16px_rgba(51,192,138,0.85)] lg:block"
                animate={{
                  left: `calc(6% + ${(lifecycleIndex / (stages.length - 1)) * 88}%)`,
                }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              />
            )}

            <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-4 lg:flex lg:items-start lg:justify-between lg:gap-0">
              {stages.map((stage, index) => {
                const active = index === lifecycleIndex;
                const completed = index < lifecycleIndex;
                return (
                  <button
                    key={stage.title}
                    type="button"
                    onClick={() => selectLifecycle(index)}
                    className="group relative z-[1] flex flex-col items-center bg-transparent text-center lg:w-[12.5%]"
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
                            ? "bg-[#1D9E75] text-white shadow-[0_0_0_6px_rgba(29,158,117,0.18),0_10px_28px_-8px_rgba(29,158,117,0.65)]"
                            : completed
                              ? "border border-[#33C08A]/45 bg-[#1D9E75]/20 text-[#9FE1CB] group-hover:bg-[#1D9E75]/30"
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
                        "max-w-[7.5rem] text-[11px] leading-snug transition-colors duration-300 sm:text-xs",
                        active
                          ? "font-semibold text-white"
                          : completed
                            ? "font-medium text-[#9FE1CB]/85 group-hover:text-white"
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
              key={activeStage.tag}
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
                className="pointer-events-none absolute -right-6 -top-10 font-mono text-[7rem] font-semibold leading-none text-white/[0.04] sm:text-[8.5rem]"
              >
                {String(lifecycleIndex + 1).padStart(2, "0")}
              </div>
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-[#1D9E75]/10 blur-2xl"
              />

              <div className="relative z-10 grid gap-6 md:grid-cols-[auto_1fr] md:items-start md:gap-8">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#33C08A]/30 bg-[#1D9E75]/15 font-mono text-lg font-semibold text-[#9FE1CB]">
                  {String(lifecycleIndex + 1).padStart(2, "0")}
                </div>
                <div>
                  <p className="mb-2 font-mono text-[11px] tracking-[0.16em] text-[#33C08A]">{activeStage.tag}</p>
                  <h3 className="text-xl font-semibold tracking-tight sm:text-2xl md:text-[1.75rem]">
                    {activeStage.title}
                  </h3>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">
                    {activeStage.text}
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-2">
                    {stages.map((_, i) => (
                      <button
                        key={`lc-chip-${i}`}
                        type="button"
                        aria-label={stages[i].title}
                        onClick={() => selectLifecycle(i)}
                        className={[
                          "h-1.5 rounded-full transition-all duration-300",
                          i === lifecycleIndex
                            ? "w-7 bg-[#33C08A]"
                            : i < lifecycleIndex
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

      <section className="bg-[#EEF4F1] py-16 sm:py-20">
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
              See Digital MRV on your own project data.
            </h2>
            <p className="relative z-10 mx-auto mb-8 max-w-2xl text-base text-[#E6F6EF] sm:text-lg">
              Walk through the verification lifecycle with your methodology, evidence streams, and reporting needs.
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
                <Link to="/contact">Talk to an expert</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
};

export default DigitalMrvPage;

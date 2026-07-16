import { Button } from "@/components/ui/button";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type CarbonMarketsPageProps = {
  prefersReducedMotion?: boolean;
};

type MarketTab = "compliance" | "voluntary";

const complianceSamples = [
  {
    name: "EU ETS",
    instrument: "Cap-and-trade",
    status: "Active",
    country: "European Union",
    region: "Europe",
    price: "€60–85 / tCO2e",
  },
  {
    name: "UK ETS",
    instrument: "Cap-and-trade",
    status: "Active",
    country: "United Kingdom",
    region: "Europe",
    price: "£35–50 / tCO2e",
  },
  {
    name: "California Cap-and-Trade",
    instrument: "Cap-and-trade",
    status: "Active",
    country: "United States",
    region: "North America",
    price: "$28–38 / tCO2e",
  },
  {
    name: "RGGI",
    instrument: "Cap-and-trade",
    status: "Active",
    country: "United States",
    region: "North America",
    price: "$12–18 / tCO2e",
  },
];

const voluntarySamples = [
  {
    name: "Verra VCS",
    instrument: "Voluntary credits",
    status: "Active",
    country: "Global",
    region: "Worldwide",
    price: "$4–15 / tCO2e",
  },
  {
    name: "Gold Standard",
    instrument: "Voluntary credits",
    status: "Active",
    country: "Global",
    region: "Worldwide",
    price: "$8–22 / tCO2e",
  },
  {
    name: "Article 6 pilots",
    instrument: "ITMOs / cooperative",
    status: "Planned",
    country: "Multi-country",
    region: "Various",
    price: "Market forming",
  },
  {
    name: "Nature-based portfolio",
    instrument: "Removal credits",
    status: "Active",
    country: "Global",
    region: "Worldwide",
    price: "$12–28 / tCO2e",
  },
];

const diligencePoints = [
  {
    title: "Know the instrument",
    desc: "Compliance schemes and voluntary markets carry different rules, price dynamics and retirement requirements.",
  },
  {
    title: "See regional context",
    desc: "Filter by country and region — the same product surfaces mechanisms and markets from the live database.",
  },
  {
    title: "Track what you hold",
    desc: "From sourcing through retirement, keep purchases tied to project type and standard — not a spreadsheet on the side.",
  },
];

const capabilities = [
  {
    title: "Markets & Mechanisms explorer",
    desc: "Browse compliance mechanisms and carbon credit markets worldwide — searchable, filterable tables backed by live data.",
  },
  {
    title: "Pricing and instrument detail",
    desc: "Price rates, price ranges, covered gases and cumulative credits issued — the fields your team sees in the product.",
  },
  {
    title: "Standards-aware sourcing",
    desc: "Screen project types against Verra, Gold Standard and ICVCM quality expectations before credits enter your portfolio.",
  },
  {
    title: "Connected to the wider platform",
    desc: "Move from market intelligence to global projects, MRV evidence and accounting — one workspace, not disconnected tools.",
  },
];

const standards = ["Verra VCS", "Gold Standard", "ICVCM", "Article 6", "PCAF"];

const tabStats: Record<MarketTab, { total: string; active: string; countries: string; regions: string }> = {
  compliance: { total: "48", active: "41", countries: "32", regions: "6" },
  voluntary: { total: "36", active: "29", countries: "18", regions: "5" },
};

const MarketsDashboardMock = ({
  tab,
  onTabChange,
  prefersReducedMotion,
  compact = false,
}: {
  tab: MarketTab;
  onTabChange: (tab: MarketTab) => void;
  prefersReducedMotion: boolean;
  compact?: boolean;
}) => {
  const rows = (tab === "compliance" ? complianceSamples : voluntarySamples).slice(0, compact ? 3 : 4);
  const stats = tabStats[tab];

  return (
    <div className={`relative mx-auto w-full ${compact ? "max-w-[460px]" : "max-w-[540px] lg:max-w-none"}`}>
      <div
        aria-hidden
        className={`absolute rounded-[36px] bg-[radial-gradient(ellipse_at_center,rgba(29,158,117,0.22),transparent_70%)] ${compact ? "-inset-3" : "-inset-4"}`}
      />
      <div
        className={`relative overflow-hidden border border-white/15 bg-[#0a1a1d]/85 shadow-[0_32px_80px_-36px_rgba(29,158,117,0.55)] backdrop-blur-md ${compact ? "rounded-[22px]" : "rounded-[28px]"}`}
      >
        <div className={`flex items-center justify-between border-b border-white/10 bg-[#1D9E75]/10 ${compact ? "px-4 py-3" : "px-5 py-4"}`}>
          <div>
            <p className={`font-semibold text-white ${compact ? "text-[13px]" : "text-sm"}`}>
              Markets &amp; Mechanisms
            </p>
            {!compact && (
              <p className="text-[11px] text-[#9FE1CB]">
                {tab === "compliance" ? "Compliance mechanisms" : "Carbon credit markets"}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {compact &&
              (["compliance", "voluntary"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onTabChange(key)}
                  className={[
                    "rounded-md px-2 py-1 text-[10px] font-semibold transition",
                    tab === key
                      ? "bg-[#1D9E75] text-[#04342C]"
                      : "text-white/50 hover:text-white/80",
                  ].join(" ")}
                >
                  {key === "compliance" ? "Compliance" : "Voluntary"}
                </button>
              ))}
          </div>
        </div>

        {!compact && (
          <div className="flex gap-2 border-b border-white/8 px-4 py-3">
            {(["compliance", "voluntary"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => onTabChange(key)}
                className={[
                  "rounded-lg px-3 py-1.5 text-[11px] font-semibold transition",
                  tab === key
                    ? "bg-[#1D9E75] text-[#04342C]"
                    : "text-white/50 hover:bg-white/[0.06] hover:text-white/80",
                ].join(" ")}
              >
                {key === "compliance" ? "Compliance" : "Voluntary"}
              </button>
            ))}
          </div>
        )}

        <div className={`grid grid-cols-4 gap-1.5 ${compact ? "px-3 py-2" : "gap-2 px-4 py-3"}`}>
          {[
            ["Total", stats.total],
            ["Active", stats.active],
            ["Countries", stats.countries],
            ["Regions", stats.regions],
          ].map(([label, value]) => (
            <div
              key={label}
              className={`rounded-lg border border-white/8 bg-white/[0.04] text-center ${compact ? "px-1.5 py-1.5" : "rounded-xl px-2.5 py-2.5"}`}
            >
              <p className="text-[8px] font-medium uppercase tracking-wide text-white/45 sm:text-[9px]">
                {label}
              </p>
              <p className={`font-mono font-semibold text-[#9FE1CB] ${compact ? "text-xs" : "mt-0.5 text-sm"}`}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {!compact && (
          <div className="mx-4 mb-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
            <p className="text-[11px] text-white/40">Search mechanisms, countries, regions…</p>
          </div>
        )}

        <div className={`space-y-1.5 ${compact ? "px-3 pb-3" : "space-y-2 px-4 pb-4"}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={prefersReducedMotion ? undefined : { opacity: 0 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-1.5"
            >
              {rows.map((row, i) => (
                <motion.div
                  key={row.name}
                  initial={prefersReducedMotion ? undefined : { opacity: 0, x: 10 }}
                  animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.06 }}
                  className={`rounded-lg border border-white/10 bg-white/[0.04] ${compact ? "px-3 py-2" : "rounded-xl px-3.5 py-3"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className={`truncate font-semibold text-white ${compact ? "text-[12px]" : "text-[13px]"}`}>
                        {row.name}
                      </p>
                      <p className={`text-white/50 ${compact ? "text-[10px]" : "mt-0.5 text-[11px]"}`}>
                        {row.country}
                        {!compact && ` · ${row.region}`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`font-mono font-semibold text-[#9FE1CB] ${compact ? "text-[11px]" : "text-[12px]"}`}>
                        {row.price}
                      </p>
                      {!compact && (
                        <span
                          className={[
                            "mt-1 inline-block rounded-md px-1.5 py-0.5 text-[10px]",
                            row.status === "Active"
                              ? "bg-[#1D9E75]/20 text-[#9FE1CB]"
                              : "bg-[#FFB800]/15 text-[#FFD580]",
                          ].join(" ")}
                        >
                          {row.status}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {!compact && (
          <div className="border-t border-white/10 bg-[#1D9E75]/5 px-4 py-3">
            <div className="mb-2 flex items-end justify-between gap-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-[#9FE1CB]/80">
                Avg. price trend · 12 mo
              </p>
              <p className="font-mono text-[11px] text-[#9FE1CB]">
                {tab === "compliance" ? "+4.2%" : "+8.1%"}
              </p>
            </div>
            <svg viewBox="0 0 200 36" className="h-9 w-full" aria-hidden>
              <defs>
                <linearGradient id="marketsSpark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(29,158,117,0.35)" />
                  <stop offset="100%" stopColor="rgba(29,158,117,0)" />
                </linearGradient>
              </defs>
              <path
                d={
                  tab === "compliance"
                    ? "M0 28 L25 24 L50 26 L75 18 L100 20 L125 12 L150 14 L175 8 L200 10 L200 36 L0 36 Z"
                    : "M0 26 L25 22 L50 24 L75 16 L100 18 L125 10 L150 12 L175 6 L200 8 L200 36 L0 36 Z"
                }
                fill="url(#marketsSpark)"
              />
              <path
                d={
                  tab === "compliance"
                    ? "M0 28 L25 24 L50 26 L75 18 L100 20 L125 12 L150 14 L175 8 L200 10"
                    : "M0 26 L25 22 L50 24 L75 16 L100 18 L125 10 L150 12 L175 6 L200 8"
                }
                fill="none"
                stroke="rgba(159,225,203,0.7)"
                strokeWidth="1.5"
              />
            </svg>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {["Status", "Country", "Region"].map((chip) => (
                <span
                  key={chip}
                  className="rounded-md border border-[#1D9E75]/25 bg-[#1D9E75]/10 px-2 py-1 text-[10px] text-[#9FE1CB]"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CarbonMarketsPage = ({ prefersReducedMotion: prefersReducedMotionProp }: CarbonMarketsPageProps) => {
  const hookReduced = useReducedMotion();
  const prefersReducedMotion = prefersReducedMotionProp ?? !!hookReduced;
  const heroCanvasRef = useRef<HTMLCanvasElement>(null);
  const [marketTab, setMarketTab] = useState<MarketTab>("compliance");
  const rows = marketTab === "compliance" ? complianceSamples : voluntarySamples;

  // Horizontal data streams — market ticker feel, distinct from home waves & AI nodes
  useEffect(() => {
    const canvas = heroCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let frameId = 0;
    let t = 0;

    type Stream = { y: number; speed: number; offset: number; alpha: number };

    const streamCount = prefersReducedMotion ? 0 : 6;
    const streams: Stream[] = [];

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const seedStreams = () => {
      streams.length = 0;
      for (let i = 0; i < streamCount; i++) {
        streams.push({
          y: height * (0.2 + (i / Math.max(streamCount, 1)) * 0.65),
          speed: 0.4 + i * 0.08,
          offset: Math.random() * width,
          alpha: 0.08 + i * 0.025,
        });
      }
    };

    const drawFrame = () => {
      ctx.clearRect(0, 0, width, height);
      for (const stream of streams) {
        ctx.strokeStyle = `rgba(93, 202, 165, ${stream.alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= width; x += 6) {
          const y = stream.y + Math.sin((x + stream.offset) * 0.018 + t) * 6;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        const headX = (stream.offset + t * stream.speed * 40) % (width + 40) - 20;
        const headY = stream.y + Math.sin((headX + stream.offset) * 0.018 + t) * 6;
        const grad = ctx.createRadialGradient(headX, headY, 0, headX, headY, 5);
        grad.addColorStop(0, `rgba(159, 225, 203, ${stream.alpha * 3})`);
        grad.addColorStop(1, "rgba(29, 158, 117, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(headX, headY, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const tick = () => {
      t += 0.016;
      for (const stream of streams) {
        stream.offset += stream.speed;
      }
      drawFrame();
      frameId = window.requestAnimationFrame(tick);
    };

    resize();
    seedStreams();
    drawFrame();

    if (!prefersReducedMotion) {
      frameId = window.requestAnimationFrame(tick);
    }

    const onResize = () => {
      resize();
      seedStreams();
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
      {/* Hero — exactly one viewport */}
      <section className="relative box-border flex h-[100svh] max-h-[100svh] items-center overflow-hidden bg-[#061512] pt-24 text-white sm:pt-28">
        <canvas
          ref={heroCanvasRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(70%_55%_at_20%_30%,rgba(29,158,117,0.18),transparent_55%)]"
        />

        <div className="relative z-10 mx-auto grid w-full max-w-[1280px] items-center gap-8 px-4 py-6 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-10">
          <div>
            <motion.h1
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 18 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.06 }}
              className="max-w-xl text-left text-3xl font-semibold leading-[1.15] tracking-tight sm:text-4xl lg:text-[2.65rem]"
            >
              Credits you can{" "}
              <span className="bg-gradient-to-r from-[#33C08A] via-[#DFFBEF] to-[#33C08A] bg-clip-text text-transparent">
                defend
              </span>
              , not just buy.
            </motion.h1>

            <motion.p
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 14 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.16 }}
              className="mt-4 max-w-lg text-left text-base leading-relaxed text-white/70 sm:mt-5 sm:text-lg"
            >
              Explore compliance mechanisms and voluntary carbon markets with pricing context,
              regional filters and standards alignment — from the Markets &amp; Mechanisms workspace.
            </motion.p>

            <motion.div
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 12 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.28 }}
              className="mt-6 flex flex-wrap gap-2 sm:mt-7"
            >
              {["Compliance", "Voluntary", "50+ markets", "Regional filters"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/15 bg-white/[0.05] px-3 py-1 text-[11px] font-medium text-[#9FE1CB]"
                >
                  {tag}
                </span>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={prefersReducedMotion ? undefined : { opacity: 0, x: 20 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
            transition={{ duration: 0.65, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            className="hidden justify-center lg:flex lg:justify-end"
          >
            <MarketsDashboardMock
              tab={marketTab}
              onTabChange={setMarketTab}
              prefersReducedMotion={prefersReducedMotion}
              compact
            />
          </motion.div>
        </div>
      </section>

      {/* Standards strip */}
      <section className="overflow-hidden border-b border-gray-200 bg-white py-10">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-center gap-x-10 gap-y-4 px-4 sm:px-6 lg:px-10">
          {standards.map((name) => (
            <span
              key={name}
              className="text-sm font-medium tracking-wide text-[#7A958B] transition hover:text-[#0A4D3E]"
            >
              {name}
            </span>
          ))}
        </div>
      </section>

      {/* Interactive market table */}
      <section id="market-explorer" className="bg-[#F8FCFA] py-16 sm:py-20">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <motion.div {...fadeUp} className="mx-auto mb-10 max-w-3xl text-center">
            <h2 className="text-[1.85rem] font-semibold tracking-tight text-[#0A4D3E] sm:text-[2.35rem]">
              Compliance and voluntary markets in one view
            </h2>
            <p className="mt-4 text-base text-[#5B6B63] sm:text-lg">
              Switch between mechanism types — the same tabs and filters users get in Markets &amp;
              Mechanisms after sign-in.
            </p>
          </motion.div>

          <motion.div
            {...fadeUp}
            className="overflow-hidden rounded-[1.75rem] border border-[#DCEAE2] bg-white shadow-[0_24px_60px_-36px_rgba(12,77,62,0.3)]"
          >
            <div className="flex flex-wrap items-center gap-3 border-b border-[#E8EEEA] p-4 sm:p-5">
              <div className="flex flex-wrap gap-2" role="tablist">
                {(["compliance", "voluntary"] as const).map((key) => {
                  const active = marketTab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setMarketTab(key)}
                      className={[
                        "rounded-full px-4 py-2 text-sm font-medium transition",
                        active
                          ? "bg-[#0a1a1d] text-white"
                          : "bg-[#EEF3F0] text-[#3D5A52] hover:bg-[#E2EBE6]",
                      ].join(" ")}
                    >
                      {key === "compliance" ? "Compliance mechanisms" : "Carbon credit markets"}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E8EEEA] bg-[#F3F9F6] text-[11px] font-semibold uppercase tracking-wide text-[#7A958B]">
                    <th className="px-5 py-3.5">Name</th>
                    <th className="px-5 py-3.5">Instrument</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Country</th>
                    <th className="px-5 py-3.5">Region</th>
                    <th className="px-5 py-3.5 text-right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="wait">
                    {rows.map((row, index) => (
                      <motion.tr
                        key={`${marketTab}-${row.name}`}
                        initial={prefersReducedMotion ? undefined : { opacity: 0, x: -6 }}
                        animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
                        exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                        transition={{ duration: 0.25, delay: index * 0.04 }}
                        className="border-b border-[#E8EEEA] last:border-0"
                      >
                        <td className="px-5 py-4 font-semibold text-[#0A4D3E]">{row.name}</td>
                        <td className="px-5 py-4 text-[#5B6B63]">{row.instrument}</td>
                        <td className="px-5 py-4">
                          <span
                            className={[
                              "rounded-full px-2.5 py-1 text-xs font-medium",
                              row.status === "Active"
                                ? "bg-[#E7F3ED] text-[#0A4D3E]"
                                : "bg-[#FFF6E5] text-[#9A6700]",
                            ].join(" ")}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-[#5B6B63]">{row.country}</td>
                        <td className="px-5 py-4 text-[#5B6B63]">{row.region}</td>
                        <td className="px-5 py-4 text-right font-mono text-[13px] text-[#0A4D3E]">
                          {row.price}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Diligence — three columns */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-10">
          <motion.div {...fadeUp} className="mb-12 text-center">
            <h2 className="text-[1.85rem] font-semibold tracking-tight text-[#0A4D3E] sm:text-[2.35rem]">
              Why market intelligence matters
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-[#5B6B63]">
              Buying credits without context creates greenwashing risk. Start with the mechanism,
              the region and the standard.
            </p>
          </motion.div>
          <div className="grid gap-8 sm:grid-cols-3">
            {diligencePoints.map((item, index) => (
              <motion.div
                key={item.title}
                {...fadeUp}
                transition={{ duration: 0.45, delay: index * 0.06 }}
                className="border-l-2 border-[#1D9E75] pl-5"
              >
                <h3 className="text-lg font-semibold text-[#0A4D3E]">{item.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-[#5B6B63]">{item.desc}</p>
              </motion.div>
            ))}
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
              What Carbon Markets actually does
            </h2>
            <div aria-hidden className="mx-auto mt-4 h-[3px] w-14 rounded-full bg-[#1D9E75]" />
            <p className="mt-4 text-base text-[#5B6B63] sm:text-lg">
              Markets &amp; Mechanisms, pricing context and standards screening — not a separate
              spreadsheet for credit sourcing.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2">
            {capabilities.map((item, index) => (
              <motion.article
                key={item.title}
                {...fadeUp}
                transition={{ duration: 0.45, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-2xl border border-[#DCEAE2] bg-white p-6 transition-all duration-300 hover:border-[#1D9E75]/35 hover:shadow-[0_18px_40px_-28px_rgba(12,77,62,0.35)] sm:p-7"
              >
                <h3 className="text-base font-semibold tracking-tight text-[#0A4D3E] sm:text-lg">
                  {item.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-[#5B6B63]">{item.desc}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#DCEAE2] bg-white py-16 sm:py-20">
        <div className="mx-auto grid max-w-[1280px] items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-10">
          <motion.div {...fadeUp}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1D9E75]">Get started</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#0A4D3E] sm:text-3xl md:text-4xl">
              Explore markets and mechanisms
            </h2>
            <p className="mt-4 max-w-md text-base text-[#5B6B63]">
              Sign in to open the full Markets &amp; Mechanisms explorer, or talk to our team about
              sourcing and portfolio tracking.
            </p>
          </motion.div>
          <motion.div {...fadeUp} className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <Button
              size="lg"
              className="rounded-full bg-[#1D9E75] px-8 py-6 font-semibold text-[#04342C] hover:bg-[#22B87E]"
              asChild
            >
              <Link to="/login">
                Open Markets &amp; Mechanisms
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

export default CarbonMarketsPage;

import { Button } from "@/components/ui/button";
import MainHeader from "@/components/layout/MainHeader";
import { Link } from "react-router-dom";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Users,
  Target,
  Globe,
  ArrowRight,
  ChevronDown,
  Clock,
  Brain,
  Calculator,
  Database,
  BarChart3,
  FileText,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const AboutUs = () => {
  const prefersReducedMotion = useReducedMotion();
  const [expandedBios, setExpandedBios] = useState<Record<string, boolean>>({});
  const [api, setApi] = useState<{ scrollNext: () => void } | null>(null);
  const heroCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Soft expanding rings + linked constellation — atmospheric, distinct from homepage waves.
  useEffect(() => {
    const canvas = heroCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let frameId = 0;
    let t = 0;

    type Node = { baseAngle: number; baseDist: number; speed: number; size: number };
    const nodes: Node[] = Array.from({ length: 22 }, (_, i) => ({
      baseAngle: (i / 22) * Math.PI * 2,
      baseDist: 0.1 + (i % 6) * 0.048,
      speed: 0.08 + (i % 5) * 0.02,
      size: 1.4 + (i % 4) * 0.35,
    }));

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const cx = width * 0.5;
      const cy = height * 0.42;
      const maxR = Math.max(width, height) * 0.62;

      for (let i = 0; i < 6; i++) {
        const phase = (t * 0.16 + i * 0.48) % 1;
        const radius = maxR * (0.16 + phase * 0.84);
        const alpha = (1 - phase) * 0.2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(93,202,165,${alpha})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      const points = nodes.map((node, i) => {
        const angle = node.baseAngle + t * node.speed;
        const breathe = 1 + 0.08 * Math.sin(t * 1.1 + i);
        const dist = height * node.baseDist * breathe;
        return {
          x: cx + Math.cos(angle) * dist * 1.4,
          y: cy + Math.sin(angle) * dist,
          pulse: 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 1.5 + i)),
          size: node.size,
        };
      });

      const linkDist = Math.min(width, height) * 0.16;
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const d = Math.hypot(dx, dy);
          if (d < linkDist) {
            const alpha = (1 - d / linkDist) * 0.22;
            ctx.beginPath();
            ctx.moveTo(points[i].x, points[i].y);
            ctx.lineTo(points[j].x, points[j].y);
            ctx.strokeStyle = `rgba(51,192,138,${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      for (const p of points) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + p.pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(29,158,117,${0.2 + p.pulse * 0.28})`;
        ctx.fill();
      }
    };

    resize();
    window.addEventListener("resize", resize);

    if (reduceMotion) {
      draw();
    } else {
      const loop = () => {
        t += 0.008;
        draw();
        frameId = window.requestAnimationFrame(loop);
      };
      loop();
    }

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const toggleBio = (memberName: string) => {
    setExpandedBios((prev) => ({
      ...prev,
      [memberName]: !prev[memberName],
    }));
  };

  const values = [
    {
      icon: Clock,
      title: "Real-Time Feasibility Assessment",
      description:
        "Accelerates planning with instant insights for quicker strategic decisions.",
    },
    {
      icon: Brain,
      title: "AI-Powered Strategist",
      description:
        "Evaluating eligibility against global standards and estimating emission reductions in minutes.",
    },
    {
      icon: Calculator,
      title: "Emissions Modeling",
      description:
        "Providing accurate precise estimates for overall business value and carbon credit potential.",
    },
    {
      icon: Database,
      title: "Global Decarbonization & Energy Transition Databases",
      description: "Offers strategic insights from worldwide projects.",
    },
    {
      icon: BarChart3,
      title: "ESG Healthcheck",
      description:
        "Efficiently measure the ESG performance of an organization, supply chain, or investment portfolio by having a clear snapshot of the current status of ESG management and risks.",
    },
    {
      icon: FileText,
      title: "Comprehensive Reporting",
      description: "Converting insights to reports for executive decisions.",
    },
  ];

  useEffect(() => {
    if (!api || prefersReducedMotion) return;

    const intervalTime = 36000 / values.length;
    const interval = window.setInterval(() => {
      api.scrollNext();
    }, intervalTime);

    return () => window.clearInterval(interval);
  }, [api, prefersReducedMotion, values.length]);

  const milestones = [
    {
      year: "2023",
      title: "Idea Conceived",
      description:
        "Rethink Carbon was created to close the gap between complex carbon markets and businesses that want simple, practical climate solutions.",
    },
    {
      year: "2024",
      title: "Platform Development",
      description:
        "We built our AI-powered carbon management platform with real-time tracking and intuitive tools for organizations of all sizes.",
    },
    {
      year: "2025",
      title: "MVP Ready to Serve",
      description:
        "Our MVP is live, serving early customers and continuously improving based on real-world feedback and results.",
    },
    {
      year: "2026",
      title: "Scaling Beyond MVP",
      description:
        "Moving from MVP to full production, expanding features, and scaling our customer base as Rethink Carbon becomes a core part of how organizations manage carbon and ESG.",
    },
  ];

  const team = [
    {
      name: "Ayla Majid",
      role: "Founder & CEO",
      bio: "Founder of Planetive with a dynamic vision for a fairer world through advocacy that enhances UN Sustainable Development Goals. Creates space for women through economic empowerment and shapes policy through public and private board roles. Expert in energy transition, sustainable finance, and writes regularly on future of energy, digital transformation, and diversity.",
      image: "/team/ayla-majid.jpg",
    },
    {
      name: "Zainab Ahmed",
      role: "Product Owner",
      bio: "A Product & Finance professional with experience in data analytics and climate innovation. Zainab’s work spans research, product development, market analysis, and data-driven decision support, particularly within climate-tech and development-focused projects. She brings hands-on experience in building MVPs and conducting in-depth analysis across emerging climate technologies, policy environments, and decarbonization pathways.",
      image: "/team/zainab-ahmed.jpg",
    },
    {
      name: "Kamal Rahim",
      role: "Co-Founder and Head of Strategy",
      bio: "Accomplished business development professional with engineering background and over a decade in energy sector and industrial digitization. Successfully established 1320 MW power plant, bulk handling sea terminal, and implemented digital twin solutions. Expert in industrial SaaS development and mergers & acquisitions.",
      image: "/team/Kamal PP.jpg",
    },
    {
      name: "Umair Hussian Farooqi",
      role: "Manager of Finance and Business Analysis",
      bio: "Finance graduate with seven years of extensive experience in banking, audit, and accounts. Expert in financial analysis, planning, and strategic recommendations. Skilled in managing comprehensive audits, optimizing financial operations, and ensuring regulatory compliance. Known for analytical prowess and attention to detail.",
      image: "/team/umair.jpeg",
    },
    {
      name: "Shahid Jamal",
      role: "Carbon Credit and Sustainable Agriculture Specialist",
      bio: "Shahid Jamal specializes in carbon credits and sustainable agriculture. He works on regenerative practices and carbon sequestration initiatives.",
      image: "/team/shahid.jpeg",
    },
    {
      name: "Farhan Hassan Rizvi",
      role: "Product Engineer",
      bio: "Farhan is a Climate Tech expert focused on building the core product experience. With a degree in Financial Technology and combining a deep interest in climate-tech, software engineering, and financial systems, he translates complex carbon and ESG data into simple and user-friendly experiences.",
      image: "/team/farhan-hassan-rizvi.jpeg",
    },
    {
      name: "Haram Saad",
      role: "Business Analyst",
      bio: "Haram is a Business Analyst who turns climate and sustainability data into clear, practical insights. She supports product decisions, client workflows, and market analysis that help organizations move from ambition to measurable results.",
      image: "/team/haram-saad.jpeg",
    },
    {
      name: "Sanam Gul",
      role: "Business Support and Communication Lead",
      bio: "Sanam Gul leads business support and communications at Planetive. She coordinates stakeholder engagement, internal operations, and external messaging to ensure clarity and consistency across the firm's advisory and project work.",
      image: "/team/sanam.jpeg",
    },
  ];

  const headlineLead = "Building climate intelligence".split(" ");
  const headlineAccent = "for real-world decarbonization".split(" ");
  const wordContainer = {
    hidden: {},
    show: {
      transition: { staggerChildren: 0.07, delayChildren: 0.12 },
    },
  };
  const wordReveal = {
    hidden: { opacity: 0, y: 18, filter: "blur(10px)" },
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
    },
  };

  const fadeUp = {
    initial: prefersReducedMotion ? undefined : { opacity: 0, y: 22 },
    whileInView: prefersReducedMotion ? undefined : { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.25 },
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  };

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-[#F8FCFA]"
      style={{ fontFamily: "'Manrope', 'Inter', sans-serif" }}
    >
      <MainHeader />

      {/* Hero */}
      <section className="relative flex min-h-[88vh] items-center overflow-hidden bg-[#0a1a1d] pt-28 pb-16 sm:min-h-screen sm:pt-32 sm:pb-20">
        <canvas
          ref={heroCanvasRef}
          aria-hidden
          className="absolute inset-0 h-full w-full"
        />
        <div
          aria-hidden
          className="absolute inset-0 z-[1]"
          style={{
            background:
              "radial-gradient(95% 75% at 50% 40%, rgba(29,158,117,0.14) 0%, rgba(10,26,29,0) 55%), linear-gradient(to bottom, rgba(10,26,29,0.25) 0%, rgba(10,26,29,0) 40%, rgba(10,26,29,0.7) 100%)",
          }}
        />

        {!prefersReducedMotion && (
          <>
            <motion.div
              aria-hidden
              className="pointer-events-none absolute left-[8%] top-[28%] h-40 w-40 rounded-full border border-white/10"
              animate={{ y: [0, -18, 0], opacity: [0.25, 0.5, 0.25], scale: [1, 1.06, 1] }}
              transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              aria-hidden
              className="pointer-events-none absolute right-[10%] top-[22%] h-56 w-56 rounded-full border border-[#33C08A]/15"
              animate={{ y: [0, 20, 0], opacity: [0.2, 0.42, 0.2], rotate: [0, 12, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              aria-hidden
              className="pointer-events-none absolute bottom-[18%] left-[18%] h-24 w-24 rotate-45 border border-white/10"
              animate={{ y: [0, -12, 0], opacity: [0.18, 0.38, 0.18] }}
              transition={{ duration: 8.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </>
        )}

        <div className="container relative z-10 mx-auto px-4 sm:px-6 text-center">
          <motion.p
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 10 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-5 text-[11px] font-semibold uppercase tracking-[0.35em] text-[#9FE1CB] sm:text-xs"
          >
            About Rethink Carbon
          </motion.p>

          <motion.h1
            variants={prefersReducedMotion ? undefined : wordContainer}
            initial={prefersReducedMotion ? undefined : "hidden"}
            animate={prefersReducedMotion ? undefined : "show"}
            className="mx-auto max-w-4xl text-3xl font-semibold leading-[1.12] tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl"
          >
            {headlineLead.map((word, i) => (
              <motion.span
                key={`lead-${i}`}
                variants={prefersReducedMotion ? undefined : wordReveal}
                className="inline-block whitespace-pre"
              >
                {word}{" "}
              </motion.span>
            ))}
            {headlineAccent.map((word, i) => (
              <motion.span
                key={`accent-${i}`}
                variants={prefersReducedMotion ? undefined : wordReveal}
                className="hero-shimmer inline-block whitespace-pre bg-gradient-to-r from-[#33C08A] via-[#DFFBEF] to-[#33C08A] bg-clip-text text-transparent"
              >
                {word}
                {i < headlineAccent.length - 1 ? " " : ""}
              </motion.span>
            ))}
          </motion.h1>

          <motion.p
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.55, ease: "easeOut" }}
            className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-white/70 sm:text-lg md:text-xl"
          >
            We help organizations move from climate ambition to measurable action with AI-powered market insights, emissions intelligence, and ESG workflows.
          </motion.p>

          <motion.div
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16, scale: 0.96 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.72, ease: [0.22, 1, 0.36, 1] }}
            className="mt-9 flex justify-center"
          >
            <Button
              size="lg"
              className="group rounded-full bg-[#1D9E75] px-7 py-6 font-semibold text-[#04342C] shadow-[0_14px_40px_-12px_rgba(29,158,117,0.6)] hover:bg-[#22B87E]"
              asChild
            >
              <Link to="/contact">
                Get in Touch
                <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-200 ease-out group-hover:translate-x-1" />
              </Link>
            </Button>
          </motion.div>
        </div>

        {!prefersReducedMotion && (
          <motion.div
            aria-hidden
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-white/40"
          >
            <ChevronDown className="h-5 w-5" />
          </motion.div>
        )}
      </section>

      {/* Mission & Vision */}
      <section className="bg-[#F8FCFA] py-16 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-14">
            <motion.div {...fadeUp}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#1D9E75]">Our Mission</p>
              <h2 className="mb-5 text-3xl font-semibold tracking-tight text-[#0A4D3E] sm:text-4xl">
                Democratizing Carbon Markets
              </h2>
              <p className="mb-6 text-base leading-relaxed text-[#4E6C63] sm:text-lg">
                We believe that effective carbon management should be accessible to organizations of all sizes. Our platform combines cutting-edge technology with deep industry expertise to provide comprehensive carbon credit solutions.
              </p>
              <div className="space-y-4">
                {[
                  { title: "AI-Powered Insights", body: "Advanced analytics to optimize your carbon strategy" },
                  { title: "Global Network", body: "Access to projects and partners worldwide" },
                  { title: "Transparent Tracking", body: "Real-time monitoring of your carbon impact" },
                ].map((item) => (
                  <div key={item.title} className="border-l-2 border-[#1D9E75]/50 pl-4">
                    <h3 className="font-semibold text-[#0A4D3E]">{item.title}</h3>
                    <p className="text-sm text-[#4E6C63] sm:text-base">{item.body}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              {...fadeUp}
              transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(145deg,#0A4D3E_0%,#11684E_50%,#1D9E75_100%)] p-8 text-white shadow-[0_24px_60px_-28px_rgba(10,77,62,0.55)] sm:p-10"
            >
              <Target className="mb-4 h-10 w-10 text-[#9FE1CB]" />
              <h3 className="mb-3 text-2xl font-semibold">Our Vision</h3>
              <p className="text-base leading-relaxed text-white/85 sm:text-lg">
                To create a world where every organization can easily measure, manage, and monetize their carbon footprint, driving meaningful climate action at scale.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Global Presence */}
      <section className="bg-[#F7F4EE] py-16 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-14">
            <motion.div {...fadeUp}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#1D9E75]">Features</p>
              <h2 className="mb-5 text-3xl font-semibold tracking-tight text-[#0A4D3E] sm:text-4xl">
                Our Global Reach
              </h2>
              <p className="mb-6 text-base leading-relaxed text-[#4E6C63] sm:text-lg">
                With strategic offices in the United Arab Emirates and Pakistan, Rethink Carbon has established a strong global presence to serve our diverse client base.
              </p>
              <div className="space-y-4">
                {[
                  { title: "Middle East Hub", body: "Strategic presence in UAE for regional market access" },
                  { title: "South Asia Operations", body: "Innovation center in Pakistan for emerging market solutions" },
                  { title: "Global Network", body: "Connecting projects and partners across 50+ countries" },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF3ED] text-[#1D9E75]">
                      <Globe className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#0A4D3E]">{item.title}</h3>
                      <p className="text-sm text-[#4E6C63] sm:text-base">{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div {...fadeUp} className="flex justify-center">
              <div className="w-full max-w-md overflow-hidden rounded-[1.5rem] border border-[#DCEAE2] bg-white p-2 shadow-[0_20px_50px_-28px_rgba(12,77,62,0.4)] sm:p-3">
                <div className="h-[200px] overflow-hidden rounded-2xl sm:h-[280px] md:h-[300px]">
                  <img
                    src="/global_presence.jpg"
                    alt="Global Presence Map showing Planetive offices in UAE and Pakistan"
                    className="h-full w-full object-cover object-top"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                  <div className="hidden flex h-full min-h-[180px] flex-col items-center justify-center bg-[#EAF3ED] p-6 text-center">
                    <Globe className="mb-3 h-12 w-12 text-[#1D9E75]" />
                    <h3 className="mb-2 text-lg font-semibold text-[#0A4D3E]">Global Presence</h3>
                    <p className="text-sm text-[#4E6C63]">
                      Strategic offices in UAE and Pakistan serving clients across 50+ countries worldwide.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-[#0a1a1d] py-16 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div {...fadeUp} className="mb-12 text-center sm:mb-14">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#9FE1CB]">Features</p>
            <h2 className="mb-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              How does Rethink Carbon work?
            </h2>
            <p className="mx-auto max-w-3xl text-base text-white/65 sm:text-lg">
              Our core values guide everything we do, from product development to client relationships.
            </p>
          </motion.div>

          <div className="relative">
            <Carousel
              opts={{
                align: "start",
                loop: true,
                duration: 4000,
                skipSnaps: false,
                dragFree: true,
                containScroll: false,
              }}
              setApi={setApi}
              className="w-full"
            >
              <CarouselContent className="-ml-3">
                {values.map((value) => (
                  <CarouselItem key={value.title} className="basis-full pl-3 md:basis-1/2 lg:basis-1/3">
                    <div className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm transition-colors duration-200 hover:border-[#1D9E75]/40 hover:bg-white/[0.07]">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#1D9E75]/20 text-[#9FE1CB]">
                        <value.icon className="h-6 w-6" />
                      </div>
                      <h3 className="mb-3 text-lg font-semibold text-white">{value.title}</h3>
                      <p className="text-sm leading-relaxed text-white/65">{value.description}</p>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden border-white/20 bg-white/10 text-white hover:bg-white/20 md:flex" />
              <CarouselNext className="hidden border-white/20 bg-white/10 text-white hover:bg-white/20 md:flex" />
            </Carousel>
          </div>
        </div>
      </section>

      {/* Milestones */}
      <section className="bg-[#F8FCFA] py-16 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div {...fadeUp} className="mb-12 text-center sm:mb-14">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#1D9E75]">Our Journey</p>
            <h2 className="mb-4 text-3xl font-semibold tracking-tight text-[#0A4D3E] sm:text-4xl">
              Key Milestones
            </h2>
            <p className="mx-auto max-w-3xl text-base text-[#4E6C63] sm:text-lg">
              From startup to industry leader, here are the moments that shaped our growth.
            </p>
          </motion.div>

          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {milestones.map((milestone, index) => (
              <motion.article
                key={milestone.year}
                initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
                whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="rounded-2xl border border-[#DCEAE2] bg-white p-6 shadow-[0_14px_32px_-24px_rgba(12,77,62,0.4)]"
              >
                <div className="mb-2 text-2xl font-semibold text-[#1D9E75] sm:text-3xl">{milestone.year}</div>
                <h3 className="mb-2 text-lg font-semibold text-[#0A4D3E]">{milestone.title}</h3>
                <p className="text-sm leading-relaxed text-[#4E6C63]">{milestone.description}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="bg-[#F7F4EE] py-16 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div {...fadeUp} className="mb-12 text-center sm:mb-14">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#1D9E75]">Our Team</p>
            <h2 className="mb-4 text-3xl font-semibold tracking-tight text-[#0A4D3E] sm:text-4xl">
              Meet the Experts
            </h2>
            <p className="mx-auto max-w-3xl text-base text-[#4E6C63] sm:text-lg">
              Our leadership team brings together decades of experience in climate science, technology, and business.
            </p>
          </motion.div>

          <div className="space-y-8 sm:space-y-10">
            <div className="flex justify-center">
              <TeamCard
                member={team[0]}
                featured
                expanded={!!expandedBios[team[0].name]}
                onToggle={() => toggleBio(team[0].name)}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {team.slice(1).map((member) => (
                <TeamCard
                  key={member.name}
                  member={member}
                  expanded={!!expandedBios[member.name]}
                  onToggle={() => toggleBio(member.name)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#EEF4F1] py-16 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            {...fadeUp}
            className="relative overflow-hidden rounded-[30px] border border-[#2F8F6D]/30 bg-[linear-gradient(140deg,#0A4D3E_0%,#11684E_52%,#22B87E_100%)] px-6 py-14 text-center text-white shadow-[0_18px_45px_rgba(10,77,62,0.30)] sm:px-10 md:py-16"
          >
            <div aria-hidden className="pointer-events-none absolute -bottom-8 -left-8 h-36 w-36 rounded-full border border-white/20" />
            <div aria-hidden className="pointer-events-none absolute top-8 right-10 h-20 w-20 rotate-45 border border-white/18" />
            <h2 className="relative z-10 mb-4 text-2xl font-semibold sm:text-3xl md:text-4xl">
              Ready to Transform Your Carbon Strategy?
            </h2>
            <p className="relative z-10 mx-auto mb-8 max-w-3xl text-base text-[#E6F6EF] sm:text-lg">
              Join thousands of organizations already using Rethink Carbon to accelerate their sustainability journey.
            </p>
            <div className="relative z-10 flex justify-center">
              <Button
                size="lg"
                className="rounded-full bg-[#124740] px-8 py-6 font-semibold text-white hover:bg-[#0F3B35]"
                asChild
              >
                <Link to="/contact">
                  Contact Us
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

type TeamMember = {
  name: string;
  role: string;
  bio: string;
  image: string;
};

const TeamCard = ({
  member,
  featured = false,
  expanded,
  onToggle,
}: {
  member: TeamMember;
  featured?: boolean;
  expanded: boolean;
  onToggle: () => void;
}) => (
  <article
    className={[
      "group/card flex w-full flex-col overflow-hidden rounded-2xl border border-[#DCEAE2] bg-white text-center shadow-[0_16px_36px_-24px_rgba(12,77,62,0.4)] transition-shadow duration-300 hover:shadow-[0_22px_48px_-22px_rgba(12,77,62,0.45)]",
      featured ? "max-w-md" : "",
    ].join(" ")}
  >
    <div className="bg-[linear-gradient(145deg,#0A4D3E_0%,#11684E_60%,#1D9E75_100%)] px-6 pb-8 pt-8 text-white">
      <div
        className={[
          "mx-auto mb-4 overflow-hidden rounded-full border-2 border-white/25 shadow-lg",
          featured ? "h-24 w-24" : "h-20 w-20",
        ].join(" ")}
      >
        <img
          src={member.image}
          alt={member.name}
          className={[
            "h-full w-full object-cover",
            member.name === "Kamal Rahim"
              ? "object-[center_60%]"
              : member.name === "Farhan Hassan Rizvi"
                ? "object-[center_65%]"
                : member.name === "Shahid Jamal"
                  ? "origin-top scale-[1.55] object-top"
                  : member.name === "Umair Hussian Farooqi"
                    ? "object-[center_42%]"
                    : "",
          ].join(" ")}
          onError={(e) => {
            e.currentTarget.style.display = "none";
            e.currentTarget.nextElementSibling?.classList.remove("hidden");
          }}
        />
        <div className="hidden h-full w-full items-center justify-center bg-white/20">
          <Users className={featured ? "h-12 w-12 text-white" : "h-10 w-10 text-white"} />
        </div>
      </div>
      <h3 className={featured ? "text-2xl font-semibold" : "text-xl font-semibold"}>{member.name}</h3>
      <p className="mt-1 text-sm font-medium text-[#9FE1CB]">{member.role}</p>
    </div>

    <div className="flex flex-1 flex-col px-6 pb-6 pt-5 text-left">
      <div
        className={[
          "relative overflow-hidden transition-[max-height] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
          expanded ? "max-h-80" : "max-h-[2.9rem]",
        ].join(" ")}
      >
        <p className="text-sm leading-relaxed text-[#4E6C63]">{member.bio}</p>
        <span
          aria-hidden
          className={[
            "pointer-events-none absolute inset-x-0 bottom-0 h-9 bg-gradient-to-t from-white to-transparent transition-opacity duration-500",
            expanded ? "opacity-0" : "opacity-100",
          ].join(" ")}
        />
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={expanded ? `Hide bio for ${member.name}` : `Show more about ${member.name}`}
        className="mt-3 inline-flex items-center gap-1 self-start text-[#1D9E75]/70 transition-colors duration-300 hover:text-[#1D9E75]"
      >
        <span className="text-[11px] font-medium tracking-[0.14em]">
          {expanded ? "less" : "more"}
        </span>
        <ChevronDown
          className={[
            "h-3.5 w-3.5 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            expanded ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>
    </div>
  </article>
);

export default AboutUs;

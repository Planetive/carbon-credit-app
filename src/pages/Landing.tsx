import { Button } from "@/components/ui/button";
import MainHeader from "@/components/layout/MainHeader";
import EcosystemSection from "@/components/landing/EcosystemSection";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const Landing = () => {
  const [showGetStarted, setShowGetStarted] = useState(false);
  const heroCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Handle scroll to change header background and show/hide Get Started button
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const triggerPoint = window.innerHeight * 0.5; // 50vh (50% of viewport height)
      
      setShowGetStarted(scrollTop > triggerPoint);
    };

    window.addEventListener("scroll", handleScroll);
    // Check initial scroll position
    handleScroll();
    
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Animated emissions/data curves behind the hero. Motion here is meaningful:
  // slow, layered sine waves reading as live decarbonization trend lines.
  useEffect(() => {
    const canvas = heroCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const lineColors = [
      "rgba(93,202,165,0.28)", // #5DCAA5
      "rgba(29,158,117,0.22)", // #1D9E75
      "rgba(15,110,86,0.20)", // #0F6E56
    ];

    const glowColors = [
      "rgba(93,202,165,0.9)", // #5DCAA5
      "rgba(29,158,117,0.85)", // #1D9E75
      "rgba(15,110,86,0.8)", // #0F6E56
    ];

    let width = 0;
    let height = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    // Pointer parallax: waves subtly lean toward the cursor for a live feel.
    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;

    const handlePointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetX = (e.clientX - rect.left) / rect.width - 0.5;
      targetY = (e.clientY - rect.top) / rect.height - 0.5;
    };
    const resetPointer = () => {
      targetX = 0;
      targetY = 0;
    };
    if (!prefersReducedMotion) {
      window.addEventListener("pointermove", handlePointer);
      window.addEventListener("pointerleave", resetPointer);
    }

    let frameId = 0;
    let t = 0;

    const renderWaves = () => {
      ctx.clearRect(0, 0, width, height);
      // ease pointer toward target
      curX += (targetX - curX) * 0.06;
      curY += (targetY - curY) * 0.06;

      for (let i = 0; i < 3; i++) {
        const depth = 1 + i * 0.6; // deeper lines drift more (parallax)
        const parallaxX = curX * 26 * depth;
        const parallaxY = curY * 20 * depth;
        const amp = height * 0.045 + i * height * 0.03;
        const yOffset = height * 0.52 + i * height * 0.11 + parallaxY;
        const speed = 1 + i * 0.3;

        // riding highlight point that glides along the curve
        const headX = ((t * (60 + i * 18)) % (width + 200)) - 100;
        let headY = yOffset;

        ctx.beginPath();
        for (let x = 0; x <= width; x += 8) {
          const y =
            yOffset +
            Math.sin((x - parallaxX) * 0.006 + t * speed + i * 2) * amp;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          if (Math.abs(x - headX) < 8) headY = y;
        }
        ctx.strokeStyle = lineColors[i];
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 12;
        ctx.shadowColor = glowColors[i];
        ctx.stroke();
        ctx.shadowBlur = 0;

        // glowing node traveling the line
        const grad = ctx.createRadialGradient(headX, headY, 0, headX, headY, 7);
        grad.addColorStop(0, glowColors[i]);
        grad.addColorStop(1, "rgba(29,158,117,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(headX, headY, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const draw = () => {
      t += 0.004;
      renderWaves();
      frameId = window.requestAnimationFrame(draw);
    };

    if (prefersReducedMotion) {
      renderWaves();
    } else {
      draw();
    }

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointer);
      window.removeEventListener("pointerleave", resetPointer);
    };
  }, []);

  const userjourney = [
    {
      id: 0,
      title: "Discover",
      description:
          "Access a global repository of decarbonization and energy transition insights.",
    },
    {
      id: 1,
      title: "Evaluate",
      description:
        "Unlock precise decarbonization potential with AI-driven insights in minutes.",
    },
    {
      id: 2,
      title: "Invest",
      description:
        "Maximize efficiency and value across energy transition projects with real-time recommendations.",
    },
    {
      id: 3,
      title: "Monitor",
      description:
        "Monitor progress and compliance with dynamic, data-rich performance dashboards.",
    },
  ];

  const valueProps = [
    {
      id: 1,
      title: "Accelerated Execution",
      description:
        "Cut planning timelines to minutes rather than months through Artificial Intelligence",
    },
    {
      id: 2,
      title: "Expert Precision",
      description:
        "Leverage real-time data and global benchmarks to select optimal technologies and ensure compliance",
    },
    {
      id: 3,
      title: "Cost Optimization",
      description: "Reducing errors and overruns with automated processes",
    },
    {
      id: 4,
      title: "Strengthening Market Leadership",
      description:
        "Position your brand as a decarbonization pioneer, attracting ESG investors and top talent",
    },
    {
      id: 5,
      title: "Mitigate Risks",
      description:
        "Stay ahead of regulatory shifts with predictive analytics, avoiding penalties and delays",
    },
  ];

  // Headline split for a word-by-word blur-in reveal
  const headlineLead = "The future of enterprise decarbonization".split(" ");
  const headlineAccent = ["starts", "here."];
  const wordContainer = {
    hidden: {},
    show: {
      transition: { staggerChildren: 0.07, delayChildren: 0.15 },
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

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F8FCFA]" style={{ fontFamily: "'Manrope', 'Inter', sans-serif" }}>
      {/* Hero Section — animated emissions curves on deep control-room ground */}
      <section className="relative h-screen overflow-hidden bg-[#0a1a1d]">
        {/* Animated data-curve canvas */}
        <canvas
          ref={heroCanvasRef}
          aria-hidden
          className="absolute inset-0 h-full w-full"
        />
        {/* Depth vignette + subtle radial lift behind the headline */}
        <div
          aria-hidden
          className="absolute inset-0 z-[1]"
          style={{
            background:
              "radial-gradient(120% 80% at 50% 35%, rgba(29,158,117,0.1) 0%, rgba(10,26,29,0) 55%), linear-gradient(to bottom, rgba(10,26,29,0.35) 0%, rgba(10,26,29,0) 40%, rgba(10,26,29,0.75) 100%)",
          }}
        />

        {/* Real site header on top */}
        <MainHeader />

        {/* Hero Content */}
        <div className="container mx-auto px-4 sm:px-6 relative z-10 h-full flex items-center justify-center">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="mb-5 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.35em] text-[#9FE1CB]"
            >
              Measure. Decarbonise. Transform.
            </motion.div>

            <motion.h1
              variants={wordContainer}
              initial="hidden"
              animate="show"
              className="mx-auto max-w-[22ch] text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-semibold leading-[1.15] tracking-tight text-white"
            >
              {headlineLead.map((word, i) => (
                <motion.span
                  key={`lead-${i}`}
                  variants={wordReveal}
                  className="inline-block whitespace-pre"
                >
                  {word}{" "}
                </motion.span>
              ))}
              {headlineAccent.map((word, i) => (
                <motion.span
                  key={`accent-${i}`}
                  variants={wordReveal}
                  className="hero-shimmer inline-block whitespace-pre bg-gradient-to-r from-[#33C08A] via-[#DFFBEF] to-[#33C08A] bg-clip-text text-transparent"
                >
                  {word}
                  {i < headlineAccent.length - 1 ? " " : ""}
                </motion.span>
              ))}
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
              className="mt-9 flex justify-center"
            >
              <Button
                size="lg"
                className="group bg-[#1D9E75] hover:bg-[#22B87E] text-[#04342C] font-semibold text-base px-7 py-6 rounded-full shadow-[0_14px_40px_-12px_rgba(29,158,117,0.6)]"
                asChild
              >
                <Link to="/login">
                  See Rethink Carbon in action
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-200 ease-out group-hover:translate-x-1" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Bounce chevron cue */}
        <motion.div
          aria-hidden
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-white/40"
        >
          <ChevronDown className="h-5 w-5" />
        </motion.div>
      </section>

      {/* Stats Section */}
      {/* <section className="py-12 sm:py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-teal-600 mb-1 sm:mb-2">
                  {stat.number}
                </div>
                <div className="text-sm sm:text-base text-gray-600 px-2">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section> */}

      {/* Platform ecosystem — full-bleed interactive constellation */}
      <section className="relative z-20 w-full overflow-hidden bg-[#F7F4EE]">
        <EcosystemSection />
      </section>

      {/* User Journey Section */}
      <section className="relative overflow-hidden bg-[#0a1a1d] py-16 sm:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(90% 60% at 50% 0%, rgba(29,158,117,0.14) 0%, rgba(10,26,29,0) 55%), linear-gradient(to bottom, rgba(10,26,29,0.2) 0%, rgba(10,26,29,0) 40%, rgba(10,26,29,0.55) 100%)",
          }}
        />

        <div className="container relative z-10 mx-auto px-4 sm:px-6">
          <div className="mb-12 text-center sm:mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, amount: 0.45 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="mb-4 px-4 text-2xl font-bold text-white sm:mb-6 sm:text-3xl md:text-4xl lg:text-5xl"
            >
              Your Path to{" "}
              <motion.span
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.45 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
                className="inline-block bg-gradient-to-r from-[#33C08A] via-[#9FEED1] to-[#33C08A] bg-clip-text text-transparent"
              >
                Carbon Excellence
              </motion.span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.45 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
              className="mx-auto max-w-3xl px-4 text-base text-white/65 sm:text-lg md:text-xl"
            >
              Follow our proven 4-step methodology to transform your carbon footprint and accelerate your sustainability journey
            </motion.p>
          </div>

          <div className="mx-auto max-w-6xl">
            <div className="relative grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4">
              {/* Desktop progress rail — draw once, then continuous glow sweep */}
              <div className="journey-rail-track pointer-events-none hidden lg:block" aria-hidden>
                <motion.div
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
                  className="journey-rail-fill"
                />
                <div className="journey-rail-glow" />
                <div className="journey-rail-head" />
              </div>

              {userjourney.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 36 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{
                    duration: 0.55,
                    ease: [0.22, 1, 0.36, 1],
                    delay: 0.28 + index * 0.14,
                  }}
                  className="relative"
                >
                  <div className="relative z-10 mb-5 sm:mb-6">
                    <motion.div
                      initial={{ scale: 0.55, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true, amount: 0.4 }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 18,
                        delay: 0.32 + index * 0.14,
                      }}
                      className={`journey-node-live mx-auto flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white sm:h-16 sm:w-16 sm:text-xl ${
                        index === 0
                          ? "bg-gradient-to-br from-[#33C08A] to-[#1C7A53]"
                          : index === 1
                            ? "bg-gradient-to-br from-[#1C7A53] to-[#0A4D3E]"
                            : index === 2
                              ? "bg-gradient-to-br from-[#0A4D3E] to-[#083E32]"
                              : "bg-gradient-to-br from-[#083E32] to-[#062F26]"
                      }`}
                      style={{
                        animationDelay: `${index * 0.35}s`,
                      }}
                    >
                      {index + 1}
                    </motion.div>
                  </div>

                  <div className="px-2 text-center">
                    <motion.h3
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.4 }}
                      transition={{
                        duration: 0.4,
                        ease: "easeOut",
                        delay: 0.4 + index * 0.14,
                      }}
                      className="mb-2 text-lg font-semibold text-white sm:mb-3 sm:text-xl"
                    >
                      {step.title}
                    </motion.h3>
                    <motion.p
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.4 }}
                      transition={{
                        duration: 0.45,
                        ease: "easeOut",
                        delay: 0.48 + index * 0.14,
                      }}
                      className="text-sm leading-relaxed text-white/60 sm:text-base"
                    >
                      {step.description}
                    </motion.p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* What's In It For You Section */}
      <section className="py-16 sm:py-20 relative overflow-hidden bg-[#F7F4EE]">
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-12 sm:mb-16">
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-8 sm:mb-16 text-[#0A4D3E] px-4"
            >
              WHAT&apos;S IN IT FOR{" "}
              <span className="bg-gradient-to-r from-[#1C7A53] to-[#33C08A] bg-clip-text text-transparent">YOU?</span>
            </motion.h1>
          </div>
          
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8 md:mb-12">
              {valueProps.slice(0, 3).map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.82 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.28, ease: "easeOut", delay: index * 0.05 }}
                  className="group relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-72 lg:h-72 rounded-full p-4 sm:p-6 md:p-8 shadow-2xl transition-all duration-250 hover:scale-105 flex flex-col justify-center text-center text-white border border-white/20"
                  style={{ background: "linear-gradient(to bottom right, #1C7A53, #124740)" }}
                >
                  <div className="absolute top-3 left-3 sm:top-4 sm:left-4 md:top-5 md:left-5 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-[#EAF7F1] rounded-full flex items-center justify-center text-[#0A4D3E] font-bold text-lg sm:text-xl md:text-2xl lg:text-3xl shadow-lg border-2 border-[#BFE3D3]">
                    {item.id}
                  </div>
                  <h2 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold mb-2 sm:mb-3 md:mb-4 mt-4 sm:mt-6 md:mt-8">
                    {item.title}
                  </h2>
                  <p className="text-[10px] sm:text-xs md:text-sm lg:text-base leading-relaxed opacity-90">
                    {item.description}
                  </p>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8">
              {valueProps.slice(3).map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.82 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.28, ease: "easeOut", delay: index * 0.05 }}
                  className="group relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-72 lg:h-72 rounded-full p-4 sm:p-6 md:p-8 shadow-2xl transition-all duration-250 hover:scale-105 flex flex-col justify-center text-center text-white border border-white/20"
                  style={{ background: "linear-gradient(to bottom right, #1C7A53, #124740)" }}
                >
                  <div className="absolute top-3 left-3 sm:top-4 sm:left-4 md:top-5 md:left-5 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-[#EAF7F1] rounded-full flex items-center justify-center text-[#0A4D3E] font-bold text-lg sm:text-xl md:text-2xl lg:text-3xl shadow-lg border-2 border-[#BFE3D3]">
                    {item.id}
                  </div>
                  <h2 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold mb-2 sm:mb-3 md:mb-4 mt-4 sm:mt-6 md:mt-8">
                    {item.title}
                  </h2>
                  <p className="text-[10px] sm:text-xs md:text-sm lg:text-base leading-relaxed opacity-90">
                    {item.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 bg-[#EEF4F1] text-[#0A4D3E]">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-[30px] border border-[#2F8F6D]/30 bg-[linear-gradient(140deg,#0A4D3E_0%,#11684E_52%,#22B87E_100%)] shadow-[0_18px_45px_rgba(10,77,62,0.30)] px-6 sm:px-10 md:px-14 py-14 sm:py-16 md:py-20 text-center text-white">
            <div aria-hidden className="pointer-events-none absolute -bottom-8 -left-8 h-36 w-36 rounded-full border border-white/20" />
            <div aria-hidden className="pointer-events-none absolute bottom-2 left-2 h-24 w-24 rounded-full border border-white/20" />
            <div aria-hidden className="pointer-events-none absolute top-10 right-10 h-20 w-20 rotate-45 border border-white/18" />
            <div aria-hidden className="pointer-events-none absolute top-6 right-6 h-28 w-28 rotate-45 border border-white/12" />

            <h2 className="relative z-10 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 px-4">
              Ready to Transform Your
              <span className="block">
                <span className="text-[#BFE3D3]">Decarbonization</span>{" "}
                <span className="text-white">Journey?</span>
              </span>
            </h2>
            <p className="relative z-10 text-base sm:text-lg md:text-xl mb-7 sm:mb-8 max-w-3xl mx-auto text-[#E6F6EF] px-4">
              Join industry leaders in accelerating <span className="text-[#BFE3D3] font-medium">sustainable change</span>. Our proven strategies help you reduce <span className="text-[#BFE3D3] font-medium">emissions</span>, optimize <span className="text-[#BFE3D3] font-medium">energy use</span>, and meet your <span className="text-[#BFE3D3] font-medium">net-zero goals</span> efficiently and effectively.
            </p>
            <div className="relative z-10 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4">
              <Button
                size="lg"
                className="text-base sm:text-lg px-7 sm:px-9 py-4 sm:py-6 w-full sm:w-auto bg-[#124740] hover:bg-[#0F3B35] text-white font-semibold rounded-full shadow-[0_14px_40px_-12px_rgba(18,71,64,0.55)]"
                asChild
              >
                <Link to="/contact">
                  Contact Us
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Fixed Bottom Right Button - Only shows after scrolling past hero */}
      <AnimatePresence>
        {showGetStarted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-50"
          >
            <Button
              size="lg"
              className="shadow-lg hover:shadow-xl transition-all duration-200 bg-[#124740] hover:bg-[#0F3B35] text-white font-semibold text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3"
              asChild
            >
              <Link to="/login">Get Started</Link>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Landing;


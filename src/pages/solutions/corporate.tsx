import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import MainHeader from "../../components/ui/MainHeader";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const CorporateSolutions = () => {
  const [visibleCards, setVisibleCards] = useState<Set<number>>(new Set());
  const [visibleBenefits, setVisibleBenefits] = useState<Set<number>>(new Set());
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const benefitRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Generate stable random values for orbs
  const orbs = React.useMemo(() => 
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      size: Math.random() * 300 + 150,
      left: Math.random() * 100,
      top: Math.random() * 100,
      opacity1: Math.random() * 0.15 + 0.05,
      opacity2: Math.random() * 0.1 + 0.03,
      xMovement: Math.random() * 200 - 100,
      yMovement: Math.random() * 200 - 100,
      duration: Math.random() * 10 + 15,
      delay: Math.random() * 5,
    })), []
  );

  const particles = React.useMemo(() =>
    Array.from({ length: 15 }, (_, i) => ({
      id: i,
      size: Math.random() * 20 + 10,
      left: Math.random() * 100,
      top: Math.random() * 100,
      xMovement: Math.random() * 100 - 50,
      yMovement: Math.random() * 100 - 50,
      duration: Math.random() * 8 + 10,
      delay: Math.random() * 5,
    })), []
  );

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    // Observe cards
    cardRefs.current.forEach((ref, index) => {
      if (ref) {
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                setVisibleCards((prev) => new Set(prev).add(index));
              }
            });
          },
          {
            threshold: 0.1,
            rootMargin: "0px 0px -50px 0px",
          }
        );
        observer.observe(ref);
        observers.push(observer);
      }
    });

    // Observe benefits with staggered delay
    benefitRefs.current.forEach((ref, index) => {
      if (ref) {
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                setTimeout(() => {
                  setVisibleBenefits((prev) => new Set(prev).add(index));
                }, index * 100); // Stagger animation
              }
            });
          },
          {
            threshold: 0.1,
            rootMargin: "0px 0px -50px 0px",
          }
        );
        observer.observe(ref);
        observers.push(observer);
      }
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 relative overflow-hidden">
      {/* Animated Background Orbs/Globes */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {orbs.map((orb) => (
          <motion.div
            key={orb.id}
            className="absolute rounded-full"
            style={{
              width: `${orb.size}px`,
              height: `${orb.size}px`,
              left: `${orb.left}%`,
              top: `${orb.top}%`,
              background: `radial-gradient(circle, rgba(20,184,166,${orb.opacity1}), rgba(5,150,105,${orb.opacity2}))`,
              filter: 'blur(60px)',
            }}
            animate={{
              x: [0, orb.xMovement, 0],
              y: [0, orb.yMovement, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: orb.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: orb.delay,
            }}
          />
        ))}
        {/* Smaller floating particles */}
        {particles.map((particle) => (
          <motion.div
            key={`particle-${particle.id}`}
            className="absolute rounded-full bg-teal-400/20"
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              left: `${particle.left}%`,
              top: `${particle.top}%`,
            }}
            animate={{
              x: [0, particle.xMovement, 0],
              y: [0, particle.yMovement, 0],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: particle.delay,
            }}
          />
        ))}
      </div>

      <div className="relative z-10">
        <MainHeader />

      {/* Hero Section */}
      <motion.section 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden bg-white"
      >
        <div className="container mx-auto px-6 py-20 md:py-32">
          <div className="max-w-5xl mx-auto text-center">
            {/* Badges */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="flex flex-wrap items-center justify-center gap-3 mb-12"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded bg-gray-900 text-white text-sm font-medium">
                <span>Carbon Intelligence for Corporates</span>
              </div>
            </motion.div>

            {/* Main Heading */}
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight mb-6 tracking-tight"
            >
              Your end-to-end decarbonisation partner
              <br />
              <motion.span 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="text-teal-600 inline-block"
              >
                from measurement to action
              </motion.span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="text-xl md:text-2xl text-gray-600 mb-10 max-w-4xl mx-auto leading-relaxed"
            >
              Measure emissions, assess ESG performance, and build credible decarbonisation and energy transition roadmaps — powered by data, standards, and AI.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.6 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                to="/register?user_type=corporate"
                className="group inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg font-medium text-base hover:bg-gray-800 transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                Sign up free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/contact"
                className="group inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 border-2 border-gray-900 rounded-lg font-medium text-base hover:bg-gray-50 transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                Request demo
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Two-Column Section */}
      <section className="relative pt-16 md:pt-24 pb-12 overflow-hidden bg-white">
        <div className="relative z-10">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              {/* Main Heading */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight text-gray-900"
              >
                The Corporate Decarbonisation Suite
              </motion.h2>
              
              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed"
              >
                Not just reporting. <span className="text-teal-600 font-semibold">Real transformation.</span>
              </motion.p>
            </div>
          </div>
           <div className="max-w-6xl mx-auto">
            {/* Feature 1 - Carbon Footprint Measurement */}
            <motion.div
              ref={(el) => (cardRefs.current[0] = el)}
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              className="relative bg-teal-800 rounded-2xl p-8 md:p-10 shadow-xl transition-all duration-300 ease-out group cursor-pointer"
              whileHover={{ 
                scale: 1.03, 
                y: -8,
                boxShadow: "0 25px 50px -12px rgba(15, 118, 110, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)"
              }}
            >
              {/* Hover glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-teal-600/0 via-cyan-500/0 to-teal-600/0 group-hover:from-teal-600/20 group-hover:via-cyan-500/20 group-hover:to-teal-600/20 transition-all duration-300 opacity-0 group-hover:opacity-100" />
              
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="relative z-10 grid md:grid-cols-2 gap-8"
              >
                <div>
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">
                    Carbon Footprint Measurement
                  </h3>
                  <p className="text-teal-100 mb-2 font-medium">Understand where your emissions come from — accurately</p>
                </div>
                <div>
                  <ul className="text-teal-50 space-y-2 mb-6 text-sm leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-teal-300 font-semibold mt-0.5">•</span>
                      <span>Scope 1, 2, and relevant Scope 3 emissions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-300 font-semibold mt-0.5">•</span>
                      <span>Activity-based and spend-based calculations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-300 font-semibold mt-0.5">•</span>
                      <span>Aligned with GHG Protocol and global reporting standards</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-300 font-semibold mt-0.5">•</span>
                      <span>Transparent, auditable data outputs</span>
                    </li>
                  </ul>
                  <Link
                    to="/emission-calculator"
                    className="group inline-flex items-center gap-2 px-5 py-2.5 bg-white text-teal-800 font-medium text-sm rounded-lg hover:bg-teal-50 transition-all duration-200 hover:shadow-md"
                  >
                    Start measuring
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section className="bg-white pt-6 pb-20 md:pt-8 md:pb-24">
         <div className="container mx-auto px-6 fade-in">
           <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
            {/* Card 1 - ESG Assessments */}
            <motion.div
              ref={(el) => (cardRefs.current[1] = el)}
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
              className="relative bg-teal-800 rounded-2xl p-8 md:p-10 shadow-xl transition-all duration-300 ease-out group cursor-pointer"
              whileHover={{ 
                scale: 1.03, 
                y: -8,
                boxShadow: "0 25px 50px -12px rgba(15, 118, 110, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)"
              }}
            >
              {/* Hover glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-teal-600/0 via-cyan-500/0 to-teal-600/0 group-hover:from-teal-600/20 group-hover:via-cyan-500/20 group-hover:to-teal-600/20 transition-all duration-300 opacity-0 group-hover:opacity-100" />
              
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="relative z-10"
              >
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">
                  ESG Assessments & Readiness
                </h3>
                <p className="text-teal-100 mb-2 font-medium">Move from compliance pressure to strategic clarity</p>
                <ul className="text-teal-50 space-y-2 mb-6 text-sm leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-teal-300 font-semibold mt-0.5">•</span>
                    <span>ESG gap analysis aligned with leading frameworks</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal-300 font-semibold mt-0.5">•</span>
                    <span>Identification of material risks and opportunities</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal-300 font-semibold mt-0.5">•</span>
                    <span>Regulatory and investor-readiness insights</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal-300 font-semibold mt-0.5">•</span>
                    <span>Clear prioritisation of actions</span>
                  </li>
                </ul>
                <Link
                  to="/esg-health-check"
                  className="group inline-flex items-center gap-2 px-5 py-2.5 bg-white text-teal-800 font-medium text-sm rounded-lg hover:bg-teal-50 transition-all duration-200 hover:shadow-md"
                >
                  Assess your readiness
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            </motion.div>

            {/* Card 2 - AI Carbon Strategist */}
            <motion.div
              ref={(el) => (cardRefs.current[2] = el)}
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
              className="relative bg-teal-800 rounded-2xl p-8 md:p-10 shadow-xl transition-all duration-300 ease-out group cursor-pointer"
              whileHover={{ 
                scale: 1.03, 
                y: -8,
                boxShadow: "0 25px 50px -12px rgba(15, 118, 110, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)"
              }}
            >
              {/* Hover glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-teal-600/0 via-cyan-500/0 to-teal-600/0 group-hover:from-teal-600/20 group-hover:via-cyan-500/20 group-hover:to-teal-600/20 transition-all duration-300 opacity-0 group-hover:opacity-100" />
              
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="relative z-10"
              >
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">
                  AI Carbon Strategist
                </h3>
                <p className="text-teal-100 mb-2 font-medium">From data to decisions</p>
                <p className="text-teal-50 mb-4 text-sm leading-relaxed">
                  Our AI Carbon Strategist transforms your emissions and operational data into actionable insights:
                </p>
                <ul className="text-teal-50 space-y-2 mb-6 text-sm leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-teal-300 font-semibold mt-0.5">•</span>
                    <span>Decarbonisation pathways</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal-300 font-semibold mt-0.5">•</span>
                    <span>Energy transition scenarios</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal-300 font-semibold mt-0.5">•</span>
                    <span>Cost, impact, and feasibility comparisons</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal-300 font-semibold mt-0.5">•</span>
                    <span>Short-, medium-, and long-term action plans</span>
                  </li>
                </ul>
                <Link
                  to="/ai-advisor"
                  className="group inline-flex items-center gap-2 px-5 py-2.5 bg-white text-teal-800 font-medium text-sm rounded-lg hover:bg-teal-50 transition-all duration-200 hover:shadow-md"
                >
                  Explore AI strategist
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            </motion.div>

            {/* Card 3 - Roadmaps */}
            <motion.div
              ref={(el) => (cardRefs.current[3] = el)}
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
              className="relative bg-teal-800 rounded-2xl p-8 md:p-10 md:col-span-2 shadow-xl transition-all duration-300 ease-out group cursor-pointer"
              whileHover={{ 
                scale: 1.02, 
                y: -8,
                boxShadow: "0 25px 50px -12px rgba(15, 118, 110, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)"
              }}
            >
              {/* Hover glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-teal-600/0 via-cyan-500/0 to-teal-600/0 group-hover:from-teal-600/20 group-hover:via-cyan-500/20 group-hover:to-teal-600/20 transition-all duration-300 opacity-0 group-hover:opacity-100" />
              
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="relative z-10 grid md:grid-cols-2 gap-8"
              >
                <div>
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">
                    Decarbonisation & Energy Transition Roadmaps
                  </h3>
                  <p className="text-teal-100 mb-2 font-medium">Plan what to reduce, when, and how</p>
                </div>
                <div>
                  <ul className="text-teal-50 space-y-2 text-sm leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-teal-300 font-semibold mt-0.5">•</span>
                      <span>Science-aligned reduction pathways</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-300 font-semibold mt-0.5">•</span>
                      <span>Sector-specific mitigation options</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-300 font-semibold mt-0.5">•</span>
                      <span>Renewable energy and efficiency scenarios</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-300 font-semibold mt-0.5">•</span>
                      <span>Capital planning and sequencing support</span>
                    </li>
                  </ul>
                  <Link
                    to="/project-wizard"
                    className="group inline-flex items-center gap-2 px-5 py-2.5 bg-white text-teal-800 font-medium text-sm rounded-lg hover:bg-teal-50 transition-all duration-200 hover:shadow-md mt-6"
                  >
                    Build your roadmap
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative py-16 md:py-24 flex items-center">
        <div className="container mx-auto px-6 relative z-10 fade-in">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12 text-center">
              Why choose ReThink Carbon
            </h2>
            <div className="grid md:grid-cols-2 gap-6 md:ml-12">
              <div
                ref={(el) => (benefitRefs.current[0] = el)}
                className={`flex items-start gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-xl border border-teal-200/50 shadow-lg transition-all duration-1000 ease-out hover:shadow-xl hover:scale-[1.04] hover:border-teal-300 ${
                  visibleBenefits.has(0)
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 -translate-x-16"
                }`}
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center mt-1 shadow-lg ring-2 ring-teal-200/50">
                  <span className="text-white text-sm font-bold">✓</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">End-to-end coverage</p>
                  <p className="text-gray-600 text-sm">Measure → assess → plan → act</p>
                </div>
              </div>
              <div
                ref={(el) => (benefitRefs.current[1] = el)}
                className={`flex items-start gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-xl border border-teal-200/50 shadow-lg transition-all duration-1000 ease-out hover:shadow-xl hover:scale-[1.04] hover:border-teal-300 ${
                  visibleBenefits.has(1)
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 translate-x-16"
                }`}
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center mt-1 shadow-lg ring-2 ring-teal-200/50">
                  <span className="text-white text-sm font-bold">✓</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">AI-enabled, expert-validated</p>
                  <p className="text-gray-600 text-sm">Powered by AI, validated by experts</p>
                </div>
              </div>
              <div
                ref={(el) => (benefitRefs.current[2] = el)}
                className={`flex items-start gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-xl border border-teal-200/50 shadow-lg transition-all duration-1000 ease-out hover:shadow-xl hover:scale-[1.04] hover:border-teal-300 ${
                  visibleBenefits.has(2)
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 -translate-x-16"
                }`}
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center mt-1 shadow-lg ring-2 ring-teal-200/50">
                  <span className="text-white text-sm font-bold">✓</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">Built for emerging and global markets</p>
                  <p className="text-gray-600 text-sm">Designed for diverse market needs</p>
                </div>
              </div>
              <div
                ref={(el) => (benefitRefs.current[3] = el)}
                className={`flex items-start gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-xl border border-teal-200/50 shadow-lg transition-all duration-1000 ease-out hover:shadow-xl hover:scale-[1.04] hover:border-teal-300 ${
                  visibleBenefits.has(3)
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 translate-x-16"
                }`}
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center mt-1 shadow-lg ring-2 ring-teal-200/50">
                  <span className="text-white text-sm font-bold">✓</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">Aligned with international standards</p>
                  <p className="text-gray-600 text-sm">GHG Protocol, PCAF, TCFD, and more</p>
                </div>
              </div>
              <div
                ref={(el) => (benefitRefs.current[4] = el)}
                className={`flex items-start gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-xl border border-teal-200/50 shadow-lg transition-all duration-1000 ease-out hover:shadow-xl hover:scale-[1.04] hover:border-teal-300 md:col-span-2 ${
                  visibleBenefits.has(4)
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-12"
                }`}
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center mt-1 shadow-lg ring-2 ring-teal-200/50">
                  <span className="text-white text-sm font-bold">✓</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">Designed for decision-makers</p>
                  <p className="text-gray-600 text-sm">Not just for sustainability teams — built for executives and strategic planning</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
};

export default CorporateSolutions;

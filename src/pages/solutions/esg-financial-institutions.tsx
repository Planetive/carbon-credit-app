import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import MainHeader from "../../components/ui/MainHeader";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const ESGFinancialInstitutions = () => {
  const [visibleCards, setVisibleCards] = useState<Set<number>>(new Set());
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

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

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 relative overflow-hidden">
      <div className="relative z-10">
        <MainHeader />

        {/* Hero Section */}
        <section className="relative overflow-hidden bg-white">
          <div className="container mx-auto px-6 py-20 md:py-32">
            <div className="max-w-5xl mx-auto text-center">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="flex flex-wrap items-center justify-center gap-3 mb-12"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded bg-gray-900 text-white text-sm font-medium">
                  <span>Carbon Intelligence for Financial Institutions</span>
                </div>
              </motion.div>

              {/* Main Heading */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight mb-6 tracking-tight"
              >
                Climate intelligence for <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.8, ease: "easeOut" }}
                  className="text-teal-600 inline-block"
                >
                  portfolio-level
                </motion.span> decision making
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                className="text-xl md:text-2xl text-gray-600 mb-10 max-w-4xl mx-auto leading-relaxed"
              >
                Measure financed and facilitated emissions, assess <span className="text-teal-600 font-semibold">climate-related financial risks</span>, and build forward-looking portfolio strategies — all in one integrated climate risk suite.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Link
                  to="/contact"
                  className="group inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg font-medium text-base hover:bg-gray-800 transition-all duration-300 hover:scale-105 hover:shadow-xl"
                >
                  Request a Portfolio Demo
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/contact"
                  className="group inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 border-2 border-gray-900 rounded-lg font-medium text-base hover:bg-gray-50 transition-all duration-300 hover:scale-105 hover:shadow-xl"
                >
                  Speak to a Climate Risk Expert
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Framework Logos Carousel */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="bg-white py-12 border-b border-gray-200 overflow-hidden"
        >
          <div className="relative">
            <div className="flex animate-scroll-logos">
              {/* First set of logos */}
              {[
                { name: "PCAF", src: "/frameworks/PCAF.png" },
                { name: "SASB", src: "/frameworks/SASB.png" },
                { name: "Science Based Targets", src: "/frameworks/Science based targets.png" },
                { name: "TCFD", src: "/frameworks/TCFD.png" },
                { name: "CSRD", src: "/frameworks/CSRD.png" },
                { name: "ISSB", src: "/frameworks/ISSB.png" },
              ].map((logo, index) => (
                <div
                  key={`first-${index}`}
                  className="flex-shrink-0 mx-8 flex items-center justify-center w-[200px] h-[120px]"
                >
                  <img
                    src={logo.src}
                    alt={logo.name}
                    className="max-w-full max-h-full object-contain grayscale hover:grayscale-0 transition-all duration-300 opacity-70 hover:opacity-100"
                  />
                </div>
              ))}
              {/* Duplicate set for seamless loop */}
              {[
                { name: "PCAF", src: "/frameworks/PCAF.png" },
                { name: "SASB", src: "/frameworks/SASB.png" },
                { name: "Science Based Targets", src: "/frameworks/Science based targets.png" },
                { name: "TCFD", src: "/frameworks/TCFD.png" },
                { name: "CSRD", src: "/frameworks/CSRD.png" },
                { name: "ISSB", src: "/frameworks/ISSB.png" },
              ].map((logo, index) => (
                <div
                  key={`second-${index}`}
                  className="flex-shrink-0 mx-8 flex items-center justify-center w-[200px] h-[120px]"
                >
                  <img
                    src={logo.src}
                    alt={logo.name}
                    className="max-w-full max-h-full object-contain grayscale hover:grayscale-0 transition-all duration-300 opacity-70 hover:opacity-100"
                  />
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Who It's For */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="py-16 md:py-24 bg-gray-100"
        >
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight">
                  Designed for financial institutions managing climate risk
                </h2>
                <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                  Rethink Carbon supports financial institutions that need a clear, defensible view of climate exposure across lending, investment, and capital markets activities.
                </p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { title: "Banks & DFIs", description: "Comprehensive climate risk assessment for lending portfolios" },
                  { title: "Asset Managers", description: "Portfolio-level emissions and risk analytics" },
                  { title: "Private Equity & Infrastructure Funds", description: "Climate exposure across investments" },
                  { title: "Risk, ESG & Strategy Teams", description: "Integrated climate intelligence platform" },
                ].map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
                    whileHover={{ 
                      scale: 1.05, 
                      y: -8,
                    }}
                    className="relative bg-white rounded-xl p-6 border-2 border-teal-300 shadow-lg hover:shadow-xl hover:border-teal-500 transition-all duration-200 cursor-pointer group"
                  >
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-teal-50/0 to-cyan-50/0 group-hover:from-teal-50/50 group-hover:to-cyan-50/30 transition-all duration-200 opacity-0 group-hover:opacity-100 pointer-events-none" />
                    <h3 className="text-lg font-bold text-gray-900 mb-2 relative z-10 group-hover:text-teal-700 transition-colors">{item.title}</h3>
                    <p className="text-sm text-gray-600 relative z-10">{item.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* The Financial Institutions Suite */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="relative pt-8 md:pt-12 pb-8 overflow-hidden bg-white"
        >
          <div className="relative z-10">
            <div className="container mx-auto px-6">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 leading-tight">
                    A complete <span className="text-teal-600">climate risk</span> & portfolio decarbonisation suite
                  </h2>
                  <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                    Rethink Carbon brings together emissions accounting, climate risk assessment, and scenario analysis to help financial institutions move from disclosure-driven reporting to decision-useful insights.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* All Modules Section - Bento Layout */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="bg-white pt-6 pb-20 md:pt-8 md:pb-24"
        >
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Module 1: Financed & Facilitated Emissions - Full Width */}
              <motion.div
                ref={(el) => (cardRefs.current[0] = el)}
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                className="relative bg-teal-800 rounded-2xl p-8 md:p-10 shadow-xl transition-all duration-150 ease-out group cursor-pointer md:col-span-2"
                whileHover={{ 
                  scale: 1.03, 
                  y: -8,
                  boxShadow: "0 25px 50px -12px rgba(15, 118, 110, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)"
                }}
                transition={{ duration: 0.15 }}
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-teal-600/0 via-cyan-500/0 to-teal-600/0 group-hover:from-teal-600/20 group-hover:via-cyan-500/20 group-hover:to-teal-600/20 transition-all duration-150 opacity-0 group-hover:opacity-100" />
                
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 1.1 }}
                  className="relative z-10"
                >
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">
                    Financed & facilitated emissions measurement
                  </h3>
                  <p className="text-teal-100 mb-2 font-medium">Understand the carbon exposure embedded across your portfolio and capital markets activities.</p>
                  <ul className="text-teal-50 space-y-2 mb-6 text-sm leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-teal-300 font-semibold mt-0.5">•</span>
                      <span>Financed emissions across loans, investments, and underwriting</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-300 font-semibold mt-0.5">•</span>
                      <span>Facilitated emissions linked to capital markets and advisory services</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-300 font-semibold mt-0.5">•</span>
                      <span>Sector, asset-class, and counterparty-level attribution</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-300 font-semibold mt-0.5">•</span>
                      <span>Methodologies aligned with PCAF and global best practice</span>
                    </li>
                  </ul>
                  <p className="text-white font-semibold text-sm mt-4">
                    Outcome: Clear visibility into which sectors, clients, and assets drive portfolio emissions.
                  </p>
                </motion.div>
              </motion.div>

              {/* Module 2: Portfolio Climate Risk Assessment */}
              <motion.div
                ref={(el) => (cardRefs.current[1] = el)}
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                className="relative bg-teal-800 rounded-2xl p-8 md:p-10 shadow-xl transition-all duration-150 ease-out group cursor-pointer"
                whileHover={{ 
                  scale: 1.03, 
                  y: -8,
                  boxShadow: "0 25px 50px -12px rgba(15, 118, 110, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)"
                }}
                transition={{ duration: 0.15 }}
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-teal-600/0 via-cyan-500/0 to-teal-600/0 group-hover:from-teal-600/20 group-hover:via-cyan-500/20 group-hover:to-teal-600/20 transition-all duration-150 opacity-0 group-hover:opacity-100" />
                
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 1.2 }}
                  className="relative z-10"
                >
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">
                    Portfolio-level climate risk assessment
                  </h3>
                  <p className="text-teal-100 mb-4 font-medium">Identify where climate-related risks translate into financial exposure across your balance sheet.</p>
                  <ul className="text-teal-50 space-y-2 mb-6 text-sm leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-teal-300 font-semibold mt-0.5">•</span>
                      <span>Physical and transition risk screening</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-300 font-semibold mt-0.5">•</span>
                      <span>Exposure analysis by sector, geography, and asset class</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-300 font-semibold mt-0.5">•</span>
                      <span>Identification of high-risk assets and concentration risks</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-300 font-semibold mt-0.5">•</span>
                      <span>Alignment with TCFD and supervisory expectations</span>
                    </li>
                  </ul>
                  <p className="text-white font-semibold text-sm">
                    Outcome: A defensible view of climate risks across your portfolio.
                  </p>
                </motion.div>
              </motion.div>

              {/* Module 3: Scenario Analysis & Stress Testing */}
              <motion.div
                ref={(el) => (cardRefs.current[2] = el)}
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
                className="relative bg-teal-800 rounded-2xl p-8 md:p-10 shadow-xl transition-all duration-150 ease-out group cursor-pointer"
                whileHover={{ 
                  scale: 1.03, 
                  y: -8,
                  boxShadow: "0 25px 50px -12px rgba(15, 118, 110, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)"
                }}
                transition={{ duration: 0.15 }}
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-teal-600/0 via-cyan-500/0 to-teal-600/0 group-hover:from-teal-600/20 group-hover:via-cyan-500/20 group-hover:to-teal-600/20 transition-all duration-150 opacity-0 group-hover:opacity-100" />
                
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 1.3 }}
                  className="relative z-10"
                >
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">
                    Scenario analysis & climate stress testing
                  </h3>
                  <p className="text-teal-100 mb-4 font-medium">Move beyond historical data with forward-looking climate scenarios.</p>
                  <ul className="text-teal-50 space-y-2 mb-6 text-sm leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-teal-300 font-semibold mt-0.5">•</span>
                      <span>Multiple climate and transition pathways</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-300 font-semibold mt-0.5">•</span>
                      <span>Policy, technology, and market-driven scenarios</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-300 font-semibold mt-0.5">•</span>
                      <span>Portfolio resilience and emissions trajectory analysis</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-300 font-semibold mt-0.5">•</span>
                      <span>Identification of hotspots under different futures</span>
                    </li>
                  </ul>
                  <p className="text-white font-semibold text-sm">
                    Outcome: Forward-looking insights to support strategy, risk governance, and disclosures.
                  </p>
                </motion.div>
              </motion.div>

              {/* Module 4: Portfolio Decarbonisation & Transition Planning - Full Width 2-Column */}
              <motion.div
                ref={(el) => (cardRefs.current[3] = el)}
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
                className="relative bg-teal-800 rounded-2xl p-8 md:p-10 shadow-xl transition-all duration-150 ease-out group cursor-pointer md:col-span-2"
                whileHover={{ 
                  scale: 1.02, 
                  y: -8,
                  boxShadow: "0 25px 50px -12px rgba(15, 118, 110, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)"
                }}
                transition={{ duration: 0.15 }}
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-teal-600/0 via-cyan-500/0 to-teal-600/0 group-hover:from-teal-600/20 group-hover:via-cyan-500/20 group-hover:to-teal-600/20 transition-all duration-150 opacity-0 group-hover:opacity-100" />
                
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 1.4 }}
                  className="relative z-10 grid md:grid-cols-2 gap-8"
                >
                  <div>
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">
                      Portfolio decarbonisation & transition planning
                    </h3>
                    <p className="text-teal-100 mb-2 font-medium">Turn analysis into actionable capital allocation strategies.</p>
                  </div>
                  <div>
                    <ul className="text-teal-50 space-y-2 text-sm leading-relaxed">
                      <li className="flex items-start gap-2">
                        <span className="text-teal-300 font-semibold mt-0.5">•</span>
                        <span>Science-aligned portfolio reduction pathways</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-teal-300 font-semibold mt-0.5">•</span>
                        <span>Client and sector engagement prioritisation</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-teal-300 font-semibold mt-0.5">•</span>
                        <span>Transition finance opportunity identification</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-teal-300 font-semibold mt-0.5">•</span>
                        <span>Medium- and long-term portfolio roadmaps</span>
                      </li>
                    </ul>
                    <p className="text-white font-semibold text-sm mt-6">
                      Outcome: A clear, credible roadmap for managing climate exposure while enabling transition.
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* How It Works */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="bg-gray-100 py-16 md:py-24"
        >
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  How Rethink Carbon works for financial institutions
                </h2>
              </div>
              <div className="grid md:grid-cols-4 gap-6">
                {[
                  { step: "1", title: "Portfolio Data Integration", description: "Connect and integrate your portfolio data" },
                  { step: "2", title: "Emissions & Risk Quantification", description: "Calculate emissions and assess risks" },
                  { step: "3", title: "Scenario Modelling & Hotspot Identification", description: "Model scenarios and identify hotspots" },
                  { step: "4", title: "Strategic Insights & Roadmaps", description: "Generate actionable strategies and roadmaps" },
                ].map((item, index) => (
                  <motion.div
                    key={item.step}
                    initial={{ opacity: 0, y: 30, scale: 0.9 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.15, ease: "easeOut" }}
                    whileHover={{ 
                      scale: 1.05, 
                      y: -5,
                      boxShadow: "0 10px 25px -5px rgba(20, 184, 166, 0.3)"
                    }}
                    className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm text-center hover:border-teal-300 transition-all duration-200 cursor-pointer group"
                  >
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ duration: 0.2 }}
                      className="w-12 h-12 rounded-full bg-teal-600 text-white font-bold text-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-teal-700 transition-colors"
                    >
                      {item.step}
                    </motion.div>
                    <h3 className="font-bold text-lg text-gray-900 mb-2 group-hover:text-teal-700 transition-colors">{item.title}</h3>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* Why Rethink Carbon */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="bg-gradient-to-br from-gray-50 to-white py-16 md:py-24"
        >
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                  Built for <span className="text-teal-600">financial decision-makers</span>
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto mt-4">
                  Empowering institutions with the tools and insights needed to navigate climate risk and drive sustainable portfolio decisions.
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-8 mb-16">
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm hover:shadow-lg hover:border-teal-300 transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <motion.div
                      whileHover={{ rotate: 360, scale: 1.1 }}
                      transition={{ duration: 0.5 }}
                      className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center"
                    >
                      <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </motion.div>
                    <h3 className="text-xl font-bold text-gray-900">What institutions gain</h3>
                  </div>
                  <ul className="space-y-3">
                    {[
                      "Improved transparency into portfolio carbon exposure",
                      "Early identification of climate-related financial risks",
                      "Stronger climate risk governance",
                      "Better-informed capital allocation decisions",
                      "Credible support for net-zero and sustainable finance goals",
                    ].map((item, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                        className="flex items-start gap-3"
                      >
                        <span className="text-teal-600 font-bold mt-0.5">•</span>
                        <span className="text-gray-700">{item}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm hover:shadow-lg hover:border-teal-300 transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <motion.div
                      whileHover={{ rotate: -360, scale: 1.1 }}
                      transition={{ duration: 0.5 }}
                      className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center"
                    >
                      <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </motion.div>
                    <h3 className="text-xl font-bold text-gray-900">Key capabilities</h3>
                  </div>
                  <ul className="space-y-3">
                    {[
                      "Portfolio-first architecture",
                      "Financed & facilitated emissions coverage",
                      "Forward-looking scenario modelling",
                      "AI-enabled, expert-validated insights",
                      "Emerging and global market relevance",
                      "Regulatory and disclosure alignment",
                    ].map((item, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: 10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                        className="flex items-start gap-3"
                      >
                        <span className="text-teal-600 font-bold mt-0.5">•</span>
                        <span className="text-gray-700">{item}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Final CTA */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="bg-gray-900 text-white py-16 md:py-24"
        >
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6"
              >
                Make climate risk a strategic advantage
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto"
              >
                Move from climate data to portfolio-level decisions that protect capital and support the real-economy transition.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Link
                  to="/contact"
                  className="group inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 rounded-lg font-medium text-base hover:bg-gray-100 transition-all duration-300 hover:scale-105 hover:shadow-xl"
                >
                  Request a Portfolio Demo
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/contact"
                  className="group inline-flex items-center gap-2 px-6 py-3 bg-transparent text-white border-2 border-white rounded-lg font-medium text-base hover:bg-white/10 transition-all duration-300 hover:scale-105"
                >
                  Speak to Our Climate Risk Team
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="text-gray-400 text-sm mt-12"
              >
                Rethink Carbon — climate intelligence for financial decision-makers.
              </motion.p>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default ESGFinancialInstitutions;

import { Button } from "@/components/ui/button";
import MainHeader from "@/components/layout/MainHeader";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const Landing = () => {
  const [activeFeatureSlide, setActiveFeatureSlide] = useState(0);
  const [showGetStarted, setShowGetStarted] = useState(false);
  const [typedHeroSubtitle, setTypedHeroSubtitle] = useState("");
  
  // Keep explicit image-to-feature mapping so text always matches screenshot
  const featureSlides = [
    {
      image: "/Features/AI%20Advisor.png",
      title: "AI-Powered Strategist",
      description:
        "Evaluating eligibility against global standards and estimating emission reductions in minutes.",
    },
    {
      image: "/Features/Decarbonization.png",
      title: "Global Decarbonization & Energy Transition Databases",
      description: "Offers strategic insights from worldwide projects.",
    },
    {
      image: "/Features/emission%20result.png",
      title: "Emissions Modeling",
      description:
        "Providing accurate precise estimates for overall business value and carbon credit potential.",
    },
    {
      image: "/Features/ESG%20health%20check.png",
      title: "ESG Healthcheck",
      description:
        "Efficiently measure ESG performance with a clear snapshot of management status and risks.",
    },
    {
      image: "/Features/Reports.png",
      title: "Comprehensive Reporting",
      description: "Converting insights to reports for executive decisions.",
    },
  ];

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

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveFeatureSlide((prev) => (prev + 1) % featureSlides.length);
    }, 3200);

    return () => window.clearInterval(interval);
  }, [featureSlides.length]);

  useEffect(() => {
    const subtitleText = "Advancing Decarbonisation Through Market Intelligence.";
    let index = 0;

    const typer = window.setInterval(() => {
      index += 1;
      setTypedHeroSubtitle(subtitleText.slice(0, index));

      if (index >= subtitleText.length) {
        window.clearInterval(typer);
      }
    }, 45);

    return () => window.clearInterval(typer);
  }, []);

  const userjourney = [
    {
      id: 0,
      title: "Discover",
      description:
          "Access a global repository of decarbonisation and energy transition insights.",
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

  const activeFeatureIndex = activeFeatureSlide;

  return (
    <div className="min-h-screen bg-[#F8FCFA]" style={{ fontFamily: "'Manrope', 'Inter', sans-serif" }}>
      {/* Hero Section with Full Screen Video */}
      <section className="relative h-screen overflow-hidden">
        {/* Video Background */}
        <div className="absolute inset-0 w-full h-full">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
            poster="/placeholder-video-poster.jpg"
          >
            <source src="/hero-background_3.mp4" type="video/mp4" />
            <source src="/hero-background_3.webm" type="video/webm" />
            {/* Fallback for browsers that don't support video */}
            <div className="w-full h-full bg-gradient-to-br from-teal-50 via-cyan-50 to-green-50"></div>
          </video>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/45 to-black/40 z-[1]" />

        {/* Header positioned on top of video */}
        <MainHeader />

        {/* Hero Content */}
        <div className="container mx-auto px-4 sm:px-6 relative z-10 h-full flex items-center justify-center">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex flex-col sm:flex-row items-center justify-center mb-4 sm:mb-6">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold leading-tight text-white tracking-[0.01em]">
                <span className="text-white">RETHINK</span>{" "}
                <span className="bg-gradient-to-r from-[#7DD9B5] to-[#33C08A] bg-clip-text text-transparent">
                  CARBON
                </span>
              </h1>
            </div>
            <p className="text-lg sm:text-xl md:text-2xl text-[#BFE3D3] mb-6 sm:mb-8 max-w-3xl mx-auto leading-relaxed px-4 font-normal tracking-[0.01em]">
              {typedHeroSubtitle}
              <motion.span
                aria-hidden
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                className="ml-0.5 text-[#33C08A]"
              >
                |
              </motion.span>
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-8 sm:mb-12 px-4">
              <Button
                size="lg"
                className="bg-[#1C7A53] hover:bg-[#186747] text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 w-full sm:w-auto text-white"
                asChild
              >
                <Link to="/login">
                  Start Your Journey
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
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

      {/* Features Section */}
      <section id="features" className="py-16 sm:py-20 bg-gradient-to-br from-[#0A4D3E] via-[#0F5B49] to-[#0C3F34] text-white">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 px-4"
            >
              One unified platform for every
              <motion.span
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.45, ease: "easeOut", delay: 0.15 }}
                className="bg-gradient-to-r from-[#7DD9B5] to-[#33C08A] bg-clip-text text-transparent inline-block"
              >
                {" "}step of the journey
              </motion.span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.45, ease: "easeOut", delay: 0.22 }}
              className="text-base sm:text-lg md:text-xl text-[#D6EFE5] max-w-3xl mx-auto px-4"
            >
              Accelerating your decarbonization journey with AI-driven assessments, optimization, tracking, and market intelligence
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.2 }}
            className="flex justify-center items-center"
          >
            <div className="w-full max-w-5xl">
              <div className="rounded-3xl bg-transparent p-0 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
                <div className="rounded-2xl bg-[#083E32] p-1.5 sm:p-2 border border-[#1C7A53]/40">
                  <div className="mb-1.5 flex items-center justify-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-500"></span>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-slate-700/60">
                    <div
                      className="flex transition-transform duration-700 ease-out"
                      style={{
                        transform: `translateX(-${activeFeatureIndex * 100}%)`,
                      }}
                    >
                      {featureSlides.map((slide, index) => (
                        <div
                          key={slide.image}
                          className="w-full flex-shrink-0 p-1 sm:p-1.5"
                        >
                          <div className="rounded-lg bg-white/96 p-1.5 sm:p-2 shadow-md">
                            <img
                              src={slide.image}
                              alt={slide.title}
                              className="h-64 sm:h-80 md:h-[27rem] lg:h-[30rem] w-full object-cover rounded-md"
                              style={{ objectPosition: "center" }}
                              onError={(e) => {
                                e.currentTarget.src = featureSlides[0].image;
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 text-center">
                <p className="text-sm sm:text-base md:text-lg font-semibold text-white">
                  {featureSlides[activeFeatureIndex]?.title}
                </p>
                <p className="mt-2 text-xs sm:text-sm md:text-base text-[#D6EFE5] max-w-3xl mx-auto">
                  {featureSlides[activeFeatureIndex]?.description}
                </p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  {featureSlides.map((slide, index) => (
                    <button
                      key={`feature-dot-${index}`}
                      type="button"
                      onClick={() => setActiveFeatureSlide(index)}
                      aria-label={`Show ${slide.title}`}
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        index === activeFeatureIndex
                          ? "w-8 bg-[#33C08A]"
                          : "w-2.5 bg-[#9BC4B5] hover:bg-[#BFE3D3]"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* User Journey Section */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-[#EEF7F3] to-[#E4F2EC]">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 px-4"
            >
              Your Path to
              <motion.span
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.45, ease: "easeOut", delay: 0.15 }}
                className="bg-gradient-to-r from-[#1C7A53] to-[#33C08A] bg-clip-text text-transparent inline-block"
              >
                {" "}Carbon Excellence
              </motion.span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.45, ease: "easeOut", delay: 0.22 }}
              className="text-base sm:text-lg md:text-xl text-[#456D5F] max-w-3xl mx-auto px-4"
            >
              Follow our proven 4-step methodology to transform your carbon footprint and accelerate your sustainability journey
            </motion.p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 relative">
              {/* Connection lines for desktop */}
              <div className="hidden lg:block absolute top-20 left-0 right-0 h-0.5 bg-gradient-to-r from-[#BFE3D3] via-[#7DD9B5] to-[#33C08A]" style={{ top: '80px' }}></div>
              
              {userjourney.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, scale: 0.85 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.3, ease: "easeOut", delay: index * 0.08 }}
                  className="relative"
                >
                  {/* Step number circle */}
                  <div className="relative z-10 mb-4 sm:mb-6">
                    <div className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl ${
                      index === 0 ? 'bg-gradient-to-br from-[#33C08A] to-[#1C7A53]' :
                      index === 1 ? 'bg-gradient-to-br from-[#1C7A53] to-[#0A4D3E]' :
                      index === 2 ? 'bg-gradient-to-br from-[#0A4D3E] to-[#083E32]' :
                      'bg-gradient-to-br from-[#083E32] to-[#062F26]'
                    }`} style={{ boxShadow: '8px 8px 16px rgba(10, 77, 62, 0.26)' }}>
                      {index + 1}
                    </div>
                  </div>
                  
                  {/* Step content */}
                  <div className="text-center px-2">
                    <h3 className="text-lg sm:text-xl font-semibold text-[#0A4D3E] mb-2 sm:mb-3">
                      {step.title}
                    </h3>
                    <p className="text-sm sm:text-base text-[#456D5F] leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* What's In It For You Section */}
      <section className="py-16 sm:py-20 relative overflow-hidden bg-[#0A4D3E]">
        {/* Background with overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A4D3E] to-[#0C5A46]">
          {/* You can add a background image here if needed */}
        </div>
        
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-12 sm:mb-16">
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-8 sm:mb-16 text-white drop-shadow-xl px-4"
            >
              WHAT&apos;S IN IT FOR{" "}
              <span className="bg-gradient-to-r from-[#BFE3D3] to-[#33C08A] bg-clip-text text-transparent">YOU?</span>
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
                  style={{ background: "linear-gradient(to bottom right, #1C7A53, #0A4D3E)" }}
                >
                  <div className="absolute top-3 left-3 sm:top-4 sm:left-4 md:top-5 md:left-5 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-[#EAF7F1] rounded-full flex items-center justify-center text-[#0A4D3E] font-bold text-xl sm:text-2xl md:text-3xl lg:text-4xl shadow-lg border-2 border-[#BFE3D3]">
                    {item.id}
                  </div>
                  <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold mb-2 sm:mb-3 md:mb-4 mt-4 sm:mt-6 md:mt-8">
                    {item.title}
                  </h2>
                  <p className="text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed opacity-90">
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
                  style={{ background: "linear-gradient(to bottom right, #1C7A53, #0A4D3E)" }}
                >
                  <div className="absolute top-3 left-3 sm:top-4 sm:left-4 md:top-5 md:left-5 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-[#EAF7F1] rounded-full flex items-center justify-center text-[#0A4D3E] font-bold text-xl sm:text-2xl md:text-3xl lg:text-4xl shadow-lg border-2 border-[#BFE3D3]">
                    {item.id}
                  </div>
                  <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold mb-2 sm:mb-3 md:mb-4 mt-4 sm:mt-6 md:mt-8">
                    {item.title}
                  </h2>
                  <p className="text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed opacity-90">
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
                className="text-base sm:text-lg px-7 sm:px-9 py-4 sm:py-6 w-full sm:w-auto bg-[#33C08A] text-[#083E32] hover:bg-[#7DD9B5] rounded-full shadow-[0_10px_30px_rgba(51,192,138,0.35)]"
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
              className="shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-[#33C08A] to-[#1C7A53] hover:from-[#2DB57F] hover:to-[#186747] text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3 text-white"
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


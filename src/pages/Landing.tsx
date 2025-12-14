import { Button } from "@/components/ui/button";
import MainHeader from "@/components/ui/MainHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  Leaf,
  BarChart3,
  Shield,
  Users,
  Globe,
  TrendingUp,
  CheckCircle,
  Star,
  ArrowRight,
  Play,
  Zap,
  Target,
  Award,
  Clock,
  DollarSign,
  ChevronRight,
  ChevronLeft,
  Plus,
  Minus,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const Landing = () => {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [expandedFeature, setExpandedFeature] = useState<number | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showGetStarted, setShowGetStarted] = useState(false);
  
  // Features images array using direct URLs
  const featureImages = [
    "Features/15.png",
    "Features/16.png", 
    "Features/17.png",
    "Features/18.png",
    "Features/19.png",
    "Features/20.png"
  ];

  // Handle scroll to change header background and show/hide Get Started button
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const triggerPoint = window.innerHeight * 0.5; // 50vh (50% of viewport height)
      
      setIsScrolled(scrollTop > 50);
      // Show Get Started button only when scrolled past 50vh
      setShowGetStarted(scrollTop > triggerPoint);
    };

    window.addEventListener("scroll", handleScroll);
    // Check initial scroll position
    handleScroll();
    
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);


  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Sustainability Director",
      company: "GreenTech Solutions",
      content:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      rating: 5,
    },
    {
      name: "Michael Chen",
      role: "Environmental Manager",
      company: "EcoCorp International",
      content:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim veniam, quis nostrud exercitation ullamco.",
      rating: 5,
    },
    {
      name: "Emily Rodriguez",
      role: "Carbon Analyst",
      company: "ClimateFirst",
      content:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis aute irure dolor in reprehenderit in voluptate.",
      rating: 5,
    },
  ];

  const userjourney = [
    {
      id: 0,
      title: "Discover",
      description:
        "Access a global repository of energy transition and CCUS projects for compliance insights.",
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

  const accordionFeatures = [
    {
      id: 0,
      title: "Real-Time Feasibility Assessment",
      description:
        "Accelerates planning with instant insights for quicker strategic decisions.",
    },
    {
      id: 1,
      title: "AI-Powered Strategist",
      description:
        "Evaluating eligibility against global standards and estimating emission reductions in minutes.",
    },
    {
      id: 2,
      title: "Emissions Modeling",
      description:
        "Providing accurate precise estimates for overall business value and carbon credit potential.",
    },
    {
      id: 3,
      title: "Global Decarbonization & Energy Transition Databases",
      description: "Offers strategic insights from worldwide projects.",
    },
    {
      id: 4,
      title: "ESG Healthcheck",
      description:
        "Efficiently measure the ESG performance of an organization, supply chain, or investment portfolio by having a clear snapshot of the current status of ESG management and risks.",
    },
    {
      id: 5,
      title: "Comprehensive Reporting",
      description: "Converting insights to reports for executive decisions.",
    },
  ];

  const stats = [
    { number: "10,000+", label: "Projects Evaluated" },
    { number: "500+", label: "Organizations" },
    { number: "100+", label: "Countries" },
    { number: "1.2M", label: "tCO2e Reduced" },
  ];

  return (
    <div className="min-h-screen bg-background">
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

        {/* Header positioned on top of video */}
        <MainHeader />

        {/* Hero Content */}
        <div className="container mx-auto px-4 sm:px-6 relative z-10 h-full flex items-center justify-center">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex flex-col sm:flex-row items-center justify-center mb-4 sm:mb-6">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold leading-tight text-white" style={{ fontFamily: "'Playfair Display', serif", letterSpacing: '0.02em' }}>
                  ReThink Carbon
              </h1>
            </div>
            <p className="text-lg sm:text-xl md:text-2xl text-white mb-6 sm:mb-8 max-w-3xl mx-auto leading-relaxed px-4 font-normal" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400, letterSpacing: '0.01em' }}>
              Transforming the future of Carbon markets with sophistication and authority
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-8 sm:mb-12 px-4">
              <Button
                size="lg"
                className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 w-full sm:w-auto"
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
      <section id="features" className="py-16 sm:py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 px-4">
              One unified platform for every
              <span className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                {" "}step of the journey
              </span>
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto px-4">
              Accelerating your decarbonization journey with AI-driven assessments, optimization, tracking, and a global database
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 sm:gap-12 items-start">
            {/* Accordion Section - Left 1/3 */}
            <div className="lg:col-span-1 order-2 lg:order-1">
              <div className="bg-gray-50 p-4 sm:p-6 md:p-8 rounded-lg">
                {accordionFeatures.map((feature, index) => (
                  <div key={feature.id} className="mb-4 sm:mb-6 last:mb-0">
                    <button
                      onClick={() =>
                        setExpandedFeature(
                          expandedFeature === feature.id ? -1 : feature.id
                        )
                      }
                      className="w-full text-left flex items-center justify-between py-2 sm:py-3 hover:text-teal-600 transition-colors"
                    >
                      <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 pr-2">
                        {feature.title}
                      </h3>
                      <div className="flex items-center flex-shrink-0">
                        {expandedFeature === feature.id ? (
                          <Minus className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                        ) : (
                          <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                        )}
                      </div>
                    </button>
                    {expandedFeature === feature.id && (
                      <div className="mt-2 sm:mt-3 pb-3 sm:pb-4">
                        <p className="text-gray-700 text-xs sm:text-sm leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    )}
                    {index < accordionFeatures.length - 1 && (
                      <div className="border-b border-gray-200 mt-3 sm:mt-4"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Image Section - Right 2/3 */}
            <div className="lg:col-span-2 order-1 lg:order-2 flex justify-center items-center">
              <div className="h-64 sm:h-80 md:h-96 lg:h-[600px] w-full rounded-xl overflow-hidden">
                <img
                  src={featureImages[expandedFeature !== null && expandedFeature >= 0 ? expandedFeature : 0]}
                  alt={`Feature ${expandedFeature !== null && expandedFeature >= 0 ? expandedFeature + 1 : 1}`}
                  className="h-full w-full object-cover rounded-xl"
                  style={{ objectPosition: 'right center' }}
                  onError={(e) => {
                    // Fallback to first image if current image fails
                    e.currentTarget.src = featureImages[0];
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* User Journey Section */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-teal-50 to-cyan-50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 px-4">
              Your Path to 
              <span className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                {" "}Carbon Excellence
              </span>
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto px-4">
              Follow our proven 4-step methodology to transform your carbon footprint and accelerate your sustainability journey
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 relative">
              {/* Connection lines for desktop */}
              <div className="hidden lg:block absolute top-20 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-200 via-teal-300 to-teal-400" style={{ top: '80px' }}></div>
              
              {userjourney.map((step, index) => (
                <div key={step.id} className="relative">
                  {/* Step number circle */}
                  <div className="relative z-10 mb-4 sm:mb-6">
                    <div className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl ${
                      index === 0 ? 'bg-gradient-to-br from-teal-500 to-teal-600' :
                      index === 1 ? 'bg-gradient-to-br from-teal-600 to-teal-700' :
                      index === 2 ? 'bg-gradient-to-br from-teal-700 to-teal-800' :
                      'bg-gradient-to-br from-teal-800 to-teal-900'
                    }`} style={{ boxShadow: '8px 8px 16px rgba(13, 148, 136, 0.3)' }}>
                      {index + 1}
                    </div>
                  </div>
                  
                  {/* Step content */}
                  <div className="text-center px-2">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">
                      {step.title}
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* What's In It For You Section */}
      <section className="py-16 sm:py-20 relative overflow-hidden">
        {/* Background with overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-teal-50 to-cyan-50">
          {/* You can add a background image here if needed */}
        </div>
        
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-12 sm:mb-16">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-8 sm:mb-16 text-teal-900 drop-shadow-xl px-4">
              WHAT'S IN IT FOR YOU?
            </h1>
          </div>
          
          <div className="max-w-7xl mx-auto">
            {/* Top Row - 3 bubbles */}
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8 md:mb-12">
              {/* Bubble 1 */}
              <div className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-72 lg:h-72 rounded-full p-4 sm:p-6 md:p-8 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 flex flex-col justify-center text-center text-white" style={{ background: 'linear-gradient(to bottom right, #0d9488, #0f766e)' }}>
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 md:top-5 md:left-5 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center text-teal-700 font-bold text-xl sm:text-2xl md:text-3xl lg:text-4xl shadow-lg border-2 border-teal-200">1</div>
                <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold mb-2 sm:mb-3 md:mb-4 mt-4 sm:mt-6 md:mt-8">Accelerated Execution</h2>
                <p className="text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed opacity-90">
                  Cut planning timelines to minutes rather than months through Artificial Intelligence
                </p>
              </div>

              {/* Bubble 2 */}
              <div className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-72 lg:h-72 rounded-full p-4 sm:p-6 md:p-8 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 flex flex-col justify-center text-center text-white" style={{ background: 'linear-gradient(to bottom right, #0d9488, #0f766e)' }}>
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 md:top-5 md:left-5 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center text-teal-700 font-bold text-xl sm:text-2xl md:text-3xl lg:text-4xl shadow-lg border-2 border-teal-200">2</div>
                <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold mb-2 sm:mb-3 md:mb-4 mt-4 sm:mt-6 md:mt-8">Expert Precision</h2>
                <p className="text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed opacity-90">
                  Leverage real-time data and global benchmarks to select optimal technologies and ensure compliance
                </p>
              </div>

              {/* Bubble 3 */}
              <div className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-72 lg:h-72 rounded-full p-4 sm:p-6 md:p-8 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 flex flex-col justify-center text-center text-white" style={{ background: 'linear-gradient(to bottom right, #0d9488, #0f766e)' }}>
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 md:top-5 md:left-5 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center text-teal-700 font-bold text-xl sm:text-2xl md:text-3xl lg:text-4xl shadow-lg border-2 border-teal-200">3</div>
                <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold mb-2 sm:mb-3 md:mb-4 mt-4 sm:mt-6 md:mt-8">Cost Optimization</h2>
                <p className="text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed opacity-90">
                  Reducing errors and overruns with automated processes
                </p>
              </div>
            </div>

            {/* Bottom Row - 2 bubbles */}
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8">
              {/* Bubble 4 */}
              <div className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-72 lg:h-72 rounded-full p-4 sm:p-6 md:p-8 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 flex flex-col justify-center text-center text-white" style={{ background: 'linear-gradient(to bottom right, #0d9488, #0f766e)' }}>
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 md:top-5 md:left-5 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center text-teal-700 font-bold text-xl sm:text-2xl md:text-3xl lg:text-4xl shadow-lg border-2 border-teal-200">4</div>
                <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold mb-2 sm:mb-3 md:mb-4 mt-4 sm:mt-6 md:mt-8">Strengthening Market Leadership</h2>
                <p className="text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed opacity-90">
                  Position your brand as a decarbonization pioneer, attracting ESG investors and top talent
                </p>
              </div>

              {/* Bubble 5 */}
              <div className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-72 lg:h-72 rounded-full p-4 sm:p-6 md:p-8 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 flex flex-col justify-center text-center text-white" style={{ background: 'linear-gradient(to bottom right, #0d9488, #0f766e)' }}>
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 md:top-5 md:left-5 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center text-teal-700 font-bold text-xl sm:text-2xl md:text-3xl lg:text-4xl shadow-lg border-2 border-teal-200">5</div>
                <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold mb-2 sm:mb-3 md:mb-4 mt-4 sm:mt-6 md:mt-8">Mitigate Risks</h2>
                <p className="text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed opacity-90">
                  Stay ahead of regulatory shifts with predictive analytics, avoiding penalties and delays
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-teal-600 to-cyan-700 text-white">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 px-4">
            Ready to Transform Your
            <span className="block">Decarbonization Journey?</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 max-w-3xl mx-auto opacity-90 px-4">
            Join industry leaders in accelerating sustainable change. Our proven strategies help you reduce emissions, optimize energy use, and meet your net-zero goals—efficiently and effectively.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4">
            <Button
              size="lg"
              variant="secondary"
              className="text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 w-full sm:w-auto"
              asChild
            >
              <Link to="/register">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 border-white text-teal-400 hover:bg-white hover:text-teal-600 w-full sm:w-auto"
              asChild
            >
              <Link to="/demo">Schedule Demo</Link>
            </Button>
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
              className="shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-3"
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


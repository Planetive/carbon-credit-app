import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, TrendingUp, Database, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Typewriter from 'typewriter-effect';
import { motion } from 'framer-motion';

// Animated Counter Component
const AnimatedCounter: React.FC<{ target: number; suffix?: string; duration?: number }> = ({ 
  target, 
  suffix = '+', 
  duration = 2000 
}) => {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  const animateCounter = React.useCallback(() => {
    const startTime = Date.now();
    const startValue = 0;
    const endValue = target;

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.floor(startValue + (endValue - startValue) * easeOutQuart);

      setCount(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(endValue);
      }
    };

    requestAnimationFrame(animate);
  }, [target, duration]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            animateCounter();
          }
        });
      },
      { threshold: 0.5 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      if (elementRef.current) {
        observer.unobserve(elementRef.current);
      }
    };
  }, [hasAnimated, animateCounter]);

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return num.toLocaleString('en-US');
    }
    return num.toString();
  };

  return (
    <div ref={elementRef} className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent mb-2">
      {formatNumber(count)}{suffix}
    </div>
  );
};

const ExploreHub: React.FC = () => {
  const navigate = useNavigate();

  const exploreOptions = [
    {
      id: 'global-projects',
      title: 'Global Carbon Projects',
      description: 'Browse and discover verified carbon projects from around the world with detailed analytics and performance metrics.',
      icon: Globe,
      stats: '10,000+ Projects',
      features: ['Real-time data', '100+ Countries', 'Verified projects'],
      gradient: 'from-teal-500 via-emerald-500 to-teal-600',
      bgGradient: 'from-teal-50/50 via-emerald-50/30 to-teal-50/50',
      iconBg: 'bg-gradient-to-br from-teal-500 to-emerald-600'
    },
    {
      id: 'markets-mechanisms',
      title: 'Markets & Mechanisms',
      description: 'Visualize and interact with compliance mechanisms and carbon credit markets data across different regions.',
      icon: TrendingUp,
      stats: '50+ Markets',
      features: ['Market analysis', 'Compliance data', 'Regional insights'],
      gradient: 'from-teal-500 via-cyan-500 to-teal-600',
      bgGradient: 'from-teal-50/50 via-cyan-50/30 to-teal-50/50',
      iconBg: 'bg-gradient-to-br from-teal-500 to-cyan-600'
    },
    {
      id: 'ccus-projects',
      title: 'CCUS Database',
      description: 'Browse and analyze Carbon Capture, Utilization, and Storage projects with comprehensive technical details.',
      icon: Database,
      stats: '1000+ CCUS Projects',
      features: ['Technical analysis', 'Storage capacity', 'Utilization methods'],
      gradient: 'from-emerald-500 via-teal-500 to-emerald-600',
      bgGradient: 'from-emerald-50/50 via-teal-50/30 to-emerald-50/50',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600'
    }
  ];

  const stats = [
    { value: 10000, label: 'Active Projects', icon: Sparkles },
    { value: 50, label: 'Countries', icon: Globe },
    { value: 50, label: 'Carbon Markets', icon: TrendingUp }
  ];

  // Background - Gradient Orbs style
  const renderBackground = () => {
    return (
      <>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-cyan-200/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/20 relative overflow-hidden">
      {/* Background - Gradient Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {renderBackground()}
      </div>

      {/* Hero Section with Modern Gradient */}
      <section className="relative overflow-hidden z-10">
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center mb-16">
            {/* Icon with Modern Design */}
            <motion.div 
              className="inline-flex items-center justify-center mb-8 relative"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full blur-xl opacity-30 animate-pulse"></div>
              <div 
                className="relative z-10 hover:scale-110 transition-transform duration-300"
              >
                <Globe className="h-24 w-24 text-teal-600 relative z-10" style={{
                  filter: 'drop-shadow(0 15px 30px rgba(20, 184, 166, 0.5)) drop-shadow(0 0 50px rgba(16, 185, 129, 0.4))',
                }} />
              </div>
            </motion.div>
            
            {/* Main Heading with Typewriter Effect */}
            <div className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight min-h-[1.2em]">
              <Typewriter
                onInit={(typewriter) => {
                  typewriter
                    .typeString('Explore Carbon Projects')
                    .start();
                }}
                options={{
                  delay: 50,
                  cursor: '|',
                  cursorClassName: 'typewriter-cursor',
                  autoStart: true,
                  loop: false,
                  wrapperClassName: 'bg-gradient-to-r from-gray-900 via-teal-800 to-emerald-800 bg-clip-text text-transparent',
                }}
              />
            </div>
            
            {/* Subtitle */}
            <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed font-medium">
              Discover thousands of verified carbon projects, analyze market mechanisms, and explore CCUS initiatives 
              from around the world. Make informed decisions with comprehensive data and insights.
            </p>
          </div>

          {/* Enhanced Stats Section with Animated Counters */}
          <div className="grid md:grid-cols-3 gap-6 md:gap-8 mb-12">
            {stats.map((stat, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative bg-white/90 backdrop-blur-md rounded-2xl p-6 border border-teal-100/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:border-teal-300"
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${exploreOptions[index]?.iconBg || 'from-teal-500 to-emerald-600'} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                    <stat.icon className="h-7 w-7 text-white" />
            </div>
                  <AnimatedCounter target={stat.value} suffix="+" />
                  <div className="text-gray-600 font-semibold text-sm md:text-base">{stat.label}</div>
            </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="relative py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <motion.div 
            className="mb-12 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
              Explore Options
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              Choose from our comprehensive suite of exploration tools and data sources
            </p>
          </motion.div>

          {/* Enhanced Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {exploreOptions.map((option, index) => (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
              >
                <Card 
                  className="group relative cursor-pointer border-0 bg-white/90 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] overflow-hidden"
                onClick={() => navigate(`/explore/${option.id}`)}
              >
                {/* Gradient Overlay on Hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${option.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                
                {/* Decorative Corner Element */}
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${option.gradient} opacity-0 group-hover:opacity-5 rounded-bl-full transition-opacity duration-500`}></div>
                
                <CardHeader className="relative pb-4">
                  {/* Icon with Enhanced Design */}
                  <div className={`relative w-16 h-16 ${option.iconBg} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-teal-500/30`}>
                    <option.icon className="h-8 w-8 text-white" />
                    <div className="absolute inset-0 bg-white/20 rounded-2xl blur-sm group-hover:blur-md transition-all"></div>
                  </div>
                  
                  <CardTitle className="text-2xl font-bold text-gray-900 group-hover:text-teal-700 transition-colors duration-300 mb-3">
                    {option.title}
                  </CardTitle>
                  <CardDescription className="text-gray-600 leading-relaxed text-base">
                    {option.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="relative pt-0 space-y-5">
                  {/* Stats Badge */}
                    <div className="flex items-center justify-between">
                    <Badge 
                      variant="secondary" 
                      className="bg-gradient-to-r from-teal-50 to-emerald-50 text-teal-700 border border-teal-200/50 font-semibold px-4 py-1.5 shadow-sm group-hover:shadow-md transition-all"
                    >
                        {option.stats}
                      </Badge>
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-teal-50 group-hover:bg-teal-100 transition-colors">
                      <ArrowRight className="h-5 w-5 text-teal-600 group-hover:text-teal-700 group-hover:translate-x-1 transition-all duration-300" />
                    </div>
                  </div>
                  
                  {/* Features List */}
                  <div className="space-y-3 pt-2">
                    {option.features.map((feature, featureIndex) => (
                      <div 
                        key={featureIndex} 
                        className="flex items-center text-sm md:text-base text-gray-600 group-hover:text-gray-700 transition-colors"
                      >
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                          <CheckCircle2 className="h-4 w-4 text-teal-600" />
                        </div>
                        <span className="font-medium">{feature}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ExploreHub; 
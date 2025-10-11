import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MainHeader from "@/components/ui/MainHeader";
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
  Award,
  Globe,
  TrendingUp,
  Shield,
  Lightbulb,
  Heart,
  ArrowRight,
  CheckCircle,
  Star,
  Zap,
  BarChart3,
  Clock,
  Brain,
  Calculator,
  Database,
  FileText,
} from "lucide-react";
import { useState, useEffect } from "react";

const AboutUs = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [expandedBios, setExpandedBios] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [api, setApi] = useState<any>(null);

  const toggleBio = (memberName: string) => {
    setExpandedBios((prev) => ({
      ...prev,
      [memberName]: !prev[memberName],
    }));
  };

  // Handle scroll to change header background
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-rotate carousel with uniform 4-second cycle
  useEffect(() => {
    if (!api) return;

    let interval: NodeJS.Timeout;

    const startRotation = () => {
      // Calculate interval based on number of items and desired cycle time
      const totalItems = values.length;
      const cycleTime = 15000; // 12 seconds for complete cycle
      const intervalTime = cycleTime / totalItems; // Time per slide
      
      interval = setInterval(() => {
        api.scrollNext();
      }, intervalTime);
    };

    const stopRotation = () => {
      if (interval) {
        clearInterval(interval);
      }
    };

    // Start rotation initially
    startRotation();

    // Add hover event listeners to carousel container
    const carouselContainer = document.querySelector('[data-carousel-container]');
    if (carouselContainer) {
      carouselContainer.addEventListener('mouseenter', stopRotation);
      carouselContainer.addEventListener('mouseleave', startRotation);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
      if (carouselContainer) {
        carouselContainer.removeEventListener('mouseenter', stopRotation);
        carouselContainer.removeEventListener('mouseleave', startRotation);
      }
    };
  }, [api]);

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
        "Providing accurate precise estimates for overall business value and carbon credit potential.",
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

  const milestones = [
    {
      year: "2023",
      title: "Idea Conceived",
      description:
        "The vision for ReThink Carbon was born from recognizing the urgent need for accessible carbon management solutions. Our founders identified the gap between complex carbon markets and businesses seeking sustainable solutions.",
    },
    {
      year: "2024",
      title: "Platform Development",
      description:
        "Intensive development phase where we built our comprehensive carbon management platform. Integrated AI-driven insights, real-time tracking, and user-friendly interfaces to democratize carbon markets.",
    },
    {
      year: "2024",
      title: "Global Usage",
      description:
        "Successfully launched and expanded our platform to serve clients across 50+ countries. Established partnerships with leading sustainability organizations and carbon project developers worldwide.",
    },
    {
      year: "2025",
      title: "MVP Ready to Serve",
      description:
        "Our Minimum Viable Product is fully operational and ready to serve businesses of all sizes. We've refined our platform based on user feedback and are positioned to scale rapidly.",
    },
  ];

  const team = [
    {
      name: "Ayla Majid",
      role: "Founder & CEO",
      bio: "Founder of Planetive with a dynamic vision for a fairer world through advocacy that enhances UN Sustainable Development Goals. Creates space for women through economic empowerment and shapes policy through public and private board roles. Expert in energy transition, sustainable finance, and writes regularly on future of energy, digital transformation, and diversity.",
      image: "/team/ayla.webp",
    },
    {
      name: "Zainab Ahmed", 
      role: "Product Owner",
      bio: "Business Finance student with strong foundation in financial analysis, data analytics, and economic strategy. Passionate about sustainable finance and business strategies. Experienced in research and development, data analytics, financial analysis, strategy building, and technical proposal writing.",
      image: "/team/zainab.png",
    },
    {
      name: "Kamal Rahim",
      role: "Head of Strategy & Growth",
      bio: "Accomplished business development professional with engineering background and over a decade in energy sector and industrial digitization. Successfully established 1320 MW power plant, bulk handling sea terminal, and implemented digital twin solutions. Expert in industrial SaaS development and mergers & acquisitions.",
      image: "/team/kamal.webp",
    },
    {
      name: "Umair Hussian Farooqi",
      role: "Manager of Finance and buisness analysis",
      bio: "Finance graduate with seven years of extensive experience in banking, audit, and accounts. Expert in financial analysis, planning, and strategic recommendations. Skilled in managing comprehensive audits, optimizing financial operations, and ensuring regulatory compliance. Known for analytical prowess and attention to detail.",
      image: "/team/umair.webp",
    },
    
    // {
    //   name: "Rida",
    //   role: "Team Member",
    //   bio: "Dedicated team member contributing to our mission of transforming carbon markets through innovation and sustainable solutions.",
    //   image: "/team/rida.webp",
    // },
    // {
    //   name: "Sufia",
    //   role: "Team Member",
    //   bio: "Passionate team member working towards creating a sustainable future through effective carbon management solutions.",
    //   image: "/team/sufia.webp",
    // },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <MainHeader />

      {/* Hero Section */}
      <section className="relative py-12 sm:py-16 md:py-20 bg-gradient-to-br from-teal-600 to-cyan-700 text-white">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <Badge className="m-6 sm:m-6 bg-white/20 text-white border border-white/30">
            About ReThink Carbon
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
            Transforming Carbon Markets
            <span className="block text-teal-200">Through Innovation</span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-teal-100 mb-6 sm:mb-8 max-w-4xl mx-auto leading-relaxed px-4">
            We're on a mission to accelerate the world's transition to a
            sustainable future by making carbon markets more accessible,
            transparent, and effective.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              variant="secondary"
              className="text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 w-full sm:w-auto"
              asChild
            >
              <Link to="/contact">
                Get in Touch
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-8 sm:py-10 md:py-12 bg-white">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 items-center px-4 sm:px-8 md:px-12">
            <div>
              <Badge className="mb-4 bg-teal-100 text-teal-800">
                Our Mission
              </Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 text-gray-900">
                Democratizing Carbon Markets
              </h2>
              <p className="text-base sm:text-lg text-gray-600 mb-4 sm:mb-6 leading-relaxed">
                We believe that effective carbon management should be accessible
                to organizations of all sizes. Our platform combines
                cutting-edge technology with deep industry expertise to provide
                comprehensive carbon credit solutions.
              </p>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-teal-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                      AI-Powered Insights
                    </h3>
                    <p className="text-gray-600 text-sm sm:text-base">
                      Advanced analytics to optimize your carbon strategy
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-teal-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                      Global Network
                    </h3>
                    <p className="text-gray-600 text-sm sm:text-base">
                      Access to projects and partners worldwide
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-teal-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                      Transparent Tracking
                    </h3>
                    <p className="text-gray-600 text-sm sm:text-base">
                      Real-time monitoring of your carbon impact
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl p-6 sm:p-8 text-white">
                <Target className="h-10 w-10 sm:h-12 sm:w-12 mb-3 sm:mb-4" />
                <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Our Vision</h3>
                <p className="text-base sm:text-lg leading-relaxed">
                  To create a world where every organization can easily measure,
                  manage, and monetize their carbon footprint, driving
                  meaningful climate action at scale.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Global Presence */}
      <section className="py-8 sm:py-10 md:py-12 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-8 md:px-16">
            
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 items-center">            
            <div>
            <Badge className="mb-3 sm:mb-4 bg-teal-100 text-teal-800">Features</Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 text-gray-900">
              Our Global Reach
              </h2>
              <p className="text-base sm:text-lg text-gray-600 mb-4 sm:mb-6 leading-relaxed">
                With strategic offices in the United Arab Emirates and Pakistan,
                ReThink Carbon has established a strong global presence to serve
                our diverse client base. 
              </p>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-start gap-3">
                  <Globe className="h-5 w-5 sm:h-6 sm:w-6 text-teal-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                      Middle East Hub
                    </h3>
                    <p className="text-gray-600 text-sm sm:text-base">
                      Strategic presence in UAE for regional market access
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Globe className="h-5 w-5 sm:h-6 sm:w-6 text-teal-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                      South Asia Operations
                    </h3>
                    <p className="text-gray-600 text-sm sm:text-base">
                      Innovation center in Pakistan for emerging market
                      solutions
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Globe className="h-5 w-5 sm:h-6 sm:w-6 text-teal-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                      Global Network
                    </h3>
                    <p className="text-gray-600 text-sm sm:text-base">
                      Connecting projects and partners across 50+ countries
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative flex justify-center items-center">
              <div className="bg-white rounded-3xl p-2 sm:p-3 md:p-4 shadow-2xl transform hover:scale-105 transition-transform duration-300 w-full max-w-xs sm:max-w-sm md:max-w-md">
                <div className="overflow-hidden rounded-2xl" style={{ 
                  height: window.innerWidth > 1000 ? '300px' : '200px', 
                  minHeight: '180px' 
                }}>
                  <img
                    src="/global_presence.jpg"
                    alt="Global Presence Map showing Planetive offices in UAE and Pakistan"
                    className="w-full h-full object-cover object-top"
                    onError={(e) => {
                      console.log('Image failed to load:', e);
                      e.currentTarget.style.display = "none";
                      e.currentTarget.nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                </div>
                <div className="hidden bg-gradient-to-br from-teal-100 to-cyan-100 rounded-2xl p-4 sm:p-6 md:p-8 text-center" style={{ minHeight: '180px', maxHeight: '300px' }}>
                  <Globe className="h-8 w-8 sm:h-12 sm:w-12 md:h-16 md:w-16 text-teal-600 mx-auto mb-2 sm:mb-3 md:mb-4" />
                  <h3 className="text-sm sm:text-lg md:text-xl font-bold text-gray-900 mb-2">Global Presence</h3>
                  <p className="text-xs sm:text-sm md:text-base text-gray-600">
                    Strategic offices in UAE and Pakistan serving clients across 50+ countries worldwide.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-8 sm:py-10 md:py-12 bg-white">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <Badge className="mb-4 bg-teal-100 text-teal-800 border-teal-200">Features</Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 text-gray-900">
              How does ReThink Carbon work?
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto px-4">
              Our core values guide everything we do, from product development
              to client relationships.
            </p>
          </div>
          
          <div className="relative" data-carousel-container>
            <Carousel
              opts={{
                align: "start",
                loop: true,
                duration: 2500, // Faster transition to match calculated interval
                skipSnaps: false,
                dragFree: true, // Allows free dragging for smoother movement
                containScroll: false, // Allows continuous scrolling
              }}
              setApi={setApi}
              className="w-full"
            >
              <CarouselContent className="-ml-2">
                {values.map((value, index) => (
                  <CarouselItem key={index} className="pl-2 basis-full md:basis-1/2 lg:basis-1/3">
                    <Card className="text-center hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-teal-700 to-cyan-800 border-teal-700 hover:from-teal-600 hover:to-cyan-700 hover:scale-105 h-full">
                      <CardHeader className="pb-4">
                        <div className="mx-auto mb-4 w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-full flex items-center justify-center shadow-lg hover:bg-white/30 transition-colors">
                          <value.icon className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                        </div>
                        <CardTitle className="text-lg sm:text-xl text-white font-semibold">{value.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-white/90 leading-relaxed text-sm sm:text-base">{value.description}</p>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden md:flex -left-12 bg-white/80 hover:bg-white border-2 border-teal-200 hover:border-teal-300 shadow-lg" />
              <CarouselNext className="hidden md:flex -right-12 bg-white/80 hover:bg-white border-2 border-teal-200 hover:border-teal-300 shadow-lg" />
            </Carousel>
          </div>
        </div>
      </section>

      {/* Milestones */}
      <section className="py-8 sm:py-10 md:py-12 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <Badge className="mb-4 bg-teal-100 text-teal-800">
              Our Journey
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 text-gray-900">
              Key Milestones
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto px-4">
              From startup to industry leader, here are the moments that shaped
              our growth.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {milestones.map((milestone, index) => (
              <Card
                key={index}
                className="text-center hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="text-2xl sm:text-3xl font-bold text-teal-600 mb-2">
                    {milestone.year}
                  </div>
                  <CardTitle className="text-base sm:text-lg">{milestone.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm sm:text-base text-gray-600">{milestone.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-8 sm:py-10 md:py-12 bg-white">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <Badge className="mb-4 bg-teal-100 text-teal-800">Our Team</Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 text-gray-900">
              Meet the Experts
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto px-4">
              Our leadership team brings together decades of experience in
              climate science, technology, and business.
            </p>
          </div>
          
          <div className="space-y-8 sm:space-y-12">
            {/* Ayla - Featured at top */}
            <div className="flex justify-center">
              <Card className="text-center hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-teal-700 to-cyan-800 border-teal-700 hover:from-teal-600 hover:to-cyan-700 hover:scale-105 max-w-sm sm:max-w-md">
                <CardHeader>
                  <div className="mx-auto mb-4 w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
                    <img
                      src={team[0].image}
                      alt={team[0].name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        e.currentTarget.nextElementSibling?.classList.remove("hidden");
                      }}
                    />
                    <div className="hidden w-full h-full bg-white/20 flex items-center justify-center">
                      <Users className="h-12 w-12 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-xl sm:text-2xl text-white">{team[0].name}</CardTitle>
                  <p className="text-white/90 font-semibold text-sm sm:text-base">{team[0].role}</p>
                </CardHeader>
                <CardContent>
                  <div className="text-white/90 text-sm">
                    <p
                      className={`${
                        expandedBios[team[0].name] ? "" : "line-clamp-2"
                      }`}
                    >
                      {team[0].bio}
                    </p>
                    <button
                      onClick={() => toggleBio(team[0].name)}
                      className="text-white hover:text-white/80 text-sm font-medium mt-2 transition-colors"
                    >
                      {expandedBios[team[0].name] ? "Read Less" : "Read More"}
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Other team members in a row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {team.slice(1).map((member, index) => (
                <Card
                  key={index + 1}
                  className="text-center hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-teal-700 to-cyan-800 border-teal-700 hover:from-teal-600 hover:to-cyan-700 hover:scale-105"
                >
                  <CardHeader>
                    <div className="mx-auto mb-4 w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
                      <img
                        src={member.image}
                        alt={member.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          e.currentTarget.nextElementSibling?.classList.remove("hidden");
                        }}
                      />
                      <div className="hidden w-full h-full bg-white/20 flex items-center justify-center">
                        <Users className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                      </div>
                    </div>
                    <CardTitle className="text-lg sm:text-xl text-white">{member.name}</CardTitle>
                    <p className="text-white/90 font-semibold text-sm sm:text-base">{member.role}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="text-white/90 text-sm">
                      <p
                        className={`${
                          expandedBios[member.name] ? "" : "line-clamp-2"
                        }`}
                      >
                        {member.bio}
                      </p>
                      <button
                        onClick={() => toggleBio(member.name)}
                        className="text-white hover:text-white/80 text-sm font-medium mt-2 transition-colors"
                      >
                        {expandedBios[member.name] ? "Read Less" : "Read More"}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-8 sm:py-10 md:py-12 bg-gradient-to-br from-teal-600 to-cyan-700 text-white">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">
            Ready to Transform Your Carbon Strategy?
          </h2>
          <p className="text-lg sm:text-xl mb-6 sm:mb-8 max-w-3xl mx-auto opacity-90 px-4">
            Join thousands of organizations already using ReThink Carbon to
            accelerate their sustainability journey.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              variant="secondary"
              className="text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-6 w-full sm:w-auto"
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
              className="text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-6 border-white text-white text-teal-600 w-full sm:w-auto"
              asChild
            >
              <Link to="/contact">Contact Sales</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutUs;

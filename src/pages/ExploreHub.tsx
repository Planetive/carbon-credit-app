import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, TrendingUp, Database, ArrowRight, Compass, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
      gradient: 'from-teal-500 to-cyan-600'
    },
    {
      id: 'markets-mechanisms',
      title: 'Markets & Mechanisms',
      description: 'Visualize and interact with compliance mechanisms and carbon credit markets data across different regions.',
      icon: TrendingUp,
      stats: '50+ Markets',
      features: ['Market analysis', 'Compliance data', 'Regional insights'],
      gradient: 'from-cyan-500 to-blue-600'
    },
    {
      id: 'ccus-projects',
      title: 'CCUS Projects',
      description: 'Browse and analyze Carbon Capture, Utilization, and Storage projects with comprehensive technical details.',
      icon: Database,
      stats: '1000+ CCUS Projects',
      features: ['Technical analysis', 'Storage capacity', 'Utilization methods'],
      gradient: 'from-emerald-500 to-teal-600'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-[linear-gradient(to_right,rgba(220,252,231,0.6),rgba(204,251,241,0.6),rgba(207,250,254,0.6))] py-6 pt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-teal-100 rounded-full mb-6">
              <Compass className="h-10 w-10 text-teal-600" />
            </div>
            <h1 className="text-5xl font-bold text-teal-800 mb-6">
              Explore Carbon Projects
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Discover thousands of verified carbon projects, analyze market mechanisms, and explore CCUS initiatives 
              from around the world. Make informed decisions with comprehensive data and insights.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-teal-600 mb-2">10,000+</div>
              <div className="text-gray-600">Active Projects</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-600 mb-2">50+</div>
              <div className="text-gray-600">Countries</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-600 mb-2">50+</div>
              <div className="text-gray-600">Carbon Markets</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Explore Options</h2>
            <p className="text-gray-600 text-lg">
              Choose from our comprehensive suite of exploration tools and data sources
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exploreOptions.map((option) => (
              <Card 
                key={option.id}
                className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-0 bg-white shadow-lg hover:scale-105"
                onClick={() => navigate(`/explore/${option.id}`)}
              >
                <CardHeader className="pb-4">
                  <div className={`w-12 h-12 bg-gradient-to-r ${option.gradient} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <option.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900 group-hover:text-teal-700 transition-colors">
                    {option.title}
                  </CardTitle>
                  <CardDescription className="text-gray-600 leading-relaxed">
                    {option.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="bg-teal-50 text-teal-700 border-teal-200">
                        {option.stats}
                      </Badge>
                      <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" />
                    </div>
                    <div className="space-y-2">
                      {option.features.map((feature, index) => (
                        <div key={index} className="flex items-center text-sm text-gray-500">
                          <div className="w-1.5 h-1.5 bg-teal-400 rounded-full mr-2"></div>
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA Section */}
      {/* <section className="bg-gradient-to-r from-teal-600 to-cyan-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Explore?
          </h2>
          <p className="text-teal-100 text-lg mb-8 max-w-2xl mx-auto">
            Start exploring our comprehensive database of carbon projects and market mechanisms. 
            Get insights that drive informed decisions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => navigate('/explore/global-projects')}
              className="bg-white text-teal-600 hover:bg-gray-100 px-8 py-3 font-semibold"
            >
              <Globe className="h-5 w-5 mr-2" />
              Browse Projects
            </Button>
            <Button 
              onClick={() => navigate('/Documentation')}
              className="bg-white text-teal-600 hover:bg-gray-100 px-8 py-3 font-semibold"
            >
              <Globe className="h-5 w-5 mr-2" />
              View Documentation
            </Button>
          </div>
        </div>
      </section> */}
    </div>
  );
};

export default ExploreHub; 
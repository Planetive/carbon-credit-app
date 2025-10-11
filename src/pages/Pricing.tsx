import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Globe, Users, Zap, Shield, BarChart3, Star, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import MainHeader from "@/components/ui/MainHeader";

const Pricing = () => {
  const features = [
    {
      icon: Globe,
      title: "Global Project Database",
      description: "Access comprehensive carbon credit projects worldwide"
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Real-time data and performance metrics"
    },
    {
      icon: Shield,
      title: "Compliance Assurance",
      description: "Stay ahead of regulatory requirements"
    },
    {
      icon: Zap,
      title: "AI-Powered Insights",
      description: "Get intelligent recommendations and predictions"
    },
    {
      icon: Users,
      title: "Expert Support",
      description: "Dedicated team for your carbon credit needs"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <MainHeader />
      
      {/* Hero Section */}
      <section className="pt-24 pb-4 px-4 bg-gradient-to-br from-gray-50 to-white">
        <div className="container mx-auto text-center">
          <Badge className="mb-6 bg-green-100 text-green-800 border border-green-200">
            Pricing & Plans
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
          Project based Flexible Plans for your Decarbonization Journey
          </h1>
          
        </div>
      </section>

      {/* Free Plan Section */}
      {/* <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="border border-gray-200 bg-white shadow-lg">
            <CardHeader className="text-center pb-8">
              <div className="flex justify-center mb-4">
                <Badge className="bg-green-100 text-green-800 border border-green-200 px-4 py-2">
                  <Star className="h-4 w-4 mr-2" />
                  Free Forever
                </Badge>
              </div>
              <CardTitle className="text-3xl font-bold text-gray-900">
                Global Project Explorer
              </CardTitle>
              <CardDescription className="text-lg text-gray-600">
                Access our comprehensive database of carbon credit projects worldwide
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center mb-8">
                <div className="text-5xl font-bold text-green-600 mb-2">$0</div>
                <p className="text-gray-600">No credit card required • No hidden fees</p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <feature.icon className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                      <p className="text-gray-600 text-sm">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center pt-6">
                <Button 
                  size="lg" 
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
                  asChild
                >
                  <Link to="/login">
                    Start Exploring Now
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section> */}

      {/* Custom Plans Section */}
      <section className="py-8 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            {/* <Badge className="mb-4 bg-gray-100 text-gray-800 border border-gray-200">
              Enterprise Solutions
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">
              Need Customized Solutions?
            </h2> */}
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              For pricing and plans tailored to your specific needs, our team is here to help. 
              Get personalized recommendations and custom solutions designed for your organization.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            <Card className="border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  Enterprise Solutions
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Custom solutions for your organizations
                </CardDescription>
              </CardHeader>
              <CardContent className="text-left">
                <ul className="space-y-4">
                  <li className="flex items-center space-x-3">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">Individual module options available (Global Project Explorer, AI Project Advisor, ESG Health Check, Emissions Calculator, etc.)</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">Variable pricing based on company size and requirements</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">Custom project evaluation tools</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">Dedicated account management</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">Advanced reporting & analytics</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">API access & integrations</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">Priority support & training</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 bg-white shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                  <BarChart3 className="h-8 w-8 text-purple-600" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  Consulting Services
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Expert guidance for your carbon strategy
                </CardDescription>
              </CardHeader>
              <CardContent className="text-left">
                <ul className="space-y-4">
                  <li className="flex items-center space-x-3">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">Carbon strategy development</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">Project feasibility analysis</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">Regulatory compliance guidance</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">ESG reporting support</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700">Custom training & workshops</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 max-w-2xl mx-auto">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Ready to Get Started?
                </h3>
                <p className="text-gray-600 mb-6">
                  Contact our team to discuss your specific requirements and get a personalized quote.
                </p>
                <Button 
                  size="lg" 
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
                  asChild
                >
                  <Link to="/contact">
                    Contact Our Team
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      {/* <section className="py-16 px-4 bg-white">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-600">
              Everything you need to know about our pricing and services.
            </p>
          </div>
          <div className="grid gap-6">
            <Card className="border border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900">Is the free plan really free?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Yes! You can explore our global project database completely free. No credit card required, no hidden fees.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900">What's included in custom plans?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Custom plans include personalized features, dedicated support, advanced analytics, API access, and consulting services tailored to your organization's needs.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900">How do I get a custom quote?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Simply contact our team through the contact form or email. We'll schedule a consultation to understand your requirements and provide a personalized quote.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900">Do you offer volume discounts?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Yes, we offer volume discounts for enterprise clients. Contact our sales team to discuss your specific needs and pricing options.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section> */}
    </div>
  );
};

export default Pricing; 
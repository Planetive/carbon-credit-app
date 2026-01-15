import React from "react";
import { Link } from "react-router-dom";
import MainHeader from "../../components/ui/MainHeader";
import { ArrowRight } from "lucide-react";

const CorporateSolutions = () => {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <MainHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white">
        <div className="container mx-auto px-6 py-20 md:py-32">
          <div className="max-w-5xl mx-auto text-center">
            {/* Badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded bg-gray-900 text-white text-sm font-medium">
                <span>Carbon Intelligence for Corporates</span>
              </div>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight mb-6 tracking-tight">
              Your end-to-end decarbonisation partner
              <br />
              <span className="text-teal-600">from measurement to action</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-4xl mx-auto leading-relaxed">
              Measure emissions, assess ESG performance, and build credible decarbonisation and energy transition roadmaps — powered by data, standards, and AI.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register?user_type=corporate"
                className="group inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg font-medium text-base hover:bg-gray-800 transition-colors duration-200"
              >
                Sign up free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/contact"
                className="group inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 border-2 border-gray-900 rounded-lg font-medium text-base hover:bg-gray-50 transition-colors duration-200"
              >
                Request demo
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Two-Column Section */}
      <section className="bg-white pt-16 md:pt-24 pb-4">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                The Corporate Decarbonisation Suite
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Not just reporting. Real transformation.
              </p>
            </div>
          </div>
          <div className="max-w-6xl mx-auto">
            {/* Feature 1 - Carbon Footprint Measurement */}
            <div className="bg-gray-50 rounded-2xl p-8 md:p-10">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <div className="text-3xl mb-4 font-bold text-teal-600">1.</div>
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">
                    Carbon Footprint Measurement
                  </h3>
                  <p className="text-gray-600 mb-2 font-medium">Understand where your emissions come from — accurately</p>
                </div>
                <div>
                  <ul className="text-gray-600 space-y-2 mb-6 text-sm leading-relaxed">
                    <li>• Scope 1, 2, and relevant Scope 3 emissions</li>
                    <li>• Activity-based and spend-based calculations</li>
                    <li>• Aligned with GHG Protocol and global reporting standards</li>
                    <li>• Transparent, auditable data outputs</li>
                  </ul>
                  <Link
                    to="/emission-calculator"
                    className="group inline-flex items-center gap-2 text-gray-900 font-medium text-base hover:underline mt-4"
                  >
                    Start measuring
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section className="bg-white pt-6 pb-20 md:pt-8 md:pb-24">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
            {/* Card 1 - ESG Assessments */}
            <div className="bg-gray-50 rounded-2xl p-8 md:p-10">
              <div className="text-3xl mb-4 font-bold text-teal-600">2.</div>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">
                ESG Assessments & Readiness
              </h3>
              <p className="text-gray-600 mb-2 font-medium">Move from compliance pressure to strategic clarity</p>
              <ul className="text-gray-600 space-y-2 mb-6 text-sm leading-relaxed">
                <li>• ESG gap analysis aligned with leading frameworks</li>
                <li>• Identification of material risks and opportunities</li>
                <li>• Regulatory and investor-readiness insights</li>
                <li>• Clear prioritisation of actions</li>
              </ul>
              <Link
                to="/esg-health-check"
                className="group inline-flex items-center gap-2 text-gray-900 font-medium text-base hover:underline mt-4"
              >
                Assess your readiness
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Card 2 - AI Carbon Strategist */}
            <div className="bg-gray-50 rounded-2xl p-8 md:p-10">
              <div className="text-3xl mb-4 font-bold text-teal-600">3.</div>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">
                AI Carbon Strategist
              </h3>
              <p className="text-gray-600 mb-2 font-medium">From data to decisions</p>
              <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                Our AI Carbon Strategist transforms your emissions and operational data into actionable insights:
              </p>
              <ul className="text-gray-600 space-y-2 mb-6 text-sm leading-relaxed">
                <li>• Decarbonisation pathways</li>
                <li>• Energy transition scenarios</li>
                <li>• Cost, impact, and feasibility comparisons</li>
                <li>• Short-, medium-, and long-term action plans</li>
              </ul>
              <Link
                to="/ai-advisor"
                className="group inline-flex items-center gap-2 text-gray-900 font-medium text-base hover:underline mt-4"
              >
                Explore AI strategist
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Card 3 - Roadmaps */}
            <div className="bg-gray-50 rounded-2xl p-8 md:p-10 md:col-span-2">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <div className="text-3xl mb-4 font-bold text-teal-600">4.</div>
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">
                    Decarbonisation & Energy Transition Roadmaps
                  </h3>
                  <p className="text-gray-600 mb-2 font-medium">Plan what to reduce, when, and how</p>
                </div>
                <div>
                  <ul className="text-gray-600 space-y-2 text-sm leading-relaxed">
                    <li>• Science-aligned reduction pathways</li>
                    <li>• Sector-specific mitigation options</li>
                    <li>• Renewable energy and efficiency scenarios</li>
                    <li>• Capital planning and sequencing support</li>
                  </ul>
                  <Link
                    to="/project-wizard"
                    className="group inline-flex items-center gap-2 text-gray-900 font-medium text-base hover:underline mt-6"
                  >
                    Build your roadmap
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gray-50 py-16 md:py-24 flex items-center">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12 text-center">
              Why choose ReThink Carbon
            </h2>
            <div className="grid md:grid-cols-2 gap-6 md:ml-12">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center mt-1">
                  <span className="text-white text-sm font-bold">✓</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">End-to-end coverage</p>
                  <p className="text-gray-600 text-sm">Measure → assess → plan → act</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center mt-1">
                  <span className="text-white text-sm font-bold">✓</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">AI-enabled, expert-validated</p>
                  <p className="text-gray-600 text-sm">Powered by AI, validated by experts</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center mt-1">
                  <span className="text-white text-sm font-bold">✓</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">Built for emerging and global markets</p>
                  <p className="text-gray-600 text-sm">Designed for diverse market needs</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center mt-1">
                  <span className="text-white text-sm font-bold">✓</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">Aligned with international standards</p>
                  <p className="text-gray-600 text-sm">GHG Protocol, PCAF, TCFD, and more</p>
                </div>
              </div>
              <div className="flex items-start gap-4 md:col-span-2">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center mt-1">
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
  );
};

export default CorporateSolutions;

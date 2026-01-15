import React from "react";
import { Link } from "react-router-dom";
import MainHeader from "../../components/ui/MainHeader";

const ESGFinancialInstitutions = () => {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <MainHeader />
  
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-50 via-blue-50 to-indigo-50">
        {/* Enhanced decorative background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140%] h-[700px] bg-[radial-gradient(circle_at_center,rgba(13,148,136,0.2),transparent_70%)]" />
          {/* Floating elements */}
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-teal-200/30 to-blue-200/30 rounded-full blur-2xl animate-pulse" />
          <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-indigo-200/30 to-purple-200/30 rounded-full blur-xl animate-pulse delay-1000" />
        </div>

        <div className="container mx-auto px-6 py-24 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            {/* Enhanced Badge */}
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/80 backdrop-blur-sm ring-1 ring-teal-200 text-teal-700 text-sm font-semibold shadow-lg">
              <span className="h-3 w-3 rounded-full bg-gradient-to-r from-teal-500 to-blue-500 animate-pulse" />
              ESG for Financial Institutions
            </div>

            {/* Enhanced Heading */}
            <h1 className="mt-8 text-5xl md:text-7xl font-black tracking-tight text-gray-900 leading-tight bg-gradient-to-r from-gray-900 via-teal-800 to-blue-800 bg-clip-text text-transparent">
              Build consistent, explainable ESG risk workflows
            </h1>
            <p className="mt-6 text-gray-600 text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed">
              Comprehensive finance & facilitated emissions calculations, portfolio management, and ESG assessments—all in one web-based platform.
            </p>

            {/* Enhanced CTA */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link
                to="/register?user_type=financial_institution"
                className="group px-8 py-4 rounded-2xl bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 transition-all duration-300 text-white font-bold text-lg shadow-2xl shadow-teal-200/50 hover:shadow-teal-300/50 transform hover:-translate-y-1"
              >
                <span className="flex items-center gap-2">
                  Sign up as Financial Institution
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </Link>
            </div>

            {/* Enhanced Stats container */}
            <div className="mt-16 bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl ring-1 ring-white/20 p-8 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto border border-white/20">
              {[
                { k: "100%", v: "web-based", icon: "🌐" },
                { k: "Real-time", v: "calculations", icon: "⚡" },
                { k: "Portfolio", v: "tracking", icon: "📊" },
                { k: "ESG", v: "assessments", icon: "🌱" },
              ].map((b) => (
                <div key={b.v} className="text-center group">
                  <div className="text-4xl mb-2 group-hover:scale-110 transition-transform duration-300">{b.icon}</div>
                  <div className="text-teal-700 font-black text-3xl bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">{b.k}</div>
                  <div className="text-sm text-gray-600 font-medium mt-1">{b.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Overview */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-100 text-teal-700 text-sm font-semibold mb-6">
            <span className="h-2 w-2 rounded-full bg-teal-500"></span>
            Why Choose Us
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Why institutions choose us
          </h2>
          <p className="text-gray-600 text-xl leading-relaxed max-w-3xl mx-auto">
            A unified web platform for finance emissions, portfolio management, and ESG assessments—helping your team track and report on climate impact with confidence.
          </p>
        </div>
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          {[
            {
              t: "Finance & Facilitated Emissions",
              d: "Calculate emissions from loans, investments, and financial activities using standardized methodologies.",
              icon: "💰",
              color: "from-blue-500 to-cyan-500"
            },
            {
              t: "Portfolio Management",
              d: "Track counterparties, exposures, and climate risk across your entire portfolio in one place.",
              icon: "📊",
              color: "from-emerald-500 to-teal-500"
            },
            {
              t: "ESG Assessments",
              d: "Evaluate environmental, social, and governance factors with comprehensive assessment tools.",
              icon: "🌱",
              color: "from-purple-500 to-pink-500"
            },
          ].map((card, index) => (
            <div
              key={card.t}
              className="group relative rounded-3xl bg-white p-8 shadow-xl hover:shadow-2xl transition-all duration-500 ring-1 ring-gray-100 hover:ring-teal-200 transform hover:-translate-y-2"
            >
              <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center text-2xl transform -translate-y-8 group-hover:scale-110 transition-transform duration-300`}>
                {card.icon}
              </div>
              <div className="mt-8 text-center">
                <h3 className="font-bold text-2xl text-gray-900 mb-4">{card.t}</h3>
                <p className="text-gray-600 leading-relaxed">{card.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Enhanced Framework */}
      <section className="relative bg-gradient-to-br from-neutral-950 via-gray-900 to-black overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
        </div>
        
        <div className="container mx-auto px-6 py-20 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/80 text-sm font-semibold mb-6 ring-1 ring-white/20">
              <span className="h-2 w-2 rounded-full bg-teal-400"></span>
              Our Framework
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Complete climate finance toolkit
            </h2>
            <p className="text-gray-300 text-xl max-w-4xl mx-auto leading-relaxed">
              From emissions calculations to portfolio tracking and ESG assessments—everything you need to manage climate risk and reporting.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Calculate Finance Emissions",
                body: "Input your portfolio data and calculate finance & facilitated emissions using standardized methodologies aligned with GHG Protocol and PCAF guidelines.",
                step: "01",
                color: "from-blue-500/20 to-cyan-500/20"
              },
              {
                title: "Track Portfolio & Counterparties",
                body: "Manage your portfolio entries, track exposures by sector and geography, and monitor counterparty-level climate data all in one dashboard.",
                step: "02",
                color: "from-emerald-500/20 to-teal-500/20"
              },
              {
                title: "Generate Reports & Insights",
                body: "Export data, view analytics, and generate reports for internal use and regulatory compliance with clear, auditable calculations.",
                step: "03",
                color: "from-purple-500/20 to-pink-500/20"
              },
            ].map((item, index) => (
              <div
                key={item.title}
                className={`group relative rounded-3xl bg-gradient-to-br ${item.color} ring-1 ring-white/10 p-8 shadow-2xl hover:shadow-teal-500/20 transition-all duration-500 hover:scale-105`}
              >
                <div className="absolute top-6 right-6 text-6xl font-black text-white/10 group-hover:text-white/20 transition-colors duration-300">
                  {item.step}
                </div>
                <h3 className="font-bold text-xl text-white mb-4 relative z-10">{item.title}</h3>
                <p className="text-gray-300 leading-relaxed relative z-10">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Key Features */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-100 text-teal-700 text-sm font-semibold mb-6">
            <span className="h-2 w-2 rounded-full bg-teal-500"></span>
            Key Features
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Key features
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: "Finance Emissions Calculator",
              body: "Calculate emissions from loans, bonds, equity investments, and other financial instruments using industry-standard methodologies.",
              icon: "🧮",
              color: "from-orange-500 to-red-500"
            },
            {
              title: "Portfolio Dashboard",
              body: "View all your counterparties, exposures, and emissions data in one centralized dashboard with filtering and search capabilities.",
              icon: "📈",
              color: "from-blue-500 to-indigo-500"
            },
            {
              title: "ESG Health Check",
              body: "Assess the ESG performance of your portfolio companies with comprehensive evaluation tools and scoring.",
              icon: "✅",
              color: "from-green-500 to-emerald-500"
            },
          ].map((f) => (
            <div
              key={f.title}
              className="group rounded-3xl bg-white p-8 shadow-xl hover:shadow-2xl transition-all duration-500 ring-1 ring-gray-100 hover:ring-teal-200 transform hover:-translate-y-2"
            >
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform duration-300`}>
                {f.icon}
              </div>
              <h3 className="font-bold text-xl text-gray-900 mb-4 flex items-center gap-3">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-teal-700 font-bold">✓</span>
                {f.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Enhanced Metrics */}
      <section className="container mx-auto px-6 pb-16">
        <div className="rounded-3xl bg-gradient-to-br from-teal-50 to-blue-50 shadow-2xl ring-1 ring-teal-200/50 p-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center border border-teal-100">
          {[{
            k: "100%",
            v: "Web-based platform",
            icon: "🌐"
          }, {
            k: "Real-time",
            v: "Calculations",
            icon: "⚡"
          }, {
            k: "Portfolio",
            v: "Management",
            icon: "📊"
          }, {
            k: "ESG",
            v: "Assessments",
            icon: "🌱"
          }].map((m) => (
            <div key={m.v} className="group">
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">{m.icon}</div>
              <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-blue-600">{m.k}</div>
              <div className="text-sm text-gray-600 mt-2 font-medium">{m.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Enhanced Use cases */}
      <section className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-100 text-teal-700 text-sm font-semibold mb-6">
              <span className="h-2 w-2 rounded-full bg-teal-500"></span>
              Use Cases
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Use cases
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                t: "Portfolio Data Management",
                points: [
                  "Add and manage counterparties with detailed information",
                  "Track exposures by sector, geography, and risk metrics",
                  "Import and export data via CSV for bulk operations",
                ],
                icon: "💼",
                color: "from-blue-500 to-cyan-500"
              },
              {
                t: "Emissions Tracking & Reporting",
                points: [
                  "Calculate finance and facilitated emissions for your portfolio",
                  "View aggregated emissions by sector and geography",
                  "Export data for regulatory reporting and internal analysis",
                ],
                icon: "📈",
                color: "from-emerald-500 to-teal-500"
              },
              {
                t: "Counterparty Management",
                points: [
                  "Store detailed information for each counterparty",
                  "Track probability of default, loss given default, and tenor",
                  "Organize by sector and geography for easy analysis",
                ],
                icon: "👥",
                color: "from-orange-500 to-red-500"
              },
              {
                t: "Carbon Calculations",
                points: [
                  "Estimate emissions aligned with GHG Protocol",
                  "Capture activity data from utility bills and inputs",
                  "Generate summaries for investor reporting",
                ],
                icon: "🌱",
                color: "from-green-500 to-emerald-500"
              },
            ].map((use) => (
              <div
                key={use.t}
                className="group rounded-3xl bg-white p-8 shadow-xl hover:shadow-2xl transition-all duration-500 ring-1 ring-gray-100 hover:ring-teal-200 transform hover:-translate-y-2"
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${use.color} flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  {use.icon}
                </div>
                <h3 className="font-bold text-xl text-gray-900 mb-6">{use.t}</h3>
                <ul className="space-y-3">
                  {use.points.map((p) => (
                    <li key={p} className="flex items-start gap-3 text-gray-700">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 text-teal-600 text-xs font-bold mt-0.5">✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced FAQ */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-100 text-teal-700 text-sm font-semibold mb-6">
            <span className="h-2 w-2 rounded-full bg-teal-500"></span>
            FAQ
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Frequently asked questions
          </h2>
        </div>
        <div className="space-y-6 max-w-4xl mx-auto">
          {[
            {
              q: "How do I calculate finance emissions?",
              a: "Use our web-based calculator to input your portfolio data. The platform uses standardized methodologies (GHG Protocol, PCAF) to calculate finance and facilitated emissions automatically.",
            },
            {
              q: "Can I export my portfolio data?",
              a: "Yes. You can export your portfolio entries, emissions calculations, and reports in CSV format for use in other systems or for regulatory reporting.",
            },
            {
              q: "What types of financial instruments are supported?",
              a: "The platform supports calculations for loans, bonds, equity investments, and other financial instruments. You can track counterparties across different sectors and geographies.",
            },
          ].map((item, index) => (
            <details
              key={item.q}
              className="group rounded-2xl bg-white p-8 ring-1 ring-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 hover:ring-teal-200"
            >
              <summary className="cursor-pointer font-bold text-lg text-gray-900 flex items-center justify-between group-open:text-teal-700 transition-colors duration-300">
                {item.q}
                <svg className="w-6 h-6 text-gray-400 group-open:text-teal-600 group-open:rotate-180 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-4 text-gray-600 leading-relaxed text-lg">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ESGFinancialInstitutions;

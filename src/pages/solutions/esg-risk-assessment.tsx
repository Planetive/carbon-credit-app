import React from "react";
import { Link } from "react-router-dom";
import MainHeader from "../../components/ui/MainHeader";

const ESGRiskAssessment = () => {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <MainHeader />
  
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        {/* Enhanced decorative background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140%] h-[700px] bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.2),transparent_70%)]" />
          {/* Floating elements */}
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-emerald-200/30 to-teal-200/30 rounded-full blur-2xl animate-pulse" />
          <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-cyan-200/30 to-blue-200/30 rounded-full blur-xl animate-pulse delay-1000" />
        </div>

        <div className="container mx-auto px-6 py-24 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            {/* Enhanced Badge */}
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/80 backdrop-blur-sm ring-1 ring-emerald-200 text-emerald-700 text-sm font-semibold shadow-lg">
              <span className="h-3 w-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 animate-pulse" />
              ESG Risk Assessment
            </div>

            {/* Enhanced Heading */}
            <h1 className="mt-8 text-5xl md:text-7xl font-black tracking-tight text-gray-900 leading-tight bg-gradient-to-r from-gray-900 via-emerald-800 to-teal-800 bg-clip-text text-transparent">
              Comprehensive ESG risk evaluation and management
            </h1>
            <p className="mt-6 text-gray-600 text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed">
              Identify, assess, and mitigate environmental, social, and governance risks with our advanced assessment framework and actionable insights.
            </p>

            {/* Enhanced CTA */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link
                to="/esg-health-check"
                className="group px-8 py-4 rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 transition-all duration-300 text-white font-bold text-lg shadow-2xl shadow-emerald-200/50 hover:shadow-emerald-300/50 transform hover:-translate-y-1"
              >
                <span className="flex items-center gap-2">
                  Start Assessment
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </Link>
              <Link
                to="/demo"
                className="group px-8 py-4 rounded-2xl bg-white/90 backdrop-blur-sm hover:bg-white text-gray-700 font-bold text-lg transition-all duration-300 shadow-xl ring-1 ring-gray-200 hover:ring-emerald-300 transform hover:-translate-y-1"
              >
                <span className="flex items-center gap-2">
                  View Sample Report
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </span>
              </Link>
            </div>

            {/* Enhanced Stats container */}
            <div className="mt-16 bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl ring-1 ring-white/20 p-8 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto border border-white/20">
              {[
                { k: "50+", v: "risk factors", icon: "⚠️" },
                { k: "15", v: "industry sectors", icon: "🏭" },
                { k: "3", v: "risk levels", icon: "📊" },
                { k: "24/7", v: "monitoring", icon: "🔍" },
              ].map((b) => (
                <div key={b.v} className="text-center group">
                  <div className="text-4xl mb-2 group-hover:scale-110 transition-transform duration-300">{b.icon}</div>
                  <div className="text-emerald-700 font-black text-3xl bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{b.k}</div>
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold mb-6">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            Why Choose Our Assessment
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Why organizations trust our ESG risk assessment
          </h2>
          <p className="text-gray-600 text-xl leading-relaxed max-w-3xl mx-auto">
            Comprehensive evaluation, actionable insights, and continuous monitoring—so you can proactively manage ESG risks and opportunities.
          </p>
        </div>
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          {[
            {
              t: "Comprehensive Risk Analysis",
              d: "Evaluate environmental, social, and governance risks across all material issues with industry-specific frameworks.",
              icon: "🔍",
              color: "from-blue-500 to-cyan-500"
            },
            {
              t: "Actionable Recommendations",
              d: "Receive prioritized mitigation strategies and improvement plans tailored to your organization's risk profile.",
              icon: "📋",
              color: "from-emerald-500 to-teal-500"
            },
            {
              t: "Continuous Monitoring",
              d: "Track risk evolution over time with automated alerts and regular assessment updates.",
              icon: "📈",
              color: "from-purple-500 to-pink-500"
            },
          ].map((card, index) => (
            <div
              key={card.t}
              className="group relative rounded-3xl bg-white p-8 shadow-xl hover:shadow-2xl transition-all duration-500 ring-1 ring-gray-100 hover:ring-emerald-200 transform hover:-translate-y-2"
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

      {/* Enhanced Assessment Framework */}
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
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              Our Assessment Framework
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              A systematic approach to ESG risk assessment
            </h2>
            <p className="text-gray-300 text-xl max-w-4xl mx-auto leading-relaxed">
              Our three-phase framework ensures comprehensive risk identification, accurate assessment, and effective mitigation planning.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Risk Identification & Mapping",
                body: "Systematically identify and map ESG risks across environmental, social, and governance dimensions using industry-specific materiality matrices.",
                step: "01",
                color: "from-blue-500/20 to-cyan-500/20"
              },
              {
                title: "Risk Assessment & Scoring",
                body: "Evaluate identified risks based on likelihood, impact, and current mitigation measures to generate comprehensive risk scores.",
                step: "02",
                color: "from-emerald-500/20 to-teal-500/20"
              },
              {
                title: "Mitigation Planning & Monitoring",
                body: "Develop prioritized action plans and establish monitoring mechanisms to track risk evolution and mitigation effectiveness.",
                step: "03",
                color: "from-purple-500/20 to-pink-500/20"
              },
            ].map((item, index) => (
              <div
                key={item.title}
                className={`group relative rounded-3xl bg-gradient-to-br ${item.color} ring-1 ring-white/10 p-8 shadow-2xl hover:shadow-emerald-500/20 transition-all duration-500 hover:scale-105`}
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold mb-6">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            Key Features
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Comprehensive risk assessment features
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: "Multi-dimensional Risk Analysis",
              body: "Assess environmental, social, and governance risks with 50+ specific risk factors across 15 industry sectors.",
              icon: "🎯",
              color: "from-orange-500 to-red-500"
            },
            {
              title: "Industry-Specific Frameworks",
              body: "Tailored assessment methodologies aligned with sector-specific ESG materiality and regulatory requirements.",
              icon: "🏭",
              color: "from-blue-500 to-indigo-500"
            },
            {
              title: "Risk Prioritization Matrix",
              body: "Visual risk heat maps and prioritization matrices to focus resources on high-impact, high-likelihood risks.",
              icon: "📊",
              color: "from-green-500 to-emerald-500"
            },
          ].map((f) => (
            <div
              key={f.title}
              className="group rounded-3xl bg-white p-8 shadow-xl hover:shadow-2xl transition-all duration-500 ring-1 ring-gray-100 hover:ring-emerald-200 transform hover:-translate-y-2"
            >
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform duration-300`}>
                {f.icon}
              </div>
              <h3 className="font-bold text-xl text-gray-900 mb-4 flex items-center gap-3">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold">✓</span>
                {f.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Enhanced Assessment Areas */}
      <section className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold mb-6">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              Assessment Areas
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Comprehensive ESG risk coverage
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                t: "Environmental Risks",
                points: [
                  "Climate change and carbon footprint",
                  "Resource depletion and waste management",
                  "Biodiversity and ecosystem impact",
                  "Pollution and environmental compliance",
                ],
                icon: "🌱",
                color: "from-green-500 to-emerald-500"
              },
              {
                t: "Social Risks",
                points: [
                  "Labor practices and human rights",
                  "Community relations and stakeholder engagement",
                  "Product safety and consumer protection",
                  "Diversity, equity, and inclusion",
                ],
                icon: "👥",
                color: "from-blue-500 to-cyan-500"
              },
              {
                t: "Governance Risks",
                points: [
                  "Board composition and independence",
                  "Executive compensation and incentives",
                  "Transparency and disclosure practices",
                  "Ethics and anti-corruption measures",
                ],
                icon: "🏛️",
                color: "from-purple-500 to-pink-500"
              },
            ].map((use) => (
              <div
                key={use.t}
                className="group rounded-3xl bg-white p-8 shadow-xl hover:shadow-2xl transition-all duration-500 ring-1 ring-gray-100 hover:ring-emerald-200 transform hover:-translate-y-2"
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${use.color} flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  {use.icon}
                </div>
                <h3 className="font-bold text-xl text-gray-900 mb-6">{use.t}</h3>
                <ul className="space-y-3">
                  {use.points.map((p) => (
                    <li key={p} className="flex items-start gap-3 text-gray-700">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold mt-0.5">✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Metrics */}
      <section className="container mx-auto px-6 pb-16">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 shadow-2xl ring-1 ring-emerald-200/50 p-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center border border-emerald-100">
          {[{
            k: "50+",
            v: "Risk factors assessed",
            icon: "⚠️"
          }, {
            k: "15",
            v: "Industry sectors covered",
            icon: "🏭"
          }, {
            k: "3",
            v: "Risk severity levels",
            icon: "📊"
          }, {
            k: "24/7",
            v: "Continuous monitoring",
            icon: "🔍"
          }].map((m) => (
            <div key={m.v} className="group">
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">{m.icon}</div>
              <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">{m.k}</div>
              <div className="text-sm text-gray-600 mt-2 font-medium">{m.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Enhanced FAQ */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold mb-6">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            FAQ
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Frequently asked questions
          </h2>
        </div>
        <div className="space-y-6 max-w-4xl mx-auto">
          {[
            {
              q: "How long does a comprehensive ESG risk assessment take?",
              a: "A full assessment typically takes 4-6 weeks, including data collection, analysis, and report generation. We offer expedited options for urgent assessments.",
            },
            {
              q: "Can the assessment be customized for our industry?",
              a: "Yes, our framework is tailored to 15+ industry sectors with sector-specific risk factors and materiality considerations.",
            },
            {
              q: "What deliverables do we receive?",
              a: "You'll receive a comprehensive risk report, prioritized action plan, risk heat maps, and ongoing monitoring dashboard with regular updates.",
            },
          ].map((item, index) => (
            <details
              key={item.q}
              className="group rounded-2xl bg-white p-8 ring-1 ring-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 hover:ring-emerald-200"
            >
              <summary className="cursor-pointer font-bold text-lg text-gray-900 flex items-center justify-between group-open:text-emerald-700 transition-colors duration-300">
                {item.q}
                <svg className="w-6 h-6 text-gray-400 group-open:text-emerald-600 group-open:rotate-180 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

export default ESGRiskAssessment;

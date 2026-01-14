import React from "react";
import { Link } from "react-router-dom";
import MainHeader from "../../components/ui/MainHeader";

const CorporateSolutions = () => {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <MainHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140%] h-[700px] bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.2),transparent_70%)]" />
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-emerald-200/30 to-teal-200/30 rounded-full blur-2xl animate-pulse" />
          <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-cyan-200/30 to-blue-200/30 rounded-full blur-xl animate-pulse delay-1000" />
        </div>

        <div className="container mx-auto px-6 py-24 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/80 backdrop-blur-sm ring-1 ring-emerald-200 text-emerald-700 text-sm font-semibold shadow-lg">
              <span className="h-3 w-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 animate-pulse" />
              Climate &amp; ESG for Corporates
            </div>

            <h1 className="mt-8 text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight bg-gradient-to-r from-gray-900 via-emerald-800 to-teal-800 bg-clip-text text-transparent">
              Operational decarbonization you can actually execute
            </h1>
            <p className="mt-6 text-gray-600 text-lg sm:text-xl max-w-3xl mx-auto leading-relaxed">
              From baselines to transition plans—model scenarios, prioritize projects, and track results across your entire
              organization and value chain.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link
                to="/contact"
                className="group px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 transition-all duration-300 text-white font-bold text-lg shadow-2xl shadow-emerald-200/50 hover:shadow-emerald-300/50 transform hover:-translate-y-1"
              >
                <span className="flex items-center gap-2">
                  Talk to our corporate team
                  <svg
                    className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0-5 5m5-5H6" />
                  </svg>
                </span>
              </Link>
              <Link
                to="/demo"
                className="group px-8 py-4 rounded-2xl bg-white/90 backdrop-blur-sm hover:bg-white text-gray-800 font-bold text-lg transition-all duration-300 shadow-xl ring-1 ring-gray-200 hover:ring-emerald-300 transform hover:-translate-y-1"
              >
                <span className="flex items-center gap-2">
                  View corporate demo
                  <svg
                    className="w-5 h-5 group-hover:scale-110 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </span>
              </Link>
            </div>

            <div className="mt-16 bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl ring-1 ring-white/20 p-8 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto border border-white/20">
              {[
                { k: "Scopes 1–3", v: "covered", icon: "🌍" },
                { k: "12+ yrs", v: "transition horizon", icon: "📈" },
                { k: "AI", v: "scenario engine", icon: "🤖" },
                { k: "MRV", v: "ready outputs", icon: "📊" },
              ].map((b) => (
                <div key={b.v} className="text-center group">
                  <div className="text-3xl md:text-4xl mb-2 group-hover:scale-110 transition-transform duration-300">
                    {b.icon}
                  </div>
                  <div className="text-emerald-700 font-black text-2xl md:text-3xl bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    {b.k}
                  </div>
                  <div className="text-xs md:text-sm text-gray-600 font-medium mt-1">{b.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why corporates use us */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold mb-6">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Why corporates choose ReThink Carbon
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            From strategy decks to project pipelines
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed max-w-3xl mx-auto">
            Close the gap between commitments and execution with a single platform that links baselines, targets, projects, and
            reporting.
          </p>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-8">
          {[
            {
              t: "Reliable baselines",
              d: "Standardized methodology across business units, sites, and suppliers—so everyone works from one source of truth.",
              icon: "📏",
              color: "from-emerald-500 to-teal-500",
            },
            {
              t: "Executable roadmaps",
              d: "Translate high‑level strategy into a portfolio of projects with costs, impacts, and timelines.",
              icon: "🧩",
              color: "from-sky-500 to-cyan-500",
            },
            {
              t: "Continuous tracking",
              d: "Monitor performance, adjust scenarios, and generate MRV‑ready outputs for regulators and investors.",
              icon: "📡",
              color: "from-purple-500 to-pink-500",
            },
          ].map((card) => (
            <div
              key={card.t}
              className="group relative rounded-3xl bg-white p-8 shadow-xl hover:shadow-2xl transition-all duration-500 ring-1 ring-gray-100 hover:ring-emerald-200 transform hover:-translate-y-2"
            >
              <div
                className={`absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center text-2xl transform -translate-y-8 group-hover:scale-110 transition-transform duration-300`}
              >
                {card.icon}
              </div>
              <div className="mt-8 text-center">
                <h3 className="font-bold text-xl md:text-2xl text-gray-900 mb-4">{card.t}</h3>
                <p className="text-gray-600 leading-relaxed">{card.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Framework */}
      <section className="relative bg-gradient-to-br from-neutral-950 via-gray-900 to-black overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
            }}
          />
        </div>

        <div className="container mx-auto px-6 py-20 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/80 text-sm font-semibold mb-6 ring-1 ring-white/20">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Our decarbonization framework
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              A single workflow from baseline to MRV
            </h2>
            <p className="text-gray-300 text-lg max-w-4xl mx-auto leading-relaxed">
              Built for cross‑functional teams—sustainability, operations, finance, and procurement—so they can collaborate on
              one live plan.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "01 • Measure",
                body: "Ingest activity data, apply consistent factors, and generate transparent Scope 1–3 baselines with audit trails.",
              },
              {
                title: "02 • Plan",
                body: "Model levers across energy, operations, products, and supply chain, with cost and abatement curves.",
              },
              {
                title: "03 • Execute & Report",
                body: "Track project delivery, reconcile deltas, and export MRV‑ready outputs for frameworks and disclosures.",
              },
            ].map((item, index) => (
              <div
                key={item.title}
                className="group relative rounded-3xl bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-cyan-500/20 ring-1 ring-white/10 p-8 shadow-2xl hover:shadow-emerald-500/20 transition-all duration-500 hover:scale-105"
              >
                <div className="absolute top-6 right-6 text-5xl font-black text-white/10 group-hover:text-white/20 transition-colors duration-300">
                  {`0${index + 1}`}
                </div>
                <h3 className="font-bold text-xl text-white mb-4 relative z-10">{item.title}</h3>
                <p className="text-gray-300 leading-relaxed relative z-10">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key features */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold mb-6">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Key features
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Built for complex, multi‑site organizations
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: "Site & asset hierarchy",
              body: "Model plants, offices, fleets, and suppliers with flexible hierarchies for roll‑up reporting.",
              icon: "🏭",
              color: "from-orange-500 to-red-500",
            },
            {
              title: "Playbooks & scenarios",
              body: "Library of decarbonization levers with configurable assumptions you can reuse across markets.",
              icon: "📚",
              color: "from-blue-500 to-indigo-500",
            },
            {
              title: "Collaboration & governance",
              body: "Roles, workflows, and approvals so global teams can work on the same plan without losing control.",
              icon: "🤝",
              color: "from-green-500 to-emerald-500",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="group rounded-3xl bg-white p-8 shadow-xl hover:shadow-2xl transition-all duration-500 ring-1 ring-gray-100 hover:ring-emerald-200 transform hover:-translate-y-2"
            >
              <div
                className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform duration-300`}
              >
                {f.icon}
              </div>
              <h3 className="font-bold text-xl text-gray-900 mb-4 flex items-center gap-3">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold">
                  ✓
                </span>
                {f.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default CorporateSolutions;


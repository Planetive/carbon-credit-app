import React from "react";
import { Link } from "react-router-dom";
import MainHeader from "../../components/ui/MainHeader";

const CCUSPage = () => {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <MainHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-sky-50 via-emerald-50 to-slate-50">
        {/* Decorative background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140%] h-[700px] bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.2),transparent_70%)]" />
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-sky-200/40 to-emerald-200/40 rounded-full blur-2xl animate-pulse" />
          <div className="absolute top-40 right-12 w-24 h-24 bg-gradient-to-br from-cyan-200/40 to-blue-200/40 rounded-full blur-xl animate-pulse delay-700" />
        </div>

        <div className="container mx-auto px-6 py-24 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/80 backdrop-blur-sm ring-1 ring-sky-200 text-sky-800 text-sm font-semibold shadow-lg">
              <span className="h-3 w-3 rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 animate-pulse" />
              Carbon Capture, Utilization &amp; Storage (CCUS)
            </div>

            <h1 className="mt-8 text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight bg-gradient-to-r from-slate-900 via-sky-900 to-emerald-800 bg-clip-text text-transparent">
              Turn hard‑to‑abate emissions into climate assets
            </h1>
            <p className="mt-6 text-gray-600 text-lg sm:text-xl max-w-3xl mx-auto leading-relaxed">
              Design, quantify, and operate CCUS projects with end‑to‑end tracking—from capture performance and utilization
              pathways to long‑term storage assurance and reporting.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link
                to="/contact"
                className="group px-8 py-4 rounded-2xl bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-700 hover:to-emerald-700 transition-all duration-300 text-white font-bold text-lg shadow-2xl shadow-sky-200/60 hover:shadow-sky-300/60 transform hover:-translate-y-1"
              >
                <span className="flex items-center gap-2">
                  Talk to our CCUS team
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
                className="group px-8 py-4 rounded-2xl bg-white/90 backdrop-blur-sm hover:bg-white text-gray-800 font-bold text-lg transition-all duration-300 shadow-xl ring-1 ring-gray-200 hover:ring-sky-300 transform hover:-translate-y-1"
              >
                <span className="flex items-center gap-2">
                  Explore CCUS workflow
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

            <div className="mt-16 bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl ring-1 ring-white/40 p-8 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto border border-white/40">
              {[
                { k: "90%+", v: "capture efficiency", icon: "🎯" },
                { k: "MT CO₂e", v: "quantified & tracked", icon: "🌍" },
                { k: "3", v: "utilization pathways", icon: "🔁" },
                { k: "24/7", v: "MRV ready", icon: "📈" },
              ].map((b) => (
                <div key={b.v} className="text-center group">
                  <div className="text-3xl md:text-4xl mb-2 group-hover:scale-110 transition-transform duration-300">
                    {b.icon}
                  </div>
                  <div className="text-sky-800 font-black text-2xl md:text-3xl bg-gradient-to-r from-sky-600 to-emerald-600 bg-clip-text text-transparent">
                    {b.k}
                  </div>
                  <div className="text-xs md:text-sm text-gray-600 font-medium mt-1">{b.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Overview */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-100 text-sky-800 text-sm font-semibold mb-6">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            Why CCUS with ReThink Carbon
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Make CCUS bankable, measurable, and verifiable
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed max-w-3xl mx-auto">
            We bring together project engineering data, carbon accounting, and MRV workflows so you can move from pilots to
            scaled CCUS programs with confidence.
          </p>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-8">
          {[
            {
              t: "Capture system design support",
              d: "Structure emissions sources, capture units, and process configurations for different industrial facilities.",
              icon: "🏭",
              color: "from-sky-500 to-cyan-500",
            },
            {
              t: "Utilization &amp; storage modeling",
              d: "Model utilization routes (e‑fuels, materials, chemicals) alongside permanent storage projects and their baselines.",
              icon: "🧪",
              color: "from-emerald-500 to-teal-500",
            },
            {
              t: "End‑to‑end MRV",
              d: "Connect asset‑level data, monitoring plans, and third‑party methodologies into one consistent MRV workflow.",
              icon: "📊",
              color: "from-indigo-500 to-purple-500",
            },
          ].map((card) => (
            <div
              key={card.t}
              className="group relative rounded-3xl bg-white p-8 shadow-xl hover:shadow-2xl transition-all duration-500 ring-1 ring-gray-100 hover:ring-sky-200 transform hover:-translate-y-2"
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

      {/* CCUS Value Chain */}
      <section className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-black overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.08'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
            }}
          />
        </div>

        <div className="container mx-auto px-6 py-20 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/80 text-sm font-semibold mb-6 ring-1 ring-white/20">
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              CCUS value chain
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              One platform across the CCUS project lifecycle
            </h2>
            <p className="text-gray-300 text-lg max-w-4xl mx-auto leading-relaxed">
              Capture the full chain—from point‑source emissions to transport, utilization, and permanent storage—with shared
              datasets and consistent assumptions.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Capture",
                body: "Map emitters, model capture scenarios, and quantify captured CO₂ with project‑level and portfolio‑level views.",
              },
              {
                title: "Transport &amp; Utilization",
                body: "Track pipeline or shipping routes, utilization projects, and associated emissions, leakage, and co‑benefits.",
              },
              {
                title: "Storage &amp; Credits",
                body: "Connect to storage sites, methodologies, and registries so claimed removals and credits stay auditable.",
              },
            ].map((item, index) => (
              <div
                key={item.title}
                className="group relative rounded-3xl bg-gradient-to-br from-sky-500/15 via-emerald-500/10 to-cyan-500/15 ring-1 ring-white/10 p-8 shadow-2xl hover:shadow-sky-500/30 transition-all duration-500 hover:scale-105"
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-100 text-sky-800 text-sm font-semibold mb-6">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            Key features
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Built for complex industrial CCUS programs
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: "Asset‑level modeling",
              body: "Capture‑unit level granularity with flexible configuration of sources, capture technologies, and energy use.",
              icon: "🧱",
              color: "from-orange-500 to-amber-500",
            },
            {
              title: "Scenario analysis",
              body: "Compare capture rates, utilization routes, and storage options to understand cost and climate impact trade‑offs.",
              icon: "📊",
              color: "from-emerald-500 to-teal-500",
            },
            {
              title: "MRV &amp; reporting ready",
              body: "Methodology‑aligned outputs for registries, investors, and regulators—exportable as reports and data feeds.",
              icon: "📜",
              color: "from-indigo-500 to-sky-500",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="group rounded-3xl bg-white p-8 shadow-xl hover:shadow-2xl transition-all duration-500 ring-1 ring-gray-100 hover:ring-sky-200 transform hover:-translate-y-2"
            >
              <div
                className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform duration-300`}
              >
                {f.icon}
              </div>
              <h3 className="font-bold text-xl text-gray-900 mb-4 flex items-center gap-3">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-sky-700 font-bold">
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

export default CCUSPage;


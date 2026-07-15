import { Button } from "@/components/ui/button";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  Calculator,
  Check,
  FileSpreadsheet,
  Fuel,
  MapPin,
  Truck,
  Zap,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

type CarbonAccountingPageProps = {
  prefersReducedMotion?: boolean;
};

const frameworkLogos = [
  { name: "PCAF", src: "/frameworks/PCAF.png" },
  { name: "SASB", src: "/frameworks/SASB.png" },
  { name: "Science Based Targets", src: "/frameworks/Science based targets.png" },
  { name: "TCFD", src: "/frameworks/TCFD.png" },
  { name: "CSRD", src: "/frameworks/CSRD.png" },
  { name: "ISSB", src: "/frameworks/ISSB.png" },
] as const;

const heroLead = "Carbon accounting that behaves like".split(" ");
const heroAccent = ["enterprise", "software,"];
const heroTrail = "not a spreadsheet.".split(" ");

const heroWordContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.18 } },
};
const heroWordReveal = {
  hidden: { opacity: 0, y: 22, filter: "blur(12px)", rotateX: 28 },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    rotateX: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
};
const heroAccentReveal = {
  hidden: { opacity: 0, y: 28, scale: 0.88, filter: "blur(14px)" },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const mappingRows = [
  { source: "SAP ERP", file: "fuel_purchases.csv", records: "12,480", mapped: "12,120", status: "Mapped" as const },
  { source: "Utility Bills", file: "electricity_q2.pdf", records: "86", mapped: "86", status: "Mapped" as const },
  { source: "Fleet System", file: "telematics API", records: "4,210", mapped: "3,980", status: "Mapping" as const },
  { source: "Supplier Portal", file: "spend_export.xlsx", records: "9,640", mapped: "—", status: "Pending" as const },
];

const factorRows = [
  { activity: "Diesel", db: "DEFRA 2024", region: "Global", unit: "kgCO₂e/L", factor: "2.68", updated: "Jan 2026" },
  { activity: "Grid electricity", db: "DEFRA 2026", region: "UK", unit: "kgCO₂e/kWh", factor: "0.207", updated: "Jan 2026" },
  { activity: "Natural gas", db: "EPA", region: "United States", unit: "kgCO₂e/kWh", factor: "0.184", updated: "Nov 2025" },
  { activity: "Steel, primary", db: "IPCC", region: "Global", unit: "kgCO₂e/kg", factor: "1.85", updated: "Jun 2025" },
];

const classifyRows = [
  { activity: "Diesel — Generators", source: "Fleet System", scope: "Scope 1", category: "Stationary combustion", conf: "High" as const },
  { activity: "Grid Electricity", source: "Utility Bills", scope: "Scope 2", category: "Purchased electricity", conf: "High" as const },
  { activity: "Steel — 40 tonnes", source: "SAP ERP", scope: "Scope 3", category: "Purchased goods", conf: "Medium" as const },
  { activity: "Business air travel", source: "Expense feed", scope: "Scope 3", category: "Business travel", conf: "High" as const },
];

const calcData = {
  diesel: {
    label: "Diesel combustion — Plant 3",
    activity: "12,400 litres",
    factor: "2.68 kgCO₂e/litre",
    source: "EPA, Tier 1, v2025.4",
    formula: "12,400 litres × 2.68 kgCO₂e/litre = 33,232 kgCO₂e",
    result: "33.2 tCO₂e",
    uncertainty: "± 5%",
    method: "GHG Protocol, stationary combustion",
  },
  electricity: {
    label: "Grid electricity — HQ office",
    activity: "29,660 kWh",
    factor: "0.207 kgCO₂e/kWh",
    source: "DEFRA, v2026.1",
    formula: "29,660 kWh × 0.207 kgCO₂e/kWh = 6,140 kgCO₂e",
    result: "6.1 tCO₂e",
    uncertainty: "± 3%",
    method: "GHG Protocol, purchased electricity",
  },
  steel: {
    label: "Steel purchase — 40 tonnes",
    activity: "40,000 kg",
    factor: "1.85 kgCO₂e/kg",
    source: "IPCC, v2024.2",
    formula: "40,000 kg × 1.85 kgCO₂e/kg = 74,000 kgCO₂e",
    result: "74.0 tCO₂e",
    uncertainty: "± 12%",
    method: "GHG Protocol, purchased goods and services",
  },
} as const;

type CalcKey = keyof typeof calcData;

const MockChrome = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="overflow-hidden rounded-2xl border border-[#DCEAE2] bg-white shadow-[0_20px_50px_-28px_rgba(12,77,62,0.35)]">
    <div className="flex items-center gap-2 border-b border-[#E8EEEA] bg-[#FBFCFA] px-4 py-2.5">
      <span className="h-2 w-2 rounded-full bg-[#E1E5DE]" />
      <span className="h-2 w-2 rounded-full bg-[#E1E5DE]" />
      <span className="h-2 w-2 rounded-full bg-[#E1E5DE]" />
      <span className="ml-2 text-[11px] font-medium text-[#7A958B]">{title}</span>
    </div>
    <div className="p-4 sm:p-5">{children}</div>
  </div>
);

const StatusBadge = ({ status }: { status: "Mapped" | "Mapping" | "Pending" }) => {
  const styles =
    status === "Mapped"
      ? "bg-[#E7F3ED] text-[#0A4D3E]"
      : status === "Mapping"
        ? "bg-[#E8F1FB] text-[#1E5A8A]"
        : "bg-[#FDF3E2] text-[#946A1E]";
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${styles}`}>
      {status === "Mapped" && <Check className="h-3 w-3" />}
      {status}
    </span>
  );
};

const HeroInventoryMock = ({ prefersReducedMotion }: { prefersReducedMotion: boolean }) => (
  <div className="relative mx-auto w-full max-w-[480px]">
    <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#D8EDE4] via-[#EAF3ED] to-[#C8E5D8] p-5 shadow-[0_30px_70px_-34px_rgba(29,158,117,0.45)] sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full border border-white/40"
      />
      <motion.div
        initial={prefersReducedMotion ? undefined : { opacity: 0, y: 18, scale: 0.97 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 rounded-2xl border border-white/70 bg-white p-4 shadow-[0_18px_40px_-20px_rgba(12,77,62,0.4)] sm:p-5"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#0A4D3E]">Planetive</p>
            <p className="mt-0.5 text-[11px] text-[#7A958B]">Climate inventory · FY2025</p>
          </div>
          <span className="rounded-full bg-[#E7F3ED] px-2.5 py-1 font-mono text-[10px] text-[#1D9E75]">Live</span>
        </div>
        <div className="mb-3 flex flex-wrap gap-2 text-[10px] text-[#5B6B63]">
          <span className="inline-flex items-center gap-1 rounded-md border border-[#E8EEEA] px-2 py-1">
            <Building2 className="h-3 w-3 text-[#1D9E75]" /> Technology
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-[#E8EEEA] px-2 py-1">
            <MapPin className="h-3 w-3 text-[#1D9E75]" /> United States
          </span>
        </div>
        <div className="mb-4 flex gap-1 overflow-x-auto border-b border-[#E8EEEA] pb-2 text-[10px] text-[#7A958B]">
          {["Home", "Data", "Footprint", "Reports", "Targets"].map((tab, i) => (
            <span
              key={tab}
              className={[
                "shrink-0 rounded-md px-2 py-1",
                i === 2 ? "bg-[#0a1a1d] font-medium text-white" : "hover:text-[#0A4D3E]",
              ].join(" ")}
            >
              {tab}
            </span>
          ))}
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#7A958B]">Total calculated emissions</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight text-[#0A4D3E] sm:text-[2rem]">53,260 tCO₂e</p>
        <div className="mt-4 flex h-2.5 overflow-hidden rounded-full">
          <div className="w-[18%] bg-[#0a1a1d]" title="Scope 1" />
          <div className="w-[23%] bg-[#1D9E75]" title="Scope 2" />
          <div className="w-[59%] bg-[#33C08A]" title="Scope 3" />
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-[#5B6B63]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0a1a1d]" /> Scope 1 · 4,820
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1D9E75]" /> Scope 2 · 6,140
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#33C08A]" /> Scope 3 · 42,300
          </span>
        </div>
      </motion.div>

      <motion.div
        initial={prefersReducedMotion ? undefined : { opacity: 0, x: 24, y: 10 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.65, delay: 0.45 }}
        className="absolute -right-1 top-[38%] z-20 w-[48%] rounded-xl border border-white/80 bg-white p-3 shadow-[0_16px_36px_-16px_rgba(12,77,62,0.45)] sm:right-2"
      >
        <div className="mb-2 flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-[#1D9E75]" />
          <p className="text-[10px] font-semibold text-[#0A4D3E]">HQ Distribution</p>
        </div>
        <div className="space-y-1.5 text-[10px] text-[#5B6B63]">
          <p className="flex items-center gap-1.5">
            <Zap className="h-3 w-3 text-[#33C08A]" /> Electricity
          </p>
          <p className="flex items-center gap-1.5">
            <Fuel className="h-3 w-3 text-[#1D9E75]" /> Heat & steam
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={prefersReducedMotion ? undefined : { opacity: 0, x: -20, y: 16 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.65, delay: 0.55 }}
        className="absolute -left-1 bottom-6 z-20 w-[46%] rounded-xl border border-white/80 bg-white p-3 shadow-[0_16px_36px_-16px_rgba(12,77,62,0.45)] sm:left-2"
      >
        <div className="mb-1.5 flex items-center gap-2">
          <Truck className="h-3.5 w-3.5 text-[#1D9E75]" />
          <p className="text-[10px] font-semibold text-[#0A4D3E]">DX-24 Truck</p>
        </div>
        <p className="inline-flex items-center gap-1.5 text-[10px] text-[#5B6B63]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#33C08A]" /> Fuel consumption
        </p>
      </motion.div>
    </div>
  </div>
);

const FootprintModeler = ({ prefersReducedMotion }: { prefersReducedMotion: boolean }) => {
  const [fleet, setFleet] = useState(126);
  const [gas, setGas] = useState(1126);
  const [elec, setElec] = useState(552);
  const [travel, setTravel] = useState(60);
  const [goods, setGoods] = useState(2400);

  const { s1, s2, s3, total } = useMemo(() => {
    // Units match slider labels: kL, MWh, k km, k€ → tCO₂e
    // kL diesel × kgCO₂e/L = tCO₂e (1000 L/kL cancels with /1000 kg→t)
    const scope1 = fleet * 2.68 + gas * 0.184;
    // MWh × kgCO₂e/kWh = tCO₂e (1000 kWh/MWh cancels with /1000)
    const scope2 = elec * 0.207;
    // k km flown × kgCO₂e/pkm ≈ tCO₂e; k€ spend × kgCO₂e/€ ≈ tCO₂e
    const scope3 = travel * 0.255 + goods * 0.45;
    return {
      s1: scope1,
      s2: scope2,
      s3: scope3,
      total: scope1 + scope2 + scope3,
    };
  }, [fleet, gas, elec, travel, goods]);

  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0);

  const sliders = [
    { key: "fleet", label: "Fleet fuel", scope: "Scope 1", value: fleet, set: setFleet, min: 0, max: 400, unit: `${fleet} kL diesel`, color: "bg-[#0a1a1d]" },
    { key: "gas", label: "Natural gas", scope: "Scope 1", value: gas, set: setGas, min: 0, max: 3000, unit: `${gas.toLocaleString()} MWh`, color: "bg-[#0a1a1d]" },
    { key: "elec", label: "Purchased electricity", scope: "Scope 2", value: elec, set: setElec, min: 0, max: 2000, unit: `${elec} MWh`, color: "bg-[#1D9E75]" },
    { key: "travel", label: "Business travel", scope: "Scope 3", value: travel, set: setTravel, min: 0, max: 200, unit: `${travel}k km flown`, color: "bg-[#33C08A]" },
    { key: "goods", label: "Purchased goods", scope: "Scope 3", value: goods, set: setGoods, min: 0, max: 8000, unit: `${goods.toLocaleString()} k€ spend`, color: "bg-[#33C08A]" },
  ] as const;

  return (
    <motion.div
      initial={prefersReducedMotion ? undefined : { opacity: 0, y: 22 }}
      whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-[28px] border border-[#DCEAE2] bg-white shadow-[0_24px_60px_-32px_rgba(12,77,62,0.4)]"
    >
      <div className="grid lg:grid-cols-2">
        <div className="border-b border-[#E8EEEA] p-6 sm:p-8 lg:border-b-0 lg:border-r">
          <div className="space-y-6">
            {sliders.map((item) => (
              <div key={item.key}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-[#0A4D3E]">{item.label}</span>
                    <span className="rounded-full bg-[#E7F3ED] px-2 py-0.5 text-[10px] font-semibold text-[#1D9E75]">
                      {item.scope}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-[#5B6B63]">{item.unit}</span>
                </div>
                <input
                  type="range"
                  min={item.min}
                  max={item.max}
                  value={item.value}
                  onChange={(e) => item.set(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#E8EEEA] accent-[#1D9E75]"
                  aria-label={item.label}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[#F8FCFA] p-6 sm:p-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#1D9E75]">
            Estimated annual footprint
          </p>
          <p className="mt-2 text-4xl font-semibold tracking-tight text-[#0A4D3E] sm:text-5xl">
            {Math.round(total).toLocaleString()}{" "}
            <span className="text-2xl font-medium text-[#5B6B63] sm:text-3xl">tCO₂e</span>
          </p>
          <div className="mt-6 flex h-3 overflow-hidden rounded-full">
            <div className="bg-[#0a1a1d] transition-all duration-300" style={{ width: `${pct(s1)}%` }} />
            <div className="bg-[#1D9E75] transition-all duration-300" style={{ width: `${pct(s2)}%` }} />
            <div className="bg-[#33C08A] transition-all duration-300" style={{ width: `${pct(s3)}%` }} />
          </div>
          <div className="mt-5 space-y-3">
            {[
              { label: "Scope 1 Direct", value: s1, color: "bg-[#0a1a1d]" },
              { label: "Scope 2 Energy", value: s2, color: "bg-[#1D9E75]" },
              { label: "Scope 3 Value chain", value: s3, color: "bg-[#33C08A]" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-2 text-[#5B6B63]">
                  <span className={`h-2 w-2 rounded-full ${row.color}`} />
                  {row.label}
                </span>
                <span className="font-semibold text-[#0A4D3E]">{Math.round(row.value).toLocaleString()} t</span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[11px] leading-relaxed text-[#7A958B]">
            Illustrative GHG Protocol–style factors for demo only. The platform uses audited, region-specific emission
            factors.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

const CarbonAccountingPage = ({ prefersReducedMotion: prefersReducedMotionProp }: CarbonAccountingPageProps) => {
  const hookReduced = useReducedMotion();
  const prefersReducedMotion = prefersReducedMotionProp ?? !!hookReduced;
  const [calcKey, setCalcKey] = useState<CalcKey>("diesel");
  const calc = calcData[calcKey];

  const fadeUp = {
    initial: prefersReducedMotion ? undefined : { opacity: 0, y: 22 },
    whileInView: prefersReducedMotion ? undefined : { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.2 },
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  };

  const modules = [
    {
      num: "01",
      title: "Every source, mapped automatically",
      desc: "Upload from ERP, utility bills, procurement systems, spreadsheets, APIs and suppliers. Activities are classified into emission sources without manual tagging.",
      tag: "AI Data Mapping",
      mock: (
        <MockChrome title="Data Mapping">
          <div className="mb-3 flex flex-wrap gap-2 text-[10px] font-medium text-[#5B6B63]">
            {["Upload", "Map", "Review", "Confirm"].map((step, i) => (
              <span
                key={step}
                className={[
                  "rounded-full px-2.5 py-1",
                  i <= 1 ? "bg-[#0a1a1d] text-white" : "border border-[#DCEAE2] bg-white",
                ].join(" ")}
              >
                {step}
              </span>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-[12px]">
              <thead>
                <tr className="border-b border-[#E8EEEA] font-mono text-[10px] uppercase tracking-wide text-[#7A958B]">
                  <th className="pb-2 pr-3 font-medium">Source</th>
                  <th className="pb-2 pr-3 font-medium">File / Integration</th>
                  <th className="pb-2 pr-3 font-medium">Records</th>
                  <th className="pb-2 pr-3 font-medium">Mapped</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {mappingRows.map((row) => (
                  <tr key={row.source} className="border-b border-[#F0F1EC] last:border-0">
                    <td className="py-2.5 pr-3 font-medium text-[#0A4D3E]">{row.source}</td>
                    <td className="py-2.5 pr-3 text-[#5B6B63]">{row.file}</td>
                    <td className="py-2.5 pr-3 text-[#5B6B63]">{row.records}</td>
                    <td className="py-2.5 pr-3 text-[#5B6B63]">{row.mapped}</td>
                    <td className="py-2.5">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </MockChrome>
      ),
    },
    {
      num: "02",
      title: "A searchable, versioned factor database",
      desc: "DEFRA, EPA, IPCC, and country or sector-specific factors, each with methodology, source and version history attached.",
      tag: "Emission Factor Library",
      mock: (
        <MockChrome title="Emission Factor Library">
          <div className="mb-3 flex flex-wrap gap-2">
            <div className="flex min-w-[160px] flex-1 items-center gap-2 rounded-lg border border-[#DCEAE2] px-3 py-2 text-[12px] text-[#7A958B]">
              Search emission factors…
            </div>
            {["Database", "Region", "Sector"].map((f) => (
              <span key={f} className="rounded-lg border border-[#DCEAE2] px-3 py-2 font-mono text-[10px] text-[#5B6B63]">
                {f}
              </span>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[12px]">
              <thead>
                <tr className="border-b border-[#E8EEEA] font-mono text-[10px] uppercase tracking-wide text-[#7A958B]">
                  <th className="pb-2 pr-3 font-medium">Activity</th>
                  <th className="pb-2 pr-3 font-medium">Database</th>
                  <th className="pb-2 pr-3 font-medium">Region</th>
                  <th className="pb-2 pr-3 font-medium">Factor</th>
                  <th className="pb-2 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {factorRows.map((row) => (
                  <tr key={row.activity} className="border-b border-[#F0F1EC] last:border-0">
                    <td className="py-2.5 pr-3 font-medium text-[#0A4D3E]">{row.activity}</td>
                    <td className="py-2.5 pr-3 text-[#5B6B63]">{row.db}</td>
                    <td className="py-2.5 pr-3 text-[#5B6B63]">{row.region}</td>
                    <td className="py-2.5 pr-3 font-mono text-[#0A4D3E]">
                      {row.factor} <span className="text-[10px] text-[#7A958B]">{row.unit}</span>
                    </td>
                    <td className="py-2.5 text-[#5B6B63]">{row.updated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </MockChrome>
      ),
    },
    {
      num: "03",
      title: "Scope 1, 2 and 3, assigned automatically",
      desc: "Every activity is classified with a confidence score. Anything below your threshold is flagged for manual review, never silently guessed.",
      tag: "Scope Classification Engine",
      mock: (
        <MockChrome title="Activity Classification">
          <div className="mb-3 flex flex-wrap gap-2 text-[10px] font-medium text-[#5B6B63]">
            {["Classify", "Validate", "Confirm"].map((step, i) => (
              <span
                key={step}
                className={[
                  "rounded-full px-2.5 py-1",
                  i === 0 ? "bg-[#0a1a1d] text-white" : "border border-[#DCEAE2] bg-white",
                ].join(" ")}
              >
                {step}
              </span>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[12px]">
              <thead>
                <tr className="border-b border-[#E8EEEA] font-mono text-[10px] uppercase tracking-wide text-[#7A958B]">
                  <th className="pb-2 pr-3 font-medium">Activity</th>
                  <th className="pb-2 pr-3 font-medium">Scope</th>
                  <th className="pb-2 pr-3 font-medium">Category</th>
                  <th className="pb-2 font-medium">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {classifyRows.map((row) => (
                  <tr key={row.activity} className="border-b border-[#F0F1EC] last:border-0">
                    <td className="py-2.5 pr-3 font-medium text-[#0A4D3E]">{row.activity}</td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={[
                          "rounded-md px-2 py-0.5 text-[11px] font-semibold",
                          row.scope === "Scope 1"
                            ? "bg-[#0a1a1d] text-white"
                            : row.scope === "Scope 2"
                              ? "bg-[#1D9E75] text-white"
                              : "bg-[#E7F3ED] text-[#0A4D3E]",
                        ].join(" ")}
                      >
                        {row.scope}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-[#5B6B63]">{row.category}</td>
                    <td className="py-2.5">
                      <span
                        className={[
                          "rounded-md px-2 py-0.5 text-[11px] font-semibold",
                          row.conf === "High" ? "bg-[#E7F3ED] text-[#0A4D3E]" : "bg-[#FDF3E2] text-[#946A1E]",
                        ].join(" ")}
                      >
                        {row.conf}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 rounded-xl border border-[#E8EEEA] bg-[#F8FCFA] p-3">
            <p className="mb-2 text-[11px] font-semibold text-[#0A4D3E]">Classification summary</p>
            <div className="flex h-2 overflow-hidden rounded-full">
              <div className="w-[32%] bg-[#0a1a1d]" />
              <div className="w-[18%] bg-[#1D9E75]" />
              <div className="w-[50%] bg-[#33C08A]" />
            </div>
            <p className="mt-2 text-[10px] text-[#7A958B]">Scope 1 32% · Scope 2 18% · Scope 3 50%</p>
          </div>
        </MockChrome>
      ),
    },
    {
      num: "04",
      title: "The executive view of your footprint",
      desc: "Scope totals, trends, top emitting categories, facility comparisons and progress against target, in one screen.",
      tag: "Carbon Inventory Dashboard",
      mock: (
        <MockChrome title="Carbon Inventory Overview">
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["SCOPE 1", "4,820", "-6% YoY"],
              ["SCOPE 2", "6,140", "-3% YoY"],
              ["SCOPE 3", "42,300", "-1% YoY"],
              ["TOTAL", "53,260", "58% to target"],
            ].map(([label, value, sub]) => (
              <div key={label} className="rounded-xl border border-[#E8EEEA] bg-[#F8FCFA] p-3">
                <p className="font-mono text-[10px] text-[#7A958B]">{label}</p>
                <p className="mt-1 text-lg font-semibold text-[#0A4D3E]">{value}</p>
                <p className="text-[10px] text-[#1D9E75]">{sub}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#E8EEEA] bg-[#F8FCFA] p-3">
              <p className="mb-3 text-[12px] font-semibold text-[#0A4D3E]">Top emitting categories</p>
              {[
                ["Purchased goods", 38],
                ["Electricity", 22],
                ["Business travel", 11],
                ["Fleet fuel", 9],
              ].map(([name, pctVal]) => (
                <div key={String(name)} className="mb-2 flex items-center gap-2 text-[11px]">
                  <span className="w-24 shrink-0 text-[#5B6B63]">{name}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E8EEEA]">
                    <span className="block h-full rounded-full bg-[#1D9E75]" style={{ width: `${pctVal}%` }} />
                  </span>
                  <span className="w-8 text-right font-mono text-[#7A958B]">{pctVal}%</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-[#E8EEEA] bg-[#F8FCFA] p-3">
              <p className="mb-3 text-[12px] font-semibold text-[#0A4D3E]">Facility comparison</p>
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="font-mono text-[10px] uppercase text-[#7A958B]">
                    <th className="pb-2 font-medium">Facility</th>
                    <th className="pb-2 font-medium">tCO₂e</th>
                    <th className="pb-2 font-medium">YoY</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Plant A", "18,240", "-8%"],
                    ["Plant B", "12,960", "-2%"],
                    ["HQ office", "3,110", "-11%"],
                  ].map(([f, v, y]) => (
                    <tr key={f} className="border-t border-[#E8EEEA]">
                      <td className="py-2 text-[#0A4D3E]">{f}</td>
                      <td className="py-2 text-[#5B6B63]">{v}</td>
                      <td className="py-2 text-[#1D9E75]">{y}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </MockChrome>
      ),
    },
    {
      num: "05",
      title: "Every number, fully explainable",
      desc: "Select any activity and see exactly how its emissions figure was calculated, down to the factor, formula and audit history.",
      tag: "Calculation Transparency",
      mock: (
        <MockChrome title="Calculation Details">
          <select
            value={calcKey}
            onChange={(e) => setCalcKey(e.target.value as CalcKey)}
            className="mb-4 w-full rounded-lg border border-[#DCEAE2] bg-white px-3 py-2.5 text-[13px] text-[#0A4D3E]"
          >
            {(Object.keys(calcData) as CalcKey[]).map((key) => (
              <option key={key} value={key}>
                {calcData[key].label}
              </option>
            ))}
          </select>
          <div className="grid gap-4 sm:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-0">
              {[
                ["Activity data", calc.activity],
                ["Emission factor", calc.factor],
                ["Factor source", calc.source],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-dashed border-[#E8EEEA] py-2.5 text-[12.5px]">
                  <span className="text-[#7A958B]">{k}</span>
                  <span className="text-right font-semibold text-[#0A4D3E]">{v}</span>
                </div>
              ))}
              <div className="my-3 rounded-lg bg-[#0a1a1d] px-3 py-3 text-center font-mono text-[12px] leading-relaxed text-white">
                {calc.formula}
              </div>
              {[
                ["Result", calc.result],
                ["Uncertainty", calc.uncertainty],
                ["Methodology", calc.method],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-dashed border-[#E8EEEA] py-2.5 text-[12.5px] last:border-0">
                  <span className="text-[#7A958B]">{k}</span>
                  <span className="max-w-[60%] text-right font-semibold text-[#0A4D3E]">{v}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-[#E8EEEA] bg-[#F8FCFA] p-3">
              <p className="mb-3 text-[12px] font-semibold text-[#0A4D3E]">Audit history</p>
              {[
                ["Record created from ERP import", "14 Jan 2026, 09:12"],
                ["Reviewed by data analyst", "15 Jan 2026, 11:40"],
                ["Approved for inventory", "16 Jan 2026, 08:55"],
              ].map(([msg, time]) => (
                <div key={msg} className="mb-3 flex gap-2 border-b border-[#E8EEEA] pb-3 last:mb-0 last:border-0 last:pb-0">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1D9E75]" />
                  <div>
                    <p className="text-[12px] text-[#0A4D3E]">{msg}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-[#7A958B]">{time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </MockChrome>
      ),
    },
    {
      num: "06",
      title: "One inventory, every disclosure format",
      desc: "Generate reports aligned to GHG Protocol, IFRS S2, CDP, GRI or your own internal format, and export directly to PDF, Excel or XBRL.",
      tag: "Reporting Center",
      mock: (
        <MockChrome title="Reporting Center">
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {["GHG Protocol", "IFRS S2", "CDP", "CSRD", "GRI", "Custom"].map((fw, i) => (
              <div
                key={fw}
                className={[
                  "rounded-xl border p-3 text-[12px] font-semibold",
                  i < 3
                    ? "border-[#1D9E75]/35 bg-[#E7F3ED] text-[#0A4D3E]"
                    : "border-[#DCEAE2] bg-white text-[#5B6B63]",
                ].join(" ")}
              >
                <span className="mb-1 flex items-center gap-1.5">
                  {i < 3 ? (
                    <span className="flex h-4 w-4 items-center justify-center rounded bg-[#1D9E75] text-white">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  ) : (
                    <span className="h-4 w-4 rounded border border-[#DCEAE2]" />
                  )}
                  {fw}
                </span>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {[
              ["FY2025 GHG inventory report", "GHG Protocol · Scope 1, 2 and 3", "Ready"],
              ["IFRS S2 climate disclosure", "Board pack draft", "In review"],
              ["CDP climate response", "Questionnaire mapped, 82% complete", "In review"],
            ].map(([name, meta, status]) => (
              <div
                key={name}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#DCEAE2] px-3.5 py-3"
              >
                <div>
                  <p className="text-[13px] font-semibold text-[#0A4D3E]">{name}</p>
                  <p className="text-[11px] text-[#7A958B]">{meta}</p>
                </div>
                <span
                  className={[
                    "shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold",
                    status === "Ready" ? "bg-[#E7F3ED] text-[#0A4D3E]" : "bg-[#FDF3E2] text-[#946A1E]",
                  ].join(" ")}
                >
                  {status}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {["PDF", "Excel", "XBRL"].map((fmt) => (
              <span
                key={fmt}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCEAE2] px-3 py-2 text-[12px] font-medium text-[#5B6B63]"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-[#1D9E75]" />
                Export {fmt}
              </span>
            ))}
          </div>
        </MockChrome>
      ),
    },
  ];

  return (
    <main className="w-full overflow-hidden">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0a1a1d] pt-28 pb-16 text-white sm:pt-32 sm:pb-20 lg:min-h-[88vh] lg:flex lg:items-center">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(80%_70%_at_15%_20%,rgba(29,158,117,0.2),transparent_55%),radial-gradient(60%_50%_at_85%_40%,rgba(51,192,138,0.12),transparent_50%)]"
        />
        <div className="relative z-10 mx-auto grid w-full max-w-[1280px] items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-10 lg:px-10">
          <div>
            <motion.div
              initial={prefersReducedMotion ? undefined : { opacity: 0, x: -18, filter: "blur(8px)" }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.55 }}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#1D9E75]/35 bg-[#1D9E75]/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9FE1CB]"
            >
              <Calculator className="h-3.5 w-3.5" />
              Scope 1, 2 and 3 accounting
            </motion.div>

            <motion.h1
              variants={prefersReducedMotion ? undefined : heroWordContainer}
              initial={prefersReducedMotion ? undefined : "hidden"}
              animate={prefersReducedMotion ? undefined : "show"}
              className="max-w-xl text-3xl font-semibold leading-[1.18] tracking-tight sm:text-4xl md:text-5xl lg:text-[2.85rem]"
              style={{ perspective: 800 }}
            >
              {heroLead.map((word, i) => (
                <motion.span
                  key={`lead-${i}`}
                  variants={prefersReducedMotion ? undefined : heroWordReveal}
                  className="mr-[0.28em] inline-block whitespace-pre"
                >
                  {word}
                </motion.span>
              ))}
              {heroAccent.map((word, i) => (
                <motion.span
                  key={`accent-${i}`}
                  variants={prefersReducedMotion ? undefined : heroAccentReveal}
                  className="hero-shimmer mr-[0.28em] inline-block whitespace-pre bg-gradient-to-r from-[#33C08A] via-[#DFFBEF] to-[#33C08A] bg-clip-text pb-[0.12em] text-transparent"
                >
                  {word}
                </motion.span>
              ))}
              {heroTrail.map((word, i) => (
                <motion.span
                  key={`trail-${i}`}
                  variants={prefersReducedMotion ? undefined : heroWordReveal}
                  className="mr-[0.28em] inline-block whitespace-pre"
                >
                  {word}
                </motion.span>
              ))}
            </motion.h1>

            <motion.p
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.85 }}
              className="mt-6 max-w-lg text-base leading-relaxed text-white/70 sm:text-lg"
            >
              From raw activity data to an audit-ready inventory, Rethink Carbon handles mapping, emission factors,
              scope classification, calculation and disclosure inside one connected system your finance team can trust.
            </motion.p>

            <motion.div
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 18 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.05 }}
              className="mt-9 flex flex-col gap-3 sm:flex-row"
            >
              <Button
                size="lg"
                className="group rounded-full bg-[#1D9E75] px-7 py-6 font-semibold text-[#04342C] shadow-[0_14px_40px_-12px_rgba(29,158,117,0.55)] hover:bg-[#22B87E]"
                asChild
              >
                <Link to="/contact">
                  Book a demo
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full border-white/25 bg-transparent px-7 py-6 font-semibold text-white hover:bg-white/10 hover:text-white"
                asChild
              >
                <a href="#accounting-modules">Explore the module</a>
              </Button>
            </motion.div>
          </div>

          <HeroInventoryMock prefersReducedMotion={prefersReducedMotion} />
        </div>
      </section>

      {/* Framework logos carousel */}
      <section className="overflow-hidden border-y border-[#DCEAE2] bg-white py-12">
        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.18em] text-[#7A958B]">
          Aligned to the standards that matter
        </p>
        <div className="relative">
          <div
            className={prefersReducedMotion ? "flex justify-center flex-wrap gap-4 px-4" : "flex animate-scroll-logos"}
          >
            {(prefersReducedMotion ? frameworkLogos : [...frameworkLogos, ...frameworkLogos]).map((logo, index) => (
              <div
                key={`${logo.name}-${index}`}
                className="mx-8 flex h-[120px] w-[200px] flex-shrink-0 items-center justify-center"
              >
                <img
                  src={logo.src}
                  alt={logo.name}
                  className="max-h-full max-w-full object-contain opacity-70 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Six modules */}
      <section id="accounting-modules" className="bg-[#F8FCFA] py-16 sm:py-20">
        <div className="mx-auto max-w-[1280px] space-y-20 px-4 sm:px-6 lg:px-10">
          <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#1D9E75]">Measure → Report</p>
            <h2 className="text-3xl font-semibold tracking-tight text-[#0A4D3E] sm:text-4xl">
              Scope 1, 2, and 3 carbon footprints for businesses of all sizes.
            </h2>
          </motion.div>

          {modules.map((mod, index) => {
            const reverse = index % 2 === 1;
            return (
              <motion.div
                key={mod.num}
                {...fadeUp}
                transition={{ duration: 0.55, delay: 0.04, ease: [0.22, 1, 0.36, 1] }}
                className={[
                  "grid items-center gap-8 lg:grid-cols-2 lg:gap-12",
                  reverse ? "lg:[&>*:first-child]:order-2" : "",
                ].join(" ")}
              >
                <div>
                  <p className="mb-2 font-mono text-[11px] tracking-[0.14em] text-[#1D9E75]">
                    {mod.num} · {mod.tag.toUpperCase()}
                  </p>
                  <h3 className="text-2xl font-semibold tracking-tight text-[#0A4D3E] sm:text-[1.75rem]">{mod.title}</h3>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-[#5B6B63] sm:text-base">{mod.desc}</p>
                </div>
                <div className="rounded-[24px] bg-gradient-to-br from-[#EAF3ED] to-[#D8EDE4] p-4 sm:p-5">{mod.mock}</div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Cool tool */}
      <section id="footprint-tool" className="bg-[#EEF4F1] py-16 sm:py-20">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <motion.div {...fadeUp} className="mx-auto mb-10 max-w-2xl text-center">
            <p className="mb-3 inline-flex rounded-full border border-[#1D9E75]/25 bg-white px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-[#1D9E75]">
              Try it live
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-[#0A4D3E] sm:text-4xl">
              Model a footprint in seconds
            </h2>
            <p className="mt-4 text-base text-[#5B6B63] sm:text-lg">
              Drag the sliders to see how activity data across scopes rolls up into a total footprint and scope
              breakdown. A simplified version of the engine that powers real inventories.
            </p>
          </motion.div>
          <FootprintModeler prefersReducedMotion={prefersReducedMotion} />
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#EEF4F1] pb-16 sm:pb-20">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <motion.div
            {...fadeUp}
            className="relative overflow-hidden rounded-[30px] border border-[#2F8F6D]/30 bg-[linear-gradient(140deg,#0A4D3E_0%,#11684E_52%,#22B87E_100%)] px-6 py-14 text-center text-white shadow-[0_18px_45px_rgba(10,77,62,0.30)] sm:px-10 md:py-16"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-8 -left-8 h-36 w-36 rounded-full border border-white/20"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute right-10 top-8 h-20 w-20 rotate-45 border border-white/18"
            />
            <h2 className="relative z-10 mb-4 text-2xl font-semibold sm:text-3xl md:text-4xl">
              See Carbon Accounting on your own data.
            </h2>
            <p className="relative z-10 mx-auto mb-8 max-w-2xl text-base text-[#E6F6EF] sm:text-lg">
              Walk through mapping, factors, classification and disclosure with your team&apos;s activity data.
            </p>
            <div className="relative z-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Button
                size="lg"
                className="rounded-full bg-[#124740] px-8 py-6 font-semibold text-white hover:bg-[#0F3B35]"
                asChild
              >
                <Link to="/contact">
                  Book a demo
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full border-white/40 bg-transparent px-8 py-6 font-semibold text-white hover:bg-white/10 hover:text-white"
                asChild
              >
                <Link to="/contact">Talk to an expert</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
};

export default CarbonAccountingPage;

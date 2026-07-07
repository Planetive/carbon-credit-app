import MainHeader from "@/components/layout/MainHeader";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Building2, Check, Landmark, Puzzle, Store, X } from "lucide-react";
import { Link } from "react-router-dom";

type TierFeature = {
  label: string;
  included: boolean;
  addon?: boolean;
};

type Tier = {
  key: string;
  name: string;
  badge: string;
  description: string;
  icon: typeof Building2;
  iconClasses: string;
  iconAccentClasses: string;
  cardClasses: string;
  featured?: boolean;
  ribbon?: string;
  customPricingLabel: string;
  features: TierFeature[];
};

const tiers: Tier[] = [
  {
    key: "sme",
    name: "SME",
    badge: "Up to 50 team members",
    description: "Best for early-stage teams launching a structured decarbonization baseline quickly.",
    icon: Store,
    iconClasses: "text-[#0A4D3E]",
    iconAccentClasses: "from-[#33C08A]/30 to-[#BFE3D3]/20 ring-[#33C08A]/25",
    cardClasses: "from-[#DFF3EA] via-[#EDF8F3] to-[#D7EEE4] border-[#A7D0BF]",
    customPricingLabel: "Custom pricing for growing teams",
    features: [
      { label: "Project Explorer access", included: true },
      { label: "AI Project Advisor baseline scoring", included: true },
      { label: "IPCC-aligned emissions calculator", included: true },
      { label: "ESG health check starter workflows", included: true },
      { label: "Automated PDF exports", included: false, addon: true },
      { label: "Dedicated success manager", included: false, addon: true },
    ],
  },
  {
    key: "medium",
    name: "Medium Enterprises",
    badge: "50 to 300 team members",
    description: "For multi-team organizations needing stronger governance, reporting, and portfolio visibility.",
    icon: Building2,
    iconClasses: "text-[#1C7A53]",
    iconAccentClasses: "from-[#1C7A53]/25 to-[#7DD9B5]/20 ring-[#1C7A53]/20",
    cardClasses: "from-[#D6EFE5] via-[#E8F6EF] to-[#CFE9DE] border-[#9FCBB8]",
    customPricingLabel: "Tailored by data volume and complexity",
    features: [
      { label: "Everything in SME", included: true },
      { label: "Portfolio analytics and benchmarking", included: true },
      { label: "Advanced project filtering and watchlists", included: true },
      { label: "Cross-entity ESG readiness workflows", included: true },
      { label: "Priority onboarding support", included: true },
      { label: "API and third-party integrations", included: false, addon: true },
    ],
  },
  {
    key: "modular",
    name: "Modular",
    badge: "Any team size, custom stack",
    description: "Build your own package by selecting exactly the modules and services your strategy requires.",
    icon: Puzzle,
    iconClasses: "text-[#0A4D3E]",
    iconAccentClasses: "from-[#33C08A]/35 to-[#7DD9B5]/25 ring-[#33C08A]/30",
    cardClasses: "from-[#D8F3E8] via-[#F4FBF8] to-[#E4F7EE] border-[#33C08A]/60",
    featured: true,
    ribbon: "Most Flexible",
    customPricingLabel: "Custom pricing by selected modules",
    features: [
      { label: "Pick only required modules", included: true },
      { label: "Mix self-serve + advisory delivery", included: true },
      { label: "Custom report packs and templates", included: true },
      { label: "Optional integration bundle", included: false, addon: true },
      { label: "Optional managed implementation", included: false, addon: true },
      { label: "Scale to enterprise at any time", included: true },
    ],
  },
  {
    key: "enterprise",
    name: "Custom / Enterprise",
    badge: "300+ team members",
    description: "For complex organizations requiring enterprise controls, integrations, and strategic partnership.",
    icon: Landmark,
    iconClasses: "text-[#325E50]",
    iconAccentClasses: "from-[#9CB8AD]/25 to-[#D5E5DE]/20 ring-[#9CB8AD]/25",
    cardClasses: "from-[#DCEBE5] via-[#ECF4F0] to-[#D4E5DE] border-[#AFC7BC]",
    customPricingLabel: "Designed around enterprise scope",
    features: [
      { label: "End-to-end platform suite", included: true },
      { label: "Dedicated account and implementation team", included: true },
      { label: "Enterprise-grade governance controls", included: true },
      { label: "Custom API and data architecture support", included: true },
      { label: "Executive reporting and board-ready packs", included: true },
      { label: "Training and change-management enablement", included: true },
    ],
  },
];

const comparisonRows = [
  { label: "Project Explorer", values: ["Included", "Included", "Optional", "Included"] },
  { label: "AI Project Advisor", values: ["Included", "Included", "Optional", "Included"] },
  { label: "Emissions Calculator", values: ["Included", "Included", "Optional", "Included"] },
  { label: "ESG Readiness Tools", values: ["Starter", "Advanced", "Optional", "Advanced"] },
  { label: "Portfolio Analytics", values: ["Limited", "Included", "Optional", "Included"] },
  { label: "API Integrations", values: ["Add-on", "Add-on", "Add-on", "Included"] },
  { label: "Managed Delivery", values: ["Add-on", "Add-on", "Optional", "Included"] },
  { label: "Dedicated Success Lead", values: ["Add-on", "Included", "Optional", "Included"] },
];

const faqs = [
  {
    question: "Why are there no fixed prices shown?",
    answer:
      "Every deployment depends on team size, modules selected, reporting depth, and integration scope. We scope each package with you first, then provide a tailored quote.",
  },
  {
    question: "How fast can we start after requesting a quote?",
    answer:
      "Most teams can begin onboarding in 1 to 2 weeks. Complex enterprise setups may require a phased implementation plan agreed during scoping.",
  },
  {
    question: "Can we start small and upgrade later?",
    answer:
      "Yes. Many teams begin with SME or a focused Modular bundle, then expand to additional modules, integrations, and governance support as needs grow.",
  },
  {
    question: "Do you support compliance and audit-ready reporting?",
    answer:
      "Yes. Medium and Enterprise packages include stronger governance workflows and exportable reports aligned with recognized emissions and ESG reporting practices.",
  },
];

const Pricing = () => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="font-sans relative min-h-screen overflow-hidden bg-[radial-gradient(1200px_520px_at_10%_-5%,rgba(51,192,138,0.16),transparent_58%),radial-gradient(900px_520px_at_95%_12%,rgba(125,217,181,0.24),transparent_56%),linear-gradient(180deg,#0A4D3E_0%,#1C7A53_36%,#EAF7F1_78%,#F8FCFA_100%)]">
      <div aria-hidden className="pointer-events-none absolute -top-20 -left-28 h-72 w-72 rounded-full bg-[#33C08A]/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute top-44 -right-24 h-[24rem] w-[24rem] rounded-full bg-[#7DD9B5]/30 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute bottom-20 left-1/3 h-64 w-64 rounded-full bg-[#BFE3D3]/40 blur-3xl" />
      <MainHeader />

      <section className="relative pt-36 md:pt-40 pb-12 px-4">
        <div className="container mx-auto max-w-5xl text-center py-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Choose the right carbon intelligence package for your growth stage
          </h1>
          <p className="text-lg text-slate-200/90 max-w-3xl mx-auto">
            Every plan is tailored to your organization&apos;s goals, operational complexity, and implementation model.
          </p>
        </div>
      </section>

      <section className="relative pb-10 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {tiers.map((tier, index) => {
              const Icon = tier.icon;
              return (
                <motion.div
                  key={tier.key}
                  initial={prefersReducedMotion ? undefined : { opacity: 0, y: 22 }}
                  whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.28, delay: prefersReducedMotion ? 0 : index * 0.08, ease: "easeOut" }}
                  className={tier.featured ? "lg:-mt-2" : ""}
                >
                  <Card
                    className={[
                      "group relative h-full overflow-hidden border bg-gradient-to-br transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl",
                      tier.featured
                        ? "shadow-xl ring-1 ring-violet-300/60"
                        : "shadow-md",
                      tier.cardClasses,
                    ].join(" ")}
                  >
                    {tier.featured && (
                      <>
                        <Badge className="absolute top-4 right-4 bg-[#1C7A53] text-white border-[#1C7A53]">
                          {tier.ribbon}
                        </Badge>
                        {!prefersReducedMotion && (
                          <motion.div
                            aria-hidden
                            className="pointer-events-none absolute -inset-12 bg-gradient-to-r from-[#33C08A]/25 via-[#7DD9B5]/20 to-[#BFE3D3]/20"
                            animate={{ opacity: [0.2, 0.38, 0.2], scale: [1, 1.03, 1] }}
                            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                          />
                        )}
                      </>
                    )}

                    <CardHeader className="relative z-10">
                      <motion.div
                        animate={prefersReducedMotion ? undefined : { y: [0, -2, 0], rotate: [0, 1.3, 0] }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: index * 0.1 }}
                        className={`mb-4 h-12 w-12 rounded-full flex items-center justify-center bg-gradient-to-br shadow-[0_6px_16px_rgba(10,77,62,0.12)] ring-1 transition-transform duration-300 ease-out group-hover:scale-105 ${tier.iconClasses} ${tier.iconAccentClasses}`}
                      >
                        <Icon className="h-6 w-6" />
                      </motion.div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-2xl text-gray-900">{tier.name}</CardTitle>
                      </div>
                      <p className="text-xs uppercase tracking-[0.12em] text-[#456D5F]">
                        Best for {tier.badge}
                      </p>
                      <CardDescription className="text-gray-600 min-h-[3.5rem]">{tier.description}</CardDescription>
                    </CardHeader>

                    <CardContent className="relative z-10 flex flex-col gap-5">
                      <ul className="space-y-3">
                        {tier.features.map((feature) => (
                          <li key={feature.label} className="flex items-start gap-2.5">
                            {feature.included ? (
                              <Check className="h-4.5 w-4.5 text-emerald-600 mt-0.5 shrink-0" />
                            ) : (
                              <X className="h-4.5 w-4.5 text-gray-400 mt-0.5 shrink-0" />
                            )}
                            <span className={feature.included ? "text-sm text-gray-800" : "text-sm text-gray-400"}>
                              {feature.label}
                              {feature.addon ? " (Add-on)" : ""}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <div className="pt-3 mt-auto border-t border-gray-200/70">
                        <p className="text-xs uppercase tracking-wide text-gray-500">Custom pricing</p>
                        <p className="text-sm text-gray-600 mt-1 mb-4">{tier.customPricingLabel}</p>
                        <Button asChild className="w-full bg-[#0A4D3E] text-white hover:bg-[#083E32] group/btn">
                          <Link to="/contact">
                            Get a Quote
                            <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 ease-out group-hover/btn:translate-x-1" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-6 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="rounded-3xl border border-[#B8DCCE] bg-white/92 backdrop-blur-sm p-6 md:p-8 shadow-[0_16px_40px_rgba(10,77,62,0.12)]">
            <div className="mb-5">
              <h2 className="text-2xl md:text-3xl font-bold text-[#0A4D3E]">Compare all features</h2>
              <p className="text-[#325E50] mt-1">Clear plan-by-plan visibility at a glance.</p>
            </div>
            <Table className="[&_tr:hover]:!bg-[#E7F4EE]">
              <TableHeader>
                <TableRow className="border-[#D6E9E0]">
                  <TableHead className="min-w-[180px] text-[#325E50]">Feature</TableHead>
                  <TableHead className="text-[#325E50]">SME</TableHead>
                  <TableHead className="text-[#325E50]">Medium</TableHead>
                  <TableHead className="text-[#325E50]">Modular</TableHead>
                  <TableHead className="text-[#325E50]">Enterprise</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonRows.map((row) => (
                  <TableRow key={row.label} className="border-[#E2F0EA] !hover:bg-[#E7F4EE] transition-colors duration-200">
                    <TableCell className="font-medium text-[#0A4D3E]">{row.label}</TableCell>
                    {row.values.map((value, idx) => (
                      <TableCell key={`${row.label}-${idx}`} className={value === "Add-on" ? "text-[#6B8E81]" : "text-[#234B3F]"}>
                        {value}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      <section className="py-8 px-4">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-bold text-[#0A4D3E] mb-2 text-center">Pricing FAQs</h2>
          <p className="text-center text-[#325E50] mb-8">
            Common questions about quotes, onboarding, and package fit.
          </p>
          <Accordion type="single" collapsible className="rounded-2xl border border-[#B8DCCE] bg-white/92 backdrop-blur-sm px-6 shadow-md">
            {faqs.map((faq, index) => (
              <AccordionItem key={faq.question} value={`faq-${index}`} className="border-[#D6E9E0]">
                <AccordionTrigger className="text-left text-[#123E32] hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-[#325E50]">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <div className="fixed bottom-4 left-4 right-4 z-40 lg:hidden">
        <Button asChild size="lg" className="w-full bg-gray-900 text-white hover:bg-black shadow-xl">
          <Link to="/contact">
            Get a Quote
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default Pricing;
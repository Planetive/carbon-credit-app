export type PillarId =
  | "governance"
  | "strategy"
  | "risk_management"
  | "metrics_data"
  | "climate_metrics"
  | "disclosure";

export type QuestionId =
  | "G1"
  | "G2"
  | "G3"
  | "S1"
  | "S2"
  | "S3"
  | "R1"
  | "R2"
  | "R3"
  | "M1"
  | "M2"
  | "M3"
  | "M4"
  | "C1"
  | "C2"
  | "C3"
  | "C4"
  | "C5"
  | "D1"
  | "D2"
  | "D3"
  | "D4";

export type ScoreValue = 0 | 1 | 2 | 3 | 4 | 5;

export interface QuestionRubric {
  0: string;
  1: string;
  2: string;
  3: string;
  4: string;
  5: string;
}

export interface ReadinessQuestion {
  id: QuestionId;
  pillarId: PillarId;
  text: string;
  whyItMatters: string;
  redFlag: boolean;
  rubric: QuestionRubric;
}

export interface ReadinessPillar {
  id: PillarId;
  name: string;
  weight: number;
  questions: ReadinessQuestion[];
}

const withRubric = (
  id: QuestionId,
  pillarId: PillarId,
  text: string,
  whyItMatters: string,
  redFlag: boolean,
  rubric: QuestionRubric
): ReadinessQuestion => ({
  id,
  pillarId,
  text,
  whyItMatters,
  redFlag,
  rubric,
});

export const READINESS_PILLARS: ReadinessPillar[] = [
  {
    id: "governance",
    name: "Governance",
    weight: 0.15,
    questions: [
      withRubric(
        "G1",
        "governance",
        "Board oversight for sustainability-related risks and opportunities is formally assigned.",
        "Clear board accountability helps sustainability decisions become consistent and decision-useful.",
        false,
        {
          0: "No board oversight assignment or evidence exists.",
          1: "Oversight discussed informally; no clear mandate or records.",
          2: "Some mandate language exists, but roles/escalation are unclear.",
          3: "Committee charter or minutes show defined oversight responsibility.",
          4: "Mandate is clear, with recurring minutes and escalation pathways.",
          5: "Strong documented governance: charters, minutes, mandate clarity, and active escalation pathways are embedded.",
        }
      ),
      withRubric(
        "G2",
        "governance",
        "Management roles for climate / sustainability are clearly defined across functions.",
        "Defined ownership avoids gaps and makes execution faster across teams.",
        false,
        {
          0: "No defined sustainability/climate owners.",
          1: "Informal champions only; no role clarity.",
          2: "Some named owners exist but cross-functional coordination is weak.",
          3: "Named owners and role clarity are documented across key functions.",
          4: "Cross-functional cadence is established and recurring.",
          5: "Clear named owners, role clarity, and disciplined cross-functional cadence are embedded enterprise-wide.",
        }
      ),
      withRubric(
        "G3",
        "governance",
        "Sustainability matters are discussed with sufficient frequency by senior leadership.",
        "Regular leadership attention improves follow-through and resource allocation.",
        false,
        {
          0: "Sustainability/climate not discussed by senior leadership.",
          1: "Discussion is rare and reactive.",
          2: "Occasional discussion without consistent cadence.",
          3: "Defined discussion cadence exists but is less than quarterly.",
          4: "Discussed at least quarterly with documented follow-up.",
          5: "Quarterly-or-better strategic discussion is embedded with decisions and accountability.",
        }
      ),
    ],
  },
  {
    id: "strategy",
    name: "Strategy",
    weight: 0.2,
    questions: [
      withRubric(
        "S1",
        "strategy",
        "Material sustainability risks and opportunities are linked to business model and strategy.",
        "Strategic linkage improves resilience and decision quality under changing market conditions.",
        false,
        {
          0: "No linkage between sustainability issues and strategy.",
          1: "High-level statements only; no practical linkage.",
          2: "Some partial linkages to isolated business topics.",
          3: "Defined strategic linkage to one or more core drivers.",
          4: "Clear linkages across major strategic drivers.",
          5: "Strategy is explicitly linked to demand, cost, capital, assets, and supply chain impacts.",
        }
      ),
      withRubric(
        "S2",
        "strategy",
        "Climate-related opportunities have been identified, not just risks.",
        "Opportunity mapping helps move from compliance mindset to value creation.",
        false,
        {
          0: "No climate opportunities identified.",
          1: "Opportunity language is generic and undocumented.",
          2: "Early opportunity ideas exist but are unprioritized.",
          3: "Defined opportunity set in at least one area.",
          4: "Multiple opportunity areas are established and reviewed.",
          5: "Opportunities are clearly identified across products, efficiency, financing, market access, and resilience.",
        }
      ),
      withRubric(
        "S3",
        "strategy",
        "The company has considered resilience of its strategy under different climate-related conditions.",
        "Stress-case thinking helps test assumptions before risks become losses.",
        true,
        {
          0: "No resilience consideration exists.",
          1: "Informal awareness only; no stress-case thinking.",
          2: "Very early scenario thinking, not documented.",
          3: "Management has considered plausible stress cases.",
          4: "Stress cases are documented and inform strategic choices.",
          5: "Plausible stress-case analysis is embedded in strategic planning and updates.",
        }
      ),
    ],
  },
  {
    id: "risk_management",
    name: "Risk Management",
    weight: 0.15,
    questions: [
      withRubric(
        "R1",
        "risk_management",
        "Climate and sustainability risks are integrated into the broader risk-management framework.",
        "Integration into ERM enables accountability, prioritization, and mitigation tracking.",
        false,
        {
          0: "Sustainability/climate risks are outside risk management.",
          1: "Risks tracked informally, separate from ERM.",
          2: "Partial ERM linkage without clear accountability.",
          3: "ERM linkage and owners are defined.",
          4: "KRIs and mitigation actions are in place and reviewed.",
          5: "Full ERM integration with owners, KRIs, and active mitigation actions.",
        }
      ),
      withRubric(
        "R2",
        "risk_management",
        "There is a consistent process for identifying and prioritizing sustainability-related risks.",
        "Consistent methodology improves comparability and decision confidence over time.",
        false,
        {
          0: "No defined process or criteria.",
          1: "Ad hoc assessments without documentation.",
          2: "Early process exists but inconsistent across periods/teams.",
          3: "Criteria and documented methodology are defined.",
          4: "Periodic review is established with consistent application.",
          5: "Strong documented methodology, clear criteria, and recurring periodic review are embedded.",
        }
      ),
      withRubric(
        "R3",
        "risk_management",
        "Physical and transition climate risks have both been considered.",
        "Considering both risk types and time horizons avoids blind spots in planning.",
        false,
        {
          0: "Neither physical nor transition risks are considered.",
          1: "One risk type considered informally.",
          2: "Both risk types mentioned but incomplete analysis.",
          3: "Transition and physical risks are defined in process.",
          4: "Risks are assessed with at least some time-horizon differentiation.",
          5: "Transition + physical risks assessed using short/medium/long-term lens consistently.",
        }
      ),
    ],
  },
  {
    id: "metrics_data",
    name: "Metrics & Data",
    weight: 0.2,
    questions: [
      withRubric(
        "M1",
        "metrics_data",
        "A clear inventory exists for key sustainability and climate metrics.",
        "An inventory is the foundation for consistent internal and external reporting.",
        false,
        {
          0: "No inventory of sustainability/climate metrics.",
          1: "Informal metric list without governance.",
          2: "Partial inventory; ownership/sources are incomplete.",
          3: "Metric definitions, owners, and sources are defined.",
          4: "Frequency is set and used consistently for key metrics.",
          5: "Comprehensive inventory with metric definitions, owners, sources, and frequency is embedded.",
        }
      ),
      withRubric(
        "M2",
        "metrics_data",
        "Data sources and calculation methods are documented for major metrics.",
        "Clear method notes improve repeatability and reduce reporting disputes.",
        false,
        {
          0: "No method or source documentation.",
          1: "Fragmented notes only; not reusable.",
          2: "Some methods documented, but gaps remain.",
          3: "Method notes and formulas are defined for major metrics.",
          4: "Source files and boundaries are consistently documented.",
          5: "Robust documentation includes method notes, formulas, source files, and clear boundaries.",
        }
      ),
      withRubric(
        "M3",
        "metrics_data",
        "Internal controls or review checks exist for sustainability data.",
        "Controls, sign-offs, and version discipline increase trust in reported figures.",
        true,
        {
          0: "No review or controls over sustainability data.",
          1: "Informal review only; no sign-off discipline.",
          2: "Partial checks exist but are inconsistent.",
          3: "Defined review and sign-off process exists.",
          4: "Exception checks and version control are established.",
          5: "Strong control environment with review, sign-off, exception checks, and version control embedded.",
        }
      ),
      withRubric(
        "M4",
        "metrics_data",
        "Finance teams are involved in reviewing sustainability information.",
        "Finance involvement strengthens decision-usefulness and reporting quality.",
        false,
        {
          0: "Finance is not involved in sustainability information review.",
          1: "Limited ad hoc finance input.",
          2: "Periodic finance input on selected topics.",
          3: "Defined finance review role exists.",
          4: "Regular controller-level review is established.",
          5: "Controller/CFO review is embedded in governance and reporting workflow.",
        }
      ),
    ],
  },
  {
    id: "climate_metrics",
    name: "Climate Metrics",
    weight: 0.2,
    questions: [
      withRubric(
        "C1",
        "climate_metrics",
        "Scope 1 emissions have been calculated using a defined method.",
        "Scope 1 is a baseline climate metric expected in most readiness journeys.",
        true,
        {
          0: "Scope 1 not calculated.",
          1: "Rough estimate only; no clear method/boundary.",
          2: "Early calculation with incomplete method discipline.",
          3: "Operational boundary and methodology are defined.",
          4: "Periodic update cycle is established and followed.",
          5: "Scope 1 is consistently managed with defined boundary, methodology, and periodic updates.",
        }
      ),
      withRubric(
        "C2",
        "climate_metrics",
        "Scope 2 emissions have been calculated using a defined method.",
        "Scope 2 consistency and basis awareness improve comparability and disclosure quality.",
        true,
        {
          0: "Scope 2 not calculated.",
          1: "Basic estimate only; method is inconsistent.",
          2: "Early approach with partial method awareness.",
          3: "Defined method applied consistently for Scope 2.",
          4: "Location/market basis awareness is applied in practice.",
          5: "Strong Scope 2 process with location/market basis awareness and method consistency.",
        }
      ),
      withRubric(
        "C3",
        "climate_metrics",
        "Scope 3 emissions have at least been estimated at a high level.",
        "Scope 3 estimation helps identify major value-chain exposure and priority actions.",
        true,
        {
          0: "Scope 3 not considered.",
          1: "Scope 3 acknowledged only, no estimate.",
          2: "Early estimate for limited categories.",
          3: "Material categories identified with proxy estimate.",
          4: "Improvement plan for Scope 3 estimation is documented.",
          5: "Material categories, proxy estimate, and clear improvement plan are embedded and maintained.",
        }
      ),
      withRubric(
        "C4",
        "climate_metrics",
        "Climate targets or directional goals exist and are understood internally.",
        "Targets translate ambition into accountable execution.",
        false,
        {
          0: "No climate target or ambition exists.",
          1: "Informal aspiration only.",
          2: "Early target concept without ownership.",
          3: "Formal target or directional ambition is defined.",
          4: "Target has ownership and internal communication.",
          5: "Formal target/ambition with clear ownership is embedded in planning and performance dialogue.",
        }
      ),
      withRubric(
        "C5",
        "climate_metrics",
        "Any transition plan or decarbonization plan has been documented.",
        "A transition plan links emissions intent to executable actions, timeline, and investment.",
        true,
        {
          0: "No transition/decarbonization plan.",
          1: "High-level intent only; no actionable plan.",
          2: "Early plan draft with major gaps.",
          3: "Actions and owners are defined.",
          4: "Timeline and dependencies are established.",
          5: "Documented plan includes actions, capex view, owners, timeline, and dependencies.",
        }
      ),
    ],
  },
  {
    id: "disclosure",
    name: "Disclosure",
    weight: 0.1,
    questions: [
      withRubric(
        "D1",
        "disclosure",
        "The organization has attempted or drafted sustainability / climate disclosures.",
        "Drafting early disclosures helps identify information and governance gaps.",
        false,
        {
          0: "No disclosure attempt exists.",
          1: "Informal notes only; no outward-facing draft.",
          2: "Early draft content exists but fragmented.",
          3: "Defined draft in at least one format.",
          4: "Disclosure draft is established and reviewable.",
          5: "Credible disclosure attempt exists (annual report section, lender deck, ESG note, or climate memo).",
        }
      ),
      withRubric(
        "D2",
        "disclosure",
        "Sustainability information is linked to financial effects, capital decisions, or business performance discussions.",
        "Financial linkage makes sustainability information relevant to decision makers and investors.",
        true,
        {
          0: "No financial linkage to sustainability/climate topics.",
          1: "Generic claims without decision-useful linkage.",
          2: "Partial linkage to one or two financial dimensions.",
          3: "Defined linkage to key financial discussions.",
          4: "Linkages are established across multiple financial lenses.",
          5: "Clear linkage to revenue, cost, capex, assets, financing, and resilience is embedded.",
        }
      ),
      withRubric(
        "D3",
        "disclosure",
        "Stakeholder or investor questions on climate / sustainability are tracked and responded to systematically.",
        "Systematic response to requests improves readiness for market and financing dialogue.",
        false,
        {
          0: "No tracking of stakeholder/investor sustainability questions.",
          1: "Questions handled ad hoc with no system.",
          2: "Early tracking exists but inconsistent.",
          3: "Defined tracking process exists.",
          4: "Process is established across major request channels.",
          5: "Systematic tracking and response across RFPs, investor queries, lender diligence, and customer requests.",
        }
      ),
      withRubric(
        "D4",
        "disclosure",
        "Peer disclosures or market practice have been reviewed.",
        "Peer benchmarking helps calibrate quality and market expectations.",
        false,
        {
          0: "No peer or sector review done.",
          1: "Casual peer scanning only.",
          2: "Limited benchmark review of one or two peers.",
          3: "Defined peer review approach exists.",
          4: "Structured peer/sector review is established.",
          5: "At least 3 relevant peer/sector references are reviewed and used for calibration.",
        }
      ),
    ],
  },
];

export const READINESS_TOTAL_QUESTIONS = READINESS_PILLARS.reduce(
  (sum, pillar) => sum + pillar.questions.length,
  0
);

export const READINESS_STEPS = [
  "intro",
  ...READINESS_PILLARS.map((pillar) => pillar.id),
  "review",
] as const;

export const BAND_DEFINITIONS = [
  { min: 0, max: 39, label: "Weak" },
  { min: 40, max: 59, label: "Developing" },
  { min: 60, max: 79, label: "Good" },
  { min: 80, max: 100, label: "Strong" },
] as const;

export const RED_FLAG_QUESTION_IDS: QuestionId[] = [
  "S3",
  "M3",
  "C1",
  "C2",
  "C3",
  "C5",
  "D2",
];

export const PILLAR_ORDER: PillarId[] = READINESS_PILLARS.map((p) => p.id);

export type ReadinessAnswers = Partial<Record<QuestionId, ScoreValue>>;

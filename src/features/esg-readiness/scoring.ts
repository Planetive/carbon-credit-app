import {
  BAND_DEFINITIONS,
  PILLAR_ORDER,
  READINESS_PILLARS,
  RED_FLAG_QUESTION_IDS,
  type PillarId,
  type QuestionId,
  type ReadinessAnswers,
  type ScoreValue,
} from "./config";

export type Severity = "Low" | "Medium" | "High" | "Critical";

export interface RedFlagItem {
  questionId: QuestionId;
  questionText: string;
  score: ScoreValue;
}

export interface PillarSummary {
  pillarId: PillarId;
  pillar: string;
  questions: number;
  possibleMax: number;
  actualScore: number;
  pillarPercent: number;
  weight: number;
  weightedContribution: number;
  interpretation: string;
}

export interface FindingRow {
  finding: string;
  whyItMatters: string;
  recommendedImmediateAction: string;
  severity: Severity;
}

export interface ReadinessComputation {
  completionPercent: number;
  answeredQuestions: number;
  totalQuestions: number;
  isSubmissionReady: boolean;
  overallReadinessPercent: number;
  maturityBand: string;
  pillarSummary: PillarSummary[];
  topStrongPillars: string[];
  weakestPillars: string[];
  redFlags: RedFlagItem[];
  findings: FindingRow[];
}

const round2 = (value: number) => Math.round(value * 100) / 100;

const VALID_QUESTION_IDS = new Set(
  READINESS_PILLARS.flatMap((pillar) => pillar.questions.map((question) => question.id))
);

const getBand = (score: number): string => {
  const hit = BAND_DEFINITIONS.find((b) => score >= b.min && score <= b.max);
  return hit?.label ?? "Weak";
};

const toSeverityForBand = (band: string): Severity => {
  if (band === "Weak") return "Critical";
  if (band === "Developing") return "High";
  if (band === "Good") return "Medium";
  return "Low";
};

const questionScore = (answers: ReadinessAnswers, id: QuestionId): number => {
  const value = answers[id];
  if (value === undefined || value === null) return 0;
  return value;
};

export const sanitizeReadinessAnswers = (raw: unknown): ReadinessAnswers => {
  if (!raw || typeof raw !== "object") return {};
  const record = raw as Record<string, unknown>;
  const sanitized: ReadinessAnswers = {};
  for (const [key, value] of Object.entries(record)) {
    if (!VALID_QUESTION_IDS.has(key as QuestionId)) continue;
    if (typeof value !== "number" || !Number.isInteger(value)) continue;
    if (value < 0 || value > 5) continue;
    sanitized[key as QuestionId] = value as ScoreValue;
  }
  return sanitized;
};

export const computeReadiness = (answers: ReadinessAnswers): ReadinessComputation => {
  const allQuestions = READINESS_PILLARS.flatMap((p) => p.questions);
  const answeredQuestions = allQuestions.filter((q) => answers[q.id] !== undefined).length;
  const totalQuestions = allQuestions.length;
  const completionPercent = round2((answeredQuestions / totalQuestions) * 100);
  const isSubmissionReady = answeredQuestions === totalQuestions;

  let overallRaw = 0;
  const pillarSummary: PillarSummary[] = READINESS_PILLARS.map((pillar) => {
    const actualScore = pillar.questions.reduce((sum, question) => sum + questionScore(answers, question.id), 0);
    const possibleMax = pillar.questions.length * 5;
    const pillarPercentRaw = (actualScore / possibleMax) * 100;
    const weightedContributionRaw = pillarPercentRaw * pillar.weight;
    overallRaw += weightedContributionRaw;
    return {
      pillarId: pillar.id,
      pillar: pillar.name,
      questions: pillar.questions.length,
      possibleMax,
      actualScore,
      pillarPercent: round2(pillarPercentRaw),
      weight: pillar.weight,
      weightedContribution: round2(weightedContributionRaw),
      interpretation: getBand(pillarPercentRaw),
    };
  });

  const overallReadinessPercent = round2(overallRaw);
  const maturityBand = getBand(overallReadinessPercent);

  const maxPillarPercent = Math.max(...pillarSummary.map((p) => p.pillarPercent));
  const minPillarPercent = Math.min(...pillarSummary.map((p) => p.pillarPercent));
  const topStrongPillars = pillarSummary
    .filter((p) => p.pillarPercent === maxPillarPercent)
    .map((p) => p.pillar);
  const weakestPillars = pillarSummary
    .filter((p) => p.pillarPercent === minPillarPercent)
    .map((p) => p.pillar);

  const redFlags: RedFlagItem[] = READINESS_PILLARS.flatMap((pillar) =>
    pillar.questions
      .filter(
        (question) =>
          RED_FLAG_QUESTION_IDS.includes(question.id) &&
          answers[question.id] !== undefined &&
          (answers[question.id] as number) <= 1
      )
      .map((question) => ({
        questionId: question.id,
        questionText: question.text,
        score: answers[question.id] as ScoreValue,
      }))
  );

  const redFlagClimateHits = redFlags.filter((f) => ["C1", "C2", "C3"].includes(f.questionId)).length;
  const redFlagSeverity: Severity =
    redFlags.length >= 2 || redFlagClimateHits >= 2
      ? "Critical"
      : redFlags.length === 1
      ? "High"
      : "Low";
  const redFlagFindingText =
    redFlags.length === 0
      ? "No red flags triggered."
      : `${redFlags.length} red flag(s) detected in critical readiness controls.`;

  const weakestSeverity: Severity =
    minPillarPercent < 40 ? "High" : minPillarPercent < 60 ? "Medium" : "Low";

  const scoreMap = Object.fromEntries(
    READINESS_PILLARS.flatMap((pillar) => pillar.questions.map((question) => [question.id, questionScore(answers, question.id)]))
  ) as Record<QuestionId, number>;

  const metricsSet = [scoreMap.M1, scoreMap.M2, scoreMap.M3, scoreMap.M4];
  const metricsAvg = metricsSet.reduce((sum, value) => sum + value, 0) / metricsSet.length;
  const hasDataCaution =
    metricsSet.some((value) => value <= 2) ||
    metricsAvg < 3 ||
    [scoreMap.C1, scoreMap.C2, scoreMap.C3].some((value) => value <= 2);

  let dataCautionSeverity: Severity = "Low";
  if (scoreMap.M3 <= 1) {
    dataCautionSeverity = "Critical";
  } else if (
    [scoreMap.M1, scoreMap.M2, scoreMap.M4].filter((value) => value <= 2).length >= 2 ||
    [scoreMap.C1, scoreMap.C2, scoreMap.C3].some((value) => value <= 1)
  ) {
    dataCautionSeverity = "High";
  } else if (hasDataCaution) {
    dataCautionSeverity = "Medium";
  }

  const hasFinancialLinkageIssue = scoreMap.D2 <= 2 || scoreMap.S1 <= 2;
  let financialLinkageSeverity: Severity = "Low";
  if (scoreMap.D2 <= 1) {
    financialLinkageSeverity = "Critical";
  } else if (scoreMap.D2 === 2 || scoreMap.S1 <= 1) {
    financialLinkageSeverity = "High";
  } else if (hasFinancialLinkageIssue) {
    financialLinkageSeverity = "Medium";
  }

  const findings: FindingRow[] = [
    {
      finding: `Overall readiness is ${overallReadinessPercent}% (${maturityBand}).`,
      whyItMatters:
        "Readiness indicates how close your governance and information foundations are to mainstream climate and sustainability reporting expectations.",
      recommendedImmediateAction:
        maturityBand === "Weak"
          ? "Prioritize governance, data controls, and Scope 1/2 measurement foundations before broad disclosures."
          : maturityBand === "Developing"
          ? "Close gaps in risk integration, data controls, and climate metrics while drafting consistent disclosures."
          : maturityBand === "Good"
          ? "Strengthen assurance-style controls, financial linkage, and resilience analysis depth."
          : "Maintain strong controls and keep improving transition planning and disclosure quality.",
      severity: toSeverityForBand(maturityBand),
    },
    {
      finding: redFlagFindingText,
      whyItMatters:
        "Low scores on designated red-flag questions can indicate high decision risk even if the average score is acceptable.",
      recommendedImmediateAction:
        redFlags.length === 0
          ? "Continue monitoring red-flag questions each reporting cycle."
          : "Address flagged items first: strengthen resilience analysis, data controls, climate metrics, and financial linkage.",
      severity: redFlagSeverity,
    },
    {
      finding:
        weakestPillars.length > 1
          ? `Joint weakest pillars: ${weakestPillars.join(", ")} (${minPillarPercent}%).`
          : `Weakest pillar: ${weakestPillars[0]} (${minPillarPercent}%).`,
      whyItMatters:
        "Your weakest pillar is the current bottleneck to stronger reporting readiness and market confidence.",
      recommendedImmediateAction:
        "Use this pillar as your next 90-day focus and assign owners, milestones, and review checkpoints.",
      severity: weakestSeverity,
    },
    {
      finding: hasDataCaution
        ? "Data caution: sustainability and climate data controls need strengthening."
        : "Data caution: data controls appear reasonably stable.",
      whyItMatters:
        "Weak data governance increases restatement risk and lowers confidence in targets and disclosed performance.",
      recommendedImmediateAction: hasDataCaution
        ? "Tighten metric definitions, method notes, review/sign-off, and version control with finance involvement."
        : "Maintain current controls and continue periodic control testing.",
      severity: dataCautionSeverity,
    },
    {
      finding: hasFinancialLinkageIssue
        ? "Financial linkage between sustainability matters and business performance is limited."
        : "Financial linkage is reasonably integrated into decision discussions.",
      whyItMatters:
        "Clear linkage to financial effects improves decision usefulness for leadership, lenders, and investors.",
      recommendedImmediateAction: hasFinancialLinkageIssue
        ? "Strengthen links to revenue, cost, capex, assets, financing, and resilience in management and disclosure narratives."
        : "Keep improving quantification quality and consistency of financial linkage narratives.",
      severity: financialLinkageSeverity,
    },
  ];

  const sortedPillars = [...pillarSummary].sort((a, b) => {
    const indexA = PILLAR_ORDER.indexOf(a.pillarId);
    const indexB = PILLAR_ORDER.indexOf(b.pillarId);
    return indexA - indexB;
  });

  return {
    completionPercent,
    answeredQuestions,
    totalQuestions,
    isSubmissionReady,
    overallReadinessPercent,
    maturityBand,
    pillarSummary: sortedPillars,
    topStrongPillars,
    weakestPillars,
    redFlags,
    findings,
  };
};

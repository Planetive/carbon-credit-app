import {
  MRV_PROFILES,
  type MrvProfileId,
  type MrvQuestionnaireAnswers,
  type MultiAnswer,
  type QuestionId,
} from "./config";

export interface MrvRecommendationResult {
  primary: MrvProfileId;
  secondary: MrvProfileId[];
  scores: Record<MrvProfileId, number>;
  rationale: string[];
}

const emptyScores = (): Record<MrvProfileId, number> => ({
  facility_ghg: 0,
  industrial_sensor: 0,
  land_nature: 0,
  enterprise_multi_asset: 0,
  scope3_supplier: 0,
  registry_project: 0,
  disclosure_corporate: 0,
  vert_os: 0,
});

function asMulti(value: MrvQuestionnaireAnswers[QuestionId]): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function asSingle(value: MrvQuestionnaireAnswers[QuestionId]): string | undefined {
  if (!value || Array.isArray(value)) return undefined;
  return value;
}

function add(scores: Record<MrvProfileId, number>, id: MrvProfileId, points: number) {
  scores[id] += points;
}

export function computeMrvRecommendation(
  answers: MrvQuestionnaireAnswers
): MrvRecommendationResult {
  const scores = emptyScores();
  const rationale: string[] = [];

  const objective = asSingle(answers.primary_objective);
  switch (objective) {
    case "regulatory":
      add(scores, "disclosure_corporate", 4);
      add(scores, "facility_ghg", 2);
      rationale.push("Regulatory focus maps to disclosure-aligned controls and assured metrics.");
      break;
    case "credits":
      add(scores, "registry_project", 5);
      add(scores, "land_nature", 2);
      rationale.push("Credit issuance requires registry-grade monitoring and verification evidence.");
      break;
    case "investors":
      add(scores, "disclosure_corporate", 4);
      add(scores, "enterprise_multi_asset", 2);
      rationale.push("Investor reporting benefits from consolidated, assurance-ready corporate MRV.");
      break;
    case "operations":
      add(scores, "facility_ghg", 3);
      add(scores, "industrial_sensor", 3);
      add(scores, "vert_os", 2);
      rationale.push("Operational goals prioritize measurable site and process performance data.");
      break;
    case "supply_chain":
      add(scores, "scope3_supplier", 5);
      rationale.push("Supply chain transparency centers on supplier data and Scope 3 methods.");
      break;
    case "net_zero":
      add(scores, "enterprise_multi_asset", 3);
      add(scores, "facility_ghg", 2);
      add(scores, "scope3_supplier", 2);
      rationale.push("Net-zero tracking spans owned assets and value-chain emissions.");
      break;
    default:
      break;
  }

  const assetTypes = asMulti(answers.asset_types);
  if (assetTypes.includes("manufacturing")) {
    add(scores, "industrial_sensor", 4);
    add(scores, "facility_ghg", 2);
  }
  if (assetTypes.includes("office") || assetTypes.includes("logistics")) {
    add(scores, "facility_ghg", 3);
  }
  if (assetTypes.includes("energy")) {
    add(scores, "industrial_sensor", 2);
    add(scores, "facility_ghg", 2);
  }
  if (assetTypes.includes("agriculture") || assetTypes.includes("forestry")) {
    add(scores, "land_nature", 5);
    add(scores, "registry_project", 2);
  }
  if (assetTypes.includes("vertical_farming")) {
    add(scores, "vert_os", 7);
    add(scores, "industrial_sensor", 2);
    add(scores, "facility_ghg", 1);
    rationale.push(
      "Vertical farming and hydroponics fit Vert-OS: CEA energy, water, and production MRV in one stack."
    );
  }
  if (assetTypes.includes("logistics") && assetTypes.includes("vertical_farming")) {
    add(scores, "vert_os", 1);
  }
  if (assetTypes.includes("fleet")) {
    add(scores, "facility_ghg", 2);
    add(scores, "enterprise_multi_asset", 1);
  }
  if (assetTypes.length >= 3) {
    add(scores, "enterprise_multi_asset", 3);
    rationale.push("Multiple asset classes suggest an enterprise rollup architecture.");
  }

  const siteCount = asSingle(answers.site_count);
  if (siteCount === "11_50" || siteCount === "51_plus") {
    add(scores, "enterprise_multi_asset", 4);
  } else if (siteCount === "1") {
    add(scores, "facility_ghg", 2);
    add(scores, "industrial_sensor", 1);
  }

  if (
    assetTypes.includes("vertical_farming") &&
    (siteCount === "2_10" || siteCount === "11_50" || siteCount === "51_plus")
  ) {
    add(scores, "vert_os", 2);
  }

  const geography = asSingle(answers.geography);
  if (geography === "global") {
    add(scores, "enterprise_multi_asset", 3);
  }

  const parameters = asMulti(answers.monitoring_parameters) as MultiAnswer;
  if (parameters.includes("methane_process")) {
    add(scores, "industrial_sensor", 4);
  }
  if (parameters.includes("biodiversity")) {
    add(scores, "land_nature", 4);
  }
  if (parameters.includes("ghg") && parameters.includes("energy")) {
    add(scores, "facility_ghg", 2);
  }
  if (assetTypes.includes("vertical_farming")) {
    if (parameters.includes("energy")) add(scores, "vert_os", 2);
    if (parameters.includes("water")) add(scores, "vert_os", 3);
    if (parameters.includes("waste")) add(scores, "vert_os", 1);
    if (parameters.includes("ghg")) add(scores, "vert_os", 2);
  }

  const sources = asMulti(answers.data_sources);
  if (sources.includes("iot")) {
    add(scores, "industrial_sensor", 4);
    if (assetTypes.includes("vertical_farming")) add(scores, "vert_os", 2);
  }
  if (sources.includes("satellite")) {
    add(scores, "land_nature", 4);
  }
  if (sources.includes("suppliers")) {
    add(scores, "scope3_supplier", 4);
  }
  if (sources.includes("utility_bills") || sources.includes("manual")) {
    add(scores, "facility_ghg", 2);
  }
  if (sources.includes("none")) {
    add(scores, "facility_ghg", 2);
    rationale.push("Starting from limited data — we recommend a phased MRV rollout beginning with core facility metrics.");
  }

  const verification = asSingle(answers.verification_level);
  if (verification === "registry") {
    add(scores, "registry_project", 5);
  } else if (verification === "reasonable") {
    add(scores, "disclosure_corporate", 3);
    add(scores, "enterprise_multi_asset", 2);
  }

  const frameworks = asMulti(answers.frameworks);
  if (frameworks.includes("verra") || frameworks.includes("gold_standard")) {
    add(scores, "registry_project", 4);
  }
  if (frameworks.includes("csrd") || frameworks.includes("ifrs_s2")) {
    add(scores, "disclosure_corporate", 4);
  }
  if (frameworks.includes("ghg_protocol") || frameworks.includes("iso_14064")) {
    add(scores, "facility_ghg", 2);
    add(scores, "enterprise_multi_asset", 1);
  }

  const cadence = asSingle(answers.reporting_cadence);
  if (cadence === "realtime") {
    add(scores, "industrial_sensor", 4);
    if (assetTypes.includes("vertical_farming")) add(scores, "vert_os", 2);
  } else if (cadence === "annual") {
    add(scores, "facility_ghg", 1);
    add(scores, "disclosure_corporate", 1);
  }

  const integration = asSingle(answers.integration_need);
  if (integration === "critical") {
    add(scores, "enterprise_multi_asset", 3);
  }

  const ranked = (Object.keys(scores) as MrvProfileId[]).sort((a, b) => scores[b] - scores[a]);
  const primary = ranked[0] ?? "facility_ghg";
  const secondary = ranked.slice(1, 3).filter((id) => scores[id] > 0 && id !== primary);

  if (rationale.length === 0) {
    rationale.push(`Based on your responses, ${MRV_PROFILES[primary].name} is the strongest starting point.`);
  }

  return { primary, secondary, scores, rationale };
}

export function isQuestionnaireComplete(answers: MrvQuestionnaireAnswers): boolean {
  return (
    !!asSingle(answers.primary_objective) &&
    asMulti(answers.asset_types).length > 0 &&
    !!asSingle(answers.site_count) &&
    !!asSingle(answers.geography) &&
    asMulti(answers.monitoring_parameters).length > 0
  );
}

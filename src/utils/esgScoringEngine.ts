/**
 * Automated ESG Scoring Engine
 * 
 * This engine automatically scores ESG assessments based on:
 * - Policy presence (Yes/No questions)
 * - Quantitative metrics (emissions, percentages, ratios)
 * - Industry benchmarks and thresholds
 * - Best practice standards
 * 
 * Scoring Scale: 1-3 (same as manual admin scoring)
 * - 1: Below average / Needs improvement
 * - 2: Average / Meets basic requirements
 * - 3: Above average / Best practice
 */

export interface ESGAssessmentData {
  // Environmental
  ghg_baseline?: string | null;
  ghg_emissions?: string | null;
  air_pollutants?: string | null;
  ghg_reduction_initiatives?: string | null;
  energy_visibility?: string | null;
  total_energy_used?: string | null;
  energy_grid?: string | null;
  energy_renewable?: string | null;
  energy_diesel?: string | null;
  energy_gas?: string | null;
  water_withdrawal?: string | null;
  water_reclaimed?: string | null;
  waste_type?: string | null;
  waste_quantity?: string | null;
  waste_treated?: string | null;
  environmental_policy?: string | null;
  waste_management_policy?: string | null;
  energy_management_policy?: string | null;
  water_management_policy?: string | null;
  recycling_policy?: string | null;
  board_climate_oversight?: string | null;
  management_climate_oversight?: string | null;
  sustainable_sourcing?: string | null;
  
  // Social
  median_male_compensation?: string | null;
  median_female_compensation?: string | null;
  ceo_pay_ratio?: string | null;
  ceo_pay_ratio_reporting?: string | null;
  full_time_turnover?: string | null;
  part_time_turnover?: string | null;
  consultants_turnover?: string | null;
  diversity_inclusion_policy?: string | null;
  total_headcount?: string | null;
  men_headcount?: string | null;
  women_headcount?: string | null;
  men_entry_mid_level?: string | null;
  women_entry_mid_level?: string | null;
  men_senior_executive?: string | null;
  women_senior_executive?: string | null;
  differently_abled_workforce?: string | null;
  temporary_workers?: string | null;
  consultants?: string | null;
  anti_harassment_policy?: string | null;
  harassment_cases_reported?: string | null;
  harassment_cases_resolved?: string | null;
  grievance_mechanism?: string | null;
  grievance_cases_reported?: string | null;
  grievance_cases_resolved?: string | null;
  health_safety_policy?: string | null;
  hse_management_system?: string | null;
  fatalities?: string | null;
  ltis?: string | null;
  safety_accidents?: string | null;
  production_loss?: string | null;
  trir?: string | null;
  child_forced_labor_policy?: string | null;
  human_rights_policy?: string | null;
  personnel_trained?: string | null;
  women_promoted?: string | null;
  men_promoted?: string | null;
  csr_percentage?: string | null;
  responsible_marketing_policy?: string | null;
  
  // Governance
  total_board_members?: string | null;
  independent_board_members?: string | null;
  men_board_members?: string | null;
  women_board_members?: string | null;
  board_governance_committees?: string | null;
  men_committee_chairs?: string | null;
  women_committee_chairs?: string | null;
  ceo_board_prohibition?: string | null;
  esg_certified_board_members?: string | null;
  esg_incentivization?: string | null;
  workers_union?: string | null;
  supplier_code_of_conduct?: string | null;
  supplier_compliance_percentage?: string | null;
  un_sdgs_focus?: string | null;
  sustainability_report?: string | null;
  sustainability_reporting_framework?: string | null;
  sustainability_regulatory_filing?: string | null;
  sustainability_third_party_assurance?: string | null;
  ethics_anti_corruption_policy?: string | null;
  policy_regular_review?: string | null;
  data_privacy_policy?: string | null;
}

export interface ESGScoringResult {
  // Question-level scores (1-3 or null if not answered)
  e_q1_score: number | null;
  e_q2_score: number | null;
  e_q3_score: number | null;
  e_q4_score: number | null;
  e_q5_score: number | null;
  e_q6_score: number | null;
  e_q7_score: number | null;
  
  s_q1_score: number | null;
  s_q2_score: number | null;
  s_q3_score: number | null;
  s_q4_score: number | null;
  s_q5_score: number | null;
  s_q6_score: number | null;
  s_q7_score: number | null;
  s_q8_score: number | null;
  s_q9_score: number | null;
  s_q10_score: number | null;
  s_q11_score: number | null;
  s_q12_score: number | null;
  
  g_q1_score: number | null;
  g_q2_score: number | null;
  g_q3_score: number | null;
  g_q4_score: number | null;
  g_q5_score: number | null;
  g_q6_score: number | null;
  g_q7_score: number | null;
  
  // Section totals (0-100)
  environmental_total_score: number;
  social_total_score: number;
  governance_total_score: number;
  overall_score: number;
  
  // Auto-generated recommendations
  environmental_strengths: string;
  environmental_improvements: string;
  social_strengths: string;
  social_improvements: string;
  governance_strengths: string;
  governance_improvements: string;
  overall_recommendations: string;
}

// Helper functions
const parseNumber = (value: string | null | undefined): number | null => {
  if (!value || value.trim() === '') return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
};

const parseYesNo = (value: string | null | undefined): boolean | null => {
  if (!value) return null;
  const lower = value.toLowerCase().trim();
  return lower === 'yes' || lower === 'y' || lower === 'true';
};

const scoreYesNo = (value: boolean | null, defaultScore: number | null = null): number | null => {
  if (value === null) return defaultScore;
  return value ? 3 : 1;
};

/**
 * Check if a question has sufficient data to be scored
 * Returns true if at least one relevant field has data
 */
const hasData = (...values: (string | number | boolean | null | undefined)[]): boolean => {
  return values.some(v => {
    if (v === null || v === undefined) return false;
    if (typeof v === 'string') return v.trim() !== '';
    if (typeof v === 'number') return !isNaN(v);
    return true;
  });
};

const scorePercentage = (value: number | null, thresholds: { good: number; average: number }): number => {
  if (value === null) return 1;
  if (value >= thresholds.good) return 3;
  if (value >= thresholds.average) return 2;
  return 1;
};

const scoreReversePercentage = (value: number | null, thresholds: { good: number; average: number }): number => {
  if (value === null) return 1;
  if (value <= thresholds.good) return 3;
  if (value <= thresholds.average) return 2;
  return 1;
};

const scoreRatio = (value: number | null, thresholds: { good: number; average: number }): number => {
  if (value === null) return 1;
  if (value <= thresholds.good) return 3;
  if (value <= thresholds.average) return 2;
  return 1;
};

const countPolicies = (...policies: (boolean | null)[]): number => {
  return policies.filter(p => p === true).length;
};

/**
 * ENVIRONMENTAL SCORING
 */
const scoreEnvironmentalQ1 = (data: ESGAssessmentData): number | null => {
  // Q1: GHG Emissions - Score based on baseline, emissions tracking, and reduction initiatives
  const hasBaseline = parseYesNo(data.ghg_baseline);
  const hasReductionInitiatives = parseYesNo(data.ghg_reduction_initiatives);
  const hasEmissions = parseNumber(data.ghg_emissions) !== null;
  
  // Check if question has any data
  if (!hasData(data.ghg_baseline, data.ghg_emissions, data.ghg_reduction_initiatives)) {
    return null;
  }
  
  if (hasBaseline && hasReductionInitiatives && hasEmissions) return 3;
  if ((hasBaseline && hasReductionInitiatives) || (hasBaseline && hasEmissions)) return 2;
  if (hasBaseline || hasEmissions || hasReductionInitiatives) return 2;
  return 1;
};

const scoreEnvironmentalQ2 = (data: ESGAssessmentData): number => {
  // Q2: Energy Efficiency - Score based on visibility, renewable energy %, and fossil fuel usage
  const hasVisibility = parseYesNo(data.energy_visibility);
  const renewablePct = parseNumber(data.energy_renewable);
  const dieselPct = parseNumber(data.energy_diesel);
  const gasPct = parseNumber(data.energy_gas);
  const fossilPct = (dieselPct || 0) + (gasPct || 0);
  
  if (!hasVisibility) return 1;
  
  if (renewablePct !== null) {
    if (renewablePct >= 50 && fossilPct <= 20) return 3;
    if (renewablePct >= 25 && fossilPct <= 40) return 2;
    if (renewablePct > 0) return 2;
  }
  
  return hasVisibility ? 2 : 1;
};

const scoreEnvironmentalQ3 = (data: ESGAssessmentData): number => {
  // Q3: Water Management - Score based on water reclamation rate
  const withdrawal = parseNumber(data.water_withdrawal);
  const reclaimed = parseNumber(data.water_reclaimed);
  
  if (withdrawal === null || withdrawal === 0) return 1;
  if (reclaimed === null) return 1;
  
  const reclamationRate = (reclaimed / withdrawal) * 100;
  return scorePercentage(reclamationRate, { good: 50, average: 25 });
};

const scoreEnvironmentalQ4 = (data: ESGAssessmentData): number => {
  // Q4: Waste Management - Score based on waste treatment percentage
  const wasteTreated = parseNumber(data.waste_treated);
  
  if (wasteTreated === null) return 1;
  return scorePercentage(wasteTreated, { good: 80, average: 50 });
};

const scoreEnvironmentalQ5 = (data: ESGAssessmentData): number => {
  // Q5: Environmental Operations - Score based on number of policies
  const policies = countPolicies(
    parseYesNo(data.environmental_policy),
    parseYesNo(data.waste_management_policy),
    parseYesNo(data.energy_management_policy),
    parseYesNo(data.water_management_policy),
    parseYesNo(data.recycling_policy)
  );
  
  if (policies >= 4) return 3;
  if (policies >= 2) return 2;
  if (policies >= 1) return 2;
  return 1;
};

const scoreEnvironmentalQ6 = (data: ESGAssessmentData): number => {
  // Q6: Environmental Oversight - Score based on board and management oversight
  const boardOversight = parseYesNo(data.board_climate_oversight);
  const managementOversight = parseYesNo(data.management_climate_oversight);
  
  if (boardOversight && managementOversight) return 3;
  if (boardOversight || managementOversight) return 2;
  return 1;
};

const scoreEnvironmentalQ7 = (data: ESGAssessmentData): number | null => {
  // Q7: Sustainable Sourcing
  if (!hasData(data.sustainable_sourcing)) return null;
  return scoreYesNo(parseYesNo(data.sustainable_sourcing), null);
};

/**
 * SOCIAL SCORING
 */
const scoreSocialQ1 = (data: ESGAssessmentData): number => {
  // Q1: Pay Ratios - Score based on gender pay equity
  const maleComp = parseNumber(data.median_male_compensation);
  const femaleComp = parseNumber(data.median_female_compensation);
  
  if (maleComp === null || femaleComp === null) return 1;
  if (maleComp === 0 || femaleComp === 0) return 1;
  
  const payRatio = (femaleComp / maleComp) * 100;
  if (payRatio >= 95) return 3; // Within 5% is excellent
  if (payRatio >= 85) return 2; // Within 15% is acceptable
  return 1;
};

const scoreSocialQ2 = (data: ESGAssessmentData): number => {
  // Q2: CEO Pay Ratio - Score based on ratio and reporting
  const ratio = parseNumber(data.ceo_pay_ratio);
  const reports = parseYesNo(data.ceo_pay_ratio_reporting);
  
  if (ratio === null) return reports ? 2 : 1;
  
  // Lower CEO pay ratio is better (more equitable)
  const ratioScore = scoreRatio(ratio, { good: 20, average: 50 });
  const reportingScore = reports ? 1 : 0; // Bonus for reporting
  
  return Math.min(3, ratioScore + reportingScore);
};

const scoreSocialQ3 = (data: ESGAssessmentData): number => {
  // Q3: Turnover - Lower turnover is better
  const fullTime = parseNumber(data.full_time_turnover);
  const partTime = parseNumber(data.part_time_turnover);
  const consultants = parseNumber(data.consultants_turnover);
  
  const avgTurnover = [fullTime, partTime, consultants]
    .filter(v => v !== null)
    .reduce((sum, v, _, arr) => sum + (v || 0) / arr.length, 0);
  
  if (avgTurnover === 0) return 1; // No data
  
  // Lower turnover is better
  if (avgTurnover <= 10) return 3; // Excellent retention
  if (avgTurnover <= 20) return 2; // Good retention
  return 1;
};

const scoreSocialQ4 = (data: ESGAssessmentData): number => {
  // Q4: Gender Diversity and Inclusion
  const hasPolicy = parseYesNo(data.diversity_inclusion_policy);
  const total = parseNumber(data.total_headcount);
  const women = parseNumber(data.women_headcount);
  const menSenior = parseNumber(data.men_senior_executive);
  const womenSenior = parseNumber(data.women_senior_executive);
  const differentlyAbled = parseNumber(data.differently_abled_workforce);
  
  if (!hasPolicy) return 1;
  
  let score = 1;
  
  // Gender diversity at senior level
  if (womenSenior !== null && menSenior !== null && (menSenior + womenSenior) > 0) {
    const seniorWomenPct = (womenSenior / (menSenior + womenSenior)) * 100;
    if (seniorWomenPct >= 40) score = 3;
    else if (seniorWomenPct >= 30) score = 2;
    else score = 1;
  }
  
  // Overall gender balance
  if (total !== null && women !== null && total > 0) {
    const womenPct = (women / total) * 100;
    if (womenPct >= 40 && womenPct <= 60) score = Math.max(score, 3);
    else if (womenPct >= 30 || womenPct <= 70) score = Math.max(score, 2);
  }
  
  // Inclusion bonus
  if (differentlyAbled !== null && differentlyAbled > 0) {
    score = Math.min(3, score + 1);
  }
  
  return score;
};

const scoreSocialQ5 = (data: ESGAssessmentData): number => {
  // Q5: Temporary Workers Ratio - Lower is better (more stable employment)
  const total = parseNumber(data.total_headcount);
  const temp = parseNumber(data.temporary_workers);
  const consultants = parseNumber(data.consultants);
  
  if (total === null || total === 0) return 1;
  
  const tempPct = ((temp || 0) + (consultants || 0)) / total * 100;
  return scoreReversePercentage(tempPct, { good: 10, average: 25 });
};

const scoreSocialQ6 = (data: ESGAssessmentData): number => {
  // Q6: Harassment, Discrimination and Grievance
  const hasPolicy = parseYesNo(data.anti_harassment_policy);
  const hasGrievance = parseYesNo(data.grievance_mechanism);
  const harassmentReported = parseNumber(data.harassment_cases_reported);
  const harassmentResolved = parseNumber(data.harassment_cases_resolved);
  const grievanceReported = parseNumber(data.grievance_cases_reported);
  const grievanceResolved = parseNumber(data.grievance_cases_resolved);
  
  if (!hasPolicy && !hasGrievance) return 1;
  
  let score = hasPolicy && hasGrievance ? 2 : 1;
  
  // Resolution rates
  if (harassmentReported !== null && harassmentResolved !== null && harassmentReported > 0) {
    const resolutionRate = (harassmentResolved / harassmentReported) * 100;
    if (resolutionRate >= 90) score = 3;
    else if (resolutionRate >= 70) score = Math.max(score, 2);
  }
  
  if (grievanceReported !== null && grievanceResolved !== null && grievanceReported > 0) {
    const resolutionRate = (grievanceResolved / grievanceReported) * 100;
    if (resolutionRate >= 90) score = 3;
    else if (resolutionRate >= 70) score = Math.max(score, 2);
  }
  
  return score;
};

const scoreSocialQ7 = (data: ESGAssessmentData): number => {
  // Q7: Health and Safety
  const hasPolicy = parseYesNo(data.health_safety_policy);
  const hasHSE = parseYesNo(data.hse_management_system);
  const fatalities = parseNumber(data.fatalities) || 0;
  const ltis = parseNumber(data.ltis) || 0;
  const trir = parseNumber(data.trir);
  
  if (!hasPolicy) return 1;
  
  let score = hasPolicy && hasHSE ? 3 : 2;
  
  // Safety performance
  if (fatalities > 0) score = 1;
  else if (ltis > 0) score = Math.min(score, 2);
  
  // TRIR (Total Recordable Injury Rate) - lower is better
  if (trir !== null) {
    if (trir <= 1.0) score = 3;
    else if (trir <= 3.0) score = Math.max(score, 2);
    else score = Math.min(score, 2);
  }
  
  return score;
};

const scoreSocialQ8 = (data: ESGAssessmentData): number | null => {
  // Q8: Child and Forced Labor
  if (!hasData(data.child_forced_labor_policy)) return null;
  return scoreYesNo(parseYesNo(data.child_forced_labor_policy), null);
};

const scoreSocialQ9 = (data: ESGAssessmentData): number | null => {
  // Q9: Human Rights
  if (!hasData(data.human_rights_policy)) return null;
  return scoreYesNo(parseYesNo(data.human_rights_policy), null);
};

const scoreSocialQ10 = (data: ESGAssessmentData): number => {
  // Q10: Employee Training and Succession Planning
  const trained = parseNumber(data.personnel_trained);
  const womenPromoted = parseNumber(data.women_promoted);
  const menPromoted = parseNumber(data.men_promoted);
  
  let score = 1;
  
  if (trained !== null && trained > 0) score = 2;
  
  // Promotion equity
  if (womenPromoted !== null && menPromoted !== null) {
    const totalPromoted = womenPromoted + menPromoted;
    if (totalPromoted > 0) {
      const womenPromotionPct = (womenPromoted / totalPromoted) * 100;
      if (womenPromotionPct >= 40 && womenPromotionPct <= 60) score = 3;
      else if (womenPromotionPct >= 30) score = Math.max(score, 2);
    }
  }
  
  return score;
};

const scoreSocialQ11 = (data: ESGAssessmentData): number => {
  // Q11: CSR
  const csrPct = parseNumber(data.csr_percentage);
  
  if (csrPct === null) return 1;
  return scorePercentage(csrPct, { good: 2, average: 1 });
};

const scoreSocialQ12 = (data: ESGAssessmentData): number | null => {
  // Q12: Marketing
  if (!hasData(data.responsible_marketing_policy)) return null;
  return scoreYesNo(parseYesNo(data.responsible_marketing_policy), null);
};

/**
 * GOVERNANCE SCORING
 */
const scoreGovernanceQ1 = (data: ESGAssessmentData): number | null => {
  // Q1: Board Diversification, Independence and Competence
  const total = parseNumber(data.total_board_members);
  const independent = parseNumber(data.independent_board_members);
  const women = parseNumber(data.women_board_members);
  const men = parseNumber(data.men_board_members);
  const esgCertified = parseNumber(data.esg_certified_board_members);
  const ceoProhibited = parseYesNo(data.ceo_board_prohibition);
  
  // Check if question has any data
  if (!hasData(data.total_board_members, data.independent_board_members, 
               data.women_board_members, data.men_board_members)) {
    return null;
  }
  
  if (total === null || total === 0) return 1;
  
  let score = 1;
  
  // Independence
  const independencePct = (independent || 0) / total * 100;
  if (independencePct >= 50) score = 3;
  else if (independencePct >= 30) score = 2;
  else score = 1;
  
  // Gender diversity
  if (women !== null && men !== null && (men + women) > 0) {
    const womenPct = (women / (men + women)) * 100;
    if (womenPct >= 30) score = Math.max(score, 3);
    else if (womenPct >= 20) score = Math.max(score, 2);
  }
  
  // ESG expertise
  if (esgCertified !== null && esgCertified > 0) {
    score = Math.min(3, score + 1);
  }
  
  // CEO separation
  if (ceoProhibited) {
    score = Math.min(3, score + 1);
  }
  
  return Math.min(3, score);
};

const scoreGovernanceQ2 = (data: ESGAssessmentData): number | null => {
  // Q2: ESG Performance Incentivization
  if (!hasData(data.esg_incentivization)) return null;
  return scoreYesNo(parseYesNo(data.esg_incentivization), null);
};

const scoreGovernanceQ3 = (data: ESGAssessmentData): number | null => {
  // Q3: Voice of Employees
  if (!hasData(data.workers_union)) return null;
  return scoreYesNo(parseYesNo(data.workers_union), null);
};

const scoreGovernanceQ4 = (data: ESGAssessmentData): number | null => {
  // Q4: Supplier Code of Conduct
  if (!hasData(data.supplier_code_of_conduct, data.supplier_compliance_percentage)) {
    return null;
  }
  
  const hasCode = parseYesNo(data.supplier_code_of_conduct);
  const compliancePct = parseNumber(data.supplier_compliance_percentage);
  
  if (!hasCode) return 1;
  
  if (compliancePct === null) return 2;
  return scorePercentage(compliancePct, { good: 80, average: 50 });
};

const scoreGovernanceQ5 = (data: ESGAssessmentData): number | null => {
  // Q5: Sustainability Disclosures
  if (!hasData(data.un_sdgs_focus, data.sustainability_report, data.sustainability_reporting_framework,
               data.sustainability_regulatory_filing, data.sustainability_third_party_assurance)) {
    return null;
  }
  
  const hasSDGs = parseYesNo(data.un_sdgs_focus);
  const hasReport = parseYesNo(data.sustainability_report);
  const hasFramework = parseYesNo(data.sustainability_reporting_framework);
  const hasRegulatory = parseYesNo(data.sustainability_regulatory_filing);
  const hasAssurance = parseYesNo(data.sustainability_third_party_assurance);
  
  const disclosureCount = countPolicies(hasSDGs, hasReport, hasFramework, hasRegulatory, hasAssurance);
  
  if (disclosureCount >= 4) return 3;
  if (disclosureCount >= 2) return 2;
  if (disclosureCount >= 1) return 2;
  return 1;
};

const scoreGovernanceQ6 = (data: ESGAssessmentData): number | null => {
  // Q6: Ethics and Anti-Corruption Governance
  if (!hasData(data.ethics_anti_corruption_policy, data.policy_regular_review)) {
    return null;
  }
  
  const hasPolicy = parseYesNo(data.ethics_anti_corruption_policy);
  const regularReview = parseYesNo(data.policy_regular_review);
  
  if (hasPolicy && regularReview) return 3;
  if (hasPolicy) return 2;
  return 1;
};

const scoreGovernanceQ7 = (data: ESGAssessmentData): number | null => {
  // Q7: Data Privacy
  if (!hasData(data.data_privacy_policy)) return null;
  return scoreYesNo(parseYesNo(data.data_privacy_policy), null);
};

/**
 * Calculate weighted section scores and overall score
 * Only includes questions that have data (score !== null)
 */
const calculateSectionScore = (
  scores: (number | null)[],
  questionPercentages: number[],
  sectionWeight: number
): number => {
  let totalWeightedScore = 0;
  let totalWeight = 0;
  
  for (let i = 0; i < scores.length; i++) {
    const score = scores[i];
    const questionPercentage = questionPercentages[i];
    
    // Only include questions with actual scores (not null)
    if (score !== null) {
      totalWeightedScore += score * questionPercentage;
      totalWeight += questionPercentage;
    }
  }
  
  // If no questions were answered, return 0
  if (totalWeight === 0) return 0;
  
  // Calculate score based only on answered questions
  // Final percentage = total weighted score / (answered_weight × 3)
  // This gives a score between 0-1 (0-100% when multiplied by 100)
  return totalWeightedScore / (totalWeight * 3);
};

/**
 * Generate recommendations based on actual data and scores
 */
const generateRecommendations = (data: ESGAssessmentData, scores: ESGScoringResult): {
  environmental_strengths: string;
  environmental_improvements: string;
  social_strengths: string;
  social_improvements: string;
  governance_strengths: string;
  governance_improvements: string;
  overall_recommendations: string;
} => {
  // Environmental Analysis
  const envStrengths: string[] = [];
  const envImprovements: string[] = [];
  
  // Q1: GHG Emissions
  if (scores.e_q1_score !== null) {
    const hasBaseline = parseYesNo(data.ghg_baseline);
    const hasReduction = parseYesNo(data.ghg_reduction_initiatives);
    const emissions = parseNumber(data.ghg_emissions);
    
    if (scores.e_q1_score >= 2) {
      if (hasBaseline && hasReduction) {
        envStrengths.push(`Strong GHG management: You have established a baseline${emissions ? ` (${emissions.toLocaleString()} tCO2e)` : ''} and implemented reduction initiatives`);
      } else if (hasBaseline) {
        envStrengths.push("GHG emissions baseline established - good foundation for tracking");
      }
    } else {
      if (!hasBaseline) {
        envImprovements.push("Establish a comprehensive GHG emissions baseline to track your carbon footprint");
      }
      if (!hasReduction) {
        envImprovements.push("Develop and implement GHG reduction initiatives to lower your emissions");
      }
    }
  }
  
  // Q2: Energy Efficiency
  if (scores.e_q2_score !== null) {
    const renewablePct = parseNumber(data.energy_renewable);
    const fossilPct = (parseNumber(data.energy_diesel) || 0) + (parseNumber(data.energy_gas) || 0);
    
    if (scores.e_q2_score >= 2) {
      if (renewablePct !== null && renewablePct >= 50) {
        envStrengths.push(`Excellent renewable energy adoption: ${renewablePct}% from renewable sources`);
      } else if (renewablePct !== null && renewablePct > 0) {
        envStrengths.push(`Good progress on renewable energy: ${renewablePct}% from renewable sources`);
      } else {
        envStrengths.push("Energy consumption tracking in place");
      }
    } else {
      if (renewablePct === null || renewablePct === 0) {
        envImprovements.push("Increase renewable energy usage - aim for at least 25% renewable energy");
      }
      if (fossilPct > 40) {
        envImprovements.push(`Reduce fossil fuel dependency (currently ${fossilPct.toFixed(0)}% from diesel/gas)`);
      }
    }
  }
  
  // Q3: Water Management
  if (scores.e_q3_score !== null) {
    const withdrawal = parseNumber(data.water_withdrawal);
    const reclaimed = parseNumber(data.water_reclaimed);
    
    if (scores.e_q3_score >= 2 && withdrawal && reclaimed) {
      const reclamationRate = (reclaimed / withdrawal) * 100;
      envStrengths.push(`Effective water reclamation: ${reclamationRate.toFixed(0)}% of water is reclaimed`);
    } else if (scores.e_q3_score === 1) {
      envImprovements.push("Implement water reclamation systems to reduce water consumption");
    }
  }
  
  // Q4: Waste Management
  if (scores.e_q4_score !== null) {
    const wasteTreated = parseNumber(data.waste_treated);
    
    if (scores.e_q4_score >= 2 && wasteTreated !== null) {
      envStrengths.push(`Strong waste treatment: ${wasteTreated}% of waste is properly treated`);
    } else if (scores.e_q4_score === 1) {
      envImprovements.push("Improve waste treatment processes - aim for at least 80% waste treatment rate");
    }
  }
  
  // Q5: Environmental Policies
  if (scores.e_q5_score !== null) {
    const policyCount = countPolicies(
      parseYesNo(data.environmental_policy),
      parseYesNo(data.waste_management_policy),
      parseYesNo(data.energy_management_policy),
      parseYesNo(data.water_management_policy),
      parseYesNo(data.recycling_policy)
    );
    
    if (scores.e_q5_score >= 2) {
      envStrengths.push(`Comprehensive environmental policy framework: ${policyCount} policies in place`);
    } else {
      envImprovements.push(`Develop additional environmental policies (currently ${policyCount} policies - aim for 4+)`);
    }
  }
  
  // Q6: Climate Oversight
  if (scores.e_q6_score !== null) {
    const boardOversight = parseYesNo(data.board_climate_oversight);
    const mgmtOversight = parseYesNo(data.management_climate_oversight);
    
    if (scores.e_q6_score >= 2) {
      if (boardOversight && mgmtOversight) {
        envStrengths.push("Strong climate risk oversight at both board and management levels");
      } else {
        envStrengths.push("Climate oversight established");
      }
    } else {
      envImprovements.push("Establish board and management oversight for climate-related risks");
    }
  }
  
  // Social Analysis
  const socialStrengths: string[] = [];
  const socialImprovements: string[] = [];
  
  // Q1: Pay Equity
  if (scores.s_q1_score !== null) {
    const maleComp = parseNumber(data.median_male_compensation);
    const femaleComp = parseNumber(data.median_female_compensation);
    
    if (scores.s_q1_score >= 2 && maleComp && femaleComp) {
      const payRatio = (femaleComp / maleComp) * 100;
      if (payRatio >= 95) {
        socialStrengths.push(`Excellent gender pay equity: ${payRatio.toFixed(0)}% pay ratio`);
      } else {
        socialStrengths.push(`Good gender pay equity: ${payRatio.toFixed(0)}% pay ratio`);
      }
    } else if (scores.s_q1_score === 1) {
      socialImprovements.push("Address gender pay gaps - aim for at least 95% pay equity between genders");
    }
  }
  
  // Q3: Turnover
  if (scores.s_q3_score !== null) {
    const fullTime = parseNumber(data.full_time_turnover);
    const partTime = parseNumber(data.part_time_turnover);
    
    if (scores.s_q3_score >= 2) {
      if (fullTime !== null && fullTime <= 10) {
        socialStrengths.push(`Excellent employee retention: ${fullTime}% full-time turnover rate`);
      } else {
        socialStrengths.push("Good employee retention rates");
      }
    } else if (scores.s_q3_score === 1 && fullTime !== null) {
      socialImprovements.push(`High employee turnover (${fullTime}%) - investigate retention strategies`);
    }
  }
  
  // Q4: Diversity
  if (scores.s_q4_score !== null) {
    const total = parseNumber(data.total_headcount);
    const women = parseNumber(data.women_headcount);
    const womenSenior = parseNumber(data.women_senior_executive);
    const menSenior = parseNumber(data.men_senior_executive);
    
    if (scores.s_q4_score >= 2) {
      if (total && women) {
        const womenPct = (women / total) * 100;
        socialStrengths.push(`Good gender diversity: ${womenPct.toFixed(0)}% women in workforce`);
      }
      if (womenSenior !== null && menSenior !== null && (womenSenior + menSenior) > 0) {
        const seniorWomenPct = (womenSenior / (womenSenior + menSenior)) * 100;
        if (seniorWomenPct >= 30) {
          socialStrengths.push(`Strong senior leadership diversity: ${seniorWomenPct.toFixed(0)}% women in senior roles`);
        }
      }
    } else {
      if (!parseYesNo(data.diversity_inclusion_policy)) {
        socialImprovements.push("Establish a formal diversity and inclusion policy");
      }
      if (womenSenior !== null && menSenior !== null && (womenSenior + menSenior) > 0) {
        const seniorWomenPct = (womenSenior / (womenSenior + menSenior)) * 100;
        if (seniorWomenPct < 30) {
          socialImprovements.push(`Increase women in senior positions (currently ${seniorWomenPct.toFixed(0)}% - aim for 30%+)`);
        }
      }
    }
  }
  
  // Q6: Harassment & Grievance
  if (scores.s_q6_score !== null) {
    const hasPolicy = parseYesNo(data.anti_harassment_policy);
    const hasGrievance = parseYesNo(data.grievance_mechanism);
    const harassmentResolved = parseNumber(data.harassment_cases_resolved);
    const harassmentReported = parseNumber(data.harassment_cases_reported);
    
    if (scores.s_q6_score >= 2) {
      if (hasPolicy && hasGrievance) {
        socialStrengths.push("Comprehensive anti-harassment policies and grievance mechanisms in place");
      }
      if (harassmentReported && harassmentResolved && harassmentReported > 0) {
        const resolutionRate = (harassmentResolved / harassmentReported) * 100;
        if (resolutionRate >= 90) {
          socialStrengths.push(`Excellent harassment case resolution rate: ${resolutionRate.toFixed(0)}%`);
        }
      }
    } else {
      if (!hasPolicy) {
        socialImprovements.push("Implement anti-harassment and anti-discrimination policies");
      }
      if (!hasGrievance) {
        socialImprovements.push("Establish confidential grievance mechanisms for employees");
      }
    }
  }
  
  // Q7: Health & Safety
  if (scores.s_q7_score !== null) {
    const hasPolicy = parseYesNo(data.health_safety_policy);
    const hasHSE = parseYesNo(data.hse_management_system);
    const fatalities = parseNumber(data.fatalities) || 0;
    const trir = parseNumber(data.trir);
    
    if (scores.s_q7_score >= 2) {
      if (hasPolicy && hasHSE) {
        socialStrengths.push("Comprehensive health and safety management system in place");
      }
      if (trir !== null && trir <= 1.0) {
        socialStrengths.push(`Excellent safety record: TRIR of ${trir.toFixed(2)}`);
      }
      if (fatalities === 0) {
        socialStrengths.push("Zero fatalities - strong safety performance");
      }
    } else {
      if (!hasPolicy) {
        socialImprovements.push("Develop and implement a formal health and safety policy");
      }
      if (!hasHSE) {
        socialImprovements.push("Establish a Health, Safety, and Environment (HSE) management system");
      }
      if (fatalities > 0) {
        socialImprovements.push(`Critical: ${fatalities} fatality(ies) reported - immediate safety review required`);
      }
      if (trir !== null && trir > 3.0) {
        socialImprovements.push(`High injury rate (TRIR: ${trir.toFixed(2)}) - implement safety improvement programs`);
      }
    }
  }
  
  // Q11: CSR
  if (scores.s_q11_score !== null) {
    const csrPct = parseNumber(data.csr_percentage);
    
    if (scores.s_q11_score >= 2 && csrPct !== null) {
      socialStrengths.push(`Strong CSR commitment: ${csrPct}% of bottom line allocated to CSR activities`);
    } else if (scores.s_q11_score === 1) {
      socialImprovements.push("Increase corporate social responsibility spending - aim for at least 1-2% of bottom line");
    }
  }
  
  // Governance Analysis
  const govStrengths: string[] = [];
  const govImprovements: string[] = [];
  
  // Check if governance section has any data
  const hasGovernanceData = hasData(
    data.total_board_members, data.independent_board_members, data.women_board_members,
    data.esg_incentivization, data.workers_union, data.supplier_code_of_conduct,
    data.sustainability_report, data.ethics_anti_corruption_policy, data.data_privacy_policy
  );
  
  if (!hasGovernanceData) {
    govImprovements.push("Governance section not completed - please provide governance information for accurate assessment");
    return {
      environmental_strengths: envStrengths.length > 0 ? envStrengths.join(". ") : "Continue building on existing environmental practices",
      environmental_improvements: envImprovements.length > 0 ? envImprovements.join(". ") : "Maintain current environmental performance",
      social_strengths: socialStrengths.length > 0 ? socialStrengths.join(". ") : "Continue building on existing social practices",
      social_improvements: socialImprovements.length > 0 ? socialImprovements.join(". ") : "Maintain current social performance",
      governance_strengths: "Complete governance assessment to identify strengths",
      governance_improvements: "Complete the governance section of the assessment to receive specific recommendations",
      overall_recommendations: "Complete all sections of the ESG assessment for comprehensive analysis and recommendations"
    };
  }
  
  // Q1: Board Composition
  if (scores.g_q1_score !== null) {
    const total = parseNumber(data.total_board_members);
    const independent = parseNumber(data.independent_board_members);
    const women = parseNumber(data.women_board_members);
    
    if (scores.g_q1_score >= 2 && total) {
      const independencePct = total > 0 ? ((independent || 0) / total) * 100 : 0;
      const womenPct = total > 0 ? ((women || 0) / total) * 100 : 0;
      
      if (independencePct >= 50) {
        govStrengths.push(`Strong board independence: ${independencePct.toFixed(0)}% independent directors`);
      }
      if (womenPct >= 30) {
        govStrengths.push(`Excellent board gender diversity: ${womenPct.toFixed(0)}% women on board`);
      } else if (womenPct >= 20) {
        govStrengths.push(`Good board gender diversity: ${womenPct.toFixed(0)}% women on board`);
      }
    } else {
      if (total && (independent || 0) / total < 0.3) {
        govImprovements.push(`Increase board independence (currently ${((independent || 0) / total * 100).toFixed(0)}% - aim for 50%+)`);
      }
      if (total && (women || 0) / total < 0.2) {
        govImprovements.push(`Increase women on board (currently ${((women || 0) / total * 100).toFixed(0)}% - aim for 30%+)`);
      }
    }
  }
  
  // Q2: ESG Incentivization
  if (scores.g_q2_score !== null) {
    const hasIncentivization = parseYesNo(data.esg_incentivization);
    
    if (scores.g_q2_score >= 2 && hasIncentivization) {
      govStrengths.push("Executive compensation linked to ESG performance - strong accountability");
    } else if (scores.g_q2_score === 1) {
      govImprovements.push("Link executive incentives to ESG performance metrics to drive sustainability outcomes");
    }
  }
  
  // Q4: Supplier Code of Conduct
  if (scores.g_q4_score !== null) {
    const hasCode = parseYesNo(data.supplier_code_of_conduct);
    const compliancePct = parseNumber(data.supplier_compliance_percentage);
    
    if (scores.g_q4_score >= 2 && hasCode) {
      if (compliancePct !== null && compliancePct >= 80) {
        govStrengths.push(`Strong supplier compliance: ${compliancePct}% of suppliers certified compliant`);
      } else {
        govStrengths.push("Supplier code of conduct in place");
      }
    } else {
      if (!hasCode) {
        govImprovements.push("Require suppliers to follow a sustainability-aligned code of conduct");
      } else if (compliancePct !== null && compliancePct < 80) {
        govImprovements.push(`Improve supplier compliance tracking (currently ${compliancePct}% - aim for 80%+)`);
      }
    }
  }
  
  // Q5: Sustainability Disclosures
  if (scores.g_q5_score !== null) {
    const disclosureCount = countPolicies(
      parseYesNo(data.un_sdgs_focus),
      parseYesNo(data.sustainability_report),
      parseYesNo(data.sustainability_reporting_framework),
      parseYesNo(data.sustainability_regulatory_filing),
      parseYesNo(data.sustainability_third_party_assurance)
    );
    
    if (scores.g_q5_score >= 2) {
      if (disclosureCount >= 4) {
        govStrengths.push(`Comprehensive sustainability disclosure: ${disclosureCount} disclosure practices in place`);
      } else {
        govStrengths.push("Sustainability reporting established");
      }
    } else {
      if (disclosureCount === 0) {
        govImprovements.push("Begin sustainability reporting - publish annual sustainability reports aligned with recognized frameworks");
      } else {
        govImprovements.push(`Expand sustainability disclosures (currently ${disclosureCount} practices - aim for 4+)`);
      }
    }
  }
  
  // Q6: Ethics & Anti-Corruption
  if (scores.g_q6_score !== null) {
    const hasPolicy = parseYesNo(data.ethics_anti_corruption_policy);
    const regularReview = parseYesNo(data.policy_regular_review);
    
    if (scores.g_q6_score >= 2) {
      if (hasPolicy && regularReview) {
        govStrengths.push("Strong ethics governance: Anti-corruption policy with regular review process");
      } else {
        govStrengths.push("Ethics and anti-corruption policy in place");
      }
    } else {
      if (!hasPolicy) {
        govImprovements.push("Establish ethics and anti-corruption policies");
      } else if (!regularReview) {
        govImprovements.push("Implement regular review and updates of ethics policies");
      }
    }
  }
  
  // Overall recommendations
  const overallRecs: string[] = [];
  
  // Check completion status
  const answeredSections = [
    scores.environmental_total_score > 0,
    scores.social_total_score > 0,
    scores.governance_total_score > 0
  ].filter(Boolean).length;
  
  if (answeredSections < 3) {
    overallRecs.push(`Complete all ESG sections for comprehensive assessment (currently ${answeredSections}/3 sections completed)`);
  }
  
  if (scores.overall_score < 60 && scores.overall_score > 0) {
    overallRecs.push("Focus on establishing foundational ESG policies and practices across all pillars");
  }
  
  // Identify weakest section
  const sectionScores = [
    { name: 'Environmental', score: scores.environmental_total_score },
    { name: 'Social', score: scores.social_total_score },
    { name: 'Governance', score: scores.governance_total_score }
  ].filter(s => s.score > 0);
  
  if (sectionScores.length > 1) {
    const weakest = sectionScores.reduce((min, s) => s.score < min.score ? s : min);
    const strongest = sectionScores.reduce((max, s) => s.score > max.score ? s : max);
    
    if (weakest.score < 60) {
      overallRecs.push(`Prioritize improvements in ${weakest.name} (${weakest.score.toFixed(0)}%) - currently the weakest area`);
    }
    
    if (strongest.score >= 80) {
      overallRecs.push(`Leverage your ${strongest.name} strengths (${strongest.score.toFixed(0)}%) as a model for other areas`);
    }
  }
  
  if (scores.overall_score >= 80) {
    overallRecs.push("Excellent ESG performance - continue maintaining high standards and consider industry leadership opportunities");
  } else if (scores.overall_score >= 60) {
    overallRecs.push("Good ESG foundation - focus on identified improvement areas to reach excellence");
  }
  
  return {
    environmental_strengths: envStrengths.length > 0 ? envStrengths.join(". ") : "Continue building on existing environmental practices",
    environmental_improvements: envImprovements.length > 0 ? envImprovements.join(". ") : "Maintain current environmental performance",
    social_strengths: socialStrengths.length > 0 ? socialStrengths.join(". ") : "Continue building on existing social practices",
    social_improvements: socialImprovements.length > 0 ? socialImprovements.join(". ") : "Maintain current social performance",
    governance_strengths: govStrengths.length > 0 ? govStrengths.join(". ") : "Continue building on existing governance practices",
    governance_improvements: govImprovements.length > 0 ? govImprovements.join(". ") : "Maintain current governance performance",
    overall_recommendations: overallRecs.length > 0 ? overallRecs.join(". ") : "Continue improving ESG performance across all pillars"
  };
};

/**
 * Main scoring function
 */
export const calculateESGScore = (data: ESGAssessmentData): ESGScoringResult => {
  // Calculate individual question scores
  const eScores = [
    scoreEnvironmentalQ1(data),
    scoreEnvironmentalQ2(data),
    scoreEnvironmentalQ3(data),
    scoreEnvironmentalQ4(data),
    scoreEnvironmentalQ5(data),
    scoreEnvironmentalQ6(data),
    scoreEnvironmentalQ7(data)
  ];
  
  const sScores = [
    scoreSocialQ1(data),
    scoreSocialQ2(data),
    scoreSocialQ3(data),
    scoreSocialQ4(data),
    scoreSocialQ5(data),
    scoreSocialQ6(data),
    scoreSocialQ7(data),
    scoreSocialQ8(data),
    scoreSocialQ9(data),
    scoreSocialQ10(data),
    scoreSocialQ11(data),
    scoreSocialQ12(data)
  ];
  
  const gScores = [
    scoreGovernanceQ1(data),
    scoreGovernanceQ2(data),
    scoreGovernanceQ3(data),
    scoreGovernanceQ4(data),
    scoreGovernanceQ5(data),
    scoreGovernanceQ6(data),
    scoreGovernanceQ7(data)
  ];
  
  // Calculate section scores
  const eQuestionPercentages = [0.05, 0.04, 0.04, 0.04, 0.04, 0.05, 0.04];
  const sQuestionPercentages = [0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03, 0.02];
  const gQuestionPercentages = [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05];
  
  const environmentalTotalScore = calculateSectionScore(eScores, eQuestionPercentages, 0.30) * 100;
  const socialTotalScore = calculateSectionScore(sScores, sQuestionPercentages, 0.35) * 100;
  const governanceTotalScore = calculateSectionScore(gScores, gQuestionPercentages, 0.35) * 100;
  
  // Calculate overall score
  const overallScore = (environmentalTotalScore * 0.30) + (socialTotalScore * 0.35) + (governanceTotalScore * 0.35);
  
  // Build result object
  const result: ESGScoringResult = {
    e_q1_score: eScores[0],
    e_q2_score: eScores[1],
    e_q3_score: eScores[2],
    e_q4_score: eScores[3],
    e_q5_score: eScores[4],
    e_q6_score: eScores[5],
    e_q7_score: eScores[6],
    
    s_q1_score: sScores[0],
    s_q2_score: sScores[1],
    s_q3_score: sScores[2],
    s_q4_score: sScores[3],
    s_q5_score: sScores[4],
    s_q6_score: sScores[5],
    s_q7_score: sScores[6],
    s_q8_score: sScores[7],
    s_q9_score: sScores[8],
    s_q10_score: sScores[9],
    s_q11_score: sScores[10],
    s_q12_score: sScores[11],
    
    g_q1_score: gScores[0],
    g_q2_score: gScores[1],
    g_q3_score: gScores[2],
    g_q4_score: gScores[3],
    g_q5_score: gScores[4],
    g_q6_score: gScores[5],
    g_q7_score: gScores[6],
    
    environmental_total_score: Math.round(environmentalTotalScore * 100) / 100,
    social_total_score: Math.round(socialTotalScore * 100) / 100,
    governance_total_score: Math.round(governanceTotalScore * 100) / 100,
    overall_score: Math.round(overallScore * 100) / 100,
    
    environmental_strengths: '',
    environmental_improvements: '',
    social_strengths: '',
    social_improvements: '',
    governance_strengths: '',
    governance_improvements: '',
    overall_recommendations: ''
  };
  
  // Generate recommendations
  const recommendations = generateRecommendations(data, result);
  Object.assign(result, recommendations);
  
  return result;
};

